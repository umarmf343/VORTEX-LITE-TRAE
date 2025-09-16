<?php
/**
 * Vortex360 Lite - Utility Functions
 * 
 * Common utility functions for options, nonces, template loading, and safe operations
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Get plugin option with default fallback
 */
function vx_get_option($key, $default = null) {
    $options = get_option('vx_settings', array());
    return isset($options[$key]) ? $options[$key] : $default;
}

/**
 * Update plugin option
 */
function vx_update_option($key, $value) {
    $options = get_option('vx_settings', array());
    $options[$key] = $value;
    return update_option('vx_settings', $options);
}

/**
 * Generate secure nonce for VX actions
 */
function vx_create_nonce($action = 'vx_action') {
    return wp_create_nonce('vx_' . $action);
}

/**
 * Verify VX nonce
 */
function vx_verify_nonce($nonce, $action = 'vx_action') {
    return wp_verify_nonce($nonce, 'vx_' . $action);
}

/**
 * Load template with fallback
 */
function vx_load_template($template, $vars = array()) {
    // Extract variables for template
    if (!empty($vars) && is_array($vars)) {
        extract($vars, EXTR_SKIP);
    }
    
    // Check theme override first
    $theme_template = locate_template(array(
        'vortex360/' . $template,
        'vortex360-lite/' . $template
    ));
    
    if ($theme_template) {
        include $theme_template;
        return;
    }
    
    // Use plugin template
    $plugin_template = VX_LITE_PATH . 'public/templates/' . $template;
    if (file_exists($plugin_template)) {
        include $plugin_template;
        return;
    }
    
    // Fallback error
    error_log('VX Template not found: ' . $template);
}

/**
 * Get template content as string
 */
function vx_get_template($template, $vars = array()) {
    ob_start();
    vx_load_template($template, $vars);
    return ob_get_clean();
}

/**
 * Safe SVG output with sanitization
 */
function vx_safe_svg($svg_content, $allowed_tags = null) {
    if ($allowed_tags === null) {
        $allowed_tags = array(
            'svg' => array(
                'class' => true,
                'width' => true,
                'height' => true,
                'viewBox' => true,
                'xmlns' => true,
                'fill' => true,
                'stroke' => true
            ),
            'path' => array(
                'd' => true,
                'fill' => true,
                'stroke' => true,
                'stroke-width' => true,
                'class' => true
            ),
            'circle' => array(
                'cx' => true,
                'cy' => true,
                'r' => true,
                'fill' => true,
                'stroke' => true,
                'stroke-width' => true,
                'class' => true
            ),
            'rect' => array(
                'x' => true,
                'y' => true,
                'width' => true,
                'height' => true,
                'fill' => true,
                'stroke' => true,
                'stroke-width' => true,
                'class' => true
            ),
            'g' => array(
                'class' => true,
                'transform' => true
            )
        );
    }
    
    return wp_kses($svg_content, $allowed_tags);
}

/**
 * Format file size for display
 */
