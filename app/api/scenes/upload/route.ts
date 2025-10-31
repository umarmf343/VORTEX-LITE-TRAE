import { NextRequest, NextResponse } from "next/server"

import {
  uploadScene,
  type PanoramaSceneUploadPayload,
} from "@/lib/server/panorama-scene-engine"

export const dynamic = "force-dynamic"

const defaultInitialView = { yaw: 0, pitch: 0, fov: 90 }

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseInitialView(value: unknown) {
  if (!value || typeof value !== "object") {
    return defaultInitialView
  }
  const { yaw, pitch, fov } = value as Record<string, unknown>
  return {
    yaw: Number.isFinite(yaw as number) ? Number(yaw) : defaultInitialView.yaw,
    pitch: Number.isFinite(pitch as number) ? Number(pitch) : defaultInitialView.pitch,
    fov: Number.isFinite(fov as number) ? Number(fov) : defaultInitialView.fov,
  }
}

function parseTags(tags: unknown): string[] | undefined {
  if (!tags) return undefined
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag)).filter(Boolean)
  }
  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<PanoramaSceneUploadPayload> & {
      name?: string
    }

    const name = body.name?.trim()
    const id = body.id?.trim() || (name ? slugify(name) : "")

    if (!id) {
      return NextResponse.json({ error: "Scene id or name is required" }, { status: 400 })
    }
    if (!name) {
      return NextResponse.json({ error: "Scene name is required" }, { status: 400 })
    }
    if (!body.imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 })
    }

    const payload: PanoramaSceneUploadPayload = {
      id,
      name,
      imageUrl: body.imageUrl,
      thumbnailUrl: body.thumbnailUrl || body.imageUrl,
      description: body.description,
      ambientSound: body.ambientSound,
      sceneType: body.sceneType ?? "interior",
      floor: body.floor,
      tags: parseTags(body.tags),
      initialView: parseInitialView(body.initialView),
    }

    const scene = await uploadScene(payload)
    return NextResponse.json({ scene }, { status: 201 })
  } catch (error) {
    console.error("Failed to upload panorama scene", error)
    return NextResponse.json({ error: "Unable to upload scene" }, { status: 500 })
  }
}
