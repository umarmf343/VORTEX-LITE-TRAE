import { promises as fs } from "fs"
import path from "path"

const DATA_DIR = path.join(process.cwd(), "tour_data")
const EVENTS_LOG = path.join(DATA_DIR, "analytics-events.jsonl")

async function ensureDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true })
}

export interface AnalyticsEventRecord {
  event: string
  timestamp: string
  payload: Record<string, unknown>
}

export async function recordAnalyticsEvent(event: string, payload: Record<string, unknown> = {}) {
  const record: AnalyticsEventRecord = {
    event,
    timestamp: new Date().toISOString(),
    payload,
  }

  try {
    await ensureDirectory()
    await fs.appendFile(EVENTS_LOG, `${JSON.stringify(record)}\n`, "utf8")
  } catch (error) {
    console.error("Failed to record analytics event", event, error)
  }
}

export async function readAnalyticsEvents(limit = 100): Promise<AnalyticsEventRecord[]> {
  try {
    const contents = await fs.readFile(EVENTS_LOG, "utf8")
    const lines = contents
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(-limit)
    return lines
      .map((line) => {
        try {
          return JSON.parse(line) as AnalyticsEventRecord
        } catch {
          return null
        }
      })
      .filter((item): item is AnalyticsEventRecord => Boolean(item))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}
