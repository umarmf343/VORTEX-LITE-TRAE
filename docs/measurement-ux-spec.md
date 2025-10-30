# Measurement UX Specification

Below is the complete Measurement UX spec for the viewer's Measurement Mode UI. Implement the following copy, layouts, and behaviors exactly as described.

## 1. Entry Points & Primary Controls
- **Toolbar icon:** Ruler (`aria-label: "Measure"`).
- **Primary dropdown options:** Point, Polyline, Area, Height, Auto-room, Calibrate (listed left-to-right by priority).
- **Keyboard shortcuts:**
  - `M` — Toggle Measure tool (opens last-used submode).
  - `P` — Point mode.
  - `L` — Polyline mode.
  - `A` — Area mode.
  - `H` — Height mode.
  - `C` — Calibration modal.

## 2. Tool Microcopy (UI Labels & Helper Text)
Use short, clear phrases with a helpful, confident, and concise tone.

- **Measure button tooltip:** "Measure — click to measure distances & areas."
- **Mode labels and helper text:**
  - **Point:** "Point-to-Point" — helper: "Click two points to measure distance."
  - **Polyline:** "Polyline" — helper: "Click multiple points to measure a path."
  - **Area:** "Area" — helper: "Trace around a space to measure area."
  - **Height:** "Vertical" — helper: "Click floor and ceiling to measure height."
  - **Auto-room:** "Auto-room" — helper: "Detect and measure room boundaries automatically."
  - **Calibrate:** "Calibrate" — helper: "Anchor known distance to improve accuracy."

## 3. Live Inline Microcopy & Previews (While Interacting)
- Hover preview line (near cursor): "Snap → [Surface Type] • Confidence [XX%]".
- Live distance preview (floating above measured segment): "3.24 m" with alternate unit below in smaller text: "~10.63 ft".
- Measurement panel (bottom-left):
  - Header: "Measurements".
  - Elements: "Current: [type] • Points: [N] • Total: [value]".
  - Buttons: "Save", "Undo", "Clear", "Export".

## 4. Confirmation / Annotation Microcopy (After Measurement Saved)
- Default saved title: "Measurement {id} — {type}" (editable).
- Annotation placeholder: "Add note (e.g., \"Sofa width\", \"Kitchen counter\")".
- Saved confirmation toast: "Measurement saved • Click to view or export."

## 5. Calibration Flow Microcopy & UX
Calibration is mandatory for admin/tooling workflows. Provide a 3-step guided modal.

- **Modal title:** "Calibration — Improve measurement accuracy".
- **Intro copy:** "Calibrate with a known distance to compute the space's accuracy score. This improves measurement confidence for all users."

### Step 1 (Place markers)
- Instruction: "Place two markers at two points in the real space whose distance you know (e.g., a tape-measured 2.00 m)."
- Buttons: "Place Marker A", "Place Marker B", "Next" (disabled until both placed).

### Step 2 (Snap in viewer)
- Instruction: "Click the same two points in this viewer to match real markers."
- Live helper: "Tip: Zoom in and rotate for precise snapping. Use arrow keys for fine adjustments."
- Buttons: "Reposition", "Compute Accuracy".

### Step 3 (Result)
- Success text: "Calibration complete — RMS error: 3.2 cm (0.95%); stored as accuracy_score."
- High error text: "Calibration indicates high registration error (7.8 cm). Re-capture recommended or review alignment."
- Buttons: "Accept (save)", "Retry calibration".

### Calibration Warnings & Status Copy
- "Low confidence: Calibration required for accurate measurements."
- "Calibration saved — this space reports accuracy: 98.7% (± 3.2 cm)."

## 6. Error Messages & Guidance
Provide concise, actionable feedback with suggested actions.

- "No surface detected — try a different angle or zoom in."
- "Low confidence measurement — this area has sparse depth data. Calibrate or capture LiDAR for better accuracy."
- "Measurement failed — temporary processing error. Try again or contact support."
- "Export failed — unable to generate file. Check space permissions or available storage."
- "Calibration too inaccurate — please re-capture or try a different pair of reference points."

