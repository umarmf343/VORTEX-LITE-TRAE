<?php
/**
 * Vortex360 Lite - Import/Export Functionality
 * 
 * Handles tour data import and export operations
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class VX_Import_Export {
    
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
        add_action('wp_ajax_vx_export_tour', array($this, 'ajax_export_tour'));
        add_action('wp_ajax_vx_import_tour', array($this, 'ajax_import_tour'));
        add_action('wp_ajax_vx_export_all_tours', array($this, 'ajax_export_all_tours'));
        add_action('wp_ajax_vx_import_tours_file', array($this, 'ajax_import_tours_file'));
        
        // Add export/import buttons to admin
        add_action('admin_footer-edit.php', array($this, 'add_bulk_export_script'));
        add_filter('bulk_actions-edit-vx_tour', array($this, 'add_bulk_export_action'));
        add_filter('handle_bulk_actions-edit-vx_tour', array($this, 'handle_bulk_export'), 10, 3);
    }
    
    /**
     * Export single tour
     */
    public function ajax_export_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }
        
        // Check capabilities
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $tour_id = intval($_POST['tour_id']);
        
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $export_data = $this->export_tour_data($tour_id);
        
        if (!$export_data) {
            wp_send_json_error(__('Failed to export tour data', 'vortex360-lite'));
        }
        
        wp_send_json_success(array(
            'data' => $export_data,
            'filename' => sanitize_file_name('vortex360-tour-' . $tour_id . '-' . date('Y-m-d') . '.json')
        ));
    }
    
    /**
     * Import single tour
     */
    public function ajax_import_tour() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }
        
        // Check capabilities
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $import_data = json_decode(stripslashes($_POST['import_data']), true);
        
        if (!$import_data || !is_array($import_data)) {
            wp_send_json_error(__('Invalid import data', 'vortex360-lite'));
        }
        
        $result = $this->import_tour_data($import_data);
        
        if (is_wp_error($result)) {
            wp_send_json_error($result->get_error_message());
        }
        
        wp_send_json_success(array(
            'tour_id' => $result,
            'message' => __('Tour imported successfully', 'vortex360-lite')
        ));
    }
    
    /**
     * Export all tours
     */
    public function ajax_export_all_tours() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }
        
        // Check capabilities
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $export_data = $this->export_all_tours_data();
        
        if (!$export_data) {
            wp_send_json_error(__('No tours found to export', 'vortex360-lite'));
        }
        
        wp_send_json_success(array(
            'data' => $export_data,
            'filename' => sanitize_file_name('vortex360-all-tours-' . date('Y-m-d') . '.json')
        ));
    }
    
    /**
     * Import tours from file
     */
    public function ajax_import_tours_file() {
        // Verify nonce
        if (!wp_verify_nonce($_POST['nonce'], 'vx_admin_nonce')) {
            wp_die(__('Security check failed', 'vortex360-lite'));
        }
        
        // Check capabilities
        if (!current_user_can('edit_posts')) {
            wp_die(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['import_file'])) {
            wp_send_json_error(__('No file uploaded', 'vortex360-lite'));
        }
        
        $file = $_FILES['import_file'];
        
        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(__('File upload error', 'vortex360-lite'));
        }
        
        if ($file['type'] !== 'application/json' && pathinfo($file['name'], PATHINFO_EXTENSION) !== 'json') {
            wp_send_json_error(__('Invalid file type. Please upload a JSON file.', 'vortex360-lite'));
        }
        
        // Read file content
        $file_content = file_get_contents($file['tmp_name']);
        $import_data = json_decode($file_content, true);
        
        if (!$import_data || !is_array($import_data)) {
            wp_send_json_error(__('Invalid JSON file', 'vortex360-lite'));
        }
        
        $results = $this->import_multiple_tours($import_data);
        
        wp_send_json_success(array(
            'imported' => $results['success'],
            'failed' => $results['failed'],
            'message' => sprintf(
                __('Import completed. %d tours imported, %d failed.', 'vortex360-lite'),
                $results['success'],
                $results['failed']
            )
        ));
    }
    
    /**
     * Export tour data
     */
    public function export_tour_data($tour_id) {
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour') {
            return false;
        }
        
        // Get tour meta
        $tour_meta = get_post_meta($tour_id);
        
        // Clean up meta data
        $cleaned_meta = array();
        foreach ($tour_meta as $key => $value) {
            if (strpos($key, 'vx_') === 0 || strpos($key, '_vx_') === 0) {
                $cleaned_meta[$key] = is_array($value) && count($value) === 1 ? $value[0] : $value;
            }
        }
        
        // Get scenes data
        $scenes = get_post_meta($tour_id, 'vx_scenes', true);
        if (!is_array($scenes)) {
            $scenes = array();
        }
        
        // Get hotspots data
        $hotspots = get_post_meta($tour_id, 'vx_hotspots', true);
        if (!is_array($hotspots)) {
            $hotspots = array();
        }
        
        // Prepare export data
        $export_data = array(
            'version' => VX_LITE_VERSION,
            'export_date' => current_time('mysql'),
            'tour' => array(
                'title' => $tour->post_title,
                'content' => $tour->post_content,
                'excerpt' => $tour->post_excerpt,
                'status' => $tour->post_status,
                'meta' => $cleaned_meta,
                'scenes' => $scenes,
                'hotspots' => $hotspots
            )
        );
        
        return $export_data;
    }
    
    /**
     * Import tour data
     */
    public function import_tour_data($import_data, $update_existing = false) {
        // Validate import data
        if (!isset($import_data['tour']) || !is_array($import_data['tour'])) {
            return new WP_Error('invalid_data', __('Invalid tour data', 'vortex360-lite'));
        }
        
        $tour_data = $import_data['tour'];
        
        // Check Lite version limits
        $limits = new VX_Limits();
        if (!$limits->can_create_tour()) {
            return new WP_Error('limit_exceeded', __('Tour limit exceeded. Upgrade to Pro for unlimited tours.', 'vortex360-lite'));
        }
        
        // Prepare post data
        $post_data = array(
            'post_type' => 'vx_tour',
            'post_title' => sanitize_text_field($tour_data['title'] ?? __('Imported Tour', 'vortex360-lite')),
            'post_content' => wp_kses_post($tour_data['content'] ?? ''),
            'post_excerpt' => sanitize_textarea_field($tour_data['excerpt'] ?? ''),
            'post_status' => in_array($tour_data['status'] ?? 'draft', array('publish', 'draft', 'private')) ? $tour_data['status'] : 'draft',
            'post_author' => get_current_user_id()
        );
        
        // Create or update tour
        if ($update_existing && isset($tour_data['id'])) {
            $post_data['ID'] = intval($tour_data['id']);
            $tour_id = wp_update_post($post_data);
        } else {
            $tour_id = wp_insert_post($post_data);
        }
        
        if (is_wp_error($tour_id)) {
            return $tour_id;
        }
        
        // Import meta data
        if (isset($tour_data['meta']) && is_array($tour_data['meta'])) {
            foreach ($tour_data['meta'] as $key => $value) {
                if (strpos($key, 'vx_') === 0 || strpos($key, '_vx_') === 0) {
                    update_post_meta($tour_id, $key, $value);
                }
            }
        }
        
        // Import scenes
        if (isset($tour_data['scenes']) && is_array($tour_data['scenes'])) {
            // Apply Lite version limits
            $scenes = array_slice($tour_data['scenes'], 0, $limits->get_scenes_limit());
            update_post_meta($tour_id, 'vx_scenes', $scenes);
        }
        
        // Import hotspots
        if (isset($tour_data['hotspots']) && is_array($tour_data['hotspots'])) {
            // Apply Lite version limits
            $hotspots = array();
            $hotspots_limit = $limits->get_hotspots_limit();
            
            foreach ($tour_data['hotspots'] as $scene_id => $scene_hotspots) {
                if (is_array($scene_hotspots)) {
                    $hotspots[$scene_id] = array_slice($scene_hotspots, 0, $hotspots_limit);
                }
            }
            
            update_post_meta($tour_id, 'vx_hotspots', $hotspots);
        }
        
        return $tour_id;
    }
    
    /**
     * Export all tours data
     */
    public function export_all_tours_data() {
        $tours = get_posts(array(
            'post_type' => 'vx_tour',
            'post_status' => 'any',
            'posts_per_page' => -1
        ));
        
        if (empty($tours)) {
            return false;
        }
        
        $export_data = array(
            'version' => VX_LITE_VERSION,
            'export_date' => current_time('mysql'),
            'tours' => array()
        );
        
        foreach ($tours as $tour) {
            $tour_export = $this->export_tour_data($tour->ID);
            if ($tour_export) {
                $export_data['tours'][] = $tour_export['tour'];
            }
        }
        
        return $export_data;
    }
    
    /**
     * Import multiple tours
     */
    public function import_multiple_tours($import_data) {
        $results = array(
            'success' => 0,
            'failed' => 0,
            'errors' => array()
        );
        
        // Handle single tour format
        if (isset($import_data['tour'])) {
            $result = $this->import_tour_data($import_data);
            if (is_wp_error($result)) {
                $results['failed']++;
                $results['errors'][] = $result->get_error_message();
            } else {
                $results['success']++;
            }
            return $results;
        }
        
        // Handle multiple tours format
        if (isset($import_data['tours']) && is_array($import_data['tours'])) {
            foreach ($import_data['tours'] as $tour_data) {
                $result = $this->import_tour_data(array('tour' => $tour_data));
                if (is_wp_error($result)) {
                    $results['failed']++;
                    $results['errors'][] = $result->get_error_message();
                } else {
                    $results['success']++;
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Add bulk export action
     */
    public function add_bulk_export_action($actions) {
        $actions['vx_export'] = __('Export Tours', 'vortex360-lite');
        return $actions;
    }
    
    /**
     * Handle bulk export
     */
    public function handle_bulk_export($redirect_to, $action, $post_ids) {
        if ($action !== 'vx_export') {
            return $redirect_to;
        }
        
        if (empty($post_ids)) {
            return $redirect_to;
        }
        
        // Store export data in transient
        $export_data = array(
            'version' => VX_LITE_VERSION,
            'export_date' => current_time('mysql'),
            'tours' => array()
        );
        
        foreach ($post_ids as $post_id) {
            $tour_export = $this->export_tour_data($post_id);
            if ($tour_export) {
                $export_data['tours'][] = $tour_export['tour'];
            }
        }
        
        $transient_key = 'vx_bulk_export_' . wp_generate_password(12, false);
        set_transient($transient_key, $export_data, HOUR_IN_SECONDS);
        
        return add_query_arg(array(
            'vx_bulk_export' => $transient_key,
            'exported' => count($export_data['tours'])
        ), $redirect_to);
    }
    
    /**
     * Add bulk export script
     */
    public function add_bulk_export_script() {
        global $typenow;
        
        if ($typenow !== 'vx_tour') {
            return;
        }
        
        // Handle bulk export download
        if (isset($_GET['vx_bulk_export'])) {
            $transient_key = sanitize_text_field($_GET['vx_bulk_export']);
            $export_data = get_transient($transient_key);
            
            if ($export_data) {
                delete_transient($transient_key);
                
                $filename = 'vortex360-bulk-export-' . date('Y-m-d') . '.json';
                
                echo '<script>
                var exportData = ' . json_encode($export_data) . ';
                var blob = new Blob([JSON.stringify(exportData, null, 2)], {type: "application/json"});
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "' . $filename . '";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                </script>';
            }
        }
        ?>
        <script>
        jQuery(document).ready(function($) {
            // Handle bulk export completion message
            if (window.location.search.indexOf('exported=') > -1) {
                var urlParams = new URLSearchParams(window.location.search);
                var exported = urlParams.get('exported');
                if (exported) {
                    $('<div class="notice notice-success is-dismissible"><p>' + 
                      '<?php echo esc_js(__('Tours exported successfully!', 'vortex360-lite')); ?>' + 
                      '</p></div>').insertAfter('.wp-header-end');
                }
            }
        });
        </script>
        <?php
    }
    
    /**
     * Validate import data structure
     */
    public function validate_import_data($data) {
        if (!is_array($data)) {
            return false;
        }
        
        // Check for required fields
        if (isset($data['tour'])) {
            // Single tour format
            return isset($data['tour']['title']);
        } elseif (isset($data['tours'])) {
            // Multiple tours format
            return is_array($data['tours']) && !empty($data['tours']);
        }
        
        return false;
    }
    
    /**
     * Get import/export statistics
     */
    public function get_statistics() {
        global $wpdb;
        
        $stats = array(
            'total_tours' => wp_count_posts('vx_tour')->publish,
            'total_scenes' => 0,
            'total_hotspots' => 0,
            'last_export' => get_option('vx_last_export_date', ''),
            'last_import' => get_option('vx_last_import_date', '')
        );
        
        // Count scenes and hotspots
        $tours = get_posts(array(
            'post_type' => 'vx_tour',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'fields' => 'ids'
        ));
        
        foreach ($tours as $tour_id) {
            $scenes = get_post_meta($tour_id, 'vx_scenes', true);
            $hotspots = get_post_meta($tour_id, 'vx_hotspots', true);
            
            if (is_array($scenes)) {
                $stats['total_scenes'] += count($scenes);
            }
            
            if (is_array($hotspots)) {
                foreach ($hotspots as $scene_hotspots) {
                    if (is_array($scene_hotspots)) {
                        $stats['total_hotspots'] += count($scene_hotspots);
                    }
                }
            }
        }
        
        return $stats;
    }
    
    /**
     * Clean up old export files
     */
    public function cleanup_old_exports() {
        // Clean up transients older than 1 hour
        global $wpdb;
        
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} 
                 WHERE option_name LIKE %s 
                 AND option_name LIKE %s",
                '_transient_timeout_vx_bulk_export_%',
                '%' . $wpdb->esc_like('vx_bulk_export_') . '%'
            )
        );
        
        $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$wpdb->options} 
                 WHERE option_name LIKE %s 
                 AND option_name LIKE %s",
                '_transient_vx_bulk_export_%',
                '%' . $wpdb->esc_like('vx_bulk_export_') . '%'
            )
        );
    }
    
    /**
     * Schedule cleanup
     */
    public static function schedule_cleanup() {
        if (!wp_next_scheduled('vx_cleanup_exports')) {
            wp_schedule_event(time(), 'daily', 'vx_cleanup_exports');
        }
    }
    
    /**
     * Unschedule cleanup
     */
    public static function unschedule_cleanup() {
        wp_clear_scheduled_hook('vx_cleanup_exports');
    }
}

// Initialize import/export functionality
new VX_Import_Export();

// Schedule cleanup
add_action('init', array('VX_Import_Export', 'schedule_cleanup'));
add_action('vx_cleanup_exports', array(new VX_Import_Export(), 'cleanup_old_exports'));