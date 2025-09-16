# Vortex360 Lite - WordPress Virtual Tour Plugin

**Version:** 1.0.0  
**Author:** AlFawz Qur'an Institute  
**License:** GPL v2 or later  
**Requires WordPress:** 5.0+  
**Tested up to:** 6.4  
**Requires PHP:** 7.4+  

## Overview

Vortex360 Lite is a powerful WordPress plugin that enables you to create immersive 360° virtual tours directly from your WordPress dashboard. Built with modern web technologies and featuring a beautiful, responsive design, this plugin makes it easy to showcase properties, venues, or any space in an engaging 360° format.

### Key Features

- **360° Panoramic Tours**: Create stunning virtual tours using equirectangular images
- **Interactive Hotspots**: Add clickable hotspots with information, links, or scene transitions
- **Modern Admin Dashboard**: Intuitive interface with drag-and-drop functionality
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Shortcode Integration**: Embed tours anywhere with simple shortcodes
- **Lite Version Restrictions**: Limited to 1 tour (upgrade to Pro for unlimited tours)
- **Performance Optimized**: Fast loading with efficient caching
- **SEO Friendly**: Proper meta tags and structured data

## Installation

### Method 1: WordPress Admin Dashboard (Recommended)

1. Download the `vortex360-lite.zip` file
2. Log in to your WordPress admin dashboard
3. Navigate to **Plugins > Add New**
4. Click **Upload Plugin**
5. Choose the `vortex360-lite.zip` file and click **Install Now**
6. Click **Activate Plugin**

### Method 2: FTP Upload

1. Extract the `vortex360-lite.zip` file
2. Upload the `vortex360-lite` folder to `/wp-content/plugins/`
3. Log in to WordPress admin and go to **Plugins**
4. Find "Vortex360 Lite" and click **Activate**

### Method 3: cPanel File Manager

1. Log in to your cPanel account
2. Open **File Manager**
3. Navigate to `public_html/wp-content/plugins/`
4. Upload and extract `vortex360-lite.zip`
5. Activate the plugin from WordPress admin

## cPanel Deployment Guide

### Prerequisites

- cPanel hosting account with PHP 7.4+ support
- WordPress 5.0+ installation
- At least 50MB available disk space
- Modern web browser for admin interface

### Step-by-Step cPanel Installation

#### 1. Access cPanel File Manager

```bash
# Login to cPanel → File Manager → public_html
# Navigate to: /public_html/wp-content/plugins/
```

#### 2. Upload Plugin Files

1. **Upload Method A: ZIP File**
   - Click "Upload" in File Manager
   - Select `vortex360-lite.zip`
   - Right-click uploaded file → "Extract"
   - Delete the ZIP file after extraction

2. **Upload Method B: Individual Files**
   - Create folder: `vortex360-lite`
   - Upload all plugin files maintaining directory structure

#### 3. Set Proper Permissions

```bash
# Set folder permissions to 755
chmod 755 vortex360-lite/
chmod 755 vortex360-lite/admin/
chmod 755 vortex360-lite/includes/
chmod 755 vortex360-lite/public/

# Set file permissions to 644
chmod 644 vortex360-lite/*.php
chmod 644 vortex360-lite/admin/*.php
chmod 644 vortex360-lite/includes/*.php
```

#### 4. Database Setup

The plugin will automatically create required database tables upon activation:

- `wp_vortex360_tours`
- `wp_vortex360_scenes` 
- `wp_vortex360_hotspots`

#### 5. WordPress Configuration

1. Log in to WordPress admin
2. Go to **Plugins > Installed Plugins**
3. Find "Vortex360 Lite" and click **Activate**
4. Navigate to **Vortex360** in the admin menu

### cPanel-Specific Optimizations

#### PHP Configuration

Add to `.htaccess` in WordPress root:

```apache
# Vortex360 Lite Optimizations
<IfModule mod_rewrite.c>
    # Enable compression for assets
    <FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
    
    # Enable GZIP compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/css
        AddOutputFilterByType DEFLATE application/javascript
        AddOutputFilterByType DEFLATE text/javascript
    </IfModule>
</IfModule>
```

#### Memory Optimization

Add to `wp-config.php`:

```php
// Increase memory limit for 360° image processing
ini_set('memory_limit', '256M');
ini_set('max_execution_time', 300);
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
```

## Quick Start Guide

### Creating Your First Tour

1. **Access the Dashboard**
   - Go to **Vortex360** in WordPress admin menu
   - Click **Create New Tour**

2. **Upload 360° Images**
   - Click **Add Scene**
   - Upload equirectangular panoramic images (JPG/PNG)
   - Recommended resolution: 4096x2048 or higher

3. **Add Hotspots**
   - Click on the panoramic preview to add hotspots
   - Choose hotspot type: Info, Scene Link, or External URL
   - Add titles and descriptions

4. **Embed the Tour**
   - Copy the generated shortcode
   - Paste into any post, page, or widget
   - Example: `[vortex360 id="1"]`

### Shortcode Parameters

```php
// Basic usage
[vortex360 id="1"]

// With custom dimensions
[vortex360 id="1" width="800" height="600"]

// With custom settings
[vortex360 id="1" autoload="true" controls="true"]
```

