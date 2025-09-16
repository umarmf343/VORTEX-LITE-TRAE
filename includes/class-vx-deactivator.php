<?php
/**
 * Vortex360 Lite - Plugin Deactivator
 * 
 * Handles plugin deactivation and cleanup processes
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Plugin deactivation handler.
 * Manages cleanup processes when the plugin is deactivated.
 */
class VX_Deactivator {
    
    /**
     * Plugin deactivation handler.
     * Performs cleanup tasks when plugin is deactivated.
     */
    public static function deactivate() {
        // Clear scheduled events
        self::clear_scheduled_events();
        
        // Clear transients and cache
        self::clear_cache();
        
        // Flush rewrite rules
        self::flush_rewrite_rules();
        
        // Clean up temporary files
        self::cleanup_temp_files();
        
        // Update deactivation timestamp
        update_option('vx_deactivation_time', current_time('timestamp'));
        
        // Fire deactivation hook
        do_action('vx_plugin_deactivated');
        
        // Log deactivation
        self::log_deactivation();
    }
    
    /**
     * Clear all scheduled cron events.
     * Removes plugin-specific scheduled tasks.
     */
    private static function clear_scheduled_events() {
        $events = [
            'vx_cleanup_analytics',
            'vx_cleanup_cache',
            'vx_cleanup_temp_files',
            'vx_process_analytics',
            'vx_optimize_database',
            'vx_backup_settings'
        ];
        
        foreach ($events as $event) {
            $timestamp = wp_next_scheduled($event);
            if ($timestamp) {
                wp_unschedule_event($timestamp, $event);
            }
            
            // Clear all instances of the event
            wp_clear_scheduled_hook($event);
        }
        
        // Clear any custom intervals
        wp_clear_scheduled_hook('vx_custom_interval');
    }
    
