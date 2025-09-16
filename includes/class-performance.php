<?php
/**
 * Vortex360 Lite Performance Optimization Class
 * 
 * Handles caching, asset optimization, and performance monitoring
 * for the Vortex360 Lite plugin.
 * 
 * @package Vortex360Lite
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Vortex360_Lite_Performance {
    
    /**
     * Cache group for tour data
     */
    const CACHE_GROUP = 'vortex360_lite';
    
    /**
     * Cache expiration time (1 hour)
     */
    const CACHE_EXPIRATION = 3600;
    
    /**
     * Initialize performance optimizations
     */
    public function __construct() {
        add_action('init', [$this, 'init_optimizations']);
        add_action('wp_enqueue_scripts', [$this, 'optimize_asset_loading']);
        add_action('admin_enqueue_scripts', [$this, 'optimize_admin_assets']);
        add_filter('script_loader_tag', [$this, 'add_async_defer_attributes'], 10, 2);
        add_action('wp_head', [$this, 'add_preload_hints']);
        add_action('wp_footer', [$this, 'add_performance_monitoring']);
    }
    
    /**
     * Initialize performance optimizations
     */
    public function init_optimizations() {
        // Enable object caching for tour data
        $this->setup_object_caching();
        
        // Optimize database queries
        $this->optimize_database_queries();
        
        // Setup image optimization
        $this->setup_image_optimization();
    }
    
    /**
     * Setup object caching for tour data
     */
    private function setup_object_caching() {
        // Add cache group
        wp_cache_add_global_groups([self::CACHE_GROUP]);
        
        // Hook into tour data retrieval
        add_filter('vortex360_lite_get_tour_data', [$this, 'cache_tour_data'], 10, 2);
        add_action('vortex360_lite_tour_updated', [$this, 'clear_tour_cache']);
        add_action('vortex360_lite_tour_deleted', [$this, 'clear_tour_cache']);
    }
    
    /**
     * Cache tour data for improved performance
     */
    public function cache_tour_data($tour_data, $tour_id) {
        if (empty($tour_data)) {
            return $tour_data;
        }
        
        $cache_key = "tour_data_{$tour_id}";
        
        // Try to get from cache first
        $cached_data = wp_cache_get($cache_key, self::CACHE_GROUP);
        if ($cached_data !== false) {
            return $cached_data;
        }
        
        // Cache the data
        wp_cache_set($cache_key, $tour_data, self::CACHE_GROUP, self::CACHE_EXPIRATION);
        
        return $tour_data;
    }
    
    /**
     * Clear tour cache when tour is updated
     */
    public function clear_tour_cache($tour_id) {
        $cache_key = "tour_data_{$tour_id}";
        wp_cache_delete($cache_key, self::CACHE_GROUP);
        
        // Also clear related caches
        wp_cache_delete("tour_scenes_{$tour_id}", self::CACHE_GROUP);
        wp_cache_delete("tour_hotspots_{$tour_id}", self::CACHE_GROUP);
    }
    
    /**
     * Optimize database queries
     */
    private function optimize_database_queries() {
        // Add database query caching
        add_filter('vortex360_lite_db_query', [$this, 'cache_database_query'], 10, 3);
        
        // Optimize tour listing queries
        add_action('pre_get_posts', [$this, 'optimize_tour_queries']);
    }
    
    /**
     * Cache database queries
     */
    public function cache_database_query($result, $query, $cache_time = null) {
        if ($cache_time === null) {
            $cache_time = self::CACHE_EXPIRATION;
        }
        
        $cache_key = 'query_' . md5($query);
        
        // Try cache first
        $cached_result = wp_cache_get($cache_key, self::CACHE_GROUP);
        if ($cached_result !== false) {
            return $cached_result;
        }
        
        // Cache the result
        if (!empty($result)) {
            wp_cache_set($cache_key, $result, self::CACHE_GROUP, $cache_time);
        }
        
        return $result;
    }
    
    /**
     * Optimize tour listing queries
     */
    public function optimize_tour_queries($query) {
        if (!is_admin() && $query->is_main_query()) {
            // Limit tour queries to essential fields only
            if (isset($query->query_vars['post_type']) && $query->query_vars['post_type'] === 'vortex360_tour') {
                $query->set('fields', 'ids');
            }
        }
    }
    
    /**
     * Setup image optimization
     */
    private function setup_image_optimization() {
        // Add WebP support detection
        add_action('wp_head', [$this, 'add_webp_detection']);
        
        // Optimize panoramic image loading
        add_filter('vortex360_lite_panoramic_image', [$this, 'optimize_panoramic_image']);
        
        // Add lazy loading for hotspot images
        add_filter('vortex360_lite_hotspot_image', [$this, 'add_lazy_loading']);
    }
    
    /**
     * Add WebP detection script
     */
    public function add_webp_detection() {
        echo "<script>
        (function() {
            var webP = new Image();
            webP.onload = webP.onerror = function() {
                document.documentElement.classList.add(webP.height == 2 ? 'webp' : 'no-webp');
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        })();
        </script>";
    }
    
    /**
     * Optimize panoramic image loading
     */
    public function optimize_panoramic_image($image_url) {
        // Add responsive image sizes for panoramic images
        $optimized_url = $this->get_responsive_image_url($image_url);
        return $optimized_url;
    }
    
    /**
     * Get responsive image URL based on device capabilities
     */
    private function get_responsive_image_url($image_url) {
        // Check if we have different sizes available
        $image_id = attachment_url_to_postid($image_url);
        
        if ($image_id) {
            // Get appropriate size based on viewport
            $sizes = [
                'mobile' => 'medium_large',
                'tablet' => 'large',
                'desktop' => 'full'
            ];
            
            // Use JavaScript to determine optimal size
            // For now, return original URL with optimization hints
            return add_query_arg('optimize', '1', $image_url);
        }
        
        return $image_url;
    }
    
    /**
     * Add lazy loading attributes to images
     */
    public function add_lazy_loading($image_html) {
        // Add loading="lazy" attribute
        if (strpos($image_html, 'loading=') === false) {
            $image_html = str_replace('<img ', '<img loading="lazy" ', $image_html);
        }
        
        return $image_html;
    }
    
    /**
     * Optimize frontend asset loading
     */
    public function optimize_asset_loading() {
        // Only load viewer assets when needed
        if (!$this->is_tour_page()) {
            return;
        }
        
        // Dequeue unnecessary scripts on tour pages
        $this->dequeue_unnecessary_scripts();
        
        // Optimize CSS delivery
        $this->optimize_css_delivery();
        
        // Add resource hints
        $this->add_resource_hints();
    }
    
    /**
     * Check if current page contains a tour
     */
    private function is_tour_page() {
        global $post;
        
        if (!$post) {
            return false;
        }
        
        // Check for shortcode in content
        return has_shortcode($post->post_content, 'vortex360_tour');
    }
    
    /**
     * Dequeue unnecessary scripts on tour pages
     */
    private function dequeue_unnecessary_scripts() {
        // List of scripts that might conflict or are unnecessary
        $unnecessary_scripts = [
            'jquery-ui-core',
            'jquery-ui-widget',
            'jquery-ui-mouse'
        ];
        
        foreach ($unnecessary_scripts as $script) {
            if (wp_script_is($script, 'enqueued')) {
                wp_dequeue_script($script);
            }
        }
    }
    
    /**
     * Optimize CSS delivery
     */
    private function optimize_css_delivery() {
        // Add critical CSS inline for faster rendering
        add_action('wp_head', [$this, 'add_critical_css'], 1);
        
        // Load non-critical CSS asynchronously
        add_filter('style_loader_tag', [$this, 'make_css_async'], 10, 2);
    }
    
    /**
     * Add critical CSS inline
     */
    public function add_critical_css() {
        if (!$this->is_tour_page()) {
            return;
        }
        
        echo "<style id='vortex360-critical-css'>
        .vortex360-viewer{position:relative;width:100%;height:400px;background:#000;overflow:hidden}
        .vortex360-loading{display:flex;align-items:center;justify-content:center;height:100%;color:#fff}
        .vortex360-spinner{border:3px solid rgba(255,255,255,.3);border-top:3px solid #fff;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}
        @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
        </style>";
    }
    
    /**
     * Make non-critical CSS load asynchronously
     */
    public function make_css_async($html, $handle) {
        // Only apply to our plugin's non-critical CSS
        if (strpos($handle, 'vortex360-lite') !== false && strpos($handle, 'critical') === false) {
            $html = str_replace("rel='stylesheet'", "rel='preload' as='style' onload=\"this.onload=null;this.rel='stylesheet'\"", $html);
            $html .= "<noscript><link rel='stylesheet' href='" . wp_styles()->registered[$handle]->src . "'></noscript>";
        }
        
        return $html;
    }
    
    /**
     * Add resource hints for better performance
     */
    private function add_resource_hints() {
        // Preconnect to external domains
        add_action('wp_head', function() {
            echo "<link rel='preconnect' href='https://cdn.jsdelivr.net'>";
            echo "<link rel='dns-prefetch' href='//cdn.jsdelivr.net'>";
        });
    }
    
    /**
     * Add preload hints for critical resources
     */
    public function add_preload_hints() {
        if (!$this->is_tour_page()) {
            return;
        }
        
        // Preload Pannellum library
        echo "<link rel='modulepreload' href='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js'>";
        echo "<link rel='preload' href='https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css' as='style'>";
    }
    
    /**
     * Optimize admin asset loading
     */
    public function optimize_admin_assets($hook) {
        // Only load admin assets on plugin pages
        if (strpos($hook, 'vortex360-lite') === false) {
            return;
        }
        
        // Optimize admin script loading
        $this->optimize_admin_scripts();
    }
    
    /**
     * Optimize admin script loading
     */
    private function optimize_admin_scripts() {
        // Load admin scripts in footer for better performance
        wp_script_add_data('vortex360-lite-admin', 'group', 1);
        
        // Add script dependencies optimization
        add_filter('script_loader_src', [$this, 'optimize_script_urls'], 10, 2);
    }
    
    /**
     * Optimize script URLs
     */
    public function optimize_script_urls($src, $handle) {
        // Add version parameter for cache busting
        if (strpos($handle, 'vortex360-lite') !== false) {
            $src = add_query_arg('ver', VORTEX360_LITE_VERSION, $src);
        }
        
        return $src;
    }
    
    /**
     * Add async/defer attributes to scripts
     */
    public function add_async_defer_attributes($tag, $handle) {
        // Scripts that can be loaded asynchronously
        $async_scripts = [
            'vortex360-lite-viewer'
        ];
        
        // Scripts that can be deferred
        $defer_scripts = [
            'vortex360-lite-admin'
        ];
        
        if (in_array($handle, $async_scripts)) {
            $tag = str_replace(' src', ' async src', $tag);
        } elseif (in_array($handle, $defer_scripts)) {
            $tag = str_replace(' src', ' defer src', $tag);
        }
        
        return $tag;
    }
    
    /**
     * Add performance monitoring
     */
    public function add_performance_monitoring() {
        if (!$this->is_tour_page() || !WP_DEBUG) {
            return;
        }
        
        echo "<script>
        (function() {
            if ('performance' in window) {
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        var perfData = performance.getEntriesByType('navigation')[0];
                        if (perfData && console && console.log) {
                            console.log('Vortex360 Performance:', {
                                'DOM Content Loaded': Math.round(perfData.domContentLoadedEventEnd - perfData.navigationStart) + 'ms',
                                'Page Load Complete': Math.round(perfData.loadEventEnd - perfData.navigationStart) + 'ms',
                                'First Paint': performance.getEntriesByType('paint')[0] ? Math.round(performance.getEntriesByType('paint')[0].startTime) + 'ms' : 'N/A'
                            });
                        }
                    }, 1000);
                });
            }
        })();
        </script>";
    }
    
    /**
     * Get performance metrics
     */
    public static function get_performance_metrics() {
        return [
            'cache_hits' => wp_cache_get('cache_hits', self::CACHE_GROUP) ?: 0,
            'cache_misses' => wp_cache_get('cache_misses', self::CACHE_GROUP) ?: 0,
            'database_queries' => get_num_queries(),
            'memory_usage' => memory_get_usage(true),
            'peak_memory' => memory_get_peak_usage(true)
        ];
    }
    
    /**
     * Clear all plugin caches
     */
    public static function clear_all_caches() {
        // Clear object cache
        wp_cache_flush_group(self::CACHE_GROUP);
        
        // Clear transients
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_vortex360_%'
            )
        );
        
        // Clear any file-based caches if implemented
        $cache_dir = WP_CONTENT_DIR . '/cache/vortex360-lite/';
        if (is_dir($cache_dir)) {
            array_map('unlink', glob($cache_dir . '*'));
        }
    }
}

// Initialize performance optimizations
new Vortex360_Lite_Performance();

?>