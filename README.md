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
Overview · Drill Down · Map View · Leaderboard · DSA Network · Loan Pipeline · Officer Activity · Incentives · Reports · Alerts · Settings

## Regenerate dummy data
```bash
node src/utils/dummyDataGenerator.js   # seeded — same output every run
```

## Stack
React 19 + Vite, React Router, Recharts, react-simple-maps, Framer Motion, react-icons. Plain CSS with design tokens in `src/styles/variables.css` (light + dark themes).
