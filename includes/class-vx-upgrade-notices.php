<?php
/**
 * Vortex360 Lite - Upgrade Notices Handler
 * 
 * Manages upgrade notices, promotional banners, and user engagement
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Upgrade notices handler class.
 * Manages various types of upgrade notices and promotional content.
 */
class VX_Upgrade_Notices {
    
    /**
     * Notice types and their configurations.
     * @var array
     */
    private $notice_types = [
        'welcome' => [
            'title' => 'Welcome to Vortex360 Lite!',
            'priority' => 1,
            'dismissible' => true,
            'show_after' => 0, // Show immediately
            'show_until' => 7 * DAY_IN_SECONDS // Show for 7 days
        ],
        'usage_limit' => [
            'title' => 'Tour Limit Reached',
            'priority' => 2,
            'dismissible' => false,
            'trigger_condition' => 'tour_limit_reached'
        ],
        'feature_discovery' => [
            'title' => 'Discover Pro Features',
            'priority' => 3,
            'dismissible' => true,
            'show_after' => 3 * DAY_IN_SECONDS,
            'show_until' => 30 * DAY_IN_SECONDS
        ],
        'seasonal_promo' => [
            'title' => 'Limited Time Offer',
            'priority' => 4,
            'dismissible' => true,
            'show_after' => 7 * DAY_IN_SECONDS,
            'conditional' => true
        ],
        'feedback_request' => [
            'title' => 'How are we doing?',
            'priority' => 5,
            'dismissible' => true,
            'show_after' => 14 * DAY_IN_SECONDS,
            'show_until' => 60 * DAY_IN_SECONDS
        ]
    ];
    
    /**
     * Dismissed notices cache.
     * @var array
     */
    private $dismissed_notices = [];
    
    /**
     * Plugin installation time.
     * @var int
     */
    private $install_time;
    
    /**
     * Current user capabilities.
     * @var array
     */
    private $user_caps = [];
    
    /**
     * Initialize upgrade notices.
     * Sets up hooks and notice configuration.
     */
    public function __construct() {
        $this->dismissed_notices = get_option('vx_dismissed_notices', []);
        $this->install_time = get_option('vx_install_time', time());
        $this->user_caps = $this->get_user_capabilities();
        
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for notice handling.
     */
    private function init_hooks() {
        // Admin notices
        add_action('admin_notices', [$this, 'show_notices']);
        add_action('network_admin_notices', [$this, 'show_notices']);
        
        // AJAX handlers
        add_action('wp_ajax_vx_dismiss_notice', [$this, 'ajax_dismiss_notice']);
        add_action('wp_ajax_vx_snooze_notice', [$this, 'ajax_snooze_notice']);
        add_action('wp_ajax_vx_feedback_submit', [$this, 'ajax_submit_feedback']);
        
        // Admin scripts and styles
        add_action('admin_enqueue_scripts', [$this, 'enqueue_notice_assets']);
        
        // Notice triggers
        add_action('vx_tour_limit_reached', [$this, 'trigger_usage_limit_notice']);
        add_action('vx_pro_feature_accessed', [$this, 'trigger_feature_discovery_notice']);
        
        // Cleanup expired notices
        add_action('vx_daily_cleanup', [$this, 'cleanup_expired_notices']);
        
        // Track user interactions
        add_action('admin_init', [$this, 'track_user_activity']);
        
        // Conditional notice loading
        add_action('admin_init', [$this, 'check_conditional_notices']);
    }
    
    /**
     * Show admin notices.
     * Displays appropriate notices based on conditions.
     */
    public function show_notices() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        $screen = get_current_screen();
        
        // Get notices to show
        $notices_to_show = $this->get_notices_to_show($screen);
        
        // Sort by priority
        uasort($notices_to_show, function($a, $b) {
            return $a['priority'] - $b['priority'];
        });
        
        // Show notices (limit to 2 at once)
        $shown_count = 0;
        foreach ($notices_to_show as $notice_id => $notice_config) {
            if ($shown_count >= 2) {
                break;
            }
            
            $this->render_notice($notice_id, $notice_config);
            $shown_count++;
        }
    }
    
