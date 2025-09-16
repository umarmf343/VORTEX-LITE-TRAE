<?php
/**
 * Custom Post Type functionality
 *
 * Registers the vortex_tour custom post type and related capabilities.
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
 * Custom Post Type class.
 *
 * Registers the vortex_tour custom post type with proper capabilities
 * and taxonomies for organizing virtual tours.
 *
 * @since      1.0.0
 * @package    Vortex360_Lite
 * @subpackage Vortex360_Lite/includes
 * @author     Vortex360 Team <support@vortex360.co>
 */
class VX_CPT {

    /**
     * The post type slug.
     *
     * @since    1.0.0
     * @access   private
     * @var      string    $post_type    The post type slug.
     */
    private $post_type = 'vortex_tour';

    /**
     * Register the custom post type.
     *
     * @since    1.0.0
     */
    public function register_post_type() {
        $labels = array(
            'name'                  => _x('Virtual Tours', 'Post Type General Name', 'vortex360-lite'),
            'singular_name'         => _x('Virtual Tour', 'Post Type Singular Name', 'vortex360-lite'),
            'menu_name'             => __('Virtual Tours', 'vortex360-lite'),
            'name_admin_bar'        => __('Virtual Tour', 'vortex360-lite'),
            'archives'              => __('Tour Archives', 'vortex360-lite'),
            'attributes'            => __('Tour Attributes', 'vortex360-lite'),
            'parent_item_colon'     => __('Parent Tour:', 'vortex360-lite'),
            'all_items'             => __('All Tours', 'vortex360-lite'),
            'add_new_item'          => __('Add New Tour', 'vortex360-lite'),
            'add_new'               => __('Add New', 'vortex360-lite'),
            'new_item'              => __('New Tour', 'vortex360-lite'),
            'edit_item'             => __('Edit Tour', 'vortex360-lite'),
            'update_item'           => __('Update Tour', 'vortex360-lite'),
            'view_item'             => __('View Tour', 'vortex360-lite'),
            'view_items'            => __('View Tours', 'vortex360-lite'),
            'search_items'          => __('Search Tours', 'vortex360-lite'),
            'not_found'             => __('Not found', 'vortex360-lite'),
            'not_found_in_trash'    => __('Not found in Trash', 'vortex360-lite'),
            'featured_image'        => __('Featured Image', 'vortex360-lite'),
            'set_featured_image'    => __('Set featured image', 'vortex360-lite'),
            'remove_featured_image' => __('Remove featured image', 'vortex360-lite'),
            'use_featured_image'    => __('Use as featured image', 'vortex360-lite'),
            'insert_into_item'      => __('Insert into tour', 'vortex360-lite'),
            'uploaded_to_this_item' => __('Uploaded to this tour', 'vortex360-lite'),
            'items_list'            => __('Tours list', 'vortex360-lite'),
            'items_list_navigation' => __('Tours list navigation', 'vortex360-lite'),
            'filter_items_list'     => __('Filter tours list', 'vortex360-lite'),
        );

        $capabilities = array(
            'edit_post'          => 'edit_vortex_tour',
            'read_post'          => 'read_vortex_tour',
            'delete_post'        => 'delete_vortex_tour',
            'edit_posts'         => 'edit_vortex_tours',
            'edit_others_posts'  => 'edit_others_vortex_tours',
            'publish_posts'      => 'publish_vortex_tours',
            'read_private_posts' => 'read_private_vortex_tours',
            'delete_posts'       => 'delete_vortex_tours',
            'delete_private_posts' => 'delete_private_vortex_tours',
            'delete_published_posts' => 'delete_published_vortex_tours',
            'delete_others_posts' => 'delete_others_vortex_tours',
            'edit_private_posts' => 'edit_private_vortex_tours',
            'edit_published_posts' => 'edit_published_vortex_tours',
        );

        $args = array(
            'label'                 => __('Virtual Tour', 'vortex360-lite'),
            'description'           => __('360° Virtual Tours', 'vortex360-lite'),
            'labels'                => $labels,
            'supports'              => array('title', 'editor', 'thumbnail', 'custom-fields'),
            'taxonomies'            => array(),
            'hierarchical'          => false,
            'public'                => true,
            'show_ui'               => true,
            'show_in_menu'          => true,
            'menu_position'         => 25,
            'menu_icon'             => 'dashicons-360',
            'show_in_admin_bar'     => true,
            'show_in_nav_menus'     => true,
            'can_export'            => true,
            'has_archive'           => true,
            'exclude_from_search'   => false,
            'publicly_queryable'    => true,
            'capabilities'          => $capabilities,
            'map_meta_cap'          => true,
            'show_in_rest'          => true,
            'rest_base'             => 'vortex-tours',
            'rest_controller_class' => 'WP_REST_Posts_Controller',
        );

        register_post_type($this->post_type, $args);
    }