#### Available Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `id` | Required | Tour ID |
| `width` | `100%` | Container width |
| `height` | `500px` | Container height |
| `autoload` | `true` | Auto-load panorama |
| `controls` | `true` | Show navigation controls |
| `compass` | `true` | Show compass |
| `fullscreen` | `true` | Enable fullscreen button |

## File Structure

```
vortex360-lite/
├── vortex360-lite.php          # Main plugin file
├── README.md                   # This file
├── admin/                      # Admin interface
│   ├── class-admin.php         # Admin class
│   ├── css/admin.css          # Admin styles
│   ├── js/admin.js            # Admin JavaScript
│   └── templates/
│       └── dashboard.php       # Admin dashboard template
├── includes/                   # Core functionality
│   ├── class-activator.php     # Plugin activation
│   ├── class-deactivator.php   # Plugin deactivation
│   ├── class-tour.php          # Tour management
│   ├── class-scene.php         # Scene management
│   ├── class-hotspot.php       # Hotspot management
│   ├── class-shortcode.php     # Shortcode handler
│   └── class-rest-api.php      # REST API endpoints
└── public/                     # Frontend assets
    ├── css/
    │   └── vortex360-viewer.css # Frontend styles
    └── js/
        └── vortex360-viewer.js  # Frontend JavaScript
```

## System Requirements

### Server Requirements

- **PHP Version**: 7.4 or higher (8.0+ recommended)
- **WordPress**: 5.0 or higher
- **MySQL**: 5.6 or higher (or MariaDB equivalent)
- **Memory Limit**: 128MB minimum (256MB recommended)
- **Disk Space**: 50MB for plugin + space for uploaded images
- **Web Server**: Apache 2.4+ or Nginx 1.14+

### Browser Support

- **Desktop**: Chrome 70+, Firefox 65+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 70+, Samsung Internet 10+
- **WebGL**: Required for 360° rendering
- **JavaScript**: Must be enabled

## Troubleshooting

### Common Issues

#### 1. Plugin Won't Activate

**Symptoms**: Error message during activation

**Solutions**:
```bash
# Check PHP version
php -v

# Verify file permissions
chmod 755 vortex360-lite/
chmod 644 vortex360-lite/*.php

# Check WordPress version
# Go to Dashboard > Updates
```

#### 2. Images Won't Upload

**Symptoms**: Upload fails or times out

**Solutions**:
```php
// Add to wp-config.php
ini_set('upload_max_filesize', '50M');
ini_set('post_max_size', '50M');
ini_set('max_execution_time', 300);
```

#### 3. 360° Viewer Not Loading

**Symptoms**: Black screen or loading spinner

**Solutions**:
- Check browser console for JavaScript errors
- Verify image URLs are accessible
- Ensure WebGL is supported
- Clear browser cache

#### 4. Database Errors

**Symptoms**: Plugin data not saving

**Solutions**:
```sql
-- Check if tables exist
SHOW TABLES LIKE 'wp_vortex360_%';

-- Recreate tables if missing
-- Deactivate and reactivate plugin
```

### Performance Optimization

#### Image Optimization

```bash
# Recommended image specifications
Format: JPG (for photos) or PNG (for rendered images)
Resolution: 4096x2048 (2:1 aspect ratio)
File Size: < 5MB per image
Compression: 80-90% quality
```

#### Caching Setup

```php
// Add to wp-config.php for better performance
define('WP_CACHE', true);
define('COMPRESS_CSS', true);
define('COMPRESS_SCRIPTS', true);
```

## Security Considerations

### File Upload Security

- Only JPG and PNG files are allowed
- File size limits are enforced
- Uploaded files are stored in WordPress uploads directory
- Proper sanitization of file names

### User Permissions

- Only administrators can create/edit tours
- Proper nonce verification for all AJAX requests
- SQL injection protection with prepared statements
- XSS protection with proper output escaping

## Upgrade Path

### From Lite to Pro

1. **Data Migration**: All tours and settings are preserved
2. **Additional Features**: Unlimited tours, advanced hotspots, analytics
3. **Seamless Upgrade**: No downtime or data loss

### Version Updates

1. **Backup**: Always backup your site before updating
2. **Automatic Updates**: Enable via WordPress admin
3. **Manual Updates**: Upload new version via FTP

## Support & Documentation

### Getting Help

- **Documentation**: [Plugin Documentation](https://example.com/docs)
- **Support Forum**: [WordPress.org Support](https://wordpress.org/support/plugin/vortex360-lite)
- **Premium Support**: Available with Pro version

### Reporting Issues

When reporting issues, please include:

1. WordPress version
2. PHP version
3. Plugin version
4. Browser and version
5. Steps to reproduce
6. Error messages (if any)

## Development

### Local Development Setup

```bash
# Clone or download plugin
git clone https://github.com/alfawz/vortex360-lite.git

# Set up local WordPress environment
# Copy plugin to wp-content/plugins/

# Enable WordPress debug mode
# Add to wp-config.php:
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Changelog

### Version 1.0.0 (2025-01-XX)

- Initial release
- 360° panoramic tour creation
- Interactive hotspot system
- Responsive admin dashboard
- Shortcode integration
- Mobile-responsive viewer
- cPanel deployment support

## License

This plugin is licensed under the GPL v2 or later.

```
Vortex360 Lite WordPress Plugin
Copyright (C) 2025 AlFawz Qur'an Institute

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU General Public License for more details.
```

---

**Made with ❤️ by AlFawz Qur'an Institute**  
**Powered by WordPress & Pannellum**