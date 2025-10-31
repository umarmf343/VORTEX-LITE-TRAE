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

export interface PropertyZoneConnection {
  targetZoneId: string
  transitionType: "WALK" | "PATH" | "TELEPORT"
  description?: string
  distanceMeters?: number
  estimatedSeconds?: number
}

export interface PropertyZoneCaptureMetadata {
  captureDate?: string
  captureCrew?: string
  sunOrientation?: IngestJobSunOrientation
  weather?: IngestJobMetadata["weather"]
  gpsTrackUrl?: string
  droneFlightPlan?: IngestJobDroneFlightPlan
  measurementToleranceCm?: number
  calibrationMethod?: "GPS" | "TOTAL_STATION" | "HYBRID" | "NONE"
}

export interface PropertyZone {
  zoneId: string
  name: string
  description?: string
  outdoor: boolean
  spaceIds: string[]
  defaultSpaceId?: string
  siteZoneIdentifier?: string
  campusMapIconUrl?: string
  gpsBounds?: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
    altitudeMeters?: number
  }
  connections?: PropertyZoneConnection[]
  captureMetadata?: PropertyZoneCaptureMetadata
}

export interface PropertyCampusMap {
  imageUrl: string
  tileUrlTemplate?: string
  gpsBounds?: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
  }
  defaultZoneId?: string
}

export type ShareVisibility = "public" | "private" | "token"

export type ShareViewMode = "walkthrough" | "floorplan" | "dollhouse" | "gallery"

export interface ShareAccessToken {
  id: string
  label?: string
  token: string
  expiresAt?: string
  maxViews?: number | null
  allowedOrigins?: string[]
}

export interface ShareEmbedDefaults {
  aspectRatio: string
  height: number
  viewMode: ShareViewMode
  startNode?: string | null
  branding: boolean
  autoplay: boolean
  allowFloorplan: boolean
  allowDollhouse: boolean
  allowFullscreen: boolean
  allowUiChrome: boolean
}

export interface ShareCustomizationOptions {
  allowStartNode: boolean
  allowViewMode: boolean
  allowBrandingToggle: boolean
  allowAutoplay: boolean
  allowFloorplan: boolean
  allowDollhouse: boolean
  allowFullscreen: boolean
  allowUiChrome: boolean
}

export interface ShareSocialMetadata {
  title: string
  description: string
  image?: string | null
  twitterCard?: "summary" | "summary_large_image"
}

export interface ShareTrackingConfig {
  endpoint?: string
  pixelId?: string
}

export interface SharePWAConfig {
  deepLink?: string
  iosAppId?: string
  androidPackage?: string
  installPrompt?: string
}

export interface PropertySharingConfig {
  canonicalHost: string
  sharePath: string
  embedPath: string
  widgetPath?: string
  defaultMode: ShareViewMode
  visibility: ShareVisibility
  tokens: ShareAccessToken[]
  defaultTokenId?: string
  embedAllowed: boolean
  embedDefaults: ShareEmbedDefaults
  customizationOptions: ShareCustomizationOptions
  social: ShareSocialMetadata
  tracking?: ShareTrackingConfig
  pwa?: SharePWAConfig
  shortLinkDomain?: string
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
  captureNodes?: CaptureScanNode[]
  hdPhotoCollection?: HDPhotoCollection
  zones?: PropertyZone[]
  campusMap?: PropertyCampusMap
  sharing: PropertySharingConfig
}

export interface Scene {
  id: string
  name: string
  imageUrl: string
  hotspots: Hotspot[]
  transitions?: SceneTransition[]
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
  captureNodeId?: string
  zoneId?: string
}

export interface CaptureScanNode {
  id: string
  name: string
  position: { x: number; y: number; z: number }
  panoramaUrl?: string
  meshReference?: string
  heading?: number
  pitch?: number
  captureDate?: string
  lightEstimate?: {
    exposure: number
    whiteBalance: number
    temperatureK: number
  }
  tags?: string[]
  dominantRoomType?: string
  zoneId?: string
}

export type HDPhotoKind = "panorama" | "still" | "print_pack"

export type HDPhotoResolutionPreset = "web-1080p" | "ultra-4k" | "ultra-8k"

export type HDPhotoExportFormat = "jpg" | "png" | "tiff" | "pdf" | "zip"

export interface HDPhotoMetadata {
  resolution: string
  width: number
  height: number
  dpi: number
  colorDepth: number
  hdr: boolean
  colorProfile: "sRGB" | "CMYK" | "AdobeRGB"
  supersampling?: number
  exposureCompensation?: number
  toneMapping?: string
  backgroundMode?: "hdr" | "studio"
  captureNodeId?: string
  captureTimestamp: string
  enhancements?: string[]
  sizeBytes?: number
  fileChecksum?: string
}

