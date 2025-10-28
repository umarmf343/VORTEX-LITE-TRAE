import { promises as fs } from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const DATA_DIR = path.join(process.cwd(), "data")
const EXPORT_FILE = path.join(DATA_DIR, "measurement-exports.json")

const loadStore = async () => import("@/lib/server/measurement-store")

beforeEach(async () => {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
  vi.resetModules()
})

describe("measurement-store", () => {
  it("persists measurement exports per session", async () => {
    const { saveMeasurementExport, getMeasurementExports } = await loadStore()

    const record = await saveMeasurementExport({
      sessionId: "session-123",
      sceneId: "scene-a",
      measurements: [
        {
          id: "m1",
          startX: 0,
          startY: 0,
          endX: 1,
          endY: 1,
          distance: 10,
          unit: "ft",
          measurementType: "distance",
        },
      ],
    })

    expect(record.sessionId).toBe("session-123")
    expect(record.measurements).toHaveLength(1)

    const file = JSON.parse(await fs.readFile(EXPORT_FILE, "utf8"))
    expect(file["session-123"]).toHaveLength(1)

    const history = await getMeasurementExports({ sessionId: "session-123" })
    expect(history).toHaveLength(1)

    const filtered = await getMeasurementExports({ sessionId: "session-123", sceneId: "other" })
    expect(filtered).toHaveLength(0)
  })
})
