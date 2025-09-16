<?php
/**
 * Vortex360 Lite - Public Shortcodes Handler
 * 
 * Manages all shortcode functionality for tour display and embedding
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public shortcodes class.
 * Handles registration and rendering of all plugin shortcodes.
 */
class VX_Public_Shortcodes {
    
    /**
     * Registered shortcodes.
     * @var array
     */
    private $shortcodes = [];
    
    /**
     * Initialize shortcode functionality.
     * Registers all available shortcodes.
     */
    public function __construct() {
        $this->register_shortcodes();
        add_action('init', [$this, 'init_shortcode_detection']);
    }
    
    /**
     * Register all plugin shortcodes.
     * Sets up shortcode handlers and attributes.
     */
    private function register_shortcodes() {
        // Main tour display shortcode
        $this->add_shortcode('vortex360', [$this, 'render_tour_shortcode'], [
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'autoplay' => 'false',
            'controls' => 'true',
            'scene' => '',
            'class' => '',
            'style' => ''
        ]);
        
        // Alternative tour shortcode
        $this->add_shortcode('vx_tour', [$this, 'render_tour_shortcode'], [
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'autoplay' => 'false',
            'controls' => 'true',
            'scene' => '',
            'class' => '',
            'style' => ''
        ]);
        
        // Tour list shortcode
        $this->add_shortcode('vx_tour_list', [$this, 'render_tour_list_shortcode'], [
            'limit' => 10,
            'category' => '',
            'tag' => '',
            'orderby' => 'date',
            'order' => 'DESC',
            'columns' => 3,
            'show_excerpt' => 'true',
            'show_date' => 'true',
            'show_author' => 'false',
            'excerpt_length' => 20,
            'class' => ''
        ]);
        
        // Tour gallery shortcode
        $this->add_shortcode('vx_tour_gallery', [$this, 'render_tour_gallery_shortcode'], [
            'limit' => 12,
            'category' => '',
            'tag' => '',
            'columns' => 4,
            'size' => 'medium',
            'show_title' => 'true',
            'lightbox' => 'false',
            'class' => ''
        ]);
        
        // Tour carousel shortcode
        $this->add_shortcode('vx_tour_carousel', [$this, 'render_tour_carousel_shortcode'], [
            'limit' => 8,
            'category' => '',
            'autoplay' => 'true',
            'speed' => 3000,
            'show_dots' => 'true',
            'show_arrows' => 'true',
            'class' => ''
        ]);
        
        // Tour search shortcode
        $this->add_shortcode('vx_tour_search', [$this, 'render_tour_search_shortcode'], [
            'placeholder' => '',
            'button_text' => '',
            'show_categories' => 'true',
            'show_tags' => 'false',
            'results_page' => '',
            'class' => ''
        ]);
        
        // Tour categories shortcode
        $this->add_shortcode('vx_tour_categories', [$this, 'render_tour_categories_shortcode'], [
            'show_count' => 'true',
            'hide_empty' => 'true',
            'orderby' => 'name',
            'order' => 'ASC',
            'style' => 'list',
            'class' => ''
        ]);
        
        // Tour embed shortcode
        $this->add_shortcode('vx_tour_embed', [$this, 'render_tour_embed_shortcode'], [
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'responsive' => 'true',
            'class' => ''
        ]);
    }
    
    /**
     * Add a shortcode with default attributes.
     * Registers shortcode and stores configuration.
     * 
     * @param string $tag Shortcode tag
     * @param callable $callback Shortcode callback
     * @param array $defaults Default attributes
     */
    private function add_shortcode($tag, $callback, $defaults = []) {
        add_shortcode($tag, $callback);
        
        $this->shortcodes[$tag] = [
            'callback' => $callback,
            'defaults' => $defaults
        ];
    }
    
    /**
     * Initialize shortcode detection for asset loading.
     * Sets up content scanning for shortcode presence.
     */
    public function init_shortcode_detection() {
        add_filter('the_posts', [$this, 'detect_shortcodes_in_posts']);
    }
    
