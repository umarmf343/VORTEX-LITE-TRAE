import { promises as fs } from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const DATA_DIR = path.join(process.cwd(), "data")

const loadRoute = async () => import("@/app/api/data/route")

beforeEach(async () => {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
  vi.resetModules()
})

describe("/api/data route", () => {
  it("returns data snapshot via GET", async () => {
    const { GET } = await loadRoute()
    const response = await GET()
    expect(response.status).toBe(200)
    const body = (await response.json()) as { data: { properties: unknown[] } }
    expect(Array.isArray(body.data.properties)).toBe(true)
  })

  it("creates a property via POST action", async () => {
    const { POST } = await loadRoute()

    const request = new NextRequest("http://localhost/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "createProperty",
        payload: {
          name: "API Created",
          address: "42 Integration Way",
          price: 820000,
          bedrooms: 4,
          bathrooms: 3,
          sqft: 2400,
        },
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    const body = (await response.json()) as { property: { id: string; name: string } }
    expect(body.property.name).toBe("API Created")
  })
})
