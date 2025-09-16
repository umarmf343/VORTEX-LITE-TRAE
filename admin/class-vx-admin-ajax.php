<?php
/**
 * Vortex360 Lite - Admin AJAX Handler
 * 
 * Handles AJAX requests from the admin interface including
 * tour operations, validation, and preview generation.
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
 * Admin AJAX Handler Class
 */
class VX_Admin_Ajax {

    /**
     * Initialize the class
     */
    public function __construct() {
        $this->init_hooks();
    }

    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        // AJAX actions for logged-in users
        add_action('wp_ajax_vx_validate_tour', array($this, 'validate_tour'));
        add_action('wp_ajax_vx_get_scene_options', array($this, 'get_scene_options'));
        add_action('wp_ajax_vx_duplicate_tour', array($this, 'duplicate_tour'));
        add_action('wp_ajax_vx_export_tour', array($this, 'export_tour'));
        add_action('wp_ajax_vx_import_tour', array($this, 'import_tour'));
        add_action('wp_ajax_vx_check_limits', array($this, 'check_limits'));
        add_action('wp_ajax_vx_get_preview_data', array($this, 'get_preview_data'));
    }

    /**
     * Validate tour data before saving
     */
    public function validate_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        // Check capabilities
        if (!current_user_can('edit_vortex_tours')) {
            wp_die('Insufficient permissions');
        }

        $tour_data = json_decode(stripslashes($_POST['tour_data']), true);
        $errors = array();
        $warnings = array();

        // Validate tour structure
        if (empty($tour_data) || !is_array($tour_data)) {
            $errors[] = 'Invalid tour data format';
        } else {
            $validation_result = $this->validate_tour_structure($tour_data);
            $errors = array_merge($errors, $validation_result['errors']);
            $warnings = array_merge($warnings, $validation_result['warnings']);
        }

        wp_send_json(array(
            'success' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings
        ));
    }

    /**
     * Get scene options for hotspot target selection
     */
    public function get_scene_options() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        $tour_id = intval($_POST['tour_id']);
        $current_scene_id = sanitize_text_field($_POST['current_scene_id']);

        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }

        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            wp_send_json_error('No tour data found');
        }

        $tour_data = json_decode($tour_data, true);
        $options = array();

        if (!empty($tour_data['scenes'])) {
            foreach ($tour_data['scenes'] as $scene) {
                if ($scene['id'] !== $current_scene_id) {
                    $options[] = array(
                        'value' => $scene['id'],
                        'label' => $scene['title']
                    );
                }
            }
        }

        wp_send_json_success($options);
    }

    /**
     * Duplicate a tour
     */
    public function duplicate_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        // Check capabilities
        if (!current_user_can('edit_vortex_tours')) {
            wp_die('Insufficient permissions');
        }

        $tour_id = intval($_POST['tour_id']);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }

        $original_post = get_post($tour_id);
        if (!$original_post || $original_post->post_type !== 'vortex_tour') {
            wp_send_json_error('Tour not found');
        }

        // Create duplicate post
        $new_post_data = array(
            'post_title' => $original_post->post_title . ' (Copy)',
            'post_content' => $original_post->post_content,
            'post_status' => 'draft',
            'post_type' => 'vortex_tour',
            'post_author' => get_current_user_id()
        );

        $new_post_id = wp_insert_post($new_post_data);
        if (is_wp_error($new_post_id)) {
            wp_send_json_error('Failed to create duplicate tour');
        }

        // Copy tour data
        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if ($tour_data) {
            update_post_meta($new_post_id, '_vx_tour_data', $tour_data);
        }

        // Copy other meta data
        $meta_keys = array('_vx_tour_settings', '_vx_tour_analytics');
        foreach ($meta_keys as $meta_key) {
            $meta_value = get_post_meta($tour_id, $meta_key, true);
            if ($meta_value) {
                update_post_meta($new_post_id, $meta_key, $meta_value);
            }
        }

        wp_send_json_success(array(
            'new_tour_id' => $new_post_id,
            'edit_url' => admin_url('post.php?post=' . $new_post_id . '&action=edit')
        ));
    }

    /**
     * Export tour data
     */
    public function export_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        $tour_id = intval($_POST['tour_id']);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }

        $post = get_post($tour_id);
        if (!$post || $post->post_type !== 'vortex_tour') {
            wp_send_json_error('Tour not found');
        }

        // Get tour data
        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            wp_send_json_error('No tour data to export');
        }

        $tour_data = json_decode($tour_data, true);

        // Prepare export data
        $export_data = array(
            'version' => '1.0.0',
            'plugin' => 'vortex360-lite',
            'exported_at' => current_time('mysql'),
            'tour' => array(
                'title' => $post->post_title,
                'content' => $post->post_content,
                'data' => $tour_data
            )
        );

        // Convert image IDs to URLs for portability
        $export_data = $this->convert_images_for_export($export_data);

        wp_send_json_success(array(
            'filename' => sanitize_file_name($post->post_title) . '-export.json',
            'data' => json_encode($export_data, JSON_PRETTY_PRINT)
        ));
    }

    /**
     * Import tour data
     */
    public function import_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        // Check capabilities
        if (!current_user_can('edit_vortex_tours')) {
            wp_die('Insufficient permissions');
        }

        if (empty($_POST['import_data'])) {
            wp_send_json_error('No import data provided');
        }

        $import_data = json_decode(stripslashes($_POST['import_data']), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error('Invalid JSON format');
        }

        // Validate import data structure
        if (!isset($import_data['tour']) || !isset($import_data['tour']['data'])) {
            wp_send_json_error('Invalid import data structure');
        }

        // Validate tour data
        $validation_result = $this->validate_tour_structure($import_data['tour']['data']);
        if (!empty($validation_result['errors'])) {
            wp_send_json_error('Import validation failed: ' . implode(', ', $validation_result['errors']));
        }

        // Create new tour post
        $post_data = array(
            'post_title' => sanitize_text_field($import_data['tour']['title']) . ' (Imported)',
            'post_content' => wp_kses_post($import_data['tour']['content']),
            'post_status' => 'draft',
            'post_type' => 'vortex_tour',
            'post_author' => get_current_user_id()
        );

        $post_id = wp_insert_post($post_data);
        if (is_wp_error($post_id)) {
            wp_send_json_error('Failed to create imported tour');
        }

        // Convert URLs back to attachment IDs where possible
        $tour_data = $this->convert_images_for_import($import_data['tour']['data']);

        // Save tour data
        update_post_meta($post_id, '_vx_tour_data', json_encode($tour_data));

        wp_send_json_success(array(
            'tour_id' => $post_id,
            'edit_url' => admin_url('post.php?post=' . $post_id . '&action=edit'),
            'warnings' => $validation_result['warnings']
        ));
    }

    /**
     * Check Lite version limits
     */
    public function check_limits() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        $tour_data = json_decode(stripslashes($_POST['tour_data']), true);
        $limits = VX_Limits_Lite::get_limits();
        $violations = array();

        // Check scene limit
        if (count($tour_data['scenes']) > $limits['scenes_per_tour']) {
            $violations[] = sprintf(
                'Too many scenes (%d/%d). Lite version allows up to %d scenes per tour.',
                count($tour_data['scenes']),
                $limits['scenes_per_tour'],
                $limits['scenes_per_tour']
            );
        }

        // Check hotspot limits per scene
        foreach ($tour_data['scenes'] as $index => $scene) {
            if (count($scene['hotspots']) > $limits['hotspots_per_scene']) {
                $violations[] = sprintf(
                    'Scene "%s" has too many hotspots (%d/%d). Lite version allows up to %d hotspots per scene.',
                    $scene['title'],
                    count($scene['hotspots']),
                    $limits['hotspots_per_scene'],
                    $limits['hotspots_per_scene']
                );
            }

            // Check hotspot types
            foreach ($scene['hotspots'] as $hotspot) {
                if (!in_array($hotspot['type'], $limits['hotspot_types'])) {
                    $violations[] = sprintf(
                        'Hotspot type "%s" is not available in Lite version. Allowed types: %s',
                        $hotspot['type'],
                        implode(', ', $limits['hotspot_types'])
                    );
                }
            }
        }

        wp_send_json(array(
            'within_limits' => empty($violations),
            'violations' => $violations,
            'limits' => $limits
        ));
    }

    /**
     * Get preview data for admin preview
     */
    public function get_preview_data() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die('Security check failed');
        }

        $tour_id = intval($_POST['tour_id']);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }

        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            wp_send_json_error('No tour data found');
        }

        $tour_data = json_decode($tour_data, true);

        // Sanitize and prepare data for preview
        $preview_data = $this->prepare_preview_data($tour_data);

        wp_send_json_success($preview_data);
    }

    /**
     * Validate tour data structure
     */
    private function validate_tour_structure($tour_data) {
        $errors = array();
        $warnings = array();

        // Check required fields
        if (!isset($tour_data['scenes']) || !is_array($tour_data['scenes'])) {
            $errors[] = 'Tour must have scenes array';
            return array('errors' => $errors, 'warnings' => $warnings);
        }

        if (empty($tour_data['scenes'])) {
            $warnings[] = 'Tour has no scenes';
        }

        // Validate each scene
        foreach ($tour_data['scenes'] as $index => $scene) {
            $scene_errors = $this->validate_scene($scene, $index + 1);
            $errors = array_merge($errors, $scene_errors);
        }

        // Check Lite limits
        $limits = VX_Limits_Lite::get_limits();
        if (count($tour_data['scenes']) > $limits['scenes_per_tour']) {
            $errors[] = sprintf('Too many scenes (%d). Lite version allows maximum %d scenes.', 
                count($tour_data['scenes']), $limits['scenes_per_tour']);
        }

        return array('errors' => $errors, 'warnings' => $warnings);
    }

    /**
     * Validate individual scene
     */
    private function validate_scene($scene, $scene_number) {
        $errors = array();

        // Required fields
        $required_fields = array('id', 'title', 'type', 'image', 'initView', 'hotspots');
        foreach ($required_fields as $field) {
            if (!isset($scene[$field])) {
                $errors[] = sprintf('Scene %d is missing required field: %s', $scene_number, $field);
            }
        }

        // Validate scene type
        $allowed_types = array('sphere', 'cube', 'flat', 'little-planet');
        if (isset($scene['type']) && !in_array($scene['type'], $allowed_types)) {
            $errors[] = sprintf('Scene %d has invalid type: %s', $scene_number, $scene['type']);
        }

        // Validate image
        if (isset($scene['image']) && (!isset($scene['image']['url']) || empty($scene['image']['url']))) {
            $errors[] = sprintf('Scene %d is missing image URL', $scene_number);
        }

        // Validate initial view
        if (isset($scene['initView'])) {
            $view_fields = array('yaw', 'pitch', 'fov');
            foreach ($view_fields as $field) {
                if (!isset($scene['initView'][$field]) || !is_numeric($scene['initView'][$field])) {
                    $errors[] = sprintf('Scene %d has invalid initView.%s', $scene_number, $field);
                }
            }
        }

        // Validate hotspots
        if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
            $limits = VX_Limits_Lite::get_limits();
            if (count($scene['hotspots']) > $limits['hotspots_per_scene']) {
                $errors[] = sprintf('Scene %d has too many hotspots (%d). Maximum allowed: %d', 
                    $scene_number, count($scene['hotspots']), $limits['hotspots_per_scene']);
            }

            foreach ($scene['hotspots'] as $hotspot_index => $hotspot) {
                $hotspot_errors = $this->validate_hotspot($hotspot, $scene_number, $hotspot_index + 1);
                $errors = array_merge($errors, $hotspot_errors);
            }
        }

        return $errors;
    }

    /**
     * Validate individual hotspot
     */
    private function validate_hotspot($hotspot, $scene_number, $hotspot_number) {
        $errors = array();

        // Required fields
        $required_fields = array('id', 'type', 'yaw', 'pitch', 'title');
        foreach ($required_fields as $field) {
            if (!isset($hotspot[$field])) {
                $errors[] = sprintf('Scene %d, Hotspot %d is missing required field: %s', 
                    $scene_number, $hotspot_number, $field);
            }
        }

        // Validate hotspot type
        $limits = VX_Limits_Lite::get_limits();
        if (isset($hotspot['type']) && !in_array($hotspot['type'], $limits['hotspot_types'])) {
            $errors[] = sprintf('Scene %d, Hotspot %d has invalid type: %s. Allowed types: %s', 
                $scene_number, $hotspot_number, $hotspot['type'], implode(', ', $limits['hotspot_types']));
        }

        // Validate coordinates
        if (isset($hotspot['yaw']) && (!is_numeric($hotspot['yaw']) || $hotspot['yaw'] < -180 || $hotspot['yaw'] > 180)) {
            $errors[] = sprintf('Scene %d, Hotspot %d has invalid yaw value', $scene_number, $hotspot_number);
        }

        if (isset($hotspot['pitch']) && (!is_numeric($hotspot['pitch']) || $hotspot['pitch'] < -90 || $hotspot['pitch'] > 90)) {
            $errors[] = sprintf('Scene %d, Hotspot %d has invalid pitch value', $scene_number, $hotspot_number);
        }

        return $errors;
    }

    /**
     * Convert image IDs to URLs for export
     */
    private function convert_images_for_export($data) {
        if (isset($data['tour']['data']['scenes'])) {
            foreach ($data['tour']['data']['scenes'] as &$scene) {
                // Convert scene images
                if (isset($scene['image']['id']) && $scene['image']['id']) {
                    $scene['image']['url'] = wp_get_attachment_url($scene['image']['id']);
                }
                if (isset($scene['previewImage']['id']) && $scene['previewImage']['id']) {
                    $scene['previewImage']['url'] = wp_get_attachment_url($scene['previewImage']['id']);
                }
            }
        }

        // Convert branding logo
        if (isset($data['tour']['data']['settings']['branding']['logoId']) && 
            $data['tour']['data']['settings']['branding']['logoId']) {
            $data['tour']['data']['settings']['branding']['logoUrl'] = 
                wp_get_attachment_url($data['tour']['data']['settings']['branding']['logoId']);
        }

        return $data;
    }

    /**
     * Convert image URLs to IDs for import
     */
    private function convert_images_for_import($tour_data) {
        if (isset($tour_data['scenes'])) {
            foreach ($tour_data['scenes'] as &$scene) {
                // Try to find attachment ID by URL
                if (isset($scene['image']['url']) && $scene['image']['url']) {
                    $attachment_id = attachment_url_to_postid($scene['image']['url']);
                    if ($attachment_id) {
                        $scene['image']['id'] = $attachment_id;
                    }
                }
                if (isset($scene['previewImage']['url']) && $scene['previewImage']['url']) {
                    $attachment_id = attachment_url_to_postid($scene['previewImage']['url']);
                    if ($attachment_id) {
                        $scene['previewImage']['id'] = $attachment_id;
                    }
                }
            }
        }

        // Convert branding logo
        if (isset($tour_data['settings']['branding']['logoUrl']) && 
            $tour_data['settings']['branding']['logoUrl']) {
            $attachment_id = attachment_url_to_postid($tour_data['settings']['branding']['logoUrl']);
            if ($attachment_id) {
                $tour_data['settings']['branding']['logoId'] = $attachment_id;
            }
        }

        return $tour_data;
    }

    /**
     * Prepare data for preview
     */
    private function prepare_preview_data($tour_data) {
        // Sanitize and validate data
        $preview_data = array(
            'scenes' => array(),
            'settings' => isset($tour_data['settings']) ? $tour_data['settings'] : array()
        );

        if (isset($tour_data['scenes']) && is_array($tour_data['scenes'])) {
            foreach ($tour_data['scenes'] as $scene) {
                if (isset($scene['image']['url']) && !empty($scene['image']['url'])) {
                    $preview_data['scenes'][] = array(
                        'id' => sanitize_text_field($scene['id']),
                        'title' => sanitize_text_field($scene['title']),
                        'type' => sanitize_text_field($scene['type']),
                        'image' => array(
                            'url' => esc_url($scene['image']['url'])
                        ),
                        'initView' => array(
                            'yaw' => floatval($scene['initView']['yaw']),
                            'pitch' => floatval($scene['initView']['pitch']),
                            'fov' => floatval($scene['initView']['fov'])
                        ),
                        'hotspots' => isset($scene['hotspots']) ? $this->sanitize_hotspots($scene['hotspots']) : array()
                    );
                }
            }
        }

        return $preview_data;
    }

    /**
     * Sanitize hotspots for preview
     */
    private function sanitize_hotspots($hotspots) {
        $sanitized = array();
        
        foreach ($hotspots as $hotspot) {
            $sanitized[] = array(
                'id' => sanitize_text_field($hotspot['id']),
                'type' => sanitize_text_field($hotspot['type']),
                'yaw' => floatval($hotspot['yaw']),
                'pitch' => floatval($hotspot['pitch']),
                'title' => sanitize_text_field($hotspot['title']),
                'text' => sanitize_textarea_field($hotspot['text']),
                'url' => esc_url($hotspot['url']),
                'targetSceneId' => sanitize_text_field($hotspot['targetSceneId']),
                'icon' => sanitize_text_field($hotspot['icon'])
            );
        }
        
        return $sanitized;
    }
}

// Initialize the class
new VX_Admin_Ajax();