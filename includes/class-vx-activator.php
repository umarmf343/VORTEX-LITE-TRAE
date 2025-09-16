<?php
/**
 * Vortex360 Lite - Plugin Activator
 * 
 * Handles plugin activation, deactivation, and uninstallation processes
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin activation and deactivation handler.
 * Manages database setup, cleanup, and system requirements during plugin lifecycle.
 */
class VX_Activator {
    
    /**
     * Plugin activation handler.
     * Sets up database tables, default options, and performs system checks.
     */
    public static function activate() {
        // Check system requirements
        self::check_requirements();
        
        // Create database tables
        self::create_tables();
        
        // Set default options
        self::set_default_options();
        
        // Create upload directories
        self::create_upload_directories();
        
        // Schedule cron events
        self::schedule_events();
        
        // Flush rewrite rules
        self::flush_rewrite_rules();
        
        // Set activation flag
        update_option('vx_activation_time', current_time('timestamp'));
        update_option('vx_version', VX_VERSION);
        
        // Fire activation hook
        do_action('vx_plugin_activated');
    }
    
    /**
     * Plugin deactivation handler.
     * Cleans up scheduled events and temporary data.
     */
    public static function deactivate() {
        // Clear scheduled events
        self::clear_scheduled_events();
        
        // Clear transients
        self::clear_transients();
        
        // Flush rewrite rules
        flush_rewrite_rules();
        
        // Fire deactivation hook
        do_action('vx_plugin_deactivated');
    }
    
    /**
     * Plugin uninstallation handler.
     * Removes all plugin data if user chooses to delete data.
     */
    public static function uninstall() {
        // Check if user wants to keep data
        $keep_data = get_option('vx_keep_data_on_uninstall', false);
        
        if (!$keep_data) {
            // Remove database tables
            self::drop_tables();
            
            // Remove options
            self::remove_options();
            
            // Remove user meta
            self::remove_user_meta();
            
            // Remove upload directories
            self::remove_upload_directories();
            
            // Remove posts and meta
            self::remove_posts();
        }
        
        // Clear scheduled events
        self::clear_scheduled_events();
        
        // Clear transients
        self::clear_transients();
        
        // Fire uninstall hook
        do_action('vx_plugin_uninstalled');
    }
    
    /**
     * Check system requirements.
     * Verifies PHP version, WordPress version, and required extensions.
     * 
     * @throws Exception If requirements are not met
     */
    private static function check_requirements() {
        global $wp_version;
        
        // Check PHP version
        if (version_compare(PHP_VERSION, VX_MIN_PHP_VERSION, '<')) {
            deactivate_plugins(plugin_basename(VX_PLUGIN_FILE));
            wp_die(
                sprintf(
                    __('Vortex360 Lite requires PHP version %s or higher. You are running version %s.', 'vortex360-lite'),
                    VX_MIN_PHP_VERSION,
                    PHP_VERSION
                ),
                __('Plugin Activation Error', 'vortex360-lite'),
                ['back_link' => true]
            );
        }
        
        // Check WordPress version
        if (version_compare($wp_version, VX_MIN_WP_VERSION, '<')) {
            deactivate_plugins(plugin_basename(VX_PLUGIN_FILE));
            wp_die(
                sprintf(
                    __('Vortex360 Lite requires WordPress version %s or higher. You are running version %s.', 'vortex360-lite'),
                    VX_MIN_WP_VERSION,
                    $wp_version
                ),
                __('Plugin Activation Error', 'vortex360-lite'),
                ['back_link' => true]
            );
        }
        
        // Check required PHP extensions
        $required_extensions = ['json', 'gd', 'zip'];
        $missing_extensions = [];
        
        foreach ($required_extensions as $extension) {
            if (!extension_loaded($extension)) {
                $missing_extensions[] = $extension;
            }
        }
        
        if (!empty($missing_extensions)) {
            deactivate_plugins(plugin_basename(VX_PLUGIN_FILE));
            wp_die(
                sprintf(
                    __('Vortex360 Lite requires the following PHP extensions: %s', 'vortex360-lite'),
                    implode(', ', $missing_extensions)
                ),
                __('Plugin Activation Error', 'vortex360-lite'),
                ['back_link' => true]
            );
        }
        
        // Check memory limit
        $memory_limit = wp_convert_hr_to_bytes(ini_get('memory_limit'));
        $required_memory = 64 * 1024 * 1024; // 64MB
        
        if ($memory_limit > 0 && $memory_limit < $required_memory) {
            // Show warning but don't prevent activation
            set_transient('vx_memory_warning', true, 300);
        }
    }
    
