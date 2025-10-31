# Embed Your Tour

Follow this guide to share and embed VirtualTour spaces across websites, blogs, landing pages, and mobile apps.

## 1. Launch the Share Panel
1. Open the tour in the viewer.
2. Click **Share & embed** in the left rail.
3. Choose the access token (e.g., "Public share link" or "Marketing campaign") if multiple are available. Tokens enforce expiry, view limits, and allowed origins.

## 2. Copy the Share Link
- Use the **Copy link** button to copy the canonical URL. It includes ACL token, start node, default view mode, and analytics tracking (`utm_source=share-panel`).
- Optional: Tap **Open in app** to deep-link into the iOS/Android/PWA experience.
- Quick share buttons publish directly to Facebook, X/Twitter, LinkedIn, or email. Each share event is logged for analytics.

## 3. Configure Embed Options
- **Start node**: Pick the initial panorama to display (if enabled).
- **Initial mode**: Choose between Walkthrough, Floorplan, or Dollhouse (availability depends on the space).
- **Visual toggles**:
  - Branding (show/hide platform chrome)
  - Autoplay (auto-run guided tour)
  - Floorplan/Dollhouse toggles
  - Fullscreen button
  - Chromeless mode (hide UI for kiosks)
- **Sizing**: Set minimum height (px) and aspect-ratio padding to ensure responsive behaviour.

## 4. Embed Snippets
### Responsive iframe (recommended)
1. Copy the generated iframe code.
2. Paste into your CMS/HTML block.
3. Add the provided CSS helper once per site (global stylesheet or custom CSS area).

### JavaScript widget
- Use when you need programmatic control, analytics hooks, or single-page apps. Append the `<script>` tag after the placeholder `<div>`.

## 5. CMS Quick Reference
| Platform | Steps |
|----------|-------|
| **WordPress** | Use a "Custom HTML" block in Gutenberg or the Text tab of Classic Editor. Paste iframe snippet. Add CSS under Appearance → Customise → Additional CSS. |
| **Wix** | Add → Embed → Custom Embed → Embed a Widget. Paste iframe or JS widget. Apply CSS via Site Settings → Custom CSS (requires Premium). |
| **Squarespace** | Insert a Code Block. Paste iframe snippet. Enable "Display Source" off. Add CSS in Design → Custom CSS. |
| **Webflow** | Use an Embed component. Paste iframe. Place CSS in Project Settings → Custom Code → Head. |

## 6. Security & Compliance
- Tokens can be revoked or rotated in the property sharing configuration. Updating tokens regenerates share and embed snippets.
- `embed_allowed=false` prevents new iframe/widget snippets from being generated. Existing embeds should be removed if embedding is disabled.
- Analytics events (`share_link_generated`, `embed_code_copied`, `embed_loaded`, `mobile_app_opened`) feed the sharing dashboard. Capture host, token, and parameter metadata for security audits.

## 7. Responsive Tips
- Keep containers `width: 100%` to allow the iframe to scale naturally.
- Use `min-height` to ensure adequate viewport on mobile.
- Avoid nesting inside elements with fixed heights unless scroll overflow is intended.

## 8. Troubleshooting
- **Blank embed**: Confirm token validity and allowed origins. Regenerate share link if expired.
- **Cropping on mobile**: Reduce min-height and adjust aspect ratio (e.g., `75%` for taller viewports).
- **Meta previews missing**: Ensure the share link is used on social platforms; Open Graph/Twitter card metadata is served from the canonical share route.
- **Analytics not appearing**: Verify `/api/analytics/share` endpoint availability and that ad-blockers are not intercepting requests.

For additional support contact support@virtualtour.ai.
