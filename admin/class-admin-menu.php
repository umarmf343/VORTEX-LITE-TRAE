<?php
// File: /wp-content/plugins/vortex360-lite TRAE/admin/class-admin-menu.php
// Purpose: Provide a safe shim for older bootstrap code that requires this file.
// It proxies to the actual admin implementation that already exists in the ZIP.

if ( ! defined('ABSPATH') ) { exit; }

$admin_main = plugin_dir_path(__FILE__) . 'class-admin.php';
$admin_vx   = plugin_dir_path(__FILE__) . 'class-vx-admin.php';

if ( file_exists( $admin_main ) ) {
    require_once $admin_main; // loads Vortex360_Lite_Admin (existing in your ZIP)
}

if ( file_exists( $admin_vx ) ) {
    require_once $admin_vx;   // loads Vortex360_Lite_VX_Admin (existing in your ZIP)
}

// In case older bootstrap expects a class from this file, expose a thin wrapper.
if ( ! class_exists('Vortex360_Lite_Admin_Menu') ) {
    class Vortex360_Lite_Admin_Menu {
        public static function init() {
            // If your class-admin.php sets up menus in its constructor,
            // this wrapper doesn’t need to do anything else.
            // We keep it to avoid "class not found" in legacy code paths.
            return true;
        }
    }
}

// Auto-init (no harm if menus are already added by class-admin.php)
if ( function_exists('add_action') ) {
    add_action('admin_init', ['Vortex360_Lite_Admin_Menu', 'init']);
}
