# Shadow-Code

A Java code analysis tool that parses repositories, builds dependency graphs, and visualizes risk analysis with an interactive web interface.

## Overview

Shadow-Code helps you understand and modernize legacy Java codebases by:

- 📊 **Analyzing dependencies** across your entire codebase
- 🔍 **Detecting circular dependencies** and code smells
- 📈 **Calculating risk scores** based on complexity and coupling
- 🎯 **Visualizing impact** through blast radius analysis
- 🚦 **Classifying files** by migration priority (RED/YELLOW/GREEN)

### Components

1. **Java Parser** - Extracts AST information from Java source files using JavaParser
2. **Python Backend** - Builds dependency graphs, computes metrics, and serves REST API
3. **React Frontend** - Interactive graph visualization with Cytoscape.js

## Prerequisites

- **Java 11+** for the parser
- **Python 3.12** for the backend (managed via mise)
- **Node.js 16+** for the frontend
- **Maven** (optional - manual build instructions provided)
- **mise** (recommended for Python version management)

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

**Using mise (Recommended):**

```bash
cd backend

# Install mise (if not already installed)
brew install mise  # macOS
# or curl https://mise.run | sh  # Linux

# Install Python 3.12 (configured in mise.toml)
mise install

# Install dependencies
pip install -r requirements.txt

# Start backend server (automatically generates data files)
python server.py
```

**Using system Python:**

```bash
cd backend

# Create virtual environment
python3.12 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server (automatically generates data files)
python server.py
```

Backend runs on `http://localhost:3001`

**Note:** The server now automatically runs `graph_builder.py` and `risk_analyzer.py` on startup to generate the required JSON files in the `storage/` directory.
README.md               # This file
├── .gitignore              # Root gitignore
├── ast.json                # Generated AST data (after parser runs)
│
├── parser/                 # Java AST parser
│   ├── src/main/java/com/shadowcode/parser/
│   │   ├── ParserMain.java      # CLI entry point
│   │   ├── FileWalker.java      # Recursive file finder
│   │   ├── AstExtractor.java    # AST extraction logic
│   │   ├── FileNode.java        # File data model
│   │   └── AstModel.java        # JSON output model
│   ├── pom.xml             # Maven build configuration
│   ├── README.md           # Parser documentation
│   └── target/             # Build output
│       └── parser.jar      # Compiled JAR
│
├── backend/                # Python backend
│   ├── .gitignore          # Backend-specific ignores
│   ├── mise.toml           # Python version config (3.12)
│   ├── requirements.txt    # Python dependencies
│   ├── package.json        # Node metadata (legacy)
│   ├── server.py           # Flask API server (auto-initializes data)
│   ├── graph_builder.py    # Dependency graph builder
│   ├── risk_analyzer.py    # Risk analysis engine
│   └── storage/            # Generated JSON files (auto-created)
│       ├── graph.json      # Dependency graph
│       ├── metrics.json    # Code metrics
│       └── analysis.json   # Risk analysis
│
└── frontend/               # React frontend
    ├── .gitignore          # Frontend-specific ignores
    ├── package.json        # Node dependencies
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js        # Entry point
        ├── App.jsx         # Main component
        ├── App.css         # Styles
        ├── api/
        │   └── api.js      # Backend API client
        └── components/
            └── Graph.jsx   # Cytoscape graph visualizatiractor.java    # AST extraction
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
    │   ├── components/Gra support
- Auto-initialization: Runs `graph_builder.py` and `risk_analyzer.py` on startup
- Creates `storage/` directory and generates all JSON files before serving requests
- Endpoints:
  - `GET /api/graph` - Dependency graph (nodes + edges)
  - `GET /api/analysis` - Risk analysis with classifications
  - `GET /api/metrics` - Code metrics (fan-in/out, DB ops)
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

The backend uses Flask's development mode with hot-reload enabled:

```bash
cd backend

# Using mise
mise install
pip install -r requirements.txt
python server.py

# Using venv
source venv/bin/activate
python server.py
```

The server automatically regenerates data files on startup. For development iteration:

```bash
# Manually regenerate data
python graph_builder.py  # Creates graph.json and metrics.json
python risk_analyzer.py   # Creates analysis.json

# Or just restart the server
python server.py
```

### Frontend Development

```bash
cd frontend
npm install  # First time only
npm start    # Runs with hot-reload on http://localhost:3000
```Troubleshooting

### Backend Issues

**`pip install` fails:**
- Ensure Python 3.12 is installed
- Use mise: `brew install mise && mise install`
- Or create venv: `python3.12 -m venv venv`

**Server starts but no data:**
- Check that `ast.json` exists in project root
- Run manually: `python graph_builder.py && python risk_analyzer.py`
- Check console output for errors

**Port 3001 already in use:**
- Find and kill the process: `lsof -ti:3001 | xargs kill -9`

### Frontend Issues

**`npm install` fails:**
- Clear cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry

**CORS errors:**
- Ensure backend is running on port 3001
- Check backend has `flask-cors` installed

### Parser Issues

**Maven build fails:**
- Ensure Java 11+ is installed: `java -version`
- Try manual build (see Quick Start section)

**No output files:**
- Check you provided correct paths: `java -jar parser.jar <input-dir> <output-dir>`
- Ensure output directory exists

## Limitations

- **Java only**: Analyzes `.java` files only (no Kotlin, Scala, etc.)
- **Heuristic-based**: Database detection uses method name patterns
- **No bytecode analysis**: Source code only, no JAR introspection
- **No type resolution**: Import-based dependency detection only
- **Static analysis**: No runtime behavior analysis

## Future Enhancements

- [ ] Support for other JVM languages (Kotlin, Scala)
- [ ] More sophisticated database operation detection
- [ ] Integration with build tools (Gradle, Maven)
- [ ] Export reports (PDF, CSV)
- [ ] Custom risk scoring rules
- [ ] Multi-project analysis
- [ ] Git history integration for change frequency analysis

## Contributing

This is a hackathon project. Feel free to fork and extend!

## License

MIT

---

**For detailed parser documentation, see [parser/README.md](parser/README.md)**

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
