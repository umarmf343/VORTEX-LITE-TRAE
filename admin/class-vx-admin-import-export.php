<?php
/**
 * Vortex360 Lite - Admin Import/Export Management
 * 
 * Handles tour data import/export, backup/restore functionality
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin import/export management class.
 * Handles tour data import, export, and backup operations.
 */
class VX_Admin_Import_Export {
    
    /**
     * Supported export formats.
     * @var array
     */
    private $export_formats = ['json', 'xml', 'csv'];
    
    /**
     * Maximum file size for imports (5MB).
     * @var int
     */
    private $max_import_size = 5242880;
    
    /**
     * Temporary directory for processing.
     * @var string
     */
    private $temp_dir = '';
    
    /**
     * Initialize import/export management.
     * Sets up hooks and temporary directory.
     */
    public function __construct() {
        $this->setup_temp_directory();
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for import/export handling.
     */
    private function init_hooks() {
        // AJAX handlers
        add_action('wp_ajax_vx_export_tour', [$this, 'ajax_export_tour']);
        add_action('wp_ajax_vx_export_all_tours', [$this, 'ajax_export_all_tours']);
        add_action('wp_ajax_vx_import_tour', [$this, 'ajax_import_tour']);
        add_action('wp_ajax_vx_validate_import', [$this, 'ajax_validate_import']);
        add_action('wp_ajax_vx_backup_settings', [$this, 'ajax_backup_settings']);
        add_action('wp_ajax_vx_restore_settings', [$this, 'ajax_restore_settings']);
        
        // Admin menu
        add_action('admin_menu', [$this, 'add_import_export_page']);
        
        // Admin scripts
        add_action('admin_enqueue_scripts', [$this, 'enqueue_scripts']);
        
        // File upload handling
        add_filter('upload_mimes', [$this, 'add_import_mimes']);
        
        // Cleanup scheduled event
        add_action('vx_cleanup_temp_files', [$this, 'cleanup_temp_files']);
        
        // Schedule cleanup if not already scheduled
        if (!wp_next_scheduled('vx_cleanup_temp_files')) {
            wp_schedule_event(time(), 'daily', 'vx_cleanup_temp_files');
        }
    }
    
    /**
     * Set up temporary directory for processing.
     * Creates directory for temporary import/export files.
     */
    private function setup_temp_directory() {
        $upload_dir = wp_upload_dir();
        $this->temp_dir = $upload_dir['basedir'] . '/vortex360-temp';
        
        if (!file_exists($this->temp_dir)) {
            wp_mkdir_p($this->temp_dir);
            
            // Create .htaccess for security
            $htaccess_content = "# Vortex360 Temporary Files\n";
            $htaccess_content .= "deny from all\n";
            
            file_put_contents($this->temp_dir . '/.htaccess', $htaccess_content);
        }
    }
    
    /**
     * Add import/export admin page.
     * Creates submenu page for import/export functionality.
     */
    public function add_import_export_page() {
        add_submenu_page(
            'edit.php?post_type=vx_tour',
            __('Import/Export', 'vortex360-lite'),
            __('Import/Export', 'vortex360-lite'),
            'manage_options',
            'vx-import-export',
            [$this, 'render_import_export_page']
        );
    }
    
    /**
     * Render import/export admin page.
     * Displays the import/export interface.
     */
    public function render_import_export_page() {
        ?>
        <div class="wrap">
            <h1><?php _e('Import/Export Tours', 'vortex360-lite'); ?></h1>
            
            <div class="vx-import-export-container">
                <!-- Export Section -->
                <div class="vx-section vx-export-section">
                    <h2><?php _e('Export Tours', 'vortex360-lite'); ?></h2>
                    <p><?php _e('Export your tours for backup or migration purposes.', 'vortex360-lite'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Export Type', 'vortex360-lite'); ?></th>
                            <td>
                                <label>
                                    <input type="radio" name="export_type" value="single" checked>
                                    <?php _e('Single Tour', 'vortex360-lite'); ?>
                                </label><br>
                                <label>
                                    <input type="radio" name="export_type" value="all">
                                    <?php _e('All Tours', 'vortex360-lite'); ?>
                                </label>
                            </td>
                        </tr>
                        <tr class="export-single-row">
                            <th scope="row"><?php _e('Select Tour', 'vortex360-lite'); ?></th>
                            <td>
                                <select id="export-tour-select" name="tour_id">
                                    <option value=""><?php _e('Select a tour...', 'vortex360-lite'); ?></option>
                                    <?php
                                    $tours = get_posts([
                                        'post_type' => 'vx_tour',
                                        'post_status' => 'any',
                                        'posts_per_page' => -1,
                                        'orderby' => 'title',
                                        'order' => 'ASC'
                                    ]);
                                    
                                    foreach ($tours as $tour) {
                                        echo '<option value="' . $tour->ID . '">' . esc_html($tour->post_title) . '</option>';
                                    }
                                    ?>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Export Format', 'vortex360-lite'); ?></th>
                            <td>
                                <select id="export-format" name="format">
                                    <option value="json"><?php _e('JSON (Recommended)', 'vortex360-lite'); ?></option>
                                    <option value="xml"><?php _e('XML', 'vortex360-lite'); ?></option>
                                    <option value="csv"><?php _e('CSV (Data Only)', 'vortex360-lite'); ?></option>
                                </select>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Include Images', 'vortex360-lite'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" id="include-images" name="include_images" value="1" checked>
                                    <?php _e('Include image files in export', 'vortex360-lite'); ?>
                                </label>
                                <p class="description"><?php _e('Note: Including images will create a larger export file.', 'vortex360-lite'); ?></p>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="button" id="export-tours-btn" class="button button-primary">
                            <?php _e('Export Tours', 'vortex360-lite'); ?>
                        </button>
                    </p>
                    
                    <div id="export-progress" class="vx-progress" style="display: none;">
                        <div class="vx-progress-bar">
                            <div class="vx-progress-fill"></div>
                        </div>
                        <div class="vx-progress-text"><?php _e('Preparing export...', 'vortex360-lite'); ?></div>
                    </div>
                </div>
                
                <!-- Import Section -->
                <div class="vx-section vx-import-section">
                    <h2><?php _e('Import Tours', 'vortex360-lite'); ?></h2>
                    <p><?php _e('Import tours from a previously exported file.', 'vortex360-lite'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Import File', 'vortex360-lite'); ?></th>
                            <td>
                                <input type="file" id="import-file" name="import_file" accept=".json,.xml,.csv,.zip">
                                <p class="description">
                                    <?php _e('Supported formats: JSON, XML, CSV, ZIP', 'vortex360-lite'); ?><br>
                                    <?php printf(__('Maximum file size: %s', 'vortex360-lite'), size_format($this->max_import_size)); ?>
                                </p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Import Options', 'vortex360-lite'); ?></th>
                            <td>
                                <label>
                                    <input type="checkbox" id="overwrite-existing" name="overwrite_existing" value="1">
                                    <?php _e('Overwrite existing tours with same name', 'vortex360-lite'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox" id="import-images" name="import_images" value="1" checked>
                                    <?php _e('Import image files', 'vortex360-lite'); ?>
                                </label><br>
                                <label>
                                    <input type="checkbox" id="validate-only" name="validate_only" value="1">
                                    <?php _e('Validate only (don\'t import)', 'vortex360-lite'); ?>
                                </label>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <button type="button" id="import-tours-btn" class="button button-primary" disabled>
                            <?php _e('Import Tours', 'vortex360-lite'); ?>
                        </button>
                    </p>
                    
                    <div id="import-progress" class="vx-progress" style="display: none;">
                        <div class="vx-progress-bar">
                            <div class="vx-progress-fill"></div>
                        </div>
                        <div class="vx-progress-text"><?php _e('Processing import...', 'vortex360-lite'); ?></div>
                    </div>
                    
                    <div id="import-results" class="vx-results" style="display: none;"></div>
                </div>
                
                <!-- Settings Backup Section -->
                <div class="vx-section vx-backup-section">
                    <h2><?php _e('Settings Backup', 'vortex360-lite'); ?></h2>
                    <p><?php _e('Backup and restore plugin settings.', 'vortex360-lite'); ?></p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><?php _e('Backup Settings', 'vortex360-lite'); ?></th>
                            <td>
                                <button type="button" id="backup-settings-btn" class="button">
                                    <?php _e('Download Settings Backup', 'vortex360-lite'); ?>
                                </button>
                                <p class="description"><?php _e('Downloads a JSON file with all plugin settings.', 'vortex360-lite'); ?></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><?php _e('Restore Settings', 'vortex360-lite'); ?></th>
                            <td>
                                <input type="file" id="restore-file" name="restore_file" accept=".json">
                                <button type="button" id="restore-settings-btn" class="button" disabled>
                                    <?php _e('Restore Settings', 'vortex360-lite'); ?>
                                </button>
                                <p class="description"><?php _e('Upload a settings backup file to restore.', 'vortex360-lite'); ?></p>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
        </div>
        
        <style>
        .vx-import-export-container {
            max-width: 800px;
        }
        
        .vx-section {
            background: #fff;
            border: 1px solid #ccd0d4;
            border-radius: 4px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .vx-section h2 {
            margin-top: 0;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }
        
        .vx-progress {
            margin-top: 15px;
        }
        
        .vx-progress-bar {
            width: 100%;
            height: 20px;
            background: #f1f1f1;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .vx-progress-fill {
            height: 100%;
            background: #0073aa;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .vx-progress-text {
            font-size: 14px;
            color: #666;
        }
        
        .vx-results {
            margin-top: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #0073aa;
        }
        
        .vx-results.error {
            border-left-color: #dc3232;
            background: #ffeaea;
        }
        
        .vx-results.success {
            border-left-color: #46b450;
            background: #eafaea;
        }
        </style>
        <?php
    }
    
    /**
     * Enqueue admin scripts and styles.
     * Loads JavaScript for import/export functionality.
     * 
     * @param string $hook Current admin page hook
     */
    public function enqueue_scripts($hook) {
        if ($hook !== 'vx_tour_page_vx-import-export') {
            return;
        }
        
        wp_enqueue_script(
            'vx-import-export',
            VX_PLUGIN_URL . 'assets/js/admin-import-export.js',
            ['jquery', 'wp-util'],
            VX_VERSION,
            true
        );
        
        wp_localize_script('vx-import-export', 'vxImportExport', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_import_export'),
            'maxFileSize' => $this->max_import_size,
            'strings' => [
                'selectTour' => __('Please select a tour to export', 'vortex360-lite'),
                'selectFile' => __('Please select a file to import', 'vortex360-lite'),
                'fileTooLarge' => __('File is too large. Maximum size: %s', 'vortex360-lite'),
                'invalidFormat' => __('Invalid file format', 'vortex360-lite'),
                'exportSuccess' => __('Export completed successfully', 'vortex360-lite'),
                'importSuccess' => __('Import completed successfully', 'vortex360-lite'),
                'backupSuccess' => __('Settings backup created', 'vortex360-lite'),
                'restoreSuccess' => __('Settings restored successfully', 'vortex360-lite'),
                'processing' => __('Processing...', 'vortex360-lite'),
                'validating' => __('Validating file...', 'vortex360-lite'),
                'importing' => __('Importing tours...', 'vortex360-lite'),
                'exporting' => __('Exporting tours...', 'vortex360-lite')
            ]
        ]);
    }
    
    /**
     * Add supported import MIME types.
     * Allows import file formats to be uploaded.
     * 
     * @param array $mimes Existing MIME types
     * @return array Modified MIME types
     */
    public function add_import_mimes($mimes) {
        $mimes['json'] = 'application/json';
        $mimes['xml'] = 'application/xml';
        $mimes['csv'] = 'text/csv';
        return $mimes;
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for exporting single tour.
     * Exports tour data in specified format.
     */
    public function ajax_export_tour() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('export')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $tour_id = intval($_POST['tour_id'] ?? 0);
        $format = sanitize_text_field($_POST['format'] ?? 'json');
        $include_images = !empty($_POST['include_images']);
        
        if (!$tour_id) {
            wp_send_json_error(__('Invalid tour ID', 'vortex360-lite'));
        }
        
        $tour = get_post($tour_id);
        
        if (!$tour || $tour->post_type !== 'vx_tour') {
            wp_send_json_error(__('Tour not found', 'vortex360-lite'));
        }
        
        try {
            $export_data = $this->prepare_tour_export($tour_id, $include_images);
            $filename = $this->generate_export_file($export_data, $format, $tour->post_title);
            
            wp_send_json_success([
                'filename' => basename($filename),
                'download_url' => $this->get_download_url($filename),
                'filesize' => size_format(filesize($filename))
            ]);
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX handler for exporting all tours.
     * Exports all tours in specified format.
     */
    public function ajax_export_all_tours() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('export')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $format = sanitize_text_field($_POST['format'] ?? 'json');
        $include_images = !empty($_POST['include_images']);
        
        try {
            $tours = get_posts([
                'post_type' => 'vx_tour',
                'post_status' => 'any',
                'posts_per_page' => -1
            ]);
            
            if (empty($tours)) {
                wp_send_json_error(__('No tours found to export', 'vortex360-lite'));
            }
            
            $export_data = [];
            
            foreach ($tours as $tour) {
                $export_data[] = $this->prepare_tour_export($tour->ID, $include_images);
            }
            
            $filename = $this->generate_export_file($export_data, $format, 'all-tours');
            
            wp_send_json_success([
                'filename' => basename($filename),
                'download_url' => $this->get_download_url($filename),
                'filesize' => size_format(filesize($filename)),
                'tour_count' => count($tours)
            ]);
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX handler for importing tours.
     * Processes uploaded import file.
     */
    public function ajax_import_tour() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('import')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['import_file'])) {
            wp_send_json_error(__('No file uploaded', 'vortex360-lite'));
        }
        
        $file = $_FILES['import_file'];
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error(__('File upload error', 'vortex360-lite'));
        }
        
        if ($file['size'] > $this->max_import_size) {
            wp_send_json_error(sprintf(
                __('File too large. Maximum size: %s', 'vortex360-lite'),
                size_format($this->max_import_size)
            ));
        }
        
        $overwrite = !empty($_POST['overwrite_existing']);
        $import_images = !empty($_POST['import_images']);
        $validate_only = !empty($_POST['validate_only']);
        
        try {
            $import_data = $this->parse_import_file($file);
            
            if ($validate_only) {
                $validation = $this->validate_import_data($import_data);
                wp_send_json_success([
                    'validation' => $validation,
                    'tour_count' => count($import_data)
                ]);
            } else {
                $result = $this->process_import($import_data, $overwrite, $import_images);
                wp_send_json_success($result);
            }
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX handler for validating import file.
     * Validates import file without importing.
     */
    public function ajax_validate_import() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('import')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['import_file'])) {
            wp_send_json_error(__('No file uploaded', 'vortex360-lite'));
        }
        
        try {
            $import_data = $this->parse_import_file($_FILES['import_file']);
            $validation = $this->validate_import_data($import_data);
            
            wp_send_json_success([
                'validation' => $validation,
                'tour_count' => count($import_data),
                'valid' => $validation['errors'] === 0
            ]);
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX handler for backing up settings.
     * Creates downloadable settings backup.
     */
    public function ajax_backup_settings() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        try {
            $settings = $this->get_all_settings();
            $filename = $this->generate_settings_backup($settings);
            
            wp_send_json_success([
                'filename' => basename($filename),
                'download_url' => $this->get_download_url($filename),
                'filesize' => size_format(filesize($filename))
            ]);
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    /**
     * AJAX handler for restoring settings.
     * Restores settings from backup file.
     */
    public function ajax_restore_settings() {
        check_ajax_referer('vx_import_export', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['restore_file'])) {
            wp_send_json_error(__('No file uploaded', 'vortex360-lite'));
        }
        
        try {
            $settings = $this->parse_settings_backup($_FILES['restore_file']);
            $this->restore_settings($settings);
            
            wp_send_json_success(__('Settings restored successfully', 'vortex360-lite'));
            
        } catch (Exception $e) {
            wp_send_json_error($e->getMessage());
        }
    }
    
    // Helper Methods
    
    /**
     * Prepare tour data for export.
     * Extracts all tour data including metadata and images.
     * 
     * @param int $tour_id Tour post ID
     * @param bool $include_images Whether to include image data
     * @return array Tour export data
     */
    private function prepare_tour_export($tour_id, $include_images = true) {
        $tour = get_post($tour_id);
        
        if (!$tour) {
            throw new Exception(__('Tour not found', 'vortex360-lite'));
        }
        
        $export_data = [
            'id' => $tour->ID,
            'title' => $tour->post_title,
            'content' => $tour->post_content,
            'excerpt' => $tour->post_excerpt,
            'status' => $tour->post_status,
            'date' => $tour->post_date,
            'modified' => $tour->post_modified,
            'meta' => [],
            'scenes' => [],
            'settings' => [],
            'version' => VX_VERSION,
            'export_date' => current_time('mysql')
        ];
        
        // Get all post meta
        $meta_keys = [
            '_vx_tour_scenes',
            '_vx_tour_settings',
            '_vx_tour_hotspots',
            '_vx_tour_seo',
            '_vx_tour_status'
        ];
        
        foreach ($meta_keys as $key) {
            $value = get_post_meta($tour_id, $key, true);
            if (!empty($value)) {
                $export_data['meta'][$key] = $value;
            }
        }
        
        // Process scenes and images
        $scenes = get_post_meta($tour_id, '_vx_tour_scenes', true);
        
        if (is_array($scenes)) {
            foreach ($scenes as $scene_id => $scene) {
                $scene_data = $scene;
                
                if ($include_images && !empty($scene['image'])) {
                    $scene_data['image_data'] = $this->get_image_data($scene['image']);
                }
                
                $export_data['scenes'][$scene_id] = $scene_data;
            }
        }
        
        // Get tour settings
        $settings = get_post_meta($tour_id, '_vx_tour_settings', true);
        if (is_array($settings)) {
            $export_data['settings'] = $settings;
        }
        
        return $export_data;
    }
    
    /**
     * Generate export file in specified format.
     * Creates downloadable export file.
     * 
     * @param array $data Export data
     * @param string $format Export format (json, xml, csv)
     * @param string $name Base filename
     * @return string Generated file path
     */
    private function generate_export_file($data, $format, $name) {
        $filename = sanitize_file_name($name) . '-' . date('Y-m-d-H-i-s');
        
        switch ($format) {
            case 'json':
                $content = wp_json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
                $filepath = $this->temp_dir . '/' . $filename . '.json';
                break;
                
            case 'xml':
                $content = $this->array_to_xml($data, 'vortex360_export');
                $filepath = $this->temp_dir . '/' . $filename . '.xml';
                break;
                
            case 'csv':
                $content = $this->array_to_csv($data);
                $filepath = $this->temp_dir . '/' . $filename . '.csv';
                break;
                
            default:
                throw new Exception(__('Unsupported export format', 'vortex360-lite'));
        }
        
        if (file_put_contents($filepath, $content) === false) {
            throw new Exception(__('Failed to create export file', 'vortex360-lite'));
        }
        
        return $filepath;
    }
    
    /**
     * Parse import file and extract data.
     * Handles different import file formats.
     * 
     * @param array $file Uploaded file data
     * @return array Parsed import data
     */
    private function parse_import_file($file) {
        $file_info = pathinfo($file['name']);
        $extension = strtolower($file_info['extension'] ?? '');
        
        $content = file_get_contents($file['tmp_name']);
        
        if ($content === false) {
            throw new Exception(__('Failed to read import file', 'vortex360-lite'));
        }
        
        switch ($extension) {
            case 'json':
                $data = json_decode($content, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    throw new Exception(__('Invalid JSON format', 'vortex360-lite'));
                }
                break;
                
            case 'xml':
                $data = $this->xml_to_array($content);
                break;
                
            case 'csv':
                $data = $this->csv_to_array($content);
                break;
                
            case 'zip':
                $data = $this->extract_zip_import($file['tmp_name']);
                break;
                
            default:
                throw new Exception(__('Unsupported import format', 'vortex360-lite'));
        }
        
        // Ensure data is in array format
        if (!is_array($data)) {
            throw new Exception(__('Invalid import data format', 'vortex360-lite'));
        }
        
        // If single tour, wrap in array
        if (isset($data['id']) && isset($data['title'])) {
            $data = [$data];
        }
        
        return $data;
    }
    
    /**
     * Validate import data structure.
     * Checks data integrity and compatibility.
     * 
     * @param array $data Import data
     * @return array Validation results
     */
    private function validate_import_data($data) {
        $validation = [
            'errors' => 0,
            'warnings' => 0,
            'messages' => []
        ];
        
        foreach ($data as $index => $tour_data) {
            $tour_index = $index + 1;
            
            // Check required fields
            if (empty($tour_data['title'])) {
                $validation['errors']++;
                $validation['messages'][] = sprintf(
                    __('Tour %d: Missing title', 'vortex360-lite'),
                    $tour_index
                );
            }
            
            // Check scenes
            if (empty($tour_data['scenes']) && empty($tour_data['meta']['_vx_tour_scenes'])) {
                $validation['warnings']++;
                $validation['messages'][] = sprintf(
                    __('Tour %d: No scenes found', 'vortex360-lite'),
                    $tour_index
                );
            }
            
            // Check version compatibility
            if (!empty($tour_data['version'])) {
                if (version_compare($tour_data['version'], VX_VERSION, '>')) {
                    $validation['warnings']++;
                    $validation['messages'][] = sprintf(
                        __('Tour %d: Created with newer plugin version (%s)', 'vortex360-lite'),
                        $tour_index,
                        $tour_data['version']
                    );
                }
            }
            
            // Check for existing tours with same name
            if (!empty($tour_data['title'])) {
                $existing = get_page_by_title($tour_data['title'], OBJECT, 'vx_tour');
                if ($existing) {
                    $validation['warnings']++;
                    $validation['messages'][] = sprintf(
                        __('Tour %d: Tour with name "%s" already exists', 'vortex360-lite'),
                        $tour_index,
                        $tour_data['title']
                    );
                }
            }
        }
        
        return $validation;
    }
    
    /**
     * Process import data and create tours.
     * Imports validated tour data.
     * 
     * @param array $data Import data
     * @param bool $overwrite Whether to overwrite existing tours
     * @param bool $import_images Whether to import image files
     * @return array Import results
     */
    private function process_import($data, $overwrite = false, $import_images = true) {
        $results = [
            'imported' => 0,
            'skipped' => 0,
            'errors' => 0,
            'messages' => []
        ];
        
        foreach ($data as $index => $tour_data) {
            try {
                $tour_index = $index + 1;
                
                // Check for existing tour
                $existing = null;
                if (!empty($tour_data['title'])) {
                    $existing = get_page_by_title($tour_data['title'], OBJECT, 'vx_tour');
                }
                
                if ($existing && !$overwrite) {
                    $results['skipped']++;
                    $results['messages'][] = sprintf(
                        __('Tour %d: Skipped (already exists)', 'vortex360-lite'),
                        $tour_index
                    );
                    continue;
                }
                
                // Create or update tour
                $tour_args = [
                    'post_title' => $tour_data['title'] ?? '',
                    'post_content' => $tour_data['content'] ?? '',
                    'post_excerpt' => $tour_data['excerpt'] ?? '',
                    'post_status' => $tour_data['status'] ?? 'draft',
                    'post_type' => 'vx_tour'
                ];
                
                if ($existing && $overwrite) {
                    $tour_args['ID'] = $existing->ID;
                    $tour_id = wp_update_post($tour_args);
                } else {
                    $tour_id = wp_insert_post($tour_args);
                }
                
                if (is_wp_error($tour_id)) {
                    throw new Exception($tour_id->get_error_message());
                }
                
                // Import metadata
                if (!empty($tour_data['meta'])) {
                    foreach ($tour_data['meta'] as $key => $value) {
                        update_post_meta($tour_id, $key, $value);
                    }
                }
                
                // Import scenes with images
                if (!empty($tour_data['scenes']) && $import_images) {
                    $this->import_tour_images($tour_id, $tour_data['scenes']);
                }
                
                // Import settings
                if (!empty($tour_data['settings'])) {
                    update_post_meta($tour_id, '_vx_tour_settings', $tour_data['settings']);
                }
                
                $results['imported']++;
                $results['messages'][] = sprintf(
                    __('Tour %d: Imported successfully ("%s")', 'vortex360-lite'),
                    $tour_index,
                    $tour_data['title']
                );
                
            } catch (Exception $e) {
                $results['errors']++;
                $results['messages'][] = sprintf(
                    __('Tour %d: Import failed - %s', 'vortex360-lite'),
                    $tour_index,
                    $e->getMessage()
                );
            }
        }
        
        return $results;
    }
    
    /**
     * Import tour images from export data.
     * Recreates image files from base64 data.
     * 
     * @param int $tour_id Tour post ID
     * @param array $scenes Scene data with images
     */
    private function import_tour_images($tour_id, $scenes) {
        foreach ($scenes as $scene_id => $scene) {
            if (!empty($scene['image_data'])) {
                try {
                    $attachment_id = $this->create_image_from_data($scene['image_data']);
                    
                    if ($attachment_id) {
                        // Update scene with new image URL
                        $scenes[$scene_id]['image'] = wp_get_attachment_url($attachment_id);
                        unset($scenes[$scene_id]['image_data']);
                    }
                } catch (Exception $e) {
                    // Log error but continue with import
                    error_log('Vortex360: Failed to import image for scene ' . $scene_id . ': ' . $e->getMessage());
                }
            }
        }
        
        // Update scenes metadata
        update_post_meta($tour_id, '_vx_tour_scenes', $scenes);
    }
    
    /**
     * Get image data for export.
     * Converts image file to base64 for export.
     * 
     * @param string $image_url Image URL
     * @return array|null Image data or null if failed
     */
    private function get_image_data($image_url) {
        $attachment_id = attachment_url_to_postid($image_url);
        
        if (!$attachment_id) {
            return null;
        }
        
        $file_path = get_attached_file($attachment_id);
        
        if (!$file_path || !file_exists($file_path)) {
            return null;
        }
        
        $file_content = file_get_contents($file_path);
        
        if ($file_content === false) {
            return null;
        }
        
        return [
            'filename' => basename($file_path),
            'mime_type' => get_post_mime_type($attachment_id),
            'data' => base64_encode($file_content)
        ];
    }
    
    /**
     * Create image attachment from base64 data.
     * Recreates image file from export data.
     * 
     * @param array $image_data Image data from export
     * @return int|false Attachment ID or false on failure
     */
    private function create_image_from_data($image_data) {
        if (empty($image_data['data']) || empty($image_data['filename'])) {
            return false;
        }
        
        $file_content = base64_decode($image_data['data']);
        
        if ($file_content === false) {
            return false;
        }
        
        $upload_dir = wp_upload_dir();
        $filename = wp_unique_filename($upload_dir['path'], $image_data['filename']);
        $file_path = $upload_dir['path'] . '/' . $filename;
        
        if (file_put_contents($file_path, $file_content) === false) {
            return false;
        }
        
        $attachment_data = [
            'post_title' => pathinfo($filename, PATHINFO_FILENAME),
            'post_content' => '',
            'post_status' => 'inherit',
            'post_mime_type' => $image_data['mime_type'] ?? 'image/jpeg'
        ];
        
        $attachment_id = wp_insert_attachment($attachment_data, $file_path);
        
        if (is_wp_error($attachment_id)) {
            unlink($file_path);
            return false;
        }
        
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        $attachment_metadata = wp_generate_attachment_metadata($attachment_id, $file_path);
        wp_update_attachment_metadata($attachment_id, $attachment_metadata);
        
        return $attachment_id;
    }
    
    /**
     * Get all plugin settings for backup.
     * Collects all Vortex360 settings.
     * 
     * @return array All plugin settings
     */
    private function get_all_settings() {
        global $wpdb;
        
        $settings = [];
        
        // Get all options with vx_ prefix
        $options = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
                'vx_%'
            )
        );
        
        foreach ($options as $option) {
            $settings[$option->option_name] = maybe_unserialize($option->option_value);
        }
        
        return [
            'settings' => $settings,
            'version' => VX_VERSION,
            'backup_date' => current_time('mysql'),
            'site_url' => get_site_url()
        ];
    }
    
    /**
     * Generate settings backup file.
     * Creates downloadable settings backup.
     * 
     * @param array $settings Settings data
     * @return string Backup file path
     */
    private function generate_settings_backup($settings) {
        $filename = 'vortex360-settings-backup-' . date('Y-m-d-H-i-s') . '.json';
        $filepath = $this->temp_dir . '/' . $filename;
        
        $content = wp_json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if (file_put_contents($filepath, $content) === false) {
            throw new Exception(__('Failed to create settings backup', 'vortex360-lite'));
        }
        
        return $filepath;
    }
    
    /**
     * Parse settings backup file.
     * Extracts settings from backup file.
     * 
     * @param array $file Uploaded backup file
     * @return array Settings data
     */
    private function parse_settings_backup($file) {
        $content = file_get_contents($file['tmp_name']);
        
        if ($content === false) {
            throw new Exception(__('Failed to read backup file', 'vortex360-lite'));
        }
        
        $data = json_decode($content, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception(__('Invalid backup file format', 'vortex360-lite'));
        }
        
        if (empty($data['settings'])) {
            throw new Exception(__('No settings found in backup file', 'vortex360-lite'));
        }
        
        return $data['settings'];
    }
    
    /**
     * Restore settings from backup.
     * Updates plugin settings from backup data.
     * 
     * @param array $settings Settings to restore
     */
    private function restore_settings($settings) {
        foreach ($settings as $option_name => $option_value) {
            // Only restore vx_ prefixed options
            if (strpos($option_name, 'vx_') === 0) {
                update_option($option_name, $option_value);
            }
        }
        
        // Clear any caches
        wp_cache_flush();
    }
    
    /**
     * Convert array to XML format.
     * Generates XML from array data.
     * 
     * @param array $data Array data
     * @param string $root_element Root XML element name
     * @return string XML content
     */
    private function array_to_xml($data, $root_element = 'root') {
        $xml = new SimpleXMLElement("<?xml version='1.0' encoding='UTF-8'?><{$root_element}></{$root_element}>");
        $this->array_to_xml_recursive($data, $xml);
        return $xml->asXML();
    }
    
    /**
     * Recursive helper for array to XML conversion.
     * 
     * @param array $data Array data
     * @param SimpleXMLElement $xml XML element
     */
    private function array_to_xml_recursive($data, &$xml) {
        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $subnode = $xml->addChild(is_numeric($key) ? 'item' : $key);
                $this->array_to_xml_recursive($value, $subnode);
            } else {
                $xml->addChild(is_numeric($key) ? 'item' : $key, htmlspecialchars($value));
            }
        }
    }
    
