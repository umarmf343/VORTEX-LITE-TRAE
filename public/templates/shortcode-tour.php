<?php
/**
 * Vortex360 Lite - Shortcode Tour Template
 * 
 * Template for rendering tours via shortcode [vortex360]
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get shortcode attributes
$tour_id = isset($atts['id']) ? intval($atts['id']) : 0;
$width = isset($atts['width']) ? sanitize_text_field($atts['width']) : '100%';
$height = isset($atts['height']) ? sanitize_text_field($atts['height']) : '400px';
$autoplay = isset($atts['autoplay']) ? filter_var($atts['autoplay'], FILTER_VALIDATE_BOOLEAN) : false;
$controls = isset($atts['controls']) ? filter_var($atts['controls'], FILTER_VALIDATE_BOOLEAN) : true;
$fullscreen = isset($atts['fullscreen']) ? filter_var($atts['fullscreen'], FILTER_VALIDATE_BOOLEAN) : true;
$theme = isset($atts['theme']) ? sanitize_text_field($atts['theme']) : 'default';
$start_scene = isset($atts['scene']) ? intval($atts['scene']) : null;

// Validate tour ID
if (!$tour_id) {
    return '<div class="vx-shortcode-error">' . __('Error: Tour ID is required. Usage: [vortex360 id="1"]', 'vortex360-lite') . '</div>';
}

// Get tour data
$tour = vx_get_tour($tour_id);
if (!$tour) {
    return '<div class="vx-shortcode-error">' . __('Error: Tour not found.', 'vortex360-lite') . '</div>';
}

// Check if tour is published
if ($tour->status !== 'published') {
    if (!current_user_can('edit_posts')) {
        return '<div class="vx-shortcode-error">' . __('This tour is not available.', 'vortex360-lite') . '</div>';
    } else {
        $preview_notice = '<div class="vx-preview-notice">' . __('Preview: This tour is not published yet.', 'vortex360-lite') . '</div>';
    }
}

// Generate unique container ID
$container_id = 'vx-shortcode-' . $tour_id . '-' . wp_generate_uuid4();

// Get settings and merge with shortcode attributes
$settings = vx_get_settings();
$tour_config = vx_get_tour_config($tour_id);

// Override settings with shortcode attributes
if (isset($atts['autoplay'])) {
    $settings['auto_rotation'] = $autoplay;
}
if (isset($atts['controls'])) {
    $settings['show_controls'] = $controls;
}
if (isset($atts['fullscreen'])) {
    $settings['show_fullscreen'] = $fullscreen;
}
if (isset($atts['theme'])) {
    $settings['viewer_theme'] = $theme;
}

// Get scenes
$scenes = vx_get_tour_scenes($tour_id);
if (empty($scenes)) {
    return '<div class="vx-shortcode-error">' . __('Error: No scenes found in this tour.', 'vortex360-lite') . '</div>';
}

// Find start scene
$start_scene_data = null;
if ($start_scene) {
    foreach ($scenes as $scene) {
        if ($scene->id == $start_scene) {
            $start_scene_data = $scene;
            break;
        }
    }
}
if (!$start_scene_data) {
    $start_scene_data = $scenes[0];
}

// Prepare tour data for JavaScript
$tour_data = array(
    'id' => $tour_id,
    'title' => $tour->title,
    'description' => $tour->description,
    'startScene' => $start_scene_data->id,
    'scenes' => array(),
    'settings' => $settings,
    'config' => $tour_config,
    'shortcode' => true,
    'container' => $container_id
);

// Process scenes and hotspots
foreach ($scenes as $scene) {
    $hotspots = vx_get_scene_hotspots($scene->id);
    
    $scene_data = array(
        'id' => $scene->id,
        'title' => $scene->title,
        'description' => $scene->description,
        'image_url' => $scene->image_url,
        'initial_view' => array(
            'yaw' => floatval($scene->initial_yaw),
            'pitch' => floatval($scene->initial_pitch),
            'fov' => floatval($scene->initial_fov)
        ),
        'hotspots' => array()
    );
    
    // Process hotspots (limit for Lite version)
    $hotspot_count = 0;
    $max_hotspots = vx_get_lite_limits()['max_hotspots_per_scene'];
    
    foreach ($hotspots as $hotspot) {
        if (!vx_is_pro_active() && $hotspot_count >= $max_hotspots) {
            break;
        }
        
        $hotspot_data = array(
            'id' => $hotspot->id,
            'type' => $hotspot->type,
            'title' => $hotspot->title,
            'description' => $hotspot->description,
            'position' => array(
                'yaw' => floatval($hotspot->yaw),
                'pitch' => floatval($hotspot->pitch)
            ),
            'target_scene_id' => $hotspot->target_scene_id,
            'url' => $hotspot->url,
            'image_url' => $hotspot->image_url,
            'style' => array(
                'color' => $hotspot->color,
                'size' => $hotspot->size,
                'animation' => $hotspot->animation
            )
        );
        
        // Limit advanced hotspot types in Lite version
        if (!vx_is_pro_active() && in_array($hotspot->type, array('video', 'audio', 'gallery', 'form'))) {
            $hotspot_data['type'] = 'info';
            $hotspot_data['description'] = __('Advanced hotspot types available in Pro version.', 'vortex360-lite');
        } else {
            $hotspot_data['video_url'] = $hotspot->video_url;
            $hotspot_data['audio_url'] = $hotspot->audio_url;
            $hotspot_data['custom_html'] = $hotspot->custom_html;
        }
        
        $scene_data['hotspots'][] = $hotspot_data;
        $hotspot_count++;
    }
    
    $tour_data['scenes'][] = $scene_data;
}

// Enqueue required assets
wp_enqueue_script('vx-pannellum');
wp_enqueue_script('vx-tour-viewer');
wp_enqueue_style('vx-tour-viewer');

// Add tour data to page
wp_localize_script('vx-tour-viewer', 'vxShortcodeData_' . str_replace('-', '_', $container_id), $tour_data);

// Normalize dimensions
if (is_numeric($width)) {
    $width .= 'px';
}
if (is_numeric($height)) {
    $height .= 'px';
}

// Build output
ob_start();
?>

<?php if (isset($preview_notice)): ?>
    <?php echo $preview_notice; ?>
<?php endif; ?>

<div class="vx-shortcode-container vx-theme-<?php echo esc_attr($theme); ?>" 
     id="<?php echo esc_attr($container_id); ?>"
     style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>; position: relative; overflow: hidden;">
    
    <!-- Loading Screen -->
    <div class="vx-shortcode-loading" id="vx-loading-<?php echo esc_attr($container_id); ?>">
        <div class="vx-loading-content">
            <div class="vx-loading-spinner">
                <div class="vx-spinner"></div>
            </div>
            <div class="vx-loading-text">
                <p><?php _e('Loading tour...', 'vortex360-lite'); ?></p>
            </div>
        </div>
    </div>
    
    <!-- Tour Viewer -->
    <div class="vx-shortcode-viewer" 
         id="vx-viewer-<?php echo esc_attr($container_id); ?>"
         data-tour-id="<?php echo esc_attr($tour_id); ?>"
         data-container-id="<?php echo esc_attr($container_id); ?>"
         style="width: 100%; height: 100%; display: none;">
    </div>
    
    <!-- Controls Overlay -->
    <?php if ($controls): ?>
        <div class="vx-shortcode-controls" id="vx-controls-<?php echo esc_attr($container_id); ?>">
            <!-- Basic Controls -->
            <div class="vx-control-group vx-nav-controls">
                <button class="vx-control-btn vx-zoom-in" title="<?php _e('Zoom In', 'vortex360-lite'); ?>">
                    <span class="vx-icon">+</span>
                </button>
                <button class="vx-control-btn vx-zoom-out" title="<?php _e('Zoom Out', 'vortex360-lite'); ?>">
                    <span class="vx-icon">−</span>
                </button>
                <button class="vx-control-btn vx-auto-rotate" title="<?php _e('Auto Rotate', 'vortex360-lite'); ?>">
                    <span class="vx-icon">↻</span>
                </button>
            </div>
            
            <!-- Scene Navigation -->
            <?php if (count($scenes) > 1): ?>
                <div class="vx-control-group vx-scene-nav">
                    <button class="vx-control-btn vx-prev-scene" title="<?php _e('Previous Scene', 'vortex360-lite'); ?>">
                        <span class="vx-icon">‹</span>
                    </button>
                    <div class="vx-scene-info">
                        <span class="vx-scene-counter" id="vx-counter-<?php echo esc_attr($container_id); ?>">
                            1/<?php echo count($scenes); ?>
                        </span>
                    </div>
                    <button class="vx-control-btn vx-next-scene" title="<?php _e('Next Scene', 'vortex360-lite'); ?>">
                        <span class="vx-icon">›</span>
                    </button>
                </div>
            <?php endif; ?>
            
            <!-- Additional Controls -->
            <div class="vx-control-group vx-extra-controls">
                <?php if ($fullscreen): ?>
                    <button class="vx-control-btn vx-fullscreen" title="<?php _e('Fullscreen', 'vortex360-lite'); ?>">
                        <span class="vx-icon">⛶</span>
                    </button>
                <?php endif; ?>
                
                <button class="vx-control-btn vx-info" title="<?php _e('Tour Info', 'vortex360-lite'); ?>">
                    <span class="vx-icon">i</span>
                </button>
            </div>
        </div>
    <?php endif; ?>
    
    <!-- Info Panel -->
    <div class="vx-shortcode-info" id="vx-info-<?php echo esc_attr($container_id); ?>" style="display: none;">
        <div class="vx-info-header">
            <h4><?php echo esc_html($tour->title); ?></h4>
            <button class="vx-close-info">&times;</button>
        </div>
        <div class="vx-info-content">
            <?php if ($tour->description): ?>
                <p><?php echo esc_html(wp_trim_words($tour->description, 20)); ?></p>
            <?php endif; ?>
            
            <div class="vx-tour-meta">
                <span class="vx-meta-item">
                    <strong><?php _e('Scenes:', 'vortex360-lite'); ?></strong> <?php echo count($scenes); ?>
                </span>
                <span class="vx-meta-item">
                    <strong><?php _e('Hotspots:', 'vortex360-lite'); ?></strong> <?php echo vx_get_tour_hotspots_count($tour_id); ?>
                </span>
            </div>
            
            <?php if ($tour_config['show_share_buttons']): ?>
                <div class="vx-share-buttons">
                    <button class="vx-share-btn vx-copy-link" data-url="<?php echo esc_url(get_permalink()); ?>">
                        <?php _e('Copy Link', 'vortex360-lite'); ?>
                    </button>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Error Screen -->
    <div class="vx-shortcode-error" id="vx-error-<?php echo esc_attr($container_id); ?>" style="display: none;">
        <div class="vx-error-content">
            <div class="vx-error-icon">⚠</div>
            <p class="vx-error-message"></p>
            <button class="vx-retry-btn" onclick="vxRetryShortcode('<?php echo esc_js($container_id); ?>')">
                <?php _e('Retry', 'vortex360-lite'); ?>
            </button>
        </div>
    </div>
    
    <!-- Branding (Lite version) -->
    <?php if (!vx_is_pro_active() && $tour_config['show_branding']): ?>
        <div class="vx-shortcode-branding">
            <a href="<?php echo esc_url(vx_get_website_url()); ?>" target="_blank" rel="noopener">
                <?php _e('Powered by Vortex360', 'vortex360-lite'); ?>
            </a>
        </div>
    <?php endif; ?>
</div>

<script type="text/javascript">
(function($) {
    'use strict';
    
    $(document).ready(function() {
        // Initialize shortcode tour
        if (typeof VortexTourViewer !== 'undefined') {
            const containerId = '<?php echo esc_js($container_id); ?>';
            const tourData = window['vxShortcodeData_' + containerId.replace(/-/g, '_')];
            
            window['vxShortcodeTour_' + containerId.replace(/-/g, '_')] = new VortexTourViewer({
                containerId: containerId,
                tourId: <?php echo esc_js($tour_id); ?>,
                data: tourData,
                shortcode: true,
                onLoad: function() {
                    $('#vx-loading-' + containerId).fadeOut();
                    $('#vx-viewer-' + containerId).fadeIn();
                    
                    // Auto-start rotation if enabled
                    if (tourData.settings.auto_rotation && <?php echo $autoplay ? 'true' : 'false'; ?>) {
                        this.startAutoRotation();
                    }
                },
                onError: function(error) {
                    vxShowShortcodeError(containerId, error.message || '<?php _e('Failed to load tour', 'vortex360-lite'); ?>');
                },
                onSceneChange: function(sceneId) {
                    const sceneIndex = tourData.scenes.findIndex(s => s.id == sceneId);
                    if (sceneIndex >= 0) {
                        $('#vx-counter-' + containerId).text((sceneIndex + 1) + '/' + tourData.scenes.length);
                    }
                }
            });
        } else {
            vxShowShortcodeError('<?php echo esc_js($container_id); ?>', '<?php _e('Tour viewer not available', 'vortex360-lite'); ?>');
        }
        
        // Control event handlers
        const containerId = '<?php echo esc_js($container_id); ?>';
        
        // Info panel toggle
        $('#' + containerId + ' .vx-info').on('click', function() {
            $('#vx-info-' + containerId).toggle();
        });
        
        $('#' + containerId + ' .vx-close-info').on('click', function() {
            $('#vx-info-' + containerId).hide();
        });
        
        // Copy link functionality
        $('#' + containerId + ' .vx-copy-link').on('click', function() {
            const url = $(this).data('url');
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function() {
                    alert('<?php _e('Link copied to clipboard!', 'vortex360-lite'); ?>');
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('<?php _e('Link copied to clipboard!', 'vortex360-lite'); ?>');
            }
        });
    });
    
})(jQuery);

// Global functions
function vxShowShortcodeError(containerId, message) {
    jQuery('#vx-loading-' + containerId).hide();
    jQuery('#vx-error-' + containerId + ' .vx-error-message').text(message);
    jQuery('#vx-error-' + containerId).show();
}

function vxRetryShortcode(containerId) {
    jQuery('#vx-error-' + containerId).hide();
    jQuery('#vx-loading-' + containerId).show();
    
    // Reload the tour
    setTimeout(function() {
        location.reload();
    }, 500);
}
</script>

<style>
/* Shortcode-specific styles */
.vx-shortcode-container {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    background: #000;
}