export interface HDPhotoAsset {
  id: string
  spaceId: string
  kind: HDPhotoKind
  label: string
  description?: string
  url: string
  previewUrl: string
  format: HDPhotoExportFormat
  metadata: HDPhotoMetadata
  tags?: string[]
  heroScore?: number
  suggestedUsage?: string[]
}

export interface HDPhotoSuggestion {
  id: string
  nodeId: string
  label: string
  description: string
  rationale: string
  metadata: {
    compositionScore: number
    lightingScore: number
    occlusionScore: number
  }
  recommendedOutput?: HDPhotoResolutionPreset
}

export interface HDPhotoExportRequest {
  id: string
  kind: "single" | "batch" | "print-pack"
  requestedAt: string
  requestedBy?: string
  spaceId: string
  assets: string[]
  format: HDPhotoExportFormat
  resolution: HDPhotoResolutionPreset
  dpi: number
  backgroundMode: "hdr" | "studio"
  includeWatermark?: boolean
  includeBrandingOverlay?: boolean
  iccProfile?: "sRGB" | "CMYK"
}

export interface HDPhotoExportRecord extends HDPhotoExportRequest {
  status: "queued" | "processing" | "completed" | "failed"
  completedAt?: string
  outputUrl?: string
  downloadSizeBytes?: number
  notes?: string
}

export interface HDPhotoRenderJob {
  id: string
  nodeId: string
  spaceId: string
  requestedAt: string
  targetResolution: { width: number; height: number }
  dpi: number
  supersampling: number
  status: "pending" | "rendering" | "validating" | "completed" | "failed"
  failureReason?: string
  outputAssetId?: string
  autoGenerated?: boolean
}

export interface HDPhotoModuleState {
  online: boolean
  lastRunAt?: string
  renderNode?: string
  queue: HDPhotoRenderJob[]
}

export interface HDPhotoCollection {
  spaceId: string
  panoramas: HDPhotoAsset[]
  heroShots: HDPhotoAsset[]
  printLayouts: HDPhotoAsset[]
  suggestions: HDPhotoSuggestion[]
  exports: HDPhotoExportRecord[]
  moduleState: HDPhotoModuleState
  lastAnalyzedAt?: string
}

export type HotspotType =
  | "info_point"
  | "media_embed"
  | "navigation_point"
  | "external_link"
  | "custom_action"
  /** Legacy aliases kept for backwards compatibility with existing data sets. */
  | "info"
  | "link"
  | "cta"
  | "video"
  | "audio"
  | "image"

export type HotspotMediaType = "image" | "video" | "audio" | "document" | "model"

export interface HotspotMedia {
  type: HotspotMediaType
  url: string
  posterUrl?: string
  title?: string
  description?: string
  autoplay?: boolean
  loop?: boolean
  /** Arbitrary metadata supplied by the authoring interface. */
  metadata?: Record<string, unknown>
}

export interface HotspotOcclusionConfig {
  mode: "auto" | "manual"
  /** Optional maximum distance in meters where the hotspot remains visible. */
  maxDistance?: number
  /** Optional radius around the camera origin used for depth-aware culling. */
  depthRadius?: number
  enabled?: boolean
}

export interface Hotspot {
  id: string
  x: number
  y: number
  /** Optional depth coordinate used by the occlusion system. */
  z?: number
  type: HotspotType
  /** Display label surfaced inside tooltips or badges. */
  label?: string
  /** Optional longer form description for detail panels. */
  description?: string
  /** Destination scene identifier for navigation hotspots. */
  targetSceneId?: string
  /** External URL opened for `external_link` hotspots. */
  linkUrl?: string
  /** Legacy action URL alias kept for backwards compatibility. */
  actionUrl?: string
  /** Identifier for custom action dispatchers. */
  customActionId?: string
  /** Optional media payload for `media_embed` hotspots. */
  media?: HotspotMedia | HotspotMedia[]
  /** Legacy media URL alias for data sources that store a single asset. */
  mediaUrl?: string
  /** Arbitrary data persisted alongside the hotspot. */
  metadata?: Record<string, unknown>
  /** Optional occlusion overrides for depth-aware rendering. */
  occlusion?: HotspotOcclusionConfig
  /** Engagement metrics aggregated from analytics. */
  clickCount?: number
  /** Optional legacy title maintained for existing UI expectations. */
  title?: string
}

export interface MeasurementPoint2D {
  x: number
  y: number
}