    /**
     * Convert XML to array format.
     * Parses XML content to array.
     * 
     * @param string $xml_content XML content
     * @return array Parsed data
     */
    private function xml_to_array($xml_content) {
        $xml = simplexml_load_string($xml_content);
        
        if ($xml === false) {
            throw new Exception(__('Invalid XML format', 'vortex360-lite'));
        }
        
        return json_decode(json_encode($xml), true);
    }
    
    /**
     * Convert array to CSV format.
     * Generates CSV from array data (flattened).
     * 
     * @param array $data Array data
     * @return string CSV content
     */
    private function array_to_csv($data) {
        $output = fopen('php://temp', 'r+');
        
        // Flatten data for CSV
        $flattened = [];
        
        foreach ($data as $index => $item) {
            $flat_item = $this->flatten_array($item);
            $flattened[] = $flat_item;
        }
        
        if (!empty($flattened)) {
            // Write header
            fputcsv($output, array_keys($flattened[0]));
            
            // Write data
            foreach ($flattened as $row) {
                fputcsv($output, $row);
            }
        }
        
        rewind($output);
        $csv_content = stream_get_contents($output);
        fclose($output);
        
        return $csv_content;
    }
    
    /**
     * Convert CSV to array format.
     * Parses CSV content to array.
     * 
     * @param string $csv_content CSV content
     * @return array Parsed data
     */
    private function csv_to_array($csv_content) {
        $lines = str_getcsv($csv_content, "\n");
        
        if (empty($lines)) {
            throw new Exception(__('Empty CSV file', 'vortex360-lite'));
        }
        
        $header = str_getcsv(array_shift($lines));
        $data = [];
        
        foreach ($lines as $line) {
            $row = str_getcsv($line);
            
            if (count($row) === count($header)) {
                $data[] = array_combine($header, $row);
            }
        }
        
        return $data;
    }
    
