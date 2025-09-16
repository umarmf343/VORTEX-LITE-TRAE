<?php
/**
 * Vortex360 Lite - Settings Page Template
 * 
 * Admin settings page with configuration options and Pro features
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Get current settings
$settings = vx_get_settings();
$is_pro = vx_is_pro_active();
$limits = vx_get_lite_limits();

// Handle form submission
if (isset($_POST['vx_save_settings']) && wp_verify_nonce($_POST['vx_settings_nonce'], 'vx_save_settings')) {
    $new_settings = array();
    
    // General settings
    $new_settings['viewer_theme'] = sanitize_text_field($_POST['viewer_theme'] ?? 'default');
    $new_settings['auto_rotation'] = isset($_POST['auto_rotation']) ? 1 : 0;
    $new_settings['rotation_speed'] = intval($_POST['rotation_speed'] ?? 2);
    $new_settings['show_controls'] = isset($_POST['show_controls']) ? 1 : 0;
    $new_settings['show_fullscreen'] = isset($_POST['show_fullscreen']) ? 1 : 0;
    $new_settings['show_gyroscope'] = isset($_POST['show_gyroscope']) ? 1 : 0;
    
    // Performance settings
    $new_settings['image_quality'] = sanitize_text_field($_POST['image_quality'] ?? 'medium');
    $new_settings['preload_scenes'] = isset($_POST['preload_scenes']) ? 1 : 0;
    $new_settings['lazy_loading'] = isset($_POST['lazy_loading']) ? 1 : 0;
    
    // SEO settings
    $new_settings['enable_seo'] = isset($_POST['enable_seo']) ? 1 : 0;
    $new_settings['default_title'] = sanitize_text_field($_POST['default_title'] ?? '');
    $new_settings['default_description'] = sanitize_textarea_field($_POST['default_description'] ?? '');
    
    // Save settings
    vx_update_settings($new_settings);
    
    echo '<div class="notice notice-success is-dismissible"><p>' . __('Settings saved successfully!', 'vortex360-lite') . '</p></div>';
}
?>

<div class="wrap vx-settings-page">
    <h1 class="wp-heading-inline">
        <span class="dashicons dashicons-admin-settings"></span>
        <?php _e('Vortex360 Settings', 'vortex360-lite'); ?>
    </h1>
    
    <?php if (!$is_pro): ?>
        <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=settings_header'); ?>" 
           class="page-title-action vx-pro-badge" 
           target="_blank"
           onclick="vxTrackUpgradeClick('settings_header')">
            <span class="dashicons dashicons-star-filled"></span>
            <?php _e('Upgrade to Pro', 'vortex360-lite'); ?>
        </a>
    <?php endif; ?>
    
    <hr class="wp-header-end">
    
    <?php if (!$is_pro): ?>
        <div class="vx-pro-banner">
            <div class="vx-banner-content">
                <div class="vx-banner-icon">
                    <span class="dashicons dashicons-star-filled"></span>
                </div>
                <div class="vx-banner-text">
                    <h3><?php _e('Unlock More Features with Pro', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Get unlimited tours, advanced analytics, custom branding, and priority support.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-banner-action">
                    <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=settings_banner'); ?>" 
                       class="button button-primary" 
                       target="_blank"
                       onclick="vxTrackUpgradeClick('settings_banner')">
                        <?php _e('View Pro Features', 'vortex360-lite'); ?>
                    </a>
                </div>
            </div>
        </div>
    <?php endif; ?>
    
    <div class="vx-settings-container">
        <div class="vx-settings-main">
            <form method="post" action="" class="vx-settings-form">
                <?php wp_nonce_field('vx_save_settings', 'vx_settings_nonce'); ?>
                
                <!-- General Settings -->
                <div class="vx-settings-section">
                    <h2 class="vx-section-title">
                        <span class="dashicons dashicons-admin-appearance"></span>
                        <?php _e('General Settings', 'vortex360-lite'); ?>
                    </h2>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="viewer_theme"><?php _e('Viewer Theme', 'vortex360-lite'); ?></label>
                            </th>
                            <td>
                                <select name="viewer_theme" id="viewer_theme">
                                    <option value="default" <?php selected($settings['viewer_theme'], 'default'); ?>>
                                        <?php _e('Default', 'vortex360-lite'); ?>
                                    </option>
                                    <option value="dark" <?php selected($settings['viewer_theme'], 'dark'); ?>>
                                        <?php _e('Dark', 'vortex360-lite'); ?>
                                    </option>
                                    <option value="minimal" <?php selected($settings['viewer_theme'], 'minimal'); ?>>
                                        <?php _e('Minimal', 'vortex360-lite'); ?>
                                    </option>
                                    <?php if (!$is_pro): ?>
                                        <option value="custom" disabled>
                                            <?php _e('Custom (Pro)', 'vortex360-lite'); ?>
                                        </option>
                                    <?php endif; ?>
                                </select>
                                <p class="description">
                                    <?php _e('Choose the visual theme for your 360° tours.', 'vortex360-lite'); ?>
                                    <?php if (!$is_pro): ?>
                                        <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=custom_theme'); ?>" target="_blank">
                                            <?php _e('Unlock custom themes with Pro', 'vortex360-lite'); ?>
                                        </a>
                                    <?php endif; ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Auto Rotation', 'vortex360-lite'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="auto_rotation" value="1" 
                                               <?php checked($settings['auto_rotation']); ?>>
                                        <?php _e('Enable automatic rotation', 'vortex360-lite'); ?>
                                    </label>
                                    <p class="description">
                                        <?php _e('Automatically rotate the view when tours load.', 'vortex360-lite'); ?>
                                    </p>
                                </fieldset>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="rotation_speed"><?php _e('Rotation Speed', 'vortex360-lite'); ?></label>
                            </th>
                            <td>
                                <input type="range" name="rotation_speed" id="rotation_speed" 
                                       min="1" max="5" step="1" 
                                       value="<?php echo esc_attr($settings['rotation_speed']); ?>"
                                       oninput="document.getElementById('speed_value').textContent = this.value">
                                <span id="speed_value"><?php echo esc_html($settings['rotation_speed']); ?></span>
                                <p class="description">
                                    <?php _e('Speed of automatic rotation (1 = slowest, 5 = fastest).', 'vortex360-lite'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Viewer Controls', 'vortex360-lite'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="show_controls" value="1" 
                                               <?php checked($settings['show_controls']); ?>>
                                        <?php _e('Show navigation controls', 'vortex360-lite'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="show_fullscreen" value="1" 
                                               <?php checked($settings['show_fullscreen']); ?>>
                                        <?php _e('Show fullscreen button', 'vortex360-lite'); ?>
                                    </label><br>
                                    
                                    <label>
                                        <input type="checkbox" name="show_gyroscope" value="1" 
                                               <?php checked($settings['show_gyroscope']); ?>>
                                        <?php _e('Enable gyroscope on mobile', 'vortex360-lite'); ?>
                                    </label>
                                    
                                    <?php if (!$is_pro): ?>
                                        <br><label class="vx-pro-feature">
                                            <input type="checkbox" disabled>
                                            <?php _e('VR mode button (Pro)', 'vortex360-lite'); ?>
                                            <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=vr_mode'); ?>" 
                                               class="vx-pro-link" target="_blank">
                                                <?php _e('Upgrade', 'vortex360-lite'); ?>
                                            </a>
                                        </label>
                                    <?php endif; ?>
                                </fieldset>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- Performance Settings -->
                <div class="vx-settings-section">
                    <h2 class="vx-section-title">
                        <span class="dashicons dashicons-performance"></span>
                        <?php _e('Performance Settings', 'vortex360-lite'); ?>
                    </h2>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="image_quality"><?php _e('Image Quality', 'vortex360-lite'); ?></label>
                            </th>
                            <td>
                                <select name="image_quality" id="image_quality">
                                    <option value="low" <?php selected($settings['image_quality'], 'low'); ?>>
                                        <?php _e('Low (Faster loading)', 'vortex360-lite'); ?>
                                    </option>
                                    <option value="medium" <?php selected($settings['image_quality'], 'medium'); ?>>
                                        <?php _e('Medium (Balanced)', 'vortex360-lite'); ?>
                                    </option>
                                    <option value="high" <?php selected($settings['image_quality'], 'high'); ?>>
                                        <?php _e('High (Best quality)', 'vortex360-lite'); ?>
                                    </option>
                                    <?php if (!$is_pro): ?>
                                        <option value="adaptive" disabled>
                                            <?php _e('Adaptive (Pro)', 'vortex360-lite'); ?>
                                        </option>
                                    <?php endif; ?>
                                </select>
                                <p class="description">
                                    <?php _e('Balance between image quality and loading speed.', 'vortex360-lite'); ?>
                                    <?php if (!$is_pro): ?>
                                        <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=adaptive_quality'); ?>" target="_blank">
                                            <?php _e('Get adaptive quality with Pro', 'vortex360-lite'); ?>
                                        </a>
                                    <?php endif; ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row"><?php _e('Loading Options', 'vortex360-lite'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="preload_scenes" value="1" 
                                               <?php checked($settings['preload_scenes']); ?>>
                                        <?php _e('Preload adjacent scenes', 'vortex360-lite'); ?>
                                    </label>
                                    <p class="description">
                                        <?php _e('Preload nearby scenes for faster navigation (uses more bandwidth).', 'vortex360-lite'); ?>
                                    </p>
                                    
                                    <label>
                                        <input type="checkbox" name="lazy_loading" value="1" 
                                               <?php checked($settings['lazy_loading']); ?>>
                                        <?php _e('Enable lazy loading', 'vortex360-lite'); ?>
                                    </label>
                                    <p class="description">
                                        <?php _e('Load images only when needed to improve initial load time.', 'vortex360-lite'); ?>
                                    </p>
                                </fieldset>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <!-- SEO Settings -->
                <div class="vx-settings-section">
                    <h2 class="vx-section-title">
                        <span class="dashicons dashicons-search"></span>
                        <?php _e('SEO Settings', 'vortex360-lite'); ?>
                    </h2>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('SEO Features', 'vortex360-lite'); ?></th>
                            <td>
                                <fieldset>
                                    <label>
                                        <input type="checkbox" name="enable_seo" value="1" 
                                               <?php checked($settings['enable_seo']); ?>>
                                        <?php _e('Enable SEO optimization', 'vortex360-lite'); ?>
                                    </label>
                                    <p class="description">
                                        <?php _e('Add meta tags and structured data for better search engine visibility.', 'vortex360-lite'); ?>
                                    </p>
                                </fieldset>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="default_title"><?php _e('Default Title', 'vortex360-lite'); ?></label>
                            </th>
                            <td>
                                <input type="text" name="default_title" id="default_title" 
                                       class="regular-text" 
                                       value="<?php echo esc_attr($settings['default_title']); ?>"
                                       placeholder="<?php _e('360° Virtual Tour', 'vortex360-lite'); ?>">
                                <p class="description">
                                    <?php _e('Default title for tours without a custom title.', 'vortex360-lite'); ?>
                                </p>
                            </td>
                        </tr>
                        
                        <tr>
                            <th scope="row">
                                <label for="default_description"><?php _e('Default Description', 'vortex360-lite'); ?></label>
                            </th>
                            <td>
                                <textarea name="default_description" id="default_description" 
                                          class="large-text" rows="3"
                                          placeholder="<?php _e('Explore this immersive 360° virtual tour...', 'vortex360-lite'); ?>"><?php echo esc_textarea($settings['default_description']); ?></textarea>
                                <p class="description">
                                    <?php _e('Default meta description for tours.', 'vortex360-lite'); ?>
                                </p>
                            </td>
                        </tr>
                    </table>
                </div>
                
                <?php if (!$is_pro): ?>
                    <!-- Pro Features Preview -->
                    <div class="vx-settings-section vx-pro-section">
                        <h2 class="vx-section-title">
                            <span class="dashicons dashicons-star-filled"></span>
                            <?php _e('Pro Features', 'vortex360-lite'); ?>
                            <span class="vx-pro-badge-small"><?php _e('Upgrade Required', 'vortex360-lite'); ?></span>
                        </h2>
                        
                        <div class="vx-pro-features-preview">
                            <div class="vx-pro-feature-group">
                                <h3><?php _e('Analytics & Tracking', 'vortex360-lite'); ?></h3>
                                <div class="vx-disabled-controls">
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Enable Google Analytics integration', 'vortex360-lite'); ?>
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Track hotspot interactions', 'vortex360-lite'); ?>
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Generate detailed reports', 'vortex360-lite'); ?>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="vx-pro-feature-group">
                                <h3><?php _e('Custom Branding', 'vortex360-lite'); ?></h3>
                                <div class="vx-disabled-controls">
                                    <label class="vx-disabled">
                                        <?php _e('Custom Logo:', 'vortex360-lite'); ?>
                                        <input type="file" disabled>
                                    </label>
                                    <label class="vx-disabled">
                                        <?php _e('Brand Colors:', 'vortex360-lite'); ?>
                                        <input type="color" disabled value="#f39c12">
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Remove Vortex360 branding', 'vortex360-lite'); ?>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="vx-pro-feature-group">
                                <h3><?php _e('Advanced Features', 'vortex360-lite'); ?></h3>
                                <div class="vx-disabled-controls">
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Floor plan navigation', 'vortex360-lite'); ?>
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Lead capture forms', 'vortex360-lite'); ?>
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('Video and audio hotspots', 'vortex360-lite'); ?>
                                    </label>
                                    <label class="vx-disabled">
                                        <input type="checkbox" disabled>
                                        <?php _e('VR headset support', 'vortex360-lite'); ?>
                                    </label>
                                </div>
                            </div>
                            
                            <div class="vx-pro-upgrade-cta">
                                <h3><?php _e('Ready to Upgrade?', 'vortex360-lite'); ?></h3>
                                <p><?php _e('Unlock all these features and more with Vortex360 Pro.', 'vortex360-lite'); ?></p>
                                <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=settings_pro_features'); ?>" 
                                   class="button button-primary button-large" 
                                   target="_blank"
                                   onclick="vxTrackUpgradeClick('settings_pro_features')">
                                    <span class="dashicons dashicons-star-filled"></span>
                                    <?php _e('Upgrade to Pro Now', 'vortex360-lite'); ?>
                                </a>
                                <a href="<?php echo esc_url(vx_get_comparison_url() . '&utm_content=settings_comparison'); ?>" 
                                   class="button button-secondary" 
                                   target="_blank">
                                    <?php _e('Compare Features', 'vortex360-lite'); ?>
                                </a>
                            </div>
                        </div>
                    </div>
                <?php endif; ?>
                
                <div class="vx-settings-footer">
                    <p class="submit">
                        <input type="submit" name="vx_save_settings" class="button-primary" 
                               value="<?php _e('Save Settings', 'vortex360-lite'); ?>">
                        <a href="<?php echo admin_url('admin.php?page=vx-tours'); ?>" class="button">
                            <?php _e('Back to Tours', 'vortex360-lite'); ?>
                        </a>
                    </p>
                </div>
            </form>
        </div>
        
        <div class="vx-settings-sidebar">
            <!-- Current Limits -->
            <div class="vx-sidebar-widget">
                <h3><?php _e('Current Limits', 'vortex360-lite'); ?></h3>
                <div class="vx-limits-display">
                    <div class="vx-limit-item">
                        <span class="vx-limit-label"><?php _e('Tours:', 'vortex360-lite'); ?></span>
                        <span class="vx-limit-value">
                            <?php echo vx_get_tours_count(); ?> / <?php echo $limits['max_tours']; ?>
                        </span>
                    </div>
                    <div class="vx-limit-item">
                        <span class="vx-limit-label"><?php _e('Scenes per tour:', 'vortex360-lite'); ?></span>
                        <span class="vx-limit-value"><?php echo $limits['max_scenes_per_tour']; ?></span>
                    </div>
                    <div class="vx-limit-item">
                        <span class="vx-limit-label"><?php _e('Hotspots per scene:', 'vortex360-lite'); ?></span>
                        <span class="vx-limit-value"><?php echo $limits['max_hotspots_per_scene']; ?></span>
                    </div>
                </div>
                
                <?php if (!$is_pro): ?>
                    <p class="vx-upgrade-note">
                        <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=limits_sidebar'); ?>" 
                           target="_blank"
                           onclick="vxTrackUpgradeClick('limits_sidebar')">
                            <?php _e('Remove all limits with Pro →', 'vortex360-lite'); ?>
                        </a>
                    </p>
                <?php endif; ?>
            </div>
            
            <!-- Support -->
            <div class="vx-sidebar-widget">
                <h3><?php _e('Need Help?', 'vortex360-lite'); ?></h3>
                <ul class="vx-support-links">
                    <li>
                        <a href="<?php echo esc_url(vx_get_docs_url()); ?>" target="_blank">
                            <span class="dashicons dashicons-book"></span>
                            <?php _e('Documentation', 'vortex360-lite'); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(vx_get_support_url()); ?>" target="_blank">
                            <span class="dashicons dashicons-sos"></span>
                            <?php _e('Support Forum', 'vortex360-lite'); ?>
                        </a>
                    </li>
                    <li>
                        <a href="<?php echo esc_url(vx_get_video_tutorials_url()); ?>" target="_blank">
                            <span class="dashicons dashicons-video-alt3"></span>
                            <?php _e('Video Tutorials', 'vortex360-lite'); ?>
                        </a>
                    </li>
                </ul>
                
                <?php if (!$is_pro): ?>
                    <div class="vx-priority-support">
                        <h4><?php _e('Priority Support', 'vortex360-lite'); ?></h4>
                        <p><?php _e('Get faster responses and dedicated help with Pro.', 'vortex360-lite'); ?></p>
                        <a href="<?php echo esc_url(vx_get_pro_url() . '&utm_content=priority_support'); ?>" 
                           class="button button-secondary button-small" 
                           target="_blank"
                           onclick="vxTrackUpgradeClick('priority_support')">
                            <?php _e('Learn More', 'vortex360-lite'); ?>
                        </a>
                    </div>
                <?php endif; ?>
            </div>
            
            <!-- Plugin Info -->
            <div class="vx-sidebar-widget">
                <h3><?php _e('Plugin Information', 'vortex360-lite'); ?></h3>
                <div class="vx-plugin-info">
                    <p>
                        <strong><?php _e('Version:', 'vortex360-lite'); ?></strong>
                        <?php echo VX_VERSION; ?>
                    </p>
                    <p>
                        <strong><?php _e('License:', 'vortex360-lite'); ?></strong>
                        <?php echo $is_pro ? __('Pro', 'vortex360-lite') : __('Lite', 'vortex360-lite'); ?>
                    </p>
                    <p>
                        <strong><?php _e('Database Version:', 'vortex360-lite'); ?></strong>
                        <?php echo get_option('vx_db_version', '1.0.0'); ?>
                    </p>
                </div>
                
                <div class="vx-plugin-actions">
                    <button type="button" class="button button-secondary button-small" 
                            onclick="vxExportSettings()">
                        <?php _e('Export Settings', 'vortex360-lite'); ?>
                    </button>
                    <button type="button" class="button button-secondary button-small" 
                            onclick="vxImportSettings()">
                        <?php _e('Import Settings', 'vortex360-lite'); ?>
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>

<script type="text/javascript">
// Settings export/import
function vxExportSettings() {
    const settings = <?php echo json_encode($settings); ?>;
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = 'vortex360-settings.json';
    link.click();
}

function vxImportSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const settings = JSON.parse(e.target.result);
                
                if (confirm('<?php _e('Import these settings? Current settings will be overwritten.', 'vortex360-lite'); ?>')) {
                    // Populate form fields
                    Object.keys(settings).forEach(key => {
                        const field = document.querySelector(`[name="${key}"]`);
                        if (field) {
                            if (field.type === 'checkbox') {
                                field.checked = !!settings[key];
                            } else {
                                field.value = settings[key];
                            }
                        }
                    });
                    
                    alert('<?php _e('Settings imported successfully. Click "Save Settings" to apply.', 'vortex360-lite'); ?>');
                }
            } catch (error) {
                alert('<?php _e('Invalid settings file.', 'vortex360-lite'); ?>');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
}

// Track upgrade clicks
function vxTrackUpgradeClick(context) {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'upgrade_click', {
            'context': context,
            'plugin': 'vortex360-lite'
        });
    }
    
    jQuery.post(ajaxurl, {
        action: 'vx_track_upgrade_click',
        context: context,
        nonce: '<?php echo wp_create_nonce('vx_track_upgrade'); ?>'
    });
}
</script>