<?php
/**
 * Vortex360 Lite - Database Management
 * 
 * Handles database table creation and migration for tours, scenes, and hotspots
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VX_Database {
    
    /**
     * Database version
     */
    const DB_VERSION = '1.0.0';
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        register_activation_hook(VX_LITE_FILE, array($this, 'create_tables'));
        add_action('plugins_loaded', array($this, 'check_database_version'));
    }
    
    /**
     * Check database version and update if needed
     */
    public function check_database_version() {
        $installed_version = get_option('vx_db_version', '0.0.0');
        
        if (version_compare($installed_version, self::DB_VERSION, '<')) {
            $this->create_tables();
            update_option('vx_db_version', self::DB_VERSION);
        }
    }
    
    /**
     * Create database tables
     */
    public function create_tables() {
        global $wpdb;
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        
        $charset_collate = $wpdb->get_charset_collate();
        
        // Tours table
        $tours_table = $wpdb->prefix . 'vx_tours';
        $tours_sql = "CREATE TABLE $tours_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            post_id bigint(20) unsigned NOT NULL,
            title varchar(255) NOT NULL DEFAULT '',
            description text,
            settings longtext,
            scenes_data longtext,
            status varchar(20) NOT NULL DEFAULT 'draft',
            view_count bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY post_id (post_id),
            KEY status (status),
            KEY created_at (created_at)
        ) $charset_collate;";
        
        // Scenes table
        $scenes_table = $wpdb->prefix . 'vx_scenes';
        $scenes_sql = "CREATE TABLE $scenes_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            tour_id bigint(20) unsigned NOT NULL,
            scene_id varchar(50) NOT NULL,
            title varchar(255) NOT NULL DEFAULT '',
            type varchar(20) NOT NULL DEFAULT 'sphere',
            image_id bigint(20) unsigned,
            image_url varchar(500),
            preview_image_id bigint(20) unsigned,
            preview_image_url varchar(500),
            init_yaw float NOT NULL DEFAULT 0,
            init_pitch float NOT NULL DEFAULT 0,
            init_fov float NOT NULL DEFAULT 70,
            sort_order int(11) NOT NULL DEFAULT 0,
            view_count bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tour_id (tour_id),
            KEY scene_id (scene_id),
            KEY sort_order (sort_order),
            UNIQUE KEY tour_scene (tour_id, scene_id),
            FOREIGN KEY (tour_id) REFERENCES $tours_table(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Hotspots table
        $hotspots_table = $wpdb->prefix . 'vx_hotspots';
        $hotspots_sql = "CREATE TABLE $hotspots_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            scene_id bigint(20) unsigned NOT NULL,
            hotspot_id varchar(50) NOT NULL,
            type varchar(20) NOT NULL DEFAULT 'info',
            title varchar(255) NOT NULL DEFAULT '',
            text text,
            url varchar(500),
            target_scene_id varchar(50),
            yaw float NOT NULL DEFAULT 0,
            pitch float NOT NULL DEFAULT 0,
            icon varchar(50) NOT NULL DEFAULT 'info',
            click_count bigint(20) unsigned NOT NULL DEFAULT 0,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY scene_id (scene_id),
            KEY hotspot_id (hotspot_id),
            KEY type (type),
            UNIQUE KEY scene_hotspot (scene_id, hotspot_id),
            FOREIGN KEY (scene_id) REFERENCES $scenes_table(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Analytics table
        $analytics_table = $wpdb->prefix . 'vx_analytics';
        $analytics_sql = "CREATE TABLE $analytics_table (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            tour_id bigint(20) unsigned NOT NULL,
            scene_id varchar(50),
            hotspot_id varchar(50),
            event_type varchar(20) NOT NULL,
            user_id bigint(20) unsigned,
            session_id varchar(100),
            ip_address varchar(45),
            user_agent text,
            referrer varchar(500),
            event_data longtext,
            created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY tour_id (tour_id),
            KEY event_type (event_type),
            KEY created_at (created_at),
            KEY session_id (session_id),
            FOREIGN KEY (tour_id) REFERENCES $tours_table(id) ON DELETE CASCADE
        ) $charset_collate;";
        
        // Execute table creation
        dbDelta($tours_sql);
        dbDelta($scenes_sql);
        dbDelta($hotspots_sql);
        dbDelta($analytics_sql);
        
        // Create indexes for better performance
        $this->create_indexes();
        
        // Insert default data if needed
        $this->insert_default_data();
    }
    
    /**
     * Create additional indexes for performance
     */
    private function create_indexes() {
        global $wpdb;
        
        $tours_table = $wpdb->prefix . 'vx_tours';
        $scenes_table = $wpdb->prefix . 'vx_scenes';
        $hotspots_table = $wpdb->prefix . 'vx_hotspots';
        $analytics_table = $wpdb->prefix . 'vx_analytics';
        
        // Additional composite indexes
        $wpdb->query("CREATE INDEX IF NOT EXISTS idx_tour_status_created ON $tours_table (status, created_at)");
        $wpdb->query("CREATE INDEX IF NOT EXISTS idx_scene_tour_order ON $scenes_table (tour_id, sort_order)");
        $wpdb->query("CREATE INDEX IF NOT EXISTS idx_hotspot_scene_type ON $hotspots_table (scene_id, type)");
        $wpdb->query("CREATE INDEX IF NOT EXISTS idx_analytics_tour_event_date ON $analytics_table (tour_id, event_type, created_at)");
    }
    
    /**
     * Insert default data
     */
    private function insert_default_data() {
        // Add any default settings or sample data here if needed
        $default_settings = array(
            'ui' => array(
                'showThumbnails' => true,
                'showZoom' => true,
                'showFullscreen' => true,
                'showCompass' => false
            ),
            'autorotate' => array(
                'enabled' => false,
                'speed' => 0.3,
                'pauseOnHover' => true
            ),
            'mobile' => array(
                'gyro' => true,
                'touch' => true
            ),
            'performance' => array(
                'lazyLoad' => true,
                'preloadNext' => true
            )
        );
        
        update_option('vx_default_settings', $default_settings);
    }
    
    /**
     * Drop tables (for uninstall)
     */
    public static function drop_tables() {
        global $wpdb;
        
        $tables = array(
            $wpdb->prefix . 'vx_analytics',
            $wpdb->prefix . 'vx_hotspots',
            $wpdb->prefix . 'vx_scenes',
            $wpdb->prefix . 'vx_tours'
        );
        
        foreach ($tables as $table) {
            $wpdb->query("DROP TABLE IF EXISTS $table");
        }
        
        // Clean up options
        delete_option('vx_db_version');
        delete_option('vx_default_settings');
    }
    
    /**
     * Get table names
     */
    public static function get_table_names() {
        global $wpdb;
        
        return array(
            'tours' => $wpdb->prefix . 'vx_tours',
            'scenes' => $wpdb->prefix . 'vx_scenes',
            'hotspots' => $wpdb->prefix . 'vx_hotspots',
            'analytics' => $wpdb->prefix . 'vx_analytics'
        );
    }
    
    /**
     * Check if tables exist
     */
    public function tables_exist() {
        global $wpdb;
        
        $tables = self::get_table_names();
        
        foreach ($tables as $table) {
            if ($wpdb->get_var("SHOW TABLES LIKE '$table'") !== $table) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get database statistics
     */
    public function get_stats() {
        global $wpdb;
        
        $tables = self::get_table_names();
        
        $stats = array(
            'tours_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$tables['tours']}"),
            'scenes_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$tables['scenes']}"),
            'hotspots_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$tables['hotspots']}"),
            'analytics_count' => $wpdb->get_var("SELECT COUNT(*) FROM {$tables['analytics']}"),
            'total_views' => $wpdb->get_var("SELECT SUM(view_count) FROM {$tables['tours']}"),
            'total_interactions' => $wpdb->get_var("SELECT SUM(click_count) FROM {$tables['hotspots']}"),
            'db_version' => get_option('vx_db_version', '0.0.0')
        );
        
        return $stats;
    }
    
    /**
     * Clean up old analytics data (for Lite version limits)
     */
    public function cleanup_analytics($days = 30) {
        global $wpdb;
        
        $analytics_table = $wpdb->prefix . 'vx_analytics';
        $cutoff_date = date('Y-m-d H:i:s', strtotime("-$days days"));
        
        $deleted = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM $analytics_table WHERE created_at < %s",
                $cutoff_date
            )
        );
        
        return $deleted;
    }
    
    /**
     * Optimize database tables
     */
    public function optimize_tables() {
        global $wpdb;
        
        $tables = self::get_table_names();
        
        foreach ($tables as $table) {
            $wpdb->query("OPTIMIZE TABLE $table");
        }
        
        return true;
    }
}

// Initialize database management
new VX_Database();