# Sample Embed Snippets — `space_3BR_flat_01`

## Responsive iframe
```html
<div class="virtualtour-embed" style="position:relative;width:100%;padding-top:56.25%;min-height:640px;">
  <iframe
    src="https://tour.virtualtour.ai/embed?space_id=space_3BR_flat_01&mode=walkthrough&token=space_3BR_flat_01-public-token&start=cam_01&branding=1&utm_source=docs&utm_medium=embed"
    title="3BR Flat virtual tour"
    loading="lazy"
    allow="fullscreen; xr-spatial-tracking"
    allowfullscreen
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;"
  ></iframe>
</div>
```

### Responsive wrapper CSS
```css
.virtualtour-embed {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  min-height: 640px;
}

.virtualtour-embed iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.25);
}
```

## JavaScript widget
```html
<div
  class="virtualtour-widget"
  data-space-id="space_3BR_flat_01"
  data-token="space_3BR_flat_01-public-token"
  data-mode="walkthrough"
  data-start-node="cam_01"
  data-branding="1"
  data-autoplay="0"
  data-floorplan="1"
  data-dollhouse="1"
  data-fullscreen="1"
  data-chromeless="0"
></div>
<script
  async
  src="https://tour.virtualtour.ai/embed/widget.js"
  data-space="space_3BR_flat_01"
  data-token="space_3BR_flat_01-public-token"
  data-track-host="true"
></script>
```

## Parameter Cheatsheet
| Parameter | Default | Description |
|-----------|---------|-------------|
| `mode` | `walkthrough` | Start mode (`walkthrough`, `floorplan`, `dollhouse`). |
| `start` / `data-start-node` | `cam_01` | Initial camera node ID. |
| `branding` | `1` | `1` shows platform chrome, `0` hides it. |
| `autoplay` | `0` | `1` auto-starts the guided walkthrough. |
| `floorplan` | `1` | `0` disables the floorplan toggle. |
| `dollhouse` | `1` | `0` hides the dollhouse toggle. |
| `fullscreen` | `1` | `0` removes the fullscreen button. |
| `chromeless` | `0` | `1` hides UI chrome for kiosk signage. |

> Tokens expire per manifest configuration; regenerate snippets if the access policy changes.
