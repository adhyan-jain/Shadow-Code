package com.shadowcode.parser;

import com.github.javaparser.JavaParser;
import com.github.javaparser.ParseResult;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.MethodCallExpr;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Extracts AST information from Java source files using JavaParser.
 * Applies heuristics to detect database read/write operations.
 */
public class AstExtractor {

    private static final String[] DB_WRITE_KEYWORDS = {"save", "update", "delete", "insert", "persist", "create", "remove"};
    private static final String[] DB_READ_KEYWORDS = {"find", "get", "select", "query", "fetch", "read", "load", "retrieve"};

    private final JavaParser javaParser;

    public AstExtractor() {
        this.javaParser = new JavaParser();
    }

    /**
     * Parses a Java file and extracts structural information into a FileNode.
     * Returns null if parsing fails.
     * 
     * @param filePath the path to the Java file
     * @return a FileNode with extracted information, or null if parsing fails
     */
    public FileNode extractFromFile(Path filePath) {
        try {
            String content = Files.readString(filePath);
            ParseResult<CompilationUnit> parseResult = javaParser.parse(content);

            if (!parseResult.isSuccessful() || !parseResult.getResult().isPresent()) {
                System.err.println("Failed to parse file: " + filePath);
                return null;
            }

            CompilationUnit cu = parseResult.getResult().get();
            FileNode fileNode = new FileNode();
            
            fileNode.setFilePath(filePath.toString());
            
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

            // Extract class names
            List<String> classNames = new ArrayList<>();
            cu.findAll(ClassOrInterfaceDeclaration.class).forEach(cls -> 
                classNames.add(cls.getNameAsString())
            );
            fileNode.setClassNames(classNames);

            // Extract method names (qualified with class name)
            List<String> methodNames = new ArrayList<>();
            cu.findAll(MethodDeclaration.class).forEach(method -> {
                String className = method.findAncestor(ClassOrInterfaceDeclaration.class)
                        .map(ClassOrInterfaceDeclaration::getNameAsString)
                        .orElse("Unknown");
                methodNames.add(className + "." + method.getNameAsString());
            });
            fileNode.setMethodNames(methodNames);

            // Extract method calls
            Set<String> methodCallSet = new HashSet<>();
            cu.findAll(MethodCallExpr.class).forEach(call -> 
                methodCallSet.add(call.getNameAsString())
            );
            fileNode.setMethodCalls(new ArrayList<>(methodCallSet));

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
     * Detects if the file likely reads from a database based on method names and calls.
     * 
     * @param methodNames list of method names in the file
     * @param methodCalls list of method calls in the file
     * @return true if DB read patterns are detected
     */
    private boolean detectDbReads(List<String> methodNames, List<String> methodCalls) {
        List<String> allNames = new ArrayList<>();
        allNames.addAll(methodNames);
        allNames.addAll(methodCalls);

        for (String name : allNames) {
            String lowerName = name.toLowerCase();
            for (String keyword : DB_READ_KEYWORDS) {
                if (lowerName.contains(keyword)) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Detects if the file likely writes to a database based on method names and calls.
     * 
     * @param methodNames list of method names in the file
     * @param methodCalls list of method calls in the file
     * @return true if DB write patterns are detected
     */
    private boolean detectDbWrites(List<String> methodNames, List<String> methodCalls) {
        List<String> allNames = new ArrayList<>();
        allNames.addAll(methodNames);
        allNames.addAll(methodCalls);

        for (String name : allNames) {
            String lowerName = name.toLowerCase();
            for (String keyword : DB_WRITE_KEYWORDS) {
                if (lowerName.contains(keyword)) {
                    return true;
                }
            }
        }
        return false;
    }
}
