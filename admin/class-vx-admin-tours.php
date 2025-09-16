<?php
/**
 * Vortex360 Lite - Admin Tours Management
 * 
 * Handles tour creation, editing, and management in WordPress admin
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin tours management class.
 * Handles tour CRUD operations and admin interface.
 */
class VX_Admin_Tours {
    
    /**
     * Current tour being edited.
     * @var WP_Post|null
     */
    private $current_tour = null;
    
    /**
     * Tour meta fields configuration.
     * @var array
     */
    private $meta_fields = [];
    
    /**
     * Initialize tours management.
     * Sets up hooks and meta field definitions.
     */
    public function __construct() {
        $this->setup_meta_fields();
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for tour management.
     */
    private function init_hooks() {
        add_action('add_meta_boxes', [$this, 'add_meta_boxes']);
        add_action('save_post', [$this, 'save_tour_meta']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('wp_ajax_vx_save_tour_data', [$this, 'ajax_save_tour_data']);
        add_action('wp_ajax_vx_upload_tour_image', [$this, 'ajax_upload_tour_image']);
        add_action('wp_ajax_vx_delete_tour_image', [$this, 'ajax_delete_tour_image']);
        add_action('wp_ajax_vx_duplicate_tour', [$this, 'ajax_duplicate_tour']);
        add_action('wp_ajax_vx_preview_tour', [$this, 'ajax_preview_tour']);
        add_action('wp_ajax_vx_validate_tour', [$this, 'ajax_validate_tour']);
        
        // List table customizations
        add_filter('manage_vx_tour_posts_columns', [$this, 'add_custom_columns']);
        add_action('manage_vx_tour_posts_custom_column', [$this, 'render_custom_columns'], 10, 2);
        add_filter('manage_edit-vx_tour_sortable_columns', [$this, 'add_sortable_columns']);
        
        // Row actions
        add_filter('post_row_actions', [$this, 'add_row_actions'], 10, 2);
        
        // Bulk actions
        add_filter('bulk_actions-edit-vx_tour', [$this, 'add_bulk_actions']);
        add_filter('handle_bulk_actions-edit-vx_tour', [$this, 'handle_bulk_actions'], 10, 3);
        
        // Admin notices
        add_action('admin_notices', [$this, 'show_admin_notices']);
        
        // Post states
        add_filter('display_post_states', [$this, 'add_post_states'], 10, 2);
    }
    
    /**
     * Set up meta fields configuration.
     * Defines all tour meta fields and their properties.
     */
    private function setup_meta_fields() {
        $this->meta_fields = [
            'tour_settings' => [
                'title' => __('Tour Settings', 'vortex360-lite'),
                'fields' => [
                    'width' => [
                        'label' => __('Width', 'vortex360-lite'),
                        'type' => 'text',
                        'default' => '100%',
                        'description' => __('Tour viewer width (e.g., 100%, 800px)', 'vortex360-lite')
                    ],
                    'height' => [
                        'label' => __('Height', 'vortex360-lite'),
                        'type' => 'text',
                        'default' => '400px',
                        'description' => __('Tour viewer height (e.g., 400px, 50vh)', 'vortex360-lite')
                    ],
                    'auto_rotate' => [
                        'label' => __('Auto Rotate', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => false,
                        'description' => __('Automatically rotate the view', 'vortex360-lite')
                    ],
                    'auto_rotate_speed' => [
                        'label' => __('Rotation Speed', 'vortex360-lite'),
                        'type' => 'range',
                        'min' => 0.1,
                        'max' => 5.0,
                        'step' => 0.1,
                        'default' => 1.0,
                        'description' => __('Auto rotation speed (0.1 - 5.0)', 'vortex360-lite')
                    ],
                    'enable_zoom' => [
                        'label' => __('Enable Zoom', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => true,
                        'description' => __('Allow users to zoom in/out', 'vortex360-lite')
                    ],
                    'zoom_min' => [
                        'label' => __('Minimum Zoom', 'vortex360-lite'),
                        'type' => 'number',
                        'min' => 0.1,
                        'max' => 1.0,
                        'step' => 0.1,
                        'default' => 0.5,
                        'description' => __('Minimum zoom level', 'vortex360-lite')
                    ],
                    'zoom_max' => [
                        'label' => __('Maximum Zoom', 'vortex360-lite'),
                        'type' => 'number',
                        'min' => 1.0,
                        'max' => 10.0,
                        'step' => 0.1,
                        'default' => 3.0,
                        'description' => __('Maximum zoom level', 'vortex360-lite')
                    ],
                    'enable_fullscreen' => [
                        'label' => __('Enable Fullscreen', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => true,
                        'description' => __('Show fullscreen button', 'vortex360-lite')
                    ],
                    'enable_gyroscope' => [
                        'label' => __('Enable Gyroscope', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => true,
                        'description' => __('Use device gyroscope on mobile', 'vortex360-lite')
                    ],
                    'show_scene_list' => [
                        'label' => __('Show Scene List', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => true,
                        'description' => __('Display scene navigation list', 'vortex360-lite')
                    ],
                    'show_info_panel' => [
                        'label' => __('Show Info Panel', 'vortex360-lite'),
                        'type' => 'checkbox',
                        'default' => true,
                        'description' => __('Display tour information panel', 'vortex360-lite')
                    ]
                ]
            ],
            'tour_data' => [
                'title' => __('Tour Data', 'vortex360-lite'),
                'fields' => [
                    'scenes' => [
                        'label' => __('Scenes', 'vortex360-lite'),
                        'type' => 'scenes_manager',
                        'default' => [],
                        'description' => __('Manage tour scenes and hotspots', 'vortex360-lite')
                    ],
                    'initial_scene' => [
                        'label' => __('Initial Scene', 'vortex360-lite'),
                        'type' => 'select',
                        'options' => 'dynamic_scenes',
                        'default' => '',
                        'description' => __('Scene to show when tour loads', 'vortex360-lite')
                    ],
                    'tour_description' => [
                        'label' => __('Tour Description', 'vortex360-lite'),
                        'type' => 'textarea',
                        'default' => '',
                        'description' => __('Brief description of the tour', 'vortex360-lite')
                    ]
                ]
            ],
            'seo_settings' => [
                'title' => __('SEO Settings', 'vortex360-lite'),
                'fields' => [
                    'meta_title' => [
                        'label' => __('Meta Title', 'vortex360-lite'),
                        'type' => 'text',
                        'default' => '',
                        'description' => __('Custom title for search engines', 'vortex360-lite')
                    ],
                    'meta_description' => [
                        'label' => __('Meta Description', 'vortex360-lite'),
                        'type' => 'textarea',
                        'default' => '',
                        'description' => __('Description for search engines (max 160 chars)', 'vortex360-lite')
                    ],
                    'og_image' => [
                        'label' => __('Social Share Image', 'vortex360-lite'),
                        'type' => 'image',
                        'default' => '',
                        'description' => __('Image for social media sharing', 'vortex360-lite')
                    ]
                ]
            ]
        ];
    }
    
    /**
     * Add meta boxes to tour edit screen.
     * Registers meta boxes for tour configuration.
     */
    public function add_meta_boxes() {
        $screen = get_current_screen();
        
        if ($screen->post_type !== 'vx_tour') {
            return;
        }
        
        // Tour settings meta box
        add_meta_box(
            'vx-tour-settings',
            __('Tour Settings', 'vortex360-lite'),
            [$this, 'render_tour_settings_meta_box'],
            'vx_tour',
            'normal',
            'high'
        );
        
        // Scenes manager meta box
        add_meta_box(
            'vx-scenes-manager',
            __('Scenes Manager', 'vortex360-lite'),
            [$this, 'render_scenes_manager_meta_box'],
            'vx_tour',
            'normal',
            'high'
        );
        
        // SEO settings meta box
        add_meta_box(
            'vx-seo-settings',
            __('SEO Settings', 'vortex360-lite'),
            [$this, 'render_seo_settings_meta_box'],
            'vx_tour',
            'side',
            'default'
        );
        
        // Tour preview meta box
        add_meta_box(
            'vx-tour-preview',
            __('Tour Preview', 'vortex360-lite'),
            [$this, 'render_tour_preview_meta_box'],
            'vx_tour',
            'side',
            'default'
        );
        
        // Shortcode meta box
        add_meta_box(
            'vx-tour-shortcode',
            __('Shortcode', 'vortex360-lite'),
            [$this, 'render_shortcode_meta_box'],
            'vx_tour',
            'side',
            'default'
        );
        
        // Pro features meta box
        add_meta_box(
            'vx-pro-features',
            __('Pro Features', 'vortex360-lite'),
            [$this, 'render_pro_features_meta_box'],
            'vx_tour',
            'side',
            'low'
        );
    }
    
    /**
     * Render tour settings meta box.
     * Displays basic tour configuration options.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_tour_settings_meta_box($post) {
        wp_nonce_field('vx_save_tour_meta', 'vx_tour_meta_nonce');
        
        $settings = get_post_meta($post->ID, '_vx_tour_settings', true);
        if (!is_array($settings)) {
            $settings = [];
        }
        
        echo '<div class="vx-meta-box-content">';
        
        foreach ($this->meta_fields['tour_settings']['fields'] as $field_id => $field_config) {
            $value = isset($settings[$field_id]) ? $settings[$field_id] : $field_config['default'];
            $this->render_meta_field($field_id, $field_config, $value, 'tour_settings');
        }
        
        echo '</div>';
    }
    
    /**
     * Render scenes manager meta box.
     * Displays interface for managing tour scenes and hotspots.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_scenes_manager_meta_box($post) {
        $scenes = get_post_meta($post->ID, '_vx_tour_scenes', true);
        if (!is_array($scenes)) {
            $scenes = [];
        }
        
        ?>
        <div class="vx-scenes-manager">
            <div class="vx-scenes-header">
                <h4><?php _e('Tour Scenes', 'vortex360-lite'); ?></h4>
                <button type="button" class="button button-primary vx-add-scene">
                    <?php _e('Add Scene', 'vortex360-lite'); ?>
                </button>
            </div>
            
            <div class="vx-scenes-list" id="vx-scenes-list">
                <?php if (empty($scenes)): ?>
                    <div class="vx-no-scenes">
                        <p><?php _e('No scenes added yet. Click "Add Scene" to get started.', 'vortex360-lite'); ?></p>
                    </div>
                <?php else: ?>
                    <?php foreach ($scenes as $index => $scene): ?>
                        <?php $this->render_scene_item($scene, $index); ?>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
            
            <div class="vx-scenes-limit-notice">
                <p class="description">
                    <?php printf(
                        __('Lite version supports up to %d scenes. %sUpgrade to Pro%s for unlimited scenes.', 'vortex360-lite'),
                        3,
                        '<a href="#" class="vx-upgrade-link">',
                        '</a>'
                    ); ?>
                </p>
            </div>
        </div>
        
        <!-- Scene template -->
        <script type="text/template" id="vx-scene-template">
            <?php $this->render_scene_template(); ?>
        </script>
        
        <!-- Hotspot template -->
        <script type="text/template" id="vx-hotspot-template">
            <?php $this->render_hotspot_template(); ?>
        </script>
        <?php
    }
    
    /**
     * Render individual scene item.
     * Displays a single scene configuration interface.
     * 
     * @param array $scene Scene data
     * @param int $index Scene index
     */
    private function render_scene_item($scene, $index) {
        $scene = wp_parse_args($scene, [
            'id' => '',
            'title' => '',
            'image' => '',
            'initial_view' => ['yaw' => 0, 'pitch' => 0, 'fov' => 90],
            'hotspots' => []
        ]);
        
        ?>
        <div class="vx-scene-item" data-scene-index="<?php echo esc_attr($index); ?>">
            <div class="vx-scene-header">
                <div class="vx-scene-drag-handle">
                    <span class="dashicons dashicons-menu"></span>
                </div>
                <div class="vx-scene-title">
                    <input type="text" 
                           name="scenes[<?php echo esc_attr($index); ?>][title]" 
                           value="<?php echo esc_attr($scene['title']); ?>" 
                           placeholder="<?php _e('Scene Title', 'vortex360-lite'); ?>" 
                           class="vx-scene-title-input" />
                </div>
                <div class="vx-scene-actions">
                    <button type="button" class="button vx-toggle-scene">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="button vx-duplicate-scene" title="<?php _e('Duplicate Scene', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-admin-page"></span>
                    </button>
                    <button type="button" class="button vx-delete-scene" title="<?php _e('Delete Scene', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="vx-scene-content">
                <div class="vx-scene-image-section">
                    <label><?php _e('360° Image', 'vortex360-lite'); ?></label>
                    <div class="vx-image-upload">
                        <input type="hidden" 
                               name="scenes[<?php echo esc_attr($index); ?>][image]" 
                               value="<?php echo esc_attr($scene['image']); ?>" 
                               class="vx-scene-image-input" />
                        
                        <div class="vx-image-preview <?php echo empty($scene['image']) ? 'vx-no-image' : ''; ?>">
                            <?php if (!empty($scene['image'])): ?>
                                <img src="<?php echo esc_url($scene['image']); ?>" alt="Scene Image" />
                            <?php endif; ?>
                        </div>
                        
                        <div class="vx-image-actions">
                            <button type="button" class="button vx-upload-image">
                                <?php _e('Upload Image', 'vortex360-lite'); ?>
                            </button>
                            <button type="button" class="button vx-remove-image" <?php echo empty($scene['image']) ? 'style="display:none;"' : ''; ?>>
                                <?php _e('Remove', 'vortex360-lite'); ?>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="vx-scene-settings">
                    <div class="vx-setting-group">
                        <label><?php _e('Initial View', 'vortex360-lite'); ?></label>
                        <div class="vx-view-controls">
                            <div class="vx-control">
                                <label><?php _e('Yaw', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[<?php echo esc_attr($index); ?>][initial_view][yaw]" 
                                       value="<?php echo esc_attr($scene['initial_view']['yaw']); ?>" 
                                       min="-180" max="180" step="1" />
                            </div>
                            <div class="vx-control">
                                <label><?php _e('Pitch', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[<?php echo esc_attr($index); ?>][initial_view][pitch]" 
                                       value="<?php echo esc_attr($scene['initial_view']['pitch']); ?>" 
                                       min="-90" max="90" step="1" />
                            </div>
                            <div class="vx-control">
                                <label><?php _e('FOV', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[<?php echo esc_attr($index); ?>][initial_view][fov]" 
                                       value="<?php echo esc_attr($scene['initial_view']['fov']); ?>" 
                                       min="30" max="120" step="1" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="vx-hotspots-section">
                    <div class="vx-hotspots-header">
                        <label><?php _e('Hotspots', 'vortex360-lite'); ?></label>
                        <button type="button" class="button button-small vx-add-hotspot">
                            <?php _e('Add Hotspot', 'vortex360-lite'); ?>
                        </button>
                    </div>
                    
                    <div class="vx-hotspots-list">
                        <?php if (!empty($scene['hotspots'])): ?>
                            <?php foreach ($scene['hotspots'] as $hotspot_index => $hotspot): ?>
                                <?php $this->render_hotspot_item($hotspot, $index, $hotspot_index); ?>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                    
                    <div class="vx-hotspots-limit-notice">
                        <p class="description">
                            <?php printf(
                                __('Lite version supports up to %d hotspots per scene.', 'vortex360-lite'),
                                5
                            ); ?>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render individual hotspot item.
     * Displays a single hotspot configuration interface.
     * 
     * @param array $hotspot Hotspot data
     * @param int $scene_index Scene index
     * @param int $hotspot_index Hotspot index
     */
    private function render_hotspot_item($hotspot, $scene_index, $hotspot_index) {
        $hotspot = wp_parse_args($hotspot, [
            'id' => '',
            'type' => 'info',
            'title' => '',
            'content' => '',
            'position' => ['yaw' => 0, 'pitch' => 0],
            'target_scene' => '',
            'url' => '',
            'icon' => 'info'
        ]);
        
        ?>
        <div class="vx-hotspot-item" data-hotspot-index="<?php echo esc_attr($hotspot_index); ?>">
            <div class="vx-hotspot-header">
                <div class="vx-hotspot-drag-handle">
                    <span class="dashicons dashicons-menu"></span>
                </div>
                <div class="vx-hotspot-title">
                    <input type="text" 
                           name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][title]" 
                           value="<?php echo esc_attr($hotspot['title']); ?>" 
                           placeholder="<?php _e('Hotspot Title', 'vortex360-lite'); ?>" 
                           class="vx-hotspot-title-input" />
                </div>
                <div class="vx-hotspot-actions">
                    <button type="button" class="button vx-toggle-hotspot">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="button vx-delete-hotspot" title="<?php _e('Delete Hotspot', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="vx-hotspot-content">
                <div class="vx-hotspot-settings">
                    <div class="vx-setting-row">
                        <div class="vx-setting-col">
                            <label><?php _e('Type', 'vortex360-lite'); ?></label>
                            <select name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][type]" 
                                    class="vx-hotspot-type">
                                <option value="info" <?php selected($hotspot['type'], 'info'); ?>>
                                    <?php _e('Information', 'vortex360-lite'); ?>
                                </option>
                                <option value="scene" <?php selected($hotspot['type'], 'scene'); ?>>
                                    <?php _e('Scene Link', 'vortex360-lite'); ?>
                                </option>
                                <option value="url" <?php selected($hotspot['type'], 'url'); ?>>
                                    <?php _e('External Link', 'vortex360-lite'); ?>
                                </option>
                            </select>
                        </div>
                        <div class="vx-setting-col">
                            <label><?php _e('Icon', 'vortex360-lite'); ?></label>
                            <select name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][icon]">
                                <option value="info" <?php selected($hotspot['icon'], 'info'); ?>>
                                    <?php _e('Info', 'vortex360-lite'); ?>
                                </option>
                                <option value="arrow" <?php selected($hotspot['icon'], 'arrow'); ?>>
                                    <?php _e('Arrow', 'vortex360-lite'); ?>
                                </option>
                                <option value="eye" <?php selected($hotspot['icon'], 'eye'); ?>>
                                    <?php _e('Eye', 'vortex360-lite'); ?>
                                </option>
                                <option value="link" <?php selected($hotspot['icon'], 'link'); ?>>
                                    <?php _e('Link', 'vortex360-lite'); ?>
                                </option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="vx-setting-row">
                        <div class="vx-setting-col">
                            <label><?php _e('Position Yaw', 'vortex360-lite'); ?></label>
                            <input type="number" 
                                   name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][position][yaw]" 
                                   value="<?php echo esc_attr($hotspot['position']['yaw']); ?>" 
                                   min="-180" max="180" step="1" />
                        </div>
                        <div class="vx-setting-col">
                            <label><?php _e('Position Pitch', 'vortex360-lite'); ?></label>
                            <input type="number" 
                                   name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][position][pitch]" 
                                   value="<?php echo esc_attr($hotspot['position']['pitch']); ?>" 
                                   min="-90" max="90" step="1" />
                        </div>
                    </div>
                    
                    <div class="vx-hotspot-type-content">
                        <div class="vx-type-info" <?php echo $hotspot['type'] !== 'info' ? 'style="display:none;"' : ''; ?>>
                            <label><?php _e('Content', 'vortex360-lite'); ?></label>
                            <textarea name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][content]" 
                                      rows="3" 
                                      placeholder="<?php _e('Hotspot content...', 'vortex360-lite'); ?>"><?php echo esc_textarea($hotspot['content']); ?></textarea>
                        </div>
                        
                        <div class="vx-type-scene" <?php echo $hotspot['type'] !== 'scene' ? 'style="display:none;"' : ''; ?>>
                            <label><?php _e('Target Scene', 'vortex360-lite'); ?></label>
                            <select name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][target_scene]" 
                                    class="vx-scene-selector">
                                <option value=""><?php _e('Select Scene', 'vortex360-lite'); ?></option>
                                <!-- Options populated by JavaScript -->
                            </select>
                        </div>
                        
                        <div class="vx-type-url" <?php echo $hotspot['type'] !== 'url' ? 'style="display:none;"' : ''; ?>>
                            <label><?php _e('URL', 'vortex360-lite'); ?></label>
                            <input type="url" 
                                   name="scenes[<?php echo esc_attr($scene_index); ?>][hotspots][<?php echo esc_attr($hotspot_index); ?>][url]" 
                                   value="<?php echo esc_attr($hotspot['url']); ?>" 
                                   placeholder="https://example.com" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render scene template for JavaScript.
     * Provides template for dynamically adding new scenes.
     */
    private function render_scene_template() {
        // Template content for new scenes
        // This will be used by JavaScript to create new scene items
        ?>
        <div class="vx-scene-item" data-scene-index="{{index}}">
            <div class="vx-scene-header">
                <div class="vx-scene-drag-handle">
                    <span class="dashicons dashicons-menu"></span>
                </div>
                <div class="vx-scene-title">
                    <input type="text" 
                           name="scenes[{{index}}][title]" 
                           value="" 
                           placeholder="<?php _e('Scene Title', 'vortex360-lite'); ?>" 
                           class="vx-scene-title-input" />
                </div>
                <div class="vx-scene-actions">
                    <button type="button" class="button vx-toggle-scene">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="button vx-duplicate-scene" title="<?php _e('Duplicate Scene', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-admin-page"></span>
                    </button>
                    <button type="button" class="button vx-delete-scene" title="<?php _e('Delete Scene', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="vx-scene-content">
                <div class="vx-scene-image-section">
                    <label><?php _e('360° Image', 'vortex360-lite'); ?></label>
                    <div class="vx-image-upload">
                        <input type="hidden" 
                               name="scenes[{{index}}][image]" 
                               value="" 
                               class="vx-scene-image-input" />
                        
                        <div class="vx-image-preview vx-no-image"></div>
                        
                        <div class="vx-image-actions">
                            <button type="button" class="button vx-upload-image">
                                <?php _e('Upload Image', 'vortex360-lite'); ?>
                            </button>
                            <button type="button" class="button vx-remove-image" style="display:none;">
                                <?php _e('Remove', 'vortex360-lite'); ?>
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="vx-scene-settings">
                    <div class="vx-setting-group">
                        <label><?php _e('Initial View', 'vortex360-lite'); ?></label>
                        <div class="vx-view-controls">
                            <div class="vx-control">
                                <label><?php _e('Yaw', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[{{index}}][initial_view][yaw]" 
                                       value="0" 
                                       min="-180" max="180" step="1" />
                            </div>
                            <div class="vx-control">
                                <label><?php _e('Pitch', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[{{index}}][initial_view][pitch]" 
                                       value="0" 
                                       min="-90" max="90" step="1" />
                            </div>
                            <div class="vx-control">
                                <label><?php _e('FOV', 'vortex360-lite'); ?></label>
                                <input type="number" 
                                       name="scenes[{{index}}][initial_view][fov]" 
                                       value="90" 
                                       min="30" max="120" step="1" />
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="vx-hotspots-section">
                    <div class="vx-hotspots-header">
                        <label><?php _e('Hotspots', 'vortex360-lite'); ?></label>
                        <button type="button" class="button button-small vx-add-hotspot">
                            <?php _e('Add Hotspot', 'vortex360-lite'); ?>
                        </button>
                    </div>
                    
                    <div class="vx-hotspots-list"></div>
                    
                    <div class="vx-hotspots-limit-notice">
                        <p class="description">
                            <?php printf(
                                __('Lite version supports up to %d hotspots per scene.', 'vortex360-lite'),
                                5
                            ); ?>
                        </p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render hotspot template for JavaScript.
     * Provides template for dynamically adding new hotspots.
     */
    private function render_hotspot_template() {
        // Template content for new hotspots
        ?>
        <div class="vx-hotspot-item" data-hotspot-index="{{hotspot_index}}">
            <div class="vx-hotspot-header">
                <div class="vx-hotspot-drag-handle">
                    <span class="dashicons dashicons-menu"></span>
                </div>
                <div class="vx-hotspot-title">
                    <input type="text" 
                           name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][title]" 
                           value="" 
                           placeholder="<?php _e('Hotspot Title', 'vortex360-lite'); ?>" 
                           class="vx-hotspot-title-input" />
                </div>
                <div class="vx-hotspot-actions">
                    <button type="button" class="button vx-toggle-hotspot">
                        <span class="dashicons dashicons-arrow-down"></span>
                    </button>
                    <button type="button" class="button vx-delete-hotspot" title="<?php _e('Delete Hotspot', 'vortex360-lite'); ?>">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            </div>
            
            <div class="vx-hotspot-content">
                <div class="vx-hotspot-settings">
                    <div class="vx-setting-row">
                        <div class="vx-setting-col">
                            <label><?php _e('Type', 'vortex360-lite'); ?></label>
                            <select name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][type]" 
                                    class="vx-hotspot-type">
                                <option value="info"><?php _e('Information', 'vortex360-lite'); ?></option>
                                <option value="scene"><?php _e('Scene Link', 'vortex360-lite'); ?></option>
                                <option value="url"><?php _e('External Link', 'vortex360-lite'); ?></option>
                            </select>
                        </div>
                        <div class="vx-setting-col">
                            <label><?php _e('Icon', 'vortex360-lite'); ?></label>
                            <select name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][icon]">
                                <option value="info"><?php _e('Info', 'vortex360-lite'); ?></option>
                                <option value="arrow"><?php _e('Arrow', 'vortex360-lite'); ?></option>
                                <option value="eye"><?php _e('Eye', 'vortex360-lite'); ?></option>
                                <option value="link"><?php _e('Link', 'vortex360-lite'); ?></option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="vx-setting-row">
                        <div class="vx-setting-col">
                            <label><?php _e('Position Yaw', 'vortex360-lite'); ?></label>
                            <input type="number" 
                                   name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][position][yaw]" 
                                   value="0" 
                                   min="-180" max="180" step="1" />
                        </div>
                        <div class="vx-setting-col">
                            <label><?php _e('Position Pitch', 'vortex360-lite'); ?></label>
                            <input type="number" 
                                   name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][position][pitch]" 
                                   value="0" 
                                   min="-90" max="90" step="1" />
                        </div>
                    </div>
                    
                    <div class="vx-hotspot-type-content">
                        <div class="vx-type-info">
                            <label><?php _e('Content', 'vortex360-lite'); ?></label>
                            <textarea name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][content]" 
                                      rows="3" 
                                      placeholder="<?php _e('Hotspot content...', 'vortex360-lite'); ?>"></textarea>
                        </div>
                        
                        <div class="vx-type-scene" style="display:none;">
                            <label><?php _e('Target Scene', 'vortex360-lite'); ?></label>
                            <select name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][target_scene]" 
                                    class="vx-scene-selector">
                                <option value=""><?php _e('Select Scene', 'vortex360-lite'); ?></option>
                            </select>
                        </div>
                        
                        <div class="vx-type-url" style="display:none;">
                            <label><?php _e('URL', 'vortex360-lite'); ?></label>
                            <input type="url" 
                                   name="scenes[{{scene_index}}][hotspots][{{hotspot_index}}][url]" 
                                   value="" 
                                   placeholder="https://example.com" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render SEO settings meta box.
     * Displays SEO and social media configuration.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_seo_settings_meta_box($post) {
        $seo_settings = get_post_meta($post->ID, '_vx_seo_settings', true);
        if (!is_array($seo_settings)) {
            $seo_settings = [];
        }
        
        echo '<div class="vx-meta-box-content">';
        
        foreach ($this->meta_fields['seo_settings']['fields'] as $field_id => $field_config) {
            $value = isset($seo_settings[$field_id]) ? $seo_settings[$field_id] : $field_config['default'];
            $this->render_meta_field($field_id, $field_config, $value, 'seo_settings');
        }
        
        echo '</div>';
    }
    
    /**
     * Render tour preview meta box.
     * Displays tour preview and quick actions.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_tour_preview_meta_box($post) {
        ?>
        <div class="vx-preview-section">
            <div class="vx-preview-container">
                <div id="vx-tour-preview" class="vx-tour-preview-placeholder">
                    <p><?php _e('Save the tour to see preview', 'vortex360-lite'); ?></p>
                </div>
            </div>
            
            <div class="vx-preview-actions">
                <button type="button" class="button button-secondary vx-refresh-preview">
                    <?php _e('Refresh Preview', 'vortex360-lite'); ?>
                </button>
                <button type="button" class="button button-secondary vx-fullscreen-preview">
                    <?php _e('Fullscreen', 'vortex360-lite'); ?>
                </button>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render shortcode meta box.
     * Displays shortcode for embedding the tour.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_shortcode_meta_box($post) {
        $shortcode = '[vortex360 id="' . $post->ID . '"]';
        
        ?>
        <div class="vx-shortcode-section">
            <p><?php _e('Use this shortcode to embed the tour:', 'vortex360-lite'); ?></p>
            <div class="vx-shortcode-container">
                <input type="text" 
                       value="<?php echo esc_attr($shortcode); ?>" 
                       readonly 
                       class="vx-shortcode-input" 
                       onclick="this.select();" />
                <button type="button" class="button vx-copy-shortcode" title="<?php _e('Copy to clipboard', 'vortex360-lite'); ?>">
                    <span class="dashicons dashicons-clipboard"></span>
                </button>
            </div>
            
            <div class="vx-embed-options">
                <h4><?php _e('Embed Options', 'vortex360-lite'); ?></h4>
                <p class="description"><?php _e('You can customize the tour display with these attributes:', 'vortex360-lite'); ?></p>
                <ul class="vx-attribute-list">
                    <li><code>width="800px"</code> - <?php _e('Set custom width', 'vortex360-lite'); ?></li>
                    <li><code>height="400px"</code> - <?php _e('Set custom height', 'vortex360-lite'); ?></li>
                    <li><code>autoplay="true"</code> - <?php _e('Start auto rotation', 'vortex360-lite'); ?></li>
                    <li><code>scene="scene-id"</code> - <?php _e('Start with specific scene', 'vortex360-lite'); ?></li>
                </ul>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render Pro features meta box.
     * Displays upgrade notice and Pro feature list.
     * 
     * @param WP_Post $post Current post object
     */
    public function render_pro_features_meta_box($post) {
        ?>
        <div class="vx-pro-features">
            <div class="vx-pro-header">
                <h4><?php _e('🚀 Upgrade to Pro', 'vortex360-lite'); ?></h4>
                <p><?php _e('Unlock advanced features:', 'vortex360-lite'); ?></p>
            </div>
            
            <ul class="vx-pro-feature-list">
                <li><?php _e('Unlimited scenes & hotspots', 'vortex360-lite'); ?></li>
                <li><?php _e('VR mode support', 'vortex360-lite'); ?></li>
                <li><?php _e('Advanced analytics', 'vortex360-lite'); ?></li>
                <li><?php _e('Custom branding', 'vortex360-lite'); ?></li>
                <li><?php _e('Audio narration', 'vortex360-lite'); ?></li>
                <li><?php _e('Video hotspots', 'vortex360-lite'); ?></li>
                <li><?php _e('Floor plans', 'vortex360-lite'); ?></li>
                <li><?php _e('White-label solution', 'vortex360-lite'); ?></li>
                <li><?php _e('Priority support', 'vortex360-lite'); ?></li>
            </ul>
            
            <div class="vx-pro-actions">
                <a href="#" class="button button-primary vx-upgrade-btn">
                    <?php _e('Upgrade Now', 'vortex360-lite'); ?>
                </a>
                <a href="#" class="button button-secondary" target="_blank">
                    <?php _e('Learn More', 'vortex360-lite'); ?>
                </a>
            </div>
        </div>
        <?php
    }
    
    /**
     * Render individual meta field.
     * Creates appropriate form input based on field configuration.
     * 
     * @param string $field_id Field identifier
     * @param array $field_config Field configuration
     * @param mixed $value Current value
     * @param string $group Field group
     */
    private function render_meta_field($field_id, $field_config, $value, $group) {
        $name = '_vx_' . $group . '[' . $field_id . ']';
        $type = $field_config['type'];
        
        echo '<div class="vx-meta-field vx-field-' . esc_attr($type) . '">';
        echo '<label for="' . esc_attr($field_id) . '">' . esc_html($field_config['label']) . '</label>';
        
        switch ($type) {
            case 'checkbox':
                printf(
                    '<input type="checkbox" id="%s" name="%s" value="1" %s />',
                    esc_attr($field_id),
                    esc_attr($name),
                    checked($value, true, false)
                );
                break;
                
            case 'select':
                printf('<select id="%s" name="%s">', esc_attr($field_id), esc_attr($name));
                
                if ($field_config['options'] === 'dynamic_scenes') {
                    echo '<option value="">' . __('Select Scene', 'vortex360-lite') . '</option>';
                    // Options will be populated by JavaScript
                } else {
                    foreach ($field_config['options'] as $option_value => $option_label) {
                        printf(
                            '<option value="%s" %s>%s</option>',
                            esc_attr($option_value),
                            selected($value, $option_value, false),
                            esc_html($option_label)
                        );
                    }
                }
                
                echo '</select>';
                break;
                
            case 'range':
                printf(
                    '<input type="range" id="%s" name="%s" value="%s" min="%s" max="%s" step="%s" />',
                    esc_attr($field_id),
                    esc_attr($name),
                    esc_attr($value),
                    esc_attr($field_config['min']),
                    esc_attr($field_config['max']),
                    esc_attr($field_config['step'])
                );
                printf('<span class="vx-range-value">%s</span>', esc_html($value));
                break;
                
            case 'number':
                $min = isset($field_config['min']) ? 'min="' . esc_attr($field_config['min']) . '"' : '';
                $max = isset($field_config['max']) ? 'max="' . esc_attr($field_config['max']) . '"' : '';
                $step = isset($field_config['step']) ? 'step="' . esc_attr($field_config['step']) . '"' : '';
                
                printf(
                    '<input type="number" id="%s" name="%s" value="%s" %s %s %s />',
                    esc_attr($field_id),
                    esc_attr($name),
                    esc_attr($value),
                    $min,
                    $max,
                    $step
                );
                break;
                
            case 'textarea':
                printf(
                    '<textarea id="%s" name="%s" rows="4">%s</textarea>',
                    esc_attr($field_id),
                    esc_attr($name),
                    esc_textarea($value)
                );
                break;
                
            case 'image':
                echo '<div class="vx-image-field">';
                printf(
                    '<input type="hidden" id="%s" name="%s" value="%s" />',
                    esc_attr($field_id),
                    esc_attr($name),
                    esc_attr($value)
                );
                
                echo '<div class="vx-image-preview">';
                if ($value) {
                    printf('<img src="%s" alt="" />', esc_url($value));
                }
                echo '</div>';
                
                echo '<div class="vx-image-actions">';
                echo '<button type="button" class="button vx-select-image">' . __('Select Image', 'vortex360-lite') . '</button>';
                if ($value) {
                    echo '<button type="button" class="button vx-remove-image">' . __('Remove', 'vortex360-lite') . '</button>';
                }
                echo '</div>';
                echo '</div>';
                break;
                
            default: // text
                printf(
                    '<input type="text" id="%s" name="%s" value="%s" />',
                    esc_attr($field_id),
                    esc_attr($name),
                    esc_attr($value)
                );
                break;
        }
        
        if (!empty($field_config['description'])) {
            printf('<p class="description">%s</p>', esc_html($field_config['description']));
        }
        
        echo '</div>';
    }
    
    /**
     * Save tour meta data.
     * Processes and saves tour configuration when post is saved.
     * 
     * @param int $post_id Post ID
     */
    public function save_tour_meta($post_id) {
        // Verify nonce
        if (!isset($_POST['vx_tour_meta_nonce']) || !wp_verify_nonce($_POST['vx_tour_meta_nonce'], 'vx_save_tour_meta')) {
            return;
        }
        
        // Check if user has permission to edit
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }
        
        // Skip autosave
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        
        // Only process vx_tour posts
        if (get_post_type($post_id) !== 'vx_tour') {
            return;
        }
        
        // Save tour settings
        if (isset($_POST['_vx_tour_settings'])) {
            $settings = $this->sanitize_tour_settings($_POST['_vx_tour_settings']);
            update_post_meta($post_id, '_vx_tour_settings', $settings);
        }
        
        // Save scenes data
        if (isset($_POST['scenes'])) {
            $scenes = $this->sanitize_scenes_data($_POST['scenes']);
            update_post_meta($post_id, '_vx_tour_scenes', $scenes);
        }
        
        // Save SEO settings
        if (isset($_POST['_vx_seo_settings'])) {
            $seo_settings = $this->sanitize_seo_settings($_POST['_vx_seo_settings']);
            update_post_meta($post_id, '_vx_seo_settings', $seo_settings);
        }
        
        // Update tour status
        $this->update_tour_status($post_id);
        
        // Clear any cached data
        $this->clear_tour_cache($post_id);
    }
    
    /**
     * Sanitize tour settings data.
     * Validates and cleans tour configuration data.
     * 
     * @param array $settings Raw settings data
     * @return array Sanitized settings
     */
    private function sanitize_tour_settings($settings) {
        $sanitized = [];
        
        if (!is_array($settings)) {
            return $sanitized;
        }
        
        foreach ($settings as $key => $value) {
            switch ($key) {
                case 'auto_rotate':
                case 'enable_zoom':
                case 'enable_fullscreen':
                case 'enable_gyroscope':
                case 'show_scene_list':
                case 'show_info_panel':
                    $sanitized[$key] = (bool) $value;
                    break;
                    
                case 'auto_rotate_speed':
                case 'zoom_min':
                case 'zoom_max':
                    $sanitized[$key] = floatval($value);
                    break;
                    
                case 'width':
                case 'height':
                    $sanitized[$key] = sanitize_text_field($value);
                    break;
                    
                default:
                    $sanitized[$key] = sanitize_text_field($value);
                    break;
            }
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize scenes data.
     * Validates and cleans scenes and hotspots data.
     * 
     * @param array $scenes Raw scenes data
     * @return array Sanitized scenes
     */
    private function sanitize_scenes_data($scenes) {
        $sanitized = [];
        
        if (!is_array($scenes)) {
            return $sanitized;
        }
        
        // Limit scenes in Lite version
        $max_scenes = 3;
        $scene_count = 0;
        
        foreach ($scenes as $scene_data) {
            if ($scene_count >= $max_scenes) {
                break;
            }
            
            if (!is_array($scene_data)) {
                continue;
            }
            
            $scene = [
                'id' => sanitize_text_field($scene_data['id'] ?? ''),
                'title' => sanitize_text_field($scene_data['title'] ?? ''),
                'image' => esc_url_raw($scene_data['image'] ?? ''),
                'initial_view' => [
                    'yaw' => floatval($scene_data['initial_view']['yaw'] ?? 0),
                    'pitch' => floatval($scene_data['initial_view']['pitch'] ?? 0),
                    'fov' => floatval($scene_data['initial_view']['fov'] ?? 90)
                ],
                'hotspots' => []
            ];
            
            // Sanitize hotspots
            if (isset($scene_data['hotspots']) && is_array($scene_data['hotspots'])) {
                $max_hotspots = 5; // Lite version limit
                $hotspot_count = 0;
                
                foreach ($scene_data['hotspots'] as $hotspot_data) {
                    if ($hotspot_count >= $max_hotspots) {
                        break;
                    }
                    
                    if (!is_array($hotspot_data)) {
                        continue;
                    }
                    
                    $hotspot = [
                        'id' => sanitize_text_field($hotspot_data['id'] ?? ''),
                        'type' => sanitize_text_field($hotspot_data['type'] ?? 'info'),
                        'title' => sanitize_text_field($hotspot_data['title'] ?? ''),
                        'content' => wp_kses_post($hotspot_data['content'] ?? ''),
                        'position' => [
                            'yaw' => floatval($hotspot_data['position']['yaw'] ?? 0),
                            'pitch' => floatval($hotspot_data['position']['pitch'] ?? 0)
                        ],
                        'target_scene' => sanitize_text_field($hotspot_data['target_scene'] ?? ''),
                        'url' => esc_url_raw($hotspot_data['url'] ?? ''),
                        'icon' => sanitize_text_field($hotspot_data['icon'] ?? 'info')
                    ];
                    
                    $scene['hotspots'][] = $hotspot;
                    $hotspot_count++;
                }
            }
            
            $sanitized[] = $scene;
            $scene_count++;
        }
        
        return $sanitized;
    }
    
    /**
     * Sanitize SEO settings data.
     * Validates and cleans SEO configuration data.
     * 
     * @param array $settings Raw SEO settings
     * @return array Sanitized SEO settings
     */
    private function sanitize_seo_settings($settings) {
        $sanitized = [];
        
        if (!is_array($settings)) {
            return $sanitized;
        }
        
        $sanitized['meta_title'] = sanitize_text_field($settings['meta_title'] ?? '');
        $sanitized['meta_description'] = sanitize_textarea_field($settings['meta_description'] ?? '');
        $sanitized['og_image'] = esc_url_raw($settings['og_image'] ?? '');
        
        return $sanitized;
    }
    
    /**
     * Update tour status based on content.
     * Determines if tour is complete and ready for display.
     * 
     * @param int $post_id Tour post ID
     */
    private function update_tour_status($post_id) {
        $scenes = get_post_meta($post_id, '_vx_tour_scenes', true);
        $settings = get_post_meta($post_id, '_vx_tour_settings', true);
        
        $is_complete = false;
        
        if (is_array($scenes) && !empty($scenes)) {
            $has_valid_scene = false;
            
            foreach ($scenes as $scene) {
                if (!empty($scene['title']) && !empty($scene['image'])) {
                    $has_valid_scene = true;
                    break;
                }
            }
            
            $is_complete = $has_valid_scene;
        }
        
        update_post_meta($post_id, '_vx_tour_complete', $is_complete);
    }
    
    /**
     * Clear tour cache.
     * Removes cached tour data when tour is updated.
     * 
     * @param int $post_id Tour post ID
     */
    private function clear_tour_cache($post_id) {
        wp_cache_delete('vx_tour_' . $post_id, 'vortex360');
        wp_cache_delete('vx_tour_data_' . $post_id, 'vortex360');
    }
    
    /**
     * Enqueue admin assets.
     * Loads CSS and JavaScript for tour management interface.
     * 
     * @param string $hook Current admin page hook
     */
    public function enqueue_admin_assets($hook) {
        global $post_type;
        
        if ($post_type !== 'vx_tour') {
            return;
        }
        
        // Only load on edit screens
        if (!in_array($hook, ['post.php', 'post-new.php', 'edit.php'])) {
            return;
        }
        
        wp_enqueue_media();
        wp_enqueue_script('jquery-ui-sortable');
        
        wp_enqueue_script(
            'vx-admin-tours',
            VX_PLUGIN_URL . 'assets/js/admin-tours.js',
            ['jquery', 'jquery-ui-sortable', 'wp-util'],
            VX_VERSION,
            true
        );
        
        wp_enqueue_style(
            'vx-admin-tours',
            VX_PLUGIN_URL . 'assets/css/admin-tours.css',
            [],
            VX_VERSION
        );
        
        // Localize script
        wp_localize_script('vx-admin-tours', 'vxAdminTours', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_admin_tours'),
            'strings' => [
                'confirmDelete' => __('Are you sure you want to delete this item?', 'vortex360-lite'),
                'confirmDeleteScene' => __('Are you sure you want to delete this scene?', 'vortex360-lite'),
                'confirmDeleteHotspot' => __('Are you sure you want to delete this hotspot?', 'vortex360-lite'),
                'sceneLimit' => __('Maximum number of scenes reached (Lite version limit: 3)', 'vortex360-lite'),
                'hotspotLimit' => __('Maximum number of hotspots reached (Lite version limit: 5)', 'vortex360-lite'),
                'uploadError' => __('Error uploading image. Please try again.', 'vortex360-lite'),
                'saveError' => __('Error saving tour data. Please try again.', 'vortex360-lite'),
                'copied' => __('Copied to clipboard!', 'vortex360-lite')
            ],
            'limits' => [
                'maxScenes' => 3,
                'maxHotspots' => 5
            ]
        ]);
    }
    
    /**
     * Add custom columns to tours list table.
     * Adds columns for tour status, scenes count, etc.
     * 
     * @param array $columns Existing columns
     * @return array Modified columns
     */
    public function add_custom_columns($columns) {
        $new_columns = [];
        
        foreach ($columns as $key => $title) {
            $new_columns[$key] = $title;
            
            if ($key === 'title') {
                $new_columns['vx_status'] = __('Status', 'vortex360-lite');
                $new_columns['vx_scenes'] = __('Scenes', 'vortex360-lite');
                $new_columns['vx_shortcode'] = __('Shortcode', 'vortex360-lite');
            }
        }
        
        return $new_columns;
    }
    
    /**
     * Render custom column content.
     * Displays content for custom columns in tours list.
     * 
     * @param string $column Column name
     * @param int $post_id Post ID
     */
    public function render_custom_columns($column, $post_id) {
        switch ($column) {
            case 'vx_status':
                $is_complete = get_post_meta($post_id, '_vx_tour_complete', true);
                if ($is_complete) {
                    echo '<span class="vx-status vx-status-complete">' . __('Complete', 'vortex360-lite') . '</span>';
                } else {
                    echo '<span class="vx-status vx-status-incomplete">' . __('Incomplete', 'vortex360-lite') . '</span>';
                }
                break;
                
            case 'vx_scenes':
                $scenes = get_post_meta($post_id, '_vx_tour_scenes', true);
                $count = is_array($scenes) ? count($scenes) : 0;
                printf('<span class="vx-scenes-count">%d</span>', $count);
                break;
                
            case 'vx_shortcode':
                $shortcode = '[vortex360 id="' . $post_id . '"]';
                printf(
                    '<input type="text" value="%s" readonly onclick="this.select();" class="vx-shortcode-small" />',
                    esc_attr($shortcode)
                );
                break;
        }
    }
    
    /**
     * Add sortable columns.
     * Makes custom columns sortable in tours list.
     * 
     * @param array $columns Sortable columns
     * @return array Modified sortable columns
     */
    public function add_sortable_columns($columns) {
        $columns['vx_status'] = 'vx_status';
        $columns['vx_scenes'] = 'vx_scenes';
        
        return $columns;
    }
    
    /**
     * Add row actions to tours list.
     * Adds custom actions like duplicate, preview, etc.
     * 
     * @param array $actions Existing actions
     * @param WP_Post $post Post object
     * @return array Modified actions
     */
    public function add_row_actions($actions, $post) {
        if ($post->post_type !== 'vx_tour') {
            return $actions;
        }
        
        // Add duplicate action
        $actions['duplicate'] = sprintf(
            '<a href="%s" title="%s">%s</a>',
            wp_nonce_url(
                admin_url('admin.php?action=vx_duplicate_tour&post=' . $post->ID),
                'vx_duplicate_tour_' . $post->ID
            ),
            __('Duplicate this tour', 'vortex360-lite'),
            __('Duplicate', 'vortex360-lite')
        );
        
        // Add preview action
        if (get_post_meta($post->ID, '_vx_tour_complete', true)) {
            $actions['preview'] = sprintf(
                '<a href="%s" title="%s" target="_blank">%s</a>',
                get_permalink($post->ID),
                __('Preview this tour', 'vortex360-lite'),
                __('Preview', 'vortex360-lite')
            );
        }
        
        return $actions;
    }
    
    /**
     * Add bulk actions to tours list.
     * Adds custom bulk actions for tour management.
     * 
     * @param array $actions Existing bulk actions
     * @return array Modified bulk actions
     */
    public function add_bulk_actions($actions) {
        $actions['vx_duplicate'] = __('Duplicate', 'vortex360-lite');
        $actions['vx_export'] = __('Export', 'vortex360-lite');
        
        return $actions;
    }
    
    /**
     * Handle bulk actions for tours.
     * Processes custom bulk actions.
     * 
     * @param string $redirect_to Redirect URL
     * @param string $doaction Action being performed
     * @param array $post_ids Selected post IDs
     * @return string Modified redirect URL
     */
    public function handle_bulk_actions($redirect_to, $doaction, $post_ids) {
        if ($doaction === 'vx_duplicate') {
            foreach ($post_ids as $post_id) {
                $this->duplicate_tour($post_id);
            }
            
            $redirect_to = add_query_arg('vx_duplicated', count($post_ids), $redirect_to);
        } elseif ($doaction === 'vx_export') {
            $this->export_tours($post_ids);
        }
        
        return $redirect_to;
    }
    
    /**
     * Show admin notices.
     * Displays success/error messages for tour operations.
     */
    public function show_admin_notices() {
        if (isset($_GET['vx_duplicated'])) {
            $count = intval($_GET['vx_duplicated']);
            printf(
                '<div class="notice notice-success is-dismissible"><p>%s</p></div>',
                sprintf(
                    _n(
                        '%d tour duplicated successfully.',
                        '%d tours duplicated successfully.',
                        $count,
                        'vortex360-lite'
                    ),
                    $count
                )
            );
        }
    }
    
    /**
     * Add post states to tours list.
     * Shows additional status information.
     * 
     * @param array $post_states Existing post states
     * @param WP_Post $post Post object
     * @return array Modified post states
     */
    public function add_post_states($post_states, $post) {
        if ($post->post_type !== 'vx_tour') {
            return $post_states;
        }
        
        if (!get_post_meta($post->ID, '_vx_tour_complete', true)) {
            $post_states['vx_incomplete'] = __('Incomplete', 'vortex360-lite');
        }
        
        return $post_states;
    }
    
    /**
     * Duplicate tour.
     * Creates a copy of an existing tour.
     * 
     * @param int $post_id Original tour ID
     * @return int|false New tour ID or false on failure
     */
    private function duplicate_tour($post_id) {
        $original_post = get_post($post_id);
        
        if (!$original_post || $original_post->post_type !== 'vx_tour') {
            return false;
        }
        
        // Create new post
        $new_post_data = [
            'post_title' => $original_post->post_title . ' (Copy)',
            'post_content' => $original_post->post_content,
            'post_status' => 'draft',
            'post_type' => 'vx_tour',
            'post_author' => get_current_user_id()
        ];
        
        $new_post_id = wp_insert_post($new_post_data);
        
        if (is_wp_error($new_post_id)) {
            return false;
        }
        
        // Copy meta data
        $meta_keys = ['_vx_tour_settings', '_vx_tour_scenes', '_vx_seo_settings'];
        
        foreach ($meta_keys as $meta_key) {
            $meta_value = get_post_meta($post_id, $meta_key, true);
            if ($meta_value) {
                update_post_meta($new_post_id, $meta_key, $meta_value);
            }
        }
        
        return $new_post_id;
    }
    
    /**
     * Export tours data.
     * Generates export file for selected tours.
     * 
     * @param array $post_ids Tour IDs to export
     */
    private function export_tours($post_ids) {
        $export_data = [];
        
        foreach ($post_ids as $post_id) {
            $post = get_post($post_id);
            
            if (!$post || $post->post_type !== 'vx_tour') {
                continue;
            }
            
            $tour_data = [
                'title' => $post->post_title,
                'content' => $post->post_content,
                'settings' => get_post_meta($post_id, '_vx_tour_settings', true),
                'scenes' => get_post_meta($post_id, '_vx_tour_scenes', true),
                'seo' => get_post_meta($post_id, '_vx_seo_settings', true)
            ];
            
            $export_data[] = $tour_data;
        }
        
        // Generate JSON file
        $filename = 'vortex360-tours-' . date('Y-m-d-H-i-s') . '.json';
        
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        
        echo wp_json_encode($export_data, JSON_PRETTY_PRINT);
        exit;
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for saving tour data.
     * Processes tour data updates via AJAX.
     */
    public function ajax_save_tour_data() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $post_id = intval($_POST['post_id'] ?? 0);
        $tour_data = $_POST['tour_data'] ?? [];
        
        if (!$post_id || get_post_type($post_id) !== 'vx_tour') {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        // Save the data
        if (isset($tour_data['settings'])) {
            $settings = $this->sanitize_tour_settings($tour_data['settings']);
            update_post_meta($post_id, '_vx_tour_settings', $settings);
        }
        
        if (isset($tour_data['scenes'])) {
            $scenes = $this->sanitize_scenes_data($tour_data['scenes']);
            update_post_meta($post_id, '_vx_tour_scenes', $scenes);
        }
        
        $this->update_tour_status($post_id);
        $this->clear_tour_cache($post_id);
        
        wp_send_json_success(__('Tour data saved successfully', 'vortex360-lite'));
    }
    
    /**
     * AJAX handler for uploading tour images.
     * Handles image uploads for scenes.
     */
    public function ajax_upload_tour_image() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['image'])) {
            wp_send_json_error(__('No image file provided', 'vortex360-lite'));
        }
        
        $upload = wp_handle_upload($_FILES['image'], ['test_form' => false]);
        
        if (isset($upload['error'])) {
            wp_send_json_error($upload['error']);
        }
        
        wp_send_json_success([
            'url' => $upload['url'],
            'file' => $upload['file']
        ]);
    }
    
