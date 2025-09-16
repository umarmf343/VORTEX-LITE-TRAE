<?php
/**
 * REST API functionality
 *
 * Handles REST API endpoints and AJAX requests for the Vortex360 Lite plugin.
 *
 * @link       https://vortex360.co
 * @since      1.0.0
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * REST API class.
 *
 * This class handles REST API endpoints and AJAX requests for tour management
 * and frontend functionality.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Rest_API {

    /**
     * API namespace.
     *
     * @since    1.0.0
     * @access   private
     * @var      string    $namespace    API namespace.
     */
    private $namespace = 'vortex360/v1';

    /**
     * Initialize the class and set its properties.
     *
     * @since    1.0.0
     */
    public function __construct() {
        // Constructor can be used for initialization if needed
    }

    /**
     * Register REST API routes and AJAX hooks.
     *
     * @since    1.0.0
     */
    public function register_routes() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('wp_ajax_vx_get_tour_data', array($this, 'ajax_get_tour_data'));
        add_action('wp_ajax_nopriv_vx_get_tour_data', array($this, 'ajax_get_tour_data'));
        add_action('wp_ajax_vx_save_tour', array($this, 'ajax_save_tour'));
        add_action('wp_ajax_vx_validate_limits', array($this, 'ajax_validate_limits'));
    }

    /**
     * Register REST API routes.
     *
     * @since    1.0.0
     */
    public function register_rest_routes() {
        // Get tour data
        register_rest_route($this->namespace, '/tours/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array($this, 'get_tour'),
            'permission_callback' => array($this, 'get_tour_permissions_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
            ),
        ));

        // Get tours list
        register_rest_route($this->namespace, '/tours', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array($this, 'get_tours'),
            'permission_callback' => array($this, 'get_tours_permissions_check'),
            'args' => array(
                'per_page' => array(
                    'default' => 10,
                    'sanitize_callback' => 'absint',
                ),
                'page' => array(
                    'default' => 1,
                    'sanitize_callback' => 'absint',
                ),
                'search' => array(
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ));

        // Save tour data (admin only)
        register_rest_route($this->namespace, '/tours/(?P<id>\d+)', array(
            'methods' => WP_REST_Server::EDITABLE,
            'callback' => array($this, 'update_tour'),
            'permission_callback' => array($this, 'update_tour_permissions_check'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
            ),
        ));

        // Get plugin info
        register_rest_route($this->namespace, '/info', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array($this, 'get_plugin_info'),
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Get tour data via REST API.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   WP_REST_Response|WP_Error   Response object or error.
     */
    public function get_tour($request) {
        $tour_id = $request['id'];
        
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vortex_tour') {
            return new WP_Error('tour_not_found', __('Tour not found.', 'vortex360-lite'), array('status' => 404));
        }

        // Check if tour is published or user has permission
        if ($tour->post_status !== 'publish' && !current_user_can('edit_post', $tour_id)) {
            return new WP_Error('tour_not_accessible', __('Tour not accessible.', 'vortex360-lite'), array('status' => 403));
        }

        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            $tour_data = array('scenes' => array());
        }

        $response_data = array(
            'id' => $tour->ID,
            'title' => $tour->post_title,
            'status' => $tour->post_status,
            'date_created' => $tour->post_date,
            'date_modified' => $tour->post_modified,
            'data' => $tour_data
        );

        return new WP_REST_Response($response_data, 200);
    }

    /**
     * Get tours list via REST API.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   WP_REST_Response            Response object.
     */
    public function get_tours($request) {
        $args = array(
            'post_type' => 'vortex_tour',
            'post_status' => 'publish',
            'posts_per_page' => $request['per_page'],
            'paged' => $request['page'],
            'orderby' => 'date',
            'order' => 'DESC'
        );

        if (!empty($request['search'])) {
            $args['s'] = $request['search'];
        }

        // If user can edit posts, include private tours
        if (current_user_can('edit_posts')) {
            $args['post_status'] = array('publish', 'private', 'draft');
        }

        $query = new WP_Query($args);
        $tours = array();

        foreach ($query->posts as $tour) {
            $tour_data = get_post_meta($tour->ID, '_vx_tour_data', true);
            $scene_count = is_array($tour_data) && isset($tour_data['scenes']) ? count($tour_data['scenes']) : 0;

            $tours[] = array(
                'id' => $tour->ID,
                'title' => $tour->post_title,
                'status' => $tour->post_status,
                'date_created' => $tour->post_date,
                'date_modified' => $tour->post_modified,
                'scene_count' => $scene_count,
                'shortcode' => '[vortex360 id="' . $tour->ID . '"]'
            );
        }

        $response = array(
            'tours' => $tours,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages,
            'current_page' => $request['page']
        );

        return new WP_REST_Response($response, 200);
    }

    /**
     * Update tour data via REST API.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   WP_REST_Response|WP_Error   Response object or error.
     */
    public function update_tour($request) {
        $tour_id = $request['id'];
        
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vortex_tour') {
            return new WP_Error('tour_not_found', __('Tour not found.', 'vortex360-lite'), array('status' => 404));
        }

        $tour_data = $request->get_json_params();
        if (empty($tour_data)) {
            return new WP_Error('invalid_data', __('Invalid tour data.', 'vortex360-lite'), array('status' => 400));
        }

        // Validate and sanitize tour data
        $scenes_handler = new VX_Scenes();
        $limits_handler = new VX_Limits_Lite();

        // Check Lite version limits
        if (!$limits_handler->validate_tour_limits($tour_data)) {
            return new WP_Error('limits_exceeded', __('Tour exceeds Lite version limits.', 'vortex360-lite'), array('status' => 400));
        }

        // Validate and sanitize scenes
        if (isset($tour_data['scenes']) && is_array($tour_data['scenes'])) {
            $sanitized_scenes = array();
            foreach ($tour_data['scenes'] as $scene) {
                $validated_scene = $scenes_handler->validate_scene($scene);
                if (is_wp_error($validated_scene)) {
                    return $validated_scene;
                }
                $sanitized_scenes[] = $scenes_handler->sanitize_scene($validated_scene);
            }
            $tour_data['scenes'] = $sanitized_scenes;
        }

        // Save tour data
        $result = update_post_meta($tour_id, '_vx_tour_data', $tour_data);
        
        if ($result === false) {
            return new WP_Error('save_failed', __('Failed to save tour data.', 'vortex360-lite'), array('status' => 500));
        }

        // Update post modified date
        wp_update_post(array(
            'ID' => $tour_id,
            'post_modified' => current_time('mysql'),
            'post_modified_gmt' => current_time('mysql', 1)
        ));

        return new WP_REST_Response(array(
            'success' => true,
            'message' => __('Tour saved successfully.', 'vortex360-lite')
        ), 200);
    }

    /**
     * Get plugin information.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   WP_REST_Response            Response object.
     */
    public function get_plugin_info($request) {
        $limits_handler = new VX_Limits_Lite();
        
        return new WP_REST_Response(array(
            'version' => VORTEX360_LITE_VERSION,
            'name' => 'Vortex360 Lite',
            'limits' => $limits_handler->get_limits(),
            'features' => array(
                'max_scenes' => 5,
                'max_hotspots_per_scene' => 5,
                'hotspot_types' => array('info', 'link', 'scene'),
                'supported_formats' => array('equirectangular'),
                'mobile_support' => true,
                'gyroscope' => true
            )
        ), 200);
    }

    /**
     * AJAX handler for getting tour data.
     *
     * @since    1.0.0
     */
    public function ajax_get_tour_data() {
        // Verify nonce for security
        if (!wp_verify_nonce($_POST['nonce'], 'vx_ajax_nonce')) {
            wp_die(__('Security check failed.', 'vortex360-lite'));
        }

        $tour_id = intval($_POST['tour_id']);
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID.', 'vortex360-lite'));
        }

        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vortex_tour') {
            wp_send_json_error(__('Tour not found.', 'vortex360-lite'));
        }

        // Check permissions
        if ($tour->post_status !== 'publish' && !current_user_can('read_post', $tour_id)) {
            wp_send_json_error(__('Access denied.', 'vortex360-lite'));
        }

        $tour_data = get_post_meta($tour_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            $tour_data = array('scenes' => array());
        }

        wp_send_json_success(array(
            'tour' => array(
                'id' => $tour->ID,
                'title' => $tour->post_title,
                'data' => $tour_data
            )
        ));
    }

    /**
     * AJAX handler for saving tour data.
     *
     * @since    1.0.0
     */
    public function ajax_save_tour() {
        // Verify nonce for security
        if (!wp_verify_nonce($_POST['nonce'], 'vx_ajax_nonce')) {
            wp_die(__('Security check failed.', 'vortex360-lite'));
        }

        $tour_id = intval($_POST['tour_id']);
        if (!$tour_id || !current_user_can('edit_post', $tour_id)) {
            wp_send_json_error(__('Permission denied.', 'vortex360-lite'));
        }

        $tour_data = json_decode(stripslashes($_POST['tour_data']), true);
        if (!$tour_data) {
            wp_send_json_error(__('Invalid tour data.', 'vortex360-lite'));
        }

        // Validate limits
        $limits_handler = new VX_Limits_Lite();
        if (!$limits_handler->validate_tour_limits($tour_data)) {
            wp_send_json_error(__('Tour exceeds Lite version limits.', 'vortex360-lite'));
        }

        // Save tour data
        $result = update_post_meta($tour_id, '_vx_tour_data', $tour_data);
        
        if ($result !== false) {
            wp_send_json_success(__('Tour saved successfully.', 'vortex360-lite'));
        } else {
            wp_send_json_error(__('Failed to save tour.', 'vortex360-lite'));
        }
    }

    /**
     * AJAX handler for validating limits.
     *
     * @since    1.0.0
     */
    public function ajax_validate_limits() {
        // Verify nonce for security
        if (!wp_verify_nonce($_POST['nonce'], 'vx_ajax_nonce')) {
            wp_die(__('Security check failed.', 'vortex360-lite'));
        }

        if (!current_user_can('edit_posts')) {
            wp_send_json_error(__('Permission denied.', 'vortex360-lite'));
        }

        $tour_data = json_decode(stripslashes($_POST['tour_data']), true);
        if (!$tour_data) {
            wp_send_json_error(__('Invalid data.', 'vortex360-lite'));
        }

        $limits_handler = new VX_Limits_Lite();
        $validation = $limits_handler->validate_tour_limits($tour_data, true);
        
        if ($validation === true) {
            wp_send_json_success(__('Limits validation passed.', 'vortex360-lite'));
        } else {
            wp_send_json_error($validation);
        }
    }

    /**
     * Permission check for getting tour data.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   bool                        Whether user has permission.
     */
    public function get_tour_permissions_check($request) {
        $tour_id = $request['id'];
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vortex_tour') {
            return false;
        }

        // Public tours can be accessed by anyone
        if ($tour->post_status === 'publish') {
            return true;
        }

        // Private/draft tours require edit permission
        return current_user_can('read_post', $tour_id);
    }

    /**
     * Permission check for getting tours list.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   bool                        Whether user has permission.
     */
    public function get_tours_permissions_check($request) {
        return true; // Public endpoint, but will filter results based on permissions
    }

    /**
     * Permission check for updating tour data.
     *
     * @since    1.0.0
     * @param    WP_REST_Request $request    Request object.
     * @return   bool                        Whether user has permission.
     */
    public function update_tour_permissions_check($request) {
        $tour_id = $request['id'];
        return current_user_can('edit_post', $tour_id);
    }

    /**
     * Get API namespace.
     *
     * @since    1.0.0
     * @return   string    API namespace.
     */
    public function get_namespace() {
        return $this->namespace;
    }
}