<?php
/**
 * Vortex360 Lite - Public Template Loader
 * 
 * Handles template loading, theme integration, and template hierarchy
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Public template loader class.
 * Manages template loading and theme integration for tour display.
 */
class VX_Public_Template_Loader {
    
    /**
     * Template directory in theme.
     * @var string
     */
    private $theme_template_dir = 'vortex360';
    
    /**
     * Plugin template directory.
     * @var string
     */
    private $plugin_template_dir;
    
    /**
     * Template cache.
     * @var array
     */
    private $template_cache = [];
    
    /**
     * Initialize template loader.
     * Sets up hooks and template directories.
     */
    public function __construct() {
        $this->plugin_template_dir = VX_PLUGIN_PATH . 'public/templates/';
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers filters and actions for template handling.
     */
    private function init_hooks() {
        // Template loading
        add_filter('single_template', [$this, 'load_single_tour_template']);
        add_filter('archive_template', [$this, 'load_tour_archive_template']);
        add_filter('taxonomy_template', [$this, 'load_tour_taxonomy_template']);
        
        // Template parts
        add_filter('template_include', [$this, 'template_include']);
        
        // Body classes
        add_filter('body_class', [$this, 'add_template_body_classes']);
        
        // Template hooks
        add_action('vx_before_tour_content', [$this, 'before_tour_content']);
        add_action('vx_after_tour_content', [$this, 'after_tour_content']);
        
        // Theme support
        add_action('after_setup_theme', [$this, 'add_theme_support']);
        
        // Template debugging
        if (defined('WP_DEBUG') && WP_DEBUG) {
            add_action('wp_footer', [$this, 'template_debug_info']);
        }
    }
    
    /**
     * Load single tour template.
     * Handles template loading for individual tour pages.
     * 
     * @param string $template Current template path
     * @return string Modified template path
     */
    public function load_single_tour_template($template) {
        if (!is_singular('vx_tour')) {
            return $template;
        }
        
        global $post;
        
        // Template hierarchy for single tours
        $templates = [
            'single-vx_tour-' . $post->post_name . '.php',
            'single-vx_tour-' . $post->ID . '.php',
            'single-vx_tour.php',
            'vortex360/single-tour.php',
            'vortex360/single.php'
        ];
        
        $located_template = $this->locate_template($templates);
        
        if ($located_template) {
            return $located_template;
        }
        
        return $template;
    }
    
    /**
     * Load tour archive template.
     * Handles template loading for tour archive pages.
     * 
     * @param string $template Current template path
     * @return string Modified template path
     */
    public function load_tour_archive_template($template) {
        if (!is_post_type_archive('vx_tour')) {
            return $template;
        }
        
        $templates = [
            'archive-vx_tour.php',
            'vortex360/archive-tours.php',
            'vortex360/archive.php'
        ];
        
        $located_template = $this->locate_template($templates);
        
        if ($located_template) {
            return $located_template;
        }
        
        return $template;
    }
    
    /**
     * Load tour taxonomy template.
     * Handles template loading for tour category and tag pages.
     * 
     * @param string $template Current template path
     * @return string Modified template path
     */
    public function load_tour_taxonomy_template($template) {
        if (!is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            return $template;
        }
        
        $term = get_queried_object();
        $taxonomy = $term->taxonomy;
        
        $templates = [];
        
        if ($taxonomy === 'vx_tour_category') {
            $templates = [
                'taxonomy-vx_tour_category-' . $term->slug . '.php',
                'taxonomy-vx_tour_category.php',
                'vortex360/taxonomy-category.php',
                'vortex360/taxonomy.php'
            ];
        } elseif ($taxonomy === 'vx_tour_tag') {
            $templates = [
                'taxonomy-vx_tour_tag-' . $term->slug . '.php',
                'taxonomy-vx_tour_tag.php',
                'vortex360/taxonomy-tag.php',
                'vortex360/taxonomy.php'
            ];
        }
        
        $located_template = $this->locate_template($templates);
        
        if ($located_template) {
            return $located_template;
        }
        
        return $template;
    }
    
    /**
     * Template include filter.
     * Final template processing and variable setup.
     * 
     * @param string $template Template path
     * @return string Modified template path
     */
    public function template_include($template) {
        // Set up template variables for tour pages
        if (is_singular('vx_tour') || is_post_type_archive('vx_tour') || is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            $this->setup_template_vars();
        }
        
        return $template;
    }
    
    /**
     * Locate template in theme or plugin.
     * Searches for template files in theme first, then plugin.
     * 
     * @param array $template_names Array of template names to search for
     * @return string|false Located template path or false
     */
    public function locate_template($template_names) {
        if (!is_array($template_names)) {
            $template_names = [$template_names];
        }
        
        $cache_key = md5(serialize($template_names));
        
        if (isset($this->template_cache[$cache_key])) {
            return $this->template_cache[$cache_key];
        }
        
        $located = false;
        
        foreach ($template_names as $template_name) {
            if (empty($template_name)) {
                continue;
            }
            
            // Check theme directory first
            $theme_template = locate_template([
                $this->theme_template_dir . '/' . $template_name,
                $template_name
            ]);
            
            if ($theme_template) {
                $located = $theme_template;
                break;
            }
            
            // Check plugin directory
            $plugin_template = $this->plugin_template_dir . $template_name;
            
            if (file_exists($plugin_template)) {
                $located = $plugin_template;
                break;
            }
        }
        
        $this->template_cache[$cache_key] = $located;
        
        return $located;
    }
    
    /**
     * Get template part.
     * Loads a template part with optional variables.
     * 
     * @param string $slug Template slug
     * @param string $name Template name (optional)
     * @param array $vars Variables to pass to template
     * @return bool Whether template was loaded
     */
    public function get_template_part($slug, $name = null, $vars = []) {
        $templates = [];
        
        if ($name) {
            $templates[] = $slug . '-' . $name . '.php';
        }
        
        $templates[] = $slug . '.php';
        
        $located = $this->locate_template($templates);
        
        if (!$located) {
            return false;
        }
        
        // Extract variables for template
        if (!empty($vars) && is_array($vars)) {
            extract($vars, EXTR_SKIP);
        }
        
        // Load template
        include $located;
        
        return true;
    }
    
    /**
     * Load template with variables.
     * Loads a complete template file with variables.
     * 
     * @param string $template_name Template name
     * @param array $vars Variables to pass to template
     * @param bool $return Whether to return output instead of echoing
     * @return string|void Template output if $return is true
     */
    public function load_template($template_name, $vars = [], $return = false) {
        $located = $this->locate_template($template_name);
        
        if (!$located) {
            return $return ? '' : null;
        }
        
        // Extract variables for template
        if (!empty($vars) && is_array($vars)) {
            extract($vars, EXTR_SKIP);
        }
        
        if ($return) {
            ob_start();
            include $located;
            return ob_get_clean();
        } else {
            include $located;
        }
    }
    
    /**
     * Setup template variables.
     * Prepares global variables for tour templates.
     */
    private function setup_template_vars() {
        global $vx_tour, $vx_tour_data, $vx_tour_settings;
        
        if (is_singular('vx_tour')) {
            global $post;
            $vx_tour = $post;
            $vx_tour_data = $this->get_tour_template_data($post->ID);
            $vx_tour_settings = get_post_meta($post->ID, '_vx_tour_settings', true) ?: [];
        } elseif (is_post_type_archive('vx_tour')) {
            $vx_tour_data = $this->get_archive_template_data();
        } elseif (is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            $vx_tour_data = $this->get_taxonomy_template_data();
        }
    }
    
    /**
     * Get tour template data.
     * Prepares data for single tour templates.
     * 
     * @param int $tour_id Tour post ID
     * @return array Template data
     */
    private function get_tour_template_data($tour_id) {
        $tour = get_post($tour_id);
        
        if (!$tour) {
            return [];
        }
        
        $scenes = get_post_meta($tour_id, '_vx_tour_scenes', true) ?: [];
        $hotspots = get_post_meta($tour_id, '_vx_tour_hotspots', true) ?: [];
        $settings = get_post_meta($tour_id, '_vx_tour_settings', true) ?: [];
        $seo = get_post_meta($tour_id, '_vx_tour_seo', true) ?: [];
        
        return [
            'tour' => $tour,
            'scenes' => $scenes,
            'hotspots' => $hotspots,
            'settings' => $settings,
            'seo' => $seo,
            'scene_count' => count($scenes),
            'hotspot_count' => count($hotspots),
            'categories' => get_the_terms($tour_id, 'vx_tour_category'),
            'tags' => get_the_terms($tour_id, 'vx_tour_tag'),
            'views' => get_post_meta($tour_id, '_vx_tour_views', true) ?: 0,
            'featured_image' => get_the_post_thumbnail_url($tour_id, 'large'),
            'permalink' => get_permalink($tour_id),
            'embed_url' => home_url('/vortex360/embed/' . $tour_id)
        ];
    }
    
    /**
     * Get archive template data.
     * Prepares data for tour archive templates.
     * 
     * @return array Template data
     */
    private function get_archive_template_data() {
        global $wp_query;
        
        $tours = $wp_query->posts;
        $total_tours = $wp_query->found_posts;
        
        return [
            'tours' => $tours,
            'total_tours' => $total_tours,
            'current_page' => get_query_var('paged') ?: 1,
            'max_pages' => $wp_query->max_num_pages,
            'archive_title' => post_type_archive_title('', false),
            'archive_description' => get_the_archive_description()
        ];
    }
    
    /**
     * Get taxonomy template data.
     * Prepares data for tour taxonomy templates.
     * 
     * @return array Template data
     */
    private function get_taxonomy_template_data() {
        global $wp_query;
        
        $term = get_queried_object();
        $tours = $wp_query->posts;
        $total_tours = $wp_query->found_posts;
        
        return [
            'term' => $term,
            'tours' => $tours,
            'total_tours' => $total_tours,
            'current_page' => get_query_var('paged') ?: 1,
            'max_pages' => $wp_query->max_num_pages,
            'term_title' => single_term_title('', false),
            'term_description' => term_description()
        ];
    }
    
    /**
     * Add template-specific body classes.
     * Adds CSS classes based on current template.
     * 
     * @param array $classes Existing body classes
     * @return array Modified body classes
     */
    public function add_template_body_classes($classes) {
        if (is_singular('vx_tour')) {
            $classes[] = 'vortex360-single';
            $classes[] = 'vx-template-single';
            
            global $post;
            $template_slug = get_page_template_slug($post->ID);
            if ($template_slug) {
                $classes[] = 'vx-template-' . sanitize_html_class(str_replace('.php', '', basename($template_slug)));
            }
        }
        
        if (is_post_type_archive('vx_tour')) {
            $classes[] = 'vortex360-archive';
            $classes[] = 'vx-template-archive';
        }
        
        if (is_tax('vx_tour_category')) {
            $classes[] = 'vortex360-category';
            $classes[] = 'vx-template-category';
            
            $term = get_queried_object();
            $classes[] = 'vx-category-' . $term->slug;
        }
        
        if (is_tax('vx_tour_tag')) {
            $classes[] = 'vortex360-tag';
            $classes[] = 'vx-template-tag';
            
            $term = get_queried_object();
            $classes[] = 'vx-tag-' . $term->slug;
        }
        
        return $classes;
    }
    
    /**
     * Before tour content hook.
     * Fires before tour content is displayed.
     */
    public function before_tour_content() {
        if (is_singular('vx_tour')) {
            global $vx_tour_data;
            
            // Add structured data
            $this->add_tour_structured_data($vx_tour_data);
            
            // Add social sharing meta
            $this->add_social_sharing_meta($vx_tour_data);
        }
    }
    
    /**
     * After tour content hook.
     * Fires after tour content is displayed.
     */
    public function after_tour_content() {
        if (is_singular('vx_tour')) {
            // Add related tours
            $this->display_related_tours();
            
            // Add tour navigation
            $this->display_tour_navigation();
        }
    }
    
    /**
     * Add theme support for tours.
     * Registers theme support features.
     */
    public function add_theme_support() {
        // Add theme support for tour thumbnails
        add_theme_support('post-thumbnails', ['vx_tour']);
        
        // Add theme support for tour excerpts
        add_post_type_support('vx_tour', 'excerpt');
        
        // Add theme support for tour comments (if enabled)
        if (get_option('vx_enable_comments', false)) {
            add_post_type_support('vx_tour', 'comments');
        }
    }
    
    /**
     * Add tour structured data.
     * Adds JSON-LD structured data for tours.
     * 
     * @param array $tour_data Tour template data
     */
    private function add_tour_structured_data($tour_data) {
        if (empty($tour_data['tour'])) {
            return;
        }
        
        $tour = $tour_data['tour'];
        
        $structured_data = [
            '@context' => 'https://schema.org',
            '@type' => 'VirtualLocation',
            'name' => $tour->post_title,
            'description' => wp_strip_all_tags($tour->post_content),
            'url' => get_permalink($tour->ID),
            'datePublished' => get_the_date('c', $tour->ID),
            'dateModified' => get_the_modified_date('c', $tour->ID)
        ];
        
        // Add images from scenes
        if (!empty($tour_data['scenes'])) {
            $images = [];
            foreach ($tour_data['scenes'] as $scene) {
                if (!empty($scene['image'])) {
                    $images[] = $scene['image'];
                }
            }
            if (!empty($images)) {
                $structured_data['image'] = $images;
            }
        }
        
        // Add author
        $author = get_userdata($tour->post_author);
        if ($author) {
            $structured_data['author'] = [
                '@type' => 'Person',
                'name' => $author->display_name
            ];
        }
        
        // Add categories
        if (!empty($tour_data['categories']) && !is_wp_error($tour_data['categories'])) {
            $keywords = [];
            foreach ($tour_data['categories'] as $category) {
                $keywords[] = $category->name;
            }
            $structured_data['keywords'] = implode(', ', $keywords);
        }
        
        echo '<script type="application/ld+json">' . wp_json_encode($structured_data, JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
    }
    
    /**
     * Add social sharing meta tags.
     * Adds Open Graph and Twitter Card meta tags.
     * 
     * @param array $tour_data Tour template data
     */
    private function add_social_sharing_meta($tour_data) {
        if (empty($tour_data['tour'])) {
            return;
        }
        
        $tour = $tour_data['tour'];
        $seo = $tour_data['seo'] ?? [];
        
        // Open Graph meta tags
        echo '<meta property="og:type" content="website">' . "\n";
        echo '<meta property="og:title" content="' . esc_attr($tour->post_title) . '">' . "\n";
        echo '<meta property="og:url" content="' . esc_url(get_permalink($tour->ID)) . '">' . "\n";
        
        $description = $seo['og_description'] ?? wp_trim_words(wp_strip_all_tags($tour->post_content), 30);
        if ($description) {
            echo '<meta property="og:description" content="' . esc_attr($description) . '">' . "\n";
        }
        
        // Use first scene image for og:image
        if (!empty($tour_data['scenes'])) {
            $first_scene = reset($tour_data['scenes']);
            if (!empty($first_scene['image'])) {
                echo '<meta property="og:image" content="' . esc_url($first_scene['image']) . '">' . "\n";
                echo '<meta property="og:image:width" content="1200">' . "\n";
                echo '<meta property="og:image:height" content="600">' . "\n";
            }
        }
        
        // Twitter Card meta tags
        echo '<meta name="twitter:card" content="summary_large_image">' . "\n";
        echo '<meta name="twitter:title" content="' . esc_attr($tour->post_title) . '">' . "\n";
        
        $twitter_description = $seo['twitter_description'] ?? $description;
        if ($twitter_description) {
            echo '<meta name="twitter:description" content="' . esc_attr($twitter_description) . '">' . "\n";
        }
    }
    
    /**
     * Display related tours.
     * Shows related tours based on categories.
     */
    private function display_related_tours() {
        global $post, $vx_tour_data;
        
        if (empty($vx_tour_data['categories']) || is_wp_error($vx_tour_data['categories'])) {
            return;
        }
        
        $category_ids = wp_list_pluck($vx_tour_data['categories'], 'term_id');
        
        $related_tours = get_posts([
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => 3,
            'post__not_in' => [$post->ID],
            'tax_query' => [
                [
                    'taxonomy' => 'vx_tour_category',
                    'field' => 'term_id',
                    'terms' => $category_ids
                ]
            ]
        ]);
        
        if (empty($related_tours)) {
            return;
        }
        
        $this->get_template_part('related-tours', null, [
            'related_tours' => $related_tours,
            'title' => __('Related Tours', 'vortex360-lite')
        ]);
    }
    
    /**
     * Display tour navigation.
     * Shows previous/next tour navigation.
     */
    private function display_tour_navigation() {
        $prev_tour = get_previous_post(true, '', 'vx_tour_category');
        $next_tour = get_next_post(true, '', 'vx_tour_category');
        
        if (!$prev_tour && !$next_tour) {
            return;
        }
        
        $this->get_template_part('tour-navigation', null, [
            'prev_tour' => $prev_tour,
            'next_tour' => $next_tour
        ]);
    }
    
    /**
     * Template debug information.
     * Shows template debugging info in footer (when WP_DEBUG is enabled).
     */
    public function template_debug_info() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (is_singular('vx_tour') || is_post_type_archive('vx_tour') || is_tax(['vx_tour_category', 'vx_tour_tag'])) {
            global $template;
            
            echo '<!-- Vortex360 Template Debug -->' . "\n";
            echo '<!-- Current Template: ' . esc_html($template) . ' -->' . "\n";
            echo '<!-- Template Cache: ' . count($this->template_cache) . ' items -->' . "\n";
            
            if (!empty($this->template_cache)) {
                echo '<!-- Cached Templates: ' . esc_html(implode(', ', array_keys($this->template_cache))) . ' -->' . "\n";
            }
        }
    }
    
    /**
     * Get theme template directory.
     * Returns the theme directory for tour templates.
     * 
     * @return string Theme template directory
     */
    public function get_theme_template_dir() {
        return $this->theme_template_dir;
    }
    
    /**
     * Get plugin template directory.
     * Returns the plugin directory for tour templates.
     * 
     * @return string Plugin template directory
     */
    public function get_plugin_template_dir() {
        return $this->plugin_template_dir;
    }
    
    /**
     * Clear template cache.
     * Clears the internal template cache.
     */
    public function clear_template_cache() {
        $this->template_cache = [];
    }
}

// Initialize the template loader
new VX_Public_Template_Loader();