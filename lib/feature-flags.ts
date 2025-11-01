export const HOTSPOT_NAV_ONLY = process.env.NEXT_PUBLIC_HOTSPOT_NAV_ONLY === "true"

export const isHotspotNavigationEnabled = () => HOTSPOT_NAV_ONLY
