# Analytics Event Schema & Admin Dashboard Wireframe

## Event Schema
All events POSTed as JSON to `analytics.events_endpoint`. Common envelope fields:
- `event_name` (string)
- `occurred_at` (ISO8601)
- `property_id`
- `scene_id` (nullable)
- `hotspot_id` (nullable)
- `session_id`
- `viewer_id` (nullable; anonymized GUID)
- `device`: `{ "type": "desktop|tablet|mobile", "os": "iOS", "browser": "Chrome 122" }`
- `network`: `{ "downlink_mbps": 8.4, "effective_type": "4g" }`
- `context`: arbitrary map for feature-specific data

### Event Definitions
| Event | Trigger | Additional Fields |
|-------|---------|-------------------|
| `property_created` | Admin submits create property form | `owner_id`, `privacy`, `default_units` |
| `scene_uploaded` | Scene upload completes | `scene_id`, `files`: array of `{name, type, size_bytes}`, `has_depth` |
| `scene_processed` | Processing pipeline marks READY | `processing_time_ms`, `accuracy_estimate_cm`, `lod_generated` |
| `hotspot_created` | Hotspot saved from authoring UI | `hotspot_type`, `target_scene_id`, `permissions` |
| `hotspot_clicked` | Viewer click/tap on hotspot | `hotspot_type`, `transition_type` |
| `transition_started` | Navigation begins | `source_scene_id`, `target_scene_id`, `transition_type` |
| `transition_completed` | Navigation ends | `duration_ms`, `success` |
| `measurement_used` | Measurement tool completes measurement | `distance_m`, `has_depth` |
| `share_generated` | Publish flow creates share asset | `share_type` (`public_link`, `embed`, `social`) |
| `embed_loaded` | Embed viewer loaded | `referrer`, `embed_token_id` |

### Data Retention & Privacy
- Retain raw events 13 months for analytics; aggregate stats stored indefinitely.
- PII limited to admin accounts; viewer events anonymized.
- Provide opt-out flag `do_not_track` to skip analytics.

## Admin Dashboard Wireframe

```
┌────────────────────────────────────── Property Insights (prop_abc123) ──────────────────────────────────────┐
│ Summary Cards                                                                                               │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                                          │
│ │ Unique Viewers││ Avg Dwell    ││ Hotspot CTR  ││ Scenes Ready  │                                          │
│ │ 1,248 ▲12%   ││ 4m 12s ▼5%    ││ 38% ▲3pts     ││ 7/7           │                                          │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘                                          │
│                                                                                                              │
│ Engagement Timeline (Line chart: viewers, hotspot clicks, measurements)                                     │
│ ─────────────────────────────────────────────────────────────────────────────────────────────────────────── │
│                                                                                                              │
│ Hotspot Leaderboard (table)          Device Breakdown (donut chart)                                         │
│ ┌──────────────────────────────┐     ┌───────────────┐                                                       │
│ │ Hotspot           | Clicks  │     │ Desktop 52%   │                                                       │
│ │ Lobby → Lounge    | 542     │     │ Mobile 35%    │                                                       │
│ │ Rooftop Info      | 310     │     │ Tablet 13%    │                                                       │
│ │ Pool Media Tour   | 245     │     └───────────────┘                                                       │
│ └──────────────────────────────┘                                                                             │
│                                                                                                              │
│ Measurement Usage (histogram)                   Share Activity (list of generated links with status)        │
│                                                                                                              │
│ Export Controls: [Download CSV] [Schedule Email Report]                                                     │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Features
- Date range picker (today, 7d, 30d, custom) affecting all charts.
- Filters by scene, hotspot type, device category.
- Real-time panel showing current viewers (WebSocket feed).
- Alerts section summarizing anomalies (e.g., spike in access denied, slow transitions).

## Reporting Capabilities
- CSV exports for scenes, hotspots, engagement metrics.
- Scheduled email summaries to property owners (weekly/monthly).
- Drill-down: clicking hotspot row opens detail modal with hourly engagement chart, top devices, and average dwell before/after.

