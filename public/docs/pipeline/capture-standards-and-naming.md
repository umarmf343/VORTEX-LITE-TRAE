# Capture Standards & File Naming Convention

## Purpose
Codify capture expectations and enforce consistent metadata across ingestion jobs.

## Supported Capture Types
1. **Smartphone Photogrammetry** – high-resolution photo sweeps for texture fidelity.
2. **RGB-D / Phone LiDAR** – mobile depth capture to accelerate reconstruction.
3. **Professional LiDAR / 360°** – tripod-based survey for as-built accuracy.

## Minimum Field Checklist
Refer to the [Capture Guidance Checklists](./capture-guidance.md) inside the uploader modal. Field operators must:
- Perform per-room coverage scans matching the overlap targets.
- Record device metadata (model, firmware, capture app version).
- Tag each room with standardized labels (e.g., `kitchen_main`, `bedroom_02`).
- Capture calibration artifact (2 m reference) for QA verification on LiDAR jobs.

## File Naming Convention
`<propertyId>_<captureDateUTC:YYYYMMDD>_<roomLabel>_<sequence>_<modality>`

Examples:
- `prop-1254_20240618_kitchen_main_01_photogram`
- `prop-1254_20240618_livingroom_02_lidar`
- `prop-1254_20240618_exterior_front_03_panorama`

## Metadata Requirements
Every upload batch must include a JSON sidecar `capture_manifest.json` with:
- `propertyId`
- `captureDate`
- `captureTeam`
- `deviceModel`
- `firmwareVersion`
- `modality` (`photogrammetry` | `rgbd` | `lidar360` | `hybrid`)
- `rooms`: array of `{ roomLabel, files: string[], notes?: string }`
- `calibrationTargets`: array of measured references with true distance values.

## QA Intake Notes
- Reject uploads missing calibration data when tolerance target < 5 cm.
- Flag spaces with lighting issues for re-capture prior to processing.
- Archive raw inputs after 90 days; retain processed derivatives indefinitely unless GDPR erasure is requested.
