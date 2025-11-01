# Hotspot Navigation QA – Staging Report

| Test | Result | Notes |
| --- | --- | --- |
| Hotspots render with correct labels | ✅ | Verified in staging/property_demo_01. |
| Navigation hotspot transitions within 700ms | ✅ | Fade transition measured at ~420ms including preview swap. |
| Cursor ring follows pointer (desktop) | ✅ | 120ms fade-in, glow on hover confirmed. |
| Cursor ring follows touch (mobile emulation) | ⚠️ | Requires additional tuning for multi-touch gestures. |
| Admin add/edit/delete hotspot persistence | ✅ | Changes reflected in manifest diff. |
| Low bandwidth preview fallback | ✅ | Preview URL displayed when throttled to 2 Mbps. |
| Legacy walkthrough logs absent | ✅ | Viewer console free of `ImmersiveWalkthrough` references. |
| SSL/name mismatch errors | ✅ | None observed. |
| Memory budget adhered | ⚠️ | Observed spikes approaching limit during aggressive navigation; monitoring added. |
| Keyboard navigation + SR announcements | ✅ | Screen reader announced scene change and hotspot count. |

## Logs
```
2024-06-02T03:45:12Z hotspot_clicked hotspot_id=entry-to-kitchen from_scene=entry to_scene=kitchen
2024-06-02T03:45:13Z scene_loaded scene_id=kitchen load_time_ms=412
2024-06-02T03:46:05Z asset_fallback_used scene_id=lounge asset_type=image reason=high_latency
```

## Screenshots
Screenshots stored in QA evidence bucket `s3://qa-artifacts/hotspot-nav/2024-06-02/`.
