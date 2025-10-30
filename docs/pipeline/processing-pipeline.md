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
