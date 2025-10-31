# Outdoor & Multi-Zone Processing Specification

## Overview
This document enumerates the pipeline enhancements required to publish exterior environments and multi-zone campuses as a single unified tour. The changes span ingest contracts, processing topology, manifest generation, viewer behaviour, analytics, and QA.

## Capture & Ingest Contract
- **New capture inputs:** `capture_inputs` must enumerate tripod, drone, rover, or mobile mapping sources used per job.
- **Outdoor metadata:** `metadata.outdoor`, `sun_orientation`, `weather`, and `gps_track` provide the context required for lighting compensation and alignment.
- **Zone context:** `metadata.zone.zone_id` binds a capture batch to a campus zone. `parent_tour_id` links satellite captures back to a master tour.
- **Calibration artefacts:** `ground_control_points`, `measurement_tolerance_cm`, and `drone_flight_plan` are persisted for QA and audit trails.

## Processing Flow
1. **Pre-flight validation**
   - Verify GPS coverage, sun orientation data, and required zone metadata.
   - Reject ingest if `metadata.outdoor=true` but no GPS track or ground-control markers are supplied.
2. **Outdoor preprocess**
   - Normalise GPS track and align to ground-control points.
   - Estimate global irradiance and apply horizon-aware tonemapping before fusion.
3. **Zone-aware meshing**
   - Partition geometry by `zone_id` to generate `processed/<space>/zones/<zone>/mesh.glb` and `navigation_<zone>.json`.
   - Stitch adjacent zones using the declared `zone.connections` to form a single nav graph.
4. **Performance packaging**
   - Produce KTX2 textures capped at 8K for desktop and 4K for mobile.
   - Emit `performance_profile.json` with LOD triangle budgets and streaming chunk sizes.
5. **QA hooks**
   - Validate outdoor measurement tolerance against ground-control markers.
   - Trigger QA-09 (multi-zone navigation) and QA-10 (outdoor calibration) automated checks before publish.

## Manifest Generation
- Manifest version **v1.1.0** introduces:
  - `zones[]` with GPS bounds, capture metadata, and campus icons.
  - `zone_connections[]` describing WALK/PATH/TELEPORT transitions.
  - `campus_map` metadata referencing tile sets or hero images.
  - `performance` budget hints (`lod_target_triangle_budget`, `streaming_chunk_bytes`, etc.).
  - `outdoor_flag` signalling hybrid indoor/outdoor spaces for analytics.
- Navigation nodes include `zone_id`; cross-zone links set `zone_transition=true`.

## Viewer Behaviour
- Zone selector UI surfaces active zone, outdoor/interior badges, and campus map links.
- Zone changes spawn analytics events (`zone_enter`, `zone_exit`, `zone_transition`) with dwell metrics and outdoor indicators.
- Scene selection, hotspots, and guided tours synchronise zone state to maintain context when teleporting between buildings.
- Performance profile guides streaming (4 MB mesh chunks for exterior scenes, 350k triangle budgets).

## Analytics & Telemetry
- New events land in `fact_zone_transition` with from/to zone IDs, dwell time, and outdoor flag.
- Existing scene engagement payloads now include `zoneId` for downstream segmentation.
- Outdoor calibration metrics recorded during ingest stored alongside job telemetry for audit.

## Deliverables
- Updated schemas: `docs/pipeline/ingest-job-schema.json` + `docs/pipeline/viewer-manifest-schema.json` (v1.1.0).
- Processing spec (this document) checked into both `/docs` and `/public/docs` for alignment with operations teams.
- QA artefacts: matrix entries QA-09/QA-10, plus `docs/pipeline/outdoor-multi-zone-qa-results.md` summarising the latest test run.
- Resource sizing guidance captured in `docs/pipeline/outdoor-resource-sizing.md` for capacity planning.
