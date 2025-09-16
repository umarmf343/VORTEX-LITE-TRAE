<?php
/**
 * Vortex360 Lite - Upgrade Bridge System
 * 
 * Handles Pro version integration and upgrade functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VX_Upgrade_Bridge {
    
    /**
     * Pro plugin file path
     */
    const PRO_PLUGIN_FILE = 'vortex360-pro/vortex360-pro.php';
    
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
        add_action('admin_init', array($this, 'check_pro_activation'));
        add_action('admin_notices', array($this, 'show_upgrade_notices'));
        add_action('wp_ajax_vx_dismiss_upgrade_notice', array($this, 'dismiss_upgrade_notice'));
        add_action('plugins_loaded', array($this, 'handle_pro_integration'));
        add_filter('plugin_action_links_' . VX_LITE_BASENAME, array($this, 'add_upgrade_link'));
    }
    
    /**
     * Check if Pro version is activated
     */
    public function is_pro_active() {
        return is_plugin_active(self::PRO_PLUGIN_FILE) || class_exists('VX_Pro');
    }
    
    /**
     * Check Pro activation
     */
    public function check_pro_activation() {
        if ($this->is_pro_active()) {
            // Deactivate Lite version when Pro is active
            if (is_plugin_active(VX_LITE_BASENAME)) {
                deactivate_plugins(VX_LITE_BASENAME);
                add_action('admin_notices', array($this, 'show_pro_activated_notice'));
            }
        }
    }
    
    /**
     * Handle Pro integration
     */
    public function handle_pro_integration() {
        if ($this->is_pro_active()) {
            // Transfer data to Pro version if needed
            $this->maybe_transfer_data_to_pro();
        }
    }
    
    /**
     * Transfer data to Pro version
     */
    private function maybe_transfer_data_to_pro() {
        $transferred = get_option('vx_data_transferred_to_pro', false);
        
        if (!$transferred && class_exists('VX_Pro_Data_Migration')) {
            // Let Pro version handle the migration
            do_action('vx_lite_to_pro_migration');
            update_option('vx_data_transferred_to_pro', true);
        }
    }
    
    /**
     * Show upgrade notices
     */
    public function show_upgrade_notices() {
        if ($this->is_pro_active()) {
            return;
        }
        
        $screen = get_current_screen();
        if (!$screen || strpos($screen->id, 'vx_tour') === false) {
            return;
        }
        
        $dismissed = get_user_meta(get_current_user_id(), 'vx_upgrade_notice_dismissed', true);
        if ($dismissed) {
            return;
        }
        
        $this->render_upgrade_notice();
    }
    
    /**
     * Render upgrade notice
     */
    private function render_upgrade_notice() {
        ?>
        <div class="notice notice-info is-dismissible vx-upgrade-notice" data-notice="upgrade">
            <div class="vx-upgrade-notice-content">
                <div class="vx-upgrade-icon">
                    <span class="dashicons dashicons-star-filled"></span>
                </div>
                <div class="vx-upgrade-text">
                    <h3><?php _e('Upgrade to Vortex360 Pro', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Unlock unlimited tours, advanced hotspots, analytics, and premium support!', 'vortex360-lite'); ?></p>
                    <ul class="vx-pro-features">
                        <li>✓ <?php _e('Unlimited Tours & Scenes', 'vortex360-lite'); ?></li>
                        <li>✓ <?php _e('Advanced Hotspot Types', 'vortex360-lite'); ?></li>
                        <li>✓ <?php _e('Detailed Analytics', 'vortex360-lite'); ?></li>
                        <li>✓ <?php _e('Premium Support', 'vortex360-lite'); ?></li>
                    </ul>
                </div>
                <div class="vx-upgrade-actions">
                    <a href="#" class="button button-primary vx-upgrade-btn">
                        <?php _e('Upgrade Now', 'vortex360-lite'); ?>
                    </a>
                    <a href="#" class="button button-secondary vx-learn-more">
                        <?php _e('Learn More', 'vortex360-lite'); ?>
                    </a>
                </div>
            </div>
        </div>
        
        <style>
        .vx-upgrade-notice {
            border-left-color: #007cba;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        }
        .vx-upgrade-notice-content {
            display: flex;
            align-items: center;
            gap: 20px;
            padding: 10px 0;
        }
        .vx-upgrade-icon {
            font-size: 48px;
            color: #007cba;
        }
        .vx-upgrade-text h3 {
            margin: 0 0 10px;
            color: #333;
        }
        .vx-upgrade-text p {
            margin: 0 0 15px;
            color: #666;
        }
        .vx-pro-features {
            list-style: none;
            margin: 0;
            padding: 0;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        .vx-pro-features li {
            color: #28a745;
            font-size: 14px;
            font-weight: 500;
        }
        .vx-upgrade-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        @media (max-width: 768px) {
            .vx-upgrade-notice-content {
                flex-direction: column;
                text-align: center;
            }
            .vx-pro-features {
                justify-content: center;
            }
        }
        </style>
        
        <script>
        jQuery(document).ready(function($) {
            $('.vx-upgrade-notice').on('click', '.notice-dismiss', function() {
                $.post(ajaxurl, {
                    action: 'vx_dismiss_upgrade_notice',
                    nonce: '<?php echo wp_create_nonce('vx_dismiss_upgrade'); ?>'
                });
            });
        });
        </script>
        <?php
    }
    
    /**
     * Dismiss upgrade notice
     */
    public function dismiss_upgrade_notice() {
        if (!wp_verify_nonce($_POST['nonce'], 'vx_dismiss_upgrade')) {
            wp_die();
        }
        
        update_user_meta(get_current_user_id(), 'vx_upgrade_notice_dismissed', true);
        wp_die();
    }
    
    /**
     * Show Pro activated notice
     */
    public function show_pro_activated_notice() {
        ?>
        <div class="notice notice-success">
            <p><?php _e('Vortex360 Pro is now active! The Lite version has been automatically deactivated.', 'vortex360-lite'); ?></p>
        </div>
        <?php
    }
    
    /**
     * Add upgrade link to plugin actions
     */
    public function add_upgrade_link($links) {
        if ($this->is_pro_active()) {
            return $links;
        }
        
        $upgrade_link = '<a href="#" style="color: #007cba; font-weight: bold;">' . 
                       __('Upgrade to Pro', 'vortex360-lite') . '</a>';
        
        array_unshift($links, $upgrade_link);
        return $links;
    }
    
    /**
     * Get Pro features comparison
     */
    public function get_features_comparison() {
        return array(
            'tours' => array(
                'lite' => '5',
                'pro' => __('Unlimited', 'vortex360-lite')
            ),
            'scenes' => array(
                'lite' => '5 per tour',
                'pro' => __('Unlimited', 'vortex360-lite')
            ),
            'hotspots' => array(
                'lite' => '5 per scene',
                'pro' => __('Unlimited', 'vortex360-lite')
            ),
            'hotspot_types' => array(
                'lite' => __('Basic (Info, Link)', 'vortex360-lite'),
                'pro' => __('Advanced (Video, Audio, Image, Custom)', 'vortex360-lite')
            ),
            'analytics' => array(
                'lite' => __('Basic', 'vortex360-lite'),
                'pro' => __('Advanced with Reports', 'vortex360-lite')
            ),
            'support' => array(
                'lite' => __('Community', 'vortex360-lite'),
                'pro' => __('Priority Support', 'vortex360-lite')
            ),
            'branding' => array(
                'lite' => __('Vortex360 Branding', 'vortex360-lite'),
                'pro' => __('White Label', 'vortex360-lite')
            )
        );
    }
    
    /**
     * Check if feature is available in Lite
     */
    public function is_feature_available($feature) {
        $lite_features = array(
            'basic_tours',
            'basic_scenes',
            'basic_hotspots',
            'shortcode',
            'gutenberg_block',
            'elementor_widget',
            'basic_analytics',
            'import_export',
            'duplicate'
        );
        
        return in_array($feature, $lite_features);
    }
    
    /**
     * Get upgrade URL
     */
    public function get_upgrade_url() {
        return apply_filters('vx_upgrade_url', '#');
    }
    
    /**
     * Get Pro plugin download URL
     */
    public function get_pro_download_url() {
        return apply_filters('vx_pro_download_url', '#');
    }
    
    /**
     * Prepare data for Pro migration
     */
    public function prepare_migration_data() {
        $migration_data = array(
            'tours' => array(),
            'settings' => get_option('vx_settings', array()),
            'version' => VX_LITE_VERSION,
            'migration_date' => current_time('mysql')
        );
        
        // Get all tours
        $tours = get_posts(array(
            'post_type' => 'vx_tour',
            'post_status' => 'any',
            'posts_per_page' => -1
        ));
        
        foreach ($tours as $tour) {
            $tour_data = array(
                'post' => $tour,
                'meta' => get_post_meta($tour->ID),
                'scenes' => get_post_meta($tour->ID, 'vx_scenes', true),
                'hotspots' => get_post_meta($tour->ID, 'vx_hotspots', true)
            );
            
            $migration_data['tours'][] = $tour_data;
        }
        
        return $migration_data;
    }
    
    /**
     * Create migration backup
     */
    public function create_migration_backup() {
        $backup_data = $this->prepare_migration_data();
        $backup_file = wp_upload_dir()['basedir'] . '/vortex360-lite-backup-' . date('Y-m-d-H-i-s') . '.json';
        
        $result = file_put_contents($backup_file, json_encode($backup_data, JSON_PRETTY_PRINT));
        
        if ($result !== false) {
            update_option('vx_migration_backup_file', $backup_file);
            return $backup_file;
        }
        
        return false;
    }
    
    /**
     * Clean up after Pro activation
     */
    public function cleanup_after_pro_activation() {
        // Remove Lite-specific options
        delete_option('vx_lite_activation_date');
        delete_option('vx_lite_version');
        
        // Clear user meta
        global $wpdb;
        $wpdb->delete(
            $wpdb->usermeta,
            array('meta_key' => 'vx_upgrade_notice_dismissed')
        );
        
        // Clear transients
        $wpdb->query(
            "DELETE FROM {$wpdb->options} 
             WHERE option_name LIKE '_transient_vx_%' 
             OR option_name LIKE '_transient_timeout_vx_%'"
        );
    }
    
    /**
     * Get migration status
     */
    public function get_migration_status() {
        return array(
            'pro_active' => $this->is_pro_active(),
            'data_transferred' => get_option('vx_data_transferred_to_pro', false),
            'backup_created' => get_option('vx_migration_backup_file', false),
            'cleanup_completed' => !get_option('vx_lite_activation_date', false)
        );
    }
}

// Initialize upgrade bridge
new VX_Upgrade_Bridge();