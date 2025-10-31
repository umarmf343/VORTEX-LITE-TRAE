# Processing Pipeline Blueprint

```text
Raw Capture Upload
        |
        v
 Ingest Orchestrator  --(validate & normalize)-->  Raw Asset Store (S3)
        |
        +--> Photogrammetry Worker Pool (GPU)
        |        |
        |        +--> Image Alignment → Sparse Cloud → Dense Cloud → Mesh
        |        +--> UV + Texture Baking → Mesh Decimation → LOD Generation
        |
        +--> LiDAR Worker Pool (CPU+GPU)
        |        |
        |        +--> Point Cloud Cleaning → Registration → Meshing/Downsample
        |
        +--> Fusion Service
                 |
                 +--> LiDAR Backbone + Photogrammetry Textures
                 +--> Generate Spatial Graph, Measurement Layer, Floorplan
                 +--> Output Progressive Assets (mesh, textures, nav graph)
```

## External Services & Infrastructure
- **Object Storage:** AWS S3 (or equivalent) buckets for `raw/`, `processed/`, `analytics/` partitions.
- **Processing Queues:** Managed message broker (Amazon SQS + SNS or Google Pub/Sub) using topics defined in the schema.
- **GPU Worker Cluster:** Kubernetes node pool with NVIDIA A40/A5000 class GPUs; auto-scale to meet 1 worker per 1,500 m²/day throughput.
- **CPU Worker Pool:** Handles LiDAR preprocessing, QA analytics, and archival tasks.
- **QA Dashboard Service:** Internal web app backed by PostgreSQL for annotations, overrides, and approval workflows.
- **CDN:** Global edge (CloudFront/Akamai) fronting processed asset tiles with signed URLs.
- **Auth & Access:** OAuth2 identity provider + token service for viewer and API access control.

## Operational Notes
- Write intermediate artifacts (sparse clouds, diagnostic renders) to short-lived storage tier with 30-day retention.
- Jobs failing QA automatically route to human review queue `topic.immersive.qa.events`.
- Fusion output includes navigation graph, measurement layer, and dollhouse projection for viewer consumption.

## Provisioning Request
- Allocate **pilot GPU worker pool**: 2× NVIDIA A40 (48 GB) nodes, 16 vCPU, 128 GB RAM each.
- Allocate **CPU preprocessing pool**: 3× 8 vCPU nodes with 64 GB RAM for LiDAR cleanup and QA jobs.
- Reserve **object storage** bucket `immersive-raw` (hot tier) and `immersive-archive` (cold tier) with lifecycle policy (90-day transition).
- Configure **message broker namespaces** listed in the schema and provision dead-letter queues for retries.
- Enable **observability stack** (Prometheus + Grafana) for worker metrics and queue depth alerting.

## Outdoor & Multi-Zone Extensions

- **Capture Contract Updates**
  - Ingest payloads now accept `capture_inputs`, `metadata.outdoor`, `metadata.zone`, `sun_orientation`, `weather`, `gps_track`, and `ground_control_points` to describe exterior datasets.
  - Drone flight metadata (`metadata.drone_flight_plan`) is persisted alongside ground-control tolerances for QA.
  - Zone identifiers must be stable across capture campaigns so campus manifests can reconcile multi-building tours.

- **Processing Flow**
  - New `outdoor-preprocess` step normalizes GPS track, builds global alignment, and feeds LiDAR+photo fusion with horizon-aware tone mapping.
  - Zone-aware meshing emits per-zone meshes (`processed/<space>/zones/<zone_id>/mesh.glb`) and writes `zone_manifest.json` summarizing connections.
  - Fusion service tags navigation nodes with `zone_id` and records cross-zone transitions for analytics.

- **Manifest & Viewer Output**
  - Viewer manifest version bumped to **v1.1.0** with `zones`, `zone_connections`, `campus_map`, `outdoor_flag`, and `performance` blocks.
  - Campus map tiles (256px PNG or vector) deployed under `cdn/spaces/<space>/maps/` and referenced by manifest.
  - Performance profile communicates LOD triangle budgets (350k for large outdoor scenes) and streaming chunk size (4 MB on exterior tours).

- **Analytics & QA**
  - Viewer emits `zone_enter`, `zone_exit`, and `zone_transition` events with dwell metrics and outdoor indicator for downstream analysis.
  - Automated QA `QA-09` & `QA-10` validate multi-zone navigation and outdoor calibration tolerances before publish.
  - Campus navigation data stored in analytics warehouse table `fact_zone_transition` with GPS bounds for BI overlays.

- **Resource Notes**
  - Outdoor photogrammetry jobs reserve +30% GPU memory headroom to accommodate higher triangle counts.
  - CDN edge cache rules pin campus map tiles with 14-day TTL and lower priority for interior-only models.
  - GPS-backed calibration artifacts archived in `processed/<space>/calibration/` with 1-year retention for audit.
