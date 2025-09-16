<?php
/**
 * Tour management class for Vortex360 Lite
 * Handles tour CRUD operations and Lite version restrictions
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Tour class for managing virtual tours
 */
class Vortex360_Lite_Tour {
    
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
        
        // Hook into WordPress actions
        add_action('wp_ajax_vortex360_create_tour', array($this, 'ajax_create_tour'));
        add_action('wp_ajax_vortex360_update_tour', array($this, 'ajax_update_tour'));
        add_action('wp_ajax_vortex360_delete_tour', array($this, 'ajax_delete_tour'));
        add_action('wp_ajax_vortex360_get_tour', array($this, 'ajax_get_tour'));
        add_action('wp_ajax_vortex360_get_tours', array($this, 'ajax_get_tours'));
        
        // Public AJAX for tour viewing
        add_action('wp_ajax_nopriv_vortex360_get_tour_public', array($this, 'ajax_get_tour_public'));
    }
    
    /**
     * Create a new tour (with Lite version restrictions)
     * @param array $data Tour data
     * @return array Result with success status and data/error
     */
    public function create_tour($data) {
        global $wpdb;
        
        // Check Lite version limit
        if (!$this->database->can_create_tour()) {
            return array(
                'success' => false,
                'error' => 'Tour limit reached. Lite version allows only 1 tour. Upgrade to Pro for unlimited tours.',
                'code' => 'LITE_LIMIT_REACHED'
            );
        }
        
        // Validate required fields
        if (empty($data['title'])) {
            return array(
                'success' => false,
                'error' => 'Tour title is required.',
                'code' => 'MISSING_TITLE'
            );
        }
        
        // Sanitize data
        $sanitized_data = $this->database->sanitize_tour_data($data);
        
        // Ensure unique slug
        $sanitized_data['slug'] = $this->generate_unique_slug($sanitized_data['slug']);
        
        // Insert into database
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $result = $wpdb->insert(
            $table_name,
            $sanitized_data,
            array('%s', '%s', '%s', '%s', '%s', '%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to create tour: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        $tour_id = $wpdb->insert_id;
        
        return array(
            'success' => true,
            'data' => array(
                'id' => $tour_id,
                'message' => 'Tour created successfully'
            )
        );
    }
    
    /**
     * Update an existing tour
     * @param int $tour_id Tour ID
     * @param array $data Updated tour data
     * @return array Result with success status and data/error
     */
    public function update_tour($tour_id, $data) {
        global $wpdb;
        
        // Check if tour exists and user has permission
        $tour = $this->get_tour_by_id($tour_id);
        if (!$tour) {
            return array(
                'success' => false,
                'error' => 'Tour not found.',
                'code' => 'TOUR_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_tour($tour)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Sanitize data
        $sanitized_data = $this->database->sanitize_tour_data($data);
        
        // Remove created_by from update data
        unset($sanitized_data['created_by']);
        
        // Handle slug update
        if (!empty($sanitized_data['slug']) && $sanitized_data['slug'] !== $tour->slug) {
            $sanitized_data['slug'] = $this->generate_unique_slug($sanitized_data['slug'], $tour_id);
        }
        
        // Update database
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $result = $wpdb->update(
            $table_name,
            $sanitized_data,
            array('id' => $tour_id),
            array('%s', '%s', '%s', '%s', '%s'),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to update tour: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Tour updated successfully'
            )
        );
    }
    
    /**
     * Delete a tour and all associated data
     * @param int $tour_id Tour ID
     * @return array Result with success status and data/error
     */
    public function delete_tour($tour_id) {
        global $wpdb;
        
        // Check if tour exists and user has permission
        $tour = $this->get_tour_by_id($tour_id);
        if (!$tour) {
            return array(
                'success' => false,
                'error' => 'Tour not found.',
                'code' => 'TOUR_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_tour($tour)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Delete tour (cascading will handle scenes and hotspots)
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $result = $wpdb->delete(
            $table_name,
            array('id' => $tour_id),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to delete tour: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Tour deleted successfully'
            )
        );
    }
    
    /**
     * Get tour by ID
     * @param int $tour_id Tour ID
     * @return object|null Tour object or null if not found
     */
    public function get_tour_by_id($tour_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $tour = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE id = %d",
            $tour_id
        ));
        
        if ($tour && !empty($tour->settings)) {
            $tour->settings = json_decode($tour->settings, true);
        }
        
        return $tour;
    }
    
    /**
     * Get tour by slug
     * @param string $slug Tour slug
     * @return object|null Tour object or null if not found
     */
    public function get_tour_by_slug($slug) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        $tour = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE slug = %s",
            $slug
        ));
        
        if ($tour && !empty($tour->settings)) {
            $tour->settings = json_decode($tour->settings, true);
        }
        
        return $tour;
    }
    
    /**
     * Get tours for current user with pagination
     * @param array $args Query arguments
     * @return array Tours data with pagination info
     */
    public function get_user_tours($args = array()) {
        global $wpdb;
        
        $defaults = array(
            'user_id' => get_current_user_id(),
            'status' => 'all',
            'per_page' => 10,
            'page' => 1,
            'orderby' => 'created_at',
            'order' => 'DESC'
        );
        
        $args = wp_parse_args($args, $defaults);
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        // Build WHERE clause
        $where_conditions = array('created_by = %d');
        $where_values = array($args['user_id']);
        
        if ($args['status'] !== 'all') {
            $where_conditions[] = 'status = %s';
            $where_values[] = $args['status'];
        }
        
        $where_clause = 'WHERE ' . implode(' AND ', $where_conditions);
        
        // Get total count
        $count_sql = "SELECT COUNT(*) FROM $table_name $where_clause";
        $total_tours = $wpdb->get_var($wpdb->prepare($count_sql, $where_values));
        
        // Build ORDER BY clause
        $allowed_orderby = array('id', 'title', 'status', 'created_at', 'updated_at');
        $orderby = in_array($args['orderby'], $allowed_orderby) ? $args['orderby'] : 'created_at';
        $order = strtoupper($args['order']) === 'ASC' ? 'ASC' : 'DESC';
        
        // Calculate offset
        $offset = ($args['page'] - 1) * $args['per_page'];
        
        // Get tours
        $tours_sql = "SELECT * FROM $table_name $where_clause ORDER BY $orderby $order LIMIT %d OFFSET %d";
        $tours_values = array_merge($where_values, array($args['per_page'], $offset));
        
        $tours = $wpdb->get_results($wpdb->prepare($tours_sql, $tours_values));
        
        // Decode settings for each tour
        foreach ($tours as $tour) {
            if (!empty($tour->settings)) {
                $tour->settings = json_decode($tour->settings, true);
            }
        }
        
        return array(
            'tours' => $tours,
            'pagination' => array(
                'total' => (int) $total_tours,
                'per_page' => $args['per_page'],
                'current_page' => $args['page'],
                'total_pages' => ceil($total_tours / $args['per_page'])
            )
        );
    }
    
    /**
     * Generate unique slug for tour
     * @param string $slug Base slug
     * @param int $exclude_id Tour ID to exclude from uniqueness check
     * @return string Unique slug
     */
    private function generate_unique_slug($slug, $exclude_id = null) {
        global $wpdb;
        
        $original_slug = $slug;
        $counter = 1;
        
        $table_name = $wpdb->prefix . 'vortex360_tours';
        
        while (true) {
            $where_clause = 'slug = %s';
            $values = array($slug);
            
            if ($exclude_id) {
                $where_clause .= ' AND id != %d';
                $values[] = $exclude_id;
            }
            
            $exists = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM $table_name WHERE $where_clause",
                $values
            ));
            
            if (!$exists) {
                break;
            }
            
            $slug = $original_slug . '-' . $counter;
            $counter++;
        }
        
        return $slug;
    }
    
    /**
     * Check if current user can edit tour
     * @param object $tour Tour object
     * @return bool True if user can edit
     */
    private function user_can_edit_tour($tour) {
        $current_user_id = get_current_user_id();
        
        // Tour owner can edit
        if ($tour->created_by == $current_user_id) {
            return true;
        }
        
        // Administrators can edit any tour
        if (current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * AJAX handler for creating tour
     */
    public function ajax_create_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        // Check user capabilities
        if (!current_user_can('edit_posts')) {
            wp_die('Permission denied');
        }
        
        $data = array(
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'description' => sanitize_textarea_field($_POST['description'] ?? ''),
            'status' => sanitize_text_field($_POST['status'] ?? 'draft')
        );
        
        $result = $this->create_tour($data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for updating tour
     */
    public function ajax_update_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_POST['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid tour ID'));
        }
        
        $data = array(
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'description' => sanitize_textarea_field($_POST['description'] ?? ''),
            'status' => sanitize_text_field($_POST['status'] ?? 'draft')
        );
        
        $result = $this->update_tour($tour_id, $data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for deleting tour
     */
    public function ajax_delete_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_POST['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid tour ID'));
        }
        
        $result = $this->delete_tour($tour_id);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for getting single tour
     */
    public function ajax_get_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_GET['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid tour ID'));
        }
        
        $tour = $this->get_tour_by_id($tour_id);
        
        if (!$tour || !$this->user_can_edit_tour($tour)) {
            wp_send_json(array('success' => false, 'error' => 'Tour not found or permission denied'));
        }
        
        wp_send_json(array('success' => true, 'data' => $tour));
    }
    
    /**
     * AJAX handler for getting user tours
     */
    public function ajax_get_tours() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $args = array(
            'status' => sanitize_text_field($_GET['status'] ?? 'all'),
            'per_page' => min(absint($_GET['per_page'] ?? 10), 50),
            'page' => absint($_GET['page'] ?? 1)
        );
        
        $result = $this->get_user_tours($args);
        
        wp_send_json(array('success' => true, 'data' => $result));
    }
    
    /**
     * AJAX handler for getting tour data for public viewing
     */
    public function ajax_get_tour_public() {
        $tour_id = absint($_GET['tour_id'] ?? 0);
        $slug = sanitize_text_field($_GET['slug'] ?? '');
        
        if ($tour_id) {
            $tour = $this->get_tour_by_id($tour_id);
        } elseif ($slug) {
            $tour = $this->get_tour_by_slug($slug);
        } else {
            wp_send_json(array('success' => false, 'error' => 'Tour ID or slug required'));
        }
        
        if (!$tour || $tour->status !== 'published') {
            wp_send_json(array('success' => false, 'error' => 'Tour not found or not published'));
        }
        
        // Get scenes and hotspots
        $scene_manager = new Vortex360_Lite_Scene();
        $scenes = $scene_manager->get_tour_scenes($tour->id);
        
        $tour->scenes = $scenes;
        
        wp_send_json(array('success' => true, 'data' => $tour));
    }
}