    /**
     * Detect shortcodes in post content.
     * Scans posts for plugin shortcodes to determine asset loading.
     * 
     * @param array $posts Array of post objects
     * @return array Unmodified posts array
     */
    public function detect_shortcodes_in_posts($posts) {
        if (empty($posts) || is_admin()) {
            return $posts;
        }
        
        $found_shortcode = false;
        
        foreach ($posts as $post) {
            foreach (array_keys($this->shortcodes) as $shortcode) {
                if (has_shortcode($post->post_content, $shortcode)) {
                    $found_shortcode = true;
                    break 2;
                }
            }
        }
        
        if ($found_shortcode) {
            add_action('wp_enqueue_scripts', [$this, 'enqueue_shortcode_assets']);
        }
        
        return $posts;
    }
    
    /**
     * Enqueue assets for shortcode functionality.
     * Loads CSS and JavaScript needed for shortcodes.
     */
    public function enqueue_shortcode_assets() {
        // Shortcode-specific styles
        wp_enqueue_style(
            'vx-shortcodes',
            VX_PLUGIN_URL . 'assets/css/shortcodes.css',
            [],
            VX_VERSION
        );
        
        // Shortcode JavaScript
        wp_enqueue_script(
            'vx-shortcodes',
            VX_PLUGIN_URL . 'assets/js/shortcodes.js',
            ['jquery'],
            VX_VERSION,
            true
        );
        
        // Localize shortcode script
        wp_localize_script('vx-shortcodes', 'vxShortcodes', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_shortcode_nonce'),
            'strings' => [
                'loading' => __('Loading...', 'vortex360-lite'),
                'error' => __('Error loading content', 'vortex360-lite'),
                'noResults' => __('No tours found', 'vortex360-lite'),
                'loadMore' => __('Load More', 'vortex360-lite')
            ]
        ]);
    }
    
    /**
     * Render tour display shortcode.
     * Main shortcode for displaying individual tours.
     * 
     * @param array $atts Shortcode attributes
     * @param string $content Shortcode content
     * @return string Rendered HTML
     */
    public function render_tour_shortcode($atts, $content = '') {
        $atts = shortcode_atts($this->shortcodes['vortex360']['defaults'], $atts, 'vortex360');
        
        $tour_id = intval($atts['id']);
        
        if (!$tour_id) {
            return $this->render_error(__('Please specify a tour ID', 'vortex360-lite'));
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            return $this->render_error(__('Tour not found or not published', 'vortex360-lite'));
        }
        
        // Check if user has permission to view tour
        if (!$this->can_user_view_tour($tour_id)) {
            return $this->render_error(__('You do not have permission to view this tour', 'vortex360-lite'));
        }
        
        return $this->render_tour_viewer($tour_id, $atts);
    }
    
    /**
     * Render tour list shortcode.
     * Displays a list of tours with thumbnails and metadata.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render_tour_list_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_list']['defaults'], $atts, 'vx_tour_list');
        
        $args = [
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => intval($atts['limit']),
            'orderby' => sanitize_text_field($atts['orderby']),
            'order' => sanitize_text_field($atts['order'])
        ];
        
        // Add taxonomy filters
        $tax_query = [];
        
        if (!empty($atts['category'])) {
            $tax_query[] = [
                'taxonomy' => 'vx_tour_category',
                'field' => 'slug',
                'terms' => array_map('trim', explode(',', $atts['category']))
            ];
        }
        
        if (!empty($atts['tag'])) {
            $tax_query[] = [
                'taxonomy' => 'vx_tour_tag',
                'field' => 'slug',
                'terms' => array_map('trim', explode(',', $atts['tag']))
            ];
        }
        
        if (!empty($tax_query)) {
            $args['tax_query'] = $tax_query;
            if (count($tax_query) > 1) {
                $args['tax_query']['relation'] = 'AND';
            }
        }
        
        $tours = get_posts($args);
        
        if (empty($tours)) {
            return '<div class="vx-no-tours">' . __('No tours found', 'vortex360-lite') . '</div>';
        }
        
        ob_start();
        ?>
        <div class="vx-tour-list vx-columns-<?php echo intval($atts['columns']); ?> <?php echo esc_attr($atts['class']); ?>">
            <?php foreach ($tours as $tour): ?>
                <div class="vx-tour-item" data-tour-id="<?php echo $tour->ID; ?>">
                    <?php
                    $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
                    $thumbnail = $this->get_tour_thumbnail($tour->ID, $scenes);
                    $categories = get_the_terms($tour->ID, 'vx_tour_category');
                    ?>
                    
                    <?php if ($thumbnail): ?>
                        <div class="vx-tour-thumbnail">
                            <a href="<?php echo get_permalink($tour->ID); ?>" class="vx-tour-link">
                                <img src="<?php echo esc_url($thumbnail); ?>" 
                                     alt="<?php echo esc_attr($tour->post_title); ?>"
                                     loading="lazy">
                                <div class="vx-tour-overlay">
                                    <span class="vx-play-icon"></span>
                                </div>
                            </a>
                        </div>
                    <?php endif; ?>
                    
                    <div class="vx-tour-content">
                        <h3 class="vx-tour-title">
                            <a href="<?php echo get_permalink($tour->ID); ?>">
                                <?php echo esc_html($tour->post_title); ?>
                            </a>
                        </h3>
                        
                        <?php if ($categories && !is_wp_error($categories)): ?>
                            <div class="vx-tour-categories">
                                <?php foreach ($categories as $category): ?>
                                    <span class="vx-category-tag"><?php echo esc_html($category->name); ?></span>
                                <?php endforeach; ?>
                            </div>
                        <?php endif; ?>
                        
                        <?php if ($atts['show_excerpt'] === 'true'): ?>
                            <div class="vx-tour-excerpt">
                                <?php 
                                $excerpt = $tour->post_excerpt ?: $tour->post_content;
                                echo wp_trim_words($excerpt, intval($atts['excerpt_length']));
                                ?>
                            </div>
                        <?php endif; ?>
                        
                        <div class="vx-tour-meta">
                            <?php if ($atts['show_date'] === 'true'): ?>
                                <span class="vx-tour-date">
                                    <i class="vx-icon-calendar"></i>
                                    <?php echo get_the_date('', $tour->ID); ?>
                                </span>
                            <?php endif; ?>
                            
                            <?php if ($atts['show_author'] === 'true'): ?>
                                <span class="vx-tour-author">
                                    <i class="vx-icon-user"></i>
                                    <?php echo get_the_author_meta('display_name', $tour->post_author); ?>
                                </span>
                            <?php endif; ?>
                            
                            <span class="vx-tour-scenes">
                                <i class="vx-icon-scenes"></i>
                                <?php 
                                $scene_count = is_array($scenes) ? count($scenes) : 0;
                                printf(_n('%d Scene', '%d Scenes', $scene_count, 'vortex360-lite'), $scene_count);
                                ?>
                            </span>
                        </div>
                        
                        <div class="vx-tour-actions">
                            <a href="<?php echo get_permalink($tour->ID); ?>" class="vx-btn vx-btn-primary">
                                <?php _e('View Tour', 'vortex360-lite'); ?>
                            </a>
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
     * @return string Rendered HTML
     */
    public function render_tour_gallery_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_gallery']['defaults'], $atts, 'vx_tour_gallery');
        
        $args = [
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => intval($atts['limit'])
        ];
        
        // Add taxonomy filters
        $tax_query = [];
        
        if (!empty($atts['category'])) {
            $tax_query[] = [
                'taxonomy' => 'vx_tour_category',
                'field' => 'slug',
                'terms' => array_map('trim', explode(',', $atts['category']))
            ];
        }
        
        if (!empty($atts['tag'])) {
            $tax_query[] = [
                'taxonomy' => 'vx_tour_tag',
                'field' => 'slug',
                'terms' => array_map('trim', explode(',', $atts['tag']))
            ];
        }
        
        if (!empty($tax_query)) {
            $args['tax_query'] = $tax_query;
        }
        
        $tours = get_posts($args);
        
        if (empty($tours)) {
            return '<div class="vx-no-tours">' . __('No tours found', 'vortex360-lite') . '</div>';
        }
        
        $gallery_id = 'vx-gallery-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($gallery_id); ?>" class="vx-tour-gallery vx-columns-<?php echo intval($atts['columns']); ?> <?php echo esc_attr($atts['class']); ?>">
            <?php foreach ($tours as $tour): ?>
                <?php
                $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
                $thumbnail = $this->get_tour_thumbnail($tour->ID, $scenes);
                ?>
                
                <div class="vx-gallery-item" data-tour-id="<?php echo $tour->ID; ?>">
                    <?php if ($atts['lightbox'] === 'true'): ?>
                        <a href="<?php echo get_permalink($tour->ID); ?>" 
                           class="vx-gallery-link vx-lightbox-trigger"
                           data-tour-id="<?php echo $tour->ID; ?>"
                           data-title="<?php echo esc_attr($tour->post_title); ?>">
                    <?php else: ?>
                        <a href="<?php echo get_permalink($tour->ID); ?>" class="vx-gallery-link">
                    <?php endif; ?>
                    
                        <div class="vx-gallery-image">
                            <?php if ($thumbnail): ?>
                                <img src="<?php echo esc_url($thumbnail); ?>" 
                                     alt="<?php echo esc_attr($tour->post_title); ?>"
                                     loading="lazy">
                            <?php else: ?>
                                <div class="vx-no-image">
                                    <i class="vx-icon-image"></i>
                                    <span><?php _e('No Image', 'vortex360-lite'); ?></span>
                                </div>
                            <?php endif; ?>
                            
                            <div class="vx-gallery-overlay">
                                <div class="vx-overlay-content">
                                    <i class="vx-icon-play"></i>
                                    <?php if ($atts['show_title'] === 'true'): ?>
                                        <h4><?php echo esc_html($tour->post_title); ?></h4>
                                    <?php endif; ?>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            <?php endforeach; ?>
        </div>
        
        <?php if ($atts['lightbox'] === 'true'): ?>
            <script type="text/javascript">
            jQuery(document).ready(function($) {
                $('#<?php echo esc_js($gallery_id); ?> .vx-lightbox-trigger').on('click', function(e) {
                    e.preventDefault();
                    var tourId = $(this).data('tour-id');
                    var title = $(this).data('title');
                    // Initialize lightbox with tour viewer
                    VXShortcodes.openTourLightbox(tourId, title);
                });
            });
            </script>
        <?php endif; ?>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour carousel shortcode.
     * Displays tours in a carousel/slider format.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render_tour_carousel_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_carousel']['defaults'], $atts, 'vx_tour_carousel');
        
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
                    'terms' => array_map('trim', explode(',', $atts['category']))
                ]
            ];
        }
        
        $tours = get_posts($args);
        
        if (empty($tours)) {
            return '<div class="vx-no-tours">' . __('No tours found', 'vortex360-lite') . '</div>';
        }
        
        $carousel_id = 'vx-carousel-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($carousel_id); ?>" 
             class="vx-tour-carousel <?php echo esc_attr($atts['class']); ?>"
             data-autoplay="<?php echo esc_attr($atts['autoplay']); ?>"
             data-speed="<?php echo esc_attr($atts['speed']); ?>">
            
            <div class="vx-carousel-container">
                <div class="vx-carousel-track">
                    <?php foreach ($tours as $tour): ?>
                        <?php
                        $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
                        $thumbnail = $this->get_tour_thumbnail($tour->ID, $scenes);
                        ?>
                        
                        <div class="vx-carousel-slide" data-tour-id="<?php echo $tour->ID; ?>">
                            <div class="vx-slide-content">
                                <?php if ($thumbnail): ?>
                                    <div class="vx-slide-image">
                                        <img src="<?php echo esc_url($thumbnail); ?>" 
                                             alt="<?php echo esc_attr($tour->post_title); ?>"
                                             loading="lazy">
                                    </div>
                                <?php endif; ?>
                                
                                <div class="vx-slide-info">
                                    <h3 class="vx-slide-title">
                                        <a href="<?php echo get_permalink($tour->ID); ?>">
                                            <?php echo esc_html($tour->post_title); ?>
                                        </a>
                                    </h3>
                                    
                                    <div class="vx-slide-excerpt">
                                        <?php echo wp_trim_words($tour->post_excerpt ?: $tour->post_content, 15); ?>
                                    </div>
                                    
                                    <div class="vx-slide-actions">
                                        <a href="<?php echo get_permalink($tour->ID); ?>" class="vx-btn vx-btn-primary">
                                            <?php _e('Explore Tour', 'vortex360-lite'); ?>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
            
            <?php if ($atts['show_arrows'] === 'true'): ?>
                <div class="vx-carousel-controls">
                    <button class="vx-carousel-prev" aria-label="<?php esc_attr_e('Previous', 'vortex360-lite'); ?>">
                        <i class="vx-icon-prev"></i>
                    </button>
                    <button class="vx-carousel-next" aria-label="<?php esc_attr_e('Next', 'vortex360-lite'); ?>">
                        <i class="vx-icon-next"></i>
                    </button>
                </div>
            <?php endif; ?>
            
            <?php if ($atts['show_dots'] === 'true'): ?>
                <div class="vx-carousel-dots">
                    <?php for ($i = 0; $i < count($tours); $i++): ?>
                        <button class="vx-carousel-dot <?php echo $i === 0 ? 'active' : ''; ?>" 
                                data-slide="<?php echo $i; ?>"
                                aria-label="<?php printf(esc_attr__('Go to slide %d', 'vortex360-lite'), $i + 1); ?>">
                        </button>
                    <?php endfor; ?>
                </div>
            <?php endif; ?>
        </div>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            if (typeof VXCarousel !== 'undefined') {
                new VXCarousel('#<?php echo esc_js($carousel_id); ?>');
            }
        });
        </script>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour search shortcode.
     * Displays a search form for tours.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render_tour_search_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_search']['defaults'], $atts, 'vx_tour_search');
        
        $placeholder = $atts['placeholder'] ?: __('Search tours...', 'vortex360-lite');
        $button_text = $atts['button_text'] ?: __('Search', 'vortex360-lite');
        $results_page = $atts['results_page'] ?: home_url('/');
        
        $search_id = 'vx-search-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($search_id); ?>" class="vx-tour-search <?php echo esc_attr($atts['class']); ?>">
            <form class="vx-search-form" method="get" action="<?php echo esc_url($results_page); ?>">
                <div class="vx-search-fields">
                    <div class="vx-search-input-group">
                        <input type="text" 
                               name="vx_search" 
                               class="vx-search-input"
                               placeholder="<?php echo esc_attr($placeholder); ?>"
                               value="<?php echo esc_attr(get_query_var('vx_search')); ?>">
                        <button type="submit" class="vx-search-button">
                            <i class="vx-icon-search"></i>
                            <span><?php echo esc_html($button_text); ?></span>
                        </button>
                    </div>
                    
                    <?php if ($atts['show_categories'] === 'true'): ?>
                        <div class="vx-search-filter">
                            <?php
                            $categories = get_terms([
                                'taxonomy' => 'vx_tour_category',
                                'hide_empty' => true
                            ]);
                            
                            if (!empty($categories) && !is_wp_error($categories)):
                            ?>
                                <select name="vx_category" class="vx-search-select">
                                    <option value=""><?php _e('All Categories', 'vortex360-lite'); ?></option>
                                    <?php foreach ($categories as $category): ?>
                                        <option value="<?php echo esc_attr($category->slug); ?>"
                                                <?php selected(get_query_var('vx_category'), $category->slug); ?>>
                                            <?php echo esc_html($category->name); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                    
                    <?php if ($atts['show_tags'] === 'true'): ?>
                        <div class="vx-search-filter">
                            <?php
                            $tags = get_terms([
                                'taxonomy' => 'vx_tour_tag',
                                'hide_empty' => true
                            ]);
                            
                            if (!empty($tags) && !is_wp_error($tags)):
                            ?>
                                <select name="vx_tag" class="vx-search-select">
                                    <option value=""><?php _e('All Tags', 'vortex360-lite'); ?></option>
                                    <?php foreach ($tags as $tag): ?>
                                        <option value="<?php echo esc_attr($tag->slug); ?>"
                                                <?php selected(get_query_var('vx_tag'), $tag->slug); ?>>
                                            <?php echo esc_html($tag->name); ?>
                                        </option>
                                    <?php endforeach; ?>
                                </select>
                            <?php endif; ?>
                        </div>
                    <?php endif; ?>
                </div>
                
                <input type="hidden" name="post_type" value="vx_tour">
            </form>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour categories shortcode.
     * Displays a list of tour categories.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render_tour_categories_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_categories']['defaults'], $atts, 'vx_tour_categories');
        
        $args = [
            'taxonomy' => 'vx_tour_category',
            'hide_empty' => $atts['hide_empty'] === 'true',
            'orderby' => sanitize_text_field($atts['orderby']),
            'order' => sanitize_text_field($atts['order'])
        ];
        
        $categories = get_terms($args);
        
        if (empty($categories) || is_wp_error($categories)) {
            return '<div class="vx-no-categories">' . __('No categories found', 'vortex360-lite') . '</div>';
        }
        
        ob_start();
        ?>
        <div class="vx-tour-categories vx-style-<?php echo esc_attr($atts['style']); ?> <?php echo esc_attr($atts['class']); ?>">
            <?php if ($atts['style'] === 'list'): ?>
                <ul class="vx-categories-list">
                    <?php foreach ($categories as $category): ?>
                        <li class="vx-category-item">
                            <a href="<?php echo get_term_link($category); ?>" class="vx-category-link">
                                <?php echo esc_html($category->name); ?>
                                <?php if ($atts['show_count'] === 'true'): ?>
                                    <span class="vx-category-count">(<?php echo $category->count; ?>)</span>
                                <?php endif; ?>
                            </a>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php else: // Grid style ?>
                <div class="vx-categories-grid">
                    <?php foreach ($categories as $category): ?>
                        <div class="vx-category-card">
                            <a href="<?php echo get_term_link($category); ?>" class="vx-category-link">
                                <h3 class="vx-category-name"><?php echo esc_html($category->name); ?></h3>
                                <?php if (!empty($category->description)): ?>
                                    <p class="vx-category-description"><?php echo esc_html($category->description); ?></p>
                                <?php endif; ?>
                                <?php if ($atts['show_count'] === 'true'): ?>
                                    <span class="vx-category-count">
                                        <?php printf(_n('%d Tour', '%d Tours', $category->count, 'vortex360-lite'), $category->count); ?>
                                    </span>
                                <?php endif; ?>
                            </a>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render tour embed shortcode.
     * Creates an embeddable tour viewer.
     * 
     * @param array $atts Shortcode attributes
     * @return string Rendered HTML
     */
    public function render_tour_embed_shortcode($atts) {
        $atts = shortcode_atts($this->shortcodes['vx_tour_embed']['defaults'], $atts, 'vx_tour_embed');
        
        $tour_id = intval($atts['id']);
        
        if (!$tour_id) {
            return $this->render_error(__('Please specify a tour ID', 'vortex360-lite'));
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            return $this->render_error(__('Tour not found', 'vortex360-lite'));
        }
        
        $embed_url = home_url('/vortex360/embed/' . $tour_id);
        $embed_id = 'vx-embed-' . uniqid();
        
        ob_start();
        ?>
        <div id="<?php echo esc_attr($embed_id); ?>" 
             class="vx-tour-embed <?php echo esc_attr($atts['class']); ?>"
             style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;">
            
            <?php if ($atts['responsive'] === 'true'): ?>
                <div class="vx-embed-responsive">
                    <iframe src="<?php echo esc_url($embed_url); ?>"
                            width="100%"
                            height="100%"
                            frameborder="0"
                            allowfullscreen
                            title="<?php echo esc_attr($tour->post_title); ?>">
                    </iframe>
                </div>
            <?php else: ?>
                <iframe src="<?php echo esc_url($embed_url); ?>"
                        width="<?php echo esc_attr($atts['width']); ?>"
                        height="<?php echo esc_attr($atts['height']); ?>"
                        frameborder="0"
                        allowfullscreen
                        title="<?php echo esc_attr($tour->post_title); ?>">
                </iframe>
            <?php endif; ?>
        </div>
        <?php
        
        return ob_get_clean();
    }
    
    // Helper Methods
    
    /**
     * Render tour viewer HTML.
     * Generates the main tour viewer interface for shortcodes.
     * 
     * @param int $tour_id Tour post ID
     * @param array $options Display options
     * @return string Rendered HTML
     */
    private function render_tour_viewer($tour_id, $options = []) {
        // Use the main display class for rendering
        if (class_exists('VX_Public_Display')) {
            $display = new VX_Public_Display();
            return $display->render_tour_viewer($tour_id, $options);
        }
        
        return $this->render_error(__('Tour viewer not available', 'vortex360-lite'));
    }
    
    /**
     * Get tour thumbnail image.
     * Returns the first scene image as thumbnail.
     * 
     * @param int $tour_id Tour post ID
     * @param array $scenes Tour scenes data
     * @return string Thumbnail URL
     */
    private function get_tour_thumbnail($tour_id, $scenes = null) {
        if ($scenes === null) {
            $scenes = get_post_meta($tour_id, '_vx_tour_scenes', true);
        }
        
        if (is_array($scenes) && !empty($scenes)) {
            $first_scene = reset($scenes);
            return $first_scene['image'] ?? '';
        }
        
        // Fallback to featured image
        $thumbnail_id = get_post_thumbnail_id($tour_id);
        if ($thumbnail_id) {
            $thumbnail = wp_get_attachment_image_src($thumbnail_id, 'medium');
            return $thumbnail ? $thumbnail[0] : '';
        }
        
        return '';
    }
    
    /**
     * Check if user can view tour.
     * Validates user permissions for tour access.
     * 
     * @param int $tour_id Tour post ID
     * @return bool Whether user can view tour
     */
    private function can_user_view_tour($tour_id) {
        $tour = get_post($tour_id);
        
        if (!$tour) {
            return false;
        }
        
        // Check if tour is published
        if ($tour->post_status !== 'publish') {
            return false;
        }
        
        // Check password protection
        if (post_password_required($tour)) {
            return false;
        }
        
        // Additional permission checks can be added here
        // For example, membership restrictions, etc.
        
        return true;
    }
    
    /**
     * Render error message.
     * Returns formatted error HTML.
     * 
     * @param string $message Error message
     * @return string Error HTML
     */
    private function render_error($message) {
        return '<div class="vx-shortcode-error">' . esc_html($message) . '</div>';
    }
    
    /**
     * Get registered shortcodes.
     * Returns array of registered shortcodes.
     * 
     * @return array Shortcodes array
     */
    public function get_shortcodes() {
        return $this->shortcodes;
    }
}

// Initialize the shortcodes class
new VX_Public_Shortcodes();