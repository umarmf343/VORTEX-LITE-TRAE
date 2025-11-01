# Walkthrough Removal & Hotspot Navigation Migration

## Feature flag rollout
- [x] Introduce `HOTSPOT_NAV_ONLY` flag (staging default `true`).
- [ ] Roll flag to production after QA sign-off.
- [ ] Maintain ability to toggle legacy runtime for rollback.

## Code removals
- [ ] Delete `lib/immersive-walkthrough/engine.ts` and associated helpers.
- [ ] Remove `components/viewer/immersive-walkthrough.tsx` usage.
- [ ] Drop references to `ImmersiveWalkthroughSpace` types.
- [ ] Remove spline/pathfinding imports and bundles.

## Manifest updates
- [x] Document hotspot-centric schema (`docs/hotspot-navigation-manifest.md`).
- [ ] Update manifest generator to emit new shape.
- [ ] Strip deprecated walkthrough fields during publish.

## Analytics
- [ ] Replace `walk_*` events with `hotspot_*` + `scene_loaded` set.
- [ ] Update admin dashboards to use new metrics.

## QA checkpoints
- [ ] Run `qa_hotspot_suite` against staging property `property_demo_01`.
- [ ] Verify hotspot accessibility (keyboard + screen reader).
- [ ] Validate fallback messaging for missing assets.

## Deployment
- [ ] Deploy viewer to staging with flag enabled.
- [ ] Share staging URL and smoke test notes with stakeholders.
- [ ] Push to production once sign-off received.

## Rollback
- [ ] Retain previous release tag.
- [ ] Document rollback procedure in `docs/deploy/hotspot-deploy-summary.md`.
