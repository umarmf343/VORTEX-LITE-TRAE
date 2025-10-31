# Guided Tour / Highlight Reel Activation Report

**Space:** space_3BR_flat_01  
**Auto Highlight Reel:** `/pipelines/guided_tour/v1/guided_tour_job_manifest.json`  
**Manual Template:** `/pipelines/guided_tour/v1/guided_tour_manual_job_template.json`

## Generated Assets
- Marketing Reel (4K): `https://cdn.virtualtour.ai/videos/space_3BR_flat_01/highlight_reel_4k.mp4`
- Social Vertical (9x16): `https://cdn.virtualtour.ai/videos/space_3BR_flat_01/highlight_social_9x16.mp4`
- Streaming Preview: `https://staging.virtualtour.ai/preview/guided-tour/space_3BR_flat_01`

## QA Summary
- Duration Check: **PASS** (74.2s vs target 75s)
- Transition Smoothness: **PASS** (max acceleration 1.1 ≤ 1.5)
- Aspect Ratio Validation: **PASS** (9:16 vertical variant)
- Branding Overlay Safe-Zone: **PASS** (8% margin)

## Distribution Readiness
- Downloadable MP4, streaming preview, and social share links registered under `video_assets[]` manifest extension.
- Auto-upload toggles prepared for YouTube and Vimeo with default metadata.

## Next Actions
1. Monitor analytics events (`highlight_reel_created`, `guided_tour_started`, `guided_tour_completed`).
2. Share marketing reel via CRM email workflows using 60s preset.
3. Encourage agents to author manual guided tours leveraging the new creator UI for longer narratives.
