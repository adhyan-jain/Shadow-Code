package com.shadowcode.parser;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * CLI entry point for the Shadow-Code Java parser.
 * Usage: java -jar parser.jar <repoPath> <outputPath>
 */
public class ParserMain {

    public static void main(String[] args) {
        if (args.length != 2) {
            System.err.println("Usage: java -jar parser.jar <repoPath> <outputPath>");
            System.exit(1);
        }

        String repoPath = args[0];
        String outputPath = args[1];

        System.out.println("Shadow-Code Java Parser");
        System.out.println("=======================");
        System.out.println("Repository: " + repoPath);
        System.out.println("Output: " + outputPath);
        System.out.println();

        // Find all Java files
        FileWalker fileWalker = new FileWalker();
        List<Path> javaFiles = fileWalker.findJavaFiles(repoPath);
        
        System.out.println("Found " + javaFiles.size() + " Java files");
        
        if (javaFiles.isEmpty()) {
            System.out.println("No Java files found. Exiting.");
            System.exit(0);
        }

        // Parse each file and extract AST information
        AstExtractor astExtractor = new AstExtractor();
        AstModel astModel = new AstModel();
        
        int successCount = 0;
        int failureCount = 0;

        for (Path javaFile : javaFiles) {
            System.out.println("Parsing: " + javaFile);
            FileNode fileNode = astExtractor.extractFromFile(javaFile);
            
            if (fileNode != null) {
                astModel.addFile(fileNode);
                successCount++;
            } else {
                failureCount++;
            }
        }

        System.out.println();
        System.out.println("Parsing complete:");
        System.out.println("  Success: " + successCount);
        System.out.println("  Failed: " + failureCount);
        System.out.println();

        // Write JSON output
        try {
            writeJsonOutput(astModel, outputPath);
            System.out.println("AST data written to: " + outputPath);
        } catch (IOException e) {
            System.err.println("Error writing output file: " + e.getMessage());
            System.exit(1);
        }

        System.out.println("Done!");
    }

    /**
     * Writes the AST model to a JSON file with pretty printing.
     * 
     * @param astModel the model to serialize
     * @param outputPath the path where the JSON file should be written
     * @throws IOException if writing fails
     */
    private static void writeJsonOutput(AstModel astModel, String outputPath) throws IOException {
        Gson gson = new GsonBuilder()
                .setPrettyPrinting()
                .create();

        Path fullPath = Paths.get(outputPath, "ast.json");
        
        try (FileWriter writer = new FileWriter(fullPath.toFile())) {
            gson.toJson(astModel, writer);
        }
    }
}
