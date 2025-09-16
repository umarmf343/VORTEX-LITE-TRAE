<?php
/**
 * Database management class for Vortex360 Lite
 * Handles table creation, updates, and database operations
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Database class for managing plugin tables and operations
 */
class Vortex360_Lite_Database {
    
    /**
     * Database version for tracking schema changes
     */
    const DB_VERSION = '1.0.0';
    
    /**
     * Constructor
     */
    public function __construct() {
        // Hook into WordPress init to check for database updates
        add_action('init', array($this, 'check_database_version'));
    }
    
    /**
     * Create all plugin database tables
     * Called during plugin activation
     */
    public function create_tables() {
        global $wpdb;
        
        // Require WordPress upgrade functions
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        // Create tours table
        $this->create_tours_table();
        
        // Create scenes table
        $this->create_scenes_table();
        
        // Create hotspots table
        $this->create_hotspots_table();
        
        // Update database version
        update_option('vortex360_lite_db_version', self::DB_VERSION);
    }
    
    /**
     * Create tours table for storing virtual tour data
     */
    private function create_tours_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            title varchar(255) NOT NULL,
            description text,
            slug varchar(255) NOT NULL,
            status enum('draft','published','archived') DEFAULT 'draft',
            settings longtext,
            created_by bigint(20) UNSIGNED NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY slug (slug),
            KEY created_by (created_by),
            KEY status (status)
        ) $charset_collate;";
        
        dbDelta($sql);
    }
    
    /**
     * Create scenes table for storing 360° scene data
     */
    private function create_scenes_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            tour_id mediumint(9) NOT NULL,
            title varchar(255) NOT NULL,
            description text,
            image_url varchar(500) NOT NULL,
            image_type enum('equirectangular','cubemap') DEFAULT 'equirectangular',
            is_default tinyint(1) DEFAULT 0,
            sort_order int(11) DEFAULT 0,
            settings longtext,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tour_id (tour_id),
            KEY sort_order (sort_order),
            FOREIGN KEY (tour_id) REFERENCES {$wpdb->prefix}vortex360_tours(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        dbDelta($sql);
    }
    
    /**
     * Create hotspots table for storing interactive hotspot data
     */
    private function create_hotspots_table() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            scene_id mediumint(9) NOT NULL,
            type enum('info','scene','url','image','video') DEFAULT 'info',
            title varchar(255),
            content text,
            target_scene_id mediumint(9) NULL,
            target_url varchar(500) NULL,
            media_url varchar(500) NULL,
            pitch decimal(10,6) NOT NULL,
            yaw decimal(10,6) NOT NULL,
            css_class varchar(100),
            icon varchar(100),
            settings longtext,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY scene_id (scene_id),
            KEY type (type),
            KEY target_scene_id (target_scene_id),
            FOREIGN KEY (scene_id) REFERENCES {$wpdb->prefix}vortex360_scenes(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        dbDelta($sql);
    }
    
    /**
     * Check if database needs to be updated
     * Compares stored version with current version
     */
    public function check_database_version() {
        $installed_version = get_option('vortex360_lite_db_version');
        
        if ($installed_version !== self::DB_VERSION) {
            $this->update_database($installed_version);
        }
    }
    
    /**
     * Update database schema when version changes
     * @param string $installed_version Currently installed database version
     */
    private function update_database($installed_version) {
        // Handle database updates for future versions
        if (version_compare($installed_version, '1.0.0', '<')) {
            $this->create_tables();
        }
        
        // Add future migration logic here
        // Example:
        // if (version_compare($installed_version, '1.1.0', '<')) {
        //     $this->migrate_to_1_1_0();
        // }
        
        update_option('vortex360_lite_db_version', self::DB_VERSION);
    }
    
    /**
     * Drop all plugin tables
     * Called during plugin uninstall (not deactivation)
     */
    public function drop_tables() {
        global $wpdb;
        
        $tables = array(
            $wpdb->prefix . 'vortex360_hotspots',
            $wpdb->prefix . 'vortex360_scenes',
            $wpdb->prefix . 'vortex360_tours'
        );
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }
        
        // Clean up options
        delete_option('vortex360_lite_db_version');
        delete_option('vortex360_lite_version');
        delete_option('vortex360_lite_max_tours');
    }
    
    /**
     * Get tour count for current user (Lite version limit check)
     * @param int $user_id WordPress user ID
     * @return int Number of tours created by user
     */
    public function get_user_tour_count($user_id = null) {
        global $wpdb;
        
        if (!$user_id) {
            $user_id = get_current_user_id();
        }
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE created_by = %d",
            $user_id
        ));
        
        return (int) $count;
    }
    
    /**
     * Check if user can create more tours (Lite version limit)
     * @param int $user_id WordPress user ID
     * @return bool True if user can create more tours
     */
    public function can_create_tour($user_id = null) {
        $max_tours = get_option('vortex360_lite_max_tours', 1);
        $current_count = $this->get_user_tour_count($user_id);
        
        return $current_count < $max_tours;
    }
    
    /**
     * Get database table names with prefix
     * @return array Array of table names
     */
    public function get_table_names() {
        global $wpdb;
        
        return array(
            'tours' => $wpdb->prefix . 'vortex360_tours',
            'scenes' => $wpdb->prefix . 'vortex360_scenes',
            'hotspots' => $wpdb->prefix . 'vortex360_hotspots'
        );
    }
    
    /**
     * Sanitize and validate tour data before database insertion
     * @param array $data Tour data array
     * @return array Sanitized data array
     */
    public function sanitize_tour_data($data) {
        return array(
            'title' => sanitize_text_field($data['title'] ?? ''),
            'description' => sanitize_textarea_field($data['description'] ?? ''),
            'slug' => sanitize_title($data['slug'] ?? $data['title'] ?? ''),
            'status' => in_array($data['status'] ?? 'draft', ['draft', 'published', 'archived']) 
                      ? $data['status'] : 'draft',
            'settings' => is_array($data['settings'] ?? null) 
                         ? wp_json_encode($data['settings']) : '{}',
            'created_by' => absint($data['created_by'] ?? get_current_user_id())
        );
    }
    
    /**
     * Sanitize and validate scene data before database insertion
     * @param array $data Scene data array
     * @return array Sanitized data array
     */
    public function sanitize_scene_data($data) {
        return array(
            'tour_id' => absint($data['tour_id'] ?? 0),
            'title' => sanitize_text_field($data['title'] ?? ''),
            'description' => sanitize_textarea_field($data['description'] ?? ''),
            'image_url' => esc_url_raw($data['image_url'] ?? ''),
            'image_type' => in_array($data['image_type'] ?? 'equirectangular', 
                                   ['equirectangular', 'cubemap']) 
                           ? $data['image_type'] : 'equirectangular',
            'is_default' => (bool) ($data['is_default'] ?? false),
            'sort_order' => absint($data['sort_order'] ?? 0),
            'settings' => is_array($data['settings'] ?? null) 
                         ? wp_json_encode($data['settings']) : '{}'
        );
    }
    
    /**
     * Sanitize and validate hotspot data before database insertion
     * @param array $data Hotspot data array
     * @return array Sanitized data array
     */
    public function sanitize_hotspot_data($data) {
        return array(
            'scene_id' => absint($data['scene_id'] ?? 0),
            'type' => in_array($data['type'] ?? 'info', 
                              ['info', 'scene', 'url', 'image', 'video']) 
                     ? $data['type'] : 'info',
            'title' => sanitize_text_field($data['title'] ?? ''),
            'content' => wp_kses_post($data['content'] ?? ''),
            'target_scene_id' => !empty($data['target_scene_id']) 
                                ? absint($data['target_scene_id']) : null,
            'target_url' => !empty($data['target_url']) 
                           ? esc_url_raw($data['target_url']) : null,
            'media_url' => !empty($data['media_url']) 
                          ? esc_url_raw($data['media_url']) : null,
            'pitch' => floatval($data['pitch'] ?? 0),
            'yaw' => floatval($data['yaw'] ?? 0),
            'css_class' => sanitize_html_class($data['css_class'] ?? ''),
            'icon' => sanitize_text_field($data['icon'] ?? ''),
            'settings' => is_array($data['settings'] ?? null) 
                         ? wp_json_encode($data['settings']) : '{}',
            'is_active' => (bool) ($data['is_active'] ?? true)
        );
    }
}