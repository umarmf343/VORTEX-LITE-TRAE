<?php
/**
 * The core plugin class.
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * @link       https://vortex360.co
 * @since      1.0.0
 *
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * The core plugin class (singleton).
 *
 * This is used to define internationalization, admin-specific hooks, and
 * public-facing site hooks.
 *
 * Also maintains the unique identifier of this plugin as well as the current
 * version of the plugin.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX {

    /**
     * The loader that's responsible for maintaining and registering all hooks that power
     * the plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      VX_Loader    $loader    Maintains and registers all hooks for the plugin.
     */
    protected $loader;

    /**
     * The unique identifier of this plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      string    $plugin_name    The string used to uniquely identify this plugin.
     */
    protected $plugin_name;

    /**
     * The current version of the plugin.
     *
     * @since    1.0.0
     * @access   protected
     * @var      string    $version    The current version of the plugin.
     */
    protected $version;

    /**
     * The single instance of the class.
     *
     * @since    1.0.0
     * @access   protected
     * @var      VX    $instance    The single instance of the class.
     */
    protected static $instance = null;

    /**
     * Main VX Instance.
     *
     * Ensures only one instance of VX is loaded or can be loaded.
     *
     * @since 1.0.0
     * @static
     * @return VX - Main instance.
     */
    public static function instance() {
        if (is_null(self::$instance)) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Define the core functionality of the plugin.
     *
     * Set the plugin name and the plugin version that can be used throughout the plugin.
     * Load the dependencies, define the locale, and set the hooks for the admin area and
     * the public-facing side of the site.
     *
     * @since    1.0.0
     */
    public function __construct() {
        if (defined('VORTEX360_LITE_VERSION')) {
            $this->version = VORTEX360_LITE_VERSION;
        } else {
            $this->version = '1.0.0';
        }
        $this->plugin_name = 'vortex360-lite';

        $this->load_dependencies();
        $this->set_locale();
        $this->define_admin_hooks();
        $this->define_public_hooks();
    }

    /**
     * Load the required dependencies for this plugin.
     *
     * Include the following files that make up the plugin:
     *
     * - VX_Loader. Orchestrates the hooks of the plugin.
     * - VX_i18n. Defines internationalization functionality.
     * - VX_Admin. Defines all hooks for the admin area.
     * - VX_Public. Defines all hooks for the public side of the site.
     *
     * Create an instance of the loader which will be used to register the hooks
     * with WordPress.
     *
     * @since    1.0.0
     * @access   private
     */
    private function load_dependencies() {
        /**
         * The class responsible for orchestrating the actions and filters of the
         * core plugin.
         */
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-loader.php';

        /**
         * The class responsible for defining internationalization functionality
         * of the plugin.
         */
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-i18n.php';

        /**
         * The class responsible for defining all actions that occur in the admin area.
         */
        require_once plugin_dir_path(dirname(__FILE__)) . 'admin/class-vx-admin.php';

        /**
         * The class responsible for defining all actions that occur in the public-facing
         * side of the site.
         */
        require_once plugin_dir_path(dirname(__FILE__)) . 'public/class-vx-public.php';

        /**
         * Load core functionality classes
         */
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-cpt.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-limits-lite.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-scenes.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-hotspots.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-shortcode.php';
        require_once plugin_dir_path(dirname(__FILE__)) . 'includes/class-vx-rest.php';

        $this->loader = new VX_Loader();
    }

    /**
     * Define the locale for this plugin for internationalization.
     *
     * Uses the VX_i18n class in order to set the domain and to register the hook
     * with WordPress.
     *
     * @since    1.0.0
     * @access   private
     */
    private function set_locale() {
        $plugin_i18n = new VX_i18n();

        $this->loader->add_action('plugins_loaded', $plugin_i18n, 'load_plugin_textdomain');
    }

    /**
     * Register all of the hooks related to the admin area functionality
     * of the plugin.
     *
     * @since    1.0.0
     * @access   private
     */
    private function define_admin_hooks() {
        $plugin_admin = new VX_Admin($this->get_plugin_name(), $this->get_version());

        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_styles');
        $this->loader->add_action('admin_enqueue_scripts', $plugin_admin, 'enqueue_scripts');
        $this->loader->add_action('admin_menu', $plugin_admin, 'add_admin_menu');
        $this->loader->add_action('admin_init', $plugin_admin, 'admin_init');

        // Initialize CPT
        $cpt = new VX_CPT();
        $this->loader->add_action('init', $cpt, 'register_post_type');
        $this->loader->add_action('init', $cpt, 'register_capabilities');

        // Initialize shortcode
        $shortcode = new VX_Shortcode();
        $this->loader->add_action('init', $shortcode, 'register_shortcode');

        // Initialize REST API
        $rest = new VX_REST();
        $this->loader->add_action('rest_api_init', $rest, 'register_routes');
    }

    /**
     * Register all of the hooks related to the public-facing functionality
     * of the plugin.
     *
     * @since    1.0.0
     * @access   private
     */
    private function define_public_hooks() {
        $plugin_public = new VX_Public($this->get_plugin_name(), $this->get_version());

        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_styles');
        $this->loader->add_action('wp_enqueue_scripts', $plugin_public, 'enqueue_scripts');
    }

    /**
     * Run the loader to execute all of the hooks with WordPress.
     *
     * @since    1.0.0
     */
    public function run() {
        $this->loader->run();
    }

    /**
     * The name of the plugin used to uniquely identify it within the context of
     * WordPress and to define internationalization functionality.
     *
     * @since     1.0.0
     * @return    string    The name of the plugin.
     */
    public function get_plugin_name() {
        return $this->plugin_name;
    }

    /**
     * The reference to the class that orchestrates the hooks with the plugin.
     *
     * @since     1.0.0
     * @return    VX_Loader    Orchestrates the hooks of the plugin.
     */
    public function get_loader() {
        return $this->loader;
    }

    /**
     * Retrieve the version number of the plugin.
     *
     * @since     1.0.0
     * @return    string    The version number of the plugin.
     */
    public function get_version() {
        return $this->version;
    }
}