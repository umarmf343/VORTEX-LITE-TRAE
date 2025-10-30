export type SceneViewMode =
  | "360"
  | "first-person"
  | "walkthrough"
  | "orbit"
  | "dollhouse"
  | "floor-plan"

export interface DollhouseRoomMetadata {
  id: string
  name: string
  width: number
  depth: number
  height: number
  position: { x: number; y: number; z: number }
  sceneId?: string
  color?: string
  opacity?: number
  tags?: string[]
}

export interface DollhouseFloorMetadata {
  floor: number
  name: string
  height: number
  baseElevation?: number
  rooms: DollhouseRoomMetadata[]
}

export interface DollhouseModel {
  dollhouseId: string
  spaceId: string
  meshUrl?: string
  lodLevels?: string[]
  boundingBox: { width: number; depth: number; height: number }
  floors: DollhouseFloorMetadata[]
  floorGap?: number
  autoRotatePreview?: boolean
  createdAt?: string
  updatedAt?: string
}

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
  floorPlanId?: string
  dayNightImages?: { day: string; night: string }
  isFavorite?: boolean
  tags?: string[]
  sceneTransition?: "fade" | "slide"
  supportedViewModes?: SceneViewMode[]
  matterportModelId?: string
  matterportExperienceLabel?: string
  guidedTours?: GuidedTour[]
  sphrSpace?: SphrSpace
  dollhouseModel?: DollhouseModel
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
  defaultViewMode?: SceneViewMode
  dataLayers?: DataLayer[]
  dollhouseModel?: DollhouseModel
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

export interface MeasurementPoint {
  x: number
  y: number
}

export interface Measurement {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  distance: number
  unit: "ft" | "m" | "in"
  measurementType: "distance" | "area" | "volume"
  label?: string
  points?: MeasurementPoint[]
  height?: number
  createdAt?: string
}

export interface MeasurementExportRecord {
  id: string
  sessionId: string
  sceneId: string
  savedAt: string
  measurements: Measurement[]
}

export interface Annotation {
  id: string
  x: number
  y: number
  text: string
  color: string
  layerId?: string
}

export interface DataLayer {
  id: string
  name: string
  description?: string
  defaultVisible?: boolean
}

export interface TourPoint {
  id: string
  sceneId: string
  sceneName: string
  yaw: number
  pitch: number
  note?: string
  durationSeconds?: number
  highlight?: string
  mediaUrl?: string
}

export interface GuidedTour {
  id: string
  name: string
  description: string
  stops: TourPoint[]
  coverImage?: string
  estimatedDurationMinutes?: number
  callouts?: string[]
  highlightMetrics?: {
    totalStops?: number
    totalDistanceFeet?: number
    featuredScenes?: string[]
  }
}

export type SphrHotspotType = "info" | "navigation" | "media"

export interface SphrHotspot {
  id: string
  title: string
  description?: string
  type: SphrHotspotType
  yaw: number
  pitch: number
  targetNodeId?: string
  mediaUrl?: string
}

export interface SphrSpaceNode {
  id: string
  name: string
  panoramaUrl: string
  hotspots: SphrHotspot[]
  initialYaw?: number
  initialPitch?: number
}

export interface SphrSpace {
  nodes: SphrSpaceNode[]
  initialNodeId: string
  defaultFov?: number
  description?: string
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

export interface Model3DAsset {
  id: string
  propertyId: string
  name: string
  url: string
  format: "gltf" | "glb" | "obj"
  sceneId?: string
  scale: number
}

export interface SceneTypeConfig {
  id: string
  propertyId: string
  sceneId: string
  type: "cube" | "sphere" | "cylinder" | "equirectangular"
  imageUrl: string
  description?: string
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

export interface LeadCapturePayload {
  propertyId: string
  name: string
  email: string
  phone: string
  message: string
  visitDuration: number
  scenesViewed: number
}

export interface SceneEngagementPayload {
  sceneId: string
  dwellTime: number
  totalEngagement: Record<string, number>
}

export interface PropertyStatsSummary {
  totalVisits: number
  uniqueVisitors: number
  avgDuration: number
  leadsGenerated: number
  conversionRate: number
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
  assignedTechnicianId?: string
  notes: string
  createdAt: Date
}

export type IngestSourceType = "photogrammetry" | "rgbd" | "lidar360" | "hybrid"

export type IngestJobState =
  | "queued"
  | "processing"
  | "qa"
  | "publish-ready"
  | "published"
  | "failed"

export interface IngestJobFile {
  uri: string
  sizeBytes: number
  checksum: string
  modality: "image" | "depth" | "pointcloud" | "video" | "imu"
  captureSpan?: {
    startedAt?: string
    endedAt?: string
  }
}

export interface IngestJobCaptureMeta {
  device: {
    model: string
    sensorType: string
    firmware?: string
  }
  timestampUtc: string
  captureAppVersion: string
  imuTimestamps?: string[]
  environment?: {
    lightingNotes?: string
    temperatureC?: number
  }
}

export interface IngestJob {
  jobId: string
  owner: {
    team: string
    submittedBy: string
  }
  sourceType: IngestSourceType
  rawFiles: IngestJobFile[]
  captureMeta: IngestJobCaptureMeta
  locationId: string
  tags: string[]
  priority?: "standard" | "expedited" | "sla-critical"
  qaRequirements?: {
    accuracyToleranceCm?: number
    privacyRedaction?: boolean
    accessLevel?: "internal" | "client" | "public"
  }
  webhookUrls?: string[]
  state?: IngestJobState
}

export interface IngestQueueConfig {
  ingestJobs: string
  processingDispatch: string
  qaNotifications: string
}

export interface IngestControlPlaneState {
  schemaVersion: string
  registeredAt: string
  schema: Record<string, unknown>
  queues: IngestQueueConfig
  notes?: string
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
