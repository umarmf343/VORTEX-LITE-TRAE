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

type PipelineConfig = {
  id: string
  version: string
  pipelineDir: string
  stagingDir: string
  presetFileName: string
  jobManifestFileName: string
  deploymentFileName?: string
  qaFileName?: string
  presetPublicPath: string
  jobManifestPublicPath: string
  deploymentPublicPath?: string
  qaPublicPath?: string
  fallbackRegisteredAt: string
  fallbackQueuedAt: string
  fallbackDeployedAt?: string
  fallbackQaAt?: string
}

const PIPELINE_CONFIGS: PipelineConfig[] = [
  {
    id: "video360",
    version: "v1",
    pipelineDir: path.join(process.cwd(), "public", "pipelines", "video360", "v1"),
    stagingDir: path.join(process.cwd(), "public", "staging", "video_preview_player"),
    presetFileName: "video_export_presets.json",
    jobManifestFileName: "video_job_manifest.json",
    deploymentFileName: "deployment.json",
    qaFileName: "qa_space_3BR_flat_01.json",
    presetPublicPath: "/pipelines/video360/v1/video_export_presets.json",
    jobManifestPublicPath: "/pipelines/video360/v1/video_job_manifest.json",
    deploymentPublicPath: "/staging/video_preview_player/deployment.json",
    qaPublicPath: "/staging/video_preview_player/qa_space_3BR_flat_01.json",
    fallbackRegisteredAt: "2025-10-30T10:45:00Z",
    fallbackQueuedAt: "2025-10-30T11:05:00Z",
    fallbackDeployedAt: "2025-10-30T11:20:00Z",
    fallbackQaAt: "2025-10-30T11:40:00Z",
  },
  {
    id: "guided_tour",
    version: "v1",
    pipelineDir: path.join(process.cwd(), "public", "pipelines", "guided_tour", "v1"),
    stagingDir: path.join(process.cwd(), "public", "staging", "guided_tour_creator"),
    presetFileName: "guided_tour_variant_presets.json",
    jobManifestFileName: "guided_tour_job_manifest.json",
    deploymentFileName: "deployment.json",
    qaFileName: "qa_space_3BR_flat_01.json",
    presetPublicPath: "/pipelines/guided_tour/v1/guided_tour_variant_presets.json",
    jobManifestPublicPath: "/pipelines/guided_tour/v1/guided_tour_job_manifest.json",
    deploymentPublicPath: "/staging/guided_tour_creator/deployment.json",
    qaPublicPath: "/staging/guided_tour_creator/qa_space_3BR_flat_01.json",
    fallbackRegisteredAt: "2025-11-04T09:15:00Z",
    fallbackQueuedAt: "2025-11-04T09:20:00Z",
    fallbackDeployedAt: "2025-11-04T09:25:00Z",
    fallbackQaAt: "2025-11-04T09:40:00Z",
  },
]

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

const buildPresetRegistration = async (
  config: PipelineConfig,
): Promise<VideoPresetRegistration> => {
  const presetFile = path.join(config.pipelineDir, config.presetFileName)
  const data = await readJson<{
    pipeline?: string
    version?: string
    generated_at?: string
    maintainer?: string
    notes?: string
    presets?: VideoPresetRegistration["presets"]
  }>(presetFile)
  const checksum = await hashFile(presetFile)

  return {
    pipelineId: data.pipeline ?? config.id,
    version: data.version ?? config.version,
    sourcePath: config.presetPublicPath,
    registeredAt: data.generated_at ?? config.fallbackRegisteredAt,
    checksum,
    maintainer: data.maintainer ?? "Immersive Media Platform",
    notes: data.notes ?? "",
    presets: data.presets ?? [],
  }
}

