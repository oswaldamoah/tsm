import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

const API_BASE_URL = 'https://tsm-backend-hhao.onrender.com'

const predefinedMaterials = [
  { id: 'mat1', name: 'Fiber Optic Cable' },
  { id: 'mat2', name: 'Steel Band' },
  { id: 'mat3', name: 'Pigtail' },
  { id: 'mat4', name: 'Network Switch' },
  { id: 'mat5', name: 'Router' },
  { id: 'mat6', name: 'Signal Amplifier' },
  { id: 'mat7', name: 'Mounting Brackets' },
  { id: 'mat8', name: 'Ethernet Cable' },
  { id: 'mat9', name: 'Connectors' },
  { id: 'mat10', name: 'U-clip' },
  { id: 'mat11', name: 'Tensioner' },
  { id: 'mat12', name: 'Cable Ties' },
  { id: 'mat13', name: 'Wooden Pole' },
  { id: 'mat14', name: 'Intermediate' },
  { id: 'mat15', name: 'Buckles' },
]

const predefinedActivities = [
  { id: 'act1', name: 'Site Survey' },
  { id: 'act2', name: 'Foundation Work' },
  { id: 'act3', name: 'Tower Installation' },
  { id: 'act4', name: 'Equipment Installation' },
  { id: 'act5', name: 'Cable Laying' },
  { id: 'act6', name: 'Network Configuration' },
  { id: 'act7', name: 'Signal Testing' },
  { id: 'act8', name: 'Quality Assurance' },
  { id: 'act9', name: 'Site Cleanup' },
  { id: 'act10', name: 'Documentation' },
  { id: 'act11', name: 'Client Handover' },
  { id: 'act12', name: 'Maintenance Check' },
  { id: 'act13', name: 'Security Setup' },
]

const materialUnits = [
  { value: 'pcs', label: 'Pieces' },
  { value: 'm', label: 'Meters' },
  { value: 'kg', label: 'Kilograms' },
  { value: 'box', label: 'Boxes' },
  { value: 'roll', label: 'Rolls' },
]

type Material = {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
}

type Activity = {
  id: string
  name: string
  completed: boolean
}

type OperationalCost = {
  id: string
  name: string
  amount: number
}

type Site = {
  id: string
  name: string
  laborCost: number
  siteCode: string
  siteType: string
  region: string
  location: string
  latitude: number | null
  longitude: number | null
  googleMapsUrl: string
  images: string[]
  notes: string
  isArchived: boolean
  materials: Material[]
  activities: Activity[]
  operationalCosts: OperationalCost[]
}

type CompanySettings = {
  name: string
  logoUrl: string
  email: string
  phone: string
  address: string
  website: string
}

type RawMaterial = {
  id?: string | number
  _id?: string | number
  name?: unknown
  quantity?: unknown
  unit?: unknown
  cost?: unknown
}

type RawActivity = {
  id?: string | number
  _id?: string | number
  name?: unknown
  completed?: unknown
}

type RawOperationalCost = {
  id?: string | number
  _id?: string | number
  name?: unknown
  amount?: unknown
}

type RawSite = {
  id?: string | number
  _id?: string | number
  name?: unknown
  laborCost?: unknown
  siteCode?: unknown
  siteType?: unknown
  region?: unknown
  location?: unknown
  latitude?: unknown
  longitude?: unknown
  googleMapsUrl?: unknown
  images?: unknown
  notes?: unknown
  isArchived?: unknown
  materials?: RawMaterial[] | null
  activities?: RawActivity[] | null
  operationalCosts?: RawOperationalCost[] | null
}

type MainTab = 'about' | 'materials' | 'activities' | 'costs'
type ModalType = 'site' | 'material' | 'activity' | 'operational-cost' | 'delete-site' | 'company-settings' | null
type SiteModalMode = 'add' | 'edit'
type MaterialMode = 'predefined' | 'custom'
type ActivityMode = 'predefined' | 'custom'
type MaterialErrors = Partial<Record<'material' | 'customName' | 'quantity' | 'unit' | 'cost', boolean>>
type ActivityErrors = Partial<Record<'activity' | 'customName', boolean>>
type OperationalCostErrors = Partial<Record<'name' | 'amount', boolean>>
type CompanySettingsErrors = Partial<Record<'name' | 'email', boolean>>
type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'archive'
  | 'archive-restore'
  | 'building'
  | 'check'
  | 'check-circle'
  | 'circle'
  | 'close'
  | 'download'
  | 'edit'
  | 'file-text'
  | 'image'
  | 'info'
  | 'map-pin'
  | 'plus'
  | 'search'
  | 'settings'
  | 'signal'
  | 'trash'

const siteTypeOptions = [
  { value: '4G', label: '4G' },
  { value: '5G', label: '5G' },
  { value: 'Fiber', label: 'Fiber' },
  { value: 'Microwave', label: 'Microwave' },
  { value: 'Satellite', label: 'Satellite' },
  { value: 'Other', label: 'Other' },
]

const emptyMaterialForm = {
  materialId: '',
  customName: '',
  quantity: '1',
  unit: 'pcs',
  cost: '0',
}

const emptyActivityForm = {
  activityId: '',
  customName: '',
}

const emptyOperationalCostForm = {
  name: '',
  amount: '0',
}

const emptyCompanySettingsForm = {
  name: '',
  logoUrl: '',
  email: '',
  phone: '',
  address: '',
  website: '',
}

function generateId() {
  return Math.random().toString(36).slice(2, 15)
}

function textValue(value: unknown, fallback = '') {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

function numberValue(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
  return Number.isFinite(numeric) ? numeric : 0
}

function booleanValue(value: unknown) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function recordId(record: { id?: string | number; _id?: string | number }) {
  return String(record.id ?? record._id ?? generateId())
}

function normalizeMaterial(raw: RawMaterial): Material {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled material'),
    quantity: numberValue(raw.quantity),
    unit: textValue(raw.unit, 'pcs'),
    cost: numberValue(raw.cost),
  }
}

function normalizeActivity(raw: RawActivity): Activity {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled activity'),
    completed: booleanValue(raw.completed),
  }
}

function normalizeOperationalCost(raw: RawOperationalCost): OperationalCost {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled cost'),
    amount: numberValue(raw.amount),
  }
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(numeric) ? numeric : null
}

function parseImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    } catch { /* not valid JSON, ignore */ }
  }
  return []
}

type ParsedLocation = {
  latitude: string
  longitude: string
  googleMapsUrl: string
}

function isCardinalDirection(value: string): value is 'N' | 'S' | 'E' | 'W' {
  return value === 'N' || value === 'S' || value === 'E' || value === 'W'
}