function vx_format_file_size($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

/**
 * Check if current user can manage tours
 */
function vx_current_user_can_manage_tours() {
    return current_user_can('edit_vx_tours') || current_user_can('manage_options');
}

/**
 * Check if current user can edit specific tour
 */
function vx_current_user_can_edit_tour($tour_id) {
    if (current_user_can('edit_others_vx_tours')) {
        return true;
    }
    
    $tour = get_post($tour_id);
    if (!$tour || $tour->post_type !== 'vx_tour') {
        return false;
    }
    
    return current_user_can('edit_vx_tour', $tour_id) && $tour->post_author == get_current_user_id();
}

/**
 * Generate unique ID for scenes/hotspots
 */
function vx_generate_unique_id($prefix = 'vx') {
    return $prefix . '_' . wp_generate_uuid4();
}

/**
 * Sanitize tour configuration data
 */
function vx_sanitize_tour_config($config) {
    if (!is_array($config)) {
        return array();
    }
    
    $sanitized = array();
    
    // Sanitize settings
    if (isset($config['settings']) && is_array($config['settings'])) {
        $sanitized['settings'] = vx_sanitize_settings($config['settings']);
    }
    
    // Sanitize scenes
    if (isset($config['scenes']) && is_array($config['scenes'])) {
        $sanitized['scenes'] = array();
        foreach ($config['scenes'] as $scene) {
            if (is_array($scene)) {
                $sanitized['scenes'][] = vx_sanitize_scene($scene);
            }
        }
    }
    
    return $sanitized;
}

/**
 * Sanitize settings array
 */
function vx_sanitize_settings($settings) {
    $sanitized = array();
    
    // UI settings
    if (isset($settings['ui']) && is_array($settings['ui'])) {
        $sanitized['ui'] = array(
            'showThumbnails' => !empty($settings['ui']['showThumbnails']),
            'showZoom' => !empty($settings['ui']['showZoom']),
            'showFullscreen' => !empty($settings['ui']['showFullscreen']),
            'showCompass' => !empty($settings['ui']['showCompass'])
        );
    }
    
    // Autorotate settings
    if (isset($settings['autorotate']) && is_array($settings['autorotate'])) {
        $sanitized['autorotate'] = array(
            'enabled' => !empty($settings['autorotate']['enabled']),
            'speed' => floatval($settings['autorotate']['speed'] ?? 0.3),
            'pauseOnHover' => !empty($settings['autorotate']['pauseOnHover'])
        );
    }
    
    // Mobile settings
    if (isset($settings['mobile']) && is_array($settings['mobile'])) {
        $sanitized['mobile'] = array(
            'gyro' => !empty($settings['mobile']['gyro']),
            'touch' => !empty($settings['mobile']['touch'])
        );
    }
    
    // Branding settings
    if (isset($settings['branding']) && is_array($settings['branding'])) {
        $sanitized['branding'] = array(
            'logoId' => intval($settings['branding']['logoId'] ?? 0),
            'logoUrl' => esc_url_raw($settings['branding']['logoUrl'] ?? ''),
            'position' => sanitize_text_field($settings['branding']['position'] ?? 'top-left')
        );
    }
    
    return $sanitized;
}

/**
 * Sanitize scene data
 */
function vx_sanitize_scene($scene) {
    $sanitized = array(
        'id' => sanitize_text_field($scene['id'] ?? ''),
        'title' => sanitize_text_field($scene['title'] ?? ''),
        'type' => sanitize_text_field($scene['type'] ?? 'sphere')
    );
    
    // Image data
    if (isset($scene['image']) && is_array($scene['image'])) {
        $sanitized['image'] = array(
            'id' => intval($scene['image']['id'] ?? 0),
            'url' => esc_url_raw($scene['image']['url'] ?? '')
        );
    }
    
    // Preview image data
    if (isset($scene['previewImage']) && is_array($scene['previewImage'])) {
        $sanitized['previewImage'] = array(
            'id' => intval($scene['previewImage']['id'] ?? 0),
            'url' => esc_url_raw($scene['previewImage']['url'] ?? '')
        );
    }
    
    // Initial view
    if (isset($scene['initView']) && is_array($scene['initView'])) {
        $sanitized['initView'] = array(
            'yaw' => floatval($scene['initView']['yaw'] ?? 0),
            'pitch' => floatval($scene['initView']['pitch'] ?? 0),
            'fov' => floatval($scene['initView']['fov'] ?? 70)
        );
    }
    
    // Hotspots
    if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
        $sanitized['hotspots'] = array();
        foreach ($scene['hotspots'] as $hotspot) {
            if (is_array($hotspot)) {
                $sanitized['hotspots'][] = vx_sanitize_hotspot($hotspot);
            }
        }
    }
    
    return $sanitized;
}

/**
 * Sanitize hotspot data
 */
