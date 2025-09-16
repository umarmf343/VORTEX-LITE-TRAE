<?php
/**
 * Vortex360 Lite - Admin Media Management
 * 
 * Handles media uploads, image processing, and file management for tours
 * 
 * @package Vortex360_Lite
 * @since 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Admin media management class.
 * Handles tour image uploads, processing, and file operations.
 */
class VX_Admin_Media {
    
    /**
     * Allowed image types for tour uploads.
     * @var array
     */
    private $allowed_types = ['jpg', 'jpeg', 'png', 'webp'];
    
    /**
     * Maximum file size in bytes (10MB).
     * @var int
     */
    private $max_file_size = 10485760;
    
    /**
     * Upload directory path.
     * @var string
     */
    private $upload_dir = '';
    
    /**
     * Initialize media management.
     * Sets up hooks and upload directory.
     */
    public function __construct() {
        $this->setup_upload_directory();
        $this->init_hooks();
    }
    
    /**
     * Initialize WordPress hooks.
     * Registers actions and filters for media handling.
     */
    private function init_hooks() {
        add_action('wp_ajax_vx_upload_scene_image', [$this, 'ajax_upload_scene_image']);
        add_action('wp_ajax_vx_delete_scene_image', [$this, 'ajax_delete_scene_image']);
        add_action('wp_ajax_vx_process_bulk_upload', [$this, 'ajax_process_bulk_upload']);
        add_action('wp_ajax_vx_get_media_library', [$this, 'ajax_get_media_library']);
        add_action('wp_ajax_vx_optimize_image', [$this, 'ajax_optimize_image']);
        
        // Media library integration
        add_filter('upload_mimes', [$this, 'add_upload_mimes']);
        add_filter('wp_handle_upload_prefilter', [$this, 'validate_upload']);
        add_action('add_attachment', [$this, 'process_attachment']);
        
        // Admin enqueue
        add_action('admin_enqueue_scripts', [$this, 'enqueue_media_scripts']);
        
        // Cleanup hooks
        add_action('delete_post', [$this, 'cleanup_tour_images']);
        add_action('vx_cleanup_orphaned_images', [$this, 'cleanup_orphaned_images']);
    }
    
    /**
     * Set up upload directory for tour images.
     * Creates necessary directories and sets permissions.
     */
    private function setup_upload_directory() {
        $upload_dir = wp_upload_dir();
        $this->upload_dir = $upload_dir['basedir'] . '/vortex360-tours';
        
        if (!file_exists($this->upload_dir)) {
            wp_mkdir_p($this->upload_dir);
            
            // Create .htaccess for security
            $htaccess_content = "# Vortex360 Tours Upload Directory\n";
            $htaccess_content .= "<Files *.php>\n";
            $htaccess_content .= "deny from all\n";
            $htaccess_content .= "</Files>\n";
            
            file_put_contents($this->upload_dir . '/.htaccess', $htaccess_content);
        }
        
        // Create subdirectories
        $subdirs = ['scenes', 'thumbnails', 'temp'];
        foreach ($subdirs as $subdir) {
            $path = $this->upload_dir . '/' . $subdir;
            if (!file_exists($path)) {
                wp_mkdir_p($path);
            }
        }
    }
    
    /**
     * Add allowed MIME types for uploads.
     * Ensures 360° image formats are supported.
     * 
     * @param array $mimes Existing MIME types
     * @return array Modified MIME types
     */
    public function add_upload_mimes($mimes) {
        $mimes['webp'] = 'image/webp';
        return $mimes;
    }
    
