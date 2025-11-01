# Admin UI Flows

## 1. Create Property

```
┌─────────────────────────────── Create New Property ───────────────────────────────┐
│ Title: [__________________________]                                               │
│ Address: [Street           ] [City        ] [State] [ZIP]                         │
│ Timezone: [⌄ America/Los_Angeles ]              Primary Contact: [Jane Smith  ]   │
│ Owner Account: [Acme Hospitality  ⌄]          Privacy: (● Public) (○ Private)     │
│ Default Language: [English (US) ⌄]            Default Units: (● Metric)(○ Imperial)│
│ Tags: [residential] [hotel] [ + Add Tag ]                                         │
│                                                                                   │
│                (Cancel)                                    (Create Property)      │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-step UX
1. Admin opens **Properties** dashboard and clicks **Create New Property**.
2. Modal wizard presents required fields: Title, Address (structured street/city/state/zip), Timezone (searchable list), Primary Contact (name, email, phone), Owner Account (autocomplete), Privacy (Public/Private toggle), Default Language (dropdown), Default Units (metric/imperial radio), Tags (tokenized input).
3. Validation runs on blur; missing required fields show inline error with icon.
4. Submit button enabled once required fields valid; clicking **Create Property** calls `/api/admin/properties`.
5. UI shows loading state with spinner and disables form.
6. On success, toast “Property created” appears with link **Go to Property Dashboard**. Backend returns `property_id`, `owner_id`, `address`, `privacy`, `created_at`, `default_units` for persistence. UI routes to `/admin/properties/{property_id}`.

**Empty state copy:** “You have no properties yet. Create one to start building virtual tours.”

## 2. Upload Scenes

```
┌────────────── Scenes ──────────────┐  ┌──────────── Scene Details ────────────┐
│ Living Room      READY             │  │ Scene Name: [Living Room        ]     │
│ Kitchen          PROCESSING ▸▸▹    │  │ Scene Type: (● Interior) (○ Exterior) │
│ Balcony          UPLOADING 45%     │  │ Floor Number: [ 12 ]                  │
│ + Add Scene                         │  │ Orientation Hint: [Faces courtyard ]  │
└────────────────────────────────────┘  │ Description: [Open plan lounge ...]   │
                                        │                                        │
                                        │ ┌──── Drag & drop panorama files ────┐ │
                                        │ │  livingroom_8k.jpg   100% ✔ READY  │ │
                                        │ │  livingroom_depth.exr MISSING ⚠    │ │
                                        │ └────────────────────────────────────┘ │
                                        │ Checklist: ✔ Exposure   ✔ Coverage    │
                                        │           ✖ Depth uploaded (optional) │
                                        │ (Save Scene)           (Replace File) │
                                        └────────────────────────────────────────┘
```

### Step-by-step UX
1. Inside Property Dashboard, admin clicks **Add Scene**.
2. Right-hand drawer opens with fields: Scene Name, Scene Type (interior/exterior), Floor Number, Description, Orientation Hint. Fields have contextual tooltips.
3. Drag-and-drop upload zone accepts panorama JPG/PNG/HDR and optional depth/pointcloud files. File picker filters by supported types.
4. Live validation panel shows resolution (target ≥ 8000×4000), file size, format, and quality checklist (exposure, blur, coverage). Missing depth triggers warning banner.
5. Upon file drop, client streams to `/api/admin/properties/{property_id}/scenes/{scene_id}/upload` using multipart chunk uploads. Progress bars show percent complete, speed, ETA.
6. Successful uploads display thumbnails and “Processing queued” badge; admin can replace or remove file prior to processing start.
7. Each scene row in list shows status: Uploading → Validating → Processing → Ready. Tooltip reveals processing job ID.

## 3. Author Hotspots

```
┌─────────────── Toolbar ───────────────┐   ┌──────────── 360 Viewer ─────────────┐   ┌───── Hotspot Properties ─────┐
│ ◉ Select  ● Add  ↔ Move  🔗 Link      │   │  [360 panorama with hotspot pins]   │   │ Type: (● Navigation)         │
│ ⟳ Undo   ⟲ Redo  🧭 Entry  ▶ Preview  │   │  Cursor: +                          │   │ Title: [Hallway Door]        │
└───────────────────────────────────────┘   │  Pending hotspot marker ▣           │   │ Description: [Leads to hall] │
                                             │                                    │   │ Target Scene: [Hallway 3F ⌄] │
                                             │                                    │   │ Transition: (Teleport)       │
                                             │                                    │   │ Tooltip: [Go to hallway]     │
                                             │                                    │   │ Permissions: [All Viewers]   │
                                             │                                    │   │ (Save)   (Delete)            │
                                             └────────────────────────────────────┘   └───────────────────────────────┘
```

### Step-by-step UX
1. When processing status = READY, admin presses **Enter Authoring Mode**.
2. Scene preview loads (low LOD) in center viewport with spherical navigation controls.
3. Left toolbar includes: Select, Add Hotspot, Move, Link Scene, Set Entry Orientation, Preview Transition, Undo, Redo.
4. Admin clicks **Add Hotspot**, then clicks location in panorama. Temporary marker appears aligned to surface normal (using depth if present).
5. Right panel displays hotspot form: Type (Info/Navigation/Media/External), Title, Description, Media Upload, Target Scene (dropdown with search or “Create Pending Scene”), Transition Type (Teleport/Walk/Fade), Tooltip text, Permissions (role chips).
6. Saving hotspot writes to `/api/admin/scenes/{scene_id}/hotspots` with autosave indicator. Draft state stored locally every 5 seconds.
7. Navigation hotspots prompt to create reciprocal link if missing. Graph preview updates instantly.

## 4. Publish Tour

```
┌──────────────────── Publish Tour ────────────────────┐
│ Status Checklist                                     │
│  ✔ All scenes processed (7/7 READY)                  │
│  ✔ Navigation graph connected                        │
│  ⚠ 2 pending reciprocal links (optional)             │
│  ✔ ACL configured (Private with token)               │
│                                                      │
│ Publish Mode: (● Production) (○ Draft)               │
│ Release Notes: [Spring showcase launch...]           │
│                                                      │
│ Progress: Validating ▸ Generating ▹ Uploading ▹ Done  │
│                                                      │
│ Share URL: https://cdn.example.com/p/ab12/manifest   │
│ Embed Code: <iframe src="…">                         │
│                                                      │
│ (Cancel)                                       (Publish)
└───────────────────────────────────────────────────────┘
```

### Step-by-step UX
1. Admin clicks **Publish Tour** from property header.
2. Publish modal summarizes readiness checklist: All scenes ready, Navigation graph connected, Pending links resolved, ACL configured.
3. Admin chooses publish mode (Production/Draft) and optionally enters release notes.
4. Clicking **Publish** triggers manifest generation job. Progress indicator steps: Validating → Generating Manifests → Uploading to CDN → Creating Share Assets.
5. On success, modal shows share URL, embed code, and “View in Viewer” button. `manifest_v{n}.json` URL displayed with copy button.
6. Notifications panel logs publish event with timestamp for auditing.

### Accessibility Notes
* All forms keyboard navigable.
* Buttons have ARIA labels and status updates announced via live region.
* Color contrast meets WCAG AA.

