import { NextRequest, NextResponse } from "next/server"

import {
  linkScenes,
  type PanoramaSceneLinkPayload,
} from "@/lib/server/panorama-scene-engine"

export const dynamic = "force-dynamic"

const parseNumber = (value: unknown, fallback: number) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : fallback
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PanoramaSceneLinkPayload>
    if (!body.sourceSceneId || !body.targetSceneId) {
      return NextResponse.json({ error: "sourceSceneId and targetSceneId are required" }, { status: 400 })
    }
    if (!body.label) {
      return NextResponse.json({ error: "Hotspot label is required" }, { status: 400 })
    }

    const hotspot = await linkScenes({
      sourceSceneId: body.sourceSceneId,
      targetSceneId: body.targetSceneId,
      yaw: parseNumber(body.yaw, 0),
      pitch: parseNumber(body.pitch, 0),
      label: body.label,
      bidirectional: Boolean(body.bidirectional),
      autoAlign: Boolean(body.autoAlign),
    })

    return NextResponse.json({ hotspot })
  } catch (error) {
    console.error("Failed to link panorama scenes", error)
    return NextResponse.json({ error: "Unable to link scenes" }, { status: 500 })
  }
}
