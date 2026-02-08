package com.shadowcode.parser;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Recursively walks a directory tree to find all .java files.
 * Ignores common build directories and version control folders.
 */
public class FileWalker {
    
    private static final String[] IGNORED_DIRECTORIES = {"target", "build", ".git", ".idea", "out"};

    /**
     * Finds all .java files in the given repository path.
     * 
     * @param repoPath the root path of the repository to scan
     * @return a list of Path objects pointing to .java files
     */
    public List<Path> findJavaFiles(String repoPath) {
        List<Path> javaFiles = new ArrayList<>();
        Path rootPath = Paths.get(repoPath);

        if (!Files.exists(rootPath)) {
            System.err.println("Error: Repository path does not exist: " + repoPath);
            return javaFiles;
        }

        if (!Files.isDirectory(rootPath)) {
            System.err.println("Error: Repository path is not a directory: " + repoPath);
            return javaFiles;
        }

        try (Stream<Path> pathStream = Files.walk(rootPath)) {
            javaFiles = pathStream
                    .filter(Files::isRegularFile)
                    .filter(path -> path.toString().endsWith(".java"))
                    .filter(this::isNotInIgnoredDirectory)
                    .collect(Collectors.toList());
        } catch (IOException e) {
            System.err.println("Error walking directory tree: " + e.getMessage());
        }

        return javaFiles;
    }

    /**
     * Checks if a path is not within any of the ignored directories.
     * 
     * @param path the path to check
     * @return true if the path is not in an ignored directory
     */
    private boolean isNotInIgnoredDirectory(Path path) {
        String pathString = path.toString();
        for (String ignoredDir : IGNORED_DIRECTORIES) {
            if (pathString.contains("/" + ignoredDir + "/") || 
                pathString.contains("\\" + ignoredDir + "\\")) {
                return false;
            }
        }
        return true;
    }
}