    /**
     * Validate file uploads.
     * Checks file type, size, and format for tour images.
     * 
     * @param array $file Upload file data
     * @return array Modified file data or error
     */
    public function validate_upload($file) {
        // Only validate for our uploads
        if (!isset($_POST['vx_upload']) || $_POST['vx_upload'] !== '1') {
            return $file;
        }
        
        $file_info = pathinfo($file['name']);
        $extension = strtolower($file_info['extension'] ?? '');
        
        // Check file extension
        if (!in_array($extension, $this->allowed_types)) {
            $file['error'] = sprintf(
                __('Invalid file type. Allowed types: %s', 'vortex360-lite'),
                implode(', ', $this->allowed_types)
            );
            return $file;
        }
        
        // Check file size
        if ($file['size'] > $this->max_file_size) {
            $file['error'] = sprintf(
                __('File too large. Maximum size: %s', 'vortex360-lite'),
                size_format($this->max_file_size)
            );
            return $file;
        }
        
        // Validate image dimensions for 360° images
        $image_info = getimagesize($file['tmp_name']);
        if ($image_info === false) {
            $file['error'] = __('Invalid image file', 'vortex360-lite');
            return $file;
        }
        
        $width = $image_info[0];
        $height = $image_info[1];
        
        // Check for 360° aspect ratio (2:1)
        $aspect_ratio = $width / $height;
        if (abs($aspect_ratio - 2.0) > 0.1) {
            $file['error'] = __('Image should have 2:1 aspect ratio for 360° panoramas', 'vortex360-lite');
            return $file;
        }
        
        // Minimum resolution check
        if ($width < 2048 || $height < 1024) {
            $file['error'] = __('Image resolution too low. Minimum: 2048x1024', 'vortex360-lite');
            return $file;
        }
        
        return $file;
    }
    
    /**
     * Process uploaded attachment.
     * Handles post-upload processing for tour images.
     * 
     * @param int $attachment_id Attachment post ID
     */
    public function process_attachment($attachment_id) {
        // Only process our uploads
        if (!isset($_POST['vx_upload']) || $_POST['vx_upload'] !== '1') {
            return;
        }
        
        $file_path = get_attached_file($attachment_id);
        
        if (!$file_path || !file_exists($file_path)) {
            return;
        }
        
        // Generate thumbnail
        $this->generate_thumbnail($file_path, $attachment_id);
        
        // Optimize image if needed
        $this->optimize_image($file_path);
        
        // Add metadata
        update_post_meta($attachment_id, '_vx_tour_image', true);
        update_post_meta($attachment_id, '_vx_processed_at', current_time('mysql'));
    }
    
    /**
     * Generate thumbnail for tour image.
     * Creates a smaller preview version of the 360° image.
     * 
     * @param string $file_path Original image path
     * @param int $attachment_id Attachment ID
     * @return string|false Thumbnail path or false on failure
     */
    private function generate_thumbnail($file_path, $attachment_id) {
        $image_editor = wp_get_image_editor($file_path);
        
        if (is_wp_error($image_editor)) {
            return false;
        }
        
        // Resize to thumbnail size (400x200 for 2:1 ratio)
        $image_editor->resize(400, 200, true);
        
        $file_info = pathinfo($file_path);
        $thumbnail_path = $this->upload_dir . '/thumbnails/' . $file_info['filename'] . '_thumb.' . $file_info['extension'];
        
        $saved = $image_editor->save($thumbnail_path);
        
        if (is_wp_error($saved)) {
            return false;
        }
        
        // Store thumbnail path in metadata
        update_post_meta($attachment_id, '_vx_thumbnail_path', $thumbnail_path);
        
        return $thumbnail_path;
    }
    
    /**
     * Optimize image file size.
     * Reduces file size while maintaining quality for web delivery.
     * 
     * @param string $file_path Image file path
     * @return bool Success status
     */
    private function optimize_image($file_path) {
        $image_editor = wp_get_image_editor($file_path);
        
        if (is_wp_error($image_editor)) {
            return false;
        }
        
        // Set quality to 85% for good balance
        $image_editor->set_quality(85);
        
        $saved = $image_editor->save($file_path);
        
        return !is_wp_error($saved);
    }
    
