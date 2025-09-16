<?php
/**
 * Vortex360 Lite - Admin Class
 * 
 * Main admin class that handles menus, assets, notices,
 * and coordinates all admin functionality.
 *
 * @package    Vortex360_Lite
 * @subpackage Admin
 * @since      1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Main Admin Class
 */
class VX_Admin {

    /**
     * The version of this plugin.
     */
    private $version;

    /**
     * Initialize the class and set its properties.
     */
    public function __construct($version) {
        $this->version = $version;
        $this->load_dependencies();
        $this->init_hooks();
    }

    /**
     * Load admin dependencies
     */
    private function load_dependencies() {
        // Load admin classes
        require_once plugin_dir_path(__FILE__) . 'class-vx-admin-metabox.php';
        require_once plugin_dir_path(__FILE__) . 'class-vx-admin-ajax.php';
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // Admin menu and pages
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'admin_init'));
        
        // Assets
        add_action('admin_enqueue_scripts', array($this, 'enqueue_styles'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
        
        // Admin notices
        add_action('admin_notices', array($this, 'admin_notices'));
        
        // Post list customizations
        add_filter('manage_vortex_tour_posts_columns', array($this, 'add_custom_columns'));
        add_action('manage_vortex_tour_posts_custom_column', array($this, 'custom_column_content'), 10, 2);
        add_filter('manage_edit-vortex_tour_sortable_columns', array($this, 'sortable_columns'));
        
        // Post row actions
        add_filter('post_row_actions', array($this, 'add_row_actions'), 10, 2);
        
        // Admin footer
        add_filter('admin_footer_text', array($this, 'admin_footer_text'));
        
        // Plugin action links
        add_filter('plugin_action_links_' . VX_PLUGIN_BASENAME, array($this, 'plugin_action_links'));
    }

    /**
     * Add admin menu items
     */
    public function add_admin_menu() {
        // Main menu page
        add_menu_page(
            __('Vortex360 Tours', 'vortex360-lite'),
            __('Vortex360', 'vortex360-lite'),
            'manage_vortex_tours',
            'vortex360-tours',
            array($this, 'tours_page'),
            'dashicons-format-gallery',
            30
        );
        
        // All Tours submenu (redirect to post type)
        add_submenu_page(
            'vortex360-tours',
            __('All Tours', 'vortex360-lite'),
            __('All Tours', 'vortex360-lite'),
            'manage_vortex_tours',
            'edit.php?post_type=vortex_tour'
        );
        
        // Add New submenu (redirect to post type)
        add_submenu_page(
            'vortex360-tours',
            __('Add New Tour', 'vortex360-lite'),
            __('Add New', 'vortex360-lite'),
            'edit_vortex_tours',
            'post-new.php?post_type=vortex_tour'
        );
        
        // Settings submenu
        add_submenu_page(
            'vortex360-tours',
            __('Settings', 'vortex360-lite'),
            __('Settings', 'vortex360-lite'),
            'manage_options',
            'vortex360-settings',
            array($this, 'settings_page')
        );
        
        // Upgrade submenu (Lite version)
        add_submenu_page(
            'vortex360-tours',
            __('Upgrade to Pro', 'vortex360-lite'),
            '<span style="color: #f18500;">' . __('Upgrade to Pro', 'vortex360-lite') . '</span>',
            'manage_vortex_tours',
            'vortex360-upgrade',
            array($this, 'upgrade_page')
        );
    }

    /**
     * Initialize admin settings
     */
    public function admin_init() {
        // Register settings
        register_setting('vortex360_settings', 'vortex360_settings', array(
            'sanitize_callback' => array($this, 'sanitize_settings')
        ));
        
        // Add settings sections
        add_settings_section(
            'vortex360_general',
            __('General Settings', 'vortex360-lite'),
            array($this, 'general_section_callback'),
            'vortex360_settings'
        );
        
        add_settings_section(
            'vortex360_performance',
            __('Performance Settings', 'vortex360-lite'),
            array($this, 'performance_section_callback'),
            'vortex360_settings'
        );
        
        // Add settings fields
        $this->add_settings_fields();
    }

    /**
     * Add settings fields
     */
    private function add_settings_fields() {
        // General settings
        add_settings_field(
            'default_autorotate',
            __('Default Autorotate', 'vortex360-lite'),
            array($this, 'checkbox_field_callback'),
            'vortex360_settings',
            'vortex360_general',
            array(
                'field' => 'default_autorotate',
                'description' => __('Enable autorotate by default for new tours', 'vortex360-lite')
            )
        );
        
        add_settings_field(
            'default_controls',
            __('Default Controls', 'vortex360-lite'),
            array($this, 'checkboxes_field_callback'),
            'vortex360_settings',
            'vortex360_general',
            array(
                'field' => 'default_controls',
                'options' => array(
                    'zoom' => __('Zoom Controls', 'vortex360-lite'),
                    'fullscreen' => __('Fullscreen Button', 'vortex360-lite'),
                    'thumbnails' => __('Scene Thumbnails', 'vortex360-lite')
                ),
                'description' => __('Default UI controls for new tours', 'vortex360-lite')
            )
        );
        
        // Performance settings
        add_settings_field(
            'lazy_loading',
            __('Lazy Loading', 'vortex360-lite'),
            array($this, 'checkbox_field_callback'),
            'vortex360_settings',
            'vortex360_performance',
            array(
                'field' => 'lazy_loading',
                'description' => __('Load panorama images only when tour becomes visible', 'vortex360-lite')
            )
        );
        
        add_settings_field(
            'image_quality',
            __('Image Quality', 'vortex360-lite'),
            array($this, 'select_field_callback'),
            'vortex360_settings',
            'vortex360_performance',
            array(
                'field' => 'image_quality',
                'options' => array(
                    'high' => __('High Quality', 'vortex360-lite'),
                    'medium' => __('Medium Quality', 'vortex360-lite'),
                    'low' => __('Low Quality (Faster Loading)', 'vortex360-lite')
                ),
                'description' => __('Default image quality for panoramas', 'vortex360-lite')
            )
        );
    }

    /**
     * Enqueue admin styles
     */
    public function enqueue_styles($hook) {
        // Global admin styles
        if ($this->is_vortex_admin_page($hook)) {
            wp_enqueue_style(
                'vortex360-admin',
                plugin_dir_url(__FILE__) . 'css/vx-admin.css',
                array(),
                $this->version,
                'all'
            );
        }
        
        // Metabox styles (tour edit page)
        if ($hook === 'post.php' || $hook === 'post-new.php') {
            global $post_type;
            if ($post_type === 'vortex_tour') {
                wp_enqueue_style(
                    'vortex360-admin-metabox',
                    plugin_dir_url(__FILE__) . 'css/vx-admin-metabox.css',
                    array('wp-color-picker'),
                    $this->version,
                    'all'
                );
            }
        }
    }

    /**
     * Enqueue admin scripts
     */
    public function enqueue_scripts($hook) {
        // Global admin scripts
        if ($this->is_vortex_admin_page($hook)) {
            wp_enqueue_script(
                'vortex360-admin',
                plugin_dir_url(__FILE__) . 'js/vx-admin.js',
                array('jquery'),
                $this->version,
                false
            );
            
            // Localize script
            wp_localize_script('vortex360-admin', 'vxAdmin', array(
                'ajaxUrl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('vx_admin_nonce'),
                'strings' => array(
                    'confirmDelete' => __('Are you sure you want to delete this tour?', 'vortex360-lite'),
                    'confirmDuplicate' => __('This will create a copy of the tour. Continue?', 'vortex360-lite'),
                    'saving' => __('Saving...', 'vortex360-lite'),
                    'saved' => __('Saved!', 'vortex360-lite'),
                    'error' => __('An error occurred. Please try again.', 'vortex360-lite')
                )
            ));
        }
        
        // Metabox scripts (tour edit page)
        if ($hook === 'post.php' || $hook === 'post-new.php') {
            global $post_type, $post;
            if ($post_type === 'vortex_tour') {
                wp_enqueue_media();
                wp_enqueue_script('wp-color-picker');
                wp_enqueue_script('jquery-ui-sortable');
                
                wp_enqueue_script(
                    'vortex360-admin-metabox',
                    plugin_dir_url(__FILE__) . 'js/vx-admin-metabox.js',
                    array('jquery', 'wp-color-picker', 'jquery-ui-sortable'),
                    $this->version,
                    false
                );
                
                // Get existing tour data
                $tour_data = '';
                if ($post && $post->ID) {
                    $tour_data = get_post_meta($post->ID, '_vx_tour_data', true);
                }
                
                // Localize metabox script
                wp_localize_script('vortex360-admin-metabox', 'vxAdminData', array(
                    'ajaxUrl' => admin_url('admin-ajax.php'),
                    'nonce' => wp_create_nonce('vx_admin_nonce'),
                    'tourId' => $post ? $post->ID : 0,
                    'tourData' => $tour_data,
                    'limits' => VX_Limits_Lite::get_limits(),
                    'previewUrl' => add_query_arg(array(
                        'vx_preview' => '1',
                        'tour_id' => $post ? $post->ID : 0
                    ), home_url()),
                    'strings' => array(
                        'confirmRemoveScene' => __('Are you sure you want to remove this scene?', 'vortex360-lite'),
                        'confirmRemoveHotspot' => __('Are you sure you want to remove this hotspot?', 'vortex360-lite'),
                        'maxScenesReached' => __('Maximum number of scenes reached for Lite version.', 'vortex360-lite'),
                        'maxHotspotsReached' => __('Maximum number of hotspots reached for this scene.', 'vortex360-lite'),
                        'upgradePrompt' => __('Upgrade to Pro for unlimited scenes and hotspots.', 'vortex360-lite')
                    )
                ));
            }
        }
    }

    /**
     * Display admin notices
     */
    public function admin_notices() {
        // Welcome notice for new installations
        if (get_transient('vx_activation_notice')) {
            echo '<div class="notice notice-success is-dismissible">';
            echo '<p><strong>' . __('Vortex360 Lite activated!', 'vortex360-lite') . '</strong> ';
            echo sprintf(
                __('Get started by <a href="%s">creating your first 360° tour</a>.', 'vortex360-lite'),
                admin_url('post-new.php?post_type=vortex_tour')
            );
            echo '</p></div>';
            delete_transient('vx_activation_notice');
        }
        
        // Upgrade notices (contextual)
        $this->show_upgrade_notices();
    }

    /**
     * Show contextual upgrade notices
     */
    private function show_upgrade_notices() {
        $screen = get_current_screen();
        
        // Only show on Vortex360 pages
        if (!$this->is_vortex_admin_page()) {
            return;
        }
        
        // Don't show if user dismissed
        if (get_user_meta(get_current_user_id(), 'vx_dismiss_upgrade_notice', true)) {
            return;
        }
        
        // Show different notices based on context
        if ($screen->id === 'vortex_tour') {
            $this->show_editor_upgrade_notice();
        } elseif (strpos($screen->id, 'vortex360') !== false) {
            $this->show_general_upgrade_notice();
        }
    }

    /**
     * Show upgrade notice in tour editor
     */
    private function show_editor_upgrade_notice() {
        echo '<div class="notice notice-info vx-upgrade-notice">';
        echo '<div class="vx-upgrade-content">';
        echo '<h3>' . __('Unlock More Features with Vortex360 Pro', 'vortex360-lite') . '</h3>';
        echo '<ul>';
        echo '<li>✓ ' . __('Unlimited scenes and hotspots', 'vortex360-lite') . '</li>';
        echo '<li>✓ ' . __('Advanced hotspot types (video, audio, 3D models)', 'vortex360-lite') . '</li>';
        echo '<li>✓ ' . __('Floor plans and mini-maps', 'vortex360-lite') . '</li>';
        echo '<li>✓ ' . __('Analytics and heatmaps', 'vortex360-lite') . '</li>';
        echo '<li>✓ ' . __('White-label branding', 'vortex360-lite') . '</li>';
        echo '</ul>';
        echo '<p><a href="#" class="button button-primary vx-upgrade-btn">' . __('Upgrade Now', 'vortex360-lite') . '</a> ';
        echo '<a href="#" class="vx-dismiss-notice">' . __('Maybe later', 'vortex360-lite') . '</a></p>';
        echo '</div></div>';
    }

    /**
     * Show general upgrade notice
     */
    private function show_general_upgrade_notice() {
        echo '<div class="notice notice-info vx-upgrade-notice">';
        echo '<p><strong>' . __('Vortex360 Pro', 'vortex360-lite') . '</strong> - ';
        echo __('Unlock unlimited tours, advanced hotspots, analytics, and more!', 'vortex360-lite');
        echo ' <a href="#" class="button button-small button-primary">' . __('Learn More', 'vortex360-lite') . '</a>';
        echo ' <a href="#" class="vx-dismiss-notice">' . __('Dismiss', 'vortex360-lite') . '</a></p>';
        echo '</div>';
    }

    /**
     * Add custom columns to tours list
     */
    public function add_custom_columns($columns) {
        $new_columns = array();
        
        foreach ($columns as $key => $title) {
            $new_columns[$key] = $title;
            
            // Add custom columns after title
            if ($key === 'title') {
                $new_columns['vx_preview'] = __('Preview', 'vortex360-lite');
                $new_columns['vx_scenes'] = __('Scenes', 'vortex360-lite');
                $new_columns['vx_shortcode'] = __('Shortcode', 'vortex360-lite');
                $new_columns['vx_views'] = __('Views', 'vortex360-lite');
            }
        }
        
        return $new_columns;
    }

    /**
     * Display custom column content
     */
    public function custom_column_content($column, $post_id) {
        switch ($column) {
            case 'vx_preview':
                $tour_data = get_post_meta($post_id, '_vx_tour_data', true);
                if ($tour_data) {
                    $tour_data = json_decode($tour_data, true);
                    if (!empty($tour_data['scenes'][0]['previewImage']['url'])) {
                        echo '<img src="' . esc_url($tour_data['scenes'][0]['previewImage']['url']) . '" style="width: 60px; height: 40px; object-fit: cover; border-radius: 3px;">';
                    } else {
                        echo '<div style="width: 60px; height: 40px; background: #f0f0f0; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">No preview</div>';
                    }
                } else {
                    echo '—';
                }
                break;
                
            case 'vx_scenes':
                $tour_data = get_post_meta($post_id, '_vx_tour_data', true);
                if ($tour_data) {
                    $tour_data = json_decode($tour_data, true);
                    $scene_count = isset($tour_data['scenes']) ? count($tour_data['scenes']) : 0;
                    echo '<span class="vx-scene-count">' . $scene_count . '</span>';
                    if ($scene_count >= 5) {
                        echo ' <span class="vx-limit-badge">MAX</span>';
                    }
                } else {
                    echo '0';
                }
                break;
                
            case 'vx_shortcode':
                echo '<code class="vx-shortcode-copy" data-shortcode="[vortex360 id=&quot;' . $post_id . '&quot;]">[vortex360 id="' . $post_id . '"]</code>';
                break;
                
            case 'vx_views':
                $views = get_post_meta($post_id, '_vx_tour_views', true);
                echo intval($views);
                break;
        }
    }

    /**
     * Make custom columns sortable
     */
    public function sortable_columns($columns) {
        $columns['vx_scenes'] = 'vx_scenes';
        $columns['vx_views'] = 'vx_views';
        return $columns;
    }

    /**
     * Add custom row actions
     */
    public function add_row_actions($actions, $post) {
        if ($post->post_type === 'vortex_tour') {
            // Preview action
            $preview_url = add_query_arg(array(
                'vx_preview' => '1',
                'tour_id' => $post->ID
            ), home_url());
            
            $actions['vx_preview'] = sprintf(
                '<a href="%s" target="_blank">%s</a>',
                esc_url($preview_url),
                __('Preview', 'vortex360-lite')
            );
            
            // Duplicate action
            $actions['vx_duplicate'] = sprintf(
                '<a href="#" class="vx-duplicate-tour" data-tour-id="%d">%s</a>',
                $post->ID,
                __('Duplicate', 'vortex360-lite')
            );
        }
        
        return $actions;
    }

    /**
     * Tours page content
     */
    public function tours_page() {
        // Redirect to post type list
        wp_redirect(admin_url('edit.php?post_type=vortex_tour'));
        exit;
    }

    /**
     * Settings page content
     */
    public function settings_page() {
        include plugin_dir_path(__FILE__) . 'views/page-settings.php';
    }

    /**
     * Upgrade page content
     */
    public function upgrade_page() {
        include plugin_dir_path(__FILE__) . 'views/page-upgrade.php';
    }

    /**
     * Settings section callbacks
     */
    public function general_section_callback() {
        echo '<p>' . __('Configure default settings for new tours.', 'vortex360-lite') . '</p>';
    }

    public function performance_section_callback() {
        echo '<p>' . __('Optimize performance and loading behavior.', 'vortex360-lite') . '</p>';
    }

    /**
     * Field callbacks
     */
    public function checkbox_field_callback($args) {
        $options = get_option('vortex360_settings', array());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : false;
        
        echo '<input type="checkbox" id="' . $args['field'] . '" name="vortex360_settings[' . $args['field'] . ']" value="1" ' . checked(1, $value, false) . '>';
        if (isset($args['description'])) {
            echo '<p class="description">' . $args['description'] . '</p>';
        }
    }

    public function checkboxes_field_callback($args) {
        $options = get_option('vortex360_settings', array());
        $values = isset($options[$args['field']]) ? $options[$args['field']] : array();
        
        foreach ($args['options'] as $key => $label) {
            $checked = in_array($key, $values);
            echo '<label><input type="checkbox" name="vortex360_settings[' . $args['field'] . '][]" value="' . $key . '" ' . checked(true, $checked, false) . '> ' . $label . '</label><br>';
        }
        
        if (isset($args['description'])) {
            echo '<p class="description">' . $args['description'] . '</p>';
        }
    }

    public function select_field_callback($args) {
        $options = get_option('vortex360_settings', array());
        $value = isset($options[$args['field']]) ? $options[$args['field']] : '';
        
        echo '<select id="' . $args['field'] . '" name="vortex360_settings[' . $args['field'] . ']">';
        foreach ($args['options'] as $key => $label) {
            echo '<option value="' . $key . '" ' . selected($key, $value, false) . '>' . $label . '</option>';
        }
        echo '</select>';
        
        if (isset($args['description'])) {
            echo '<p class="description">' . $args['description'] . '</p>';
        }
    }

    /**
     * Sanitize settings
     */
    public function sanitize_settings($input) {
        $sanitized = array();
        
        // Boolean fields
        $boolean_fields = array('default_autorotate', 'lazy_loading');
        foreach ($boolean_fields as $field) {
            $sanitized[$field] = isset($input[$field]) ? true : false;
        }
        
        // Array fields
        if (isset($input['default_controls']) && is_array($input['default_controls'])) {
            $allowed_controls = array('zoom', 'fullscreen', 'thumbnails');
            $sanitized['default_controls'] = array_intersect($input['default_controls'], $allowed_controls);
        }
        
        // Select fields
        if (isset($input['image_quality'])) {
            $allowed_qualities = array('high', 'medium', 'low');
            $sanitized['image_quality'] = in_array($input['image_quality'], $allowed_qualities) ? $input['image_quality'] : 'medium';
        }
        
        return $sanitized;
    }

    /**
     * Custom admin footer text
     */
    public function admin_footer_text($text) {
        if ($this->is_vortex_admin_page()) {
            return sprintf(
                __('Thank you for using <strong>Vortex360 Lite</strong>! <a href="%s" target="_blank">Upgrade to Pro</a> for more features.', 'vortex360-lite'),
                '#'
            );
        }
        return $text;
    }

    /**
     * Add plugin action links
     */
    public function plugin_action_links($links) {
        $settings_link = '<a href="' . admin_url('admin.php?page=vortex360-settings') . '">' . __('Settings', 'vortex360-lite') . '</a>';
        $upgrade_link = '<a href="#" style="color: #f18500; font-weight: bold;">' . __('Upgrade to Pro', 'vortex360-lite') . '</a>';
        
        array_unshift($links, $settings_link);
        array_push($links, $upgrade_link);
        
        return $links;
    }

    /**
     * Check if current page is a Vortex360 admin page
     */
    private function is_vortex_admin_page($hook = null) {
        if (!$hook) {
            $screen = get_current_screen();
            $hook = $screen ? $screen->id : '';
        }
        
        $vortex_pages = array(
            'toplevel_page_vortex360-tours',
            'vortex360_page_vortex360-settings',
            'vortex360_page_vortex360-upgrade',
            'edit-vortex_tour',
            'vortex_tour'
        );
        
        return in_array($hook, $vortex_pages) || 
               (isset($_GET['post_type']) && $_GET['post_type'] === 'vortex_tour');
    }
}