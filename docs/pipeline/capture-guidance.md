# Capture Guidance Checklists

These checklists power the uploader modal and inform field teams about minimum capture standards for the immersive pipeline.

## A. Smartphone Photo Sweep (Photogrammetry)
- **Coverage:** Minimum 70% overlap between consecutive photos; follow a spiral path per room from outer walls toward the center.
- **Shots per Room:** 60–90 photos for an average 12 m² room; add ceiling and floor passes.
- **Capture Path:** Walk clockwise around the perimeter at chest height, then a second lap at eye level; include doorway transitions with 3–5 extra frames.
- **Lighting:** Turn on all fixtures, open blinds for indirect daylight, avoid strong backlighting. Use HDR mode if available.
- **Stability:** Use tripod or stabilizer when possible; pause briefly between shots to avoid motion blur.

## B. RGB-D / Phone LiDAR Capture
- **Coverage:** Maintain at least 50% overlap between sweeps; keep sensor within 3 m of surfaces.
- **Shots per Room:** Continuous scan lasting 45–90 seconds per room, ensuring ceiling and floor passes.
- **Capture Path:** Begin at entryway, trace perimeter at waist height, then sweep vertically on key features (doors, cabinetry) to reinforce geometry.
- **Lighting:** Ensure even ambient lighting; avoid direct sunlight on sensor. Capture reflective surfaces at oblique angles to reduce noise.
- **Calibration:** Perform device IMU calibration before each job; include a 2 m calibration target in first sweep.

## C. Professional LiDAR / 360° Camera Capture
- **Coverage:** Station positions every 3–4 m with at least 40% spherical overlap between scans.
- **Shots per Room:** Minimum of 3 tripod setups for small rooms, 5–7 for large or irregular spaces.
- **Capture Path:** Start from main entrance, proceed clockwise, capturing doorway-to-doorway continuity; add elevated scans for mezzanines/balconies.
- **Lighting:** Balance ambient light; use portable lights to fill dark corners but avoid glare. Capture bracketed exposures if camera supports HDR.
- **Reference Markers:** Place surveyed targets or AprilTags in large spaces for registration accuracy; record precise measurements for QA.

## Universal Practices
- Sync device clocks before capture.
- Record capture notes: room names, anomalies, restricted areas.
- Name raw files using the convention `<propertyId>_<YYYYMMDD>_<roomLabel>_<sequence>`.
- Upload raw data immediately after capture to avoid data loss.
