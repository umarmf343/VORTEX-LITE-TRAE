"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CAPTURE_GUIDANCE_SECTIONS, UNIVERSAL_CAPTURE_GUIDANCE } from "@/lib/capture-guidance"

interface CaptureGuidanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CaptureGuidanceModal({ open, onOpenChange }: CaptureGuidanceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader className="text-left">
          <DialogTitle>Capture Guidance</DialogTitle>
          <DialogDescription>
            Field-ready standards for supported capture modalities. Share with crews before uploading new jobs.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] space-y-6 pr-4 text-sm">
          <div className="space-y-6">
            {CAPTURE_GUIDANCE_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-2">
                <div>
                  <h3 className="text-base font-semibold">{section.title}</h3>
                  <p className="text-muted-foreground">{section.description}</p>
                </div>
                <ul className="list-disc space-y-1 pl-5">
                  {section.checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold">Universal Practices</h3>
            <ul className="list-disc space-y-1 pl-5">
              {UNIVERSAL_CAPTURE_GUIDANCE.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Need the long-form standards or printable checklists? Download the capture playbook from the documentation hub.
          </p>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button asChild>
            <a href="/docs/pipeline/capture-guidance.md" target="_blank" rel="noreferrer">
              Open Full Guidance
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