    /**
     * AJAX handler for deleting tour images.
     * Removes uploaded images from server.
     */
    public function ajax_delete_tour_image() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        if (!current_user_can('delete_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $image_url = sanitize_url($_POST['image_url'] ?? '');
        
        if (empty($image_url)) {
            wp_send_json_error(__('No image URL provided', 'vortex360-lite'));
        }
        
        // Convert URL to file path and delete
        $upload_dir = wp_upload_dir();
        $file_path = str_replace($upload_dir['baseurl'], $upload_dir['basedir'], $image_url);
        
        if (file_exists($file_path)) {
            unlink($file_path);
        }
        
        wp_send_json_success(__('Image deleted successfully', 'vortex360-lite'));
    }
    
    /**
     * AJAX handler for duplicating tours.
     * Creates tour copies via AJAX.
     */
    public function ajax_duplicate_tour() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $post_id = intval($_POST['post_id'] ?? 0);
        
        $new_post_id = $this->duplicate_tour($post_id);
        
        if ($new_post_id) {
            wp_send_json_success([
                'message' => __('Tour duplicated successfully', 'vortex360-lite'),
                'new_post_id' => $new_post_id,
                'edit_url' => get_edit_post_link($new_post_id)
            ]);
        } else {
            wp_send_json_error(__('Failed to duplicate tour', 'vortex360-lite'));
        }
    }
    
