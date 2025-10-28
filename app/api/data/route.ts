import { NextRequest, NextResponse } from "next/server"

import {
  addCaptureService,
  addModel,
  addPropertyMerge,
  addSceneType,
  assignTechnicianToService,
  bookSlot as storeBookSlot,
  createLead,
  createProperty,
  deleteModel,
  deleteProperty,
  deleteSceneType,
  getDataSnapshot,
  patchCaptureService,
  patchLead,
  recordVisitor,
  removePropertyMerge,
  updateBrandingSettings,
  updateProperty,
  upsertShare,
} from "@/lib/server/data-store"
import type {
  CaptureService,
  CrossPlatformShare,
  CSSCustomization,
  Lead,
  Model3DAsset,
  PropertyMerge,
  SceneTypeConfig,
  Visitor,
} from "@/lib/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const data = await getDataSnapshot()
  return NextResponse.json({ data })
}

interface ActionRequest {
  action: string
  payload?: unknown
}

const toDate = (value: unknown) => {
  if (!value) return undefined
  const date = new Date(value as string)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export async function POST(request: NextRequest) {
  try {
    const { action, payload } = (await request.json()) as ActionRequest

    switch (action) {
      case "createProperty": {
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid payload for createProperty")
        }
        const property = await createProperty(payload as Parameters<typeof createProperty>[0])
        return NextResponse.json({ property }, { status: 201 })
      }
      case "updateProperty": {
        const body = payload as { id?: string; updates?: Record<string, unknown> }
        if (!body?.id || !body?.updates) {
          throw new Error("Property id and updates are required")
        }
        const updated = await updateProperty(body.id, body.updates)
        if (!updated) {
          return NextResponse.json({ error: "Property not found" }, { status: 404 })
        }
        return NextResponse.json({ property: updated })
      }
      case "deleteProperty": {
        const body = payload as { id?: string }
        if (!body?.id) {
          throw new Error("Property id is required")
        }
        const deleted = await deleteProperty(body.id)
        return NextResponse.json({ deleted })
      }
      case "addLead": {
        const leadPayload = payload as Lead
        if (!leadPayload?.id) {
          throw new Error("Lead payload missing id")
        }
        const record = await createLead({
          ...leadPayload,
          createdAt: leadPayload.createdAt ?? new Date(),
        })
        return NextResponse.json({ lead: record }, { status: 201 })
      }
      case "updateLead": {
        const body = payload as { id?: string; updates?: Partial<Lead> }
        if (!body?.id || !body?.updates) {
          throw new Error("Lead id and updates are required")
        }
        const updated = await patchLead(body.id, body.updates)
        if (!updated) {
          return NextResponse.json({ error: "Lead not found" }, { status: 404 })
        }
        return NextResponse.json({ lead: updated })
      }
      case "addVisitor": {
        const visitor = payload as Visitor
        if (!visitor?.id) {
          throw new Error("Visitor payload missing id")
        }
        const stored = await recordVisitor({
          ...visitor,
          visitedAt: visitor.visitedAt ?? new Date(),
        })
        return NextResponse.json({ visitor: stored }, { status: 201 })
      }
      case "updateCaptureService": {
        const body = payload as { id?: string; updates?: Partial<CaptureService> }
        if (!body?.id || !body?.updates) {
          throw new Error("Capture service id and updates are required")
        }
        const sanitizedUpdates: Partial<CaptureService> = {
          ...body.updates,
          createdAt: toDate(body.updates.createdAt),
          scheduledDate: toDate(body.updates.scheduledDate),
        }
        const updated = await patchCaptureService(body.id, sanitizedUpdates)
        if (!updated) {
          return NextResponse.json({ error: "Capture service not found" }, { status: 404 })
        }
        return NextResponse.json({ captureService: updated })
      }
      case "assignTechnician": {
        const body = payload as { serviceId?: string; technicianId?: string }
        if (!body?.serviceId || !body?.technicianId) {
          throw new Error("Service and technician ids are required")
        }
        const updated = await assignTechnicianToService(body.serviceId, body.technicianId)
        if (!updated) {
          return NextResponse.json({ error: "Capture service not found" }, { status: 404 })
        }
        return NextResponse.json({ captureService: updated })
      }
      case "createCaptureService": {
        const service = payload as CaptureService
        if (!service?.id) {
          throw new Error("Capture service payload missing id")
        }
        const stored = await addCaptureService({
          ...service,
          createdAt: service.createdAt ?? new Date(),
          scheduledDate: service.scheduledDate,
        })
        return NextResponse.json({ captureService: stored }, { status: 201 })
      }
      case "bookSlot": {
        const body = payload as {
          slotId?: string
          booking?: { name?: string; email?: string; phone?: string }
        }
        if (!body?.slotId || !body.booking?.name || !body.booking.email) {
          throw new Error("Slot id, name, and email are required to book")
        }
        const result = await storeBookSlot(body.slotId, {
          name: body.booking.name,
          email: body.booking.email,
          phone: body.booking.phone,
        })
        return NextResponse.json({ result })
      }
      case "createPropertyMerge": {
        const merge = payload as PropertyMerge
        if (!merge?.id) {
          throw new Error("Merge payload missing id")
        }
        const stored = await addPropertyMerge({
          ...merge,
          createdAt: merge.createdAt ?? new Date(),
        })
        return NextResponse.json({ merge: stored }, { status: 201 })
      }
      case "deletePropertyMerge": {
        const body = payload as { id?: string }
        if (!body?.id) {
          throw new Error("Merge id is required")
        }
        const deleted = await removePropertyMerge(body.id)
        return NextResponse.json({ deleted })
      }
      case "upsertShare": {
        const share = payload as CrossPlatformShare
        if (!share?.propertyId) {
          throw new Error("Share payload missing propertyId")
        }
        const stored = await upsertShare(share)
        return NextResponse.json({ share: stored })
      }
      case "addModel": {
        const model = payload as Model3DAsset
        if (!model?.id) {
          throw new Error("Model payload missing id")
        }
        const stored = await addModel(model)
        return NextResponse.json({ model: stored }, { status: 201 })
      }
      case "deleteModel": {
        const body = payload as { id?: string }
        if (!body?.id) {
          throw new Error("Model id is required")
        }
        const deleted = await deleteModel(body.id)
        return NextResponse.json({ deleted })
      }
      case "addSceneType": {
        const config = payload as SceneTypeConfig
        if (!config?.id) {
          throw new Error("Scene type payload missing id")
        }
        const stored = await addSceneType(config)
        return NextResponse.json({ sceneType: stored }, { status: 201 })
      }
      case "deleteSceneType": {
        const body = payload as { id?: string }
        if (!body?.id) {
          throw new Error("Scene type id is required")
        }
        const deleted = await deleteSceneType(body.id)
        return NextResponse.json({ deleted })
      }
      case "updateBranding": {
        const body = payload as { propertyId?: string; branding?: CSSCustomization }
        if (!body?.propertyId || !body.branding) {
          throw new Error("Property id and branding payload are required")
        }
        const branding = await updateBrandingSettings(body.propertyId, body.branding)
        return NextResponse.json({ branding })
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
  } catch (error) {
    console.error("Data API error", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    )
  }
}
