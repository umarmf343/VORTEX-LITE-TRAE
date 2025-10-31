# Outdoor & Multi-Zone Resource Sizing

## Rendering & Processing Infrastructure
- **Geometry fusion nodes:** Minimum 32 vCPU / 128 GB RAM for multi-zone reconciliation jobs covering >3 zones; allocate 45 minutes per zone for photogrammetry fusion.
- **GPU baking tier:** RTX 6000 ADA (48 GB) recommended; baseline RTX A5000 (24 GB) acceptable for two-zone jobs but incurs 35% longer bake time.
- **Storage bursts:** Expect 2.4× increase in temporary storage (depth maps + drone imagery). Provision 750 GB ephemeral NVMe per job.

## Streaming & CDN
- **Mesh tiles:** Exterior zones generate ~180 MB of GLB data per zone at LOD0; enforce 4 MB chunking with HTTP/2 multiplexing.
- **Textures:** KTX2 texture atlases average 1.2 GB across campus sets; configure CDN tiered caching with 14-day TTL.
- **Campus map assets:** Vector tiles (ZL15) approx. 45 MB total; serve via edge functions with gzip+brotli.

## Telemetry & Analytics
- **Event volume:** Zone enter/exit doubles baseline analytics events. Plan for 2.1× ingestion throughput (~11k events/minute during peaks).
- **Retention:** Retain `fact_zone_transition` for 90 days hot storage; archive to cold warehouse after.

## Operational Considerations
- **Job concurrency:** Limit to 6 simultaneous outdoor campus jobs per region to avoid GPU contention.
- **Disaster recovery:** Snapshot manifest + campus map artefacts to object storage with 30-day lifecycle rules.
- **Cost guardrails:** Track GPU-hour consumption; alert at 75% of monthly outdoor allocation (default 1,200 GPU-hours).
