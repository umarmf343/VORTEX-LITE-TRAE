<?php
/**
 * Vortex360 Lite - Import/Export Modal Template
 * 
 * Modal interface for importing and exporting tour data
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}
?>

<div id="vx-import-export-modal" class="vx-modal" style="display: none;">
    <div class="vx-modal-overlay"></div>
    <div class="vx-modal-content vx-import-export-modal">
        <div class="vx-modal-header">
            <h2><?php _e('Import / Export Tours', 'vortex360-lite'); ?></h2>
            <button class="vx-modal-close" type="button">
                <span class="dashicons dashicons-no-alt"></span>
            </button>
        </div>
        
        <div class="vx-modal-body">
            <div class="vx-tabs">
                <nav class="vx-tab-nav">
                    <button class="vx-tab-button active" data-tab="export">
                        <span class="dashicons dashicons-download"></span>
                        <?php _e('Export', 'vortex360-lite'); ?>
                    </button>
                    <button class="vx-tab-button" data-tab="import">
                        <span class="dashicons dashicons-upload"></span>
                        <?php _e('Import', 'vortex360-lite'); ?>
                    </button>
                </nav>
                
                <!-- Export Tab -->
                <div id="vx-tab-export" class="vx-tab-content active">
                    <div class="vx-export-section">
                        <h3><?php _e('Export Tours', 'vortex360-lite'); ?></h3>
                        <p class="description">
                            <?php _e('Export your tours as a JSON file that can be imported later or shared with others.', 'vortex360-lite'); ?>
                        </p>
                        
                        <div class="vx-export-options">
                            <h4><?php _e('Select Tours to Export', 'vortex360-lite'); ?></h4>
                            
                            <div class="vx-export-selection">
                                <label class="vx-checkbox-label">
                                    <input type="checkbox" id="vx-export-all" checked>
                                    <span class="checkmark"></span>
                                    <?php _e('Export All Tours', 'vortex360-lite'); ?>
                                </label>
                            </div>
                            
                            <div id="vx-tour-list" class="vx-tour-selection" style="display: none;">
                                <?php
                                $tours = get_posts(array(
                                    'post_type' => 'vx_tour',
                                    'post_status' => array('publish', 'draft'),
                                    'numberposts' => -1,
                                    'orderby' => 'title',
                                    'order' => 'ASC'
                                ));
                                
                                if ($tours): ?>
                                    <?php foreach ($tours as $tour): ?>
                                        <label class="vx-checkbox-label vx-tour-item">
                                            <input type="checkbox" name="export_tours[]" value="<?php echo esc_attr($tour->ID); ?>" checked>
                                            <span class="checkmark"></span>
                                            <span class="tour-title"><?php echo esc_html($tour->post_title); ?></span>
                                            <span class="tour-status status-<?php echo esc_attr($tour->post_status); ?>">
                                                <?php echo esc_html(ucfirst($tour->post_status)); ?>
                                            </span>
                                        </label>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <p class="vx-no-tours"><?php _e('No tours found to export.', 'vortex360-lite'); ?></p>
                                <?php endif; ?>
                            </div>
                            
                            <div class="vx-export-settings">
                                <h4><?php _e('Export Options', 'vortex360-lite'); ?></h4>
                                
                                <label class="vx-checkbox-label">
                                    <input type="checkbox" id="vx-export-images" checked>
                                    <span class="checkmark"></span>
                                    <?php _e('Include Image URLs', 'vortex360-lite'); ?>
                                    <span class="description"><?php _e('Export will include image URLs (images themselves are not exported)', 'vortex360-lite'); ?></span>
                                </label>
                                
                                <label class="vx-checkbox-label">
                                    <input type="checkbox" id="vx-export-settings" checked>
                                    <span class="checkmark"></span>
                                    <?php _e('Include Tour Settings', 'vortex360-lite'); ?>
                                    <span class="description"><?php _e('Export viewer settings and configurations', 'vortex360-lite'); ?></span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="vx-export-actions">
                            <button type="button" id="vx-export-btn" class="button button-primary">
                                <span class="dashicons dashicons-download"></span>
                                <?php _e('Export Tours', 'vortex360-lite'); ?>
                            </button>
                            <div class="vx-export-progress" style="display: none;">
                                <div class="vx-progress-bar">
                                    <div class="vx-progress-fill"></div>
                                </div>
                                <span class="vx-progress-text"><?php _e('Preparing export...', 'vortex360-lite'); ?></span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Import Tab -->
                <div id="vx-tab-import" class="vx-tab-content">
                    <div class="vx-import-section">
                        <h3><?php _e('Import Tours', 'vortex360-lite'); ?></h3>
                        <p class="description">
                            <?php _e('Import tours from a JSON file exported from Vortex360 Lite or Pro.', 'vortex360-lite'); ?>
                        </p>
                        
                        <?php if (!vx_is_pro_active()): ?>
                            <div class="vx-lite-notice">
                                <div class="vx-notice-icon">
                                    <span class="dashicons dashicons-info"></span>
                                </div>
                                <div class="vx-notice-content">
                                    <strong><?php _e('Lite Version Limits', 'vortex360-lite'); ?></strong>
                                    <p><?php printf(__('You can import up to %d tours with maximum %d scenes each. Upgrade to Pro for unlimited imports.', 'vortex360-lite'), vx_get_lite_limits()['max_tours'], vx_get_lite_limits()['max_scenes_per_tour']); ?></p>
                                </div>
                            </div>
                        <?php endif; ?>
                        
                        <div class="vx-import-upload">
                            <div class="vx-upload-area" id="vx-upload-area">
                                <div class="vx-upload-icon">
                                    <span class="dashicons dashicons-upload"></span>
                                </div>
                                <div class="vx-upload-text">
                                    <h4><?php _e('Choose File or Drag & Drop', 'vortex360-lite'); ?></h4>
                                    <p><?php _e('Select a JSON file exported from Vortex360', 'vortex360-lite'); ?></p>
                                </div>
                                <input type="file" id="vx-import-file" accept=".json" style="display: none;">
                                <button type="button" class="button" id="vx-browse-file">
                                    <?php _e('Browse Files', 'vortex360-lite'); ?>
                                </button>
                            </div>
                            
                            <div class="vx-file-info" id="vx-file-info" style="display: none;">
                                <div class="vx-file-details">
                                    <span class="dashicons dashicons-media-document"></span>
                                    <div class="vx-file-meta">
                                        <div class="vx-file-name"></div>
                                        <div class="vx-file-size"></div>
                                    </div>
                                    <button type="button" class="vx-remove-file" title="<?php esc_attr_e('Remove file', 'vortex360-lite'); ?>">
                                        <span class="dashicons dashicons-no-alt"></span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="vx-import-preview" id="vx-import-preview" style="display: none;">
                            <h4><?php _e('Import Preview', 'vortex360-lite'); ?></h4>
                            <div class="vx-preview-content">
                                <div class="vx-preview-stats">
                                    <div class="vx-stat-item">
                                        <span class="vx-stat-number" id="vx-preview-tours">0</span>
                                        <span class="vx-stat-label"><?php _e('Tours', 'vortex360-lite'); ?></span>
                                    </div>
                                    <div class="vx-stat-item">
                                        <span class="vx-stat-number" id="vx-preview-scenes">0</span>
                                        <span class="vx-stat-label"><?php _e('Scenes', 'vortex360-lite'); ?></span>
                                    </div>
                                    <div class="vx-stat-item">
                                        <span class="vx-stat-number" id="vx-preview-hotspots">0</span>
                                        <span class="vx-stat-label"><?php _e('Hotspots', 'vortex360-lite'); ?></span>
                                    </div>
                                </div>
                                
                                <div class="vx-preview-tours" id="vx-preview-tours-list"></div>
                            </div>
                        </div>
                        
                        <div class="vx-import-options" id="vx-import-options" style="display: none;">
                            <h4><?php _e('Import Options', 'vortex360-lite'); ?></h4>
                            
                            <label class="vx-checkbox-label">
                                <input type="checkbox" id="vx-import-overwrite" checked>
                                <span class="checkmark"></span>
                                <?php _e('Overwrite Existing Tours', 'vortex360-lite'); ?>
                                <span class="description"><?php _e('Replace tours with the same title', 'vortex360-lite'); ?></span>
                            </label>
                            
                            <label class="vx-checkbox-label">
                                <input type="checkbox" id="vx-import-draft" checked>
                                <span class="checkmark"></span>
                                <?php _e('Import as Drafts', 'vortex360-lite'); ?>
                                <span class="description"><?php _e('Import tours as drafts for review before publishing', 'vortex360-lite'); ?></span>
                            </label>
                        </div>
                        
                        <div class="vx-import-actions">
                            <button type="button" id="vx-import-btn" class="button button-primary" disabled>
                                <span class="dashicons dashicons-upload"></span>
                                <?php _e('Import Tours', 'vortex360-lite'); ?>
                            </button>
                            <div class="vx-import-progress" style="display: none;">
                                <div class="vx-progress-bar">
                                    <div class="vx-progress-fill"></div>
                                </div>
                                <span class="vx-progress-text"><?php _e('Importing tours...', 'vortex360-lite'); ?></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="vx-modal-footer">
            <button type="button" class="button" id="vx-modal-cancel">
                <?php _e('Cancel', 'vortex360-lite'); ?>
            </button>
        </div>
    </div>
</div>

<script type="text/javascript">
jQuery(document).ready(function($) {
    // Tab switching
    $('.vx-tab-button').on('click', function() {
        var tab = $(this).data('tab');
        
        $('.vx-tab-button').removeClass('active');
        $('.vx-tab-content').removeClass('active');
        
        $(this).addClass('active');
        $('#vx-tab-' + tab).addClass('active');
    });
    
    // Export all checkbox
    $('#vx-export-all').on('change', function() {
        if ($(this).is(':checked')) {
            $('#vx-tour-list').hide();
            $('input[name="export_tours[]"]').prop('checked', true);
        } else {
            $('#vx-tour-list').show();
        }
    });
    
    // File upload handling
    $('#vx-browse-file').on('click', function() {
        $('#vx-import-file').click();
    });
    
    $('#vx-import-file').on('change', function() {
        handleFileSelect(this.files[0]);
    });
    
    // Drag and drop
    $('#vx-upload-area').on('dragover', function(e) {
        e.preventDefault();
        $(this).addClass('dragover');
    });
    
    $('#vx-upload-area').on('dragleave', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });
    
    $('#vx-upload-area').on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        
        var files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    function handleFileSelect(file) {
        if (!file) return;
        
        if (file.type !== 'application/json') {
            alert('<?php esc_js(_e('Please select a valid JSON file.', 'vortex360-lite')); ?>');
            return;
        }
        
        // Show file info
        $('.vx-file-name').text(file.name);
        $('.vx-file-size').text(formatFileSize(file.size));
        $('#vx-file-info').show();
        $('#vx-upload-area').hide();
        
        // Read and preview file
        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                var data = JSON.parse(e.target.result);
                previewImportData(data);
            } catch (error) {
                alert('<?php esc_js(_e('Invalid JSON file format.', 'vortex360-lite')); ?>');
                resetFileUpload();
            }
        };
        reader.readAsText(file);
    }
    
    function previewImportData(data) {
        if (!data.tours || !Array.isArray(data.tours)) {
            alert('<?php esc_js(_e('Invalid tour data format.', 'vortex360-lite')); ?>');
            resetFileUpload();
            return;
        }
        
        var tourCount = data.tours.length;
        var sceneCount = 0;
        var hotspotCount = 0;
        
        data.tours.forEach(function(tour) {
            if (tour.config && tour.config.scenes) {
                sceneCount += tour.config.scenes.length;
                tour.config.scenes.forEach(function(scene) {
                    if (scene.hotspots) {
                        hotspotCount += scene.hotspots.length;
                    }
                });
            }
        });
        
        $('#vx-preview-tours').text(tourCount);
        $('#vx-preview-scenes').text(sceneCount);
        $('#vx-preview-hotspots').text(hotspotCount);
        
        // Show tour list
        var toursList = $('#vx-preview-tours-list');
        toursList.empty();
        
        data.tours.forEach(function(tour) {
            var tourItem = $('<div class="vx-preview-tour-item">');
            tourItem.append('<strong>' + (tour.title || 'Untitled Tour') + '</strong>');
            
            if (tour.config && tour.config.scenes) {
                tourItem.append('<span class="vx-tour-scenes">' + tour.config.scenes.length + ' scenes</span>');
            }
            
            toursList.append(tourItem);
        });
        
        $('#vx-import-preview').show();
        $('#vx-import-options').show();
        $('#vx-import-btn').prop('disabled', false);
    }
    
    function resetFileUpload() {
        $('#vx-import-file').val('');
        $('#vx-file-info').hide();
        $('#vx-upload-area').show();
        $('#vx-import-preview').hide();
        $('#vx-import-options').hide();
        $('#vx-import-btn').prop('disabled', true);
    }
    
    $('.vx-remove-file').on('click', resetFileUpload);
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        var k = 1024;
        var sizes = ['Bytes', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Modal controls
    $('.vx-modal-close, #vx-modal-cancel').on('click', function() {
        $('#vx-import-export-modal').hide();
    });
    
    $('.vx-modal-overlay').on('click', function() {
        $('#vx-import-export-modal').hide();
    });
});
</script>