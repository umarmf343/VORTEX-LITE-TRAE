import { NextRequest, NextResponse } from "next/server"

import {
  getPublishedManifest,
  publishTour,
} from "@/lib/server/panorama-scene-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const manifest = await getPublishedManifest()
    return NextResponse.json({ manifest })
  } catch (error) {
    console.error("Failed to load published tour", error)
    return NextResponse.json({ error: "Unable to load manifest" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as { initialSceneId?: string }
    const manifest = await publishTour(body.initialSceneId)
    return NextResponse.json({ manifest })
  } catch (error) {
    console.error("Failed to publish panorama tour", error)
    return NextResponse.json({ error: (error as Error).message ?? "Unable to publish tour" }, { status: 500 })
  }
}
