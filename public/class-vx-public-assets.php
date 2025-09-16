<?php
/**
 * Vortex360 Lite - Public Assets Handler
 * 
 * Manages frontend assets (CSS, JS, images) for tour display
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public assets handler class.
 * Manages loading and optimization of frontend assets.
 */
class VX_Public_Assets {
    
    /**
     * Asset version for cache busting.
     * @var string
     */
    private $version;
    
    /**
     * Asset handles registry.
     * @var array
     */
    private $handles = [];
    
    /**
     * Inline scripts queue.
     * @var array
     */
    private $inline_scripts = [];
    
    /**
     * Inline styles queue.
     * @var array
     */
    private $inline_styles = [];
    
    /**
     * Asset dependencies.
     * @var array
     */
    private $dependencies = [
        'scripts' => [
            'vx-viewer' => ['jquery', 'wp-util'],
            'vx-hotspots' => ['vx-viewer'],
            'vx-controls' => ['vx-viewer'],
            'vx-public' => ['vx-viewer', 'vx-hotspots', 'vx-controls']
        ],
        'styles' => [
            'vx-viewer' => [],
            'vx-hotspots' => ['vx-viewer'],
            'vx-controls' => ['vx-viewer'],
            'vx-public' => ['vx-viewer', 'vx-hotspots', 'vx-controls']
        ]
    ];
    