    /**
     * AJAX handler for dismissing notices.
     * Handles notice dismissal via AJAX.
     */
    public function ajax_dismiss_notice() {
        check_ajax_referer('vx_notice_action', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $notice_id = sanitize_text_field($_POST['notice_id'] ?? '');
        $dismiss_type = sanitize_text_field($_POST['dismiss_type'] ?? 'permanent');
        
        if ($notice_id) {
            $this->dismiss_notice($notice_id, $dismiss_type);
        }
        
        wp_send_json_success();
    }
    
    /**
     * AJAX handler for snoozing notices.
     * Handles notice snoozing via AJAX.
     */
    public function ajax_snooze_notice() {
        check_ajax_referer('vx_notice_action', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $notice_id = sanitize_text_field($_POST['notice_id'] ?? '');
        $snooze_duration = intval($_POST['snooze_duration'] ?? 7);
        
        if ($notice_id) {
            $this->snooze_notice($notice_id, $snooze_duration * DAY_IN_SECONDS);
        }
        
        wp_send_json_success();
    }
    
    /**
     * AJAX handler for feedback submission.
     * Handles feedback form submission.
     */
    public function ajax_submit_feedback() {
        check_ajax_referer('vx_feedback_submit', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die('Insufficient permissions');
        }
        
        $feedback_data = [
            'rating' => intval($_POST['rating'] ?? 0),
            'message' => sanitize_textarea_field($_POST['message'] ?? ''),
            'email' => sanitize_email($_POST['email'] ?? ''),
            'allow_contact' => !empty($_POST['allow_contact']),
            'site_url' => home_url(),
            'plugin_version' => VX_VERSION,
            'wp_version' => get_bloginfo('version'),
            'timestamp' => time()
        ];
        
        // Send feedback to remote server
        $this->send_feedback($feedback_data);
        
        // Dismiss feedback notice
        $this->dismiss_notice('feedback_request', 'permanent');
        
        wp_send_json_success([
            'message' => __('Thank you for your feedback!', 'vortex360-lite')
        ]);
    }
    
    /**
     * Enqueue notice assets.
     * Loads CSS and JavaScript for notices.
     * 
     * @param string $hook Current admin page hook
     */
    public function enqueue_notice_assets($hook) {
        // Only load on relevant pages
        if (!$this->should_load_notice_assets($hook)) {
            return;
        }
        
        wp_enqueue_style(
            'vx-notices',
            VX_PLUGIN_URL . 'assets/css/admin-notices.css',
            [],
            VX_VERSION
        );
        
        wp_enqueue_script(
            'vx-notices',
            VX_PLUGIN_URL . 'assets/js/admin-notices.js',
            ['jquery'],
            VX_VERSION,
            true
        );
        
        wp_localize_script('vx-notices', 'vxNotices', [
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_notice_action'),
            'feedback_nonce' => wp_create_nonce('vx_feedback_submit'),
            'strings' => [
                'dismiss' => __('Dismiss', 'vortex360-lite'),
                'snooze' => __('Remind me later', 'vortex360-lite'),
                'feedback_thanks' => __('Thank you for your feedback!', 'vortex360-lite'),
                'error' => __('An error occurred. Please try again.', 'vortex360-lite')
            ]
        ]);
    }
    
    /**
     * Trigger usage limit notice.
     * Shows notice when tour limit is reached.
     */
    public function trigger_usage_limit_notice() {
        // Remove any existing dismissal for this notice
        $this->undismiss_notice('usage_limit');
        
        // Set flag to show notice
        set_transient('vx_show_usage_limit_notice', true, HOUR_IN_SECONDS);
    }
    
    /**
     * Trigger feature discovery notice.
     * Shows notice when Pro feature is accessed.
     * 
     * @param string $feature Feature that was accessed
     */
    public function trigger_feature_discovery_notice($feature) {
        // Don't show if already dismissed recently
        if ($this->is_notice_dismissed('feature_discovery')) {
            return;
        }
        
        // Set feature context
        set_transient('vx_feature_discovery_context', $feature, HOUR_IN_SECONDS);
        set_transient('vx_show_feature_discovery_notice', true, HOUR_IN_SECONDS);
    }
    
    /**
     * Cleanup expired notices.
     * Removes expired notice data.
     */
    public function cleanup_expired_notices() {
        $current_time = time();
        $dismissed_notices = get_option('vx_dismissed_notices', []);
        $updated = false;
        
        foreach ($dismissed_notices as $notice_id => $dismiss_data) {
            if (isset($dismiss_data['expires']) && $dismiss_data['expires'] < $current_time) {
                unset($dismissed_notices[$notice_id]);
                $updated = true;
            }
        }
        
        if ($updated) {
            update_option('vx_dismissed_notices', $dismissed_notices);
        }
    }
    
    /**
     * Track user activity.
     * Tracks user interactions for notice targeting.
     */
    public function track_user_activity() {
        $screen = get_current_screen();
        
        if (!$screen || strpos($screen->id, 'vortex360') === false) {
            return;
        }
        
        // Update last activity time
        update_option('vx_last_admin_activity', time());
        
        // Track page visits
        $page_visits = get_option('vx_admin_page_visits', []);
        $page_visits[$screen->id] = ($page_visits[$screen->id] ?? 0) + 1;
        update_option('vx_admin_page_visits', $page_visits);
        
        // Track tour creation activity
        if ($screen->id === 'edit-vx_tour' || $screen->id === 'vx_tour') {
            $this->track_tour_activity();
        }
    }
    
    /**
     * Check conditional notices.
     * Checks if conditional notices should be shown.
     */
    public function check_conditional_notices() {
        // Check seasonal promotions
        if ($this->is_promotional_period()) {
            set_transient('vx_show_seasonal_promo', true, DAY_IN_SECONDS);
        }
        
        // Check user engagement level
        if ($this->is_highly_engaged_user()) {
            set_transient('vx_show_advanced_features', true, DAY_IN_SECONDS);
        }
    }
    
    /**
     * Get notices to show.
     * Determines which notices should be displayed.
     * 
     * @param WP_Screen $screen Current screen object
     * @return array Notices to show
     */
    private function get_notices_to_show($screen) {
        $notices_to_show = [];
        $current_time = time();
        
        foreach ($this->notice_types as $notice_id => $notice_config) {
            // Skip if dismissed
            if ($this->is_notice_dismissed($notice_id)) {
                continue;
            }
            
            // Check time-based conditions
            if (isset($notice_config['show_after'])) {
                if (($this->install_time + $notice_config['show_after']) > $current_time) {
                    continue;
                }
            }
            
            if (isset($notice_config['show_until'])) {
                if (($this->install_time + $notice_config['show_until']) < $current_time) {
                    continue;
                }
            }
            
            // Check trigger conditions
            if (isset($notice_config['trigger_condition'])) {
                if (!$this->check_trigger_condition($notice_config['trigger_condition'])) {
                    continue;
                }
            }
            
            // Check conditional notices
            if (!empty($notice_config['conditional'])) {
                if (!$this->check_conditional_notice($notice_id)) {
                    continue;
                }
            }
            
            // Check screen restrictions
            if (!$this->should_show_on_screen($notice_id, $screen)) {
                continue;
            }
            
            $notices_to_show[$notice_id] = $notice_config;
        }
        
        return $notices_to_show;
    }
    
    /**
     * Render notice.
     * Outputs HTML for a specific notice.
     * 
     * @param string $notice_id Notice identifier
     * @param array $notice_config Notice configuration
     */
    private function render_notice($notice_id, $notice_config) {
        $notice_class = $this->get_notice_class($notice_id);
        $dismissible = $notice_config['dismissible'] ? 'is-dismissible' : '';
        
        echo '<div class="notice ' . esc_attr($notice_class) . ' ' . esc_attr($dismissible) . ' vx-upgrade-notice" data-notice="' . esc_attr($notice_id) . '">';
        
        switch ($notice_id) {
            case 'welcome':
                $this->render_welcome_notice();
                break;
                
            case 'usage_limit':
                $this->render_usage_limit_notice();
                break;
                
            case 'feature_discovery':
                $this->render_feature_discovery_notice();
                break;
                
            case 'seasonal_promo':
                $this->render_seasonal_promo_notice();
                break;
                
            case 'feedback_request':
                $this->render_feedback_request_notice();
                break;
                
            default:
                $this->render_generic_notice($notice_id, $notice_config);
                break;
        }
        
        echo '</div>';
    }
    
    /**
     * Render welcome notice.
     * Renders the welcome notice for new users.
     */
    private function render_welcome_notice() {
        echo '<div class="vx-notice-content vx-welcome-notice">';
        echo '<div class="vx-notice-icon">🎉</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . __('Welcome to Vortex360 Lite!', 'vortex360-lite') . '</h3>';
        echo '<p>' . __('Thank you for installing Vortex360 Lite. Create stunning 360° virtual tours in minutes!', 'vortex360-lite') . '</p>';
        echo '<div class="vx-notice-actions">';
        echo '<a href="' . admin_url('post-new.php?post_type=vx_tour') . '" class="button button-primary">' . __('Create Your First Tour', 'vortex360-lite') . '</a> ';
        echo '<a href="' . admin_url('admin.php?page=vortex360-settings') . '" class="button button-secondary">' . __('Settings', 'vortex360-lite') . '</a> ';
        echo '<a href="https://vortex360.com/docs" target="_blank" class="button button-link">' . __('Documentation', 'vortex360-lite') . '</a>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render usage limit notice.
     * Renders notice when tour limit is reached.
     */
    private function render_usage_limit_notice() {
        $tour_count = wp_count_posts('vx_tour')->publish;
        $max_tours = apply_filters('vx_max_tours_allowed', 5);
        
        echo '<div class="vx-notice-content vx-usage-limit-notice">';
        echo '<div class="vx-notice-icon">⚠️</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . __('Tour Limit Reached', 'vortex360-lite') . '</h3>';
        echo '<p>' . sprintf(__('You have reached the limit of %d tours in the Lite version. Upgrade to Pro for unlimited tours!', 'vortex360-lite'), $max_tours) . '</p>';
        echo '<div class="vx-notice-actions">';
        echo '<a href="https://vortex360.com/pro" class="button button-primary" target="_blank">' . __('Upgrade to Pro', 'vortex360-lite') . '</a> ';
        echo '<a href="https://vortex360.com/pro#features" target="_blank" class="button button-secondary">' . __('See All Features', 'vortex360-lite') . '</a>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render feature discovery notice.
     * Renders notice when Pro feature is accessed.
     */
    private function render_feature_discovery_notice() {
        $feature = get_transient('vx_feature_discovery_context');
        $feature_name = $this->get_feature_display_name($feature);
        
        echo '<div class="vx-notice-content vx-feature-discovery-notice">';
        echo '<div class="vx-notice-icon">⭐</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . sprintf(__('%s is a Pro Feature', 'vortex360-lite'), $feature_name) . '</h3>';
        echo '<p>' . __('Unlock this feature and many more with Vortex360 Pro. Get unlimited tours, advanced hotspots, analytics, and priority support.', 'vortex360-lite') . '</p>';
        echo '<div class="vx-notice-actions">';
        echo '<a href="https://vortex360.com/pro" class="button button-primary" target="_blank">' . __('Upgrade Now', 'vortex360-lite') . '</a> ';
        echo '<button class="button button-secondary vx-snooze-notice" data-duration="7">' . __('Remind me later', 'vortex360-lite') . '</button>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render seasonal promo notice.
     * Renders seasonal promotional notice.
     */
    private function render_seasonal_promo_notice() {
        $promo_data = $this->get_current_promotion();
        
        if (!$promo_data) {
            return;
        }
        
        echo '<div class="vx-notice-content vx-seasonal-promo-notice">';
        echo '<div class="vx-notice-icon">🎁</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . esc_html($promo_data['title']) . '</h3>';
        echo '<p>' . esc_html($promo_data['description']) . '</p>';
        
        if (!empty($promo_data['expires'])) {
            echo '<p class="vx-promo-expires"><strong>' . sprintf(__('Expires: %s', 'vortex360-lite'), date('F j, Y', $promo_data['expires'])) . '</strong></p>';
        }
        
        echo '<div class="vx-notice-actions">';
        echo '<a href="' . esc_url($promo_data['url']) . '" class="button button-primary" target="_blank">' . esc_html($promo_data['cta']) . '</a>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render feedback request notice.
     * Renders feedback collection notice.
     */
    private function render_feedback_request_notice() {
        echo '<div class="vx-notice-content vx-feedback-notice">';
        echo '<div class="vx-notice-icon">💬</div>';
        echo '<div class="vx-notice-text">';
        echo '<h3>' . __('How are we doing?', 'vortex360-lite') . '</h3>';
        echo '<p>' . __('We\'d love to hear your feedback about Vortex360 Lite. Your input helps us improve!', 'vortex360-lite') . '</p>';
        
        echo '<div class="vx-feedback-form" style="display:none;">';
        echo '<div class="vx-rating">';
        echo '<label>' . __('Rate your experience:', 'vortex360-lite') . '</label>';
        for ($i = 1; $i <= 5; $i++) {
            echo '<span class="vx-star" data-rating="' . $i . '">⭐</span>';
        }
        echo '</div>';
        echo '<textarea name="feedback_message" placeholder="' . __('Tell us what you think...', 'vortex360-lite') . '" rows="3"></textarea>';
        echo '<label><input type="checkbox" name="allow_contact"> ' . __('You may contact me about this feedback', 'vortex360-lite') . '</label>';
        echo '<div class="vx-feedback-actions">';
        echo '<button class="button button-primary vx-submit-feedback">' . __('Submit Feedback', 'vortex360-lite') . '</button> ';
        echo '<button class="button button-secondary vx-cancel-feedback">' . __('Cancel', 'vortex360-lite') . '</button>';
        echo '</div>';
        echo '</div>';
        
        echo '<div class="vx-notice-actions">';
        echo '<button class="button button-primary vx-show-feedback-form">' . __('Give Feedback', 'vortex360-lite') . '</button> ';
        echo '<button class="button button-secondary vx-snooze-notice" data-duration="30">' . __('Maybe later', 'vortex360-lite') . '</button>';
        echo '</div>';
        echo '</div>';
        echo '</div>';
    }
    
    /**
     * Render generic notice.
     * Renders a generic notice template.
     * 
     * @param string $notice_id Notice identifier
     * @param array $notice_config Notice configuration
     */
    private function render_generic_notice($notice_id, $notice_config) {
        echo '<div class="vx-notice-content">';
        echo '<h3>' . esc_html($notice_config['title']) . '</h3>';
        echo '<p>' . __('This is a generic notice. Please implement specific rendering for this notice type.', 'vortex360-lite') . '</p>';
        echo '</div>';
    }
    
    /**
     * Get notice CSS class.
     * Returns appropriate CSS class for notice type.
     * 
     * @param string $notice_id Notice identifier
     * @return string CSS class
     */
    private function get_notice_class($notice_id) {
        $classes = [
            'welcome' => 'notice-info',
            'usage_limit' => 'notice-warning',
            'feature_discovery' => 'notice-info',
            'seasonal_promo' => 'notice-success',
            'feedback_request' => 'notice-info'
        ];
        
        return $classes[$notice_id] ?? 'notice-info';
    }
    
    /**
     * Dismiss notice.
     * Marks a notice as dismissed.
     * 
     * @param string $notice_id Notice identifier
     * @param string $dismiss_type Type of dismissal (permanent, temporary)
     */
    private function dismiss_notice($notice_id, $dismiss_type = 'permanent') {
        $dismissed_notices = get_option('vx_dismissed_notices', []);
        
        $dismiss_data = [
            'time' => time(),
            'type' => $dismiss_type
        ];
        
        if ($dismiss_type === 'temporary') {
            $dismiss_data['expires'] = time() + (30 * DAY_IN_SECONDS);
        }
        
        $dismissed_notices[$notice_id] = $dismiss_data;
        update_option('vx_dismissed_notices', $dismissed_notices);
        
        $this->dismissed_notices = $dismissed_notices;
    }
    
    /**
     * Snooze notice.
     * Temporarily dismisses a notice.
     * 
     * @param string $notice_id Notice identifier
     * @param int $duration Snooze duration in seconds
     */
    private function snooze_notice($notice_id, $duration) {
        $dismissed_notices = get_option('vx_dismissed_notices', []);
        
        $dismissed_notices[$notice_id] = [
            'time' => time(),
            'type' => 'snoozed',
            'expires' => time() + $duration
        ];
        
        update_option('vx_dismissed_notices', $dismissed_notices);
        $this->dismissed_notices = $dismissed_notices;
    }
    
    /**
     * Undismiss notice.
     * Removes dismissal status from a notice.
     * 
     * @param string $notice_id Notice identifier
     */
    private function undismiss_notice($notice_id) {
        $dismissed_notices = get_option('vx_dismissed_notices', []);
        
        if (isset($dismissed_notices[$notice_id])) {
            unset($dismissed_notices[$notice_id]);
            update_option('vx_dismissed_notices', $dismissed_notices);
            $this->dismissed_notices = $dismissed_notices;
        }
    }
    
    /**
     * Check if notice is dismissed.
     * Determines if a notice has been dismissed.
     * 
     * @param string $notice_id Notice identifier
     * @return bool Whether notice is dismissed
     */
    private function is_notice_dismissed($notice_id) {
        if (!isset($this->dismissed_notices[$notice_id])) {
            return false;
        }
        
        $dismiss_data = $this->dismissed_notices[$notice_id];
        
        // Check if dismissal has expired
        if (isset($dismiss_data['expires']) && $dismiss_data['expires'] < time()) {
            $this->undismiss_notice($notice_id);
            return false;
        }
        
        return true;
    }
    
    /**
     * Check trigger condition.
     * Evaluates trigger conditions for notices.
     * 
     * @param string $condition Condition to check
     * @return bool Whether condition is met
     */
    private function check_trigger_condition($condition) {
        switch ($condition) {
            case 'tour_limit_reached':
                return get_transient('vx_show_usage_limit_notice');
                
            case 'pro_feature_accessed':
                return get_transient('vx_show_feature_discovery_notice');
                
            default:
                return false;
        }
    }
    
    /**
     * Check conditional notice.
     * Evaluates conditional notice requirements.
     * 
     * @param string $notice_id Notice identifier
     * @return bool Whether notice should be shown
     */
    private function check_conditional_notice($notice_id) {
        switch ($notice_id) {
            case 'seasonal_promo':
                return get_transient('vx_show_seasonal_promo');
                
            default:
                return true;
        }
    }
    
    /**
     * Should show on screen.
     * Determines if notice should be shown on current screen.
     * 
     * @param string $notice_id Notice identifier
     * @param WP_Screen $screen Current screen
     * @return bool Whether to show on screen
     */
    private function should_show_on_screen($notice_id, $screen) {
        // Show welcome notice only on plugin pages
        if ($notice_id === 'welcome') {
            return strpos($screen->id, 'vortex360') !== false || $screen->id === 'plugins';
        }
        
        // Show usage limit notice on tour-related pages
        if ($notice_id === 'usage_limit') {
            return in_array($screen->id, ['edit-vx_tour', 'vx_tour', 'vortex360-settings']);
        }
        
        // Show other notices on plugin pages
        return strpos($screen->id, 'vortex360') !== false;
    }
    
    /**
     * Should load notice assets.
     * Determines if notice assets should be loaded.
     * 
     * @param string $hook Current admin page hook
     * @return bool Whether to load assets
     */
    private function should_load_notice_assets($hook) {
        $plugin_pages = [
            'vortex360-settings',
            'edit-vx_tour',
            'vx_tour',
            'plugins.php'
        ];
        
        return in_array($hook, $plugin_pages) || strpos($hook, 'vortex360') !== false;
    }
    
    /**
     * Get user capabilities.
     * Returns current user's relevant capabilities.
     * 
     * @return array User capabilities
     */
    private function get_user_capabilities() {
        return [
            'manage_options' => current_user_can('manage_options'),
            'edit_posts' => current_user_can('edit_posts'),
            'upload_files' => current_user_can('upload_files')
        ];
    }
    
    /**
     * Track tour activity.
     * Tracks tour-related user activity.
     */
    private function track_tour_activity() {
        $activity = get_option('vx_tour_activity', [
            'tours_created' => 0,
            'tours_edited' => 0,
            'last_tour_activity' => 0
        ]);
        
        $activity['last_tour_activity'] = time();
        
        // Track creation vs editing
        global $pagenow;
        if ($pagenow === 'post-new.php') {
            $activity['tours_created']++;
        } elseif ($pagenow === 'post.php') {
            $activity['tours_edited']++;
        }
        
        update_option('vx_tour_activity', $activity);
    }
    
    /**
     * Is promotional period.
     * Checks if current time is within a promotional period.
     * 
     * @return bool Whether it's a promotional period
     */
    private function is_promotional_period() {
        $current_date = date('m-d');
        
        // Define promotional periods (month-day format)
        $promo_periods = [
            ['11-20', '12-05'], // Black Friday / Cyber Monday
            ['12-20', '01-05'], // Holiday season
            ['03-15', '03-25'], // Spring promotion
            ['07-01', '07-15']  // Summer promotion
        ];
        
        foreach ($promo_periods as $period) {
            if ($this->is_date_in_range($current_date, $period[0], $period[1])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Is highly engaged user.
     * Determines if user is highly engaged based on activity.
     * 
     * @return bool Whether user is highly engaged
     */
    private function is_highly_engaged_user() {
        $activity = get_option('vx_tour_activity', []);
        $page_visits = get_option('vx_admin_page_visits', []);
        
        // Consider user engaged if they have:
        // - Created 2+ tours
        // - Visited admin pages 10+ times
        // - Been active in the last 7 days
        
        $tours_created = $activity['tours_created'] ?? 0;
        $total_visits = array_sum($page_visits);
        $last_activity = $activity['last_tour_activity'] ?? 0;
        
        return $tours_created >= 2 && 
               $total_visits >= 10 && 
               ($last_activity > (time() - 7 * DAY_IN_SECONDS));
    }
    
    /**
     * Get feature display name.
     * Returns human-readable name for a feature.
     * 
     * @param string $feature Feature identifier
     * @return string Display name
     */
    private function get_feature_display_name($feature) {
        $feature_names = [
            'unlimited_tours' => __('Unlimited Tours', 'vortex360-lite'),
            'advanced_hotspots' => __('Advanced Hotspots', 'vortex360-lite'),
            'analytics' => __('Analytics', 'vortex360-lite'),
            'custom_branding' => __('Custom Branding', 'vortex360-lite'),
            'video_hotspots' => __('Video Hotspots', 'vortex360-lite'),
            'audio_narration' => __('Audio Narration', 'vortex360-lite')
        ];
        
        return $feature_names[$feature] ?? ucwords(str_replace('_', ' ', $feature));
    }
    
    /**
     * Get current promotion.
     * Returns current promotional offer data.
     * 
     * @return array|false Promotion data or false
     */
    private function get_current_promotion() {
        // This would typically fetch from a remote API
        // For now, return a sample promotion
        
        if (!$this->is_promotional_period()) {
            return false;
        }
        
        return [
            'title' => __('Limited Time: 30% Off Vortex360 Pro!', 'vortex360-lite'),
            'description' => __('Upgrade now and save 30% on your first year of Vortex360 Pro. Unlock unlimited tours, advanced features, and priority support.', 'vortex360-lite'),
            'cta' => __('Get 30% Off Now', 'vortex360-lite'),
            'url' => 'https://vortex360.com/pro?discount=SAVE30',
            'expires' => strtotime('+14 days')
        ];
    }
    
    /**
     * Send feedback.
     * Sends feedback data to remote server.
     * 
     * @param array $feedback_data Feedback data
     */
    private function send_feedback($feedback_data) {
        wp_remote_post('https://api.vortex360.com/v1/feedback', [
            'body' => wp_json_encode($feedback_data),
            'headers' => [
                'Content-Type' => 'application/json'
            ],
            'timeout' => 15
        ]);
    }
    
    /**
     * Is date in range.
     * Checks if a date falls within a range.
     * 
     * @param string $date Date to check (m-d format)
     * @param string $start Start date (m-d format)
     * @param string $end End date (m-d format)
     * @return bool Whether date is in range
     */
    private function is_date_in_range($date, $start, $end) {
        $date_ts = strtotime(date('Y') . '-' . $date);
        $start_ts = strtotime(date('Y') . '-' . $start);
        $end_ts = strtotime(date('Y') . '-' . $end);
        
        // Handle year boundary
        if ($end_ts < $start_ts) {
            $end_ts = strtotime((date('Y') + 1) . '-' . $end);
        }
        
        return $date_ts >= $start_ts && $date_ts <= $end_ts;
    }
}

// Initialize upgrade notices
new VX_Upgrade_Notices();