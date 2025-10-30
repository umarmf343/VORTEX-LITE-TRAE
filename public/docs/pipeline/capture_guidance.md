# Capture Guidance Quick Reference

Field teams must follow these modality-specific checklists before uploading new capture jobs.

## A. Smartphone Photo Sweep (Photogrammetry)
- 70% overlap between consecutive photos; follow a spiral path.
- Capture 60–90 photos per 12 m² room with ceiling and floor passes.
- Walk perimeter twice (chest height, eye level) with extra doorway frames.
- Turn on all fixtures, balance lighting, and pause between shots to avoid blur.

## B. RGB-D / Phone LiDAR Capture
- Maintain 50% overlap between sweeps and stay within 3 m of surfaces.
- Scan each room for 45–90 seconds with ceiling and floor coverage.
- Trace perimeter at waist height, then vertical passes on key features.
- Calibrate IMU beforehand and include a 2 m reference target in the first sweep.

## C. Professional LiDAR / 360° Camera Capture
- Tripod stations every 3–4 m with 40% spherical overlap.
- Minimum 3 setups in small rooms, 5–7 in larger or irregular spaces.
- Capture clockwise from main entrance; add elevated scans where needed.
- Balance lighting, avoid glare, and deploy surveyed targets or AprilTags.

## Universal Practices
- Sync device clocks and record firmware versions.
- Use `<spaceId>_<YYYYMMDD>_<roomLabel>_<sequence>` naming convention.
- Document restricted areas and calibration artifacts in the manifest.
- Upload raw files to secure storage immediately after capture.
