import { NextResponse } from "next/server"

import { getSceneEngineSnapshot } from "@/lib/server/panorama-scene-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const snapshot = await getSceneEngineSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    console.error("Failed to list panorama scenes", error)
    return NextResponse.json({ error: "Unable to load scenes" }, { status: 500 })
  }
}
