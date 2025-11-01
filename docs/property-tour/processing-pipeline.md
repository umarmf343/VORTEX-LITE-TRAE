# Processing Pipeline Specification

## Overview
The processing pipeline transforms uploaded panorama and depth assets into optimized viewer-ready deliverables, persists metadata, and maintains job observability. It is orchestrated by a queue-backed worker service capable of horizontal scaling with GPU acceleration for HDR normalization and depth fusion.

## Pipeline Stages
1. **Ingest Validation**
   - Trigger: upload service emits `scene_upload_completed` event with `property_id`, `scene_id`, file manifest, and upload tokens.
   - Steps:
     - Verify storage objects exist at `s3://tour-assets/properties/{property_id}/scenes/{scene_id}/raw/`.
     - Check MIME type, file signatures, resolution, and EXIF integrity.
     - Generate checksum and persist to `metadata/upload_records`.
     - Failure handling: move file to `raw/quarantine/`, mark scene status `ERROR_VALIDATION`, notify admin with remediation tips.

2. **Thumbnail Generation**
   - Use GPU-accelerated renderer to project equirectangular source into 16:9 thumbnails at 512px and 1024px widths.
   - Save to `processed/preview/thumbnails/{size}.jpg` with perceptual quality factor 85.
   - Update scene manifest fragment with `preview_thumbnail_url`.

3. **Normalization & Correction**
   - Apply tone mapping for HDR, exposure equalization, seam correction, chromatic aberration fix.
   - Optional: run ghost removal if multiple exposures available.
   - Output stored as `processed/web/base.exr` prior to LOD slicing.

4. **LOD Generation**
   - Produce tiled multi-resolution pyramids using cubemap slicing.
   - Tiers: `preview` (~2k), `web` (~6k), `print` (~12k) resolution ceilings.
   - Store tiles under `processed/{lod}/tiles/face_{index}_level_{level}.jpg`.
   - Generate quick preview (single 2k JPG) in <3s to unlock authoring.

5. **Depth Fusion (optional)**
   - If depth or pointcloud uploaded:
     - Convert to unified coordinate system.
     - Run hole filling, mesh reconstruction, and unit scaling to metric.
     - Persist `processed/depth/pointcloud.ply` and `processed/depth/mesh.glb`.
     - Compute accuracy score (cm) and store in manifest.

6. **Scene Manifest Assembly**
   - Aggregate outputs into `metadata/scene_manifest.json`:
     ```json
     {
       "scene_id": "scn_123",
       "image_urls": {
         "preview": "https://cdn/.../preview/tiles/index.json",
         "web": "https://cdn/.../web/tiles/index.json",
         "print": "https://cdn/.../print/tiles/index.json"
       },
       "initial_view": {"yaw": 0, "pitch": 0, "fov": 75},
       "processing_status": "READY",
       "accuracy_estimate_cm": 2.4,
       "depth_available": true,
       "generated_at": "2024-04-22T10:15:00Z"
     }
     ```

7. **Notifications & Webhooks**
   - Emit `scene_processed` event with manifest URL.
   - Notify authoring UI via WebSocket channel to update status badge.

## Worker Requirements
- Containerized worker image with:
  - CUDA-enabled FFmpeg build
  - OpenCV, HDRMerge, custom seam-correction module
  - Node.js runtime for manifest templating
  - Access to Redis queue and Postgres metadata DB
- Horizontal autoscaling based on queue depth; GPU nodes flagged with taints for job scheduler.

## Error Handling & Retries
- Use exponential backoff with jitter for transient errors (network, temporary S3 failures).
- Max 5 attempts before marking job failed.
- Persistent errors produce remediation ticket including stack trace, property/scene identifiers, and file checksum.

## Observability
- Metrics: processing time per stage, queue wait time, GPU utilization, error counts by stage.
- Logs shipped to centralized stack with trace IDs linking to upload events.
- Dashboard panels highlight SLA breaches (preview >3s, total processing >15m).

## Storage Layout Summary
```
properties/
  {property_id}/
    scenes/
      {scene_id}/
        raw/
          panorama_original.jpg
          panorama_hdr.exr
          depth_cloud.las
        processed/
          preview/
            tiles/
            thumbnails/
          web/
            tiles/
          print/
            tiles/
          depth/
            pointcloud.ply
            mesh.glb
        metadata/
          scene_manifest.json
          processing_logs.json
```

