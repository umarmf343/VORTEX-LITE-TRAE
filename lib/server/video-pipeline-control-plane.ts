import { createHash } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import type {
  VideoPipelineControlPlaneState,
  VideoPipelineState,
  VideoPresetRegistration,
  VideoProcessingJob,
  VideoPlayerDeployment,
  VideoQaSuiteResult,
} from "@/lib/types"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const CONTROL_PLANE_FILE = path.join(DATA_DIRECTORY, "video-pipeline-control-plane.json")

const PUBLIC_PIPELINE_DIR = path.join(process.cwd(), "public", "pipelines", "video360", "v1")
const PUBLIC_STAGING_DIR = path.join(process.cwd(), "public", "staging", "video_preview_player")

const PRESETS_FILE = path.join(PUBLIC_PIPELINE_DIR, "video_export_presets.json")
const JOB_MANIFEST_FILE = path.join(PUBLIC_PIPELINE_DIR, "video_job_manifest.json")
const DEPLOYMENT_FILE = path.join(PUBLIC_STAGING_DIR, "deployment.json")
const QA_RUN_FILE = path.join(PUBLIC_STAGING_DIR, "qa_space_3BR_flat_01.json")

const PRESETS_PUBLIC_PATH = "/pipelines/video360/v1/video_export_presets.json"
const JOB_MANIFEST_PUBLIC_PATH = "/pipelines/video360/v1/video_job_manifest.json"
const DEPLOYMENT_PUBLIC_PATH = "/staging/video_preview_player/deployment.json"
const QA_PUBLIC_PATH = "/staging/video_preview_player/qa_space_3BR_flat_01.json"

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readJson = async <T>(filePath: string): Promise<T> => {
  const payload = await fs.readFile(filePath, "utf8")
  return JSON.parse(payload) as T
}

const hashFile = async (filePath: string) => {
  const payload = await fs.readFile(filePath)
  return createHash("sha256").update(payload).digest("hex")
}

