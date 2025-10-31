# Guided Tour Render Resource Estimates

| Duration | Preset | Resolution | GPU Render Time (Est.) | CPU Post Time | Output Size | Notes |
|----------|--------|------------|------------------------|---------------|-------------|-------|
| 60-90s | guided-60s-reel-4k | 3840x2160 | 7-9 GPU minutes on A40 | 3 min | 450-600 MB | Includes cinematic transitions and branding overlay |
| 120s | guided-120s-tour-1080p | 1920x1080 | 5-6 GPU minutes on A40 | 2 min | 220-260 MB | Optimized for web playback, 35 Mbps target bitrate |
| 30-45s | guided-30s-vertical-9x16 | 1080x1920 | 3-4 GPU minutes on L40S | 1.5 min | 140-180 MB | High frame rate (60 fps) for social platforms |
| 180-240s | guided-180s-tour-master | 3840x2160 | 15-18 GPU minutes on A40 | 6 min | 1.4-1.7 GB | ProRes master with PCM audio for archival |

## Compute & Storage Planning
- **GPU Allocation**: Schedule guided tour jobs on A40/L40S class GPUs; reserve 2 concurrent slots per region to meet SLA.
- **Queue Estimation**: Auto highlight reels typically complete within 15 minutes wall-clock including QA.
- **Storage Requirements**: Budget ~2 GB per space for retained masters + variants. Enable lifecycle policies after 180 days.
- **Logging**: Record `gpu_minutes`, `encoder_minutes`, and `output_size_bytes` per job for cost tracking.
- **Alerts**: Trigger warning if render exceeds estimated GPU time by 25% or if output bitrate deviates from preset by >10%.
- **Versioning & Backup**: Keep object storage buckets versioned and replicate masters to cold storage nightly for rollback safety.

## Delivery Targets
- Master exports delivered at 4K/30fps with bitrate ≥ preset requirement.
- Social derivatives capped at 24 Mbps for compliance with Instagram/TikTok ingest.
- Ensure all outputs include embedded color profile metadata and safe-title guides.
