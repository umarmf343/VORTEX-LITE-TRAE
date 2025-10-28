"use client"

import type { CrossPlatformShare } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Copy, ExternalLink, Check } from "@/lib/icons"
import { useEffect, useState } from "react"

interface CrossPlatformSharingProps {
  propertyId: string
  sharing: CrossPlatformShare
  onSave?: (share: CrossPlatformShare) => Promise<void> | void
}

export function CrossPlatformSharing({ propertyId, sharing, onSave }: CrossPlatformSharingProps) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [draft, setDraft] = useState<CrossPlatformShare>(sharing)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setDraft(sharing)
  }, [sharing])

  const platforms = [
    {
      name: "Google Street View",
      key: "googleStreetView",
      icon: "🗺️",
      description: "Share on Google Street View",
    },
    {
      name: "VRBO",
      key: "vrbo",
      icon: "🏠",
      description: "Share on VRBO (Vacation Rental By Owner)",
    },
    {
      name: "Realtor.com",
      key: "realtorCom",
      icon: "🏢",
      description: "Share on Realtor.com",
    },
    {
      name: "Zillow",
      key: "zillow",
      icon: "📊",
      description: "Share on Zillow",
    },
    {
      name: "Facebook",
      key: "facebook",
      icon: "f",
      description: "Share on Facebook",
    },
    {
      name: "Twitter",
      key: "twitter",
      icon: "𝕏",
      description: "Share on Twitter/X",
    },
    {
      name: "LinkedIn",
      key: "linkedin",
      icon: "in",
      description: "Share on LinkedIn",
    },
  ]

  const handleCopyLink = async (platform: string) => {
    const link = draft.shareLinks?.[platform] || `https://baladshelter.com/embed/${propertyId}`
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard API is not available")
      }
      await navigator.clipboard.writeText(link)
      setCopiedLink(platform)
      setTimeout(() => setCopiedLink(null), 2000)
    } catch (error) {
      console.error("Failed to copy sharing link", error)
      setCopiedLink(null)
    }
  }

  const handleOpenLink = (platform: string) => {
    const link = draft.shareLinks?.[platform] || `https://baladshelter.com/embed/${propertyId}`
    if (typeof window !== "undefined") {
      window.open(link, "_blank", "noopener,noreferrer")
    }
  }

  const copyEmbedCode = async () => {
    const embed = `<iframe src="https://baladshelter.com/embed/${propertyId}" width="100%" height="600" style="border:0;" allowfullscreen loading="lazy"></iframe>`
    try {
      if (!navigator?.clipboard) {
        throw new Error("Clipboard API is not available")
      }
      await navigator.clipboard.writeText(embed)
      alert("Embed code copied!")
    } catch (error) {
      console.error("Failed to copy embed code", error)
    }
  }

  const handleTogglePlatform = (platformKey: keyof CrossPlatformShare["platforms"], value: boolean) => {
    setDraft((previous) => ({
      ...previous,
      platforms: {
        ...previous.platforms,
        [platformKey]: value,
      },
    }))
  }

  const handleLinkChange = (
    platformKey: keyof CrossPlatformShare["platforms"],
    value: string,
  ) => {
    setDraft((previous) => ({
      ...previous,
      shareLinks: {
        ...previous.shareLinks,
        [platformKey]: value,
      },
    }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!onSave) {
      return
    }
    try {
      setIsSaving(true)
      await onSave({ ...draft, propertyId })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Share Across Platforms</h3>
        <p className="text-gray-600 mb-6">
          Expand your property's reach by enabling and customizing links for each marketing channel.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {platforms.map((platform) => {
              const platformKey = platform.key as keyof CrossPlatformShare["platforms"]
              const isEnabled = draft.platforms[platformKey]
              return (
                <div key={platform.key} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{platform.name}</p>
                      <p className="text-sm text-gray-600">{platform.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(value) => handleTogglePlatform(platformKey, value)}
                      aria-label={`Toggle ${platform.name}`}
                    />
                  </div>
                  <div className="mb-3 text-2xl">{platform.icon}</div>
                  {isEnabled ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`${platform.key}-link`}>Destination URL</Label>
                        <Input
                          id={`${platform.key}-link`}
                          value={draft.shareLinks?.[platform.key] ?? ""}
                          placeholder={`https://platform.com/listings/${propertyId}`}
                          onChange={(event) => handleLinkChange(platformKey, event.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyLink(platform.key)}
                          className="flex-1 gap-2"
                          type="button"
                        >
                          {copiedLink === platform.key ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenLink(platform.key)}
                          className="gap-2"
                          type="button"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Disabled for this listing</p>
                  )}
                </div>
              )
            })}
          </div>

          {onSave ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save sharing settings"}
              </Button>
            </div>
          ) : null}
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Embed Code</h3>
        <p className="text-gray-600 mb-4">
          Drop this snippet into your website or marketing landing page to feature the interactive tour.
        </p>
        <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code className="text-green-400 text-sm font-mono">
            {`<iframe src="https://baladshelter.com/embed/${propertyId}" width="100%" height="600" style="border:0;" allowfullscreen loading="lazy"></iframe>`}
          </code>
        </div>
        <Button onClick={copyEmbedCode} className="mt-4">
          Copy Embed Code
        </Button>
      </Card>
    </div>
  )
}

export default CrossPlatformSharing
