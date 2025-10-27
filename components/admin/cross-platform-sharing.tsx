"use client"

import type { CrossPlatformShare } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Copy, ExternalLink, Check } from "@/lib/icons"
import { useState } from "react"

interface CrossPlatformSharingProps {
  propertyId: string
  sharing: CrossPlatformShare
}

export function CrossPlatformSharing({ propertyId, sharing }: CrossPlatformSharingProps) {
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

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
    const link = sharing.shareLinks?.[platform] || `https://baladshelter.com/property/${propertyId}`
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
    const link = sharing.shareLinks?.[platform] || `https://baladshelter.com/property/${propertyId}`
    if (typeof window !== "undefined") {
      window.open(link, "_blank", "noopener,noreferrer")
    }
  }

  const copyEmbedCode = async () => {
    const embed = `<iframe src="https://baladshelter.com/property/${propertyId}" width="100%" height="600" frameborder="0"></iframe>`
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Share Across Platforms</h3>
        <p className="text-gray-600 mb-6">
          Expand your property's reach by sharing on multiple real estate and social media platforms.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => {
            const isEnabled = sharing.platforms[platform.key as keyof typeof sharing.platforms]
            return (
              <div
                key={platform.key}
                className={`p-4 border rounded-lg transition-all ${
                  isEnabled ? "border-green-300 bg-green-50" : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{platform.name}</p>
                    <p className="text-sm text-gray-600">{platform.description}</p>
                  </div>
                  <span className="text-2xl">{platform.icon}</span>
                </div>

                {isEnabled && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(platform.key)}
                      className="flex-1 gap-2"
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
                    <Button size="sm" variant="outline" onClick={() => handleOpenLink(platform.key)} className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {!isEnabled && <p className="text-sm text-gray-500">Not enabled for this property</p>}
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Embed Code</h3>
        <p className="text-gray-600 mb-4">Embed this property tour on your website:</p>
        <div className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code className="text-green-400 text-sm font-mono">
            {`<iframe src="https://baladshelter.com/property/${propertyId}" width="100%" height="600" frameborder="0"></iframe>`}
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
