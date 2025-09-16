/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

/**
 * Vortex360 Frontend Viewer
 * Pannellum-based 360° tour viewer with hotspot support
 */

(function() {
    'use strict';

    // Global viewer object
    window.Vortex360Viewer = {
        viewers: {},
        config: {
            pannellumPath: 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/',
            autoLoad: true,
            showControls: true,
            showFullscreenCtrl: true,
            showZoomCtrl: true,
            mouseZoom: true,
            doubleClickZoom: true,
            draggable: true,
            keyboardZoom: true,
            showTitle: true,
            compass: true,
            northOffset: 0,
            preview: '',
            previewTitle: '',
            previewAuthor: '',
            hotSpotDebug: false,
            backgroundColor: [0, 0, 0],
            loadButtonLabel: 'Click to Load Panorama',
            loadingLabel: 'Loading...',
            bylineLabel: 'by %s',
            noPanoramaError: 'No panorama image was specified.',
            fileAccessError: 'The file %s could not be accessed.',
            malformedURLError: 'There is something wrong with the panorama URL.',
            iOS: (function() {
                return navigator.userAgent.match(/iPhone|iPad|iPod/i);
            })(),
            mobile: (function() {
                return navigator.userAgent.match(/iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile/i);
            })()
        },

        /**
         * Initialize viewer for a container element
         * @param {string} containerId Container element ID
         * @param {Object} tourData Tour configuration data
         * @param {Object} options Additional viewer options
         */
        init: function(containerId, tourData, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) {
                console.error('Vortex360: Container not found:', containerId);
                return null;
            }

            // Merge options with defaults
            const config = Object.assign({}, this.config, options);
            
            // Load Pannellum if not already loaded
            this.loadPannellum().then(() => {
                this.createViewer(containerId, tourData, config);
            }).catch(error => {
                console.error('Vortex360: Failed to load Pannellum:', error);
                this.showError(container, 'Failed to load 360° viewer');
            });
        },

        /**
         * Load Pannellum library dynamically
         * @returns {Promise} Promise that resolves when Pannellum is loaded
         */
        loadPannellum: function() {
            return new Promise((resolve, reject) => {
                // Check if Pannellum is already loaded
                if (window.pannellum) {
                    resolve();
                    return;
                }

                // Load CSS
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = this.config.pannellumPath + 'pannellum.css';
                document.head.appendChild(cssLink);

                // Load JavaScript
                const script = document.createElement('script');
                script.src = this.config.pannellumPath + 'pannellum.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        },

        /**
         * Create Pannellum viewer instance
         * @param {string} containerId Container element ID
         * @param {Object} tourData Tour configuration data
         * @param {Object} config Viewer configuration
         */
        createViewer: function(containerId, tourData, config) {
            const container = document.getElementById(containerId);
            
            // Show loading state
            this.showLoading(container);

            // Prepare scenes configuration
            const scenes = this.prepareScenes(tourData.scenes);
            const defaultScene = this.getDefaultScene(tourData.scenes);

            // Pannellum configuration
            const pannellumConfig = {
                "default": {
                    "firstScene": defaultScene,
                    "author": tourData.title || "Vortex360 Tour",
                    "sceneFadeDuration": 1000,
                    "autoLoad": config.autoLoad,
                    "showControls": config.showControls,
                    "showFullscreenCtrl": config.showFullscreenCtrl,
                    "showZoomCtrl": config.showZoomCtrl,
                    "mouseZoom": config.mouseZoom,
                    "doubleClickZoom": config.doubleClickZoom,
                    "draggable": config.draggable,
                    "keyboardZoom": config.keyboardZoom,
                    "compass": config.compass,
                    "northOffset": config.northOffset,
                    "hotSpotDebug": config.hotSpotDebug,
                    "backgroundColor": config.backgroundColor
                },
                "scenes": scenes
            };

            try {
                // Create Pannellum viewer
                const viewer = pannellum.viewer(containerId, pannellumConfig);
                
                // Store viewer reference
                this.viewers[containerId] = {
                    viewer: viewer,
                    tourData: tourData,
                    config: config
                };

                // Setup event listeners
                this.setupEventListeners(containerId, viewer);

                // Hide loading state
                this.hideLoading(container);

                // Trigger ready event
                this.triggerEvent(container, 'vortex360:ready', { viewer: viewer, tourData: tourData });

            } catch (error) {
                console.error('Vortex360: Failed to create viewer:', error);
                this.showError(container, 'Failed to initialize 360° viewer');
            }
        },

        /**
         * Prepare scenes configuration for Pannellum
         * @param {Array} scenes Array of scene objects
         * @returns {Object} Pannellum scenes configuration
         */
        prepareScenes: function(scenes) {
            const pannellumScenes = {};

            scenes.forEach(scene => {
                const sceneId = 'scene_' + scene.id;
                
                pannellumScenes[sceneId] = {
                    "title": scene.title,
                    "type": scene.image_type || "equirectangular",
                    "panorama": scene.image_url,
                    "hotSpots": this.prepareHotspots(scene.hotspots || [])
                };

                // Add scene-specific settings if available
                if (scene.settings) {
                    Object.assign(pannellumScenes[sceneId], scene.settings);
                }
            });

            return pannellumScenes;
        },

        /**
         * Prepare hotspots configuration for a scene
         * @param {Array} hotspots Array of hotspot objects
         * @returns {Array} Pannellum hotspots configuration
         */
        prepareHotspots: function(hotspots) {
            return hotspots.map(hotspot => {
                const config = {
                    "pitch": parseFloat(hotspot.pitch) || 0,
                    "yaw": parseFloat(hotspot.yaw) || 0,
                    "type": this.getHotspotType(hotspot.type),
                    "text": hotspot.title || hotspot.content
                };

                // Handle different hotspot types
                switch (hotspot.type) {
                    case 'scene':
                        if (hotspot.target_scene_id) {
                            config.sceneId = 'scene_' + hotspot.target_scene_id;
                        }
                        break;
                    
                    case 'url':
                        if (hotspot.url) {
                            config.URL = hotspot.url;
                        }
                        break;
                    
                    case 'info':
                    default:
                        if (hotspot.content) {
                            config.text = hotspot.content;
                        }
                        break;
                }

                // Add click handler for custom actions
                if (hotspot.type === 'info' && hotspot.content) {
                    config.clickHandlerFunc = () => {
                        this.showHotspotModal(hotspot);
                    };
                }

                return config;
            });
        },

        /**
         * Get Pannellum hotspot type from Vortex360 type
         * @param {string} type Vortex360 hotspot type
         * @returns {string} Pannellum hotspot type
         */
        getHotspotType: function(type) {
            switch (type) {
                case 'scene':
                    return 'scene';
                case 'url':
                    return 'info'; // Pannellum will handle URL in clickHandlerFunc
                case 'info':
                default:
                    return 'info';
            }
        },

        /**
         * Get default scene ID from scenes array
         * @param {Array} scenes Array of scene objects
         * @returns {string} Default scene ID
         */
        getDefaultScene: function(scenes) {
            // Find scene marked as default
            const defaultScene = scenes.find(scene => scene.is_default);
            if (defaultScene) {
                return 'scene_' + defaultScene.id;
            }

            // Fall back to first scene
            if (scenes.length > 0) {
                return 'scene_' + scenes[0].id;
            }

            return null;
        },

        /**
         * Setup event listeners for viewer
         * @param {string} containerId Container element ID
         * @param {Object} viewer Pannellum viewer instance
         */
        setupEventListeners: function(containerId, viewer) {
            const container = document.getElementById(containerId);

            // Scene change events
            viewer.on('scenechange', (sceneId) => {
                this.triggerEvent(container, 'vortex360:scenechange', { sceneId: sceneId });
                this.trackAnalytics('scene_view', { scene_id: sceneId.replace('scene_', '') });
            });

            // Error handling
            viewer.on('error', (error) => {
                console.error('Vortex360 Viewer Error:', error);
                this.triggerEvent(container, 'vortex360:error', { error: error });
            });

            // Load events
            viewer.on('load', () => {
                this.triggerEvent(container, 'vortex360:load');
            });

            // Mouse events for interaction tracking
            viewer.on('mousedown', () => {
                this.trackAnalytics('interaction', { type: 'mousedown' });
            });
        },

        /**
         * Show hotspot modal with content
         * @param {Object} hotspot Hotspot data
         */
        showHotspotModal: function(hotspot) {
            // Create modal HTML
            const modal = document.createElement('div');
            modal.className = 'vortex360-hotspot-modal';
            modal.innerHTML = `
                <div class="vortex360-modal-backdrop"></div>
                <div class="vortex360-modal-content">
                    <button class="vortex360-modal-close">&times;</button>
                    <h3>${this.escapeHtml(hotspot.title || 'Information')}</h3>
                    <div class="vortex360-modal-body">
                        ${hotspot.content || ''}
                    </div>
                </div>
            `;

            // Add to page
            document.body.appendChild(modal);

            // Setup close handlers
            const closeBtn = modal.querySelector('.vortex360-modal-close');
            const backdrop = modal.querySelector('.vortex360-modal-backdrop');
            
            const closeModal = () => {
                modal.remove();
            };

            closeBtn.addEventListener('click', closeModal);
            backdrop.addEventListener('click', closeModal);

            // Close on Escape key
            const handleKeydown = (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    document.removeEventListener('keydown', handleKeydown);
                }
            };
            document.addEventListener('keydown', handleKeydown);

            // Track analytics
            this.trackAnalytics('hotspot_view', { hotspot_id: hotspot.id });
        },

        /**
         * Show loading state
         * @param {Element} container Container element
         */
        showLoading: function(container) {
            const loader = document.createElement('div');
            loader.className = 'vortex360-loader';
            loader.innerHTML = `
                <div class="vortex360-spinner"></div>
                <p>Loading 360° Tour...</p>
            `;
            container.appendChild(loader);
        },

        /**
         * Hide loading state
         * @param {Element} container Container element
         */
        hideLoading: function(container) {
            const loader = container.querySelector('.vortex360-loader');
            if (loader) {
                loader.remove();
            }
        },

        /**
         * Show error message
         * @param {Element} container Container element
         * @param {string} message Error message
         */
        showError: function(container, message) {
            this.hideLoading(container);
            
            const error = document.createElement('div');
            error.className = 'vortex360-error';
            error.innerHTML = `
                <div class="vortex360-error-icon">⚠️</div>
                <p>${this.escapeHtml(message)}</p>
                <button class="vortex360-retry-btn" onclick="location.reload()">Retry</button>
            `;
            container.appendChild(error);
        },

        /**
         * Trigger custom event on container
         * @param {Element} container Container element
         * @param {string} eventName Event name
         * @param {Object} detail Event detail data
         */
        triggerEvent: function(container, eventName, detail = {}) {
            const event = new CustomEvent(eventName, {
                detail: detail,
                bubbles: true,
                cancelable: true
            });
            container.dispatchEvent(event);
        },

        /**
         * Track analytics events
         * @param {string} action Analytics action
         * @param {Object} data Additional data
         */
        trackAnalytics: function(action, data = {}) {
            // Send analytics to WordPress via AJAX
            if (window.vortex360Ajax && window.vortex360Ajax.ajaxUrl) {
                const formData = new FormData();
                formData.append('action', 'vortex360_track_analytics');
                formData.append('event_action', action);
                formData.append('event_data', JSON.stringify(data));
                formData.append('nonce', window.vortex360Ajax.nonce);

                fetch(window.vortex360Ajax.ajaxUrl, {
                    method: 'POST',
                    body: formData
                }).catch(error => {
                    console.warn('Vortex360: Analytics tracking failed:', error);
                });
            }
        },

        /**
         * Escape HTML to prevent XSS
         * @param {string} text Text to escape
         * @returns {string} Escaped text
         */
        escapeHtml: function(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        /**
         * Get viewer instance by container ID
         * @param {string} containerId Container element ID
         * @returns {Object|null} Viewer instance or null
         */
        getViewer: function(containerId) {
            return this.viewers[containerId] || null;
        },

        /**
         * Destroy viewer instance
         * @param {string} containerId Container element ID
         */
        destroy: function(containerId) {
            const viewerData = this.viewers[containerId];
            if (viewerData && viewerData.viewer) {
                viewerData.viewer.destroy();
                delete this.viewers[containerId];
            }
        },

        /**
         * Change scene programmatically
         * @param {string} containerId Container element ID
         * @param {string} sceneId Scene ID to switch to
         */
        changeScene: function(containerId, sceneId) {
            const viewerData = this.viewers[containerId];
            if (viewerData && viewerData.viewer) {
                viewerData.viewer.loadScene('scene_' + sceneId);
            }
        },

        /**
         * Toggle fullscreen mode
         * @param {string} containerId Container element ID
         */
        toggleFullscreen: function(containerId) {
            const viewerData = this.viewers[containerId];
            if (viewerData && viewerData.viewer) {
                viewerData.viewer.toggleFullscreen();
            }
        }
    };

    // Auto-initialize viewers on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Find all Vortex360 containers
        const containers = document.querySelectorAll('.vortex360-container[data-tour-id]');
        
        containers.forEach(container => {
            const tourId = container.dataset.tourId;
            const containerId = container.id || 'vortex360-' + tourId;
            
            // Set ID if not present
            if (!container.id) {
                container.id = containerId;
            }

            // Load tour data and initialize viewer
            Vortex360Viewer.loadTourData(tourId).then(tourData => {
                if (tourData && tourData.scenes && tourData.scenes.length > 0) {
                    Vortex360Viewer.init(containerId, tourData);
                } else {
                    Vortex360Viewer.showError(container, 'No scenes found in this tour');
                }
            }).catch(error => {
                console.error('Vortex360: Failed to load tour data:', error);
                Vortex360Viewer.showError(container, 'Failed to load tour data');
            });
        });
    });

    /**
     * Load tour data from WordPress REST API
     * @param {string} tourId Tour ID
     * @returns {Promise} Promise that resolves with tour data
     */
    Vortex360Viewer.loadTourData = function(tourId) {
        return new Promise((resolve, reject) => {
            if (!window.vortex360Ajax || !window.vortex360Ajax.ajaxUrl) {
                reject(new Error('Vortex360 AJAX configuration not found'));
                return;
            }

            const formData = new FormData();
            formData.append('action', 'vortex360_get_tour_data');
            formData.append('tour_id', tourId);
            formData.append('nonce', window.vortex360Ajax.nonce);

            fetch(window.vortex360Ajax.ajaxUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    resolve(data.data);
                } else {
                    reject(new Error(data.data || 'Failed to load tour data'));
                }
            })
            .catch(reject);
        });
    };

})();