# Embed & Sharing QA Matrix

## Device / Browser Coverage
| Device | Browser | Tests |
|--------|---------|-------|
| MacBook Pro (1440px) | Chrome latest | Share panel opens, token selector, copy link, copy iframe/JS, social buttons launch. |
| MacBook Pro (1440px) | Safari latest | Validate responsive iframe renders in demo page, fullscreen toggle works, copy feedback toasts render. |
| Windows 11 (1920px) | Edge latest | Share link copy/paste, social share pop-ups not blocked, analytics requests fire (verify in devtools). |
| iPad Pro (1024px) | Safari | Share panel responsive layout, min-height respected, PWA deep link hidden on unsupported devices. |
| Pixel 8 (360px) | Chrome | Share panel scroll behaviour, copy actions accessible, embed page loads via share link. |
| iPhone 15 | Safari | Share link opens in Safari, embed iframe responsive, "Open in app" deep link triggers event. |

## Functional Scenarios
| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| Copy share link | Open panel → Copy link. | Clipboard populated, toast shown, `share_link_generated` emitted (network inspector). |
| Switch tokens | Select alternate token, copy link. | URL reflects token, `utm_campaign=token-{id}` appended. |
| Disable embedding | Flip `embed_allowed` to false in manifest, refresh panel. | Embed section shows warning, copy buttons hidden. |
| Custom parameters | Toggle branding off + set chromeless on + change start node. | Snippets update parameters; embed URL includes `branding=0&chromeless=1&start={node}`. |
| Social share | Click Facebook share. | New window with correct share URL, analytics event `channel=social:facebook`. |
| Widget analytics | Place JS widget in test harness, load page. | `embed_loaded` event fires with `host` = harness domain. |
| ACL enforcement | Copy link with marketing token, paste in incognito. | Tour loads; after token expiry (manually adjust JSON) link returns 403/denied (manual simulation). |
| Mobile deep link | On mobile, tap "Open in app". | OS attempts to open app/PWA, analytics event `mobile_app_opened`. |

## Regression Checklist
- Share panel accessible via keyboard (Tab/Shift+Tab).
- Dialog close on ESC / outside click without losing clipboard state.
- Copy failure fallback: disable clipboard permission and confirm destructive toast.
- Embed page still loads when manifest missing share fields (fallback to defaults).
- Analytics module gracefully no-ops when `window` undefined (SSR).

## Data Validation
- Confirm `share_url`, `embed_allowed`, and `embed_snippet_template` present in generated manifest JSON (`public/cdn/spaces/*`).
- Verify `data/app-state.json` & `public/mock-data.json` include `sharing` config for each property.
- Ensure `docs/pipeline/viewer-manifest-schema.json` required fields extended and schema validation passes.

## Smoke Links
- Share URL sample: `https://tour.virtualtour.ai/view?space_id=prop-001&token=prop-001-public-token`
- Embed demo: `http://localhost:3000/embed/prop-001?token=prop-001-public-token`
