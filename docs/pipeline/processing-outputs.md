# Processing Outputs & Storage Map

| Artifact | Description | Storage Path | Retention |
| --- | --- | --- | --- |
| `mesh/level_{0-4}/tile_{x}_{y}.glb` | Progressive LOD mesh tiles | `s3://immersive-processed/<space_id>/mesh/` | 365 days |
| `textures/level_{0-4}/tile_{x}_{y}.ktx2` | Basis-compressed texture mip chain | `s3://immersive-processed/<space_id>/textures/` | 365 days |
| `nav/camera_nodes.json` | Camera poses, spline metadata | `s3://immersive-processed/<space_id>/nav/` | 365 days |
| `measurements/index.json` | Measurement layer graph, snapping metadata | `s3://immersive-processed/<space_id>/measurements/` | 365 days |
| `floorplan/vector.svg` | Vectorized floorplan with room IDs | `s3://immersive-processed/<space_id>/floorplan/` | 365 days |
| `dollhouse/model.glb` | Dollhouse overview mesh | `s3://immersive-processed/<space_id>/dollhouse/` | 365 days |
| `analytics/session.parquet` | Viewer analytics batches | `s3://immersive-analytics/<YYYY/MM/DD>/` | 730 days |
| `provenance/job.json` | Processing job metadata (timestamps, accuracy) | `s3://immersive-processed/<space_id>/provenance/` | 365 days |

## Estimated Pilot Capacity
- **Photogrammetry jobs/day:** 8 (average 250 images each)
- **LiDAR hybrid jobs/day:** 5 (average 6 GB raw point clouds)
- **GPU requirement:** 1× NVIDIA A10/A40 class worker (16 vCPU, 96 GB RAM) for pilot throughput
- **CPU preprocess nodes:** 2× 8 vCPU instances for LiDAR cleaning & QA heuristics
- **Monthly processed storage growth:** ~2.4 TB (assuming 350 MB processed footprint per space)

## Operational Notes
- Raw assets archived to cold storage (`s3://immersive-archive/`) after 30 days.
- CDN invalidation triggered when `viewer_manifest.json` is uploaded.
- Accuracy scores and calibration data are appended to `provenance/job.json` for QA dashboard consumption.
