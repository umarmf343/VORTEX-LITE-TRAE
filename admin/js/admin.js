/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

/**
 * Vortex360 Lite Admin JavaScript
 * Handles AJAX interactions, form submissions, and dynamic UI functionality
 */

(function($) {
    'use strict';

    // Global admin object
    window.Vortex360Admin = {
        init: function() {
            this.bindEvents();
            this.initComponents();
            this.setupAjax();
        },

        /**
         * Bind event handlers for admin interface
         */
        bindEvents: function() {
            // Tour management
            $(document).on('click', '.vortex360-save-tour', this.saveTour);
            $(document).on('click', '.vortex360-delete-tour', this.deleteTour);
            
            // Scene management
            $(document).on('click', '.vortex360-add-scene', this.addScene);
            $(document).on('click', '.vortex360-save-scene', this.saveScene);
            $(document).on('click', '.vortex360-delete-scene', this.deleteScene);
            $(document).on('click', '.vortex360-edit-scene', this.editScene);
            
            // Hotspot management
            $(document).on('click', '.vortex360-add-hotspot', this.addHotspot);
            $(document).on('click', '.vortex360-save-hotspot', this.saveHotspot);
            $(document).on('click', '.vortex360-delete-hotspot', this.deleteHotspot);
            
            // Image upload
            $(document).on('click', '.vortex360-upload-image', this.uploadImage);
            $(document).on('change', '.vortex360-image-input', this.handleImageSelect);
            
            // Modal controls
            $(document).on('click', '.vortex360-modal-close', this.closeModal);
            $(document).on('click', '.vortex360-modal-backdrop', this.closeModal);
            
            // Form validation
            $(document).on('submit', '.vortex360-form', this.validateForm);
            
            // Hotspot positioning
            $(document).on('click', '.vortex360-scene-preview', this.positionHotspot);
            
            // Keyboard shortcuts
            $(document).on('keydown', this.handleKeyboard);
        },

        /**
         * Initialize UI components
         */
        initComponents: function() {
            // Initialize color pickers
            if ($.fn.wpColorPicker) {
                $('.vortex360-color-picker').wpColorPicker();
            }
            
            // Initialize sortable lists
            if ($.fn.sortable) {
                $('.vortex360-sortable').sortable({
                    handle: '.vortex360-drag-handle',
                    update: this.updateSortOrder
                });
            }
            
            // Initialize tooltips
            this.initTooltips();
            
            // Setup media uploader
            this.setupMediaUploader();
            
            // Initialize scene preview
            this.initScenePreview();
        },

        /**
         * Setup AJAX defaults and error handling
         */
        setupAjax: function() {
            // Set default AJAX settings
            $.ajaxSetup({
                beforeSend: function(xhr, settings) {
                    // Add nonce to all AJAX requests
                    if (settings.data && settings.data.indexOf('nonce=') === -1) {
                        settings.data += '&nonce=' + vortex360Admin.nonce;
                    }
                }
            });
            
            // Global AJAX error handler
            $(document).ajaxError(function(event, xhr, settings, error) {
                if (xhr.status === 403) {
                    Vortex360Admin.showNotification('Session expired. Please refresh the page.', 'error');
                } else if (xhr.status === 500) {
                    Vortex360Admin.showNotification('Server error occurred. Please try again.', 'error');
                }
            });
        },

        /**
         * Save tour data via AJAX
         * @param {Event} e Click event
         */
        saveTour: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $form = $button.closest('form');
            const formData = new FormData($form[0]);
            
            // Add action and nonce
            formData.append('action', 'vortex360_save_tour');
            formData.append('nonce', vortex360Admin.nonce);
            
            Vortex360Admin.setLoading($button, true);
            
            $.ajax({
                url: vortex360Admin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        Vortex360Admin.showNotification(response.data.message || 'Tour saved successfully!', 'success');
                        
                        // Update tour ID if new tour
                        if (response.data.tour_id && !$form.find('[name="tour_id"]').val()) {
                            $form.find('[name="tour_id"]').val(response.data.tour_id);
                            // Update URL to include tour_id
                            const newUrl = new URL(window.location);
                            newUrl.searchParams.set('tour_id', response.data.tour_id);
                            window.history.replaceState({}, '', newUrl);
                        }
                    } else {
                        Vortex360Admin.showNotification(response.data || 'Failed to save tour', 'error');
                    }
                },
                error: function() {
                    Vortex360Admin.showNotification('Network error occurred', 'error');
                },
                complete: function() {
                    Vortex360Admin.setLoading($button, false);
                }
            });
        },

        /**
         * Delete tour with confirmation
         * @param {Event} e Click event
         */
        deleteTour: function(e) {
            e.preventDefault();
            
            if (!confirm(vortex360Admin.strings.confirmDelete)) {
                return;
            }
            
            const $button = $(this);
            const tourId = $button.data('tour-id');
            
            Vortex360Admin.setLoading($button, true);
            
            $.post(vortex360Admin.ajaxUrl, {
                action: 'vortex360_delete_tour',
                tour_id: tourId,
                nonce: vortex360Admin.nonce
            })
            .done(function(response) {
                if (response.success) {
                    Vortex360Admin.showNotification('Tour deleted successfully!', 'success');
                    // Redirect to tours list
                    window.location.href = 'admin.php?page=vortex360-lite';
                } else {
                    Vortex360Admin.showNotification(response.data || 'Failed to delete tour', 'error');
                }
            })
            .fail(function() {
                Vortex360Admin.showNotification('Network error occurred', 'error');
            })
            .always(function() {
                Vortex360Admin.setLoading($button, false);
            });
        },

        /**
         * Add new scene modal
         * @param {Event} e Click event
         */
        addScene: function(e) {
            e.preventDefault();
            
            const tourId = $(this).data('tour-id');
            const modalHtml = Vortex360Admin.getSceneModalHtml(null, tourId);
            
            Vortex360Admin.showModal(modalHtml);
        },

        /**
         * Save scene data
         * @param {Event} e Click event
         */
        saveScene: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $form = $button.closest('form');
            const formData = new FormData($form[0]);
            
            formData.append('action', 'vortex360_save_scene');
            formData.append('nonce', vortex360Admin.nonce);
            
            Vortex360Admin.setLoading($button, true);
            
            $.ajax({
                url: vortex360Admin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        Vortex360Admin.showNotification('Scene saved successfully!', 'success');
                        Vortex360Admin.closeModal();
                        // Refresh scenes list
                        location.reload();
                    } else {
                        Vortex360Admin.showNotification(response.data || 'Failed to save scene', 'error');
                    }
                },
                error: function() {
                    Vortex360Admin.showNotification('Network error occurred', 'error');
                },
                complete: function() {
                    Vortex360Admin.setLoading($button, false);
                }
            });
        },

        /**
         * Delete scene with confirmation
         * @param {Event} e Click event
         */
        deleteScene: function(e) {
            e.preventDefault();
            
            if (!confirm(vortex360Admin.strings.confirmDelete)) {
                return;
            }
            
            const $button = $(this);
            const sceneId = $button.data('scene-id');
            
            Vortex360Admin.setLoading($button, true);
            
            $.post(vortex360Admin.ajaxUrl, {
                action: 'vortex360_delete_scene',
                scene_id: sceneId,
                nonce: vortex360Admin.nonce
            })
            .done(function(response) {
                if (response.success) {
                    Vortex360Admin.showNotification('Scene deleted successfully!', 'success');
                    $button.closest('.vortex360-scene-card').fadeOut(300, function() {
                        $(this).remove();
                    });
                } else {
                    Vortex360Admin.showNotification(response.data || 'Failed to delete scene', 'error');
                }
            })
            .fail(function() {
                Vortex360Admin.showNotification('Network error occurred', 'error');
            })
            .always(function() {
                Vortex360Admin.setLoading($button, false);
            });
        },

        /**
         * Edit scene modal
         * @param {Event} e Click event
         */
        editScene: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const sceneId = $button.data('scene-id');
            const tourId = $button.data('tour-id');
            
            // Get scene data and show modal
            // In a real implementation, you'd fetch scene data via AJAX
            const modalHtml = Vortex360Admin.getSceneModalHtml(sceneId, tourId);
            Vortex360Admin.showModal(modalHtml);
        },

        /**
         * Add hotspot to scene
         * @param {Event} e Click event
         */
        addHotspot: function(e) {
            e.preventDefault();
            
            const sceneId = $(this).data('scene-id');
            const modalHtml = Vortex360Admin.getHotspotModalHtml(null, sceneId);
            
            Vortex360Admin.showModal(modalHtml);
        },

        /**
         * Save hotspot data
         * @param {Event} e Click event
         */
        saveHotspot: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $form = $button.closest('form');
            const formData = $form.serialize();
            
            Vortex360Admin.setLoading($button, true);
            
            $.post(vortex360Admin.ajaxUrl, formData + '&action=vortex360_save_hotspot&nonce=' + vortex360Admin.nonce)
            .done(function(response) {
                if (response.success) {
                    Vortex360Admin.showNotification('Hotspot saved successfully!', 'success');
                    Vortex360Admin.closeModal();
                    // Refresh hotspots
                    location.reload();
                } else {
                    Vortex360Admin.showNotification(response.data || 'Failed to save hotspot', 'error');
                }
            })
            .fail(function() {
                Vortex360Admin.showNotification('Network error occurred', 'error');
            })
            .always(function() {
                Vortex360Admin.setLoading($button, false);
            });
        },

        /**
         * Delete hotspot with confirmation
         * @param {Event} e Click event
         */
        deleteHotspot: function(e) {
            e.preventDefault();
            
            if (!confirm(vortex360Admin.strings.confirmDelete)) {
                return;
            }
            
            const $button = $(this);
            const hotspotId = $button.data('hotspot-id');
            
            Vortex360Admin.setLoading($button, true);
            
            $.post(vortex360Admin.ajaxUrl, {
                action: 'vortex360_delete_hotspot',
                hotspot_id: hotspotId,
                nonce: vortex360Admin.nonce
            })
            .done(function(response) {
                if (response.success) {
                    Vortex360Admin.showNotification('Hotspot deleted successfully!', 'success');
                    $button.closest('.vortex360-hotspot').fadeOut(300, function() {
                        $(this).remove();
                    });
                } else {
                    Vortex360Admin.showNotification(response.data || 'Failed to delete hotspot', 'error');
                }
            })
            .fail(function() {
                Vortex360Admin.showNotification('Network error occurred', 'error');
            })
            .always(function() {
                Vortex360Admin.setLoading($button, false);
            });
        },

        /**
         * Handle image upload
         * @param {Event} e Click event
         */
        uploadImage: function(e) {
            e.preventDefault();
            
            const $button = $(this);
            const $input = $('<input type="file" accept="image/*" style="display:none;">');
            
            $input.on('change', function() {
                const file = this.files[0];
                if (file) {
                    Vortex360Admin.processImageUpload(file, $button);
                }
            });
            
            $input.click();
        },

        /**
         * Handle image file selection
         * @param {Event} e Change event
         */
        handleImageSelect: function(e) {
            const file = e.target.files[0];
            if (file) {
                Vortex360Admin.processImageUpload(file, $(this));
            }
        },

        /**
         * Process image upload via AJAX
         * @param {File} file Image file
         * @param {jQuery} $element Target element
         */
        processImageUpload: function(file, $element) {
            // Validate file type
            if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
                Vortex360Admin.showNotification('Please select a valid image file (JPG or PNG)', 'error');
                return;
            }
            
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                Vortex360Admin.showNotification('Image file is too large. Maximum size is 10MB.', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('action', 'vortex360_upload_image');
            formData.append('nonce', vortex360Admin.nonce);
            
            const $preview = $element.siblings('.vortex360-image-preview');
            const $urlInput = $element.siblings('.vortex360-image-url');
            
            Vortex360Admin.setLoading($element, true);
            
            $.ajax({
                url: vortex360Admin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    if (response.success) {
                        const imageUrl = response.data.url;
                        
                        // Update preview
                        if ($preview.length) {
                            $preview.attr('src', imageUrl).show();
                        }
                        
                        // Update URL input
                        if ($urlInput.length) {
                            $urlInput.val(imageUrl);
                        }
                        
                        Vortex360Admin.showNotification('Image uploaded successfully!', 'success');
                    } else {
                        Vortex360Admin.showNotification(response.data || 'Failed to upload image', 'error');
                    }
                },
                error: function() {
                    Vortex360Admin.showNotification('Network error during upload', 'error');
                },
                complete: function() {
                    Vortex360Admin.setLoading($element, false);
                }
            });
        },

        /**
         * Position hotspot on scene image
         * @param {Event} e Click event
         */
        positionHotspot: function(e) {
            const $preview = $(this);
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Update hotspot position inputs
            const $form = $preview.closest('.vortex360-modal-content').find('form');
            $form.find('[name="pitch"]').val(y);
            $form.find('[name="yaw"]').val(x);
            
            // Show visual indicator
            $preview.find('.vortex360-hotspot-indicator').remove();
            $preview.append(`<div class="vortex360-hotspot-indicator" style="position: absolute; left: ${x}px; top: ${y}px; width: 20px; height: 20px; background: #f093fb; border: 3px solid white; border-radius: 50%; transform: translate(-50%, -50%);"></div>`);
        },

        /**
         * Handle keyboard shortcuts
         * @param {Event} e Keyboard event
         */
        handleKeyboard: function(e) {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                $('.vortex360-save-tour, .vortex360-save-scene, .vortex360-save-hotspot').first().click();
            }
            
            // Escape to close modal
            if (e.key === 'Escape') {
                Vortex360Admin.closeModal();
            }
        },

        /**
         * Validate form before submission
         * @param {Event} e Submit event
         */
        validateForm: function(e) {
            const $form = $(this);
            let isValid = true;
            
            // Check required fields
            $form.find('[required]').each(function() {
                const $field = $(this);
                if (!$field.val().trim()) {
                    $field.addClass('vortex360-error');
                    isValid = false;
                } else {
                    $field.removeClass('vortex360-error');
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                Vortex360Admin.showNotification('Please fill in all required fields', 'error');
            }
        },

        /**
         * Update sort order after drag and drop
         * @param {Event} event Sortable update event
         * @param {Object} ui Sortable UI object
         */
        updateSortOrder: function(event, ui) {
            const $list = $(this);
            const sortData = [];
            
            $list.children().each(function(index) {
                const id = $(this).data('id');
                if (id) {
                    sortData.push({ id: id, order: index + 1 });
                }
            });
            
            // Send sort order to server
            $.post(vortex360Admin.ajaxUrl, {
                action: 'vortex360_update_sort_order',
                sort_data: sortData,
                nonce: vortex360Admin.nonce
            });
        },

        /**
         * Initialize tooltips
         */
        initTooltips: function() {
            $('[data-tooltip]').each(function() {
                const $element = $(this);
                const tooltip = $element.data('tooltip');
                
                $element.on('mouseenter', function() {
                    const $tooltip = $('<div class="vortex360-tooltip">' + tooltip + '</div>');
                    $('body').append($tooltip);
                    
                    const rect = this.getBoundingClientRect();
                    $tooltip.css({
                        position: 'fixed',
                        top: rect.bottom + 5,
                        left: rect.left + (rect.width / 2) - ($tooltip.outerWidth() / 2),
                        zIndex: 9999
                    });
                });
                
                $element.on('mouseleave', function() {
                    $('.vortex360-tooltip').remove();
                });
            });
        },

        /**
         * Setup WordPress media uploader
         */
        setupMediaUploader: function() {
            if (typeof wp !== 'undefined' && wp.media) {
                $(document).on('click', '.vortex360-media-upload', function(e) {
                    e.preventDefault();
                    
                    const $button = $(this);
                    const frame = wp.media({
                        title: 'Select Image',
                        button: { text: 'Use Image' },
                        multiple: false,
                        library: { type: 'image' }
                    });
                    
                    frame.on('select', function() {
                        const attachment = frame.state().get('selection').first().toJSON();
                        const $preview = $button.siblings('.vortex360-image-preview');
                        const $urlInput = $button.siblings('.vortex360-image-url');
                        
                        if ($preview.length) {
                            $preview.attr('src', attachment.url).show();
                        }
                        
                        if ($urlInput.length) {
                            $urlInput.val(attachment.url);
                        }
                    });
                    
                    frame.open();
                });
            }
        },

        /**
         * Initialize scene preview functionality
         */
        initScenePreview: function() {
            $('.vortex360-scene-preview').each(function() {
                const $preview = $(this);
                $preview.css('position', 'relative');
                
                // Add click handler for hotspot positioning
                $preview.on('click', Vortex360Admin.positionHotspot);
            });
        },

        /**
         * Show modal dialog
         * @param {string} content Modal HTML content
         */
        showModal: function(content) {
            const $modal = $(`
                <div class="vortex360-modal">
                    <div class="vortex360-modal-backdrop"></div>
                    <div class="vortex360-modal-content">
                        <button class="vortex360-modal-close" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                        ${content}
                    </div>
                </div>
            `);
            
            $('body').append($modal);
            
            // Initialize components in modal
            this.initComponents();
        },

        /**
         * Close modal dialog
         */
        closeModal: function() {
            $('.vortex360-modal').fadeOut(300, function() {
                $(this).remove();
            });
        },

        /**
         * Show notification message
         * @param {string} message Notification message
         * @param {string} type Notification type (success, error, warning)
         */
        showNotification: function(message, type = 'success') {
            const $notification = $(`
                <div class="vortex360-notification vortex360-notification-${type}">
                    ${message}
                </div>
            `);
            
            $('body').append($notification);
            
            // Auto-hide after 5 seconds
            setTimeout(function() {
                $notification.fadeOut(300, function() {
                    $(this).remove();
                });
            }, 5000);
            
            // Click to dismiss
            $notification.on('click', function() {
                $(this).fadeOut(300, function() {
                    $(this).remove();
                });
            });
        },

        /**
         * Set loading state for button
         * @param {jQuery} $button Button element
         * @param {boolean} loading Loading state
         */
        setLoading: function($button, loading) {
            if (loading) {
                $button.prop('disabled', true)
                       .data('original-text', $button.text())
                       .html('<span class="vortex360-spinner"></span> ' + vortex360Admin.strings.saving);
            } else {
                $button.prop('disabled', false)
                       .text($button.data('original-text') || $button.text().replace(vortex360Admin.strings.saving, '').trim());
            }
        },

        /**
         * Get scene modal HTML
         * @param {number|null} sceneId Scene ID for editing
         * @param {number} tourId Tour ID
         * @returns {string} Modal HTML
         */
        getSceneModalHtml: function(sceneId, tourId) {
            const isEdit = sceneId !== null;
            const title = isEdit ? 'Edit Scene' : 'Add New Scene';
            
            return `
                <form class="vortex360-form">
                    <h2>${title}</h2>
                    ${isEdit ? `<input type="hidden" name="scene_id" value="${sceneId}">` : ''}
                    <input type="hidden" name="tour_id" value="${tourId}">
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Scene Title *</label>
                        <input type="text" name="title" class="vortex360-input" required>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Description</label>
                        <textarea name="description" class="vortex360-textarea"></textarea>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">360° Image *</label>
                        <input type="url" name="image_url" class="vortex360-input vortex360-image-url" required>
                        <button type="button" class="vortex360-btn vortex360-btn-secondary vortex360-media-upload">Select Image</button>
                        <img class="vortex360-image-preview" style="max-width: 200px; margin-top: 10px; display: none;">
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Image Type</label>
                        <select name="image_type" class="vortex360-select">
                            <option value="equirectangular">Equirectangular</option>
                            <option value="cubemap">Cubemap</option>
                        </select>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label>
                            <input type="checkbox" name="is_default" value="1"> Set as default scene
                        </label>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <button type="button" class="vortex360-btn vortex360-btn-primary vortex360-save-scene">Save Scene</button>
                        <button type="button" class="vortex360-btn vortex360-btn-secondary vortex360-modal-close">Cancel</button>
                    </div>
                </form>
            `;
        },

        /**
         * Get hotspot modal HTML
         * @param {number|null} hotspotId Hotspot ID for editing
         * @param {number} sceneId Scene ID
         * @returns {string} Modal HTML
         */
        getHotspotModalHtml: function(hotspotId, sceneId) {
            const isEdit = hotspotId !== null;
            const title = isEdit ? 'Edit Hotspot' : 'Add New Hotspot';
            
            return `
                <form class="vortex360-form">
                    <h2>${title}</h2>
                    ${isEdit ? `<input type="hidden" name="hotspot_id" value="${hotspotId}">` : ''}
                    <input type="hidden" name="scene_id" value="${sceneId}">
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Hotspot Title *</label>
                        <input type="text" name="title" class="vortex360-input" required>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Type</label>
                        <select name="type" class="vortex360-select">
                            <option value="info">Information</option>
                            <option value="scene">Scene Link</option>
                            <option value="url">External Link</option>
                        </select>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Content</label>
                        <textarea name="content" class="vortex360-textarea"></textarea>
                    </div>
                    
                    <div class="vortex360-form-group">
                        <label class="vortex360-label">Position (Click on scene image to set)</label>
                        <input type="number" name="pitch" class="vortex360-input" placeholder="Pitch" step="0.1">
                        <input type="number" name="yaw" class="vortex360-input" placeholder="Yaw" step="0.1">
                    </div>
                    
                    <div class="vortex360-form-group">
                        <button type="button" class="vortex360-btn vortex360-btn-primary vortex360-save-hotspot">Save Hotspot</button>
                        <button type="button" class="vortex360-btn vortex360-btn-secondary vortex360-modal-close">Cancel</button>
                    </div>
                </form>
            `;
        }
    };

    // Initialize when document is ready
    $(document).ready(function() {
        Vortex360Admin.init();
    });

})(jQuery);