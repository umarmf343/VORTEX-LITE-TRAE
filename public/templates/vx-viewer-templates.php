<?php
/**
 * Vortex360 Lite - Viewer Templates
 * 
 * HTML templates for the frontend 360° tour viewer
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main viewer template
 */
function vx_get_viewer_template() {
    ob_start();
    ?>
    <div class="vx-tour-container" id="{{id}}">
        <!-- Loading State -->
        <div class="vx-loading">
            <div class="vx-loading-spinner">
                <div class="vx-spinner"></div>
            </div>
            <div class="vx-loading-text"><?php esc_html_e('Loading 360° Tour...', 'vortex360-lite'); ?></div>
        </div>
        
        <!-- Main Viewer -->
        <div class="vx-viewer" id="vx-viewer-{{id}}"></div>
        
        <!-- Controls -->
        <div class="vx-controls">
            <!-- Top Controls -->
            <div class="vx-controls-top">
                <div class="vx-tour-title"></div>
                <div class="vx-controls-right">
                    <button class="vx-control-btn vx-auto-rotate" title="<?php esc_attr_e('Auto Rotate', 'vortex360-lite'); ?>">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                        </svg>
                    </button>
                    <button class="vx-control-btn vx-fullscreen" title="<?php esc_attr_e('Fullscreen', 'vortex360-lite'); ?>">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Bottom Controls -->
            <div class="vx-controls-bottom">
                <div class="vx-scene-nav">
                    <button class="vx-control-btn vx-prev-scene" title="<?php esc_attr_e('Previous Scene', 'vortex360-lite'); ?>">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    <span class="vx-scene-counter">1 / 1</span>
                    <button class="vx-control-btn vx-next-scene" title="<?php esc_attr_e('Next Scene', 'vortex360-lite'); ?>">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                </div>
                
                <!-- Branding -->
                <div class="vx-branding">
                    <span class="vx-powered-by"><?php esc_html_e('Powered by', 'vortex360-lite'); ?> <strong>Vortex360 Lite</strong></span>
                </div>
            </div>
        </div>
        
        <!-- Hotspot Info Panel -->
        <div class="vx-hotspot-info">
            <div class="vx-hotspot-header">
                <button class="vx-close-info" title="<?php esc_attr_e('Close', 'vortex360-lite'); ?>">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                </button>
            </div>
            <div class="vx-hotspot-body"></div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Hotspot template
 */
function vx_get_hotspot_template() {
    ob_start();
    ?>
    <div class="vx-hotspot-marker vx-hotspot-{{type}}" data-hotspot-id="{{id}}" title="{{title}}">
        <div class="vx-hotspot-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                {{#if icon}}
                    {{{icon}}}
                {{else}}
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                {{/if}}
            </svg>
        </div>
        <div class="vx-hotspot-pulse"></div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Error template
 */
function vx_get_error_template() {
    ob_start();
    ?>
    <div class="vx-error-state">
        <div class="vx-error-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        </div>
        <div class="vx-error-message">{{message}}</div>
        <button class="vx-retry-btn vx-control-btn"><?php esc_html_e('Retry', 'vortex360-lite'); ?></button>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Shortcode wrapper template
 */
function vx_get_shortcode_template($atts, $tour_data) {
    $width = !empty($atts['width']) ? esc_attr($atts['width']) : '100%';
    $height = !empty($atts['height']) ? esc_attr($atts['height']) : '600px';
    $tour_id = !empty($atts['id']) ? intval($atts['id']) : 0;
    
    $style = "width: {$width}; height: {$height};";
    
    ob_start();
    ?>
    <div class="vx-tour-shortcode" 
         data-tour-id="<?php echo esc_attr($tour_id); ?>"
         data-width="<?php echo esc_attr($width); ?>"
         data-height="<?php echo esc_attr($height); ?>"
         data-auto-load="<?php echo esc_attr($atts['autoload'] ?? 'true'); ?>"
         data-show-controls="<?php echo esc_attr($atts['controls'] ?? 'true'); ?>"
         data-mouse-zoom="<?php echo esc_attr($atts['zoom'] ?? 'true'); ?>"
         data-auto-rotate="<?php echo esc_attr($atts['autorotate'] ?? 'false'); ?>"
         data-auto-rotate-speed="<?php echo esc_attr($atts['autorotate_speed'] ?? '2'); ?>"
         style="<?php echo esc_attr($style); ?>">
        
        <!-- Fallback content for non-JS users -->
        <noscript>
            <div class="vx-no-js-fallback">
                <p><?php esc_html_e('This 360° tour requires JavaScript to be enabled.', 'vortex360-lite'); ?></p>
                <?php if (!empty($tour_data['scenes'][0]['image'])): ?>
                    <img src="<?php echo esc_url($tour_data['scenes'][0]['image']); ?>" 
                         alt="<?php echo esc_attr($tour_data['title'] ?? __('360° Tour Preview', 'vortex360-lite')); ?>"
                         style="width: 100%; height: auto; max-height: 400px; object-fit: cover;">
                <?php endif; ?>
            </div>
        </noscript>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Gutenberg block template
 */
function vx_get_gutenberg_block_template($attributes, $tour_data) {
    $tour_id = !empty($attributes['tourId']) ? intval($attributes['tourId']) : 0;
    $width = !empty($attributes['width']) ? esc_attr($attributes['width']) : '100%';
    $height = !empty($attributes['height']) ? esc_attr($attributes['height']) : '600px';
    
    $options = json_encode(array_merge([
        'tourId' => $tour_id,
        'width' => $width,
        'height' => $height,
        'autoLoad' => true,
        'showControls' => true,
        'mouseZoom' => true,
        'autoRotate' => false,
        'autoRotateSpeed' => 2
    ], $attributes));
    
    ob_start();
    ?>
    <div class="wp-block-vortex360-tour-viewer" 
         data-options="<?php echo esc_attr($options); ?>"
         style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>;">
        
        <!-- Loading placeholder -->
        <div class="vx-block-placeholder">
            <div class="vx-placeholder-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
            </div>
            <div class="vx-placeholder-text">
                <?php esc_html_e('Loading 360° Tour...', 'vortex360-lite'); ?>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Auto-embed template for posts/pages
 */
function vx_get_auto_embed_template($tour_id, $settings = []) {
    $defaults = [
        'width' => '100%',
        'height' => '500px',
        'position' => 'after_content', // before_content, after_content, replace_content
        'show_title' => true,
        'show_description' => true
    ];
    
    $settings = array_merge($defaults, $settings);
    
    ob_start();
    ?>
    <div class="vx-auto-embed" data-tour-id="<?php echo esc_attr($tour_id); ?>">
        <?php if ($settings['show_title'] || $settings['show_description']): ?>
            <div class="vx-embed-header">
                <?php if ($settings['show_title']): ?>
                    <h3 class="vx-embed-title"><?php esc_html_e('360° Virtual Tour', 'vortex360-lite'); ?></h3>
                <?php endif; ?>
                <?php if ($settings['show_description']): ?>
                    <p class="vx-embed-description"><?php esc_html_e('Explore this immersive 360° experience.', 'vortex360-lite'); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        
        <div class="vx-tour-shortcode" 
             data-tour-id="<?php echo esc_attr($tour_id); ?>"
             data-width="<?php echo esc_attr($settings['width']); ?>"
             data-height="<?php echo esc_attr($settings['height']); ?>"
             style="width: <?php echo esc_attr($settings['width']); ?>; height: <?php echo esc_attr($settings['height']); ?>;">
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Mobile-optimized template
 */
function vx_get_mobile_template($tour_id, $is_mobile = false) {
    $height = $is_mobile ? '300px' : '600px';
    
    ob_start();
    ?>
    <div class="vx-tour-mobile <?php echo $is_mobile ? 'vx-is-mobile' : ''; ?>" 
         data-tour-id="<?php echo esc_attr($tour_id); ?>"
         data-height="<?php echo esc_attr($height); ?>"
         style="height: <?php echo esc_attr($height); ?>;">
        
        <?php if ($is_mobile): ?>
            <!-- Mobile-specific touch instructions -->
            <div class="vx-mobile-instructions">
                <div class="vx-touch-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2.33-10H4.67C4.3 1 4 1.3 4 1.67v1.66C4 3.7 4.3 4 4.67 4h14.66C19.7 4 20 3.7 20 3.33V1.67C20 1.3 19.7 1 19.33 1zM4.67 5C4.3 5 4 5.3 4 5.67V20c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5.67C20 5.3 19.7 5 19.33 5H4.67z"/>
                    </svg>
                </div>
                <p><?php esc_html_e('Touch and drag to explore the 360° view', 'vortex360-lite'); ?></p>
            </div>
        <?php endif; ?>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Print JavaScript templates
 */
function vx_print_js_templates() {
    ?>
    <!-- Vortex360 Lite JavaScript Templates -->
    <script type="text/template" id="vx-viewer-template">
        <?php echo vx_get_viewer_template(); ?>
    </script>
    
    <script type="text/template" id="vx-hotspot-template">
        <?php echo vx_get_hotspot_template(); ?>
    </script>
    
    <script type="text/template" id="vx-error-template">
        <?php echo vx_get_error_template(); ?>
    </script>
    <?php
}

/**
 * Add templates to footer
 */
add_action('wp_footer', 'vx_print_js_templates');