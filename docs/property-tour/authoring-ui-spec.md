# Authoring UI Specification

## Goals
Provide a responsive, accessible 360° editing environment where admins can configure hotspots, link scenes, and preview navigation before publishing.

## Layout
- **Header**: scene selector dropdown, processing status chip, publish shortcut, autosave indicator.
- **Left Toolbar** (vertical): Select, Add Hotspot, Move Hotspot, Link Scene, Set Entry Orientation, Measurement Anchor, Preview Transition, Undo, Redo.
- **Center Canvas**: WebGL-powered panorama viewer with overlays for hotspots, navigation graph lines (toggleable), and pointcloud gizmos when available.
- **Right Panel**: context-sensitive inspector with tabs: *Hotspot*, *Scene*, *History*.
- **Bottom Bar**: timeline of recent actions with undo/redo history, plus notification toasts.

## Interaction Patterns
### Canvas Controls
- Click-drag or touch-drag to orbit camera; scroll/pinch to zoom (clamped FOV 45°–110°).
- Holding `Shift` temporarily activates hotspot multi-select mode.
- Grid overlay toggled with `G` for precise alignment.

### Hotspot Lifecycle
1. **Create**: Choose *Add Hotspot*, click canvas to drop anchor. Snaps to depth mesh when available; fallback is raycast to panorama sphere with adjustable distance slider.
2. **Configure**: Inspector form fields
   - Type (info, navigation, media, external)
   - Title, Description (markdown supported with preview)
   - Target Scene (only for navigation; includes search + “Create pending scene” option)
   - Media uploader (images ≤20MB, video ≤200MB, auto transcode)
   - Transition type (teleport/walk/fade) + duration slider
   - Tooltip text (localized string entries)
   - Permissions (role chips, group multi-select)
3. **Position Tuning**
   - Drag anchor on canvas (updates yaw/pitch/distance live)
   - Numeric input under inspector for yaw/pitch/distance with up/down arrow increments
   - Snap modes: surface normal, floor plane, ceiling plane
4. **State Indicators**
   - Draft hotspots show dashed outline
   - Pending targets display warning icon with tooltip “Target scene not ready”
   - Inactive hotspots (permissions limited) appear semi-transparent
5. **Deletion**
   - Delete button triggers confirmation modal; supports batch deletion via multi-select.

### Scene Configuration
- Scene tab shows initial view controls with 3D gizmo; admin can set yaw/pitch/fov.
- Entry orientation preview ensures navigation transitions align.
- Ambient audio upload with autoplay toggle and volume preview.

### Undo/Redo & Autosave
- Actions persisted via autosave every 5s or on change, hitting `/api/admin/scenes/{scene_id}/authoring-state`.
- Undo stack limited to 50 actions; redo stack clears on new action.
- Autosave indicator shows “All changes saved” or “Saving…” status with ARIA live updates.

## Navigation Graph Visualization
- Optional overlay toggled from toolbar reveals directed edges between hotspots and target scenes.
- Hovering an edge highlights source and target hotspots, showing travel time and transition type.
- Graph summary widget lists unpaired links and unreachable scenes.

## Accessibility & Internationalization
- All controls reachable via keyboard; shortcuts listed in help modal (`?`).
- Inspector forms use accessible labels and descriptions; hotspots enumerated for screen readers with coordinates and type.
- Localization: all static strings sourced from i18n files; inspector allows adding translations per field where applicable.

## Performance Considerations
- Canvas loads preview LOD by default; high-res fetch triggered when user zooms beyond threshold.
- Use requestAnimationFrame loops capped at 60fps, dropping to 30fps on low-power mode.
- Idle scenes suspended when switching to different property or closing authoring mode.

## Error Handling
- Failed autosave prompts toast with retry action.
- Conflicting edits (two admins) resolved via optimistic concurrency: server returns 409 with latest version; UI prompts to merge or overwrite.
- Missing depth data disables measurement anchor tool with explanatory tooltip.

