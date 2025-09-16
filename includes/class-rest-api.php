<?php
/**
 * REST API endpoints class for Vortex360 Lite
 * Handles API routes and AJAX functionality for frontend integration
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * REST API class for handling frontend data requests
 */
class Vortex360_Lite_REST_API {
    
    /**
     * API namespace
     * @var string
     */
    private $namespace = 'vortex360-lite/v1';
    
    /**
     * Constructor
     */
    public function __construct() {
        // Register REST API routes
        add_action('rest_api_init', array($this, 'register_routes'));
        
        // Register public AJAX endpoints (for non-logged-in users)
        add_action('wp_ajax_nopriv_vortex360_get_tour_data', array($this, 'ajax_get_tour_data'));
        add_action('wp_ajax_vortex360_get_tour_data', array($this, 'ajax_get_tour_data'));
        
        add_action('wp_ajax_nopriv_vortex360_get_scene_data', array($this, 'ajax_get_scene_data'));
        add_action('wp_ajax_vortex360_get_scene_data', array($this, 'ajax_get_scene_data'));
        
        // Analytics endpoints (optional for Lite version)
        add_action('wp_ajax_nopriv_vortex360_track_view', array($this, 'ajax_track_view'));
        add_action('wp_ajax_vortex360_track_view', array($this, 'ajax_track_view'));
    }
    
