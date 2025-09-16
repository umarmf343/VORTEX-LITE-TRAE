<?php
/**
 * Admin dashboard class for Vortex360 Lite
 * Handles WordPress admin interface and tour management
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin class for handling WordPress admin interface
 */
class Vortex360_Lite_Admin {
    
    /**
     * Plugin version
     * @var string
     */
    private $version;
    
    /**
     * Constructor
     * @param string $version Plugin version
     */
    public function __construct($version) {
        $this->version = $version;
        
        // Admin hooks
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
        add_action('admin_init', array($this, 'admin_init'));
        
        // AJAX handlers for admin
        add_action('wp_ajax_vortex360_save_tour', array($this, 'ajax_save_tour'));
        add_action('wp_ajax_vortex360_delete_tour', array($this, 'ajax_delete_tour'));
        add_action('wp_ajax_vortex360_save_scene', array($this, 'ajax_save_scene'));
        add_action('wp_ajax_vortex360_delete_scene', array($this, 'ajax_delete_scene'));
        add_action('wp_ajax_vortex360_save_hotspot', array($this, 'ajax_save_hotspot'));
        add_action('wp_ajax_vortex360_delete_hotspot', array($this, 'ajax_delete_hotspot'));
        add_action('wp_ajax_vortex360_upload_image', array($this, 'ajax_upload_image'));
        
        // Add custom post type support (optional)
        add_action('init', array($this, 'register_post_types'));
    }
    
    /**
     * Add admin menu pages
     */
    public function add_admin_menu() {
        // Main menu page
        add_menu_page(
            'Vortex360 Lite',
            'Vortex360 Lite',
            'manage_options',
            'vortex360-lite',
            array($this, 'admin_page_tours'),
            'dashicons-camera',
            30
        );
        
        // Tours submenu (default)
        add_submenu_page(
            'vortex360-lite',
            'Tours',
            'Tours',
            'manage_options',
            'vortex360-lite',
            array($this, 'admin_page_tours')
        );
        
        // Add/Edit Tour submenu
        add_submenu_page(
            'vortex360-lite',
            'Add New Tour',
            'Add New Tour',
            'manage_options',
            'vortex360-lite-add-tour',
            array($this, 'admin_page_add_tour')
        );
        
        // Settings submenu
        add_submenu_page(
            'vortex360-lite',
            'Settings',
            'Settings',
            'manage_options',
            'vortex360-lite-settings',
            array($this, 'admin_page_settings')
        );
        
        // Help submenu
        add_submenu_page(
            'vortex360-lite',
            'Help & Support',
            'Help & Support',
            'manage_options',
            'vortex360-lite-help',
            array($this, 'admin_page_help')
        );
    }
    
