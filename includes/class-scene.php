<?php
/**
 * Scene management class for Vortex360 Lite
 * Handles 360° scene CRUD operations and tour integration
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Scene class for managing 360° scenes
 */
class Vortex360_Lite_Scene {
    
    /**
     * Database instance
     * @var Vortex360_Lite_Database
     */
    private $database;
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->database = new Vortex360_Lite_Database();
        
        // Hook into WordPress AJAX actions
        add_action('wp_ajax_vortex360_create_scene', array($this, 'ajax_create_scene'));
        add_action('wp_ajax_vortex360_update_scene', array($this, 'ajax_update_scene'));
        add_action('wp_ajax_vortex360_delete_scene', array($this, 'ajax_delete_scene'));
        add_action('wp_ajax_vortex360_get_scene', array($this, 'ajax_get_scene'));
        add_action('wp_ajax_vortex360_get_tour_scenes', array($this, 'ajax_get_tour_scenes'));
        add_action('wp_ajax_vortex360_set_default_scene', array($this, 'ajax_set_default_scene'));
        add_action('wp_ajax_vortex360_reorder_scenes', array($this, 'ajax_reorder_scenes'));
        
        // Handle image uploads
        add_action('wp_ajax_vortex360_upload_scene_image', array($this, 'ajax_upload_scene_image'));
    }
    
    /**
     * Create a new scene
     * @param array $data Scene data
     * @return array Result with success status and data/error
     */
    public function create_scene($data) {
        global $wpdb;
        
        // Validate required fields
        if (empty($data['tour_id']) || empty($data['title']) || empty($data['image_url'])) {
            return array(
                'success' => false,
                'error' => 'Tour ID, title, and image URL are required.',
                'code' => 'MISSING_REQUIRED_FIELDS'
            );
        }
        
        // Check if tour exists and user has permission
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($data['tour_id']);
        
        if (!$tour) {
            return array(
                'success' => false,
                'error' => 'Tour not found.',
                'code' => 'TOUR_NOT_FOUND'
            );
        }
        
        if ($tour->created_by != get_current_user_id() && !current_user_can('manage_options')) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Sanitize data
        $sanitized_data = $this->database->sanitize_scene_data($data);
        
        // Set sort order if not provided
        if (!isset($sanitized_data['sort_order'])) {
            $sanitized_data['sort_order'] = $this->get_next_sort_order($data['tour_id']);
        }
        
        // If this is the first scene, make it default
        if ($this->get_scene_count($data['tour_id']) === 0) {
            $sanitized_data['is_default'] = true;
        }
        
        // Insert into database
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $result = $wpdb->insert(
            $table_name,
            $sanitized_data,
            array('%d', '%s', '%s', '%s', '%s', '%d', '%d', '%f', '%f', '%f', '%f', '%f', '%s')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to create scene: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        $scene_id = $wpdb->insert_id;
        
        return array(
            'success' => true,
            'data' => array(
                'id' => $scene_id,
                'message' => 'Scene created successfully'
            )
        );
    }
    
    /**
     * Update an existing scene
     * @param int $scene_id Scene ID
     * @param array $data Updated scene data
     * @return array Result with success status and data/error
     */
    public function update_scene($scene_id, $data) {
        global $wpdb;
        
        // Check if scene exists and user has permission
        $scene = $this->get_scene_by_id($scene_id);
        if (!$scene) {
            return array(
                'success' => false,
                'error' => 'Scene not found.',
                'code' => 'SCENE_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_scene($scene)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Sanitize data
        $sanitized_data = $this->database->sanitize_scene_data($data);
        
        // Remove tour_id from update data (shouldn't be changed)
        unset($sanitized_data['tour_id']);
        
        // Update database
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $result = $wpdb->update(
            $table_name,
            $sanitized_data,
            array('id' => $scene_id),
            array('%s', '%s', '%s', '%s', '%d', '%d', '%f', '%f', '%f', '%f', '%f', '%s'),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to update scene: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Scene updated successfully'
            )
        );
    }
    
    /**
     * Delete a scene and all associated hotspots
     * @param int $scene_id Scene ID
     * @return array Result with success status and data/error
     */
    public function delete_scene($scene_id) {
        global $wpdb;
        
        // Check if scene exists and user has permission
        $scene = $this->get_scene_by_id($scene_id);
        if (!$scene) {
            return array(
                'success' => false,
                'error' => 'Scene not found.',
                'code' => 'SCENE_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_scene($scene)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Check if this is the only scene in the tour
        $scene_count = $this->get_scene_count($scene->tour_id);
        if ($scene_count <= 1) {
            return array(
                'success' => false,
                'error' => 'Cannot delete the only scene in a tour.',
                'code' => 'LAST_SCENE'
            );
        }
        
        // If this is the default scene, set another scene as default
        if ($scene->is_default) {
            $this->set_new_default_scene($scene->tour_id, $scene_id);
        }
        
        // Delete scene (cascading will handle hotspots)
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $result = $wpdb->delete(
            $table_name,
            array('id' => $scene_id),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to delete scene: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Scene deleted successfully'
            )
        );
    }
    
    /**
     * Get scene by ID
     * @param int $scene_id Scene ID
     * @return object|null Scene object or null if not found
     */
    public function get_scene_by_id($scene_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $scene = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE id = %d",
            $scene_id
        ));
        
        if ($scene && !empty($scene->settings)) {
            $scene->settings = json_decode($scene->settings, true);
        }
        
        return $scene;
    }
    
    /**
     * Get all scenes for a tour
     * @param int $tour_id Tour ID
     * @param bool $include_hotspots Whether to include hotspots
     * @return array Array of scene objects
     */
    public function get_tour_scenes($tour_id, $include_hotspots = true) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $scenes = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE tour_id = %d ORDER BY sort_order ASC, id ASC",
            $tour_id
        ));
        
        // Decode settings and add hotspots if requested
        foreach ($scenes as $scene) {
            if (!empty($scene->settings)) {
                $scene->settings = json_decode($scene->settings, true);
            }
            
            if ($include_hotspots) {
                $hotspot_manager = new Vortex360_Lite_Hotspot();
                $scene->hotspots = $hotspot_manager->get_scene_hotspots($scene->id);
            }
        }
        
        return $scenes;
    }
    
    /**
     * Set a scene as the default scene for a tour
     * @param int $scene_id Scene ID
     * @return array Result with success status and data/error
     */
    public function set_default_scene($scene_id) {
        global $wpdb;
        
        // Check if scene exists and user has permission
        $scene = $this->get_scene_by_id($scene_id);
        if (!$scene) {
            return array(
                'success' => false,
                'error' => 'Scene not found.',
                'code' => 'SCENE_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_scene($scene)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        // Remove default from all scenes in the tour
        $wpdb->update(
            $table_name,
            array('is_default' => 0),
            array('tour_id' => $scene->tour_id),
            array('%d'),
            array('%d')
        );
        
        // Set this scene as default
        $result = $wpdb->update(
            $table_name,
            array('is_default' => 1),
            array('id' => $scene_id),
            array('%d'),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to set default scene: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Default scene updated successfully'
            )
        );
    }
    
    /**
     * Reorder scenes in a tour
     * @param int $tour_id Tour ID
     * @param array $scene_order Array of scene IDs in new order
     * @return array Result with success status and data/error
     */
    public function reorder_scenes($tour_id, $scene_order) {
        global $wpdb;
        
        // Check if tour exists and user has permission
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($tour_id);
        
        if (!$tour) {
            return array(
                'success' => false,
                'error' => 'Tour not found.',
                'code' => 'TOUR_NOT_FOUND'
            );
        }
        
        if ($tour->created_by != get_current_user_id() && !current_user_can('manage_options')) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        // Update sort order for each scene
        foreach ($scene_order as $index => $scene_id) {
            $wpdb->update(
                $table_name,
                array('sort_order' => $index + 1),
                array('id' => absint($scene_id), 'tour_id' => $tour_id),
                array('%d'),
                array('%d', '%d')
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Scenes reordered successfully'
            )
        );
    }
    
    /**
     * Upload and process scene image
     * @param array $file Uploaded file data
     * @return array Result with success status and data/error
     */
    public function upload_scene_image($file) {
        // Check file type
        $allowed_types = array('image/jpeg', 'image/jpg', 'image/png');
        if (!in_array($file['type'], $allowed_types)) {
            return array(
                'success' => false,
                'error' => 'Invalid file type. Only JPEG and PNG images are allowed.',
                'code' => 'INVALID_FILE_TYPE'
            );
        }
        
        // Check file size (max 10MB)
        $max_size = 10 * 1024 * 1024; // 10MB
        if ($file['size'] > $max_size) {
            return array(
                'success' => false,
                'error' => 'File too large. Maximum size is 10MB.',
                'code' => 'FILE_TOO_LARGE'
            );
        }
        
        // Handle WordPress upload
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        
        $upload_overrides = array(
            'test_form' => false,
            'unique_filename_callback' => array($this, 'generate_unique_filename')
        );
        
        $uploaded_file = wp_handle_upload($file, $upload_overrides);
        
        if (isset($uploaded_file['error'])) {
            return array(
                'success' => false,
                'error' => $uploaded_file['error'],
                'code' => 'UPLOAD_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'url' => $uploaded_file['url'],
                'file' => $uploaded_file['file'],
                'message' => 'Image uploaded successfully'
            )
        );
    }
    
    /**
     * Generate unique filename for uploaded images
     * @param string $dir Upload directory
     * @param string $name Original filename
     * @param string $ext File extension
     * @return string Unique filename
     */
    public function generate_unique_filename($dir, $name, $ext) {
        $prefix = 'vortex360-scene-' . time() . '-' . wp_generate_password(8, false);
        return $prefix . $ext;
    }
    
    /**
     * Get scene count for a tour
     * @param int $tour_id Tour ID
     * @return int Scene count
     */
    private function get_scene_count($tour_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        return (int) $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE tour_id = %d",
            $tour_id
        ));
    }
    
    /**
     * Get next sort order for a tour
     * @param int $tour_id Tour ID
     * @return int Next sort order
     */
    private function get_next_sort_order($tour_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        $max_order = $wpdb->get_var($wpdb->prepare(
            "SELECT MAX(sort_order) FROM $table_name WHERE tour_id = %d",
            $tour_id
        ));
        
        return ($max_order ?? 0) + 1;
    }
    
    /**
     * Set a new default scene when the current default is deleted
     * @param int $tour_id Tour ID
     * @param int $exclude_scene_id Scene ID to exclude
     */
    private function set_new_default_scene($tour_id, $exclude_scene_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_scenes';
        
        // Get the first scene that's not being deleted
        $new_default = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $table_name WHERE tour_id = %d AND id != %d ORDER BY sort_order ASC LIMIT 1",
            $tour_id,
            $exclude_scene_id
        ));
        
        if ($new_default) {
            $wpdb->update(
                $table_name,
                array('is_default' => 1),
                array('id' => $new_default),
                array('%d'),
                array('%d')
            );
        }
    }
    
    /**
     * Check if current user can edit scene
     * @param object $scene Scene object
     * @return bool True if user can edit
     */
    private function user_can_edit_scene($scene) {
        // Get tour to check ownership
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($scene->tour_id);
        
        if (!$tour) {
            return false;
        }
        
        $current_user_id = get_current_user_id();
        
        // Tour owner can edit scenes
        if ($tour->created_by == $current_user_id) {
            return true;
        }
        
        // Administrators can edit any scene
        if (current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for creating scene
     */
    public function ajax_create_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $data = array(
            'tour_id' => absint($_POST['tour_id'] ?? 0),
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'description' => sanitize_textarea_field($_POST['description'] ?? ''),
            'image_url' => esc_url_raw($_POST['image_url'] ?? ''),
            'image_type' => sanitize_text_field($_POST['image_type'] ?? 'equirectangular'),
            'pitch' => floatval($_POST['pitch'] ?? 0),
            'yaw' => floatval($_POST['yaw'] ?? 0),
            'hfov' => floatval($_POST['hfov'] ?? 100)
        );
        
        $result = $this->create_scene($data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for updating scene
     */
    public function ajax_update_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid scene ID'));
        }
        
        $data = array(
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'description' => sanitize_textarea_field($_POST['description'] ?? ''),
            'image_url' => esc_url_raw($_POST['image_url'] ?? ''),
            'image_type' => sanitize_text_field($_POST['image_type'] ?? 'equirectangular'),
            'pitch' => floatval($_POST['pitch'] ?? 0),
            'yaw' => floatval($_POST['yaw'] ?? 0),
            'hfov' => floatval($_POST['hfov'] ?? 100)
        );
        
        $result = $this->update_scene($scene_id, $data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for deleting scene
     */
    public function ajax_delete_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid scene ID'));
        }
        
        $result = $this->delete_scene($scene_id);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for getting single scene
     */
    public function ajax_get_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_GET['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid scene ID'));
        }
        
        $scene = $this->get_scene_by_id($scene_id);
        
        if (!$scene || !$this->user_can_edit_scene($scene)) {
            wp_send_json(array('success' => false, 'error' => 'Scene not found or permission denied'));
        }
        
        wp_send_json(array('success' => true, 'data' => $scene));
    }
    
    /**
     * AJAX handler for getting tour scenes
     */
    public function ajax_get_tour_scenes() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_GET['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid tour ID'));
        }
        
        $include_hotspots = (bool) ($_GET['include_hotspots'] ?? true);
        $scenes = $this->get_tour_scenes($tour_id, $include_hotspots);
        
        wp_send_json(array('success' => true, 'data' => $scenes));
    }
    
    /**
     * AJAX handler for setting default scene
     */
    public function ajax_set_default_scene() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid scene ID'));
        }
        
        $result = $this->set_default_scene($scene_id);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for reordering scenes
     */
    public function ajax_reorder_scenes() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_POST['tour_id'] ?? 0);
        $scene_order = array_map('absint', $_POST['scene_order'] ?? array());
        
        if (!$tour_id || empty($scene_order)) {
            wp_send_json(array('success' => false, 'error' => 'Invalid data'));
        }
        
        $result = $this->reorder_scenes($tour_id, $scene_order);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for uploading scene image
     */
    public function ajax_upload_scene_image() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        if (!current_user_can('upload_files')) {
            wp_send_json(array('success' => false, 'error' => 'Permission denied'));
        }
        
        if (empty($_FILES['scene_image'])) {
            wp_send_json(array('success' => false, 'error' => 'No file uploaded'));
        }
        
        $result = $this->upload_scene_image($_FILES['scene_image']);
        
        wp_send_json($result);
    }
}