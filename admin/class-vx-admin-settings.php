<?php
/**
 * Vortex360 Lite - Admin Settings
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/admin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin settings class
 */
class VX_Admin_Settings {

    /**
     * Settings page slug
     */
    const PAGE_SLUG = 'vortex360-settings';

    /**
     * Option group name
     */
    const OPTION_GROUP = 'vortex360_settings';

    /**
     * Option name
     */
    const OPTION_NAME = 'vortex360_options';

    /**
     * Initialize the class
     */
    public function __construct() {
        $this->init_hooks();
    }

    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('admin_menu', array($this, 'add_settings_page'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_ajax_vx_reset_settings', array($this, 'reset_settings'));
    }

    /**
     * Add settings page to admin menu
     */
    public function add_settings_page() {
        add_submenu_page(
            'edit.php?post_type=vortex_tour',
            __('Settings', 'vortex360-lite'),
            __('Settings', 'vortex360-lite'),
            'manage_options',
            self::PAGE_SLUG,
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting(
            self::OPTION_GROUP,
            self::OPTION_NAME,
            array(
                'sanitize_callback' => array($this, 'sanitize_settings'),
                'default' => $this->get_default_settings()
            )
        );

        // General settings section
        add_settings_section(
            'vx_general_settings',
            __('General Settings', 'vortex360-lite'),
            array($this, 'render_general_section'),
            self::PAGE_SLUG
        );

        // Viewer settings section
        add_settings_section(
            'vx_viewer_settings',
            __('Viewer Settings', 'vortex360-lite'),
            array($this, 'render_viewer_section'),
            self::PAGE_SLUG
        );

        // Performance settings section
        add_settings_section(
            'vx_performance_settings',
            __('Performance Settings', 'vortex360-lite'),
            array($this, 'render_performance_section'),
            self::PAGE_SLUG
        );

        // Add settings fields
        $this->add_settings_fields();
    }

    /**
     * Add settings fields
     */
    private function add_settings_fields() {
        // General settings fields
        add_settings_field(
            'default_width',
            __('Default Width', 'vortex360-lite'),
            array($this, 'render_text_field'),
            self::PAGE_SLUG,
            'vx_general_settings',
            array(
                'field' => 'default_width',
                'type' => 'number',
                'min' => 300,
                'max' => 2000,
                'description' => __('Default width for tour viewer (pixels)', 'vortex360-lite')
            )
        );

        add_settings_field(
            'default_height',
            __('Default Height', 'vortex360-lite'),
            array($this, 'render_text_field'),
            self::PAGE_SLUG,
            'vx_general_settings',
            array(
                'field' => 'default_height',
                'type' => 'number',
                'min' => 200,
                'max' => 1500,
                'description' => __('Default height for tour viewer (pixels)', 'vortex360-lite')
            )
        );

        add_settings_field(
            'auto_load',
            __('Auto Load Tours', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_general_settings',
            array(
                'field' => 'auto_load',
                'description' => __('Automatically load tours when page loads', 'vortex360-lite')
            )
        );

        add_settings_field(
            'show_controls',
            __('Show Controls', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_general_settings',
            array(
                'field' => 'show_controls',
                'description' => __('Show viewer controls by default', 'vortex360-lite')
            )
        );

        // Viewer settings fields
        add_settings_field(
            'mouse_zoom',
            __('Mouse Zoom', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_viewer_settings',
            array(
                'field' => 'mouse_zoom',
                'description' => __('Enable mouse wheel zoom', 'vortex360-lite')
            )
        );

        add_settings_field(
            'auto_rotate',
            __('Auto Rotate', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_viewer_settings',
            array(
                'field' => 'auto_rotate',
                'description' => __('Enable auto rotation by default', 'vortex360-lite')
            )
        );

        add_settings_field(
            'auto_rotate_speed',
            __('Auto Rotate Speed', 'vortex360-lite'),
            array($this, 'render_select_field'),
            self::PAGE_SLUG,
            'vx_viewer_settings',
            array(
                'field' => 'auto_rotate_speed',
                'options' => array(
                    '1' => __('Slow', 'vortex360-lite'),
                    '2' => __('Normal', 'vortex360-lite'),
                    '3' => __('Fast', 'vortex360-lite')
                ),
                'description' => __('Speed of auto rotation', 'vortex360-lite')
            )
        );

        add_settings_field(
            'hotspot_style',
            __('Hotspot Style', 'vortex360-lite'),
            array($this, 'render_select_field'),
            self::PAGE_SLUG,
            'vx_viewer_settings',
            array(
                'field' => 'hotspot_style',
                'options' => array(
                    'default' => __('Default', 'vortex360-lite'),
                    'minimal' => __('Minimal', 'vortex360-lite'),
                    'modern' => __('Modern', 'vortex360-lite')
                ),
                'description' => __('Default hotspot appearance style', 'vortex360-lite')
            )
        );

        // Performance settings fields
        add_settings_field(
            'image_quality',
            __('Image Quality', 'vortex360-lite'),
            array($this, 'render_select_field'),
            self::PAGE_SLUG,
            'vx_performance_settings',
            array(
                'field' => 'image_quality',
                'options' => array(
                    'low' => __('Low (Faster loading)', 'vortex360-lite'),
                    'medium' => __('Medium (Balanced)', 'vortex360-lite'),
                    'high' => __('High (Better quality)', 'vortex360-lite')
                ),
                'description' => __('Image quality vs loading speed balance', 'vortex360-lite')
            )
        );

        add_settings_field(
            'preload_scenes',
            __('Preload Scenes', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_performance_settings',
            array(
                'field' => 'preload_scenes',
                'description' => __('Preload adjacent scenes for faster navigation', 'vortex360-lite')
            )
        );

        add_settings_field(
            'lazy_load',
            __('Lazy Loading', 'vortex360-lite'),
            array($this, 'render_checkbox_field'),
            self::PAGE_SLUG,
            'vx_performance_settings',
            array(
                'field' => 'lazy_load',
                'description' => __('Enable lazy loading for better page performance', 'vortex360-lite')
            )
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions to access this page.', 'vortex360-lite'));
        }

        // Handle form submission
        if (isset($_POST['submit'])) {
            check_admin_referer(self::OPTION_GROUP . '-options');
        }

        $active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'general';
        ?>
        <div class="wrap vx-admin-page">
            <div class="vx-admin-header">
                <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
                <p><?php _e('Configure your Vortex360 Lite plugin settings.', 'vortex360-lite'); ?></p>
            </div>

            <nav class="nav-tab-wrapper">
                <a href="?post_type=vortex_tour&page=<?php echo self::PAGE_SLUG; ?>&tab=general" 
                   class="nav-tab <?php echo $active_tab === 'general' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('General', 'vortex360-lite'); ?>
                </a>
                <a href="?post_type=vortex_tour&page=<?php echo self::PAGE_SLUG; ?>&tab=viewer" 
                   class="nav-tab <?php echo $active_tab === 'viewer' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Viewer', 'vortex360-lite'); ?>
                </a>
                <a href="?post_type=vortex_tour&page=<?php echo self::PAGE_SLUG; ?>&tab=performance" 
                   class="nav-tab <?php echo $active_tab === 'performance' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Performance', 'vortex360-lite'); ?>
                </a>
                <a href="?post_type=vortex_tour&page=<?php echo self::PAGE_SLUG; ?>&tab=upgrade" 
                   class="nav-tab <?php echo $active_tab === 'upgrade' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('Upgrade', 'vortex360-lite'); ?>
                </a>
            </nav>

            <div class="vx-admin-content">
                <?php if ($active_tab === 'upgrade'): ?>
                    <?php $this->render_upgrade_tab(); ?>
                <?php else: ?>
                    <div class="vx-admin-main">
                        <form method="post" action="options.php" class="vx-settings-form">
                            <?php
                            settings_fields(self::OPTION_GROUP);
                            do_settings_sections(self::PAGE_SLUG);
                            submit_button();
                            ?>
                        </form>
                    </div>
                    <div class="vx-admin-sidebar">
                        <?php $this->render_sidebar(); ?>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /**
     * Render upgrade tab
     */
    private function render_upgrade_tab() {
        ?>
        <div class="vx-upgrade-page">
            <div class="vx-upgrade-hero">
                <h1><?php _e('Upgrade to Vortex360 Pro', 'vortex360-lite'); ?></h1>
                <p><?php _e('Unlock the full potential of your virtual tours with advanced features and unlimited content.', 'vortex360-lite'); ?></p>
                <a href="#" class="button button-primary button-hero"><?php _e('Upgrade Now', 'vortex360-lite'); ?></a>
            </div>

            <div class="vx-features-grid">
                <div class="vx-feature-card">
                    <h3><?php _e('Unlimited Content', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Create tours with unlimited scenes and hotspots. No restrictions on your creativity.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-feature-card">
                    <h3><?php _e('Advanced Hotspots', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Video hotspots, audio narration, custom HTML content, and interactive elements.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-feature-card">
                    <h3><?php _e('Custom Branding', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Remove branding, add your logo, customize colors and styling to match your brand.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-feature-card">
                    <h3><?php _e('Analytics & Insights', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Track viewer engagement, popular scenes, and interaction patterns with detailed analytics.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-feature-card">
                    <h3><?php _e('Priority Support', 'vortex360-lite'); ?></h3>
                    <p><?php _e('Get priority email support, documentation access, and regular feature updates.', 'vortex360-lite'); ?></p>
                </div>
                <div class="vx-feature-card">
                    <h3><?php _e('Advanced Integrations', 'vortex360-lite'); ?></h3>
                    <p><?php _e('WooCommerce integration, lead generation forms, CRM connections, and more.', 'vortex360-lite'); ?></p>
                </div>
            </div>

            <div class="vx-comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th><?php _e('Feature', 'vortex360-lite'); ?></th>
                            <th><?php _e('Lite', 'vortex360-lite'); ?></th>
                            <th class="vx-pro-column"><?php _e('Pro', 'vortex360-lite'); ?></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><?php _e('Scenes per tour', 'vortex360-lite'); ?></td>
                            <td>5</td>
                            <td class="vx-pro-column"><?php _e('Unlimited', 'vortex360-lite'); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('Hotspots per scene', 'vortex360-lite'); ?></td>
                            <td>5</td>
                            <td class="vx-pro-column"><?php _e('Unlimited', 'vortex360-lite'); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('Hotspot types', 'vortex360-lite'); ?></td>
                            <td><?php _e('Basic (3 types)', 'vortex360-lite'); ?></td>
                            <td class="vx-pro-column"><?php _e('Advanced (10+ types)', 'vortex360-lite'); ?></td>
                        </tr>
                        <tr>
                            <td><?php _e('Custom branding', 'vortex360-lite'); ?></td>
                            <td><span class="vx-cross">✗</span></td>
                            <td class="vx-pro-column"><span class="vx-check">✓</span></td>
                        </tr>
                        <tr>
                            <td><?php _e('Analytics', 'vortex360-lite'); ?></td>
                            <td><span class="vx-cross">✗</span></td>
                            <td class="vx-pro-column"><span class="vx-check">✓</span></td>
                        </tr>
                        <tr>
                            <td><?php _e('Priority support', 'vortex360-lite'); ?></td>
                            <td><span class="vx-cross">✗</span></td>
                            <td class="vx-pro-column"><span class="vx-check">✓</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <?php
    }

    /**
     * Render sidebar
     */
    private function render_sidebar() {
        ?>
        <div class="vx-settings-section">
            <h2><?php _e('Quick Actions', 'vortex360-lite'); ?></h2>
            <div style="padding: 20px;">
                <p>
                    <button type="button" class="button" onclick="VXAdmin.resetSettings()">
                        <?php _e('Reset to Defaults', 'vortex360-lite'); ?>
                    </button>
                </p>
                <p>
                    <a href="<?php echo admin_url('edit.php?post_type=vortex_tour'); ?>" class="button">
                        <?php _e('Manage Tours', 'vortex360-lite'); ?>
                    </a>
                </p>
                <p>
                    <a href="<?php echo admin_url('post-new.php?post_type=vortex_tour'); ?>" class="button button-primary">
                        <?php _e('Create New Tour', 'vortex360-lite'); ?>
                    </a>
                </p>
            </div>
        </div>

        <div class="vx-settings-section">
            <h2><?php _e('Need Help?', 'vortex360-lite'); ?></h2>
            <div style="padding: 20px;">
                <p><?php _e('Check out our documentation and support resources:', 'vortex360-lite'); ?></p>
                <ul>
                    <li><a href="#" target="_blank"><?php _e('Documentation', 'vortex360-lite'); ?></a></li>
                    <li><a href="#" target="_blank"><?php _e('Video Tutorials', 'vortex360-lite'); ?></a></li>
                    <li><a href="#" target="_blank"><?php _e('Support Forum', 'vortex360-lite'); ?></a></li>
                </ul>
            </div>
        </div>
        <?php
    }

    /**
     * Render section descriptions
     */
    public function render_general_section() {
        echo '<p>' . __('Configure general plugin settings and default values.', 'vortex360-lite') . '</p>';
    }

    public function render_viewer_section() {
        echo '<p>' . __('Customize the 360° viewer behavior and appearance.', 'vortex360-lite') . '</p>';
    }

    public function render_performance_section() {
        echo '<p>' . __('Optimize performance and loading behavior.', 'vortex360-lite') . '</p>';
    }

    /**
     * Render text field
     */
    public function render_text_field($args) {
        $options = get_option(self::OPTION_NAME, $this->get_default_settings());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        $type = isset($args['type']) ? $args['type'] : 'text';
        $min = isset($args['min']) ? ' min="' . $args['min'] . '"' : '';
        $max = isset($args['max']) ? ' max="' . $args['max'] . '"' : '';
        
        printf(
            '<input type="%s" id="%s" name="%s[%s]" value="%s"%s%s class="regular-text" />',
            esc_attr($type),
            esc_attr($args['field']),
            esc_attr(self::OPTION_NAME),
            esc_attr($args['field']),
            esc_attr($value),
            $min,
            $max
        );
        
        if (isset($args['description'])) {
            printf('<p class="description">%s</p>', esc_html($args['description']));
        }
    }

    /**
     * Render checkbox field
     */
    public function render_checkbox_field($args) {
        $options = get_option(self::OPTION_NAME, $this->get_default_settings());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : false;
        
        printf(
            '<input type="checkbox" id="%s" name="%s[%s]" value="1" %s />',
            esc_attr($args['field']),
            esc_attr(self::OPTION_NAME),
            esc_attr($args['field']),
            checked(1, $value, false)
        );
        
        if (isset($args['description'])) {
            printf('<label for="%s"> %s</label>', esc_attr($args['field']), esc_html($args['description']));
        }
    }

    /**
     * Render select field
     */
    public function render_select_field($args) {
        $options = get_option(self::OPTION_NAME, $this->get_default_settings());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        
        printf('<select id="%s" name="%s[%s]">', esc_attr($args['field']), esc_attr(self::OPTION_NAME), esc_attr($args['field']));
        
        foreach ($args['options'] as $option_value => $option_label) {
            printf(
                '<option value="%s" %s>%s</option>',
                esc_attr($option_value),
                selected($value, $option_value, false),
                esc_html($option_label)
            );
        }
        
        echo '</select>';
        
        if (isset($args['description'])) {
            printf('<p class="description">%s</p>', esc_html($args['description']));
        }
    }

    /**
     * Get default settings
     */
    public function get_default_settings() {
        return array(
            'default_width' => 800,
            'default_height' => 600,
            'auto_load' => true,
            'show_controls' => true,
            'mouse_zoom' => true,
            'auto_rotate' => false,
            'auto_rotate_speed' => '2',
            'hotspot_style' => 'default',
            'image_quality' => 'medium',
            'preload_scenes' => false,
            'lazy_load' => true
        );
    }

    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        $defaults = $this->get_default_settings();
        
        foreach ($defaults as $key => $default_value) {
            if (isset($input[$key])) {
                switch ($key) {
                    case 'default_width':
                    case 'default_height':
                        $sanitized[$key] = absint($input[$key]);
                        break;
                    case 'auto_load':
                    case 'show_controls':
                    case 'mouse_zoom':
                    case 'auto_rotate':
                    case 'preload_scenes':
                    case 'lazy_load':
                        $sanitized[$key] = (bool) $input[$key];
                        break;
                    case 'auto_rotate_speed':
                    case 'hotspot_style':
                    case 'image_quality':
                        $sanitized[$key] = sanitize_text_field($input[$key]);
                        break;
                    default:
                        $sanitized[$key] = sanitize_text_field($input[$key]);
                }
            } else {
                $sanitized[$key] = $default_value;
            }
        }
        
        return $sanitized;
    }

    /**
     * Reset settings to defaults
     */
    public function reset_settings() {
        check_ajax_referer('vx_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_die(__('You do not have sufficient permissions.', 'vortex360-lite'));
        }
        
        update_option(self::OPTION_NAME, $this->get_default_settings());
        
        wp_send_json_success(array(
            'message' => __('Settings reset to defaults successfully.', 'vortex360-lite')
        ));
    }

    /**
     * Get setting value
     */
    public static function get_setting($key, $default = null) {
        $options = get_option(self::OPTION_NAME);
        
        if (isset($options[$key])) {
            return $options[$key];
        }
        
        // Return default from defaults array if no custom default provided
        if ($default === null) {
            $instance = new self();
            $defaults = $instance->get_default_settings();
            return isset($defaults[$key]) ? $defaults[$key] : null;
        }
        
        return $default;
    }
}