<?php
/**
 * Vortex360 Lite - Input Validation Helpers
 * 
 * Strong input validation helpers for secure data processing
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Validate tour ID
 */
function vx_validate_tour_id($tour_id) {
    $tour_id = intval($tour_id);
    
    if ($tour_id <= 0) {
        return false;
    }
    
    $tour = get_post($tour_id);
    return $tour && $tour->post_type === 'vx_tour';
}

/**
 * Validate scene configuration
 */
function vx_validate_scene($scene) {
    $errors = array();
    
    // Required fields
    if (empty($scene['id'])) {
        $errors[] = __('Scene ID is required', 'vortex360-lite');
    } elseif (!preg_match('/^[a-zA-Z0-9_-]+$/', $scene['id'])) {
        $errors[] = __('Scene ID contains invalid characters', 'vortex360-lite');
    }
    
    if (empty($scene['title'])) {
        $errors[] = __('Scene title is required', 'vortex360-lite');
    } elseif (strlen($scene['title']) > 255) {
        $errors[] = __('Scene title is too long (max 255 characters)', 'vortex360-lite');
    }
    
    // Scene type validation
    $allowed_types = array_keys(vx_get_allowed_scene_types());
    if (empty($scene['type']) || !in_array($scene['type'], $allowed_types)) {
        $errors[] = __('Invalid scene type', 'vortex360-lite');
    }
    
    // Image validation
    if (empty($scene['image']['id']) && empty($scene['image']['url'])) {
        $errors[] = __('Scene image is required', 'vortex360-lite');
    }
    
    if (!empty($scene['image']['id'])) {
        $attachment = get_post($scene['image']['id']);
        if (!$attachment || $attachment->post_type !== 'attachment') {
            $errors[] = __('Invalid image attachment ID', 'vortex360-lite');
        } else {
            $mime_type = get_post_mime_type($attachment->ID);
            if (!in_array($mime_type, array('image/jpeg', 'image/png', 'image/webp'))) {
                $errors[] = __('Invalid image format. Only JPEG, PNG, and WebP are allowed', 'vortex360-lite');
            }
        }
    }
    
    if (!empty($scene['image']['url']) && !filter_var($scene['image']['url'], FILTER_VALIDATE_URL)) {
        $errors[] = __('Invalid image URL', 'vortex360-lite');
    }
    
    // Initial view validation
    if (isset($scene['initView'])) {
        $init_view = $scene['initView'];
        
        if (isset($init_view['yaw']) && (!is_numeric($init_view['yaw']) || $init_view['yaw'] < -180 || $init_view['yaw'] > 180)) {
            $errors[] = __('Initial yaw must be between -180 and 180 degrees', 'vortex360-lite');
        }
        
        if (isset($init_view['pitch']) && (!is_numeric($init_view['pitch']) || $init_view['pitch'] < -90 || $init_view['pitch'] > 90)) {
            $errors[] = __('Initial pitch must be between -90 and 90 degrees', 'vortex360-lite');
        }
        
        if (isset($init_view['fov']) && (!is_numeric($init_view['fov']) || $init_view['fov'] < 10 || $init_view['fov'] > 120)) {
            $errors[] = __('Initial field of view must be between 10 and 120 degrees', 'vortex360-lite');
        }
    }
    
    // Hotspots validation
    if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
        if (count($scene['hotspots']) > 5) {
            $errors[] = __('Maximum 5 hotspots allowed per scene in Lite version', 'vortex360-lite');
        }
        
        foreach ($scene['hotspots'] as $index => $hotspot) {
            $hotspot_errors = vx_validate_hotspot($hotspot);
            if (!empty($hotspot_errors)) {
                foreach ($hotspot_errors as $error) {
                    $errors[] = sprintf(__('Hotspot %d: %s', 'vortex360-lite'), $index + 1, $error);
                }
            }
        }
    }
    
    return $errors;
}

/**
 * Validate hotspot configuration
 */
