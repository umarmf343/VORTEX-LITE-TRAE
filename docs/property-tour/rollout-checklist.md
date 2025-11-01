# Rollout Checklist

## Pre-Deployment
- [ ] Confirm infrastructure capacity (GPU workers, storage bucket quotas, CDN bandwidth). If insufficient, file provisioning ticket with required resources and timelines.
- [ ] Merge processing pipeline, admin UI, authoring tools, and viewer updates into release branch.
- [ ] Run automated test suite (unit, integration, end-to-end) and ensure green.
- [ ] Validate manifests against JSON schema using staging data set.
- [ ] Prepare release notes covering new features, fixes, known limitations.

## Staging Deployment
- [ ] Deploy backend services (API, processing workers) to staging.
- [ ] Upload sample property with ≥5 scenes; ensure processing completes.
- [ ] Conduct authoring workflow smoke test (create property → author hotspots → publish).
- [ ] Deploy viewer build to staging CDN; confirm compatibility with manifests.
- [ ] Execute QA checklist (see `qa-test-plan.md`) and document results.
- [ ] Capture screenshots and screen recordings for project director review.

## Publish Preparation
- [ ] Review analytics dashboards for expected event flow from staging.
- [ ] Set up CDN cache invalidation scripts for manifests and tiles.
- [ ] Configure monitoring alerts (processing delays, viewer errors, analytics ingestion failures).
- [ ] Draft customer-facing documentation and support FAQs.

## Production Launch
- [ ] Schedule maintenance window (if needed) and notify stakeholders.
- [ ] Deploy backend and viewer updates to production environments.
- [ ] Invalidate CDN caches for manifests/assets; verify new versions active.
- [ ] Migrate staging property data or recreate in production as baseline test.
- [ ] Execute sanity checks: create property, upload scene, author hotspot, publish, view in production.

## Post-Launch
- [ ] Monitor error logs, analytics metrics, and system health for 48 hours.
- [ ] Collect QA artifacts (logs, manifests, screenshots) and send summary to project director.
- [ ] Open follow-up tasks for enhancements or discovered issues.
- [ ] Archive staging assets if not needed; ensure tokens revoked.

