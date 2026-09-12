import { wcFetch } from '../client'

export interface WcShippingZone {
  id: number
  name: string
  order: number
}

export interface WcShippingZoneLocation {
  code: string
  type: 'postcode' | 'state' | 'country' | 'continent'
}

interface WcShippingMethodSetting {
  id: string
  value: string
}

export interface WcShippingMethod {
  id: number
  instance_id: number
  title: string
  order: number
  enabled: boolean
  /** The method *type* — `flat_rate`, `free_shipping`, `local_pickup`, or a
   *  custom slug a shipping plugin (e.g. BoxNow) registers. */
  method_id: string
  method_title: string
  /** Keyed by setting id (`cost`, `title`, `requires`, `min_amount`, …) —
   *  shape varies by `method_id`, so callers only read the keys they know. */
  settings: Record<string, WcShippingMethodSetting>
}

interface WcContinent {
  code: string
  countries: { code: string }[]
}

/** WooCommerce's zone 0 — "Locations not covered by your other zones". Every
 *  store has it and it can't be deleted, so it's always a safe fallback. */
export const WC_FALLBACK_ZONE_ID = 0

/** Shipping config changes rarely (an admin editing Settings → Shipping),
 *  so a short revalidate window is enough to avoid re-fetching on every
 *  checkout page view without ever serving stale-for-long data. */
const SHIPPING_CACHE: { revalidate: number; tags: string[] } = {
  revalidate: 300,
  tags: ['shipping'],
}

export async function fetchShippingZones(): Promise<WcShippingZone[]> {
  return wcFetch<WcShippingZone[]>('/shipping/zones', {}, SHIPPING_CACHE)
}

export async function fetchShippingZoneLocations(zoneId: number): Promise<WcShippingZoneLocation[]> {
  return wcFetch<WcShippingZoneLocation[]>(`/shipping/zones/${zoneId}/locations`, {}, SHIPPING_CACHE)
}

export async function fetchShippingZoneMethods(zoneId: number): Promise<WcShippingMethod[]> {
  return wcFetch<WcShippingMethod[]>(`/shipping/zones/${zoneId}/methods`, {}, SHIPPING_CACHE)
}

/** Country codes WooCommerce groups under a continent code (e.g. `EU`) — used
 *  to match a zone scoped by continent rather than by individual country. */
export async function fetchContinentCountries(continentCode: string): Promise<string[]> {
  const continent = await wcFetch<WcContinent>(`/data/continents/${continentCode}`, {}, SHIPPING_CACHE)
  return continent.countries.map((country) => country.code)
}
