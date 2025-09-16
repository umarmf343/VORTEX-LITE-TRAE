<?php
/**
 * Lite version limits enforcement
 *
 * Enforces Lite version limitations: 5 scenes per tour, 5 hotspots per scene.
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
 * Lite limits enforcement class.
 *
 * This class enforces the limitations of the Lite version:
 * - Maximum 5 scenes per tour
 * - Maximum 5 hotspots per scene
 * - Only basic hotspot types (info, link, scene)
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Limits_Lite {

    /**
     * Maximum number of scenes allowed in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      int    $max_scenes    Maximum scenes per tour.
     */
    private $max_scenes = 5;

    /**
     * Maximum number of hotspots allowed per scene in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      int    $max_hotspots    Maximum hotspots per scene.
     */
    private $max_hotspots = 5;

    /**
     * Allowed hotspot types in Lite version.
     *
     * @since    1.0.0
     * @access   private
     * @var      array    $allowed_hotspot_types    Allowed hotspot types.
     */
    private $allowed_hotspot_types = array('info', 'link', 'scene');

    /**
     * Initialize the class and set its properties.
     *
     * @since    1.0.0
     */
    public function __construct() {
        add_action('init', array($this, 'init_hooks'));
    }

    /**
     * Initialize hooks.
     *
     * @since    1.0.0
     */
    public function init_hooks() {
        // Hook into save post to enforce limits
        add_action('save_post_vortex_tour', array($this, 'enforce_limits_on_save'), 10, 2);
        
        // Add AJAX handlers for limit checking
        add_action('wp_ajax_vx_check_scene_limit', array($this, 'ajax_check_scene_limit'));
        add_action('wp_ajax_vx_check_hotspot_limit', array($this, 'ajax_check_hotspot_limit'));
        
        // Add admin notices for limit warnings
        add_action('admin_notices', array($this, 'display_limit_notices'));
    }

    /**
     * Enforce limits when saving a tour.
     *
     * @since    1.0.0
     * @param    int     $post_id    The post ID.
     * @param    object  $post       The post object.
     */
    public function enforce_limits_on_save($post_id, $post) {
        // Skip if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Skip if user doesn't have permission
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Get tour data
        $tour_data = get_post_meta($post_id, '_vx_tour_data', true);
        
        if (empty($tour_data) || !is_array($tour_data)) {
            return;
        }

        $modified = false;
        $warnings = array();

        // Enforce scene limit
        if (isset($tour_data['scenes']) && is_array($tour_data['scenes'])) {
            if (count($tour_data['scenes']) > $this->max_scenes) {
                $tour_data['scenes'] = array_slice($tour_data['scenes'], 0, $this->max_scenes);
                $modified = true;
                $warnings[] = sprintf(
                    __('Tour limited to %d scenes. Additional scenes have been removed.', 'vortex360-lite'),
                    $this->max_scenes
                );
            }

            // Enforce hotspot limits for each scene
            foreach ($tour_data['scenes'] as $scene_index => &$scene) {
                if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
                    // Limit number of hotspots
                    if (count($scene['hotspots']) > $this->max_hotspots) {
                        $scene['hotspots'] = array_slice($scene['hotspots'], 0, $this->max_hotspots);
                        $modified = true;
                        $warnings[] = sprintf(
                            __('Scene "%s" limited to %d hotspots. Additional hotspots have been removed.', 'vortex360-lite'),
                            isset($scene['title']) ? $scene['title'] : __('Untitled Scene', 'vortex360-lite'),
                            $this->max_hotspots
                        );
                    }

                    // Filter allowed hotspot types
                    foreach ($scene['hotspots'] as $hotspot_index => &$hotspot) {
                        if (isset($hotspot['type']) && !in_array($hotspot['type'], $this->allowed_hotspot_types)) {
                            $hotspot['type'] = 'info'; // Default to info type
                            $modified = true;
                            $warnings[] = sprintf(
                                __('Hotspot type changed to "info" in scene "%s". Advanced hotspot types are available in Pro version.', 'vortex360-lite'),
                                isset($scene['title']) ? $scene['title'] : __('Untitled Scene', 'vortex360-lite')
                            );
                        }
                    }
                }
            }
        }

        // Save modified data if needed
        if ($modified) {
            update_post_meta($post_id, '_vx_tour_data', $tour_data);
            
            // Store warnings to display later
            if (!empty($warnings)) {
                set_transient('vx_limit_warnings_' . $post_id, $warnings, 300); // 5 minutes
            }
        }
    }

    /**
     * AJAX handler to check scene limit.
     *
     * @since    1.0.0
     */
    public function ajax_check_scene_limit() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }

        $current_count = intval($_POST['current_count']);
        $can_add = $current_count < $this->max_scenes;

        wp_send_json(array(
            'can_add' => $can_add,
            'limit' => $this->max_scenes,
            'current' => $current_count,
            'message' => $can_add ? '' : sprintf(
                __('You have reached the maximum limit of %d scenes in the Lite version. Upgrade to Pro for unlimited scenes.', 'vortex360-lite'),
                $this->max_scenes
            )
        ));
    }

    /**
     * AJAX handler to check hotspot limit.
     *
     * @since    1.0.0
     */
    public function ajax_check_hotspot_limit() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }

        $current_count = intval($_POST['current_count']);
        $can_add = $current_count < $this->max_hotspots;

        wp_send_json(array(
            'can_add' => $can_add,
            'limit' => $this->max_hotspots,
            'current' => $current_count,
            'message' => $can_add ? '' : sprintf(
                __('You have reached the maximum limit of %d hotspots per scene in the Lite version. Upgrade to Pro for unlimited hotspots.', 'vortex360-lite'),
                $this->max_hotspots
            )
        ));
    }

    /**
     * Display limit warning notices in admin.
     *
     * @since    1.0.0
     */
    public function display_limit_notices() {
        $screen = get_current_screen();
        
        if (!$screen || $screen->post_type !== 'vortex_tour') {
            return;
        }

        global $post;
        
        if (!$post) {
            return;
        }

        $warnings = get_transient('vx_limit_warnings_' . $post->ID);
        
        if (!empty($warnings)) {
            foreach ($warnings as $warning) {
                echo '<div class="notice notice-warning is-dismissible"><p>' . esc_html($warning) . '</p></div>';
            }
            
            // Clear the transient after displaying
            delete_transient('vx_limit_warnings_' . $post->ID);
        }
    }

    /**
     * Get maximum scenes limit.
     *
     * @since    1.0.0
     * @return   int    Maximum scenes allowed.
     */
    public function get_max_scenes() {
        return $this->max_scenes;
    }

    /**
     * Get maximum hotspots limit.
     *
     * @since    1.0.0
     * @return   int    Maximum hotspots allowed per scene.
     */
    public function get_max_hotspots() {
        return $this->max_hotspots;
    }

    /**
     * Get allowed hotspot types.
     *
     * @since    1.0.0
     * @return   array    Allowed hotspot types.
     */
    public function get_allowed_hotspot_types() {
        return $this->allowed_hotspot_types;
    }

    /**
     * Check if a scene can be added.
     *
     * @since    1.0.0
     * @param    int     $current_count    Current number of scenes.
     * @return   bool    Whether a scene can be added.
     */
    public function can_add_scene($current_count) {
        return $current_count < $this->max_scenes;
    }

    /**
     * Check if a hotspot can be added to a scene.
     *
     * @since    1.0.0
     * @param    int     $current_count    Current number of hotspots in the scene.
     * @return   bool    Whether a hotspot can be added.
     */
    public function can_add_hotspot($current_count) {
        return $current_count < $this->max_hotspots;
    }

    /**
     * Check if a hotspot type is allowed.
     *
     * @since    1.0.0
     * @param    string  $type    Hotspot type to check.
     * @return   bool    Whether the hotspot type is allowed.
     */
    public function is_hotspot_type_allowed($type) {
        return in_array($type, $this->allowed_hotspot_types);
    }
}

// Initialize the limits class
new VX_Limits_Lite();