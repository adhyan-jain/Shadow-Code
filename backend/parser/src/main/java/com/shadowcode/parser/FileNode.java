package com.shadowcode.parser;

import java.util.ArrayList;
import java.util.List;

/**
 * Represents a single Java file and its extracted AST information.
 */
public class FileNode {
    private String filePath;
    private String packageName;
    private List<String> imports;
    private List<String> classNames;
    private List<String> methodNames;
    private List<String> methodCalls;
    private boolean readsFromDb;
    private boolean writesToDb;

    public FileNode() {
        this.imports = new ArrayList<>();
        this.classNames = new ArrayList<>();
        this.methodNames = new ArrayList<>();
        this.methodCalls = new ArrayList<>();
        this.readsFromDb = false;
        this.writesToDb = false;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getPackageName() {
        return packageName;
    }

    public void setPackageName(String packageName) {
        this.packageName = packageName;
    }

    public List<String> getImports() {
        return imports;
    }

    public void setImports(List<String> imports) {
        this.imports = imports;
    }

    public List<String> getClassNames() {
        return classNames;
    }

    public void setClassNames(List<String> classNames) {
        this.classNames = classNames;
    }

    public List<String> getMethodNames() {
        return methodNames;
    }

    public void setMethodNames(List<String> methodNames) {
        this.methodNames = methodNames;
    }

    public List<String> getMethodCalls() {
        return methodCalls;
    }

    public void setMethodCalls(List<String> methodCalls) {
        this.methodCalls = methodCalls;
    }

    public boolean isReadsFromDb() {
        return readsFromDb;
    }

    public void setReadsFromDb(boolean readsFromDb) {
        this.readsFromDb = readsFromDb;
    }

    public boolean isWritesToDb() {
        return writesToDb;
    }

    public void setWritesToDb(boolean writesToDb) {
        this.writesToDb = writesToDb;
    }
}
