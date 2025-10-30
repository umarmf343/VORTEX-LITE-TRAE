export interface CaptureGuidanceSection {
  title: string
  description: string
  checklist: readonly string[]
}

export const CAPTURE_GUIDANCE_SECTIONS: readonly CaptureGuidanceSection[] = [
  {
    title: "Smartphone Photo Sweep (Photogrammetry)",
    description: "High-overlap RGB capture designed for photogrammetry pipelines.",
    checklist: [
      "Target 70% frame overlap; follow a spiral path through each room.",
      "Capture 60–90 photos for a 12 m² room, including ceiling and floor passes.",
      "Walk the perimeter twice (chest height, then eye level) with extra doorway frames.",
      "Turn on all fixtures, balance lighting, and pause between shots to avoid motion blur.",
    ],
  },
  {
    title: "RGB-D / Phone LiDAR Capture",
    description: "Depth-enabled mobile scanning for rapid geometry acquisition.",
    checklist: [
      "Maintain 50% overlap between sweeps and stay within 3 m of surfaces.",
      "Scan each room for 45–90 seconds with ceiling and floor sweeps.",
      "Trace perimeter at waist height, then add vertical passes on key features.",
      "Calibrate IMU beforehand and include a 2 m reference target in the first sweep.",
    ],
  },
  {
    title: "Professional LiDAR / 360° Camera",
    description: "Tripod-based survey capture for sub-5 cm dimensional accuracy.",
    checklist: [
      "Place tripod stations every 3–4 m with at least 40% spherical overlap.",
      "Capture a minimum of 3 setups in small rooms and 5–7 in larger or irregular spaces.",
      "Work clockwise from the main entrance and add elevated scans where needed.",
      "Balance lighting, avoid glare, and place surveyed targets or AprilTags for QA.",
    ],
  },
] as const

export const UNIVERSAL_CAPTURE_GUIDANCE: readonly string[] = [
  "Sync device clocks and log firmware versions before each session.",
  "Use naming convention <spaceId>_<YYYYMMDD>_<roomLabel>_<sequence>.",
  "Document restricted areas, calibration artifacts, and issues in the ingest manifest.",
  "Upload raw files to secure storage immediately after capture.",
] as const
