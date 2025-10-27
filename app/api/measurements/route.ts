import { NextRequest, NextResponse } from "next/server"

import { getMeasurementExports, saveMeasurementExport } from "@/lib/server/measurement-store"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get("sessionId")
  const sceneId = searchParams.get("sceneId") ?? undefined

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
  }

  try {
    const history = await getMeasurementExports({ sessionId, sceneId })
    return NextResponse.json({ history })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load measurement history" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : null
    const sceneId = typeof payload.sceneId === "string" ? payload.sceneId : null
    const measurements = Array.isArray(payload.measurements) ? payload.measurements : []

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    if (!sceneId) {
      return NextResponse.json({ error: "sceneId is required" }, { status: 400 })
    }

    const record = await saveMeasurementExport({ sessionId, sceneId, measurements })
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save measurements" },
      { status: 500 },
    )
  }
}
