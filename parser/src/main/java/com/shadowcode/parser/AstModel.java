package com.shadowcode.parser;

import java.util.ArrayList;
import java.util.List;

/**
 * Top-level model containing all parsed file nodes.
 */
public class AstModel {
    private List<FileNode> files;

    public AstModel() {
        this.files = new ArrayList<>();
    }

    public List<FileNode> getFiles() {
        return files;
    }

    public void setFiles(List<FileNode> files) {
        this.files = files;
    }

    public void addFile(FileNode fileNode) {
        this.files.add(fileNode);
    }
}
