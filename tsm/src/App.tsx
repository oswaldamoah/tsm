import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, ReactNode, SyntheticEvent } from 'react'
import './App.css'

// Loaded as its own chunk - it pulls in the charting library, which should not
// sit on the critical path for the main app.
const AiAssistant = lazy(() => import('./AiAssistant'))

// Defaults to the deployed backend. Point it somewhere else for local work by
// putting VITE_API_BASE_URL=http://127.0.0.1:8000 in a .env.local file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://tsm-backend-hhao.onrender.com'

// ============ AUTH TYPES & HELPERS ============

type AuthUser = {
  username: string
  role: 'admin' | 'manager'
}

type LoginCredentials = {
  username: string
  password: string
}

type LoginResponse = {
  access_token: string
  token_type: string
  username: string
  role: 'admin' | 'manager'
}

const AUTH_STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USERNAME: 'auth_username',
  ROLE: 'auth_role',
} as const

const getStoredAuth = (): AuthUser | null => {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN)
  const username = localStorage.getItem(AUTH_STORAGE_KEYS.USERNAME)
  const role = localStorage.getItem(AUTH_STORAGE_KEYS.ROLE)

  if (!token || !username || !role) return null

  if (role !== 'admin' && role !== 'manager') return null

  return { username, role }
}

const setStoredAuth = (data: LoginResponse) => {
  localStorage.setItem(AUTH_STORAGE_KEYS.TOKEN, data.access_token)
  localStorage.setItem(AUTH_STORAGE_KEYS.USERNAME, data.username)
  localStorage.setItem(AUTH_STORAGE_KEYS.ROLE, data.role)
}

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN)
  localStorage.removeItem(AUTH_STORAGE_KEYS.USERNAME)
  localStorage.removeItem(AUTH_STORAGE_KEYS.ROLE)
}

const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(err.detail || 'Invalid credentials')
  }

  return res.json()
}

// ============ LOGIN PAGE COMPONENT ============

