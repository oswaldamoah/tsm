# Telecom Site Manager

React + TypeScript + Vite frontend for managing telecom sites — materials, scrum-style activities, operational costs, company branding, and site-wide stats/expense reporting. Talks to the [tsm-backend](https://github.com/oswaldamoah/tsm-backend) FastAPI API.

The whole app is intentionally a single file: `src/App.tsx` holds every type, API call, and view; `src/App.css` holds all styling (hand-written CSS with `:root` custom properties, no UI framework). There's no router — "pages" are conditionally-rendered sections driven by local state.

---

## Features

- **Sites** — create/edit/delete, GPS/Google Maps location, images, notes, site type/region. Creation date is prefillable and editable, and the dashboard supports sorting (newest/oldest/name) plus a dedicated **Archived** sort option that filters to archived-only sites.
- **Grid / list view toggle** for the sites dashboard (choice persisted per-browser), and a search box.
- **Materials & Operational Costs** — line-item costs per site, rolled into per-site and site-wide cost totals.
- **Activities (scrum-style)** — optional start/end datetime, complete/incomplete toggle, archiving, and sorting by start date, end date, name, or created date.
- **Multi-select bulk archive** for both sites and activities. On mobile, the "Select" button is hidden — long-press a site card/row or activity item to enter select mode instead (the button reappears as "Cancel" once active).
- **Site Stats view** — total/archived/completed site counts, completion %, and a monthly/yearly labor + materials + operational expense breakdown.
- **Full-fidelity JSON import/export** via one "Import/Export" header button — exports every site with its nested materials/activities/costs, and imports skip duplicates (matched by site code, or name + location) with the result reported back to you.
- **Company branding** — logo, name, and contact info shown in the header, editable via Settings.
- **Auth** — JWT login against the backend; role (`admin`/`manager`) shown in the header.
- **Mobile-first responsive UI** — the header packs the logo, title, and action icons onto a couple of tight rows instead of spreading across many; layouts stack cleanly at phone widths.

## Getting started

```bash
npm install
npm run dev       # starts Vite dev server, defaults to http://localhost:5173
```

Other scripts:

```bash
npm run build      # tsc -b && vite build — type-checks then builds to dist/
npm run preview     # serve the production build locally
npm run lint         # oxlint
```

## Connecting to a backend

The backend base URL is a constant at the top of `src/App.tsx`:

```ts
const API_BASE_URL = 'https://tsm-backend-hhao.onrender.com'
```

Point it at a local backend (e.g. `http://127.0.0.1:8000`) while developing against backend changes, and set it back to the deployed URL before committing — it's not read from an env var, so this line has to be edited directly.

Default backend credentials (see the backend README) are `admin` / `admin123` and `manager` / `manager123`.

## Project structure

```
src/
  App.tsx    # types, API client (request<T>()), all views/modals, all components
  App.css    # all styling
  main.tsx    # ReactDOM entry point
  index.css   # global reset
```

There's no `src/api/`, `src/components/`, or `src/pages/` — new features are added directly to `App.tsx`/`App.css` following the existing patterns (a `RawX`/`normalizeX()` pair for API responses that tolerate missing fields, and the `request<T>(path, options)` helper for every network call).
