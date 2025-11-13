console.log("✅ app.js loaded")

// Main application logic
// State management
let sites = []
let currentSiteId = null
let activeMaterialTab = "predefined-material"
let activeActivityTab = "predefined-activity"

// DOM Elements - Dashboard
const dashboardView = document.getElementById("dashboard-view")
const siteDetailsView = document.getElementById("site-details-view")
const sitesContainer = document.getElementById("sites-container")
const emptyState = document.getElementById("empty-state")
const searchInput = document.getElementById("search-input")
const addSiteBtn = document.getElementById("add-site-btn")
const emptyAddSiteBtn = document.getElementById("empty-add-site-btn")
const exportBtn = document.getElementById("export-btn")

// DOM Elements - Site Details
const backBtn = document.getElementById("back-btn")
const siteTitle = document.getElementById("site-title")
const siteMeta = document.getElementById("site-meta")
const editSiteBtn = document.getElementById("edit-site-btn")
const deleteSiteBtn = document.getElementById("delete-site-btn")
const materialCostEl = document.getElementById("material-cost")
const materialCountEl = document.getElementById("material-count")
const laborOperationalCostEl = document.getElementById("labor-operational-cost")
const totalCostEl = document.getElementById("total-cost")
const tabBtns = document.querySelectorAll(".tab-btn")
const tabContents = document.querySelectorAll(".tab-content")
const addMaterialBtn = document.getElementById("add-material-btn")
const addActivityBtn = document.getElementById("add-activity-btn")
const materialsList = document.getElementById("materials-list")
const activitiesList = document.getElementById("activities-list")
const laborCostInput = document.getElementById("labor-cost-input")
const updateCostsBtn = document.getElementById("update-costs-btn")
const summaryMaterialCost = document.getElementById("summary-material-cost")
const summaryLaborCost = document.getElementById("summary-labor-cost")
const summaryTotalCost = document.getElementById("summary-total-cost")

const addOperationalCostBtn = document.getElementById("add-operational-cost-btn")
const operationalCostsList = document.getElementById("operational-costs-list")

// DOM Elements - Modals
const siteModal = document.getElementById("site-modal")
const siteModalTitle = document.getElementById("site-modal-title")
const siteForm = document.getElementById("site-form")
const siteNameInput = document.getElementById("site-name-input")
const siteNameError = document.getElementById("site-name-error")

const materialModal = document.getElementById("material-modal")
const materialForm = document.getElementById("material-form")
const predefinedMaterialSelect = document.getElementById("predefined-material-select")
const customMaterialInput = document.getElementById("custom-material-input")
const materialQuantityInput = document.getElementById("material-quantity-input")
const materialUnitSelect = document.getElementById("material-unit-select")
const materialCostInput = document.getElementById("material-cost-input")

const activityModal = document.getElementById("activity-modal")
const activityForm = document.getElementById("activity-form")
const predefinedActivitySelect = document.getElementById("predefined-activity-select")
const customActivityInput = document.getElementById("custom-activity-input")

const operationalCostModal = document.getElementById("operational-cost-modal")
const operationalCostForm = document.getElementById("operational-cost-form")
const operationalCostNameInput = document.getElementById("operational-cost-name-input")
const operationalCostAmountInput = document.getElementById("operational-cost-amount-input")

// DOM Elements - Confirmation Modal
const confirmModal = document.getElementById("confirm-modal")
const confirmDeleteBtn = document.getElementById("confirm-delete-btn")

// Generate a unique ID
function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

// Initialize the application
async function init() {
  await loadSites()
  renderSites()
  setupEventListeners()
  populatePredefinedSelects()
}

