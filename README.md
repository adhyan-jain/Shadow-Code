# Shadow-Code

**Analyze. Visualize. Migrate.**

Deployed Version: https://shadow-code-delta.vercel.app

Shadow-Code is a Java migration intelligence platform that parses repositories, builds dependency graphs, performs risk analysis, and converts source files to Go, Kotlin, or TypeScript — powered by Gemini AI and Backboard.io risk assessment.

---

## Features

| Capability | Description |
|---|---|
| 🔎 **AST Parsing** | Extracts imports, classes, methods, and DB operations from Java source |
| 🕸️ **Dependency Graph** | Builds a full dependency graph with cycle detection |
| 📊 **Risk Analysis** | Scores every file by complexity, coupling, blast radius, and risky patterns |
| 🎯 **Interactive Map** | D3.js force-directed graph with color-coded nodes (green / amber / red) |
| �� **Workflow View** | Fan-in dependency closure — see everything a file depends on |
| 🤖 **AI Conversion** | Convert Java → Go, Kotlin, or TypeScript via Gemini 2.0-flash |
| 🛡️ **Risk Verdicts** | Pre-conversion analysis with contextual SAFE / REVIEW / RISKY suggestions |
| 🔍 **Side-by-Side Diff** | Compare original Java with converted output |

## Architecture

```
┌───────────────┐     ast.json     ┌──────────────────┐     REST API     ┌──────────────────┐
│  Java Parser  │ ───────────────► │  Python Backend  │ ◄──────────────► │  React Frontend  │
│  (JavaParser) │                  │  (Flask + Gemini │                  │  (Vite + D3.js)  │
│               │                  │   + Backboard)   │                  │                  │
└───────────────┘                  └──────────────────┘                  └──────────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| Parser | Java 11+, JavaParser 3.25, Gson |
| Backend | Python 3.12 (mise), Flask, Gemini 2.0-flash, Backboard.io |
| Frontend | React 19, TypeScript, Vite, D3.js v7, Tailwind CSS |

## Quick Start

### Prerequisites

- **Java 11+** and **Maven**
- **Python 3.12** (managed via [mise](https://mise.jdx.dev))
- **Node.js 18+**

### 1. Clone & Parse

```bash
git clone https://github.com/adhyan-jain/Shadow-Code.git
cd Shadow-Code

# Build the parser
cd backend/parser
mvn clean package
cd ../..

# Parse a Java repo (e.g. the bundled jpetstore-6)
java -jar backend/parser/target/parser.jar backend/repos/jpetstore-6/src backend/
```

### 2. Start the Backend

```bash
cd backend
mise install               # installs Python 3.12
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configure API keys (optional — runs in analysis-only mode without them)
cp .env.example .env       # then add your GEMINI_API_KEY / BACKBOARD keys

python server.py           # http://localhost:3001
```

### 3. Start the Frontend

```bash
cd frontend-new
npm install
npm run dev                # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173) — paste a GitHub repo URL or use the pre-loaded data to explore the dependency graph.

## Project Structure

```
Shadow-Code/
├── backend/
│   ├── parser/              # Java AST parser (Maven project)
│   ├── server.py            # Flask API server
│   ├── graph_builder.py     # Dependency graph builder
│   ├── risk_analyzer.py     # Risk scoring engine
│   ├── gemini_client.py     # Gemini AI conversion client (with retry)
│   ├── backboard_client.py  # Backboard.io risk assessment client
│   ├── requirements.txt     # Python dependencies
│   ├── mise.toml            # Python version pinning
│   ├── storage/             # Generated JSON (graph, analysis, metrics)
│   ├── repos/               # Cloned repositories
│   └── converted_files/     # AI-converted source files
│
├── frontend-new/            # React + TypeScript + Vite
│   ├── src/
│   │   ├── home_page.tsx    # Landing page with repo input
│   │   ├── map_page.tsx     # Risk analysis map with D3 graph
│   │   ├── Workflow.tsx     # Fan-in dependency closure view
│   │   ├── comparison.tsx   # Side-by-side diff viewer
│   │   ├── components/
│   │   │   └── Graph.tsx    # D3 force-directed graph component
│   │   └── api/
│   │       └── api.ts       # Backend API client
│   └── package.json
│
└── README.md
```

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/analyze` | Clone repo, parse, build graph, run risk analysis |
| `GET` | `/api/graph` | Dependency graph (nodes + edges) |
| `GET` | `/api/analysis` | Risk analysis with classifications |
| `GET` | `/api/metrics` | Code metrics (fan-in, fan-out, line count) |
| `POST` | `/api/migrate` | Get Backboard risk verdict for a single node |
| `POST` | `/api/migrate/batch` | Batch verdicts for GREEN-classified nodes |
| `POST` | `/api/convert-code` | Convert a Java file via Gemini AI |
| `GET` | `/api/convert` | List converted files for a project |
| `GET` | `/api/workflow/:nodeId` | Fan-in dependency subgraph for a node |
| `GET` | `/api/file-content` | Read raw source file content |

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your-key-here
BACKBOARD_API_KEY=your-key-here
BACKBOARD_THREAD_ID=your-thread-id
BACKBOARD_ASSISTANT_ID=your-assistant-id

# Set to false to enable (true = disabled, saves API credits)
DISABLE_GEMINI_API=false
DISABLE_BACKBOARD_API=false
```

Both APIs can be independently enabled/disabled. With both disabled, Shadow-Code runs in **analysis-only mode** — parsing, graphing, and risk scoring still work fully.

## How It Works

1. **Parse** — Java parser walks the repo, extracts AST data into `ast.json`
2. **Build Graph** — Python backend resolves imports into a dependency graph with cycle detection
3. **Analyze Risk** — Each file is scored based on fan-in/out, blast radius, line count, threading, reflection, DB access, inheritance, generics, and circular dependencies
4. **Classify** — Files are bucketed into 🟢 GREEN / 🟡 YELLOW / 🔴 RED
5. **Visualize** — D3.js renders an interactive force-directed graph with color-coded nodes
6. **Analyze** — Click a node → get a contextual SAFE / REVIEW / RISKY suggestion from Backboard
7. **Convert** — Confirm conversion → Gemini AI translates the Java file to your target language
8. **Compare** — View original vs. converted code side-by-side

## License

MIT

---

Built by **Adhyan Jain** · [GitHub](https://github.com/adhyan-jain/Shadow-Code)
