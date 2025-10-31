"use client"

import { useEffect, useMemo, useState } from "react"

import type { Property, ViewerManifest } from "@/lib/types"
import { logShareEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Copy, Check, ExternalLink, Share2 } from "@/lib/icons"

interface SharePanelProps {
  property: Property
  viewerManifest: ViewerManifest | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CopyState {
  link?: boolean
  iframe?: boolean
  javascript?: boolean
  css?: boolean
}

const SOCIAL_TARGETS = [
  {
    id: "facebook",
    label: "Facebook",
    buildUrl: (shareUrl: string, _text?: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
  },
  {
    id: "twitter",
    label: "X (Twitter)",
    buildUrl: (shareUrl: string, text?: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    buildUrl: (shareUrl: string, _text?: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
  },
  {
    id: "email",
    label: "Email",
    buildUrl: (shareUrl: string, text?: string) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${shareUrl}`)}`,
  },
] as const

const sortModes = (modes: string[]) => {
  const order = ["walkthrough", "floorplan", "dollhouse", "gallery"]
  return [...modes].sort((a, b) => order.indexOf(a) - order.indexOf(b))
}

export function SharePanel({ property, viewerManifest, open, onOpenChange }: SharePanelProps) {
  const { toast } = useToast()
  const tokens = property.sharing.tokens ?? []
  const defaultTokenId = property.sharing.defaultTokenId ?? tokens[0]?.id
  const [selectedTokenId, setSelectedTokenId] = useState<string | undefined>(defaultTokenId)
  const [copyState, setCopyState] = useState<CopyState>({})

  useEffect(() => {
    if (!tokens.length) {
      setSelectedTokenId(undefined)
      return
    }
    if (!selectedTokenId || !tokens.some((token) => token.id === selectedTokenId)) {
      setSelectedTokenId(defaultTokenId)
    }
  }, [defaultTokenId, selectedTokenId, tokens])

  const availableModes = useMemo(() => {
    const modes = new Set<string>(["walkthrough"])
    const viewConfig = property.sharing.customizationOptions
    if (viewConfig?.allowViewMode) {
      if (viewerManifest?.views.floorplan?.projection_url || property.sharing.embedDefaults.allowFloorplan) {
        modes.add("floorplan")
      }
      if (viewerManifest?.views.dollhouse?.model_url || property.sharing.embedDefaults.allowDollhouse) {
        modes.add("dollhouse")
      }
    }
    return sortModes(Array.from(modes))
  }, [property.sharing.customizationOptions, property.sharing.embedDefaults, viewerManifest?.views.dollhouse, viewerManifest?.views.floorplan])

  const defaultStartNode = useMemo(() => {
    if (property.sharing.embedDefaults.startNode) {
      return property.sharing.embedDefaults.startNode
    }
    if (viewerManifest?.navigation.camera_nodes?.[0]?.id) {
      return viewerManifest.navigation.camera_nodes[0].id
    }
    return property.scenes?.[0]?.id ?? null
  }, [property.scenes, property.sharing.embedDefaults.startNode, viewerManifest?.navigation.camera_nodes])

  const [startNode, setStartNode] = useState<string | null>(defaultStartNode)
  const [viewMode, setViewMode] = useState<string>(property.sharing.embedDefaults.viewMode ?? availableModes[0] ?? "walkthrough")
  const [branding, setBranding] = useState<boolean>(property.sharing.embedDefaults.branding)
  const [autoplay, setAutoplay] = useState<boolean>(property.sharing.embedDefaults.autoplay)
  const [floorplanToggle, setFloorplanToggle] = useState<boolean>(property.sharing.embedDefaults.allowFloorplan)
  const [dollhouseToggle, setDollhouseToggle] = useState<boolean>(property.sharing.embedDefaults.allowDollhouse)
  const [fullscreenToggle, setFullscreenToggle] = useState<boolean>(property.sharing.embedDefaults.allowFullscreen)
  const [chromeless, setChromeless] = useState<boolean>(property.sharing.embedDefaults.allowUiChrome === false)
  const [minHeight, setMinHeight] = useState<number>(property.sharing.embedDefaults.height ?? 640)
  const [aspectRatio, setAspectRatio] = useState<string>(property.sharing.embedDefaults.aspectRatio ?? "56.25%")

  useEffect(() => {
    if (!open) {
      return
    }
    setStartNode(defaultStartNode)
    setViewMode(property.sharing.embedDefaults.viewMode ?? availableModes[0] ?? "walkthrough")
    setBranding(property.sharing.embedDefaults.branding)
    setAutoplay(property.sharing.embedDefaults.autoplay)
    setFloorplanToggle(property.sharing.embedDefaults.allowFloorplan)
    setDollhouseToggle(property.sharing.embedDefaults.allowDollhouse)
    setFullscreenToggle(property.sharing.embedDefaults.allowFullscreen)
    setChromeless(property.sharing.embedDefaults.allowUiChrome === false)
    setMinHeight(property.sharing.embedDefaults.height ?? 640)
    setAspectRatio(property.sharing.embedDefaults.aspectRatio ?? "56.25%")
    setCopyState({})
  }, [availableModes, defaultStartNode, open, property.sharing.embedDefaults])

  const selectedToken = tokens.find((token) => token.id === selectedTokenId)
  const shareToken = selectedToken?.token ?? viewerManifest?.access.token ?? ""

  const shareUrl = useMemo(() => {
    const base = new URL(property.sharing.sharePath ?? "/view", property.sharing.canonicalHost)
    base.searchParams.set("space_id", property.id)
    base.searchParams.set("mode", viewMode)
    if (shareToken) {
      base.searchParams.set("token", shareToken)
    }
    if (startNode) {
      base.searchParams.set("start", startNode)
    }
    base.searchParams.set("utm_source", "share-panel")
    base.searchParams.set("utm_medium", "link")
    if (selectedTokenId) {
      base.searchParams.set("utm_campaign", `token-${selectedTokenId}`)
    }
    if (autoplay) {
      base.searchParams.set("autoplay", "1")
    }
    if (!branding) {
      base.searchParams.set("branding", "0")
    }
    return base.toString()
  }, [autoplay, branding, property.id, property.sharing.canonicalHost, property.sharing.sharePath, shareToken, startNode, selectedTokenId, viewMode])

  const embedUrl = useMemo(() => {
    const base = new URL(property.sharing.embedPath ?? "/embed", property.sharing.canonicalHost)
    base.searchParams.set("space_id", property.id)
    base.searchParams.set("mode", viewMode)
    if (shareToken) {
      base.searchParams.set("token", shareToken)
    }
    if (startNode) {
      base.searchParams.set("start", startNode)
    }
    base.searchParams.set("utm_source", "share-panel")
    base.searchParams.set("utm_medium", "embed")
    if (autoplay) {
      base.searchParams.set("autoplay", "1")
    }
    if (!branding) {
      base.searchParams.set("branding", "0")
    }
    if (!floorplanToggle) {
      base.searchParams.set("floorplan", "0")
    }
    if (!dollhouseToggle) {
      base.searchParams.set("dollhouse", "0")
    }
    if (!fullscreenToggle) {
      base.searchParams.set("fullscreen", "0")
    }
    if (chromeless) {
      base.searchParams.set("chromeless", "1")
    }
    if (selectedTokenId) {
      base.searchParams.set("utm_campaign", `token-${selectedTokenId}`)
    }
    return base.toString()
  }, [autoplay, branding, chromeless, dollhouseToggle, floorplanToggle, fullscreenToggle, property.id, property.sharing.canonicalHost, property.sharing.embedPath, shareToken, startNode, selectedTokenId, viewMode])

  const widgetSrc = useMemo(() => {
    const widgetPath = property.sharing.widgetPath ?? "/embed/widget.js"
    return new URL(widgetPath, property.sharing.canonicalHost).toString()
  }, [property.sharing.canonicalHost, property.sharing.widgetPath])

  const iframeSnippet = useMemo(
    () =>
      `<div class="virtualtour-embed" style="position:relative;width:100%;padding-top:${aspectRatio};min-height:${minHeight}px;">` +
      `<iframe src="${embedUrl}" title="${property.name} virtual tour" loading="lazy" allow="fullscreen; xr-spatial-tracking" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;border-radius:12px;"></iframe></div>`,
    [aspectRatio, embedUrl, minHeight, property.name],
  )

  const responsiveCss = useMemo(
    () =>
      `.virtualtour-embed{position:relative;width:100%;padding-top:${aspectRatio};min-height:${minHeight}px;}` +
      "\n" +
      ".virtualtour-embed iframe{position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:12px;box-shadow:0 10px 30px rgba(15,23,42,0.25);}",
    [aspectRatio, minHeight],
  )

  const javascriptSnippet = useMemo(
    () =>
      `<div class="virtualtour-widget" data-space-id="${property.id}" data-token="${shareToken}" data-mode="${viewMode}"` +
      ` data-branding="${branding ? 1 : 0}" data-autoplay="${autoplay ? 1 : 0}" data-floorplan="${floorplanToggle ? 1 : 0}"` +
      ` data-dollhouse="${dollhouseToggle ? 1 : 0}" data-fullscreen="${fullscreenToggle ? 1 : 0}" data-chromeless="${chromeless ? 1 : 0}"` +
      (startNode ? ` data-start-node="${startNode}"` : "") +
      `></div>\n<script async src="${widgetSrc}" data-space="${property.id}" data-token="${shareToken}" data-track-host="true"></script>`,
    [autoplay, branding, chromeless, dollhouseToggle, floorplanToggle, fullscreenToggle, property.id, shareToken, startNode, viewMode, widgetSrc],
  )

  const resetCopy = (key: keyof CopyState) => {
    setCopyState((previous) => ({ ...previous, [key]: true }))
    setTimeout(() => {
      setCopyState((previous) => ({ ...previous, [key]: false }))
    }, 2500)
  }

  const copyToClipboard = async (value: string, key: keyof CopyState, successMessage: string, eventName: "share_link_generated" | "embed_code_copied", payload: Parameters<typeof logShareEvent>[1]) => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Copied", description: successMessage })
      resetCopy(key)
      logShareEvent(eventName, payload)
    } catch (error) {
      console.error("Failed to copy", error)
      toast({ title: "Copy failed", description: "Please press Ctrl+C / ⌘+C to copy manually.", variant: "destructive" })
    }
  }

  const handleSocialShare = (targetId: string) => {
    if (!shareUrl) return
    const target = SOCIAL_TARGETS.find((item) => item.id === targetId)
    if (!target) return
    const shareText = `Tour: ${property.name}`
    const url = target.buildUrl(shareUrl, shareText)
    window.open(url, targetId === "email" ? "_self" : "_blank", targetId === "email" ? undefined : "noopener,noreferrer")
    logShareEvent("share_link_generated", {
      spaceId: property.id,
      channel: `social:${targetId}`,
      token: shareToken,
      parameters: { mode: viewMode, start: startNode },
    })
  }

  const handleOpenApp = () => {
    const deepLink = property.sharing.pwa?.deepLink
    if (!deepLink) return
    logShareEvent("mobile_app_opened", {
      spaceId: property.id,
      channel: "pwa",
      token: shareToken,
    })
    window.location.href = deepLink
  }

  const startNodeOptions = property.scenes
    .filter((scene) => Boolean(scene.id))
    .map((scene) => ({ id: scene.id, name: scene.name }))

  const embedDisabled = !viewerManifest?.embed_allowed && property.sharing.embedAllowed === false

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Share &amp; Embed tour</DialogTitle>
          <DialogDescription>
            Generate secure share links, responsive embed snippets, and social-ready previews for {property.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8 py-2">
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <Label htmlFor="share-url">Share link</Label>
                <p className="text-sm text-muted-foreground">
                  Canonical share URL respecting access controls and tracking tokens.
                </p>
              </div>
              {property.sharing.pwa?.deepLink && (
                <Button variant="secondary" size="sm" onClick={handleOpenApp}>
                  Open in app
                </Button>
              )}
            </div>
            {tokens.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="share-token">Access token</Label>
                <Select value={selectedTokenId} onValueChange={setSelectedTokenId}>
                  <SelectTrigger id="share-token" className="w-full sm:w-72">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {tokens.map((token) => (
                      <SelectItem key={token.id} value={token.id}>
                        {token.label ?? token.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedToken && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {selectedToken.expiresAt && <Badge variant="outline">Expires {new Date(selectedToken.expiresAt).toLocaleDateString()}</Badge>}
                    {selectedToken.maxViews ? <Badge variant="outline">Max views {selectedToken.maxViews}</Badge> : <Badge variant="outline">Unlimited views</Badge>}
                    {Array.isArray(selectedToken.allowedOrigins) && selectedToken.allowedOrigins.length > 0 && (
                      <Badge variant="outline">Origins: {selectedToken.allowedOrigins.join(", ")}</Badge>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input id="share-url" value={shareUrl} readOnly className="font-mono text-xs sm:flex-1" />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareUrl, "link", "Share URL copied", "share_link_generated", {
                    spaceId: property.id,
                    channel: "link",
                    token: shareToken,
                    parameters: { mode: viewMode, start: startNode, branding },
                  })}
                >
                  {copyState.link ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy link
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(shareUrl, "_blank", "noopener,noreferrer")}> 
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SOCIAL_TARGETS.map((target) => (
                <Button
                  key={target.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSocialShare(target.id)}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share on {target.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <Label>Embed options</Label>
              <p className="text-sm text-muted-foreground">
                Customise the responsive iframe snippet. Changes are reflected in the generated code below.
              </p>
            </div>
            {!embedDisabled ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-node">Start node</Label>
                  <Select
                    disabled={!property.sharing.customizationOptions.allowStartNode || !startNodeOptions.length}
                    value={startNode ?? undefined}
                    onValueChange={(value) => setStartNode(value)}
                  >
                    <SelectTrigger id="start-node">
                      <SelectValue placeholder="First panorama" />
                    </SelectTrigger>
                    <SelectContent>
                      {startNodeOptions.map((scene) => (
                        <SelectItem key={scene.id} value={scene.id}>
                          {scene.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="view-mode">Initial mode</Label>
                  <Select
                    disabled={!property.sharing.customizationOptions.allowViewMode}
                    value={viewMode}
                    onValueChange={setViewMode}
                  >
                    <SelectTrigger id="view-mode">
                      <SelectValue placeholder="Select view" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModes.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min-height">Minimum height (px)</Label>
                  <Input
                    id="min-height"
                    type="number"
                    min={320}
                    value={minHeight}
                    onChange={(event) => setMinHeight(Number(event.target.value) || 0)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aspect-ratio">Aspect ratio padding</Label>
                  <Input
                    id="aspect-ratio"
                    value={aspectRatio}
                    onChange={(event) => setAspectRatio(event.target.value)}
                    placeholder="56.25% for 16:9"
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Show branding</p>
                    <p className="text-xs text-muted-foreground">Toggle VirtualTour chrome and watermark.</p>
                  </div>
                  <Switch
                    checked={branding}
                    onCheckedChange={setBranding}
                    disabled={!property.sharing.customizationOptions.allowBrandingToggle}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Autoplay guided tour</p>
                    <p className="text-xs text-muted-foreground">Start the highlight reel automatically.</p>
                  </div>
                  <Switch
                    checked={autoplay}
                    onCheckedChange={setAutoplay}
                    disabled={!property.sharing.customizationOptions.allowAutoplay}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Floorplan mode</p>
                    <p className="text-xs text-muted-foreground">Allow switching to floorplan view.</p>
                  </div>
                  <Switch
                    checked={floorplanToggle}
                    onCheckedChange={setFloorplanToggle}
                    disabled={!property.sharing.customizationOptions.allowFloorplan}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Dollhouse mode</p>
                    <p className="text-xs text-muted-foreground">Expose the 3D dollhouse toggle.</p>
                  </div>
                  <Switch
                    checked={dollhouseToggle}
                    onCheckedChange={setDollhouseToggle}
                    disabled={!property.sharing.customizationOptions.allowDollhouse}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Fullscreen control</p>
                    <p className="text-xs text-muted-foreground">Allow viewers to enter fullscreen.</p>
                  </div>
                  <Switch
                    checked={fullscreenToggle}
                    onCheckedChange={setFullscreenToggle}
                    disabled={!property.sharing.customizationOptions.allowFullscreen}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">Chromeless mode</p>
                    <p className="text-xs text-muted-foreground">Hide UI chrome for kiosk signage.</p>
                  </div>
                  <Switch
                    checked={chromeless}
                    onCheckedChange={setChromeless}
                    disabled={!property.sharing.customizationOptions.allowUiChrome}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                Embedding has been disabled for this space. Enable it in property settings to generate embed snippets.
              </div>
            )}
          </section>

          {!embedDisabled && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="iframe-snippet">Responsive iframe snippet</Label>
                  <p className="text-sm text-muted-foreground">Paste into any CMS block or HTML widget.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(iframeSnippet, "iframe", "Iframe embed copied", "embed_code_copied", {
                    spaceId: property.id,
                    embedType: "iframe",
                    token: shareToken,
                    parameters: {
                      mode: viewMode,
                      start: startNode,
                      branding,
                      autoplay,
                      floorplan: floorplanToggle,
                      dollhouse: dollhouseToggle,
                      fullscreen: fullscreenToggle,
                      chromeless,
                    },
                  })}
                >
                  {copyState.iframe ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy code
                </Button>
              </div>
              <Textarea id="iframe-snippet" value={iframeSnippet} readOnly className="h-32 font-mono text-xs" />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="responsive-css">Responsive wrapper CSS</Label>
                  <p className="text-sm text-muted-foreground">Apply once globally for custom containers.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(responsiveCss, "css", "CSS helper copied", "embed_code_copied", {
                    spaceId: property.id,
                    embedType: "iframe",
                    token: shareToken,
                    parameters: { snippet: "css" },
                  })}
                >
                  {copyState.css ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy CSS
                </Button>
              </div>
              <Textarea id="responsive-css" value={responsiveCss} readOnly className="h-24 font-mono text-xs" />

              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <Label htmlFor="js-snippet">JavaScript widget</Label>
                  <p className="text-sm text-muted-foreground">Attach for advanced analytics or single-page apps.</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(javascriptSnippet, "javascript", "Widget embed copied", "embed_code_copied", {
                    spaceId: property.id,
                    embedType: "javascript",
                    token: shareToken,
                    parameters: {
                      mode: viewMode,
                      start: startNode,
                      branding,
                      autoplay,
                      floorplan: floorplanToggle,
                      dollhouse: dollhouseToggle,
                      fullscreen: fullscreenToggle,
                      chromeless,
                    },
                  })}
                >
                  {copyState.javascript ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy widget
                </Button>
              </div>
              <Textarea id="js-snippet" value={javascriptSnippet} readOnly className="h-32 font-mono text-xs" />
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
