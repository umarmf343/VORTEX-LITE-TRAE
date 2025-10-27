"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "@/lib/icons"

interface EmbedCodeGeneratorProps {
  propertyId: string
  propertyName: string
}

export function EmbedCodeGenerator({ propertyId, propertyName }: EmbedCodeGeneratorProps) {
  const [copied, setCopied] = useState(false)

  const embedCode = `<iframe
  src="${typeof window !== "undefined" ? window.location.origin : "https://example.com"}?property=${propertyId}"
  width="100%"
  height="600"
  frameborder="0"
  allowfullscreen
  style="border: none; border-radius: 8px;"
></iframe>`

  const handleCopy = async () => {
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard API is not available")
      }
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy embed code", error)
      setCopied(false)
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Embed Code for {propertyName}</h3>
      <div className="bg-gray-900 p-4 rounded mb-4 overflow-x-auto">
        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">{embedCode}</pre>
      </div>
      <Button onClick={handleCopy} className="gap-2">
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy Code"}
      </Button>
    </Card>
  )
}
