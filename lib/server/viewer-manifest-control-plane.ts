import { promises as fs } from "fs"
import path from "path"

import { generateViewerManifests, type GeneratedManifestResult } from "@/lib/server/viewer-manifest-generator"

interface ViewerManifestControlPlaneState {
  schemaVersion: string
  registeredAt: string
  schema: Record<string, unknown>
  manifestCount: number
  manifests: Array<{ space_id: string; output_path: string }>
  notes?: string
}

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const CONTROL_PLANE_FILE = path.join(DATA_DIRECTORY, "viewer-manifest-control-plane.json")
const SCHEMA_PATH = path.join(process.cwd(), "docs", "pipeline", "viewer-manifest-schema.json")

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readJson = async (filePath: string) => {
  const payload = await fs.readFile(filePath, "utf8")
  return JSON.parse(payload) as Record<string, unknown>
}

const writeState = async (state: ViewerManifestControlPlaneState) => {
  await ensureDirectory()
  await fs.writeFile(CONTROL_PLANE_FILE, JSON.stringify(state, null, 2), "utf8")
}

const loadExistingState = async (): Promise<ViewerManifestControlPlaneState | null> => {
  try {
    const existing = await readJson(CONTROL_PLANE_FILE)
    if (!existing) return null
    return existing as ViewerManifestControlPlaneState
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

const readSchema = async () => {
  const schema = await readJson(SCHEMA_PATH)
  return schema
}

const resolveSchemaVersion = (schema: Record<string, unknown>) => {
  const model = typeof schema["x-model"] === "string" ? (schema["x-model"] as string) : "virtualtour.viewer.manifest"
  const version = typeof schema["x-version"] === "string" ? (schema["x-version"] as string) : "v1.0.0"
  return `${model}:${version}`
}

const manifestsToSummary = (manifests: GeneratedManifestResult[]) =>
  manifests.map((entry) => ({ space_id: entry.spaceId, output_path: entry.outputPath }))

const manifestsKey = (manifests: ViewerManifestControlPlaneState["manifests"] = []) =>
  manifests
    .map((entry) => `${entry.space_id}:${entry.output_path}`)
    .sort()
    .join("|")

export const registerViewerManifestSchema = async (): Promise<ViewerManifestControlPlaneState> => {
  const schema = await readSchema()
  const schemaVersion = resolveSchemaVersion(schema)
  const generated = await generateViewerManifests()
  const existing = await loadExistingState()

  if (existing && existing.schemaVersion === schemaVersion) {
    const existingKey = manifestsKey(existing.manifests ?? [])
    const generatedKey = manifestsKey(manifestsToSummary(generated))
    if (existingKey === generatedKey) {
      return existing
    }
  }

  const state: ViewerManifestControlPlaneState = {
    schemaVersion,
    registeredAt: new Date().toISOString(),
    schema: schema as Record<string, unknown>,
    manifestCount: generated.length,
    manifests: manifestsToSummary(generated),
    notes: "Auto-registered via viewer manifest control plane bootstrap."
  }

  await writeState(state)
  return state
}

let registrationPromise: Promise<ViewerManifestControlPlaneState> | null = null

export const ensureViewerManifestControlPlane = () => {
  if (!registrationPromise) {
    registrationPromise = registerViewerManifestSchema().catch((error) => {
      registrationPromise = null
      throw error
    })
  }
  return registrationPromise
}

void ensureViewerManifestControlPlane()
