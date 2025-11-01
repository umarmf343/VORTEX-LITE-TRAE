# Property & Scene Manifest Specification

## Versioning
- Manifest files live at `properties/{property_id}/manifest_v{n}.json` with symlink/alias `manifest.json` pointing to latest version.
- `version` field increments with each publish. `previous_version_url` allows diffing.

## Property Manifest Schema
```json
{
  "property_id": "prop_abc123",
  "version": 4,
  "owner": {
    "owner_id": "acct_789",
    "display_name": "Acme Hospitality",
    "primary_contact": {
      "name": "Jane Smith",
      "email": "jane@acme.com",
      "phone": "+1-415-555-0101"
    }
  },
  "metadata": {
    "title": "Acme Hotel Downtown",
    "address": "123 Market St, San Francisco, CA",
    "timezone": "America/Los_Angeles",
    "default_language": "en-US",
    "default_units": "metric",
    "tags": ["hotel", "hospitality"],
    "created_at": "2024-04-10T09:25:00Z",
    "updated_at": "2024-04-22T17:41:05Z"
  },
  "access_controls": {
    "privacy": "private",
    "embed_allowed": true,
    "share_tokens": [
      {
        "token_id": "tok_XYZ",
        "expires_at": "2024-05-10T00:00:00Z",
        "scope": "viewer"
      }
    ]
  },
  "analytics": {
    "events_endpoint": "https://analytics.example.com/collect",
    "session_id": "sess_f5b...",
    "feature_flags": {"measure_tool": true}
  },
  "default_scene_id": "scene_lobby",
  "scenes": [
    {
      "scene_id": "scene_lobby",
      "display_name": "Lobby",
      "scene_type": "interior",
      "floor_number": 1,
      "initial_view": {"yaw": 45, "pitch": -5, "fov": 80},
      "image_urls": {
        "preview": "https://cdn.../preview/index.json",
        "web": "https://cdn.../web/index.json",
        "print": "https://cdn.../print/index.json"
      },
      "ambient_audio_url": "https://cdn.../audio/lobby.mp3",
      "processing_status": "READY",
      "accuracy_estimate_cm": 2.5,
      "depth_available": true,
      "hotspot_ids": ["hs_nav_1", "hs_info_3"],
      "entry_orientation": {"yaw": 90, "pitch": 0}
    }
  ],
  "hotspots": [
    {
      "hotspot_id": "hs_nav_1",
      "scene_id": "scene_lobby",
      "position": {"yaw": 110, "pitch": -2, "distance_m": 3.4},
      "type": "navigation",
      "title": "Go to Lounge",
      "description": "Walk toward the lounge seating area.",
      "media_url": null,
      "target_scene_id": "scene_lounge",
      "transition_type": "walk",
      "transition_duration_ms": 900,
      "visibility_rules": {"roles": ["viewer"], "groups": []},
      "created_by": "acct_789",
      "created_at": "2024-04-11T10:15:00Z",
      "updated_at": "2024-04-18T14:52:10Z"
    },
    {
      "hotspot_id": "hs_info_3",
      "scene_id": "scene_lobby",
      "position": {"yaw": 30, "pitch": 5},
      "type": "info",
      "title": "Reception Hours",
      "description": "Front desk staffed 24/7.",
      "media_url": "https://cdn.../info/reception.png",
      "visibility_rules": {"roles": ["viewer"], "groups": ["vip"]},
      "created_by": "acct_789",
      "created_at": "2024-04-11T10:18:00Z"
    }
  ],
  "navigation_graph": {
    "nodes": [
      {
        "scene_id": "scene_lobby",
        "entry_orientation": {"yaw": 90, "pitch": 0}
      },
      {
        "scene_id": "scene_lounge",
        "entry_orientation": {"yaw": 180, "pitch": -3}
      }
    ],
    "edges": [
      {
        "hotspot_id": "hs_nav_1",
        "source_scene_id": "scene_lobby",
        "target_scene_id": "scene_lounge",
        "anchor_position": {"yaw": 110, "pitch": -2},
        "transition_type": "walk",
        "default_duration_ms": 900,
        "bidirectional": true
      }
    ]
  },
  "analytics_hooks": [
    {
      "event": "transition_completed",
      "webhook_url": "https://hooks.example.com/transition"
    }
  ],
  "sitemap": {
    "seo_title": "Acme Hotel Virtual Tour",
    "seo_description": "Explore the Acme Hotel through interactive 360° scenes.",
    "thumbnail_url": "https://cdn.../preview/lobby_thumb.jpg"
  }
}
```

## Scene Manifest Fragment
- Produced by processing pipeline and later merged into property manifest.
- Minimal schema:
```json
{
  "scene_id": "scene_lobby",
  "image_urls": {"preview": "...", "web": "...", "print": "..."},
  "initial_view": {"yaw": 45, "pitch": -5, "fov": 80},
  "processing_status": "READY",
  "accuracy_estimate_cm": 2.5,
  "depth_available": true,
  "generated_at": "2024-04-22T10:15:00Z"
}
```

## Hotspot Object
```json
{
  "hotspot_id": "hs_info_3",
  "scene_id": "scene_lobby",
  "position": {"yaw": 30, "pitch": 5, "radius": 1.8},
  "type": "info",
  "title": "Reception Hours",
  "description": "Front desk staffed 24/7.",
  "media_url": "https://cdn.../info/reception.png",
  "target_scene_id": null,
  "transition_type": null,
  "visibility_rules": {"roles": ["viewer"], "groups": ["vip"]},
  "created_by": "acct_789",
  "created_at": "2024-04-11T10:18:00Z",
  "updated_at": "2024-04-11T10:18:00Z"
}
```

## Access Control Notes
- Viewer must validate token before downloading manifest when `privacy = private`.
- `embed_allowed = false` forbids iFrame embedding; embed snippet should check flag before rendering.

## Analytics
- `analytics.events_endpoint` consumed by viewer; events posted with property, scene, and hotspot context.
- `analytics_hooks` are server-side webhooks triggered on publish, transitions, measurement usage.

