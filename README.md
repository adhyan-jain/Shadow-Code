# Shadow-Code

A Java code analysis tool that parses repositories, builds dependency graphs, and visualizes risk analysis with an interactive web interface.

## Overview

Shadow-Code consists of three main components:

1. **Java Parser** - Extracts AST information from Java source files
2. **Python Backend** - Processes data, builds dependency graphs, and serves API
3. **React Frontend** - Interactive graph visualization with risk analysis

## Prerequisites

- **Java 11+** for the parser
- **Python 3.12+** for the backend
- **Node.js 16+** for the frontend
- **Maven** (optional - manual build instructions provided)

## Quick Start

### 1. Parse Java Repository

**With Maven:**

```bash
cd parser
mvn clean package
java -jar target/parser.jar /path/to/java/project ../
```

**Without Maven:**

```bash
cd parser
mkdir -p target/classes lib

# Download dependencies
wget -O lib/javaparser-core-3.25.8.jar https://repo1.maven.org/maven2/com/github/javaparser/javaparser-core/3.25.8/javaparser-core-3.25.8.jar
wget -O lib/gson-2.10.1.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

# Compile
javac -cp "lib/*" -d target/classes src/main/java/com/shadowcode/parser/*.java

# Extract dependencies
cd target/classes
jar xf ../../lib/javaparser-core-3.25.8.jar
jar xf ../../lib/gson-2.10.1.jar
rm -rf META-INF
cd ../..

# Create JAR
jar cfe target/parser.jar com.shadowcode.parser.ParserMain -C target/classes .

# Run parser
java -jar target/parser.jar /path/to/java/project ../
```

This generates `ast.json` in the project root.

### 2. Setup Python Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Generate graph and analysis data
python graph_builder.py
python risk_analyzer.py

# Start backend server
python server.py
```

Backend runs on `http://localhost:3001`

### 3. Setup React Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

Frontend runs on `http://localhost:3000`

## Project Structure

```
shadow-code/
├── parser/              # Java AST parser
│   ├── src/main/java/com/shadowcode/parser/
│   │   ├── ParserMain.java      # CLI entry point
│   │   ├── FileWalker.java      # Recursive file finder
│   │   ├── AstExtractor.java    # AST extraction
│   │   ├── FileNode.java        # File data model
│   │   └── AstModel.java        # JSON output model
│   ├── pom.xml
│   └── target/parser.jar
├── backend/             # Python backend
│   ├── server.py        # Flask API server
│   ├── graph_builder.py # Dependency graph builder
│   ├── risk_analyzer.py # Risk analysis engine
│   ├── requirements.txt # Python dependencies
│   └── storage/         # Generated JSON files
│       ├── graph.json
│       ├── metrics.json
│       └── analysis.json
└── frontend/            # React frontend
    ├── src/
    │   ├── App.jsx
    │   ├── components/Graph.jsx
    │   └── api/api.js
    └── package.json
```

## How It Works

### 1. Parser (Java)

- Walks through Java repository
- Extracts AST using JavaParser
- Detects database operations (heuristic-based)
- Outputs `ast.json`

### 2. Backend (Python)

**Graph Builder** (`graph_builder.py`):

- Reads `ast.json`
- Builds dependency graph from imports
- Detects circular dependencies
- Computes metrics (fan-in, fan-out)
- Generates `graph.json` and `metrics.json`

**Risk Analyzer** (`risk_analyzer.py`):

- Analyzes graph and metrics
- Computes risk scores based on:
  - Dependency complexity (fan-in/fan-out)
  - Circular dependencies
  - Database operations
- Calculates blast radius
- Classifies files: 🟢 GREEN / 🟡 YELLOW / 🔴 RED
- Generates `analysis.json`

**API Server** (`server.py`):

- Flask REST API with CORS
- Endpoints:
  - `GET /api/graph` - Dependency graph
  - `GET /api/analysis` - Risk analysis
  - `GET /api/metrics` - File metrics

### 3. Frontend (React)

- Fetches data from backend API
- Visualizes graph using Cytoscape.js
- Color-codes nodes by risk level
- Interactive dependency exploration

## Output Format

### ast.json

```json
{
  "files": [
    {
      "filePath": "/path/to/File.java",
      "packageName": "com.example",
      "imports": ["java.util.List"],
      "classNames": ["MyClass"],
      "methodNames": ["MyClass.doSomething"],
      "methodCalls": ["save", "findById"],
      "readsFromDb": true,
      "writesToDb": false
    }
  ]
}
```

### graph.json

```json
{
  "nodes": [
    {
      "id": "file_0",
      "type": "FILE",
      "filePath": "/path/to/File.java",
      "packageName": "com.example",
      "classNames": ["MyClass"],
      "readsFromDb": true,
      "writesToDb": false,
      "inCycle": false
    }
  ],
  "edges": [
    {
      "from": "file_0",
      "to": "file_1",
      "type": "DEPENDS_ON"
    }
  ]
}
```

### analysis.json

```json
{
  "file_0": {
    "nodeId": "file_0",
    "filePath": "/path/to/File.java",
    "riskScore": 45,
    "convertibilityScore": 65,
    "blastRadius": {
      "affectedNodes": 12,
      "totalNodes": 43,
      "percentage": 27.91
    },
    "classification": "YELLOW"
  }
}
```

## API Endpoints

- `GET /api/graph` - Returns dependency graph (nodes + edges)
- `GET /api/analysis` - Returns risk analysis with classifications
- `GET /api/metrics` - Returns structural metrics (fan-in, fan-out, etc.)

## Risk Classification

**🔴 RED (High Risk):**

- In circular dependency
- Risk score ≥ 60
- Blast radius ≥ 50%

**🟡 YELLOW (Medium Risk):**

- Risk score ≥ 30
- Blast radius ≥ 20%

**🟢 GREEN (Low Risk):**

- All other files

## Features

✅ Recursive Java repository scanning  
✅ AST-based code analysis  
✅ Dependency graph generation  
✅ Circular dependency detection  
✅ Database operation heuristics  
✅ Risk scoring and classification  
✅ Blast radius calculation  
✅ Interactive graph visualization  
✅ REST API with CORS support

## Development

### Backend Development

```bash
cd backend
source venv/bin/activate
python server.py  # Runs with hot-reload
```

### Frontend Development

```bash
cd frontend
npm start  # Runs with hot-reload
```

## Limitations

- Java files only (`.java` extension)
- Heuristic-based database detection
- No bytecode or JAR analysis
- No symbol resolution or type checking

## License

MIT - Hackathon Project

---

For detailed parser documentation, see [`parser/README.md`](parser/README.md)