    /**
     * Register REST API routes
     */
    public function register_routes() {
        // Get tour data
        register_rest_route($this->namespace, '/tours/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_tour_data'),
            'permission_callback' => array($this, 'check_tour_access'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'include_scenes' => array(
                    'default' => true,
                    'sanitize_callback' => 'rest_sanitize_boolean'
                ),
                'include_hotspots' => array(
                    'default' => true,
                    'sanitize_callback' => 'rest_sanitize_boolean'
                )
            )
        ));
        
        // Get scene data
        register_rest_route($this->namespace, '/scenes/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_scene_data'),
            'permission_callback' => array($this, 'check_scene_access'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'include_hotspots' => array(
                    'default' => true,
                    'sanitize_callback' => 'rest_sanitize_boolean'
                )
            )
        ));
        
        // Get hotspot data
        register_rest_route($this->namespace, '/hotspots/(?P<id>\d+)', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_hotspot_data'),
            'permission_callback' => array($this, 'check_hotspot_access'),
            'args' => array(
                'id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                )
            )
        ));
        
        // Track tour views (analytics)
        register_rest_route($this->namespace, '/analytics/view', array(
            'methods' => 'POST',
            'callback' => array($this, 'track_tour_view'),
            'permission_callback' => '__return_true', // Public endpoint
            'args' => array(
                'tour_id' => array(
                    'required' => true,
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'scene_id' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_numeric($param);
                    }
                ),
                'user_agent' => array(
                    'sanitize_callback' => 'sanitize_text_field'
                ),
                'referrer' => array(
                    'sanitize_callback' => 'esc_url_raw'
                )
            )
        ));
    }
    
    /**
     * Get tour data via REST API
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_tour_data($request) {
        $tour_id = absint($request['id']);
        $include_scenes = $request['include_scenes'];
        $include_hotspots = $request['include_hotspots'];
        
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($tour_id);
        
        if (!$tour) {
            return new WP_Error('tour_not_found', 'Tour not found', array('status' => 404));
        }
        
        // Prepare tour data
        $tour_data = array(
            'id' => $tour->id,
            'title' => $tour->title,
            'description' => $tour->description,
            'status' => $tour->status,
            'created_at' => $tour->created_at,
            'updated_at' => $tour->updated_at
        );
        
        // Include scenes if requested
        if ($include_scenes) {
            $scene_manager = new Vortex360_Lite_Scene();
            $scenes = $scene_manager->get_tour_scenes($tour_id, $include_hotspots);
            $tour_data['scenes'] = $this->prepare_scenes_for_api($scenes);
        }
        
        return rest_ensure_response($tour_data);
    }
    
    /**
     * Get scene data via REST API
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_scene_data($request) {
        $scene_id = absint($request['id']);
        $include_hotspots = $request['include_hotspots'];
        
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($scene_id);
        
        if (!$scene) {
            return new WP_Error('scene_not_found', 'Scene not found', array('status' => 404));
        }
        
        // Prepare scene data
        $scene_data = array(
            'id' => $scene->id,
            'tour_id' => $scene->tour_id,
            'title' => $scene->title,
            'description' => $scene->description,
            'image_url' => $scene->image_url,
            'image_type' => $scene->image_type,
            'pitch' => floatval($scene->pitch),
            'yaw' => floatval($scene->yaw),
            'hfov' => floatval($scene->hfov),
            'is_default' => (bool) $scene->is_default,
            'sort_order' => $scene->sort_order,
            'settings' => $scene->settings,
            'created_at' => $scene->created_at,
            'updated_at' => $scene->updated_at
        );
        
        // Include hotspots if requested
        if ($include_hotspots) {
            $hotspot_manager = new Vortex360_Lite_Hotspot();
            $hotspots = $hotspot_manager->get_scene_hotspots($scene_id);
            $scene_data['hotspots'] = $this->prepare_hotspots_for_api($hotspots);
        }
        
        return rest_ensure_response($scene_data);
    }
    
    /**
     * Get hotspot data via REST API
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response|WP_Error Response object
     */
    public function get_hotspot_data($request) {
        $hotspot_id = absint($request['id']);
        
        $hotspot_manager = new Vortex360_Lite_Hotspot();
        $hotspot = $hotspot_manager->get_hotspot_by_id($hotspot_id);
        
        if (!$hotspot) {
            return new WP_Error('hotspot_not_found', 'Hotspot not found', array('status' => 404));
        }
        
        // Prepare hotspot data
        $hotspot_data = array(
            'id' => $hotspot->id,
            'scene_id' => $hotspot->scene_id,
            'type' => $hotspot->type,
            'title' => $hotspot->title,
            'content' => $hotspot->content,
            'target_scene_id' => $hotspot->target_scene_id,
            'target_url' => $hotspot->target_url,
            'pitch' => floatval($hotspot->pitch),
            'yaw' => floatval($hotspot->yaw),
            'scale' => floatval($hotspot->scale),
            'sort_order' => $hotspot->sort_order,
            'settings' => $hotspot->settings,
            'created_at' => $hotspot->created_at,
            'updated_at' => $hotspot->updated_at
        );
        
        return rest_ensure_response($hotspot_data);
    }
    
    /**
     * Track tour view for analytics
     * @param WP_REST_Request $request Request object
     * @return WP_REST_Response Response object
     */
    public function track_tour_view($request) {
        $tour_id = absint($request['tour_id']);
        $scene_id = absint($request['scene_id'] ?? 0);
        $user_agent = sanitize_text_field($request['user_agent'] ?? '');
        $referrer = esc_url_raw($request['referrer'] ?? '');
        
        // Verify tour exists
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($tour_id);
        
        if (!$tour) {
            return new WP_Error('tour_not_found', 'Tour not found', array('status' => 404));
        }
        
        // Only track published tours
        if ($tour->status !== 'published') {
            return rest_ensure_response(array('tracked' => false, 'reason' => 'Tour not published'));
        }
        
        // Simple analytics tracking (can be expanded)
        $this->log_tour_view($tour_id, $scene_id, array(
            'user_agent' => $user_agent,
            'referrer' => $referrer,
            'ip_address' => $this->get_client_ip(),
            'timestamp' => current_time('mysql')
        ));
        
        return rest_ensure_response(array('tracked' => true));
    }
    
    /**
     * Check tour access permission
     * @param WP_REST_Request $request Request object
     * @return bool True if access allowed
     */
    public function check_tour_access($request) {
        $tour_id = absint($request['id']);
        
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($tour_id);
        
        if (!$tour) {
            return false;
        }
        
        // Published tours are publicly accessible
        if ($tour->status === 'published') {
            return true;
        }
        
        // Draft tours are only accessible by owner or admin
        $current_user_id = get_current_user_id();
        if ($tour->created_by == $current_user_id || current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Check scene access permission
     * @param WP_REST_Request $request Request object
     * @return bool True if access allowed
     */
    public function check_scene_access($request) {
        $scene_id = absint($request['id']);
        
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($scene_id);
        
        if (!$scene) {
            return false;
        }
        
        // Check tour access
        $mock_request = new WP_REST_Request();
        $mock_request['id'] = $scene->tour_id;
        
        return $this->check_tour_access($mock_request);
    }
    
    /**
     * Check hotspot access permission
     * @param WP_REST_Request $request Request object
     * @return bool True if access allowed
     */
    public function check_hotspot_access($request) {
        $hotspot_id = absint($request['id']);
        
        $hotspot_manager = new Vortex360_Lite_Hotspot();
        $hotspot = $hotspot_manager->get_hotspot_by_id($hotspot_id);
        
        if (!$hotspot) {
            return false;
        }
        
        // Check scene access
        $mock_request = new WP_REST_Request();
        $mock_request['id'] = $hotspot->scene_id;
        
        return $this->check_scene_access($mock_request);
    }
    
    /**
     * AJAX handler for getting tour data
     */
    public function ajax_get_tour_data() {
        // Verify nonce for logged-in users
        if (is_user_logged_in() && !wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $tour_id = absint($_GET['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }
        
        $include_scenes = (bool) ($_GET['include_scenes'] ?? true);
        $include_hotspots = (bool) ($_GET['include_hotspots'] ?? true);
        
        // Create mock REST request
        $request = new WP_REST_Request();
        $request['id'] = $tour_id;
        $request['include_scenes'] = $include_scenes;
        $request['include_hotspots'] = $include_hotspots;
        
        // Check access
        if (!$this->check_tour_access($request)) {
            wp_send_json_error('Access denied');
        }
        
        $response = $this->get_tour_data($request);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
        }
        
        wp_send_json_success($response->get_data());
    }
    
    /**
     * AJAX handler for getting scene data
     */
    public function ajax_get_scene_data() {
        // Verify nonce for logged-in users
        if (is_user_logged_in() && !wp_verify_nonce($_GET['nonce'] ?? '', 'vortex360_nonce')) {
            wp_die('Security check failed');
        }
        
        $scene_id = absint($_GET['scene_id'] ?? 0);
        if (!$scene_id) {
            wp_send_json_error('Invalid scene ID');
        }
        
        $include_hotspots = (bool) ($_GET['include_hotspots'] ?? true);
        
        // Create mock REST request
        $request = new WP_REST_Request();
        $request['id'] = $scene_id;
        $request['include_hotspots'] = $include_hotspots;
        
        // Check access
        if (!$this->check_scene_access($request)) {
            wp_send_json_error('Access denied');
        }
        
        $response = $this->get_scene_data($request);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
        }
        
        wp_send_json_success($response->get_data());
    }
    
    /**
     * AJAX handler for tracking views
     */
    public function ajax_track_view() {
        $tour_id = absint($_POST['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json_error('Invalid tour ID');
        }
        
        $scene_id = absint($_POST['scene_id'] ?? 0);
        $user_agent = sanitize_text_field($_POST['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '');
        $referrer = esc_url_raw($_POST['referrer'] ?? $_SERVER['HTTP_REFERER'] ?? '');
        
        // Create mock REST request
        $request = new WP_REST_Request();
        $request['tour_id'] = $tour_id;
        $request['scene_id'] = $scene_id;
        $request['user_agent'] = $user_agent;
        $request['referrer'] = $referrer;
        
        $response = $this->track_tour_view($request);
        
        if (is_wp_error($response)) {
            wp_send_json_error($response->get_error_message());
        }
        
        wp_send_json_success($response->get_data());
    }
    
    /**
     * Prepare scenes data for API response
     * @param array $scenes Array of scene objects
     * @return array Prepared scenes data
     */
    private function prepare_scenes_for_api($scenes) {
        $prepared_scenes = array();
        
        foreach ($scenes as $scene) {
            $scene_data = array(
                'id' => $scene->id,
                'title' => $scene->title,
                'description' => $scene->description,
                'image_url' => $scene->image_url,
                'image_type' => $scene->image_type,
                'pitch' => floatval($scene->pitch),
                'yaw' => floatval($scene->yaw),
                'hfov' => floatval($scene->hfov),
                'is_default' => (bool) $scene->is_default,
                'sort_order' => $scene->sort_order,
                'settings' => $scene->settings
            );
            
            // Include hotspots if available
            if (isset($scene->hotspots)) {
                $scene_data['hotspots'] = $this->prepare_hotspots_for_api($scene->hotspots);
            }
            
            $prepared_scenes[] = $scene_data;
        }
        
        return $prepared_scenes;
    }
    
    /**
     * Prepare hotspots data for API response
     * @param array $hotspots Array of hotspot objects
     * @return array Prepared hotspots data
     */
    private function prepare_hotspots_for_api($hotspots) {
        $prepared_hotspots = array();
        
        foreach ($hotspots as $hotspot) {
            $prepared_hotspots[] = array(
                'id' => $hotspot->id,
                'type' => $hotspot->type,
                'title' => $hotspot->title,
                'content' => $hotspot->content,
                'target_scene_id' => $hotspot->target_scene_id,
                'target_url' => $hotspot->target_url,
                'pitch' => floatval($hotspot->pitch),
                'yaw' => floatval($hotspot->yaw),
                'scale' => floatval($hotspot->scale ?? 1),
                'sort_order' => $hotspot->sort_order,
                'settings' => $hotspot->settings
            );
        }
        
        return $prepared_hotspots;
    }
    
    /**
     * Log tour view for analytics
     * @param int $tour_id Tour ID
     * @param int $scene_id Scene ID
     * @param array $data Additional data
     */
    private function log_tour_view($tour_id, $scene_id, $data) {
        // Simple file-based logging for Lite version
        // In Pro version, this could be stored in database
        
        $log_dir = WP_CONTENT_DIR . '/uploads/vortex360-logs';
        if (!file_exists($log_dir)) {
            wp_mkdir_p($log_dir);
        }
        
        $log_file = $log_dir . '/views-' . date('Y-m') . '.log';
        
        $log_entry = array(
            'timestamp' => $data['timestamp'],
            'tour_id' => $tour_id,
            'scene_id' => $scene_id,
            'ip_address' => $data['ip_address'],
            'user_agent' => $data['user_agent'],
            'referrer' => $data['referrer']
        );
        
        $log_line = date('Y-m-d H:i:s') . ' - ' . wp_json_encode($log_entry) . PHP_EOL;
        
        // Append to log file
        file_put_contents($log_file, $log_line, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Get client IP address
     * @return string Client IP address
     */
    private function get_client_ip() {
        $ip_keys = array('HTTP_CLIENT_IP', 'HTTP_X_FORWARDED_FOR', 'REMOTE_ADDR');
        
        foreach ($ip_keys as $key) {
            if (array_key_exists($key, $_SERVER) === true) {
                foreach (explode(',', $_SERVER[$key]) as $ip) {
                    $ip = trim($ip);
                    
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false) {
                        return $ip;
                    }
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}