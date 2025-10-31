# Guided Tour / Highlight Reel Creator UI Specification

## Inventory of Existing Video Capabilities
- **360° Video Export Pipeline**: Supports ProRes 8K masters, HEVC streaming, and H.264 social derivatives via `/pipelines/video360/v1/video_export_presets.json`. Provides preview player deployment and QA automation.
- **HD Photo Export Module**: Controlled by `render_settings.json`, delivers supersampled still imagery for marketing collateral.
- **Interactive Tour Playback**: `components/viewer/tour-player.tsx` renders node-to-node navigation with hotspot support and multimedia overlays.
- **Guided Reel Support**: *New module introduced here; previously missing linear, curated video exports derived from interactive tours.*

## Goals
Deliver a production-ready workflow for generating linear guided tour videos from existing 3D walkthrough content, with both automatic highlight reel and manually authored variants.

## User Roles
- **Marketing Manager**: Wants quick auto-generated highlight reels for campaigns.
- **Listing Agent / Creator**: Requires granular control over sequence, annotations, and voice-overs.
- **Operations / Post Team**: Monitors render queue, QA validation, and distribution readiness.

## Entry Point
Add a new CTA button labelled **"Create Guided Tour / Highlight Reel"** within the media exports hub and on the tour management dashboard.

## Workflow Overview
1. **Mode Selection**
   - Present two cards: *Auto Highlight Reel* and *Manual Guided Tour*.
   - Each card surfaces expected duration, recommended usage, and estimated render time.
   - Provide quick actions: "Generate 60s Reel" for auto, "Start Manual Authoring" for manual.

2. **Content Sourcing Contract**
   - Pull camera graph, navigation nodes, and scene assets from the core walkthrough pipeline (`space.manifest` with `nodes[]`, `edges[]`, textures, metadata).
   - For manual mode, surface a node selector list/tree filtered by tags (e.g., rooms, amenities).
   - Allow creators to **mark highlight points** with labels, descriptions, and thumbnails referencing `highlight_points[]` manifest entries.

3. **Auto Highlight Reel Mode**
   - Configuration panel shows detected hero rooms, occupancy scores, and recommended overlay pack.
   - User options: choose preset (`60s_reel_16x9_4K`, etc.), toggle branding overlay, pick music.
   - Display estimated render length (60-90 seconds) and GPU compute time.

4. **Manual Guided Tour Mode**
   - Timeline-style composer with draggable node clips.
   - For each clip: start camera pose, duration, ease curve, transition (pan, dolly, dissolve, hold).
   - Optional metadata: text annotations, callouts, voice-over segments (upload or record), background score from licensed library.
   - Validation: enforce pacing guardrails (min 3s per node, limit camera acceleration).

5. **Preview & QA**
   - Inline storyboard preview showing frames for each node.
   - Real-time analytics indicator summarizing expected view drop-off points.
   - Button **"Generate Video"** triggers backend job submission (`guided_tour_job_manifest.json`).

6. **Render Completion**
   - Display job status (queued → rendering → QA → ready).
   - Provide downloadable MP4, streaming preview, embed snippet, and social share links.
   - Offer **Auto-upload** toggles for YouTube/Vimeo with templated metadata.

7. **Branding & Call-to-Action**
   - Overlay editor accepts logo upload, property name, agent contact info, CTA button text/URL, optional end card message.
   - Preview safe-zone guides for mobile and vertical exports.

8. **Accessibility & Compliance**
   - Subtitle uploader (SRT/VTT) and auto-caption request toggle.
   - Clear messaging on music licensing and usage rights.

## UI Components
- `GuidedTourCreator` shell housing state machine for mode selection and job submission.
- `HighlightPointPicker` to browse `highlight_points[]` metadata.
- `TimelineComposer` for manual sequencing with drag-and-drop.
- `BrandingOverlayEditor` for logos, text, CTA, and end card configuration.
- `RenderStatusPanel` summarizing job queue state, QA checks, and delivery options.

## Analytics & Telemetry
Emit events via analytics SDK:
- `highlight_reel_created`
- `guided_tour_started`
- `guided_tour_completed`
- `downloaded_video`
- `shared_video`
- `auto_upload_triggered`

## Edge Cases & Guardrails
- Prevent render submissions exceeding preset max duration.
- Warn when highlight coverage omits kitchen/primary suite for residential listings.
- Enforce transitions with easing curves to avoid motion sickness.
- Provide fallback overlay when branding assets missing.

## Future Enhancements
- Multi-language voice-over templates with AI narration.
- Branching guided tours with chapter markers.
- Real-time collaboration with comment threads on the timeline.
