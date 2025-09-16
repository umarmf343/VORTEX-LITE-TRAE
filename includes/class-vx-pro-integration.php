<?php
/**
 * Vortex360 Lite - Pro Version Integration
 * 
 * Handles Pro version features, upgrade notices, and premium functionality
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Pro integration class.
 * Manages Pro version features and upgrade system.
 */
class VX_Pro_Integration {
    
    /**
     * Pro version URL.
     * @var string
     */
    private $pro_url = 'https://vortex360.com/pro';
    
    /**
     * License API endpoint.
     * @var string
     */
    private $license_api = 'https://api.vortex360.com/v1/license';
    
    /**
     * Pro features list.
     * @var array
     */
    private $pro_features = [
        'unlimited_tours' => 'Unlimited Tours',
        'advanced_hotspots' => 'Advanced Hotspot Types',
        'custom_branding' => 'Custom Branding',
        'analytics' => 'Advanced Analytics',
        'white_label' => 'White Label Solution',
        'priority_support' => 'Priority Support',
        'custom_controls' => 'Custom Control Themes',
        'video_hotspots' => 'Video Hotspots',
        'audio_narration' => 'Audio Narration',
        'multi_language' => 'Multi-language Support',
        'api_access' => 'API Access',
        'bulk_import' => 'Bulk Import/Export'
    ];
    
    /**
     * Dismissed notices.
     * @var array
     */
    private $dismissed_notices = [];
    
    /**
     * Initialize Pro integration.
     * Sets up hooks and Pro feature detection.
     */
    public function __construct() {
        $this->dismissed_notices = get_option('vx_dismissed_notices', []);
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for Pro integration.
     */
    private function init_hooks() {
        // Admin notices
        add_action('admin_notices', [$this, 'show_upgrade_notices']);
        add_action('admin_notices', [$this, 'show_feature_notices']);
        
        // AJAX handlers
        add_action('wp_ajax_vx_dismiss_notice', [$this, 'ajax_dismiss_notice']);
        add_action('wp_ajax_vx_check_pro_status', [$this, 'ajax_check_pro_status']);
        
        // Pro feature restrictions
        add_filter('vx_max_tours_allowed', [$this, 'limit_tours_count']);
        add_filter('vx_available_hotspot_types', [$this, 'limit_hotspot_types']);
        add_filter('vx_enable_analytics', [$this, 'disable_analytics']);
        add_filter('vx_enable_custom_branding', [$this, 'disable_custom_branding']);
        
        // Pro feature hooks
        add_action('vx_tour_settings_page', [$this, 'add_pro_settings_section']);
        add_action('vx_hotspot_types_list', [$this, 'add_pro_hotspot_types']);
        add_action('vx_admin_footer', [$this, 'add_pro_upgrade_banner']);
        
        // License management
        add_action('admin_menu', [$this, 'add_license_page']);
        add_action('admin_init', [$this, 'process_license_actions']);
        
        // Plugin row meta
        add_filter('plugin_row_meta', [$this, 'add_plugin_row_meta'], 10, 2);
        add_filter('plugin_action_links_' . VX_PLUGIN_BASENAME, [$this, 'add_plugin_action_links']);
        
        // Dashboard widget
        add_action('wp_dashboard_setup', [$this, 'add_dashboard_widget']);
        
        // Cron for license checks
        add_action('vx_daily_license_check', [$this, 'check_license_status']);
        if (!wp_next_scheduled('vx_daily_license_check')) {
            wp_schedule_event(time(), 'daily', 'vx_daily_license_check');
        }
    }
    
    /**
     * Show upgrade notices.
     * Displays admin notices promoting Pro version.
     */
    public function show_upgrade_notices() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $screen = get_current_screen();
        
        // Only show on plugin pages
        if (!$screen || strpos($screen->id, 'vortex360') === false) {
            return;
        }
        
        // Don't show if already dismissed
        if (in_array('upgrade_notice', $this->dismissed_notices)) {
            return;
        }
        
        // Show different notices based on usage
        $tour_count = wp_count_posts('vx_tour')->publish;
        
        if ($tour_count >= 3) {
            $this->show_usage_based_notice();
        } else {
            $this->show_general_upgrade_notice();
        }
    }
    