    /**
     * Create database tables.
     * Sets up custom tables for tours, scenes, and analytics.
     */
    private static function create_tables() {
        global $wpdb;
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tours table
        $tours_table = $wpdb->prefix . 'vx_tours';
        $tours_sql = "CREATE TABLE $tours_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            post_id bigint(20) unsigned NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            settings longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY post_id (post_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Scenes table
        $scenes_table = $wpdb->prefix . 'vx_scenes';
        $scenes_sql = "CREATE TABLE $scenes_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            tour_id bigint(20) unsigned NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            image_url varchar(500),
            panorama_url varchar(500),
            sort_order int(11) DEFAULT 0,
            settings longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tour_id (tour_id),
            KEY sort_order (sort_order)
        ) $charset_collate;";
        
        // Hotspots table
        $hotspots_table = $wpdb->prefix . 'vx_hotspots';
        $hotspots_sql = "CREATE TABLE $hotspots_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            scene_id bigint(20) unsigned NOT NULL,
            title varchar(255),
            description text,
            type varchar(50) DEFAULT 'info',
            position_x float NOT NULL,
            position_y float NOT NULL,
            position_z float DEFAULT 0,
            target_scene_id bigint(20) unsigned NULL,
            target_url varchar(500),
            settings longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY scene_id (scene_id),
            KEY target_scene_id (target_scene_id),
            KEY type (type)
        ) $charset_collate;";
        
        // Analytics table
        $analytics_table = $wpdb->prefix . 'vx_analytics';
        $analytics_sql = "CREATE TABLE $analytics_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            tour_id bigint(20) unsigned NOT NULL,
            scene_id bigint(20) unsigned NULL,
            hotspot_id bigint(20) unsigned NULL,
            event_type varchar(50) NOT NULL,
            user_id bigint(20) unsigned NULL,
            session_id varchar(100),
            ip_address varchar(45),
            user_agent text,
            event_data longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tour_id (tour_id),
            KEY scene_id (scene_id),
            KEY hotspot_id (hotspot_id),
            KEY event_type (event_type),
            KEY user_id (user_id),
            KEY session_id (session_id),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        dbDelta($tours_sql);
        dbDelta($scenes_sql);
        dbDelta($hotspots_sql);
        dbDelta($analytics_sql);
        
        // Update database version
        update_option('vx_db_version', VX_DB_VERSION);
    }
    
    /**
     * Set default plugin options.
     * Initializes default settings and configuration.
     */
    private static function set_default_options() {
        $default_options = [
            'vx_general_settings' => [
                'enable_analytics' => true,
                'enable_social_sharing' => false,
                'default_controls' => true,
                'auto_rotate' => false,
                'show_scene_list' => true,
                'enable_fullscreen' => true,
                'enable_gyroscope' => true,
                'loading_screen' => true
            ],
            'vx_performance_settings' => [
                'image_quality' => 'medium',
                'preload_scenes' => false,
                'lazy_load_hotspots' => true,
                'cache_duration' => 3600,
                'optimize_mobile' => true
            ],
            'vx_seo_settings' => [
                'enable_meta_tags' => true,
                'enable_structured_data' => true,
                'enable_sitemap' => false,
                'default_meta_description' => __('Experience this immersive 360° virtual tour', 'vortex360-lite')
            ],
            'vx_lite_settings' => [
                'max_tours' => 5,
                'max_scenes_per_tour' => 5,
                'max_hotspots_per_scene' => 10,
                'show_branding' => true,
                'upgrade_notices' => true
            ]
        ];
        
        foreach ($default_options as $option_name => $option_value) {
            if (!get_option($option_name)) {
                add_option($option_name, $option_value);
            }
        }
        
        // Set first-time setup flag
        if (!get_option('vx_setup_completed')) {
            add_option('vx_setup_completed', false);
            add_option('vx_show_welcome', true);
        }
    }
    
    /**
     * Create upload directories.
     * Sets up directory structure for tour assets.
     */
    private static function create_upload_directories() {
        $upload_dir = wp_upload_dir();
        $vx_upload_dir = $upload_dir['basedir'] . '/vortex360';
        
        $directories = [
            $vx_upload_dir,
            $vx_upload_dir . '/tours',
            $vx_upload_dir . '/scenes',
            $vx_upload_dir . '/hotspots',
            $vx_upload_dir . '/temp',
            $vx_upload_dir . '/cache'
        ];
        
        foreach ($directories as $dir) {
            if (!file_exists($dir)) {
                wp_mkdir_p($dir);
                
                // Create .htaccess for security
                $htaccess_content = "# Vortex360 Upload Protection\n";
                $htaccess_content .= "<Files *.php>\n";
                $htaccess_content .= "deny from all\n";
                $htaccess_content .= "</Files>\n";
                
                file_put_contents($dir . '/.htaccess', $htaccess_content);
                
                // Create index.php for additional security
                file_put_contents($dir . '/index.php', '<?php // Silence is golden');
            }
        }
    }
    
    /**
     * Schedule cron events.
     * Sets up recurring tasks for maintenance and cleanup.
     */
    private static function schedule_events() {
        // Schedule analytics cleanup (weekly)
        if (!wp_next_scheduled('vx_cleanup_analytics')) {
            wp_schedule_event(time(), 'weekly', 'vx_cleanup_analytics');
        }
        
        // Schedule cache cleanup (daily)
        if (!wp_next_scheduled('vx_cleanup_cache')) {
            wp_schedule_event(time(), 'daily', 'vx_cleanup_cache');
        }
        
        // Schedule temp file cleanup (hourly)
        if (!wp_next_scheduled('vx_cleanup_temp_files')) {
            wp_schedule_event(time(), 'hourly', 'vx_cleanup_temp_files');
        }
    }
    
    /**
     * Flush rewrite rules.
     * Updates permalink structure for custom post types.
     */
    private static function flush_rewrite_rules() {
        // Initialize CPT class to register post types
        if (class_exists('VX_CPT')) {
            $cpt = new VX_CPT();
        }
        
        // Flush rules
        flush_rewrite_rules();
    }
    
    /**
     * Clear scheduled events.
     * Removes all plugin-related cron jobs.
     */
    private static function clear_scheduled_events() {
        $events = [
            'vx_cleanup_analytics',
            'vx_cleanup_cache',
            'vx_cleanup_temp_files'
        ];
        
        foreach ($events as $event) {
            $timestamp = wp_next_scheduled($event);
            if ($timestamp) {
                wp_unschedule_event($timestamp, $event);
            }
        }
    }
    
    /**
     * Clear plugin transients.
     * Removes temporary cached data.
     */
    private static function clear_transients() {
        global $wpdb;
        
        // Delete plugin-specific transients
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                '_transient_vx_%',
                '_transient_timeout_vx_%'
            )
        );
    }
    
    /**
     * Drop database tables.
     * Removes all plugin-created tables.
     */
    private static function drop_tables() {
        global $wpdb;
        
        $tables = [
            $wpdb->prefix . 'vx_tours',
            $wpdb->prefix . 'vx_scenes',
            $wpdb->prefix . 'vx_hotspots',
            $wpdb->prefix . 'vx_analytics'
        ];
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }
    }
    
    /**
     * Remove plugin options.
     * Deletes all plugin settings and data.
     */
    private static function remove_options() {
        global $wpdb;
        
        // Remove plugin options
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                'vx_%'
            )
        );
    }
    
    /**
     * Remove user meta data.
     * Cleans up user-specific plugin data.
     */
    private static function remove_user_meta() {
        global $wpdb;
        
        // Remove user meta
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
                'vx_%'
            )
        );
    }
    
    /**
     * Remove upload directories.
     * Deletes plugin upload folders and files.
     */
    private static function remove_upload_directories() {
        $upload_dir = wp_upload_dir();
        $vx_upload_dir = $upload_dir['basedir'] . '/vortex360';
        
        if (file_exists($vx_upload_dir)) {
            self::delete_directory($vx_upload_dir);
        }
    }
    
    /**
     * Remove plugin posts and meta.
     * Deletes tours and associated metadata.
     */
    private static function remove_posts() {
        global $wpdb;
        
        // Get all tour posts
        $tour_posts = get_posts([
            'post_type' => 'vx_tour',
            'numberposts' => -1,
            'post_status' => 'any'
        ]);
        
        // Delete tour posts and meta
        foreach ($tour_posts as $post) {
            wp_delete_post($post->ID, true);
        }
        
        // Clean up orphaned meta
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE %s",
                '_vx_%'
            )
        );
    }
    
    /**
     * Recursively delete directory.
     * Helper function to remove directories and contents.
     * 
     * @param string $dir Directory path
     * @return bool Success status
     */
    private static function delete_directory($dir) {
        if (!file_exists($dir)) {
            return true;
        }
        
        if (!is_dir($dir)) {
            return unlink($dir);
        }
        
        foreach (scandir($dir) as $item) {
            if ($item == '.' || $item == '..') {
                continue;
            }
            
            if (!self::delete_directory($dir . DIRECTORY_SEPARATOR . $item)) {
                return false;
            }
        }
        
        return rmdir($dir);
    }
    
    /**
     * Check if plugin needs database update.
     * Compares current and stored database versions.
     * 
     * @return bool True if update needed
     */
    public static function needs_database_update() {
        $current_version = get_option('vx_db_version', '0');
        return version_compare($current_version, VX_DB_VERSION, '<');
    }
    
    /**
     * Update database schema.
     * Performs incremental database updates.
     */
    public static function update_database() {
        $current_version = get_option('vx_db_version', '0');
        
        // Perform version-specific updates
        if (version_compare($current_version, '1.0.0', '<')) {
            self::create_tables();
        }
        
        // Update version
        update_option('vx_db_version', VX_DB_VERSION);
        
        // Fire update hook
        do_action('vx_database_updated', $current_version, VX_DB_VERSION);
    }
}