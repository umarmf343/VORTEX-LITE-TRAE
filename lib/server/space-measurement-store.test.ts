import { promises as fs } from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const DATA_DIR = path.join(process.cwd(), "data")

const loadStore = async () => import("@/lib/server/space-measurement-store")

beforeEach(async () => {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
  vi.resetModules()
})

describe("space-measurement-store", () => {
  it("saves and retrieves measurements per space", async () => {
    const { listSpaceMeasurements, saveSpaceMeasurement } = await loadStore()

    await saveSpaceMeasurement("space-1", {
      id: "m-1",
      startX: 0,
      startY: 0,
      endX: 10,
      endY: 10,
      distance: 12.4,
      unit: "ft",
      measurementType: "distance",
      points3d: [
        { x: 0, y: 0, z: 0, source: "lidar" },
        { x: 1, y: 0, z: 0, source: "lidar" },
      ],
    })

    const measurements = await listSpaceMeasurements("space-1")
    expect(measurements).toHaveLength(1)
    expect(measurements[0].points3d?.[0].source).toBe("lidar")
  })

  it("persists calibration records", async () => {
    const { getSpaceCalibration, saveSpaceCalibration } = await loadStore()

    await saveSpaceCalibration("space-qa", {
      rmsErrorCm: 2.1,
      accuracyPercent: 0.99,
      toleranceCm: 3,
      anchorDistanceMeters: 1.5,
      capturedAt: "2024-01-01T00:00:00Z",
      operatorId: "op-1",
    })

    const calibration = await getSpaceCalibration("space-qa")
    expect(calibration?.accuracyPercent).toBeCloseTo(0.99)
  })

  it("deletes individual measurements", async () => {
    const { deleteSpaceMeasurement, listSpaceMeasurements, saveSpaceMeasurement } = await loadStore()

    await saveSpaceMeasurement("space-2", {
      id: "m-1",
      startX: 0,
      startY: 0,
      endX: 20,
      endY: 20,
      distance: 5,
      unit: "m",
      measurementType: "distance",
    })

    await saveSpaceMeasurement("space-2", {
      id: "m-2",
      startX: 10,
      startY: 5,
      endX: 25,
      endY: 15,
      distance: 12,
      unit: "m",
      measurementType: "distance",
    })

    expect(await deleteSpaceMeasurement("space-2", "m-1")).toBe(true)
    expect(await deleteSpaceMeasurement("space-2", "m-404")).toBe(false)

    const remaining = await listSpaceMeasurements("space-2")
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe("m-2")
  })
})
