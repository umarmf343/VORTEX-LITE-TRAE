<?php
/**
 * Scene model and validation
 *
 * Handles scene data validation, sanitization, and management.
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
 * Scene model class.
 *
 * This class handles scene data validation, sanitization, and management
 * for virtual tour scenes including panorama images and initial view settings.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Scenes {

    /**
     * Allowed scene types in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $allowed_types    Allowed scene types.
     */
    private $allowed_types = array('sphere', 'cube', 'flat', 'little-planet');

    /**
     * Default scene settings.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $default_settings    Default scene settings.
     */
    private $default_settings = array(
        'type' => 'sphere',
        'initView' => array(
            'yaw' => 0,
            'pitch' => 0,
            'fov' => 70
        )
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
     * Validate scene data.
     *
     * @since    1.0.0
     * @param    array   $scene_data    Scene data to validate.
     * @return   array|WP_Error        Validated scene data or WP_Error on failure.
     */
    public function validate_scene($scene_data) {
        $errors = new WP_Error();

        // Validate required fields
        if (empty($scene_data['title'])) {
            $errors->add('missing_title', __('Scene title is required.', 'vortex360-lite'));
        }

        if (empty($scene_data['image']['id']) && empty($scene_data['image']['url'])) {
            $errors->add('missing_image', __('Scene image is required.', 'vortex360-lite'));
        }

        // Validate scene type
        if (isset($scene_data['type']) && !in_array($scene_data['type'], $this->allowed_types)) {
            $errors->add('invalid_type', sprintf(
                __('Invalid scene type. Allowed types: %s', 'vortex360-lite'),
                implode(', ', $this->allowed_types)
            ));
        }

        // Validate initial view settings
        if (isset($scene_data['initView'])) {
            $init_view = $scene_data['initView'];
            
            if (isset($init_view['yaw']) && (!is_numeric($init_view['yaw']) || $init_view['yaw'] < -180 || $init_view['yaw'] > 180)) {
                $errors->add('invalid_yaw', __('Yaw must be a number between -180 and 180.', 'vortex360-lite'));
            }
            
            if (isset($init_view['pitch']) && (!is_numeric($init_view['pitch']) || $init_view['pitch'] < -90 || $init_view['pitch'] > 90)) {
                $errors->add('invalid_pitch', __('Pitch must be a number between -90 and 90.', 'vortex360-lite'));
            }
            
            if (isset($init_view['fov']) && (!is_numeric($init_view['fov']) || $init_view['fov'] < 30 || $init_view['fov'] > 120)) {
                $errors->add('invalid_fov', __('Field of view must be a number between 30 and 120.', 'vortex360-lite'));
            }
        }

        // Validate image data
        if (isset($scene_data['image']['id'])) {
            $attachment = get_post($scene_data['image']['id']);
            if (!$attachment || $attachment->post_type !== 'attachment') {
                $errors->add('invalid_image_id', __('Invalid image attachment ID.', 'vortex360-lite'));
            }
        }

        if ($errors->has_errors()) {
            return $errors;
        }

        return $scene_data;
    }

    /**
     * Sanitize scene data.
     *
     * @since    1.0.0
     * @param    array   $scene_data    Scene data to sanitize.
     * @return   array                  Sanitized scene data.
     */
    public function sanitize_scene($scene_data) {
        $sanitized = array();

        // Sanitize basic fields
        $sanitized['id'] = isset($scene_data['id']) ? sanitize_key($scene_data['id']) : uniqid('scene_');
        $sanitized['title'] = isset($scene_data['title']) ? sanitize_text_field($scene_data['title']) : '';
        $sanitized['type'] = isset($scene_data['type']) && in_array($scene_data['type'], $this->allowed_types) 
            ? $scene_data['type'] 
            : $this->default_settings['type'];

        // Sanitize image data
        if (isset($scene_data['image'])) {
            $sanitized['image'] = array();
            
            if (isset($scene_data['image']['id'])) {
                $sanitized['image']['id'] = absint($scene_data['image']['id']);
                $sanitized['image']['url'] = wp_get_attachment_url($sanitized['image']['id']);
            } elseif (isset($scene_data['image']['url'])) {
                $sanitized['image']['url'] = esc_url_raw($scene_data['image']['url']);
            }
        }

        // Sanitize preview image data
        if (isset($scene_data['previewImage'])) {
            $sanitized['previewImage'] = array();
            
            if (isset($scene_data['previewImage']['id'])) {
                $sanitized['previewImage']['id'] = absint($scene_data['previewImage']['id']);
                $sanitized['previewImage']['url'] = wp_get_attachment_url($sanitized['previewImage']['id']);
            } elseif (isset($scene_data['previewImage']['url'])) {
                $sanitized['previewImage']['url'] = esc_url_raw($scene_data['previewImage']['url']);
            }
        }

        // Sanitize initial view settings
        $sanitized['initView'] = array();
        
        if (isset($scene_data['initView']['yaw'])) {
            $yaw = floatval($scene_data['initView']['yaw']);
            $sanitized['initView']['yaw'] = max(-180, min(180, $yaw));
        } else {
            $sanitized['initView']['yaw'] = $this->default_settings['initView']['yaw'];
        }
        
        if (isset($scene_data['initView']['pitch'])) {
            $pitch = floatval($scene_data['initView']['pitch']);
            $sanitized['initView']['pitch'] = max(-90, min(90, $pitch));
        } else {
            $sanitized['initView']['pitch'] = $this->default_settings['initView']['pitch'];
        }
        
        if (isset($scene_data['initView']['fov'])) {
            $fov = floatval($scene_data['initView']['fov']);
            $sanitized['initView']['fov'] = max(30, min(120, $fov));
        } else {
            $sanitized['initView']['fov'] = $this->default_settings['initView']['fov'];
        }

        // Sanitize hotspots if present
        if (isset($scene_data['hotspots']) && is_array($scene_data['hotspots'])) {
            $hotspots_handler = new VX_Hotspots();
            $sanitized['hotspots'] = array();
            
            foreach ($scene_data['hotspots'] as $hotspot) {
                $sanitized_hotspot = $hotspots_handler->sanitize_hotspot($hotspot);
                if (!empty($sanitized_hotspot)) {
                    $sanitized['hotspots'][] = $sanitized_hotspot;
                }
            }
        } else {
            $sanitized['hotspots'] = array();
        }

        return $sanitized;
    }

    /**
     * Create a new scene with default settings.
     *
     * @since    1.0.0
     * @param    string  $title    Scene title.
     * @return   array             New scene data.
     */
    public function create_scene($title = '') {
        return array(
            'id' => uniqid('scene_'),
            'title' => $title ?: __('New Scene', 'vortex360-lite'),
            'type' => $this->default_settings['type'],
            'image' => array(),
            'previewImage' => array(),
            'initView' => $this->default_settings['initView'],
            'hotspots' => array()
        );
    }

    /**
     * Get allowed scene types.
     *
     * @since    1.0.0
     * @return   array    Allowed scene types.
     */
    public function get_allowed_types() {
        return $this->allowed_types;
    }

    /**
     * Get default scene settings.
     *
     * @since    1.0.0
     * @return   array    Default scene settings.
     */
    public function get_default_settings() {
        return $this->default_settings;
    }

    /**
     * Check if a scene type is valid.
     *
     * @since    1.0.0
     * @param    string  $type    Scene type to check.
     * @return   bool             Whether the scene type is valid.
     */
    public function is_valid_type($type) {
        return in_array($type, $this->allowed_types);
    }

    /**
     * Get scene type label.
     *
     * @since    1.0.0
     * @param    string  $type    Scene type.
     * @return   string           Scene type label.
     */
    public function get_type_label($type) {
        $labels = array(
            'sphere' => __('Spherical (360°)', 'vortex360-lite'),
            'cube' => __('Cubic', 'vortex360-lite'),
            'flat' => __('Flat Image', 'vortex360-lite'),
            'little-planet' => __('Little Planet', 'vortex360-lite')
        );

        return isset($labels[$type]) ? $labels[$type] : $type;
    }

    /**
     * Duplicate a scene.
     *
     * @since    1.0.0
     * @param    array   $scene_data    Scene data to duplicate.
     * @return   array                  Duplicated scene data.
     */
    public function duplicate_scene($scene_data) {
        $duplicated = $scene_data;
        
        // Generate new ID
        $duplicated['id'] = uniqid('scene_');
        
        // Update title
        $duplicated['title'] = sprintf(__('%s (Copy)', 'vortex360-lite'), $scene_data['title']);
        
        // Duplicate hotspots with new IDs
        if (isset($duplicated['hotspots']) && is_array($duplicated['hotspots'])) {
            $hotspots_handler = new VX_Hotspots();
            foreach ($duplicated['hotspots'] as &$hotspot) {
                $hotspot = $hotspots_handler->duplicate_hotspot($hotspot);
            }
        }
        
        return $duplicated;
    }

    /**
     * Get scene thumbnail URL.
     *
     * @since    1.0.0
     * @param    array   $scene_data    Scene data.
     * @param    string  $size          Image size.
     * @return   string                 Thumbnail URL.
     */
    public function get_scene_thumbnail($scene_data, $size = 'thumbnail') {
        // Try preview image first
        if (isset($scene_data['previewImage']['id'])) {
            $thumbnail = wp_get_attachment_image_url($scene_data['previewImage']['id'], $size);
            if ($thumbnail) {
                return $thumbnail;
            }
        }
        
        // Fall back to main image
        if (isset($scene_data['image']['id'])) {
            $thumbnail = wp_get_attachment_image_url($scene_data['image']['id'], $size);
            if ($thumbnail) {
                return $thumbnail;
            }
        }
        
        // Fall back to URLs if IDs not available
        if (isset($scene_data['previewImage']['url'])) {
            return $scene_data['previewImage']['url'];
        }
        
        if (isset($scene_data['image']['url'])) {
            return $scene_data['image']['url'];
        }
        
        // Return placeholder
        return plugin_dir_url(dirname(__FILE__)) . 'assets/img/splash-placeholder.jpg';
    }
}