function parseDmsComponent(component: string): number | null {
  // Matches degrees, minutes, seconds with optional symbols: 40° 26' 46" or 40d 26m 46s
  const match = component.trim().match(
    /^\s*(-?\d+(?:\.\d+)?)(?:[°ºd]\s*(?:(\d+(?:\.\d+)?)(?:['′m]\s*(?:(\d+(?:\.\d+)?)(?:["″s])?)?)?)?)?\s*$/i,
  )
  if (!match) return null

  const degrees = Number.parseFloat(match[1])
  const minutes = match[2] ? Number.parseFloat(match[2]) : 0
  const seconds = match[3] ? Number.parseFloat(match[3]) : 0

  const absoluteValue = Math.abs(degrees) + minutes / 60 + seconds / 3600

  return degrees < 0 ? -absoluteValue : absoluteValue
}

function parseDmsCoordinates(input: string): { latitude: string; longitude: string } | null {
  // Handles both "40° 26' 46" N, 79° 58' 56" W" and "40:26:46N 79:58:56W"
  const parts = input.trim().split(/\s*,\s*|\s+(?=[NSnsEWew])/)

  if (parts.length !== 2) return null

  const components: { value: number; isLatitude: boolean }[] = []

  for (const part of parts) {
    const directionMatch = part.trim().match(/[NSnsEWew]$/)
    if (!directionMatch) return null
    if (directionMatch.index === undefined) return null

    const rawValue = part.slice(0, directionMatch.index).trim()
    const direction = directionMatch[0].toUpperCase()
    if (!isCardinalDirection(direction)) return null

    const degrees = parseDmsComponent(rawValue)
    if (degrees === null) return null

    // N/S => latitude, E/W => longitude
    const isLatitude = direction === 'N' || direction === 'S'
    const sign = direction === 'N' || direction === 'E' ? 1 : -1

    components.push({ value: degrees * sign, isLatitude })
  }

  const latitudeComponent = components.find((component) => component.isLatitude)
  const longitudeComponent = components.find((component) => !component.isLatitude)

  if (!latitudeComponent || !longitudeComponent) return null

  const latitude = latitudeComponent.value
  const longitude = longitudeComponent.value

  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null

  return {
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
  }
}

function extractCoordinatesFromUrl(url: string): { latitude: string; longitude: string } | null {
  // Google Maps URLs embed coordinates in the path: /@lat,lng
  const atCoordsMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (atCoordsMatch) {
    return { latitude: atCoordsMatch[1], longitude: atCoordsMatch[2] }
  }

  // Some share links use ?q=lat,lng or ?query=lat,lng
  const queryCoordsMatch = url.match(/[?&](?:q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (queryCoordsMatch) {
    return { latitude: queryCoordsMatch[1], longitude: queryCoordsMatch[2] }
  }

  // Coordinates can also be packaged inside data matrices: !3dlat!4dlng
  const dataCoordsMatch = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  if (dataCoordsMatch) {
    return { latitude: dataCoordsMatch[1], longitude: dataCoordsMatch[2] }
  }

  return null
}

async function parseLocationInput(value: string): Promise<ParsedLocation> {
  const trimmed = value.trim()
  const result: ParsedLocation = { latitude: '', longitude: '', googleMapsUrl: trimmed }

  if (!trimmed) return result

  // Case 0: Cardinal / DMS coordinate pair, e.g. "40° 26' 46" N, 79° 58' 56" W"
  const dmsCoords = parseDmsCoordinates(trimmed)
  if (dmsCoords) {
    result.latitude = dmsCoords.latitude
    result.longitude = dmsCoords.longitude
    return result
  }

  // Case 1: Standard comma-separated coordinate pair, e.g. "5.6037, -0.1870"
  const coordsMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
  if (coordsMatch) {
    result.latitude = coordsMatch[1]
    result.longitude = coordsMatch[2]
    return result
  }

  const isMapsLink = /(^|\/)(maps\.google|maps\.app\.goo\.gl|goo\.gl)/i.test(trimmed)

  // Case 2: Full Google Maps URL with extractable coordinates
  if (isMapsLink) {
    const extracted = extractCoordinatesFromUrl(trimmed)
    if (extracted) {
      result.latitude = extracted.latitude
      result.longitude = extracted.longitude
      return result
    }
  }

  // Case 3: Short link (https://maps.app.goo.gl/...) — short links do not contain
  // coordinates in the string itself, so we follow the redirect to expand the URL
  // and extract coordinates from the final destination.
  if (/^https?:\/\/maps\.app\.goo\.gl\//i.test(trimmed)) {
    try {
      const response = await fetch(trimmed, { redirect: 'follow' })
      const longUrl = response.url || trimmed
      const extracted = extractCoordinatesFromUrl(longUrl)
      if (extracted) {
        result.latitude = extracted.latitude
        result.longitude = extracted.longitude
        result.googleMapsUrl = longUrl
        return result
      }
    } catch {
      // Network / CORS failure: we still keep the short URL so the
      // "Open in Google Maps" button works, but coordinates stay empty.
    }
  }

  return result
}

function normalizeSite(raw: RawSite): Site {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled site'),
    laborCost: numberValue(raw.laborCost),
    siteCode: textValue(raw.siteCode),
    siteType: textValue(raw.siteType),
    region: textValue(raw.region),
    location: textValue(raw.location),
    latitude: nullableNumber(raw.latitude),
    longitude: nullableNumber(raw.longitude),
    googleMapsUrl: textValue(raw.googleMapsUrl),
    images: parseImages(raw.images),
    notes: textValue(raw.notes),
    isArchived: booleanValue(raw.isArchived),
    materials: Array.isArray(raw.materials) ? raw.materials.map(normalizeMaterial) : [],
    activities: Array.isArray(raw.activities) ? raw.activities.map(normalizeActivity) : [],
    operationalCosts: Array.isArray(raw.operationalCosts) ? raw.operationalCosts.map(normalizeOperationalCost) : [],
  }
}

function calculateMaterialCost(site: Site) {
  return site.materials.reduce((sum, material) => sum + material.cost, 0)
}

function calculateOperationalCostTotal(site: Site) {
  return site.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
}

function calculateProgress(site: Site) {
  if (site.activities.length === 0) return 0
  const completedActivities = site.activities.filter((activity) => activity.completed).length
  return Math.round((completedActivities / site.activities.length) * 100)
}

function calculateSiteTotals(site: Site) {
  const materialCost = calculateMaterialCost(site)
  const operationalCost = calculateOperationalCostTotal(site)
  const progress = calculateProgress(site)

  return {
    materialCost,
    operationalCost,
    laborAndOperationalCost: site.laborCost + operationalCost,
    totalCost: materialCost + site.laborCost + operationalCost,
    progress,
  }
}

function formatCurrency(amount: number) {
  return `GHS ${amount.toFixed(2)}`
}

function csvEscape(value: string) {
  const escaped = value.replaceAll('"', '""')
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
}

function buildErrorMessage(action: string, error: unknown) {
  const detail = error instanceof Error ? error.message : 'Please try again.'
  return `${action}. ${detail}`
}

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const message = await response.text().catch(() => '')
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'arrow-left':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      )
    case 'arrow-right':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      )
    case 'archive':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="21 8 21 21 3 21 3 8"></polyline>
          <rect x="1" y="3" width="22" height="5"></rect>
          <line x1="10" y1="12" x2="14" y2="12"></line>
        </svg>
      )
    case 'archive-restore':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="5" x="2" y="3" rx="1"></rect>
          <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"></path>
          <path d="m9 15 3-3 3 3"></path>
          <path d="M12 12v9"></path>
        </svg>
      )
    case 'building':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
          <path d="M9 9h1" />
          <path d="M9 13h1" />
          <path d="M9 17h1" />
        </svg>
      )
    case 'check':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m20 6-11 11-5-5" />
        </svg>
      )
    case 'check-circle':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <path d="m9 11 3 3L22 4" />
        </svg>
      )
    case 'circle':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )
    case 'close':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      )
    case 'download':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M7 10l5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      )
    case 'edit':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    case 'file-text':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" x2="8" y1="13" y2="13" />
          <line x1="16" x2="8" y1="17" y2="17" />
          <line x1="10" x2="8" y1="9" y2="9" />
        </svg>
      )
    case 'image':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      )
    case 'info':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      )
    case 'map-pin':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    case 'plus':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'search':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      )
    case 'settings':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      )
    case 'trash':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      )
    case 'signal':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 20h.01" />
          <path d="M7 20v-4" />
          <path d="M12 20v-8" />
          <path d="M17 20V8" />
          <path d="M22 4v16" />
        </svg>
      )
  }
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal active" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div className="modal-content" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal" title="Close modal">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SiteCard({ site, onView }: { site: Site; onView: (siteId: string) => void }) {
  const totals = calculateSiteTotals(site)

  return (
    <article className="site-card">
      <div className="site-card-content">
        <div className="site-card-header">
          <div className="site-icon-container">
            <div className="site-icon">
              <Icon name="building" />
            </div>
            <div>
              <div className="site-name-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 className="site-name" style={{ margin: 0 }}>{site.name}</h3>
                {site.siteType ? <span className="badge badge-site-type">{site.siteType}</span> : null}
                {site.isArchived ? <span className="badge badge-archived">Archived</span> : null}
              </div>
              <p className="site-meta-line">
                {site.region ? `${site.region} · ` : ''}{site.materials.length} materials / {site.activities.length} activities
              </p>
            </div>
          </div>
        </div>

        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-label">Progress</span>
            <span className="progress-value">{totals.progress}%</span>
          </div>
          <div className="progress-bar" aria-label={`${totals.progress}% complete`}>
            <div className="progress-fill" style={{ width: `${totals.progress}%` }} />
          </div>
        </div>

        <div className="cost-breakdown">
          <div className="cost-row">
            <span className="cost-label">Materials Cost:</span>
            <span className="cost-value">{formatCurrency(totals.materialCost)}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Labor Cost:</span>
            <span className="cost-value">{formatCurrency(site.laborCost)}</span>
          </div>
          <div className="cost-row">
            <span className="cost-label">Operational Costs:</span>
            <span className="cost-value">{formatCurrency(totals.operationalCost)}</span>
          </div>
          <div className="cost-row total">
            <span className="cost-label">Total Cost:</span>
            <span className="cost-value">{formatCurrency(totals.totalCost)}</span>
          </div>
        </div>
      </div>
      <div className="site-card-footer">
        <button type="button" className="view-details-btn" onClick={() => onView(site.id)}>
          <span>View Details</span>
          <Icon name="arrow-right" />
        </button>
      </div>
    </article>
  )
}

