import { promises as fs } from "fs"
import path from "path"

import type {
  ShareEventName,
  ShareEventPayload,
  WalkthroughEventName,
  WalkthroughEventPayload,
} from "@/lib/analytics"

export interface WalkthroughEventRecord extends WalkthroughEventPayload {
  event: WalkthroughEventName
  receivedAt: string
}

export interface ShareEventRecord extends ShareEventPayload {
  event: ShareEventName
  receivedAt: string
}

const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics")
const WALKTHROUGH_FILE = path.join(ANALYTICS_DIR, "walkthrough-events.json")
const SHARE_FILE = path.join(ANALYTICS_DIR, "share-events.json")

const ensureDir = async () => {
  await fs.mkdir(ANALYTICS_DIR, { recursive: true })
}

const readEvents = async <T>(file: string): Promise<T[]> => {
  try {
    const contents = await fs.readFile(file, "utf8")
    return JSON.parse(contents) as T[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }
    throw error
  }
}

const writeEvents = async <T>(file: string, events: T[]) => {
  await ensureDir()
  await fs.writeFile(file, JSON.stringify(events, null, 2), "utf8")
}

export const recordWalkthroughEvent = async (
  record: WalkthroughEventRecord,
): Promise<void> => {
  const events = await readEvents<WalkthroughEventRecord>(WALKTHROUGH_FILE)
  events.push(record)
  await writeEvents(WALKTHROUGH_FILE, events)
}

export const recordShareEvent = async (record: ShareEventRecord): Promise<void> => {
  const events = await readEvents<ShareEventRecord>(SHARE_FILE)
  events.push(record)
  await writeEvents(SHARE_FILE, events)
}

export const getWalkthroughEvents = async () =>
  readEvents<WalkthroughEventRecord>(WALKTHROUGH_FILE)

export const getShareEvents = async () => readEvents<ShareEventRecord>(SHARE_FILE)