const buildQueuedJob = async (config: PipelineConfig): Promise<VideoProcessingJob> => {
  const jobManifestFile = path.join(config.pipelineDir, config.jobManifestFileName)
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
  }>(jobManifestFile)

  return {
    jobId: manifest.job_id,
    pipelineId: manifest.pipeline ?? config.id,
    version: manifest.version ?? config.version,
    spaceId: manifest.space_id,
    status: (manifest.status ?? "QUEUED").toLowerCase() as VideoProcessingJob["status"],
    queuedAt: manifest.queued_at ?? config.fallbackQueuedAt,
    priority: manifest.priority ?? "standard",
    requestedBy: manifest.requested_by ?? "",
    manifestPath: config.jobManifestPublicPath,
    deliverables: manifest.deliverables ?? [],
    qaConfig: manifest.qa_config,
    sourceCapture: manifest.source_capture,
    webhook: manifest.webhook,
  }
}

const buildDeployment = async (
  config: PipelineConfig,
): Promise<VideoPlayerDeployment | null> => {
  if (!config.deploymentFileName || !config.deploymentPublicPath) {
    return null
  }

  const deploymentFile = path.join(config.stagingDir, config.deploymentFileName)
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
  }>(deploymentFile)

  const publicPath = config.deploymentPublicPath.replace(/\\/g, "/")
  const deploymentPath = publicPath.substring(0, publicPath.lastIndexOf("/")) || publicPath

  return {
    path: deploymentPath,
    pipelineId: deployment.pipeline ?? config.id,
    environment: deployment.environment ?? "staging",
    deployedAt: deployment.deployed_at ?? config.fallbackDeployedAt ?? config.fallbackQueuedAt,
    version: deployment.version ?? "",
    buildId: deployment.build_id,
    commitRef: deployment.commit_ref,
    viewerUrl: deployment.viewer_url,
    features: deployment.features ?? [],
    assets: deployment.assets ?? {},
    notes: deployment.notes,
    manifestPath: config.deploymentPublicPath,
  }
}

const buildQaRun = async (config: PipelineConfig): Promise<VideoQaSuiteResult | null> => {
  if (!config.qaFileName || !config.qaPublicPath) {
    return null
  }

  const qaFile = path.join(config.stagingDir, config.qaFileName)
  const qa = await readJson<{
    space_id: string
    pipeline?: string
    suite?: string
    run_at?: string
    environment?: string
    status?: VideoQaSuiteResult["status"]
    summary?: string
    checks?: VideoQaSuiteResult["checks"]
  }>(qaFile)

  return {
    spaceId: qa.space_id,
    pipelineId: qa.pipeline ?? config.id,
    suite: qa.suite ?? "staging_smoke",
    runAt: qa.run_at ?? config.fallbackQaAt ?? config.fallbackQueuedAt,
    environment: qa.environment ?? "staging",
    status: qa.status ?? "passed_with_warnings",
    summary: qa.summary ?? "",
    checks: qa.checks ?? [],
    reportPath: config.qaPublicPath,
  }
}

const pipelinesKey = (pipelines: VideoPipelineState[]) =>
  pipelines
    .map((pipeline) => {
      const latestJob = pipeline.jobs[0]?.jobId ?? "none"
      return `${pipeline.id}:${pipeline.version}:${pipeline.presets.checksum}:${latestJob}`
    })
    .sort()
    .join("|")

export const registerVideoPipelineControlPlane = async (): Promise<VideoPipelineControlPlaneState> => {
  const pipelines: VideoPipelineState[] = []
  let updatedAt = "1970-01-01T00:00:00Z"

  for (const config of PIPELINE_CONFIGS) {
    const [presets, job, deployment, qaRun] = await Promise.all([
      buildPresetRegistration(config),
      buildQueuedJob(config),
      buildDeployment(config),
      buildQaRun(config),
    ])

    const pipeline: VideoPipelineState = {
      id: presets.pipelineId,
      version: presets.version,
      presets,
      jobs: [job],
      deployments: deployment ? [deployment] : [],
      qaRuns: qaRun ? [qaRun] : [],
    }

    pipelines.push(pipeline)

    const pipelineUpdatedAt = qaRun?.runAt ?? deployment?.deployedAt ?? job.queuedAt ?? presets.registeredAt
    if (pipelineUpdatedAt && pipelineUpdatedAt > updatedAt) {
      updatedAt = pipelineUpdatedAt
    }
  }

  const state: VideoPipelineControlPlaneState = {
    updatedAt,
    pipelines,
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
