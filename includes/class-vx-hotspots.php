<?php
/**
 * Hotspot model and validation
 *
 * Handles hotspot data validation, sanitization, and management.
 * Lite version supports: info, link, and scene hotspot types only.
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
 * Hotspot model class.
 *
 * This class handles hotspot data validation, sanitization, and management
 * for virtual tour hotspots. Lite version supports info, link, and scene types only.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Hotspots {

    /**
     * Allowed hotspot types in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $allowed_types    Allowed hotspot types.
     */
    private $allowed_types = array('info', 'link', 'scene');

    /**
     * Allowed hotspot icons in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $allowed_icons    Allowed hotspot icons.
     */
    private $allowed_icons = array(
        'info', 'question', 'exclamation', 'star', 'heart',
        'home', 'building', 'camera', 'map-marker', 'arrow-right'
    );

    /**
     * Default hotspot settings.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $default_settings    Default hotspot settings.
     */
    private $default_settings = array(
        'type' => 'info',
        'icon' => 'info',
        'yaw' => 0,
        'pitch' => 0
    );

    /**
     * Initialize the class and set its properties.
     *
     * @since    1.0.0
     */
    public function __construct() {
        // Constructor can be used for initialization if needed
    }

    /**
     * Validate hotspot data.
     *
     * @since    1.0.0
     * @param    array   $hotspot_data    Hotspot data to validate.
     * @return   array|WP_Error          Validated hotspot data or WP_Error on failure.
     */
    public function validate_hotspot($hotspot_data) {
        $errors = new WP_Error();

        // Validate required fields
        if (empty($hotspot_data['title'])) {
            $errors->add('missing_title', __('Hotspot title is required.', 'vortex360-lite'));
        }

        // Validate hotspot type
        if (empty($hotspot_data['type']) || !in_array($hotspot_data['type'], $this->allowed_types)) {
            $errors->add('invalid_type', sprintf(
                __('Invalid hotspot type. Allowed types: %s', 'vortex360-lite'),
                implode(', ', $this->allowed_types)
            ));
        }

        // Validate position
        if (!isset($hotspot_data['yaw']) || !is_numeric($hotspot_data['yaw'])) {
            $errors->add('invalid_yaw', __('Hotspot yaw position is required and must be numeric.', 'vortex360-lite'));
        } elseif ($hotspot_data['yaw'] < -180 || $hotspot_data['yaw'] > 180) {
            $errors->add('invalid_yaw_range', __('Hotspot yaw must be between -180 and 180 degrees.', 'vortex360-lite'));
        }

        if (!isset($hotspot_data['pitch']) || !is_numeric($hotspot_data['pitch'])) {
            $errors->add('invalid_pitch', __('Hotspot pitch position is required and must be numeric.', 'vortex360-lite'));
        } elseif ($hotspot_data['pitch'] < -90 || $hotspot_data['pitch'] > 90) {
            $errors->add('invalid_pitch_range', __('Hotspot pitch must be between -90 and 90 degrees.', 'vortex360-lite'));
        }

        // Type-specific validation
        switch ($hotspot_data['type']) {
            case 'link':
                if (empty($hotspot_data['url'])) {
                    $errors->add('missing_url', __('Link hotspot requires a URL.', 'vortex360-lite'));
                } elseif (!filter_var($hotspot_data['url'], FILTER_VALIDATE_URL)) {
                    $errors->add('invalid_url', __('Link hotspot URL is not valid.', 'vortex360-lite'));
                }
                break;
                
            case 'scene':
                if (empty($hotspot_data['targetSceneId'])) {
                    $errors->add('missing_target_scene', __('Scene hotspot requires a target scene ID.', 'vortex360-lite'));
                }
                break;
                
            case 'info':
                // Info hotspots don't require additional validation
                break;
        }

        if ($errors->has_errors()) {
            return $errors;
        }

        return $hotspot_data;
    }

    /**
     * Sanitize hotspot data.
     *
     * @since    1.0.0
     * @param    array   $hotspot_data    Hotspot data to sanitize.
     * @return   array                    Sanitized hotspot data.
     */
    public function sanitize_hotspot($hotspot_data) {
        $sanitized = array();

        // Sanitize basic fields
        $sanitized['id'] = isset($hotspot_data['id']) ? sanitize_key($hotspot_data['id']) : uniqid('hs_');
        $sanitized['title'] = isset($hotspot_data['title']) ? sanitize_text_field($hotspot_data['title']) : '';
        $sanitized['type'] = isset($hotspot_data['type']) && in_array($hotspot_data['type'], $this->allowed_types) 
            ? $hotspot_data['type'] 
            : $this->default_settings['type'];

        // Sanitize position
        $sanitized['yaw'] = isset($hotspot_data['yaw']) ? floatval($hotspot_data['yaw']) : $this->default_settings['yaw'];
        $sanitized['yaw'] = max(-180, min(180, $sanitized['yaw']));
        
        $sanitized['pitch'] = isset($hotspot_data['pitch']) ? floatval($hotspot_data['pitch']) : $this->default_settings['pitch'];
        $sanitized['pitch'] = max(-90, min(90, $sanitized['pitch']));

        // Sanitize icon
        $sanitized['icon'] = isset($hotspot_data['icon']) && in_array($hotspot_data['icon'], $this->allowed_icons)
            ? $hotspot_data['icon']
            : $this->default_settings['icon'];

        // Type-specific sanitization
        switch ($sanitized['type']) {
            case 'info':
                $sanitized['text'] = isset($hotspot_data['text']) ? wp_kses_post($hotspot_data['text']) : '';
                $sanitized['url'] = null;
                $sanitized['targetSceneId'] = null;
                break;
                
            case 'link':
                $sanitized['text'] = isset($hotspot_data['text']) ? wp_kses_post($hotspot_data['text']) : '';
                $sanitized['url'] = isset($hotspot_data['url']) ? esc_url_raw($hotspot_data['url']) : '';
                $sanitized['newTab'] = isset($hotspot_data['newTab']) ? (bool) $hotspot_data['newTab'] : true;
                $sanitized['targetSceneId'] = null;
                break;
                
            case 'scene':
                $sanitized['text'] = isset($hotspot_data['text']) ? wp_kses_post($hotspot_data['text']) : '';
                $sanitized['url'] = null;
                $sanitized['targetSceneId'] = isset($hotspot_data['targetSceneId']) ? sanitize_key($hotspot_data['targetSceneId']) : '';
                break;
        }

        return $sanitized;
    }

    /**
     * Create a new hotspot with default settings.
     *
     * @since    1.0.0
     * @param    string  $type     Hotspot type.
     * @param    string  $title    Hotspot title.
     * @return   array             New hotspot data.
     */
    public function create_hotspot($type = 'info', $title = '') {
        $type = in_array($type, $this->allowed_types) ? $type : $this->default_settings['type'];
        
        $hotspot = array(
            'id' => uniqid('hs_'),
            'title' => $title ?: __('New Hotspot', 'vortex360-lite'),
            'type' => $type,
            'yaw' => $this->default_settings['yaw'],
            'pitch' => $this->default_settings['pitch'],
            'icon' => $this->default_settings['icon']
        );

        // Add type-specific fields
        switch ($type) {
            case 'info':
                $hotspot['text'] = '';
                $hotspot['url'] = null;
                $hotspot['targetSceneId'] = null;
                break;
                
            case 'link':
                $hotspot['text'] = '';
                $hotspot['url'] = '';
                $hotspot['newTab'] = true;
                $hotspot['targetSceneId'] = null;
                break;
                
            case 'scene':
                $hotspot['text'] = '';
                $hotspot['url'] = null;
                $hotspot['targetSceneId'] = '';
                break;
        }

        return $hotspot;
    }

    /**
     * Get allowed hotspot types.
     *
     * @since    1.0.0
     * @return   array    Allowed hotspot types.
     */
    public function get_allowed_types() {
        return $this->allowed_types;
    }

    /**
     * Get allowed hotspot icons.
     *
     * @since    1.0.0
     * @return   array    Allowed hotspot icons.
     */
    public function get_allowed_icons() {
        return $this->allowed_icons;
    }

    /**
     * Get default hotspot settings.
     *
     * @since    1.0.0
     * @return   array    Default hotspot settings.
     */
    public function get_default_settings() {
        return $this->default_settings;
    }

    /**
     * Check if a hotspot type is valid.
     *
     * @since    1.0.0
     * @param    string  $type    Hotspot type to check.
     * @return   bool             Whether the hotspot type is valid.
     */
    public function is_valid_type($type) {
        return in_array($type, $this->allowed_types);
    }

    /**
     * Get hotspot type label.
     *
     * @since    1.0.0
     * @param    string  $type    Hotspot type.
     * @return   string           Hotspot type label.
     */
    public function get_type_label($type) {
        $labels = array(
            'info' => __('Information', 'vortex360-lite'),
            'link' => __('External Link', 'vortex360-lite'),
            'scene' => __('Scene Navigation', 'vortex360-lite')
        );

        return isset($labels[$type]) ? $labels[$type] : $type;
    }

    /**
     * Get hotspot icon label.
     *
     * @since    1.0.0
     * @param    string  $icon    Hotspot icon.
     * @return   string           Hotspot icon label.
     */
    public function get_icon_label($icon) {
        $labels = array(
            'info' => __('Information', 'vortex360-lite'),
            'question' => __('Question', 'vortex360-lite'),
            'exclamation' => __('Exclamation', 'vortex360-lite'),
            'star' => __('Star', 'vortex360-lite'),
            'heart' => __('Heart', 'vortex360-lite'),
            'home' => __('Home', 'vortex360-lite'),
            'building' => __('Building', 'vortex360-lite'),
            'camera' => __('Camera', 'vortex360-lite'),
            'map-marker' => __('Map Marker', 'vortex360-lite'),
            'arrow-right' => __('Arrow Right', 'vortex360-lite')
        );

        return isset($labels[$icon]) ? $labels[$icon] : $icon;
    }

    /**
     * Duplicate a hotspot.
     *
     * @since    1.0.0
     * @param    array   $hotspot_data    Hotspot data to duplicate.
     * @return   array                    Duplicated hotspot data.
     */
    public function duplicate_hotspot($hotspot_data) {
        $duplicated = $hotspot_data;
        
        // Generate new ID
        $duplicated['id'] = uniqid('hs_');
        
        // Update title
        $duplicated['title'] = sprintf(__('%s (Copy)', 'vortex360-lite'), $hotspot_data['title']);
        
        // Slightly offset position to avoid overlap
        $duplicated['yaw'] = $hotspot_data['yaw'] + 10;
        if ($duplicated['yaw'] > 180) {
            $duplicated['yaw'] -= 360;
        }
        
        return $duplicated;
    }

    /**
     * Get hotspot render data for frontend.
     *
     * @since    1.0.0
     * @param    array   $hotspot_data    Hotspot data.
     * @return   array                    Render-ready hotspot data.
     */
    public function get_render_data($hotspot_data) {
        $render_data = array(
            'id' => $hotspot_data['id'],
            'type' => $hotspot_data['type'],
            'yaw' => floatval($hotspot_data['yaw']),
            'pitch' => floatval($hotspot_data['pitch']),
            'title' => $hotspot_data['title'],
            'icon' => $hotspot_data['icon']
        );

        // Add type-specific render data
        switch ($hotspot_data['type']) {
            case 'info':
                $render_data['text'] = isset($hotspot_data['text']) ? $hotspot_data['text'] : '';
                break;
                
            case 'link':
                $render_data['text'] = isset($hotspot_data['text']) ? $hotspot_data['text'] : '';
                $render_data['url'] = isset($hotspot_data['url']) ? $hotspot_data['url'] : '';
                $render_data['newTab'] = isset($hotspot_data['newTab']) ? $hotspot_data['newTab'] : true;
                break;
                
            case 'scene':
                $render_data['text'] = isset($hotspot_data['text']) ? $hotspot_data['text'] : '';
                $render_data['targetSceneId'] = isset($hotspot_data['targetSceneId']) ? $hotspot_data['targetSceneId'] : '';
                break;
        }

        return $render_data;
    }

    /**
     * Check if hotspot icon is valid.
     *
     * @since    1.0.0
     * @param    string  $icon    Icon to check.
     * @return   bool             Whether the icon is valid.
     */
    public function is_valid_icon($icon) {
        return in_array($icon, $this->allowed_icons);
    }
}