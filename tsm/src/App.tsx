import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode, SyntheticEvent } from 'react'
import './App.css'
import {
  API_BASE_URL,
  UNAUTHORIZED_EVENT,
  clearCache,
  clearSession,
  getStoredAuth,
  readCache,
  request,
  warmUpServer,
  writeCache,
} from './api'
import type { AuthUser } from './api'
import { AuthScreen } from './Auth'
import { FIBER_COLORS } from './fiber'

// Loaded as its own chunk - it pulls in the charting library, which should not
// sit on the critical path for the main app.
const AiAssistant = lazy(() => import('./AiAssistant'))

type ThemePreference = 'system' | 'light' | 'dark'

function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem('tsm_theme')
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function applyThemePreference(theme: ThemePreference) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try {
    if (theme === 'system') localStorage.removeItem('tsm_theme')
    else localStorage.setItem('tsm_theme', theme)
  } catch {
    // ignore
  }
}

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
  isArchived: boolean
  startDatetime: string | null
  endDatetime: string | null
  createdAt: string | null
  updatedAt: string | null
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
  createdAt: string | null
  updatedAt: string | null
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
  isArchived?: unknown
  startDatetime?: unknown
  endDatetime?: unknown
  createdAt?: unknown
  updatedAt?: unknown
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
  createdAt?: unknown
  updatedAt?: unknown
  materials?: RawMaterial[] | null
  activities?: RawActivity[] | null
  operationalCosts?: RawOperationalCost[] | null
}

type MainTab = 'about' | 'materials' | 'activities' | 'costs'
type ModalType =
  | 'site'
  | 'material'
  | 'activity'
  | 'edit-activity'
  | 'operational-cost'
  | 'delete-site'
  | 'company-settings'
  | null
type SiteModalMode = 'add' | 'edit'
type MaterialMode = 'predefined' | 'custom'
type ActivityMode = 'predefined' | 'custom'
type MaterialErrors = Partial<Record<'material' | 'customName' | 'quantity' | 'unit' | 'cost', boolean>>
type ActivityErrors = Partial<Record<'activity' | 'customName', boolean>>
type OperationalCostErrors = Partial<Record<'name' | 'amount', boolean>>
type CompanySettingsErrors = Partial<Record<'name' | 'email', boolean>>
type SiteSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'cost-desc' | 'progress-asc'
type SiteFilter = 'active' | 'archived' | 'all'
type ActivitySortOption = 'newest' | 'start' | 'end' | 'name'
type SiteViewLayout = 'grid' | 'list'

type StatsPeriod = {
  period: string
  laborCost: number
  materialsCost: number
  operationalCost: number
  total: number
}

type StatsResponse = {
  totalSites: number
  archivedSites: number
  completedSites: number
  completedPercentage: number
  expenses: {
    totalLaborCost: number
    totalMaterialsCost: number
    totalOperationalCost: number
    totalExpenses: number
    monthly: StatsPeriod[]
    yearly: StatsPeriod[]
  }
}

type ImportSkippedEntry = {
  name: string
  siteCode: string
  reason: string
}

type ImportResult = {
  message: string
  importedCount: number
  skippedCount: number
  importedSiteIds: string[]
  skipped: ImportSkippedEntry[]
}

type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up-down'
  | 'archive'
  | 'archive-restore'
  | 'bar-chart'
  | 'building'
  | 'check'
  | 'check-circle'
  | 'circle'
  | 'close'
  | 'download'
  | 'edit'
  | 'file-text'
  | 'grid'
  | 'image'
  | 'info'
  | 'list'
  | 'map-pin'
  | 'plus'
  | 'search'
  | 'settings'
  | 'signal'
  | 'trash'
  | 'upload'
  | 'log-out'
  | 'sun'
  | 'moon'
  | 'monitor'

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

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return typeof value === 'string' ? value : String(value)
}

function normalizeActivity(raw: RawActivity): Activity {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled activity'),
    completed: booleanValue(raw.completed),
    isArchived: booleanValue(raw.isArchived),
    startDatetime: nullableText(raw.startDatetime),
    endDatetime: nullableText(raw.endDatetime),
    createdAt: nullableText(raw.createdAt),
    updatedAt: nullableText(raw.updatedAt),
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
    createdAt: nullableText(raw.createdAt),
    updatedAt: nullableText(raw.updatedAt),
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

const amountFormatter = new Intl.NumberFormat('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function formatAmount(amount: number) {
  return amountFormatter.format(Number.isFinite(amount) ? amount : 0)
}

function formatCurrency(amount: number) {
  return `GHS ${formatAmount(amount)}`
}

function CostFigure({ amount }: { amount: number }) {
  return (
    <span className="cost-figure">
      <span className="currency">GHS</span>
      {formatAmount(amount)}
    </span>
  )
}

// Site types take their colour from the fibre-optic strand colour code.
const SITE_TYPE_STRANDS: Record<string, number> = {
  '4g': 0, // blue
  '5g': 9, // violet
  fiber: 1, // orange
  fibre: 1,
  microwave: 2, // green
  satellite: 11, // aqua
  other: 4, // slate
}

function strandColor(siteType: string): string | undefined {
  const key = siteType.trim().toLowerCase()
  if (!key) return undefined
  if (key in SITE_TYPE_STRANDS) return FIBER_COLORS[SITE_TYPE_STRANDS[key]]
  let hash = 0
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return FIBER_COLORS[hash % FIBER_COLORS.length]
}

function strandStyle(siteType: string): CSSProperties | undefined {
  const color = strandColor(siteType)
  return color ? ({ '--strand': color } as CSSProperties) : undefined
}

// Same numbers the backend's /sites/stats returns, computed from data we
// already have so the stats view opens instantly.
function computeStats(allSites: Site[]): StatsResponse {
  const sites = allSites.filter((site) => !site.isArchived)
  const archivedSites = allSites.length - sites.length
  let completedSites = 0
  let totalLabor = 0
  let totalMaterials = 0
  let totalOperational = 0
  const monthly = new Map<string, StatsPeriod>()
  const yearly = new Map<string, StatsPeriod>()

  const bucket = (store: Map<string, StatsPeriod>, key: string) => {
    let row = store.get(key)
    if (!row) {
      row = { period: key, laborCost: 0, materialsCost: 0, operationalCost: 0, total: 0 }
      store.set(key, row)
    }
    return row
  }

  for (const site of sites) {
    const active = site.activities.filter((activity) => !activity.isArchived)
    if (active.length > 0 && active.every((activity) => activity.completed)) completedSites += 1

    const labor = site.laborCost || 0
    const materials = calculateMaterialCost(site)
    const operational = calculateOperationalCostTotal(site)
    totalLabor += labor
    totalMaterials += materials
    totalOperational += operational

    const created = site.createdAt ? new Date(site.createdAt) : null
    const valid = created && !Number.isNaN(created.getTime())
    const monthKey = valid ? `${created.getUTCFullYear()}-${pad2(created.getUTCMonth() + 1)}` : 'unknown'
    const yearKey = valid ? String(created.getUTCFullYear()) : 'unknown'
    for (const [store, key] of [
      [monthly, monthKey],
      [yearly, yearKey],
    ] as const) {
      const row = bucket(store, key)
      row.laborCost += labor
      row.materialsCost += materials
      row.operationalCost += operational
      row.total += labor + materials + operational
    }
  }

  const sorted = (store: Map<string, StatsPeriod>) =>
    [...store.values()].sort((a, b) => a.period.localeCompare(b.period))

  return {
    totalSites: sites.length,
    archivedSites,
    completedSites,
    completedPercentage: sites.length ? Math.round((completedSites / sites.length) * 1000) / 10 : 0,
    expenses: {
      totalLaborCost: totalLabor,
      totalMaterialsCost: totalMaterials,
      totalOperationalCost: totalOperational,
      totalExpenses: totalLabor + totalMaterials + totalOperational,
      monthly: sorted(monthly),
      yearly: sorted(yearly),
    },
  }
}

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function todayDateInputValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function isoToDateInputValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function isoToDatetimeLocalValue(value: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function dateInputToIso(value: string): string | undefined {
  if (!value) return undefined
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function formatActivityRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null
  if (start && end) return `${formatDateTime(start)} → ${formatDateTime(end)}`
  if (start) return `Starts ${formatDateTime(start)}`
  return `Ends ${formatDateTime(end as string)}`
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

function buildErrorMessage(action: string, error: unknown) {
  const detail = error instanceof Error ? error.message : 'Please try again.'
  return `${action}. ${detail}`
}

function Icon({ name }: { name: IconName }) {
  switch (name) {
    case 'log-out':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="m16 17 5-5-5-5" />
          <path d="M21 12H9" />
        </svg>
      )
    case 'sun':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )
    case 'moon':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      )
    case 'monitor':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      )
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
    case 'arrow-up-down':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m21 16-4 4-4-4" />
          <path d="M17 20V4" />
          <path d="m3 8 4-4 4 4" />
          <path d="M7 4v16" />
        </svg>
      )
    case 'grid':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'list':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="8" x2="21" y1="6" y2="6" />
          <line x1="8" x2="21" y1="12" y2="12" />
          <line x1="8" x2="21" y1="18" y2="18" />
          <line x1="3" x2="3.01" y1="6" y2="6" />
          <line x1="3" x2="3.01" y1="12" y2="12" />
          <line x1="3" x2="3.01" y1="18" y2="18" />
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
    case 'bar-chart':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <line x1="12" x2="12" y1="20" y2="10" />
          <line x1="18" x2="18" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
      )
    case 'upload':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M12 3v12" />
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
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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

