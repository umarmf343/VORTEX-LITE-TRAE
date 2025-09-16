<?php
/**
 * Admin metabox functionality
 *
 * Handles the tour editing metabox in the WordPress admin.
 *
 * @link       https://vortex360.co
 * @since      1.0.0
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/admin
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin metabox class.
 *
 * This class handles the tour editing metabox interface in the WordPress admin,
 * providing tools for managing scenes, hotspots, and tour settings.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/admin
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_Admin_Metabox {

    /**
     * Initialize the class and set its properties.
     *
     * @since    1.0.0
     */
    public function __construct() {
        // Constructor can be used for initialization if needed
    }

    /**
     * Register metabox hooks.
     *
     * @since    1.0.0
     */
    public function register_hooks() {
        add_action('add_meta_boxes', array($this, 'add_meta_boxes'));
        add_action('save_post', array($this, 'save_tour_data'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }

    /**
     * Add meta boxes.
     *
     * @since    1.0.0
     */
    public function add_meta_boxes() {
        add_meta_box(
            'vx-tour-editor',
            __('Tour Editor', 'vortex360-lite'),
            array($this, 'render_tour_editor'),
            'vortex_tour',
            'normal',
            'high'
        );

        add_meta_box(
            'vx-tour-settings',
            __('Tour Settings', 'vortex360-lite'),
            array($this, 'render_tour_settings'),
            'vortex_tour',
            'side',
            'default'
        );

        add_meta_box(
            'vx-tour-preview',
            __('Tour Preview', 'vortex360-lite'),
            array($this, 'render_tour_preview'),
            'vortex_tour',
            'side',
            'default'
        );

        add_meta_box(
            'vx-tour-shortcode',
            __('Shortcode', 'vortex360-lite'),
            array($this, 'render_shortcode_box'),
            'vortex_tour',
            'side',
            'low'
        );
    }

    /**
     * Enqueue admin scripts and styles.
     *
     * @since    1.0.0
     * @param    string  $hook    Current admin page hook.
     */
    public function enqueue_admin_scripts($hook) {
        global $post_type, $post;

        if ($post_type !== 'vortex_tour') {
            return;
        }

        // Enqueue media uploader
        wp_enqueue_media();

        // Enqueue admin styles
        wp_enqueue_style(
            'vx-admin-metabox',
            plugin_dir_url(dirname(__FILE__)) . 'admin/css/vx-admin-metabox.css',
            array(),
            VORTEX360_LITE_VERSION
        );

        // Enqueue admin scripts
        wp_enqueue_script(
            'vx-admin-metabox',
            plugin_dir_url(dirname(__FILE__)) . 'admin/js/vx-admin-metabox.js',
            array('jquery', 'jquery-ui-sortable', 'jquery-ui-dialog'),
            VORTEX360_LITE_VERSION,
            true
        );

        // Localize script
        $tour_data = array();
        if ($post && $post->ID) {
            $tour_data = get_post_meta($post->ID, '_vx_tour_data', true);
            if (empty($tour_data)) {
                $tour_data = array('scenes' => array());
            }
        }

        $limits_handler = new VX_Limits_Lite();
        
        wp_localize_script('vx-admin-metabox', 'vxAdmin', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_ajax_nonce'),
            'postId' => $post ? $post->ID : 0,
            'tourData' => $tour_data,
            'limits' => $limits_handler->get_limits(),
            'strings' => array(
                'confirmDelete' => __('Are you sure you want to delete this item?', 'vortex360-lite'),
                'sceneTitle' => __('Scene Title', 'vortex360-lite'),
                'hotspotTitle' => __('Hotspot Title', 'vortex360-lite'),
                'selectImage' => __('Select Image', 'vortex360-lite'),
                'useImage' => __('Use This Image', 'vortex360-lite'),
                'saving' => __('Saving...', 'vortex360-lite'),
                'saved' => __('Saved!', 'vortex360-lite'),
                'error' => __('Error occurred', 'vortex360-lite'),
                'limitsExceeded' => __('Lite version limits exceeded', 'vortex360-lite')
            )
        ));
    }

    /**
     * Render tour editor metabox.
     *
     * @since    1.0.0
     * @param    WP_Post $post    Post object.
     */
    public function render_tour_editor($post) {
        wp_nonce_field('vx_save_tour_data', 'vx_tour_nonce');
        
        $tour_data = get_post_meta($post->ID, '_vx_tour_data', true);
        if (empty($tour_data)) {
            $tour_data = array('scenes' => array());
        }

        $limits_handler = new VX_Limits_Lite();
        $limits = $limits_handler->get_limits();
        ?>
        <div id="vx-tour-editor" class="vx-admin-container">
            <!-- Lite Version Notice -->
            <div class="vx-lite-notice">
                <h4><?php _e('Vortex360 Lite Version', 'vortex360-lite'); ?></h4>
                <p><?php printf(
                    __('You are using the Lite version. Limits: %d scenes per tour, %d hotspots per scene.', 'vortex360-lite'),
                    $limits['max_scenes'],
                    $limits['max_hotspots_per_scene']
                ); ?></p>
                <a href="https://vortex360.co/upgrade" target="_blank" class="button button-primary">
                    <?php _e('Upgrade to Pro', 'vortex360-lite'); ?>
                </a>
            </div>

            <!-- Scenes Container -->
            <div class="vx-scenes-container">
                <div class="vx-scenes-header">
                    <h3><?php _e('Scenes', 'vortex360-lite'); ?></h3>
                    <button type="button" id="vx-add-scene" class="button button-primary">
                        <span class="dashicons dashicons-plus-alt"></span>
                        <?php _e('Add Scene', 'vortex360-lite'); ?>
                    </button>
                </div>

                <div id="vx-scenes-list" class="vx-scenes-list">
                    <?php if (!empty($tour_data['scenes'])): ?>
                        <?php foreach ($tour_data['scenes'] as $index => $scene): ?>
                            <?php $this->render_scene_item($scene, $index); ?>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <div class="vx-no-scenes">
                            <p><?php _e('No scenes added yet. Click "Add Scene" to get started.', 'vortex360-lite'); ?></p>
                        </div>
                    <?php endif; ?>
                </div>
            </div>

            <!-- Scene Templates (Hidden) -->
            <script type="text/template" id="vx-scene-template">
                <?php $this->render_scene_template(); ?>
            </script>

            <script type="text/template" id="vx-hotspot-template">
                <?php $this->render_hotspot_template(); ?>
            </script>
        </div>
        <?php
    }

    /**
     * Render individual scene item.
     *
     * @since    1.0.0
     * @param    array   $scene    Scene data.
     * @param    int     $index    Scene index.
     */
    private function render_scene_item($scene, $index) {
        $scene_id = isset($scene['id']) ? $scene['id'] : 'scene_' . uniqid();
        $title = isset($scene['title']) ? $scene['title'] : __('Untitled Scene', 'vortex360-lite');
        $image = isset($scene['image']) ? $scene['image'] : '';
        $hotspots = isset($scene['hotspots']) ? $scene['hotspots'] : array();
        ?>
        <div class="vx-scene-item" data-scene-id="<?php echo esc_attr($scene_id); ?>" data-index="<?php echo esc_attr($index); ?>">
            <div class="vx-scene-header">
                <div class="vx-scene-drag-handle">
                    <span class="dashicons dashicons-menu"></span>
                </div>
                <div class="vx-scene-title-container">
                    <input type="text" class="vx-scene-title" value="<?php echo esc_attr($title); ?>" placeholder="<?php _e('Scene Title', 'vortex360-lite'); ?>">
                </div>
                <div class="vx-scene-actions">
                    <button type="button" class="vx-scene-toggle button">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="vx-scene-duplicate button">
                        <span class="dashicons dashicons-admin-page"></span>
                    </button>
                    <button type="button" class="vx-scene-delete button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>

            <div class="vx-scene-content">
                <div class="vx-scene-image-section">
                    <label><?php _e('360° Image', 'vortex360-lite'); ?></label>
                    <div class="vx-image-upload">
                        <?php if ($image): ?>
                            <div class="vx-image-preview">
                                <img src="<?php echo esc_url($image); ?>" alt="Scene Image">
                                <button type="button" class="vx-remove-image">&times;</button>
                            </div>
                        <?php endif; ?>
                        <button type="button" class="vx-select-image button">
                            <?php echo $image ? __('Change Image', 'vortex360-lite') : __('Select Image', 'vortex360-lite'); ?>
                        </button>
                        <input type="hidden" class="vx-scene-image" value="<?php echo esc_attr($image); ?>">
                    </div>
                </div>

                <div class="vx-scene-settings">
                    <h4><?php _e('Initial View Settings', 'vortex360-lite'); ?></h4>
                    <div class="vx-settings-grid">
                        <div class="vx-setting-item">
                            <label><?php _e('Yaw (Horizontal)', 'vortex360-lite'); ?></label>
                            <input type="number" class="vx-init-yaw" value="<?php echo esc_attr(isset($scene['initView']['yaw']) ? $scene['initView']['yaw'] : 0); ?>" min="-180" max="180" step="1">
                        </div>
                        <div class="vx-setting-item">
                            <label><?php _e('Pitch (Vertical)', 'vortex360-lite'); ?></label>
                            <input type="number" class="vx-init-pitch" value="<?php echo esc_attr(isset($scene['initView']['pitch']) ? $scene['initView']['pitch'] : 0); ?>" min="-90" max="90" step="1">
                        </div>
                        <div class="vx-setting-item">
                            <label><?php _e('Field of View', 'vortex360-lite'); ?></label>
                            <input type="number" class="vx-init-fov" value="<?php echo esc_attr(isset($scene['initView']['fov']) ? $scene['initView']['fov'] : 75); ?>" min="30" max="120" step="1">
                        </div>
                    </div>
                </div>

                <div class="vx-hotspots-section">
                    <div class="vx-hotspots-header">
                        <h4><?php _e('Hotspots', 'vortex360-lite'); ?></h4>
                        <button type="button" class="vx-add-hotspot button button-small">
                            <span class="dashicons dashicons-plus-alt"></span>
                            <?php _e('Add Hotspot', 'vortex360-lite'); ?>
                        </button>
                    </div>
                    <div class="vx-hotspots-list">
                        <?php if (!empty($hotspots)): ?>
                            <?php foreach ($hotspots as $hotspot_index => $hotspot): ?>
                                <?php $this->render_hotspot_item($hotspot, $hotspot_index); ?>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render individual hotspot item.
     *
     * @since    1.0.0
     * @param    array   $hotspot    Hotspot data.
     * @param    int     $index      Hotspot index.
     */
    private function render_hotspot_item($hotspot, $index) {
        $hotspot_id = isset($hotspot['id']) ? $hotspot['id'] : 'hotspot_' . uniqid();
        $title = isset($hotspot['title']) ? $hotspot['title'] : __('Untitled Hotspot', 'vortex360-lite');
        $type = isset($hotspot['type']) ? $hotspot['type'] : 'info';
        ?>
        <div class="vx-hotspot-item" data-hotspot-id="<?php echo esc_attr($hotspot_id); ?>" data-index="<?php echo esc_attr($index); ?>">
            <div class="vx-hotspot-header">
                <div class="vx-hotspot-icon">
                    <span class="dashicons dashicons-location"></span>
                </div>
                <div class="vx-hotspot-title-container">
                    <input type="text" class="vx-hotspot-title" value="<?php echo esc_attr($title); ?>" placeholder="<?php _e('Hotspot Title', 'vortex360-lite'); ?>">
                </div>
                <div class="vx-hotspot-type">
                    <select class="vx-hotspot-type-select">
                        <option value="info" <?php selected($type, 'info'); ?>><?php _e('Info', 'vortex360-lite'); ?></option>
                        <option value="link" <?php selected($type, 'link'); ?>><?php _e('Link', 'vortex360-lite'); ?></option>
                        <option value="scene" <?php selected($type, 'scene'); ?>><?php _e('Scene', 'vortex360-lite'); ?></option>
                    </select>
                </div>
                <div class="vx-hotspot-actions">
                    <button type="button" class="vx-hotspot-toggle button">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="vx-hotspot-delete button">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>

            <div class="vx-hotspot-content">
                <div class="vx-hotspot-position">
                    <h5><?php _e('Position', 'vortex360-lite'); ?></h5>
                    <div class="vx-position-grid">
                        <div class="vx-position-item">
                            <label><?php _e('Yaw', 'vortex360-lite'); ?></label>
                            <input type="number" class="vx-hotspot-yaw" value="<?php echo esc_attr(isset($hotspot['yaw']) ? $hotspot['yaw'] : 0); ?>" min="-180" max="180" step="0.1">
                        </div>
                        <div class="vx-position-item">
                            <label><?php _e('Pitch', 'vortex360-lite'); ?></label>
                            <input type="number" class="vx-hotspot-pitch" value="<?php echo esc_attr(isset($hotspot['pitch']) ? $hotspot['pitch'] : 0); ?>" min="-90" max="90" step="0.1">
                        </div>
                    </div>
                </div>

                <div class="vx-hotspot-settings">
                    <?php $this->render_hotspot_settings($hotspot, $type); ?>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Render hotspot settings based on type.
     *
     * @since    1.0.0
     * @param    array   $hotspot    Hotspot data.
     * @param    string  $type       Hotspot type.
     */
    private function render_hotspot_settings($hotspot, $type) {
        switch ($type) {
            case 'info':
                ?>
                <div class="vx-hotspot-info-settings">
                    <label><?php _e('Info Text', 'vortex360-lite'); ?></label>
                    <textarea class="vx-hotspot-text" rows="3" placeholder="<?php _e('Enter information text...', 'vortex360-lite'); ?>"><?php echo esc_textarea(isset($hotspot['text']) ? $hotspot['text'] : ''); ?></textarea>
                </div>
                <?php
                break;

            case 'link':
                ?>
                <div class="vx-hotspot-link-settings">
                    <div class="vx-setting-item">
                        <label><?php _e('Link URL', 'vortex360-lite'); ?></label>
                        <input type="url" class="vx-hotspot-url" value="<?php echo esc_attr(isset($hotspot['url']) ? $hotspot['url'] : ''); ?>" placeholder="https://example.com">
                    </div>
                    <div class="vx-setting-item">
                        <label>
                            <input type="checkbox" class="vx-hotspot-new-window" <?php checked(isset($hotspot['newWindow']) ? $hotspot['newWindow'] : false); ?>>
                            <?php _e('Open in new window', 'vortex360-lite'); ?>
                        </label>
                    </div>
                </div>
                <?php
                break;

            case 'scene':
                ?>
                <div class="vx-hotspot-scene-settings">
                    <label><?php _e('Target Scene', 'vortex360-lite'); ?></label>
                    <select class="vx-hotspot-target-scene">
                        <option value=""><?php _e('Select Scene', 'vortex360-lite'); ?></option>
                        <!-- Options will be populated by JavaScript -->
                    </select>
                </div>
                <?php
                break;
        }
    }

    /**
     * Render scene template for JavaScript.
     *
     * @since    1.0.0
     */
    private function render_scene_template() {
        // This will be used by JavaScript to create new scenes
        echo '<!-- Scene template content will be generated by JavaScript -->';
    }

    /**
     * Render hotspot template for JavaScript.
     *
     * @since    1.0.0
     */
    private function render_hotspot_template() {
        // This will be used by JavaScript to create new hotspots
        echo '<!-- Hotspot template content will be generated by JavaScript -->';
    }

    /**
     * Render tour settings metabox.
     *
     * @since    1.0.0
     * @param    WP_Post $post    Post object.
     */
    public function render_tour_settings($post) {
        $tour_data = get_post_meta($post->ID, '_vx_tour_data', true);
        $settings = isset($tour_data['settings']) ? $tour_data['settings'] : array();
        ?>
        <div class="vx-tour-settings">
            <div class="vx-setting-group">
                <h4><?php _e('Display Settings', 'vortex360-lite'); ?></h4>
                
                <label>
                    <input type="checkbox" name="vx_settings[autorotate]" value="1" <?php checked(isset($settings['autorotate']) ? $settings['autorotate'] : true); ?>>
                    <?php _e('Auto-rotate', 'vortex360-lite'); ?>
                </label>
                
                <label>
                    <input type="checkbox" name="vx_settings[show_controls]" value="1" <?php checked(isset($settings['show_controls']) ? $settings['show_controls'] : true); ?>>
                    <?php _e('Show controls', 'vortex360-lite'); ?>
                </label>
                
                <label>
                    <input type="checkbox" name="vx_settings[show_fullscreen]" value="1" <?php checked(isset($settings['show_fullscreen']) ? $settings['show_fullscreen'] : true); ?>>
                    <?php _e('Show fullscreen button', 'vortex360-lite'); ?>
                </label>
            </div>

            <div class="vx-setting-group">
                <h4><?php _e('Mobile Settings', 'vortex360-lite'); ?></h4>
                
                <label>
                    <input type="checkbox" name="vx_settings[gyroscope]" value="1" <?php checked(isset($settings['gyroscope']) ? $settings['gyroscope'] : true); ?>>
                    <?php _e('Enable gyroscope', 'vortex360-lite'); ?>
                </label>
                
                <label>
                    <input type="checkbox" name="vx_settings[touch_controls]" value="1" <?php checked(isset($settings['touch_controls']) ? $settings['touch_controls'] : true); ?>>
                    <?php _e('Touch controls', 'vortex360-lite'); ?>
                </label>
            </div>
        </div>
        <?php
    }

    /**
     * Render tour preview metabox.
     *
     * @since    1.0.0
     * @param    WP_Post $post    Post object.
     */
    public function render_tour_preview($post) {
        ?>
        <div class="vx-tour-preview">
            <div id="vx-preview-container" style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd;">
                <p><?php _e('Preview will appear here after saving', 'vortex360-lite'); ?></p>
            </div>
            <div class="vx-preview-actions">
                <button type="button" id="vx-refresh-preview" class="button button-secondary">
                    <?php _e('Refresh Preview', 'vortex360-lite'); ?>
                </button>
            </div>
        </div>
        <?php
    }

    /**
     * Render shortcode metabox.
     *
     * @since    1.0.0
     * @param    WP_Post $post    Post object.
     */
    public function render_shortcode_box($post) {
        $shortcode = '[vortex360 id="' . $post->ID . '"]';
        ?>
        <div class="vx-shortcode-box">
            <p><?php _e('Use this shortcode to embed the tour:', 'vortex360-lite'); ?></p>
            <input type="text" value="<?php echo esc_attr($shortcode); ?>" readonly class="widefat" onclick="this.select();">
            <p class="description">
                <?php _e('Copy and paste this shortcode into any post or page where you want to display the tour.', 'vortex360-lite'); ?>
            </p>
        </div>
        <?php
    }

    /**
     * Save tour data.
     *
     * @since    1.0.0
     * @param    int $post_id    Post ID.
     */
    public function save_tour_data($post_id) {
        // Check if this is an autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        // Check post type
        if (get_post_type($post_id) !== 'vortex_tour') {
            return;
        }

        // Check user permissions
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Verify nonce
        if (!isset($_POST['vx_tour_nonce']) || !wp_verify_nonce($_POST['vx_tour_nonce'], 'vx_save_tour_data')) {
            return;
        }

        // Get existing tour data
        $tour_data = get_post_meta($post_id, '_vx_tour_data', true);
        if (empty($tour_data)) {
            $tour_data = array('scenes' => array());
        }

        // Save settings if provided
        if (isset($_POST['vx_settings'])) {
            $settings = array();
            $settings['autorotate'] = isset($_POST['vx_settings']['autorotate']);
            $settings['show_controls'] = isset($_POST['vx_settings']['show_controls']);
            $settings['show_fullscreen'] = isset($_POST['vx_settings']['show_fullscreen']);
            $settings['gyroscope'] = isset($_POST['vx_settings']['gyroscope']);
            $settings['touch_controls'] = isset($_POST['vx_settings']['touch_controls']);
            
            $tour_data['settings'] = $settings;
        }

        // Update tour data
        update_post_meta($post_id, '_vx_tour_data', $tour_data);
    }
}