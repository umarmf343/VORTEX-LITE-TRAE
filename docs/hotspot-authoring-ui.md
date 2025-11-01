# Hotspot Authoring UI Spec

## Overview
The authoring dashboard enables admins to upload scenes, place hotspots, preview transitions, and publish manifests for the hotspot navigation runtime.

## Scene upload
1. Drag and drop equirectangular panoramas or select files.
2. Immediately generate a `preview_url` for rapid iteration. Background job promotes full `image_url` once processing completes.
3. Display upload progress and conversion status. Missing HDR/mesh assets raise non-blocking warnings.

## Canvas placement workflow
* Enter placement mode by clicking **Add Hotspot**.
* The panorama canvas captures click/tap events and converts them to yaw/pitch using spherical projection helpers.
* Hotspot markers appear instantly with default label `"New Hotspot"` and are selected for editing.

### Editing sidebar
| Control | Behaviour |
| --- | --- |
| Label | Free text, max 40 chars. Required. |
| Type | Dropdown: Navigation (default), Info, Media. |
| Target Scene | Dropdown populated from existing scenes when Type = Navigation. Required in that case. |
| Transition | Dropdown: Fade (default) or Teleport. |
| Visibility toggle | Hides hotspot without deleting it. |
| Metadata | Optional JSON editor for advanced use-cases. |

* Undo/redo stack supports placement, movement, and property edits.
* Hotspots are draggable on the canvas. Hold `Shift` to snap to 5° increments. Arrow keys nudge ±1° yaw/pitch when focused.
* Sidebar warns when the selected target scene is missing (`target_scene_id` not found) and disables publish.

## Preview interactions
* Clicking hotspots in the editor triggers an inline preview overlay.
* Navigation hotspots fade current scene to the `preview_url` of the target scene.
* Info/media hotspots open a side panel or lightbox with supplied content.
* Previews record analytics (`hotspot_previewed`) with admin context for QA.

## Publishing
1. Run manifest preflight: validates schema, ensures at least one scene, verifies hotspot links.
2. Show results in modal with pass/fail icons. Failures link to offending hotspot or scene.
3. On success, serialize manifest using schema defined in `docs/hotspot-navigation-manifest.md`.
4. Upload `manifest.json` to configured storage rooted at `asset_base_url`.
5. Trigger CDN cache purge where applicable.

## Keyboard shortcuts
* `Ctrl+Z` / `Cmd+Z`: Undo.
* `Ctrl+Shift+Z` / `Cmd+Shift+Z`: Redo.
* `H`: Toggle hotspot visibility overlays.
* `P`: Toggle preview mode.

## Accessibility
* All interactive controls must be reachable via keyboard.
* Hotspot buttons expose `aria-label="Hotspot: {label}. Press Enter to open."`
* Scene change announcements: use `aria-live="polite"` region to announce `"Now viewing: {scene name}. Hotspots available: {count}."`

## Error handling
* Network failures when saving hotspots show inline toast: `"Unable to save hotspot. Check your connection and try again."`
* Invalid yaw/pitch values highlight input fields and provide helper text.
* Asset uploads that fail to process show actionable retry button.

## Analytics
* Emit `hotspot_created`, `hotspot_updated`, `hotspot_deleted`, and `manifest_published` events with admin/user metadata.
* Aggregate metrics feed the admin dashboard charts described in `components/admin/advanced-analytics.tsx`.

## Rollback support
* Maintain publish history with manifest version and author.
* Allow selecting previous manifest snapshot and republishing if regression identified.