Each error message should add a "Try:" suggestion (e.g., "Try: recalibrate.", "Try: use Auto-room.", "Try: switch to High-Confidence Mode.").

## 7. Confidence & Visual Cues
Pair visual indicators with short explanatory text.

- Color-coded segments:
  - **Green (≥ 90%):** Tooltip: "High confidence measurement."
  - **Amber (60–89%):** Tooltip: "Medium confidence — consider calibrating."
  - **Red (< 60%):** Tooltip: "Low confidence — measurements are provisional."
- Saved measurement label: "± 3.2 cm • 98.9%".

## 8. Exports & Sharing Microcopy
- Export button text: "Export" with dropdown options: CSV, DXF, SVG, PDF.
- Export tooltip: "Download measurements and coordinates."
- Share link copy: "Share measurement (read-only) — expires in [30 days]".
- Export success toast: "Export ready — Download started."

## 9. Floorplan Overlay & 2D Projection Microcopy
- Overlay header: "Projected to Floorplan".
- Tooltip: "This measurement is also shown on the Floorplan view."
- Ambiguous projection note: "Projected position approximate due to low confidence."

## 10. Onboarding Flow (First-Time User Experience)
Display a 3-step walkthrough the first time a user opens Measure.

1. **Step A — "Welcome to Measure"**
   - Copy: "Quickly measure distances, areas, and heights inside this virtual tour."
   - CTA: "Start quick tour."
2. **Step B — "How to measure"**
   - Copy (bullets):
     - "Click \"Measure\" (M) → choose Point/Polyline/Area."
     - "Hover to preview snap point and confidence."
     - "Click to place points; press Enter to finish."
   - CTA: "Try a demo measurement."
3. **Step C — "Calibrate for accuracy"**
   - Copy: "For the most accurate results, calibrate with a known distance or use LiDAR captures."
   - CTA: "Calibrate now / Remind me later."
   - Include a "Don't show again" checkbox.

## 11. Accessibility & Internationalization
- Provide ARIA labels for all controls (e.g., `aria-label="Measure (M) - Point-to-point"`).
- Ensure full keyboard accessibility (e.g., place point with `Enter`, nudge with arrow keys, use `Shift` for larger steps).
- Screen-reader text:
  - On hover: "Surface detected: wall, confidence 94 percent. Press Enter to place point."
  - On save: "Measurement saved: 3.24 meters, accuracy 3.2 centimeters."
- Units default to user locale (metric for most locales) and allow preference toggling.
- Externalize all strings for translation.

## 12. Admin & Pro UX Copy
- Admin banner: "Operator mode — calibration required to publish official measurement accuracy."
- Pro tip: "Pro tip: LiDAR captures increase accuracy; photogrammetry-only captures are best for visuals."

## 13. Sample Localization Strings
```
measure.tooltip → Measure — click to measure distances & areas.
measure.mode.point → Point-to-Point
measure.mode.polyline → Polyline
measure.mode.area → Area
measure.mode.height → Vertical
measure.action.save → Save
measure.action.export → Export
measure.calibrate.title → Calibration — Improve measurement accuracy
measure.error.low_confidence → Low confidence measurement — calibrate or use LiDAR.
```

Add these keys to the localization/i18n resource file.

## 14. UX Micro-Interactions
- Hover preview fade-in: 120 ms.
- Point placement micro-bounce: 200 ms.
- Measurement line draw animation: 160 ms per segment.
- Save confirmation toast: visible for 3.5 seconds with a "View" quick link.

## 15. Implementation Checklist
- Add toolbar icons and keyboard bindings.
- Implement modals and measurement panel copy.
- Wire live preview strings and confidence tooltips.
- Build calibration modal content and result messaging.
- Externalize all copy to i18n resources.
- Apply accessibility labels and keyboard flow controls.
- Add onboarding walkthrough copy and first-time gating logic.
- Include admin/pro banners and pro tips.

