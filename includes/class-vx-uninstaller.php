<?php
/**
 * Vortex360 Lite - Plugin Uninstaller
 * 
 * Handles complete plugin removal and data cleanup
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin uninstallation handler.
 * Manages complete removal of plugin data and settings.
 */
class VX_Uninstaller {
    
    /**
     * Plugin uninstallation handler.
     * Removes all plugin data based on user preferences.
     */
    public static function uninstall() {
        // Check if user wants to keep data
        $keep_data = get_option('vx_keep_data_on_uninstall', false);
        
        if ($keep_data) {
            // Only perform minimal cleanup
            self::minimal_cleanup();
        } else {
            // Perform complete removal
            self::complete_removal();
        }
        
        // Always clear scheduled events and transients
        self::clear_scheduled_events();
        self::clear_transients();
        
        // Log uninstallation
        self::log_uninstallation();
        
        // Fire uninstall hook
        do_action('vx_plugin_uninstalled');
    }
    
    /**
     * Perform complete plugin removal.
     * Removes all data, settings, and files.
     */
    private static function complete_removal() {
        // Remove database tables
        self::drop_database_tables();
        
        // Remove all options
        self::remove_all_options();
        
        // Remove user meta data
        self::remove_user_meta();
        
        // Remove posts and metadata
        self::remove_posts_and_meta();
        
        // Remove upload directories
        self::remove_upload_directories();
        
        // Remove capabilities
        self::remove_capabilities();
        
        // Clean up taxonomy terms
        self::remove_taxonomy_terms();
    }
    
    /**
     * Perform minimal cleanup.
     * Keeps user data but removes temporary files.
     */
    private static function minimal_cleanup() {
        // Remove only temporary data
        self::clear_cache_files();
        self::cleanup_temp_files();
        
        // Remove non-essential options
        $temp_options = [
            'vx_activation_time',
            'vx_deactivation_time',
            'vx_last_cleanup',
            'vx_cache_stats',
            'vx_temp_settings'
        ];
        
        foreach ($temp_options as $option) {
            delete_option($option);
        }
    }
    
    /**
     * Drop all plugin database tables.
     * Removes custom tables created by the plugin.
     */
    private static function drop_database_tables() {
        global $wpdb;
        
        $tables = [
            $wpdb->prefix . 'vx_tours',
            $wpdb->prefix . 'vx_scenes',
            $wpdb->prefix . 'vx_hotspots',
            $wpdb->prefix . 'vx_analytics'
        ];
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS `$table`");
        }
        