    /**
     * Flatten multidimensional array.
     * Converts nested array to flat array with dot notation keys.
     * 
     * @param array $array Input array
     * @param string $prefix Key prefix
     * @return array Flattened array
     */
    private function flatten_array($array, $prefix = '') {
        $result = [];
        
        foreach ($array as $key => $value) {
            $new_key = $prefix === '' ? $key : $prefix . '.' . $key;
            
            if (is_array($value)) {
                $result = array_merge($result, $this->flatten_array($value, $new_key));
            } else {
                $result[$new_key] = $value;
            }
        }
        
        return $result;
    }
    
    /**
     * Extract ZIP import file.
     * Handles ZIP files containing tour data and images.
     * 
     * @param string $zip_path ZIP file path
     * @return array Extracted data
     */
    private function extract_zip_import($zip_path) {
        if (!class_exists('ZipArchive')) {
            throw new Exception(__('ZIP support not available', 'vortex360-lite'));
        }
        
        $zip = new ZipArchive();
        
        if ($zip->open($zip_path) !== TRUE) {
            throw new Exception(__('Failed to open ZIP file', 'vortex360-lite'));
        }
        
        $extract_path = $this->temp_dir . '/extract-' . uniqid();
        wp_mkdir_p($extract_path);
        
        $zip->extractTo($extract_path);
        $zip->close();
        
        // Look for data file
        $data_files = glob($extract_path . '/*.{json,xml,csv}', GLOB_BRACE);
        
        if (empty($data_files)) {
            throw new Exception(__('No data file found in ZIP', 'vortex360-lite'));
        }
        
        $data_file = $data_files[0];
        $content = file_get_contents($data_file);
        
        $extension = pathinfo($data_file, PATHINFO_EXTENSION);
        
        switch ($extension) {
            case 'json':
                $data = json_decode($content, true);
                break;
            case 'xml':
                $data = $this->xml_to_array($content);
                break;
            case 'csv':
                $data = $this->csv_to_array($content);
                break;
            default:
                throw new Exception(__('Unsupported data file format in ZIP', 'vortex360-lite'));
        }
        
        // Process any image files
        $image_files = glob($extract_path . '/images/*.{jpg,jpeg,png,webp}', GLOB_BRACE);
        
        foreach ($image_files as $image_file) {
            $filename = basename($image_file);
            $image_content = file_get_contents($image_file);
            
            if ($image_content !== false) {
                // Add image data to corresponding scenes
                foreach ($data as &$tour) {
                    if (isset($tour['scenes'])) {
                        foreach ($tour['scenes'] as &$scene) {
                            if (isset($scene['image']) && basename($scene['image']) === $filename) {
                                $scene['image_data'] = [
                                    'filename' => $filename,
                                    'mime_type' => mime_content_type($image_file),
                                    'data' => base64_encode($image_content)
                                ];
                            }
                        }
                    }
                }
            }
        }
        
        // Cleanup extracted files
        $this->delete_directory($extract_path);
        
        return $data;
    }
    