    /**
     * AJAX handler for tour preview.
     * Generates tour preview data.
     */
    public function ajax_preview_tour() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        $post_id = intval($_POST['post_id'] ?? 0);
        
        if (!$post_id || get_post_type($post_id) !== 'vx_tour') {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $settings = get_post_meta($post_id, '_vx_tour_settings', true);
        $scenes = get_post_meta($post_id, '_vx_tour_scenes', true);
        
        wp_send_json_success([
            'settings' => $settings,
            'scenes' => $scenes,
            'preview_url' => get_permalink($post_id)
        ]);
    }
    
    /**
     * AJAX handler for tour validation.
     * Validates tour configuration and completeness.
     */
    public function ajax_validate_tour() {
        check_ajax_referer('vx_admin_tours', 'nonce');
        
        $post_id = intval($_POST['post_id'] ?? 0);
        
        if (!$post_id || get_post_type($post_id) !== 'vx_tour') {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $scenes = get_post_meta($post_id, '_vx_tour_scenes', true);
        $errors = [];
        $warnings = [];
        
        if (empty($scenes) || !is_array($scenes)) {
            $errors[] = __('No scenes found. Add at least one scene.', 'vortex360-lite');
        } else {
            foreach ($scenes as $index => $scene) {
                if (empty($scene['title'])) {
                    $warnings[] = sprintf(__('Scene %d is missing a title.', 'vortex360-lite'), $index + 1);
                }
                
                if (empty($scene['image'])) {
                    $errors[] = sprintf(__('Scene %d is missing a 360° image.', 'vortex360-lite'), $index + 1);
                }
            }
        }
        
        $is_valid = empty($errors);
        
        wp_send_json_success([
            'valid' => $is_valid,
            'errors' => $errors,
            'warnings' => $warnings
        ]);
    }
}

// Initialize the admin tours class
if (is_admin()) {
    new VX_Admin_Tours();
}