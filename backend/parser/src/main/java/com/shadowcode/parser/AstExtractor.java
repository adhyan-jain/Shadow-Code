package com.shadowcode.parser;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.FieldDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.AnnotationExpr;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.stmt.CatchClause;
import com.github.javaparser.ast.stmt.ThrowStmt;
import com.github.javaparser.ast.type.ClassOrInterfaceType;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Extracts AST information from Java source files using JavaParser.
 * Applies heuristics to detect database read/write operations,
 * code complexity indicators, and structural patterns.
 */
public class AstExtractor {

    private static final String[] DB_WRITE_KEYWORDS = {
        "save", "update", "delete", "insert", "persist", "create", "remove",
        "merge", "flush", "commit", "execute", "executeUpdate", "put", "store",
        "write", "upsert", "replaceOne", "insertOne", "deleteOne", "updateOne"
    };
    private static final String[] DB_READ_KEYWORDS = {
        "find", "get", "select", "query", "fetch", "read", "load", "retrieve",
        "findAll", "findById", "findOne", "findBy", "getAll", "getOne",
        "list", "search", "count", "exists", "aggregate", "lookup"
    };

    private static final String[] REFLECTION_PATTERNS = {
        "java.lang.reflect", "Class.forName", "getMethod", "getDeclaredMethod",
        "getField", "getDeclaredField", "newInstance", "getConstructor",
        "getDeclaredConstructor", "invoke", "setAccessible"
    };

    private static final String[] THREADING_PATTERNS = {
        "java.util.concurrent", "java.lang.Thread", "synchronized",
        "ExecutorService", "CompletableFuture", "Runnable", "Callable",
        "Future", "CountDownLatch", "Semaphore", "ReentrantLock",
        "AtomicInteger", "AtomicLong", "AtomicReference", "volatile"
    };

    private static final String[] STREAM_PATTERNS = {
        ".stream()", ".parallelStream()", "Stream.of", "Collectors.",
        "IntStream", "LongStream", "DoubleStream", "StreamSupport"
    };

    private final JavaParser javaParser;

    public AstExtractor() {
        this.javaParser = new JavaParser();
    }

