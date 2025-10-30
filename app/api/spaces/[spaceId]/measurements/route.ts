import { NextRequest, NextResponse } from "next/server"

import {
  deleteSpaceMeasurement,
  getSpaceCalibration,
  listSpaceMeasurements,
  saveSpaceCalibration,
  saveSpaceMeasurement,
} from "@/lib/server/space-measurement-store"
import type { SpaceCalibrationRecord } from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: { spaceId: string } },
) {
  try {
    const measurements = await listSpaceMeasurements(params.spaceId)
    const calibration = await getSpaceCalibration(params.spaceId)
    return NextResponse.json({ measurements, calibration })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load measurements" },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { spaceId: string } },
) {
  try {
    const payload = await request.json()
    const measurement = payload?.measurement
    const calibration = payload?.calibration as SpaceCalibrationRecord | undefined

    if (!measurement && !calibration) {
      return NextResponse.json({ error: "measurement or calibration payload required" }, { status: 400 })
    }

    const responses: Record<string, unknown> = {}

    if (measurement) {
      responses.measurement = await saveSpaceMeasurement(params.spaceId, measurement)
    }

    if (calibration) {
      responses.calibration = await saveSpaceCalibration(params.spaceId, calibration)
    }

    return NextResponse.json(responses, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save measurement" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { spaceId: string } },
) {
  const { searchParams } = new URL(request.url)
  const measurementId = searchParams.get("measurementId")
  if (!measurementId) {
    return NextResponse.json({ error: "measurementId query parameter required" }, { status: 400 })
  }
  try {
    const removed = await deleteSpaceMeasurement(params.spaceId, measurementId)
    if (!removed) {
      return NextResponse.json({ error: "Measurement not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete measurement" },
      { status: 500 },
    )
  }
}
