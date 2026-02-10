# Shadow-Code Frontend

Interactive React frontend for the Shadow-Code migration intelligence platform.

## Tech Stack

- **React 19** with TypeScript
- **Vite** — dev server + build tool
- **D3.js v7** — force-directed dependency graph
- **Tailwind CSS** — utility-first styling
- **React Router v7** — client-side routing
- **tsParticles** — animated particle background

## Pages

| Route | Component | Description |
|---|---|---|
| `/` | `home_page.tsx` | Landing page — paste a GitHub repo URL to analyze |
| `/map` | `map_page.tsx` | Risk analysis map with interactive D3 graph |
| `/workflow/:nodeId` | `Workflow.tsx` | Fan-in dependency closure for a specific file |
| `/comparison` | `comparison.tsx` | Side-by-side diff of original Java vs. converted code |

## Key Components

### `Graph.tsx`
D3.js force-directed graph with:
- Color-coded nodes — 🟢 green (safe), 🟡 amber (moderate), 🔴 red (risky)
- Color-encoded edges — cyan (fan-in), amber (fan-out) on node selection
- Animated hover effects with glow
- Sidebar with file details, risk score, metrics, and blast radius
- Two-step convert flow: **Analyze** (Backboard verdict) → **Convert** (Gemini AI)
- Contextual SAFE / REVIEW / RISKY suggestion panel

### `api.ts`
API client with functions for:
- `analyzeRepo()` — trigger full repo analysis
- `fetchGraph()` / `fetchAnalysis()` / `fetchMetrics()` — load data
- `migrateNode()` — get Backboard.io risk verdict
- `convertCode()` — convert Java file via Gemini AI
- `fetchConvertedFiles()` / `fetchFileContent()` — retrieve converted output

## Getting Started

```bash
npm install
npm run dev       # http://localhost:5173
```

Requires the backend running on `http://localhost:3001`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check + production build |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

## Design

- Dark theme (`#060C1E` background)
- Accent colors: green `#10B981`, amber `#F59E0B`, red `#EF4444`, cyan `#22D3EE`
- Custom fonts via `assets/fonts/`
- Invisible scrollbars across all scrollable containers
