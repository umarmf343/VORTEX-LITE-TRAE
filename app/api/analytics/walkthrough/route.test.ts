import { promises as fs } from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics")
const WALKTHROUGH_FILE = path.join(ANALYTICS_DIR, "walkthrough-events.json")

const loadRoute = async () => import("@/app/api/analytics/walkthrough/route")

beforeEach(async () => {
  await fs.rm(ANALYTICS_DIR, { recursive: true, force: true })
  vi.resetModules()
})

describe("/api/analytics/walkthrough route", () => {
  it("records walkthrough events", async () => {
    const { POST } = await loadRoute()

    const request = new NextRequest("http://localhost/api/analytics/walkthrough", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "enter_walkthrough",
        spaceId: "space_alpha",
        timestamp: 123456,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(202)

    const contents = JSON.parse(await fs.readFile(WALKTHROUGH_FILE, "utf8")) as Array<{
      event: string
      spaceId: string
      timestamp: number
      receivedAt: string
    }>

    expect(contents).toHaveLength(1)
    expect(contents[0].event).toBe("enter_walkthrough")
    expect(contents[0].spaceId).toBe("space_alpha")
    expect(contents[0].timestamp).toBe(123456)
    expect(typeof contents[0].receivedAt).toBe("string")
  })

  it("rejects unknown events", async () => {
    const { POST } = await loadRoute()

    const request = new NextRequest("http://localhost/api/analytics/walkthrough", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "unknown_event",
        spaceId: "space_alpha",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(422)

    await expect(fs.access(WALKTHROUGH_FILE)).rejects.toThrow()
  })

  it("recovers from corrupted analytics data", async () => {
    await fs.mkdir(ANALYTICS_DIR, { recursive: true })
    await fs.writeFile(WALKTHROUGH_FILE, "oops", "utf8")

    const { POST } = await loadRoute()

    const request = new NextRequest("http://localhost/api/analytics/walkthrough", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "enter_walkthrough",
        spaceId: "space_alpha",
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(202)

    const contents = JSON.parse(await fs.readFile(WALKTHROUGH_FILE, "utf8")) as Array<{
      event: string
      spaceId: string
    }>

    expect(contents).toHaveLength(1)
    expect(contents[0].event).toBe("enter_walkthrough")
    expect(contents[0].spaceId).toBe("space_alpha")
  })
})