export interface MeasurementPoint3D {
  x: number
  y: number
  z: number
  /** Confidence score derived from the snapping source (0-1). */
  confidence?: number
  /** Indicates the data source used to derive the coordinate. */
  source?: "lidar" | "photogrammetry" | "hybrid"
}

export interface MeasurementAccuracy {
  /**
   * Root mean square error, stored in centimeters. When calibration is not
   * available this value represents an inferred tolerance based on capture
   * metadata.
   */
  rmsErrorCm: number
  /** Accuracy represented as 0-1 percentage. */
  confidence: number
  /** True when a calibration anchor has been applied in the current session. */
  calibrated: boolean
  /** Optional tolerance override requested by the operator (centimeters). */
  toleranceCm?: number
  /** Timestamp when calibration last occurred (ISO 8601). */
  calibratedAt?: string
  /** Source of the geometry backing the measurement. */
  source: "lidar" | "photogrammetry" | "hybrid"
}

export type MeasurementKind =
  | "distance"
  | "path"
  | "area"
  | "height"
  | "room"
  | "volume"

export interface MeasurementAnnotationMeta {
  /** Display title supplied by the user. */
  title?: string
  /** Optional free-form user notes. */
  note?: string
  /** Tags for grouping or filtering saved measurements. */
  tags?: string[]
}

export interface Measurement {
  id: string
  /** Backwards compatibility fields for legacy 2D overlay consumers. */
  startX: number
  startY: number
  endX: number
  endY: number
  /** Primary measurement value expressed in the persisted unit. */
  distance: number
  unit: "ft" | "m" | "in"
  measurementType: MeasurementKind
  label?: string
  /** Optional collection of 2D points maintained for overlay rendering. */
  points2d?: MeasurementPoint2D[]
  /**
   * Three-dimensional snapping coordinates used for precision metrics. When
   * present they should be treated as the source of truth for exports.
   */
  points3d?: MeasurementPoint3D[]
  /** Optional polygonal area (square meters) associated with the measurement. */
  areaSquareMeters?: number
  /**
   * When applicable, stores computed height (meters) for vertical
   * measurements.
   */
  height?: number
  /** Optional metadata describing the applied calibration/accuracy. */
  accuracy?: MeasurementAccuracy
  /** Indicates whether the measurement references a redacted surface. */
  redacted?: boolean
  /** Free-form annotation metadata persisted with the measurement. */
  annotation?: MeasurementAnnotationMeta
  createdAt?: string
  createdBy?: string
}

