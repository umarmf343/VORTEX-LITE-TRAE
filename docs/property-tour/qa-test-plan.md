# QA Test Plan & Checklist

## Scope
Covers admin workflows (property creation, scene upload, authoring, publish) and viewer experience (navigation, measurement, ACL). Blocking defects prevent launch.

## Test Environments
- **Staging Admin**: `https://admin.staging.example.com`
- **Staging Viewer**: `https://viewer.staging.example.com`
- **Storage/CDN**: staging bucket with signed URL support

## Pre-requisites
- Test account with admin privileges
- Sample panoramas (5 scenes) including depth for 2 scenes
- Analytics endpoint stub accepting POST requests

## Test Cases
### Admin UI
1. **Create Property**
   - Steps: Login → Create New Property → fill required fields → submit.
   - Expected: Property dashboard loads; DB record persisted with correct defaults.
   - Pass/Fail Criteria: property manifest draft created, API returns 201.
2. **Upload Scenes**
   - Upload 5 panoramas + depth for 2.
   - Validate progress indicators, checklist feedback, ability to replace files pre-processing.
   - Expected: Each scene transitions to READY within SLA (<15 min), warnings shown for missing depth.
3. **Author Hotspots**
   - Place 10 hotspots (5 navigation, 3 info, 2 media).
   - Verify snapping, inspector fields, reciprocal link prompts, autosave behavior.
   - Expected: Scene manifest updates, navigation graph reflects edges.
4. **Publish Tour**
   - Trigger publish, ensure validation catches pending issues.
   - Expected: Manifest uploaded to CDN, share link generated, publish log entry recorded.

### Backend Processing
5. **Processing Queue**
   - Confirm jobs created for each upload, workers consume without error.
   - Verify preview ready within 3s for at least one scene.
6. **Error Injection**
   - Upload intentionally corrupted file; ensure pipeline quarantines and surfaces error.

### Viewer Experience
7. **Initial Load**
   - Load manifest; verify spinner, default scene, hotspots visible.
   - Page interactive within 5s on 8Mbps connection.
8. **Hotspot Navigation**
   - Click each navigation hotspot; confirm arrival orientation matches manifest, analytics events fired.
9. **Measurement Tool**
   - Measure known distance on depth-enabled scene; compare to expected ±2cm.
   - On scene without depth, expect warning and fallback to approximate.
10. **Slow Network Simulation**
    - Throttle to 2Mbps via devtools; confirm viewer switches to teleport transitions and preview LOD.
11. **Access Control**
    - Attempt access without token on private property → expect access denied.
    - Use expired token → expect error page.
12. **Offline Mode**
    - Load scene, go offline, navigate back to cached scene → viewer informs offline but shows cached content.

### Regression
13. **Localization**
    - Switch language (e.g., Spanish) → UI strings localized, hotspots display translations.
14. **Accessibility**
    - Keyboard navigate hotspots using Tab/Enter, screen reader announces scene transitions.

## Reporting
- Record results in QA checklist spreadsheet with status (Pass/Fail/Blocked), tester, notes.
- Attach logs: processing pipeline output, manifest snapshot, analytics event captures.
- Critical bugs filed in Jira with reproduction steps and severity.

## Exit Criteria
- All P0/P1 issues resolved.
- ≥95% test cases pass.
- Publish manifest validated against JSON schema.
- Analytics event volume verified end-to-end.

