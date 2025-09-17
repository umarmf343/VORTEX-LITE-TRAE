<?php
/**
 * Hotspot management class for Vortex360 Lite
 * Handles interactive hotspot CRUD operations and scene integration
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Hotspot class for managing interactive hotspots in 360° scenes
 */
class Vortex360_Lite_Hotspot {
    
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
        add_action('wp_ajax_vortex360_create_hotspot', array($this, 'ajax_create_hotspot'));
        add_action('wp_ajax_vortex360_update_hotspot', array($this, 'ajax_update_hotspot'));
        add_action('wp_ajax_vortex360_delete_hotspot', array($this, 'ajax_delete_hotspot'));
        add_action('wp_ajax_vortex360_get_hotspot', array($this, 'ajax_get_hotspot'));
        add_action('wp_ajax_vortex360_get_scene_hotspots', array($this, 'ajax_get_scene_hotspots'));
        add_action('wp_ajax_vortex360_reorder_hotspots', array($this, 'ajax_reorder_hotspots'));
    }
    
    /**
     * Create a new hotspot
     * @param array $data Hotspot data
     * @return array Result with success status and data/error
     */
    public function create_hotspot($data) {
        global $wpdb;
        
        // Validate required fields
        if (empty($data['scene_id']) || empty($data['type'])) {
            return array(
                'success' => false,
                'error' => 'Scene ID and type are required.',
                'code' => 'MISSING_REQUIRED_FIELDS'
            );
        }
        
        // Check if scene exists and user has permission
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($data['scene_id']);
        
        if (!$scene) {
            return array(
                'success' => false,
                'error' => 'Scene not found.',
                'code' => 'SCENE_NOT_FOUND'
            );
        }
        
        // Check tour ownership
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($scene->tour_id);
        
        if (!$tour || ($tour->created_by != get_current_user_id() && !current_user_can('manage_options'))) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Validate hotspot type
        $valid_types = array('info', 'link', 'image');
        if (!in_array($data['type'], $valid_types, true)) {
            return array(
                'success' => false,
                'error' => 'Invalid hotspot type.',
                'code' => 'INVALID_TYPE'
            );
        }

        // Enforce Lite hotspot limit per scene
        $current_hotspot_count = $this->get_hotspot_count($data['scene_id']);
        $limits = function_exists('vx_get_lite_limits') ? vx_get_lite_limits() : array();
        $max_hotspots = isset($limits['max_hotspots_per_scene']) ? (int) $limits['max_hotspots_per_scene'] : 5;

        if ($current_hotspot_count >= $max_hotspots) {
            return array(
                'success' => false,
                'error' => sprintf(
                    __("You've reached the Lite limit of %d hotspots for this scene. Upgrade to Pro for unlimited hotspots.", 'vortex360-lite'),
                    $max_hotspots
                ),
                'code' => 'HOTSPOT_LIMIT_REACHED'
            );
        }
        
        // Sanitize data
        $sanitized_data = $this->database->sanitize_hotspot_data($data);
        
        // Set sort order if not provided
        if (!isset($sanitized_data['sort_order'])) {
            $sanitized_data['sort_order'] = $this->get_next_sort_order($data['scene_id']);
        }
        
        // Insert into database
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $result = $wpdb->insert(
            $table_name,
            $sanitized_data,
            array('%d', '%s', '%s', '%s', '%s', '%s', '%f', '%f', '%f', '%d', '%s')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to create hotspot: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        $hotspot_id = $wpdb->insert_id;
        
        return array(
            'success' => true,
            'data' => array(
                'id' => $hotspot_id,
                'message' => 'Hotspot created successfully'
            )
        );
    }
    
    /**
     * Update an existing hotspot
     * @param int $hotspot_id Hotspot ID
     * @param array $data Updated hotspot data
     * @return array Result with success status and data/error
     */
    public function update_hotspot($hotspot_id, $data) {
        global $wpdb;
        
        // Check if hotspot exists and user has permission
        $hotspot = $this->get_hotspot_by_id($hotspot_id);
        if (!$hotspot) {
            return array(
                'success' => false,
                'error' => 'Hotspot not found.',
                'code' => 'HOTSPOT_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_hotspot($hotspot)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Validate hotspot type if provided
        if (isset($data['type'])) {
            $valid_types = array('info', 'link', 'image');
            if (!in_array($data['type'], $valid_types, true)) {
                return array(
                    'success' => false,
                    'error' => 'Invalid hotspot type.',
                    'code' => 'INVALID_TYPE'
                );
            }
        }

        $should_update_scene = array_key_exists('scene_id', $data);
        $validated_scene_id = null;

        if ($should_update_scene) {
            $validated_scene_id = absint($data['scene_id']);
            $current_scene_id = (int) $hotspot->scene_id;

            if ($validated_scene_id === 0) {
                return array(
                    'success' => false,
                    'error' => 'A valid destination scene is required to move a hotspot.',
                    'code' => 'INVALID_TARGET_SCENE'
                );
            }

            if ($validated_scene_id !== $current_scene_id) {
                $scene_manager = new Vortex360_Lite_Scene();
                $new_scene = $scene_manager->get_scene_by_id($validated_scene_id);

                if (!$new_scene) {
                    return array(
                        'success' => false,
                        'error' => 'Destination scene not found.',
                        'code' => 'TARGET_SCENE_NOT_FOUND'
                    );
                }

                $tour_manager = new Vortex360_Lite_Tour();
                $target_tour = $tour_manager->get_tour_by_id($new_scene->tour_id);

                if (!$target_tour || ($target_tour->created_by != get_current_user_id() && !current_user_can('manage_options'))) {
                    return array(
                        'success' => false,
                        'error' => 'You do not have permission to move this hotspot to the selected scene.',
                        'code' => 'HOTSPOT_MOVE_FORBIDDEN'
                    );
                }

                $current_hotspot_count = $this->get_hotspot_count($validated_scene_id);
                $limits = function_exists('vx_get_lite_limits') ? vx_get_lite_limits() : array();
                $max_hotspots = isset($limits['max_hotspots_per_scene']) ? (int) $limits['max_hotspots_per_scene'] : 5;

                if ($current_hotspot_count >= $max_hotspots) {
                    return array(
                        'success' => false,
                        'error' => sprintf(
                            /* translators: %d = maximum number of hotspots allowed */
                            __("Lite version allows a maximum of %d hotspots per scene. Upgrade to Pro for additional hotspots.", 'vortex360-lite'),
                            $max_hotspots
                        ),
                        'code' => 'LITE_HOTSPOT_LIMIT'
                    );
                }
            }
        }

        // Sanitize data
        $sanitized_data = $this->database->sanitize_hotspot_data($data);

        if ($should_update_scene) {
            $sanitized_data['scene_id'] = $validated_scene_id;
        } else {
            unset($sanitized_data['scene_id']);
        }
        
        // Update database
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $result = $wpdb->update(
            $table_name,
            $sanitized_data,
            array('id' => $hotspot_id),
            array('%s', '%s', '%s', '%s', '%s', '%f', '%f', '%f', '%d', '%s'),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to update hotspot: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Hotspot updated successfully'
            )
        );
    }
    
    /**
     * Delete a hotspot
     * @param int $hotspot_id Hotspot ID
     * @return array Result with success status and data/error
     */
    public function delete_hotspot($hotspot_id) {
        global $wpdb;
        
        // Check if hotspot exists and user has permission
        $hotspot = $this->get_hotspot_by_id($hotspot_id);
        if (!$hotspot) {
            return array(
                'success' => false,
                'error' => 'Hotspot not found.',
                'code' => 'HOTSPOT_NOT_FOUND'
            );
        }
        
        if (!$this->user_can_edit_hotspot($hotspot)) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        // Delete hotspot
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $result = $wpdb->delete(
            $table_name,
            array('id' => $hotspot_id),
            array('%d')
        );
        
        if ($result === false) {
            return array(
                'success' => false,
                'error' => 'Failed to delete hotspot: ' . $wpdb->last_error,
                'code' => 'DB_ERROR'
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Hotspot deleted successfully'
            )
        );
    }
    
    /**
     * Get hotspot by ID
     * @param int $hotspot_id Hotspot ID
     * @return object|null Hotspot object or null if not found
     */
    public function get_hotspot_by_id($hotspot_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $hotspot = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM $table_name WHERE id = %d",
            $hotspot_id
        ));

        if ($hotspot && !empty($hotspot->settings)) {
            $hotspot->settings = json_decode($hotspot->settings, true);
        }

        if ($hotspot) {
            $hotspot->type = $this->denormalize_hotspot_type($hotspot->type);
        }

        return $hotspot;
    }
    
    /**
     * Get all hotspots for a scene
     * @param int $scene_id Scene ID
     * @return array Array of hotspot objects
     */
    public function get_scene_hotspots($scene_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $hotspots = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table_name WHERE scene_id = %d ORDER BY sort_order ASC, id ASC",
            $scene_id
        ));
        
        // Decode settings for each hotspot
        foreach ($hotspots as $hotspot) {
            $hotspot->type = $this->denormalize_hotspot_type($hotspot->type);
            if (!empty($hotspot->settings)) {
                $hotspot->settings = json_decode($hotspot->settings, true);
            }
        }

        return $hotspots;
    }

    /**
     * Convert stored hotspot types to the lite viewer equivalents.
     *
     * @param string $type Database hotspot type.
     * @return string Public hotspot type.
     */
    private function denormalize_hotspot_type($type) {
        $map = array(
            'text' => 'info',
            'info' => 'info',
            'url' => 'link',
            'link' => 'link',
            'image' => 'image',
            'scene' => 'info'
        );

        $type = strtolower($type ?: 'info');

        if (!array_key_exists($type, $map)) {
            return 'info';
        }

        return $map[$type];
    }

    /**
     * Get the current hotspot count for a scene
     *
     * @param int $scene_id Scene ID
     * @return int Number of hotspots associated with the scene
     */
    public function get_hotspot_count($scene_id) {
        global $wpdb;

        $table_name = $wpdb->prefix . 'vortex360_hotspots';

        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $table_name WHERE scene_id = %d",
            absint($scene_id)
        ));

        return (int) $count;
    }
    
    /**
     * Get hotspots by type
     * @param string $type Hotspot type
     * @param int $limit Optional limit
     * @return array Array of hotspot objects
     */
    public function get_hotspots_by_type($type, $limit = null) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $db_type = $this->normalize_requested_hotspot_type($type);

        $query = $wpdb->prepare(
            "SELECT * FROM $table_name WHERE type = %s ORDER BY created_at DESC",
            $db_type
        );
        
        if ($limit) {
            $query .= $wpdb->prepare(" LIMIT %d", $limit);
        }
        
        $hotspots = $wpdb->get_results($query);
        
        // Decode settings for each hotspot
        foreach ($hotspots as $hotspot) {
            $hotspot->type = $this->denormalize_hotspot_type($hotspot->type);
            if (!empty($hotspot->settings)) {
                $hotspot->settings = json_decode($hotspot->settings, true);
            }
        }

        return $hotspots;
    }

    /**
     * Normalize requested hotspot types to the stored database values.
     *
     * @param string $type Requested hotspot type.
     * @return string Database hotspot type.
     */
    private function normalize_requested_hotspot_type($type) {
        $map = array(
            'info' => 'text',
            'text' => 'text',
            'link' => 'url',
            'url' => 'url',
            'image' => 'image',
            'scene' => 'text'
        );

        $type = strtolower($type ?: 'info');

        if (!array_key_exists($type, $map)) {
            return 'text';
        }

        return $map[$type];
    }
    
    /**
     * Reorder hotspots in a scene
     * @param int $scene_id Scene ID
     * @param array $hotspot_order Array of hotspot IDs in new order
     * @return array Result with success status and data/error
     */
    public function reorder_hotspots($scene_id, $hotspot_order) {
        global $wpdb;
        
        // Check if scene exists and user has permission
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($scene_id);
        
        if (!$scene) {
            return array(
                'success' => false,
                'error' => 'Scene not found.',
                'code' => 'SCENE_NOT_FOUND'
            );
        }
        
        // Check tour ownership
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($scene->tour_id);
        
        if (!$tour || ($tour->created_by != get_current_user_id() && !current_user_can('manage_options'))) {
            return array(
                'success' => false,
                'error' => 'Permission denied.',
                'code' => 'PERMISSION_DENIED'
            );
        }
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        // Update sort order for each hotspot
        foreach ($hotspot_order as $index => $hotspot_id) {
            $wpdb->update(
                $table_name,
                array('sort_order' => $index + 1),
                array('id' => absint($hotspot_id), 'scene_id' => $scene_id),
                array('%d'),
                array('%d', '%d')
            );
        }
        
        return array(
            'success' => true,
            'data' => array(
                'message' => 'Hotspots reordered successfully'
            )
        );
    }
    
    /**
     * Get hotspot statistics for a tour
     * @param int $tour_id Tour ID
     * @return array Statistics array
     */
    public function get_tour_hotspot_stats($tour_id) {
        global $wpdb;
        
        $hotspot_table = $wpdb->prefix . 'vortex360_hotspots';
        $scene_table = $wpdb->prefix . 'vortex360_scenes';
        
        // Get total hotspots count
        $total_hotspots = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(h.id) FROM $hotspot_table h 
             INNER JOIN $scene_table s ON h.scene_id = s.id 
             WHERE s.tour_id = %d",
            $tour_id
        ));
        
        // Get hotspots by type
        $hotspots_by_type = $wpdb->get_results($wpdb->prepare(
            "SELECT h.type, COUNT(h.id) as count FROM $hotspot_table h 
             INNER JOIN $scene_table s ON h.scene_id = s.id 
             WHERE s.tour_id = %d 
             GROUP BY h.type",
            $tour_id
        ), ARRAY_A);
        
        return array(
            'total_hotspots' => (int) $total_hotspots,
            'by_type' => $hotspots_by_type
        );
    }
    
    /**
     * Validate hotspot position coordinates
     * @param float $pitch Pitch coordinate
     * @param float $yaw Yaw coordinate
     * @return bool True if valid
     */
    public function validate_coordinates($pitch, $yaw) {
        // Pitch should be between -90 and 90 degrees
        if ($pitch < -90 || $pitch > 90) {
            return false;
        }
        
        // Yaw should be between -180 and 180 degrees
        if ($yaw < -180 || $yaw > 180) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get next sort order for a scene
     * @param int $scene_id Scene ID
     * @return int Next sort order
     */
    private function get_next_sort_order($scene_id) {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'vortex360_hotspots';
        
        $max_order = $wpdb->get_var($wpdb->prepare(
            "SELECT MAX(sort_order) FROM $table_name WHERE scene_id = %d",
            $scene_id
        ));
        
        return ($max_order ?? 0) + 1;
    }
    
    /**
     * Check if current user can edit hotspot
     * @param object $hotspot Hotspot object
     * @return bool True if user can edit
     */
    private function user_can_edit_hotspot($hotspot) {
        // Get scene to check ownership
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($hotspot->scene_id);
        
        if (!$scene) {
            return false;
        }
        
        // Get tour to check ownership
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($scene->tour_id);
        
        if (!$tour) {
            return false;
        }
        
        $current_user_id = get_current_user_id();
        
        // Tour owner can edit hotspots
        if ($tour->created_by == $current_user_id) {
            return true;
        }
        
        // Administrators can edit any hotspot
        if (current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for creating hotspot
     */
    public function ajax_create_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $data = array(
            'scene_id' => absint($_POST['scene_id'] ?? 0),
            'type' => sanitize_text_field($_POST['type'] ?? ''),
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'content' => wp_kses_post($_POST['content'] ?? ''),
            'target_scene_id' => absint($_POST['target_scene_id'] ?? 0),
            'target_url' => esc_url_raw($_POST['target_url'] ?? ''),
            'pitch' => floatval($_POST['pitch'] ?? 0),
            'yaw' => floatval($_POST['yaw'] ?? 0),
            'scale' => floatval($_POST['scale'] ?? 1)
        );
        
        // Validate coordinates
        if (!$this->validate_coordinates($data['pitch'], $data['yaw'])) {
            wp_send_json(array('success' => false, 'error' => 'Invalid coordinates'));
        }
        
        $result = $this->create_hotspot($data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for updating hotspot
     */
    public function ajax_update_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $hotspot_id = absint($_POST['hotspot_id'] ?? 0);
        if (!$hotspot_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid hotspot ID'));
        }
        
        $data = array(
            'type' => sanitize_text_field($_POST['type'] ?? ''),
            'title' => sanitize_text_field($_POST['title'] ?? ''),
            'content' => wp_kses_post($_POST['content'] ?? ''),
            'target_scene_id' => absint($_POST['target_scene_id'] ?? 0),
            'target_url' => esc_url_raw($_POST['target_url'] ?? ''),
            'pitch' => floatval($_POST['pitch'] ?? 0),
            'yaw' => floatval($_POST['yaw'] ?? 0),
            'scale' => floatval($_POST['scale'] ?? 1)
        );
        
        // Validate coordinates if provided
        if (isset($_POST['pitch']) || isset($_POST['yaw'])) {
            if (!$this->validate_coordinates($data['pitch'], $data['yaw'])) {
                wp_send_json(array('success' => false, 'error' => 'Invalid coordinates'));
            }
        }
        
        $result = $this->update_hotspot($hotspot_id, $data);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for deleting hotspot
     */
    public function ajax_delete_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $hotspot_id = absint($_POST['hotspot_id'] ?? 0);
        if (!$hotspot_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid hotspot ID'));
        }
        
        $result = $this->delete_hotspot($hotspot_id);
        
        wp_send_json($result);
    }
    
    /**
     * AJAX handler for getting single hotspot
     */
    public function ajax_get_hotspot() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $hotspot_id = absint($_GET['hotspot_id'] ?? 0);
        if (!$hotspot_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid hotspot ID'));
        }
        
        $hotspot = $this->get_hotspot_by_id($hotspot_id);
        
        if (!$hotspot || !$this->user_can_edit_hotspot($hotspot)) {
            wp_send_json(array('success' => false, 'error' => 'Hotspot not found or permission denied'));
        }
        
        wp_send_json(array('success' => true, 'data' => $hotspot));
    }
    
    /**
     * AJAX handler for getting scene hotspots
     */
    public function ajax_get_scene_hotspots() {
        // Verify nonce
        if (!wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_GET['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json(array('success' => false, 'error' => 'Invalid scene ID'));
        }
        
        $hotspots = $this->get_scene_hotspots($scene_id);
        
        wp_send_json(array('success' => true, 'data' => $hotspots));
    }
    
    /**
     * AJAX handler for reordering hotspots
     */
    public function ajax_reorder_hotspots() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        $hotspot_order = array_map('absint', $_POST['hotspot_order'] ?? array());
        
        if (!$scene_id || empty($hotspot_order)) {
            wp_send_json(array('success' => false, 'error' => 'Invalid data'));
        }
        
        $result = $this->reorder_hotspots($scene_id, $hotspot_order);
        
        wp_send_json($result);
    }
}