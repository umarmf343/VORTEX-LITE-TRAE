<?php
/**
 * Vortex360 Lite - Embed Tour Template
 * 
 * Template for embedding tours via iframe or direct URL
 * Accessed via: /vortex360/embed/{tour_id}
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get tour ID from URL parameter
$tour_id = get_query_var('vx_tour_id', 0);
if (!$tour_id) {
    $tour_id = isset($_GET['tour_id']) ? intval($_GET['tour_id']) : 0;
}

// Get embed parameters
$width = isset($_GET['width']) ? sanitize_text_field($_GET['width']) : '100%';
$height = isset($_GET['height']) ? sanitize_text_field($_GET['height']) : '100%';
$autoplay = isset($_GET['autoplay']) ? filter_var($_GET['autoplay'], FILTER_VALIDATE_BOOLEAN) : false;
$controls = isset($_GET['controls']) ? filter_var($_GET['controls'], FILTER_VALIDATE_BOOLEAN) : true;
$fullscreen = isset($_GET['fullscreen']) ? filter_var($_GET['fullscreen'], FILTER_VALIDATE_BOOLEAN) : true;
$branding = isset($_GET['branding']) ? filter_var($_GET['branding'], FILTER_VALIDATE_BOOLEAN) : true;
$theme = isset($_GET['theme']) ? sanitize_text_field($_GET['theme']) : 'default';
$start_scene = isset($_GET['scene']) ? intval($_GET['scene']) : null;
$loop = isset($_GET['loop']) ? filter_var($_GET['loop'], FILTER_VALIDATE_BOOLEAN) : false;
$muted = isset($_GET['muted']) ? filter_var($_GET['muted'], FILTER_VALIDATE_BOOLEAN) : false;

// Validate tour ID
if (!$tour_id) {
    wp_die(__('Error: Tour ID is required.', 'vortex360-lite'), __('Invalid Tour', 'vortex360-lite'), array('response' => 400));
}

// Get tour data
$tour = vx_get_tour($tour_id);
if (!$tour) {
    wp_die(__('Error: Tour not found.', 'vortex360-lite'), __('Tour Not Found', 'vortex360-lite'), array('response' => 404));
}

// Check if tour is published (allow preview for authorized users)
if ($tour->status !== 'published') {
    if (!current_user_can('edit_posts')) {
        wp_die(__('This tour is not available.', 'vortex360-lite'), __('Tour Unavailable', 'vortex360-lite'), array('response' => 403));
    }
}

// Get settings and tour config
$settings = vx_get_settings();
$tour_config = vx_get_tour_config($tour_id);

// Override settings with URL parameters
if (isset($_GET['autoplay'])) {
    $settings['auto_rotation'] = $autoplay;
}
if (isset($_GET['controls'])) {
    $settings['show_controls'] = $controls;
}
if (isset($_GET['fullscreen'])) {
    $settings['show_fullscreen'] = $fullscreen;
}
if (isset($_GET['theme'])) {
    $settings['viewer_theme'] = $theme;
}
if (isset($_GET['muted'])) {
    $settings['mute_audio'] = $muted;
}

// Get scenes
$scenes = vx_get_tour_scenes($tour_id);
if (empty($scenes)) {
    wp_die(__('Error: No scenes found in this tour.', 'vortex360-lite'), __('Invalid Tour', 'vortex360-lite'), array('response' => 400));
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
    'embed' => true,
    'loop' => $loop,
    'autoplay' => $autoplay,
    'muted' => $muted
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

// Set proper headers for embedding
header('X-Frame-Options: ALLOWALL');
header('Content-Security-Policy: frame-ancestors *;');

// Track embed view (if analytics enabled)
if ($tour_config['enable_analytics']) {
    vx_track_tour_view($tour_id, 'embed');
}

// Generate unique container ID
$container_id = 'vx-embed-' . $tour_id . '-' . wp_generate_uuid4();

?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    
    <title><?php echo esc_html($tour->title); ?> - <?php bloginfo('name'); ?></title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="<?php echo esc_attr(wp_trim_words($tour->description, 20)); ?>">
    <meta property="og:title" content="<?php echo esc_attr($tour->title); ?>">
    <meta property="og:description" content="<?php echo esc_attr(wp_trim_words($tour->description, 20)); ?>">
    <meta property="og:type" content="website">
    <meta property="og:url" content="<?php echo esc_url(vx_get_embed_url($tour_id)); ?>">
    <?php if (!empty($scenes) && !empty($scenes[0]->image_url)): ?>
        <meta property="og:image" content="<?php echo esc_url($scenes[0]->image_url); ?>">
    <?php endif; ?>
    
    <!-- Favicon -->
    <link rel="icon" href="<?php echo esc_url(get_site_icon_url(32)); ?>" sizes="32x32">
    
    <!-- Preload critical resources -->
    <link rel="preload" href="<?php echo esc_url($start_scene_data->image_url); ?>" as="image">
    
    <!-- Core Styles -->
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
        }
        
        .vx-embed-container {
            position: relative;
            width: 100%;
            height: 100%;
            background: #000;
        }
        
        .vx-embed-loading {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        
        .vx-loading-content {
            text-align: center;
            color: #fff;
        }
        
        .vx-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #333;
            border-top: 4px solid #fff;
            border-radius: 50%;
            animation: vx-spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        
        @keyframes vx-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .vx-embed-viewer {
            width: 100%;
            height: 100%;
            display: none;
        }
        
        .vx-embed-controls {
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 100;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .vx-control-group {
            display: flex;
            gap: 3px;
            background: rgba(0,0,0,0.8);
            border-radius: 6px;
            padding: 4px;
        }
        
        .vx-control-btn {
            background: rgba(255,255,255,0.9);
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 4px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            transition: all 0.2s ease;
            color: #333;
        }
        
        .vx-control-btn:hover {
            background: #fff;
            transform: scale(1.05);
        }
        
        .vx-control-btn:active {
            transform: scale(0.95);
        }
        
        .vx-control-btn.active {
            background: #007cba;
            color: #fff;
        }
        
        .vx-scene-info {
            display: flex;
            align-items: center;
            padding: 0 10px;
            color: #fff;
            font-size: 13px;
            min-width: 50px;
            justify-content: center;
            font-weight: 500;
        }
        
        .vx-embed-info {
            position: absolute;
            bottom: 15px;
            left: 15px;
            right: 15px;
            background: rgba(0,0,0,0.9);
            color: #fff;
            border-radius: 8px;
            padding: 20px;
            z-index: 90;
            max-height: 250px;
            overflow-y: auto;
            display: none;
        }
        
        .vx-info-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
        }
        
        .vx-info-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            line-height: 1.3;
        }
        
        .vx-close-info {
            background: none;
            border: none;
            color: #fff;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .vx-close-info:hover {
            background: rgba(255,255,255,0.1);
        }
        
        .vx-tour-meta {
            display: flex;
            gap: 20px;
            margin: 12px 0;
            font-size: 14px;
            color: #ccc;
        }
        
        .vx-embed-error {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            display: none;
        }
        
        .vx-error-content {
            text-align: center;
            color: #fff;
            padding: 30px;
            max-width: 400px;
        }
        
        .vx-error-icon {
            font-size: 64px;
            margin-bottom: 20px;
            color: #ff6b6b;
        }
        
        .vx-error-message {
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        
        .vx-retry-btn {
            background: #007cba;
            color: #fff;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .vx-retry-btn:hover {
            background: #005a87;
        }
        
        .vx-embed-branding {
            position: absolute;
            bottom: 8px;
            right: 8px;
            z-index: 50;
        }
        
        .vx-embed-branding a {
            background: rgba(0,0,0,0.8);
            color: #fff;
            text-decoration: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            opacity: 0.8;
            transition: opacity 0.2s;
        }
        
        .vx-embed-branding a:hover {
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
        
        .vx-theme-minimal .vx-embed-controls {
            opacity: 0.6;
            transition: opacity 0.3s;
        }
        
        .vx-theme-minimal .vx-embed-controls:hover {
            opacity: 1;
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .vx-embed-controls {
                top: 10px;
                right: 10px;
            }
            
            .vx-control-btn {
                width: 32px;
                height: 32px;
                font-size: 14px;
            }
            
            .vx-embed-info {
                bottom: 10px;
                left: 10px;
                right: 10px;
                padding: 15px;
            }
            
            .vx-tour-meta {
                flex-direction: column;
                gap: 8px;
            }
        }
        
        @media (max-width: 480px) {
            .vx-control-group {
                flex-direction: column;
            }
            
            .vx-embed-info {
                max-height: 200px;
            }
        }
    </style>
    
    <?php
    // Enqueue required scripts and styles
    wp_enqueue_script('vx-pannellum');
    wp_enqueue_script('vx-tour-viewer');
    wp_enqueue_style('vx-tour-viewer');
    
    // Output WordPress head
    wp_head();
    ?>
</head>
<body class="vx-embed-body vx-theme-<?php echo esc_attr($theme); ?>">
    
    <div class="vx-embed-container" id="<?php echo esc_attr($container_id); ?>">
        
        <!-- Loading Screen -->
        <div class="vx-embed-loading" id="vx-loading">
            <div class="vx-loading-content">
                <div class="vx-spinner"></div>
                <p><?php _e('Loading 360° tour...', 'vortex360-lite'); ?></p>
            </div>
        </div>
        
        <!-- Tour Viewer -->
        <div class="vx-embed-viewer" id="vx-viewer"></div>
        
        <!-- Controls -->
        <?php if ($controls): ?>
            <div class="vx-embed-controls" id="vx-controls">
                <!-- Navigation Controls -->
                <div class="vx-control-group vx-nav-controls">
                    <button class="vx-control-btn vx-zoom-in" title="<?php _e('Zoom In', 'vortex360-lite'); ?>">
                        <span>+</span>
                    </button>
                    <button class="vx-control-btn vx-zoom-out" title="<?php _e('Zoom Out', 'vortex360-lite'); ?>">
                        <span>−</span>
                    </button>
                    <button class="vx-control-btn vx-auto-rotate" title="<?php _e('Auto Rotate', 'vortex360-lite'); ?>">
                        <span>↻</span>
                    </button>
                </div>
                
                <!-- Scene Navigation -->
                <?php if (count($scenes) > 1): ?>
                    <div class="vx-control-group vx-scene-nav">
                        <button class="vx-control-btn vx-prev-scene" title="<?php _e('Previous Scene', 'vortex360-lite'); ?>">
                            <span>‹</span>
                        </button>
                        <div class="vx-scene-info">
                            <span class="vx-scene-counter" id="vx-counter">
                                1/<?php echo count($scenes); ?>
                            </span>
                        </div>
                        <button class="vx-control-btn vx-next-scene" title="<?php _e('Next Scene', 'vortex360-lite'); ?>">
                            <span>›</span>
                        </button>
                    </div>
                <?php endif; ?>
                
                <!-- Additional Controls -->
                <div class="vx-control-group vx-extra-controls">
                    <?php if ($fullscreen): ?>
                        <button class="vx-control-btn vx-fullscreen" title="<?php _e('Fullscreen', 'vortex360-lite'); ?>">
                            <span>⛶</span>
                        </button>
                    <?php endif; ?>
                    
                    <button class="vx-control-btn vx-info" title="<?php _e('Tour Info', 'vortex360-lite'); ?>">
                        <span>i</span>
                    </button>
                </div>
            </div>
        <?php endif; ?>
        
        <!-- Info Panel -->
        <div class="vx-embed-info" id="vx-info">
            <div class="vx-info-header">
                <h3><?php echo esc_html($tour->title); ?></h3>
                <button class="vx-close-info">&times;</button>
            </div>
            <div class="vx-info-content">
                <?php if ($tour->description): ?>
                    <p><?php echo esc_html(wp_trim_words($tour->description, 30)); ?></p>
                <?php endif; ?>
                
                <div class="vx-tour-meta">
                    <span class="vx-meta-item">
                        <strong><?php _e('Scenes:', 'vortex360-lite'); ?></strong> <?php echo count($scenes); ?>
                    </span>
                    <span class="vx-meta-item">
                        <strong><?php _e('Hotspots:', 'vortex360-lite'); ?></strong> <?php echo vx_get_tour_hotspots_count($tour_id); ?>
                    </span>
                </div>
            </div>
        </div>
        
        <!-- Error Screen -->
        <div class="vx-embed-error" id="vx-error">
            <div class="vx-error-content">
                <div class="vx-error-icon">⚠</div>
                <p class="vx-error-message"></p>
                <button class="vx-retry-btn" onclick="location.reload()">
                    <?php _e('Retry', 'vortex360-lite'); ?>
                </button>
            </div>
        </div>
        
        <!-- Branding -->
        <?php if (!vx_is_pro_active() && $branding): ?>
            <div class="vx-embed-branding">
                <a href="<?php echo esc_url(vx_get_website_url()); ?>" target="_blank" rel="noopener">
                    <?php _e('Powered by Vortex360', 'vortex360-lite'); ?>
                </a>
            </div>
        <?php endif; ?>
        
    </div>
    
    <script type="text/javascript">
        // Tour data
        var vxEmbedTourData = <?php echo wp_json_encode($tour_data); ?>;
        var vxEmbedTour;
        
        // Initialize tour when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initializeEmbedTour();
        });
        
        function initializeEmbedTour() {
            if (typeof VortexTourViewer === 'undefined') {
                showEmbedError('<?php _e('Tour viewer not available', 'vortex360-lite'); ?>');
                return;
            }
            
            try {
                vxEmbedTour = new VortexTourViewer({
                    containerId: 'vx-viewer',
                    tourId: <?php echo esc_js($tour_id); ?>,
                    data: vxEmbedTourData,
                    embed: true,
                    onLoad: function() {
                        document.getElementById('vx-loading').style.display = 'none';
                        document.getElementById('vx-viewer').style.display = 'block';
                        
                        // Auto-start rotation if enabled
                        if (vxEmbedTourData.autoplay) {
                            this.startAutoRotation();
                        }
                        
                        // Setup loop if enabled
                        if (vxEmbedTourData.loop) {
                            this.enableLoop();
                        }
                    },
                    onError: function(error) {
                        showEmbedError(error.message || '<?php _e('Failed to load tour', 'vortex360-lite'); ?>');
                    },
                    onSceneChange: function(sceneId) {
                        updateSceneCounter(sceneId);
                    }
                });
                
                // Setup control event handlers
                setupEmbedControls();
                
            } catch (error) {
                console.error('Embed tour initialization error:', error);
                showEmbedError('<?php _e('Failed to initialize tour viewer', 'vortex360-lite'); ?>');
            }
        }
        
        function setupEmbedControls() {
            // Info panel toggle
            var infoBtn = document.querySelector('.vx-info');
            var infoPanel = document.getElementById('vx-info');
            var closeInfo = document.querySelector('.vx-close-info');
            
            if (infoBtn && infoPanel) {
                infoBtn.addEventListener('click', function() {
                    infoPanel.style.display = infoPanel.style.display === 'none' ? 'block' : 'none';
                });
            }
            
            if (closeInfo && infoPanel) {
                closeInfo.addEventListener('click', function() {
                    infoPanel.style.display = 'none';
                });
            }
            
            // Control button handlers
            var controls = document.querySelectorAll('.vx-control-btn');
            controls.forEach(function(btn) {
                btn.addEventListener('click', function() {
                    if (!vxEmbedTour) return;
                    
                    var action = this.className.split(' ').find(cls => cls.startsWith('vx-') && cls !== 'vx-control-btn');
                    
                    switch (action) {
                        case 'vx-zoom-in':
                            vxEmbedTour.zoomIn();
                            break;
                        case 'vx-zoom-out':
                            vxEmbedTour.zoomOut();
                            break;
                        case 'vx-auto-rotate':
                            vxEmbedTour.toggleAutoRotation();
                            this.classList.toggle('active');
                            break;
                        case 'vx-prev-scene':
                            vxEmbedTour.previousScene();
                            break;
                        case 'vx-next-scene':
                            vxEmbedTour.nextScene();
                            break;
                        case 'vx-fullscreen':
                            vxEmbedTour.toggleFullscreen();
                            break;
                    }
                });
            });
        }
        
        function updateSceneCounter(sceneId) {
            var counter = document.getElementById('vx-counter');
            if (counter && vxEmbedTourData.scenes) {
                var sceneIndex = vxEmbedTourData.scenes.findIndex(function(scene) {
                    return scene.id == sceneId;
                });
                if (sceneIndex >= 0) {
                    counter.textContent = (sceneIndex + 1) + '/' + vxEmbedTourData.scenes.length;
                }
            }
        }
        
        function showEmbedError(message) {
            document.getElementById('vx-loading').style.display = 'none';
            document.querySelector('.vx-error-message').textContent = message;
            document.getElementById('vx-error').style.display = 'flex';
        }
        
        // Handle window resize
        window.addEventListener('resize', function() {
            if (vxEmbedTour && vxEmbedTour.resize) {
                vxEmbedTour.resize();
            }
        });
        
        // Handle visibility change (pause/resume)
        document.addEventListener('visibilitychange', function() {
            if (vxEmbedTour) {
                if (document.hidden) {
                    vxEmbedTour.pause();
                } else {
                    vxEmbedTour.resume();
                }
            }
        });
    </script>
    
    <?php wp_footer(); ?>
</body>
</html>