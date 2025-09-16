<?php
/**
 * Vortex360 Lite - Tour Viewer Template
 * 
 * Main template for displaying 360° tours on the frontend
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get tour data
$tour_id = isset($tour_id) ? intval($tour_id) : 0;
$tour = vx_get_tour($tour_id);

if (!$tour) {
    echo '<div class="vx-error">' . __('Tour not found.', 'vortex360-lite') . '</div>';
    return;
}

// Get tour settings
$settings = vx_get_settings();
$tour_config = vx_get_tour_config($tour_id);
$scenes = vx_get_tour_scenes($tour_id);
$is_pro = vx_is_pro_active();

// Generate unique viewer ID
$viewer_id = 'vx-viewer-' . $tour_id . '-' . wp_generate_uuid4();

// Prepare tour data for JavaScript
$tour_data = array(
    'id' => $tour_id,
    'title' => $tour->title,
    'description' => $tour->description,
    'scenes' => array(),
    'settings' => array(
        'autoRotation' => $settings['auto_rotation'],
        'rotationSpeed' => $settings['rotation_speed'],
        'showControls' => $settings['show_controls'],
        'showFullscreen' => $settings['show_fullscreen'],
        'showGyroscope' => $settings['show_gyroscope'],
        'imageQuality' => $settings['image_quality'],
        'preloadScenes' => $settings['preload_scenes'],
        'lazyLoading' => $settings['lazy_loading'],
        'theme' => $settings['viewer_theme']
    ),
    'config' => $tour_config,
    'isPro' => $is_pro
);

// Process scenes
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
    
    // Process hotspots
    foreach ($hotspots as $hotspot) {
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
            'video_url' => $hotspot->video_url,
            'audio_url' => $hotspot->audio_url,
            'custom_html' => $hotspot->custom_html,
            'style' => array(
                'color' => $hotspot->color,
                'size' => $hotspot->size,
                'animation' => $hotspot->animation
            )
        );
        
        $scene_data['hotspots'][] = $hotspot_data;
    }
    
    $tour_data['scenes'][] = $scene_data;
}

// Enqueue required assets
wp_enqueue_script('vx-pannellum');
wp_enqueue_script('vx-tour-viewer');
wp_enqueue_style('vx-tour-viewer');

// Add tour data to page
wp_localize_script('vx-tour-viewer', 'vxTourData_' . $tour_id, $tour_data);

// SEO and meta tags
if ($settings['enable_seo']) {
    $title = $tour->seo_title ?: $tour->title ?: $settings['default_title'];
    $description = $tour->seo_description ?: $tour->description ?: $settings['default_description'];
    
    echo '<meta property="og:title" content="' . esc_attr($title) . '">' . "\n";
    echo '<meta property="og:description" content="' . esc_attr($description) . '">' . "\n";
    echo '<meta property="og:type" content="website">' . "\n";
    echo '<meta property="og:url" content="' . esc_url(get_permalink()) . '">' . "\n";
    
    if (!empty($scenes)) {
        echo '<meta property="og:image" content="' . esc_url($scenes[0]->image_url) . '">' . "\n";
    }
    
    // Structured data
    $structured_data = array(
        '@context' => 'https://schema.org',
        '@type' => 'VirtualLocation',
        'name' => $title,
        'description' => $description,
        'url' => get_permalink(),
        'image' => !empty($scenes) ? $scenes[0]->image_url : '',
        'provider' => array(
            '@type' => 'Organization',
            'name' => get_bloginfo('name')
        )
    );
    
    echo '<script type="application/ld+json">' . json_encode($structured_data) . '</script>' . "\n";
}
?>

<div class="vx-tour-container" id="<?php echo esc_attr($viewer_id); ?>">
    <!-- Loading Screen -->
    <div class="vx-loading-screen" id="vx-loading-<?php echo esc_attr($tour_id); ?>">
        <div class="vx-loading-content">
            <div class="vx-loading-spinner">
                <div class="vx-spinner"></div>
            </div>
            <div class="vx-loading-text">
                <h3><?php echo esc_html($tour->title); ?></h3>
                <p><?php _e('Loading virtual tour...', 'vortex360-lite'); ?></p>
                <div class="vx-loading-progress">
                    <div class="vx-progress-bar" id="vx-progress-<?php echo esc_attr($tour_id); ?>"></div>
                </div>
            </div>
        </div>
        
        <?php if (!$is_pro): ?>
            <div class="vx-loading-branding">
                <p><?php _e('Powered by', 'vortex360-lite'); ?> 
                   <a href="<?php echo esc_url(vx_get_website_url()); ?>" target="_blank">Vortex360</a>
                </p>
            </div>
        <?php endif; ?>
    </div>
    
    <!-- Tour Viewer -->
    <div class="vx-viewer" id="vx-panorama-<?php echo esc_attr($tour_id); ?>" 
         data-tour-id="<?php echo esc_attr($tour_id); ?>"
         data-viewer-id="<?php echo esc_attr($viewer_id); ?>"
         style="display: none;">
    </div>
    
    <!-- Tour Controls -->
    <?php if ($settings['show_controls']): ?>
        <div class="vx-controls" id="vx-controls-<?php echo esc_attr($tour_id); ?>">
            <!-- Navigation Controls -->
            <div class="vx-nav-controls">
                <button class="vx-control-btn vx-zoom-in" title="<?php _e('Zoom In', 'vortex360-lite'); ?>">
                    <span class="vx-icon vx-icon-zoom-in"></span>
                </button>
                <button class="vx-control-btn vx-zoom-out" title="<?php _e('Zoom Out', 'vortex360-lite'); ?>">
                    <span class="vx-icon vx-icon-zoom-out"></span>
                </button>
                <button class="vx-control-btn vx-auto-rotate" title="<?php _e('Auto Rotate', 'vortex360-lite'); ?>">
                    <span class="vx-icon vx-icon-rotate"></span>
                </button>
            </div>
            
            <!-- Scene Navigation -->
            <?php if (count($scenes) > 1): ?>
                <div class="vx-scene-nav">
                    <button class="vx-control-btn vx-prev-scene" title="<?php _e('Previous Scene', 'vortex360-lite'); ?>">
                        <span class="vx-icon vx-icon-prev"></span>
                    </button>
                    <div class="vx-scene-info">
                        <span class="vx-scene-title" id="vx-current-scene-<?php echo esc_attr($tour_id); ?>">
                            <?php echo esc_html($scenes[0]->title); ?>
                        </span>
                        <span class="vx-scene-counter" id="vx-scene-counter-<?php echo esc_attr($tour_id); ?>">
                            1 / <?php echo count($scenes); ?>
                        </span>
                    </div>
                    <button class="vx-control-btn vx-next-scene" title="<?php _e('Next Scene', 'vortex360-lite'); ?>">
                        <span class="vx-icon vx-icon-next"></span>
                    </button>
                </div>
            <?php endif; ?>
            
            <!-- Additional Controls -->
            <div class="vx-extra-controls">
                <?php if ($settings['show_gyroscope']): ?>
                    <button class="vx-control-btn vx-gyroscope" title="<?php _e('Gyroscope', 'vortex360-lite'); ?>">
                        <span class="vx-icon vx-icon-gyroscope"></span>
                    </button>
                <?php endif; ?>
                
                <?php if ($settings['show_fullscreen']): ?>
                    <button class="vx-control-btn vx-fullscreen" title="<?php _e('Fullscreen', 'vortex360-lite'); ?>">
                        <span class="vx-icon vx-icon-fullscreen"></span>
                    </button>
                <?php endif; ?>
                
                <?php if ($is_pro): ?>
                    <button class="vx-control-btn vx-vr-mode" title="<?php _e('VR Mode', 'vortex360-lite'); ?>">
                        <span class="vx-icon vx-icon-vr"></span>
                    </button>
                <?php endif; ?>
                
                <button class="vx-control-btn vx-info" title="<?php _e('Tour Info', 'vortex360-lite'); ?>">
                    <span class="vx-icon vx-icon-info"></span>
                </button>
            </div>
        </div>
    <?php endif; ?>
    
    <!-- Scene List (for mobile) -->
    <?php if (count($scenes) > 1): ?>
        <div class="vx-scene-list" id="vx-scene-list-<?php echo esc_attr($tour_id); ?>" style="display: none;">
            <div class="vx-scene-list-header">
                <h3><?php _e('Scenes', 'vortex360-lite'); ?></h3>
                <button class="vx-close-scene-list">&times;</button>
            </div>
            <div class="vx-scene-list-content">
                <?php foreach ($scenes as $index => $scene): ?>
                    <div class="vx-scene-item" data-scene-id="<?php echo esc_attr($scene->id); ?>">
                        <div class="vx-scene-thumbnail">
                            <img src="<?php echo esc_url(vx_get_scene_thumbnail($scene->image_url)); ?>" 
                                 alt="<?php echo esc_attr($scene->title); ?>">
                        </div>
                        <div class="vx-scene-details">
                            <h4><?php echo esc_html($scene->title); ?></h4>
                            <?php if ($scene->description): ?>
                                <p><?php echo esc_html(wp_trim_words($scene->description, 15)); ?></p>
                            <?php endif; ?>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>
    
    <!-- Tour Info Panel -->
    <div class="vx-info-panel" id="vx-info-panel-<?php echo esc_attr($tour_id); ?>" style="display: none;">
        <div class="vx-info-header">
            <h3><?php echo esc_html($tour->title); ?></h3>
            <button class="vx-close-info">&times;</button>
        </div>
        <div class="vx-info-content">
            <?php if ($tour->description): ?>
                <div class="vx-tour-description">
                    <?php echo wp_kses_post(wpautop($tour->description)); ?>
                </div>
            <?php endif; ?>
            
            <div class="vx-tour-stats">
                <div class="vx-stat">
                    <span class="vx-stat-label"><?php _e('Scenes:', 'vortex360-lite'); ?></span>
                    <span class="vx-stat-value"><?php echo count($scenes); ?></span>
                </div>
                <div class="vx-stat">
                    <span class="vx-stat-label"><?php _e('Hotspots:', 'vortex360-lite'); ?></span>
                    <span class="vx-stat-value"><?php echo vx_get_tour_hotspots_count($tour_id); ?></span>
                </div>
                <?php if ($is_pro): ?>
                    <div class="vx-stat">
                        <span class="vx-stat-label"><?php _e('Views:', 'vortex360-lite'); ?></span>
                        <span class="vx-stat-value"><?php echo vx_get_tour_views($tour_id); ?></span>
                    </div>
                <?php endif; ?>
            </div>
            
            <?php if ($tour_config['show_share_buttons']): ?>
                <div class="vx-share-buttons">
                    <h4><?php _e('Share this tour:', 'vortex360-lite'); ?></h4>
                    <div class="vx-share-links">
                        <a href="#" class="vx-share-facebook" data-url="<?php echo esc_url(get_permalink()); ?>">
                            <span class="vx-icon vx-icon-facebook"></span>
                            <?php _e('Facebook', 'vortex360-lite'); ?>
                        </a>
                        <a href="#" class="vx-share-twitter" data-url="<?php echo esc_url(get_permalink()); ?>">
                            <span class="vx-icon vx-icon-twitter"></span>
                            <?php _e('Twitter', 'vortex360-lite'); ?>
                        </a>
                        <a href="#" class="vx-share-linkedin" data-url="<?php echo esc_url(get_permalink()); ?>">
                            <span class="vx-icon vx-icon-linkedin"></span>
                            <?php _e('LinkedIn', 'vortex360-lite'); ?>
                        </a>
                        <button class="vx-copy-link" data-url="<?php echo esc_url(get_permalink()); ?>">
                            <span class="vx-icon vx-icon-link"></span>
                            <?php _e('Copy Link', 'vortex360-lite'); ?>
                        </button>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Error Screen -->
    <div class="vx-error-screen" id="vx-error-<?php echo esc_attr($tour_id); ?>" style="display: none;">
        <div class="vx-error-content">
            <div class="vx-error-icon">
                <span class="vx-icon vx-icon-error"></span>
            </div>
            <h3><?php _e('Unable to Load Tour', 'vortex360-lite'); ?></h3>
            <p class="vx-error-message"></p>
            <button class="vx-retry-btn" onclick="vxRetryTour(<?php echo esc_js($tour_id); ?>)">
                <?php _e('Try Again', 'vortex360-lite'); ?>
            </button>
        </div>
    </div>
    
    <!-- Mobile Scene Navigation -->
    <div class="vx-mobile-nav" id="vx-mobile-nav-<?php echo esc_attr($tour_id); ?>">
        <button class="vx-mobile-scenes" onclick="vxToggleSceneList(<?php echo esc_js($tour_id); ?>)">
            <span class="vx-icon vx-icon-scenes"></span>
            <span><?php _e('Scenes', 'vortex360-lite'); ?></span>
        </button>
        <button class="vx-mobile-info" onclick="vxToggleInfo(<?php echo esc_js($tour_id); ?>)">
            <span class="vx-icon vx-icon-info"></span>
            <span><?php _e('Info', 'vortex360-lite'); ?></span>
        </button>
    </div>
</div>

<!-- Hotspot Templates -->
<script type="text/template" id="vx-hotspot-info-template">
    <div class="vx-hotspot-popup">
        <div class="vx-hotspot-header">
            <h4>{{title}}</h4>
            <button class="vx-close-hotspot">&times;</button>
        </div>
        <div class="vx-hotspot-content">
            {{#if image_url}}
                <img src="{{image_url}}" alt="{{title}}" class="vx-hotspot-image">
            {{/if}}
            {{#if description}}
                <p>{{description}}</p>
            {{/if}}
            {{#if audio_url}}
                <audio controls class="vx-hotspot-audio">
                    <source src="{{audio_url}}" type="audio/mpeg">
                    <?php _e('Your browser does not support audio playback.', 'vortex360-lite'); ?>
                </audio>
            {{/if}}
            {{#if video_url}}
                <video controls class="vx-hotspot-video">
                    <source src="{{video_url}}" type="video/mp4">
                    <?php _e('Your browser does not support video playback.', 'vortex360-lite'); ?>
                </video>
            {{/if}}
            {{#if custom_html}}
                <div class="vx-hotspot-custom">{{{custom_html}}}</div>
            {{/if}}
            {{#if url}}
                <a href="{{url}}" class="vx-hotspot-link" target="_blank">
                    <?php _e('Learn More', 'vortex360-lite'); ?>
                </a>
            {{/if}}
        </div>
    </div>
</script>

<script type="text/javascript">
// Initialize tour when DOM is ready
jQuery(document).ready(function($) {
    // Initialize the tour viewer
    if (typeof VortexTourViewer !== 'undefined') {
        window.vxTour<?php echo esc_js($tour_id); ?> = new VortexTourViewer({
            containerId: '<?php echo esc_js($viewer_id); ?>',
            tourId: <?php echo esc_js($tour_id); ?>,
            data: vxTourData_<?php echo esc_js($tour_id); ?>,
            onLoad: function() {
                console.log('Tour loaded successfully');
                
                <?php if ($is_pro): ?>
                // Track tour view for analytics
                vxTrackTourView(<?php echo esc_js($tour_id); ?>);
                <?php endif; ?>
            },
            onError: function(error) {
                console.error('Tour loading error:', error);
                vxShowError(<?php echo esc_js($tour_id); ?>, error.message);
            },
            onSceneChange: function(sceneId) {
                vxUpdateSceneInfo(<?php echo esc_js($tour_id); ?>, sceneId);
                
                <?php if ($is_pro): ?>
                // Track scene view
                vxTrackSceneView(<?php echo esc_js($tour_id); ?>, sceneId);
                <?php endif; ?>
            },
            onHotspotClick: function(hotspot) {
                <?php if ($is_pro): ?>
                // Track hotspot interaction
                vxTrackHotspotClick(<?php echo esc_js($tour_id); ?>, hotspot.id);
                <?php endif; ?>
            }
        });
    } else {
        console.error('VortexTourViewer not loaded');
        vxShowError(<?php echo esc_js($tour_id); ?>, '<?php _e('Tour viewer failed to load. Please refresh the page.', 'vortex360-lite'); ?>');
    }
});

// Global functions for tour interaction
function vxRetryTour(tourId) {
    location.reload();
}

function vxToggleSceneList(tourId) {
    jQuery('#vx-scene-list-' + tourId).toggle();
}

function vxToggleInfo(tourId) {
    jQuery('#vx-info-panel-' + tourId).toggle();
}

function vxShowError(tourId, message) {
    jQuery('#vx-loading-' + tourId).hide();
    jQuery('#vx-error-' + tourId + ' .vx-error-message').text(message);
    jQuery('#vx-error-' + tourId).show();
}

function vxUpdateSceneInfo(tourId, sceneId) {
    const tourData = window['vxTourData_' + tourId];
    const scene = tourData.scenes.find(s => s.id == sceneId);
    const sceneIndex = tourData.scenes.findIndex(s => s.id == sceneId);
    
    if (scene) {
        jQuery('#vx-current-scene-' + tourId).text(scene.title);
        jQuery('#vx-scene-counter-' + tourId).text((sceneIndex + 1) + ' / ' + tourData.scenes.length);
    }
}

<?php if ($is_pro): ?>
// Analytics tracking functions
function vxTrackTourView(tourId) {
    jQuery.post('<?php echo admin_url('admin-ajax.php'); ?>', {
        action: 'vx_track_tour_view',
        tour_id: tourId,
        nonce: '<?php echo wp_create_nonce('vx_track_view'); ?>'
    });
}

function vxTrackSceneView(tourId, sceneId) {
    jQuery.post('<?php echo admin_url('admin-ajax.php'); ?>', {
        action: 'vx_track_scene_view',
        tour_id: tourId,
        scene_id: sceneId,
        nonce: '<?php echo wp_create_nonce('vx_track_view'); ?>'
    });
}

function vxTrackHotspotClick(tourId, hotspotId) {
    jQuery.post('<?php echo admin_url('admin-ajax.php'); ?>', {
        action: 'vx_track_hotspot_click',
        tour_id: tourId,
        hotspot_id: hotspotId,
        nonce: '<?php echo wp_create_nonce('vx_track_view'); ?>'
    });
}
<?php endif; ?>
</script>