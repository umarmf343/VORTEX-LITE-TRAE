# Hotspot Navigation Manifest Schema

This document defines the structure of the panorama manifest consumed by the hotspot navigation system. The manifest represents the complete authoring state for the viewer runtime and admin tooling.

## Top-level fields

| Field | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier for the manifest, usually derived from the property ID. |
| `version` | `number` | Schema/content revision number. Increment when the manifest contract changes. |
| `title` | `string` | Human readable name displayed in admin interfaces. |
| `property` | `PanoramaManifestProperty` | Snapshot of the property metadata associated with the manifest. |
| `initialSceneId` | `string` | Scene that should load first when the viewer boots. |
| `createdAt` | `string` (ISO-8601) | Timestamp applied when the manifest was assembled. |
| `publishedAt` | `string` (ISO-8601) | Timestamp applied when the manifest was deployed to CDN/storage. |
| `scenes` | `PanoramaScene[]` | Ordered list of every authored panorama scene. |
| `hotspots` | `PanoramaManifestHotspot[]` | Flattened array of hotspots with their owning `sceneId`. |
| `navigationGraph` | `Record<string, PanoramaSceneHotspot[]>` | Convenience lookup keyed by `sceneId`. |
| `accuracyScores` | `Record<string, string>` | Optional QA metadata for analytics. |
| `accessControls` | `{ privacy: PropertyPrivacy; tokens?: string[] }` | Controls used by sharing/embed flows. |
| `analyticsHooks` | `{ events: string[] }` | Declares which analytics events the viewer should emit. |

## Scene object

```
interface PanoramaScene {
  id: string
  name: string
  imageUrl: string
  thumbnailUrl?: string
  sceneType: "interior" | "exterior"
  description?: string
  tags?: string[]
  initialView: { yaw: number; pitch: number; fov: number }
  hotspots: PanoramaSceneHotspot[]
  createdAt: string
  updatedAt: string
  assets: {
    raw: string
    preview: string
    web: string
    print: string
  }
  processing: {
    status: "PENDING" | "PROCESSING" | "READY" | "FAILED"
    startedAt: string
    completedAt?: string
    accuracyEstimate?: "low" | "medium" | "high"
    warnings?: string[]
    errors?: string[]
    depthEnabled?: boolean
  }
  measurement: { enabled: boolean; accuracyCm?: number }
}
```

* `imageUrl` and `thumbnailUrl` SHOULD be absolute URLs the viewer can load directly.
* `assets` is provided for downstream compatibility. For simple deployments the same equirectangular asset may satisfy all entries.
* `processing` reflects ingestion/QC state in the admin surface.
* `measurement` toggles measurement overlays within the viewer.

## Hotspot object

```
interface PanoramaSceneHotspot {
  id: string
  targetSceneId: string
  yaw: number
  pitch: number
  label: string
  autoAlignmentYaw?: number
  autoAlignmentPitch?: number
}
```

* All hotspots currently behave as navigation points. Future revisions may introduce additional hotspot types.
* `autoAlignmentYaw` and `autoAlignmentPitch` allow the viewer to smooth camera orientation during transitions.

## Deprecated fields

Any fields powering the retired continuous walkthrough are considered deprecated. The manifest generator MUST omit them during publish, or set them to `null` for archival use only.

Deprecated examples include (non-exhaustive):

- `immersive_walkthrough`
- `walk_nodes`
- `spline_paths`

Consumer code MUST ignore these keys.

## Validation checklist

1. All scene IDs referenced by `navigationGraph` exist in `scenes`.
2. Every hotspot ID is unique within its parent scene.
3. Every scene exposes yaw/pitch/fov values in `initialView`.
4. All timestamps use ISO-8601 formatting.
5. Deprecated walkthrough fields are removed before publish.

## Example manifest

```
{
  "id": "prop-001-panorama",
  "version": 2,
  "title": "Luxury Downtown Penthouse",
  "initialSceneId": "entrance",
  "createdAt": "2024-01-15T00:00:00.000Z",
  "publishedAt": "2024-10-20T00:00:00.000Z",
  "property": {
    "id": "prop-001",
    "title": "Luxury Downtown Penthouse",
    "address": "123 Park Avenue, New York, NY 10022",
    "ownerId": "owner-default",
    "ownerName": "Portfolio Admin",
    "ownerEmail": "info@baladshelter.com",
    "privacy": "private",
    "defaultLanguage": "en",
    "defaultUnits": "imperial",
    "timezone": "America/Los_Angeles",
    "tags": ["luxury", "penthouse"],
    "primaryContact": {
      "name": "BaladShelter",
      "email": "info@baladshelter.com"
    },
    "createdAt": "2024-01-15T00:00:00.000Z",
    "updatedAt": "2024-10-20T00:00:00.000Z"
  },
  "scenes": [
    {
      "id": "entrance",
      "name": "Entrance",
      "imageUrl": "/panorama-samples/entrance.jpg",
      "thumbnailUrl": "/panorama-samples/entrance.jpg",
      "sceneType": "interior",
      "initialView": { "yaw": 15, "pitch": -2, "fov": 85 },
      "hotspots": [
        { "id": "to-living", "targetSceneId": "living-room", "yaw": 20, "pitch": -2, "label": "Enter Living Room" }
      ],
      "createdAt": "2024-01-15T00:00:00.000Z",
      "updatedAt": "2024-10-20T00:00:00.000Z",
      "assets": {
        "raw": "/panorama-samples/entrance.jpg",
        "preview": "/panorama-samples/entrance.jpg",
        "web": "/panorama-samples/entrance.jpg",
        "print": "/panorama-samples/entrance.jpg"
      },
      "processing": {
        "status": "READY",
        "startedAt": "2024-01-15T00:00:00.000Z",
        "completedAt": "2024-10-20T00:00:00.000Z",
        "accuracyEstimate": "medium",
        "warnings": [],
        "errors": [],
        "depthEnabled": false
      },
      "measurement": { "enabled": false }
    }
  ],
  "hotspots": [
    {
      "id": "to-living",
      "sceneId": "entrance",
      "targetSceneId": "living-room",
      "yaw": 20,
      "pitch": -2,
      "label": "Enter Living Room"
    }
  ],
  "navigationGraph": {
    "entrance": [
      { "id": "to-living", "targetSceneId": "living-room", "yaw": 20, "pitch": -2, "label": "Enter Living Room" }
    ]
  },
  "accuracyScores": { "entrance": "medium" },
  "accessControls": { "privacy": "private", "tokens": ["public"] },
  "analyticsHooks": { "events": ["scene_enter", "hotspot_click", "tour_complete"] }
}
```
