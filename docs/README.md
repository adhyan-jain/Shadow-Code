# Shadow-Code

A hackathon project for analyzing legacy Java codebases and visualizing dependency graphs with risk analysis.

## Project Structure

```
shadow-code/
├── parser/              # Java AST parser
├── backend/            # Node.js backend
├── frontend/           # React frontend
└── docs/              # Documentation
```

## Quick Start

### 1. Parse a Java Repository

```bash
cd parser
java -jar target/parser.jar /path/to/java/repo /path/to/output
```

This generates `ast.json` with extracted AST data.

### 2. Build Graph and Analysis

```bash
cd backend
npm install
node utils/graphBuilder.js    # Generates graph.json
node utils/riskAnalyzer.js     # Generates analysis.json
```

### 3. Start Backend Server

```bash
cd backend
npm start
```

Server runs on `http://localhost:3001`

### 4. Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

## Architecture

### Parser (Java)

- Uses JavaParser to extract AST information
- Outputs structured JSON with:
  - File paths
  - Package names
  - Imports
  - Classes and methods
  - DB read/write detection (heuristic)

### Backend (Node.js)

- **Graph Builder**: Creates dependency graph from AST
- **Risk Analyzer**: Computes risk scores and blast radius
- **API Server**: Serves graph and analysis data

### Frontend (React)

- Visualizes dependency graph using Cytoscape.js
- Color-codes nodes by risk level:
  - 🟢 GREEN: Low risk
  - 🟡 YELLOW: Medium risk
  - 🔴 RED: High risk

## API Endpoints

- `GET /api/graph` - Returns dependency graph
- `GET /api/analysis` - Returns risk analysis

## Files Generated

- `ast.json` - Raw AST data from parser
- `graph.json` - Dependency graph (nodes + edges)
- `metrics.json` - Structural metrics (fan-in, fan-out, etc.)
- `analysis.json` - Risk analysis with recommendations

## License

MIT - Hackathon Project
