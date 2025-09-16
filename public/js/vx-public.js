/**
 * Vortex360 Lite - Public JavaScript
 * 
 * Frontend functionality for the 360° tour viewer
 */

(function($) {
    'use strict';

    /**
     * Tour viewer class
     */
    class VXTourViewer {
        constructor(container, options = {}) {
            this.container = container;
            this.options = Object.assign({
                tourId: null,
                width: '100%',
                height: '600px',
                autoLoad: true,
                showControls: true,
                mouseZoom: true,
                autoRotate: false,
                autoRotateSpeed: 2
            }, options);
            
            this.viewer = null;
            this.tourData = null;
            this.currentSceneIndex = 0;
            this.isFullscreen = false;
            this.isAutoRotating = false;
            this.hotspots = [];
            
            this.init();
        }

        /**
         * Initialize the viewer
         */
        init() {
            this.createViewer();
            
            if (this.options.autoLoad && this.options.tourId) {
                this.loadTour(this.options.tourId);
            }
        }

        /**
         * Create viewer HTML structure
         */
        createViewer() {
            const template = $('#vx-viewer-template').html();
            if (!template) {
                console.error('VX: Viewer template not found');
                return;
            }
            
            const html = template.replace(/{{id}}/g, this.generateId());
            this.container.html(html);
            
            this.viewerElement = this.container.find('.vx-viewer');
            this.controlsElement = this.container.find('.vx-controls');
            this.loadingElement = this.container.find('.vx-loading');
            this.infoPanel = this.container.find('.vx-hotspot-info');
            
            this.bindEvents();
        }

        /**
         * Bind event handlers
         */
        bindEvents() {
            const self = this;
            
            // Control buttons
            this.container.on('click', '.vx-fullscreen', () => this.toggleFullscreen());
            this.container.on('click', '.vx-auto-rotate', () => this.toggleAutoRotate());
            this.container.on('click', '.vx-prev-scene', () => this.previousScene());
            this.container.on('click', '.vx-next-scene', () => this.nextScene());
            this.container.on('click', '.vx-close-info', () => this.hideHotspotInfo());
            this.container.on('click', '.vx-retry-btn', () => this.retryLoad());
            
            // Hotspot interactions
            this.container.on('click', '.vx-hotspot', function() {
                const hotspotId = $(this).data('hotspot-id');
                self.handleHotspotClick(hotspotId);
            });
            
            // Fullscreen change events
            $(document).on('fullscreenchange webkitfullscreenchange mozfullscreenchange MSFullscreenChange', () => {
                this.handleFullscreenChange();
            });
            
            // Auto-hide controls
            let controlsTimeout;
            this.container.on('mousemove', () => {
                this.showControls();
                clearTimeout(controlsTimeout);
                controlsTimeout = setTimeout(() => {
                    if (!this.isFullscreen) return;
                    this.hideControls();
                }, 3000);
            });
            
            // Keyboard navigation
            $(document).on('keydown', (e) => {
                if (!this.viewer) return;
                
                switch (e.key) {
                    case 'ArrowLeft':
                        this.previousScene();
                        break;
                    case 'ArrowRight':
                        this.nextScene();
                        break;
                    case 'f':
                    case 'F':
                        this.toggleFullscreen();
                        break;
                    case 'r':
                    case 'R':
                        this.toggleAutoRotate();
                        break;
                    case 'Escape':
                        this.hideHotspotInfo();
                        break;
                }
            });
        }

        /**
         * Load tour data
         */
        loadTour(tourId) {
            this.showLoading();
            
            $.ajax({
                url: vxPublic.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_get_tour_data',
                    tour_id: tourId,
                    nonce: vxPublic.nonce
                },
                success: (response) => {
                    if (response.success) {
                        this.tourData = response.data;
                        this.initializePannellum();
                    } else {
                        this.showError(response.data.message || vxPublic.strings.error);
                    }
                },
                error: () => {
                    this.showError(vxPublic.strings.error);
                }
            });
        }

        /**
         * Initialize Pannellum viewer
         */
        initializePannellum() {
            if (!this.tourData || !this.tourData.scenes || this.tourData.scenes.length === 0) {
                this.showError('No scenes found in tour');
                return;
            }
            
            // Check WebGL support
            if (!this.checkWebGLSupport()) {
                this.showError(vxPublic.strings.noWebGL);
                return;
            }
            
            const firstScene = this.tourData.scenes[0];
            const config = {
                type: 'equirectangular',
                panorama: firstScene.image,
                autoLoad: true,
                showControls: false, // We use custom controls
                mouseZoom: this.options.mouseZoom,
                autoRotate: this.options.autoRotate ? this.options.autoRotateSpeed : false,
                hotSpots: this.processHotspots(firstScene.hotSpots || []),
                compass: false,
                northOffset: 0,
                preview: firstScene.preview || firstScene.image,
                loadButtonLabel: vxPublic.strings.loading,
                loadingLabel: vxPublic.strings.loading,
                bylineLabel: '',
                noPanoramaError: vxPublic.strings.error,
                fileAccessError: vxPublic.strings.error,
                malformedURLError: vxPublic.strings.error,
                iOS: true
            };
            
            // Add initial view settings
            if (firstScene.pitch !== undefined) {
                config.pitch = firstScene.pitch;
            }
            if (firstScene.yaw !== undefined) {
                config.yaw = firstScene.yaw;
            }
            if (firstScene.hfov !== undefined) {
                config.hfov = firstScene.hfov;
            }
            
            try {
                this.viewer = pannellum.viewer(this.viewerElement[0], config);
                this.setupViewerEvents();
                this.updateSceneNavigation();
                this.hideLoading();
                
                // Track tour load
                this.trackInteraction('tour_loaded');
                
            } catch (error) {
                console.error('VX: Pannellum initialization error:', error);
                this.showError('Failed to initialize 360° viewer');
            }
        }

        /**
         * Setup viewer event handlers
         */
        setupViewerEvents() {
            this.viewer.on('load', () => {
                this.hideLoading();
                this.trackInteraction('scene_loaded', this.getCurrentScene().id);
            });
            
            this.viewer.on('error', (error) => {
                console.error('VX: Viewer error:', error);
                this.showError('Error loading panorama');
            });
            
            this.viewer.on('mousedown', () => {
                this.trackInteraction('scene_interaction', this.getCurrentScene().id);
            });
        }

        /**
         * Process hotspots for Pannellum
         */
        processHotspots(hotspots) {
            return hotspots.map(hotspot => {
                const processed = {
                    id: hotspot.id,
                    pitch: hotspot.pitch,
                    yaw: hotspot.yaw,
                    type: 'info', // Pannellum type
                    cssClass: `vx-hotspot vx-hotspot-${hotspot.type}`,
                    createTooltipFunc: (hotSpotDiv) => {
                        this.createHotspotElement(hotSpotDiv, hotspot);
                    },
                    createTooltipArgs: hotspot
                };
                
                // Handle different hotspot types
                switch (hotspot.type) {
                    case 'scene':
                        processed.clickHandlerFunc = () => {
                            this.loadScene(hotspot.sceneId);
                        };
                        break;
                    case 'link':
                        processed.clickHandlerFunc = () => {
                            window.open(hotspot.URL, '_blank');
                            this.trackInteraction('hotspot_link_click', this.getCurrentScene().id, hotspot.id);
                        };
                        break;
                    case 'info':
                        processed.clickHandlerFunc = () => {
                            this.showHotspotInfo(hotspot);
                            this.trackInteraction('hotspot_info_click', this.getCurrentScene().id, hotspot.id);
                        };
                        break;
                }
                
                return processed;
            });
        }

        /**
         * Create hotspot HTML element
         */
        createHotspotElement(container, hotspot) {
            const template = $('#vx-hotspot-template').html();
            if (!template) return;
            
            let html = template
                .replace(/{{id}}/g, hotspot.id)
                .replace(/{{type}}/g, hotspot.type)
                .replace(/{{title}}/g, hotspot.text || '');
            
            // Add appropriate icon
            const icon = this.getHotspotIcon(hotspot.type);
            html = html.replace(/{{#if icon}}[\s\S]*?{{else}}[\s\S]*?{{/if}}/g, icon);
            
            $(container).html(html);
        }

        /**
         * Get hotspot icon SVG
         */
        getHotspotIcon(type) {
            const icons = {
                info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>',
                scene: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
                link: '<path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>'
            };
            return icons[type] || icons.info;
        }

        /**
         * Load specific scene
         */
        loadScene(sceneId) {
            const sceneIndex = this.tourData.scenes.findIndex(scene => scene.id === sceneId);
            if (sceneIndex === -1) {
                console.error('VX: Scene not found:', sceneId);
                return;
            }
            
            this.currentSceneIndex = sceneIndex;
            const scene = this.tourData.scenes[sceneIndex];
            
            this.showLoading();
            
            // Update panorama
            this.viewer.loadScene({
                type: 'equirectangular',
                panorama: scene.image,
                hotSpots: this.processHotspots(scene.hotSpots || []),
                pitch: scene.pitch,
                yaw: scene.yaw,
                hfov: scene.hfov
            });
            
            this.updateSceneNavigation();
            this.hideHotspotInfo();
            
            // Track scene change
            this.trackInteraction('scene_change', scene.id);
        }

        /**
         * Navigate to previous scene
         */
        previousScene() {
            if (this.currentSceneIndex > 0) {
                const prevScene = this.tourData.scenes[this.currentSceneIndex - 1];
                this.loadScene(prevScene.id);
            }
        }

        /**
         * Navigate to next scene
         */
        nextScene() {
            if (this.currentSceneIndex < this.tourData.scenes.length - 1) {
                const nextScene = this.tourData.scenes[this.currentSceneIndex + 1];
                this.loadScene(nextScene.id);
            }
        }

        /**
         * Toggle fullscreen mode
         */
        toggleFullscreen() {
            if (!document.fullscreenElement) {
                this.container[0].requestFullscreen().then(() => {
                    this.isFullscreen = true;
                    this.container.find('.vx-fullscreen svg').html('<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>');
                    this.trackInteraction('fullscreen_enter');
                }).catch(err => {
                    console.error('VX: Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen().then(() => {
                    this.isFullscreen = false;
                    this.container.find('.vx-fullscreen svg').html('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>');
                    this.trackInteraction('fullscreen_exit');
                });
            }
        }

        /**
         * Toggle auto rotation
         */
        toggleAutoRotate() {
            if (this.isAutoRotating) {
                this.viewer.stopAutoRotate();
                this.isAutoRotating = false;
                this.container.find('.vx-auto-rotate').removeClass('active');
                this.trackInteraction('auto_rotate_stop');
            } else {
                this.viewer.startAutoRotate(this.options.autoRotateSpeed);
                this.isAutoRotating = true;
                this.container.find('.vx-auto-rotate').addClass('active');
                this.trackInteraction('auto_rotate_start');
            }
        }

        /**
         * Show hotspot information
         */
        showHotspotInfo(hotspot) {
            const content = `
                <h3>${hotspot.text || 'Information'}</h3>
                ${hotspot.content ? `<p>${hotspot.content}</p>` : ''}
            `;
            
            this.infoPanel.find('.vx-hotspot-body').html(content);
            this.infoPanel.addClass('show');
        }

        /**
         * Hide hotspot information
         */
        hideHotspotInfo() {
            this.infoPanel.removeClass('show');
        }

        /**
         * Update scene navigation
         */
        updateSceneNavigation() {
            const counter = this.container.find('.vx-scene-counter');
            const prevBtn = this.container.find('.vx-prev-scene');
            const nextBtn = this.container.find('.vx-next-scene');
            
            counter.text(`${this.currentSceneIndex + 1} / ${this.tourData.scenes.length}`);
            
            prevBtn.prop('disabled', this.currentSceneIndex === 0);
            nextBtn.prop('disabled', this.currentSceneIndex === this.tourData.scenes.length - 1);
            
            // Hide navigation if only one scene
            if (this.tourData.scenes.length <= 1) {
                this.container.find('.vx-scene-nav').hide();
            }
        }

        /**
         * Handle fullscreen change
         */
        handleFullscreenChange() {
            this.isFullscreen = !!document.fullscreenElement;
            
            if (this.isFullscreen) {
                this.container.find('.vx-fullscreen svg').html('<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>');
            } else {
                this.container.find('.vx-fullscreen svg').html('<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>');
            }
        }

        /**
         * Show/hide controls
         */
        showControls() {
            this.controlsElement.removeClass('hidden');
        }

        hideControls() {
            this.controlsElement.addClass('hidden');
        }

        /**
         * Show loading state
         */
        showLoading() {
            this.loadingElement.show();
        }

        /**
         * Hide loading state
         */
        hideLoading() {
            this.loadingElement.hide();
        }

        /**
         * Show error state
         */
        showError(message) {
            const template = $('#vx-error-template').html();
            if (template) {
                const html = template.replace('{{message}}', message);
                this.viewerElement.html(html);
            }
            this.hideLoading();
        }

        /**
         * Retry loading
         */
        retryLoad() {
            if (this.options.tourId) {
                this.loadTour(this.options.tourId);
            }
        }

        /**
         * Track user interactions
         */
        trackInteraction(type, sceneId = null, hotspotId = null) {
            if (!this.options.tourId) return;
            
            $.ajax({
                url: vxPublic.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_track_interaction',
                    tour_id: this.options.tourId,
                    interaction_type: type,
                    scene_id: sceneId,
                    hotspot_id: hotspotId,
                    nonce: vxPublic.nonce
                },
                success: () => {
                    // Interaction tracked successfully
                },
                error: () => {
                    // Fail silently for tracking
                }
            });
        }

        /**
         * Get current scene
         */
        getCurrentScene() {
            return this.tourData.scenes[this.currentSceneIndex];
        }

        /**
         * Check WebGL support
         */
        checkWebGLSupport() {
            try {
                const canvas = document.createElement('canvas');
                return !!(window.WebGLRenderingContext && 
                         (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
            } catch (e) {
                return false;
            }
        }

        /**
         * Generate unique ID
         */
        generateId() {
            return 'vx-' + Math.random().toString(36).substr(2, 9);
        }

        /**
         * Handle hotspot click
         */
        handleHotspotClick(hotspotId) {
            // This is handled by Pannellum's click handlers
            // but we can add additional logic here if needed
        }

        /**
         * Destroy viewer
         */
        destroy() {
            if (this.viewer) {
                this.viewer.destroy();
                this.viewer = null;
            }
            
            this.container.empty();
            $(document).off('keydown');
        }
    }

    /**
     * jQuery plugin
     */
    $.fn.vortex360 = function(options) {
        return this.each(function() {
            const $this = $(this);
            let instance = $this.data('vortex360');
            
            if (!instance) {
                instance = new VXTourViewer($this, options);
                $this.data('vortex360', instance);
            }
            
            return instance;
        });
    };

    /**
     * Auto-initialize viewers
     */
    $(document).ready(function() {
        // Initialize shortcode viewers
        $('.vx-tour-shortcode').each(function() {
            const $this = $(this);
            const options = {
                tourId: $this.data('tour-id'),
                width: $this.data('width') || '100%',
                height: $this.data('height') || '600px',
                autoLoad: $this.data('auto-load') !== false,
                showControls: $this.data('show-controls') !== false,
                mouseZoom: $this.data('mouse-zoom') !== false,
                autoRotate: $this.data('auto-rotate') === true,
                autoRotateSpeed: $this.data('auto-rotate-speed') || 2
            };
            
            $this.vortex360(options);
        });
        
        // Initialize Gutenberg block viewers
        $('.wp-block-vortex360-tour-viewer').each(function() {
            const $this = $(this);
            const options = JSON.parse($this.attr('data-options') || '{}');
            $this.vortex360(options);
        });
    });

    // Make VXTourViewer globally available
    window.VXTourViewer = VXTourViewer;

})(jQuery);