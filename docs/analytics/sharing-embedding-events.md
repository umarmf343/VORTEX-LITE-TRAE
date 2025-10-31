# Sharing & Embedding Analytics Events

All events are dispatched via `logShareEvent` to `/api/analytics/share`. Consumers can listen for the `share:analytics` CustomEvent on `window` for realtime updates.

## Event Catalogue
| Event | Trigger | Required Payload Fields | Optional Fields |
|-------|---------|-------------------------|-----------------|
| `share_link_generated` | Share link copied, social share button clicked, or PWA "Open in app" tapped. | `spaceId`, `channel` (`link`, `social:{platform}`, `pwa`), `token` | `parameters` (start, mode, branding, autoplay, etc.), `userAgent` |
| `embed_code_copied` | Copying iframe, CSS helper, or JS widget from Share panel. | `spaceId`, `embedType` (`iframe` \| `javascript`), `token` | `parameters` (mode, start, toggles), `channel` (`css` for helper), `userAgent` |
| `embed_loaded` | Embedded tour loads (captured inside `/embed/[propertyId]`). | `spaceId`, `embedType` (typically `iframe`) | `host` (document.referrer), `parameters` (query string snapshot), `token`, `userAgent` |
| `mobile_app_opened` | Viewer taps "Open in app" deep link. | `spaceId`, `channel` (`pwa`), `token` | `parameters` (start node, mode), `userAgent` |

## Payload Schema
```ts
interface ShareEventPayload {
  spaceId: string
  channel?: string
  embedType?: "iframe" | "javascript" | "pwa" | "link"
  parameters?: Record<string, unknown>
  host?: string | null
  token?: string | null
  userAgent?: string | null
  timestamp?: number // defaults to Date.now()
}
```

## Example Payloads
### Link Copy
```json
{
  "event": "share_link_generated",
  "spaceId": "prop-001",
  "channel": "link",
  "token": "prop-001-public-token",
  "parameters": {
    "mode": "walkthrough",
    "start": "scene-001-foyer",
    "branding": true
  },
  "timestamp": 1732208400000
}
```

### Embed Load
```json
{
  "event": "embed_loaded",
  "spaceId": "space_3BR_flat_01",
  "embedType": "iframe",
  "host": "https://partners.virtualtour.ai",
  "parameters": {
    "token": "space_3BR_flat_01-public-token",
    "mode": "walkthrough",
    "start": "cam_01"
  },
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)...",
  "timestamp": 1732208465123
}
```

## Dashboard Considerations
- Aggregate `host` + `spaceId` to produce top referral domains.
- Track conversion from `share_link_generated` (per-channel) to `embed_loaded` to quantify engagement.
- Flag unusual host domains or high `mobile_app_opened` counts for review.
- Retain raw parameters for auditing token misuse and verifying allowed modes.