.vx-shortcode-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.vx-loading-content {
    text-align: center;
    color: #fff;
}

.vx-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #333;
    border-top: 3px solid #fff;
    border-radius: 50%;
    animation: vx-spin 1s linear infinite;
    margin: 0 auto 15px;
}

@keyframes vx-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.vx-shortcode-controls {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.vx-control-group {
    display: flex;
    gap: 2px;
    background: rgba(0,0,0,0.7);
    border-radius: 4px;
    padding: 2px;
}

.vx-control-btn {
    background: rgba(255,255,255,0.9);
    border: none;
    width: 32px;
    height: 32px;
    border-radius: 3px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    transition: all 0.2s;
}

.vx-control-btn:hover {
    background: #fff;
    transform: scale(1.05);
}

.vx-scene-info {
    display: flex;
    align-items: center;
    padding: 0 8px;
    color: #fff;
    font-size: 12px;
    min-width: 40px;
    justify-content: center;
}

.vx-shortcode-info {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    background: rgba(0,0,0,0.9);
    color: #fff;
    border-radius: 6px;
    padding: 15px;
    z-index: 6;
    max-height: 200px;
    overflow-y: auto;
}

.vx-info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
}

.vx-info-header h4 {
    margin: 0;
    font-size: 16px;
}

.vx-close-info {
    background: none;
    border: none;
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
}