function vx_validate_hotspot($hotspot) {
    $errors = array();
    
    // Required fields
    if (empty($hotspot['id'])) {
        $errors[] = __('Hotspot ID is required', 'vortex360-lite');
    } elseif (!preg_match('/^[a-zA-Z0-9_-]+$/', $hotspot['id'])) {
        $errors[] = __('Hotspot ID contains invalid characters', 'vortex360-lite');
    }
    
    // Type validation
    $allowed_types = array_keys(vx_get_allowed_hotspot_types());
    if (empty($hotspot['type']) || !in_array($hotspot['type'], $allowed_types)) {
        $errors[] = __('Invalid hotspot type', 'vortex360-lite');
    }
    
    // Position validation
    if (!isset($hotspot['yaw']) || !is_numeric($hotspot['yaw']) || $hotspot['yaw'] < -180 || $hotspot['yaw'] > 180) {
        $errors[] = __('Hotspot yaw must be between -180 and 180 degrees', 'vortex360-lite');
    }
    
    if (!isset($hotspot['pitch']) || !is_numeric($hotspot['pitch']) || $hotspot['pitch'] < -90 || $hotspot['pitch'] > 90) {
        $errors[] = __('Hotspot pitch must be between -90 and 90 degrees', 'vortex360-lite');
    }
    
    // Title validation
    if (!empty($hotspot['title']) && strlen($hotspot['title']) > 255) {
        $errors[] = __('Hotspot title is too long (max 255 characters)', 'vortex360-lite');
    }
    
    // Text validation
    if (!empty($hotspot['text']) && strlen($hotspot['text']) > 1000) {
        $errors[] = __('Hotspot text is too long (max 1000 characters)', 'vortex360-lite');
    }
    
    // URL validation for link type
    if ($hotspot['type'] === 'link') {
        if (empty($hotspot['url'])) {
            $errors[] = __('URL is required for link hotspots', 'vortex360-lite');
        } elseif (!filter_var($hotspot['url'], FILTER_VALIDATE_URL)) {
            $errors[] = __('Invalid URL format', 'vortex360-lite');
        }
    }
    
    // Target scene validation for scene type
    if ($hotspot['type'] === 'scene') {
        if (empty($hotspot['targetSceneId'])) {
            $errors[] = __('Target scene is required for scene navigation hotspots', 'vortex360-lite');
        }
    }
    
    // Icon validation
    if (!empty($hotspot['icon'])) {
        $allowed_icons = vx_get_allowed_icons();
        if (!in_array($hotspot['icon'], $allowed_icons)) {
            $errors[] = __('Invalid hotspot icon', 'vortex360-lite');
        }
    }
    
    return $errors;
}

/**
 * Validate tour settings
 */
function vx_validate_settings($settings) {
    $errors = array();
    
    if (!is_array($settings)) {
        $errors[] = __('Settings must be an array', 'vortex360-lite');
        return $errors;
    }
    
    // UI settings validation
    if (isset($settings['ui']) && is_array($settings['ui'])) {
        $ui = $settings['ui'];
        
        foreach (array('showThumbnails', 'showZoom', 'showFullscreen', 'showCompass') as $key) {
            if (isset($ui[$key]) && !is_bool($ui[$key])) {
                $errors[] = sprintf(__('UI setting "%s" must be boolean', 'vortex360-lite'), $key);
            }
        }
    }
    
    // Autorotate settings validation
    if (isset($settings['autorotate']) && is_array($settings['autorotate'])) {
        $autorotate = $settings['autorotate'];
        
        if (isset($autorotate['enabled']) && !is_bool($autorotate['enabled'])) {
            $errors[] = __('Autorotate enabled setting must be boolean', 'vortex360-lite');
        }
        
        if (isset($autorotate['speed']) && (!is_numeric($autorotate['speed']) || $autorotate['speed'] < 0.1 || $autorotate['speed'] > 2.0)) {
            $errors[] = __('Autorotate speed must be between 0.1 and 2.0', 'vortex360-lite');
        }
        
        if (isset($autorotate['pauseOnHover']) && !is_bool($autorotate['pauseOnHover'])) {
            $errors[] = __('Autorotate pause on hover setting must be boolean', 'vortex360-lite');
        }
    }
    
    // Mobile settings validation
    if (isset($settings['mobile']) && is_array($settings['mobile'])) {
        $mobile = $settings['mobile'];
        
        foreach (array('gyro', 'touch') as $key) {
            if (isset($mobile[$key]) && !is_bool($mobile[$key])) {
                $errors[] = sprintf(__('Mobile setting "%s" must be boolean', 'vortex360-lite'), $key);
            }
        }
    }
    
    // Branding settings validation
    if (isset($settings['branding']) && is_array($settings['branding'])) {
        $branding = $settings['branding'];
        
        if (isset($branding['logoId']) && (!is_numeric($branding['logoId']) || $branding['logoId'] < 0)) {
            $errors[] = __('Logo ID must be a positive number', 'vortex360-lite');
        }
        
        if (isset($branding['logoUrl']) && !empty($branding['logoUrl']) && !filter_var($branding['logoUrl'], FILTER_VALIDATE_URL)) {
            $errors[] = __('Invalid logo URL', 'vortex360-lite');
        }
        
        if (isset($branding['position']) && !in_array($branding['position'], array('top-left', 'top-right', 'bottom-left', 'bottom-right'))) {
            $errors[] = __('Invalid logo position', 'vortex360-lite');
        }
    }
    
    return $errors;
}

