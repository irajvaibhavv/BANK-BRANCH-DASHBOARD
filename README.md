# NBFC Leadership Dashboard (Prototype)

Desktop web dashboard for NBFC leadership, designed to a white-label design language (brand name set in src/config/brand.js).
Companion to the Branch Officer mobile app. **Prototype only** — all data is generated dummy data, no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Demo logins (OTP is always `1234`)

| Phone        | Role                        | Scope                              |
|--------------|-----------------------------|------------------------------------|
| 9999000001   | National Business Head      | All India (4 regions, 42 branches) |
| 9999000002   | Regional Head · North       | 8 states, 20 branches              |
| 9999000003   | State Head · Bihar          | 4 branches                         |
| 9999000004   | Branch Head · Patna Main    | 1 branch, its officers & DSAs      |

Every role sees the same screens; only the data scope changes. Drill down via the breadcrumb, tables, charts or the map.

## Screens
Overview · Branch Performance · Officer Activity · Map View · Leaderboard · DSA Network · Loan Pipeline · Officer Activity · Incentives · Reports · Alerts · Settings

## Regenerate dummy data
```bash
npm run data      # scripts/generate-data.js → src/data/*.json (seeded — same output every run)
npm run lint      # oxlint
```

## Stack
React 19 + Vite, React Router, Recharts, react-simple-maps, Framer Motion, react-icons. Plain CSS with design tokens in `src/styles/variables.css` (light + dark themes).

## Project structure

Feature-first: everything a screen needs (its page, components, data helpers, css) lives in one folder under `src/features/`.
Imports use the `@/` alias (= `src/`), so there are no `../../../` paths.

```
scripts/
  generate-data.js        seeded dummy-data generator → src/data/*.json
src/
  app/                    shell: entry, routes, providers, sidebar/topbar layout
    main.jsx, App.jsx
    layout/               AppLayout, Sidebar (nav order), TopBar, PageHeader, GlobalSearch
  config/
    brand.js              white-label name shown in the UI — change this per client
  data/                   generated JSON (do not edit by hand — run `npm run data`)
  scope/                  WHO is looking at WHAT: role → drill-down level → area/BO/DSA focus filter
    ScopeContext.jsx      useScope() gives every screen its officers / dsas / loanFiles / monthly / agg
    scopeHelpers.js       filtering + aggregation, applyFocus()
    Breadcrumb.jsx        drill-down trail + active-filter badge
    FocusBar.jsx          area / branch-officer / DSA filter (Overview)
    areas.js              DSA → locality mapping shared by map + filters + widgets
  shared/                 reusable, feature-agnostic
    ui/                   Card, KPICard, StatusCard, DataTable, Badge, PillToggle, Modal, …
    charts/               Recharts wrappers (Bar, Line, Area, Donut, Funnel, HeatMap…)
    context/              Theme (prefs + dark mode), DateRange, Toast
    hooks/                useLocalStorage, useSortableTable, useSearch, useDateRange
    utils/                formatCurrency, formatNumber, colors, performanceColor
  features/
    auth/                 LoginScreen (OTP demo) + AuthContext
    setup/                post-login "Standard overview / Build my own" page
    overview/             Overview dashboard, section registry, Smart-insights bar
    widgets/              pivot "views": datasets registry, pivot engine, builder, renderer
    branch/               Branch Performance (drill-down table + branch-head overview)
    officers/             Officer Activity, BO productivity model + table + detail panel
    dsa/                  DSA Network
    map/                  Map View (India choropleth, city heat map)
    pipeline/             Loan Pipeline
    leaderboard/, incentives/, reports/, alerts/, settings/
  styles/                 global.css (+ variables = design tokens, animations, sidebar)
```

### Common tasks
| I want to… | Go to |
|---|---|
| Rename the product for a client | `src/config/brand.js` |
| Add / reorder a sidebar item | `src/app/layout/Sidebar.jsx` (NAV) + route in `src/app/App.jsx` |
| Add a new screen | new folder in `src/features/<name>/`, lazy route in `App.jsx`, NAV entry |
| Add a dataset for "Build my own" views | one entry in `src/features/widgets/datasets.js` (dims + measures) |
| Change how the BO productivity score / red flags work | `src/features/officers/officerProductivity.js` |
| Change what the area / BO / DSA filter does to numbers | `applyFocus()` in `src/scope/scopeHelpers.js` |
| Change dummy data shape | `scripts/generate-data.js`, then `npm run data` |
| Add a section to the Standard overview | `src/features/overview/overviewSections.js` + a block in `OverviewDashboard.jsx` |

### Conventions
- Feature folders may import from `@/shared`, `@/scope`, `@/config` and other features' public files; `shared/` never imports from `features/`.
- Data flows one way: `data/*.json` → `scope/` (filter + aggregate) → feature screens. Screens never read JSON directly except via `scopeHelpers.DATA`.
- Styling is plain CSS with tokens in `styles/variables.css`; feature-specific css sits next to the feature (`setup/setup.css`).