const LONG_PRESS_MS = 500

function useLongPress(onLongPress: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firedRef = useRef(false)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const start = () => {
    firedRef.current = false
    clearTimer()
    timerRef.current = setTimeout(() => {
      firedRef.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  return {
    onTouchStart: start,
    onTouchEnd: clearTimer,
    onTouchMove: clearTimer,
    onTouchCancel: clearTimer,
    onContextMenu: (event: SyntheticEvent) => {
      if (firedRef.current) event.preventDefault()
    },
    onClickCapture: (event: SyntheticEvent) => {
      if (firedRef.current) {
        event.preventDefault()
        event.stopPropagation()
        firedRef.current = false
      }
    },
  }
}

function SiteCard({
  site,
  onView,
  selectMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPress,
  layout = 'grid',
}: {
  site: Site
  onView: (siteId: string) => void
  selectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (siteId: string) => void
  onLongPress?: (siteId: string) => void
  layout?: SiteViewLayout
}) {
  const totals = calculateSiteTotals(site)
  const createdLabel = formatDate(site.createdAt)
  const longPressHandlers = useLongPress(() => onLongPress?.(site.id))
  const pressHandlers = !selectMode && onLongPress ? longPressHandlers : {}
  const handleClick = () => (selectMode ? onToggleSelect?.(site.id) : onView(site.id))
  const cardClass = `site-card${layout === 'list' ? ' site-card-list' : ''}${isSelected ? ' is-selected' : ''}${
    site.isArchived ? ' is-archived' : ''
  }${selectMode ? ' has-select' : ''}`

  const selectCheckbox = selectMode ? (
    <label className="site-card-select" onClick={(event) => event.stopPropagation()}>
      <input
        type="checkbox"
        className="select-checkbox"
        checked={isSelected}
        onChange={() => onToggleSelect?.(site.id)}
        aria-label={`Select ${site.name}`}
      />
    </label>
  ) : null

  const typeBadge = site.siteType ? (
    <span className="badge badge-site-type">
      <span className="dot" />
      {site.siteType}
    </span>
  ) : null
  const archivedBadge = site.isArchived ? <span className="badge badge-archived">Archived</span> : null
  const metaParts = [site.region || site.location, site.siteCode].filter(Boolean)

  const progress = (
    <>
      <div className="progress-bar" role="progressbar" aria-valuenow={totals.progress} aria-valuemin={0} aria-valuemax={100} aria-label="Activities complete">
        <div className={`progress-fill${totals.progress === 100 ? ' is-complete' : ''}`} style={{ width: `${totals.progress}%` }} />
      </div>
      <span className="progress-value">{totals.progress}%</span>
    </>
  )

  if (layout === 'list') {
    return (
      <article className={cardClass} style={strandStyle(site.siteType)}>
        {selectCheckbox}
        <button type="button" className="site-list-row" onClick={handleClick} {...pressHandlers}>
          <div className="site-list-main">
            <div className="site-list-title">
              <h3 className="site-name">{site.name}</h3>
              {typeBadge}
              {archivedBadge}
            </div>
            <p className="site-meta-line">
              {[...metaParts, createdLabel ? `Created ${createdLabel}` : null].filter(Boolean).join(', ') ||
                `${site.activities.length} activities`}
            </p>
          </div>
          <div className="site-list-stats">
            <div className="site-list-progress">{progress}</div>
            <span className="site-list-total">{formatCurrency(totals.totalCost)}</span>
          </div>
          <Icon name="arrow-right" />
        </button>
      </article>
    )
  }

  return (
    <article className={cardClass} style={strandStyle(site.siteType)}>
      {selectCheckbox}
      <button type="button" className="site-card-body" onClick={handleClick} {...pressHandlers}>
        <div className="site-card-top">
          {typeBadge ?? <span className="badge badge-archived">No type</span>}
          {archivedBadge}
        </div>
        <div className="site-heading">
          <h3 className="site-name">{site.name}</h3>
          <p className="site-meta-line">{metaParts.length ? metaParts.join(', ') : createdLabel ? `Created ${createdLabel}` : 'No location yet'}</p>
        </div>
        <div className="site-card-total">
          <CostFigure amount={totals.totalCost} />
          <span className="cost-meta">total cost</span>
        </div>
        <div className="progress-container">{progress}</div>
        <div className="cost-breakdown">
          <div className="cost-breakdown-item">
            <span className="cost-label">Materials</span>
            <span className="cost-value">{formatAmount(totals.materialCost)}</span>
          </div>
          <div className="cost-breakdown-item">
            <span className="cost-label">Labor</span>
            <span className="cost-value">{formatAmount(site.laborCost)}</span>
          </div>
          <div className="cost-breakdown-item">
            <span className="cost-label">Operational</span>
            <span className="cost-value">{formatAmount(totals.operationalCost)}</span>
          </div>
        </div>
      </button>
    </article>
  )
}

function SkeletonSites({ layout }: { layout: SiteViewLayout }) {
  return (
    <>
      {Array.from({ length: layout === 'list' ? 5 : 6 }, (_, index) => (
        <div key={index} className={`site-card skeleton-card${layout === 'list' ? ' site-card-list' : ''}`} aria-hidden="true">
          <div className="skeleton-line" style={{ width: '28%' }} />
          <div className="skeleton-line" style={{ width: '62%', height: '1.2rem' }} />
          {layout === 'grid' ? (
            <>
              <div className="skeleton-line" style={{ width: '45%' }} />
              <div className="skeleton-line" style={{ width: '50%', height: '1.6rem', marginTop: '1.25rem' }} />
              <div className="skeleton-line" style={{ width: '100%', height: '0.4rem' }} />
            </>
          ) : null}
        </div>
      ))}
    </>
  )
}

function ActivityListItem({
  activity,
  selectMode,
  isSelected,
  onToggleSelect,
  onLongPress,
  onToggleComplete,
  onEdit,
  onRemove,
}: {
  activity: Activity
  selectMode: boolean
  isSelected: boolean
  onToggleSelect: (activityId: string) => void
  onLongPress: (activityId: string) => void
  onToggleComplete: (activity: Activity) => void
  onEdit: (activity: Activity) => void
  onRemove: (activityId: string) => void
}) {
  const rangeLabel = formatActivityRange(activity.startDatetime, activity.endDatetime)
  const longPressHandlers = useLongPress(() => onLongPress(activity.id))
  const pressHandlers = !selectMode ? longPressHandlers : {}

  return (
    <div className="list-item">
      <div className="list-item-content" {...pressHandlers}>
        {selectMode ? (
          <input
            type="checkbox"
            className="select-checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(activity.id)}
            aria-label={`Select ${activity.name}`}
          />
        ) : (
          <button
            type="button"
            className={`list-item-checkbox ${activity.completed ? 'checked' : ''}`}
            onClick={() => onToggleComplete(activity)}
            aria-label={activity.completed ? 'Mark activity incomplete' : 'Mark activity complete'}
            title={activity.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            <Icon name={activity.completed ? 'check-circle' : 'circle'} />
          </button>
        )}
        <div>
          <h4 className={`list-item-title ${activity.completed ? 'completed' : ''}`}>
            {activity.name}
            {activity.isArchived ? (
              <span className="badge badge-archived" style={{ marginLeft: '0.5rem' }}>Archived</span>
            ) : null}
          </h4>
          {rangeLabel ? <p className="activity-datetime">{rangeLabel}</p> : null}
        </div>
      </div>
      <div className="list-item-actions">
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onEdit(activity)}
          aria-label={`Edit ${activity.name}`}
          title={`Edit ${activity.name}`}
        >
          <Icon name="edit" />
        </button>
        <button
          type="button"
          className="btn btn-icon"
          onClick={() => onRemove(activity.id)}
          aria-label={`Remove ${activity.name}`}
          title={`Remove ${activity.name}`}
        >
          <Icon name="trash" />
        </button>
      </div>
    </div>
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
  const [user, setUser] = useState<AuthUser | null>(getStoredAuth)
  const [sessionNotice, setSessionNotice] = useState<string | null>(null)
  // Paint the last-known data immediately, then refresh in the background.
  const [sites, setSites] = useState<Site[]>(() => (getStoredAuth() ? readCache<Site[]>('sites') ?? [] : []))
  const [isLoading, setIsLoading] = useState(() => !(getStoredAuth() && readCache<Site[]>('sites')))
  const [isSyncing, setIsSyncing] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
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
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(() => readCache<CompanySettings>('settings'))
  const [companySettingsForm, setCompanySettingsForm] = useState(emptyCompanySettingsForm)
  const [companySettingsErrors, setCompanySettingsErrors] = useState<CompanySettingsErrors>({})
  const [siteFilter, setSiteFilter] = useState<SiteFilter>('active')
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)

  // Site creation date (Add/Edit Site form)
  const [siteFormCreatedAt, setSiteFormCreatedAt] = useState('')

  // Sites dashboard: sorting + bulk select/archive + grid/list layout
  const [siteSortOption, setSiteSortOption] = useState<SiteSortOption>('newest')
  const [siteSelectMode, setSiteSelectMode] = useState(false)
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set())
  const [siteViewLayout, setSiteViewLayout] = useState<SiteViewLayout>(() => {
    if (typeof window === 'undefined') return 'grid'
    return window.localStorage.getItem('site_view_layout') === 'list' ? 'list' : 'grid'
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('site_view_layout', siteViewLayout)
  }, [siteViewLayout])

  // Header: combined Import/Export dropdown menu
  const [importExportMenuOpen, setImportExportMenuOpen] = useState(false)
  const importExportMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!importExportMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (importExportMenuRef.current && !importExportMenuRef.current.contains(event.target as Node)) {
        setImportExportMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [importExportMenuOpen])

  // Activities: add/edit datetime fields, sorting, archive filter, bulk select/archive
  const [activityStartDatetime, setActivityStartDatetime] = useState('')
  const [activityEndDatetime, setActivityEndDatetime] = useState('')
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [editActivityName, setEditActivityName] = useState('')
  const [editActivityStart, setEditActivityStart] = useState('')
  const [editActivityEnd, setEditActivityEnd] = useState('')
  const [activitySortOption, setActivitySortOption] = useState<ActivitySortOption>('newest')
  const [showArchivedActivities, setShowArchivedActivities] = useState(false)
  const [activitySelectMode, setActivitySelectMode] = useState(false)
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set())

  // Top-level view mode (dashboard vs. stats) and stats data
  const [viewMode, setViewMode] = useState<'dashboard' | 'stats'>('dashboard')
  const stats = useMemo(() => computeStats(sites), [sites])

  // Full-fidelity JSON import
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleLogin = (authUser: AuthUser) => {
    setSessionNotice(null)
    setIsLoading(true)
    setUser(authUser)
  }

  const resetWorkspace = useCallback(() => {
    clearCache()
    setSites([])
    setCompanySettings(null)
    setCurrentSiteId(null)
    setViewMode('dashboard')
    setMainTab('about')
    setModal(null)
    setUserMenuOpen(false)
    setErrorMessage(null)
    setInfoMessage(null)
  }, [])

  const handleLogout = () => {
    clearSession()
    resetWorkspace()
    setUser(null)
  }

  // Any request that comes back 401 (expired or revoked session) signs out.
  useEffect(() => {
    function handleUnauthorized(event: Event) {
      resetWorkspace()
      setUser(null)
      setSessionNotice((event as CustomEvent<string>).detail || 'Your session has expired. Sign in again.')
    }
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [resetWorkspace])

  useEffect(() => {
    applyThemePreference(theme)
  }, [theme])

  // New view, new page: start at the top instead of keeping the old scroll.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [currentSiteId, viewMode, user])

  useEffect(() => {
    if (!userMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [userMenuOpen])

  // Keep the local cache in step with what's on screen.
  useEffect(() => {
    if (!user || isLoading) return
    const handle = setTimeout(() => writeCache('sites', sites), 250)
    return () => clearTimeout(handle)
  }, [sites, user, isLoading])

  useEffect(() => {
    if (user && companySettings) writeCache('settings', companySettings)
  }, [companySettings, user])

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === currentSiteId) ?? null,
    [currentSiteId, sites],
  )

  const filteredSites = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    const base = sites.filter((site) => {
      if (siteFilter === 'active' && site.isArchived) return false
      if (siteFilter === 'archived' && !site.isArchived) return false
      if (!normalizedSearch) return true
      return [site.name, site.region, site.location, site.siteCode, site.siteType].some((field) =>
        field.toLowerCase().includes(normalizedSearch),
      )
    })

    const sorted = [...base]
    switch (siteSortOption) {
      case 'cost-desc':
        sorted.sort((a, b) => calculateSiteTotals(b).totalCost - calculateSiteTotals(a).totalCost)
        break
      case 'progress-asc':
        sorted.sort((a, b) => calculateProgress(a) - calculateProgress(b))
        break
      case 'oldest':
        sorted.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
        break
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'newest':
      default:
        sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        break
    }
    return sorted
  }, [searchTerm, sites, siteSortOption, siteFilter])

  const archivedCount = useMemo(() => sites.filter((site) => site.isArchived).length, [sites])
  const activeCount = sites.length - archivedCount

  const visibleActivities = useMemo(() => {
    if (!selectedSite) return []
    const filtered = selectedSite.activities.filter((activity) => (showArchivedActivities ? true : !activity.isArchived))
    const sorted = [...filtered]
    switch (activitySortOption) {
      case 'start':
        sorted.sort((a, b) => (a.startDatetime ?? '').localeCompare(b.startDatetime ?? ''))
        break
      case 'end':
        sorted.sort((a, b) => (a.endDatetime ?? '').localeCompare(b.endDatetime ?? ''))
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
      default:
        sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        break
    }
    return sorted
  }, [selectedSite, showArchivedActivities, activitySortOption])

  const selectedSiteId = selectedSite?.id
  const selectedSiteLaborCost = selectedSite?.laborCost
  const selectedSiteTotals = selectedSite ? calculateSiteTotals(selectedSite) : null

  const refreshData = useCallback(async () => {
    // One request for every site (archived included): switching between
    // Active / Archived / All is then instant and never hits the network.
    const [sitesData, settingsData] = await Promise.all([
      request<RawSite[]>('/sites?include_archived=true'),
      request<CompanySettings>('/company-settings').catch(() => null),
    ])
    setSites(sitesData.map(normalizeSite))
    if (settingsData) setCompanySettings(settingsData)
  }, [])

  useEffect(() => {
    if (!user) {
      warmUpServer()
      return
    }
    let isMounted = true

    async function load() {
      setIsSyncing(true)
      setErrorMessage(null)
      try {
        await refreshData()
      } catch (error) {
        if (isMounted && !(error instanceof Error && 'status' in error && error.status === 401)) {
          setErrorMessage(buildErrorMessage("Couldn't load the latest data", error))
          console.error('Failed to load initial data:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsSyncing(false)
        }
      }
    }

    load()

    // Refresh when the tab comes back into focus, so other people's changes show up.
    function handleVisibility() {
      if (document.visibilityState === 'visible') {
        refreshData().catch(() => undefined)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [user, refreshData])

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
    setViewMode('dashboard')
    setMainTab('about')
  }

  function openStatsView() {
    setCurrentSiteId(null)
    setViewMode('stats')
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
    setSiteFormCreatedAt(todayDateInputValue())
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
    setSiteFormCreatedAt(selectedSite.createdAt ? isoToDateInputValue(selectedSite.createdAt) : todayDateInputValue())
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
    setActivityStartDatetime('')
    setActivityEndDatetime('')
    setModal('activity')
  }

  function openEditActivityModal(activity: Activity) {
    setEditingActivity(activity)
    setEditActivityName(activity.name)
    setEditActivityStart(isoToDatetimeLocalValue(activity.startDatetime))
    setEditActivityEnd(isoToDatetimeLocalValue(activity.endDatetime))
    setModal('edit-activity')
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
    setErrorMessage(null)
    // Optimistic: flip it now, undo if the server says no.
    updateSiteLocally(siteId, (site) => ({ ...site, isArchived: !isCurrentlyArchived }))
    if (!isCurrentlyArchived && siteFilter === 'active') showDashboard()

    try {
      const endpoint = isCurrentlyArchived ? `/sites/${siteId}/unarchive` : `/sites/${siteId}/archive`
      await request<void>(endpoint, { method: 'POST' })
      setInfoMessage(isCurrentlyArchived ? 'Site restored.' : 'Site archived. Find it under Archived.')
    } catch (error) {
      updateSiteLocally(siteId, (site) => ({ ...site, isArchived: isCurrentlyArchived }))
      const action = isCurrentlyArchived ? 'unarchive' : 'archive'
      setErrorMessage(buildErrorMessage(`Couldn't ${action} the site`, error))
      console.error(`Failed to ${action} site:`, error)
    }
  }

  function toggleSiteSelectMode() {
    setSiteSelectMode((current) => !current)
    setSelectedSiteIds(new Set())
  }

  function toggleSiteSelected(siteId: string) {
    setSelectedSiteIds((current) => {
      const next = new Set(current)
      if (next.has(siteId)) {
        next.delete(siteId)
      } else {
        next.add(siteId)
      }
      return next
    })
  }

  function handleSiteLongPress(siteId: string) {
    setSiteSelectMode(true)
    setSelectedSiteIds((current) => new Set(current).add(siteId))
  }

  async function bulkArchiveSites(archive: boolean) {
    const ids = sites.filter((site) => selectedSiteIds.has(site.id) && site.isArchived !== archive).map((site) => site.id)
    if (ids.length === 0) return
    const idSet = new Set(ids)

    setErrorMessage(null)
    setSites((current) => current.map((site) => (idSet.has(site.id) ? { ...site, isArchived: archive } : site)))
    setSelectedSiteIds(new Set())
    setSiteSelectMode(false)

    try {
      const endpoint = archive ? '/sites/bulk-archive' : '/sites/bulk-unarchive'
      await request<{ message: string }>(endpoint, { method: 'POST', body: JSON.stringify(ids) })
      setInfoMessage(`${ids.length} site${ids.length === 1 ? '' : 's'} ${archive ? 'archived' : 'restored'}.`)
    } catch (error) {
      setSites((current) => current.map((site) => (idSet.has(site.id) ? { ...site, isArchived: !archive } : site)))
      const action = archive ? 'archive' : 'unarchive'
      setErrorMessage(buildErrorMessage(`Couldn't ${action} the selected sites`, error))
      console.error(`Failed to ${action} selected sites:`, error)
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
      createdAt: dateInputToIso(siteFormCreatedAt),
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
    const siteId = selectedSite.id
    const previous = selectedSite.materials
    updateSiteLocally(siteId, (site) => ({ ...site, materials: site.materials.filter((m) => m.id !== materialId) }))

    try {
      await request<void>(`/sites/${siteId}/materials/${materialId}`, { method: 'DELETE' })
    } catch (error) {
      updateSiteLocally(siteId, (site) => ({ ...site, materials: previous }))
      setErrorMessage(buildErrorMessage("Couldn't remove the material", error))
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

    const startDatetime = datetimeLocalToIso(activityStartDatetime)
    const endDatetime = datetimeLocalToIso(activityEndDatetime)

    const activity: Activity = {
      id: generateId(),
      name: activityName,
      completed: false,
      isArchived: false,
      startDatetime,
      endDatetime,
      createdAt: null,
      updatedAt: null,
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const requestBody = {
        id: activity.id,
        name: activity.name,
        completed: activity.completed,
        ...(startDatetime ? { startDatetime } : {}),
        ...(endDatetime ? { endDatetime } : {}),
      }
      const savedActivity = await request<RawActivity | undefined>(`/sites/${selectedSite.id}/activities`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
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

  async function handleEditActivitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selectedSite || !editingActivity) return

    const trimmedName = editActivityName.trim()
    if (!trimmedName) return

    const startDatetime = datetimeLocalToIso(editActivityStart)
    const endDatetime = datetimeLocalToIso(editActivityEnd)

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const payload = { name: trimmedName, startDatetime, endDatetime }
      const savedActivity = await request<RawActivity | undefined>(
        `/sites/${selectedSite.id}/activities/${editingActivity.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      )

      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        activities: site.activities.map((activity) =>
          activity.id === editingActivity.id
            ? normalizeActivity({ ...activity, ...payload, ...(savedActivity ?? {}) })
            : activity,
        ),
      }))
      closeModal()
      setEditingActivity(null)
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to update activity', error))
      console.error('Failed to update activity:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function toggleActivitySelectMode() {
    setActivitySelectMode((current) => !current)
    setSelectedActivityIds(new Set())
  }

  function toggleActivitySelected(activityId: string) {
    setSelectedActivityIds((current) => {
      const next = new Set(current)
      if (next.has(activityId)) {
        next.delete(activityId)
      } else {
        next.add(activityId)
      }
      return next
    })
  }

  function handleActivityLongPress(activityId: string) {
    setActivitySelectMode(true)
    setSelectedActivityIds((current) => new Set(current).add(activityId))
  }

  async function bulkArchiveActivities(archive: boolean) {
    if (!selectedSite || selectedActivityIds.size === 0) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const ids = Array.from(selectedActivityIds)
      const endpoint = archive
        ? `/sites/${selectedSite.id}/activities/bulk-archive`
        : `/sites/${selectedSite.id}/activities/bulk-unarchive`
      await request<{ message: string; archivedIds?: string[]; unarchivedIds?: string[] }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(ids),
      })

      updateSiteLocally(selectedSite.id, (site) => ({
        ...site,
        activities: site.activities.map((activity) =>
          selectedActivityIds.has(activity.id) ? { ...activity, isArchived: archive } : activity,
        ),
      }))
      setSelectedActivityIds(new Set())
      setActivitySelectMode(false)
    } catch (error) {
      const action = archive ? 'archive' : 'unarchive'
      setErrorMessage(buildErrorMessage(`Failed to ${action} selected activities`, error))
      console.error(`Failed to ${action} selected activities:`, error)
    } finally {
      setIsSaving(false)
    }
  }

  async function removeActivity(activityId: string) {
    if (!selectedSite) return
    const siteId = selectedSite.id
    const previous = selectedSite.activities
    updateSiteLocally(siteId, (site) => ({ ...site, activities: site.activities.filter((a) => a.id !== activityId) }))

    try {
      await request<void>(`/sites/${siteId}/activities/${activityId}`, { method: 'DELETE' })
    } catch (error) {
      updateSiteLocally(siteId, (site) => ({ ...site, activities: previous }))
      setErrorMessage(buildErrorMessage("Couldn't remove the activity", error))
      console.error('Failed to remove activity:', error)
    }
  }

  async function toggleActivity(activity: Activity) {
    if (!selectedSite) return
    const siteId = selectedSite.id
    const setCompleted = (completed: boolean) =>
      updateSiteLocally(siteId, (site) => ({
        ...site,
        activities: site.activities.map((item) =>
          item.id === activity.id ? { ...item, completed } : item,
        ),
      }))
    setCompleted(!activity.completed)

    try {
      await request<void>(`/sites/${siteId}/activities/${activity.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !activity.completed }),
      })
    } catch (error) {
      setCompleted(activity.completed)
      setErrorMessage(buildErrorMessage("Couldn't update the activity", error))
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
    const siteId = selectedSite.id
    const previous = selectedSite.operationalCosts
    updateSiteLocally(siteId, (site) => ({
      ...site,
      operationalCosts: site.operationalCosts.filter((cost) => cost.id !== costId),
    }))

    try {
      await request<void>(`/sites/${siteId}/operational-costs/${costId}`, { method: 'DELETE' })
    } catch (error) {
      updateSiteLocally(siteId, (site) => ({ ...site, operationalCosts: previous }))
      setErrorMessage(buildErrorMessage("Couldn't remove the cost", error))
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

  async function exportAllDataJson() {
    setIsSaving(true)
    setErrorMessage(null)

    try {
      const exportPayload = await request<unknown>('/sites/export?include_archived=true')
      const jsonContent = JSON.stringify(exportPayload, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `telecom_sites_export_${todayDateInputValue()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to export data', error))
      console.error('Failed to export data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  function triggerImportFilePicker() {
    importInputRef.current?.click()
  }

  async function handleImportFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsSaving(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const text = await readFileAsText(file)

      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('The selected file is not valid JSON.')
      }

      let sitesToImport: unknown[]
      if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { sites?: unknown }).sites)) {
        sitesToImport = (parsed as { sites: unknown[] }).sites
      } else if (Array.isArray(parsed)) {
        sitesToImport = parsed
      } else {
        throw new Error('The selected file does not contain a recognizable "sites" array.')
      }

      const result = await request<ImportResult>('/sites/import', {
        method: 'POST',
        body: JSON.stringify({ sites: sitesToImport }),
      })

      const skippedSummary =
        result.skipped && result.skipped.length > 0
          ? ` Skipped: ${result.skipped
              .map((entry) => `${entry.name || entry.siteCode || 'Unknown site'} (${entry.reason})`)
              .join('; ')}`
          : ''
      setInfoMessage(`${result.message}.${skippedSummary}`)

      await refreshData()
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to import data', error))
      console.error('Failed to import data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleLogin} notice={sessionNotice} />
  }

  const initials = (user.username || user.email || '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header-container">
          <button type="button" className="header-left header-home" onClick={showDashboard} aria-label="Go to sites">
            <img src={companySettings?.logoUrl || '/logo-192.png'} alt="" className="company-logo" />
            <span className="app-title">{companySettings?.name || 'Telecom Site Manager'}</span>
          </button>

          <nav className="app-nav" aria-label="Main">
            <button
              type="button"
              className={`nav-tab${viewMode === 'dashboard' || selectedSite ? ' active' : ''}`}
              onClick={showDashboard}
              aria-current={viewMode === 'dashboard' || selectedSite ? 'page' : undefined}
            >
              <Icon name="grid" />
              Sites
            </button>
            <button
              type="button"
              className={`nav-tab${viewMode === 'stats' && !selectedSite ? ' active' : ''}`}
              onClick={openStatsView}
              aria-current={viewMode === 'stats' && !selectedSite ? 'page' : undefined}
            >
              <Icon name="bar-chart" />
              Stats
            </button>
          </nav>

          <div className="header-right">
            {isSyncing && !isLoading ? (
              <span className="sync-indicator" role="status">
                <span>Syncing</span>
              </span>
            ) : null}
            <div className="dropdown" ref={importExportMenuRef}>
              <button
                type="button"
                className="btn btn-icon"
                onClick={() => setImportExportMenuOpen((open) => !open)}
                disabled={isSaving}
                aria-haspopup="true"
                aria-expanded={importExportMenuOpen}
                aria-label="Import or export"
                title="Import or export"
              >
                <Icon name="arrow-up-down" />
              </button>
              {importExportMenuOpen ? (
                <div className="dropdown-menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setImportExportMenuOpen(false)
                      exportAllDataJson()
                    }}
                  >
                    <Icon name="download" />
                    <span>Export all data (JSON)</span>
                  </button>
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setImportExportMenuOpen(false)
                      triggerImportFilePicker()
                    }}
                  >
                    <Icon name="upload" />
                    <span>Import from JSON</span>
                  </button>
                </div>
              ) : null}
            </div>
            <input ref={importInputRef} type="file" accept="application/json" hidden onChange={handleImportFileSelected} />
            <button type="button" className="btn btn-icon" onClick={openCompanySettingsModal} aria-label="Company settings" title="Company settings">
              <Icon name="settings" />
            </button>

            <div className="dropdown" ref={userMenuRef}>
              <button
                type="button"
                className="avatar-btn"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                aria-label="Account menu"
                title={user.email || user.username}
              >
                {initials || '?'}
              </button>
              {userMenuOpen ? (
                <div className="dropdown-menu user-menu">
                  <div className="user-menu-head">
                    <p className="user-menu-name">{user.username}</p>
                    {user.email ? <p className="user-menu-email">{user.email}</p> : null}
                    <span className="role-pill">{user.role}</span>
                  </div>
                  <div className="user-menu-section">
                    <span className="user-menu-label">Appearance</span>
                    <div className="segmented full" role="group" aria-label="Theme">
                      {(
                        [
                          ['system', 'monitor', 'Auto'],
                          ['light', 'sun', 'Light'],
                          ['dark', 'moon', 'Dark'],
                        ] as const
                      ).map(([value, icon, label]) => (
                        <button
                          key={value}
                          type="button"
                          className={theme === value ? 'active' : ''}
                          onClick={() => setTheme(value)}
                          aria-pressed={theme === value}
                        >
                          <Icon name={icon} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="dropdown-item is-danger" onClick={handleLogout}>
                    <Icon name="log-out" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : null}
            </div>
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

        {infoMessage ? (
          <div className="alert alert-info" role="status">
            <span>{infoMessage}</span>
            <button type="button" className="btn btn-icon" onClick={() => setInfoMessage(null)} aria-label="Dismiss">
              <Icon name="close" />
            </button>
          </div>
        ) : null}

        {!selectedSite && viewMode === 'stats' ? (
          <section id="stats-view" className="view" key="stats">
            <div className="dashboard-header">
              <div>
                <h2 className="section-title">Stats</h2>
                <p className="section-sub">Costs and progress across your active sites.</p>
              </div>
            </div>

            {isLoading ? (
              <div className="sites-grid">
                <SkeletonSites layout="grid" />
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-tile">
                    <div className="stat-tile-label">Active sites</div>
                    <div className="stat-tile-value">{stats.totalSites}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Completed</div>
                    <div className="stat-tile-value">{stats.completedSites}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Completion rate</div>
                    <div className="stat-tile-value">{stats.completedPercentage.toFixed(1)}%</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Archived</div>
                    <div className="stat-tile-value">{stats.archivedSites}</div>
                  </div>
                </div>

                <div className="cost-summary-cards">
                  <div className="card cost-card">
                    <div className="card-header">
                      <h3 className="card-title">Materials</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">{formatCurrency(stats.expenses.totalMaterialsCost)}</div>
                    </div>
                  </div>
                  <div className="card cost-card">
                    <div className="card-header">
                      <h3 className="card-title">Labor and operational</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">
                        {formatCurrency(stats.expenses.totalLaborCost + stats.expenses.totalOperationalCost)}
                      </div>
                      <p className="cost-meta">
                        {formatCurrency(stats.expenses.totalLaborCost)} labor, {formatCurrency(stats.expenses.totalOperationalCost)} operational
                      </p>
                    </div>
                  </div>
                  <div className="card cost-card is-total">
                    <div className="card-header">
                      <h3 className="card-title">Total spend</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">{formatCurrency(stats.expenses.totalExpenses)}</div>
                    </div>
                  </div>
                </div>

                <div className="card mt-4">
                  <div className="card-header">
                    <h3 className="card-title">Monthly expenses</h3>
                  </div>
                  <div className="card-content stats-table-wrap">
                    {stats.expenses.monthly.length === 0 ? (
                      <p className="cost-meta">No expenses recorded yet.</p>
                    ) : (
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Labor</th>
                            <th>Materials</th>
                            <th>Operational</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.expenses.monthly.map((row) => {
                            const maxTotal = Math.max(...stats.expenses.monthly.map((r) => r.total), 1)
                            return (
                              <tr key={row.period}>
                                <td>{row.period}</td>
                                <td>{formatCurrency(row.laborCost)}</td>
                                <td>{formatCurrency(row.materialsCost)}</td>
                                <td>{formatCurrency(row.operationalCost)}</td>
                                <td>
                                  {formatCurrency(row.total)}
                                  <div className="stats-bar-track">
                                    <div className="stats-bar-fill" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
                <div className="card mt-4">
                  <div className="card-header">
                    <h3 className="card-title">Yearly expenses</h3>
                  </div>
                  <div className="card-content stats-table-wrap">
                    {stats.expenses.yearly.length === 0 ? (
                      <p className="cost-meta">No expenses recorded yet.</p>
                    ) : (
                      <table className="stats-table">
                        <thead>
                          <tr>
                            <th>Period</th>
                            <th>Labor</th>
                            <th>Materials</th>
                            <th>Operational</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.expenses.yearly.map((row) => {
                            const maxTotal = Math.max(...stats.expenses.yearly.map((r) => r.total), 1)
                            return (
                              <tr key={row.period}>
                                <td>{row.period}</td>
                                <td>{formatCurrency(row.laborCost)}</td>
                                <td>{formatCurrency(row.materialsCost)}</td>
                                <td>{formatCurrency(row.operationalCost)}</td>
                                <td>
                                  {formatCurrency(row.total)}
                                  <div className="stats-bar-track">
                                    <div className="stats-bar-fill" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        ) : !selectedSite ? (
          <section id="dashboard-view" className="view" key="dashboard">
            <div className="dashboard-header">
              <div>
                <h2 className="section-title">Sites</h2>
                <p className="section-sub">
                  {isLoading
                    ? 'Loading your sites…'
                    : `${activeCount} active${archivedCount ? `, ${archivedCount} archived` : ''}`}
                </p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openAddSiteModal}>
                <Icon name="plus" />
                <span className="btn-text">Add site</span>
              </button>
            </div>

            <div className="toolbar">
              <div className="search-container">
                <Icon name="search" />
                <input
                  type="search"
                  className="search-input"
                  placeholder="Search name, region, code…"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Search sites"
                />
              </div>
              <div className="segmented" role="group" aria-label="Filter sites">
                {(
                  [
                    ['active', 'Active', activeCount],
                    ['archived', 'Archived', archivedCount],
                    ['all', 'All', sites.length],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    className={siteFilter === value ? 'active' : ''}
                    onClick={() => {
                      setSiteFilter(value)
                      setSelectedSiteIds(new Set())
                    }}
                    aria-pressed={siteFilter === value}
                  >
                    {label}
                    <span className="count">{count}</span>
                  </button>
                ))}
              </div>
              <div className="toolbar-spacer" />
              <select
                className="select"
                value={siteSortOption}
                onChange={(event) => setSiteSortOption(event.target.value as SiteSortOption)}
                aria-label="Sort sites"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name, A to Z</option>
                <option value="name-desc">Name, Z to A</option>
                <option value="cost-desc">Highest cost</option>
                <option value="progress-asc">Least progress</option>
              </select>
              <div className="view-toggle" role="group" aria-label="Layout">
                <button
                  type="button"
                  className={`view-toggle-btn${siteViewLayout === 'grid' ? ' active' : ''}`}
                  onClick={() => setSiteViewLayout('grid')}
                  aria-pressed={siteViewLayout === 'grid'}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <Icon name="grid" />
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn${siteViewLayout === 'list' ? ' active' : ''}`}
                  onClick={() => setSiteViewLayout('list')}
                  aria-pressed={siteViewLayout === 'list'}
                  aria-label="List view"
                  title="List view"
                >
                  <Icon name="list" />
                </button>
              </div>
              <button
                type="button"
                className={`btn btn-outline select-mode-btn${siteSelectMode ? ' is-active' : ''}`}
                onClick={toggleSiteSelectMode}
              >
                <Icon name="check-circle" />
                <span className="btn-text">{siteSelectMode ? 'Done' : 'Select'}</span>
              </button>
            </div>

            {siteSelectMode && selectedSiteIds.size > 0 ? (
              <div className="bulk-action-bar">
                <span>{selectedSiteIds.size} selected</span>
                <div className="bulk-action-bar-actions">
                  {sites.some((site) => selectedSiteIds.has(site.id) && !site.isArchived) ? (
                    <button type="button" className="btn btn-outline" onClick={() => bulkArchiveSites(true)}>
                      <Icon name="archive" />
                      <span>Archive</span>
                    </button>
                  ) : null}
                  {sites.some((site) => selectedSiteIds.has(site.id) && site.isArchived) ? (
                    <button type="button" className="btn btn-outline" onClick={() => bulkArchiveSites(false)}>
                      <Icon name="archive-restore" />
                      <span>Restore</span>
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className={`sites-grid${siteViewLayout === 'list' ? ' sites-list' : ''}`}>
              {isLoading ? (
                <SkeletonSites layout={siteViewLayout} />
              ) : filteredSites.length === 0 ? (
                searchTerm.trim() ? (
                  <EmptyPanel title="No matching sites" text="Try a different name, region or site code." />
                ) : siteFilter === 'archived' ? (
                  <EmptyPanel title="No archived sites" text="Sites you archive are kept here, out of the way." icon="archive" />
                ) : (
                  <EmptyPanel
                    title="No sites yet"
                    text="Add your first site to start tracking materials, activities and costs."
                    actionLabel="Add site"
                    onAction={openAddSiteModal}
                    icon="building"
                  />
                )
              ) : (
                filteredSites.map((site) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    onView={showSiteDetails}
                    selectMode={siteSelectMode}
                    isSelected={selectedSiteIds.has(site.id)}
                    onToggleSelect={toggleSiteSelected}
                    onLongPress={handleSiteLongPress}
                    layout={siteViewLayout}
                  />
                ))
              )}
            </div>
          </section>
        ) : (
          <section id="site-details-view" className="view" key={`site-${selectedSite.id}`}>
            <div className="site-details-header">
              <button type="button" className="btn btn-icon" onClick={showDashboard} aria-label="Back to sites" title="Back to sites">
                <Icon name="arrow-left" />
              </button>
              <div className="site-info">
                <div className="site-title-container">
                  <h2 className="site-title">{selectedSite.name}</h2>
                  <button type="button" className="btn btn-icon" onClick={openEditSiteModal} aria-label="Edit site details" title="Edit site details">
                    <Icon name="edit" />
                  </button>
                </div>
                <div className="site-meta" style={strandStyle(selectedSite.siteType)}>
                  {selectedSite.siteType ? (
                    <span className="badge badge-site-type">
                      <span className="dot" />
                      {selectedSite.siteType}
                    </span>
                  ) : null}
                  {selectedSite.isArchived ? <span className="badge badge-archived">Archived</span> : null}
                  <span className="meta-chip">{selectedSiteTotals?.progress ?? 0}% complete</span>
                  {selectedSite.region ? <span className="meta-chip">{selectedSite.region}</span> : null}
                </div>
              </div>
              <div className="site-details-actions">
                <button type="button" className="btn btn-outline" onClick={() => toggleArchiveSite(selectedSite.id, selectedSite.isArchived)}>
                  <Icon name={selectedSite.isArchived ? 'archive-restore' : 'archive'} />
                  <span className="btn-text">{selectedSite.isArchived ? 'Restore' : 'Archive'}</span>
                </button>
                <button type="button" className="btn btn-danger-ghost" onClick={() => setModal('delete-site')}>
                  <Icon name="trash" />
                  <span className="btn-text">Delete</span>
                </button>
              </div>
            </div>

            <div className="cost-summary-cards">
              <div className="card cost-card">
                <div className="card-header">
                  <h3 className="card-title">Materials</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.materialCost ?? 0)}</div>
                  <p className="cost-meta">
                    {selectedSite.materials.length} item{selectedSite.materials.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>

              <div className="card cost-card">
                <div className="card-header">
                  <h3 className="card-title">Labor and operational</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.laborAndOperationalCost ?? 0)}</div>
                  <p className="cost-meta">
                    {formatCurrency(selectedSite.laborCost)} labor, {formatCurrency(selectedSiteTotals?.operationalCost ?? 0)} operational
                  </p>
                </div>
              </div>

              <div className="card cost-card is-total">
                <div className="card-header">
                  <h3 className="card-title">Total cost</h3>
                </div>
                <div className="card-content">
                  <div className="cost-amount">{formatCurrency(selectedSiteTotals?.totalCost ?? 0)}</div>
                  <p className="cost-meta">{selectedSiteTotals?.progress ?? 0}% of activities complete</p>
                </div>
              </div>
            </div>

            <div className="tabs-container">
              <div className="tabs" role="tablist" aria-label="Site sections">
                {(
                  [
                    ['about', 'About', null],
                    ['materials', 'Materials', selectedSite.materials.length],
                    ['activities', 'Activities', selectedSite.activities.filter((a) => !a.isArchived).length],
                    ['costs', 'Costs', selectedSite.operationalCosts.length],
                  ] as const
                ).map(([value, label, count]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={mainTab === value}
                    className={`tab-btn ${mainTab === value ? 'active' : ''}`}
                    onClick={() => setMainTab(value)}
                  >
                    {label}
                    {count !== null ? <span className="count">{count}</span> : null}
                  </button>
                ))}
              </div>

              {mainTab === 'about' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title">About this site</h3>
                  </div>
                  
                  <div className="about-grid">
                    {selectedSite.siteCode ? (
                      <div className="about-field">
                        <span className="about-label">Site code</span>
                        <div className="about-value"><span className="badge badge-code">{selectedSite.siteCode}</span></div>
                      </div>
                    ) : null}
                    
                    {selectedSite.siteType ? (
                      <div className="about-field">
                        <span className="about-label">Site type</span>
                        <div className="about-value" style={strandStyle(selectedSite.siteType)}>
                          <span className="badge badge-site-type">
                            <span className="dot" />
                            {selectedSite.siteType}
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

                    <div className="about-field">
                      <span className="about-label">Created</span>
                      <div className="about-value">{formatDate(selectedSite.createdAt) || <span className="text-light">Not set</span>}</div>
                    </div>
                  </div>

                  {(selectedSite.latitude !== null && selectedSite.longitude !== null) ? (
                    <div className="about-section mt-4">
                      <span className="about-label">
                        <Icon name="map-pin" /> Map
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
                        <a className="text-link" href={selectedSite.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          Open in Google Maps
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {selectedSite.images && selectedSite.images.length > 0 ? (
                    <div className="about-section mt-4">
                      <span className="about-label">
                        <Icon name="image" /> Photos
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
                      <span className="about-label">
                        <Icon name="file-text" /> Notes
                      </span>
                      <div className="notes-display">
                        {selectedSite.notes}
                      </div>
                    </div>
                  ) : null}

                  {(!selectedSite.siteCode && !selectedSite.siteType && !selectedSite.region && !selectedSite.location && selectedSite.latitude === null && selectedSite.longitude === null && selectedSite.images.length === 0 && !selectedSite.notes) ? (
                    <EmptyPanel
                      title="No details yet"
                      text="Add a type, region, map location, photos or notes with the edit button next to the site name."
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
                      <span>Add material</span>
                    </button>
                  </div>
                  <div className="list-container">
                    {selectedSite.materials.length === 0 ? (
                      <EmptyPanel
                        title="No materials yet"
                        text="Log cable, poles, brackets and anything else bought for this site."
                        actionLabel="Add material"
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
                      <span>Add activity</span>
                    </button>
                  </div>

                  <div className="toolbar">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showArchivedActivities}
                        onChange={(event) => setShowArchivedActivities(event.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Show archived</span>
                    </label>
                    <div className="toolbar-spacer" />
                    <select
                      className="select"
                      value={activitySortOption}
                      onChange={(event) => setActivitySortOption(event.target.value as ActivitySortOption)}
                      aria-label="Sort activities"
                    >
                      <option value="newest">Newest first</option>
                      <option value="start">Start date</option>
                      <option value="end">End date</option>
                      <option value="name">Name</option>
                    </select>
                    <button
                      type="button"
                      className={`btn btn-outline select-mode-btn${activitySelectMode ? ' is-active' : ''}`}
                      onClick={toggleActivitySelectMode}
                    >
                      <Icon name="check-circle" />
                      <span className="btn-text">{activitySelectMode ? 'Done' : 'Select'}</span>
                    </button>
                  </div>

                  {activitySelectMode && selectedActivityIds.size > 0 ? (
                    <div className="bulk-action-bar">
                      <span>{selectedActivityIds.size} selected</span>
                      <div className="bulk-action-bar-actions">
                        {showArchivedActivities ? (
                          <button type="button" className="btn btn-outline" onClick={() => bulkArchiveActivities(false)} disabled={isSaving}>
                            <Icon name="archive-restore" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button type="button" className="btn btn-outline" onClick={() => bulkArchiveActivities(true)} disabled={isSaving}>
                            <Icon name="archive" />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="list-container">
                    {visibleActivities.length === 0 ? (
                      <EmptyPanel
                        title={showArchivedActivities ? 'No activities' : 'No open activities'}
                        text="Activities like site survey or cable laying drive this site's progress bar."
                        actionLabel="Add activity"
                        onAction={openActivityModal}
                        icon="check-circle"
                      />
                    ) : (
                      visibleActivities.map((activity) => (
                        <ActivityListItem
                          key={activity.id}
                          activity={activity}
                          selectMode={activitySelectMode}
                          isSelected={selectedActivityIds.has(activity.id)}
                          onToggleSelect={toggleActivitySelected}
                          onLongPress={handleActivityLongPress}
                          onToggleComplete={toggleActivity}
                          onEdit={openEditActivityModal}
                          onRemove={removeActivity}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {mainTab === 'costs' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title">Labor</h3>
                  </div>
                  <form className="inline-panel" onSubmit={handleLaborCostSubmit}>
                    <div className="form-group labor-form">
                      <label htmlFor="labor-cost-input">Labor cost (GHS)</label>
                      <div className="labor-row">
                        <div className="labor-input">
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
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="tab-header section-gap">
                    <h3 className="tab-title">Operational costs</h3>
                    <button type="button" className="btn btn-primary" onClick={openOperationalCostModal}>
                      <Icon name="plus" />
                      <span>Add cost</span>
                    </button>
                  </div>
                  <div className="list-container mb-4">
                    {selectedSite.operationalCosts.length === 0 ? (
                      <EmptyPanel
                        title="No operational costs yet"
                        text="Track transport, tool hire, permits and other running expenses."
                        actionLabel="Add cost"
                        onAction={openOperationalCostModal}
                        icon="plus"
                      />
                    ) : (
                      selectedSite.operationalCosts.map((cost) => (
                        <div className="list-item" key={cost.id}>
                          <div>
                            <h4 className="list-item-title">{cost.name}</h4>
                          </div>
                          <div className="list-item-actions">
                            <span className="cost-value">{formatCurrency(cost.amount)}</span>
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
                        </div>
                      ))
                    )}
                  </div>

                  <div className="tab-header section-gap">
                    <h3 className="tab-title">Summary</h3>
                  </div>
                  <dl className="cost-summary">
                    <div className="cost-row">
                      <dt>Materials</dt>
                      <dd>{formatCurrency(selectedSiteTotals?.materialCost ?? 0)}</dd>
                    </div>
                    <div className="cost-row">
                      <dt>Labor</dt>
                      <dd>{formatCurrency(selectedSite.laborCost)}</dd>
                    </div>
                    <div className="cost-row">
                      <dt>Operational</dt>
                      <dd>{formatCurrency(selectedSiteTotals?.operationalCost ?? 0)}</dd>
                    </div>
                    <div className="cost-row total">
                      <dt>Total</dt>
                      <dd>{formatCurrency(selectedSiteTotals?.totalCost ?? 0)}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </main>

      {modal === 'site' ? (
        <Modal title={siteModalMode === 'add' ? 'Add site' : 'Edit site'} onClose={closeModal}>
          <form className="modal-form" onSubmit={handleSiteSubmit}>
            <div className="form-group">
              <label htmlFor="site-name-input">Site name</label>
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
                <label htmlFor="site-type-select">Site type</label>
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
              <label htmlFor="site-created-at-input">Start date</label>
              <input
                type="date"
                id="site-created-at-input"
                className="input"
                value={siteFormCreatedAt}
                onChange={(event) => setSiteFormCreatedAt(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="site-map-location-input">Map location</label>
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
                (e.g. 40°26'46"N, 79°58'56"W), or a Google Maps link (maps.app.goo.gl/...).
              </p>
              {siteFormLatitude && siteFormLongitude ? (
                <p className="location-detected">Detected: {siteFormLatitude}, {siteFormLongitude}</p>
              ) : null}
            </div>

            <div className="form-group">
              <label>Photo links</label>
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
                <span>Add photo link</span>
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="site-notes-input">Notes</label>
              <textarea
                id="site-notes-input"
                className="input"
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
                <span>{siteModalMode === 'add' ? 'Add site' : 'Save changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'material' ? (
        <Modal title="Add material" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleMaterialSubmit}>
            <div className="segmented full modal-tabs" role="group">
              <button
                type="button"
                className={materialMode === 'predefined' ? 'active' : ''}
                onClick={() => setMaterialMode('predefined')}
              >
                From list
              </button>
              <button
                type="button"
                className={materialMode === 'custom' ? 'active' : ''}
                onClick={() => setMaterialMode('custom')}
              >
                Custom
              </button>
            </div>

            {materialMode === 'predefined' ? (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="predefined-material-select">Material</label>
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
                  <label htmlFor="custom-material-input">Material name</label>
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
                <span>Add material</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'activity' ? (
        <Modal title="Add activity" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleActivitySubmit}>
            <div className="segmented full modal-tabs" role="group">
              <button
                type="button"
                className={activityMode === 'predefined' ? 'active' : ''}
                onClick={() => setActivityMode('predefined')}
              >
                From list
              </button>
              <button
                type="button"
                className={activityMode === 'custom' ? 'active' : ''}
                onClick={() => setActivityMode('custom')}
              >
                Custom
              </button>
            </div>

            {activityMode === 'predefined' ? (
              <div className="tab-content active modal-tab-content">
                <div className="form-group">
                  <label htmlFor="predefined-activity-select">Activity</label>
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
                  <label htmlFor="custom-activity-input">Activity name</label>
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

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="activity-start-input">Start (optional)</label>
                <input
                  type="datetime-local"
                  id="activity-start-input"
                  className="input"
                  value={activityStartDatetime}
                  onChange={(event) => setActivityStartDatetime(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="activity-end-input">End (optional)</label>
                <input
                  type="datetime-local"
                  id="activity-end-input"
                  className="input"
                  value={activityEndDatetime}
                  onChange={(event) => setActivityEndDatetime(event.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                <Icon name="plus" />
                <span>Add activity</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'edit-activity' && editingActivity ? (
        <Modal title="Edit activity" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleEditActivitySubmit}>
            <div className="form-group">
              <label htmlFor="edit-activity-name-input">Activity name</label>
              <input
                type="text"
                id="edit-activity-name-input"
                className="input"
                value={editActivityName}
                onChange={(event) => setEditActivityName(event.target.value)}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="edit-activity-start-input">Start (optional)</label>
                <input
                  type="datetime-local"
                  id="edit-activity-start-input"
                  className="input"
                  value={editActivityStart}
                  onChange={(event) => setEditActivityStart(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-activity-end-input">End (optional)</label>
                <input
                  type="datetime-local"
                  id="edit-activity-end-input"
                  className="input"
                  value={editActivityEnd}
                  onChange={(event) => setEditActivityEnd(event.target.value)}
                />
              </div>
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

      {modal === 'operational-cost' ? (
        <Modal title="Add operational cost" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleOperationalCostSubmit}>
            <div className="form-group">
              <label htmlFor="operational-cost-name-input">What was it for?</label>
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
                <span>Add cost</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'delete-site' && selectedSite ? (
        <Modal title="Delete this site?" onClose={closeModal}>
          <div className="modal-form">
            <p className="confirm-message">
              <strong>{selectedSite.name}</strong> and all of its materials, activities and costs will be permanently deleted.
              If you might need it later, archive it instead.
            </p>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={deleteSite} disabled={isSaving}>
                <Icon name="trash" />
                <span>Delete site</span>
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {modal === 'company-settings' ? (
        <Modal title="Company settings" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleCompanySettingsSubmit}>
            <div className="form-group">
              <label htmlFor="settings-name-input">Company name</label>
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
              <label htmlFor="settings-logo-input">Logo link</label>
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
                <span>Save settings</span>
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

      <Suspense fallback={null}>
        <AiAssistant apiBaseUrl={API_BASE_URL} />
      </Suspense>
    </div>
  )
}

export default App
