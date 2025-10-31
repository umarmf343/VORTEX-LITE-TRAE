# Sharing & Embedding Inventory

## Current Capabilities
- **Canonical share URLs**: Every published space exposes `share_url` inside the viewer manifest and through the Share panel UI. Links include access-control tokens, `utm` tracking markers, and optional start node/view mode parameters.
- **Responsive iframe embeds**: The Share panel outputs a responsive `<iframe>` snippet with adjustable aspect ratio and minimum height plus an accompanying CSS helper. Embeds auto-include ACL tokens, display options (branding, floorplan, dollhouse, fullscreen, chromeless), and analytics query parameters.
- **JavaScript widget**: A script-based embed option is generated to support SPA/PWA hosts. Data attributes mirror iframe parameters and enable host detection for analytics.
- **Token management**: Property sharing config enumerates reusable tokens with expiry/max view constraints. Users can choose tokens before copying links/embeds.
- **Social sharing**: Panel provides one-click launchers for Facebook, X/Twitter, LinkedIn, and email. Share URLs respect Open Graph/Twitter metadata fields defined in property sharing config.
- **Access controls**: Manifest `embed_allowed` guards iframe/widget generation. Share panel suppresses embed snippets when embedding disabled. Links/embeds append owner-controlled tokens and expire based on manifest `access.expiry`.
- **Analytics instrumentation**: `logShareEvent` reports `share_link_generated`, `embed_code_copied`, `embed_loaded`, and `mobile_app_opened` events. Embed pages capture host referrer, parameters, and user agent.
- **Mobile & PWA support**: Share panel surfaces deep-link CTA when a property defines PWA/app metadata. Generated URLs function across desktop, tablet, and mobile browsers.
- **Documentation assets**: Embed guide, UI spec, analytics spec, and QA matrix accompany the feature set for implementation and support teams.

## Identified Gaps & Follow-ups
- **Token rotation tooling**: No UI/workflow yet for creating or expiring tokens; relies on JSON configuration.
- **Origin enforcement**: Tokens expose allowed origins metadata but runtime enforcement is not implemented client-side/server-side.
- **CMS-specific plugins**: While documentation covers CMS copy, dedicated plugins/widgets for WordPress/Wix/Squarespace remain future work.
- **Dynamic meta-tag management**: Platform should automate OG/Twitter card injection on share page routes; currently assumed by downstream infrastructure.
- **Embed analytics dashboard**: Raw events are logged but no UI aggregates host/referral metrics yet.
- **Localization**: Share panel copy is currently English-only and not integrated with i18n resources.
