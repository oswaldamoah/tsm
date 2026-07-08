import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import './App.css'

const API_BASE_URL = 'https://telecom-site-backend.onrender.com'

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
  materials: Material[]
  activities: Activity[]
  operationalCosts: OperationalCost[]
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
  materials?: RawMaterial[] | null
  activities?: RawActivity[] | null
  operationalCosts?: RawOperationalCost[] | null
}

type MainTab = 'materials' | 'activities' | 'operational-costs' | 'costs'
type ModalType = 'site' | 'material' | 'activity' | 'operational-cost' | 'delete-site' | null
type SiteModalMode = 'add' | 'edit'
type MaterialMode = 'predefined' | 'custom'
type ActivityMode = 'predefined' | 'custom'
type MaterialErrors = Partial<Record<'material' | 'customName' | 'quantity' | 'unit' | 'cost', boolean>>
type ActivityErrors = Partial<Record<'activity' | 'customName', boolean>>
type OperationalCostErrors = Partial<Record<'name' | 'amount', boolean>>
type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'building'
  | 'check'
  | 'check-circle'
  | 'circle'
  | 'close'
  | 'download'
  | 'edit'
  | 'plus'
  | 'search'
  | 'trash'

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

function normalizeSite(raw: RawSite): Site {
  return {
    id: recordId(raw),
    name: textValue(raw.name, 'Untitled site'),
    laborCost: numberValue(raw.laborCost),
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
    case 'plus':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      )
    case 'search':
      return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
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
              <h3 className="site-name">{site.name}</h3>
              <p className="site-meta-line">
                {site.materials.length} materials / {site.activities.length} activities
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

    async function loadSites() {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const data = await request<RawSite[]>('/sites')
        if (isMounted) {
          setSites(data.map(normalizeSite))
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(buildErrorMessage('Failed to load sites', error))
          console.error('Failed to load sites:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadSites()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (selectedSiteId && selectedSiteLaborCost !== undefined) {
      setLaborCostDraft(String(selectedSiteLaborCost))
      setLaborCostError(false)
    }
  }, [selectedSiteId, selectedSiteLaborCost])

  function updateSiteLocally(siteId: string, updater: (site: Site) => Site) {
    setSites((currentSites) => currentSites.map((site) => (site.id === siteId ? updater(site) : site)))
  }

  function closeModal() {
    setModal(null)
  }

  function showDashboard() {
    setCurrentSiteId(null)
    setMainTab('materials')
  }

  function showSiteDetails(siteId: string) {
    setCurrentSiteId(siteId)
    setMainTab('materials')
  }

  function openAddSiteModal() {
    setSiteModalMode('add')
    setSiteName('')
    setSiteNameError(false)
    setModal('site')
  }

  function openEditSiteModal() {
    if (!selectedSite) return
    setSiteModalMode('edit')
    setSiteName(selectedSite.name)
    setSiteNameError(false)
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

  async function handleSiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = siteName.trim()
    if (!trimmedName) {
      setSiteNameError(true)
      return
    }

    setIsSaving(true)
    setErrorMessage(null)

    try {
      if (siteModalMode === 'add') {
        const newSite = {
          name: trimmedName,
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
        const renamedSite = { ...selectedSite, name: trimmedName }
        const savedSite = await request<RawSite | undefined>(`/sites/${selectedSite.id}`, {
          method: 'PUT',
          body: JSON.stringify(renamedSite),
        })
        updateSiteLocally(selectedSite.id, (site) => normalizeSite({ ...site, ...renamedSite, ...(savedSite ?? {}) }))
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
      setMainTab('operational-costs')
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
            <h1 className="app-title">Telecom Site Manager</h1>
          </div>
          <button type="button" className="btn btn-outline" onClick={exportData}>
            <Icon name="download" />
            <span className="btn-text">Export Data</span>
          </button>
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
              <button type="button" className="btn btn-danger" onClick={() => setModal('delete-site')}>
                <Icon name="trash" />
                <span className="btn-text">Delete Site</span>
              </button>
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
                  className={`tab-btn ${mainTab === 'operational-costs' ? 'active' : ''}`}
                  onClick={() => setMainTab('operational-costs')}
                >
                  Operational Costs
                </button>
                <button
                  type="button"
                  className={`tab-btn ${mainTab === 'costs' ? 'active' : ''}`}
                  onClick={() => setMainTab('costs')}
                >
                  Costs
                </button>
              </div>

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

              {mainTab === 'operational-costs' ? (
                <div className="tab-content active">
                  <div className="tab-header">
                    <h3 className="tab-title">Operational Costs</h3>
                    <button type="button" className="btn btn-primary" onClick={openOperationalCostModal}>
                      <Icon name="plus" />
                      <span>Add Cost</span>
                    </button>
                  </div>
                  <div className="list-container">
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
                </div>
              ) : null}

              {mainTab === 'costs' ? (
                <div className="tab-content active">
                  <h3 className="tab-title">Cost Management</h3>
                  <form className="inline-panel" onSubmit={handleLaborCostSubmit}>
                    <div className="form-group">
                      <label htmlFor="labor-cost-input">Labor Cost (GHS)</label>
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
                      <span>Update Labor Cost</span>
                    </button>
                  </form>

                  <h3 className="tab-title mt-4">Cost Summary</h3>
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
        <Modal title={siteModalMode === 'add' ? 'Add New Site' : 'Edit Site Name'} onClose={closeModal}>
          <form className="modal-form" onSubmit={handleSiteSubmit}>
            <div className="form-group">
              <label htmlFor="site-name-input">Site Name</label>
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
    </div>
  )
}

export default App
