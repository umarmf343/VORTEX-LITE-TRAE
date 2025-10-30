import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import type {
  Measurement,
  MeasurementAccuracy,
  MeasurementExportRecord,
  MeasurementKind,
  MeasurementPoint2D,
  MeasurementPoint3D,
} from "@/lib/types"

const MAX_EXPORT_HISTORY = 20

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const EXPORT_FILE = path.join(DATA_DIRECTORY, "measurement-exports.json")

type MeasurementHistory = Record<string, MeasurementExportRecord[]>

let historyPromise: Promise<MeasurementHistory> | null = null

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readHistory = async (): Promise<MeasurementHistory> => {
  try {
    const contents = await fs.readFile(EXPORT_FILE, "utf8")
    const parsed = JSON.parse(contents) as MeasurementHistory
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {}
    }
    throw error
  }
}

const writeHistory = async (history: MeasurementHistory) => {
  await ensureDirectory()
  await fs.writeFile(EXPORT_FILE, JSON.stringify(history, null, 2), "utf8")
}

const getHistory = async (): Promise<MeasurementHistory> => {
  if (!historyPromise) {
    historyPromise = readHistory()
  }
  return historyPromise
}

const updateHistory = async <Result>(updater: (history: MeasurementHistory) => Result) => {
  const history = await getHistory()
  const result = updater(history)
  await writeHistory(history)
  return result
}

const sanitizeSessionId = (sessionId: string) => {
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
  if (!sanitized) {
    throw new Error("Invalid session identifier")
  }
  return sanitized
}

const measurementTypes = new Set<MeasurementKind>([
  "distance",
  "path",
  "area",
  "height",
  "room",
  "volume",
])

const measurementUnits = new Set<Measurement["unit"]>(["ft", "m", "in"])

const toFiniteNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const sanitizePoints2d = (value: unknown): MeasurementPoint2D[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const points = value
    .map((point) => {
      if (!point || typeof point !== "object") return null
      const x = toFiniteNumber((point as { x?: unknown }).x)
      const y = toFiniteNumber((point as { y?: unknown }).y)
      if (x === null || y === null) return null
      return { x, y }
    })
    .filter((point): point is MeasurementPoint2D => point !== null)

  return points.length > 0 ? points : undefined
}

const sanitizePoints3d = (value: unknown): MeasurementPoint3D[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const points = value
    .map((point) => {
      if (!point || typeof point !== "object") return null
      const x = toFiniteNumber((point as { x?: unknown }).x)
      const y = toFiniteNumber((point as { y?: unknown }).y)
      const z = toFiniteNumber((point as { z?: unknown }).z)
      if (x === null || y === null || z === null) return null
      const confidence = toFiniteNumber((point as { confidence?: unknown }).confidence)
      const sourceValue = (point as { source?: unknown }).source
      const source =
        sourceValue === "lidar" || sourceValue === "photogrammetry" || sourceValue === "hybrid"
          ? sourceValue
          : undefined
      return {
        x,
        y,
        z,
        confidence: confidence ?? undefined,
        source,
      }
    })
    .filter((point): point is MeasurementPoint3D => point !== null)

  return points.length > 0 ? points : undefined
}

const sanitizeAccuracy = (value: unknown): MeasurementAccuracy | undefined => {
  if (!value || typeof value !== "object") return undefined
  const accuracy = value as Record<string, unknown>
  const rmsErrorCm = toFiniteNumber(accuracy.rmsErrorCm)
  const confidence = toFiniteNumber(accuracy.confidence)
  const toleranceCm = accuracy.toleranceCm !== undefined ? toFiniteNumber(accuracy.toleranceCm) ?? undefined : undefined
  const calibratedAt = typeof accuracy.calibratedAt === "string" ? accuracy.calibratedAt : undefined
  const source = accuracy.source
  const calibrated = typeof accuracy.calibrated === "boolean" ? accuracy.calibrated : false

  if (
    rmsErrorCm === null ||
    confidence === null ||
    !(source === "lidar" || source === "photogrammetry" || source === "hybrid")
  ) {
    return undefined
  }

  return {
    rmsErrorCm,
    confidence: Math.max(0, Math.min(confidence, 1)),
    calibrated,
    toleranceCm,
    calibratedAt,
    source,
  }
}

