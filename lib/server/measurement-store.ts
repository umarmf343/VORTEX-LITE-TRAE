import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import type { Measurement, MeasurementExportRecord } from "@/lib/types"

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
