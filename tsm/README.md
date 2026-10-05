# Telecom Site Manager

React + TypeScript + Vite frontend for managing telecom sites — materials, scrum-style activities, operational costs, company branding, and site-wide stats/expense reporting. Talks to the [tsm-backend](https://github.com/oswaldamoah/tsm-backend) FastAPI API.

Most of the app lives in `src/App.tsx` (types, views, modals) and `src/App.css`; the API client and session handling are in `src/api.ts`, and the sign-in screens in `src/Auth.tsx`. Styling is hand-written CSS on `:root` design tokens in `src/index.css` (no UI framework), with light and dark themes. There's no router — "pages" are conditionally-rendered sections driven by local state.

---

## Features

- **Sites** — create/edit/delete, GPS/Google Maps location, images, notes, site type/region. Creation date is prefillable and editable, and the dashboard supports sorting (newest/oldest/name) plus a dedicated **Archived** sort option that filters to archived-only sites.
- **Grid / list view toggle** for the sites dashboard (choice persisted per-browser), and a search box that matches name, region, location, site code and type.
- **Materials & Operational Costs** — line-item costs per site, rolled into per-site and site-wide cost totals.
- **Activities (scrum-style)** — optional start/end datetime, complete/incomplete toggle, archiving, and sorting by start date, end date, name, or created date.
- **Multi-select bulk archive** for both sites and activities. On mobile, the "Select" button is hidden — long-press a site card/row or activity item to enter select mode instead (the button reappears as "Cancel" once active).
- **Site Stats view** — total/archived/completed site counts, completion %, and a monthly/yearly labor + materials + operational expense breakdown.
- **Full-fidelity JSON import/export** via one "Import/Export" header button — exports every site with its nested materials/activities/costs, and imports skip duplicates (matched by site code, or name + location) with the result reported back to you.
- **Company branding** — logo, name, and contact info shown in the header, editable via Settings.
- **Accounts** — email + password sign-in, sign-up gated by an access phrase from your administrator, and "Forgot password?" reset links by email. Expired sessions return you to sign-in with a note.
- **Fast by default** — the dashboard paints instantly from a local cache and refreshes in the background; Active/Archived/All filters and the Stats view are computed in the browser with no extra requests; ticking off an activity, archiving or deleting updates the screen immediately and rolls back if the server refuses.
- **Look and feel** — Instrument Sans + Bricolage Grotesque (self-hosted, no font CDN), light/dark/auto themes from the account menu, and site types colour-coded with the fibre-optic strand colours (TIA-598).
- **Mobile-first responsive UI** — the header packs the logo, title, and action icons onto a couple of tight rows instead of spreading across many; layouts stack cleanly at phone widths.
- **AI assistant** — a floating button opens a chat panel that answers questions about your live data ("which region costs the most?"), renders charts inline, and builds slide decks you can page through and download as PowerPoint. Requires the backend's AI endpoints to be configured; if they aren't, the panel says so and stays out of the way.

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

## Previewing against a local backend

`API_BASE_URL` defaults to the deployed Render backend, so `npm run dev` talks to production out of the box. To point it at a backend running on your own machine, create `tsm/.env.local` (gitignored):

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart `npm run dev` after changing it. Delete the file to go back to the deployed backend.

## Connecting to a backend

`API_BASE_URL` in `src/api.ts` defaults to the deployed backend and can be overridden with `VITE_API_BASE_URL` (see above). If you move the backend, also update the `preconnect` link in `index.html`.

Password-reset emails link back to the app as `/?reset_token=...`, so set the backend's `FRONTEND_URL` to wherever this app is deployed.

There are no default credentials. Create your first account with the sign-up form, using the `ADMIN_SIGNUP_ACCESS_CODE` phrase set on the backend (see the backend README's Authentication section).

## Project structure

```
src/
  App.tsx           # types, all views/modals, site cards, stats
  App.css           # app styling
  api.ts            # API client (request<T>()), session storage, local cache
  Auth.tsx/.css     # sign in, sign up, forgot and reset password screens
  fiber.ts          # fibre strand colour code used for site types
  AiAssistant.tsx   # AI chat panel, chart rendering, deck viewer
  AiAssistant.css   # styling for the above
  main.tsx          # ReactDOM entry point, font imports
  index.css         # design tokens (colours, type, radii) for light and dark
```

New features are added directly to `App.tsx`/`App.css` following the existing patterns (a `RawX`/`normalizeX()` pair for API responses that tolerate missing fields, and the `request<T>(path, options)` helper for every network call).

The AI assistant is the one exception: it lives in its own module because it pulls in `recharts`, and `App.tsx` loads it with `React.lazy` so the charting library ships as a separate chunk instead of weighing down first paint. It mounts once at the bottom of the app shell and manages its own open/closed state.
