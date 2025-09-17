<?php
/**
 * Vortex360 Lite - Public bootstrapper.
 *
 * Provides a thin wrapper around the shipped VX public classes so their
 * non-asset hooks remain active while the lite viewer handles asset loading.
 */

// Prevent direct access.
if (!defined('ABSPATH')) {
    exit;
}

class Vortex360_Lite_Public {
    /**
     * VX public controller instance.
     *
     * @var VX_Public
     */
    private $vx_public;

    /**
     * Initialise the public layer.
     */
    public function __construct() {
        $this->ensure_constants();
        $this->load_dependencies();
        $this->boot_vx_public();
    }

    /**
     * Ensure shared VX constants exist for the bundled classes.
     *
     * These constants are expected by the VX_* classes that shipped with the
     * scaffold. When they are missing PHP notices are triggered and hooks are
     * skipped.
     */
    private function ensure_constants() {
        if (!defined('VX_VERSION')) {
            define('VX_VERSION', VORTEX360_LITE_VERSION);
        }

        if (!defined('VX_PLUGIN_URL')) {
            define('VX_PLUGIN_URL', VORTEX360_LITE_PLUGIN_URL);
        }

        if (!defined('VX_PLUGIN_DIR')) {
            define('VX_PLUGIN_DIR', VORTEX360_LITE_PLUGIN_PATH);
        }
    }

    /**
     * Load the VX public classes bundled with the plugin scaffold.
     */
    private function load_dependencies() {
        require_once VORTEX360_LITE_PLUGIN_PATH . 'public/class-vx-public.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'public/class-vx-public-template-loader.php';
        require_once VORTEX360_LITE_PLUGIN_PATH . 'public/class-vx-public-shortcodes.php';
    }

    /**
     * Boot the VX public hooks while deferring asset loading to the lite stack.
     */
    private function boot_vx_public() {
        $this->vx_public = new VX_Public('vortex360-lite', VORTEX360_LITE_VERSION);

        // Disable the legacy asset hooks so the lite viewer bundles can be used.
        remove_action('wp_enqueue_scripts', array($this->vx_public, 'enqueue_styles'));
        remove_action('wp_enqueue_scripts', array($this->vx_public, 'enqueue_scripts'));

        // Activate the additional template and shortcode handlers.
        new VX_Public_Template_Loader();
        new VX_Public_Shortcodes();
    }
}