const sanitizeMeasurement = (candidate: unknown): Measurement | null => {
  if (!candidate || typeof candidate !== "object") {
    return null
  }

  const objectCandidate = candidate as Record<string, unknown>

  const startX = toFiniteNumber(objectCandidate.startX)
  const startY = toFiniteNumber(objectCandidate.startY)
  const endX = toFiniteNumber(objectCandidate.endX)
  const endY = toFiniteNumber(objectCandidate.endY)
  const distance = toFiniteNumber(objectCandidate.distance)
  const height =
    objectCandidate.height !== undefined ? toFiniteNumber(objectCandidate.height) ?? undefined : undefined

  const type = objectCandidate.measurementType
  const unit = objectCandidate.unit

  if (
    startX === null ||
    startY === null ||
    endX === null ||
    endY === null ||
    distance === null ||
    typeof type !== "string" ||
    !measurementTypes.has(type as Measurement["measurementType"])
  ) {
    return null
  }

  const resolvedUnit =
    typeof unit === "string" && measurementUnits.has(unit as Measurement["unit"])
      ? (unit as Measurement["unit"])
      : "ft"

  const label =
    typeof objectCandidate.label === "string"
      ? objectCandidate.label.slice(0, 120)
      : undefined

  const createdAt =
    typeof objectCandidate.createdAt === "string"
      ? objectCandidate.createdAt
      : new Date().toISOString()

  const measurement: Measurement = {
    id:
      typeof objectCandidate.id === "string" && objectCandidate.id.trim().length
        ? objectCandidate.id
        : `measure-${randomUUID()}`,
    startX,
    startY,
    endX,
    endY,
    distance,
    unit: resolvedUnit,
    measurementType: type as MeasurementKind,
    label,
    points2d: sanitizePoints2d(objectCandidate.points ?? objectCandidate.points2d),
    points3d: sanitizePoints3d(objectCandidate.points3d),
    areaSquareMeters:
      objectCandidate.areaSquareMeters !== undefined
        ? toFiniteNumber(objectCandidate.areaSquareMeters) ?? undefined
        : undefined,
    height,
    accuracy: sanitizeAccuracy(objectCandidate.accuracy),
    redacted: typeof objectCandidate.redacted === "boolean" ? objectCandidate.redacted : undefined,
    annotation:
      objectCandidate.annotation && typeof objectCandidate.annotation === "object"
        ? {
            title:
              typeof (objectCandidate.annotation as { title?: unknown }).title === "string"
                ? ((objectCandidate.annotation as { title?: string }).title ?? "").slice(0, 120)
                : undefined,
            note:
              typeof (objectCandidate.annotation as { note?: unknown }).note === "string"
                ? ((objectCandidate.annotation as { note?: string }).note ?? "").slice(0, 240)
                : undefined,
            tags: Array.isArray((objectCandidate.annotation as { tags?: unknown }).tags)
              ? ((objectCandidate.annotation as { tags?: unknown[] }).tags ?? [])
                  .map((value) => (typeof value === "string" ? value.slice(0, 48) : null))
                  .filter((value): value is string => Boolean(value))
                  .slice(0, 10)
              : undefined,
          }
        : undefined,
    createdAt,
    createdBy:
      typeof objectCandidate.createdBy === "string" && objectCandidate.createdBy.length > 0
        ? objectCandidate.createdBy
        : undefined,
  }

  return measurement
}

export const normalizeMeasurementCandidate = sanitizeMeasurement

export const saveMeasurementExport = async (
  params: Pick<MeasurementExportRecord, "sessionId" | "sceneId"> & {
    measurements: unknown[]
  },
): Promise<MeasurementExportRecord> => {
  const sanitizedMeasurements = params.measurements
    .map((measurement) => sanitizeMeasurement(measurement))
    .filter((measurement): measurement is Measurement => measurement !== null)

  if (sanitizedMeasurements.length === 0) {
    throw new Error("No valid measurements provided")
  }

  const record: MeasurementExportRecord = {
    id: randomUUID(),
    sessionId: sanitizeSessionId(params.sessionId),
    sceneId: params.sceneId,
    savedAt: new Date().toISOString(),
    measurements: sanitizedMeasurements,
  }

  return updateHistory((history) => {
    const existing = history[record.sessionId] ?? []
    const nextRecords = [record, ...existing].slice(0, MAX_EXPORT_HISTORY)
    history[record.sessionId] = nextRecords
    return record
  })
}

export const getMeasurementExports = async (params: {
  sessionId: string
  sceneId?: string
}): Promise<MeasurementExportRecord[]> => {
  const sessionId = sanitizeSessionId(params.sessionId)
  const history = await getHistory()
  const records = history[sessionId] ?? []
  const result = !params.sceneId
    ? records
    : records.filter((record) => record.sceneId === params.sceneId)

  return JSON.parse(JSON.stringify(result)) as MeasurementExportRecord[]
}
