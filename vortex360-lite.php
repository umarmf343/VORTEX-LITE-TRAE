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

// Legacy constants used throughout the VX_* classes.
if (!defined('VX_VERSION')) {
    define('VX_VERSION', VORTEX360_LITE_VERSION);
}

if (!defined('VX_PLUGIN_FILE')) {
    define('VX_PLUGIN_FILE', __FILE__);
}

if (!defined('VX_PLUGIN_DIR')) {
    define('VX_PLUGIN_DIR', VORTEX360_LITE_PLUGIN_PATH);
}

if (!defined('VX_PLUGIN_PATH')) {
    define('VX_PLUGIN_PATH', VORTEX360_LITE_PLUGIN_PATH);
}

if (!defined('VX_PLUGIN_URL')) {
    define('VX_PLUGIN_URL', VORTEX360_LITE_PLUGIN_URL);
}

if (!defined('VX_PLUGIN_BASENAME')) {
    define('VX_PLUGIN_BASENAME', VORTEX360_LITE_PLUGIN_BASENAME);
}

if (!defined('VX_LITE_VERSION')) {
    define('VX_LITE_VERSION', VORTEX360_LITE_VERSION);
}

if (!defined('VX_LITE_PATH')) {
    define('VX_LITE_PATH', VORTEX360_LITE_PLUGIN_PATH);
}

if (!defined('VX_LITE_URL')) {
    define('VX_LITE_URL', VORTEX360_LITE_PLUGIN_URL);
}

if (!defined('VX_LITE_FILE')) {
    define('VX_LITE_FILE', __FILE__);
}

if (!defined('VX_LITE_BASENAME')) {
    define('VX_LITE_BASENAME', VORTEX360_LITE_PLUGIN_BASENAME);
}

if (!defined('VX_MIN_PHP_VERSION')) {
    define('VX_MIN_PHP_VERSION', '7.4');
}

if (!defined('VX_MIN_WP_VERSION')) {
    define('VX_MIN_WP_VERSION', '5.0');
}

if (!defined('VX_DB_VERSION')) {
    define('VX_DB_VERSION', '1.0.0');
}

if (!defined('VX_CPT')) {
    define('VX_CPT', 'vx_tour');
}

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
        $this->load_dependency('includes/class-database.php');
        $this->load_dependency('includes/helpers/vx-utils.php');
        $this->load_dependency('includes/class-tour.php');
        $this->load_dependency('includes/class-scene.php');
        $this->load_dependency('includes/class-hotspot.php');
        $this->load_dependency('includes/class-shortcode.php');
        $this->load_dependency('includes/class-rest-api.php');

        // Load admin classes
        if (is_admin()) {
            $this->load_dependency('admin/class-admin.php');
            $this->load_dependency('admin/class-admin-menu.php');
            $this->load_dependency('admin/class-admin-ajax.php');
            $this->load_dependency('admin/class-vx-admin.php');
            $this->load_dependency('admin/class-vx-admin-ajax.php');
        }

        // Load public classes
        $this->load_dependency('public/class-public.php');
    }

    /**
     * Safely load a dependency file while discarding accidental output.
     *
     * This prevents UTF-8 BOMs or stray whitespace from breaking header
     * operations during WordPress bootstrap.
     *
     * @param string $relative_path Relative path from the plugin root.
     * @return bool True when the file was loaded, false when missing.
     */
    private function load_dependency($relative_path) {
        $relative_path = ltrim($relative_path, '/');
        $full_path     = VORTEX360_LITE_PLUGIN_PATH . $relative_path;

        if (!file_exists($full_path)) {
            $this->debug_log(sprintf('Vortex360 Lite: Missing dependency %s', $relative_path));
            return false;
        }

        ob_start();
        require_once $full_path;
        $output = ob_get_clean();

        if (!empty($output)) {
            $this->debug_log(sprintf('Vortex360 Lite: Discarded unexpected output from %s', $relative_path));
        }

        return true;
    }

    /**
     * Write debug messages when WordPress debugging is enabled.
     *
     * @param string $message Debug message.
     * @return void
     */
    private function debug_log($message) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log($message);
        }
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
        if (class_exists('Vortex360_Lite_Shortcode')) {
            new Vortex360_Lite_Shortcode();
        }

        // Initialize REST API
        if (class_exists('Vortex360_Lite_Rest_API')) {
            new Vortex360_Lite_Rest_API();
        }

        // Initialize admin if in admin area
        if (is_admin()) {
            if (class_exists('Vortex360_Lite_Admin')) {
                new Vortex360_Lite_Admin(VORTEX360_LITE_VERSION);
            } elseif (class_exists('VX_Admin')) {
                new VX_Admin(VORTEX360_LITE_VERSION);
            }

            if (class_exists('Vortex360_Lite_Admin_Menu')) {
                new Vortex360_Lite_Admin_Menu();
            }

            if (class_exists('Vortex360_Lite_Admin_Ajax')) {
                new Vortex360_Lite_Admin_Ajax();
            } elseif (class_exists('VX_Admin_Ajax')) {
                new VX_Admin_Ajax();
            }
        }

        // Initialize public
        if (class_exists('Vortex360_Lite_Public')) {
            new Vortex360_Lite_Public();
        }
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
        // Pannellum is bundled via CDN inside the viewer bootstrap.
        wp_register_style(
            'pannellum',
            'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css',
            array(),
            '2.5.6'
        );

        wp_register_script(
            'pannellum',
            'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js',
            array(),
            '2.5.6',
            true
        );

        wp_register_style(
            'vortex360-lite-viewer',
            VORTEX360_LITE_PLUGIN_URL . 'assets/css/tour-viewer.css',
            array(),
            VORTEX360_LITE_VERSION
        );

        wp_register_script(
            'vortex360-lite-viewer',
            VORTEX360_LITE_PLUGIN_URL . 'assets/js/tour-viewer.js',
            array('pannellum'),
            VORTEX360_LITE_VERSION,
            true
        );

        wp_localize_script('vortex360-lite-viewer', 'vortex360Ajax', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('vortex360_lite_nonce'),
            'pluginUrl' => VORTEX360_LITE_PLUGIN_URL
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