    /**
     * Clear plugin cache and transients.
     * Removes temporary cached data and transients.
     */
    private static function clear_cache() {
        global $wpdb;
        
        // Delete plugin-specific transients
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                '_transient_vx_%',
                '_transient_timeout_vx_%'
            )
        );
        
        // Clear site transients
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
                '_site_transient_vx_%',
                '_site_transient_timeout_vx_%'
            )
        );
        
        // Clear object cache if available
        if (function_exists('wp_cache_flush_group')) {
            wp_cache_flush_group('vortex360');
        }
        
        // Clear file-based cache
        self::clear_file_cache();
    }
    
    /**
     * Clear file-based cache.
     * Removes cached files from upload directory.
     */
    private static function clear_file_cache() {
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
     * Flush WordPress rewrite rules.
     * Removes custom rewrite rules added by the plugin.
     */
    private static function flush_rewrite_rules() {
        // Remove custom post type rules
        flush_rewrite_rules();
        
        // Clear any custom rewrite rules
        global $wp_rewrite;
        $wp_rewrite->flush_rules(true);
    }
    
    /**
     * Clean up temporary files.
     * Removes temporary files created during plugin operation.
     */
    private static function cleanup_temp_files() {
        $upload_dir = wp_upload_dir();
        $temp_dir = $upload_dir['basedir'] . '/vortex360/temp';
        
        if (file_exists($temp_dir)) {
            $files = glob($temp_dir . '/*');
            $current_time = time();
            
            foreach ($files as $file) {
                if (is_file($file)) {
                    // Remove files older than 1 hour
                    if ($current_time - filemtime($file) > 3600) {
                        unlink($file);
                    }
                }
            }
        }
        
        // Clean up any orphaned upload files
        self::cleanup_orphaned_uploads();
    }
    
    /**
     * Clean up orphaned upload files.
     * Removes uploaded files that are no longer referenced.
     */
    private static function cleanup_orphaned_uploads() {
        global $wpdb;
        
        $upload_dir = wp_upload_dir();
        $vx_upload_dir = $upload_dir['basedir'] . '/vortex360';
        
        if (!file_exists($vx_upload_dir)) {
            return;
        }
        
        // Get all tour posts
        $tour_posts = get_posts([
            'post_type' => 'vx_tour',
            'numberposts' => -1,
            'post_status' => 'any',
            'fields' => 'ids'
        ]);
        
        if (empty($tour_posts)) {
            return;
        }
        
        // Get all referenced files from tour data
        $referenced_files = [];
        foreach ($tour_posts as $post_id) {
            $tour_data = get_post_meta($post_id, '_vx_tour_data', true);
            if (!empty($tour_data['scenes'])) {
                foreach ($tour_data['scenes'] as $scene) {
                    if (!empty($scene['image_url'])) {
                        $referenced_files[] = basename($scene['image_url']);
                    }
                    if (!empty($scene['panorama_url'])) {
                        $referenced_files[] = basename($scene['panorama_url']);
                    }
                    if (!empty($scene['hotspots'])) {
                        foreach ($scene['hotspots'] as $hotspot) {
                            if (!empty($hotspot['icon_url'])) {
                                $referenced_files[] = basename($hotspot['icon_url']);
                            }
                        }
                    }
                }
            }
        }
        
        // Scan upload directory for orphaned files
        $directories = ['tours', 'scenes', 'hotspots'];
        foreach ($directories as $dir) {
            $dir_path = $vx_upload_dir . '/' . $dir;
            if (file_exists($dir_path)) {
                $files = glob($dir_path . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        $filename = basename($file);
                        if (!in_array($filename, $referenced_files)) {
                            // File is not referenced, but keep recent files
                            if (time() - filemtime($file) > 86400) { // 24 hours
                                unlink($file);
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Log deactivation event.
     * Records deactivation for analytics and debugging.
     */
    private static function log_deactivation() {
        $log_data = [
            'timestamp' => current_time('mysql'),
            'version' => VX_VERSION,
            'wp_version' => get_bloginfo('version'),
            'php_version' => PHP_VERSION,
            'user_id' => get_current_user_id(),
            'site_url' => get_site_url(),
            'active_plugins' => get_option('active_plugins', []),
            'theme' => get_option('current_theme')
        ];
        
        // Store deactivation log
        $existing_log = get_option('vx_deactivation_log', []);
        $existing_log[] = $log_data;
        
        // Keep only last 10 deactivations
        if (count($existing_log) > 10) {
            $existing_log = array_slice($existing_log, -10);
        }
        
        update_option('vx_deactivation_log', $existing_log);
    }
    
    /**
     * Reset plugin to default state.
     * Resets all settings to defaults without removing data.
     */
    public static function reset_to_defaults() {
        // Reset general settings
        update_option('vx_general_settings', [
            'enable_analytics' => true,
            'enable_social_sharing' => false,
            'default_controls' => true,
            'auto_rotate' => false,
            'show_scene_list' => true,
            'enable_fullscreen' => true,
            'enable_gyroscope' => true,
            'loading_screen' => true
        ]);
        
        // Reset performance settings
        update_option('vx_performance_settings', [
            'image_quality' => 'medium',
            'preload_scenes' => false,
            'lazy_load_hotspots' => true,
            'cache_duration' => 3600,
            'optimize_mobile' => true
        ]);
        
        // Reset SEO settings
        update_option('vx_seo_settings', [
            'enable_meta_tags' => true,
            'enable_structured_data' => true,
            'enable_sitemap' => false,
            'default_meta_description' => __('Experience this immersive 360° virtual tour', 'vortex360-lite')
        ]);
        
        // Clear user preferences
        delete_option('vx_user_preferences');
        delete_option('vx_dismissed_notices');
        
        // Fire reset hook
        do_action('vx_settings_reset');
    }
    
    /**
     * Prepare for plugin update.
     * Performs pre-update cleanup and backup.
     */
    public static function prepare_for_update() {
        // Backup current settings
        $settings_backup = [
            'general' => get_option('vx_general_settings', []),
            'performance' => get_option('vx_performance_settings', []),
            'seo' => get_option('vx_seo_settings', []),
            'lite' => get_option('vx_lite_settings', []),
            'version' => VX_VERSION,
            'timestamp' => current_time('mysql')
        ];
        
        update_option('vx_settings_backup', $settings_backup);
        
        // Clear cache before update
        self::clear_cache();
        
        // Set update flag
        update_option('vx_updating', true);
        
        // Fire pre-update hook
        do_action('vx_pre_update', VX_VERSION);
    }
    
    /**
     * Handle emergency deactivation.
     * Performs minimal cleanup for emergency situations.
     */
    public static function emergency_deactivate() {
        // Clear only critical scheduled events
        wp_clear_scheduled_hook('vx_cleanup_analytics');
        wp_clear_scheduled_hook('vx_cleanup_cache');
        
        // Clear transients
        global $wpdb;
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
                '_transient_vx_%'
            )
        );
        
        // Set emergency flag
        update_option('vx_emergency_deactivated', true);
        
        // Log emergency deactivation
        error_log('Vortex360 Lite: Emergency deactivation performed');
    }
    
    /**
     * Check if safe to deactivate.
     * Verifies no critical processes are running.
     * 
     * @return bool True if safe to deactivate
     */
    public static function is_safe_to_deactivate() {
        // Check for running imports/exports
        if (get_transient('vx_import_in_progress') || get_transient('vx_export_in_progress')) {
            return false;
        }
        
        // Check for active file operations
        if (get_transient('vx_file_operation_in_progress')) {
            return false;
        }
        
        // Check for database operations
        if (get_transient('vx_db_operation_in_progress')) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get deactivation feedback.
     * Collects user feedback on deactivation reasons.
     * 
     * @return array Feedback data
     */
    public static function get_deactivation_feedback() {
        return [
            'reasons' => [
                'temporary' => __('Temporary deactivation', 'vortex360-lite'),
                'not_working' => __('Plugin not working as expected', 'vortex360-lite'),
                'found_better' => __('Found a better plugin', 'vortex360-lite'),
                'no_longer_needed' => __('No longer needed', 'vortex360-lite'),
                'too_complicated' => __('Too complicated to use', 'vortex360-lite'),
                'missing_features' => __('Missing features I need', 'vortex360-lite'),
                'other' => __('Other reason', 'vortex360-lite')
            ],
            'feedback_url' => 'https://vortex360.com/feedback/',
            'support_url' => 'https://vortex360.com/support/'
        ];
    }
    
    /**
     * Submit deactivation feedback.
     * Sends feedback to plugin developers.
     * 
     * @param array $feedback Feedback data
     * @return bool Success status
     */
    public static function submit_deactivation_feedback($feedback) {
        $data = [
            'reason' => sanitize_text_field($feedback['reason'] ?? ''),
            'details' => sanitize_textarea_field($feedback['details'] ?? ''),
            'email' => sanitize_email($feedback['email'] ?? ''),
            'site_url' => get_site_url(),
            'wp_version' => get_bloginfo('version'),
            'plugin_version' => VX_VERSION,
            'php_version' => PHP_VERSION,
            'timestamp' => current_time('mysql')
        ];
        
        // Send feedback (in Lite version, just log locally)
        $feedback_log = get_option('vx_feedback_log', []);
        $feedback_log[] = $data;
        
        // Keep only last 50 feedback entries
        if (count($feedback_log) > 50) {
            $feedback_log = array_slice($feedback_log, -50);
        }
        
        update_option('vx_feedback_log', $feedback_log);
        
        // Fire feedback hook
        do_action('vx_deactivation_feedback_submitted', $data);
        
        return true;
    }
}