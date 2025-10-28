import { promises as fs } from "fs"
import path from "path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const DATA_DIR = path.join(process.cwd(), "data")
const STATE_FILE = path.join(DATA_DIR, "app-state.json")

const loadStore = async () => {
  return import("@/lib/server/data-store")
}

beforeEach(async () => {
  await fs.rm(DATA_DIR, { recursive: true, force: true })
  vi.resetModules()
})

describe("data-store", () => {
  it("creates properties and persists them to disk", async () => {
    const { createProperty, getDataSnapshot } = await loadStore()

    const created = await createProperty({
      name: "Test Property",
      address: "123 Test Ave",
      price: 750000,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1800,
      description: "Integration test property",
      thumbnail: "/test.jpg",
    })

    expect(created.id).toMatch(/^prop-/)
    expect(created.createdAt).toBeTruthy()

    const snapshot = await getDataSnapshot()
    const property = snapshot.properties.find((item) => item.id === created.id)
    expect(property).toBeDefined()
    expect(property?.name).toBe("Test Property")

    const diskState = JSON.parse(await fs.readFile(STATE_FILE, "utf8"))
    const persisted = diskState.properties.find((item: { id: string }) => item.id === created.id)
    expect(persisted).toBeDefined()
  })

  it("updates properties when patching", async () => {
    const { createProperty, updateProperty } = await loadStore()

    const created = await createProperty({
      name: "Original",
      address: "1 Main St",
      price: 500000,
      bedrooms: 2,
      bathrooms: 1,
      sqft: 1200,
    })

    const updated = await updateProperty(created.id, {
      name: "Updated",
      price: 525000,
    })

    expect(updated?.name).toBe("Updated")
    expect(updated?.price).toBe(525000)
  })
})