// Load sites from render
async function loadSites() {
  try {
    const response = await fetch("https://telecom-site-backend.onrender.com/sites")
    if (!response.ok) throw new Error("Failed to fetch sites")
    sites = await response.json()
  } catch (err) {
    console.error("🔥 Failed to load site:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Populate predefined selects
function populatePredefinedSelects() {
  // Populate materials select
  predefinedMaterials.forEach((material) => {
    const option = document.createElement("option")
    option.value = material.id
    option.textContent = material.name
    predefinedMaterialSelect.appendChild(option)
  })

  // Populate activities select
  predefinedActivities.forEach((activity) => {
    const option = document.createElement("option")
    option.value = activity.id
    option.textContent = activity.name
    predefinedActivitySelect.appendChild(option)
  })
}

// Setup event listeners
function setupEventListeners() {
  console.log("👂 setupEventListeners() ran")

  // Dashboard
  console.log("🔎 addSiteBtn is:", addSiteBtn)

  addSiteBtn.addEventListener("click", () => {
    console.log("🟢 'Add Site' button clicked")
    openAddSiteModal()
  })

  emptyAddSiteBtn.addEventListener("click", openAddSiteModal)
  searchInput.addEventListener("input", handleSearch)
  exportBtn.addEventListener("click", exportData)

  // Site Details
  backBtn.addEventListener("click", showDashboard)
  editSiteBtn.addEventListener("click", openEditSiteModal)
  deleteSiteBtn.addEventListener("click", openDeleteConfirmation)
  updateCostsBtn.addEventListener("click", updateCosts)
  addMaterialBtn.addEventListener("click", openAddMaterialModal)
  addActivityBtn.addEventListener("click", openAddActivityModal)

  addOperationalCostBtn.addEventListener("click", openAddOperationalCostModal)

  // Confirmation Modal
  confirmDeleteBtn.addEventListener("click", deleteSite)

  // Tabs
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
      const tabName = this.getAttribute("data-tab")

      // Handle material and activity modal tabs
      if (tabName === "predefined-material" || tabName === "custom-material") {
        handleMaterialTabChange(tabName)
        return
      }

      if (tabName === "predefined-activity" || tabName === "custom-activity") {
        handleActivityTabChange(tabName)
        return
      }

      // Handle main tabs
      handleTabChange(tabName)
    })
  })

  // Modals
  document.querySelectorAll(".modal-close, .modal-cancel").forEach((el) => {
    el.addEventListener("click", closeAllModals)
  })

  // Forms
  siteForm.addEventListener("submit", handleSiteFormSubmit)
  materialForm.addEventListener("submit", handleMaterialFormSubmit)
  activityForm.addEventListener("submit", handleActivityFormSubmit)

  operationalCostForm.addEventListener("submit", handleOperationalCostFormSubmit)
}

