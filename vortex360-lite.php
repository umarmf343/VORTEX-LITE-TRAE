<?php
/**
 * Plugin Name: Vortex360 Lite
 * Plugin URI: https://vortex360.com
 * Description: Create stunning 360° virtual tours with ease. Lite version allows 1 tour with unlimited scenes and hotspots.
 * Version: 1.0.0
 * Author: AlFawz Qur'an Institute
 * Author URI: https://alfawz.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: vortex360-lite
 * Domain Path: /languages
 * Requires at least: 5.0
 * Tested up to: 6.4
 * Requires PHP: 7.4
 * Network: false
 */

/* AlFawz Qur'an Institute — generated with TRAE */
/* Author: Auto-scaffold (review required) */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('VORTEX360_LITE_VERSION', '1.0.0');
define('VORTEX360_LITE_PLUGIN_URL', plugin_dir_url(__FILE__));
define('VORTEX360_LITE_PLUGIN_PATH', plugin_dir_path(__FILE__));
define('VORTEX360_LITE_PLUGIN_BASENAME', plugin_basename(__FILE__));
define('VORTEX360_LITE_TEXT_DOMAIN', 'vortex360-lite');

/**
 * Main plugin class for Vortex360 Lite
 * Handles plugin initialization, activation, and deactivation
 */
class Vortex360_Lite {
    
    /**
     * Single instance of the plugin
     * @var Vortex360_Lite
     */
    private static $instance = null;
    
    /**
     * Get single instance of the plugin
     * @return Vortex360_Lite
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Constructor - Initialize the plugin
     */
    private function __construct() {
        $this->init_hooks();
        $this->load_dependencies();
    }
    
    /**
     * Initialize WordPress hooks
     */
    private function init_hooks() {
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        add_action('init', array($this, 'init'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('wp_enqueue_scripts', array($this, 'frontend_enqueue_scripts'));
    }
    
    /**
     * Load plugin dependencies and classes
     */
    private function load_dependencies() {
        // Load core classes
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-database.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-tour.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-scene.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-hotspot.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-shortcode.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'includes/class-rest-api.php';
        
        // Load admin classes
        if (is_admin()) {
            require_once VORTEX360_LITE_PLUGIN_PATH . 'admin/class-admin.php';
            require_once VORTEX360_LITE_PLUGIN_PATH . 'admin/class-admin-menu.php';
            require_once VORTEX360_LITE_PLUGIN_PATH . 'admin/class-admin-ajax.php';
        }
        
        // Load public classes
        require_once VORTEX360_LITE_PLUGIN_PATH . 'public/class-public.php';
    }
    
    /**
     * Plugin activation hook
     * Creates database tables and sets default options
     */
    public function activate() {
        // Create database tables
        $database = new Vortex360_Lite_Database();
        $database->create_tables();
        
        // Set default options
        add_option('vortex360_lite_version', VORTEX360_LITE_VERSION);
        add_option('vortex360_lite_max_tours', 1); // Lite version limit
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Plugin deactivation hook
     * Cleanup temporary data
     */
    public function deactivate() {
        // Clean up temporary data
        delete_transient('vortex360_lite_cache');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    /**
     * Load plugin text domain for translations
     */
    public function load_textdomain() {
        load_plugin_textdomain(
            VORTEX360_LITE_TEXT_DOMAIN,
            false,
            dirname(VORTEX360_LITE_PLUGIN_BASENAME) . '/languages/'
        );
    }
    
    /**
     * Initialize plugin components
     */
    public function init() {
        // Initialize shortcodes
        new Vortex360_Lite_Shortcode();
        
        // Initialize REST API
        new Vortex360_Lite_Rest_API();
        
        // Initialize admin if in admin area
        if (is_admin()) {
            new Vortex360_Lite_Admin();
            new Vortex360_Lite_Admin_Menu();
            new Vortex360_Lite_Admin_Ajax();
        }
        
        // Initialize public
        new Vortex360_Lite_Public();
    }
    
    /**
     * Enqueue admin scripts and styles
     * @param string $hook Current admin page hook
     */
    public function admin_enqueue_scripts($hook) {
        // Only load on plugin pages
        if (strpos($hook, 'vortex360') === false) {
            return;
        }
        
        // Enqueue admin CSS
        wp_enqueue_style(
            'vortex360-lite-admin',
            VORTEX360_LITE_PLUGIN_URL . 'admin/css/admin.css',
            array(),
            VORTEX360_LITE_VERSION
        );
        
        // Enqueue admin JS
        wp_enqueue_script(
            'vortex360-lite-admin',
            VORTEX360_LITE_PLUGIN_URL . 'admin/js/admin.js',
            array('jquery', 'wp-util'),
            VORTEX360_LITE_VERSION,
            true
        );
        
        // Localize script for AJAX
        wp_localize_script('vortex360-lite-admin', 'vortex360_ajax', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vortex360_lite_nonce'),
            'max_tours' => get_option('vortex360_lite_max_tours', 1)
        ));
    }
    
    /**
     * Enqueue frontend scripts and styles
     */
    public function frontend_enqueue_scripts() {
        // Enqueue Pannellum library
        wp_enqueue_style(
            'pannellum',
            VORTEX360_LITE_PLUGIN_URL . 'assets/pannellum/pannellum.css',
            array(),
            '2.5.6'
        );
        
        wp_enqueue_script(
            'pannellum',
            VORTEX360_LITE_PLUGIN_URL . 'assets/pannellum/pannellum.js',
            array(),
            '2.5.6',
            true
        );
        
        // Enqueue plugin frontend CSS
        wp_enqueue_style(
            'vortex360-lite-public',
            VORTEX360_LITE_PLUGIN_URL . 'public/css/public.css',
            array('pannellum'),
            VORTEX360_LITE_VERSION
        );
        
        // Enqueue plugin frontend JS
        wp_enqueue_script(
            'vortex360-lite-public',
            VORTEX360_LITE_PLUGIN_URL . 'public/js/public.js',
            array('jquery', 'pannellum'),
            VORTEX360_LITE_VERSION,
            true
        );
        
        // Localize script for frontend
        wp_localize_script('vortex360-lite-public', 'vortex360_public', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'plugin_url' => VORTEX360_LITE_PLUGIN_URL
        ));
    }
}

/**
 * Initialize the plugin
 * @return Vortex360_Lite
 */
function vortex360_lite() {
    return Vortex360_Lite::get_instance();
}

// Start the plugin
vortex360_lite();