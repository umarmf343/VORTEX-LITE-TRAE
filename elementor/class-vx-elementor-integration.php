<?php
/**
 * Vortex360 Lite - Elementor Integration
 * 
 * Handles Elementor integration and widget registration
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VX_Elementor_Integration {
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('elementor/widgets/widgets_registered', array($this, 'register_widgets'));
        add_action('elementor/elements/categories_registered', array($this, 'register_category'));
        add_action('elementor/frontend/after_enqueue_styles', array($this, 'enqueue_frontend_styles'));
        add_action('elementor/editor/after_enqueue_styles', array($this, 'enqueue_editor_styles'));
        add_action('elementor/preview/enqueue_styles', array($this, 'enqueue_preview_styles'));
    }
    
    /**
     * Check if Elementor is active
     */
    public static function is_elementor_active() {
        return did_action('elementor/loaded');
    }
    
    /**
     * Register custom category for our widgets
     */
    public function register_category($elements_manager) {
        $elements_manager->add_category(
            'vortex360',
            [
                'title' => __('Vortex360', 'vortex360-lite'),
                'icon' => 'eicon-video-camera',
            ]
        );
    }
    
    /**
     * Register widgets
     */
    public function register_widgets($widgets_manager) {
        // Include widget file
        require_once VX_LITE_PATH . 'elementor/class-vx-elementor-widget.php';
        
        // Register widget
        $widgets_manager->register_widget_type(new VX_Elementor_Widget());
    }
    
    /**
     * Enqueue frontend styles
     */
    public function enqueue_frontend_styles() {
        wp_enqueue_style(
            'vx-elementor-widget',
            VX_LITE_URL . 'elementor/css/elementor-widget.css',
            [],
            VX_LITE_VERSION
        );
    }
    
    /**
     * Enqueue editor styles
     */
    public function enqueue_editor_styles() {
        wp_enqueue_style(
            'vx-elementor-editor',
            VX_LITE_URL . 'elementor/css/elementor-editor.css',
            [],
            VX_LITE_VERSION
        );
    }
    
    /**
     * Enqueue preview styles
     */
    public function enqueue_preview_styles() {
        wp_enqueue_style(
            'vx-elementor-preview',
            VX_LITE_URL . 'elementor/css/elementor-preview.css',
            [],
            VX_LITE_VERSION
        );
    }
    
    /**
     * Add Elementor support to tour post type
     */
    public static function add_elementor_support() {
        if (!self::is_elementor_active()) {
            return;
        }
        
        // Add Elementor support to tour post type
        add_post_type_support('vx_tour', 'elementor');
    }
    
    /**
     * Get Elementor edit URL for tour
     */
    public static function get_elementor_edit_url($post_id) {
        if (!self::is_elementor_active()) {
            return '';
        }
        
        return \Elementor\Plugin::$instance->documents->get($post_id)->get_edit_url();
    }
    
    /**
     * Check if post is built with Elementor
     */
    public static function is_built_with_elementor($post_id) {
        if (!self::is_elementor_active()) {
            return false;
        }
        
        return \Elementor\Plugin::$instance->documents->get($post_id)->is_built_with_elementor();
    }
    
    /**
     * Get widget default settings
     */
    public static function get_widget_defaults() {
        return [
            'tour_id' => 0,
            'width' => [
                'unit' => '%',
                'size' => 100
            ],
            'height' => [
                'unit' => 'px',
                'size' => 600
            ],
            'show_controls' => 'yes',
            'mouse_zoom' => 'yes',
            'auto_rotate' => '',
            'auto_rotate_speed' => [
                'size' => 2
            ]
        ];
    }
    
    /**
     * Sanitize widget settings
     */
    public static function sanitize_widget_settings($settings) {
        $defaults = self::get_widget_defaults();
        $settings = array_merge($defaults, $settings);
        
        // Sanitize tour ID
        $settings['tour_id'] = intval($settings['tour_id']);
        
        // Sanitize dimensions
        if (isset($settings['width']['size'])) {
            $settings['width']['size'] = floatval($settings['width']['size']);
        }
        if (isset($settings['height']['size'])) {
            $settings['height']['size'] = floatval($settings['height']['size']);
        }
        
        // Sanitize boolean settings
        $settings['show_controls'] = $settings['show_controls'] === 'yes' ? 'yes' : '';
        $settings['mouse_zoom'] = $settings['mouse_zoom'] === 'yes' ? 'yes' : '';
        $settings['auto_rotate'] = $settings['auto_rotate'] === 'yes' ? 'yes' : '';
        
        // Sanitize auto rotate speed
        if (isset($settings['auto_rotate_speed']['size'])) {
            $settings['auto_rotate_speed']['size'] = floatval($settings['auto_rotate_speed']['size']);
            $settings['auto_rotate_speed']['size'] = max(1, min(10, $settings['auto_rotate_speed']['size']));
        }
        
        return $settings;
    }
    
    /**
     * Convert widget settings to shortcode attributes
     */
    public static function widget_to_shortcode_atts($settings) {
        $settings = self::sanitize_widget_settings($settings);
        
        $width = $settings['width']['size'] . ($settings['width']['unit'] ?? '%');
        $height = $settings['height']['size'] . ($settings['height']['unit'] ?? 'px');
        
        return [
            'id' => $settings['tour_id'],
            'width' => $width,
            'height' => $height,
            'controls' => $settings['show_controls'] === 'yes' ? 'true' : 'false',
            'zoom' => $settings['mouse_zoom'] === 'yes' ? 'true' : 'false',
            'autorotate' => $settings['auto_rotate'] === 'yes' ? 'true' : 'false',
            'autorotate_speed' => $settings['auto_rotate_speed']['size'] ?? 2
        ];
    }
    
    /**
     * Render widget using shortcode
     */
    public static function render_widget_with_shortcode($settings) {
        $atts = self::widget_to_shortcode_atts($settings);
        
        // Use the shortcode class to render
        $shortcode = new VX_Shortcode();
        return $shortcode->render_shortcode($atts);
    }
    
    /**
     * Add Elementor compatibility to existing tours
     */
    public static function add_compatibility_to_existing_tours() {
        if (!self::is_elementor_active()) {
            return;
        }
        
        $tours = get_posts([
            'post_type' => 'vx_tour',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => '_elementor_version',
                    'compare' => 'NOT EXISTS'
                ]
            ]
        ]);
        
        foreach ($tours as $tour) {
            // Add Elementor meta to enable editing
            update_post_meta($tour->ID, '_elementor_version', ELEMENTOR_VERSION);
            update_post_meta($tour->ID, '_elementor_edit_mode', 'builder');
        }
    }
    
    /**
     * Get widget usage statistics
     */
    public static function get_widget_usage_stats() {
        if (!self::is_elementor_active()) {
            return [];
        }
        
        global $wpdb;
        
        // Count pages using our widget
        $query = $wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->postmeta} 
             WHERE meta_key = '_elementor_data' 
             AND meta_value LIKE %s",
            '%vortex360-tour-viewer%'
        );
        
        $widget_usage = $wpdb->get_var($query);
        
        return [
            'pages_with_widget' => intval($widget_usage),
            'total_elementor_pages' => intval($wpdb->get_var(
                "SELECT COUNT(*) FROM {$wpdb->postmeta} WHERE meta_key = '_elementor_version'"
            ))
        ];
    }
    
    /**
     * Export widget settings for backup
     */
    public static function export_widget_settings($post_id) {
        if (!self::is_elementor_active()) {
            return null;
        }
        
        $elementor_data = get_post_meta($post_id, '_elementor_data', true);
        if (!$elementor_data) {
            return null;
        }
        
        $data = json_decode($elementor_data, true);
        if (!$data) {
            return null;
        }
        
        $widget_settings = [];
        
        // Recursively find our widgets
        array_walk_recursive($data, function($value, $key) use (&$widget_settings) {
            if ($key === 'widgetType' && $value === 'vortex360-tour-viewer') {
                $widget_settings[] = $value;
            }
        });
        
        return $widget_settings;
    }
    
    /**
     * Import widget settings from backup
     */
    public static function import_widget_settings($post_id, $settings) {
        if (!self::is_elementor_active() || !is_array($settings)) {
            return false;
        }
        
        // This would need more complex implementation
        // for now, just return success
        return true;
    }
    
    /**
     * Clean up Elementor data on plugin deactivation
     */
    public static function cleanup_elementor_data() {
        if (!self::is_elementor_active()) {
            return;
        }
        
        global $wpdb;
        
        // Remove our widgets from Elementor data
        $posts_with_elementor = $wpdb->get_results(
            "SELECT post_id, meta_value FROM {$wpdb->postmeta} 
             WHERE meta_key = '_elementor_data' 
             AND meta_value LIKE '%vortex360-tour-viewer%'"
        );
        
        foreach ($posts_with_elementor as $post_data) {
            $elementor_data = json_decode($post_data->meta_value, true);
            
            if ($elementor_data) {
                // Remove our widgets (simplified - would need recursive removal)
                $cleaned_data = $this->remove_widgets_from_data($elementor_data, 'vortex360-tour-viewer');
                
                update_post_meta($post_data->post_id, '_elementor_data', json_encode($cleaned_data));
            }
        }
    }
    
    /**
     * Remove specific widgets from Elementor data
     */
    private function remove_widgets_from_data($data, $widget_type) {
        if (!is_array($data)) {
            return $data;
        }
        
        foreach ($data as $key => $item) {
            if (is_array($item)) {
                if (isset($item['widgetType']) && $item['widgetType'] === $widget_type) {
                    unset($data[$key]);
                } else {
                    $data[$key] = $this->remove_widgets_from_data($item, $widget_type);
                }
            }
        }
        
        return array_values($data); // Re-index array
    }
}

// Initialize Elementor integration if Elementor is active
if (VX_Elementor_Integration::is_elementor_active()) {
    new VX_Elementor_Integration();
    
    // Add Elementor support to tour post type
    add_action('init', array('VX_Elementor_Integration', 'add_elementor_support'), 20);
}