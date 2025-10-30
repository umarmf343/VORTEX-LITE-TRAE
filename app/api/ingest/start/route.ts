import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { NextRequest, NextResponse } from "next/server"

import { ensureIngestControlPlane } from "@/lib/server/ingest-control-plane"
import { generateManifestForSpace } from "@/lib/server/viewer-manifest-generator"
import type { IngestJobStatus } from "@/lib/types"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const JOB_FILE = path.join(DATA_DIRECTORY, "ingest-jobs.json")
const PROCESSED_DIRECTORY = path.join(process.cwd(), "processed")

interface StoredIngestJob {
  job_id: string
  space_id: string
  received_at: string
  status: IngestJobStatus
  payload: Record<string, unknown>
}

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const ensureProcessedDestination = async (spaceId: string, jobId: string) => {
  const jobRoot = path.join(PROCESSED_DIRECTORY, spaceId, jobId)
  const deliverableDirectories = ["meshes", "textures", "floorplan", "manifest"]

  await fs.mkdir(jobRoot, { recursive: true })
  await Promise.all(
    deliverableDirectories.map((directory) => fs.mkdir(path.join(jobRoot, directory), { recursive: true })),
  )

  return jobRoot
}

const loadJobs = async (): Promise<StoredIngestJob[]> => {
  try {
    const buffer = await fs.readFile(JOB_FILE, "utf8")
    return JSON.parse(buffer) as StoredIngestJob[]
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

const saveJobs = async (jobs: StoredIngestJob[]) => {
  await ensureDirectory()
  await fs.writeFile(JOB_FILE, JSON.stringify(jobs, null, 2), "utf8")
}

const requiredFields = ["job_id", "space_id", "owner", "source_type", "raw_assets", "metadata", "status"]

const SOURCE_TYPES = new Set(["PHOTOGRAMMETRY", "LIDAR", "HYBRID", "PANO_360"])
const STATUS_TYPES: Set<IngestJobStatus> = new Set(["QUEUED", "PROCESSING", "REDUCTION", "FUSION", "TEXTURING", "QA", "PUBLISHED", "FAILED"])
const RAW_ASSET_TYPES = new Set(["image", "depthmap", "pointcloud", "video"])

const validatePayload = (payload: Record<string, unknown>) => {
  for (const field of requiredFields) {
    if (!(field in payload)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }

  if (typeof payload["space_id"] !== "string" || payload["space_id"].length === 0) {
    throw new Error("space_id must be a non-empty string")
  }

  if (typeof payload["owner"] !== "string" || payload["owner"].length === 0) {
    throw new Error("owner must be a non-empty string")
  }

  const sourceType = payload["source_type"]
  if (typeof sourceType !== "string" || !SOURCE_TYPES.has(sourceType)) {
    throw new Error(`Invalid source_type. Expected one of: ${Array.from(SOURCE_TYPES).join(", ")}`)
  }

  const rawAssets = payload["raw_assets"]
  if (!Array.isArray(rawAssets) || rawAssets.length === 0) {
    throw new Error("raw_assets must be a non-empty array")
  }

  rawAssets.forEach((asset, index) => {
    if (typeof asset !== "object" || asset === null) {
      throw new Error(`raw_assets[${index}] must be an object`)
    }
    const assetRecord = asset as Record<string, unknown>
    for (const key of ["file_name", "file_url", "file_type"]) {
      if (!(key in assetRecord)) {
        throw new Error(`raw_assets[${index}] is missing required field: ${key}`)
      }
    }
    if (typeof assetRecord["file_name"] !== "string" || assetRecord["file_name"].length === 0) {
      throw new Error(`raw_assets[${index}].file_name must be a non-empty string`)
    }
    if (typeof assetRecord["file_url"] !== "string" || assetRecord["file_url"].length === 0) {
      throw new Error(`raw_assets[${index}].file_url must be a non-empty string`)
    }
    if (typeof assetRecord["file_type"] !== "string" || !RAW_ASSET_TYPES.has(assetRecord["file_type"] as string)) {
      throw new Error(`raw_assets[${index}].file_type must be one of: ${Array.from(RAW_ASSET_TYPES).join(", ")}`)
    }
    if (
      "file_size" in assetRecord &&
      typeof assetRecord["file_size"] !== "number" &&
      typeof assetRecord["file_size"] !== "undefined"
    ) {
      throw new Error(`raw_assets[${index}].file_size must be a number when provided`)
    }
    if (
      "capture_timestamp" in assetRecord &&
      typeof assetRecord["capture_timestamp"] !== "string" &&
      typeof assetRecord["capture_timestamp"] !== "undefined"
    ) {
      throw new Error(`raw_assets[${index}].capture_timestamp must be an ISO string when provided`)
    }
  })

  const metadata = payload["metadata"]
  if (typeof metadata !== "object" || metadata === null) {
    throw new Error("metadata must be an object")
  }
  const metadataRecord = metadata as Record<string, unknown>
  for (const key of ["device", "capture_location", "imu_data", "gps_accuracy"]) {
    if (!(key in metadataRecord)) {
      throw new Error(`metadata is missing required field: ${key}`)
    }
  }
  if (typeof metadataRecord["device"] !== "string" || metadataRecord["device"].length === 0) {
    throw new Error("metadata.device must be a non-empty string")
  }
  const captureLocation = metadataRecord["capture_location"]
  if (typeof captureLocation !== "object" || captureLocation === null) {
    throw new Error("metadata.capture_location must be an object")
  }
  const captureLocationRecord = captureLocation as Record<string, unknown>
  for (const coord of ["latitude", "longitude"]) {
    if (typeof captureLocationRecord[coord] !== "number") {
      throw new Error(`metadata.capture_location.${coord} must be a number`)
    }
  }
  if (
    "altitude" in captureLocationRecord &&
    typeof captureLocationRecord["altitude"] !== "number" &&
    typeof captureLocationRecord["altitude"] !== "undefined"
  ) {
    throw new Error("metadata.capture_location.altitude must be a number when provided")
  }
  if (!Array.isArray(metadataRecord["imu_data"])) {
    throw new Error("metadata.imu_data must be an array")
  }
  if (typeof metadataRecord["gps_accuracy"] !== "number") {
    throw new Error("metadata.gps_accuracy must be a number")
  }
  if (
    "lighting_condition" in metadataRecord &&
    typeof metadataRecord["lighting_condition"] !== "string" &&
    typeof metadataRecord["lighting_condition"] !== "undefined"
  ) {
    throw new Error("metadata.lighting_condition must be a string when provided")
  }
  if ("notes" in metadataRecord && typeof metadataRecord["notes"] !== "string") {
    throw new Error("metadata.notes must be a string when provided")
  }

  const status = payload["status"]
  if (typeof status !== "string" || !STATUS_TYPES.has(status as IngestJobStatus)) {
    throw new Error(`status must be one of: ${Array.from(STATUS_TYPES).join(", ")}`)
  }

  if ("progress" in payload) {
    const progress = payload["progress"]
    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      throw new Error("progress must be a number between 0 and 100")
    }
  }
}

export async function GET() {
  const state = await ensureIngestControlPlane()
  const jobs = await loadJobs()
  return NextResponse.json({
    message: "Submit a POST request with the ingest job payload defined by the schema.",
    pending_jobs: jobs.length,
    queues: state.queues,
    schema_version: state.schemaVersion,
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>
    validatePayload(payload)
    const requestedJobId = payload["job_id"]
    const jobId = typeof requestedJobId === "string" && requestedJobId.length > 0 ? requestedJobId : `ingest_${randomUUID()}`
    const status = (payload["status"] as IngestJobStatus) ?? "QUEUED"
    const spaceId = payload["space_id"] as string
    const timestamp = new Date()
    const nowIso = timestamp.toISOString()

    const rawAssets = (payload["raw_assets"] as Array<Record<string, unknown>>).map((asset) => {
      const captureTimestamp = asset["capture_timestamp"]
      return {
        ...asset,
        capture_timestamp:
          typeof captureTimestamp === "string" && captureTimestamp.length > 0 ? captureTimestamp : nowIso,
      }
    })

    const normalizedPayload = {
      ...payload,
      job_id: jobId,
      status,
      progress:
        typeof payload["progress"] === "number" && payload["progress"] >= 0 && payload["progress"] <= 100
          ? payload["progress"]
          : 0,
      created_at: typeof payload["created_at"] === "string" ? payload["created_at"] : nowIso,
      updated_at: nowIso,
      raw_assets: rawAssets,
    }

    const jobs = await loadJobs()
    const storedJob: StoredIngestJob = {
      job_id: jobId,
      space_id: spaceId,
      received_at: nowIso,
      status,
      payload: normalizedPayload,
    }
    jobs.push(storedJob)
    await saveJobs(jobs)

    await ensureProcessedDestination(spaceId, jobId)

    if (status === "PUBLISHED") {
      try {
        await generateManifestForSpace(spaceId)
      } catch (manifestError) {
        console.error("Failed to generate viewer manifest", manifestError)
      }
    }

    return NextResponse.json({ job_id: jobId, status }, { status: 202 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to enqueue ingest job" },
      { status: 400 },
    )
  }
}
