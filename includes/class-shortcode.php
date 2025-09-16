<?php
/**
 * Shortcode management class for Vortex360 Lite
 * Handles shortcode registration and tour embedding functionality
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Shortcode class for embedding virtual tours in posts and pages
 */
class Vortex360_Lite_Shortcode {
    
    /**
     * Constructor
     */
    public function __construct() {
        // Register shortcodes
        add_shortcode('vortex360_tour', array($this, 'render_tour_shortcode'));
        add_shortcode('vortex360_scene', array($this, 'render_scene_shortcode'));
        
        // Add shortcode button to editor
        add_action('media_buttons', array($this, 'add_shortcode_button'));
        add_action('admin_footer', array($this, 'add_shortcode_modal'));
        
        // Enqueue scripts for shortcode functionality
        add_action('wp_enqueue_scripts', array($this, 'enqueue_shortcode_scripts'));
    }
    
    /**
     * Render tour shortcode
     * @param array $atts Shortcode attributes
     * @param string $content Shortcode content
     * @return string HTML output
     */
    public function render_tour_shortcode($atts, $content = '') {
        // Parse shortcode attributes
        $atts = shortcode_atts(array(
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'autoload' => 'true',
            'controls' => 'true',
            'hotspots' => 'true',
            'compass' => 'false',
            'fullscreen' => 'true',
            'mousewheel' => 'true',
            'keyboard' => 'true',
            'draggable' => 'true',
            'orientation' => 'false',
            'preview' => 'false',
            'title' => 'true',
            'author' => 'false',
            'fallback_text' => 'Your browser does not support 360° tours.',
            'loading_text' => 'Loading virtual tour...',
            'class' => '',
            'style' => ''
        ), $atts, 'vortex360_tour');
        
        // Validate tour ID
        $tour_id = absint($atts['id']);
        if (!$tour_id) {
            return '<div class="vortex360-error">Error: Tour ID is required.</div>';
        }
        
        // Get tour data
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($tour_id);
        
        if (!$tour) {
            return '<div class="vortex360-error">Error: Tour not found.</div>';
        }
        
        // Check if tour is published or user has permission to view
        if ($tour->status !== 'published' && !$this->user_can_view_tour($tour)) {
            return '<div class="vortex360-error">Error: Tour is not available.</div>';
        }
        
        // Get tour scenes
        $scene_manager = new Vortex360_Lite_Scene();
        $scenes = $scene_manager->get_tour_scenes($tour_id, true);
        
        if (empty($scenes)) {
            return '<div class="vortex360-error">Error: No scenes found in this tour.</div>';
        }
        
        // Generate unique container ID
        $container_id = 'vortex360-tour-' . $tour_id . '-' . wp_generate_password(8, false);
        
        // Prepare tour data for JavaScript
        $tour_data = array(
            'id' => $tour_id,
            'title' => $tour->title,
            'description' => $tour->description,
            'scenes' => $this->prepare_scenes_for_frontend($scenes),
            'settings' => array(
                'autoload' => $this->parse_boolean($atts['autoload']),
                'controls' => $this->parse_boolean($atts['controls']),
                'hotspots' => $this->parse_boolean($atts['hotspots']),
                'compass' => $this->parse_boolean($atts['compass']),
                'fullscreen' => $this->parse_boolean($atts['fullscreen']),
                'mousewheel' => $this->parse_boolean($atts['mousewheel']),
                'keyboard' => $this->parse_boolean($atts['keyboard']),
                'draggable' => $this->parse_boolean($atts['draggable']),
                'orientation' => $this->parse_boolean($atts['orientation']),
                'preview' => $this->parse_boolean($atts['preview']),
                'title' => $this->parse_boolean($atts['title']),
                'author' => $this->parse_boolean($atts['author']),
                'fallback_text' => esc_html($atts['fallback_text']),
                'loading_text' => esc_html($atts['loading_text'])
            )
        );
        
        // Build container styles
        $container_styles = array();
        $container_styles[] = 'width: ' . esc_attr($atts['width']);
        $container_styles[] = 'height: ' . esc_attr($atts['height']);
        
        if (!empty($atts['style'])) {
            $container_styles[] = esc_attr($atts['style']);
        }
        
        // Build container classes
        $container_classes = array('vortex360-tour-container');
        if (!empty($atts['class'])) {
            $container_classes[] = esc_attr($atts['class']);
        }
        
        // Generate HTML output
        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>" 
             class="<?php echo esc_attr(implode(' ', $container_classes)); ?>" 
             style="<?php echo esc_attr(implode('; ', $container_styles)); ?>" 
             data-tour="<?php echo esc_attr(wp_json_encode($tour_data)); ?>">
            
            <?php if ($this->parse_boolean($atts['title']) && !empty($tour->title)): ?>
            <div class="vortex360-tour-header">
                <h3 class="vortex360-tour-title"><?php echo esc_html($tour->title); ?></h3>
                <?php if ($this->parse_boolean($atts['author']) && !empty($tour->created_by)): ?>
                    <?php $author = get_userdata($tour->created_by); ?>
                    <?php if ($author): ?>
                        <p class="vortex360-tour-author">By <?php echo esc_html($author->display_name); ?></p>
                    <?php endif; ?>
                <?php endif; ?>
            </div>
            <?php endif; ?>
            
            <div class="vortex360-viewer" id="<?php echo esc_attr($container_id); ?>-viewer">
                <div class="vortex360-loading">
                    <div class="vortex360-spinner"></div>
                    <p><?php echo esc_html($atts['loading_text']); ?></p>
                </div>
                <div class="vortex360-fallback" style="display: none;">
                    <p><?php echo esc_html($atts['fallback_text']); ?></p>
                </div>
            </div>
            
            <?php if (!empty($tour->description)): ?>
            <div class="vortex360-tour-description">
                <p><?php echo wp_kses_post($tour->description); ?></p>
            </div>
            <?php endif; ?>
            
        </div>
        
        <script type="text/javascript">
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof Vortex360Lite !== 'undefined') {
                Vortex360Lite.initTour('<?php echo esc_js($container_id); ?>');
            } else {
                console.error('Vortex360 Lite: JavaScript library not loaded');
                document.getElementById('<?php echo esc_js($container_id); ?>-viewer').innerHTML = 
                    '<div class="vortex360-error">Error: 360° viewer could not be loaded.</div>';
            }
        });
        </script>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Render single scene shortcode
     * @param array $atts Shortcode attributes
     * @param string $content Shortcode content
     * @return string HTML output
     */
    public function render_scene_shortcode($atts, $content = '') {
        // Parse shortcode attributes
        $atts = shortcode_atts(array(
            'id' => 0,
            'width' => '100%',
            'height' => '400px',
            'autoload' => 'true',
            'controls' => 'true',
            'hotspots' => 'true',
            'compass' => 'false',
            'fullscreen' => 'true',
            'mousewheel' => 'true',
            'keyboard' => 'true',
            'draggable' => 'true',
            'fallback_text' => 'Your browser does not support 360° scenes.',
            'loading_text' => 'Loading 360° scene...',
            'class' => '',
            'style' => ''
        ), $atts, 'vortex360_scene');
        
        // Validate scene ID
        $scene_id = absint($atts['id']);
        if (!$scene_id) {
            return '<div class="vortex360-error">Error: Scene ID is required.</div>';
        }
        
        // Get scene data
        $scene_manager = new Vortex360_Lite_Scene();
        $scene = $scene_manager->get_scene_by_id($scene_id);
        
        if (!$scene) {
            return '<div class="vortex360-error">Error: Scene not found.</div>';
        }
        
        // Check if user has permission to view scene
        $tour_manager = new Vortex360_Lite_Tour();
        $tour = $tour_manager->get_tour_by_id($scene->tour_id);
        
        if (!$tour || ($tour->status !== 'published' && !$this->user_can_view_tour($tour))) {
            return '<div class="vortex360-error">Error: Scene is not available.</div>';
        }
        
        // Get scene hotspots
        $hotspot_manager = new Vortex360_Lite_Hotspot();
        $hotspots = $hotspot_manager->get_scene_hotspots($scene_id);
        
        // Generate unique container ID
        $container_id = 'vortex360-scene-' . $scene_id . '-' . wp_generate_password(8, false);
        
        // Prepare scene data for JavaScript
        $scene_data = array(
            'id' => $scene_id,
            'title' => $scene->title,
            'description' => $scene->description,
            'image_url' => $scene->image_url,
            'image_type' => $scene->image_type,
            'pitch' => floatval($scene->pitch),
            'yaw' => floatval($scene->yaw),
            'hfov' => floatval($scene->hfov),
            'hotspots' => $this->prepare_hotspots_for_frontend($hotspots),
            'settings' => array(
                'autoload' => $this->parse_boolean($atts['autoload']),
                'controls' => $this->parse_boolean($atts['controls']),
                'hotspots' => $this->parse_boolean($atts['hotspots']),
                'compass' => $this->parse_boolean($atts['compass']),
                'fullscreen' => $this->parse_boolean($atts['fullscreen']),
                'mousewheel' => $this->parse_boolean($atts['mousewheel']),
                'keyboard' => $this->parse_boolean($atts['keyboard']),
                'draggable' => $this->parse_boolean($atts['draggable']),
                'fallback_text' => esc_html($atts['fallback_text']),
                'loading_text' => esc_html($atts['loading_text'])
            )
        );
        
        // Build container styles
        $container_styles = array();
        $container_styles[] = 'width: ' . esc_attr($atts['width']);
        $container_styles[] = 'height: ' . esc_attr($atts['height']);
        
        if (!empty($atts['style'])) {
            $container_styles[] = esc_attr($atts['style']);
        }
        
        // Build container classes
        $container_classes = array('vortex360-scene-container');
        if (!empty($atts['class'])) {
            $container_classes[] = esc_attr($atts['class']);
        }
        
        // Generate HTML output
        ob_start();
        ?>
        <div id="<?php echo esc_attr($container_id); ?>" 
             class="<?php echo esc_attr(implode(' ', $container_classes)); ?>" 
             style="<?php echo esc_attr(implode('; ', $container_styles)); ?>" 
             data-scene="<?php echo esc_attr(wp_json_encode($scene_data)); ?>">
            
            <div class="vortex360-viewer" id="<?php echo esc_attr($container_id); ?>-viewer">
                <div class="vortex360-loading">
                    <div class="vortex360-spinner"></div>
                    <p><?php echo esc_html($atts['loading_text']); ?></p>
                </div>
                <div class="vortex360-fallback" style="display: none;">
                    <p><?php echo esc_html($atts['fallback_text']); ?></p>
                </div>
            </div>
            
        </div>
        
        <script type="text/javascript">
        document.addEventListener('DOMContentLoaded', function() {
            if (typeof Vortex360Lite !== 'undefined') {
                Vortex360Lite.initScene('<?php echo esc_js($container_id); ?>');
            } else {
                console.error('Vortex360 Lite: JavaScript library not loaded');
                document.getElementById('<?php echo esc_js($container_id); ?>-viewer').innerHTML = 
                    '<div class="vortex360-error">Error: 360° viewer could not be loaded.</div>';
            }
        });
        </script>
        <?php
        
        return ob_get_clean();
    }
    
    /**
     * Add shortcode button to editor
     */
    public function add_shortcode_button() {
        if (!current_user_can('edit_posts') && !current_user_can('edit_pages')) {
            return;
        }
        
        echo '<button type="button" id="vortex360-shortcode-button" class="button" data-editor="content">';
        echo '<span class="dashicons dashicons-format-video" style="vertical-align: middle;"></span> ';
        echo 'Add 360° Tour';
        echo '</button>';
    }
    
    /**
     * Add shortcode modal to admin footer
     */
    public function add_shortcode_modal() {
        $screen = get_current_screen();
        if (!$screen || !in_array($screen->base, array('post', 'page'))) {
            return;
        }
        
        // Get available tours
        $tour_manager = new Vortex360_Lite_Tour();
        $tours = $tour_manager->get_user_tours(get_current_user_id());
        
        ?>
        <div id="vortex360-shortcode-modal" style="display: none;">
            <div class="vortex360-modal-content">
                <div class="vortex360-modal-header">
                    <h2>Insert 360° Tour</h2>
                    <button type="button" class="vortex360-modal-close">&times;</button>
                </div>
                
                <div class="vortex360-modal-body">
                    <form id="vortex360-shortcode-form">
                        <table class="form-table">
                            <tr>
                                <th scope="row"><label for="vortex360-tour-select">Select Tour</label></th>
                                <td>
                                    <select id="vortex360-tour-select" name="tour_id" required>
                                        <option value="">-- Select a Tour --</option>
                                        <?php foreach ($tours as $tour): ?>
                                            <option value="<?php echo esc_attr($tour->id); ?>">
                                                <?php echo esc_html($tour->title); ?>
                                                <?php if ($tour->status !== 'published'): ?>
                                                    (<?php echo esc_html(ucfirst($tour->status)); ?>)
                                                <?php endif; ?>
                                            </option>
                                        <?php endforeach; ?>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="vortex360-width">Width</label></th>
                                <td><input type="text" id="vortex360-width" name="width" value="100%" /></td>
                            </tr>
                            <tr>
                                <th scope="row"><label for="vortex360-height">Height</label></th>
                                <td><input type="text" id="vortex360-height" name="height" value="400px" /></td>
                            </tr>
                            <tr>
                                <th scope="row">Options</th>
                                <td>
                                    <label><input type="checkbox" name="controls" checked /> Show Controls</label><br>
                                    <label><input type="checkbox" name="hotspots" checked /> Show Hotspots</label><br>
                                    <label><input type="checkbox" name="fullscreen" checked /> Allow Fullscreen</label><br>
                                    <label><input type="checkbox" name="title" checked /> Show Title</label><br>
                                    <label><input type="checkbox" name="compass" /> Show Compass</label><br>
                                    <label><input type="checkbox" name="author" /> Show Author</label>
                                </td>
                            </tr>
                        </table>
                    </form>
                </div>
                
                <div class="vortex360-modal-footer">
                    <button type="button" class="button button-primary" id="vortex360-insert-shortcode">Insert Shortcode</button>
                    <button type="button" class="button" id="vortex360-cancel-shortcode">Cancel</button>
                </div>
            </div>
        </div>
        
        <style>
        #vortex360-shortcode-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 100000;
        }
        .vortex360-modal-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        .vortex360-modal-header {
            padding: 20px;
            border-bottom: 1px solid #ddd;
            position: relative;
        }
        .vortex360-modal-header h2 {
            margin: 0;
        }
        .vortex360-modal-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
        }
        .vortex360-modal-body {
            padding: 20px;
        }
        .vortex360-modal-footer {
            padding: 20px;
            border-top: 1px solid #ddd;
            text-align: right;
        }
        .vortex360-modal-footer .button {
            margin-left: 10px;
        }
        </style>
        
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            // Open modal
            $('#vortex360-shortcode-button').on('click', function() {
                $('#vortex360-shortcode-modal').show();
            });
            
            // Close modal
            $('#vortex360-cancel-shortcode, .vortex360-modal-close').on('click', function() {
                $('#vortex360-shortcode-modal').hide();
            });
            
            // Close modal on background click
            $('#vortex360-shortcode-modal').on('click', function(e) {
                if (e.target === this) {
                    $(this).hide();
                }
            });
            
            // Insert shortcode
            $('#vortex360-insert-shortcode').on('click', function() {
                var tourId = $('#vortex360-tour-select').val();
                if (!tourId) {
                    alert('Please select a tour.');
                    return;
                }
                
                var width = $('#vortex360-width').val() || '100%';
                var height = $('#vortex360-height').val() || '400px';
                
                var shortcode = '[vortex360_tour id="' + tourId + '" width="' + width + '" height="' + height + '"';
                
                // Add boolean options
                var booleanOptions = ['controls', 'hotspots', 'fullscreen', 'title', 'compass', 'author'];
                booleanOptions.forEach(function(option) {
                    var checkbox = $('input[name="' + option + '"]');
                    if (checkbox.length) {
                        shortcode += ' ' + option + '="' + (checkbox.is(':checked') ? 'true' : 'false') + '"';
                    }
                });
                
                shortcode += ']';
                
                // Insert into editor
                if (typeof tinyMCE !== 'undefined' && tinyMCE.activeEditor && !tinyMCE.activeEditor.isHidden()) {
                    tinyMCE.activeEditor.insertContent(shortcode);
                } else {
                    var textarea = $('#content');
                    var cursorPos = textarea.prop('selectionStart');
                    var textBefore = textarea.val().substring(0, cursorPos);
                    var textAfter = textarea.val().substring(cursorPos);
                    textarea.val(textBefore + shortcode + textAfter);
                }
                
                $('#vortex360-shortcode-modal').hide();
            });
        });
        </script>
        <?php
    }
    
    /**
     * Enqueue scripts for shortcode functionality
     */
    public function enqueue_shortcode_scripts() {
        // Only enqueue on pages that might have shortcodes
        if (!is_singular() && !is_home() && !is_archive()) {
            return;
        }
        
        // Check if page content contains our shortcodes
        global $post;
        if (!$post || (!has_shortcode($post->post_content, 'vortex360_tour') && !has_shortcode($post->post_content, 'vortex360_scene'))) {
            return;
        }
        
        // Enqueue Pannellum library
        wp_enqueue_script(
            'pannellum',
            VORTEX360_LITE_URL . 'assets/js/pannellum.js',
            array(),
            '2.5.6',
            true
        );
        
        wp_enqueue_style(
            'pannellum',
            VORTEX360_LITE_URL . 'assets/css/pannellum.css',
            array(),
            '2.5.6'
        );
        
        // Enqueue our frontend script
        wp_enqueue_script(
            'vortex360-lite-frontend',
            VORTEX360_LITE_URL . 'assets/js/frontend.js',
            array('pannellum'),
            VORTEX360_LITE_VERSION,
            true
        );
        
        wp_enqueue_style(
            'vortex360-lite-frontend',
            VORTEX360_LITE_URL . 'assets/css/frontend.css',
            array('pannellum'),
            VORTEX360_LITE_VERSION
        );
        
        // Localize script with AJAX URL and nonce
        wp_localize_script('vortex360-lite-frontend', 'vortex360Ajax', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vortex360_nonce'),
            'pluginUrl' => VORTEX360_LITE_URL
        ));
    }
    
    /**
     * Prepare scenes data for frontend JavaScript
     * @param array $scenes Array of scene objects
     * @return array Prepared scenes data
     */
    private function prepare_scenes_for_frontend($scenes) {
        $prepared_scenes = array();
        
        foreach ($scenes as $scene) {
            $prepared_scenes[] = array(
                'id' => $scene->id,
                'title' => $scene->title,
                'description' => $scene->description,
                'image_url' => $scene->image_url,
                'image_type' => $scene->image_type,
                'pitch' => floatval($scene->pitch),
                'yaw' => floatval($scene->yaw),
                'hfov' => floatval($scene->hfov),
                'is_default' => (bool) $scene->is_default,
                'hotspots' => $this->prepare_hotspots_for_frontend($scene->hotspots ?? array())
            );
        }
        
        return $prepared_scenes;
    }
    
    /**
     * Prepare hotspots data for frontend JavaScript
     * @param array $hotspots Array of hotspot objects
     * @return array Prepared hotspots data
     */
    private function prepare_hotspots_for_frontend($hotspots) {
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
                'scale' => floatval($hotspot->scale ?? 1)
            );
        }
        
        return $prepared_hotspots;
    }
    
    /**
     * Parse boolean attribute value
     * @param string $value Attribute value
     * @return bool Boolean value
     */
    private function parse_boolean($value) {
        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }
    
    /**
     * Check if current user can view tour
     * @param object $tour Tour object
     * @return bool True if user can view
     */
    private function user_can_view_tour($tour) {
        $current_user_id = get_current_user_id();
        
        // Tour owner can always view
        if ($tour->created_by == $current_user_id) {
            return true;
        }
        
        // Administrators can view any tour
        if (current_user_can('manage_options')) {
            return true;
        }
        
        return false;
    }
}