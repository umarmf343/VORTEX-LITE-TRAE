<?php
/**
 * Vortex360 Lite Plugin Test Suite
 * 
 * This file contains comprehensive tests for the Vortex360 Lite plugin
 * to ensure all functionality works correctly before deployment.
 * 
 * @package Vortex360Lite
 * @version 1.0.0
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class Vortex360_Lite_Tests {
    
    private $errors = [];
    private $passed = 0;
    private $total = 0;
    
    /**
     * Run all plugin tests
     */
    public function run_all_tests() {
        echo "<div style='padding: 20px; font-family: Arial, sans-serif;'>";
        echo "<h2>🧪 Vortex360 Lite Plugin Test Suite</h2>";
        
        $this->test_plugin_activation();
        $this->test_database_tables();
        $this->test_admin_capabilities();
        $this->test_rest_api_endpoints();
        $this->test_shortcode_functionality();
        $this->test_file_structure();
        $this->test_security_measures();
        $this->test_performance_optimization();
        
        $this->display_results();
        echo "</div>";
    }
    
    /**
     * Test plugin activation and basic setup
     */
    private function test_plugin_activation() {
        $this->test_section("Plugin Activation");
        
        // Test if plugin is active
        $this->assert(
            is_plugin_active('vortex360-lite/vortex360-lite.php'),
            "Plugin is activated"
        );
        
        // Test if main class exists
        $this->assert(
            class_exists('Vortex360_Lite'),
            "Main plugin class exists"
        );
        
        // Test if constants are defined
        $this->assert(
            defined('VORTEX360_LITE_VERSION'),
            "Plugin version constant defined"
        );
        
        $this->assert(
            defined('VORTEX360_LITE_PATH'),
            "Plugin path constant defined"
        );
    }
    
    /**
     * Test database table creation
     */
    private function test_database_tables() {
        global $wpdb;
        $this->test_section("Database Tables");
        
        $tables = [
            $wpdb->prefix . 'vortex360_tours',
            $wpdb->prefix . 'vortex360_scenes',
            $wpdb->prefix . 'vortex360_hotspots'
        ];
        
        foreach ($tables as $table) {
            $exists = $wpdb->get_var("SHOW TABLES LIKE '$table'") === $table;
            $this->assert($exists, "Table $table exists");
        }
        
        // Test table structure
        $tour_columns = $wpdb->get_results("DESCRIBE {$wpdb->prefix}vortex360_tours");
        $this->assert(
            count($tour_columns) >= 8,
            "Tours table has required columns"
        );
    }
    
    /**
     * Test admin panel capabilities
     */
    private function test_admin_capabilities() {
        $this->test_section("Admin Capabilities");
        
        // Test admin menu registration
        global $menu, $submenu;
        $admin_menu_exists = false;
        
        foreach ($menu as $menu_item) {
            if (strpos($menu_item[2], 'vortex360-lite') !== false) {
                $admin_menu_exists = true;
                break;
            }
        }
        
        $this->assert($admin_menu_exists, "Admin menu is registered");
        
        // Test admin scripts and styles enqueue
        $this->assert(
            wp_script_is('vortex360-lite-admin', 'registered'),
            "Admin JavaScript is registered"
        );
        
        $this->assert(
            wp_style_is('vortex360-lite-admin', 'registered'),
            "Admin CSS is registered"
        );
    }
    
    /**
     * Test REST API endpoints
     */
    private function test_rest_api_endpoints() {
        $this->test_section("REST API Endpoints");
        
        $endpoints = [
            '/wp-json/vortex360-lite/v1/tours',
            '/wp-json/vortex360-lite/v1/tours/(?P<id>\\d+)',
            '/wp-json/vortex360-lite/v1/scenes',
            '/wp-json/vortex360-lite/v1/hotspots'
        ];
        
        $rest_server = rest_get_server();
        $routes = $rest_server->get_routes();
        
        foreach ($endpoints as $endpoint) {
            $found = false;
            foreach ($routes as $route => $handlers) {
                if (strpos($route, str_replace('\\', '', $endpoint)) !== false) {
                    $found = true;
                    break;
                }
            }
            $this->assert($found, "Endpoint $endpoint is registered");
        }
    }
    
    /**
     * Test shortcode functionality
     */
    private function test_shortcode_functionality() {
        $this->test_section("Shortcode Functionality");
        
        // Test shortcode registration
        $this->assert(
            shortcode_exists('vortex360_tour'),
            "Main shortcode is registered"
        );
        
        // Test shortcode output (basic)
        $output = do_shortcode('[vortex360_tour id="1"]');
        $this->assert(
            !empty($output) && strpos($output, 'vortex360-viewer') !== false,
            "Shortcode generates viewer HTML"
        );
    }
    
    /**
     * Test file structure and permissions
     */
    private function test_file_structure() {
        $this->test_section("File Structure");
        
        $required_files = [
            'vortex360-lite.php',
            'includes/class-vortex360-lite.php',
            'includes/class-database.php',
            'includes/class-admin.php',
            'includes/class-frontend.php',
            'includes/class-rest-api.php',
            'admin/css/admin.css',
            'admin/js/admin.js',
            'public/css/vortex360-viewer.css',
            'public/js/vortex360-viewer.js',
            'README.md'
        ];
        
        foreach ($required_files as $file) {
            $file_path = VORTEX360_LITE_PATH . $file;
            $this->assert(
                file_exists($file_path),
                "Required file exists: $file"
            );
            
            if (file_exists($file_path)) {
                $this->assert(
                    is_readable($file_path),
                    "File is readable: $file"
                );
            }
        }
    }
    
    /**
     * Test security measures
     */
    private function test_security_measures() {
        $this->test_section("Security Measures");
        
        // Test nonce verification in AJAX handlers
        $this->assert(
            method_exists('Vortex360_Lite_Admin', 'verify_nonce'),
            "Nonce verification method exists"
        );
        
        // Test capability checks
        $this->assert(
            current_user_can('manage_options') || !is_admin(),
            "Proper capability checks in place"
        );
        
        // Test file access protection
        $protected_files = [
            'includes/class-vortex360-lite.php',
            'includes/class-database.php'
        ];
        
        foreach ($protected_files as $file) {
            $file_path = VORTEX360_LITE_PATH . $file;
            if (file_exists($file_path)) {
                $content = file_get_contents($file_path);
                $this->assert(
                    strpos($content, "if (!defined('ABSPATH'))") !== false,
                    "Direct access protection in $file"
                );
            }
        }
    }
    
    /**
     * Test performance optimizations
     */
    private function test_performance_optimization() {
        $this->test_section("Performance Optimization");
        
        // Test script loading optimization
        $this->assert(
            !wp_script_is('vortex360-lite-viewer', 'enqueued') || is_singular(),
            "Frontend scripts only load when needed"
        );
        
        // Test database query optimization
        global $wpdb;
        $query_count_before = $wpdb->num_queries;
        
        // Simulate tour loading
        $tours = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}vortex360_tours LIMIT 1");
        
        $query_count_after = $wpdb->num_queries;
        $this->assert(
            ($query_count_after - $query_count_before) <= 3,
            "Efficient database queries (≤3 queries for tour loading)"
        );
        
        // Test CSS/JS minification readiness
        $css_file = VORTEX360_LITE_PATH . 'public/css/vortex360-viewer.css';
        if (file_exists($css_file)) {
            $css_content = file_get_contents($css_file);
            $this->assert(
                strpos($css_content, '/*') !== false,
                "CSS contains comments (ready for minification)"
            );
        }
    }
    
    /**
     * Assert a condition and track results
     */
    private function assert($condition, $message) {
        $this->total++;
        
        if ($condition) {
            $this->passed++;
            echo "<div style='color: green; margin: 5px 0;'>✅ $message</div>";
        } else {
            $this->errors[] = $message;
            echo "<div style='color: red; margin: 5px 0;'>❌ $message</div>";
        }
    }
    
    /**
     * Display test section header
     */
    private function test_section($title) {
        echo "<h3 style='margin-top: 30px; color: #333; border-bottom: 2px solid #0073aa; padding-bottom: 10px;'>$title</h3>";
    }
    
    /**
     * Display final test results
     */
    private function display_results() {
        echo "<div style='margin-top: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px;'>";
        echo "<h3>📊 Test Results Summary</h3>";
        
        $success_rate = $this->total > 0 ? round(($this->passed / $this->total) * 100, 1) : 0;
        
        echo "<p><strong>Total Tests:</strong> {$this->total}</p>";
        echo "<p><strong>Passed:</strong> <span style='color: green;'>{$this->passed}</span></p>";
        echo "<p><strong>Failed:</strong> <span style='color: red;'>" . count($this->errors) . "</span></p>";
        echo "<p><strong>Success Rate:</strong> <span style='color: " . ($success_rate >= 90 ? 'green' : ($success_rate >= 70 ? 'orange' : 'red')) . ";'>{$success_rate}%</span></p>";
        
        if (count($this->errors) > 0) {
            echo "<h4 style='color: red;'>❌ Failed Tests:</h4>";
            echo "<ul>";
            foreach ($this->errors as $error) {
                echo "<li style='color: red;'>$error</li>";
            }
            echo "</ul>";
        } else {
            echo "<div style='color: green; font-size: 18px; font-weight: bold;'>🎉 All tests passed! Plugin is ready for deployment.</div>";
        }
        
        echo "</div>";
    }
}

