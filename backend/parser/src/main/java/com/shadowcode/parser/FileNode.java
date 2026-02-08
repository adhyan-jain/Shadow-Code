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

    // --- New metrics ---
    private int lineCount;
    private int methodCount;
    private int classCount;
    private int importCount;
    private int fieldCount;
    private int catchBlockCount;
    private int staticMethodCount;
    private boolean hasInheritance;
    private boolean implementsInterfaces;
    private boolean usesAnnotations;
    private boolean usesReflection;
    private boolean usesThreading;
    private boolean usesStreams;
    private boolean hasInnerClasses;
    private boolean throwsExceptions;
    private boolean usesGenerics;

    public FileNode() {
        this.imports = new ArrayList<>();
        this.classNames = new ArrayList<>();
        this.methodNames = new ArrayList<>();
        this.methodCalls = new ArrayList<>();
        this.readsFromDb = false;
        this.writesToDb = false;
    }

    // --- Original getters/setters ---

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getPackageName() { return packageName; }
    public void setPackageName(String packageName) { this.packageName = packageName; }

    public List<String> getImports() { return imports; }
    public void setImports(List<String> imports) { this.imports = imports; }

    public List<String> getClassNames() { return classNames; }
    public void setClassNames(List<String> classNames) { this.classNames = classNames; }

    public List<String> getMethodNames() { return methodNames; }
    public void setMethodNames(List<String> methodNames) { this.methodNames = methodNames; }

    public List<String> getMethodCalls() { return methodCalls; }
    public void setMethodCalls(List<String> methodCalls) { this.methodCalls = methodCalls; }

    public boolean isReadsFromDb() { return readsFromDb; }
    public void setReadsFromDb(boolean readsFromDb) { this.readsFromDb = readsFromDb; }

    public boolean isWritesToDb() { return writesToDb; }
    public void setWritesToDb(boolean writesToDb) { this.writesToDb = writesToDb; }

    // --- New getters/setters ---

    public int getLineCount() { return lineCount; }
    public void setLineCount(int lineCount) { this.lineCount = lineCount; }

    public int getMethodCount() { return methodCount; }
    public void setMethodCount(int methodCount) { this.methodCount = methodCount; }

    public int getClassCount() { return classCount; }
    public void setClassCount(int classCount) { this.classCount = classCount; }

    public int getImportCount() { return importCount; }
    public void setImportCount(int importCount) { this.importCount = importCount; }

    public int getFieldCount() { return fieldCount; }
    public void setFieldCount(int fieldCount) { this.fieldCount = fieldCount; }

    public int getCatchBlockCount() { return catchBlockCount; }
    public void setCatchBlockCount(int catchBlockCount) { this.catchBlockCount = catchBlockCount; }

    public int getStaticMethodCount() { return staticMethodCount; }
    public void setStaticMethodCount(int staticMethodCount) { this.staticMethodCount = staticMethodCount; }

    public boolean isHasInheritance() { return hasInheritance; }
    public void setHasInheritance(boolean hasInheritance) { this.hasInheritance = hasInheritance; }

    public boolean isImplementsInterfaces() { return implementsInterfaces; }
    public void setImplementsInterfaces(boolean implementsInterfaces) { this.implementsInterfaces = implementsInterfaces; }

    public boolean isUsesAnnotations() { return usesAnnotations; }
    public void setUsesAnnotations(boolean usesAnnotations) { this.usesAnnotations = usesAnnotations; }

    public boolean isUsesReflection() { return usesReflection; }
    public void setUsesReflection(boolean usesReflection) { this.usesReflection = usesReflection; }

    public boolean isUsesThreading() { return usesThreading; }
    public void setUsesThreading(boolean usesThreading) { this.usesThreading = usesThreading; }

    public boolean isUsesStreams() { return usesStreams; }
    public void setUsesStreams(boolean usesStreams) { this.usesStreams = usesStreams; }

    public boolean isHasInnerClasses() { return hasInnerClasses; }
    public void setHasInnerClasses(boolean hasInnerClasses) { this.hasInnerClasses = hasInnerClasses; }

    public boolean isThrowsExceptions() { return throwsExceptions; }
    public void setThrowsExceptions(boolean throwsExceptions) { this.throwsExceptions = throwsExceptions; }

    public boolean isUsesGenerics() { return usesGenerics; }
    public void setUsesGenerics(boolean usesGenerics) { this.usesGenerics = usesGenerics; }
}