// Render sites
function renderSites(searchTerm = "") {
  const filteredSites = searchTerm
    ? sites.filter((site) => site.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : sites

  // Clear sites container except for empty state
  Array.from(sitesContainer.children).forEach((child) => {
    if (child !== emptyState) {
      child.remove()
    }
  })

  // Show/hide empty state
  if (filteredSites.length === 0) {
    emptyState.classList.remove("hidden")
    if (searchTerm) {
      emptyState.querySelector(".empty-state-title").textContent = "No sites found"
      emptyState.querySelector(".empty-state-text").textContent = "Try a different search term"
      emptyState.querySelector("#empty-add-site-btn").classList.add("hidden")
    } else {
      emptyState.querySelector(".empty-state-title").textContent = "No sites found"
      emptyState.querySelector(".empty-state-text").textContent = "Get started by adding your first site"
      emptyState.querySelector("#empty-add-site-btn").classList.remove("hidden")
    }
  } else {
    emptyState.classList.add("hidden")

    // Render each site
    filteredSites.forEach((site) => {
      const siteCard = createSiteCard(site)
      sitesContainer.appendChild(siteCard)
    })
  }
}

// Create site card
function createSiteCard(site) {
  const materialCost = calculateMaterialCost(site)
  const operationalCostTotal = calculateOperationalCostTotal(site)
  const totalCost = materialCost + site.laborCost + operationalCostTotal
  const progress = calculateProgress(site)

  const siteCard = document.createElement("div")
  siteCard.className = "site-card"
  siteCard.innerHTML = `
            <div class="site-card-content">
                <div class="site-card-header">
                    <div>
                        <div class="site-icon-container">
                            <div class="site-icon">
                                <i class="fas fa-building"></i>
                            </div>
                            <div>
                                <h3 class="site-name">${site.name}</h3>
                                <p class="site-meta">
                                    ${site.materials.length} materials • ${site.activities.length} activities
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="progress-container">
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-value">${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>

                <div class="cost-breakdown">
                    <div class="cost-row">
                        <span class="cost-label">Materials Cost:</span>
                        <span class="cost-value">₵${materialCost.toFixed(2)}</span>
                    </div>
                    <div class="cost-row">
                        <span class="cost-label">Labor Cost:</span>
                        <span class="cost-value">₵${site.laborCost.toFixed(2)}</span>
                    </div>
                    <div class="cost-row">
                        <span class="cost-label">Operational Costs:</span>
                        <span class="cost-value">₵${operationalCostTotal.toFixed(2)}</span>
                    </div>
                    <div class="cost-row total">
                        <span class="cost-label">Total Cost:</span>
                        <span class="cost-value">₵${totalCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            <div class="site-card-footer">
                <button class="view-details-btn">
                    View Details
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `

  // Add event listener to view details button
  siteCard.querySelector(".view-details-btn").addEventListener("click", () => {
    showSiteDetails(site.id)
  })

  return siteCard
}

// Show site details
function showSiteDetails(siteId) {
  currentSiteId = siteId
  const site = sites.find((site) => site.id === siteId)

  if (!site) return

  // Update site details
  siteTitle.textContent = site.name
  siteMeta.innerHTML = `
            <span>${site.materials.length} materials</span>
            <span>${site.activities.length} activities</span>
            <span>${calculateProgress(site)}% complete</span>
        `

  // Update costs
  updateCostDisplay(site)

  // Render materials, activities, and operational costs
  renderMaterials(site)
  renderActivities(site)
  renderOperationalCosts(site)

  // Set form values
  laborCostInput.value = site.laborCost

  // Show site details view
  dashboardView.classList.add("hidden")
  siteDetailsView.classList.remove("hidden")

  // Reset to materials tab
  handleTabChange("materials")
}

// Update cost display
function updateCostDisplay(site) {
  const materialCost = calculateMaterialCost(site)
  const laborCost = site.laborCost
  const totalCost = materialCost + laborCost

  materialCostEl.textContent = `₵${materialCost.toFixed(2)}`
  materialCountEl.textContent = `${site.materials.length} materials added`
  laborOperationalCostEl.textContent = `₵${laborCost.toFixed(2)}`
  totalCostEl.textContent = `₵${totalCost.toFixed(2)}`

  // Update summary
  summaryMaterialCost.textContent = `₵${materialCost.toFixed(2)}`
  summaryLaborCost.textContent = `₵${laborCost.toFixed(2)}`
  summaryTotalCost.textContent = `₵${totalCost.toFixed(2)}`
}

// Render materials
function renderMaterials(site) {
  materialsList.innerHTML = ""

  if (site.materials.length === 0) {
    materialsList.innerHTML = `
                <div class="card">
                    <div class="card-content" style="text-align: center; padding: 3rem 1rem;">
                        <p class="cost-meta" style="margin-bottom: 1rem;">No materials added yet</p>
                        <button id="empty-add-material-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Add Material</span>
                        </button>
                    </div>
                </div>
            `
    document.getElementById("empty-add-material-btn").addEventListener("click", openAddMaterialModal)
    return
  }

  site.materials.forEach((material) => {
    const materialItem = document.createElement("div")
    materialItem.className = "list-item"
    materialItem.innerHTML = `
                <div>
                    <h4 class="list-item-title">${material.name}</h4>
                    <p class="list-item-subtitle">${material.quantity} ${material.unit}</p>
                </div>
                <div class="list-item-actions">
                    <span class="cost-value">₵${material.cost.toFixed(2)}</span>
                    <button class="btn btn-icon delete-material" data-id="${material.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `

    materialItem.querySelector(".delete-material").addEventListener("click", () => {
      removeMaterial(material.id)
    })

    materialsList.appendChild(materialItem)
  })
}

// Render activities
function renderActivities(site) {
  activitiesList.innerHTML = ""

  if (site.activities.length === 0) {
    activitiesList.innerHTML = `
                <div class="card">
                    <div class="card-content" style="text-align: center; padding: 3rem 1rem;">
                        <p class="cost-meta" style="margin-bottom: 1rem;">No activities added yet</p>
                        <button id="empty-add-activity-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Add Activity</span>
                        </button>
                    </div>
                </div>
            `
    document.getElementById("empty-add-activity-btn").addEventListener("click", openAddActivityModal)
    return
  }

  site.activities.forEach((activity) => {
    const activityItem = document.createElement("div")
    activityItem.className = "list-item"
    activityItem.innerHTML = `
                <div class="list-item-content">
                    <button class="list-item-checkbox ${activity.completed ? "checked" : ""}" data-id="${activity.id}">
                        <i class="fas ${activity.completed ? "fa-check-circle" : "fa-circle"}"></i>
                    </button>
                    <h4 class="list-item-title ${activity.completed ? "completed" : ""}">${activity.name}</h4>
                </div>
                <button class="btn btn-icon delete-activity" data-id="${activity.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `

    activityItem.querySelector(".list-item-checkbox").addEventListener("click", () => {
      toggleActivity(activity.id)
    })

    activityItem.querySelector(".delete-activity").addEventListener("click", () => {
      removeActivity(activity.id)
    })

    activitiesList.appendChild(activityItem)
  })
}

function renderOperationalCosts(site) {
  operationalCostsList.innerHTML = ""

  if (!site.operationalCosts || site.operationalCosts.length === 0) {
    operationalCostsList.innerHTML = `
                <div class="card">
                    <div class="card-content" style="text-align: center; padding: 3rem 1rem;">
                        <p class="cost-meta" style="margin-bottom: 1rem;">No operational costs added yet</p>
                        <button id="empty-add-operational-cost-btn" class="btn btn-primary">
                            <i class="fas fa-plus"></i>
                            <span>Add Cost</span>
                        </button>
                    </div>
                </div>
            `
    document.getElementById("empty-add-operational-cost-btn").addEventListener("click", openAddOperationalCostModal)
    return
  }

  site.operationalCosts.forEach((cost) => {
    const costItem = document.createElement("div")
    costItem.className = "list-item"
    costItem.innerHTML = `
                <div>
                    <h4 class="list-item-title">${cost.name}</h4>
                    <p class="list-item-subtitle">Allocated: ₵${cost.amount.toFixed(2)}</p>
                </div>
                <button class="btn btn-icon delete-operational-cost" data-id="${cost.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `

    costItem.querySelector(".delete-operational-cost").addEventListener("click", () => {
      removeOperationalCost(cost.id)
    })

    operationalCostsList.appendChild(costItem)
  })
}

// Show dashboard
function showDashboard() {
  currentSiteId = null
  dashboardView.classList.remove("hidden")
  siteDetailsView.classList.add("hidden")
}

// Handle tab change
function handleTabChange(tabName) {
  // Update tab buttons
  tabBtns.forEach((btn) => {
    if (btn.getAttribute("data-tab") === tabName) {
      btn.classList.add("active")
    } else if (["materials", "activities", "costs", "operational-costs"].includes(btn.getAttribute("data-tab"))) {
      btn.classList.remove("active")
    }
  })

  // Update tab content
  tabContents.forEach((content) => {
    if (content.id === `${tabName}-tab`) {
      content.classList.add("active")
    } else if (["materials-tab", "activities-tab", "costs-tab", "operational-costs-tab"].includes(content.id)) {
      content.classList.remove("active")
    }
  })
}

// Handle material tab change
function handleMaterialTabChange(tabName) {
  activeMaterialTab = tabName

  // Update tab buttons
  document
    .querySelectorAll('.tab-btn[data-tab="predefined-material"], .tab-btn[data-tab="custom-material"]')
    .forEach((btn) => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active")
      } else {
        btn.classList.remove("active")
      }
    })

  // Update tab content
  document.getElementById("predefined-material").classList.toggle("active", tabName === "predefined-material")
  document.getElementById("custom-material").classList.toggle("active", tabName === "custom-material")
}

