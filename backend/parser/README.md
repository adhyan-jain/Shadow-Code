# Shadow-Code Parser

Java CLI tool that parses legacy Java repositories using JavaParser and outputs structured AST data as JSON.

## Overview

The parser walks a Java repository, extracts Abstract Syntax Tree information from every `.java` file, and applies heuristics to detect database operations. It produces `ast.json` — the input for the Shadow-Code analysis pipeline.

## Prerequisites

- Java 11+
- Maven (optional — manual build instructions below)

## Build

### With Maven

```bash
mvn clean package
```

### Without Maven

```bash
mkdir -p target/classes lib

# Download dependencies
wget -O lib/javaparser-core-3.25.8.jar \
  https://repo1.maven.org/maven2/com/github/javaparser/javaparser-core/3.25.8/javaparser-core-3.25.8.jar
wget -O lib/gson-2.10.1.jar \
  https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

# Compile
javac -cp "lib/*" -d target/classes src/main/java/com/shadowcode/parser/*.java

# Bundle dependencies
cd target/classes
jar xf ../../lib/javaparser-core-3.25.8.jar
jar xf ../../lib/gson-2.10.1.jar
rm -rf META-INF
cd ../..

# Create executable JAR
jar cfe target/parser.jar com.shadowcode.parser.ParserMain -C target/classes .
```

## Usage

```bash
java -jar target/parser.jar <repoPath> <outputPath>
```

| Argument | Description |
|---|---|
| `repoPath` | Path to the Java repository to analyze |
| `outputPath` | Directory where `ast.json` will be written |

### Examples

```bash
# Analyze a local project
java -jar target/parser.jar /path/to/java/project .

# Analyze the bundled sample repo
java -jar target/parser.jar ../repos/jpetstore-6/src ../
```

## Output Format

`ast.json`:

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

| Field | Description |
|---|---|
| `filePath` | Absolute path to the source file |
| `packageName` | Java package declaration |
| `imports` | All imported classes and packages |
| `classNames` | All class and interface declarations |
| `methodNames` | All methods, qualified as `ClassName.methodName` |
| `methodCalls` | Unique method calls found in the file |
| `readsFromDb` | Heuristic: calls containing `find`, `get`, `select`, `query`, `fetch`, `read`, `load`, `retrieve` |
| `writesToDb` | Heuristic: calls containing `save`, `update`, `delete`, `insert`, `persist`, `create`, `remove` |

## File Structure

```
parser/
├── src/main/java/com/shadowcode/parser/
│   ├── ParserMain.java      # CLI entry point
│   ├── FileWalker.java      # Recursive .java file finder
│   ├── AstExtractor.java    # AST extraction via JavaParser
│   ├── FileNode.java        # Per-file data model
│   └── AstModel.java        # Top-level JSON output model
├── pom.xml                  # Maven configuration
└── README.md
```

## Limitations

- Java files only (`.java` extension)
- Skips unparseable files gracefully
- Database detection is heuristic-based (method name patterns)
- No symbol resolution or type checking
- No bytecode / JAR analysis
- Ignores `target/`, `build/`, `.git/`, `.idea/` directories

## License

MIT
