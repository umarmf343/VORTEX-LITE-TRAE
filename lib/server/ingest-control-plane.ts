import { promises as fs } from "fs"
import path from "path"

import type { IngestControlPlaneState, IngestQueueConfig } from "@/lib/types"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const CONTROL_PLANE_FILE = path.join(DATA_DIRECTORY, "ingest-control-plane.json")
const SCHEMA_PATH = path.join(process.cwd(), "docs", "pipeline", "ingest-job-schema.json")

const DEFAULT_QUEUE_CONFIG: IngestQueueConfig = {
  ingestJobs: "queue.immersive.ingest.jobs",
  processingDispatch: "topic.immersive.processing.dispatch",
  qaNotifications: "topic.immersive.qa.events",
}

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readJson = async (filePath: string) => {
  const payload = await fs.readFile(filePath, "utf8")
  return JSON.parse(payload) as Record<string, unknown>
}

const writeControlPlane = async (state: IngestControlPlaneState) => {
  await ensureDirectory()
  await fs.writeFile(CONTROL_PLANE_FILE, JSON.stringify(state, null, 2), "utf8")
}

const loadExistingState = async (): Promise<IngestControlPlaneState | null> => {
  try {
    const existing = await readJson(CONTROL_PLANE_FILE)
    if (!existing) return null
    return existing as IngestControlPlaneState
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

const readSchema = async () => {
  const schema = (await readJson(SCHEMA_PATH)) as { [key: string]: unknown; $id?: unknown }
  return schema
}

export const registerIngestJobSchema = async (): Promise<IngestControlPlaneState> => {
  const schema = await readSchema()
  const schemaVersion = (typeof schema.$id === "string" ? schema.$id : undefined) ?? "immersive-ingest-schema"

  const existing = await loadExistingState()
  if (existing && existing.schemaVersion === schemaVersion) {
    return existing
  }

  const state: IngestControlPlaneState = {
    schemaVersion,
    registeredAt: new Date().toISOString(),
    schema: schema as Record<string, unknown>,
    queues: DEFAULT_QUEUE_CONFIG,
    notes: "Auto-registered via ingest control plane bootstrap.",
  }

  await writeControlPlane(state)
  return state
}

let registrationPromise: Promise<IngestControlPlaneState> | null = null

export const ensureIngestControlPlane = () => {
  if (!registrationPromise) {
    registrationPromise = registerIngestJobSchema().catch((error) => {
      registrationPromise = null
      throw error
    })
  }
  return registrationPromise
}

void ensureIngestControlPlane()