// Handle activity tab change
function handleActivityTabChange(tabName) {
  activeActivityTab = tabName

  // Update tab buttons
  document
    .querySelectorAll('.tab-btn[data-tab="predefined-activity"], .tab-btn[data-tab="custom-activity"]')
    .forEach((btn) => {
      if (btn.getAttribute("data-tab") === tabName) {
        btn.classList.add("active")
      } else {
        btn.classList.remove("active")
      }
    })

  // Update tab content
  document.getElementById("predefined-activity").classList.toggle("active", tabName === "predefined-activity")
  document.getElementById("custom-activity").classList.toggle("active", tabName === "custom-activity")
}

// Open add site modal
function openAddSiteModal() {
  siteModalTitle.textContent = "Add New Site"
  siteNameInput.value = ""
  siteNameError.classList.add("hidden")
  siteModal.classList.add("active")
  siteForm.dataset.mode = "add"
}

// Open edit site modal
function openEditSiteModal() {
  const site = sites.find((site) => site.id === currentSiteId)
  if (!site) return

  siteModalTitle.textContent = "Edit Site Name"
  siteNameInput.value = site.name
  siteNameError.classList.add("hidden")
  siteModal.classList.add("active")
  siteForm.dataset.mode = "edit"
}

// Open delete confirmation modal
function openDeleteConfirmation() {
  confirmModal.classList.add("active")
}

