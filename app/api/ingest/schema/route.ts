import { NextResponse } from "next/server"

import { registerIngestJobSchema } from "@/lib/server/ingest-control-plane"

export async function GET() {
  const state = await registerIngestJobSchema()
  return NextResponse.json({
    version: state.schemaVersion,
    queues: state.queues,
    schema: state.schema,
    status_webhooks: state.statusWebhooks,
  })
}