    /**
     * Enqueue admin scripts and styles
     * @param string $hook Current admin page hook
     */
    public function enqueue_admin_scripts($hook) {
        // Only load on our admin pages
        if (strpos($hook, 'vortex360-lite') === false) {
            return;
        }
        
        // Admin CSS
        wp_enqueue_style(
            'vortex360-lite-admin',
            VORTEX360_LITE_PLUGIN_URL . 'admin/css/admin.css',
            array(),
            $this->version
        );
        
        // Admin JavaScript
        wp_enqueue_script(
            'vortex360-lite-admin',
            VORTEX360_LITE_PLUGIN_URL . 'admin/js/admin.js',
            array('jquery', 'wp-util'),
            $this->version,
            true
        );
        
        // Localize script for AJAX
        wp_localize_script('vortex360-lite-admin', 'vortex360Admin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vortex360_admin_nonce'),
            'strings' => array(
                'confirmDelete' => __('Are you sure you want to delete this item?', 'vortex360-lite'),
                'saving' => __('Saving...', 'vortex360-lite'),
                'saved' => __('Saved!', 'vortex360-lite'),
                'error' => __('Error occurred. Please try again.', 'vortex360-lite'),
                'liteLimit' => __('Lite version allows only 1 tour. Upgrade to Pro for unlimited tours.', 'vortex360-lite')
            )
        ));
        
        // WordPress media uploader
        wp_enqueue_media();
        
        // Color picker
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
    }
    
    /**
     * Admin initialization
     */
    public function admin_init() {
        // Register settings
        register_setting('vortex360_lite_settings', 'vortex360_lite_options');
        
        // Add settings sections
        add_settings_section(
            'vortex360_lite_general',
            __('General Settings', 'vortex360-lite'),
            array($this, 'settings_section_callback'),
            'vortex360_lite_settings'
        );
        
        // Add settings fields
        add_settings_field(
            'default_viewer_settings',
            __('Default Viewer Settings', 'vortex360-lite'),
            array($this, 'settings_field_viewer'),
            'vortex360_lite_settings',
            'vortex360_lite_general'
        );
    }
    
    /**
     * Tours admin page
     */
    public function admin_page_tours() {
        $tour_manager = new Vortex360_Lite_Tour();
        $tours = $tour_manager->get_all_tours();
        
        include VORTEX360_LITE_PLUGIN_PATH . 'admin/partials/tours-list.php';
    }
    
    /**
     * Add/Edit tour admin page
     */
    public function admin_page_add_tour() {
        $tour_id = absint($_GET['tour_id'] ?? 0);
        $tour = null;
        $scenes = array();
        
        if ($tour_id) {
            $tour_manager = new Vortex360_Lite_Tour();
            $tour = $tour_manager->get_tour_by_id($tour_id);
            
            if ($tour) {
                $scene_manager = new Vortex360_Lite_Scene();
                $scenes = $scene_manager->get_tour_scenes($tour_id, true);
            }
        }
        
        include VORTEX360_LITE_PLUGIN_PATH . 'admin/partials/tour-editor.php';
    }
    
    /**
     * Settings admin page
     */
    public function admin_page_settings() {
        include VORTEX360_LITE_PLUGIN_PATH . 'admin/partials/settings.php';
    }
    
    /**
     * Help admin page
     */
    public function admin_page_help() {
        include VORTEX360_LITE_PLUGIN_PATH . 'admin/partials/help.php';
    }
    
    /**
     * Settings section callback
     */
    public function settings_section_callback() {
        echo '<p>' . __('Configure default settings for your virtual tours.', 'vortex360-lite') . '</p>';
    }
    
    /**
     * Viewer settings field callback
     */
    public function settings_field_viewer() {
        $options = get_option('vortex360_lite_options', array());
        $defaults = array(
            'auto_load' => true,
            'auto_rotate' => false,
            'show_controls' => true,
            'show_fullscreen' => true,
            'mouse_zoom' => true,
            'touch_pan_speed' => 1,
            'mouse_pan_speed' => 1
        );
        
        $settings = wp_parse_args($options['viewer_settings'] ?? array(), $defaults);
        
        echo '<table class="form-table">';
        
        // Auto load
        echo '<tr>';
        echo '<th scope="row">' . __('Auto Load', 'vortex360-lite') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="vortex360_lite_options[viewer_settings][auto_load]" value="1" ' . checked($settings['auto_load'], true, false) . '> ' . __('Automatically load tours when page loads', 'vortex360-lite') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        // Auto rotate
        echo '<tr>';
        echo '<th scope="row">' . __('Auto Rotate', 'vortex360-lite') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="vortex360_lite_options[viewer_settings][auto_rotate]" value="1" ' . checked($settings['auto_rotate'], true, false) . '> ' . __('Enable automatic rotation', 'vortex360-lite') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        // Show controls
        echo '<tr>';
        echo '<th scope="row">' . __('Show Controls', 'vortex360-lite') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="vortex360_lite_options[viewer_settings][show_controls]" value="1" ' . checked($settings['show_controls'], true, false) . '> ' . __('Show viewer controls', 'vortex360-lite') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        // Show fullscreen
        echo '<tr>';
        echo '<th scope="row">' . __('Fullscreen Button', 'vortex360-lite') . '</th>';
        echo '<td>';
        echo '<label><input type="checkbox" name="vortex360_lite_options[viewer_settings][show_fullscreen]" value="1" ' . checked($settings['show_fullscreen'], true, false) . '> ' . __('Show fullscreen button', 'vortex360-lite') . '</label>';
        echo '</td>';
        echo '</tr>';
        
        echo '</table>';
    }
    
    /**
     * Register custom post types (optional)
     */
    public function register_post_types() {
        // This is optional - we're using custom tables instead
        // But keeping for potential future use
    }
    
    /**
     * AJAX handler for saving tour
     */
    public function ajax_save_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $tour_id = absint($_POST['tour_id'] ?? 0);
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $status = sanitize_text_field($_POST['status'] ?? 'draft');
        
        if (empty($title)) {
            wp_send_json_error('Tour title is required');
        }
        
        $tour_manager = new Vortex360_Lite_Tour();
        
        // Check Lite version limit for new tours
        if (!$tour_id) {
            $existing_tours = $tour_manager->get_all_tours();
            if (count($existing_tours) >= 1) {
                wp_send_json_error('Lite version allows only 1 tour. Upgrade to Pro for unlimited tours.');
            }
        }
        
        $tour_data = array(
            'title' => $title,
            'description' => $description,
            'status' => $status,
            'created_by' => get_current_user_id()
        );
        
        if ($tour_id) {
            $result = $tour_manager->update_tour($tour_id, $tour_data);
        } else {
            $result = $tour_manager->create_tour($tour_data);
            $tour_id = $result;
        }
        
        if ($result) {
            wp_send_json_success(array(
                'tour_id' => $tour_id,
                'message' => 'Tour saved successfully'
            ));
        } else {
            wp_send_json_error('Failed to save tour');
        }
    }
    
    /**
     * AJAX handler for deleting tour
     */
    public function ajax_delete_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $tour_id = absint($_POST['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }
        
        $tour_manager = new Vortex360_Lite_Tour();
        $result = $tour_manager->delete_tour($tour_id);
        
        if ($result) {
            wp_send_json_success('Tour deleted successfully');
        } else {
            wp_send_json_error('Failed to delete tour');
        }
    }
    
    /**
     * AJAX handler for saving scene
     */
    public function ajax_save_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        $tour_id = absint($_POST['tour_id'] ?? 0);
        $title = sanitize_text_field($_POST['title'] ?? '');
        $description = sanitize_textarea_field($_POST['description'] ?? '');
        $image_url = esc_url_raw($_POST['image_url'] ?? '');
        $image_type = sanitize_text_field($_POST['image_type'] ?? 'equirectangular');
        $pitch = floatval($_POST['pitch'] ?? 0);
        $yaw = floatval($_POST['yaw'] ?? 0);
        $hfov = floatval($_POST['hfov'] ?? 100);
        $is_default = (bool) ($_POST['is_default'] ?? false);
        $sort_order = absint($_POST['sort_order'] ?? 0);
        
        if (!$tour_id || empty($title) || empty($image_url)) {
            wp_send_json_error('Required fields missing');
        }
        
        $scene_manager = new Vortex360_Lite_Scene();
        
        $scene_data = array(
            'tour_id' => $tour_id,
            'title' => $title,
            'description' => $description,
            'image_url' => $image_url,
            'image_type' => $image_type,
            'pitch' => $pitch,
            'yaw' => $yaw,
            'hfov' => $hfov,
            'is_default' => $is_default,
            'sort_order' => $sort_order
        );
        
        if ($scene_id) {
            $result = $scene_manager->update_scene($scene_id, $scene_data);
        } else {
            $result = $scene_manager->create_scene($scene_data);
            $scene_id = $result;
        }
        
        if ($result) {
            wp_send_json_success(array(
                'scene_id' => $scene_id,
                'message' => 'Scene saved successfully'
            ));
        } else {
            wp_send_json_error('Failed to save scene');
        }
    }
    
    /**
     * AJAX handler for deleting scene
     */
    public function ajax_delete_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json_error('Invalid scene ID');
        }
        
        $scene_manager = new Vortex360_Lite_Scene();
        $result = $scene_manager->delete_scene($scene_id);
        
        if ($result) {
            wp_send_json_success('Scene deleted successfully');
        } else {
            wp_send_json_error('Failed to delete scene');
        }
    }
    
    /**
     * AJAX handler for saving hotspot
     */
    public function ajax_save_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $hotspot_id = absint($_POST['hotspot_id'] ?? 0);
        $scene_id = absint($_POST['scene_id'] ?? 0);
        $type = sanitize_text_field($_POST['type'] ?? 'info');
        $title = sanitize_text_field($_POST['title'] ?? '');
        $content = wp_kses_post($_POST['content'] ?? '');
        $target_scene_id = absint($_POST['target_scene_id'] ?? 0);
        $target_url = esc_url_raw($_POST['target_url'] ?? '');
        $pitch = floatval($_POST['pitch'] ?? 0);
        $yaw = floatval($_POST['yaw'] ?? 0);
        $scale = floatval($_POST['scale'] ?? 1);
        $sort_order = absint($_POST['sort_order'] ?? 0);
        
        if (!$scene_id || empty($title)) {
            wp_send_json_error('Required fields missing');
        }
        
        $hotspot_manager = new Vortex360_Lite_Hotspot();
        
        $hotspot_data = array(
            'scene_id' => $scene_id,
            'type' => $type,
            'title' => $title,
            'content' => $content,
            'target_scene_id' => $target_scene_id ?: null,
            'target_url' => $target_url ?: null,
            'pitch' => $pitch,
            'yaw' => $yaw,
            'scale' => $scale,
            'sort_order' => $sort_order
        );
        
        if ($hotspot_id) {
            $result = $hotspot_manager->update_hotspot($hotspot_id, $hotspot_data);
        } else {
            $result = $hotspot_manager->create_hotspot($hotspot_data);
            $hotspot_id = $result;
        }
        
        if ($result) {
            wp_send_json_success(array(
                'hotspot_id' => $hotspot_id,
                'message' => 'Hotspot saved successfully'
            ));
        } else {
            wp_send_json_error('Failed to save hotspot');
        }
    }
    
    /**
     * AJAX handler for deleting hotspot
     */
    public function ajax_delete_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        $hotspot_id = absint($_POST['hotspot_id'] ?? 0);
        if (!$hotspot_id) {
            wp_send_json_error('Invalid hotspot ID');
        }
        
        $hotspot_manager = new Vortex360_Lite_Hotspot();
        $result = $hotspot_manager->delete_hotspot($hotspot_id);
        
        if ($result) {
            wp_send_json_success('Hotspot deleted successfully');
        } else {
            wp_send_json_error('Failed to delete hotspot');
        }
    }
    
    /**
     * AJAX handler for image upload
     */
    public function ajax_upload_image() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_admin_nonce')) {
            wp_send_json_error('Security check failed');
        }
        
        // Check permissions
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Insufficient permissions');
        }
        
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        
        $uploadedfile = $_FILES['file'] ?? null;
        if (!$uploadedfile) {
            wp_send_json_error('No file uploaded');
        }
        
        // Check file type
        $allowed_types = array('image/jpeg', 'image/jpg', 'image/png');
        if (!in_array($uploadedfile['type'], $allowed_types)) {
            wp_send_json_error('Invalid file type. Only JPG and PNG files are allowed.');
        }
        
        $upload_overrides = array('test_form' => false);
        $movefile = wp_handle_upload($uploadedfile, $upload_overrides);
        
        if ($movefile && !isset($movefile['error'])) {
            wp_send_json_success(array(
                'url' => $movefile['url'],
                'file' => $movefile['file'],
                'message' => 'Image uploaded successfully'
            ));
        } else {
            wp_send_json_error($movefile['error'] ?? 'Upload failed');
        }
    }
}