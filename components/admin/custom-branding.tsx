"use client"

import type { CSSCustomization } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { Copy, Download } from "@/lib/icons"

interface CustomBrandingProps {
  propertyId: string
  branding?: CSSCustomization
  onSave?: (branding: CSSCustomization) => void
}

export function CustomBranding({ propertyId, branding, onSave }: CustomBrandingProps) {
  const [customCSS, setCustomCSS] = useState(branding?.customCSS || "")
  const [whiteLabel, setWhiteLabel] = useState(branding?.whiteLabel || false)
  const [removeBranding, setRemoveBranding] = useState(branding?.removeBranding || false)
  const [customDomain, setCustomDomain] = useState(branding?.customDomain || "")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!branding) {
      return
    }
    setCustomCSS(branding.customCSS || "")
    setWhiteLabel(branding.whiteLabel)
    setRemoveBranding(branding.removeBranding)
    setCustomDomain(branding.customDomain || "")
  }, [branding])

  const handleSave = () => {
    const updatedBranding: CSSCustomization = {
      propertyId,
      customCSS,
      whiteLabel,
      removeBranding,
      customDomain,
    }
    onSave?.(updatedBranding)
  }

  const handleCopyCSS = async () => {
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard API is not available")
      }
      await navigator.clipboard.writeText(customCSS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy CSS", error)
      setCopied(false)
    }
  }

  const handleDownloadCSS = () => {
    if (typeof document === "undefined") {
      return
    }
    const file = new Blob([customCSS], { type: "text/css" })
    const href = URL.createObjectURL(file)
    const element = document.createElement("a")
    element.href = href
    element.download = `custom-branding-${propertyId}.css`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    URL.revokeObjectURL(href)
  }

  return (
    <div className="space-y-6">
      {/* White Label Options */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">White Label Options</h3>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={whiteLabel}
              onChange={(e) => setWhiteLabel(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Enable White Label Mode</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={removeBranding}
              onChange={(e) => setRemoveBranding(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Remove BaladShelter Branding</span>
          </label>
          <div>
            <label className="block text-sm font-medium mb-2">Custom Domain</label>
            <input
              type="text"
              placeholder="e.g., tours.yourdomain.com"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
            />
          </div>
        </div>
      </Card>

      {/* Custom CSS */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold">Custom CSS</h3>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleCopyCSS} className="gap-2 bg-transparent">
              <Copy className="w-4 h-4" />
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadCSS} className="gap-2 bg-transparent">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>
        <textarea
          value={customCSS}
          onChange={(e) => setCustomCSS(e.target.value)}
          placeholder="/* Add your custom CSS here */
.tour-player {
  background-color: #1a1a1a;
}

.hotspot {
  background-color: #ff6b6b;
}"
          className="w-full h-64 px-3 py-2 border border-gray-300 rounded font-mono text-sm"
        />
        <p className="text-xs text-gray-600 mt-2">
          Add custom CSS to override default styles. Changes apply to all scenes in this property.
        </p>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} className="w-full">
        Save Branding Settings
      </Button>
    </div>
  )
}
