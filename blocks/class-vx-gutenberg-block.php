<?php
/**
 * Vortex360 Lite - Gutenberg Block
 * 
 * Handles Gutenberg block registration and functionality
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VX_Gutenberg_Block {
    
    /**
     * Constructor
     */
    public function __construct() {
        $this->init_hooks();
    }
    
    /**
     * Initialize hooks
     */
    private function init_hooks() {
        add_action('init', array($this, 'register_block'));
        add_action('enqueue_block_editor_assets', array($this, 'enqueue_block_editor_assets'));
        add_action('enqueue_block_assets', array($this, 'enqueue_block_assets'));
    }
    
    /**
     * Register the Gutenberg block
     */
    public function register_block() {
        // Check if Gutenberg is available
        if (!function_exists('register_block_type')) {
            return;
        }
        
        register_block_type('vortex360/tour-viewer', array(
            'attributes' => array(
                'tourId' => array(
                    'type' => 'number',
                    'default' => 0
                ),
                'width' => array(
                    'type' => 'string',
                    'default' => '100%'
                ),
                'height' => array(
                    'type' => 'string',
                    'default' => '600px'
                ),
                'autoLoad' => array(
                    'type' => 'boolean',
                    'default' => true
                ),
                'showControls' => array(
                    'type' => 'boolean',
                    'default' => true
                ),
                'mouseZoom' => array(
                    'type' => 'boolean',
                    'default' => true
                ),
                'autoRotate' => array(
                    'type' => 'boolean',
                    'default' => false
                ),
                'autoRotateSpeed' => array(
                    'type' => 'number',
                    'default' => 2
                ),
                'className' => array(
                    'type' => 'string',
                    'default' => ''
                )
            ),
            'render_callback' => array($this, 'render_block'),
            'editor_script' => 'vx-gutenberg-block',
            'editor_style' => 'vx-gutenberg-block-editor',
            'style' => 'vx-public-style'
        ));
    }
    
    /**
     * Enqueue block editor assets
     */
    public function enqueue_block_editor_assets() {
        $asset_file = VX_LITE_PATH . 'blocks/js/block.asset.php';
        $asset = file_exists($asset_file) ? include $asset_file : array(
            'dependencies' => array('wp-blocks', 'wp-i18n', 'wp-element', 'wp-components', 'wp-editor'),
            'version' => VX_LITE_VERSION
        );
        
        // Block editor script
        wp_enqueue_script(
            'vx-gutenberg-block',
            VX_LITE_URL . 'blocks/js/block.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );
        
        // Block editor styles
        wp_enqueue_style(
            'vx-gutenberg-block-editor',
            VX_LITE_URL . 'blocks/css/block-editor.css',
            array('wp-edit-blocks'),
            VX_LITE_VERSION
        );
        
        // Localize script
        wp_localize_script('vx-gutenberg-block', 'vxGutenberg', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_gutenberg_nonce'),
            'tours' => $this->get_tours_for_select(),
            'strings' => array(
                'selectTour' => __('Select a Tour', 'vortex360-lite'),
                'noTours' => __('No tours found. Create a tour first.', 'vortex360-lite'),
                'tourSettings' => __('Tour Settings', 'vortex360-lite'),
                'dimensions' => __('Dimensions', 'vortex360-lite'),
                'width' => __('Width', 'vortex360-lite'),
                'height' => __('Height', 'vortex360-lite'),
                'controls' => __('Controls', 'vortex360-lite'),
                'showControls' => __('Show Controls', 'vortex360-lite'),
                'mouseZoom' => __('Mouse Zoom', 'vortex360-lite'),
                'autoRotate' => __('Auto Rotate', 'vortex360-lite'),
                'autoRotateSpeed' => __('Auto Rotate Speed', 'vortex360-lite'),
                'preview' => __('Preview', 'vortex360-lite'),
                'loading' => __('Loading...', 'vortex360-lite'),
                'error' => __('Error loading tour', 'vortex360-lite'),
                'upgradeNotice' => __('Upgrade to Pro for unlimited tours and advanced features!', 'vortex360-lite')
            )
        ));
    }
    
    /**
     * Enqueue block assets (frontend and editor)
     */
    public function enqueue_block_assets() {
        // Frontend styles are handled by the main public class
        // This is called for both frontend and editor
    }
    
    /**
     * Render the block on frontend
     */
    public function render_block($attributes, $content) {
        // Sanitize attributes
        $tour_id = intval($attributes['tourId'] ?? 0);
        
        if (!$tour_id) {
            return '<div class="vx-block-error">' . __('Please select a tour to display.', 'vortex360-lite') . '</div>';
        }
        
        // Check if tour exists and is published
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            return '<div class="vx-block-error">' . __('Selected tour not found or not published.', 'vortex360-lite') . '</div>';
        }
        
        // Check permissions
        if (!current_user_can('read_post', $tour_id)) {
            return '<div class="vx-block-error">' . __('You do not have permission to view this tour.', 'vortex360-lite') . '</div>';
        }
        
        // Get tour data
        $tour_data = $this->get_tour_data($tour_id);
        if (!$tour_data) {
            return '<div class="vx-block-error">' . __('Error loading tour data.', 'vortex360-lite') . '</div>';
        }
        
        // Enqueue frontend assets
        $this->enqueue_frontend_assets();
        
        // Generate block HTML
        return $this->generate_block_html($attributes, $tour_data);
    }
    
    /**
     * Get tours for select dropdown
     */
    private function get_tours_for_select() {
        $tours = get_posts(array(
            'post_type' => 'vx_tour',
            'post_status' => array('publish', 'draft'),
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC'
        ));
        
        $options = array();
        foreach ($tours as $tour) {
            $options[] = array(
                'value' => $tour->ID,
                'label' => $tour->post_title ?: sprintf(__('Tour #%d', 'vortex360-lite'), $tour->ID)
            );
        }
        
        return $options;
    }
    
    /**
     * Get tour data for rendering
     */
    private function get_tour_data($tour_id) {
        $scenes_class = new VX_Scenes();
        $hotspots_class = new VX_Hotspots();
        
        // Get tour post
        $tour = get_post($tour_id);
        if (!$tour) {
            return false;
        }
        
        // Get tour meta
        $tour_meta = get_post_meta($tour_id, '_vx_tour_data', true);
        if (!$tour_meta) {
            $tour_meta = array();
        }
        
        // Get scenes
        $scenes_data = get_post_meta($tour_id, '_vx_scenes', true);
        if (!$scenes_data || !is_array($scenes_data)) {
            return false;
        }
        
        $scenes = array();
        foreach ($scenes_data as $scene_data) {
            $scene = $scenes_class->sanitize_scene($scene_data);
            if ($scene) {
                // Get hotspots for this scene
                $hotspots_data = $scene['hotSpots'] ?? array();
                $scene['hotSpots'] = array();
                
                foreach ($hotspots_data as $hotspot_data) {
                    $hotspot = $hotspots_class->sanitize_hotspot($hotspot_data);
                    if ($hotspot) {
                        $scene['hotSpots'][] = $hotspot;
                    }
                }
                
                $scenes[] = $scene;
            }
        }
        
        if (empty($scenes)) {
            return false;
        }
        
        return array(
            'id' => $tour_id,
            'title' => $tour->post_title,
            'description' => $tour->post_content,
            'scenes' => $scenes,
            'settings' => $tour_meta
        );
    }
    
    /**
     * Enqueue frontend assets
     */
    private function enqueue_frontend_assets() {
        // Pannellum
        wp_enqueue_script('pannellum');
        wp_enqueue_style('pannellum');
        
        // Public assets
        wp_enqueue_style('vx-public-style');
        wp_enqueue_script('vx-public-script');
    }
    
    /**
     * Generate block HTML
     */
    private function generate_block_html($attributes, $tour_data) {
        $tour_id = intval($attributes['tourId']);
        $width = sanitize_text_field($attributes['width'] ?? '100%');
        $height = sanitize_text_field($attributes['height'] ?? '600px');
        $class_name = sanitize_html_class($attributes['className'] ?? '');
        
        $options = json_encode(array(
            'tourId' => $tour_id,
            'width' => $width,
            'height' => $height,
            'autoLoad' => (bool) ($attributes['autoLoad'] ?? true),
            'showControls' => (bool) ($attributes['showControls'] ?? true),
            'mouseZoom' => (bool) ($attributes['mouseZoom'] ?? true),
            'autoRotate' => (bool) ($attributes['autoRotate'] ?? false),
            'autoRotateSpeed' => intval($attributes['autoRotateSpeed'] ?? 2)
        ));
        
        $classes = array('wp-block-vortex360-tour-viewer');
        if ($class_name) {
            $classes[] = $class_name;
        }
        
        ob_start();
        ?>
        <div class="<?php echo esc_attr(implode(' ', $classes)); ?>" 
             data-options="<?php echo esc_attr($options); ?>"
             style="width: <?php echo esc_attr($width); ?>; height: <?php echo esc_attr($height); ?>;">
            
            <!-- Loading placeholder -->
            <div class="vx-block-placeholder">
                <div class="vx-placeholder-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                </div>
                <div class="vx-placeholder-text">
                    <?php esc_html_e('Loading 360° Tour...', 'vortex360-lite'); ?>
                </div>
            </div>
            
            <!-- Fallback for non-JS -->
            <noscript>
                <div class="vx-no-js-fallback">
                    <p><?php esc_html_e('This 360° tour requires JavaScript to be enabled.', 'vortex360-lite'); ?></p>
                    <?php if (!empty($tour_data['scenes'][0]['image'])): ?>
                        <img src="<?php echo esc_url($tour_data['scenes'][0]['image']); ?>" 
                             alt="<?php echo esc_attr($tour_data['title'] ?? __('360° Tour Preview', 'vortex360-lite')); ?>"
                             style="width: 100%; height: auto; max-height: 400px; object-fit: cover;">
                    <?php endif; ?>
                </div>
            </noscript>
        </div>
        <?php
        return ob_get_clean();
    }
    
    /**
     * AJAX handler for getting tour preview data
     */
    public function ajax_get_tour_preview() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'] ?? '', 'vx_gutenberg_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }
        
        $tour_id = intval($_POST['tour_id'] ?? 0);
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $tour_data = $this->get_tour_data($tour_id);
        if (!$tour_data) {
            wp_send_json_error(__('Tour not found', 'vortex360-lite'));
        }
        
        // Return preview data
        wp_send_json_success(array(
            'title' => $tour_data['title'],
            'scene_count' => count($tour_data['scenes']),
            'preview_image' => !empty($tour_data['scenes'][0]['image']) ? $tour_data['scenes'][0]['image'] : ''
        ));
    }
}

// Initialize the Gutenberg block
new VX_Gutenberg_Block();

// Add AJAX handlers
add_action('wp_ajax_vx_get_tour_preview', array('VX_Gutenberg_Block', 'ajax_get_tour_preview'));
add_action('wp_ajax_nopriv_vx_get_tour_preview', array('VX_Gutenberg_Block', 'ajax_get_tour_preview'));