// Open add material modal
function openAddMaterialModal() {
  // Reset form
  materialForm.reset()
  document.getElementById("predefined-material-error").classList.add("hidden")
  document.getElementById("custom-material-error").classList.add("hidden")
  document.getElementById("material-quantity-error").classList.add("hidden")
  document.getElementById("material-unit-error").classList.add("hidden")
  document.getElementById("material-cost-error").classList.add("hidden")

  // Reset tabs
  handleMaterialTabChange("predefined-material")

  materialModal.classList.add("active")
}

// Open add activity modal
function openAddActivityModal() {
  // Reset form
  activityForm.reset()
  document.getElementById("predefined-activity-error").classList.add("hidden")
  document.getElementById("custom-activity-error").classList.add("hidden")

  // Reset tabs
  handleActivityTabChange("predefined-activity")

  activityModal.classList.add("active")
}

function openAddOperationalCostModal() {
  // Reset form
  operationalCostForm.reset()
  document.getElementById("operational-cost-name-error").classList.add("hidden")
  document.getElementById("operational-cost-amount-error").classList.add("hidden")
  operationalCostModal.classList.add("active")
}

// Close all modals
function closeAllModals() {
  siteModal.classList.remove("active")
  materialModal.classList.remove("active")
  activityModal.classList.remove("active")
  operationalCostModal.classList.remove("active")
  confirmModal.classList.remove("active")
}

// Handle site form submit
function handleSiteFormSubmit(e) {
  e.preventDefault()

  const siteName = siteNameInput.value.trim()
  if (!siteName) {
    siteNameError.classList.remove("hidden")
    return
  }

  if (siteForm.dataset.mode === "add") {
    addSite(siteName)
  } else if (siteForm.dataset.mode === "edit") {
    const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
    if (siteIndex === -1) return

    const updatedSite = {
      ...sites[siteIndex],
      name: siteName,
    }

    updateSite(updatedSite)
  }

  closeAllModals()
}

// Handle material form submit
function handleMaterialFormSubmit(e) {
  e.preventDefault()

  // Validate form
  let isValid = true
  let materialName = ""

  if (activeMaterialTab === "predefined-material") {
    const selectedMaterialId = predefinedMaterialSelect.value
    if (!selectedMaterialId) {
      document.getElementById("predefined-material-error").classList.remove("hidden")
      isValid = false
    } else {
      const selectedMaterial = predefinedMaterials.find((m) => m.id === selectedMaterialId)
      materialName = selectedMaterial ? selectedMaterial.name : ""
    }
  } else {
    materialName = customMaterialInput.value.trim()
    if (!materialName) {
      document.getElementById("custom-material-error").classList.remove("hidden")
      isValid = false
    }
  }

  const quantity = Number.parseFloat(materialQuantityInput.value)
  if (isNaN(quantity) || quantity <= 0) {
    document.getElementById("material-quantity-error").classList.remove("hidden")
    isValid = false
  }

  const unit = materialUnitSelect.value
  if (!unit) {
    document.getElementById("material-unit-error").classList.remove("hidden")
    isValid = false
  }

  const cost = Number.parseFloat(materialCostInput.value)
  if (isNaN(cost) || cost < 0) {
    document.getElementById("material-cost-error").classList.remove("hidden")
    isValid = false
  }

  if (!isValid) return

  // Add material
  addMaterial({
    id: generateId(),
    name: materialName,
    quantity,
    unit,
    cost,
  })

  closeAllModals()
}

