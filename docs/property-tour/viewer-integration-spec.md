# Viewer Integration Specification

## Initialization Flow
1. Viewer loads shell (Next.js page) and fetches property manifest from CDN.
2. Manifest fetch includes token in headers if property is private. 401 triggers access denied overlay with support contact.
3. After manifest, viewer preloads default scene preview LOD and metadata for adjacent scenes using navigation graph.

## Asset Loading Strategy
- **LOD Selection**
  - Preview tiles (≤2k) for initial render.
  - Upgrade to web LOD once camera idle for 500ms and device performance score ≥ medium.
  - Print LOD only on demand (user triggers hi-res download or print mode).
- **Prefetching**
  - Maintain queue of neighbor scenes (depth 1). Start downloads after current scene stabilizes.
  - Use `requestIdleCallback` fallback for older browsers.
- **Caching**
  - Service worker caches tiles and manifests with TTL 12h; respects CDN cache headers.
  - Evict tiles beyond 2 hops from current scene to cap memory.

## UI Components
- **HUD**
  - Scene title, breadcrumb showing floor/scene type.
  - Mini-map thumbnails (optional) toggled from toolbar.
  - Buttons: Measure, Hotspot Legend, Share, Settings, Help.
- **Cursor Behavior**
  - Default: dot reticle in center.
  - Hover over navigation hotspot: reticle expands to circular ring showing distance and arrow pointing along surface normal.
  - Hover over info/media hotspot: reticle becomes info icon.
- **Hotspot Rendering**
  - Use billboard sprites anchored via yaw/pitch/distance.
  - Icons vary by type (navigation arrow, info “i”, play for media, external link icon).
  - Tooltip appears on hover/focus with localized text.
- **Transition Engine**
  - Teleport: fade to white 150ms, reposition camera to target entry orientation, fade back 150ms.
  - Walk: animate camera along interpolated spline using depth map; duration from manifest or default 900ms.
  - Fade: crossfade textures while blending orientation.
- **Measurement Tool**
  - Activates planar ruler overlay; click start/end points, display distance with unit conversion based on property default.
  - If no depth backbone, show banner “Measurements approximate – depth unavailable.”

## Analytics Hooks
- Fire `viewer_loaded` when manifest parsed.
- `hotspot_hovered`, `hotspot_clicked`, `transition_started`, `transition_completed`, `measurement_used`, `share_requested` events POSTed to analytics endpoint with session + device info.
- Use debounce for hover to avoid noise (≥250ms dwell).

## Responsive Behavior
- Desktop: full HUD, WASD keyboard navigation, mouse drag.
- Tablet: touch gestures, collapsible HUD to maximize viewport.
- Mobile: gyroscope option, simplified controls, low-LOD bias.
- Low bandwidth mode (auto-detect via NetworkInformation API): disable walk transitions, use teleport + preview tiles only.

## Offline & Failure Modes
- If manifest fetch fails, show retry overlay with error code.
- If scene asset fails to load, fall back to thumbnail and show error hotspot.
- Service worker caches last viewed scenes for offline revisit; notify user when offline.

## Accessibility
- Keyboard focus ring around hotspots; `Tab` cycles through visible hotspots, `Enter` activates.
- Screen reader announcements on scene change: “You are now in {scene_name}. {n} hotspots available.”
- Captions/transcripts for media hotspots (required for video/audio).

## Extensibility
- Plugin interface allows custom hotspot renderers via manifest `hotspots[].plugin` field.
- Measurement tool exposes API for advanced modules (e.g., area calculations) via event bus.

