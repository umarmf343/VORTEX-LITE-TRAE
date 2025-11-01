# Hotspot Navigation Manifest Schema

This document defines the property manifest shape for the hotspot navigation system. The manifest is the single source of truth for authoring data surfaced in the viewer runtime and admin tooling.

## Top-level fields

| Field | Type | Description |
| --- | --- | --- |
| `version` | `string` | Semantic version identifying the manifest schema revision. |
| `published_at` | `string` (ISO-8601) | Timestamp applied when the manifest is published to CDN/storage. |
| `asset_base_url` | `string` | Root URL used to resolve all asset references. The viewer MUST resolve images, HDR files, and auxiliary assets relative to this base path. |
| `scenes` | `HotspotScene[]` | Ordered list of all scenes available to the viewer. |

## Scene object

```
interface HotspotScene {
  scene_id: string
  display_name: string
  image_url: string
  preview_url: string
  initial_view: {
    yaw: number
    pitch: number
    fov: number
  }
  hotspots: SceneHotspot[]
}
```

* `image_url` SHOULD point at the production-resolution panorama.
* `preview_url` MUST resolve to a lightweight asset used for fast initial rendering.
* `initial_view` controls the default yaw/pitch/fov for the viewer when a scene is loaded.
* `hotspots` is an authoritative list describing every hotspot exposed in the runtime.

## Hotspot object

```
interface SceneHotspot {
  hotspot_id: string
  position: { yaw: number; pitch: number } | { x: number; y: number; z?: number }
  label: string
  type: "navigation" | "info" | "media"
  target_scene_id?: string
  transition?: "fade" | "teleport"
  visible: boolean
  created_by: string
  created_at: string
}
```

* `position` MUST include yaw/pitch. If depth data is available the optional `{ x, y, z }` variant MAY be provided.
* `target_scene_id` is **required** when `type === "navigation"`.
* `transition` defaults to `"fade"` when omitted.
* `visible` toggles runtime visibility; hidden hotspots are still persisted for audit history.
* `created_at` is stored in ISO-8601 format.

## Deprecated fields

Any fields powering the previous continuous walkthrough are considered deprecated. The manifest generator MUST omit them during publish, or set them to `null` for archival use only.

Deprecated examples include (non-exhaustive):

- `immersive_walkthrough`
- `walk_nodes`
- `spline_paths`
- `navigation_graph`

Consumer code MUST ignore these keys.

## Validation checklist

1. All scene IDs referenced by navigation hotspots exist in the manifest.
2. Every hotspot has a unique `hotspot_id` scoped to its scene.
3. Preview assets resolve relative to `asset_base_url`.
4. `initial_view` contains yaw/pitch/fov values.
5. `visible` defaults to `true` when omitted.
6. Deprecated walkthrough fields are removed before publish.

## Example manifest

```
{
  "version": "2.0.0",
  "published_at": "2024-06-01T17:43:12.394Z",
  "asset_base_url": "https://cdn.example.com/properties/central-loft/",
  "scenes": [
    {
      "scene_id": "entry",
      "display_name": "Entry",
      "image_url": "panos/entry.webp",
      "preview_url": "panos/entry-preview.webp",
      "initial_view": { "yaw": 15, "pitch": -4, "fov": 75 },
      "hotspots": [
        {
          "hotspot_id": "entry-to-kitchen",
          "position": { "yaw": 34, "pitch": -6 },
          "label": "Enter Kitchen",
          "type": "navigation",
          "target_scene_id": "kitchen",
          "transition": "fade",
          "visible": true,
          "created_by": "editor@acme.com",
          "created_at": "2024-05-30T19:22:01.441Z"
        }
      ]
    }
  ]
}
```
