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
  immersiveWalkthrough?: ImmersiveWalkthroughSpace
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
  immersiveWalkthroughOverride?: Partial<ImmersiveWalkthroughSpace>
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

export interface WalkthroughNodeOrientation {
  yaw: number
  pitch?: number
  roll?: number
}

export interface WalkthroughNode {
  id: string
  position: [number, number, number]
  orientation?: WalkthroughNodeOrientation
  connectedTo?: string[]
  navigationTags?: string[]
  tags?: string[]
  floor?: number
  roomId?: string
  label?: string
  transitionDurationMs?: number
  mediaAnchor?: string
}

export type WalkthroughHotspotType = "info" | "media" | "link" | "navigation"

export interface WalkthroughHotspot {
  id: string
  position: [number, number, number]
  orientation?: WalkthroughNodeOrientation
  title: string
  description?: string
  type: WalkthroughHotspotType
  targetNodeId?: string
  mediaUrl?: string
  metadata?: Record<string, unknown>
}

export interface WalkthroughAutoTourConfig {
  enabled?: boolean
  dwellMs?: number
  order?: string[]
  tags?: string[]
}

export interface WalkthroughCaptureMetadata {
  resolution: string
  depthPrecision: string
  originAlignment: boolean
  captureDate?: string
  operator?: string
}

export interface ImmersiveWalkthroughSpace {
  spaceId: string
  defaultNodeId: string
  nodes: WalkthroughNode[]
  hotspots?: WalkthroughHotspot[]
  spatialMeshUrl: string
  textureSetUrl?: string
  hdrEnvironmentUrl?: string
  navigationMeshUrl?: string
  dracoDecoderPath?: string
  materialBoost?: number
  pointerSensitivity?: number
  eyeHeight?: number
  manualWalkEnabled?: boolean
  autoTour?: WalkthroughAutoTourConfig
  captureMetadata?: WalkthroughCaptureMetadata
  bounds?: { width: number; depth: number; height: number }
  lighting?: {
    exposure?: { min: number; max: number }
    probePositions?: Array<[number, number, number]>
  }
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

export type IngestSourceType = "PHOTOGRAMMETRY" | "LIDAR" | "HYBRID" | "PANO_360"

export type IngestJobStatus =
  | "QUEUED"
  | "PROCESSING"
  | "REDUCTION"
  | "FUSION"
  | "TEXTURING"
  | "QA"
  | "PUBLISHED"
  | "FAILED"

export interface IngestJobRawAsset {
  fileName: string
  fileUrl: string
  fileType: "image" | "depthmap" | "pointcloud" | "video"
  fileSize?: number
  captureTimestamp?: string
}

export interface IngestJobMetadata {
  device: string
  captureLocation: {
    latitude: number
    longitude: number
    altitude?: number
  }
  imuData: Record<string, unknown>[]
  gpsAccuracy: number
  lightingCondition?: "DAYLIGHT" | "LOW_LIGHT" | "MIXED"
  notes?: string
}

export interface IngestJob {
  jobId: string
  spaceId: string
  owner: string
  sourceType: IngestSourceType
  rawAssets: IngestJobRawAsset[]
  metadata: IngestJobMetadata
  status: IngestJobStatus
  progress?: number
  createdAt?: string
  updatedAt?: string
}

export interface IngestQueueConfig {
  ingestJobs: string
  processingDispatch: string
  qaNotifications: string
}

export interface IngestStatusWebhookConfig {
  event: string
  status: IngestJobStatus
  enabled: boolean
  description: string
}

export type IngestStatusWebhookMap = Record<string, IngestStatusWebhookConfig>

export interface IngestControlPlaneState {
  schemaVersion: string
  registeredAt: string
  schema: Record<string, unknown>
  queues: IngestQueueConfig
  statusWebhooks: IngestStatusWebhookMap
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

export type ViewerManifestHotspotType = "INFO" | "LINK" | "VIDEO" | "IMAGE" | "AUDIO" | "PRODUCT"

export interface ViewerManifestGeometryLodLevel {
  level: number
  triangle_count: number
  tile_size: number
  description?: string
}

export interface ViewerManifestGeometryTile {
  tile_id: string
  url: string
  lod: number
  bounds: number[]
}

export interface ViewerManifestGeometry {
  lod_levels: ViewerManifestGeometryLodLevel[]
  mesh_tiles: ViewerManifestGeometryTile[]
}

export interface ViewerManifestTexture {
  lod: number
  url: string
  resolution: string
  format: "jpg" | "png" | "ktx2" | "basisu"
}

export interface ViewerManifestCameraNode {
  id: string
  position: number[]
  rotation: number[]
  fov?: number
  thumbnail?: string
}

export interface ViewerManifestConnection {
  from: string
  to: string
  transition_type: "WALK" | "STAIR" | "TELEPORT"
  distance?: number
}

export interface ViewerManifestNavigation {
  camera_nodes: ViewerManifestCameraNode[]
  connections: ViewerManifestConnection[]
}

export interface ViewerManifestWalkthroughView {
  default_node: string
  pathfinding_enabled: boolean
  immersive_space?: ImmersiveWalkthroughSpace
}

export interface ViewerManifestDollhouseView {
  model_url?: string
  scale_factor?: number
  supports_floor_toggle?: boolean
}

export interface ViewerManifestFloorPlanRoom {
  room_id: string
  name: string
  points: number[][]
}

export interface ViewerManifestFloorPlanView {
  projection_url?: string
  room_polygons: ViewerManifestFloorPlanRoom[]
}

export interface ViewerManifestViews {
  walkthrough: ViewerManifestWalkthroughView
  dollhouse: ViewerManifestDollhouseView
  floorplan: ViewerManifestFloorPlanView
}

export interface ViewerManifestHotspot {
  id: string
  type: ViewerManifestHotspotType
  title: string
  content: string
  position: number[]
  media_url?: string
  visible_in_views: Array<"walkthrough" | "dollhouse" | "floorplan">
  author: string
  created_at: string
}

export interface ViewerManifestMeasurement {
  id: string
  point_a: number[]
  point_b: number[]
  distance_meters: number
  created_by: string
}

export interface ViewerManifestAnalytics {
  views_count: number
  average_dwell_time: number
  click_heatmap_url: string
}

export interface ViewerManifestAccess {
  token: string
  permissions: Array<"view" | "measure" | "comment" | "admin">
  expiry: string
}

export interface ViewerManifest {
  space_id: string
  version: string
  owner: string
  created_at: string
  geometry: ViewerManifestGeometry
  textures: ViewerManifestTexture[]
  navigation: ViewerManifestNavigation
  views: ViewerManifestViews
  hotspots: ViewerManifestHotspot[]
  measurements: ViewerManifestMeasurement[]
  analytics?: ViewerManifestAnalytics
  access: ViewerManifestAccess
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
