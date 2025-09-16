/**
 * Vortex360 Lite - Admin Metabox JavaScript
 * Handles tour builder interface, scene management, and hotspot editing
 */

(function($) {
    'use strict';

    // Global variables
    let vxTourData = {
        scenes: [],
        settings: {
            ui: { showThumbnails: true, showZoom: true, showFullscreen: true },
            autorotate: { enabled: false, speed: 0.3, pauseOnHover: true },
            branding: { logoId: 0, logoUrl: '' },
            mobile: { gyro: true, touch: true }
        }
    };
    let currentSceneIndex = 0;
    let currentHotspotIndex = -1;
    let sceneCounter = 0;
    let hotspotCounter = 0;

    // Initialize when document is ready
    $(document).ready(function() {
        initTourBuilder();
        bindEvents();
        loadExistingData();
    });

    /**
     * Initialize the tour builder interface
     */
    function initTourBuilder() {
        // Initialize sortable scenes
        $('#vx-scenes-list').sortable({
            handle: '.scene-handle',
            update: function() {
                reorderScenes();
                updatePreview();
            }
        });

        // Initialize color pickers if available
        if ($.fn.wpColorPicker) {
            $('.vx-color-picker').wpColorPicker({
                change: function() {
                    updatePreview();
                }
            });
        }

        // Show first scene by default
        if (vxTourData.scenes.length > 0) {
            showScene(0);
        }
    }

    /**
     * Bind all event handlers
     */
    function bindEvents() {
        // Scene management
        $(document).on('click', '.add-scene-btn', addScene);
        $(document).on('click', '.remove-scene-btn', removeScene);
        $(document).on('click', '.scene-item', function() {
            showScene($(this).data('index'));
        });

        // Hotspot management
        $(document).on('click', '.add-hotspot-btn', addHotspot);
        $(document).on('click', '.remove-hotspot-btn', removeHotspot);
        $(document).on('click', '.hotspot-item', function() {
            editHotspot($(this).data('index'));
        });

        // Image uploads
        $(document).on('click', '.upload-image-btn', handleImageUpload);
        $(document).on('click', '.remove-image-btn', removeImage);

        // Form changes
        $(document).on('change input', '.vx-form-field', handleFormChange);
        $(document).on('change', '.hotspot-type-select', handleHotspotTypeChange);

        // Settings
        $(document).on('change', '.vx-settings input, .vx-settings select', updateSettings);

        // Preview
        $(document).on('click', '.preview-btn', togglePreview);

        // Save tour
        $(document).on('click', '.save-tour-btn', saveTour);
    }

    /**
     * Load existing tour data from the page
     */
    function loadExistingData() {
        if (typeof vxAdminData !== 'undefined' && vxAdminData.tourData) {
            try {
                vxTourData = JSON.parse(vxAdminData.tourData);
                renderScenes();
                renderSettings();
                if (vxTourData.scenes.length > 0) {
                    showScene(0);
                }
            } catch (e) {
                console.error('Error loading tour data:', e);
            }
        }
    }

    /**
     * Add a new scene
     */
    function addScene() {
        // Check Lite limits
        if (vxTourData.scenes.length >= 5) {
            showLiteNotice('You can add up to 5 scenes in the Lite version. <a href="#" class="vx-upgrade-link">Upgrade to Pro</a> for unlimited scenes.');
            return;
        }

        sceneCounter++;
        const newScene = {
            id: 'scene_' + sceneCounter,
            title: 'Scene ' + (vxTourData.scenes.length + 1),
            type: 'sphere',
            image: { id: 0, url: '' },
            previewImage: { id: 0, url: '' },
            initView: { yaw: 0, pitch: 0, fov: 70 },
            hotspots: []
        };

        vxTourData.scenes.push(newScene);
        renderScenes();
        showScene(vxTourData.scenes.length - 1);
        updatePreview();
    }

    /**
     * Remove a scene
     */
    function removeScene() {
        const index = $(this).closest('.scene-item').data('index');
        if (confirm('Are you sure you want to remove this scene?')) {
            vxTourData.scenes.splice(index, 1);
            renderScenes();
            
            // Show first scene or hide editor if no scenes
            if (vxTourData.scenes.length > 0) {
                showScene(Math.min(index, vxTourData.scenes.length - 1));
            } else {
                $('#vx-scene-editor').hide();
            }
            updatePreview();
        }
    }

    /**
     * Show scene editor for specific scene
     */
    function showScene(index) {
        if (index < 0 || index >= vxTourData.scenes.length) return;
        
        currentSceneIndex = index;
        const scene = vxTourData.scenes[index];
        
        // Update active scene in list
        $('.scene-item').removeClass('active');
        $(`.scene-item[data-index="${index}"]`).addClass('active');
        
        // Populate scene editor
        $('#scene-title').val(scene.title);
        $('#scene-type').val(scene.type);
        $('#scene-yaw').val(scene.initView.yaw);
        $('#scene-pitch').val(scene.initView.pitch);
        $('#scene-fov').val(scene.initView.fov);
        
        // Update image previews
        updateImagePreview('#scene-image-preview', scene.image);
        updateImagePreview('#scene-preview-preview', scene.previewImage);
        
        // Render hotspots
        renderHotspots(scene.hotspots);
        
        // Show editor
        $('#vx-scene-editor').show();
    }

    /**
     * Add a new hotspot to current scene
     */
    function addHotspot() {
        const scene = vxTourData.scenes[currentSceneIndex];
        
        // Check Lite limits
        if (scene.hotspots.length >= 5) {
            showLiteNotice('You can add up to 5 hotspots per scene in the Lite version. <a href="#" class="vx-upgrade-link">Upgrade to Pro</a> for unlimited hotspots.');
            return;
        }

        hotspotCounter++;
        const newHotspot = {
            id: 'hs_' + hotspotCounter,
            type: 'info',
            yaw: 0,
            pitch: 0,
            title: 'Hotspot ' + (scene.hotspots.length + 1),
            text: '',
            url: '',
            targetSceneId: '',
            icon: 'info'
        };

        scene.hotspots.push(newHotspot);
        renderHotspots(scene.hotspots);
        editHotspot(scene.hotspots.length - 1);
        updatePreview();
    }

    /**
     * Remove a hotspot
     */
    function removeHotspot() {
        const index = $(this).closest('.hotspot-item').data('index');
        const scene = vxTourData.scenes[currentSceneIndex];
        
        if (confirm('Are you sure you want to remove this hotspot?')) {
            scene.hotspots.splice(index, 1);
            renderHotspots(scene.hotspots);
            $('#vx-hotspot-editor').hide();
            updatePreview();
        }
    }

    /**
     * Edit a specific hotspot
     */
    function editHotspot(index) {
        const scene = vxTourData.scenes[currentSceneIndex];
        const hotspot = scene.hotspots[index];
        
        currentHotspotIndex = index;
        
        // Update active hotspot in list
        $('.hotspot-item').removeClass('active');
        $(`.hotspot-item[data-index="${index}"]`).addClass('active');
        
        // Populate hotspot editor
        $('#hotspot-title').val(hotspot.title);
        $('#hotspot-type').val(hotspot.type);
        $('#hotspot-yaw').val(hotspot.yaw);
        $('#hotspot-pitch').val(hotspot.pitch);
        $('#hotspot-text').val(hotspot.text);
        $('#hotspot-url').val(hotspot.url);
        $('#hotspot-target-scene').val(hotspot.targetSceneId);
        $('#hotspot-icon').val(hotspot.icon);
        
        // Show/hide fields based on type
        handleHotspotTypeChange.call($('#hotspot-type')[0]);
        
        // Show editor
        $('#vx-hotspot-editor').show();
    }

    /**
     * Handle hotspot type change
     */
    function handleHotspotTypeChange() {
        const type = $(this).val();
        
        // Hide all conditional fields
        $('.hotspot-field-conditional').hide();
        
        // Show relevant fields
        switch (type) {
            case 'info':
                $('.hotspot-field-text').show();
                break;
            case 'link':
                $('.hotspot-field-url').show();
                break;
            case 'scene':
                $('.hotspot-field-scene').show();
                populateSceneSelect();
                break;
        }
    }

    /**
     * Populate scene select dropdown
     */
    function populateSceneSelect() {
        const $select = $('#hotspot-target-scene');
        $select.empty().append('<option value="">Select a scene</option>');
        
        vxTourData.scenes.forEach((scene, index) => {
            if (index !== currentSceneIndex) {
                $select.append(`<option value="${scene.id}">${scene.title}</option>`);
            }
        });
    }

    /**
     * Handle image upload
     */
    function handleImageUpload() {
        const $btn = $(this);
        const target = $btn.data('target');
        
        // WordPress media uploader
        const mediaUploader = wp.media({
            title: 'Select Image',
            button: { text: 'Use Image' },
            multiple: false,
            library: { type: 'image' }
        });
        
        mediaUploader.on('select', function() {
            const attachment = mediaUploader.state().get('selection').first().toJSON();
            
            // Update data based on target
            if (target === 'scene-image') {
                vxTourData.scenes[currentSceneIndex].image = {
                    id: attachment.id,
                    url: attachment.url
                };
                updateImagePreview('#scene-image-preview', vxTourData.scenes[currentSceneIndex].image);
            } else if (target === 'scene-preview') {
                vxTourData.scenes[currentSceneIndex].previewImage = {
                    id: attachment.id,
                    url: attachment.url
                };
                updateImagePreview('#scene-preview-preview', vxTourData.scenes[currentSceneIndex].previewImage);
            } else if (target === 'logo') {
                vxTourData.settings.branding = {
                    logoId: attachment.id,
                    logoUrl: attachment.url
                };
                updateImagePreview('#logo-preview', vxTourData.settings.branding);
            }
            
            updatePreview();
        });
        
        mediaUploader.open();
    }

    /**
     * Remove image
     */
    function removeImage() {
        const target = $(this).data('target');
        
        if (target === 'scene-image') {
            vxTourData.scenes[currentSceneIndex].image = { id: 0, url: '' };
            updateImagePreview('#scene-image-preview', vxTourData.scenes[currentSceneIndex].image);
        } else if (target === 'scene-preview') {
            vxTourData.scenes[currentSceneIndex].previewImage = { id: 0, url: '' };
            updateImagePreview('#scene-preview-preview', vxTourData.scenes[currentSceneIndex].previewImage);
        } else if (target === 'logo') {
            vxTourData.settings.branding = { logoId: 0, logoUrl: '' };
            updateImagePreview('#logo-preview', vxTourData.settings.branding);
        }
        
        updatePreview();
    }

    /**
     * Update image preview
     */
    function updateImagePreview(selector, imageData) {
        const $preview = $(selector);
        if (imageData.url) {
            $preview.html(`<img src="${imageData.url}" alt="Preview" style="max-width: 100%; height: auto;">`);
            $preview.siblings('.remove-image-btn').show();
        } else {
            $preview.html('<div class="no-image">No image selected</div>');
            $preview.siblings('.remove-image-btn').hide();
        }
    }

    /**
     * Handle form field changes
     */
    function handleFormChange() {
        const $field = $(this);
        const fieldName = $field.attr('name') || $field.attr('id');
        const value = $field.val();
        
        // Update scene data
        if (fieldName.startsWith('scene-')) {
            const scene = vxTourData.scenes[currentSceneIndex];
            switch (fieldName) {
                case 'scene-title':
                    scene.title = value;
                    $(`.scene-item[data-index="${currentSceneIndex}"] .scene-title`).text(value);
                    break;
                case 'scene-type':
                    scene.type = value;
                    break;
                case 'scene-yaw':
                    scene.initView.yaw = parseFloat(value) || 0;
                    break;
                case 'scene-pitch':
                    scene.initView.pitch = parseFloat(value) || 0;
                    break;
                case 'scene-fov':
                    scene.initView.fov = parseFloat(value) || 70;
                    break;
            }
        }
        
        // Update hotspot data
        if (fieldName.startsWith('hotspot-') && currentHotspotIndex >= 0) {
            const hotspot = vxTourData.scenes[currentSceneIndex].hotspots[currentHotspotIndex];
            switch (fieldName) {
                case 'hotspot-title':
                    hotspot.title = value;
                    $(`.hotspot-item[data-index="${currentHotspotIndex}"] .hotspot-title`).text(value);
                    break;
                case 'hotspot-type':
                    hotspot.type = value;
                    break;
                case 'hotspot-yaw':
                    hotspot.yaw = parseFloat(value) || 0;
                    break;
                case 'hotspot-pitch':
                    hotspot.pitch = parseFloat(value) || 0;
                    break;
                case 'hotspot-text':
                    hotspot.text = value;
                    break;
                case 'hotspot-url':
                    hotspot.url = value;
                    break;
                case 'hotspot-target-scene':
                    hotspot.targetSceneId = value;
                    break;
                case 'hotspot-icon':
                    hotspot.icon = value;
                    break;
            }
        }
        
        updatePreview();
    }

    /**
     * Update settings
     */
    function updateSettings() {
        const $field = $(this);
        const fieldName = $field.attr('name') || $field.attr('id');
        const value = $field.is(':checkbox') ? $field.is(':checked') : $field.val();
        
        // Update settings object
        switch (fieldName) {
            case 'show-thumbnails':
                vxTourData.settings.ui.showThumbnails = value;
                break;
            case 'show-zoom':
                vxTourData.settings.ui.showZoom = value;
                break;
            case 'show-fullscreen':
                vxTourData.settings.ui.showFullscreen = value;
                break;
            case 'autorotate-enabled':
                vxTourData.settings.autorotate.enabled = value;
                break;
            case 'autorotate-speed':
                vxTourData.settings.autorotate.speed = parseFloat(value) || 0.3;
                break;
            case 'autorotate-pause':
                vxTourData.settings.autorotate.pauseOnHover = value;
                break;
            case 'mobile-gyro':
                vxTourData.settings.mobile.gyro = value;
                break;
            case 'mobile-touch':
                vxTourData.settings.mobile.touch = value;
                break;
        }
        
        updatePreview();
    }

    /**
     * Render scenes list
     */
    function renderScenes() {
        const $list = $('#vx-scenes-list');
        $list.empty();
        
        vxTourData.scenes.forEach((scene, index) => {
            const $item = $(`
                <div class="scene-item" data-index="${index}">
                    <div class="scene-handle">⋮⋮</div>
                    <div class="scene-preview">
                        ${scene.previewImage.url ? `<img src="${scene.previewImage.url}" alt="${scene.title}">` : '<div class="no-preview">No preview</div>'}
                    </div>
                    <div class="scene-info">
                        <div class="scene-title">${scene.title}</div>
                        <div class="scene-meta">${scene.hotspots.length} hotspots</div>
                    </div>
                    <button type="button" class="remove-scene-btn" title="Remove Scene">×</button>
                </div>
            `);
            $list.append($item);
        });
        
        // Update counter
        $('#scenes-count').text(`${vxTourData.scenes.length}/5`);
        
        // Show/hide add button based on limit
        $('.add-scene-btn').toggle(vxTourData.scenes.length < 5);
    }

    /**
     * Render hotspots list
     */
    function renderHotspots(hotspots) {
        const $list = $('#vx-hotspots-list');
        $list.empty();
        
        hotspots.forEach((hotspot, index) => {
            const $item = $(`
                <div class="hotspot-item" data-index="${index}">
                    <div class="hotspot-icon">
                        <span class="dashicons dashicons-${getHotspotIcon(hotspot.type)}"></span>
                    </div>
                    <div class="hotspot-info">
                        <div class="hotspot-title">${hotspot.title}</div>
                        <div class="hotspot-meta">${hotspot.type} • ${hotspot.yaw}°, ${hotspot.pitch}°</div>
                    </div>
                    <button type="button" class="remove-hotspot-btn" title="Remove Hotspot">×</button>
                </div>
            `);
            $list.append($item);
        });
        
        // Update counter
        $('#hotspots-count').text(`${hotspots.length}/5`);
        
        // Show/hide add button based on limit
        $('.add-hotspot-btn').toggle(hotspots.length < 5);
    }

    /**
     * Render settings form
     */
    function renderSettings() {
        $('#show-thumbnails').prop('checked', vxTourData.settings.ui.showThumbnails);
        $('#show-zoom').prop('checked', vxTourData.settings.ui.showZoom);
        $('#show-fullscreen').prop('checked', vxTourData.settings.ui.showFullscreen);
        $('#autorotate-enabled').prop('checked', vxTourData.settings.autorotate.enabled);
        $('#autorotate-speed').val(vxTourData.settings.autorotate.speed);
        $('#autorotate-pause').prop('checked', vxTourData.settings.autorotate.pauseOnHover);
        $('#mobile-gyro').prop('checked', vxTourData.settings.mobile.gyro);
        $('#mobile-touch').prop('checked', vxTourData.settings.mobile.touch);
        
        updateImagePreview('#logo-preview', vxTourData.settings.branding);
    }

    /**
     * Get hotspot icon class
     */
    function getHotspotIcon(type) {
        const icons = {
            info: 'info',
            link: 'external',
            scene: 'move'
        };
        return icons[type] || 'info';
    }

    /**
     * Reorder scenes after drag and drop
     */
    function reorderScenes() {
        const newOrder = [];
        $('#vx-scenes-list .scene-item').each(function() {
            const index = $(this).data('index');
            newOrder.push(vxTourData.scenes[index]);
        });
        vxTourData.scenes = newOrder;
        renderScenes();
    }

    /**
     * Show Lite version notice
     */
    function showLiteNotice(message) {
        const $notice = $(`
            <div class="vx-lite-notice">
                <div class="notice notice-warning">
                    <p>${message}</p>
                </div>
            </div>
        `);
        
        $('body').append($notice);
        
        setTimeout(() => {
            $notice.fadeOut(() => $notice.remove());
        }, 5000);
    }

    /**
     * Toggle preview panel
     */
    function togglePreview() {
        const $preview = $('#vx-preview-panel');
        if ($preview.is(':visible')) {
            $preview.hide();
            $(this).text('Show Preview');
        } else {
            $preview.show();
            $(this).text('Hide Preview');
            updatePreview();
        }
    }

    /**
     * Update preview
     */
    function updatePreview() {
        if (!$('#vx-preview-panel').is(':visible')) return;
        
        // Send data to preview iframe
        const $iframe = $('#vx-preview-frame');
        if ($iframe.length) {
            try {
                $iframe[0].contentWindow.postMessage({
                    type: 'updateTour',
                    data: vxTourData
                }, '*');
            } catch (e) {
                console.warn('Preview update failed:', e);
            }
        }
    }

    /**
     * Save tour data
     */
    function saveTour() {
        const $btn = $('.save-tour-btn');
        const originalText = $btn.text();
        
        $btn.text('Saving...').prop('disabled', true);
        
        // Update hidden field with tour data
        $('#vx-tour-data').val(JSON.stringify(vxTourData));
        
        // Submit the form
        $('#post').submit();
    }

    // Expose functions for external use
    window.vxTourBuilder = {
        getTourData: () => vxTourData,
        setTourData: (data) => {
            vxTourData = data;
            renderScenes();
            renderSettings();
        },
        updatePreview: updatePreview
    };

})(jQuery);