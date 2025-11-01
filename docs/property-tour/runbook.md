# Post-Deployment Runbook

## Purpose
Guide on-call engineers through monitoring, incident response, and communication after property tour platform deployment.

## Monitoring Dashboards
- **Processing Pipeline Dashboard** (Grafana `processing/panorama`): queue depth, job duration, GPU utilization, failure counts.
- **Viewer Experience Dashboard** (Grafana `viewer/runtime`): error rate, average transition latency, LOD fallback counts.
- **Analytics Pipeline Dashboard**: ingestion rate, error % per event type, webhook latency.

## Routine Checks (Daily)
1. Confirm no scenes stuck in `PROCESSING` > 30 minutes.
2. Review navigation graph warnings (pending links) via admin alert panel.
3. Validate CDN cache hit ratio ≥ 90% for preview assets.
4. Ensure analytics events recorded for top 5 properties in past 24h.

## Incident Response
- **Processing Failure**
  - Alert triggers when job failures >5 in 10 min.
  - Actions: inspect `processing_logs.json`, retry job via admin CLI `./scripts/retry-processing --scene {scene_id}`.
  - If GPU capacity exhausted, file provisioning ticket referencing incident ID and required GPU hours.
- **Viewer Outage**
  - Alert when error rate >3% for 5 min.
  - Actions: check CDN status, fallback to previous manifest version using `manifest_v{n-1}.json` symlink; post status update in #incidents.
- **Analytics Ingestion Failure**
  - Alert when webhook latency >5s or error % >1%.
  - Actions: pause webhook retries, drain queue, coordinate with analytics team.

## Communication
- Use incident template to notify stakeholders (Product, Support, Director).
- After resolution, publish postmortem within 48h.

## Recovery Procedures
- **Rollback**: use deployment pipeline rollback command `./scripts/deploy --service viewer --rollback`.
- **Reprocess Scene**: trigger reprocessing from admin UI or CLI; ensure source assets intact.
- **Token Revocation**: run `/api/admin/properties/{id}/share-tokens/revoke` to disable compromised links.

## Documentation Links
- Admin user guide: `docs/property-tour/admin-ui-flows.md`
- Processing details: `docs/property-tour/processing-pipeline.md`
- Manifest schema: `docs/property-tour/manifest-spec.md`
- QA checklist: `docs/property-tour/qa-test-plan.md`

