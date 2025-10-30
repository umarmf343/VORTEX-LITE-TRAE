import Link from "next/link"

import { Button } from "@/components/ui/button"

const docsBase = "/docs/pipeline"

const docLinks = [
  { label: "Component Inventory", href: `${docsBase}/component-inventory.csv` },
  { label: "Capture Guidance", href: `${docsBase}/capture-guidance.md` },
  { label: "Ingest Job Schema", href: `${docsBase}/ingest-job-schema.json` },
  { label: "Processing Blueprint", href: `${docsBase}/processing-pipeline.md` },
  { label: "Viewer UX Spec", href: `${docsBase}/viewer-ux-spec.md` },
  { label: "QA Test Matrix", href: `${docsBase}/qa-test-matrix.md` }
]

export default function IngestOperationsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Immersive Pipeline Control Plane</h1>
        <p className="text-muted-foreground">
          Launch ingest jobs, review capture guidance, and coordinate processing resources for the 3D walkthrough pipeline.
        </p>
      </header>

      <section className="grid gap-4 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Start a New Ingest Job</h2>
        <p className="text-sm text-muted-foreground">
          Upload your capture manifest and raw assets to create a job in the asynchronous pipeline. The schema enforces
          dimensional accuracy, privacy flags, and webhook notifications for publish events.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/api/ingest/start">Launch Ingest Control</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/ingest/schema" prefetch={false}>
              Download Schema (JSON)
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/docs/pipeline/ingest-manifest-example.json" prefetch={false}>
              View Manifest Example
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Operational Resources</h2>
        <p className="text-sm text-muted-foreground">
          Reference material for capture teams, processing operators, and QA leads.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {docLinks.map((doc) => (
            <li key={doc.href}>
              <Link className="text-primary underline-offset-4 hover:underline" href={doc.href} prefetch={false}>
                {doc.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 rounded-lg border bg-background p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Provisioning Checklist</h2>
        <p className="text-sm text-muted-foreground">
          Coordinate with infrastructure to ensure GPU workers, storage, and queues are sized for the pilot rollout.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Approve the pilot GPU worker pool request (2× NVIDIA A40, 16 vCPU, 128 GB RAM).</li>
          <li>Provision CPU preprocessing nodes and configure message broker namespaces.</li>
          <li>Enable audit logging and privacy redaction toggles on ingest jobs prior to publish.</li>
          <li>Set up analytics dashboards for viewer engagement and QA completion rates.</li>
        </ul>
      </section>
    </div>
  )
}
