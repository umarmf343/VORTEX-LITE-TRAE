<?php
/**
 * Vortex360 Lite - Upsell and Pro Version Helpers
 * 
 * Handles upgrade notices, feature limitations, and Pro version integration
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Check if Pro version is active
 */
function vx_is_pro_active() {
    return defined('VX_PRO_VERSION') && class_exists('Vortex360_Pro');
}

/**
 * Get Pro version URL
 */
function vx_get_pro_url() {
    return 'https://vortex360.com/pro/?utm_source=lite&utm_medium=plugin&utm_campaign=upgrade';
}

/**
 * Get feature comparison URL
 */
function vx_get_comparison_url() {
    return 'https://vortex360.com/lite-vs-pro/?utm_source=lite&utm_medium=plugin&utm_campaign=compare';
}

/**
 * Check if feature is available in Lite version
 */
function vx_is_feature_available($feature) {
    if (vx_is_pro_active()) {
        return true;
    }
    
    $lite_features = array(
        'basic_tours' => true,
        'max_5_scenes' => true,
        'max_5_hotspots_per_scene' => true,
        'basic_hotspot_types' => true,
        'basic_viewer_controls' => true,
        'gutenberg_block' => true,
        'elementor_widget' => true,
        'shortcode' => true,
        'basic_settings' => true,
        'import_export' => true,
        'duplicate_tours' => true,
        
        // Pro-only features
        'unlimited_scenes' => false,
        'unlimited_hotspots' => false,
        'advanced_hotspot_types' => false,
        'custom_branding' => false,
        'analytics' => false,
        'white_label' => false,
        'priority_support' => false,
        'custom_css' => false,
        'api_access' => false,
        'bulk_operations' => false,
        'advanced_settings' => false,
        'video_hotspots' => false,
        'audio_narration' => false,
        'virtual_reality' => false,
        'floor_plans' => false,
        'lead_capture' => false,
        'social_sharing' => false,
        'password_protection' => false,
        'expiry_dates' => false,
        'custom_loading_screen' => false
    );
    
    return isset($lite_features[$feature]) ? $lite_features[$feature] : false;
}

/**
 * Get Lite version limitations
 */
function vx_get_lite_limits() {
    return array(
        'max_tours' => 10,
        'max_scenes_per_tour' => 5,
        'max_hotspots_per_scene' => 5,
        'max_file_size' => 50 * 1024 * 1024, // 50MB
        'allowed_hotspot_types' => array('info', 'link', 'scene'),
        'allowed_file_types' => array('image/jpeg', 'image/png', 'image/webp')
    );
}

/**
 * Check if limit is reached
 */
function vx_is_limit_reached($limit_type, $current_count = null) {
    if (vx_is_pro_active()) {
        return false;
    }
    
    $limits = vx_get_lite_limits();
    
    switch ($limit_type) {
        case 'tours':
            if ($current_count === null) {
                $current_count = wp_count_posts('vx_tour')->publish;
            }
            return $current_count >= $limits['max_tours'];
            
        case 'scenes':
            return $current_count >= $limits['max_scenes_per_tour'];
            
        case 'hotspots':
            return $current_count >= $limits['max_hotspots_per_scene'];
            
        default:
            return false;
    }
}

/**
 * Get upgrade notice HTML
 */