/**
 * Validate complete tour configuration
 */
function vx_validate_tour_config($config) {
    $errors = array();
    
    if (!is_array($config)) {
        $errors[] = __('Tour configuration must be an array', 'vortex360-lite');
        return $errors;
    }
    
    // Validate settings
    if (isset($config['settings'])) {
        $setting_errors = vx_validate_settings($config['settings']);
        $errors = array_merge($errors, $setting_errors);
    }
    
    // Validate scenes
    if (!isset($config['scenes']) || !is_array($config['scenes'])) {
        $errors[] = __('Tour must have at least one scene', 'vortex360-lite');
    } else {
        if (count($config['scenes']) > 5) {
            $errors[] = __('Maximum 5 scenes allowed in Lite version', 'vortex360-lite');
        }
        
        if (empty($config['scenes'])) {
            $errors[] = __('Tour must have at least one scene', 'vortex360-lite');
        }
        
        $scene_ids = array();
        foreach ($config['scenes'] as $index => $scene) {
            // Check for duplicate scene IDs
            if (in_array($scene['id'], $scene_ids)) {
                $errors[] = sprintf(__('Duplicate scene ID "%s" found', 'vortex360-lite'), $scene['id']);
            } else {
                $scene_ids[] = $scene['id'];
            }
            
            $scene_errors = vx_validate_scene($scene);
            if (!empty($scene_errors)) {
                foreach ($scene_errors as $error) {
                    $errors[] = sprintf(__('Scene %d (%s): %s', 'vortex360-lite'), $index + 1, $scene['title'] ?? 'Untitled', $error);
                }
            }
        }
        
        // Validate scene navigation hotspots reference existing scenes
        foreach ($config['scenes'] as $scene) {
            if (isset($scene['hotspots']) && is_array($scene['hotspots'])) {
                foreach ($scene['hotspots'] as $hotspot) {
                    if ($hotspot['type'] === 'scene' && !empty($hotspot['targetSceneId'])) {
                        if (!in_array($hotspot['targetSceneId'], $scene_ids)) {
                            $errors[] = sprintf(__('Hotspot references non-existent scene "%s"', 'vortex360-lite'), $hotspot['targetSceneId']);
                        }
                    }
                }
            }
        }
    }
    
    return $errors;
}

/**
 * Validate import data
 */
function vx_validate_import_data($data) {
    $errors = array();
    
    if (!is_array($data)) {
        $errors[] = __('Import data must be valid JSON', 'vortex360-lite');
        return $errors;
    }
    
    // Check required fields
    if (!isset($data['version'])) {
        $errors[] = __('Import data missing version information', 'vortex360-lite');
    }
    
    if (!isset($data['tours']) || !is_array($data['tours'])) {
        $errors[] = __('Import data must contain tours array', 'vortex360-lite');
        return $errors;
    }
    
    // Validate each tour
    foreach ($data['tours'] as $index => $tour_data) {
        if (!isset($tour_data['config'])) {
            $errors[] = sprintf(__('Tour %d missing configuration', 'vortex360-lite'), $index + 1);
            continue;
        }
        
        $tour_errors = vx_validate_tour_config($tour_data['config']);
        if (!empty($tour_errors)) {
            foreach ($tour_errors as $error) {
                $errors[] = sprintf(__('Tour %d: %s', 'vortex360-lite'), $index + 1, $error);
            }
        }
    }
    
    return $errors;
}

/**
 * Get allowed icons for Lite version
 */
function vx_get_allowed_icons() {
    return array(
        'info',
        'link',
        'arrow',
        'home',
        'star',
        'heart',
        'eye',
        'camera',
        'map-pin',
        'question'
    );
}

/**
 * Validate file upload
 */