const LoginPage = ({ onLogin }: { onLogin: (user: AuthUser) => void }) => {
  const [form, setForm] = useState<LoginCredentials>({ username: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<keyof LoginCredentials, boolean>>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    const newErrors: Partial<Record<keyof LoginCredentials, boolean>> = {}
    if (!form.username.trim()) newErrors.username = true
    if (!form.password.trim()) newErrors.password = true
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const data = await loginUser(form)
      setStoredAuth(data)
      onLogin({ username: data.username, role: data.role })
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof LoginCredentials]) {
      setErrors((prev) => ({ ...prev, [name]: false }))
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/favicon.png" alt="Telecom Site Manager" className="login-icon" />
          </div>
          <div className="login-text">
            <h1 className="login-title">Telecom Site Manager</h1>
            <p className="login-subtitle">Sign in to manage your sites</p>
          </div>
        </div>

        {errorMessage && (
          <div className="login-error" role="alert">
            <Icon name="info" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className={`input ${errors.username ? 'invalid' : ''}`}
              value={form.username}
              onChange={handleChange}
              placeholder="Enter username"
              disabled={isLoading}
              autoComplete="username"
              autoFocus
            />
            {errors.username && <p className="input-error">Username is required</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              className={`input ${errors.password ? 'invalid' : ''}`}
              value={form.password}
              onChange={handleChange}
              placeholder="Enter password"
              disabled={isLoading}
              autoComplete="current-password"
            />
            {errors.password && <p className="input-error">Password is required</p>}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="login-hint">
            Default credentials:
            <code>admin / admin123</code>
            <code>manager / manager123</code>
          </p>
        </div>
      </div>
    </div>
  )
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
type SiteSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'archived'
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

function formatCurrency(amount: number) {
  return `GHS ${amount.toFixed(2)}`
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

async function request<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Add auth token if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
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

  if (layout === 'list') {
    return (
      <article className="site-card site-card-list">
        {selectCheckbox}
        <button
          type="button"
          className="site-list-row"
          onClick={() => (selectMode ? onToggleSelect?.(site.id) : onView(site.id))}
          {...pressHandlers}
        >
          <div className="site-icon">
            <Icon name="building" />
          </div>
          <div className="site-list-main">
            <div className="site-name-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 className="site-name" style={{ margin: 0 }}>{site.name}</h3>
              {site.siteType ? <span className="badge badge-site-type">{site.siteType}</span> : null}
              {site.isArchived ? <span className="badge badge-archived">Archived</span> : null}
            </div>
            <p className="site-meta-line">
              {site.region ? `${site.region} · ` : ''}{site.materials.length} materials / {site.activities.length} activities
              {createdLabel ? ` · Created ${createdLabel}` : ''}
            </p>
          </div>
          <div className="site-list-stats">
            <div className="site-list-progress">
              <div className="progress-bar" aria-label={`${totals.progress}% complete`}>
                <div className="progress-fill" style={{ width: `${totals.progress}%` }} />
              </div>
              <span className="progress-value">{totals.progress}%</span>
            </div>
            <span className="site-list-total">{formatCurrency(totals.totalCost)}</span>
          </div>
          <Icon name="arrow-right" />
        </button>
      </article>
    )
  }

  return (
    <article className="site-card">
      {selectCheckbox}
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
              {createdLabel ? <p className="site-meta-line">Created {createdLabel}</p> : null}
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
        <button
          type="button"
          className="view-details-btn"
          onClick={() => (selectMode ? onToggleSelect?.(site.id) : onView(site.id))}
          {...pressHandlers}
        >
          <span>{selectMode ? (isSelected ? 'Selected' : 'Select') : 'View Details'}</span>
          <Icon name="arrow-right" />
        </button>
      </div>
    </article>
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
  const [user, setUser] = useState<AuthUser | null>(getStoredAuth())
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
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(false)

  // Full-fidelity JSON import
  const importInputRef = useRef<HTMLInputElement>(null)

  const handleLogin = (authUser: AuthUser) => {
    setUser(authUser)
  }

  const handleLogout = () => {
    clearStoredAuth()
    setUser(null)
    setSites([])
    setCurrentSiteId(null)
    setMainTab('materials')
    setModal(null)
  }

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === currentSiteId) ?? null,
    [currentSiteId, sites],
  )

  const filteredSites = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    let base = normalizedSearch
      ? sites.filter((site) => site.name.toLowerCase().includes(normalizedSearch))
      : sites

    if (siteSortOption === 'archived') {
      base = base.filter((site) => site.isArchived)
    }

    const sorted = [...base]
    switch (siteSortOption) {
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
      case 'archived':
      default:
        sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        break
    }
    return sorted
  }, [searchTerm, sites, siteSortOption])

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
    setViewMode('dashboard')
    setMainTab('about')
  }

  async function openStatsView() {
    setCurrentSiteId(null)
    setViewMode('stats')
    setIsStatsLoading(true)
    setErrorMessage(null)

    try {
      const data = await request<StatsResponse>('/sites/stats')
      setStats(data)
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to load stats', error))
      console.error('Failed to load stats:', error)
    } finally {
      setIsStatsLoading(false)
    }
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
    if (selectedSiteIds.size === 0) return

    setIsSaving(true)
    setErrorMessage(null)

    try {
      const ids = Array.from(selectedSiteIds)
      const endpoint = archive ? '/sites/bulk-archive' : '/sites/bulk-unarchive'
      await request<{ message: string; archivedIds?: string[]; unarchivedIds?: string[] }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(ids),
      })

      if (archive && !showArchived) {
        setSites((currentSites) => currentSites.filter((site) => !selectedSiteIds.has(site.id)))
      } else {
        setSites((currentSites) =>
          currentSites.map((site) => (selectedSiteIds.has(site.id) ? { ...site, isArchived: archive } : site)),
        )
      }
      setSelectedSiteIds(new Set())
      setSiteSelectMode(false)
    } catch (error) {
      const action = archive ? 'archive' : 'unarchive'
      setErrorMessage(buildErrorMessage(`Failed to ${action} selected sites`, error))
      console.error(`Failed to ${action} selected sites:`, error)
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

      const refreshedSites = await request<RawSite[]>(`/sites${showArchived ? '?include_archived=true' : ''}`)
      setSites(refreshedSites.map(normalizeSite))
    } catch (error) {
      setErrorMessage(buildErrorMessage('Failed to import data', error))
      console.error('Failed to import data:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="container header-container">
          <div className="header-left">
            {companySettings?.logoUrl ? <img src={companySettings.logoUrl} alt="Logo" className="company-logo" /> : null}
            <h1 className="app-title">{companySettings?.name || 'Telecom Site Manager'}</h1>
          </div>
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="user-info" style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', marginRight: '8px' }}>
              {user.username} ({user.role})
            </span>
            <button type="button" className="btn btn-icon" onClick={openCompanySettingsModal} aria-label="Settings" title="Settings">
              <Icon name="settings" />
            </button>
            <button type="button" className="btn btn-icon" onClick={openStatsView} aria-label="Stats" title="Stats">
              <Icon name="bar-chart" />
            </button>
            <div className="dropdown" ref={importExportMenuRef}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setImportExportMenuOpen((open) => !open)}
                disabled={isSaving}
                aria-haspopup="true"
                aria-expanded={importExportMenuOpen}
              >
                <Icon name="arrow-up-down" />
                <span className="btn-text">Import/Export</span>
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
                    <span>Export (JSON)</span>
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
                    <span>Import (JSON)</span>
                  </button>
                </div>
              ) : null}
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportFileSelected}
            />
            <button type="button" className="btn btn-ghost" onClick={handleLogout} style={{ marginLeft: '8px' }}>
              <Icon name="arrow-left" />
              <span className="btn-text">Logout</span>
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

        {infoMessage ? (
          <div className="alert alert-info" role="status">
            <span>{infoMessage}</span>
            <button type="button" className="btn btn-icon" onClick={() => setInfoMessage(null)} aria-label="Dismiss">
              <Icon name="close" />
            </button>
          </div>
        ) : null}

        {!selectedSite && viewMode === 'stats' ? (
          <section id="stats-view" className="view">
            <div className="site-details-header">
              <button type="button" className="btn btn-icon" onClick={showDashboard} aria-label="Back to sites" title="Back to sites">
                <Icon name="arrow-left" />
              </button>
              <div className="site-info">
                <h2 className="site-title">Site Stats</h2>
              </div>
            </div>

            {isStatsLoading ? (
              <EmptyPanel title="Loading stats" text="Crunching the numbers." icon="bar-chart" />
            ) : stats ? (
              <>
                <div className="stats-grid">
                  <div className="stat-tile">
                    <div className="stat-tile-label">Total Sites</div>
                    <div className="stat-tile-value">{stats.totalSites}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Archived Sites</div>
                    <div className="stat-tile-value">{stats.archivedSites}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Completed Sites</div>
                    <div className="stat-tile-value">{stats.completedSites}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-tile-label">Completed %</div>
                    <div className="stat-tile-value">{stats.completedPercentage.toFixed(1)}%</div>
                  </div>
                </div>

                <div className="cost-summary-cards">
                  <div className="card cost-card">
                    <div className="card-header">
                      <h3 className="card-title">Total Labor Cost</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">{formatCurrency(stats.expenses.totalLaborCost)}</div>
                    </div>
                  </div>
                  <div className="card cost-card">
                    <div className="card-header">
                      <h3 className="card-title">Total Materials Cost</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">{formatCurrency(stats.expenses.totalMaterialsCost)}</div>
                    </div>
                  </div>
                  <div className="card cost-card">
                    <div className="card-header">
                      <h3 className="card-title">Total Operational Cost</h3>
                    </div>
                    <div className="card-content">
                      <div className="cost-amount">{formatCurrency(stats.expenses.totalOperationalCost)}</div>
                    </div>
                  </div>
                </div>

                <div className="card mt-4" style={{ marginBottom: '1.5rem' }}>
                  <div className="card-header">
                    <h3 className="card-title">Monthly Expenses</h3>
                  </div>
                  <div className="card-content" style={{ overflowX: 'auto' }}>
                    {stats.expenses.monthly.length === 0 ? (
                      <p className="cost-meta">No monthly expense data yet.</p>
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
                                  <div className="stats-bar-track" style={{ marginTop: '0.35rem' }}>
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

                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">Yearly Expenses</h3>
                  </div>
                  <div className="card-content" style={{ overflowX: 'auto' }}>
                    {stats.expenses.yearly.length === 0 ? (
                      <p className="cost-meta">No yearly expense data yet.</p>
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
                                  <div className="stats-bar-track" style={{ marginTop: '0.35rem' }}>
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
            ) : (
              <EmptyPanel title="No stats available" text="Stats could not be loaded." icon="bar-chart" />
            )}
          </section>
        ) : !selectedSite ? (
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
                <select
                  className="select"
                  style={{ width: 'auto' }}
                  value={siteSortOption}
                  onChange={(event) => {
                    const nextOption = event.target.value as SiteSortOption
                    setSiteSortOption(nextOption)
                    if (nextOption === 'archived') {
                      setShowArchived(true)
                    }
                  }}
                  aria-label="Sort sites"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="archived">Archived</option>
                </select>
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
                <div className="view-toggle" role="group" aria-label="Site view layout">
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
                  <span className="btn-text">{siteSelectMode ? 'Cancel' : 'Select'}</span>
                </button>
                <button type="button" className="btn btn-primary" onClick={openAddSiteModal}>
                  <Icon name="plus" />
                  <span className="btn-text">Add Site</span>
                </button>
              </div>
            </div>

            {siteSelectMode && selectedSiteIds.size > 0 ? (
              <div className="bulk-action-bar">
                <span>{selectedSiteIds.size} selected</span>
                <div className="bulk-action-bar-actions">
                  {showArchived ? (
                    <button type="button" className="btn btn-outline" onClick={() => bulkArchiveSites(false)} disabled={isSaving}>
                      <Icon name="archive-restore" />
                      <span>Unarchive Selected ({selectedSiteIds.size})</span>
                    </button>
                  ) : (
                    <button type="button" className="btn btn-outline" onClick={() => bulkArchiveSites(true)} disabled={isSaving}>
                      <Icon name="archive" />
                      <span>Archive Selected ({selectedSiteIds.size})</span>
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            <div className={`sites-grid${siteViewLayout === 'list' ? ' sites-list' : ''}`}>
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

                    <div className="about-field">
                      <span className="about-label">Created</span>
                      <div className="about-value">{formatDate(selectedSite.createdAt) || <span className="text-light">Not set</span>}</div>
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

                  <div className="dashboard-actions" style={{ marginBottom: '1rem' }}>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={showArchivedActivities}
                        onChange={(event) => setShowArchivedActivities(event.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label" style={{ marginLeft: '8px', fontSize: '0.9rem' }}>Show Archived</span>
                    </label>
                    <select
                      className="select"
                      style={{ width: 'auto' }}
                      value={activitySortOption}
                      onChange={(event) => setActivitySortOption(event.target.value as ActivitySortOption)}
                      aria-label="Sort activities"
                    >
                      <option value="newest">Newest created</option>
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
                      <span className="btn-text">{activitySelectMode ? 'Cancel' : 'Select'}</span>
                    </button>
                  </div>

                  {activitySelectMode && selectedActivityIds.size > 0 ? (
                    <div className="bulk-action-bar">
                      <span>{selectedActivityIds.size} selected</span>
                      <div className="bulk-action-bar-actions">
                        {showArchivedActivities ? (
                          <button type="button" className="btn btn-outline" onClick={() => bulkArchiveActivities(false)} disabled={isSaving}>
                            <Icon name="archive-restore" />
                            <span>Unarchive Selected ({selectedActivityIds.size})</span>
                          </button>
                        ) : (
                          <button type="button" className="btn btn-outline" onClick={() => bulkArchiveActivities(true)} disabled={isSaving}>
                            <Icon name="archive" />
                            <span>Archive Selected ({selectedActivityIds.size})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="list-container">
                    {visibleActivities.length === 0 ? (
                      <EmptyPanel
                        title="No activities added yet"
                        text="Add work activities to measure site progress."
                        actionLabel="Add Activity"
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
              <label htmlFor="site-created-at-input">Creation Date</label>
              <input
                type="date"
                id="site-created-at-input"
                className="input"
                value={siteFormCreatedAt}
                onChange={(event) => setSiteFormCreatedAt(event.target.value)}
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
                (e.g. 40°26'46"N, 79°58'56"W), or a Google Maps link (maps.app.goo.gl/...).
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
                <span>Add Activity</span>
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'edit-activity' && editingActivity ? (
        <Modal title="Edit Activity" onClose={closeModal}>
          <form className="modal-form" onSubmit={handleEditActivitySubmit}>
            <div className="form-group">
              <label htmlFor="edit-activity-name-input">Activity Name</label>
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

      <Suspense fallback={null}>
        <AiAssistant apiBaseUrl={API_BASE_URL} />
      </Suspense>
    </div>
  )
}

export default App