function vx_get_upgrade_notice($context = 'general', $feature = '') {
    if (vx_is_pro_active()) {
        return '';
    }
    
    $messages = array(
        'general' => array(
            'title' => __('Upgrade to Pro', 'vortex360-lite'),
            'message' => __('Unlock unlimited tours, advanced features, and priority support.', 'vortex360-lite')
        ),
        'tours_limit' => array(
            'title' => __('Tour Limit Reached', 'vortex360-lite'),
            'message' => sprintf(__('You\'ve reached the limit of %d tours. Upgrade to Pro for unlimited tours.', 'vortex360-lite'), vx_get_lite_limits()['max_tours'])
        ),
        'scenes_limit' => array(
            'title' => __('Scene Limit Reached', 'vortex360-lite'),
            'message' => sprintf(__('Maximum %d scenes per tour in Lite version. Upgrade to Pro for unlimited scenes.', 'vortex360-lite'), vx_get_lite_limits()['max_scenes_per_tour'])
        ),
        'hotspots_limit' => array(
            'title' => __('Hotspot Limit Reached', 'vortex360-lite'),
            'message' => sprintf(__('Maximum %d hotspots per scene in Lite version. Upgrade to Pro for unlimited hotspots.', 'vortex360-lite'), vx_get_lite_limits()['max_hotspots_per_scene'])
        ),
        'feature_locked' => array(
            'title' => sprintf(__('%s - Pro Feature', 'vortex360-lite'), $feature),
            'message' => sprintf(__('The "%s" feature is available in Pro version only.', 'vortex360-lite'), $feature)
        ),
        'analytics' => array(
            'title' => __('Analytics - Pro Feature', 'vortex360-lite'),
            'message' => __('Track tour views, engagement, and user behavior with Pro analytics.', 'vortex360-lite')
        ),
        'branding' => array(
            'title' => __('Custom Branding - Pro Feature', 'vortex360-lite'),
            'message' => __('Remove Vortex360 branding and add your own logo with Pro version.', 'vortex360-lite')
        ),
        'support' => array(
            'title' => __('Priority Support - Pro Feature', 'vortex360-lite'),
            'message' => __('Get priority email support and faster response times with Pro.', 'vortex360-lite')
        )
    );
    
    $notice = isset($messages[$context]) ? $messages[$context] : $messages['general'];
    
    ob_start();
    ?>
    <div class="vx-upgrade-notice">
        <div class="vx-upgrade-notice-content">
            <div class="vx-upgrade-notice-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#f39c12"/>
                </svg>
            </div>
            <div class="vx-upgrade-notice-text">
                <h4><?php echo esc_html($notice['title']); ?></h4>
                <p><?php echo esc_html($notice['message']); ?></p>
            </div>
            <div class="vx-upgrade-notice-actions">
                <a href="<?php echo esc_url(vx_get_pro_url()); ?>" class="button button-primary" target="_blank">
                    <?php _e('Upgrade Now', 'vortex360-lite'); ?>
                </a>
                <a href="<?php echo esc_url(vx_get_comparison_url()); ?>" class="button button-secondary" target="_blank">
                    <?php _e('Compare Features', 'vortex360-lite'); ?>
                </a>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Display upgrade notice
 */
function vx_display_upgrade_notice($context = 'general', $feature = '') {
    echo vx_get_upgrade_notice($context, $feature);
}

/**
 * Get Pro features list
 */
function vx_get_pro_features() {
    return array(
        'unlimited' => array(
            'title' => __('Unlimited Everything', 'vortex360-lite'),
            'description' => __('Create unlimited tours, scenes, and hotspots', 'vortex360-lite'),
            'icon' => 'infinity'
        ),
        'advanced_hotspots' => array(
            'title' => __('Advanced Hotspots', 'vortex360-lite'),
            'description' => __('Video, audio, image gallery, and custom HTML hotspots', 'vortex360-lite'),
            'icon' => 'play-circle'
        ),
        'analytics' => array(
            'title' => __('Detailed Analytics', 'vortex360-lite'),
            'description' => __('Track views, engagement, and user behavior', 'vortex360-lite'),
            'icon' => 'bar-chart'
        ),
        'branding' => array(
            'title' => __('White Label Branding', 'vortex360-lite'),
            'description' => __('Remove our branding and add your own logo', 'vortex360-lite'),
            'icon' => 'tag'
        ),
        'vr_support' => array(
            'title' => __('Virtual Reality', 'vortex360-lite'),
            'description' => __('VR headset support for immersive experiences', 'vortex360-lite'),
            'icon' => 'eye'
        ),
        'floor_plans' => array(
            'title' => __('Interactive Floor Plans', 'vortex360-lite'),
            'description' => __('Add mini-maps and floor plan navigation', 'vortex360-lite'),
            'icon' => 'map'
        ),
        'lead_capture' => array(
            'title' => __('Lead Capture Forms', 'vortex360-lite'),
            'description' => __('Collect visitor information with custom forms', 'vortex360-lite'),
            'icon' => 'user-plus'
        ),
        'social_sharing' => array(
            'title' => __('Social Sharing', 'vortex360-lite'),
            'description' => __('Built-in social media sharing buttons', 'vortex360-lite'),
            'icon' => 'share'
        ),
        'password_protection' => array(
            'title' => __('Password Protection', 'vortex360-lite'),
            'description' => __('Protect tours with passwords or user roles', 'vortex360-lite'),
            'icon' => 'lock'
        ),
        'priority_support' => array(
            'title' => __('Priority Support', 'vortex360-lite'),
            'description' => __('Get help faster with priority email support', 'vortex360-lite'),
            'icon' => 'headphones'
        )
    );
}

/**
 * Get feature comparison table
 */
function vx_get_feature_comparison() {
    return array(
        array(
            'feature' => __('Number of Tours', 'vortex360-lite'),
            'lite' => __('Up to 10', 'vortex360-lite'),
            'pro' => __('Unlimited', 'vortex360-lite')
        ),
        array(
            'feature' => __('Scenes per Tour', 'vortex360-lite'),
            'lite' => __('Up to 5', 'vortex360-lite'),
            'pro' => __('Unlimited', 'vortex360-lite')
        ),
        array(
            'feature' => __('Hotspots per Scene', 'vortex360-lite'),
            'lite' => __('Up to 5', 'vortex360-lite'),
            'pro' => __('Unlimited', 'vortex360-lite')
        ),
        array(
            'feature' => __('Hotspot Types', 'vortex360-lite'),
            'lite' => __('Info, Link, Scene', 'vortex360-lite'),
            'pro' => __('All Types + Video, Audio, Gallery', 'vortex360-lite')
        ),
        array(
            'feature' => __('Analytics', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        ),
        array(
            'feature' => __('Custom Branding', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        ),
        array(
            'feature' => __('VR Support', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        ),
        array(
            'feature' => __('Floor Plans', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        ),
        array(
            'feature' => __('Lead Capture', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        ),
        array(
            'feature' => __('Priority Support', 'vortex360-lite'),
            'lite' => '❌',
            'pro' => '✅'
        )
    );
}

/**
 * Add upgrade notice to admin pages
 */
function vx_add_admin_upgrade_notices() {
    if (vx_is_pro_active()) {
        return;
    }
    
    $screen = get_current_screen();
    
    if (!$screen || strpos($screen->id, 'vx_tour') === false) {
        return;
    }
    
    // Check for limits
    $tour_count = wp_count_posts('vx_tour')->publish;
    
    if (vx_is_limit_reached('tours', $tour_count)) {
        add_action('admin_notices', function() {
            echo '<div class="notice notice-warning is-dismissible">';
            echo vx_get_upgrade_notice('tours_limit');
            echo '</div>';
        });
    } elseif ($tour_count >= (vx_get_lite_limits()['max_tours'] * 0.8)) {
        add_action('admin_notices', function() use ($tour_count) {
            $limit = vx_get_lite_limits()['max_tours'];
            echo '<div class="notice notice-info is-dismissible">';
            echo '<p>' . sprintf(__('You have %d of %d tours. Consider upgrading to Pro for unlimited tours.', 'vortex360-lite'), $tour_count, $limit) . '</p>';
            echo '<p><a href="' . esc_url(vx_get_pro_url()) . '" class="button button-primary" target="_blank">' . __('Upgrade Now', 'vortex360-lite') . '</a></p>';
            echo '</div>';
        });
    }
}
add_action('current_screen', 'vx_add_admin_upgrade_notices');

/**
 * Add Pro features sidebar to admin pages
 */
function vx_get_pro_sidebar() {
    if (vx_is_pro_active()) {
        return '';
    }
    
    ob_start();
    ?>
    <div class="vx-pro-sidebar">
        <div class="vx-pro-card">
            <div class="vx-pro-card-header">
                <h3><?php _e('Upgrade to Pro', 'vortex360-lite'); ?></h3>
                <div class="vx-pro-badge"><?php _e('50% OFF', 'vortex360-lite'); ?></div>
            </div>
            <div class="vx-pro-card-content">
                <ul class="vx-pro-features">
                    <li>✅ <?php _e('Unlimited Tours & Scenes', 'vortex360-lite'); ?></li>
                    <li>✅ <?php _e('Advanced Hotspot Types', 'vortex360-lite'); ?></li>
                    <li>✅ <?php _e('Detailed Analytics', 'vortex360-lite'); ?></li>
                    <li>✅ <?php _e('White Label Branding', 'vortex360-lite'); ?></li>
                    <li>✅ <?php _e('VR Support', 'vortex360-lite'); ?></li>
                    <li>✅ <?php _e('Priority Support', 'vortex360-lite'); ?></li>
                </ul>
                <div class="vx-pro-pricing">
                    <span class="vx-pro-price-old">$99</span>
                    <span class="vx-pro-price-new">$49</span>
                    <span class="vx-pro-price-period">/year</span>
                </div>
                <a href="<?php echo esc_url(vx_get_pro_url()); ?>" class="button button-primary button-large" target="_blank">
                    <?php _e('Upgrade Now', 'vortex360-lite'); ?>
                </a>
                <a href="<?php echo esc_url(vx_get_comparison_url()); ?>" class="vx-pro-compare" target="_blank">
                    <?php _e('Compare Features', 'vortex360-lite'); ?>
                </a>
            </div>
        </div>
        
        <div class="vx-pro-testimonial">
            <blockquote>
                <p><?php _e('"Vortex360 Pro transformed our real estate business. The analytics and lead capture features are game-changers!"', 'vortex360-lite'); ?></p>
                <cite><?php _e('Sarah Johnson, Real Estate Agent', 'vortex360-lite'); ?></cite>
            </blockquote>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Get upgrade modal HTML
 */
function vx_get_upgrade_modal($feature = '') {
    if (vx_is_pro_active()) {
        return '';
    }
    
    $features = vx_get_pro_features();
    
    ob_start();
    ?>
    <div id="vx-upgrade-modal" class="vx-modal" style="display: none;">
        <div class="vx-modal-overlay"></div>
        <div class="vx-modal-content">
            <div class="vx-modal-header">
                <h2><?php _e('Unlock Pro Features', 'vortex360-lite'); ?></h2>
                <button class="vx-modal-close">&times;</button>
            </div>
            <div class="vx-modal-body">
                <?php if ($feature && isset($features[$feature])): ?>
                    <div class="vx-feature-highlight">
                        <div class="vx-feature-icon">
                            <i class="dashicons dashicons-<?php echo esc_attr($features[$feature]['icon']); ?>"></i>
                        </div>
                        <h3><?php echo esc_html($features[$feature]['title']); ?></h3>
                        <p><?php echo esc_html($features[$feature]['description']); ?></p>
                    </div>
                <?php endif; ?>
                
                <div class="vx-pro-features-grid">
                    <?php foreach (array_slice($features, 0, 6) as $key => $feature_data): ?>
                        <div class="vx-pro-feature-item">
                            <i class="dashicons dashicons-<?php echo esc_attr($feature_data['icon']); ?>"></i>
                            <h4><?php echo esc_html($feature_data['title']); ?></h4>
                            <p><?php echo esc_html($feature_data['description']); ?></p>
                        </div>
                    <?php endforeach; ?>
                </div>
                
                <div class="vx-upgrade-pricing">
                    <div class="vx-pricing-highlight">
                        <span class="vx-discount-badge"><?php _e('Limited Time: 50% OFF', 'vortex360-lite'); ?></span>
                        <div class="vx-price">
                            <span class="vx-price-old">$99</span>
                            <span class="vx-price-new">$49</span>
                            <span class="vx-price-period">/year</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="vx-modal-footer">
                <a href="<?php echo esc_url(vx_get_pro_url()); ?>" class="button button-primary button-large" target="_blank">
                    <?php _e('Upgrade to Pro Now', 'vortex360-lite'); ?>
                </a>
                <a href="<?php echo esc_url(vx_get_comparison_url()); ?>" class="button button-secondary" target="_blank">
                    <?php _e('Compare All Features', 'vortex360-lite'); ?>
                </a>
            </div>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

/**
 * Add upgrade modal to admin footer
 */
function vx_add_upgrade_modal() {
    if (vx_is_pro_active()) {
        return;
    }
    
    $screen = get_current_screen();
    if (!$screen || strpos($screen->id, 'vx_tour') === false) {
        return;
    }
    
    echo vx_get_upgrade_modal();
}
add_action('admin_footer', 'vx_add_upgrade_modal');

/**
 * Track upgrade clicks for analytics
 */
function vx_track_upgrade_click($context = 'general') {
    if (vx_is_pro_active()) {
        return;
    }
    
    $stats = get_option('vx_upgrade_stats', array());
    $today = date('Y-m-d');
    
    if (!isset($stats[$today])) {
        $stats[$today] = array();
    }
    
    if (!isset($stats[$today][$context])) {
        $stats[$today][$context] = 0;
    }
    
    $stats[$today][$context]++;
    
    // Keep only last 30 days
    $cutoff = date('Y-m-d', strtotime('-30 days'));
    foreach ($stats as $date => $data) {
        if ($date < $cutoff) {
            unset($stats[$date]);
        }
    }
    
    update_option('vx_upgrade_stats', $stats);
}

/**
 * Get upgrade statistics
 */
function vx_get_upgrade_stats() {
    return get_option('vx_upgrade_stats', array());
}