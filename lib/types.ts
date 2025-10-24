export interface Property {
  id: string
  name: string
  address: string
  price: number
  bedrooms: number
  bathrooms: number
  sqft: number
  description: string
  images: string[]
  thumbnail: string
  createdAt: Date
  updatedAt: Date
  branding: BrandingConfig
  scenes: Scene[]
  stats: PropertyStats
  floorPlan?: string
  dayNightImages?: { day: string; night: string }
  isFavorite?: boolean
  tags?: string[]
}

export interface Scene {
  id: string
  name: string
  imageUrl: string
  hotspots: Hotspot[]
  measurements: Measurement[]
  annotations: Annotation[]
  order: number
  thumbnail?: string
  dwellTime?: number
  viewCount?: number
}

export interface Hotspot {
  id: string
  x: number
  y: number
  type: "info" | "link" | "cta" | "video" | "audio" | "image"
  title: string
  description: string
  targetSceneId?: string
  actionUrl?: string
  mediaUrl?: string
  clickCount?: number
}

export interface Measurement {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  distance: number
  unit: "ft" | "m"
}

export interface Annotation {
  id: string
  x: number
  y: number
  text: string
  color: string
}

export interface BrandingConfig {
  primaryColor: string
  secondaryColor: string
  logo: string
  companyName: string
  contactEmail: string
  contactPhone: string
  customCSS?: string
  whiteLabelMode?: boolean
}

export interface Visitor {
  id: string
  propertyId: string
  sessionId: string
  email?: string
  name?: string
  phone?: string
  visitedAt: Date
  duration: number
  scenesViewed: string[]
  hotspotClicks: number
  measurements: number
  leadQuality: "hot" | "warm" | "cold"
  sceneEngagement?: Record<string, SceneEngagement>
  deviceType?: "mobile" | "desktop" | "vr"
  referralSource?: string
}

export interface SceneEngagement {
  sceneId: string
  viewCount: number
  dwellTime: number
  hotspotInteractions: Record<string, number>
}

export interface PropertyStats {
  totalVisits: number
  uniqueVisitors: number
  avgDuration: number
  conversionRate: number
  leadsGenerated: number
  lastUpdated: Date
  hotspotEngagement?: Record<string, number>
  scenePopularity?: Record<string, number>
}

export interface Lead {
  id: string
  propertyId: string
  name: string
  email: string
  phone: string
  message: string
  visitDuration: number
  scenesViewed: number
  createdAt: Date
  status: "new" | "contacted" | "qualified" | "lost"
  notes: string
  source?: string
}

export interface CaptureService {
  id: string
  propertyId?: string
  clientName: string
  clientEmail: string
  clientPhone: string
  propertyAddress: string
  serviceType: "basic" | "premium" | "vr"
  status: "pending" | "scheduled" | "completed" | "cancelled"
  scheduledDate?: Date
  notes: string
  createdAt: Date
}

export interface PropertyReport {
  propertyId: string
  generatedAt: Date
  totalVisits: number
  uniqueVisitors: number
  avgDuration: number
  conversionRate: number
  leadsGenerated: number
  topScenes: Array<{ sceneId: string; views: number }>
  topHotspots: Array<{ hotspotId: string; clicks: number }>
  visitorDemographics?: any
}

export interface FloorPlan {
  id: string
  name: string
  imageUrl: string
  rooms: Room[]
  scale: number
}

export interface Room {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  sceneId?: string
  color: string
  dimensions?: string
}

export interface AreaMeasurement extends Measurement {
  type: "distance" | "area" | "volume"
  area?: number
  volume?: number
}

export interface SceneTransition {
  fromSceneId: string
  toSceneId: string
  type: "fade" | "slide"
  duration: number
}

export interface DayNightMode {
  dayImageUrl: string
  nightImageUrl: string
  currentMode: "day" | "night"
}

export interface PropertyComparison {
  id: string
  propertyIds: string[]
  createdAt: Date
  sharedWith?: string[]
}

export interface EcommerceHotspot extends Hotspot {
  productId?: string
  productName?: string
  price?: number
  quantity?: number
}

export interface VRSettings {
  enabled: boolean
  stereoMode: boolean
  cardboardMode: boolean
  gyroscopeEnabled: boolean
}

export interface AdvancedAnalyticsReport {
  propertyId: string
  generatedAt: Date
  period: "day" | "week" | "month"
  totalVisits: number
  uniqueVisitors: number
  avgDuration: number
  conversionRate: number
  leadsGenerated: number
  deviceBreakdown: Record<string, number>
  referralSources: Record<string, number>
  sceneEngagement: Record<string, SceneEngagementMetrics>
  hotspotPerformance: Record<string, HotspotMetrics>
  visitorJourney: VisitorJourneyStep[]
  exportFormat?: "pdf" | "json" | "csv"
}

export interface SceneEngagementMetrics {
  sceneId: string
  sceneName: string
  views: number
  avgDwellTime: number
  exitRate: number
  nextSceneTransitions: Record<string, number>
}

export interface HotspotMetrics {
  hotspotId: string
  title: string
  clicks: number
  clickRate: number
  conversionRate: number
}

export interface VisitorJourneyStep {
  timestamp: Date
  sceneId: string
  action: string
  duration: number
}

export interface BookingSlot {
  id: string
  propertyId: string
  date: Date
  time: string
  duration: number
  available: boolean
  bookedBy?: string
}

export interface PropertyMerge {
  id: string
  name: string
  properties: string[]
  floorOrder: string[]
  createdAt: Date
}

export interface CrossPlatformShare {
  propertyId: string
  platforms: {
    googleStreetView?: boolean
    vrbo?: boolean
    realtorCom?: boolean
    zillow?: boolean
    facebook?: boolean
    twitter?: boolean
    linkedin?: boolean
  }
  shareLinks?: Record<string, string>
}

export interface CustomBranding extends BrandingConfig {
  customCSS?: string
  customJavaScript?: string
  whiteLabel?: boolean
  removeBranding?: boolean
  customDomain?: string
  faviconUrl?: string
}

export interface ProductHotspot extends Hotspot {
  productId?: string
  productName?: string
  price?: number
  quantity?: number
  inStock?: boolean
}

export interface RoomLabel {
  id: string
  sceneId: string
  roomName: string
  dimensions: string
  area: number
  x: number
  y: number
}

export interface PropertyMergeConfig {
  id: string
  name: string
  properties: string[]
  floorOrder: string[]
  createdAt: Date
}

export interface TechnicianProfile {
  id: string
  name: string
  email: string
  phone: string
  specialization: "basic" | "premium" | "vr"
  availability: Date[]
  completedJobs: number
  rating: number
}

export interface CSSCustomization {
  propertyId: string
  customCSS: string
  customJavaScript?: string
  whiteLabel: boolean
  removeBranding: boolean
  customDomain?: string
  faviconUrl?: string
}

export interface BackgroundAudio {
  sceneId: string
  audioUrl: string
  volume: number
  loop: boolean
  autoPlay: boolean
}

export interface ViewMode {
  type: "first-person" | "dollhouse" | "floor-plan" | "360"
  enabled: boolean
}

export interface SceneType {
  type: "cube" | "sphere" | "cylinder" | "equirectangular"
  imageUrl: string
}