function vx_validate_file_upload($file) {
    $errors = array();
    
    if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
        switch ($file['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errors[] = __('File is too large', 'vortex360-lite');
                break;
            case UPLOAD_ERR_PARTIAL:
                $errors[] = __('File upload was interrupted', 'vortex360-lite');
                break;
            case UPLOAD_ERR_NO_FILE:
                $errors[] = __('No file was uploaded', 'vortex360-lite');
                break;
            default:
                $errors[] = __('File upload failed', 'vortex360-lite');
        }
        return $errors;
    }
    
    // Check file size (max 50MB for panoramas)
    $max_size = 50 * 1024 * 1024; // 50MB
    if ($file['size'] > $max_size) {
        $errors[] = sprintf(__('File size exceeds maximum allowed size of %s', 'vortex360-lite'), vx_format_file_size($max_size));
    }
    
    // Check file type
    $allowed_types = array('image/jpeg', 'image/png', 'image/webp');
    $file_type = wp_check_filetype($file['name']);
    
    if (!in_array($file_type['type'], $allowed_types)) {
        $errors[] = __('Invalid file type. Only JPEG, PNG, and WebP images are allowed', 'vortex360-lite');
    }
    
    return $errors;
}

/**
 * Sanitize and validate AJAX input
 */
function vx_validate_ajax_input($input, $rules) {
    $errors = array();
    $sanitized = array();
    
    foreach ($rules as $field => $rule) {
        $value = isset($input[$field]) ? $input[$field] : null;
        
        // Required field check
        if (isset($rule['required']) && $rule['required'] && empty($value)) {
            $errors[$field] = sprintf(__('Field "%s" is required', 'vortex360-lite'), $field);
            continue;
        }
        
        // Skip validation if field is empty and not required
        if (empty($value) && (!isset($rule['required']) || !$rule['required'])) {
            $sanitized[$field] = $value;
            continue;
        }
        
        // Type validation and sanitization
        switch ($rule['type']) {
            case 'int':
                $sanitized[$field] = intval($value);
                if (isset($rule['min']) && $sanitized[$field] < $rule['min']) {
                    $errors[$field] = sprintf(__('Field "%s" must be at least %d', 'vortex360-lite'), $field, $rule['min']);
                }
                if (isset($rule['max']) && $sanitized[$field] > $rule['max']) {
                    $errors[$field] = sprintf(__('Field "%s" must be at most %d', 'vortex360-lite'), $field, $rule['max']);
                }
                break;
                
            case 'float':
                $sanitized[$field] = floatval($value);
                if (isset($rule['min']) && $sanitized[$field] < $rule['min']) {
                    $errors[$field] = sprintf(__('Field "%s" must be at least %f', 'vortex360-lite'), $field, $rule['min']);
                }
                if (isset($rule['max']) && $sanitized[$field] > $rule['max']) {
                    $errors[$field] = sprintf(__('Field "%s" must be at most %f', 'vortex360-lite'), $field, $rule['max']);
                }
                break;
                
            case 'string':
                $sanitized[$field] = sanitize_text_field($value);
                if (isset($rule['max_length']) && strlen($sanitized[$field]) > $rule['max_length']) {
                    $errors[$field] = sprintf(__('Field "%s" is too long (max %d characters)', 'vortex360-lite'), $field, $rule['max_length']);
                }
                break;
                
            case 'url':
                $sanitized[$field] = esc_url_raw($value);
                if (!filter_var($sanitized[$field], FILTER_VALIDATE_URL)) {
                    $errors[$field] = sprintf(__('Field "%s" must be a valid URL', 'vortex360-lite'), $field);
                }
                break;
                
            case 'email':
                $sanitized[$field] = sanitize_email($value);
                if (!is_email($sanitized[$field])) {
                    $errors[$field] = sprintf(__('Field "%s" must be a valid email address', 'vortex360-lite'), $field);
                }
                break;
                
            case 'bool':
                $sanitized[$field] = (bool) $value;
                break;
                
            case 'array':
                if (!is_array($value)) {
                    $errors[$field] = sprintf(__('Field "%s" must be an array', 'vortex360-lite'), $field);
                } else {
                    $sanitized[$field] = $value;
                }
                break;
        }
        
        // Custom validation
        if (isset($rule['validate']) && is_callable($rule['validate'])) {
            $custom_error = call_user_func($rule['validate'], $sanitized[$field]);
            if ($custom_error !== true) {
                $errors[$field] = $custom_error;
            }
        }
    }
    
    return array(
        'errors' => $errors,
        'data' => $sanitized,
        'valid' => empty($errors)
    );
}