    /**
     * Initialize assets handler.
     * Sets up hooks and asset configuration.
     */
    public function __construct() {
        $this->version = VX_VERSION;
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for asset handling.
     */
    private function init_hooks() {
        // Enqueue assets
        add_action('wp_enqueue_scripts', [$this, 'enqueue_public_assets']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_conditional_assets'], 20);
        
        // Asset optimization
        add_filter('script_loader_tag', [$this, 'add_script_attributes'], 10, 3);
        add_filter('style_loader_tag', [$this, 'add_style_attributes'], 10, 4);
        
        // Inline assets
        add_action('wp_footer', [$this, 'output_inline_scripts'], 25);
        add_action('wp_head', [$this, 'output_inline_styles'], 100);
        
        // Asset preloading
        add_action('wp_head', [$this, 'preload_critical_assets'], 5);
        
        // Asset cleanup
        add_action('wp_footer', [$this, 'cleanup_unused_assets'], 999);
        
        // AJAX handlers for dynamic asset loading
        add_action('wp_ajax_vx_load_tour_assets', [$this, 'ajax_load_tour_assets']);
        add_action('wp_ajax_nopriv_vx_load_tour_assets', [$this, 'ajax_load_tour_assets']);
        
        // Asset localization
        add_action('wp_enqueue_scripts', [$this, 'localize_scripts'], 30);
    }
    
    /**
     * Enqueue public assets.
     * Loads core CSS and JavaScript files for tour functionality.
     */
    public function enqueue_public_assets() {
        // Only load on tour-related pages or when shortcode is present
        if (!$this->should_load_assets()) {
            return;
        }
        
        $asset_url = VX_PLUGIN_URL . 'assets/';
        $min_suffix = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
        
        // Core viewer CSS
        wp_enqueue_style(
            'vx-viewer',
            $asset_url . 'css/viewer' . $min_suffix . '.css',
            $this->dependencies['styles']['vx-viewer'],
            $this->version,
            'all'
        );
        
        // Hotspots CSS
        wp_enqueue_style(
            'vx-hotspots',
            $asset_url . 'css/hotspots' . $min_suffix . '.css',
            $this->dependencies['styles']['vx-hotspots'],
            $this->version,
            'all'
        );
        
        // Controls CSS
        wp_enqueue_style(
            'vx-controls',
            $asset_url . 'css/controls' . $min_suffix . '.css',
            $this->dependencies['styles']['vx-controls'],
            $this->version,
            'all'
        );
        
        // Public CSS
        wp_enqueue_style(
            'vx-public',
            $asset_url . 'css/public' . $min_suffix . '.css',
            $this->dependencies['styles']['vx-public'],
            $this->version,
            'all'
        );
        
        // Core viewer JavaScript
        wp_enqueue_script(
            'vx-viewer',
            $asset_url . 'js/viewer' . $min_suffix . '.js',
            $this->dependencies['scripts']['vx-viewer'],
            $this->version,
            true
        );
        
        // Hotspots JavaScript
        wp_enqueue_script(
            'vx-hotspots',
            $asset_url . 'js/hotspots' . $min_suffix . '.js',
            $this->dependencies['scripts']['vx-hotspots'],
            $this->version,
            true
        );
        
        // Controls JavaScript
        wp_enqueue_script(
            'vx-controls',
            $asset_url . 'js/controls' . $min_suffix . '.js',
            $this->dependencies['scripts']['vx-controls'],
            $this->version,
            true
        );
        
        // Public JavaScript
        wp_enqueue_script(
            'vx-public',
            $asset_url . 'js/public' . $min_suffix . '.js',
            $this->dependencies['scripts']['vx-public'],
            $this->version,
            true
        );
        
        // Register handles
        $this->handles = [
            'styles' => ['vx-viewer', 'vx-hotspots', 'vx-controls', 'vx-public'],
            'scripts' => ['vx-viewer', 'vx-hotspots', 'vx-controls', 'vx-public']
        ];
    }
    
    /**
     * Enqueue conditional assets.
     * Loads additional assets based on specific conditions.
     */
    public function enqueue_conditional_assets() {
        if (!$this->should_load_assets()) {
            return;
        }
        
        $asset_url = VX_PLUGIN_URL . 'assets/';
        $min_suffix = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
        
        // Load fullscreen assets if enabled
        if ($this->is_fullscreen_enabled()) {
            wp_enqueue_style(
                'vx-fullscreen',
                $asset_url . 'css/fullscreen' . $min_suffix . '.css',
                ['vx-viewer'],
                $this->version
            );
            
            wp_enqueue_script(
                'vx-fullscreen',
                $asset_url . 'js/fullscreen' . $min_suffix . '.js',
                ['vx-viewer'],
                $this->version,
                true
            );
        }
        
        // Load mobile-specific assets on mobile devices
        if (wp_is_mobile()) {
            wp_enqueue_style(
                'vx-mobile',
                $asset_url . 'css/mobile' . $min_suffix . '.css',
                ['vx-public'],
                $this->version
            );
            
            wp_enqueue_script(
                'vx-mobile',
                $asset_url . 'js/mobile' . $min_suffix . '.js',
                ['vx-public'],
                $this->version,
                true
            );
        }
        
        // Load social sharing assets if enabled
        if ($this->is_social_sharing_enabled()) {
            wp_enqueue_style(
                'vx-social',
                $asset_url . 'css/social' . $min_suffix . '.css',
                ['vx-public'],
                $this->version
            );
            
            wp_enqueue_script(
                'vx-social',
                $asset_url . 'js/social' . $min_suffix . '.js',
                ['vx-public'],
                $this->version,
                true
            );
        }
        
        // Load analytics assets if tracking is enabled
        if ($this->is_analytics_enabled()) {
            wp_enqueue_script(
                'vx-analytics',
                $asset_url . 'js/analytics' . $min_suffix . '.js',
                ['vx-public'],
                $this->version,
                true
            );
        }
    }
    
    /**
     * Add script attributes.
     * Adds async/defer attributes to script tags.
     * 
     * @param string $tag Script tag HTML
     * @param string $handle Script handle
     * @param string $src Script source URL
     * @return string Modified script tag
     */
    public function add_script_attributes($tag, $handle, $src) {
        // Add async to non-critical scripts
        $async_scripts = ['vx-analytics', 'vx-social'];
        if (in_array($handle, $async_scripts)) {
            $tag = str_replace(' src', ' async src', $tag);
        }
        
        // Add defer to viewer scripts for better performance
        $defer_scripts = ['vx-viewer', 'vx-hotspots', 'vx-controls'];
        if (in_array($handle, $defer_scripts)) {
            $tag = str_replace(' src', ' defer src', $tag);
        }
        
        // Add module type for ES6 modules
        $module_scripts = ['vx-viewer'];
        if (in_array($handle, $module_scripts) && strpos($src, '.module.js') !== false) {
            $tag = str_replace(' src', ' type="module" src', $tag);
        }
        
        return $tag;
    }
    
    /**
     * Add style attributes.
     * Adds attributes to style tags for optimization.
     * 
     * @param string $tag Style tag HTML
     * @param string $handle Style handle
     * @param string $href Style source URL
     * @param string $media Media attribute
     * @return string Modified style tag
     */
    public function add_style_attributes($tag, $handle, $href, $media) {
        // Add preload for critical CSS
        $critical_styles = ['vx-viewer', 'vx-public'];
        if (in_array($handle, $critical_styles)) {
            // Add as preload link in head
            $this->add_preload_link($href, 'style');
        }
        
        // Add media queries for responsive styles
        if ($handle === 'vx-mobile') {
            $tag = str_replace("media='all'", "media='screen and (max-width: 768px)'", $tag);
        }
        
        return $tag;
    }
    
    /**
     * Output inline scripts.
     * Outputs queued inline JavaScript in footer.
     */
    public function output_inline_scripts() {
        if (empty($this->inline_scripts)) {
            return;
        }
        
        echo "<script type='text/javascript'>\n";
        echo "/* Vortex360 Inline Scripts */\n";
        
        foreach ($this->inline_scripts as $script) {
            echo $script . "\n";
        }
        
        echo "</script>\n";
        
        // Clear queue
        $this->inline_scripts = [];
    }
    
    /**
     * Output inline styles.
     * Outputs queued inline CSS in head.
     */
    public function output_inline_styles() {
        if (empty($this->inline_styles)) {
            return;
        }
        
        echo "<style type='text/css'>\n";
        echo "/* Vortex360 Inline Styles */\n";
        
        foreach ($this->inline_styles as $style) {
            echo $style . "\n";
        }
        
        echo "</style>\n";
        
        // Clear queue
        $this->inline_styles = [];
    }
    
    /**
     * Preload critical assets.
     * Adds preload links for critical resources.
     */
    public function preload_critical_assets() {
        if (!$this->should_load_assets()) {
            return;
        }
        
        $asset_url = VX_PLUGIN_URL . 'assets/';
        $min_suffix = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
        
        // Preload critical CSS
        $this->add_preload_link(
            $asset_url . 'css/viewer' . $min_suffix . '.css',
            'style'
        );
        
        // Preload critical JavaScript
        $this->add_preload_link(
            $asset_url . 'js/viewer' . $min_suffix . '.js',
            'script'
        );
        
        // Preload fonts if used
        $this->preload_fonts();
    }
    
    /**
     * Cleanup unused assets.
     * Removes assets that weren't actually needed.
     */
    public function cleanup_unused_assets() {
        // This runs after all content is processed
        // Remove assets that were enqueued but not used
        
        global $wp_scripts, $wp_styles;
        
        // Check if tour content was actually rendered
        if (!$this->was_tour_content_rendered()) {
            // Dequeue tour assets if no tour content was found
            foreach ($this->handles['scripts'] as $handle) {
                wp_dequeue_script($handle);
            }
            
            foreach ($this->handles['styles'] as $handle) {
                wp_dequeue_style($handle);
            }
        }
    }
    
    /**
     * AJAX handler for loading tour assets.
     * Dynamically loads assets for AJAX-loaded tours.
     */
    public function ajax_load_tour_assets() {
        check_ajax_referer('vx_load_assets', 'nonce');
        
        $tour_id = intval($_POST['tour_id'] ?? 0);
        
        if (!$tour_id) {
            wp_die('Invalid tour ID');
        }
        
        $assets = $this->get_tour_specific_assets($tour_id);
        
        wp_send_json_success([
            'css' => $assets['css'],
            'js' => $assets['js'],
            'inline_css' => $assets['inline_css'],
            'inline_js' => $assets['inline_js']
        ]);
    }
    
    /**
     * Localize scripts.
     * Adds JavaScript variables and configuration.
     */
    public function localize_scripts() {
        if (!wp_script_is('vx-public', 'enqueued')) {
            return;
        }
        
        $localized_data = [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_public_nonce'),
            'plugin_url' => VX_PLUGIN_URL,
            'assets_url' => VX_PLUGIN_URL . 'assets/',
            'version' => $this->version,
            'settings' => [
                'auto_rotate' => get_option('vx_auto_rotate', true),
                'show_controls' => get_option('vx_show_controls', true),
                'enable_fullscreen' => get_option('vx_enable_fullscreen', true),
                'mobile_optimized' => get_option('vx_mobile_optimized', true),
                'loading_animation' => get_option('vx_loading_animation', 'fade'),
                'hotspot_animation' => get_option('vx_hotspot_animation', 'pulse')
            ],
            'strings' => [
                'loading' => __('Loading tour...', 'vortex360-lite'),
                'error' => __('Error loading tour', 'vortex360-lite'),
                'fullscreen' => __('Enter fullscreen', 'vortex360-lite'),
                'exit_fullscreen' => __('Exit fullscreen', 'vortex360-lite'),
                'next_scene' => __('Next scene', 'vortex360-lite'),
                'prev_scene' => __('Previous scene', 'vortex360-lite'),
                'scene_info' => __('Scene information', 'vortex360-lite')
            ],
            'debug' => defined('WP_DEBUG') && WP_DEBUG
        ];
        
        wp_localize_script('vx-public', 'vortex360', $localized_data);
    }
    
    /**
     * Add inline script.
     * Queues inline JavaScript for output.
     * 
     * @param string $script JavaScript code
     * @param int $priority Priority for output order
     */
    public function add_inline_script($script, $priority = 10) {
        $this->inline_scripts[$priority][] = $script;
        ksort($this->inline_scripts);
    }
    
    /**
     * Add inline style.
     * Queues inline CSS for output.
     * 
     * @param string $style CSS code
     * @param int $priority Priority for output order
     */
    public function add_inline_style($style, $priority = 10) {
        $this->inline_styles[$priority][] = $style;
        ksort($this->inline_styles);
    }
    
    /**
     * Add preload link.
     * Adds a preload link tag to the head.
     * 
     * @param string $href Resource URL
     * @param string $as Resource type (style, script, font, etc.)
     * @param string $type MIME type (optional)
     * @param string $crossorigin Crossorigin attribute (optional)
     */
    private function add_preload_link($href, $as, $type = '', $crossorigin = '') {
        $attributes = [
            'rel' => 'preload',
            'href' => $href,
            'as' => $as
        ];
        
        if ($type) {
            $attributes['type'] = $type;
        }
        
        if ($crossorigin) {
            $attributes['crossorigin'] = $crossorigin;
        }
        
        $link = '<link';
        foreach ($attributes as $attr => $value) {
            $link .= ' ' . $attr . '="' . esc_attr($value) . '"';
        }
        $link .= '>' . "\n";
        
        echo $link;
    }
    
    /**
     * Preload fonts.
     * Preloads custom fonts used by the plugin.
     */
    private function preload_fonts() {
        $font_url = VX_PLUGIN_URL . 'assets/fonts/';
        
        // Preload icon font
        $this->add_preload_link(
            $font_url . 'vortex360-icons.woff2',
            'font',
            'font/woff2',
            'anonymous'
        );
    }
    
    /**
     * Check if assets should be loaded.
     * Determines if tour assets are needed on current page.
     * 
     * @return bool Whether to load assets
     */
    private function should_load_assets() {
        global $post;
        
        // Always load on tour pages
        if (is_singular('vx_tour') || is_post_type_archive('vx_tour') || is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            return true;
        }
        
        // Load if shortcode is present in content
        if ($post && has_shortcode($post->post_content, 'vortex360')) {
            return true;
        }
        
        // Load if widget is active
        if (is_active_widget(false, false, 'vx_tour_widget')) {
            return true;
        }
        
        // Load if forced via filter
        return apply_filters('vx_force_load_assets', false);
    }
    
    /**
     * Check if fullscreen is enabled.
     * Determines if fullscreen functionality should be loaded.
     * 
     * @return bool Whether fullscreen is enabled
     */
    private function is_fullscreen_enabled() {
        return get_option('vx_enable_fullscreen', true);
    }
    
    /**
     * Check if social sharing is enabled.
     * Determines if social sharing assets should be loaded.
     * 
     * @return bool Whether social sharing is enabled
     */
    private function is_social_sharing_enabled() {
        return get_option('vx_enable_social_sharing', false);
    }
    
    /**
     * Check if analytics is enabled.
     * Determines if analytics tracking should be loaded.
     * 
     * @return bool Whether analytics is enabled
     */
    private function is_analytics_enabled() {
        return get_option('vx_enable_analytics', false);
    }
    
    /**
     * Check if tour content was rendered.
     * Determines if any tour content was actually displayed.
     * 
     * @return bool Whether tour content was rendered
     */
    private function was_tour_content_rendered() {
        // Check if any tour shortcodes were processed
        global $vx_shortcode_rendered;
        
        if (!empty($vx_shortcode_rendered)) {
            return true;
        }
        
        // Check if we're on a tour page
        if (is_singular('vx_tour') || is_post_type_archive('vx_tour') || is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Get tour-specific assets.
     * Returns assets needed for a specific tour.
     * 
     * @param int $tour_id Tour post ID
     * @return array Tour assets
     */
    private function get_tour_specific_assets($tour_id) {
        $tour_settings = get_post_meta($tour_id, '_vx_tour_settings', true) ?: [];
        $asset_url = VX_PLUGIN_URL . 'assets/';
        $min_suffix = (defined('SCRIPT_DEBUG') && SCRIPT_DEBUG) ? '' : '.min';
        
        $assets = [
            'css' => [],
            'js' => [],
            'inline_css' => '',
            'inline_js' => ''
        ];
        
        // Add base assets
        $assets['css'][] = $asset_url . 'css/viewer' . $min_suffix . '.css';
        $assets['js'][] = $asset_url . 'js/viewer' . $min_suffix . '.js';
        
        // Add conditional assets based on tour settings
        if (!empty($tour_settings['enable_fullscreen'])) {
            $assets['css'][] = $asset_url . 'css/fullscreen' . $min_suffix . '.css';
            $assets['js'][] = $asset_url . 'js/fullscreen' . $min_suffix . '.js';
        }
        
        // Add custom CSS if defined
        if (!empty($tour_settings['custom_css'])) {
            $assets['inline_css'] = $tour_settings['custom_css'];
        }
        
        // Add tour-specific JavaScript configuration
        $tour_config = [
            'tour_id' => $tour_id,
            'settings' => $tour_settings,
            'scenes' => get_post_meta($tour_id, '_vx_tour_scenes', true) ?: [],
            'hotspots' => get_post_meta($tour_id, '_vx_tour_hotspots', true) ?: []
        ];
        
        $assets['inline_js'] = 'window.vortex360_tour_' . $tour_id . ' = ' . wp_json_encode($tour_config) . ';';
        
        return $assets;
    }
    
    /**
     * Get asset version.
     * Returns the current asset version for cache busting.
     * 
     * @return string Asset version
     */
    public function get_version() {
        return $this->version;
    }
    
    /**
     * Get registered handles.
     * Returns all registered asset handles.
     * 
     * @return array Asset handles
     */
    public function get_handles() {
        return $this->handles;
    }
}

// Initialize the assets handler
new VX_Public_Assets();