function EmptyPanel({
  title,
  text,
  actionLabel,
  onAction,
  icon = 'search',
}: {
  title: string
  text: string
  actionLabel?: string
  onAction?: () => void
  icon?: IconName
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-text">{text}</p>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          <Icon name="plus" />
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </div>
  )
}

function App() {
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentSiteId, setCurrentSiteId] = useState<string | null>(null)
  const [mainTab, setMainTab] = useState<MainTab>('materials')
  const [modal, setModal] = useState<ModalType>(null)
  const [siteModalMode, setSiteModalMode] = useState<SiteModalMode>('add')
  const [siteName, setSiteName] = useState('')
  const [siteNameError, setSiteNameError] = useState(false)
  const [siteFormType, setSiteFormType] = useState('')
  const [siteFormRegion, setSiteFormRegion] = useState('')
  const [siteFormLocation, setSiteFormLocation] = useState('')
  const [siteFormLocationInput, setSiteFormLocationInput] = useState('')
  const [siteFormLatitude, setSiteFormLatitude] = useState('')
  const [siteFormLongitude, setSiteFormLongitude] = useState('')
  const [siteFormGoogleMapsUrl, setSiteFormGoogleMapsUrl] = useState('')
  const [siteFormImages, setSiteFormImages] = useState<string[]>([''])
  const [siteFormNotes, setSiteFormNotes] = useState('')
  const [materialMode, setMaterialMode] = useState<MaterialMode>('predefined')
  const [materialForm, setMaterialForm] = useState(emptyMaterialForm)
  const [materialErrors, setMaterialErrors] = useState<MaterialErrors>({})
  const [activityMode, setActivityMode] = useState<ActivityMode>('predefined')
  const [activityForm, setActivityForm] = useState(emptyActivityForm)
  const [activityErrors, setActivityErrors] = useState<ActivityErrors>({})
  const [operationalCostForm, setOperationalCostForm] = useState(emptyOperationalCostForm)
  const [operationalCostErrors, setOperationalCostErrors] = useState<OperationalCostErrors>({})
  const [laborCostDraft, setLaborCostDraft] = useState('0')
  const [laborCostError, setLaborCostError] = useState(false)
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null)
  const [companySettingsForm, setCompanySettingsForm] = useState(emptyCompanySettingsForm)
  const [companySettingsErrors, setCompanySettingsErrors] = useState<CompanySettingsErrors>({})
  const [showArchived, setShowArchived] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === currentSiteId) ?? null,
    [currentSiteId, sites],
  )

  const filteredSites = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    if (!normalizedSearch) return sites
    return sites.filter((site) => site.name.toLowerCase().includes(normalizedSearch))
  }, [searchTerm, sites])

  const selectedSiteId = selectedSite?.id
  const selectedSiteLaborCost = selectedSite?.laborCost
  const selectedSiteTotals = selectedSite ? calculateSiteTotals(selectedSite) : null

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const [sitesData, settingsData] = await Promise.all([
          request<RawSite[]>(`/sites${showArchived ? '?include_archived=true' : ''}`),
          request<CompanySettings>('/company-settings').catch(() => null)
        ])
        
        if (isMounted) {
          setSites(sitesData.map(normalizeSite))
          if (settingsData) {
            setCompanySettings(settingsData)
          }
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(buildErrorMessage('Failed to load initial data', error))
          console.error('Failed to load initial data:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [showArchived])

  useEffect(() => {
    if (selectedSiteId && selectedSiteLaborCost !== undefined) {
      setLaborCostDraft(String(selectedSiteLaborCost))
      setLaborCostError(false)
    }
  }, [selectedSiteId, selectedSiteLaborCost])

  useEffect(() => {
    if (!isSlideshowOpen || !selectedSite) return
    const slideshowImages = selectedSite.images
    if (slideshowImages.length === 0) return

    function handleSlideshowKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsSlideshowOpen(false)
      } else if (event.key === 'ArrowRight') {
        setSlideshowIndex((current) => (current + 1) % slideshowImages.length)
      } else if (event.key === 'ArrowLeft') {
        setSlideshowIndex((current) => (current - 1 + slideshowImages.length) % slideshowImages.length)
      }
    }

    window.addEventListener('keydown', handleSlideshowKeyDown)
    return () => window.removeEventListener('keydown', handleSlideshowKeyDown)
  }, [isSlideshowOpen, selectedSite])

  function updateSiteLocally(siteId: string, updater: (site: Site) => Site) {
    setSites((currentSites) => currentSites.map((site) => (site.id === siteId ? updater(site) : site)))
  }

  function closeModal() {
    setModal(null)
  }

  function showDashboard() {
    setCurrentSiteId(null)
    setMainTab('about')
  }

  function showSiteDetails(siteId: string) {
    setCurrentSiteId(siteId)
    setMainTab('about')
  }

  function openAddSiteModal() {
    setSiteModalMode('add')
    setSiteName('')
    setSiteNameError(false)
    setSiteFormType('')
    setSiteFormRegion('')
    setSiteFormLocation('')
    setSiteFormLocationInput('')
    setSiteFormLatitude('')
    setSiteFormLongitude('')
    setSiteFormGoogleMapsUrl('')
    setSiteFormImages([''])
    setSiteFormNotes('')
    setModal('site')
  }

  function openEditSiteModal() {
    if (!selectedSite) return
    const hasCoordinates = selectedSite.latitude !== null && selectedSite.longitude !== null
    setSiteModalMode('edit')
    setSiteName(selectedSite.name)
    setSiteNameError(false)
    setSiteFormType(selectedSite.siteType)
    setSiteFormRegion(selectedSite.region)
    setSiteFormLocation(selectedSite.location)
    setSiteFormLocationInput(
      selectedSite.googleMapsUrl || (hasCoordinates ? `${selectedSite.latitude}, ${selectedSite.longitude}` : ''),
    )
    setSiteFormLatitude(selectedSite.latitude !== null ? String(selectedSite.latitude) : '')
    setSiteFormLongitude(selectedSite.longitude !== null ? String(selectedSite.longitude) : '')
    setSiteFormGoogleMapsUrl(selectedSite.googleMapsUrl)
    setSiteFormImages(selectedSite.images.length > 0 ? [...selectedSite.images] : [''])
    setSiteFormNotes(selectedSite.notes)
    setModal('site')
  }

  function openMaterialModal() {
    setMaterialMode('predefined')
    setMaterialForm(emptyMaterialForm)
    setMaterialErrors({})
    setModal('material')
  }

  function openActivityModal() {
    setActivityMode('predefined')
    setActivityForm(emptyActivityForm)
    setActivityErrors({})
    setModal('activity')
  }

  function openOperationalCostModal() {
    setOperationalCostForm(emptyOperationalCostForm)
    setOperationalCostErrors({})
    setModal('operational-cost')
  }

  function openCompanySettingsModal() {
    setCompanySettingsForm(companySettings ?? emptyCompanySettingsForm)
    setCompanySettingsErrors({})
    setModal('company-settings')
  }

  function updateImageLink(index: number, value: string) {
    setSiteFormImages((current) => current.map((image, i) => (i === index ? value : image)))
  }

  function addImageLink() {
    setSiteFormImages((current) => [...current, ''])
  }

  function removeImageLink(index: number) {
    setSiteFormImages((current) => current.filter((_, i) => i !== index))
  }

  function openSlideshow(index: number) {
    setSlideshowIndex(index)
    setIsSlideshowOpen(true)
  }

  function closeSlideshow() {
    setIsSlideshowOpen(false)
  }

  function showNextImage() {
    if (!selectedSite || selectedSite.images.length === 0) return
    setSlideshowIndex((current) => (current + 1) % selectedSite.images.length)
  }

  function showPreviousImage() {
    if (!selectedSite || selectedSite.images.length === 0) return
    setSlideshowIndex((current) => (current - 1 + selectedSite.images.length) % selectedSite.images.length)
  }

  async function handleCompanySettingsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    
    const nextErrors: CompanySettingsErrors = {}
    if (!companySettingsForm.name.trim()) nextErrors.name = true
    if (!companySettingsForm.email.trim()) nextErrors.email = true

    setCompanySettingsErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const savedSettings = await request<CompanySettings>('/company-settings', {
        method: 'PUT',
        body: JSON.stringify(companySettingsForm)
      })
      setCompanySettings(savedSettings)
      closeModal()
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to save company settings', error))
      console.error('Failed to save company settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleArchiveSite(siteId: string, isCurrentlyArchived: boolean) {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const endpoint = isCurrentlyArchived ? `/sites/${siteId}/unarchive` : `/sites/${siteId}/archive`
      await request<void>(endpoint, { method: 'POST' })
      
      updateSiteLocally(siteId, (site) => ({ ...site, isArchived: !isCurrentlyArchived }))
      if (isCurrentlyArchived && !showArchived) {
        // Just unarchived while looking at non-archived, wait, this shouldn't happen usually
      } else if (!isCurrentlyArchived && !showArchived) {
        // Archived while looking at non-archived, remove from view
        setSites(currentSites => currentSites.filter(s => s.id !== siteId))
        showDashboard()
      }
    } catch (error) {
      const action = isCurrentlyArchived ? 'unarchive' : 'archive'
      setErrorMessage(buildErrorMessage(`Failed to ${action} site`, error))
      console.error(`Failed to ${action} site:`, error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = siteName.trim()
    if (!trimmedName) {
      setSiteNameError(true)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    // Re-parse the location input at submit time so a freshly pasted URL or short link is resolved
    const parsedLocation = await parseLocationInput(siteFormLocationInput)
    const resolvedLatitude = parsedLocation.latitude || siteFormLatitude
    const resolvedLongitude = parsedLocation.longitude || siteFormLongitude
    const resolvedGoogleMapsUrl = parsedLocation.googleMapsUrl || siteFormGoogleMapsUrl

    const payload = {
      name: trimmedName,
      siteType: siteFormType || undefined,
      region: siteFormRegion || undefined,
      location: siteFormLocation || undefined,
      latitude: resolvedLatitude ? Number.parseFloat(resolvedLatitude) : undefined,
      longitude: resolvedLongitude ? Number.parseFloat(resolvedLongitude) : undefined,
      googleMapsUrl: resolvedGoogleMapsUrl || undefined,
      images: siteFormImages.length > 0 ? JSON.stringify(siteFormImages.map((url) => url.trim()).filter(Boolean)) : undefined,
      notes: siteFormNotes || undefined,
    }

    try {
      if (siteModalMode === 'add') {
        const newSite = {
          ...payload,
          laborCost: 0,
          materials: [],
          activities: [],
          operationalCosts: [],
        }
        const createdSite = await request<RawSite>('/sites', {
          method: 'POST',
          body: JSON.stringify(newSite),
        })
        setSites((currentSites) => [...currentSites, normalizeSite({ ...newSite, ...createdSite })])
      } else if (selectedSite) {
        const updatedSite = { ...selectedSite, ...payload }
        const savedSite = await request<RawSite | undefined>(`/sites/${selectedSite.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
        updateSiteLocally(selectedSite.id, (site) => normalizeSite({ ...site, ...updatedSite, ...(savedSite ?? {}) }))
      }

      closeModal()
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to save site', error))
      console.error('Failed to save site:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteSite() {
    if (!selectedSite) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      await request<void>(`/sites/${selectedSite.id}`, {
        method: 'DELETE',
      })
      setSites((currentSites) => currentSites.filter((site) => site.id !== selectedSite.id))
      closeModal()
      showDashboard()
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to delete site', error))
      console.error('Failed to delete site:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSite) return

    const nextErrors: MaterialErrors = {}
    let materialName = ''

    if (materialMode === 'predefined') {
      const selectedMaterial = predefinedMaterials.find((material) => material.id === materialForm.materialId)
      if (!selectedMaterial) {
        nextErrors.material = true
      } else {
        materialName = selectedMaterial.name
      }
    } else {
      materialName = materialForm.customName.trim()
      if (!materialName) {
        nextErrors.customName = true
      }
    }

    const quantity = Number.parseFloat(materialForm.quantity)
    const cost = Number.parseFloat(materialForm.cost)

    if (!Number.isFinite(quantity) || quantity <= 0) nextErrors.quantity = true
    if (!materialForm.unit) nextErrors.unit = true
    if (!Number.isFinite(cost) || cost < 0) nextErrors.cost = true

    setMaterialErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const material: Material = {
      id: generateId(),
      name: materialName,
      quantity,
      unit: materialForm.unit,
      cost,
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const savedMaterial = await request<RawMaterial | undefined>(`/sites/${selectedSite.id}/materials`, {
        method: 'POST',
        body: JSON.stringify(material),
      })

      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        materials: [...site.materials, normalizeMaterial(savedMaterial ?? material)],
      }))
      closeModal()
      setMainTab('materials')
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to add material', error))
      console.error('Failed to add material:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeMaterial(materialId: string) {
    if (!selectedSite) return

    try {
      await request<void>(`/sites/${selectedSite.id}/materials/${materialId}`, {
        method: 'DELETE',
      })
      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        materials: site.materials.filter((material) => material.id !== materialId),
      }))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to remove material', error))
      console.error('Failed to remove material:', error)
    }
  }

  async function handleActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSite) return

    const nextErrors: ActivityErrors = {}
    let activityName = ''

    if (activityMode === 'predefined') {
      const selectedActivity = predefinedActivities.find((activity) => activity.id === activityForm.activityId)
      if (!selectedActivity) {
        nextErrors.activity = true
      } else {
        activityName = selectedActivity.name
      }
    } else {
      activityName = activityForm.customName.trim()
      if (!activityName) {
        nextErrors.customName = true
      }
    }

    setActivityErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const activity: Activity = {
      id: generateId(),
      name: activityName,
      completed: false,
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const savedActivity = await request<RawActivity | undefined>(`/sites/${selectedSite.id}/activities`, {
        method: 'POST',
        body: JSON.stringify(activity),
      })

      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        activities: [...site.activities, normalizeActivity(savedActivity ?? activity)],
      }))
      closeModal()
      setMainTab('activities')
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to add activity', error))
      console.error('Failed to add activity:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeActivity(activityId: string) {
    if (!selectedSite) return

    try {
      await request<void>(`/sites/${selectedSite.id}/activities/${activityId}`, {
        method: 'DELETE',
      })
      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        activities: site.activities.filter((activity) => activity.id !== activityId),
      }))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to remove activity', error))
      console.error('Failed to remove activity:', error)
    }
  }

  async function toggleActivity(activity: Activity) {
    if (!selectedSite) return

    try {
      await request<void>(`/sites/${selectedSite.id}/activities/${activity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !activity.completed }),
      })
      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        activities: site.activities.map((siteActivity) =>
          siteActivity.id === activity.id ? { ...siteActivity, completed: !siteActivity.completed } : siteActivity,
        ),
      }))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to update activity', error))
      console.error('Failed to update activity:', error)
    }
  }

  async function handleOperationalCostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSite) return

    const nextErrors: OperationalCostErrors = {}
    const costName = operationalCostForm.name.trim()
    const amount = Number.parseFloat(operationalCostForm.amount)

    if (!costName) nextErrors.name = true
    if (!Number.isFinite(amount) || amount < 0) nextErrors.amount = true

    setOperationalCostErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const operationalCost: OperationalCost = {
      id: generateId(),
      name: costName,
      amount,
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const savedCost = await request<RawOperationalCost | undefined>(
        `/sites/${selectedSite.id}/operational-costs`,
        {
          method: 'POST',
          body: JSON.stringify(operationalCost),
        },
      )

      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        operationalCosts: [...site.operationalCosts, normalizeOperationalCost(savedCost ?? operationalCost)],
      }))
      closeModal()
      setMainTab('costs')
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to add operational cost', error))
      console.error('Failed to add operational cost:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeOperationalCost(costId: string) {
    if (!selectedSite) return

    try {
      await request<void>(`/sites/${selectedSite.id}/operational-costs/${costId}`, {
        method: 'DELETE',
      })
      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        operationalCosts: site.operationalCosts.filter((cost) => cost.id !== costId),
      }))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to remove operational cost', error))
      console.error('Failed to remove operational cost:', error)
    }
  }

  async function handleLaborCostSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSite) return

    const laborCost = Number.parseFloat(laborCostDraft)

    if (!Number.isFinite(laborCost) || laborCost < 0) {
      setLaborCostError(true)
      return
    }

    setLaborCostError(false)
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const savedSite = await request<RawSite | undefined>(`/sites/${selectedSite.id}`, {
        method: 'PUT',
        body: JSON.stringify({ laborCost }),
      })

      updateSiteLocally(selectedSite.id, (site) => normalizeSite({ ...site, ...(savedSite ?? {}), laborCost }))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to update labor cost', error))
      console.error('Failed to update labor cost:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function exportData() {
    const rows = [
      [
        'Site Name',
        'Materials Count',
        'Activities Count',
        'Progress',
        'Materials Cost',
        'Labor Cost',
        'Operational Costs Total',
        'Total Cost',
      ],
      ...sites.map((site) => {
        const totals = calculateSiteTotals(site)
        return [
          site.name,
          String(site.materials.length),
          String(site.activities.length),
          `${totals.progress}%`,
          formatCurrency(totals.materialCost),
          formatCurrency(site.laborCost),
          formatCurrency(totals.operationalCost),
          formatCurrency(totals.totalCost),
        ]
      }),
    ]

    const csvContent = `\uFEFF${rows.map((row) => row.map(csvEscape).join(',')).join('\n')}`
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'telecom_sites_data.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header-container">
          <div className="header-left">
            {companySettings?.logoUrl ? <img src={companySettings.logoUrl} alt="Logo" className="company-logo" /> : null}
            <h1 className="app-title">{companySettings?.name || 'Telecom Site Manager'}</h1>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" className="btn btn-icon" onClick={openCompanySettingsModal} aria-label="Settings" title="Settings">
              <Icon name="settings" />
            </button>
            <button type="button" className="btn btn-outline" onClick={exportData}>
              <Icon name="download" />
              <span className="btn-text">Export Data</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content">
        {errorMessage ? (
          <div className="alert" role="alert">
            <span>{errorMessage}</span>
            <button type="button" className="btn btn-icon" onClick={() => setErrorMessage(null)} aria-label="Dismiss">
              <Icon name="close" />
            </button>
          </div>
        ) : null}

        {!selectedSite ? (
          <section id="dashboard-view" className="view">
            <div className="dashboard-header">
              <h2 className="section-title">Sites</h2>
              <div className="dashboard-actions">
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={showArchived} 
                    onChange={(e) => setShowArchived(e.target.checked)} 
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label" style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Show Archived</span>
                </label>
                <div className="search-container">
                  <Icon name="search" />
                  <input
                    type="search"
                    className="search-input"
                    placeholder="Search sites..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
                <button type="button" className="btn btn-primary" onClick={openAddSiteModal}>
                  <Icon name="plus" />
                  <span className="btn-text">Add Site</span>
                </button>
              </div>
            </div>

            <div className="sites-grid">
              {isLoading ? (
                <EmptyPanel title="Loading sites" text="Fetching the latest project data." />
              ) : filteredSites.length === 0 ? (
                <EmptyPanel
                  title={searchTerm.trim() ? 'No sites found' : 'No sites found'}
                  text={searchTerm.trim() ? 'Try a different search term.' : 'Get started by adding your first site.'}
                  actionLabel={searchTerm.trim() ? undefined : 'Add Site'}
                  onAction={searchTerm.trim() ? undefined : openAddSiteModal}
                />
              ) : (
                filteredSites.map((site) => <SiteCard key={site.id} site={site} onView={showSiteDetails} />)
              )}
            </div>
          </section>
        ) : (
          <section id="site-details-view" className="view">
            <div className="site-details-header">
              <button type="button" className="btn btn-icon" onClick={showDashboard} aria-label="Back to sites" title="Back to sites">
                <Icon name="arrow-left" />
              </button>
              <div className="site-info">
                <div className="site-title-container">
                  <h2 className="site-title">{selectedSite.name}</h2>
                  <button type="button" className="btn btn-icon" onClick={openEditSiteModal} aria-label="Edit site name" title="Edit site name">
                    <Icon name="edit" />
                  </button>
                </div>
                <div className="site-meta">
                  <span>{selectedSite.materials.length} materials</span>
                  <span>{selectedSite.activities.length} activities</span>
                  <span>{selectedSiteTotals?.progress ?? 0}% complete</span>
                </div>
              </div>
              <div className="site-details-actions" style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn btn-outline" onClick={() => toggleArchiveSite(selectedSite.id, selectedSite.isArchived)} disabled={isSaving}>
                  <Icon name={selectedSite.isArchived ? "archive-restore" : "archive"} />
                  <span className="btn-text">{selectedSite.isArchived ? "Unarchive" : "Archive"}</span>
                </button>
                <button type="button" className="btn btn-danger" onClick={() => setModal('delete-site')}>
                  <Icon name="trash" />
                  <span className="btn-text">Delete Site</span>
                </button>
              </div>
            </div>

            <div className="cost-summary-cards">
              <div className="card cost-card">
                <div className="card-header">
                  <h3 className="card-title">Material Cost</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.materialCost ?? 0)}</div>
                  <p className="cost-meta">{selectedSite.materials.length} materials added</p>
                </div>
              </div>

              <div className="card cost-card">
                <div className="card-header">
                  <h3 className="card-title">Labor & Operational</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.laborAndOperationalCost ?? 0)}</div>
                  <p className="cost-meta">Combined costs</p>
                </div>
              </div>

              <div className="card cost-card">
                <div className="card-header">
                  <h3 className="card-title">Total Cost</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.totalCost ?? 0)}</div>
                  <p className="cost-meta">All costs combined</p>
                </div>
              </div>
            </div>

            <div className="tabs-container">
              <div className="tabs" role="tablist" aria-label="Site detail sections">
                <button
                  type="button"
                  className={`tab-btn ${mainTab === 'about' ? 'active' : ''}`}
                  onClick={() => setMainTab('about')}
                >
                  About
                </button>
                <button
                  type="button"
                  className={`tab-btn ${mainTab === 'materials' ? 'active' : ''}`}
                  onClick={() => setMainTab('materials')}
                >
                  Materials
                </button>
                <button
                  type="button"
                  className={`tab-btn ${mainTab === 'activities' ? 'active' : ''}`}
                  onClick={() => setMainTab('activities')}
                >
                  Activities
                </button>
                <button
                  type="button"
                  className={`tab-btn ${mainTab === 'costs' ? 'active' : ''}`}
                  onClick={() => setMainTab('costs')}
                >
                  Costs
                </button>
              </div>

              {mainTab === 'about' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title" style={{ margin: 0 }}>About Site</h3>
                  </div>
                  
                  <div className="about-grid">
                    {selectedSite.siteCode ? (
                      <div className="about-field">
                        <span className="about-label">Site Code</span>
                        <div className="about-value"><span className="badge badge-site-type">{selectedSite.siteCode}</span></div>
                      </div>
                    ) : null}
                    
                    {selectedSite.siteType ? (
                      <div className="about-field">
                        <span className="about-label">Site Type</span>
                        <div className="about-value">
                          <span className="badge badge-site-type" style={{ backgroundColor: 'var(--primary-color)', color: 'white', display: 'inline-flex', gap: '4px' }}>
                            <Icon name="signal" /> {selectedSite.siteType}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="about-field">
                      <span className="about-label">Region</span>
                      <div className="about-value">{selectedSite.region || <span className="text-light">Not set</span>}</div>
                    </div>
                    
                    <div className="about-field">
                      <span className="about-label">Location</span>
                      <div className="about-value">{selectedSite.location || <span className="text-light">Not set</span>}</div>
                    </div>
                  </div>

                  {(selectedSite.latitude !== null && selectedSite.longitude !== null) ? (
                    <div className="about-section mt-4">
                      <span className="about-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Icon name="map-pin" /> GPS Location
                      </span>
                      <div className="map-container">
                        <iframe
                          title="Google Maps Preview"
                          className="map-iframe"
                          frameBorder="0"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://maps.google.com/maps?q=${selectedSite.latitude},${selectedSite.longitude}&hl=en&z=14&output=embed`}
                          allowFullScreen
                        ></iframe>
                      </div>
                      {selectedSite.googleMapsUrl ? (
                        <div style={{ marginTop: '0.75rem' }}>
                          <a href={selectedSite.googleMapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.875rem' }}>
                            Open in Google Maps &rarr;
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedSite.images && selectedSite.images.length > 0 ? (
                    <div className="about-section mt-4">
                      <span className="about-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Icon name="image" /> Site Images
                      </span>
                      <div className="image-gallery">
                        {selectedSite.images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="image-gallery-item"
                            onClick={() => openSlideshow(idx)}
                            title={`View image ${idx + 1}`}
                            aria-label={`View image ${idx + 1}`}
                          >
                            <img src={img} alt={`Site image ${idx + 1}`} loading="lazy" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selectedSite.notes ? (
                    <div className="about-section mt-4">
                      <span className="about-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Icon name="file-text" /> Notes
                      </span>
                      <div className="notes-display">
                        {selectedSite.notes}
                      </div>
                    </div>
                  ) : null}

                  {(!selectedSite.siteCode && !selectedSite.siteType && !selectedSite.region && !selectedSite.location && selectedSite.latitude === null && selectedSite.longitude === null && selectedSite.images.length === 0 && !selectedSite.notes) ? (
                    <EmptyPanel
                      title="No site info available"
                      text="Click the edit icon next to the site name to add information."
                      icon="info"
                    />
                  ) : null}
                </div>
              ) : null}

              {mainTab === 'materials' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title">Materials</h3>
                    <button type="button" className="btn btn-primary" onClick={openMaterialModal}>
                      <Icon name="plus" />
                      <span>Add Material</span>
                    </button>
                  </div>
                  <div className="list-container">
                    {selectedSite.materials.length === 0 ? (
                      <EmptyPanel
                        title="No materials added yet"
                        text="Track purchased and allocated materials for this site."
                        actionLabel="Add Material"
                        onAction={openMaterialModal}
                        icon="building"
                      />
                    ) : (
                      selectedSite.materials.map((material) => (
                        <div className="list-item" key={material.id}>
                          <div>
                            <h4 className="list-item-title">{material.name}</h4>
                            <p className="list-item-subtitle">
                              {material.quantity} {material.unit}
                            </p>
                          </div>
                          <div className="list-item-actions">
                            <span className="cost-value">{formatCurrency(material.cost)}</span>
                            <button
                              type="button"
                              className="btn btn-icon"
                              onClick={() => removeMaterial(material.id)}
                              aria-label={`Remove ${material.name}`}
                              title={`Remove ${material.name}`}
                            >
                              <Icon name="trash" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {mainTab === 'activities' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title">Activities</h3>
                    <button type="button" className="btn btn-primary" onClick={openActivityModal}>
                      <Icon name="plus" />
                      <span>Add Activity</span>
                    </button>
                  </div>
                  <div className="list-container">
                    {selectedSite.activities.length === 0 ? (
                      <EmptyPanel
                        title="No activities added yet"
                        text="Add work activities to measure site progress."
                        actionLabel="Add Activity"
                        onAction={openActivityModal}
                        icon="check-circle"
                      />
                    ) : (
                      selectedSite.activities.map((activity) => (
                        <div className="list-item" key={activity.id}>
                          <div className="list-item-content">
                            <button
                              type="button"
                              className={`list-item-checkbox ${activity.completed ? 'checked' : ''}`}
                              onClick={() => toggleActivity(activity)}
                              aria-label={activity.completed ? 'Mark activity incomplete' : 'Mark activity complete'}
                              title={activity.completed ? 'Mark incomplete' : 'Mark complete'}
                            >
                              <Icon name={activity.completed ? 'check-circle' : 'circle'} />
                            </button>
                            <h4 className={`list-item-title ${activity.completed ? 'completed' : ''}`}>{activity.name}</h4>
                          </div>
                          <button
                            type="button"
                            className="btn btn-icon"
                            onClick={() => removeActivity(activity.id)}
                            aria-label={`Remove ${activity.name}`}
                            title={`Remove ${activity.name}`}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {mainTab === 'costs' ? (
                <div className="tab-content active">
                  <h3 className="tab-title">Labor Cost</h3>
                  <form className="inline-panel mb-4" onSubmit={handleLaborCostSubmit}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="labor-cost-input">Amount (GHS)</label>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <input
                            type="number"
                            id="labor-cost-input"
                            className="input"
                            min="0"
                            step="0.01"
                            value={laborCostDraft}
                            onChange={(event) => setLaborCostDraft(event.target.value)}
                          />
                          {laborCostError ? <p className="input-error">Labor cost must be a valid non-negative number</p> : null}
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={isSaving}>
                          <Icon name="check" />
                          <span>Update</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="tab-header mt-4" style={{ marginTop: '2rem' }}>
                    <h3 className="tab-title" style={{ margin: 0 }}>Operational Costs</h3>
                    <button type="button" className="btn btn-primary" onClick={openOperationalCostModal}>
                      <Icon name="plus" />
                      <span>Add Cost</span>
                    </button>
                  </div>
                  <div className="list-container mb-4">
                    {selectedSite.operationalCosts.length === 0 ? (
                      <EmptyPanel
                        title="No operational costs added yet"
                        text="Track transport, tools, and other site expenses."
                        actionLabel="Add Cost"
                        onAction={openOperationalCostModal}
                        icon="plus"
                      />
                    ) : (
                      selectedSite.operationalCosts.map((cost) => (
                        <div className="list-item" key={cost.id}>
                          <div>
                            <h4 className="list-item-title">{cost.name}</h4>
                            <p className="list-item-subtitle">Allocated: {formatCurrency(cost.amount)}</p>
                          </div>
                          <button
                            type="button"
                            className="btn btn-icon"
                            onClick={() => removeOperationalCost(cost.id)}
                            aria-label={`Remove ${cost.name}`}
                            title={`Remove ${cost.name}`}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <h3 className="tab-title mt-4" style={{ marginTop: '2rem' }}>Cost Summary</h3>
                  <div className="inline-panel">
                    <div className="cost-summary">
                      <div className="cost-row">
                        <span className="cost-label">Materials Cost:</span>
                        <span className="cost-value">{formatCurrency(selectedSiteTotals?.materialCost ?? 0)}</span>
                      </div>
                      <div className="cost-row">
                        <span className="cost-label">Labor Cost:</span>
                        <span className="cost-value">{formatCurrency(selectedSite.laborCost)}</span>
                      </div>
                      <div className="cost-row">
                        <span className="cost-label">Operational Cost:</span>
                        <span className="cost-value">{formatCurrency(selectedSiteTotals?.operationalCost ?? 0)}</span>
                      </div>
                      <div className="cost-row total">
                        <span className="cost-label">Total Cost:</span>
                        <span className="cost-value">{formatCurrency(selectedSiteTotals?.totalCost ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {modal === 'site' ? (
        <Modal title={siteModalMode === 'add' ? 'Add New Site' : 'Edit Site Info'} onClose={closeModal}>
          <form className="modal-form" onSubmit={handleSiteSubmit}>
            <div className="form-group">
              <label htmlFor="site-name-input">Site Name *</label>
              <input
                type="text"
                id="site-name-input"
                className="input"
                value={siteName}
                onChange={(event) => {
                  setSiteName(event.target.value)
                  setSiteNameError(false)
                }}
                autoFocus
              />
              {siteNameError ? <p className="input-error">Site name is required</p> : null}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="site-type-select">Site Type</label>
                <select
                  id="site-type-select"
                  className="select"
                  value={siteFormType}
                  onChange={(event) => setSiteFormType(event.target.value)}
                >
                  <option value="">Select type</option>
                  {siteTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="site-region-input">Region</label>
                <input
                  type="text"
                  id="site-region-input"
                  className="input"
                  placeholder="e.g. Greater Accra"
                  value={siteFormRegion}
                  onChange={(event) => setSiteFormRegion(event.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="site-location-input">Location</label>
              <input
                type="text"
                id="site-location-input"
                className="input"
                placeholder="e.g. Adum, Kumasi"
                value={siteFormLocation}
                onChange={(event) => setSiteFormLocation(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="site-map-location-input">Map Location (Coordinates or Google Maps)</label>
              <input
                type="text"
                id="site-map-location-input"
                className="input"
                placeholder={'e.g. 5.6037, -0.1870 · 40° 26\' 46" N, 79° 58\' 56" W · https://maps.app.goo.gl/...'}
                value={siteFormLocationInput}
                onChange={(event) => {
                  const value = event.target.value
                  setSiteFormLocationInput(value)
                  parseLocationInput(value).then((parsed) => {
                    setSiteFormLatitude(parsed.latitude)
                    setSiteFormLongitude(parsed.longitude)
                    setSiteFormGoogleMapsUrl(parsed.googleMapsUrl)
                  })
                }}
              />
              <p className="form-help">
                Paste decimal (e.g. 5.6037, -0.1870), cardinal coordinates
                (e.g. 40° 26' 46" N, 79° 58' 56" W), or a Google Maps link (maps.app.goo.gl/...).
              </p>
              {siteFormLatitude && siteFormLongitude ? (
                <p className="location-detected">Detected: {siteFormLatitude}, {siteFormLongitude}</p>
              ) : null}
            </div>

            <div className="form-group">
              <label>Images</label>
              <div className="image-link-list">
                {siteFormImages.map((imageUrl, index) => (
                  <div className="image-link-row" key={index}>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://example.com/img1.jpg"
                      value={imageUrl}
                      onChange={(event) => updateImageLink(index, event.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-icon"
                      onClick={() => removeImageLink(index)}
                      aria-label={`Remove image link ${index + 1}`}
                      title="Remove image link"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-outline" onClick={addImageLink}>
                <Icon name="plus" />
                <span>Add Image Link</span>
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="site-notes-input">Notes</label>
              <textarea
                id="site-notes-input"
                className="input"
                style={{ minHeight: '80px', resize: 'vertical' }}
                placeholder="Any additional notes about the site..."
                value={siteFormNotes}
                onChange={(event) => setSiteFormNotes(event.target.value)}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="check" />
                <span>Save</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'material' ? (
        <Modal title="Add Material" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleMaterialSubmit}>
            <div className="tabs modal-tabs">
              <button
                type="button"
                className={`tab-btn ${materialMode === 'predefined' ? 'active' : ''}`}
                onClick={() => setMaterialMode('predefined')}
              >
                Predefined
              </button>
              <button
                type="button"
                className={`tab-btn ${materialMode === 'custom' ? 'active' : ''}`}
                onClick={() => setMaterialMode('custom')}
              >
                Custom
              </button>
            </div>

            {materialMode === 'predefined' ? (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="predefined-material-select">Select Material</label>
                  <select
                    id="predefined-material-select"
                    className="select"
                    value={materialForm.materialId}
                    onChange={(event) => {
                      setMaterialForm((form) => ({ ...form, materialId: event.target.value }))
                      setMaterialErrors((errors) => ({ ...errors, material: false }))
                    }}
                  >
                    <option value="">Select a material</option>
                    {predefinedMaterials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.name}
                      </option>
                    ))}
                  </select>
                  {materialErrors.material ? <p className="input-error">Please select a material</p> : null}
                </div>
              </div>
            ) : (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="custom-material-input">Material Name</label>
                  <input
                    type="text"
                    id="custom-material-input"
                    className="input"
                    placeholder="e.g., Fiber Optic Cable"
                    value={materialForm.customName}
                    onChange={(event) => {
                      setMaterialForm((form) => ({ ...form, customName: event.target.value }))
                      setMaterialErrors((errors) => ({ ...errors, customName: false }))
                    }}
                  />
                  {materialErrors.customName ? <p className="input-error">Material name is required</p> : null}
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="material-quantity-input">Quantity</label>
                <input
                  type="number"
                  id="material-quantity-input"
                  className="input"
                  min="0.01"
                  step="0.01"
                  value={materialForm.quantity}
                  onChange={(event) => {
                    setMaterialForm((form) => ({ ...form, quantity: event.target.value }))
                    setMaterialErrors((errors) => ({ ...errors, quantity: false }))
                  }}
                />
                {materialErrors.quantity ? <p className="input-error">Quantity must be greater than 0</p> : null}
              </div>

              <div className="form-group">
                <label htmlFor="material-unit-select">Unit</label>
                <select
                  id="material-unit-select"
                  className="select"
                  value={materialForm.unit}
                  onChange={(event) => {
                    setMaterialForm((form) => ({ ...form, unit: event.target.value }))
                    setMaterialErrors((errors) => ({ ...errors, unit: false }))
                  }}
                >
                  {materialUnits.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
                {materialErrors.unit ? <p className="input-error">Unit is required</p> : null}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="material-cost-input">Cost (GHS)</label>
              <input
                type="number"
                id="material-cost-input"
                className="input"
                min="0"
                step="0.01"
                value={materialForm.cost}
                onChange={(event) => {
                  setMaterialForm((form) => ({ ...form, cost: event.target.value }))
                  setMaterialErrors((errors) => ({ ...errors, cost: false }))
                }}
              />
              {materialErrors.cost ? <p className="input-error">Cost must be a valid non-negative number</p> : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="plus" />
                <span>Add Material</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'activity' ? (
        <Modal title="Add Activity" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleActivitySubmit}>
            <div className="tabs modal-tabs">
              <button
                type="button"
                className={`tab-btn ${activityMode === 'predefined' ? 'active' : ''}`}
                onClick={() => setActivityMode('predefined')}
              >
                Predefined
              </button>
              <button
                type="button"
                className={`tab-btn ${activityMode === 'custom' ? 'active' : ''}`}
                onClick={() => setActivityMode('custom')}
              >
                Custom
              </button>
            </div>

            {activityMode === 'predefined' ? (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="predefined-activity-select">Select Activity</label>
                  <select
                    id="predefined-activity-select"
                    className="select"
                    value={activityForm.activityId}
                    onChange={(event) => {
                      setActivityForm((form) => ({ ...form, activityId: event.target.value }))
                      setActivityErrors((errors) => ({ ...errors, activity: false }))
                    }}
                  >
                    <option value="">Select an activity</option>
                    {predefinedActivities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                  {activityErrors.activity ? <p className="input-error">Please select an activity</p> : null}
                </div>
              </div>
            ) : (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="custom-activity-input">Activity Name</label>
                  <input
                    type="text"
                    id="custom-activity-input"
                    className="input"
                    placeholder="e.g., Install Antenna"
                    value={activityForm.customName}
                    onChange={(event) => {
                      setActivityForm((form) => ({ ...form, customName: event.target.value }))
                      setActivityErrors((errors) => ({ ...errors, customName: false }))
                    }}
                  />
                  {activityErrors.customName ? <p className="input-error">Activity name is required</p> : null}
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="plus" />
                <span>Add Activity</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'operational-cost' ? (
        <Modal title="Add Operational Cost" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleOperationalCostSubmit}>
            <div className="form-group">
              <label htmlFor="operational-cost-name-input">Cost Name</label>
              <input
                type="text"
                id="operational-cost-name-input"
                className="input"
                placeholder="e.g., Transport, Tools"
                value={operationalCostForm.name}
                onChange={(event) => {
                  setOperationalCostForm((form) => ({ ...form, name: event.target.value }))
                  setOperationalCostErrors((errors) => ({ ...errors, name: false }))
                }}
              />
              {operationalCostErrors.name ? <p className="input-error">Cost name is required</p> : null}
            </div>

            <div className="form-group">
              <label htmlFor="operational-cost-amount-input">Amount (GHS)</label>
              <input
                type="number"
                id="operational-cost-amount-input"
                className="input"
                min="0"
                step="0.01"
                value={operationalCostForm.amount}
                onChange={(event) => {
                  setOperationalCostForm((form) => ({ ...form, amount: event.target.value }))
                  setOperationalCostErrors((errors) => ({ ...errors, amount: false }))
                }}
              />
              {operationalCostErrors.amount ? <p className="input-error">Amount must be a valid non-negative number</p> : null}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="plus" />
                <span>Add Cost</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'delete-site' && selectedSite ? (
        <Modal title="Confirm Deletion" onClose={closeModal}>
          <div className="modal-form">
            <p className="confirm-message">Are you sure you want to delete {selectedSite.name}? This action cannot be undone.</p>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={deleteSite} disabled={isSaving}>
                <Icon name="trash" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === 'company-settings' ? (
        <Modal title="Company Settings" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleCompanySettingsSubmit}>
            <div className="form-group">
              <label htmlFor="settings-name-input">Company Name</label>
              <input
                type="text"
                id="settings-name-input"
                className="input"
                value={companySettingsForm.name}
                onChange={(event) => {
                  setCompanySettingsForm((form) => ({ ...form, name: event.target.value }))
                  setCompanySettingsErrors((errors) => ({ ...errors, name: false }))
                }}
              />
              {companySettingsErrors.name ? <p className="input-error">Company name is required</p> : null}
            </div>
            
            <div className="form-group">
              <label htmlFor="settings-logo-input">Logo URL</label>
              <input
                type="url"
                id="settings-logo-input"
                className="input"
                value={companySettingsForm.logoUrl}
                onChange={(event) => setCompanySettingsForm((form) => ({ ...form, logoUrl: event.target.value }))}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="settings-email-input">Email</label>
              <input
                type="email"
                id="settings-email-input"
                className="input"
                value={companySettingsForm.email}
                onChange={(event) => {
                  setCompanySettingsForm((form) => ({ ...form, email: event.target.value }))
                  setCompanySettingsErrors((errors) => ({ ...errors, email: false }))
                }}
              />
              {companySettingsErrors.email ? <p className="input-error">Email is required</p> : null}
            </div>

            <div className="form-group">
              <label htmlFor="settings-phone-input">Phone</label>
              <input
                type="text"
                id="settings-phone-input"
                className="input"
                value={companySettingsForm.phone}
                onChange={(event) => setCompanySettingsForm((form) => ({ ...form, phone: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-address-input">Address</label>
              <input
                type="text"
                id="settings-address-input"
                className="input"
                value={companySettingsForm.address}
                onChange={(event) => setCompanySettingsForm((form) => ({ ...form, address: event.target.value }))}
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-website-input">Website</label>
              <input
                type="url"
                id="settings-website-input"
                className="input"
                value={companySettingsForm.website}
                onChange={(event) => setCompanySettingsForm((form) => ({ ...form, website: event.target.value }))}
              />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="check" />
                <span>Save Settings</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {isSlideshowOpen && selectedSite && selectedSite.images.length > 0 ? (
        <div className="slideshow-modal" role="dialog" aria-modal="true" aria-label="Image slideshow" onMouseDown={closeSlideshow}>
          <div className="slideshow-content" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="slideshow-close" onClick={closeSlideshow} aria-label="Close slideshow" title="Close slideshow">
              <Icon name="close" />
            </button>
            <img
              className="slideshow-image"
              src={selectedSite.images[slideshowIndex]}
              alt={`Site image ${slideshowIndex + 1}`}
            />
            {selectedSite.images.length > 1 ? (
              <>
                <button type="button" className="slideshow-nav slideshow-prev" onClick={showPreviousImage} aria-label="Previous image" title="Previous image">
                  <Icon name="arrow-left" />
                </button>
                <button type="button" className="slideshow-nav slideshow-next" onClick={showNextImage} aria-label="Next image" title="Next image">
                  <Icon name="arrow-right" />
                </button>
              </>
            ) : null}
            <div className="slideshow-counter">
              {slideshowIndex + 1} / {selectedSite.images.length}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
