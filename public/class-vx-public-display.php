<?php
/**
 * Vortex360 Lite - Public Display Handler
 * 
 * Handles frontend tour rendering, shortcodes, and public-facing functionality
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public display class.
 * Manages frontend tour rendering and display functionality.
 */
class VX_Public_Display {
    
    /**
     * Current tour being displayed.
     * @var WP_Post|null
     */
    private $current_tour = null;
    
    /**
     * Tour settings cache.
     * @var array
     */
    private $tour_settings = [];
    
    /**
     * Initialize public display functionality.
     * Sets up hooks and shortcodes for frontend rendering.
     */
    public function __construct() {
        $this->init_hooks();
        $this->register_shortcodes();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for public display.
     */
    private function init_hooks() {
        // Frontend scripts and styles
        add_action('wp_enqueue_scripts', [$this, 'enqueue_public_assets']);
        
        // Template handling
        add_filter('single_template', [$this, 'load_tour_template']);
        add_filter('the_content', [$this, 'filter_tour_content']);
        
        // SEO and meta
        add_action('wp_head', [$this, 'add_tour_meta_tags']);
        add_filter('document_title_parts', [$this, 'filter_tour_title']);
        
        // Embed handling
        add_action('init', [$this, 'add_embed_rewrite_rules']);
        add_action('template_redirect', [$this, 'handle_embed_requests']);
        
        // AJAX handlers for public interactions
        add_action('wp_ajax_vx_get_tour_data', [$this, 'ajax_get_tour_data']);
        add_action('wp_ajax_nopriv_vx_get_tour_data', [$this, 'ajax_get_tour_data']);
        add_action('wp_ajax_vx_track_tour_view', [$this, 'ajax_track_tour_view']);
        add_action('wp_ajax_nopriv_vx_track_tour_view', [$this, 'ajax_track_tour_view']);
        
        // REST API endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        
        // Body classes
        add_filter('body_class', [$this, 'add_tour_body_classes']);
        
        // OEmbed support
        add_action('init', [$this, 'add_oembed_support']);
    }
    
    /**
     * Register shortcodes for tour display.
     * Creates shortcodes for embedding tours in posts/pages.
     */
    private function register_shortcodes() {
        add_shortcode('vortex360', [$this, 'render_tour_shortcode']);
        add_shortcode('vx_tour', [$this, 'render_tour_shortcode']);
        add_shortcode('vx_tour_list', [$this, 'render_tour_list_shortcode']);
        add_shortcode('vx_tour_gallery', [$this, 'render_tour_gallery_shortcode']);
    }
    
    /**
     * Enqueue public assets for tour display.
     * Loads CSS and JavaScript files for frontend functionality.
     */
    public function enqueue_public_assets() {
        // Only load on tour pages or when shortcode is present
        if (!$this->should_load_assets()) {
            return;
        }
        
        // Core tour viewer CSS
        wp_enqueue_style(
            'vx-public-style',
            VX_PLUGIN_URL . 'assets/css/public.css',
            [],
            VX_VERSION
        );
        
        // Tour viewer JavaScript
        wp_enqueue_script(
            'vx-tour-viewer',
            VX_PLUGIN_URL . 'assets/js/tour-viewer.js',
            ['jquery'],
            VX_VERSION,
            true
        );
        
        // Three.js for 360° rendering
        wp_enqueue_script(
            'threejs',
            VX_PLUGIN_URL . 'assets/js/three.min.js',
            [],
            '0.158.0',
            true
        );
        
        // Tour controls
        wp_enqueue_script(
            'vx-tour-controls',
            VX_PLUGIN_URL . 'assets/js/tour-controls.js',
            ['threejs', 'vx-tour-viewer'],
            VX_VERSION,
            true
        );
        
        // Localize script with tour data
        $this->localize_tour_scripts();
    }
    
    /**
     * Check if tour assets should be loaded.
     * Determines if current page needs tour functionality.
     * 
     * @return bool Whether to load tour assets
     */
    private function should_load_assets() {
        global $post;
        
        // Always load on tour single pages
        if (is_singular('vx_tour')) {
            return true;
        }
        
        // Check for shortcodes in post content
        if ($post && has_shortcode($post->post_content, 'vortex360')) {
            return true;
        }
        
        if ($post && has_shortcode($post->post_content, 'vx_tour')) {
            return true;
        }
        
        // Check for embed requests
        if (get_query_var('vx_embed')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Localize JavaScript with tour data and settings.
     * Passes PHP data to JavaScript for tour functionality.
     */
    private function localize_tour_scripts() {
        $tour_data = [];
        
        if (is_singular('vx_tour')) {
            global $post;
            $tour_data = $this->get_tour_data($post->ID);
        }
        
        wp_localize_script('vx-tour-viewer', 'vxTourData', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'restUrl' => rest_url('vortex360/v1/'),
            'nonce' => wp_create_nonce('vx_public_nonce'),
            'tourData' => $tour_data,
            'settings' => $this->get_global_settings(),
            'strings' => [
                'loading' => __('Loading tour...', 'vortex360-lite'),
                'error' => __('Error loading tour', 'vortex360-lite'),
                'fullscreen' => __('Enter Fullscreen', 'vortex360-lite'),
                'exitFullscreen' => __('Exit Fullscreen', 'vortex360-lite'),
                'autoRotate' => __('Auto Rotate', 'vortex360-lite'),
                'resetView' => __('Reset View', 'vortex360-lite'),
                'nextScene' => __('Next Scene', 'vortex360-lite'),
                'prevScene' => __('Previous Scene', 'vortex360-lite'),
                'sceneInfo' => __('Scene Information', 'vortex360-lite'),
                'hotspotClick' => __('Click to explore', 'vortex360-lite')
            ]
        ]);
    }
    
    /**
     * Load custom template for tour single pages.
     * Uses plugin template if theme doesn't have one.
     * 
     * @param string $template Current template path
     * @return string Modified template path
     */
    public function load_tour_template($template) {
        if (is_singular('vx_tour')) {
            // Check if theme has custom template
            $theme_template = locate_template(['single-vx_tour.php', 'vortex360/single-tour.php']);
            
            if ($theme_template) {
                return $theme_template;
            }
            
            // Use plugin template
            $plugin_template = VX_PLUGIN_PATH . 'public/templates/single-tour.php';
            
            if (file_exists($plugin_template)) {
                return $plugin_template;
            }
        }
        
        return $template;
    }
    
    /**
     * Filter tour content for automatic display.
     * Adds tour viewer to tour post content.
     * 
     * @param string $content Post content
     * @return string Modified content
     */
    public function filter_tour_content($content) {
        if (!is_singular('vx_tour') || !in_the_loop() || !is_main_query()) {
            return $content;
        }
        
        global $post;
        
        $tour_settings = get_post_meta($post->ID, '_vx_tour_settings', true);
        
        // Check if auto-display is enabled
        if (empty($tour_settings['auto_display']) || $tour_settings['auto_display'] !== 'yes') {
            return $content;
        }
        
        // Generate tour viewer HTML
        $tour_html = $this->render_tour_viewer($post->ID);
        
        // Add tour viewer before or after content based on settings
        $position = $tour_settings['display_position'] ?? 'before';
        
        if ($position === 'after') {
            return $content . $tour_html;
        } else {
            return $tour_html . $content;
        }
    }
    
    /**
     * Add tour-specific meta tags to head.
     * Includes Open Graph and Twitter Card meta for social sharing.
     */
    public function add_tour_meta_tags() {
        if (!is_singular('vx_tour')) {
            return;
        }
        
        global $post;
        
        $tour_settings = get_post_meta($post->ID, '_vx_tour_settings', true);
        $seo_settings = get_post_meta($post->ID, '_vx_tour_seo', true);
        
        // Basic meta tags
        if (!empty($seo_settings['meta_description'])) {
            echo '<meta name="description" content="' . esc_attr($seo_settings['meta_description']) . '">' . "\n";
        }
        
        if (!empty($seo_settings['meta_keywords'])) {
            echo '<meta name="keywords" content="' . esc_attr($seo_settings['meta_keywords']) . '">' . "\n";
        }
        
        // Open Graph meta tags
        echo '<meta property="og:type" content="website">' . "\n";
        echo '<meta property="og:title" content="' . esc_attr(get_the_title()) . '">' . "\n";
        echo '<meta property="og:url" content="' . esc_url(get_permalink()) . '">' . "\n";
        
        if (!empty($seo_settings['og_description'])) {
            echo '<meta property="og:description" content="' . esc_attr($seo_settings['og_description']) . '">' . "\n";
        }
        
        // Get first scene image for og:image
        $scenes = get_post_meta($post->ID, '_vx_tour_scenes', true);
        if (is_array($scenes) && !empty($scenes)) {
            $first_scene = reset($scenes);
            if (!empty($first_scene['image'])) {
                echo '<meta property="og:image" content="' . esc_url($first_scene['image']) . '">' . "\n";
                echo '<meta property="og:image:width" content="1200">' . "\n";
                echo '<meta property="og:image:height" content="600">' . "\n";
            }
        }
        
        // Twitter Card meta tags
        echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr(get_the_title()) . '">' . "\n";
        
        if (!empty($seo_settings['twitter_description'])) {
            echo '<meta name="twitter:description" content="' . esc_attr($seo_settings['twitter_description']) . '">' . "\n";
        }
        
        // Schema.org structured data
        $this->add_tour_schema();
    }
    
    /**
     * Add structured data for tours.
     * Includes JSON-LD schema for better SEO.
     */
    private function add_tour_schema() {
        global $post;
        
        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'VirtualLocation',
            'name' => get_the_title(),
            'description' => get_the_excerpt() ?: wp_trim_words(get_the_content(), 30),
            'url' => get_permalink(),
            'datePublished' => get_the_date('c'),
            'dateModified' => get_the_modified_date('c')
        ];
        
        // Add images from scenes
        $scenes = get_post_meta($post->ID, '_vx_tour_scenes', true);
        if (is_array($scenes) && !empty($scenes)) {
            $images = [];
            foreach ($scenes as $scene) {
                if (!empty($scene['image'])) {
                    $images[] = $scene['image'];
                }
            }
            if (!empty($images)) {
                $schema['image'] = $images;
            }
        }
        
        echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
    }
    
    /**
     * Filter document title for tour pages.
     * Customizes page title based on tour settings.
     * 
     * @param array $title_parts Title parts array
     * @return array Modified title parts
     */
    public function filter_tour_title($title_parts) {
        if (!is_singular('vx_tour')) {
            return $title_parts;
        }
        
        global $post;
        
        $seo_settings = get_post_meta($post->ID, '_vx_tour_seo', true);
        
        if (!empty($seo_settings['custom_title'])) {
            $title_parts['title'] = $seo_settings['custom_title'];
        }
        
        return $title_parts;
    }
    
    /**
     * Add rewrite rules for embed functionality.
     * Creates clean URLs for tour embeds.
     */
    public function add_embed_rewrite_rules() {
        add_rewrite_rule(
            '^vortex360/embed/([0-9]+)/?$',
            'index.php?vx_embed=1&tour_id=$matches[1]',
            'top'
        );
        
        add_rewrite_tag('%vx_embed%', '([^&]+)');
        add_rewrite_tag('%tour_id%', '([0-9]+)');
    }
    
    /**
     * Handle embed requests.
     * Displays tour in embed mode for iframe embedding.
     */
    public function handle_embed_requests() {
        if (!get_query_var('vx_embed')) {
            return;
        }
        
        $tour_id = intval(get_query_var('tour_id'));
        
        if (!$tour_id) {
            wp_die(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            wp_die(__('Tour not found', 'vortex360-lite'));
        }
        
        // Load embed template
        $this->load_embed_template($tour);
        exit;
    }
    
    /**
     * Load embed template for tour.
     * Displays minimal tour viewer for embedding.
     * 
     * @param WP_Post $tour Tour post object
     */
    private function load_embed_template($tour) {
        $this->current_tour = $tour;
        
        // Check for theme embed template
        $theme_template = locate_template(['vortex360/embed-tour.php']);
        
        if ($theme_template) {
            include $theme_template;
        } else {
            include VX_PLUGIN_PATH . 'public/templates/embed-tour.php';
        }
    }
    
    /**
     * Render tour shortcode.
     * Displays tour viewer via shortcode.
     * 
     * @param array $atts Shortcode attributes
     * @param string $content Shortcode content
     * @return string Rendered tour HTML
     */
    public function render_tour_shortcode($atts, $content = '') {
        $atts = shortcode_atts([
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'autoplay' => 'false',
            'controls' => 'true',
            'scene' => '',
            'class' => ''
        ], $atts, 'vortex360');
        
        $tour_id = intval($atts['id']);
        
        if (!$tour_id) {
            return '<p>' . __('Please specify a tour ID', 'vortex360-lite') . '</p>';
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            return '<p>' . __('Tour not found', 'vortex360-lite') . '</p>';
        }
        
        return $this->render_tour_viewer($tour_id, $atts);
    }
    
    /**
     * Render tour list shortcode.
     * Displays a list of tours with thumbnails.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered tour list HTML
     */
    public function render_tour_list_shortcode($atts) {
        $atts = shortcode_atts([
            'limit' => 10,
            'category' => '',
            'orderby' => 'date',
            'order' => 'DESC',
            'columns' => 3,
            'show_excerpt' => 'true'
        ], $atts, 'vx_tour_list');
        
        $args = [
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => sanitize_text_field($atts['orderby']),
            'order' => sanitize_text_field($atts['order'])
        ];
        
        if (!empty($atts['category'])) {
            $args['tax_query'] = [
                [
                    'taxonomy' => 'vx_tour_category',
                    'field' => 'slug',
                    'terms' => sanitize_text_field($atts['category'])
                ]
            ];
        }
        
        $tours = get_posts($args);
        
        if (empty($tours)) {
            return '<p>' . __('No tours found', 'vortex360-lite') . '</p>';
        }
        
        ob_start();
        ?>
        <div class="vx-tour-list vx-columns-<?php echo intval($atts['columns']); ?>">
            <?php foreach ($tours as $tour): ?>
                <div class="vx-tour-item">
                    <?php
                    $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
                    $thumbnail = '';
                    
                    if (is_array($scenes) && !empty($scenes)) {
                        $first_scene = reset($scenes);
                        $thumbnail = $first_scene['image'] ?? '';
                    }
                    ?>
                    
                    <?php if ($thumbnail): ?>
                        <div class="vx-tour-thumbnail">
                            <a href="<?php echo get_permalink($tour->ID); ?>">
                                <img src="<?php echo esc_url($thumbnail); ?>" alt="<?php echo esc_attr($tour->post_title); ?>">
                            </a>
                        </div>
                    <?php endif; ?>
                    
                    <div class="vx-tour-content">
                        <h3 class="vx-tour-title">
                            <a href="<?php echo get_permalink($tour->ID); ?>">
                                <?php echo esc_html($tour->post_title); ?>
                            </a>
                        </h3>
                        
                        <?php if ($atts['show_excerpt'] === 'true'): ?>
                            <div class="vx-tour-excerpt">
                                <?php echo wp_trim_words($tour->post_excerpt ?: $tour->post_content, 20); ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="vx-tour-meta">
                            <span class="vx-tour-date"><?php echo get_the_date('', $tour->ID); ?></span>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour gallery shortcode.
     * Displays tours in a grid gallery format.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered gallery HTML
     */
    public function render_tour_gallery_shortcode($atts) {
        $atts = shortcode_atts([
            'limit' => 12,
            'category' => '',
            'columns' => 4,
            'size' => 'medium'
        ], $atts, 'vx_tour_gallery');
        
        $args = [
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => intval($atts['limit'])
        ];
        
        if (!empty($atts['category'])) {
            $args['tax_query'] = [
                [
                    'taxonomy' => 'vx_tour_category',
                    'field' => 'slug',
                    'terms' => sanitize_text_field($atts['category'])
                ]
            ];
        }
        
        $tours = get_posts($args);
        
        if (empty($tours)) {
            return '<p>' . __('No tours found', 'vortex360-lite') . '</p>';
        }
        
        ob_start();
        ?>
        <div class="vx-tour-gallery vx-columns-<?php echo intval($atts['columns']); ?>">
            <?php foreach ($tours as $tour): ?>
                <?php
                $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
                $thumbnail = '';
                
                if (is_array($scenes) && !empty($scenes)) {
                    $first_scene = reset($scenes);
                    $thumbnail = $first_scene['image'] ?? '';
                }
                ?>
                
                <div class="vx-gallery-item">
                    <a href="<?php echo get_permalink($tour->ID); ?>" class="vx-gallery-link">
                        <?php if ($thumbnail): ?>
                            <img src="<?php echo esc_url($thumbnail); ?>" alt="<?php echo esc_attr($tour->post_title); ?>">
                        <?php else: ?>
                            <div class="vx-no-image">
                                <span><?php _e('No Image', 'vortex360-lite'); ?></span>
                            </div>
                        <?php endif; ?>
                        
                        <div class="vx-gallery-overlay">
                            <h4><?php echo esc_html($tour->post_title); ?></h4>
                        </div>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour viewer HTML.
     * Generates the main tour viewer interface.
     * 
     * @param int $tour_id Tour post ID
     * @param array $options Display options
     * @return string Rendered HTML
     */
    public function render_tour_viewer($tour_id, $options = []) {
        $tour = get_post($tour_id);
        
        if (!$tour) {
            return '<p>' . __('Tour not found', 'vortex360-lite') . '</p>';
        }
        
        $defaults = [
            'width' => '100%',
            'height' => '400px',
            'autoplay' => 'false',
            'controls' => 'true',
            'scene' => '',
            'class' => ''
        ];
        
        $options = wp_parse_args($options, $defaults);
        
        $tour_data = $this->get_tour_data($tour_id);
        
        if (empty($tour_data['scenes'])) {
            return '<p>' . __('No scenes available for this tour', 'vortex360-lite') . '</p>';
        }
        
        $viewer_id = 'vx-tour-viewer-' . $tour_id . '-' . uniqid();
        
        ob_start();
        ?>
        <div class="vx-tour-container <?php echo esc_attr($options['class']); ?>" 
             style="width: <?php echo esc_attr($options['width']); ?>; height: <?php echo esc_attr($options['height']); ?>;">
            
            <div id="<?php echo esc_attr($viewer_id); ?>" class="vx-tour-viewer" 
                 data-tour-id="<?php echo esc_attr($tour_id); ?>"
                 data-autoplay="<?php echo esc_attr($options['autoplay']); ?>"
                 data-controls="<?php echo esc_attr($options['controls']); ?>"
                 data-initial-scene="<?php echo esc_attr($options['scene']); ?>">
                
                <!-- Loading indicator -->
                <div class="vx-loading">
                    <div class="vx-spinner"></div>
                    <p><?php _e('Loading tour...', 'vortex360-lite'); ?></p>
                </div>
                
                <!-- Tour canvas -->
                <canvas class="vx-tour-canvas"></canvas>
                
                <!-- Tour controls -->
                <?php if ($options['controls'] === 'true'): ?>
                    <div class="vx-tour-controls">
                        <div class="vx-controls-left">
                            <button class="vx-btn vx-btn-scene-prev" title="<?php esc_attr_e('Previous Scene', 'vortex360-lite'); ?>">
                                <span class="vx-icon-prev"></span>
                            </button>
                            <button class="vx-btn vx-btn-scene-next" title="<?php esc_attr_e('Next Scene', 'vortex360-lite'); ?>">
                                <span class="vx-icon-next"></span>
                            </button>
                        </div>
                        
                        <div class="vx-controls-center">
                            <div class="vx-scene-info">
                                <span class="vx-scene-title"></span>
                                <span class="vx-scene-counter"></span>
                            </div>
                        </div>
                        
                        <div class="vx-controls-right">
                            <button class="vx-btn vx-btn-autorotate" title="<?php esc_attr_e('Auto Rotate', 'vortex360-lite'); ?>">
                                <span class="vx-icon-rotate"></span>
                            </button>
                            <button class="vx-btn vx-btn-reset" title="<?php esc_attr_e('Reset View', 'vortex360-lite'); ?>">
                                <span class="vx-icon-reset"></span>
                            </button>
                            <button class="vx-btn vx-btn-fullscreen" title="<?php esc_attr_e('Fullscreen', 'vortex360-lite'); ?>">
                                <span class="vx-icon-fullscreen"></span>
                            </button>
                        </div>
                    </div>
                <?php endif; ?>
                
                <!-- Scene navigation -->
                <div class="vx-scene-nav">
                    <?php foreach ($tour_data['scenes'] as $scene_id => $scene): ?>
                        <button class="vx-scene-btn" 
                                data-scene-id="<?php echo esc_attr($scene_id); ?>"
                                title="<?php echo esc_attr($scene['title'] ?? ''); ?>">
                            <?php if (!empty($scene['thumbnail'])): ?>
                                <img src="<?php echo esc_url($scene['thumbnail']); ?>" alt="<?php echo esc_attr($scene['title'] ?? ''); ?>">
                            <?php endif; ?>
                            <span><?php echo esc_html($scene['title'] ?? __('Scene', 'vortex360-lite') . ' ' . ($scene_id + 1)); ?></span>
                        </button>
                    <?php endforeach; ?>
                </div>
                
                <!-- Hotspot info panel -->
                <div class="vx-hotspot-panel" style="display: none;">
                    <div class="vx-panel-header">
                        <h4 class="vx-panel-title"></h4>
                        <button class="vx-panel-close">&times;</button>
                    </div>
                    <div class="vx-panel-content"></div>
                </div>
            </div>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Initialize tour viewer for this instance
            if (typeof VXTourViewer !== 'undefined') {
                new VXTourViewer('<?php echo esc_js($viewer_id); ?>', <?php echo wp_json_encode($tour_data); ?>);
            }
        });
        </script>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Get tour data for frontend display.
     * Retrieves and formats tour data for JavaScript consumption.
     * 
     * @param int $tour_id Tour post ID
     * @return array Tour data array
     */
    public function get_tour_data($tour_id) {
        $tour = get_post($tour_id);
        
        if (!$tour) {
            return [];
        }
        
        // Get cached data if available
        $cache_key = 'vx_tour_data_' . $tour_id . '_' . get_post_modified_time('U', false, $tour);
        $cached_data = wp_cache_get($cache_key, 'vortex360');
        
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        $scenes = get_post_meta($tour_id, '_vx_tour_scenes', true) ?: [];
        $settings = get_post_meta($tour_id, '_vx_tour_settings', true) ?: [];
        $hotspots = get_post_meta($tour_id, '_vx_tour_hotspots', true) ?: [];
        
        $tour_data = [
            'id' => $tour_id,
            'title' => $tour->post_title,
            'description' => $tour->post_content,
            'scenes' => [],
            'settings' => $settings,
            'hotspots' => $hotspots
        ];
        
        // Process scenes
        foreach ($scenes as $scene_id => $scene) {
            $scene_data = [
                'id' => $scene_id,
                'title' => $scene['title'] ?? '',
                'description' => $scene['description'] ?? '',
                'image' => $scene['image'] ?? '',
                'thumbnail' => $this->get_scene_thumbnail($scene['image'] ?? ''),
                'hotspots' => $scene['hotspots'] ?? [],
                'settings' => $scene['settings'] ?? []
            ];
            
            $tour_data['scenes'][$scene_id] = $scene_data;
        }
        
        // Cache the data
        wp_cache_set($cache_key, $tour_data, 'vortex360', HOUR_IN_SECONDS);
        
        return $tour_data;
    }
    
    /**
     * Get scene thumbnail URL.
     * Returns thumbnail for scene image or generates one.
     * 
     * @param string $image_url Scene image URL
     * @return string Thumbnail URL
     */
    private function get_scene_thumbnail($image_url) {
        if (empty($image_url)) {
            return '';
        }
        
        $attachment_id = attachment_url_to_postid($image_url);
        
        if ($attachment_id) {
            $thumbnail = wp_get_attachment_image_src($attachment_id, 'thumbnail');
            return $thumbnail ? $thumbnail[0] : $image_url;
        }
        
        return $image_url;
    }
    
    /**
     * Get global plugin settings.
     * Returns settings for JavaScript consumption.
     * 
     * @return array Global settings
     */
    private function get_global_settings() {
        return [
            'autoRotateSpeed' => get_option('vx_auto_rotate_speed', 2),
            'mouseWheelSpeed' => get_option('vx_mouse_wheel_speed', 1),
            'touchSensitivity' => get_option('vx_touch_sensitivity', 1),
            'enableGyroscope' => get_option('vx_enable_gyroscope', false),
            'enableVR' => false, // Pro feature
            'enableAudio' => false, // Pro feature
            'hotspotStyle' => get_option('vx_hotspot_style', 'default'),
            'loadingAnimation' => get_option('vx_loading_animation', 'spinner')
        ];
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for getting tour data.
     * Returns tour data for dynamic loading.
     */
    public function ajax_get_tour_data() {
        check_ajax_referer('vx_public_nonce', 'nonce');
        
        $tour_id = intval($_POST['tour_id'] ?? 0);
        
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            wp_send_json_error(__('Tour not found', 'vortex360-lite'));
        }
        
        $tour_data = $this->get_tour_data($tour_id);
        
        wp_send_json_success($tour_data);
    }
    
    /**
     * AJAX handler for tracking tour views.
     * Records tour view statistics.
     */
    public function ajax_track_tour_view() {
        check_ajax_referer('vx_public_nonce', 'nonce');
        
        $tour_id = intval($_POST['tour_id'] ?? 0);
        
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        // Update view count
        $current_views = get_post_meta($tour_id, '_vx_tour_views', true) ?: 0;
        update_post_meta($tour_id, '_vx_tour_views', $current_views + 1);
        
        // Track daily views
        $today = date('Y-m-d');
        $daily_views = get_post_meta($tour_id, '_vx_tour_views_' . $today, true) ?: 0;
        update_post_meta($tour_id, '_vx_tour_views_' . $today, $daily_views + 1);
        
        wp_send_json_success([
            'total_views' => $current_views + 1,
            'daily_views' => $daily_views + 1
        ]);
    }
    
    /**
     * Register REST API routes.
     * Creates API endpoints for tour data access.
     */
    public function register_rest_routes() {
        register_rest_route('vortex360/v1', '/tours', [
            'methods' => 'GET',
            'callback' => [$this, 'rest_get_tours'],
            'permission_callback' => '__return_true'
        ]);
        
        register_rest_route('vortex360/v1', '/tours/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'rest_get_tour'],
            'permission_callback' => '__return_true',
            'args' => [
                'id' => [
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);
    }
    
    /**
     * REST API callback for getting tours list.
     * Returns list of published tours.
     * 
     * @param WP_REST_Request $request REST request object
     * @return WP_REST_Response REST response
     */
    public function rest_get_tours($request) {
        $per_page = $request->get_param('per_page') ?: 10;
        $page = $request->get_param('page') ?: 1;
        
        $args = [
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => min($per_page, 100),
            'paged' => $page
        ];
        
        $tours = get_posts($args);
        $data = [];
        
        foreach ($tours as $tour) {
            $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true) ?: [];
            $thumbnail = '';
            
            if (!empty($scenes)) {
                $first_scene = reset($scenes);
                $thumbnail = $first_scene['image'] ?? '';
            }
            
            $data[] = [
                'id' => $tour->ID,
                'title' => $tour->post_title,
                'excerpt' => $tour->post_excerpt,
                'date' => $tour->post_date,
                'link' => get_permalink($tour->ID),
                'thumbnail' => $thumbnail,
                'scene_count' => count($scenes)
            ];
        }
        
        return rest_ensure_response($data);
    }
    
    /**
     * REST API callback for getting single tour.
     * Returns detailed tour data.
     * 
     * @param WP_REST_Request $request REST request object
     * @return WP_REST_Response REST response
     */
    public function rest_get_tour($request) {
        $tour_id = $request->get_param('id');
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            return new WP_Error('tour_not_found', __('Tour not found', 'vortex360-lite'), ['status' => 404]);
        }
        
        $tour_data = $this->get_tour_data($tour_id);
        
        return rest_ensure_response($tour_data);
    }
    
    /**
     * Add tour-specific body classes.
     * Adds CSS classes for styling tour pages.
     * 
     * @param array $classes Existing body classes
     * @return array Modified body classes
     */
    public function add_tour_body_classes($classes) {
        if (is_singular('vx_tour')) {
            $classes[] = 'vortex360-tour';
            $classes[] = 'vx-tour-single';
            
            global $post;
            $classes[] = 'vx-tour-' . $post->ID;
        }
        
        if (get_query_var('vx_embed')) {
            $classes[] = 'vortex360-embed';
            $classes[] = 'vx-tour-embed';
        }
        
        return $classes;
    }
    
    /**
     * Add oEmbed support for tours.
     * Allows tours to be embedded via oEmbed protocol.
     */
    public function add_oembed_support() {
        // Register oEmbed provider for tour embeds
        wp_oembed_add_provider(
            '#https?://[^/]+/vortex360/embed/([0-9]+)/?#i',
            home_url('/wp-json/oembed/1.0/embed'),
            true
        );
        
        // Add oEmbed discovery links
        add_action('wp_head', function() {
            if (is_singular('vx_tour')) {
                global $post;
                $embed_url = home_url('/vortex360/embed/' . $post->ID);
                echo '<link rel="alternate" type="application/json+oembed" href="' . esc_url(get_oembed_endpoint_url($embed_url)) . '" />' . "\n";
            }
        });
    }
}

// Initialize the public display class
new VX_Public_Display();