    /**
     * Register capabilities for the custom post type.
     *
     * @since    1.0.0
     */
    public function register_capabilities() {
        // Get the administrator role
        $admin_role = get_role('administrator');
        
        if ($admin_role) {
            // Add capabilities to administrator
            $admin_role->add_cap('edit_vortex_tour');
            $admin_role->add_cap('read_vortex_tour');
            $admin_role->add_cap('delete_vortex_tour');
            $admin_role->add_cap('edit_vortex_tours');
            $admin_role->add_cap('edit_others_vortex_tours');
            $admin_role->add_cap('publish_vortex_tours');
            $admin_role->add_cap('read_private_vortex_tours');
            $admin_role->add_cap('delete_vortex_tours');
            $admin_role->add_cap('delete_private_vortex_tours');
            $admin_role->add_cap('delete_published_vortex_tours');
            $admin_role->add_cap('delete_others_vortex_tours');
            $admin_role->add_cap('edit_private_vortex_tours');
            $admin_role->add_cap('edit_published_vortex_tours');
        }

        // Get the editor role
        $editor_role = get_role('editor');
        
        if ($editor_role) {
            // Add capabilities to editor
            $editor_role->add_cap('edit_vortex_tour');
            $editor_role->add_cap('read_vortex_tour');
            $editor_role->add_cap('delete_vortex_tour');
            $editor_role->add_cap('edit_vortex_tours');
            $editor_role->add_cap('edit_others_vortex_tours');
            $editor_role->add_cap('publish_vortex_tours');
            $editor_role->add_cap('read_private_vortex_tours');
            $editor_role->add_cap('delete_vortex_tours');
            $editor_role->add_cap('delete_private_vortex_tours');
            $editor_role->add_cap('delete_published_vortex_tours');
            $editor_role->add_cap('delete_others_vortex_tours');
            $editor_role->add_cap('edit_private_vortex_tours');
            $editor_role->add_cap('edit_published_vortex_tours');
        }

        // Get the author role
        $author_role = get_role('author');
        
        if ($author_role) {
            // Add limited capabilities to author
            $author_role->add_cap('edit_vortex_tour');
            $author_role->add_cap('read_vortex_tour');
            $author_role->add_cap('delete_vortex_tour');
            $author_role->add_cap('edit_vortex_tours');
            $author_role->add_cap('publish_vortex_tours');
            $author_role->add_cap('delete_vortex_tours');
            $author_role->add_cap('delete_published_vortex_tours');
            $author_role->add_cap('edit_published_vortex_tours');
        }
    }

    /**
     * Get the post type slug.
     *
     * @since    1.0.0
     * @return   string    The post type slug.
     */
    public function get_post_type() {
        return $this->post_type;
    }

    /**
     * Remove capabilities on plugin deactivation.
     *
     * @since    1.0.0
     */
    public static function remove_capabilities() {
        $roles = array('administrator', 'editor', 'author');
        $caps = array(
            'edit_vortex_tour',
            'read_vortex_tour',
            'delete_vortex_tour',
            'edit_vortex_tours',
            'edit_others_vortex_tours',
            'publish_vortex_tours',
            'read_private_vortex_tours',
            'delete_vortex_tours',
            'delete_private_vortex_tours',
            'delete_published_vortex_tours',
            'delete_others_vortex_tours',
            'edit_private_vortex_tours',
            'edit_published_vortex_tours'
        );

        foreach ($roles as $role_name) {
            $role = get_role($role_name);
            if ($role) {
                foreach ($caps as $cap) {
                    $role->remove_cap($cap);
                }
            }
        }
    }
}