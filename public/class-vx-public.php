<?php
/**
 * Vortex360 Lite - Public Facing Functionality
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/public
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public-facing functionality class
 */
class VX_Public {

    /**
     * Plugin name
     */
    private $plugin_name;

    /**
     * Plugin version
     */
    private $version;

    /**
     * Initialize the class
     */
    public function __construct($plugin_name, $version) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;
        
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('wp_head', array($this, 'add_meta_tags'));
        add_action('wp_footer', array($this, 'add_viewer_templates'));
        
        // AJAX handlers for public requests
        add_action('wp_ajax_vx_get_tour_data', array($this, 'get_tour_data'));
        add_action('wp_ajax_nopriv_vx_get_tour_data', array($this, 'get_tour_data'));
        add_action('wp_ajax_vx_track_interaction', array($this, 'track_interaction'));
        add_action('wp_ajax_nopriv_vx_track_interaction', array($this, 'track_interaction'));
        
        // Content filters
        add_filter('the_content', array($this, 'auto_embed_tours'));
    }

    /**
     * Enqueue public styles
     */
    public function enqueue_styles() {
        // Only enqueue if we have tours on the page
        if ($this->has_tours_on_page()) {
            // Pannellum CSS
            wp_enqueue_style(
                'pannellum',
                plugin_dir_url(__FILE__) . 'css/pannellum.css',
                array(),
                '2.5.6'
            );
            
            // Plugin public CSS
            wp_enqueue_style(
                $this->plugin_name . '-public',
                plugin_dir_url(__FILE__) . 'css/vx-public.css',
                array('pannellum'),
                $this->version
            );
            
            // Add inline styles for customization
            $this->add_inline_styles();
        }
    }

    /**
     * Enqueue public scripts
     */
    public function enqueue_scripts() {
        // Only enqueue if we have tours on the page
        if ($this->has_tours_on_page()) {
            // Pannellum JS
            wp_enqueue_script(
                'pannellum',
                plugin_dir_url(__FILE__) . 'js/pannellum.js',
                array(),
                '2.5.6',
                true
            );
            
            // Plugin public JS
            wp_enqueue_script(
                $this->plugin_name . '-public',
                plugin_dir_url(__FILE__) . 'js/vx-public.js',
                array('jquery', 'pannellum'),
                $this->version,
                true
            );
            
            // Localize script with data
            wp_localize_script(
                $this->plugin_name . '-public',
                'vxPublic',
                array(
                    'ajaxUrl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('vx_public_nonce'),
                    'pluginUrl' => plugin_dir_url(dirname(__FILE__)),
                    'settings' => $this->get_public_settings(),
                    'strings' => array(
                        'loading' => __('Loading tour...', 'vortex360-lite'),
                        'error' => __('Error loading tour. Please try again.', 'vortex360-lite'),
                        'noWebGL' => __('Your browser does not support WebGL.', 'vortex360-lite'),
                        'fullscreen' => __('Enter Fullscreen', 'vortex360-lite'),
                        'exitFullscreen' => __('Exit Fullscreen', 'vortex360-lite'),
                        'autoRotate' => __('Auto Rotate', 'vortex360-lite'),
                        'info' => __('Information', 'vortex360-lite'),
                        'close' => __('Close', 'vortex360-lite')
                    )
                )
            );
        }
    }

    /**
     * Add meta tags for tours
     */
    public function add_meta_tags() {
        global $post;
        
        if (is_singular() && $post) {
            // Check if post contains tour shortcodes
            if (has_shortcode($post->post_content, 'vortex360')) {
                echo '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">' . "\n";
                echo '<meta name="mobile-web-app-capable" content="yes">' . "\n";
                echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
            }
        }
    }

    /**
     * Add viewer templates to footer
     */
    public function add_viewer_templates() {
        if ($this->has_tours_on_page()) {
            ?>
            <!-- Vortex360 Lite Templates -->
            <script type="text/template" id="vx-viewer-template">
                <div class="vx-viewer-container">
                    <div class="vx-viewer" id="vx-viewer-{{id}}">
                        <div class="vx-loading">
                            <div class="vx-spinner"></div>
                            <p><?php _e('Loading tour...', 'vortex360-lite'); ?></p>
                        </div>
                    </div>
                    <div class="vx-controls">
                        <button class="vx-control vx-fullscreen" title="<?php _e('Fullscreen', 'vortex360-lite'); ?>">
                            <svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                        </button>
                        <button class="vx-control vx-auto-rotate" title="<?php _e('Auto Rotate', 'vortex360-lite'); ?>">
                            <svg viewBox="0 0 24 24"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/></svg>
                        </button>
                        <div class="vx-scene-nav">
                            <button class="vx-control vx-prev-scene" title="<?php _e('Previous Scene', 'vortex360-lite'); ?>">
                                <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                            </button>
                            <span class="vx-scene-counter">1 / 1</span>
                            <button class="vx-control vx-next-scene" title="<?php _e('Next Scene', 'vortex360-lite'); ?>">
                                <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="vx-hotspot-info" style="display: none;">
                        <div class="vx-hotspot-content">
                            <button class="vx-close-info">&times;</button>
                            <div class="vx-hotspot-body"></div>
                        </div>
                    </div>
                    <div class="vx-branding">
                        <a href="#" target="_blank" rel="noopener"><?php _e('Powered by Vortex360', 'vortex360-lite'); ?></a>
                    </div>
                </div>
            </script>

            <script type="text/template" id="vx-hotspot-template">
                <div class="vx-hotspot vx-hotspot-{{type}}" data-hotspot-id="{{id}}">
                    <div class="vx-hotspot-icon">
                        <svg viewBox="0 0 24 24">
                            {{#if icon}}
                                {{{icon}}}
                            {{else}}
                                <circle cx="12" cy="12" r="3"/>
                            {{/if}}
                        </svg>
                    </div>
                    {{#if title}}
                        <div class="vx-hotspot-label">{{title}}</div>
                    {{/if}}
                </div>
            </script>

            <script type="text/template" id="vx-error-template">
                <div class="vx-error">
                    <div class="vx-error-icon">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    </div>
                    <h3><?php _e('Tour Loading Error', 'vortex360-lite'); ?></h3>
                    <p>{{message}}</p>
                    <button class="vx-retry-btn"><?php _e('Try Again', 'vortex360-lite'); ?></button>
                </div>
            </script>
            <?php
        }
    }

    /**
     * Get tour data via AJAX
     */
    public function get_tour_data() {
        check_ajax_referer('vx_public_nonce', 'nonce');
        
        $tour_id = intval($_POST['tour_id']);
        
        if (!$tour_id) {
            wp_send_json_error(array(
                'message' => __('Invalid tour ID.', 'vortex360-lite')
            ));
        }
        
        // Check if tour exists and is published
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_status !== 'publish' || $tour->post_type !== 'vortex_tour') {
            wp_send_json_error(array(
                'message' => __('Tour not found or not published.', 'vortex360-lite')
            ));
        }
        
        // Get tour data
        $tour_data = $this->prepare_tour_data($tour_id);
        
        if (!$tour_data) {
            wp_send_json_error(array(
                'message' => __('Tour data could not be loaded.', 'vortex360-lite')
            ));
        }
        
        wp_send_json_success($tour_data);
    }

    /**
     * Track interaction via AJAX
     */
    public function track_interaction() {
        check_ajax_referer('vx_public_nonce', 'nonce');
        
        $tour_id = intval($_POST['tour_id']);
        $interaction_type = sanitize_text_field($_POST['interaction_type']);
        $scene_id = sanitize_text_field($_POST['scene_id']);
        $hotspot_id = sanitize_text_field($_POST['hotspot_id']);
        
        // Basic interaction tracking (can be extended in Pro version)
        $interaction_data = array(
            'tour_id' => $tour_id,
            'type' => $interaction_type,
            'scene_id' => $scene_id,
            'hotspot_id' => $hotspot_id,
            'timestamp' => current_time('mysql'),
            'user_agent' => $_SERVER['HTTP_USER_AGENT'],
            'ip_address' => $this->get_client_ip()
        );
        
        // Store interaction (simplified for Lite version)
        $interactions = get_post_meta($tour_id, '_vx_interactions', true);
        if (!is_array($interactions)) {
            $interactions = array();
        }
        
        $interactions[] = $interaction_data;
        
        // Keep only last 100 interactions for Lite version
        if (count($interactions) > 100) {
            $interactions = array_slice($interactions, -100);
        }
        
        update_post_meta($tour_id, '_vx_interactions', $interactions);
        
        wp_send_json_success(array(
            'message' => __('Interaction tracked.', 'vortex360-lite')
        ));
    }

    /**
     * Auto-embed tours in content
     */
    public function auto_embed_tours($content) {
        // Only process on singular posts/pages
        if (!is_singular()) {
            return $content;
        }
        
        // Check for auto-embed meta
        global $post;
        $auto_embed = get_post_meta($post->ID, '_vx_auto_embed', true);
        
        if ($auto_embed) {
            $tour_id = get_post_meta($post->ID, '_vx_auto_embed_tour', true);
            if ($tour_id) {
                $shortcode = '[vortex360 id="' . $tour_id . '"]';
                $position = get_post_meta($post->ID, '_vx_auto_embed_position', true);
                
                switch ($position) {
                    case 'before':
                        $content = $shortcode . $content;
                        break;
                    case 'after':
                        $content = $content . $shortcode;
                        break;
                    case 'replace':
                        $content = $shortcode;
                        break;
                }
            }
        }
        
        return $content;
    }

    /**
     * Check if page has tours
     */
    private function has_tours_on_page() {
        global $post;
        
        if (!$post) {
            return false;
        }
        
        // Check for shortcode in content
        if (has_shortcode($post->post_content, 'vortex360')) {
            return true;
        }
        
        // Check for auto-embed
        if (get_post_meta($post->ID, '_vx_auto_embed', true)) {
            return true;
        }
        
        // Check for Gutenberg blocks (if applicable)
        if (has_blocks($post->post_content)) {
            $blocks = parse_blocks($post->post_content);
            foreach ($blocks as $block) {
                if ($block['blockName'] === 'vortex360/tour-viewer') {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Add inline styles
     */
    private function add_inline_styles() {
        $settings = $this->get_public_settings();
        
        $css = "";
        
        // Custom hotspot styles
        if ($settings['hotspot_style'] !== 'default') {
            $css .= $this->get_hotspot_style_css($settings['hotspot_style']);
        }
        
        // Custom dimensions
        if ($settings['default_width'] || $settings['default_height']) {
            $css .= ".vx-viewer-container { ";
            if ($settings['default_width']) {
                $css .= "max-width: {$settings['default_width']}px; ";
            }
            if ($settings['default_height']) {
                $css .= "height: {$settings['default_height']}px; ";
            }
            $css .= "}";
        }
        
        if ($css) {
            wp_add_inline_style($this->plugin_name . '-public', $css);
        }
    }

    /**
     * Get hotspot style CSS
     */
    private function get_hotspot_style_css($style) {
        switch ($style) {
            case 'minimal':
                return "
                    .vx-hotspot {
                        background: rgba(255, 255, 255, 0.9);
                        border: 2px solid #007cba;
                        border-radius: 50%;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    }
                    .vx-hotspot:hover {
                        background: #007cba;
                        color: white;
                    }
                ";
            case 'modern':
                return "
                    .vx-hotspot {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border: none;
                        border-radius: 8px;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                        color: white;
                    }
                    .vx-hotspot:hover {
                        transform: scale(1.1);
                        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
                    }
                ";
            default:
                return '';
        }
    }

    /**
     * Get public settings
     */
    private function get_public_settings() {
        $settings = get_option('vortex360_options', array());
        
        return array_merge(array(
            'default_width' => 800,
            'default_height' => 600,
            'auto_load' => true,
            'show_controls' => true,
            'mouse_zoom' => true,
            'auto_rotate' => false,
            'auto_rotate_speed' => 2,
            'hotspot_style' => 'default',
            'image_quality' => 'medium',
            'preload_scenes' => false,
            'lazy_load' => true
        ), $settings);
    }

    /**
     * Prepare tour data for frontend
     */
    private function prepare_tour_data($tour_id) {
        $tour = get_post($tour_id);
        if (!$tour) {
            return false;
        }
        
        // Get tour settings
        $settings = get_post_meta($tour_id, '_vx_tour_settings', true);
        if (!is_array($settings)) {
            $settings = array();
        }
        
        // Get scenes
        $scenes = get_post_meta($tour_id, '_vx_scenes', true);
        if (!is_array($scenes)) {
            $scenes = array();
        }
        
        // Process scenes for frontend
        $processed_scenes = array();
        foreach ($scenes as $scene) {
            $processed_scene = array(
                'id' => $scene['id'],
                'title' => $scene['title'],
                'image' => $scene['image'],
                'type' => 'equirectangular',
                'hotSpots' => array()
            );
            
            // Add initial view settings
            if (isset($scene['pitch'])) {
                $processed_scene['pitch'] = floatval($scene['pitch']);
            }
            if (isset($scene['yaw'])) {
                $processed_scene['yaw'] = floatval($scene['yaw']);
            }
            if (isset($scene['hfov'])) {
                $processed_scene['hfov'] = floatval($scene['hfov']);
            }
            
            // Process hotspots
            if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
                foreach ($scene['hotspots'] as $hotspot) {
                    $processed_hotspot = array(
                        'id' => $hotspot['id'],
                        'pitch' => floatval($hotspot['pitch']),
                        'yaw' => floatval($hotspot['yaw']),
                        'type' => $hotspot['type']
                    );
                    
                    // Add type-specific data
                    switch ($hotspot['type']) {
                        case 'info':
                            $processed_hotspot['text'] = $hotspot['title'];
                            if (isset($hotspot['content'])) {
                                $processed_hotspot['content'] = $hotspot['content'];
                            }
                            break;
                        case 'scene':
                            $processed_hotspot['sceneId'] = $hotspot['target_scene'];
                            $processed_hotspot['text'] = $hotspot['title'];
                            break;
                        case 'link':
                            $processed_hotspot['URL'] = $hotspot['url'];
                            $processed_hotspot['text'] = $hotspot['title'];
                            break;
                    }
                    
                    $processed_scene['hotSpots'][] = $processed_hotspot;
                }
            }
            
            $processed_scenes[] = $processed_scene;
        }
        
        return array(
            'id' => $tour_id,
            'title' => $tour->post_title,
            'scenes' => $processed_scenes,
            'settings' => array_merge(array(
                'autoLoad' => true,
                'showControls' => true,
                'mouseZoom' => true,
                'autoRotate' => false,
                'autoRotateInactivityDelay' => 3000,
                'autoRotateStopDelay' => 1000
            ), $settings)
        );
    }

    /**
     * Get client IP address
     */
    private function get_client_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
    }
}