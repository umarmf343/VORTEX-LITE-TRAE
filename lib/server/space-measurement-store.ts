import { randomUUID } from "crypto"
import { promises as fs } from "fs"
import path from "path"

import { normalizeMeasurementCandidate } from "@/lib/server/measurement-store"
import type { Measurement, SpaceCalibrationRecord } from "@/lib/types"

const DATA_DIRECTORY = path.join(process.cwd(), "data")
const SPACE_FILE = path.join(DATA_DIRECTORY, "space-measurements.json")

export interface SpaceMeasurementStateEntry {
  measurements: Measurement[]
  calibration?: SpaceCalibrationRecord
  updatedAt: string
}

type SpaceMeasurementState = Record<string, SpaceMeasurementStateEntry>

const ensureDirectory = async () => {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true })
}

const readState = async (): Promise<SpaceMeasurementState> => {
  try {
    const contents = await fs.readFile(SPACE_FILE, "utf8")
    const parsed = JSON.parse(contents) as SpaceMeasurementState
    if (!parsed || typeof parsed !== "object") {
      return {}
    }
    return parsed
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {}
    }
    throw error
  }
}

const writeState = async (state: SpaceMeasurementState) => {
  await ensureDirectory()
  await fs.writeFile(SPACE_FILE, JSON.stringify(state, null, 2), "utf8")
}

const sanitizeSpaceId = (spaceId: string) => {
  const trimmed = spaceId.trim()
  if (!trimmed) {
    throw new Error("spaceId is required")
  }
  return trimmed
}

export const listSpaceMeasurements = async (spaceId: string): Promise<Measurement[]> => {
  const state = await readState()
  const entry = state[sanitizeSpaceId(spaceId)]
  return entry ? JSON.parse(JSON.stringify(entry.measurements)) : []
}

export const getSpaceCalibration = async (
  spaceId: string,
): Promise<SpaceCalibrationRecord | undefined> => {
  const state = await readState()
  const entry = state[sanitizeSpaceId(spaceId)]
  return entry?.calibration ? { ...entry.calibration } : undefined
}

export const saveSpaceMeasurement = async (
  spaceId: string,
  candidate: unknown,
): Promise<Measurement> => {
  const sanitizedSpaceId = sanitizeSpaceId(spaceId)
  const measurement = normalizeMeasurementCandidate(candidate)
  if (!measurement) {
    throw new Error("Invalid measurement payload")
  }

  if (!measurement.id) {
    measurement.id = `measure-${randomUUID()}`
  }

  const state = await readState()
  const entry = state[sanitizedSpaceId] ?? {
    measurements: [],
    updatedAt: new Date().toISOString(),
  }

  const existingIndex = entry.measurements.findIndex((item) => item.id === measurement.id)
  if (existingIndex >= 0) {
    entry.measurements[existingIndex] = { ...measurement }
  } else {
    entry.measurements.push({ ...measurement })
  }
  entry.updatedAt = new Date().toISOString()
  state[sanitizedSpaceId] = entry
  await writeState(state)
  return JSON.parse(JSON.stringify(measurement)) as Measurement
}

export const deleteSpaceMeasurement = async (
  spaceId: string,
  measurementId: string,
): Promise<boolean> => {
  const sanitizedSpaceId = sanitizeSpaceId(spaceId)
  const state = await readState()
  const entry = state[sanitizedSpaceId]
  if (!entry) {
    return false
  }
  const before = entry.measurements.length
  entry.measurements = entry.measurements.filter((measurement) => measurement.id !== measurementId)
  if (entry.measurements.length === before) {
    return false
  }
  entry.updatedAt = new Date().toISOString()
  state[sanitizedSpaceId] = entry
  await writeState(state)
  return true
}

export const saveSpaceCalibration = async (
  spaceId: string,
  calibration: SpaceCalibrationRecord,
): Promise<SpaceCalibrationRecord> => {
  const sanitizedSpaceId = sanitizeSpaceId(spaceId)
  const nextCalibration: SpaceCalibrationRecord = {
    ...calibration,
    capturedAt: calibration.capturedAt ?? new Date().toISOString(),
  }

  const state = await readState()
  const entry = state[sanitizedSpaceId] ?? {
    measurements: [],
    updatedAt: new Date().toISOString(),
  }

  entry.calibration = nextCalibration
  entry.updatedAt = new Date().toISOString()
  state[sanitizedSpaceId] = entry
  await writeState(state)
  return { ...nextCalibration }
}

export const getSpaceMeasurementState = async (
  spaceId: string,
): Promise<SpaceMeasurementStateEntry | undefined> => {
  const state = await readState()
  const entry = state[sanitizeSpaceId(spaceId)]
  return entry ? JSON.parse(JSON.stringify(entry)) : undefined
}
