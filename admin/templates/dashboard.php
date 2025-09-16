<?php
/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

/**
 * Admin Dashboard Template
 * Main interface for managing tours, scenes, and hotspots
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current tour if editing
$tour_id = isset($_GET['tour_id']) ? intval($_GET['tour_id']) : 0;
$tour = null;
$scenes = [];

if ($tour_id) {
    global $wpdb;
    $tour = $wpdb->get_row($wpdb->prepare(
        "SELECT * FROM {$wpdb->prefix}vortex360_tours WHERE id = %d",
        $tour_id
    ));
    
    if ($tour) {
        $scenes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}vortex360_scenes WHERE tour_id = %d ORDER BY sort_order ASC",
            $tour_id
        ));
    }
}

// Get all tours for sidebar
$tours = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}vortex360_tours ORDER BY created_at DESC");
?>

<div class="vortex360-admin-wrap">
    <!-- Header -->
    <div class="vortex360-header">
        <div class="vortex360-header-content">
            <h1 class="vortex360-title">
                <span class="vortex360-icon">🌐</span>
                Vortex360 Lite
                <span class="vortex360-version">v1.0.0</span>
            </h1>
            
            <div class="vortex360-header-actions">
                <?php if (!$tour_id): ?>
                    <button class="vortex360-btn vortex360-btn-primary" onclick="Vortex360Admin.createNewTour()">
                        <span class="dashicons dashicons-plus-alt"></span>
                        New Tour
                    </button>
                <?php endif; ?>
                
                <div class="vortex360-upgrade-notice">
                    <span class="vortex360-lite-badge">LITE</span>
                    <a href="#" class="vortex360-upgrade-link">Upgrade to Pro</a>
                </div>
            </div>
        </div>
    </div>

    <div class="vortex360-main">
        <!-- Sidebar -->
        <div class="vortex360-sidebar">
            <div class="vortex360-sidebar-section">
                <h3 class="vortex360-sidebar-title">Your Tours</h3>
                
                <?php if (empty($tours)): ?>
                    <div class="vortex360-empty-state">
                        <div class="vortex360-empty-icon">📷</div>
                        <p>No tours created yet</p>
                        <button class="vortex360-btn vortex360-btn-primary vortex360-btn-small" onclick="Vortex360Admin.createNewTour()">
                            Create Your First Tour
                        </button>
                    </div>
                <?php else: ?>
                    <div class="vortex360-tours-list">
                        <?php foreach ($tours as $t): ?>
                            <div class="vortex360-tour-item <?php echo $t->id == $tour_id ? 'active' : ''; ?>">
                                <a href="<?php echo admin_url('admin.php?page=vortex360-lite&tour_id=' . $t->id); ?>" class="vortex360-tour-link">
                                    <div class="vortex360-tour-thumbnail">
                                        <?php if ($t->featured_image): ?>
                                            <img src="<?php echo esc_url($t->featured_image); ?>" alt="<?php echo esc_attr($t->title); ?>">
                                        <?php else: ?>
                                            <div class="vortex360-tour-placeholder">🌐</div>
                                        <?php endif; ?>
                                    </div>
                                    <div class="vortex360-tour-info">
                                        <h4><?php echo esc_html($t->title); ?></h4>
                                        <p><?php echo esc_html(wp_trim_words($t->description, 8)); ?></p>
                                        <span class="vortex360-tour-date"><?php echo date('M j, Y', strtotime($t->created_at)); ?></span>
                                    </div>
                                </a>
                                
                                <div class="vortex360-tour-actions">
                                    <button class="vortex360-btn-icon" data-tooltip="Edit Tour" onclick="window.location.href='<?php echo admin_url('admin.php?page=vortex360-lite&tour_id=' . $t->id); ?>'">
                                        <span class="dashicons dashicons-edit"></span>
                                    </button>
                                    <button class="vortex360-btn-icon vortex360-delete-tour" data-tooltip="Delete Tour" data-tour-id="<?php echo $t->id; ?>">
                                        <span class="dashicons dashicons-trash"></span>
                                    </button>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    
                    <?php if (count($tours) >= 1): ?>
                        <div class="vortex360-lite-limit">
                            <div class="vortex360-limit-info">
                                <span class="vortex360-limit-icon">⚠️</span>
                                <p><strong>Lite Version Limit:</strong> You can create only 1 tour. <a href="#" class="vortex360-upgrade-link">Upgrade to Pro</a> for unlimited tours.</p>
                            </div>
                        </div>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
            
            <!-- Quick Stats -->
            <div class="vortex360-sidebar-section">
                <h3 class="vortex360-sidebar-title">Quick Stats</h3>
                <div class="vortex360-stats">
                    <div class="vortex360-stat">
                        <span class="vortex360-stat-number"><?php echo count($tours); ?></span>
                        <span class="vortex360-stat-label">Tours</span>
                    </div>
                    <div class="vortex360-stat">
                        <span class="vortex360-stat-number"><?php echo count($scenes); ?></span>
                        <span class="vortex360-stat-label">Scenes</span>
                    </div>
                    <div class="vortex360-stat">
                        <span class="vortex360-stat-number">
                            <?php 
                            $total_hotspots = 0;
                            foreach ($scenes as $scene) {
                                $hotspots = $wpdb->get_var($wpdb->prepare(
                                    "SELECT COUNT(*) FROM {$wpdb->prefix}vortex360_hotspots WHERE scene_id = %d",
                                    $scene->id
                                ));
                                $total_hotspots += $hotspots;
                            }
                            echo $total_hotspots;
                            ?>
                        </span>
                        <span class="vortex360-stat-label">Hotspots</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="vortex360-content">
            <?php if (!$tour_id): ?>
                <!-- Welcome Screen -->
                <div class="vortex360-welcome">
                    <div class="vortex360-welcome-content">
                        <h2>Welcome to Vortex360 Lite! 🎉</h2>
                        <p>Create immersive 360° virtual tours for your WordPress site. Get started by creating your first tour.</p>
                        
                        <div class="vortex360-welcome-features">
                            <div class="vortex360-feature">
                                <div class="vortex360-feature-icon">🌐</div>
                                <h3>360° Tours</h3>
                                <p>Create stunning virtual tours with panoramic images</p>
                            </div>
                            <div class="vortex360-feature">
                                <div class="vortex360-feature-icon">📍</div>
                                <h3>Interactive Hotspots</h3>
                                <p>Add clickable hotspots with information and navigation</p>
                            </div>
                            <div class="vortex360-feature">
                                <div class="vortex360-feature-icon">📱</div>
                                <h3>Mobile Responsive</h3>
                                <p>Tours work perfectly on all devices and screen sizes</p>
                            </div>
                        </div>
                        
                        <div class="vortex360-welcome-actions">
                            <button class="vortex360-btn vortex360-btn-primary vortex360-btn-large" onclick="Vortex360Admin.createNewTour()">
                                <span class="dashicons dashicons-plus-alt"></span>
                                Create Your First Tour
                            </button>
                            <a href="#" class="vortex360-btn vortex360-btn-secondary vortex360-btn-large">
                                <span class="dashicons dashicons-book"></span>
                                View Documentation
                            </a>
                        </div>
                    </div>
                </div>
            <?php else: ?>
                <!-- Tour Editor -->
                <?php if ($tour): ?>
                    <div class="vortex360-tour-editor">
                        <!-- Tour Header -->
                        <div class="vortex360-editor-header">
                            <div class="vortex360-breadcrumb">
                                <a href="<?php echo admin_url('admin.php?page=vortex360-lite'); ?>">Tours</a>
                                <span class="vortex360-breadcrumb-separator">›</span>
                                <span><?php echo esc_html($tour->title); ?></span>
                            </div>
                            
                            <div class="vortex360-editor-actions">
                                <button class="vortex360-btn vortex360-btn-secondary" onclick="Vortex360Admin.previewTour(<?php echo $tour->id; ?>)">
                                    <span class="dashicons dashicons-visibility"></span>
                                    Preview
                                </button>
                                <button class="vortex360-btn vortex360-btn-primary vortex360-save-tour">
                                    <span class="dashicons dashicons-saved"></span>
                                    Save Tour
                                </button>
                            </div>
                        </div>

                        <!-- Tour Settings -->
                        <div class="vortex360-editor-section">
                            <h3 class="vortex360-section-title">
                                <span class="dashicons dashicons-admin-settings"></span>
                                Tour Settings
                            </h3>
                            
                            <form class="vortex360-form vortex360-tour-form">
                                <input type="hidden" name="tour_id" value="<?php echo $tour->id; ?>">
                                
                                <div class="vortex360-form-row">
                                    <div class="vortex360-form-group">
                                        <label class="vortex360-label">Tour Title *</label>
                                        <input type="text" name="title" class="vortex360-input" value="<?php echo esc_attr($tour->title); ?>" required>
                                    </div>
                                    
                                    <div class="vortex360-form-group">
                                        <label class="vortex360-label">Slug</label>
                                        <input type="text" name="slug" class="vortex360-input" value="<?php echo esc_attr($tour->slug); ?>">
                                    </div>
                                </div>
                                
                                <div class="vortex360-form-group">
                                    <label class="vortex360-label">Description</label>
                                    <textarea name="description" class="vortex360-textarea" rows="3"><?php echo esc_textarea($tour->description); ?></textarea>
                                </div>
                                
                                <div class="vortex360-form-row">
                                    <div class="vortex360-form-group">
                                        <label class="vortex360-label">Featured Image</label>
                                        <div class="vortex360-image-upload">
                                            <input type="url" name="featured_image" class="vortex360-input vortex360-image-url" value="<?php echo esc_url($tour->featured_image); ?>">
                                            <button type="button" class="vortex360-btn vortex360-btn-secondary vortex360-media-upload">Select Image</button>
                                            <?php if ($tour->featured_image): ?>
                                                <img src="<?php echo esc_url($tour->featured_image); ?>" class="vortex360-image-preview" style="max-width: 150px; margin-top: 10px;">
                                            <?php else: ?>
                                                <img class="vortex360-image-preview" style="max-width: 150px; margin-top: 10px; display: none;">
                                            <?php endif; ?>
                                        </div>
                                    </div>
                                    
                                    <div class="vortex360-form-group">
                                        <label class="vortex360-label">Status</label>
                                        <select name="status" class="vortex360-select">
                                            <option value="draft" <?php selected($tour->status, 'draft'); ?>>Draft</option>
                                            <option value="published" <?php selected($tour->status, 'published'); ?>>Published</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- Scenes Management -->
                        <div class="vortex360-editor-section">
                            <div class="vortex360-section-header">
                                <h3 class="vortex360-section-title">
                                    <span class="dashicons dashicons-format-gallery"></span>
                                    Scenes (<?php echo count($scenes); ?>)
                                </h3>
                                
                                <button class="vortex360-btn vortex360-btn-primary vortex360-add-scene" data-tour-id="<?php echo $tour->id; ?>">
                                    <span class="dashicons dashicons-plus-alt"></span>
                                    Add Scene
                                </button>
                            </div>
                            
                            <?php if (empty($scenes)): ?>
                                <div class="vortex360-empty-state">
                                    <div class="vortex360-empty-icon">📷</div>
                                    <h4>No scenes added yet</h4>
                                    <p>Add 360° scenes to create your virtual tour experience.</p>
                                    <button class="vortex360-btn vortex360-btn-primary vortex360-add-scene" data-tour-id="<?php echo $tour->id; ?>">
                                        Add Your First Scene
                                    </button>
                                </div>
                            <?php else: ?>
                                <div class="vortex360-scenes-grid vortex360-sortable">
                                    <?php foreach ($scenes as $scene): ?>
                                        <?php
                                        $hotspots = $wpdb->get_results($wpdb->prepare(
                                            "SELECT * FROM {$wpdb->prefix}vortex360_hotspots WHERE scene_id = %d",
                                            $scene->id
                                        ));
                                        ?>
                                        <div class="vortex360-scene-card" data-id="<?php echo $scene->id; ?>">
                                            <div class="vortex360-scene-thumbnail">
                                                <?php if ($scene->image_url): ?>
                                                    <img src="<?php echo esc_url($scene->image_url); ?>" alt="<?php echo esc_attr($scene->title); ?>">
                                                <?php else: ?>
                                                    <div class="vortex360-scene-placeholder">📷</div>
                                                <?php endif; ?>
                                                
                                                <?php if ($scene->is_default): ?>
                                                    <span class="vortex360-default-badge">Default</span>
                                                <?php endif; ?>
                                                
                                                <div class="vortex360-scene-overlay">
                                                    <button class="vortex360-btn vortex360-btn-small vortex360-btn-primary vortex360-edit-scene" 
                                                            data-scene-id="<?php echo $scene->id; ?>" data-tour-id="<?php echo $tour->id; ?>">
                                                        <span class="dashicons dashicons-edit"></span>
                                                        Edit
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div class="vortex360-scene-info">
                                                <h4><?php echo esc_html($scene->title); ?></h4>
                                                <p><?php echo esc_html(wp_trim_words($scene->description, 10)); ?></p>
                                                
                                                <div class="vortex360-scene-meta">
                                                    <span class="vortex360-hotspot-count">
                                                        <span class="dashicons dashicons-location"></span>
                                                        <?php echo count($hotspots); ?> hotspots
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div class="vortex360-scene-actions">
                                                <button class="vortex360-btn-icon vortex360-drag-handle" data-tooltip="Drag to reorder">
                                                    <span class="dashicons dashicons-move"></span>
                                                </button>
                                                <button class="vortex360-btn-icon vortex360-add-hotspot" data-tooltip="Add Hotspot" data-scene-id="<?php echo $scene->id; ?>">
                                                    <span class="dashicons dashicons-location-alt"></span>
                                                </button>
                                                <button class="vortex360-btn-icon vortex360-delete-scene" data-tooltip="Delete Scene" data-scene-id="<?php echo $scene->id; ?>">
                                                    <span class="dashicons dashicons-trash"></span>
                                                </button>
                                            </div>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>

                        <!-- Shortcode & Embed -->
                        <div class="vortex360-editor-section">
                            <h3 class="vortex360-section-title">
                                <span class="dashicons dashicons-shortcode"></span>
                                Embed Tour
                            </h3>
                            
                            <div class="vortex360-embed-options">
                                <div class="vortex360-embed-option">
                                    <label class="vortex360-label">Shortcode</label>
                                    <div class="vortex360-code-block">
                                        <code>[vortex360 id="<?php echo $tour->id; ?>"]</code>
                                        <button class="vortex360-btn vortex360-btn-small vortex360-copy-code" data-code='[vortex360 id="<?php echo $tour->id; ?>"]'>
                                            <span class="dashicons dashicons-admin-page"></span>
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="vortex360-embed-option">
                                    <label class="vortex360-label">PHP Code</label>
                                    <div class="vortex360-code-block">
                                        <code>&lt;?php echo do_shortcode('[vortex360 id="<?php echo $tour->id; ?>"]'); ?&gt;</code>
                                        <button class="vortex360-btn vortex360-btn-small vortex360-copy-code" data-code='&lt;?php echo do_shortcode("[vortex360 id=&quot;<?php echo $tour->id; ?>&quot;]"); ?&gt;'>
                                            <span class="dashicons dashicons-admin-page"></span>
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php else: ?>
                    <div class="vortex360-error">
                        <h3>Tour not found</h3>
                        <p>The requested tour could not be found.</p>
                        <a href="<?php echo admin_url('admin.php?page=vortex360-lite'); ?>" class="vortex360-btn vortex360-btn-primary">Back to Tours</a>
                    </div>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- New Tour Modal Template -->
<script type="text/template" id="vortex360-new-tour-template">
    <form class="vortex360-form">
        <h2>Create New Tour</h2>
        
        <div class="vortex360-form-group">
            <label class="vortex360-label">Tour Title *</label>
            <input type="text" name="title" class="vortex360-input" required placeholder="Enter tour title">
        </div>
        
        <div class="vortex360-form-group">
            <label class="vortex360-label">Description</label>
            <textarea name="description" class="vortex360-textarea" rows="3" placeholder="Brief description of your tour"></textarea>
        </div>
        
        <div class="vortex360-form-group">
            <button type="button" class="vortex360-btn vortex360-btn-primary vortex360-save-tour">Create Tour</button>
            <button type="button" class="vortex360-btn vortex360-btn-secondary vortex360-modal-close">Cancel</button>
        </div>
    </form>
</script>

<script>
// Additional admin JavaScript functions
window.Vortex360Admin = window.Vortex360Admin || {};

/**
 * Create new tour modal
 */
Vortex360Admin.createNewTour = function() {
    const template = document.getElementById('vortex360-new-tour-template').innerHTML;
    this.showModal(template);
};

/**
 * Preview tour in new window
 * @param {number} tourId Tour ID
 */
Vortex360Admin.previewTour = function(tourId) {
    const previewUrl = '<?php echo home_url(); ?>?vortex360_preview=' + tourId;
    window.open(previewUrl, '_blank');
};

/**
 * Copy code to clipboard
 */
jQuery(document).on('click', '.vortex360-copy-code', function() {
    const code = jQuery(this).data('code');
    navigator.clipboard.writeText(code).then(function() {
        Vortex360Admin.showNotification('Code copied to clipboard!', 'success');
    });
});
</script>