    /**
     * Enqueue media management scripts.
     * Loads JavaScript for media handling interface.
     * 
     * @param string $hook Current admin page hook
     */
    public function enqueue_media_scripts($hook) {
        global $post_type;
        
        if ($post_type !== 'vx_tour') {
            return;
        }
        
        wp_enqueue_media();
        
        wp_enqueue_script(
            'vx-admin-media',
            VX_PLUGIN_URL . 'assets/js/admin-media.js',
            ['jquery', 'wp-util', 'media-upload'],
            VX_VERSION,
            true
        );
        
        wp_localize_script('vx-admin-media', 'vxAdminMedia', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vx_admin_media'),
            'uploadDir' => wp_upload_dir()['baseurl'] . '/vortex360-tours',
            'maxFileSize' => $this->max_file_size,
            'allowedTypes' => $this->allowed_types,
            'strings' => [
                'selectImage' => __('Select 360° Image', 'vortex360-lite'),
                'uploadImage' => __('Upload Image', 'vortex360-lite'),
                'processing' => __('Processing image...', 'vortex360-lite'),
                'uploadError' => __('Upload failed. Please try again.', 'vortex360-lite'),
                'invalidType' => __('Invalid file type. Please select a valid image.', 'vortex360-lite'),
                'fileTooLarge' => __('File too large. Please select a smaller image.', 'vortex360-lite'),
                'invalidRatio' => __('Image should have 2:1 aspect ratio for 360° panoramas.', 'vortex360-lite')
            ]
        ]);
    }
    
    // AJAX Handlers
    
    /**
     * AJAX handler for uploading scene images.
     * Processes single image uploads for tour scenes.
     */
    public function ajax_upload_scene_image() {
        check_ajax_referer('vx_admin_media', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['image'])) {
            wp_send_json_error(__('No image file provided', 'vortex360-lite'));
        }
        
        // Set upload flag for validation
        $_POST['vx_upload'] = '1';
        
        $upload_overrides = [
            'test_form' => false,
            'upload_error_handler' => [$this, 'handle_upload_error']
        ];
        
        $uploaded_file = wp_handle_upload($_FILES['image'], $upload_overrides);
        
        if (isset($uploaded_file['error'])) {
            wp_send_json_error($uploaded_file['error']);
        }
        
        // Create attachment
        $attachment_data = [
            'post_title' => sanitize_file_name(pathinfo($uploaded_file['file'], PATHINFO_FILENAME)),
            'post_content' => '',
            'post_status' => 'inherit',
            'post_mime_type' => $uploaded_file['type']
        ];
        
        $attachment_id = wp_insert_attachment($attachment_data, $uploaded_file['file']);
        
        if (is_wp_error($attachment_id)) {
            wp_send_json_error(__('Failed to create attachment', 'vortex360-lite'));
        }
        
        // Generate metadata
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        $attachment_metadata = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
        wp_update_attachment_metadata($attachment_id, $attachment_metadata);
        
        // Process the attachment
        $_POST['vx_upload'] = '1';
        $this->process_attachment($attachment_id);
        
        $thumbnail_url = $this->get_thumbnail_url($attachment_id);
        
        wp_send_json_success([
            'attachment_id' => $attachment_id,
            'url' => $uploaded_file['url'],
            'thumbnail' => $thumbnail_url,
            'filename' => basename($uploaded_file['file']),
            'filesize' => size_format(filesize($uploaded_file['file']))
        ]);
    }
    
    /**
     * AJAX handler for deleting scene images.
     * Removes uploaded images and associated files.
     */
    public function ajax_delete_scene_image() {
        check_ajax_referer('vx_admin_media', 'nonce');
        
        if (!current_user_can('delete_posts')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $attachment_id = intval($_POST['attachment_id'] ?? 0);
        
        if (!$attachment_id) {
            wp_send_json_error(__('Invalid attachment ID', 'vortex360-lite'));
        }
        
        // Check if it's a tour image
        if (!get_post_meta($attachment_id, '_vx_tour_image', true)) {
            wp_send_json_error(__('Not a tour image', 'vortex360-lite'));
        }
        
        // Delete thumbnail
        $thumbnail_path = get_post_meta($attachment_id, '_vx_thumbnail_path', true);
        if ($thumbnail_path && file_exists($thumbnail_path)) {
            unlink($thumbnail_path);
        }
        
        // Delete attachment
        $deleted = wp_delete_attachment($attachment_id, true);
        
        if (!$deleted) {
            wp_send_json_error(__('Failed to delete image', 'vortex360-lite'));
        }
        
        wp_send_json_success(__('Image deleted successfully', 'vortex360-lite'));
    }
    
    /**
     * AJAX handler for bulk image uploads.
     * Processes multiple image uploads at once.
     */
    public function ajax_process_bulk_upload() {
        check_ajax_referer('vx_admin_media', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        if (!isset($_FILES['images'])) {
            wp_send_json_error(__('No images provided', 'vortex360-lite'));
        }
        
        $files = $_FILES['images'];
        $uploaded_files = [];
        $errors = [];
        
        // Process each file
        for ($i = 0; $i < count($files['name']); $i++) {
            if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                $errors[] = sprintf(__('Error uploading %s', 'vortex360-lite'), $files['name'][$i]);
                continue;
            }
            
            // Create individual file array
            $file = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i]
            ];
            
            $_FILES['image'] = $file;
            $_POST['vx_upload'] = '1';
            
            $uploaded_file = wp_handle_upload($file, ['test_form' => false]);
            
            if (isset($uploaded_file['error'])) {
                $errors[] = sprintf(__('Error uploading %s: %s', 'vortex360-lite'), $file['name'], $uploaded_file['error']);
                continue;
            }
            
            // Create attachment
            $attachment_data = [
                'post_title' => sanitize_file_name(pathinfo($uploaded_file['file'], PATHINFO_FILENAME)),
                'post_content' => '',
                'post_status' => 'inherit',
                'post_mime_type' => $uploaded_file['type']
            ];
            
            $attachment_id = wp_insert_attachment($attachment_data, $uploaded_file['file']);
            
            if (!is_wp_error($attachment_id)) {
                require_once(ABSPATH . 'wp-admin/includes/image.php');
                $attachment_metadata = wp_generate_attachment_metadata($attachment_id, $uploaded_file['file']);
                wp_update_attachment_metadata($attachment_id, $attachment_metadata);
                
                $this->process_attachment($attachment_id);
                
                $uploaded_files[] = [
                    'attachment_id' => $attachment_id,
                    'url' => $uploaded_file['url'],
                    'thumbnail' => $this->get_thumbnail_url($attachment_id),
                    'filename' => basename($uploaded_file['file'])
                ];
            } else {
                $errors[] = sprintf(__('Failed to create attachment for %s', 'vortex360-lite'), $file['name']);
            }
        }
        
        wp_send_json_success([
            'uploaded' => $uploaded_files,
            'errors' => $errors,
            'total' => count($uploaded_files),
            'failed' => count($errors)
        ]);
    }
    
    /**
     * AJAX handler for getting media library.
     * Returns list of available tour images.
     */
    public function ajax_get_media_library() {
        check_ajax_referer('vx_admin_media', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $page = intval($_POST['page'] ?? 1);
        $per_page = intval($_POST['per_page'] ?? 20);
        $search = sanitize_text_field($_POST['search'] ?? '');
        
        $args = [
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'posts_per_page' => $per_page,
            'paged' => $page,
            'meta_query' => [
                [
                    'key' => '_vx_tour_image',
                    'value' => true,
                    'compare' => '='
                ]
            ]
        ];
        
        if (!empty($search)) {
            $args['s'] = $search;
        }
        
        $query = new WP_Query($args);
        $images = [];
        
        foreach ($query->posts as $attachment) {
            $images[] = [
                'id' => $attachment->ID,
                'title' => $attachment->post_title,
                'url' => wp_get_attachment_url($attachment->ID),
                'thumbnail' => $this->get_thumbnail_url($attachment->ID),
                'filename' => basename(get_attached_file($attachment->ID)),
                'filesize' => size_format(filesize(get_attached_file($attachment->ID))),
                'date' => get_the_date('Y-m-d H:i:s', $attachment->ID)
            ];
        }
        
        wp_send_json_success([
            'images' => $images,
            'total' => $query->found_posts,
            'pages' => $query->max_num_pages,
            'current_page' => $page
        ]);
    }
    
    /**
     * AJAX handler for image optimization.
     * Optimizes existing images for better performance.
     */
    public function ajax_optimize_image() {
        check_ajax_referer('vx_admin_media', 'nonce');
        
        if (!current_user_can('upload_files')) {
            wp_send_json_error(__('Insufficient permissions', 'vortex360-lite'));
        }
        
        $attachment_id = intval($_POST['attachment_id'] ?? 0);
        
        if (!$attachment_id) {
            wp_send_json_error(__('Invalid attachment ID', 'vortex360-lite'));
        }
        
        $file_path = get_attached_file($attachment_id);
        
        if (!$file_path || !file_exists($file_path)) {
            wp_send_json_error(__('File not found', 'vortex360-lite'));
        }
        
        $original_size = filesize($file_path);
        $optimized = $this->optimize_image($file_path);
        
        if (!$optimized) {
            wp_send_json_error(__('Optimization failed', 'vortex360-lite'));
        }
        
        $new_size = filesize($file_path);
        $savings = $original_size - $new_size;
        $percentage = round(($savings / $original_size) * 100, 1);
        
        wp_send_json_success([
            'original_size' => size_format($original_size),
            'new_size' => size_format($new_size),
            'savings' => size_format($savings),
            'percentage' => $percentage
        ]);
    }
    
    /**
     * Get thumbnail URL for attachment.
     * Returns thumbnail URL or fallback to original.
     * 
     * @param int $attachment_id Attachment ID
     * @return string Thumbnail URL
     */
    private function get_thumbnail_url($attachment_id) {
        $thumbnail_path = get_post_meta($attachment_id, '_vx_thumbnail_path', true);
        
        if ($thumbnail_path && file_exists($thumbnail_path)) {
            $upload_dir = wp_upload_dir();
            return str_replace($upload_dir['basedir'], $upload_dir['baseurl'], $thumbnail_path);
        }
        
        // Fallback to WordPress thumbnail
        $thumbnail = wp_get_attachment_image_src($attachment_id, 'medium');
        return $thumbnail ? $thumbnail[0] : wp_get_attachment_url($attachment_id);
    }
    
    /**
     * Handle upload errors.
     * Custom error handler for file uploads.
     * 
     * @param array $file File data
     * @param string $message Error message
     * @return array Modified file data
     */
    public function handle_upload_error($file, $message) {
        return ['error' => $message];
    }
    
    /**
     * Clean up tour images when tour is deleted.
     * Removes associated images and thumbnails.
     * 
     * @param int $post_id Post ID being deleted
     */
    public function cleanup_tour_images($post_id) {
        if (get_post_type($post_id) !== 'vx_tour') {
            return;
        }
        
        $scenes = get_post_meta($post_id, '_vx_tour_scenes', true);
        
        if (!is_array($scenes)) {
            return;
        }
        
        foreach ($scenes as $scene) {
            if (!empty($scene['image'])) {
                $attachment_id = attachment_url_to_postid($scene['image']);
                
                if ($attachment_id) {
                    wp_delete_attachment($attachment_id, true);
                }
            }
        }
    }
    
    /**
     * Clean up orphaned images.
     * Removes images not associated with any tour.
     */
    public function cleanup_orphaned_images() {
        $args = [
            'post_type' => 'attachment',
            'post_status' => 'inherit',
            'posts_per_page' => -1,
            'meta_query' => [
                [
                    'key' => '_vx_tour_image',
                    'value' => true,
                    'compare' => '='
                ]
            ]
        ];
        
        $attachments = get_posts($args);
        $used_images = [];
        
        // Get all images used in tours
        $tours = get_posts([
            'post_type' => 'vx_tour',
            'post_status' => 'any',
            'posts_per_page' => -1
        ]);
        
        foreach ($tours as $tour) {
            $scenes = get_post_meta($tour->ID, '_vx_tour_scenes', true);
            
            if (is_array($scenes)) {
                foreach ($scenes as $scene) {
                    if (!empty($scene['image'])) {
                        $used_images[] = $scene['image'];
                    }
                }
            }
        }
        
        // Delete unused attachments
        foreach ($attachments as $attachment) {
            $url = wp_get_attachment_url($attachment->ID);
            
            if (!in_array($url, $used_images)) {
                wp_delete_attachment($attachment->ID, true);
            }
        }
    }
}

// Initialize the admin media class
if (is_admin()) {
    new VX_Admin_Media();
}