import { promises as fs } from "fs"
import path from "path"
import { randomUUID } from "crypto"

import type { Measurement, MeasurementExportRecord } from "@/lib/types"

const EXPORT_DIRECTORY = path.join(process.cwd(), "data", "measurement-exports")
const MAX_EXPORT_HISTORY = 20

let directoryInitialized: Promise<void> | null = null

const ensureDirectory = () => {
  if (!directoryInitialized) {
    directoryInitialized = fs.mkdir(EXPORT_DIRECTORY, { recursive: true })
  }
  return directoryInitialized
}

const sanitizeSessionId = (sessionId: string) => {
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
  if (!sanitized) {
    throw new Error("Invalid session identifier")
  }
  return sanitized
}

const sessionFilePath = (sessionId: string) =>
  path.join(EXPORT_DIRECTORY, `${sanitizeSessionId(sessionId)}.json`)

const measurementTypes = new Set<Measurement["measurementType"]>([
  "distance",
  "area",
  "volume",
])

const measurementUnits = new Set<Measurement["unit"]>(["ft", "m", "in"])

const toFiniteNumber = (value: unknown) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const sanitizePoints = (value: unknown): Measurement["points"] => {
  if (!Array.isArray(value)) return undefined
  const points = value
    .map((point) => {
      if (!point || typeof point !== "object") return null
      const x = toFiniteNumber((point as { x?: unknown }).x)
      const y = toFiniteNumber((point as { y?: unknown }).y)
      if (x === null || y === null) return null
      return { x, y }
    })
    .filter((point): point is { x: number; y: number } => point !== null)

  return points.length > 0 ? points : undefined
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
    measurementType: type as Measurement["measurementType"],
    label,
    points: sanitizePoints(objectCandidate.points),
    height,
    createdAt,
  }

  return measurement
}

const readSessionExports = async (sessionId: string): Promise<MeasurementExportRecord[]> => {
  await ensureDirectory()
  try {
    const payload = await fs.readFile(sessionFilePath(sessionId), "utf-8")
    const parsed = JSON.parse(payload) as MeasurementExportRecord[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.map((record) => ({
      ...record,
      measurements: Array.isArray(record.measurements)
        ? record.measurements
            .map((measurement) => sanitizeMeasurement(measurement))
            .filter((measurement): measurement is Measurement => measurement !== null)
        : [],
    }))
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

const writeSessionExports = async (sessionId: string, records: MeasurementExportRecord[]) => {
  await ensureDirectory()
  await fs.writeFile(sessionFilePath(sessionId), JSON.stringify(records, null, 2), "utf-8")
}

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

  const existing = await readSessionExports(record.sessionId)
  const nextRecords = [record, ...existing].slice(0, MAX_EXPORT_HISTORY)
  await writeSessionExports(record.sessionId, nextRecords)

  return record
}

export const getMeasurementExports = async (params: {
  sessionId: string
  sceneId?: string
}): Promise<MeasurementExportRecord[]> => {
  const sessionId = sanitizeSessionId(params.sessionId)
  const records = await readSessionExports(sessionId)
  if (!params.sceneId) {
    return records
  }
  return records.filter((record) => record.sceneId === params.sceneId)
}
