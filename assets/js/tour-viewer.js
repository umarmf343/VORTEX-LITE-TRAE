/**
 * Vortex360 Lite - Tour Viewer JavaScript
 * 
 * Main JavaScript functionality for 360° tour viewer
 */

(function(window, document) {
    'use strict';
    
    // Global namespace
    window.VortexTourViewer = VortexTourViewer;
    
    /**
     * Main VortexTourViewer class for handling 360° tour functionality
     * @param {Object} options Configuration options for the tour viewer
     */
    function VortexTourViewer(options) {
        this.options = Object.assign({
            containerId: 'vx-viewer',
            tourId: null,
            data: null,
            autoLoad: true,
            onLoad: null,
            onError: null,
            onSceneChange: null,
            onHotspotClick: null
        }, options);
        
        this.container = null;
        this.pannellum = null;
        this.currentScene = null;
        this.scenes = [];
        this.hotspots = [];
        this.isLoaded = false;
        this.isAutoRotating = false;
        this.isFullscreen = false;
        
        if (this.options.autoLoad) {
            this.init();
        }
    }
    
    /**
     * Initialize the tour viewer
     */
    VortexTourViewer.prototype.init = function() {
        try {
            this.container = document.getElementById(this.options.containerId);
            if (!this.container) {
                throw new Error('Container element not found: ' + this.options.containerId);
            }
            
            if (!this.options.data) {
                throw new Error('Tour data is required');
            }
            
            this.scenes = this.options.data.scenes || [];
            if (this.scenes.length === 0) {
                throw new Error('No scenes found in tour data');
            }
            
            this.setupPannellum();
            this.bindEvents();
            
        } catch (error) {
            console.error('VortexTourViewer initialization error:', error);
            if (this.options.onError) {
                this.options.onError(error);
            }
        }
    };
    
    /**
     * Setup Pannellum viewer with tour configuration
     */
    VortexTourViewer.prototype.setupPannellum = function() {
        if (typeof pannellum === 'undefined') {
            throw new Error('Pannellum library not loaded');
        }
        
        const startScene = this.findScene(this.options.data.startScene) || this.scenes[0];
        const config = this.buildPannellumConfig(startScene);
        
        this.pannellum = pannellum.viewer(this.options.containerId, config);
        this.currentScene = startScene;
        
        // Setup event listeners
        this.pannellum.on('load', () => {
            this.isLoaded = true;
            this.addHotspotsToScene(startScene);
            
            if (this.options.onLoad) {
                this.options.onLoad();
            }
        });
        
        this.pannellum.on('error', (error) => {
            console.error('Pannellum error:', error);
            if (this.options.onError) {
                this.options.onError(new Error('Failed to load 360° image'));
            }
        });
        
        this.pannellum.on('scenechange', (sceneId) => {
            this.handleSceneChange(sceneId);
        });
    };
    
    /**
     * Build Pannellum configuration object
     * @param {Object} startScene Initial scene data
     * @returns {Object} Pannellum configuration
     */
    VortexTourViewer.prototype.buildPannellumConfig = function(startScene) {
        const settings = this.options.data.settings || {};
        const scenes = {};
        
        // Build scenes configuration
        this.scenes.forEach(scene => {
            scenes[scene.id] = {
                type: 'equirectangular',
                panorama: scene.image_url,
                title: scene.title,
                author: this.options.data.title,
                pitch: scene.initial_view.pitch || 0,
                yaw: scene.initial_view.yaw || 0,
                hfov: scene.initial_view.fov || 100,
                minHfov: 30,
                maxHfov: 120,
                hotSpots: [] // Will be populated dynamically
            };
        });
        
        return {
            default: {
                firstScene: startScene.id,
                sceneFadeDuration: 1000,
                autoLoad: true,
                showZoomCtrl: false,
                showFullscreenCtrl: false,
                showControls: false,
                mouseZoom: settings.mouse_zoom !== false,
                doubleClickZoom: settings.double_click_zoom !== false,
                draggable: settings.mouse_drag !== false,
                keyboardZoom: settings.keyboard_controls !== false,
                autoRotate: settings.auto_rotation ? settings.auto_rotation_speed || 2 : false,
                compass: settings.show_compass || false,
                northOffset: 0
            },
            scenes: scenes
        };
    };
    
    /**
     * Add hotspots to a specific scene
     * @param {Object} scene Scene data containing hotspots
     */
    VortexTourViewer.prototype.addHotspotsToScene = function(scene) {
        if (!scene.hotspots || scene.hotspots.length === 0) {
            return;
        }
        
        scene.hotspots.forEach(hotspot => {
            const hotspotConfig = this.buildHotspotConfig(hotspot);
            this.pannellum.addHotSpot(hotspotConfig, scene.id);
        });
    };
    
    /**
     * Build hotspot configuration for Pannellum
     * @param {Object} hotspot Hotspot data
     * @returns {Object} Pannellum hotspot configuration
     */
    VortexTourViewer.prototype.buildHotspotConfig = function(hotspot) {
        const config = {
            id: 'hotspot-' + hotspot.id,
            pitch: hotspot.position.pitch,
            yaw: hotspot.position.yaw,
            cssClass: 'vx-hotspot vx-hotspot-' + hotspot.type,
            createTooltipFunc: this.createHotspotTooltip.bind(this, hotspot),
            createTooltipArgs: hotspot
        };
        
        // Handle different hotspot types
        switch (hotspot.type) {
            case 'scene':
                config.type = 'scene';
                config.sceneId = hotspot.target_scene_id;
                config.targetYaw = hotspot.target_yaw || 0;
                config.targetPitch = hotspot.target_pitch || 0;
                break;
                
            case 'info':
                config.type = 'info';
                config.clickHandlerFunc = this.handleInfoHotspot.bind(this, hotspot);
                break;
                
            case 'link':
                config.type = 'info';
                config.clickHandlerFunc = this.handleLinkHotspot.bind(this, hotspot);
                break;
                
            case 'video':
            case 'audio':
            case 'image':
                config.type = 'info';
                config.clickHandlerFunc = this.handleMediaHotspot.bind(this, hotspot);
                break;
                
            default:
                config.type = 'info';
                config.clickHandlerFunc = this.handleGenericHotspot.bind(this, hotspot);
        }
        
        return config;
    };
    
    /**
     * Create tooltip element for hotspot
     * @param {Object} hotspot Hotspot data
     * @returns {HTMLElement} Tooltip element
     */
    VortexTourViewer.prototype.createHotspotTooltip = function(hotspot) {
        const tooltip = document.createElement('div');
        tooltip.className = 'vx-hotspot-tooltip';
        tooltip.textContent = hotspot.title || 'Hotspot';
        return tooltip;
    };
    
    /**
     * Handle scene change event
     * @param {string} sceneId New scene ID
     */
    VortexTourViewer.prototype.handleSceneChange = function(sceneId) {
        const scene = this.findScene(sceneId);
        if (!scene) {
            console.warn('Scene not found:', sceneId);
            return;
        }
        
        this.currentScene = scene;
        
        // Add hotspots to new scene
        setTimeout(() => {
            this.addHotspotsToScene(scene);
        }, 100);
        
        if (this.options.onSceneChange) {
            this.options.onSceneChange(sceneId);
        }
    };
    
    /**
     * Handle info hotspot click
     * @param {Object} hotspot Hotspot data
     */
    VortexTourViewer.prototype.handleInfoHotspot = function(hotspot) {
        this.showHotspotModal({
            title: hotspot.title,
            content: hotspot.description,
            type: 'info'
        });
        
        if (this.options.onHotspotClick) {
            this.options.onHotspotClick(hotspot);
        }
    };
    
    /**
     * Handle link hotspot click
     * @param {Object} hotspot Hotspot data
     */
    VortexTourViewer.prototype.handleLinkHotspot = function(hotspot) {
        if (hotspot.url) {
            window.open(hotspot.url, '_blank', 'noopener,noreferrer');
        }
        
        if (this.options.onHotspotClick) {
            this.options.onHotspotClick(hotspot);
        }
    };
    
    /**
     * Handle media hotspot click (video, audio, image)
     * @param {Object} hotspot Hotspot data
     */
    VortexTourViewer.prototype.handleMediaHotspot = function(hotspot) {
        let content = '';
        
        switch (hotspot.type) {
            case 'video':
                if (hotspot.video_url) {
                    content = `<video controls style="max-width: 100%; height: auto;">
                        <source src="${hotspot.video_url}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>`;
                }
                break;
                
            case 'audio':
                if (hotspot.audio_url) {
                    content = `<audio controls style="width: 100%;">
                        <source src="${hotspot.audio_url}" type="audio/mpeg">
                        Your browser does not support the audio tag.
                    </audio>`;
                }
                break;
                
            case 'image':
                if (hotspot.image_url) {
                    content = `<img src="${hotspot.image_url}" alt="${hotspot.title}" style="max-width: 100%; height: auto;">`;
                }
                break;
        }
        
        if (hotspot.description) {
            content += `<p style="margin-top: 15px;">${hotspot.description}</p>`;
        }
        
        this.showHotspotModal({
            title: hotspot.title,
            content: content,
            type: hotspot.type
        });
        
        if (this.options.onHotspotClick) {
            this.options.onHotspotClick(hotspot);
        }
    };
    
    /**
     * Handle generic hotspot click
     * @param {Object} hotspot Hotspot data
     */
    VortexTourViewer.prototype.handleGenericHotspot = function(hotspot) {
        this.showHotspotModal({
            title: hotspot.title,
            content: hotspot.description || 'No additional information available.',
            type: 'info'
        });
        
        if (this.options.onHotspotClick) {
            this.options.onHotspotClick(hotspot);
        }
    };
    
    /**
     * Show hotspot modal dialog
     * @param {Object} options Modal options (title, content, type)
     */
    VortexTourViewer.prototype.showHotspotModal = function(options) {
        // Remove existing modal
        const existingModal = document.querySelector('.vx-hotspot-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'vx-hotspot-modal';
        modal.innerHTML = `
            <div class="vx-modal-content">
                <div class="vx-modal-header">
                    <h3 class="vx-modal-title">${options.title || 'Information'}</h3>
                    <button class="vx-modal-close">&times;</button>
                </div>
                <div class="vx-modal-body">
                    ${options.content || ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => {
            modal.classList.add('open');
        }, 10);
        
        // Bind close events
        const closeBtn = modal.querySelector('.vx-modal-close');
        const closeModal = () => {
            modal.classList.remove('open');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        };
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on Escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);
    };
    
    /**
     * Find scene by ID
     * @param {string|number} sceneId Scene ID to find
     * @returns {Object|null} Scene data or null if not found
     */
    VortexTourViewer.prototype.findScene = function(sceneId) {
        return this.scenes.find(scene => scene.id == sceneId) || null;
    };
    
    /**
     * Navigate to a specific scene
     * @param {string|number} sceneId Scene ID to navigate to
     */
    VortexTourViewer.prototype.loadScene = function(sceneId) {
        if (!this.pannellum || !this.isLoaded) {
            console.warn('Tour not loaded yet');
            return;
        }
        
        const scene = this.findScene(sceneId);
        if (!scene) {
            console.warn('Scene not found:', sceneId);
            return;
        }
        
        this.pannellum.loadScene(sceneId);
    };
    
    /**
     * Navigate to the next scene
     */
    VortexTourViewer.prototype.nextScene = function() {
        if (!this.currentScene) return;
        
        const currentIndex = this.scenes.findIndex(scene => scene.id === this.currentScene.id);
        const nextIndex = (currentIndex + 1) % this.scenes.length;
        this.loadScene(this.scenes[nextIndex].id);
    };
    
    /**
     * Navigate to the previous scene
     */
    VortexTourViewer.prototype.previousScene = function() {
        if (!this.currentScene) return;
        
        const currentIndex = this.scenes.findIndex(scene => scene.id === this.currentScene.id);
        const prevIndex = currentIndex === 0 ? this.scenes.length - 1 : currentIndex - 1;
        this.loadScene(this.scenes[prevIndex].id);
    };
    
    /**
     * Zoom in
     */
    VortexTourViewer.prototype.zoomIn = function() {
        if (!this.pannellum || !this.isLoaded) return;
        
        const currentHfov = this.pannellum.getHfov();
        const newHfov = Math.max(currentHfov - 10, 30);
        this.pannellum.setHfov(newHfov);
    };
    
    /**
     * Zoom out
     */
    VortexTourViewer.prototype.zoomOut = function() {
        if (!this.pannellum || !this.isLoaded) return;
        
        const currentHfov = this.pannellum.getHfov();
        const newHfov = Math.min(currentHfov + 10, 120);
        this.pannellum.setHfov(newHfov);
    };
    
    /**
     * Toggle auto rotation
     */
    VortexTourViewer.prototype.toggleAutoRotation = function() {
        if (!this.pannellum || !this.isLoaded) return;
        
        if (this.isAutoRotating) {
            this.stopAutoRotation();
        } else {
            this.startAutoRotation();
        }
    };
    
    /**
     * Start auto rotation
     */
    VortexTourViewer.prototype.startAutoRotation = function() {
        if (!this.pannellum || !this.isLoaded) return;
        
        const speed = this.options.data.settings?.auto_rotation_speed || 2;
        this.pannellum.setAutoRotate(speed);
        this.isAutoRotating = true;
    };
    
    /**
     * Stop auto rotation
     */
    VortexTourViewer.prototype.stopAutoRotation = function() {
        if (!this.pannellum || !this.isLoaded) return;
        
        this.pannellum.setAutoRotate(false);
        this.isAutoRotating = false;
    };
    
    /**
     * Toggle fullscreen mode
     */
    VortexTourViewer.prototype.toggleFullscreen = function() {
        if (!this.container) return;
        
        if (this.isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    };
    
    /**
     * Enter fullscreen mode
     */
    VortexTourViewer.prototype.enterFullscreen = function() {
        if (!this.container) return;
        
        const requestFullscreen = this.container.requestFullscreen ||
                                 this.container.webkitRequestFullscreen ||
                                 this.container.mozRequestFullScreen ||
                                 this.container.msRequestFullscreen;
        
        if (requestFullscreen) {
            requestFullscreen.call(this.container);
            this.container.classList.add('fullscreen');
            this.isFullscreen = true;
            
            // Resize pannellum after fullscreen
            setTimeout(() => {
                if (this.pannellum) {
                    this.pannellum.resize();
                }
            }, 100);
        }
    };
    
    /**
     * Exit fullscreen mode
     */
    VortexTourViewer.prototype.exitFullscreen = function() {
        const exitFullscreen = document.exitFullscreen ||
                              document.webkitExitFullscreen ||
                              document.mozCancelFullScreen ||
                              document.msExitFullscreen;
        
        if (exitFullscreen) {
            exitFullscreen.call(document);
            this.container.classList.remove('fullscreen');
            this.isFullscreen = false;
            
            // Resize pannellum after exit fullscreen
            setTimeout(() => {
                if (this.pannellum) {
                    this.pannellum.resize();
                }
            }, 100);
        }
    };
    
    /**
     * Resize the viewer (useful for responsive layouts)
     */
    VortexTourViewer.prototype.resize = function() {
        if (this.pannellum && this.isLoaded) {
            this.pannellum.resize();
        }
    };
    
    /**
     * Pause the tour (stop auto rotation, pause videos)
     */
    VortexTourViewer.prototype.pause = function() {
        if (this.isAutoRotating) {
            this.stopAutoRotation();
        }
        
        // Pause any playing videos
        const videos = this.container.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                video.pause();
            }
        });
    };
    
    /**
     * Resume the tour
     */
    VortexTourViewer.prototype.resume = function() {
        // Auto rotation will be controlled by user interaction
        // Videos will be controlled by user interaction
    };
    
    /**
     * Enable loop mode for scene navigation
     */
    VortexTourViewer.prototype.enableLoop = function() {
        this.loopEnabled = true;
    };
    
    /**
     * Disable loop mode for scene navigation
     */
    VortexTourViewer.prototype.disableLoop = function() {
        this.loopEnabled = false;
    };
    
    /**
     * Get current scene information
     * @returns {Object} Current scene data
     */
    VortexTourViewer.prototype.getCurrentScene = function() {
        return this.currentScene;
    };
    
    /**
     * Get all scenes
     * @returns {Array} Array of scene data
     */
    VortexTourViewer.prototype.getScenes = function() {
        return this.scenes;
    };
    
    /**
     * Get tour information
     * @returns {Object} Tour data
     */
    VortexTourViewer.prototype.getTourInfo = function() {
        return {
            id: this.options.data.id,
            title: this.options.data.title,
            description: this.options.data.description,
            sceneCount: this.scenes.length,
            currentScene: this.currentScene
        };
    };
    
    /**
     * Bind global event listeners
     */
    VortexTourViewer.prototype.bindEvents = function() {
        // Handle fullscreen change events
        const fullscreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
        fullscreenEvents.forEach(event => {
            document.addEventListener(event, () => {
                const isFullscreen = !!(document.fullscreenElement ||
                                       document.webkitFullscreenElement ||
                                       document.mozFullScreenElement ||
                                       document.msFullscreenElement);
                
                if (!isFullscreen && this.isFullscreen) {
                    this.container.classList.remove('fullscreen');
                    this.isFullscreen = false;
                    this.resize();
                }
            });
        });
        
        // Handle keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (!this.isLoaded || !this.container.contains(document.activeElement)) {
                return;
            }
            
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousScene();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextScene();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.zoomIn();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.zoomOut();
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleAutoRotation();
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    this.toggleFullscreen();
                    break;
                case 'Escape':
                    if (this.isFullscreen) {
                        e.preventDefault();
                        this.exitFullscreen();
                    }
                    break;
            }
        });
    };
    
    /**
     * Destroy the tour viewer and clean up resources
     */
    VortexTourViewer.prototype.destroy = function() {
        if (this.pannellum) {
            this.pannellum.destroy();
            this.pannellum = null;
        }
        
        // Remove any modals
        const modals = document.querySelectorAll('.vx-hotspot-modal');
        modals.forEach(modal => modal.remove());
        
        // Reset properties
        this.isLoaded = false;
        this.isAutoRotating = false;
        this.isFullscreen = false;
        this.currentScene = null;
        this.scenes = [];
        this.hotspots = [];
    };
    
})(window, document);

// jQuery plugin wrapper (optional)
if (typeof jQuery !== 'undefined') {
    (function($) {
        $.fn.vortexTourViewer = function(options) {
            return this.each(function() {
                const $this = $(this);
                const containerId = this.id || 'vx-viewer-' + Math.random().toString(36).substr(2, 9);
                this.id = containerId;
                
                const config = $.extend({
                    containerId: containerId
                }, options);
                
                const viewer = new VortexTourViewer(config);
                $this.data('vortexTourViewer', viewer);
            });
        };
    })(jQuery);
}

// Auto-initialize tours with data attributes
document.addEventListener('DOMContentLoaded', function() {
    const autoInitElements = document.querySelectorAll('[data-vx-tour-auto]');
    autoInitElements.forEach(element => {
        const tourId = element.getAttribute('data-vx-tour-id');
        const tourData = element.getAttribute('data-vx-tour-data');
        
        if (tourId && tourData) {
            try {
                const data = JSON.parse(tourData);
                new VortexTourViewer({
                    containerId: element.id,
                    tourId: tourId,
                    data: data
                });
            } catch (error) {
                console.error('Failed to auto-initialize tour:', error);
            }
        }
    });
});