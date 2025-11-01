# Frontend Hotspot Runtime Spec

## Initialization
1. Fetch `property_manifest.json` from configured storage using the provided URL. No hardcoded hostnames are permitted.
2. Resolve asset paths relative to `asset_base_url`.
3. Load default scene:
   * Use `scene.preview_url` to render low-res panorama immediately.
   * Begin background fetch for `scene.image_url` and swap once loaded.
   * Do **not** block on mesh or HDR assets; treat them as optional enhancements.

## Rendering pipeline
* WebGL renderer (Three.js) draws the panorama.
* Overlay layer renders hotspots and the cursor overlay.
* Hotspots remain visible regardless of occlusion (first pass requirement).
* Cursor overlay is a circular ring following pointer/touch input with the following states:
  * Idle: 30% opacity, 24px radius.
  * Hover hotspot: tint to branding primary color, scale to 1.1x, glow animation (120ms fade-in, 180ms pulse).
  * Touch input: ring anchors to last touch position until new interaction.

## Interaction flow
1. Pointer hover over hotspot triggers tooltip with `"Enter {target_scene}"` copy for navigation hotspots.
2. Clicking a navigation hotspot triggers transition:
   * Fire `hotspot_clicked` analytics with payload `{ hotspot_id, from_scene, to_scene }`.
   * Start 300ms fade-out on current panorama while preloading target `preview_url`.
   * Once preload resolves, set camera to target `initial_view` (or hotspot-provided override) and fade-in.
3. Info/media hotspots open modal or lightbox but do not trigger scene change.
4. Keyboard focus support:
   * Tab cycles through hotspots.
   * `Enter` activates focused hotspot.
5. Scene change announcement: update `aria-live` region with `"Now viewing: {scene name}. Hotspots available: {count}."`

## Preloading strategy
* Maintain LRU cache for scene textures.
* Preload only scenes referenced by visible navigation hotspots (one hop).
* Keep up to 2 hops resident; purge textures older than that to control memory usage.
* Use preview assets for initial load; upgrade to full-resolution once idle.

## Error handling
* If both `image_url` and `preview_url` fail: display overlay `"Preview unavailable. Try reloading or contact support."`
* When navigation hotspot references missing scene: show toast `"Target scene not available. Please try again later."`
* Log errors with context (scene ID, URL, HTTP status) to admin diagnostics endpoint.

## Analytics
* `scene_loaded` – payload `{ scene_id, load_time_ms }`.
* `hotspot_clicked` – payload `{ hotspot_id, from_scene, to_scene, transition }`.
* `cursor_hover_hotspot` – payload `{ hotspot_id, duration_ms }`.
* `asset_fallback_used` – payload `{ asset_type, scene_id, url, reason }`.

## Accessibility
* Hotspot buttons expose `aria-label` and `aria-describedby` referencing tooltip content.
* Cursor overlay is purely visual and marked `aria-hidden="true"`.
* Modal/lightbox content follows focus trapping guidelines.

## Feature flag
* Respect `HOTSPOT_NAV_ONLY` environment flag.
* When enabled, skip initialization of any legacy walkthrough modules and display hotspot navigation exclusively.

## Rollback
* Feature flag toggle re-enables legacy viewer if critical regression occurs.
* Maintain previous build artifacts for fast re-deploy.
