/**
 * Vortex360 Lite - Admin JavaScript
 * 
 * JavaScript functionality for WordPress admin interface
 */

(function($, window, document) {
    'use strict';
    
    // Global admin object
    window.VortexAdmin = {
        init: function() {
            this.bindEvents();
            this.initComponents();
            this.handleAjaxErrors();
        },
        
        bindEvents: function() {
            // Tour management
            $(document).on('click', '.vx-add-tour', this.addTour);
            $(document).on('click', '.vx-edit-tour', this.editTour);
            $(document).on('click', '.vx-delete-tour', this.deleteTour);
            $(document).on('click', '.vx-duplicate-tour', this.duplicateTour);
            $(document).on('click', '.vx-preview-tour', this.previewTour);
            
            // Scene management
            $(document).on('click', '.vx-add-scene', this.addScene);
            $(document).on('click', '.vx-edit-scene', this.editScene);
            $(document).on('click', '.vx-delete-scene', this.deleteScene);
            $(document).on('click', '.vx-scene-image-upload', this.uploadSceneImage);
            
            // Hotspot management
            $(document).on('click', '.vx-add-hotspot', this.addHotspot);
            $(document).on('click', '.vx-edit-hotspot', this.editHotspot);
            $(document).on('click', '.vx-delete-hotspot', this.deleteHotspot);
            
            // Import/Export
            $(document).on('click', '.vx-import-tour', this.showImportModal);
            $(document).on('click', '.vx-export-tour', this.exportTour);
            $(document).on('change', '#vx-import-file', this.handleImportFile);
            $(document).on('click', '.vx-confirm-import', this.confirmImport);
            
            // Settings
            $(document).on('click', '.vx-save-settings', this.saveSettings);
            $(document).on('click', '.vx-reset-settings', this.resetSettings);
            
            // Pro upgrade
            $(document).on('click', '.vx-upgrade-pro', this.trackUpgradeClick);
            $(document).on('click', '.vx-dismiss-notice', this.dismissNotice);
            
            // Modal controls
            $(document).on('click', '.vx-modal-close, .vx-modal-overlay', this.closeModal);
            $(document).on('click', '.vx-modal-content', function(e) { e.stopPropagation(); });
            
            // Form validation
            $(document).on('submit', '.vx-form', this.validateForm);
            
            // Tab switching
            $(document).on('click', '.vx-tab-nav a', this.switchTab);
            
            // Sortable scenes
            if ($.fn.sortable) {
                $('.vx-scenes-list').sortable({
                    handle: '.vx-scene-handle',
                    update: this.updateSceneOrder
                });
            }
        },
        
        initComponents: function() {
            // Initialize color pickers
            if ($.fn.wpColorPicker) {
                $('.vx-color-picker').wpColorPicker();
            }
            
            // Initialize media uploaders
            this.initMediaUploaders();
            
            // Initialize tooltips
            if ($.fn.tooltip) {
                $('.vx-tooltip').tooltip();
            }
            
            // Initialize select2 if available
            if ($.fn.select2) {
                $('.vx-select2').select2({
                    width: '100%'
                });
            }
            
            // Auto-save drafts
            this.initAutoSave();
        },
        
        // Tour Management
        addTour: function(e) {
            e.preventDefault();
            
            const modal = VortexAdmin.showModal('add-tour', {
                title: 'Add New Tour',
                content: VortexAdmin.getTourFormHTML()
            });
            
            // Initialize form components
            VortexAdmin.initModalComponents(modal);
        },
        
        editTour: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_get_tour',
                    tour_id: tourId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        const modal = VortexAdmin.showModal('edit-tour', {
                            title: 'Edit Tour: ' + response.data.title,
                            content: VortexAdmin.getTourFormHTML(response.data)
                        });
                        
                        VortexAdmin.initModalComponents(modal);
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to load tour data', 'error');
                }
            });
        },
        
        deleteTour: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            const tourTitle = $(this).data('tour-title');
            
            if (!confirm('Are you sure you want to delete "' + tourTitle + '"? This action cannot be undone.')) {
                return;
            }
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_delete_tour',
                    tour_id: tourId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        $('[data-tour-id="' + tourId + '"]').closest('tr').fadeOut(function() {
                            $(this).remove();
                        });
                        VortexAdmin.showNotice('Tour deleted successfully', 'success');
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to delete tour', 'error');
                }
            });
        },
        
        duplicateTour: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_duplicate_tour',
                    tour_id: tourId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        location.reload(); // Refresh to show duplicated tour
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to duplicate tour', 'error');
                }
            });
        },
        
        previewTour: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            const previewUrl = vortexAdmin.siteUrl + '?vx_preview=' + tourId + '&nonce=' + vortexAdmin.nonce;
            
            window.open(previewUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
        },
        
        // Scene Management
        addScene: function(e) {
            e.preventDefault();
            const tourId = $(this).data('tour-id');
            
            const modal = VortexAdmin.showModal('add-scene', {
                title: 'Add New Scene',
                content: VortexAdmin.getSceneFormHTML(null, tourId)
            });
            
            VortexAdmin.initModalComponents(modal);
        },
        
        editScene: function(e) {
            e.preventDefault();
            const sceneId = $(this).data('scene-id');
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_get_scene',
                    scene_id: sceneId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        const modal = VortexAdmin.showModal('edit-scene', {
                            title: 'Edit Scene: ' + response.data.title,
                            content: VortexAdmin.getSceneFormHTML(response.data)
                        });
                        
                        VortexAdmin.initModalComponents(modal);
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to load scene data', 'error');
                }
            });
        },
        
        deleteScene: function(e) {
            e.preventDefault();
            const sceneId = $(this).data('scene-id');
            const sceneTitle = $(this).data('scene-title');
            
            if (!confirm('Are you sure you want to delete "' + sceneTitle + '"? This will also delete all hotspots in this scene.')) {
                return;
            }
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_delete_scene',
                    scene_id: sceneId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        $('[data-scene-id="' + sceneId + '"]').closest('.vx-scene-item').fadeOut(function() {
                            $(this).remove();
                        });
                        VortexAdmin.showNotice('Scene deleted successfully', 'success');
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to delete scene', 'error');
                }
            });
        },
        
        uploadSceneImage: function(e) {
            e.preventDefault();
            
            const button = $(this);
            const inputId = button.data('input-id');
            const previewId = button.data('preview-id');
            
            const mediaUploader = wp.media({
                title: 'Select 360° Image',
                button: {
                    text: 'Use This Image'
                },
                multiple: false,
                library: {
                    type: 'image'
                }
            });
            
            mediaUploader.on('select', function() {
                const attachment = mediaUploader.state().get('selection').first().toJSON();
                
                $('#' + inputId).val(attachment.url);
                if (previewId) {
                    $('#' + previewId).attr('src', attachment.url).show();
                }
                
                button.text('Change Image');
            });
            
            mediaUploader.open();
        },
        
        // Hotspot Management
        addHotspot: function(e) {
            e.preventDefault();
            const sceneId = $(this).data('scene-id');
            
            const modal = VortexAdmin.showModal('add-hotspot', {
                title: 'Add New Hotspot',
                content: VortexAdmin.getHotspotFormHTML(null, sceneId)
            });
            
            VortexAdmin.initModalComponents(modal);
        },
        
        editHotspot: function(e) {
            e.preventDefault();
            const hotspotId = $(this).data('hotspot-id');
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_get_hotspot',
                    hotspot_id: hotspotId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        const modal = VortexAdmin.showModal('edit-hotspot', {
                            title: 'Edit Hotspot: ' + response.data.title,
                            content: VortexAdmin.getHotspotFormHTML(response.data)
                        });
                        
                        VortexAdmin.initModalComponents(modal);
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to load hotspot data', 'error');
                }
            });
        },
        
        deleteHotspot: function(e) {
            e.preventDefault();
            const hotspotId = $(this).data('hotspot-id');
            const hotspotTitle = $(this).data('hotspot-title');
            
            if (!confirm('Are you sure you want to delete "' + hotspotTitle + '"?')) {
                return;
            }
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_delete_hotspot',
                    hotspot_id: hotspotId,
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        $('[data-hotspot-id="' + hotspotId + '"]').closest('.vx-hotspot-item').fadeOut(function() {
                            $(this).remove();
                        });
                        VortexAdmin.showNotice('Hotspot deleted successfully', 'success');
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to delete hotspot', 'error');
                }
            });
        },
        
        // Import/Export
        showImportModal: function(e) {
            e.preventDefault();
            
            const modal = VortexAdmin.showModal('import-export', {
                title: 'Import/Export Tours',
                content: $('#vx-import-export-modal').html(),
                size: 'large'
            });
            
            // Initialize drag and drop
            VortexAdmin.initDragDrop(modal);
        },
        
        exportTour: function(e) {
            e.preventDefault();
            const tourIds = [];
            
            // Get selected tours or all tours
            const selectedTours = $('.vx-tour-checkbox:checked');
            if (selectedTours.length > 0) {
                selectedTours.each(function() {
                    tourIds.push($(this).val());
                });
            } else {
                $('.vx-tour-checkbox').each(function() {
                    tourIds.push($(this).val());
                });
            }
            
            if (tourIds.length === 0) {
                VortexAdmin.showNotice('No tours to export', 'warning');
                return;
            }
            
            // Create download link
            const form = $('<form>', {
                method: 'POST',
                action: vortexAdmin.ajaxUrl
            });
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'action',
                value: 'vx_export_tours'
            }));
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'tour_ids',
                value: JSON.stringify(tourIds)
            }));
            
            form.append($('<input>', {
                type: 'hidden',
                name: 'nonce',
                value: vortexAdmin.nonce
            }));
            
            $('body').append(form);
            form.submit();
            form.remove();
        },
        
        handleImportFile: function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.type !== 'application/json') {
                VortexAdmin.showNotice('Please select a valid JSON file', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = JSON.parse(e.target.result);
                    VortexAdmin.showImportPreview(data);
                } catch (error) {
                    VortexAdmin.showNotice('Invalid JSON file format', 'error');
                }
            };
            reader.readAsText(file);
        },
        
        showImportPreview: function(data) {
            const preview = $('#vx-import-preview');
            let html = '<h4>Import Preview</h4>';
            
            if (data.tours && data.tours.length > 0) {
                html += '<p>Found ' + data.tours.length + ' tour(s) to import:</p>';
                html += '<ul>';
                data.tours.forEach(function(tour) {
                    html += '<li><strong>' + tour.title + '</strong> (' + (tour.scenes ? tour.scenes.length : 0) + ' scenes)</li>';
                });
                html += '</ul>';
                html += '<button type="button" class="button button-primary vx-confirm-import">Import Tours</button>';
            } else {
                html += '<p>No valid tour data found in the file.</p>';
            }
            
            preview.html(html).show();
        },
        
        confirmImport: function(e) {
            e.preventDefault();
            
            const fileInput = $('#vx-import-file')[0];
            if (!fileInput.files[0]) {
                VortexAdmin.showNotice('Please select a file to import', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('action', 'vx_import_tours');
            formData.append('import_file', fileInput.files[0]);
            formData.append('nonce', vortexAdmin.nonce);
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: formData,
                processData: false,
                contentType: false,
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        VortexAdmin.closeModal();
                        VortexAdmin.showNotice('Tours imported successfully', 'success');
                        location.reload();
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to import tours', 'error');
                }
            });
        },
        
        // Settings
        saveSettings: function(e) {
            e.preventDefault();
            
            const form = $(this).closest('form');
            const formData = form.serialize();
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: formData + '&action=vx_save_settings&nonce=' + vortexAdmin.nonce,
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        VortexAdmin.showNotice('Settings saved successfully', 'success');
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to save settings', 'error');
                }
            });
        },
        
        resetSettings: function(e) {
            e.preventDefault();
            
            if (!confirm('Are you sure you want to reset all settings to default values?')) {
                return;
            }
            
            VortexAdmin.showLoader();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_reset_settings',
                    nonce: vortexAdmin.nonce
                },
                success: function(response) {
                    VortexAdmin.hideLoader();
                    
                    if (response.success) {
                        location.reload();
                    } else {
                        VortexAdmin.showNotice(response.data.message, 'error');
                    }
                },
                error: function() {
                    VortexAdmin.hideLoader();
                    VortexAdmin.showNotice('Failed to reset settings', 'error');
                }
            });
        },
        
        // Pro Upgrade
        trackUpgradeClick: function(e) {
            const context = $(this).data('context') || 'unknown';
            
            // Track upgrade click for analytics
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_track_upgrade_click',
                    context: context,
                    nonce: vortexAdmin.nonce
                }
            });
        },
        
        dismissNotice: function(e) {
            e.preventDefault();
            
            const notice = $(this).closest('.notice');
            const noticeId = $(this).data('notice-id');
            
            notice.fadeOut();
            
            if (noticeId) {
                $.ajax({
                    url: vortexAdmin.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'vx_dismiss_notice',
                        notice_id: noticeId,
                        nonce: vortexAdmin.nonce
                    }
                });
            }
        },
        
        // UI Helpers
        showModal: function(id, options) {
            const defaults = {
                title: 'Modal',
                content: '',
                size: 'medium',
                showClose: true
            };
            
            const settings = $.extend(defaults, options);
            
            // Remove existing modal
            $('.vx-modal').remove();
            
            const modal = $(`
                <div class="vx-modal vx-modal-${settings.size}">
                    <div class="vx-modal-overlay"></div>
                    <div class="vx-modal-content">
                        <div class="vx-modal-header">
                            <h2 class="vx-modal-title">${settings.title}</h2>
                            ${settings.showClose ? '<button type="button" class="vx-modal-close">&times;</button>' : ''}
                        </div>
                        <div class="vx-modal-body">
                            ${settings.content}
                        </div>
                    </div>
                </div>
            `);
            
            $('body').append(modal);
            
            // Show modal with animation
            setTimeout(function() {
                modal.addClass('open');
            }, 10);
            
            return modal;
        },
        
        closeModal: function(e) {
            if (e) {
                e.preventDefault();
            }
            
            const modal = $('.vx-modal');
            modal.removeClass('open');
            
            setTimeout(function() {
                modal.remove();
            }, 300);
        },
        
        showNotice: function(message, type) {
            type = type || 'info';
            
            const notice = $(`
                <div class="notice notice-${type} is-dismissible vx-admin-notice">
                    <p>${message}</p>
                    <button type="button" class="notice-dismiss">
                        <span class="screen-reader-text">Dismiss this notice.</span>
                    </button>
                </div>
            `);
            
            $('.wrap h1').after(notice);
            
            // Auto dismiss after 5 seconds
            setTimeout(function() {
                notice.fadeOut(function() {
                    $(this).remove();
                });
            }, 5000);
        },
        
        showLoader: function() {
            if ($('.vx-loader').length === 0) {
                $('body').append('<div class="vx-loader"><div class="vx-spinner"></div></div>');
            }
            $('.vx-loader').show();
        },
        
        hideLoader: function() {
            $('.vx-loader').hide();
        },
        
        switchTab: function(e) {
            e.preventDefault();
            
            const tab = $(this);
            const target = tab.attr('href');
            
            // Update active tab
            tab.closest('.vx-tab-nav').find('a').removeClass('nav-tab-active');
            tab.addClass('nav-tab-active');
            
            // Show target content
            $('.vx-tab-content').hide();
            $(target).show();
        },
        
        validateForm: function(e) {
            const form = $(this);
            let isValid = true;
            
            // Clear previous errors
            form.find('.vx-error').removeClass('vx-error');
            form.find('.vx-error-message').remove();
            
            // Validate required fields
            form.find('[required]').each(function() {
                const field = $(this);
                if (!field.val().trim()) {
                    field.addClass('vx-error');
                    field.after('<span class="vx-error-message">This field is required</span>');
                    isValid = false;
                }
            });
            
            // Validate email fields
            form.find('input[type="email"]').each(function() {
                const field = $(this);
                const email = field.val().trim();
                if (email && !VortexAdmin.isValidEmail(email)) {
                    field.addClass('vx-error');
                    field.after('<span class="vx-error-message">Please enter a valid email address</span>');
                    isValid = false;
                }
            });
            
            // Validate URL fields
            form.find('input[type="url"]').each(function() {
                const field = $(this);
                const url = field.val().trim();
                if (url && !VortexAdmin.isValidUrl(url)) {
                    field.addClass('vx-error');
                    field.after('<span class="vx-error-message">Please enter a valid URL</span>');
                    isValid = false;
                }
            });
            
            if (!isValid) {
                e.preventDefault();
                VortexAdmin.showNotice('Please correct the errors below', 'error');
            }
        },
        
        isValidEmail: function(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },
        
        isValidUrl: function(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },
        
        updateSceneOrder: function(event, ui) {
            const sceneIds = [];
            $('.vx-scenes-list .vx-scene-item').each(function() {
                sceneIds.push($(this).data('scene-id'));
            });
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'vx_update_scene_order',
                    scene_ids: sceneIds,
                    nonce: vortexAdmin.nonce
                }
            });
        },
        
        initMediaUploaders: function() {
            // Initialize WordPress media uploaders
            $('.vx-media-upload').each(function() {
                const button = $(this);
                const inputId = button.data('input-id');
                const previewId = button.data('preview-id');
                const mediaType = button.data('media-type') || 'image';
                
                button.on('click', function(e) {
                    e.preventDefault();
                    
                    const mediaUploader = wp.media({
                        title: 'Select Media',
                        button: {
                            text: 'Use This Media'
                        },
                        multiple: false,
                        library: {
                            type: mediaType
                        }
                    });
                    
                    mediaUploader.on('select', function() {
                        const attachment = mediaUploader.state().get('selection').first().toJSON();
                        
                        $('#' + inputId).val(attachment.url);
                        if (previewId) {
                            if (mediaType === 'image') {
                                $('#' + previewId).attr('src', attachment.url).show();
                            } else {
                                $('#' + previewId).attr('src', attachment.url).show();
                            }
                        }
                        
                        button.text('Change Media');
                    });
                    
                    mediaUploader.open();
                });
            });
        },
        
        initModalComponents: function(modal) {
            // Initialize components within modal
            modal.find('.vx-color-picker').wpColorPicker();
            modal.find('.vx-media-upload').each(function() {
                VortexAdmin.initMediaUploaders();
            });
            
            if ($.fn.select2) {
                modal.find('.vx-select2').select2({
                    width: '100%',
                    dropdownParent: modal
                });
            }
        },
        
        initDragDrop: function(modal) {
            const dropZone = modal.find('.vx-drop-zone');
            const fileInput = modal.find('#vx-import-file');
            
            dropZone.on('dragover dragenter', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).addClass('dragover');
            });
            
            dropZone.on('dragleave dragend', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).removeClass('dragover');
            });
            
            dropZone.on('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                $(this).removeClass('dragover');
                
                const files = e.originalEvent.dataTransfer.files;
                if (files.length > 0) {
                    fileInput[0].files = files;
                    fileInput.trigger('change');
                }
            });
        },
        
        initAutoSave: function() {
            let autoSaveTimer;
            
            $('.vx-autosave-form').on('input change', function() {
                clearTimeout(autoSaveTimer);
                
                autoSaveTimer = setTimeout(function() {
                    VortexAdmin.autoSave();
                }, 30000); // Auto-save after 30 seconds of inactivity
            });
        },
        
        autoSave: function() {
            const form = $('.vx-autosave-form');
            if (form.length === 0) return;
            
            const formData = form.serialize();
            
            $.ajax({
                url: vortexAdmin.ajaxUrl,
                type: 'POST',
                data: formData + '&action=vx_auto_save&nonce=' + vortexAdmin.nonce,
                success: function(response) {
                    if (response.success) {
                        $('.vx-autosave-indicator').text('Draft saved at ' + new Date().toLocaleTimeString()).show().fadeOut(3000);
                    }
                }
            });
        },
        
        handleAjaxErrors: function() {
            $(document).ajaxError(function(event, xhr, settings, error) {
                if (xhr.status === 403) {
                    VortexAdmin.showNotice('Session expired. Please refresh the page.', 'error');
                } else if (xhr.status >= 500) {
                    VortexAdmin.showNotice('Server error. Please try again later.', 'error');
                }
            });
        },
        
        // Form HTML generators
        getTourFormHTML: function(tour) {
            tour = tour || {};
            
            return `
                <form class="vx-form vx-tour-form">
                    <input type="hidden" name="tour_id" value="${tour.id || ''}">
                    
                    <table class="form-table">
                        <tr>
                            <th><label for="tour_title">Title *</label></th>
                            <td><input type="text" id="tour_title" name="title" value="${tour.title || ''}" required class="regular-text"></td>
                        </tr>
                        <tr>
                            <th><label for="tour_description">Description</label></th>
                            <td><textarea id="tour_description" name="description" rows="3" class="large-text">${tour.description || ''}</textarea></td>
                        </tr>
                        <tr>
                            <th><label for="tour_status">Status</label></th>
                            <td>
                                <select id="tour_status" name="status">
                                    <option value="draft" ${tour.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    <option value="published" ${tour.status === 'published' ? 'selected' : ''}>Published</option>
                                </select>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Save Tour</button>
                        <button type="button" class="button vx-modal-close">Cancel</button>
                    </p>
                </form>
            `;
        },
        
        getSceneFormHTML: function(scene, tourId) {
            scene = scene || {};
            
            return `
                <form class="vx-form vx-scene-form">
                    <input type="hidden" name="scene_id" value="${scene.id || ''}">
                    <input type="hidden" name="tour_id" value="${tourId || scene.tour_id || ''}">
                    
                    <table class="form-table">
                        <tr>
                            <th><label for="scene_title">Title *</label></th>
                            <td><input type="text" id="scene_title" name="title" value="${scene.title || ''}" required class="regular-text"></td>
                        </tr>
                        <tr>
                            <th><label for="scene_description">Description</label></th>
                            <td><textarea id="scene_description" name="description" rows="3" class="large-text">${scene.description || ''}</textarea></td>
                        </tr>
                        <tr>
                            <th><label for="scene_image">360° Image *</label></th>
                            <td>
                                <input type="url" id="scene_image" name="image_url" value="${scene.image_url || ''}" required class="regular-text">
                                <button type="button" class="button vx-media-upload" data-input-id="scene_image" data-preview-id="scene_preview">Select Image</button>
                                <br><img id="scene_preview" src="${scene.image_url || ''}" style="max-width: 200px; margin-top: 10px; ${scene.image_url ? '' : 'display: none;'}">
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Save Scene</button>
                        <button type="button" class="button vx-modal-close">Cancel</button>
                    </p>
                </form>
            `;
        },
        
        getHotspotFormHTML: function(hotspot, sceneId) {
            hotspot = hotspot || {};
            
            return `
                <form class="vx-form vx-hotspot-form">
                    <input type="hidden" name="hotspot_id" value="${hotspot.id || ''}">
                    <input type="hidden" name="scene_id" value="${sceneId || hotspot.scene_id || ''}">
                    
                    <table class="form-table">
                        <tr>
                            <th><label for="hotspot_title">Title *</label></th>
                            <td><input type="text" id="hotspot_title" name="title" value="${hotspot.title || ''}" required class="regular-text"></td>
                        </tr>
                        <tr>
                            <th><label for="hotspot_type">Type</label></th>
                            <td>
                                <select id="hotspot_type" name="type">
                                    <option value="info" ${hotspot.type === 'info' ? 'selected' : ''}>Information</option>
                                    <option value="scene" ${hotspot.type === 'scene' ? 'selected' : ''}>Scene Link</option>
                                    <option value="link" ${hotspot.type === 'link' ? 'selected' : ''}>External Link</option>
                                    <option value="image" ${hotspot.type === 'image' ? 'selected' : ''}>Image</option>
                                    <option value="video" ${hotspot.type === 'video' ? 'selected' : ''}>Video (Pro)</option>
                                    <option value="audio" ${hotspot.type === 'audio' ? 'selected' : ''}>Audio (Pro)</option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th><label for="hotspot_description">Description</label></th>
                            <td><textarea id="hotspot_description" name="description" rows="3" class="large-text">${hotspot.description || ''}</textarea></td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="submit" class="button button-primary">Save Hotspot</button>
                        <button type="button" class="button vx-modal-close">Cancel</button>
                    </p>
                </form>
            `;
        }
    };
    
    // Initialize when document is ready
    $(document).ready(function() {
        VortexAdmin.init();
    });
    
})(jQuery, window, document);