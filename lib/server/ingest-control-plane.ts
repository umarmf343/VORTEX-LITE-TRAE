import { promises as fs } from "fs"
import path from "path"

import type {
  IngestControlPlaneState,
  IngestQueueConfig,
  IngestStatusWebhookMap,
} from "@/lib/types"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const CONTROL_PLANE_FILE = path.join(DATA_DIRECTORY, "ingest-control-plane.json")
const SCHEMA_PATH = path.join(process.cwd(), "docs", "pipeline", "ingest-job-schema.json")

const DEFAULT_QUEUE_CONFIG: IngestQueueConfig = {
  ingestJobs: "queue.immersive.ingest.jobs",
  processingDispatch: "topic.immersive.processing.dispatch",
  qaNotifications: "topic.immersive.qa.events",
}

const STATUS_WEBHOOKS: IngestStatusWebhookMap = {
  onQueued: {
    event: "onQueued",
    status: "QUEUED",
    enabled: true,
    description: "Dispatched when an ingest job is accepted into the queue.",
  },
  onProcessing: {
    event: "onProcessing",
    status: "PROCESSING",
    enabled: true,
    description: "Triggered when preprocessing workers begin operating on raw assets.",
  },
  onReduction: {
    event: "onReduction",
    status: "REDUCTION",
    enabled: true,
    description: "Signals the reduction pass that normalizes source capture data.",
  },
  onFusion: {
    event: "onFusion",
    status: "FUSION",
    enabled: true,
    description: "Issued when LiDAR and photogrammetry assets are fused.",
  },
  onTexturing: {
    event: "onTexturing",
    status: "TEXTURING",
    enabled: true,
    description: "Notifies subscribers that texture baking is underway.",
  },
  onQa: {
    event: "onQa",
    status: "QA",
    enabled: true,
    description: "Emitted when the QA stage begins for reconstructed assets.",
  },
  onPublished: {
    event: "onPublished",
    status: "PUBLISHED",
    enabled: true,
    description: "Confirms a successful publish event to downstream viewers.",
  },
  onFailed: {
    event: "onFailed",
    status: "FAILED",
    enabled: true,
    description: "Broadcast whenever a job halts due to unrecoverable errors.",
  },
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
  const schema = (await readJson(SCHEMA_PATH)) as Record<string, unknown>
  return schema
}

const resolveSchemaVersion = (schema: Record<string, unknown>) => {
  const model = typeof schema["x-model"] === "string" ? (schema["x-model"] as string) : "virtualtour.ingest.job"
  const version = typeof schema["x-version"] === "string" ? (schema["x-version"] as string) : "v1.0.0"
  return `${model}:${version}`
}

export const registerIngestJobSchema = async (): Promise<IngestControlPlaneState> => {
  const schema = await readSchema()
  const schemaVersion = resolveSchemaVersion(schema)

  const existing = await loadExistingState()
  if (existing && existing.schemaVersion === schemaVersion) {
    const serializedExisting = JSON.stringify(existing.statusWebhooks ?? {})
    const serializedTarget = JSON.stringify(STATUS_WEBHOOKS)
    if (serializedExisting === serializedTarget) {
      return existing
    }
  }

  const state: IngestControlPlaneState = {
    schemaVersion,
    registeredAt: new Date().toISOString(),
    schema: schema as Record<string, unknown>,
    queues: DEFAULT_QUEUE_CONFIG,
    statusWebhooks: STATUS_WEBHOOKS,
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