export interface SpaceCalibrationRecord {
  rmsErrorCm: number
  accuracyPercent: number
  toleranceCm?: number
  anchorDistanceMeters?: number
  capturedAt?: string
  operatorId?: string
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
  zoneId?: string
  outdoor?: boolean
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

export interface PanoramaSceneInitialView {
  yaw: number
  pitch: number
  fov: number
}

export interface PanoramaSceneHotspot {
  id: string
  targetSceneId: string
  yaw: number
  pitch: number
  label: string
  autoAlignmentYaw?: number
  autoAlignmentPitch?: number
}

export type PanoramaSceneType = "interior" | "exterior"

export interface PanoramaScene {
  id: string
  name: string
  imageUrl: string
  thumbnailUrl?: string
  description?: string
  ambientSound?: string
  sceneType: PanoramaSceneType
  floor?: string
  tags?: string[]
  initialView: PanoramaSceneInitialView
  hotspots: PanoramaSceneHotspot[]
  createdAt: string
  updatedAt: string
}

export interface PanoramaTourManifest {
  id: string
  title: string
  initialSceneId: string
  publishedAt: string
  scenes: PanoramaScene[]
  navigationGraph: Record<string, PanoramaSceneHotspot[]>
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
  event?: "scene" | "zone_enter" | "zone_exit" | "zone_transition"
  zoneId?: string
  targetZoneId?: string
  metadata?: Record<string, unknown>
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
  captureMethod?:
    | "TRIPOD_RGB"
    | "TRIPOD_LIDAR"
    | "GROUND_LIDAR"
    | "HANDHELD_RGB"
    | "HANDHELD_LIDAR"
    | "DRONE_RGB"
    | "DRONE_LIDAR"
    | "MOBILE_MAPPING"
    | "STATIC_PANORAMA"
}

export interface IngestJobZoneMetadata {
  zoneId: string
  zoneName?: string
  siteZoneIdentifier?: string
  parentTourId?: string
}

export interface IngestJobGpsTrackPoint {
  timestamp: string
  latitude: number
  longitude: number
  altitude?: number
}

export interface IngestJobGroundControlPoint {
  label: string
  latitude: number
  longitude: number
  elevation?: number
  accuracyCm?: number
}

export interface IngestJobDroneFlightPlan {
  takeoffPoint: {
    latitude: number
    longitude: number
    altitude?: number
  }
  maxAltitudeMeters?: number
  pathUrl?: string
}

export interface IngestJobSunOrientation {
  azimuthDegrees: number
  elevationDegrees: number
  capturedAt?: string
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
  outdoor?: boolean
  zone?: IngestJobZoneMetadata
  lightingCondition?: "DAYLIGHT" | "LOW_LIGHT" | "MIXED"
  sunOrientation?: IngestJobSunOrientation
  weather?: "CLEAR" | "PARTLY_CLOUDY" | "OVERCAST" | "RAIN" | "SNOW" | "FOG" | "WINDY"
  gpsTrack?: IngestJobGpsTrackPoint[]
  groundControlPoints?: IngestJobGroundControlPoint[]
  measurementToleranceCm?: number
  captureHeightMeters?: number
  droneFlightPlan?: IngestJobDroneFlightPlan
  notes?: string
}

export interface IngestJob {
  jobId: string
  spaceId: string
  owner: string
  sourceType: IngestSourceType
  captureInputs?: Array<
    | "TRIPOD_RGB"
    | "TRIPOD_LIDAR"
    | "GROUND_LIDAR"
    | "HANDHELD_RGB"
    | "HANDHELD_LIDAR"
    | "DRONE_RGB"
    | "DRONE_LIDAR"
    | "MOBILE_MAPPING"
    | "STATIC_PANORAMA"
  >
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

export interface VideoExportPresetAudio {
  codec: string
  channels: string
  bitrate_kbps: number
  sample_rate_hz: number
}

export interface VideoExportPreset {
  id: string
  label: string
  resolution: string
  aspect_ratio: string
  frame_rate: number
  bitrate_mbps: number
  delivery_format: string
  video_codec: string
  audio: VideoExportPresetAudio
  max_duration_minutes?: number
  profile?: string
  intended_use?: string[]
  metadata?: Record<string, unknown>
}

export interface VideoPresetRegistration {
  pipelineId: string
  version: string
  sourcePath: string
  registeredAt: string
  checksum: string
  maintainer?: string
  notes?: string
  presets: VideoExportPreset[]
}

export type VideoProcessingJobStatus =
  | "queued"
  | "processing"
  | "rendering"
  | "encoding"
  | "qa"
  | "delivered"
  | "completed"
  | "failed"

export interface VideoProcessingJobDeliverable {
  preset_id: string
  destination: string
  retention_days?: number
  notes?: string
}

export interface VideoProcessingJob
  extends Record<string, unknown> {
  jobId: string
  pipelineId: string
  version: string
  spaceId: string
  status: VideoProcessingJobStatus
  queuedAt: string
  priority?: string
  requestedBy?: string
  manifestPath: string
  deliverables: VideoProcessingJobDeliverable[]
  qaConfig?: Record<string, unknown>
  sourceCapture?: Record<string, unknown>
  webhook?: Record<string, unknown>
}

export interface VideoPlayerDeployment {
  path: string
  pipelineId: string
  environment: string
  deployedAt: string
  version?: string
  buildId?: string
  commitRef?: string
  viewerUrl?: string
  features: string[]
  assets: Record<string, string>
  notes?: string
  manifestPath: string
}

export type VideoQaCheckStatus = "pass" | "fail" | "warning" | "skipped"

export interface VideoQaCheck {
  id: string
  description: string
  status: VideoQaCheckStatus
  metrics?: Record<string, unknown>
  notes?: string
}

export type VideoQaSuiteStatus = "passed" | "failed" | "passed_with_warnings" | "skipped"

export interface VideoQaSuiteResult {
  spaceId: string
  pipelineId: string
  suite: string
  runAt: string
  environment: string
  status: VideoQaSuiteStatus
  summary: string
  checks: VideoQaCheck[]
  reportPath: string
}

export interface VideoPipelineState {
  id: string
  version: string
  presets: VideoPresetRegistration
  jobs: VideoProcessingJob[]
  deployments: VideoPlayerDeployment[]
  qaRuns: VideoQaSuiteResult[]
}

export interface VideoPipelineControlPlaneState {
  updatedAt: string
  pipelines: VideoPipelineState[]
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

export type SceneTransitionType = "walkthrough" | "fade_switch" | "orbit_move" | "instant_snap"

export interface SceneTransition {
  fromSceneId: string
  toSceneId: string
  type: SceneTransitionType
  duration: number
  easing?: "linear" | "cubic" | "smoothstep"
  /** When true the engine preloads destination assets before the visual cut. */
  preload?: boolean
  /** Optional author supplied metadata used by the transition engine. */
  metadata?: Record<string, unknown>
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

export type ViewerManifestHotspotType =
  | "INFO"
  | "LINK"
  | "VIDEO"
  | "IMAGE"
  | "AUDIO"
  | "PRODUCT"
  | "NAVIGATION"
  | "CUSTOM"

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
  zone_id?: string
}

export interface ViewerManifestConnection {
  from: string
  to: string
  transition_type: "WALK" | "STAIR" | "TELEPORT"
  distance?: number
  zone_transition?: boolean
}

export interface ViewerManifestNavigation {
  camera_nodes: ViewerManifestCameraNode[]
  connections: ViewerManifestConnection[]
}

export interface ViewerManifestZone {
  zone_id: string
  name: string
  space_ids: string[]
  default_space_id?: string
  outdoor: boolean
  site_zone_identifier?: string
  campus_map_icon_url?: string
  gps_bounds?: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
    altitude_meters?: number
  }
  capture_metadata?: PropertyZoneCaptureMetadata
}

export interface ViewerManifestZoneConnection {
  from_zone_id: string
  to_zone_id: string
  transition_type: "WALK" | "PATH" | "TELEPORT"
  description?: string
  estimated_seconds?: number
  distance_meters?: number
}

export interface ViewerManifestCampusMap {
  image_url: string
  tile_url_template?: string
  default_zone_id?: string
  gps_bounds?: {
    sw: { latitude: number; longitude: number }
    ne: { latitude: number; longitude: number }
  }
}

export interface ViewerManifestPerformanceProfile {
  lod_target_triangle_budget: number
  max_texture_resolution: number
  mobile_max_texture_resolution: number
  streaming_chunk_bytes: number
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
  type: MeasurementKind
  point_a: number[]
  point_b: number[]
  points?: number[][]
  distance_meters: number | null
  area_m2?: number | null
  height_meters?: number | null
  accuracy?: MeasurementAccuracy
  redacted?: boolean
  annotation?: MeasurementAnnotationMeta
  confidence?: number
  created_by: string
  created_at?: string
}

export interface ViewerManifestEmbedParameter {
  key: string
  type: "string" | "boolean" | "number"
  default?: string | number | boolean | null
  description?: string
  options?: string[]
}

export interface ViewerManifestEmbedSnippetTemplate {
  iframe: string
  javascript: string
  responsive_css?: string
  parameters: ViewerManifestEmbedParameter[]
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

export interface ViewerManifestHighlightPoint {
  node_id: string
  label: string
  description?: string
  thumbnail_url?: string
  tags?: string[]
  recommended_duration_seconds?: number
}

export type ViewerManifestVideoAssetType = "highlight_reel" | "guided_tour"

export interface ViewerManifestVideoAssetDistributionVariant {
  preset_id: string
  url: string
}

export interface ViewerManifestVideoAssetDistribution {
  download_url?: string
  streaming_url?: string
  social_variants?: ViewerManifestVideoAssetDistributionVariant[]
}

export interface ViewerManifestVideoAssetBranding {
  logo_url?: string
  tagline?: string
  agent_contact?: string
  call_to_action?: string
}

export interface ViewerManifestVideoAsset {
  video_id: string
  type: ViewerManifestVideoAssetType
  url: string
  resolution: string
  duration_secs: number
  created_at: string
  presets_used?: string[]
  branding_overlay?: ViewerManifestVideoAssetBranding
  distribution?: ViewerManifestVideoAssetDistribution
}

export interface ViewerManifest {
  space_id: string
  version: string
  owner: string
  created_at: string
  share_url: string
  embed_allowed: boolean
  embed_snippet_template: ViewerManifestEmbedSnippetTemplate
  geometry: ViewerManifestGeometry
  textures: ViewerManifestTexture[]
  navigation: ViewerManifestNavigation
  views: ViewerManifestViews
  hotspots: ViewerManifestHotspot[]
  measurements: ViewerManifestMeasurement[]
  analytics?: ViewerManifestAnalytics
  access: ViewerManifestAccess
  zones?: ViewerManifestZone[]
  zone_connections?: ViewerManifestZoneConnection[]
  campus_map?: ViewerManifestCampusMap
  outdoor_flag?: boolean
  performance?: ViewerManifestPerformanceProfile
  highlight_points?: ViewerManifestHighlightPoint[]
  video_assets?: ViewerManifestVideoAsset[]
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
