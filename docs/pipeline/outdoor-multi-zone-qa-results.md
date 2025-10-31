# Outdoor & Multi-Zone QA Results

## Summary
- **Property under test:** "Harborview Innovation Campus" (Building A interior, Outdoor Commons, Building B lab wing).
- **Capture bundle:** Tripod LiDAR interior sweeps, drone photogrammetry for exteriors, rover ground capture for pathways.
- **Manifest version:** v1.1.0
- **Build reference:** viewer `commit 5e2f9f4`, ingest pipeline `build 2025.04.18-ops`.

## Test Execution Log
| Test ID | Area | Description | Result | Notes |
| --- | --- | --- | --- | --- |
| QA-01 | Ingest | Ingest schema accepts outdoor payload with zones and GPS tracks | ✅ Pass | `zone_id` and `gps_track` validated; warning logged for partial weather report. |
| QA-05 | Processing | Outdoor preprocessing aligns drone + tripod point clouds | ✅ Pass | Residual error 2.8 cm vs tolerance 5 cm. |
| QA-07 | Performance | Streaming budgets under mobile constraints | ⚠️ Pass w/ Note | First outdoor load 4.6 s on 5 Mbps LTE; within target but close. |
| QA-09 | Navigation | Multi-zone linking and transitions | ✅ Pass | Teleports between Building A ↔ Commons ↔ Building B consistent; dwell analytics recorded. |
| QA-10 | Calibration | Outdoor measurement tolerance | ✅ Pass | 10 m reference distance measured 10.07 m (±7 cm). |
| QA-12 | Viewer UX | Zone selector + campus map surfacing | ✅ Pass | Responsive layout confirmed at 360px, 768px, 1280px. |
| QA-14 | Analytics | Zone enter/exit event dispatch | ✅ Pass | Events recorded in Snowplow staging with correct zone IDs. |
| PERF-02 | Resource | GPU/CPU utilisation during bake | ⚠️ Observation | Peak GPU memory 12.1 GB (RTX 6000 ADA); recommend 16 GB floor for production. |

## Known Issues
- Sun flare on drone capture caused minor bloom artifact on Building B roofline; mitigated by HDR tone mapping but flagged for capture SOP update.
- Outdoor heatmap tiles slightly offset (5 px) on campus map overlay; viewer ticket #UI-438 opened.

## Attachments
- `logs/qa/harborview-ingest.json`
- `reports/qa/harborview-zone-telemetry.csv`
- `screenshots/qa/harborview-campus-map.png`