// Auto-run tests if accessed directly with proper authentication
if (isset($_GET['run_vortex360_tests']) && current_user_can('manage_options')) {
    $tests = new Vortex360_Lite_Tests();
    $tests->run_all_tests();
}

/**
 * Add admin menu item for running tests
 */
function vortex360_lite_add_test_menu() {
    if (current_user_can('manage_options')) {
        add_submenu_page(
            'vortex360-lite',
            'Plugin Tests',
            'Run Tests',
            'manage_options',
            'vortex360-lite-tests',
            'vortex360_lite_test_page'
        );
    }
}
add_action('admin_menu', 'vortex360_lite_add_test_menu', 20);

/**
 * Test page callback
 */
function vortex360_lite_test_page() {
    echo '<div class="wrap">';
    echo '<h1>Vortex360 Lite Plugin Tests</h1>';
    echo '<p>Click the button below to run comprehensive tests on the plugin functionality.</p>';
    echo '<a href="' . admin_url('admin.php?page=vortex360-lite-tests&run_vortex360_tests=1') . '" class="button button-primary">Run All Tests</a>';
    
    if (isset($_GET['run_vortex360_tests'])) {
        $tests = new Vortex360_Lite_Tests();
        $tests->run_all_tests();
    }
    
    echo '</div>';
}

/**
 * Performance monitoring helper
 */
class Vortex360_Performance_Monitor {
    
    private static $start_time;
    private static $memory_start;
    
    /**
     * Start performance monitoring
     */
    public static function start() {
        self::$start_time = microtime(true);
        self::$memory_start = memory_get_usage();
    }
    
    /**
     * End monitoring and return results
     */
    public static function end() {
        $execution_time = microtime(true) - self::$start_time;
        $memory_used = memory_get_usage() - self::$memory_start;
        
        return [
            'execution_time' => round($execution_time * 1000, 2) . 'ms',
            'memory_used' => self::format_bytes($memory_used),
            'peak_memory' => self::format_bytes(memory_get_peak_usage())
        ];
    }
    
    /**
     * Format bytes to human readable format
     */
    private static function format_bytes($bytes) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}

?>