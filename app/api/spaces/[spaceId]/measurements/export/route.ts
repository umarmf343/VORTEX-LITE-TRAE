import { NextRequest, NextResponse } from "next/server"

import { listSpaceMeasurements } from "@/lib/server/space-measurement-store"
import type { Measurement } from "@/lib/types"

export const dynamic = "force-dynamic"

const UNIT_TO_METERS: Record<Measurement["unit"], number> = {
  ft: 0.3048,
  m: 1,
  in: 0.0254,
}

const distanceMeters = (measurement: Measurement) => {
  const factor = UNIT_TO_METERS[measurement.unit] ?? 1
  return Number((measurement.distance * factor).toFixed(4))
}

const areaSquareMeters = (measurement: Measurement) => {
  if (typeof measurement.areaSquareMeters === "number") {
    return Number(measurement.areaSquareMeters.toFixed(4))
  }
  if (measurement.measurementType === "area" || measurement.measurementType === "room") {
    const factor = UNIT_TO_METERS[measurement.unit] ?? 1
    return Number((measurement.distance * Math.pow(factor, 2)).toFixed(4))
  }
  return null
}

const heightMeters = (measurement: Measurement) => {
  if (typeof measurement.height !== "number") return null
  const factor = UNIT_TO_METERS[measurement.unit] ?? 1
  return Number((measurement.height * factor).toFixed(4))
}

const toCsv = (measurements: Measurement[]) => {
  const header = [
    "id",
    "type",
    "distance_meters",
    "area_m2",
    "height_meters",
    "confidence",
    "accuracy_rms_cm",
    "calibrated",
    "created_at",
  ]
  const rows = measurements.map((measurement) => [
    measurement.id,
    measurement.measurementType,
    measurement.measurementType === "area" || measurement.measurementType === "room"
      ? ""
      : distanceMeters(measurement),
    areaSquareMeters(measurement) ?? "",
    heightMeters(measurement) ?? "",
    measurement.accuracy?.confidence ?? "",
    measurement.accuracy?.rmsErrorCm ?? "",
    measurement.accuracy?.calibrated ?? "",
    measurement.createdAt ?? "",
  ])
  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n")
}

const toSvg = (measurements: Measurement[]) => {
  const polyElements = measurements
    .map((measurement) => {
      const points = measurement.points2d ?? [
        { x: measurement.startX, y: measurement.startY },
        { x: measurement.endX, y: measurement.endY },
      ]
      const pointString = points.map((point) => `${point.x},${point.y}`).join(" ")
      const stroke = measurement.accuracy?.confidence && measurement.accuracy.confidence < 0.9 ? "#f59e0b" : "#16a34a"
      return `<polyline fill="none" stroke="${stroke}" stroke-width="0.6" points="${pointString}" data-id="${measurement.id}" />`
    })
    .join("")

  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${polyElements}</svg>`
}

const toDxf = (measurements: Measurement[]) => {
  const lines: string[] = ["0", "SECTION", "2", "ENTITIES"]
  measurements.forEach((measurement) => {
    const points = measurement.points2d ?? [
      { x: measurement.startX, y: measurement.startY },
      { x: measurement.endX, y: measurement.endY },
    ]
    if ((measurement.measurementType === "area" || measurement.measurementType === "room") && points.length >= 3) {
      lines.push("0", "LWPOLYLINE", "90", String(points.length), "70", "1")
      points.forEach((point, index) => {
        lines.push("10", point.x.toFixed(4), "20", point.y.toFixed(4), "42", index === points.length - 1 ? "1" : "0")
      })
    } else {
      const start = points[0]
      const end = points[points.length - 1]
      lines.push("0", "LINE", "8", "MEASUREMENTS", "10", start.x.toFixed(4), "20", start.y.toFixed(4), "30", "0")
      lines.push("11", end.x.toFixed(4), "21", end.y.toFixed(4), "31", "0")
    }
  })
  lines.push("0", "ENDSEC", "0", "EOF")
  return lines.join("\n")
}

export async function GET(
  request: NextRequest,
  { params }: { params: { spaceId: string } },
) {
  const { searchParams } = new URL(request.url)
  const format = (searchParams.get("format") ?? "csv").toLowerCase()
  try {
    const measurements = await listSpaceMeasurements(params.spaceId)
    let body: string
    let contentType: string
    let filename = `measurements-${params.spaceId}.${format}`

    switch (format) {
      case "csv":
        body = toCsv(measurements)
        contentType = "text/csv"
        break
      case "svg":
        body = toSvg(measurements)
        contentType = "image/svg+xml"
        break
      case "dxf":
        body = toDxf(measurements)
        contentType = "application/dxf"
        break
      default:
        return NextResponse.json({ error: "Unsupported export format" }, { status: 400 })
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": `attachment; filename=\"${filename}\"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export measurements" },
      { status: 500 },
    )
  }
}
