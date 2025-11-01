# Hotspot Navigation Deploy Summary

## Staging
- Deployment: `viewer@2024.06.02-hotspot-nav`
- URL: https://staging.viewer.example.com/property/property_demo_01
- Feature flags:
  - `HOTSPOT_NAV_ONLY=true`
- Verification steps:
  1. Load default scene and confirm hotspot overlay visible.
  2. Trigger navigation hotspot to ensure scene transition completes.
  3. Inspect console for missing asset fallbacks.
  4. Confirm analytics events forwarded to pipeline (`scene_loaded`, `hotspot_clicked`).

## Production rollout plan
1. Schedule maintenance window (15 minutes) to update CDN manifest.
2. Deploy viewer bundle to production environment.
3. Flip `HOTSPOT_NAV_ONLY=true` after smoke test.
4. Monitor analytics dashboards for regression for 2 hours.
5. Announce rollout completion in #launch-updates channel.

## Rollback procedure
1. Flip feature flag to `false` to re-enable legacy walkthrough.
2. Redeploy previous build tag `viewer@2024.05.10-walkthrough` if necessary.
3. Purge CDN caches for affected properties.
4. Notify stakeholders and attach incident report if rollback executed.

## Post-deploy follow-ups
- Backfill analytics dashboards with new hotspot metrics.
- Update customer-facing release notes summarizing hotspot navigation experience.
- Coordinate with support to refresh help center articles.