// Handle activity form submit
function handleActivityFormSubmit(e) {
  e.preventDefault()

  // Validate form
  let isValid = true
  let activityName = ""

  if (activeActivityTab === "predefined-activity") {
    const selectedActivityId = predefinedActivitySelect.value
    if (!selectedActivityId) {
      document.getElementById("predefined-activity-error").classList.remove("hidden")
      isValid = false
    } else {
      const selectedActivity = predefinedActivities.find((a) => a.id === selectedActivityId)
      activityName = selectedActivity ? selectedActivity.name : ""
    }
  } else {
    activityName = customActivityInput.value.trim()
    if (!activityName) {
      document.getElementById("custom-activity-error").classList.remove("hidden")
      isValid = false
    }
  }

  if (!isValid) return

  // Add activity
  addActivity({
    id: generateId(),
    name: activityName,
    completed: false,
  })

  closeAllModals()
}

function handleOperationalCostFormSubmit(e) {
  e.preventDefault()

  let isValid = true
  const costName = operationalCostNameInput.value.trim()

  if (!costName) {
    document.getElementById("operational-cost-name-error").classList.remove("hidden")
    isValid = false
  }

  const amount = Number.parseFloat(operationalCostAmountInput.value)
  if (isNaN(amount) || amount < 0) {
    document.getElementById("operational-cost-amount-error").classList.remove("hidden")
    isValid = false
  }

  if (!isValid) return

  addOperationalCost({
    id: generateId(),
    name: costName,
    amount: amount,
  })

  closeAllModals()
}

// Handle search
function handleSearch() {
  const searchTerm = searchInput.value.trim()
  renderSites(searchTerm)
}

