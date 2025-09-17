<?php
/**
 * Vortex360 Lite - Help Page Template
 */

if (!defined('ABSPATH')) {
    exit;
}
?>

<div class="wrap vx-help-page">
    <h1 class="wp-heading-inline">
        <span class="dashicons dashicons-sos"></span>
        <?php esc_html_e('Vortex360 Lite Help Center', 'vortex360-lite'); ?>
    </h1>

    <hr class="wp-header-end">

    <div class="card">
        <h2><?php esc_html_e('Getting Started', 'vortex360-lite'); ?></h2>
        <p><?php esc_html_e('Create your first virtual tour from the Tours dashboard. Upload a panoramic image, add a few hotspots, and publish the shortcode on any page.', 'vortex360-lite'); ?></p>
    </div>

    <div class="card">
        <h2><?php esc_html_e('Troubleshooting', 'vortex360-lite'); ?></h2>
        <ul class="vx-help-list">
            <li><?php esc_html_e('If a page shows blank content, ensure the tour status is set to Published.', 'vortex360-lite'); ?></li>
            <li><?php esc_html_e('Clear your browser cache after replacing panorama images.', 'vortex360-lite'); ?></li>
            <li><?php esc_html_e('Enable WordPress debugging to capture detailed logs when reporting an issue.', 'vortex360-lite'); ?></li>
        </ul>
    </div>

    <div class="card">
        <h2><?php esc_html_e('Need More?', 'vortex360-lite'); ?></h2>
        <p>
            <?php esc_html_e('Visit our documentation site for tutorials, FAQs, and developer notes.', 'vortex360-lite'); ?>
            <a href="https://vortex360.com/docs" target="_blank" rel="noopener noreferrer">
                <?php esc_html_e('Open Documentation', 'vortex360-lite'); ?>
            </a>
        </p>
        <p>
            <?php esc_html_e('Prefer personal assistance?', 'vortex360-lite'); ?>
            <a href="mailto:support@vortex360.com">support@vortex360.com</a>
        </p>
    </div>
</div>
