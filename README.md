# Shadow-Code Parser

A Java CLI tool that parses Java repositories using JavaParser and outputs structured JSON for code analysis.

## Overview

Shadow-Code Parser extracts Abstract Syntax Tree (AST) information from Java source files and applies heuristics to detect database operations. It's designed to analyze legacy codebases by walking through directory structures and extracting key information from each Java file.

## Prerequisites

- Java 11 or higher
- Maven (optional - manual build instructions provided)

## Quick Start

### Build the Parser

**With Maven:**

```bash
cd parser
mvn clean package
```

**Without Maven (manual build):**

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
```

### Run the Parser

```bash
java -jar parser/target/parser.jar <repoPath> <outputPath>
```

**Example:**

```bash
java -jar parser/target/parser.jar /path/to/java/project .
```

This generates `ast.json` in the output directory.

## Output Format

The parser generates `ast.json` with extracted information:

```json
{
  "files": [
    {
      "filePath": "/path/to/File.java",
      "packageName": "com.example",
      "imports": ["java.util.List", "java.io.File"],
      "classNames": ["MyClass"],
      "methodNames": ["MyClass.doSomething", "MyClass.calculate"],
      "methodCalls": ["save", "findById", "process"],
      "readsFromDb": true,
      "writesToDb": false
    }
  ]
}
```

## What Gets Extracted

For each `.java` file:

- **File path** - Absolute path to the source file
- **Package name** - Java package declaration
- **Imports** - All imported classes and packages
- **Class names** - All class and interface declarations
- **Method names** - Methods qualified with class name (e.g., `ClassName.methodName`)
- **Method calls** - Unique list of method calls
- **DB operations** - Heuristic-based detection of database reads/writes

## Database Detection

The parser uses heuristics to detect database operations:

**Write Operations:** `save`, `update`, `delete`, `insert`, `persist`, `create`, `remove`

**Read Operations:** `find`, `get`, `select`, `query`, `fetch`, `read`, `load`, `retrieve`

## Features

✅ Recursive directory scanning  
✅ Ignores build folders (`target/`, `build/`, `.git/`)  
✅ Graceful error handling  
✅ Pretty-printed JSON output  
✅ No runtime dependencies

## Project Structure

```
shadow-code/
└── parser/
    ├── src/main/java/com/shadowcode/parser/
    │   ├── ParserMain.java      # CLI entry point
    │   ├── FileWalker.java      # Recursive file finder
    │   ├── AstExtractor.java    # AST extraction
    │   ├── FileNode.java        # File data model
    │   └── AstModel.java        # JSON output model
    ├── pom.xml
    ├── lib/                     # Dependencies
    └── target/
        └── parser.jar           # Executable JAR
```

## Limitations

- Only parses Java files (`.java` extension)
- Skips unparseable files and continues
- Database detection is heuristic-based
- No symbol resolution or type checking
- Does not analyze bytecode or JARs

## License

MIT - Hackathon Project

---

For detailed parser documentation, see [`parser/README.md`](parser/README.md)
