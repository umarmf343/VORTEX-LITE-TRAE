# Share Panel UI Specification

## Overview
The Share Panel centralises link sharing, embedding, token selection, and social publishing for any published tour. It opens from the viewer "Share & embed" card and displays as a modal dialog over the tour experience.

## Layout Structure
1. **Header**
   - Title: "Share & embed tour".
   - Description: "Generate secure share links, responsive embeds, and social-ready previews for {property_name}."
2. **Share Link Section**
   - Token selector (if multiple tokens configured). Default = `defaultTokenId`.
   - Metadata badges: expiry, max views, allowed origins.
   - Read-only input with canonical share URL (font-mono, wraps on small screens).
   - Actions: "Copy link" (outline button with Copy icon + success state) and "Open" (launches link in new tab).
   - Optional CTA: "Open in app" button visible when `property.sharing.pwa.deepLink` is set.
   - Social buttons: outline buttons for Facebook, X/Twitter, LinkedIn, and Email; each opens new tab/window and fires analytics event with `channel=social:{platform}`.
3. **Embed Options Section** (hidden when `embed_allowed` is false)
   - Start node dropdown (disabled when customization disallowed).
   - View mode dropdown (walkthrough/floorplan/dollhouse filtered by availability).
   - Inputs: Minimum height (numeric), Aspect-ratio padding (string). Changes update snippet live.
   - Toggles (Switch components) for Branding, Autoplay, Floorplan toggle, Dollhouse toggle, Fullscreen control, Chromeless mode. Each respects `customizationOptions` flags.
   - Warning state: dashed red message when embedding disabled.
4. **Embed Output Section** (if embedding allowed)
   - Responsive iframe snippet (textarea). Copy button triggers `embed_code_copied` event with `embedType=iframe`.
   - Responsive CSS helper (textarea + copy button) for reuse in CMS.
   - JavaScript widget snippet (textarea + copy button) for SPA integrations. Copy button triggers `embed_code_copied` with `embedType=javascript`.

## Copy Feedback & Analytics
- Copy buttons swap Copy icon for Check icon for 2.5 seconds and show toast `"Copied"` with relevant description.
- All copy/share actions call `logShareEvent` with:
  - `share_link_generated`: link copy (`channel=link`), social share (`channel=social:*`), and PWA open (`channel=pwa`).
  - `embed_code_copied`: iframe/css/widget copies. Includes embed parameters (mode, start, branding, toggles) in payload.
  - `mobile_app_opened`: triggered by "Open in app" CTA.

## Accessibility & Responsiveness
- Dialog width: max 3xl, scrollable body with max 90vh height.
- Inputs labelled via `<Label>`; switches include descriptive helper text.
- Buttons accessible via keyboard, copy actions provide toast confirmation.
- Social buttons sized `sm`, wrap to multiple rows on narrow screens.
- Textareas use monospaced font for readability.

## Error States
- Clipboard failure: show destructive toast "Copy failed" with manual copy instruction.
- Embedding disabled: inline warning plus `Copy` buttons hidden.

## Dependency Notes
- Requires `property.sharing` configuration (tokens, defaults, customization flags) and `viewerManifest` for embed allowance and access token fallback.
- Uses `logShareEvent` utility; analytics endpoint configurable via `ShareAnalyticsOptions`.