const loadExistingState = async (): Promise<VideoPipelineControlPlaneState | null> => {
  try {
    const contents = await fs.readFile(CONTROL_PLANE_FILE, "utf8")
    return JSON.parse(contents) as VideoPipelineControlPlaneState
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

const writeState = async (state: VideoPipelineControlPlaneState) => {
  await ensureDirectory()
  await fs.writeFile(CONTROL_PLANE_FILE, JSON.stringify(state, null, 2), "utf8")
}

const buildPresetRegistration = async (): Promise<VideoPresetRegistration> => {
  const data = await readJson<{
    pipeline?: string
    version?: string
    generated_at?: string
    maintainer?: string
    notes?: string
    presets?: VideoPresetRegistration["presets"]
  }>(PRESETS_FILE)
  const checksum = await hashFile(PRESETS_FILE)

  return {
    pipelineId: data.pipeline ?? "video360",
    version: data.version ?? "v1",
    sourcePath: PRESETS_PUBLIC_PATH,
    registeredAt: data.generated_at ?? "2025-10-30T10:45:00Z",
    checksum,
    maintainer: data.maintainer ?? "Immersive Media Platform",
    notes: data.notes ?? "",
    presets: data.presets ?? [],
  }
}

const buildQueuedJob = async (): Promise<VideoProcessingJob> => {
  const manifest = await readJson<{
    job_id: string
    pipeline?: string
    version?: string
    space_id: string
    queued_at?: string
    priority?: string
    requested_by?: string
    status?: string
    deliverables?: VideoProcessingJob["deliverables"]
    qa_config?: VideoProcessingJob["qaConfig"]
    source_capture?: VideoProcessingJob["sourceCapture"]
    webhook?: VideoProcessingJob["webhook"]
  }>(JOB_MANIFEST_FILE)

  return {
    jobId: manifest.job_id,
    pipelineId: manifest.pipeline ?? "video360",
    version: manifest.version ?? "v1",
    spaceId: manifest.space_id,
    status: (manifest.status ?? "QUEUED").toLowerCase() as VideoProcessingJob["status"],
    queuedAt: manifest.queued_at ?? "2025-10-30T11:05:00Z",
    priority: manifest.priority ?? "standard",
    requestedBy: manifest.requested_by ?? "",
    manifestPath: JOB_MANIFEST_PUBLIC_PATH,
    deliverables: manifest.deliverables ?? [],
    qaConfig: manifest.qa_config,
    sourceCapture: manifest.source_capture,
    webhook: manifest.webhook,
  }
}

const buildDeployment = async (): Promise<VideoPlayerDeployment> => {
  const deployment = await readJson<{
    deployment?: string
    environment?: string
    pipeline?: string
    version?: string
    deployed_at?: string
    commit_ref?: string
    build_id?: string
    viewer_url?: string
    features?: string[]
    assets?: Record<string, string>
    notes?: string
  }>(DEPLOYMENT_FILE)

  return {
    path: "/staging/video_preview_player",
    pipelineId: deployment.pipeline ?? "video360",
    environment: deployment.environment ?? "staging",
    deployedAt: deployment.deployed_at ?? "2025-10-30T11:20:00Z",
    version: deployment.version ?? "",
    buildId: deployment.build_id,
    commitRef: deployment.commit_ref,
    viewerUrl: deployment.viewer_url,
    features: deployment.features ?? [],
    assets: deployment.assets ?? {},
    notes: deployment.notes,
    manifestPath: DEPLOYMENT_PUBLIC_PATH,
  }
}

const buildQaRun = async (): Promise<VideoQaSuiteResult> => {
  const qa = await readJson<{
    space_id: string
    pipeline?: string
    suite?: string
    run_at?: string
    environment?: string
    status?: VideoQaSuiteResult["status"]
    summary?: string
    checks?: VideoQaSuiteResult["checks"]
  }>(QA_RUN_FILE)

  return {
    spaceId: qa.space_id,
    pipelineId: qa.pipeline ?? "video360",
    suite: qa.suite ?? "staging_smoke",
    runAt: qa.run_at ?? "2025-10-30T11:40:00Z",
    environment: qa.environment ?? "staging",
    status: qa.status ?? "passed_with_warnings",
    summary: qa.summary ?? "",
    checks: qa.checks ?? [],
    reportPath: QA_PUBLIC_PATH,
  }
}

const pipelinesKey = (pipelines: VideoPipelineState[]) =>
  pipelines
    .map((pipeline) => `${pipeline.id}:${pipeline.version}:${pipeline.presets.checksum}:${pipeline.jobs[0]?.jobId ?? "none"}`)
    .sort()
    .join("|")

export const registerVideoPipelineControlPlane = async (): Promise<VideoPipelineControlPlaneState> => {
  const [presets, job, deployment, qaRun] = await Promise.all([
    buildPresetRegistration(),
    buildQueuedJob(),
    buildDeployment(),
    buildQaRun(),
  ])

  const pipeline: VideoPipelineState = {
    id: presets.pipelineId,
    version: presets.version,
    presets,
    jobs: [job],
    deployments: [deployment],
    qaRuns: [qaRun],
  }

  const updatedAt = qaRun.runAt ?? job.queuedAt ?? presets.registeredAt

  const state: VideoPipelineControlPlaneState = {
    updatedAt,
    pipelines: [pipeline],
  }

  const existing = await loadExistingState()
  if (existing) {
    const existingKey = pipelinesKey(existing.pipelines)
    const targetKey = pipelinesKey(state.pipelines)
    if (existingKey === targetKey) {
      return existing
    }
  }

  await writeState(state)
  return state
}

let registrationPromise: Promise<VideoPipelineControlPlaneState> | null = null

export const ensureVideoPipelineControlPlane = () => {
  if (!registrationPromise) {
    registrationPromise = registerVideoPipelineControlPlane().catch((error) => {
      registrationPromise = null
      throw error
    })
  }
  return registrationPromise
}

export const getVideoPipelineControlPlaneState = async () => {
  const existing = await loadExistingState()
  if (existing) {
    return existing
  }
  return ensureVideoPipelineControlPlane()
}

void ensureVideoPipelineControlPlane()
