import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { NextRequest, NextResponse } from "next/server"

import { ensureIngestControlPlane } from "@/lib/server/ingest-control-plane"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const JOB_FILE = path.join(DATA_DIRECTORY, "ingest-jobs.json")

interface StoredIngestJob {
  job_id: string
  received_at: string
  state: "queued"
  payload: Record<string, unknown>
}

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
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

const requiredFields = ["job_id", "owner", "source_type", "raw_files", "capture_meta", "location_id", "tags"]

const validatePayload = (payload: Record<string, unknown>) => {
  for (const field of requiredFields) {
    if (!(field in payload)) {
      throw new Error(`Missing required field: ${field}`)
    }
  }
  const rawFiles = payload["raw_files"]
  if (!Array.isArray(rawFiles) || rawFiles.length === 0) {
    throw new Error("raw_files must be a non-empty array")
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

    const normalizedPayload = { ...payload, job_id: jobId }

    const jobs = await loadJobs()
    const storedJob: StoredIngestJob = {
      job_id: jobId,
      received_at: new Date().toISOString(),
      state: "queued",
      payload: normalizedPayload,
    }
    jobs.push(storedJob)
    await saveJobs(jobs)

    return NextResponse.json({ job_id: jobId, state: "queued" }, { status: 202 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to enqueue ingest job" },
      { status: 400 },
    )
  }
}