    /**
     * Parses a Java file and extracts structural information into a FileNode.
     * Returns null if parsing fails.
     */
    public FileNode extractFromFile(Path filePath) {
        try {
            String content = new String(Files.readAllBytes(filePath), StandardCharsets.UTF_8);
            ParseResult<CompilationUnit> parseResult = javaParser.parse(content);

            if (!parseResult.isSuccessful() || !parseResult.getResult().isPresent()) {
                System.err.println("Failed to parse file: " + filePath);
                return null;
            }

            CompilationUnit cu = parseResult.getResult().get();
            FileNode fileNode = new FileNode();
            
            fileNode.setFilePath(filePath.toString());

            // Line count
            fileNode.setLineCount(content.split("\n").length);
            
            // Extract package name
            cu.getPackageDeclaration().ifPresent(pkg -> 
                fileNode.setPackageName(pkg.getNameAsString())
            );

            // Extract imports
            List<String> imports = new ArrayList<>();
            for (ImportDeclaration importDecl : cu.getImports()) {
                imports.add(importDecl.getNameAsString());
            }
            fileNode.setImports(imports);
            fileNode.setImportCount(imports.size());

            // Extract class names and detect inner classes, inheritance, interfaces
            List<String> classNames = new ArrayList<>();
            List<ClassOrInterfaceDeclaration> allClasses = cu.findAll(ClassOrInterfaceDeclaration.class);
            boolean hasInheritance = false;
            boolean implementsInterfaces = false;
            boolean hasInnerClasses = false;
            boolean usesGenerics = false;

            for (ClassOrInterfaceDeclaration cls : allClasses) {
                classNames.add(cls.getNameAsString());

                // Check for extends (inheritance)
                if (!cls.getExtendedTypes().isEmpty()) {
                    hasInheritance = true;
                }

                // Check for implements (interfaces)
                if (!cls.getImplementedTypes().isEmpty()) {
                    implementsInterfaces = true;
                }

                // Check for inner/nested classes
                if (cls.isNestedType()) {
                    hasInnerClasses = true;
                }

                // Check for generics on class declaration
                if (!cls.getTypeParameters().isEmpty()) {
                    usesGenerics = true;
                }
            }
            fileNode.setClassNames(classNames);
            fileNode.setClassCount(allClasses.size());
            fileNode.setHasInheritance(hasInheritance);
            fileNode.setImplementsInterfaces(implementsInterfaces);
            fileNode.setHasInnerClasses(hasInnerClasses);

            // Extract method names and count static methods
            List<String> methodNames = new ArrayList<>();
            List<MethodDeclaration> allMethods = cu.findAll(MethodDeclaration.class);
            int staticMethodCount = 0;

            for (MethodDeclaration method : allMethods) {
                String className = method.findAncestor(ClassOrInterfaceDeclaration.class)
                        .map(ClassOrInterfaceDeclaration::getNameAsString)
                        .orElse("Unknown");
                methodNames.add(className + "." + method.getNameAsString());

                if (method.isStatic()) {
                    staticMethodCount++;
                }

                // Check for generics on method declarations
                if (!method.getTypeParameters().isEmpty()) {
                    usesGenerics = true;
                }
            }
            fileNode.setMethodNames(methodNames);
            fileNode.setMethodCount(allMethods.size());
            fileNode.setStaticMethodCount(staticMethodCount);
            fileNode.setUsesGenerics(usesGenerics);

            // Extract field declarations
            List<FieldDeclaration> allFields = cu.findAll(FieldDeclaration.class);
            fileNode.setFieldCount(allFields.size());

            // Extract method calls
            Set<String> methodCallSet = new HashSet<>();
            cu.findAll(MethodCallExpr.class).forEach(call -> 
                methodCallSet.add(call.getNameAsString())
            );
            fileNode.setMethodCalls(new ArrayList<>(methodCallSet));

            // Detect annotations
            boolean usesAnnotations = !cu.findAll(AnnotationExpr.class).isEmpty();
            fileNode.setUsesAnnotations(usesAnnotations);

            // Detect catch blocks
            int catchBlockCount = cu.findAll(CatchClause.class).size();
            fileNode.setCatchBlockCount(catchBlockCount);

            // Detect throw statements
            boolean throwsExceptions = !cu.findAll(ThrowStmt.class).isEmpty();
            // Also check method signatures for throws declarations
            for (MethodDeclaration method : allMethods) {
                if (!method.getThrownExceptions().isEmpty()) {
                    throwsExceptions = true;
                    break;
                }
            }
            fileNode.setThrowsExceptions(throwsExceptions);

            // Detect reflection usage (from imports and method calls)
            fileNode.setUsesReflection(detectPatterns(imports, new ArrayList<>(methodCallSet), content, REFLECTION_PATTERNS));

            // Detect threading usage (from imports and content)
            fileNode.setUsesThreading(detectPatterns(imports, new ArrayList<>(methodCallSet), content, THREADING_PATTERNS));

            // Detect streams usage
            fileNode.setUsesStreams(detectPatterns(imports, new ArrayList<>(methodCallSet), content, STREAM_PATTERNS));

            // Apply DB heuristics
            fileNode.setReadsFromDb(detectDbReads(methodNames, new ArrayList<>(methodCallSet)));
            fileNode.setWritesToDb(detectDbWrites(methodNames, new ArrayList<>(methodCallSet)));

            return fileNode;

        } catch (Exception e) {
            System.err.println("Error extracting AST from file " + filePath + ": " + e.getMessage());
            return null;
        }
    }

    /**
     * Detects if patterns are present in imports, method calls, or raw source content.
     */
    private boolean detectPatterns(List<String> imports, List<String> methodCalls, String content, String[] patterns) {
        for (String pattern : patterns) {
            for (String imp : imports) {
                if (imp.contains(pattern)) return true;
            }
            for (String call : methodCalls) {
                if (call.contains(pattern)) return true;
            }
            if (content.contains(pattern)) return true;
        }
        return false;
    }

    /**
     * Detects if the file likely reads from a database based on method names and calls.
     */
    private boolean detectDbReads(List<String> methodNames, List<String> methodCalls) {
        List<String> allNames = new ArrayList<>();
        allNames.addAll(methodNames);
        allNames.addAll(methodCalls);

        for (String name : allNames) {
            String lowerName = name.toLowerCase();
            for (String keyword : DB_READ_KEYWORDS) {
                if (lowerName.contains(keyword.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detects if the file likely writes to a database based on method names and calls.
     */
    private boolean detectDbWrites(List<String> methodNames, List<String> methodCalls) {
        List<String> allNames = new ArrayList<>();
        allNames.addAll(methodNames);
        allNames.addAll(methodCalls);

        for (String name : allNames) {
            String lowerName = name.toLowerCase();
            for (String keyword : DB_WRITE_KEYWORDS) {
                if (lowerName.contains(keyword.toLowerCase())) {
                    return true;
                }
            }
        }
        return false;
    }
}