        // Remove database version option
        delete_option('vx_db_version');
    }
    
    /**
     * Remove all plugin options.
     * Deletes all settings and configuration data.
     */
    private static function remove_all_options() {
        global $wpdb;
        
        // Get all plugin options
        $options = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT option_name FROM {$wpdb->options} WHERE option_name LIKE %s",
                'vx_%'
            )
        );
        
        // Delete each option
        foreach ($options as $option) {
            delete_option($option);
        }
        
        // Also remove site options for multisite
        if (is_multisite()) {
            $site_options = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT meta_key FROM {$wpdb->sitemeta} WHERE meta_key LIKE %s",
                    'vx_%'
                )
            );
            
            foreach ($site_options as $option) {
                delete_site_option($option);
            }
        }
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
        
        // Remove user capabilities
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->usermeta} WHERE meta_key LIKE %s",
                '%vx_%'
            )
        );
    }
    
    /**
     * Remove posts and metadata.
     * Deletes all tour posts and associated data.
     */
    private static function remove_posts_and_meta() {
        global $wpdb;
        
        // Get all tour posts
        $tour_posts = get_posts([
            'post_type' => 'vx_tour',
            'numberposts' => -1,
            'post_status' => 'any',
            'fields' => 'ids'
        ]);
        
        // Delete posts and their meta
        foreach ($tour_posts as $post_id) {
            // Delete post meta
            $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM {$wpdb->postmeta} WHERE post_id = %d",
                    $post_id
                )
            );
            
            // Delete the post
            wp_delete_post($post_id, true);
        }
        
        // Clean up any orphaned meta
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->postmeta} WHERE meta_key LIKE %s",
                '_vx_%'
            )
        );
        
        // Remove post type and taxonomy data
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->posts} WHERE post_type = %s",
                'vx_tour'
            )
        );
    }
    
    /**
     * Remove upload directories.
     * Deletes all plugin upload folders and files.
     */
    private static function remove_upload_directories() {
        $upload_dir = wp_upload_dir();
        $vx_upload_dir = $upload_dir['basedir'] . '/vortex360';
        
        if (file_exists($vx_upload_dir)) {
            self::delete_directory_recursive($vx_upload_dir);
        }
    }
    
    /**
     * Remove custom capabilities.
     * Removes plugin-specific user capabilities.
     */
    private static function remove_capabilities() {
        global $wp_roles;
        
        if (!isset($wp_roles)) {
            $wp_roles = new WP_Roles();
        }
        
        $capabilities = [
            'manage_vx_tours',
            'edit_vx_tours',
            'edit_others_vx_tours',
            'publish_vx_tours',
            'read_private_vx_tours',
            'delete_vx_tours',
            'delete_private_vx_tours',
            'delete_published_vx_tours',
            'delete_others_vx_tours',
            'edit_private_vx_tours',
            'edit_published_vx_tours'
        ];
        
        foreach ($wp_roles->roles as $role_name => $role_info) {
            $role = get_role($role_name);
            if ($role) {
                foreach ($capabilities as $cap) {
                    $role->remove_cap($cap);
                }
            }
        }
    }
    
    /**
     * Remove taxonomy terms.
     * Deletes custom taxonomy terms and relationships.
     */
    private static function remove_taxonomy_terms() {
        $taxonomies = ['vx_tour_category', 'vx_tour_tag'];
        
        foreach ($taxonomies as $taxonomy) {
            $terms = get_terms([
                'taxonomy' => $taxonomy,
                'hide_empty' => false,
                'fields' => 'ids'
            ]);
            
            if (!is_wp_error($terms)) {
                foreach ($terms as $term_id) {
                    wp_delete_term($term_id, $taxonomy);
                }
            }
        }
    }
    
    /**
     * Clear scheduled events.
     * Removes all plugin-related cron jobs.
     */
    private static function clear_scheduled_events() {
        $events = [
            'vx_cleanup_analytics',
            'vx_cleanup_cache',
            'vx_cleanup_temp_files',
            'vx_process_analytics',
            'vx_optimize_database',
            'vx_backup_settings',
            'vx_check_updates',
            'vx_send_reports'
        ];
        
        foreach ($events as $event) {
            wp_clear_scheduled_hook($event);
        }
    }
    
    /**
     * Clear transients and cache.
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
        
        // Delete site transients
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                '_site_transient_vx_%',
                '_site_transient_timeout_vx_%'
            )
        );
        
        // Clear object cache
        if (function_exists('wp_cache_flush_group')) {
            wp_cache_flush_group('vortex360');
        }
    }
    
    /**
     * Clear cache files.
     * Removes file-based cache data.
     */
    private static function clear_cache_files() {
        $upload_dir = wp_upload_dir();
        $cache_dir = $upload_dir['basedir'] . '/vortex360/cache';
        
        if (file_exists($cache_dir)) {
            $files = glob($cache_dir . '/*');
            foreach ($files as $file) {
                if (is_file($file)) {
                    unlink($file);
                }
            }
        }
    }
    
    /**
     * Clean up temporary files.
     * Removes temporary files and directories.
     */
    private static function cleanup_temp_files() {
        $upload_dir = wp_upload_dir();
        $temp_dir = $upload_dir['basedir'] . '/vortex360/temp';
        
        if (file_exists($temp_dir)) {
            self::delete_directory_recursive($temp_dir);
            wp_mkdir_p($temp_dir); // Recreate empty directory
        }
    }
    
    /**
     * Recursively delete directory.
     * Helper function to remove directories and all contents.
     * 
     * @param string $dir Directory path
     * @return bool Success status
     */
    private static function delete_directory_recursive($dir) {
        if (!file_exists($dir)) {
            return true;
        }
        
        if (!is_dir($dir)) {
            return unlink($dir);
        }
        
        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            if (is_dir($path)) {
                self::delete_directory_recursive($path);
            } else {
                unlink($path);
            }
        }
        
        return rmdir($dir);
    }
    
    /**
     * Log uninstallation event.
     * Records uninstallation for analytics.
     */
    private static function log_uninstallation() {
        $log_data = [
            'timestamp' => current_time('mysql'),
            'version' => defined('VX_VERSION') ? VX_VERSION : 'unknown',
            'wp_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'user_id' => get_current_user_id(),
            'site_url' => get_site_url(),
            'keep_data' => get_option('vx_keep_data_on_uninstall', false),
            'reason' => get_option('vx_uninstall_reason', 'not_specified')
        ];
        
        // Try to log to file if possible
        $upload_dir = wp_upload_dir();
        $log_file = $upload_dir['basedir'] . '/vortex360-uninstall.log';
        
        if (is_writable(dirname($log_file))) {
            file_put_contents(
                $log_file,
                json_encode($log_data) . "\n",
                FILE_APPEND | LOCK_EX
            );
        }
        
        // Also log to WordPress error log
        error_log('Vortex360 Lite uninstalled: ' . json_encode($log_data));
    }
    
    /**
     * Check if safe to uninstall.
     * Verifies no critical processes are running.
     * 
     * @return array Status and messages
     */
    public static function check_uninstall_safety() {
        $issues = [];
        
        // Check for running processes
        if (get_transient('vx_import_in_progress')) {
            $issues[] = __('Import process is currently running', 'vortex360-lite');
        }
        
        if (get_transient('vx_export_in_progress')) {
            $issues[] = __('Export process is currently running', 'vortex360-lite');
        }
        
        if (get_transient('vx_file_operation_in_progress')) {
            $issues[] = __('File operation is currently running', 'vortex360-lite');
        }
        
        // Check for active tours
        $active_tours = get_posts([
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'numberposts' => 1,
            'fields' => 'ids'
        ]);
        
        if (!empty($active_tours)) {
            $tour_count = wp_count_posts('vx_tour')->publish;
            $issues[] = sprintf(
                __('You have %d published tours that will be deleted', 'vortex360-lite'),
                $tour_count
            );
        }
        
        return [
            'safe' => empty($issues),
            'issues' => $issues,
            'can_proceed' => true // Always allow in Lite version
        ];
    }
    
    /**
     * Get uninstall options.
     * Returns available uninstall configuration options.
     * 
     * @return array Uninstall options
     */
    public static function get_uninstall_options() {
        return [
            'keep_data' => [
                'label' => __('Keep tour data', 'vortex360-lite'),
                'description' => __('Preserve tours and settings for future use', 'vortex360-lite'),
                'default' => false
            ],
            'remove_uploads' => [
                'label' => __('Remove uploaded files', 'vortex360-lite'),
                'description' => __('Delete all tour images and media files', 'vortex360-lite'),
                'default' => true
            ],
            'remove_settings' => [
                'label' => __('Remove all settings', 'vortex360-lite'),
                'description' => __('Delete plugin configuration and preferences', 'vortex360-lite'),
                'default' => true
            ],
            'send_feedback' => [
                'label' => __('Send anonymous feedback', 'vortex360-lite'),
                'description' => __('Help improve the plugin with usage statistics', 'vortex360-lite'),
                'default' => false
            ]
        ];
    }
    
    /**
     * Prepare uninstall data export.
     * Creates backup of user data before removal.
     * 
     * @return string|false Export file path or false on failure
     */
    public static function prepare_data_export() {
        $upload_dir = wp_upload_dir();
        $export_dir = $upload_dir['basedir'] . '/vortex360-export';
        
        if (!wp_mkdir_p($export_dir)) {
            return false;
        }
        
        $export_data = [
            'version' => defined('VX_VERSION') ? VX_VERSION : '1.0.0',
            'export_date' => current_time('mysql'),
            'site_url' => get_site_url(),
            'tours' => [],
            'settings' => [
                'general' => get_option('vx_general_settings', []),
                'performance' => get_option('vx_performance_settings', []),
                'seo' => get_option('vx_seo_settings', [])
            ]
        ];
        
        // Export tour data
        $tours = get_posts([
            'post_type' => 'vx_tour',
            'numberposts' => -1,
            'post_status' => 'any'
        ]);
        
        foreach ($tours as $tour) {
            $tour_data = get_post_meta($tour->ID, '_vx_tour_data', true);
            $export_data['tours'][] = [
                'id' => $tour->ID,
                'title' => $tour->post_title,
                'content' => $tour->post_content,
                'status' => $tour->post_status,
                'date' => $tour->post_date,
                'data' => $tour_data
            ];
        }
        
        $export_file = $export_dir . '/vortex360-backup-' . date('Y-m-d-H-i-s') . '.json';
        
        if (file_put_contents($export_file, json_encode($export_data, JSON_PRETTY_PRINT))) {
            return $export_file;
        }
        
        return false;
    }
}