    /**
     * Get download URL for temporary file.
     * Creates secure download URL for export files.
     * 
     * @param string $filepath File path
     * @return string Download URL
     */
    private function get_download_url($filepath) {
        $filename = basename($filepath);
        
        return add_query_arg([
            'action' => 'vx_download_export',
            'file' => $filename,
            'nonce' => wp_create_nonce('vx_download_' . $filename)
        ], admin_url('admin-ajax.php'));
    }
    
    /**
     * Delete directory and all contents.
     * Recursively removes directory.
     * 
     * @param string $dir Directory path
     */
    private function delete_directory($dir) {
        if (!is_dir($dir)) {
            return;
        }
        
        $files = array_diff(scandir($dir), ['.', '..']);
        
        foreach ($files as $file) {
            $path = $dir . '/' . $file;
            
            if (is_dir($path)) {
                $this->delete_directory($path);
            } else {
                unlink($path);
            }
        }
        
        rmdir($dir);
    }
    
    /**
     * Clean up temporary files.
     * Removes old temporary export/import files.
     */
    public function cleanup_temp_files() {
        if (!is_dir($this->temp_dir)) {
            return;
        }
        
        $files = glob($this->temp_dir . '/*');
        $cutoff_time = time() - (24 * 60 * 60); // 24 hours ago
        
        foreach ($files as $file) {
            if (is_file($file) && filemtime($file) < $cutoff_time) {
                unlink($file);
            } elseif (is_dir($file) && filemtime($file) < $cutoff_time) {
                $this->delete_directory($file);
            }
        }
    }
}

// Initialize the import/export class
if (is_admin()) {
    new VX_Admin_Import_Export();
    
    // Handle download requests
    add_action('wp_ajax_vx_download_export', function() {
        $filename = sanitize_file_name($_GET['file'] ?? '');
        $nonce = $_GET['nonce'] ?? '';
        
        if (!wp_verify_nonce($nonce, 'vx_download_' . $filename)) {
            wp_die(__('Invalid download link', 'vortex360-lite'));
        }
        
        $upload_dir = wp_upload_dir();
        $filepath = $upload_dir['basedir'] . '/vortex360-temp/' . $filename;
        
        if (!file_exists($filepath)) {
            wp_die(__('File not found', 'vortex360-lite'));
        }
        
        $mime_type = mime_content_type($filepath);
        
        header('Content-Type: ' . $mime_type);
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($filepath));
        header('Cache-Control: no-cache, must-revalidate');
        header('Expires: 0');
        
        readfile($filepath);
        
        // Delete file after download
        unlink($filepath);
        
        exit;
    });
}