.vx-tour-meta {
    display: flex;
    gap: 15px;
    margin: 10px 0;
    font-size: 13px;
}

.vx-share-buttons {
    margin-top: 10px;
}

.vx-share-btn {
    background: #007cba;
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 12px;
}

.vx-shortcode-error {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
}

.vx-error-content {
    text-align: center;
    color: #fff;
    padding: 20px;
}

.vx-error-icon {
    font-size: 48px;
    margin-bottom: 15px;
    color: #ff6b6b;
}

.vx-retry-btn {
    background: #007cba;
    color: #fff;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 15px;
}

.vx-shortcode-branding {
    position: absolute;
    bottom: 5px;
    right: 5px;
    z-index: 3;
}

.vx-shortcode-branding a {
    background: rgba(0,0,0,0.7);
    color: #fff;
    text-decoration: none;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    opacity: 0.8;
}

.vx-shortcode-branding a:hover {
    opacity: 1;
}

/* Theme variations */
.vx-theme-dark .vx-control-btn {
    background: rgba(0,0,0,0.8);
    color: #fff;
}

.vx-theme-dark .vx-control-btn:hover {
    background: rgba(0,0,0,0.9);
}

.vx-theme-minimal .vx-shortcode-controls {
    opacity: 0.7;
}

.vx-theme-minimal .vx-shortcode-controls:hover {
    opacity: 1;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .vx-shortcode-controls {
        top: 5px;
        right: 5px;
    }
    
    .vx-control-btn {
        width: 28px;
        height: 28px;
        font-size: 12px;
    }
    
    .vx-shortcode-info {
        bottom: 5px;
        left: 5px;
        right: 5px;
        padding: 10px;
    }
    
    .vx-tour-meta {
        flex-direction: column;
        gap: 5px;
    }
}
</style>

<?php
return ob_get_clean();
?>