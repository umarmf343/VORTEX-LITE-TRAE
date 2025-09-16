<?php
/**
 * Vortex360 Lite - Elementor Widget
 * 
 * Elementor widget for embedding 360° tours
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

use Elementor\Widget_Base;
use Elementor\Controls_Manager;
use Elementor\Group_Control_Typography;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;

class VX_Elementor_Widget extends Widget_Base {
    
    /**
     * Get widget name
     */
    public function get_name() {
        return 'vortex360-tour-viewer';
    }
    
    /**
     * Get widget title
     */
    public function get_title() {
        return __('360° Tour Viewer', 'vortex360-lite');
    }
    
    /**
     * Get widget icon
     */
    public function get_icon() {
        return 'eicon-video-camera';
    }
    
    /**
     * Get widget categories
     */
    public function get_categories() {
        return ['media'];
    }
    
    /**
     * Get widget keywords
     */
    public function get_keywords() {
        return ['360', 'tour', 'virtual', 'panorama', 'vortex360'];
    }
    
    /**
     * Register widget controls
     */
    protected function register_controls() {
        
        // Content Section
        $this->start_controls_section(
            'content_section',
            [
                'label' => __('Tour Settings', 'vortex360-lite'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );
        
        // Tour Selection
        $this->add_control(
            'tour_id',
            [
                'label' => __('Select Tour', 'vortex360-lite'),
                'type' => Controls_Manager::SELECT,
                'options' => $this->get_tours_options(),
                'default' => '',
                'description' => __('Choose a 360° tour to display', 'vortex360-lite'),
            ]
        );
        
        // No tours notice
        if (empty($this->get_tours_options())) {
            $this->add_control(
                'no_tours_notice',
                [
                    'type' => Controls_Manager::RAW_HTML,
                    'raw' => sprintf(
                        '<div style="background: #f0f8ff; padding: 15px; border-left: 4px solid #0073aa; margin: 10px 0;">'
                        . '<strong>%s</strong><br>'
                        . '%s <a href="%s" target="_blank">%s</a>'
                        . '</div>',
                        __('No Tours Found', 'vortex360-lite'),
                        __('You need to create a tour first.', 'vortex360-lite'),
                        admin_url('post-new.php?post_type=vx_tour'),
                        __('Create Tour', 'vortex360-lite')
                    ),
                ]
            );
        }
        
        $this->end_controls_section();
        
        // Dimensions Section
        $this->start_controls_section(
            'dimensions_section',
            [
                'label' => __('Dimensions', 'vortex360-lite'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_responsive_control(
            'width',
            [
                'label' => __('Width', 'vortex360-lite'),
                'type' => Controls_Manager::SLIDER,
                'size_units' => ['px', '%', 'vw'],
                'range' => [
                    'px' => [
                        'min' => 300,
                        'max' => 2000,
                    ],
                    '%' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                    'vw' => [
                        'min' => 10,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => '%',
                    'size' => 100,
                ],
                'selectors' => [
                    '{{WRAPPER}} .vx-elementor-widget' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'height',
            [
                'label' => __('Height', 'vortex360-lite'),
                'type' => Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 200,
                        'max' => 1000,
                    ],
                    'vh' => [
                        'min' => 20,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 600,
                ],
                'selectors' => [
                    '{{WRAPPER}} .vx-elementor-widget' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Controls Section
        $this->start_controls_section(
            'controls_section',
            [
                'label' => __('Viewer Controls', 'vortex360-lite'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'show_controls',
            [
                'label' => __('Show Controls', 'vortex360-lite'),
                'type' => Controls_Manager::SWITCHER,
                'label_on' => __('Show', 'vortex360-lite'),
                'label_off' => __('Hide', 'vortex360-lite'),
                'return_value' => 'yes',
                'default' => 'yes',
                'description' => __('Display viewer control buttons', 'vortex360-lite'),
            ]
        );
        
        $this->add_control(
            'mouse_zoom',
            [
                'label' => __('Mouse Zoom', 'vortex360-lite'),
                'type' => Controls_Manager::SWITCHER,
                'label_on' => __('Enable', 'vortex360-lite'),
                'label_off' => __('Disable', 'vortex360-lite'),
                'return_value' => 'yes',
                'default' => 'yes',
                'description' => __('Allow zooming with mouse wheel', 'vortex360-lite'),
            ]
        );
        
        $this->add_control(
            'auto_rotate',
            [
                'label' => __('Auto Rotate', 'vortex360-lite'),
                'type' => Controls_Manager::SWITCHER,
                'label_on' => __('Enable', 'vortex360-lite'),
                'label_off' => __('Disable', 'vortex360-lite'),
                'return_value' => 'yes',
                'default' => '',
                'description' => __('Automatically rotate the view', 'vortex360-lite'),
            ]
        );
        
        $this->add_control(
            'auto_rotate_speed',
            [
                'label' => __('Auto Rotate Speed', 'vortex360-lite'),
                'type' => Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 1,
                        'max' => 10,
                        'step' => 0.5,
                    ],
                ],
                'default' => [
                    'size' => 2,
                ],
                'condition' => [
                    'auto_rotate' => 'yes',
                ],
                'description' => __('Speed of automatic rotation', 'vortex360-lite'),
            ]
        );
        
        $this->end_controls_section();
        
        // Style Section
        $this->start_controls_section(
            'style_section',
            [
                'label' => __('Style', 'vortex360-lite'),
                'tab' => Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_group_control(
            Group_Control_Border::get_type(),
            [
                'name' => 'border',
                'selector' => '{{WRAPPER}} .vx-elementor-widget',
            ]
        );
        
        $this->add_responsive_control(
            'border_radius',
            [
                'label' => __('Border Radius', 'vortex360-lite'),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .vx-elementor-widget' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_group_control(
            Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'box_shadow',
                'selector' => '{{WRAPPER}} .vx-elementor-widget',
            ]
        );
        
        $this->add_responsive_control(
            'margin',
            [
                'label' => __('Margin', 'vortex360-lite'),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%', 'em'],
                'selectors' => [
                    '{{WRAPPER}} .vx-elementor-widget' => 'margin: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_responsive_control(
            'padding',
            [
                'label' => __('Padding', 'vortex360-lite'),
                'type' => Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%', 'em'],
                'selectors' => [
                    '{{WRAPPER}} .vx-elementor-widget' => 'padding: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );
        
        $this->end_controls_section();
        
        // Upgrade Section
        $this->start_controls_section(
            'upgrade_section',
            [
                'label' => __('Upgrade to Pro', 'vortex360-lite'),
                'tab' => Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'upgrade_notice',
            [
                'type' => Controls_Manager::RAW_HTML,
                'raw' => sprintf(
                    '<div style="background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 20px; border-radius: 8px; text-align: center;">'
                    . '<h3 style="color: white; margin: 0 0 10px 0;">%s</h3>'
                    . '<p style="margin: 0 0 15px 0; opacity: 0.9;">%s</p>'
                    . '<a href="#" target="_blank" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 8px 20px; border-radius: 20px; text-decoration: none; font-weight: 500; border: 1px solid rgba(255,255,255,0.3);">%s</a>'
                    . '</div>',
                    __('Unlock Premium Features', 'vortex360-lite'),
                    __('Get unlimited tours, advanced hotspots, analytics, and more with Vortex360 Pro!', 'vortex360-lite'),
                    __('Upgrade Now', 'vortex360-lite')
                ),
            ]
        );
        
        $this->end_controls_section();
    }
    
    /**
     * Get tours options for select control
     */
    private function get_tours_options() {
        $tours = get_posts([
            'post_type' => 'vx_tour',
            'post_status' => ['publish', 'draft'],
            'posts_per_page' => -1,
            'orderby' => 'title',
            'order' => 'ASC'
        ]);
        
        $options = ['' => __('Select a Tour', 'vortex360-lite')];
        
        foreach ($tours as $tour) {
            $options[$tour->ID] = $tour->post_title ?: sprintf(__('Tour #%d', 'vortex360-lite'), $tour->ID);
        }
        
        return $options;
    }
    
    /**
     * Render widget output on the frontend
     */
    protected function render() {
        $settings = $this->get_settings_for_display();
        
        $tour_id = intval($settings['tour_id'] ?? 0);
        
        if (!$tour_id) {
            if (\Elementor\Plugin::$instance->editor->is_edit_mode()) {
                echo '<div class="vx-elementor-placeholder">';
                echo '<div class="vx-placeholder-icon">';
                echo '<svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">';
                echo '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>';
                echo '</svg>';
                echo '</div>';
                echo '<p>' . __('Please select a tour to display', 'vortex360-lite') . '</p>';
                echo '</div>';
            }
            return;
        }
        
        // Check if tour exists
        $tour = get_post($tour_id);
        if (!$tour || $tour->post_type !== 'vx_tour' || $tour->post_status !== 'publish') {
            if (\Elementor\Plugin::$instance->editor->is_edit_mode()) {
                echo '<div class="vx-elementor-error">';
                echo '<p>' . __('Selected tour not found or not published', 'vortex360-lite') . '</p>';
                echo '</div>';
            }
            return;
        }
        
        // Get dimensions
        $width = $this->get_responsive_setting('width', '%', 100);
        $height = $this->get_responsive_setting('height', 'px', 600);
        
        // Prepare options
        $options = [
            'tourId' => $tour_id,
            'width' => $width,
            'height' => $height,
            'autoLoad' => true,
            'showControls' => $settings['show_controls'] === 'yes',
            'mouseZoom' => $settings['mouse_zoom'] === 'yes',
            'autoRotate' => $settings['auto_rotate'] === 'yes',
            'autoRotateSpeed' => floatval($settings['auto_rotate_speed']['size'] ?? 2)
        ];
        
        // Enqueue frontend assets
        $this->enqueue_frontend_assets();
        
        // Render widget
        echo '<div class="vx-elementor-widget" data-options="' . esc_attr(json_encode($options)) . '">';
        
        // Loading placeholder
        echo '<div class="vx-elementor-loading">';
        echo '<div class="vx-loading-spinner"><div class="vx-spinner"></div></div>';
        echo '<div class="vx-loading-text">' . __('Loading 360° Tour...', 'vortex360-lite') . '</div>';
        echo '</div>';
        
        // Fallback for non-JS
        echo '<noscript>';
        echo '<div class="vx-no-js-fallback">';
        echo '<p>' . __('This 360° tour requires JavaScript to be enabled.', 'vortex360-lite') . '</p>';
        
        // Show first scene image as fallback
        $scenes_data = get_post_meta($tour_id, '_vx_scenes', true);
        if (!empty($scenes_data[0]['image'])) {
            echo '<img src="' . esc_url($scenes_data[0]['image']) . '" alt="' . esc_attr($tour->post_title) . '" style="width: 100%; height: auto; max-height: 400px; object-fit: cover;">';
        }
        
        echo '</div>';
        echo '</noscript>';
        
        echo '</div>';
    }
    
    /**
     * Get responsive setting value
     */
    private function get_responsive_setting($setting, $unit = 'px', $default = 0) {
        $settings = $this->get_settings_for_display();
        
        // Try to get current device setting
        $current_device = \Elementor\Plugin::$instance->breakpoints->get_current_breakpoint();
        $setting_key = $setting . '_' . $current_device;
        
        if (!empty($settings[$setting_key]['size'])) {
            return $settings[$setting_key]['size'] . ($settings[$setting_key]['unit'] ?? $unit);
        }
        
        // Fallback to default setting
        if (!empty($settings[$setting]['size'])) {
            return $settings[$setting]['size'] . ($settings[$setting]['unit'] ?? $unit);
        }
        
        return $default . $unit;
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
        
        // Elementor specific styles
        wp_enqueue_style('vx-elementor-widget');
    }
    
    /**
     * Render widget output in the editor
     */
    protected function content_template() {
        ?>
        <#
        var tourId = settings.tour_id;
        
        if (!tourId) {
            #>
            <div class="vx-elementor-placeholder">
                <div class="vx-placeholder-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                </div>
                <p><?php _e('Please select a tour to display', 'vortex360-lite'); ?></p>
            </div>
            <#
        } else {
            #>
            <div class="vx-elementor-preview">
                <div class="vx-preview-overlay">
                    <div class="vx-preview-info">
                        <h3><?php _e('360° Tour Preview', 'vortex360-lite'); ?></h3>
                        <p><?php _e('Tour ID:', 'vortex360-lite'); ?> {{ tourId }}</p>
                        <div class="vx-preview-badge"><?php _e('Live Preview', 'vortex360-lite'); ?></div>
                    </div>
                </div>
                <div class="vx-preview-placeholder">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <p><?php _e('360° Tour Viewer', 'vortex360-lite'); ?></p>
                </div>
            </div>
            <#
        }
        #>
        <?php
    }
}