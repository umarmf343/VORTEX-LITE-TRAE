<?php
/**
 * Vortex360 Lite - Upsell Notice Template
 * 
 * Template for displaying upgrade notices and Pro feature promotions
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get notice context and feature from parameters
$context = isset($context) ? $context : 'general';
$feature = isset($feature) ? $feature : '';
$dismissible = isset($dismissible) ? $dismissible : true;
$show_comparison = isset($show_comparison) ? $show_comparison : true;

// Don't show if Pro is active
if (vx_is_pro_active()) {
    return;
}

// Get notice configuration
$notices = array(
    'general' => array(
        'title' => __('Upgrade to Vortex360 Pro', 'vortex360-lite'),
        'message' => __('Unlock unlimited tours, advanced features, and priority support.', 'vortex360-lite'),
        'icon' => 'star-filled',
        'type' => 'info'
    ),
    'tours_limit' => array(
        'title' => __('Tour Limit Reached', 'vortex360-lite'),
        'message' => sprintf(__('You\'ve reached the limit of %d tours. Upgrade to Pro for unlimited tours.', 'vortex360-lite'), vx_get_lite_limits()['max_tours']),
        'icon' => 'warning',
        'type' => 'warning'
    ),
    'scenes_limit' => array(
        'title' => __('Scene Limit Reached', 'vortex360-lite'),
        'message' => sprintf(__('Maximum %d scenes per tour in Lite version. Upgrade to Pro for unlimited scenes.', 'vortex360-lite'), vx_get_lite_limits()['max_scenes_per_tour']),
        'icon' => 'warning',
        'type' => 'warning'
    ),
    'hotspots_limit' => array(
        'title' => __('Hotspot Limit Reached', 'vortex360-lite'),
        'message' => sprintf(__('Maximum %d hotspots per scene in Lite version. Upgrade to Pro for unlimited hotspots.', 'vortex360-lite'), vx_get_lite_limits()['max_hotspots_per_scene']),
        'icon' => 'warning',
        'type' => 'warning'
    ),
    'analytics' => array(
        'title' => __('Analytics - Pro Feature', 'vortex360-lite'),
        'message' => __('Track tour views, engagement, and user behavior with detailed analytics.', 'vortex360-lite'),
        'icon' => 'chart-bar',
        'type' => 'info'
    ),
    'branding' => array(
        'title' => __('Custom Branding - Pro Feature', 'vortex360-lite'),
        'message' => __('Remove Vortex360 branding and add your own logo and colors.', 'vortex360-lite'),
        'icon' => 'tag',
        'type' => 'info'
    ),
    'vr_support' => array(
        'title' => __('VR Support - Pro Feature', 'vortex360-lite'),
        'message' => __('Enable virtual reality viewing with VR headset support.', 'vortex360-lite'),
        'icon' => 'visibility',
        'type' => 'info'
    ),
    'advanced_hotspots' => array(
        'title' => __('Advanced Hotspots - Pro Feature', 'vortex360-lite'),
        'message' => __('Add video, audio, image galleries, and custom HTML hotspots.', 'vortex360-lite'),
        'icon' => 'format-video',
        'type' => 'info'
    ),
    'floor_plans' => array(
        'title' => __('Floor Plans - Pro Feature', 'vortex360-lite'),
        'message' => __('Add interactive floor plans and mini-maps for better navigation.', 'vortex360-lite'),
        'icon' => 'location-alt',
        'type' => 'info'
    ),
    'lead_capture' => array(
        'title' => __('Lead Capture - Pro Feature', 'vortex360-lite'),
        'message' => __('Collect visitor information with customizable contact forms.', 'vortex360-lite'),
        'icon' => 'groups',
        'type' => 'info'
    )
);

$notice = isset($notices[$context]) ? $notices[$context] : $notices['general'];

// Add feature name to title if provided
if ($feature && $context === 'feature_locked') {
    $notice['title'] = sprintf(__('%s - Pro Feature', 'vortex360-lite'), $feature);
    $notice['message'] = sprintf(__('The "%s" feature is available in Pro version only.', 'vortex360-lite'), $feature);
}

$notice_id = 'vx-upsell-' . $context . ($feature ? '-' . sanitize_title($feature) : '');
?>

<div class="notice notice-<?php echo esc_attr($notice['type']); ?> vx-upsell-notice <?php echo $dismissible ? 'is-dismissible' : ''; ?>" id="<?php echo esc_attr($notice_id); ?>">
    <div class="vx-notice-content">
        <div class="vx-notice-icon">
            <span class="dashicons dashicons-<?php echo esc_attr($notice['icon']); ?>"></span>
        </div>
        
        <div class="vx-notice-text">
            <h3><?php echo esc_html($notice['title']); ?></h3>
            <p><?php echo esc_html($notice['message']); ?></p>
            
            <?php if ($context === 'general' || $show_comparison): ?>
                <div class="vx-pro-highlights">
                    <ul class="vx-feature-list">
                        <li><span class="dashicons dashicons-yes"></span> <?php _e('Unlimited tours and scenes', 'vortex360-lite'); ?></li>
                        <li><span class="dashicons dashicons-yes"></span> <?php _e('Advanced hotspot types', 'vortex360-lite'); ?></li>
                        <li><span class="dashicons dashicons-yes"></span> <?php _e('Detailed analytics', 'vortex360-lite'); ?></li>
                        <li><span class="dashicons dashicons-yes"></span> <?php _e('White-label branding', 'vortex360-lite'); ?></li>
                        <li><span class="dashicons dashicons-yes"></span> <?php _e('Priority support', 'vortex360-lite'); ?></li>
                    </ul>
                </div>
            <?php endif; ?>
        </div>
        
        <div class="vx-notice-actions">
            <div class="vx-pricing-highlight">
                <span class="vx-discount-badge"><?php _e('50% OFF', 'vortex360-lite'); ?></span>
                <div class="vx-price-display">
                    <span class="vx-price-old">$99</span>
                    <span class="vx-price-new">$49</span>
                    <span class="vx-price-period">/year</span>
                </div>
            </div>
            
            <div class="vx-action-buttons">
                <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=' . $context); ?>" 
                   class="button button-primary vx-upgrade-btn" 
                   target="_blank"
                   onclick="vxTrackUpgradeClick('<?php echo esc_js($context); ?>')">
                    <span class="dashicons dashicons-star-filled"></span>
                    <?php _e('Upgrade Now', 'vortex360-lite'); ?>
                </a>
                
                <?php if ($show_comparison): ?>
                    <a href="<?php echo esc_url(vx_get_comparison_url() . '&utm_content=' . $context); ?>" 
                       class="button button-secondary" 
                       target="_blank">
                        <?php _e('Compare Features', 'vortex360-lite'); ?>
                    </a>
                <?php endif; ?>
                
                <button type="button" class="button button-link vx-learn-more" data-context="<?php echo esc_attr($context); ?>">
                    <?php _e('Learn More', 'vortex360-lite'); ?>
                </button>
            </div>
        </div>
    </div>
    
    <?php if ($dismissible): ?>
        <button type="button" class="notice-dismiss" onclick="vxDismissNotice('<?php echo esc_js($notice_id); ?>')">            <span class="screen-reader-text"><?php _e('Dismiss this notice.', 'vortex360-lite'); ?></span>
        </button>
    <?php endif; ?>
</div>

<!-- Feature Details Modal -->
<div id="vx-feature-modal-<?php echo esc_attr($context); ?>" class="vx-feature-modal" style="display: none;">
    <div class="vx-modal-overlay"></div>
    <div class="vx-modal-content">
        <div class="vx-modal-header">
            <h2><?php echo esc_html($notice['title']); ?></h2>
            <button class="vx-modal-close">&times;</button>
        </div>
        
        <div class="vx-modal-body">
            <?php
            // Show specific feature details based on context
            switch ($context) {
                case 'analytics':
                    ?>
                    <div class="vx-feature-showcase">
                        <div class="vx-feature-image">
                            <div class="vx-placeholder-chart">
                                <div class="vx-chart-bars">
                                    <div class="vx-bar" style="height: 60%;"></div>
                                    <div class="vx-bar" style="height: 80%;"></div>
                                    <div class="vx-bar" style="height: 45%;"></div>
                                    <div class="vx-bar" style="height: 90%;"></div>
                                    <div class="vx-bar" style="height: 70%;"></div>
                                </div>
                                <p><?php _e('Tour Analytics Dashboard', 'vortex360-lite'); ?></p>
                            </div>
                        </div>
                        <div class="vx-feature-details">
                            <h3><?php _e('Track Everything That Matters', 'vortex360-lite'); ?></h3>
                            <ul>
                                <li><?php _e('Total views and unique visitors', 'vortex360-lite'); ?></li>
                                <li><?php _e('Scene engagement and hotspot clicks', 'vortex360-lite'); ?></li>
                                <li><?php _e('Average viewing time and bounce rate', 'vortex360-lite'); ?></li>
                                <li><?php _e('Geographic visitor distribution', 'vortex360-lite'); ?></li>
                                <li><?php _e('Device and browser statistics', 'vortex360-lite'); ?></li>
                                <li><?php _e('Export data for further analysis', 'vortex360-lite'); ?></li>
                            </ul>
                        </div>
                    </div>
                    <?php
                    break;
                    
                case 'branding':
                    ?>
                    <div class="vx-feature-showcase">
                        <div class="vx-feature-image">
                            <div class="vx-branding-preview">
                                <div class="vx-viewer-mockup">
                                    <div class="vx-custom-logo"><?php _e('Your Logo', 'vortex360-lite'); ?></div>
                                    <div class="vx-custom-colors"></div>
                                </div>
                                <p><?php _e('Custom Branded Viewer', 'vortex360-lite'); ?></p>
                            </div>
                        </div>
                        <div class="vx-feature-details">
                            <h3><?php _e('Make It Yours', 'vortex360-lite'); ?></h3>
                            <ul>
                                <li><?php _e('Upload your own logo', 'vortex360-lite'); ?></li>
                                <li><?php _e('Customize colors and themes', 'vortex360-lite'); ?></li>
                                <li><?php _e('Remove Vortex360 branding', 'vortex360-lite'); ?></li>
                                <li><?php _e('Custom loading screens', 'vortex360-lite'); ?></li>
                                <li><?php _e('White-label for agencies', 'vortex360-lite'); ?></li>
                                <li><?php _e('Professional appearance', 'vortex360-lite'); ?></li>
                            </ul>
                        </div>
                    </div>
                    <?php
                    break;
                    
                default:
                    ?>
                    <div class="vx-pro-features-grid">
                        <?php
                        $features = vx_get_pro_features();
                        $featured = array_slice($features, 0, 6);
                        
                        foreach ($featured as $key => $feature_data):
                        ?>
                            <div class="vx-pro-feature-item">
                                <div class="vx-feature-icon">
                                    <span class="dashicons dashicons-<?php echo esc_attr($feature_data['icon']); ?>"></span>
                                </div>
                                <h4><?php echo esc_html($feature_data['title']); ?></h4>
                                <p><?php echo esc_html($feature_data['description']); ?></p>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    
                    <div class="vx-comparison-table">
                        <h3><?php _e('Lite vs Pro Comparison', 'vortex360-lite'); ?></h3>
                        <table class="vx-feature-comparison">
                            <thead>
                                <tr>
                                    <th><?php _e('Feature', 'vortex360-lite'); ?></th>
                                    <th><?php _e('Lite', 'vortex360-lite'); ?></th>
                                    <th><?php _e('Pro', 'vortex360-lite'); ?></th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php
                                $comparison = vx_get_feature_comparison();
                                foreach (array_slice($comparison, 0, 8) as $row):
                                ?>
                                    <tr>
                                        <td><?php echo esc_html($row['feature']); ?></td>
                                        <td><?php echo esc_html($row['lite']); ?></td>
                                        <td class="vx-pro-feature"><?php echo esc_html($row['pro']); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                    <?php
                    break;
            }
            ?>
            
            <div class="vx-testimonials">
                <h3><?php _e('What Our Users Say', 'vortex360-lite'); ?></h3>
                <div class="vx-testimonial">
                    <blockquote>
                        <p><?php _e('"Vortex360 Pro transformed our real estate business. The analytics help us understand what clients want to see most."', 'vortex360-lite'); ?></p>
                        <cite><?php _e('Sarah Johnson, Real Estate Agent', 'vortex360-lite'); ?></cite>
                    </blockquote>
                </div>
            </div>
        </div>
        
        <div class="vx-modal-footer">
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
            
            <div class="vx-modal-actions">
                <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=' . $context . '_modal'); ?>" 
                   class="button button-primary button-large" 
                   target="_blank"
                   onclick="vxTrackUpgradeClick('<?php echo esc_js($context); ?>_modal')">
                    <?php _e('Upgrade to Pro Now', 'vortex360-lite'); ?>
                </a>
                <button type="button" class="button button-secondary vx-modal-close">
                    <?php _e('Maybe Later', 'vortex360-lite'); ?>
                </button>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">
// Track upgrade clicks
function vxTrackUpgradeClick(context) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'upgrade_click', {
            'context': context,
            'plugin': 'vortex360-lite'
        });
    }
    
    // Send to WordPress
    jQuery.post(ajaxurl, {
        action: 'vx_track_upgrade_click',
        context: context,
        nonce: '<?php echo wp_create_nonce('vx_track_upgrade'); ?>'
    });
}

// Dismiss notice
function vxDismissNotice(noticeId) {
    jQuery('#' + noticeId).fadeOut();
    
    jQuery.post(ajaxurl, {
        action: 'vx_dismiss_notice',
        notice_id: noticeId,
        nonce: '<?php echo wp_create_nonce('vx_dismiss_notice'); ?>'
    });
}

// Modal handling
jQuery(document).ready(function($) {
    $('.vx-learn-more').on('click', function() {
        var context = $(this).data('context');
        $('#vx-feature-modal-' + context).show();
    });
    
    $('.vx-modal-close, .vx-modal-overlay').on('click', function() {
        $(this).closest('.vx-feature-modal').hide();
    });
});
</script>

<style>
.vx-upsell-notice {
    border-left-color: #f39c12 !important;
    padding: 15px;
}

.vx-notice-content {
    display: flex;
    align-items: flex-start;
    gap: 15px;
}

.vx-notice-icon .dashicons {
    font-size: 24px;
    color: #f39c12;
    margin-top: 2px;
}

.vx-notice-text {
    flex: 1;
}

.vx-notice-text h3 {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
}

.vx-notice-text p {
    margin: 0 0 12px 0;
    color: #666;
}

.vx-feature-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    margin: 0;
    padding: 0;
    list-style: none;
}

.vx-feature-list li {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    color: #666;
}

.vx-feature-list .dashicons {
    font-size: 14px;
    color: #46b450;
}

.vx-notice-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 10px;
}

.vx-pricing-highlight {
    text-align: center;
}

.vx-discount-badge {
    background: #e74c3c;
    color: white;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
}

.vx-price-display {
    margin-top: 5px;
}

.vx-price-old {
    text-decoration: line-through;
    color: #999;
    font-size: 14px;
}

.vx-price-new {
    font-size: 18px;
    font-weight: bold;
    color: #27ae60;
    margin: 0 3px;
}

.vx-price-period {
    font-size: 12px;
    color: #666;
}

.vx-action-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.vx-upgrade-btn {
    background: #f39c12 !important;
    border-color: #e67e22 !important;
    text-shadow: none !important;
    box-shadow: none !important;
}

.vx-upgrade-btn:hover {
    background: #e67e22 !important;
    border-color: #d35400 !important;
}

@media (max-width: 782px) {
    .vx-notice-content {
        flex-direction: column;
    }
    
    .vx-notice-actions {
        align-items: flex-start;
        width: 100%;
    }
    
    .vx-action-buttons {
        width: 100%;
    }
    
    .vx-action-buttons .button {
        flex: 1;
        text-align: center;
    }
}
</style>