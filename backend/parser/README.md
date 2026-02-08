# Shadow-Code Parser

A Java CLI tool that parses legacy Java repositories using JavaParser and outputs structured JSON for analysis.

## Overview

This parser extracts Abstract Syntax Tree (AST) information from Java source files and applies heuristics to detect database operations. It's designed for the Shadow-Code hackathon project to analyze legacy codebases.

## Prerequisites

- Java 11 or higher
- Maven (optional - manual build instructions provided below)

## Building the Project

### Option 1: With Maven

```bash
mvn clean package
```

### Option 2: Manual Build (without Maven)

```bash
# Create directories
mkdir -p target/classes lib

# Download dependencies
wget -O lib/javaparser-core-3.25.8.jar https://repo1.maven.org/maven2/com/github/javaparser/javaparser-core/3.25.8/javaparser-core-3.25.8.jar
wget -O lib/gson-2.10.1.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

# Compile source files
javac -cp "lib/*" -d target/classes src/main/java/com/shadowcode/parser/*.java

# Extract dependency JARs
cd target/classes
jar xf ../../lib/javaparser-core-3.25.8.jar
jar xf ../../lib/gson-2.10.1.jar
rm -rf META-INF
cd ../..

# Create executable JAR
jar cfe target/parser.jar com.shadowcode.parser.ParserMain -C target/classes .
```

## Running the Parser

### Basic Usage

```bash
java -jar target/parser.jar <repoPath> <outputPath>
```

### Parameters

- **`<repoPath>`** - Path to the Java repository you want to analyze
- **`<outputPath>`** - Directory where `ast.json` will be created

### Examples

**Analyze a Java project and save output to current directory:**

```bash
java -jar target/parser.jar /path/to/java/project .
```

**Analyze with specific output location:**

```bash
java -jar target/parser.jar ~/projects/legacy-app ~/analysis-results
```

**Test with the parser itself:**

```bash
java -jar target/parser.jar ./src/main/java ./output
```

## Output Format

The tool generates `ast.json` with the following structure:

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

For each `.java` file, the parser extracts:

- **File path** - Absolute path to the source file
- **Package name** - Java package declaration
- **Imports** - All imported classes and packages
- **Class names** - All class and interface declarations
- **Method names** - All methods, qualified with class name (e.g., `ClassName.methodName`)
- **Method calls** - Unique list of method calls found in the file
- **DB operations** - Heuristic-based detection of database reads/writes

## Database Detection Heuristics

### Write Operations

Detected if method names or calls contain:

- `save`, `update`, `delete`, `insert`
- `persist`, `create`, `remove`

### Read Operations

Detected if method names or calls contain:

- `find`, `get`, `select`, `query`
- `fetch`, `read`, `load`, `retrieve`

## Features

✅ Recursive directory scanning  
✅ Ignores build folders (`target/`, `build/`, `.git/`, `.idea/`)  
✅ Graceful error handling (skips unparseable files)  
✅ Pretty-printed JSON output  
✅ No dependencies on runtime servers or frameworks

## File Structure

```
parser/
├── src/main/java/com/shadowcode/parser/
│   ├── ParserMain.java      # CLI entry point
│   ├── FileWalker.java      # Finds .java files recursively
│   ├── AstExtractor.java    # Extracts AST using JavaParser
│   ├── FileNode.java        # Model for a single file's data
│   └── AstModel.java        # Top-level model for JSON output
├── pom.xml                  # Maven build configuration
├── lib/                     # Downloaded JAR dependencies
├── target/
│   ├── classes/             # Compiled .class files
│   └── parser.jar           # Executable JAR
└── README.md
```

## Limitations

- Only parses Java files (`.java` extension)
- Skips files that fail parsing (continues processing)
- Database detection is heuristic-based (not definitive)
- Does not perform symbol resolution or type checking
- Does not analyze bytecode or JAR files

## Troubleshooting

**"Command not found: mvn"**

- Use the manual build instructions above

**"No Java files found"**

- Verify the repository path is correct
- Check that `.java` files aren't in ignored directories

**"Failed to parse file"**

- The file may have syntax errors
- Parser continues with remaining files

**"Error writing output file"**

- Verify output directory exists and is writable
- Check disk space availability

## License

Hackathon project - MIT License

## Contributing

This is a hackathon project. Feel free to fork and enhance!

---

**Shadow-Code Team** | Hackathon 2026
