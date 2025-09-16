<?php
/**
 * Shortcode functionality
 *
 * Handles the [vortex360] shortcode for embedding virtual tours.
 *
 * @link       https://vortex360.co
 * @since      1.0.0
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shortcode class.
 *
 * This class handles the [vortex360] shortcode for embedding virtual tours
 * in posts, pages, and other content areas.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Shortcode {

    /**
     * Default shortcode attributes.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $default_atts    Default shortcode attributes.
     */
    private $default_atts = array(
        'id' => '',
        'width' => '100%',
        'height' => '500px',
        'autorotate' => 'true',
        'show_thumbnails' => 'true',
        'show_fullscreen' => 'true',
        'show_zoom' => 'true',
        'class' => ''
    );

    /**
     * Initialize the class and set its properties.
     *
     * @since    1.0.0
     */
    public function __construct() {
        // Constructor can be used for initialization if needed
    }

    /**
     * Register the shortcode.
     *
     * @since    1.0.0
     */
    public function register_shortcode() {
        add_shortcode('vortex360', array($this, 'render_shortcode'));
    }

    /**
     * Render the shortcode.
     *
     * @since    1.0.0
     * @param    array   $atts      Shortcode attributes.
     * @param    string  $content   Shortcode content.
     * @return   string             Rendered shortcode HTML.
     */
    public function render_shortcode($atts, $content = null) {
        // Parse attributes
        $atts = shortcode_atts($this->default_atts, $atts, 'vortex360');

        // Validate tour ID
        if (empty($atts['id'])) {
            return $this->render_error(__('Tour ID is required.', 'vortex360-lite'));
        }

        $tour_id = intval($atts['id']);
        
        // Check if tour exists and is published
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vortex_tour' || $tour->post_status !== 'publish') {
            return $this->render_error(__('Tour not found or not published.', 'vortex360-lite'));
        }

        // Check if user can view the tour
        if (!$this->can_view_tour($tour)) {
            return $this->render_error(__('You do not have permission to view this tour.', 'vortex360-lite'));
        }

        // Get tour data
        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data) || !is_array($tour_data)) {
            return $this->render_error(__('Tour data not found.', 'vortex360-lite'));
        }

        // Validate tour has scenes
        if (empty($tour_data['scenes']) || !is_array($tour_data['scenes'])) {
            return $this->render_error(__('Tour has no scenes configured.', 'vortex360-lite'));
        }

        // Sanitize attributes
        $atts = $this->sanitize_attributes($atts);

        // Generate unique container ID
        $container_id = 'vx-tour-' . $tour_id . '-' . uniqid();

        // Prepare tour config for frontend
        $tour_config = $this->prepare_tour_config($tour_data, $atts);

        // Enqueue necessary scripts and styles
        $this->enqueue_assets();

        // Add tour config to localized data
        wp_localize_script('vortex360-viewer', 'vx_tour_' . str_replace('-', '_', $container_id), $tour_config);

        // Generate HTML
        return $this->generate_html($container_id, $atts, $tour);
    }

    /**
     * Sanitize shortcode attributes.
     *
     * @since    1.0.0
     * @param    array   $atts    Shortcode attributes.
     * @return   array            Sanitized attributes.
     */
    private function sanitize_attributes($atts) {
        $sanitized = array();

        $sanitized['id'] = intval($atts['id']);
        $sanitized['width'] = $this->sanitize_dimension($atts['width']);
        $sanitized['height'] = $this->sanitize_dimension($atts['height']);
        $sanitized['autorotate'] = $this->sanitize_boolean($atts['autorotate']);
        $sanitized['show_thumbnails'] = $this->sanitize_boolean($atts['show_thumbnails']);
        $sanitized['show_fullscreen'] = $this->sanitize_boolean($atts['show_fullscreen']);
        $sanitized['show_zoom'] = $this->sanitize_boolean($atts['show_zoom']);
        $sanitized['class'] = sanitize_html_class($atts['class']);

        return $sanitized;
    }

    /**
     * Sanitize dimension value (width/height).
     *
     * @since    1.0.0
     * @param    string  $value    Dimension value.
     * @return   string            Sanitized dimension value.
     */
    private function sanitize_dimension($value) {
        // Allow percentages and pixel values
        if (preg_match('/^\d+(%|px)$/', $value) || $value === '100%') {
            return $value;
        }
        
        // If it's just a number, assume pixels
        if (is_numeric($value)) {
            return intval($value) . 'px';
        }
        
        // Default fallback
        return '500px';
    }

    /**
     * Sanitize boolean value.
     *
     * @since    1.0.0
     * @param    mixed   $value    Boolean value.
     * @return   bool              Sanitized boolean value.
     */
    private function sanitize_boolean($value) {
        if (is_bool($value)) {
            return $value;
        }
        
        if (is_string($value)) {
            return in_array(strtolower($value), array('true', '1', 'yes', 'on'));
        }
        
        return (bool) $value;
    }

    /**
     * Check if user can view the tour.
     *
     * @since    1.0.0
     * @param    WP_Post $tour    Tour post object.
     * @return   bool             Whether user can view the tour.
     */
    private function can_view_tour($tour) {
        // Public tours can be viewed by anyone
        if ($tour->post_status === 'publish') {
            return true;
        }
        
        // Private tours require read permission
        if ($tour->post_status === 'private') {
            return current_user_can('read_post', $tour->ID);
        }
        
        return false;
    }

    /**
     * Prepare tour configuration for frontend.
     *
     * @since    1.0.0
     * @param    array   $tour_data    Tour data.
     * @param    array   $atts         Shortcode attributes.
     * @return   array                 Frontend tour configuration.
     */
    private function prepare_tour_config($tour_data, $atts) {
        $config = array(
            'version' => 1,
            'settings' => array(
                'ui' => array(
                    'showThumbnails' => $atts['show_thumbnails'],
                    'showZoom' => $atts['show_zoom'],
                    'showFullscreen' => $atts['show_fullscreen']
                ),
                'autorotate' => array(
                    'enabled' => $atts['autorotate'],
                    'speed' => 0.3,
                    'pauseOnHover' => true
                ),
                'mobile' => array(
                    'gyro' => true,
                    'touch' => true
                )
            ),
            'scenes' => array()
        );

        // Add branding if configured
        if (isset($tour_data['settings']['branding'])) {
            $config['settings']['branding'] = $tour_data['settings']['branding'];
        }

        // Process scenes
        $scenes_handler = new VX_Scenes();
        $hotspots_handler = new VX_Hotspots();
        
        foreach ($tour_data['scenes'] as $scene) {
            $scene_config = array(
                'id' => $scene['id'],
                'title' => $scene['title'],
                'type' => $scene['type'],
                'image' => $scene['image'],
                'initView' => $scene['initView'],
                'hotspots' => array()
            );

            // Add preview image if available
            if (isset($scene['previewImage'])) {
                $scene_config['previewImage'] = $scene['previewImage'];
            }

            // Process hotspots
            if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
                foreach ($scene['hotspots'] as $hotspot) {
                    $scene_config['hotspots'][] = $hotspots_handler->get_render_data($hotspot);
                }
            }

            $config['scenes'][] = $scene_config;
        }

        return $config;
    }

    /**
     * Enqueue necessary assets.
     *
     * @since    1.0.0
     */
    private function enqueue_assets() {
        // Enqueue Pannellum library
        wp_enqueue_style(
            'pannellum',
            plugin_dir_url(dirname(__FILE__)) . 'public/lib/pannellum/css/pannellum.css',
            array(),
            '2.5.6'
        );
        
        wp_enqueue_script(
            'pannellum',
            plugin_dir_url(dirname(__FILE__)) . 'public/lib/pannellum/js/pannellum.js',
            array(),
            '2.5.6',
            true
        );

        // Enqueue viewer assets
        wp_enqueue_style(
            'vortex360-viewer',
            plugin_dir_url(dirname(__FILE__)) . 'public/css/vortex360-viewer.css',
            array('pannellum'),
            VORTEX360_LITE_VERSION
        );
        
        wp_enqueue_script(
            'vortex360-viewer',
            plugin_dir_url(dirname(__FILE__)) . 'public/js/vortex360-viewer.js',
            array('pannellum', 'jquery'),
            VORTEX360_LITE_VERSION,
            true
        );
    }

    /**
     * Generate HTML for the tour container.
     *
     * @since    1.0.0
     * @param    string  $container_id    Container ID.
     * @param    array   $atts            Shortcode attributes.
     * @param    WP_Post $tour            Tour post object.
     * @return   string                   Generated HTML.
     */
    private function generate_html($container_id, $atts, $tour) {
        $classes = array('vx-tour-container');
        
        if (!empty($atts['class'])) {
            $classes[] = $atts['class'];
        }

        $style = sprintf(
            'width: %s; height: %s;',
            esc_attr($atts['width']),
            esc_attr($atts['height'])
        );

        $html = sprintf(
            '<div id="%s" class="%s" style="%s" data-tour-id="%d" data-tour-title="%s">',
            esc_attr($container_id),
            esc_attr(implode(' ', $classes)),
            esc_attr($style),
            $atts['id'],
            esc_attr($tour->post_title)
        );

        // Loading indicator
        $html .= '<div class="vx-loading">';
        $html .= '<div class="vx-loading-spinner"></div>';
        $html .= '<p>' . __('Loading virtual tour...', 'vortex360-lite') . '</p>';
        $html .= '</div>';

        // Error container (hidden by default)
        $html .= '<div class="vx-error" style="display: none;">';
        $html .= '<p>' . __('Failed to load virtual tour.', 'vortex360-lite') . '</p>';
        $html .= '</div>';

        $html .= '</div>';

        // Initialize the tour
        $html .= sprintf(
            '<script>jQuery(document).ready(function($) { if (typeof VortexViewer !== "undefined") { new VortexViewer("%s"); } });</script>',
            esc_js($container_id)
        );

        return $html;
    }

    /**
     * Render error message.
     *
     * @since    1.0.0
     * @param    string  $message    Error message.
     * @return   string              Error HTML.
     */
    private function render_error($message) {
        if (!current_user_can('edit_posts')) {
            return ''; // Don't show errors to non-editors
        }

        return sprintf(
            '<div class="vx-shortcode-error" style="padding: 15px; background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; border-radius: 4px; margin: 10px 0;"><strong>%s:</strong> %s</div>',
            __('Vortex360 Error', 'vortex360-lite'),
            esc_html($message)
        );
    }

    /**
     * Get default shortcode attributes.
     *
     * @since    1.0.0
     * @return   array    Default attributes.
     */
    public function get_default_attributes() {
        return $this->default_atts;
    }

    /**
     * Get shortcode usage examples.
     *
     * @since    1.0.0
     * @return   array    Usage examples.
     */
    public function get_usage_examples() {
        return array(
            'basic' => '[vortex360 id="123"]',
            'custom_size' => '[vortex360 id="123" width="800px" height="600px"]',
            'no_autorotate' => '[vortex360 id="123" autorotate="false"]',
            'minimal_ui' => '[vortex360 id="123" show_thumbnails="false" show_zoom="false"]',
            'with_class' => '[vortex360 id="123" class="my-custom-tour"]'
        );
    }
}