// Add site
async function addSite(name) {
  const newSite = {
    name: name,
    laborCost: 0,
  }

  console.log("📡 Sending POST to /sites with data:", newSite)

  try {
    const res = await fetch("https://telecom-site-backend.onrender.com/sites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newSite),
    })

    if (!res.ok) throw new Error("Failed to add site")
    const createdSite = await res.json()
    sites.push(createdSite)
    renderSites()
  } catch (err) {
    console.error("🔥 Failed to add site:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Update site name
async function updateSite(site) {
  try {
    const res = await fetch(`https://telecom-site-backend.onrender.com/sites/${site.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    })

    if (!res.ok) throw new Error("Update failed")
    const updated = await res.json()
    const i = sites.findIndex((s) => s.id === updated.id)
    sites[i] = updated
    renderSites()
  } catch (err) {
    console.error("🔥 Failed to update site:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Delete site
async function deleteSite() {
  try {
    await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}`, {
      method: "DELETE",
    })
    sites = sites.filter((site) => site.id !== currentSiteId)
    closeAllModals()
    showDashboard()
    renderSites()
  } catch (err) {
    console.error("🔥 Failed to delete site:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Add material
async function addMaterial(material) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    const response = await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(material),
    })

    if (!response.ok) throw new Error("Failed to add material")

    const newMaterial = await response.json()
    sites[siteIndex].materials.push(newMaterial)

    renderMaterials(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("🔥 Failed to add material:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Remove material
async function removeMaterial(materialId) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/materials/${materialId}`, {
      method: "DELETE",
    })

    sites[siteIndex].materials = sites[siteIndex].materials.filter((m) => m.id !== materialId)

    renderMaterials(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("🔥 Failed to remove material:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Add activity
async function addActivity(activity) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    const response = await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    })

    if (!response.ok) throw new Error("Failed to add activity")

    const newActivity = await response.json()
    sites[siteIndex].activities.push(newActivity)

    renderActivities(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("🔥 Failed to add activity:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Remove activity
async function removeActivity(activityId) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/activities/${activityId}`, {
      method: "DELETE",
    })

    sites[siteIndex].activities = sites[siteIndex].activities.filter((a) => a.id !== activityId)

    renderActivities(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("🔥 Failed to remove activity:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Toggle activity completion
async function toggleActivity(activityId) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  const activity = sites[siteIndex].activities.find((a) => a.id === activityId)
  if (!activity) return

  const updatedActivity = { ...activity, completed: !activity.completed }

  try {
    const response = await fetch(
      `https://telecom-site-backend.onrender.com/sites/${currentSiteId}/activities/${activityId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: updatedActivity.completed }),
      },
    )

    if (!response.ok) throw new Error("Failed to toggle activity")

    activity.completed = updatedActivity.completed

    renderActivities(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("🔥 Failed to toggle activity:")
    console.error("🧠 Message:", err.message)
    console.error("📦 Full error:", err)
  }
}

// Update costs
async function updateCosts() {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  const laborCost = Number.parseFloat(laborCostInput.value) || 0

  try {
    const response = await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laborCost }),
    })

    if (!response.ok) throw new Error("Failed to update costs")

    sites[siteIndex].laborCost = laborCost

    updateCostDisplay(sites[siteIndex])
  } catch (error) {
    console.error("Error updating costs:", error)
  }
}

async function addOperationalCost(cost) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    const response = await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/operational-costs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cost),
    })

    if (!response.ok) throw new Error("Failed to add operational cost")

    const newCost = await response.json()
    if (!sites[siteIndex].operationalCosts) {
      sites[siteIndex].operationalCosts = []
    }
    sites[siteIndex].operationalCosts.push(newCost)

    renderOperationalCosts(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("Failed to add operational cost:", err)
  }
}

async function removeOperationalCost(costId) {
  const siteIndex = sites.findIndex((site) => site.id === currentSiteId)
  if (siteIndex === -1) return

  try {
    await fetch(`https://telecom-site-backend.onrender.com/sites/${currentSiteId}/operational-costs/${costId}`, {
      method: "DELETE",
    })

    sites[siteIndex].operationalCosts = sites[siteIndex].operationalCosts.filter((c) => c.id !== costId)

    renderOperationalCosts(sites[siteIndex])
    updateCostDisplay(sites[siteIndex])
    updateSiteMeta(sites[siteIndex])
  } catch (err) {
    console.error("Failed to remove operational cost:", err)
  }
}

function calculateOperationalCostTotal(site) {
  if (!site.operationalCosts) return 0
  return site.operationalCosts.reduce((sum, cost) => sum + cost.amount, 0)
}

// Update site meta information
function updateSiteMeta(site) {
  siteMeta.innerHTML = `
            <span>${site.materials.length} materials</span>
            <span>${site.activities.length} activities</span>
            <span>${calculateProgress(site)}% complete</span>
        `
}

// Calculate material cost
function calculateMaterialCost(site) {
  return site.materials.reduce((sum, material) => sum + material.cost, 0)
}

// Calculate progress
function calculateProgress(site) {
  if (site.activities.length === 0) return 0
  const completedActivities = site.activities.filter((activity) => activity.completed).length
  return Math.round((completedActivities / site.activities.length) * 100)
}

// Export data as Excel (CSV)
function exportData() {
  // Create CSV content
  let csvContent =
    "Site Name,Materials Count,Activities Count,Progress,Materials Cost,Labor Cost,Operational Costs Total,Total Cost\n"

  sites.forEach((site) => {
    const materialCost = calculateMaterialCost(site)
    const operationalCostTotal = calculateOperationalCostTotal(site)
    const totalCost = materialCost + site.laborCost + operationalCostTotal
    const progress = calculateProgress(site)

    // Escape commas in site name
    const safeSiteName = site.name.includes(",") ? `"${site.name}"` : site.name

    csvContent += `${safeSiteName},${site.materials.length},${site.activities.length},${progress}%,₵${materialCost.toFixed(2)},₵${site.laborCost.toFixed(2)},₵${operationalCostTotal.toFixed(2)},₵${totalCost.toFixed(2)}\n`
  })

  // Create a download link
  const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", "telecom_sites_data.csv")
  document.body.appendChild(link)

  // Trigger the download
  link.click()

  // Remove the link from the document
  document.body.removeChild(link)
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("🧠 init() is running")
  init()
})