function vx_sanitize_hotspot($hotspot) {
    return array(
        'id' => sanitize_text_field($hotspot['id'] ?? ''),
        'type' => sanitize_text_field($hotspot['type'] ?? 'info'),
        'yaw' => floatval($hotspot['yaw'] ?? 0),
        'pitch' => floatval($hotspot['pitch'] ?? 0),
        'title' => sanitize_text_field($hotspot['title'] ?? ''),
        'text' => wp_kses_post($hotspot['text'] ?? ''),
        'url' => esc_url_raw($hotspot['url'] ?? ''),
        'targetSceneId' => sanitize_text_field($hotspot['targetSceneId'] ?? ''),
        'icon' => sanitize_text_field($hotspot['icon'] ?? 'info')
    );
}

/**
 * Get allowed hotspot types for Lite version
 */
function vx_get_allowed_hotspot_types() {
    return array(
        'info' => __('Information', 'vortex360-lite'),
        'link' => __('External Link', 'vortex360-lite'),
        'scene' => __('Scene Navigation', 'vortex360-lite')
    );
}

/**
 * Get allowed scene types for Lite version
 */
function vx_get_allowed_scene_types() {
    return array(
        'sphere' => __('Spherical (360°)', 'vortex360-lite'),
        'cube' => __('Cube Map', 'vortex360-lite'),
        'flat' => __('Flat Image', 'vortex360-lite'),
        'little-planet' => __('Little Planet', 'vortex360-lite')
    );
}

/**
 * Check if feature is available in Lite version
 */
function vx_is_lite_feature($feature) {
    $lite_features = array(
        'basic_tours',
        'spherical_scenes',
        'cube_scenes',
        'flat_scenes',
        'little_planet_scenes',
        'info_hotspots',
        'link_hotspots',
        'scene_hotspots',
        'basic_ui_controls',
        'autorotate',
        'mobile_support',
        'shortcode',
        'gutenberg_block',
        'elementor_widget',
        'import_export',
        'duplicate',
        'basic_analytics'
    );
    
    return in_array($feature, $lite_features);
}

/**
 * Log VX events for debugging
 */
function vx_log($message, $level = 'info') {
    if (defined('WP_DEBUG') && WP_DEBUG) {
        error_log(sprintf('[VX-%s] %s', strtoupper($level), $message));
    }
}

/**
 * Get plugin asset URL
 */
function vx_asset_url($path) {
    return VX_LITE_URL . 'assets/' . ltrim($path, '/');
}

/**
 * Get current page URL
 */
function vx_get_current_url() {
    return (is_ssl() ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $_SERVER['REQUEST_URI'];
}

/**
 * Check if we're on a VX admin page
 */
function vx_is_admin_page() {
    if (!is_admin()) {
        return false;
    }
    
    $screen = get_current_screen();
    if (!$screen) {
        return false;
    }
    
    return strpos($screen->id, 'vx_tour') !== false || 
           strpos($screen->id, 'vortex360') !== false;
}

/**
 * Format duration in human readable format
 */
function vx_format_duration($seconds) {
    if ($seconds < 60) {
        return sprintf(_n('%d second', '%d seconds', $seconds, 'vortex360-lite'), $seconds);
    } elseif ($seconds < 3600) {
        $minutes = floor($seconds / 60);
        return sprintf(_n('%d minute', '%d minutes', $minutes, 'vortex360-lite'), $minutes);
    } else {
        $hours = floor($seconds / 3600);
        return sprintf(_n('%d hour', '%d hours', $hours, 'vortex360-lite'), $hours);
    }
}

/**
 * Get memory usage in human readable format
 */
function vx_get_memory_usage() {
    return vx_format_file_size(memory_get_usage(true));
}

/**
 * Check if Pro version is active
 */
function vx_is_pro_active() {
    return class_exists('VX_Pro') || is_plugin_active('vortex360-pro/vortex360-pro.php');
}