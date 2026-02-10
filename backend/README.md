# Shadow-Code Backend

Python Flask API server that powers the Shadow-Code migration intelligence platform — dependency graph construction, risk analysis, Backboard.io risk verdicts, and Gemini AI code conversion.

## Tech Stack

- **Python 3.12** (managed via [mise](https://mise.jdx.dev))
- **Flask** + Flask-CORS — REST API
- **Gemini 2.0-flash** — AI-powered Java → Go / Kotlin / TypeScript conversion
- **Backboard.io** — risk assessment verdicts
- **python-dotenv** — environment variable management

## Getting Started

```bash
# Install Python (via mise)
mise install

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure APIs (optional)
cp .env.example .env   # add your keys

# Run server
python server.py       # http://localhost:3001
```

On startup the server automatically runs `graph_builder.py` and `risk_analyzer.py` to generate the required JSON files in `storage/`.

## Environment Variables

Create a `.env` file in this directory:

```env
GEMINI_API_KEY=your-key-here
BACKBOARD_API_KEY=your-key-here
BACKBOARD_THREAD_ID=your-thread-id
BACKBOARD_ASSISTANT_ID=your-assistant-id

# Set to false to enable (true = disabled, saves credits)
DISABLE_GEMINI_API=false
DISABLE_BACKBOARD_API=false
```

Both APIs can be independently toggled. With both disabled, the server runs in **analysis-only mode**.

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/analyze` | Clone a GitHub repo, parse it, build graph, and run risk analysis |
| `GET` | `/api/graph` | Dependency graph — nodes and edges |
| `GET` | `/api/analysis` | Risk analysis with per-file classifications (GREEN / YELLOW / RED) |
| `GET` | `/api/metrics` | Code metrics — fan-in, fan-out, line count, method count |
| `POST` | `/api/migrate` | Get a Backboard.io risk verdict for a single node |
| `POST` | `/api/migrate/batch` | Batch verdicts for all GREEN-classified nodes |
| `POST` | `/api/convert-code` | Convert a Java file to Go, Kotlin, or TypeScript via Gemini |
| `GET` | `/api/convert` | List previously converted files for a project |
| `GET` | `/api/workflow/:nodeId` | Fan-in dependency subgraph (BFS closure) |
| `GET` | `/api/file-content` | Read raw source file content |
| `GET` | `/api/project/:id/converted-files` | Converted files for a specific project |

## Key Modules

| File | Purpose |
|---|---|
| `server.py` | Flask app — all routes, API flag management, auto-init pipeline |
| `graph_builder.py` | Reads `ast.json`, builds dependency graph with cycle detection, computes fan-in/fan-out |
| `risk_analyzer.py` | Scores files by complexity, coupling, blast radius, and risky patterns; classifies as GREEN / YELLOW / RED |
| `gemini_client.py` | Gemini 2.0-flash wrapper with exponential backoff retry (3 retries, 2s→4s→8s) |
| `backboard_client.py` | Backboard.io API client — builds messages, sends requests, extracts verdicts |

## Risk Scoring

Each file is scored (0–100) based on:

- **Fan-in / fan-out** — coupling complexity
- **Blast radius** — how many files are affected if this one changes
- **Line count / method count** — size complexity
- **Circular dependencies** — files in dependency cycles
- **Threading** — uses concurrency primitives
- **Reflection** — uses runtime introspection
- **DB operations** — reads from or writes to databases
- **Inheritance / generics** — OOP complexity

Verdicts are contextual suggestions (SAFE / REVIEW / RISKY) with 1–2 line explanations based on the actual metrics.

## File Structure

```
backend/
├── server.py              # Flask API server
├── graph_builder.py       # Dependency graph builder
├── risk_analyzer.py       # Risk scoring engine
├── gemini_client.py       # Gemini AI client (with retry)
├── backboard_client.py    # Backboard.io client
├── requirements.txt       # Python dependencies
├── mise.toml              # Python 3.12 version pin
├── .env                   # API keys (not committed)
├── parser/                # Java AST parser (see parser/README.md)
├── storage/               # Generated JSON files
│   ├── graph.json
│   ├── analysis.json
│   └── metrics.json
├── repos/                 # Cloned repositories
└── converted_files/       # AI-converted source files
```

## License

MIT
