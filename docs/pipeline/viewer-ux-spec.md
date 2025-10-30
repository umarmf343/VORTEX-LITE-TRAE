# Immersive Viewer UX Specification

## Primary Screens & States
1. **Loading Shell**
   - Shows progressive loading bar, throughput indicator, and option to toggle Low-Bandwidth Mode.
2. **Walkthrough Mode**
   - Continuous camera path with joystick/WASD controls, mouse/touch drag look, smooth interpolation between nodes.
   - Breadcrumb trail of visited rooms; compass and floor indicator pinned to top-left.
3. **Teleport Mode**
   - Thumbnail hotspots for each navigation node; hover preview displays camera orientation.
   - Quick filter for `Rooms`, `Points of Interest`, `Saved Measurements`.
4. **Dollhouse / Floorplan**
   - Toggle between 3D dollhouse and 2D plan. Click-to-jump to camera nodes. Mini-map anchored bottom-right.
5. **Inspector Panel**
   - Slide-out right rail showing metadata: capture date, device, accuracy score, redaction status.
6. **Hotspot Detail Overlay**
   - Modal or popover with media (image/video/audio), rich text, CTA button, linked analytics events.

## Core Interactions
- **Navigation**: Left-click/drag to orient; double-click or tap to teleport; keyboard shortcuts `WASD` and arrow keys.
- **Measurement Tool**: Activate via toolbar button or `M` key. Snap to surfaces, show both metric/imperial, maintain history per session.
- **Annotations/Hotspots**: Toggle overlay from toolbar. Users with permission can add, edit, delete hotspots inline; include templates.
- **Low-Bandwidth Mode**: Switch reduces texture resolution, disables ambient occlusion, limits prefetch radius.
- **Accessibility Shortcuts**: `?` opens help overlay summarizing keyboard commands and gestures.

## UI Components
- **Toolbar**: Contains navigation toggles, measurement, hotspots, dollhouse/floorplan switch, share, settings.
- **Mini-Map**: Displays orientation arrow; clickable nodes.
- **Status Toasts**: Inform users about asset refinement, network degradation, or QA flags.
- **Accuracy Badge**: Visible indicator showing ± tolerance once calibration QA complete.

## Accessibility Checklist
- Provide ARIA labels for toolbar controls, navigation nodes, hotspots, and measurement results.
- Ensure focus order follows visual hierarchy; support keyboard-only navigation including teleport grid and dollhouse nodes.
- Maintain color contrast ratios ≥ 4.5:1 for text/icons; supply high-contrast theme toggle.
- Offer text alternatives for hotspot media and captions for audio/video.
- Respect reduced-motion preference by limiting camera easing and offering instant teleport transitions.
- Support screen readers by exposing structural landmarks (main viewer, toolbar, inspector).

## Analytics Hooks
- Emit events for navigation changes, measurement creation, hotspot open/close, low-bandwidth toggles, and QA overrides.
- Track dwell time per node and viewport orientation heatmap (aggregated client-side and batched to analytics API).