    /**
     * Show feature notices.
     * Displays notices when users try to access Pro features.
     */
    public function show_feature_notices() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $feature_notice = get_transient('vx_feature_notice');
        
        if ($feature_notice) {
            $this->show_pro_feature_notice($feature_notice);
            delete_transient('vx_feature_notice');
        }
    }
    
    /**
     * AJAX handler for dismissing notices.
     * Handles notice dismissal via AJAX.
     */
    public function ajax_dismiss_notice() {
        check_ajax_referer('vx_dismiss_notice', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $notice_id = sanitize_text_field($_POST['notice_id'] ?? '');
        
        if ($notice_id) {
            $this->dismissed_notices[] = $notice_id;
            update_option('vx_dismissed_notices', $this->dismissed_notices);
        }
        
        wp_send_json_success();
    }
    
    /**
     * AJAX handler for checking Pro status.
     * Checks if Pro version is available/installed.
     */
    public function ajax_check_pro_status() {
        check_ajax_referer('vx_check_pro', 'nonce');
        
        $pro_status = [
            'installed' => $this->is_pro_installed(),
            'active' => $this->is_pro_active(),
            'licensed' => $this->is_pro_licensed(),
            'version' => $this->get_pro_version(),
            'features' => $this->get_available_features()
        ];
        
        wp_send_json_success($pro_status);
    }
    
    /**
     * Limit tours count for Lite version.
     * Restricts number of tours in Lite version.
     * 
     * @param int $max_tours Current max tours
     * @return int Limited max tours
     */
    public function limit_tours_count($max_tours) {
        if ($this->is_pro_active()) {
            return $max_tours;
        }
        
        return 5; // Lite version limit
    }
    
    /**
     * Limit hotspot types for Lite version.
     * Restricts available hotspot types in Lite version.
     * 
     * @param array $types Available hotspot types
     * @return array Limited hotspot types
     */
    public function limit_hotspot_types($types) {
        if ($this->is_pro_active()) {
            return $types;
        }
        
        // Only allow basic types in Lite
        $lite_types = ['info', 'link', 'image'];
        
        return array_intersect_key($types, array_flip($lite_types));
    }
    
    /**
     * Disable analytics for Lite version.
     * Disables analytics features in Lite version.
     * 
     * @param bool $enabled Current analytics status
     * @return bool Modified analytics status
     */
    public function disable_analytics($enabled) {
        if ($this->is_pro_active()) {
            return $enabled;
        }
        
        return false;
    }
    
    /**
     * Disable custom branding for Lite version.
     * Disables custom branding in Lite version.
     * 
     * @param bool $enabled Current branding status
     * @return bool Modified branding status
     */
    public function disable_custom_branding($enabled) {
        if ($this->is_pro_active()) {
            return $enabled;
        }
        
        return false;
    }
    
    /**
     * Add Pro settings section.
     * Adds Pro features section to settings page.
     */
    public function add_pro_settings_section() {
        if ($this->is_pro_active()) {
            return;
        }
        
        echo '<div class="vx-pro-settings-section">';
        echo '<h3>' . __('Pro Features', 'vortex360-lite') . '</h3>';
        echo '<div class="vx-pro-features-grid">';
        
        foreach ($this->pro_features as $feature_key => $feature_name) {
            echo '<div class="vx-pro-feature">';
            echo '<span class="vx-pro-icon">⭐</span>';
            echo '<span class="vx-pro-name">' . esc_html($feature_name) . '</span>';
            echo '<span class="vx-pro-badge">' . __('Pro', 'vortex360-lite') . '</span>';
            echo '</div>';
        }
        
        echo '</div>';
        echo '<div class="vx-pro-cta">';
        echo '<a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">';
        echo __('Upgrade to Pro', 'vortex360-lite');
        echo '</a>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Add Pro hotspot types.
     * Shows Pro hotspot types with upgrade prompts.
     */
    public function add_pro_hotspot_types() {
        if ($this->is_pro_active()) {
            return;
        }
        
        $pro_hotspots = [
            'video' => __('Video Hotspot', 'vortex360-lite'),
            'audio' => __('Audio Hotspot', 'vortex360-lite'),
            'product' => __('Product Hotspot', 'vortex360-lite'),
            'form' => __('Form Hotspot', 'vortex360-lite'),
            'gallery' => __('Gallery Hotspot', 'vortex360-lite')
        ];
        
        echo '<div class="vx-pro-hotspots">';
        echo '<h4>' . __('Pro Hotspot Types', 'vortex360-lite') . '</h4>';
        
        foreach ($pro_hotspots as $type => $name) {
            echo '<div class="vx-pro-hotspot-type" data-type="' . esc_attr($type) . '">';
            echo '<span class="vx-hotspot-icon vx-icon-' . esc_attr($type) . '"></span>';
            echo '<span class="vx-hotspot-name">' . esc_html($name) . '</span>';
            echo '<span class="vx-pro-badge">' . __('Pro', 'vortex360-lite') . '</span>';
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    /**
     * Add Pro upgrade banner.
     * Shows upgrade banner in admin footer.
     */
    public function add_pro_upgrade_banner() {
        if ($this->is_pro_active()) {
            return;
        }
        
        $screen = get_current_screen();
        
        if (!$screen || strpos($screen->id, 'vortex360') === false) {
            return;
        }
        
        echo '<div class="vx-pro-banner">';
        echo '<div class="vx-pro-banner-content">';
        echo '<h3>' . __('Unlock the Full Potential of Vortex360', 'vortex360-lite') . '</h3>';
        echo '<p>' . __('Get unlimited tours, advanced hotspots, analytics, and more with Vortex360 Pro.', 'vortex360-lite') . '</p>';
        echo '<a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">';
        echo __('Upgrade Now', 'vortex360-lite');
        echo '</a>';
        echo '<button class="vx-banner-dismiss" data-notice="upgrade_banner">&times;</button>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Add license management page.
     * Adds license page to admin menu (Pro version).
     */
    public function add_license_page() {
        if (!$this->is_pro_installed()) {
            return;
        }
        
        add_submenu_page(
            'vortex360-settings',
            __('License', 'vortex360-lite'),
            __('License', 'vortex360-lite'),
            'manage_options',
            'vortex360-license',
            [$this, 'render_license_page']
        );
    }
    
    /**
     * Process license actions.
     * Handles license activation/deactivation.
     */
    public function process_license_actions() {
        if (!isset($_POST['vx_license_action']) || !current_user_can('manage_options')) {
            return;
        }
        
        check_admin_referer('vx_license_action');
        
        $action = sanitize_text_field($_POST['vx_license_action']);
        $license_key = sanitize_text_field($_POST['vx_license_key'] ?? '');
        
        switch ($action) {
            case 'activate':
                $this->activate_license($license_key);
                break;
                
            case 'deactivate':
                $this->deactivate_license();
                break;
                
            case 'check':
                $this->check_license_status();
                break;
        }
    }
    
    /**
     * Add plugin row meta.
     * Adds Pro upgrade link to plugin list.
     * 
     * @param array $links Existing links
     * @param string $file Plugin file
     * @return array Modified links
     */
    public function add_plugin_row_meta($links, $file) {
        if ($file !== VX_PLUGIN_BASENAME) {
            return $links;
        }
        
        if (!$this->is_pro_active()) {
            $links[] = '<a href="' . esc_url($this->pro_url) . '" target="_blank" style="color: #d54e21; font-weight: bold;">' . __('Upgrade to Pro', 'vortex360-lite') . '</a>';
        }
        
        $links[] = '<a href="https://vortex360.com/docs" target="_blank">' . __('Documentation', 'vortex360-lite') . '</a>';
        $links[] = '<a href="https://vortex360.com/support" target="_blank">' . __('Support', 'vortex360-lite') . '</a>';
        
        return $links;
    }
    
    /**
     * Add plugin action links.
     * Adds action links to plugin list.
     * 
     * @param array $links Existing links
     * @return array Modified links
     */
    public function add_plugin_action_links($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=vortex360-settings') . '">' . __('Settings', 'vortex360-lite') . '</a>';
        array_unshift($links, $settings_link);
        
        if (!$this->is_pro_active()) {
            $pro_link = '<a href="' . esc_url($this->pro_url) . '" target="_blank" style="color: #d54e21; font-weight: bold;">' . __('Go Pro', 'vortex360-lite') . '</a>';
            array_unshift($links, $pro_link);
        }
        
        return $links;
    }
    
    /**
     * Add dashboard widget.
     * Adds Pro upgrade widget to dashboard.
     */
    public function add_dashboard_widget() {
        if ($this->is_pro_active() || !current_user_can('manage_options')) {
            return;
        }
        
        wp_add_dashboard_widget(
            'vx_pro_upgrade',
            __('Vortex360 Pro', 'vortex360-lite'),
            [$this, 'render_dashboard_widget']
        );
    }
    
    /**
     * Render dashboard widget.
     * Renders Pro upgrade dashboard widget.
     */
    public function render_dashboard_widget() {
        $tour_count = wp_count_posts('vx_tour')->publish;
        
        echo '<div class="vx-dashboard-widget">';
        echo '<p>' . sprintf(__('You have created %d tours with Vortex360 Lite.', 'vortex360-lite'), $tour_count) . '</p>';
        
        if ($tour_count >= 3) {
            echo '<p><strong>' . __('Ready for more?', 'vortex360-lite') . '</strong></p>';
            echo '<p>' . __('Upgrade to Pro for unlimited tours and advanced features.', 'vortex360-lite') . '</p>';
        } else {
            echo '<p>' . __('Discover what Vortex360 Pro can do for you:', 'vortex360-lite') . '</p>';
            echo '<ul>';
            echo '<li>✓ ' . __('Unlimited Tours', 'vortex360-lite') . '</li>';
            echo '<li>✓ ' . __('Advanced Hotspots', 'vortex360-lite') . '</li>';
            echo '<li>✓ ' . __('Analytics & Insights', 'vortex360-lite') . '</li>';
            echo '</ul>';
        }
        
        echo '<p><a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">' . __('Learn More', 'vortex360-lite') . '</a></p>';
        echo '</div>';
    }
    
    /**
     * Check license status.
     * Validates Pro license with remote server.
     */
    public function check_license_status() {
        if (!$this->is_pro_installed()) {
            return;
        }
        
        $license_key = get_option('vx_pro_license_key');
        
        if (!$license_key) {
            return;
        }
        
        $response = wp_remote_post($this->license_api . '/check', [
            'body' => [
                'license_key' => $license_key,
                'domain' => home_url(),
                'product' => 'vortex360-pro'
            ],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && isset($data['status'])) {
            update_option('vx_pro_license_status', $data['status']);
            update_option('vx_pro_license_expires', $data['expires'] ?? '');
            update_option('vx_pro_license_last_check', time());
        }
    }
    
    /**
     * Show general upgrade notice.
     * Shows general Pro upgrade notice.
     */
    private function show_general_upgrade_notice() {
        echo '<div class="notice notice-info is-dismissible vx-upgrade-notice" data-notice="upgrade_notice">';
        echo '<div class="vx-notice-content">';
        echo '<div class="vx-notice-icon">🚀</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . __('Supercharge Your Virtual Tours!', 'vortex360-lite') . '</h3>';
        echo '<p>' . __('Unlock unlimited tours, advanced hotspots, analytics, and more with Vortex360 Pro.', 'vortex360-lite') . '</p>';
        echo '<p><a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">' . __('Upgrade Now', 'vortex360-lite') . '</a> ';
        echo '<a href="' . esc_url($this->pro_url . '#features') . '" target="_blank">' . __('See All Features', 'vortex360-lite') . '</a></p>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Show usage-based notice.
     * Shows upgrade notice based on usage patterns.
     */
    private function show_usage_based_notice() {
        $tour_count = wp_count_posts('vx_tour')->publish;
        
        echo '<div class="notice notice-warning is-dismissible vx-upgrade-notice" data-notice="upgrade_notice">';
        echo '<div class="vx-notice-content">';
        echo '<div class="vx-notice-icon">⚡</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . __('You\'re Getting Close to the Limit!', 'vortex360-lite') . '</h3>';
        echo '<p>' . sprintf(__('You have %d tours. Lite version is limited to 5 tours.', 'vortex360-lite'), $tour_count) . '</p>';
        echo '<p>' . __('Upgrade to Pro for unlimited tours and advanced features.', 'vortex360-lite') . '</p>';
        echo '<p><a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">' . __('Upgrade to Pro', 'vortex360-lite') . '</a></p>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Show Pro feature notice.
     * Shows notice when Pro feature is accessed.
     * 
     * @param string $feature Feature that was accessed
     */
    private function show_pro_feature_notice($feature) {
        $feature_name = $this->pro_features[$feature] ?? $feature;
        
        echo '<div class="notice notice-info is-dismissible vx-feature-notice">';
        echo '<div class="vx-notice-content">';
        echo '<div class="vx-notice-icon">⭐</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . sprintf(__('%s is a Pro Feature', 'vortex360-lite'), $feature_name) . '</h3>';
        echo '<p>' . __('This feature is available in Vortex360 Pro. Upgrade now to unlock this and many other advanced features.', 'vortex360-lite') . '</p>';
        echo '<p><a href="' . esc_url($this->pro_url) . '" class="button button-primary" target="_blank">' . __('Upgrade to Pro', 'vortex360-lite') . '</a></p>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render license page.
     * Renders the license management page.
     */
    public function render_license_page() {
        $license_key = get_option('vx_pro_license_key', '');
        $license_status = get_option('vx_pro_license_status', 'inactive');
        $license_expires = get_option('vx_pro_license_expires', '');
        
        echo '<div class="wrap">';
        echo '<h1>' . __('Vortex360 Pro License', 'vortex360-lite') . '</h1>';
        
        echo '<form method="post" action="">';
        wp_nonce_field('vx_license_action');
        
        echo '<table class="form-table">';
        echo '<tr>';
        echo '<th scope="row">' . __('License Key', 'vortex360-lite') . '</th>';
        echo '<td>';
        echo '<input type="text" name="vx_license_key" value="' . esc_attr($license_key) . '" class="regular-text" />';
        echo '<p class="description">' . __('Enter your Vortex360 Pro license key.', 'vortex360-lite') . '</p>';
        echo '</td>';
        echo '</tr>';
        
        echo '<tr>';
        echo '<th scope="row">' . __('Status', 'vortex360-lite') . '</th>';
        echo '<td>';
        
        if ($license_status === 'active') {
            echo '<span class="vx-license-active">✓ ' . __('Active', 'vortex360-lite') . '</span>';
            if ($license_expires) {
                echo '<p>' . sprintf(__('Expires: %s', 'vortex360-lite'), date('F j, Y', strtotime($license_expires))) . '</p>';
            }
        } else {
            echo '<span class="vx-license-inactive">✗ ' . __('Inactive', 'vortex360-lite') . '</span>';
        }
        
        echo '</td>';
        echo '</tr>';
        echo '</table>';
        
        if ($license_status === 'active') {
            echo '<input type="hidden" name="vx_license_action" value="deactivate" />';
            echo '<p class="submit"><input type="submit" class="button button-secondary" value="' . __('Deactivate License', 'vortex360-lite') . '" /></p>';
        } else {
            echo '<input type="hidden" name="vx_license_action" value="activate" />';
            echo '<p class="submit"><input type="submit" class="button button-primary" value="' . __('Activate License', 'vortex360-lite') . '" /></p>';
        }
        
        echo '</form>';
        echo '</div>';
    }
    
    /**
     * Activate license.
     * Activates Pro license with remote server.
     * 
     * @param string $license_key License key to activate
     */
    private function activate_license($license_key) {
        if (empty($license_key)) {
            add_settings_error('vx_license', 'empty_key', __('Please enter a license key.', 'vortex360-lite'));
            return;
        }
        
        $response = wp_remote_post($this->license_api . '/activate', [
            'body' => [
                'license_key' => $license_key,
                'domain' => home_url(),
                'product' => 'vortex360-pro'
            ],
            'timeout' => 15
        ]);
        
        if (is_wp_error($response)) {
            add_settings_error('vx_license', 'api_error', __('Could not connect to license server.', 'vortex360-lite'));
            return;
        }
        
        $body = wp_remote_retrieve_body($response);
        $data = json_decode($body, true);
        
        if ($data && $data['success']) {
            update_option('vx_pro_license_key', $license_key);
            update_option('vx_pro_license_status', 'active');
            update_option('vx_pro_license_expires', $data['expires'] ?? '');
            
            add_settings_error('vx_license', 'activated', __('License activated successfully!', 'vortex360-lite'), 'updated');
        } else {
            $error_message = $data['message'] ?? __('License activation failed.', 'vortex360-lite');
            add_settings_error('vx_license', 'activation_failed', $error_message);
        }
    }
    
    /**
     * Deactivate license.
     * Deactivates Pro license.
     */
    private function deactivate_license() {
        $license_key = get_option('vx_pro_license_key');
        
        if ($license_key) {
            wp_remote_post($this->license_api . '/deactivate', [
                'body' => [
                    'license_key' => $license_key,
                    'domain' => home_url(),
                    'product' => 'vortex360-pro'
                ],
                'timeout' => 15
            ]);
        }
        
        delete_option('vx_pro_license_key');
        delete_option('vx_pro_license_status');
        delete_option('vx_pro_license_expires');
        
        add_settings_error('vx_license', 'deactivated', __('License deactivated.', 'vortex360-lite'), 'updated');
    }
    
    /**
     * Check if Pro version is installed.
     * Determines if Pro plugin is installed.
     * 
     * @return bool Whether Pro is installed
     */
    public function is_pro_installed() {
        return file_exists(WP_PLUGIN_DIR . '/vortex360-pro/vortex360-pro.php');
    }
    
    /**
     * Check if Pro version is active.
     * Determines if Pro plugin is active and licensed.
     * 
     * @return bool Whether Pro is active
     */
    public function is_pro_active() {
        return $this->is_pro_installed() && 
               is_plugin_active('vortex360-pro/vortex360-pro.php') && 
               $this->is_pro_licensed();
    }
    
    /**
     * Check if Pro version is licensed.
     * Determines if Pro license is valid.
     * 
     * @return bool Whether Pro is licensed
     */
    public function is_pro_licensed() {
        return get_option('vx_pro_license_status') === 'active';
    }
    
    /**
     * Get Pro version number.
     * Returns Pro plugin version if installed.
     * 
     * @return string|false Pro version or false
     */
    public function get_pro_version() {
        if (!$this->is_pro_installed()) {
            return false;
        }
        
        $plugin_data = get_plugin_data(WP_PLUGIN_DIR . '/vortex360-pro/vortex360-pro.php');
        return $plugin_data['Version'] ?? false;
    }
    
    /**
     * Get available features.
     * Returns list of available features based on version.
     * 
     * @return array Available features
     */
    public function get_available_features() {
        if ($this->is_pro_active()) {
            return array_keys($this->pro_features);
        }
        
        return ['basic_tours', 'basic_hotspots', 'basic_settings'];
    }
    
    /**
     * Trigger Pro feature notice.
     * Sets transient to show Pro feature notice.
     * 
     * @param string $feature Feature that was accessed
     */
    public function trigger_pro_feature_notice($feature) {
        if (!$this->is_pro_active()) {
            set_transient('vx_feature_notice', $feature, 60);
        }
    }
    
    /**
     * Get Pro URL.
     * Returns the Pro version purchase URL.
     * 
     * @return string Pro URL
     */
    public function get_pro_url() {
        return $this->pro_url;
    }
    
    /**
     * Get Pro features list.
     * Returns array of Pro features.
     * 
     * @return array Pro features
     */
    public function get_pro_features() {
        return $this->pro_features;
    }
}

// Initialize Pro integration
new VX_Pro_Integration();