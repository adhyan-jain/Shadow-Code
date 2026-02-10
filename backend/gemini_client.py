import os
import json
import time
import google.generativeai as genai
from google.api_core import exceptions as google_exceptions


def get_gemini_config():
    """Load Gemini credentials from environment variables."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError(
            "Missing GEMINI_API_KEY. Set it in your .env file or environment."
        )
    return api_key


# ─── System Prompt ────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are ShadowTranslator — an expert code migration engine that converts Java source code to idiomatic Go.

Your responsibilities:
1. Convert the provided Java file into a single, complete, compilable Go file.
2. Preserve the original system architecture — do NOT restructure the design.
3. Map Java constructs to their idiomatic Go equivalents:
   - Classes → structs with methods (receiver functions)
   - Interfaces → Go interfaces
   - Inheritance → composition (embedded structs)
   - Exceptions → error returns (multiple return values)
   - Generics → Go generics (type parameters) where appropriate
   - Annotations → comments documenting the original annotation semantics
   - Streams / lambdas → loops, slices, or functional helpers as idiomatic in Go
   - Synchronized / threading → goroutines and sync primitives (sync.Mutex, channels) where applicable
   - Getters/setters → exported fields where safe, or getter/setter methods if encapsulation is needed
   - Static methods → package-level functions
   - Inner classes → separate structs in the same package
   - Enums → const iota pattern
   - Nullable references → pointers or (value, ok) patterns

4. Preserve all public method signatures conceptually (same name, equivalent params/return types).
5. Preserve error handling semantics — every catch block must have a corresponding error check.
6. Include proper Go package declaration and imports.
7. Add brief comments for any non-obvious translation decisions.
8. Do NOT add features, refactor logic, or optimize algorithms — translate faithfully.

Constraints you MUST follow:
- Output ONLY the Go source code. No markdown fences, no explanation before or after.
- The output must be a valid, compilable .go file.
- Use standard library packages wherever possible.
- If a Java library has no direct Go equivalent, add a TODO comment with the original import.
- Preserve the original file's logical structure and ordering of methods.
"""


def build_conversion_prompt(source_code, node_analysis, file_path):
    """
    Build the user-facing prompt that includes the Java source,
    file metadata, and migration context.
    """
    m = node_analysis.get("metrics", {})

    context_lines = [
        f"File: {file_path}",
        f"Lines of code: {m.get('lineCount', 'unknown')}",
        f"Methods: {m.get('methodCount', 'unknown')}",
        f"Classes: {m.get('classCount', 'unknown')}",
        f"Classification: {node_analysis.get('classification', 'unknown')}",
        f"Risk Score: {node_analysis.get('riskScore', 'N/A')}/100",
        f"Convertibility Score: {node_analysis.get('convertibilityScore', 'N/A')}/100",
    ]

    flags = []
    if m.get("hasInheritance"):
        flags.append("uses inheritance")
    if m.get("implementsInterfaces"):
        flags.append("implements interfaces")
    if m.get("usesGenerics"):
        flags.append("uses generics")
    if m.get("usesStreams"):
        flags.append("uses Java streams")
    if m.get("usesThreading"):
        flags.append("uses threading/concurrency")
    if m.get("usesReflection"):
        flags.append("uses reflection")
    if m.get("usesAnnotations"):
        flags.append("uses annotations")
    if m.get("hasInnerClasses"):
        flags.append("has inner/nested classes")
    if m.get("throwsExceptions"):
        flags.append("throws exceptions")
    if m.get("readsFromDb"):
        flags.append("reads from database")
    if m.get("writesToDb"):
        flags.append("writes to database")

    if flags:
        context_lines.append(f"Flags: {', '.join(flags)}")

    prompt_parts = [
        "=== FILE CONTEXT ===",
        "\n".join(context_lines),
        "",
        "=== JAVA SOURCE CODE ===",
        source_code,
        "",
        "Convert this Java file to idiomatic Go. Output only the Go source code.",
    ]

    return "\n".join(prompt_parts)


def _strip_code_fences(code, language_tag):
    """Strip markdown code fences if Gemini wraps them despite instructions."""
    code = code.strip()
    if code.startswith(f"```{language_tag}"):
        code = code[3 + len(language_tag):]
    elif code.startswith("```"):
        code = code[3:]
    if code.endswith("```"):
        code = code[:-3]
    return code.strip()


def _call_gemini_with_retry(model, prompt, max_retries=3, initial_delay=2):
    """
    Call Gemini API with exponential backoff retry logic for rate limits.
    
    Args:
        model: Configured GenerativeModel instance
        prompt: Prompt text to send
        max_retries: Maximum number of retry attempts (default: 3)
        initial_delay: Initial delay in seconds before first retry (default: 2)
    
    Returns:
        Response from Gemini API
        
    Raises:
        Exception: If all retries are exhausted or non-retryable error occurs
    """
    delay = initial_delay
    
    for attempt in range(max_retries + 1):
        try:
            response = model.generate_content(prompt)
            return response
            
        except Exception as e:
            error_str = str(e)
            
            # Check if it's a rate limit error (429)
            if "429" in error_str or "Resource exhausted" in error_str or "quota" in error_str.lower():
                if attempt < max_retries:
                    print(f"⏳ Rate limit hit (429). Retrying in {delay}s... (attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                    continue
                else:
                    print(f"❌ Rate limit exhausted after {max_retries} retries")
                    raise Exception(
                        f"Gemini API rate limit exceeded. Free tier allows ~15 requests per minute. "
                        f"Please wait 60 seconds or upgrade to a paid plan. Error: {error_str}"
                    )
            else:
                # Non-retryable error
                raise
    
    raise Exception("Unexpected error in retry logic")


def convert_java_to_go(source_code, node_analysis, file_path):
    """
    Send Java source code to Gemini and get back converted Go code.
    Returns the Go source code as a string.
    """
    api_key = get_gemini_config()
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            max_output_tokens=16384,
        ),
    )

    prompt = build_conversion_prompt(source_code, node_analysis, file_path)

    print(f"🔄 Sending {file_path} to Gemini for Java → Go conversion...")
    response = _call_gemini_with_retry(model, prompt)

    if not response or not response.text:
        raise RuntimeError("Gemini returned an empty response")

    go_code = _strip_code_fences(response.text, "go")
    print(f"✅ Gemini conversion complete ({len(go_code)} chars)")
    return go_code


# ─── Kotlin System Prompt ─────────────────────────────────────

KOTLIN_SYSTEM_PROMPT = """\
You are ShadowTranslator — an expert code migration engine that converts Java source code to idiomatic Kotlin.

Your responsibilities:
1. Convert the provided Java file into a single, complete, compilable Kotlin file.
2. Preserve the original system architecture — do NOT restructure the design.
3. Map Java constructs to their idiomatic Kotlin equivalents:
   - Classes → Kotlin classes (data classes where appropriate)
   - Interfaces → Kotlin interfaces
   - Inheritance → Kotlin inheritance (open classes, override)
   - Exceptions → Kotlin exceptions (try/catch, runCatching where idiomatic)
   - Generics → Kotlin generics with variance (in/out)
   - Annotations → Kotlin annotations
   - Streams / lambdas → Kotlin collection operations (map, filter, fold, etc.)
   - Synchronized / threading → coroutines or synchronized blocks as appropriate
   - Getters/setters → Kotlin properties (val/var with custom accessors if needed)
   - Static methods → companion object functions or top-level functions
   - Inner classes → inner/nested classes in Kotlin
   - Enums → Kotlin enum classes
   - Nullable references → Kotlin null safety (?. / !! / let / elvis)
   - Final variables → val
   - String concatenation → string templates
   - instanceof → is / smart casts
   - Anonymous classes → object expressions or lambdas

4. Preserve all public method signatures conceptually (same name, equivalent params/return types).
5. Preserve error handling semantics.
6. Include proper Kotlin package declaration and imports.
7. Add brief comments for any non-obvious translation decisions.
8. Do NOT add features, refactor logic, or optimize algorithms — translate faithfully.

Constraints you MUST follow:
- Output ONLY the Kotlin source code. No markdown fences, no explanation before or after.
- The output must be a valid, compilable .kt file.
- Use Kotlin stdlib wherever possible.
- If a Java library has no direct Kotlin equivalent, add a TODO comment with the original import.
- Preserve the original file's logical structure and ordering of methods.
"""


def build_kotlin_conversion_prompt(source_code, node_analysis, file_path):
    """
    Build the user-facing prompt for Java → Kotlin conversion.
    """
    m = node_analysis.get("metrics", {})

    context_lines = [
        f"File: {file_path}",
        f"Lines of code: {m.get('lineCount', 'unknown')}",
        f"Methods: {m.get('methodCount', 'unknown')}",
        f"Classes: {m.get('classCount', 'unknown')}",
        f"Classification: {node_analysis.get('classification', 'unknown')}",
        f"Risk Score: {node_analysis.get('riskScore', 'N/A')}/100",
        f"Convertibility Score: {node_analysis.get('convertibilityScore', 'N/A')}/100",
    ]

    flags = []
    if m.get("hasInheritance"):
        flags.append("uses inheritance")
    if m.get("implementsInterfaces"):
        flags.append("implements interfaces")
    if m.get("usesGenerics"):
        flags.append("uses generics")
    if m.get("usesStreams"):
        flags.append("uses Java streams")
    if m.get("usesThreading"):
        flags.append("uses threading/concurrency")
    if m.get("usesReflection"):
        flags.append("uses reflection")
    if m.get("usesAnnotations"):
        flags.append("uses annotations")
    if m.get("hasInnerClasses"):
        flags.append("has inner/nested classes")
    if m.get("throwsExceptions"):
        flags.append("throws exceptions")
    if m.get("readsFromDb"):
        flags.append("reads from database")
    if m.get("writesToDb"):
        flags.append("writes to database")

    if flags:
        context_lines.append(f"Flags: {', '.join(flags)}")

    prompt_parts = [
        "=== FILE CONTEXT ===",
        "\n".join(context_lines),
        "",
        "=== JAVA SOURCE CODE ===",
        source_code,
        "",
        "Convert this Java file to idiomatic Kotlin. Output only the Kotlin source code.",
    ]

    return "\n".join(prompt_parts)


def convert_java_to_kotlin(source_code, node_analysis, file_path):
    """
    Send Java source code to Gemini and get back converted Kotlin code.
    Returns the Kotlin source code as a string.
    """
    api_key = get_gemini_config()
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=KOTLIN_SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            max_output_tokens=16384,
        ),
    )

    prompt = build_kotlin_conversion_prompt(source_code, node_analysis, file_path)

    print(f"🔄 Sending {file_path} to Gemini for Java → Kotlin conversion...")
    response = _call_gemini_with_retry(model, prompt)

    if not response or not response.text:
        raise RuntimeError("Gemini returned an empty response")

    kotlin_code = _strip_code_fences(response.text, "kotlin")
    print(f"✅ Gemini conversion complete ({len(kotlin_code)} chars)")
    return kotlin_code


# ─── TypeScript System Prompt ─────────────────────────────────

TYPESCRIPT_SYSTEM_PROMPT = """\
You are ShadowTranslator — an expert code migration engine that converts Java source code to idiomatic TypeScript.

Your responsibilities:
1. Convert the provided Java file into a single, complete, compilable TypeScript file.
2. Preserve the original system architecture — do NOT restructure the design.
3. Map Java constructs to their idiomatic TypeScript equivalents:
   - Classes → TypeScript classes
   - Interfaces → TypeScript interfaces
   - Inheritance → TypeScript class inheritance (extends / implements)
   - Exceptions → Error subclasses with try/catch
   - Generics → TypeScript generics
   - Annotations → decorators or comments documenting the original annotation semantics
   - Streams / lambdas → Array methods (map, filter, reduce) or generator functions
   - Synchronized / threading → async/await patterns where applicable
   - Getters/setters → TypeScript get/set accessors
   - Static methods → static class methods
   - Inner classes → nested classes or separate classes in the same file
   - Enums → TypeScript enums
   - Nullable references → optional types (? / undefined / null unions)
   - Final variables → const or readonly
   - String concatenation → template literals
   - instanceof → instanceof
   - Anonymous classes → anonymous classes or arrow functions
   - Collections (List, Map, Set) → Array, Map, Set
   - Primitive wrappers (Integer, Boolean, etc.) → number, boolean, etc.

4. Preserve all public method signatures conceptually (same name, equivalent params/return types).
5. Preserve error handling semantics — every catch block must have a corresponding try/catch.
6. Include proper TypeScript imports where needed.
7. Add brief comments for any non-obvious translation decisions.
8. Do NOT add features, refactor logic, or optimize algorithms — translate faithfully.

Constraints you MUST follow:
- Output ONLY the TypeScript source code. No markdown fences, no explanation before or after.
- The output must be a valid, compilable .ts file.
- Use TypeScript strict mode conventions (proper typing, no implicit any).
- If a Java library has no direct TypeScript equivalent, add a TODO comment with the original import.
- Preserve the original file's logical structure and ordering of methods.
"""


def build_typescript_conversion_prompt(source_code, node_analysis, file_path):
    """
    Build the user-facing prompt for Java → TypeScript conversion.
    """
    m = node_analysis.get("metrics", {})

    context_lines = [
        f"File: {file_path}",
        f"Lines of code: {m.get('lineCount', 'unknown')}",
        f"Methods: {m.get('methodCount', 'unknown')}",
        f"Classes: {m.get('classCount', 'unknown')}",
        f"Classification: {node_analysis.get('classification', 'unknown')}",
        f"Risk Score: {node_analysis.get('riskScore', 'N/A')}/100",
        f"Convertibility Score: {node_analysis.get('convertibilityScore', 'N/A')}/100",
    ]

    flags = []
    if m.get("hasInheritance"):
        flags.append("uses inheritance")
    if m.get("implementsInterfaces"):
        flags.append("implements interfaces")
    if m.get("usesGenerics"):
        flags.append("uses generics")
    if m.get("usesStreams"):
        flags.append("uses Java streams")
    if m.get("usesThreading"):
        flags.append("uses threading/concurrency")
    if m.get("usesReflection"):
        flags.append("uses reflection")
    if m.get("usesAnnotations"):
        flags.append("uses annotations")
    if m.get("hasInnerClasses"):
        flags.append("has inner/nested classes")
    if m.get("throwsExceptions"):
        flags.append("throws exceptions")
    if m.get("readsFromDb"):
        flags.append("reads from database")
    if m.get("writesToDb"):
        flags.append("writes to database")

    if flags:
        context_lines.append(f"Flags: {', '.join(flags)}")

    prompt_parts = [
        "=== FILE CONTEXT ===",
        "\n".join(context_lines),
        "",
        "=== JAVA SOURCE CODE ===",
        source_code,
        "",
        "Convert this Java file to idiomatic TypeScript. Output only the TypeScript source code.",
    ]

    return "\n".join(prompt_parts)


def convert_java_to_typescript(source_code, node_analysis, file_path):
    """
    Send Java source code to Gemini and get back converted TypeScript code.
    Returns the TypeScript source code as a string.
    """
    api_key = get_gemini_config()
    genai.configure(api_key=api_key)

    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=TYPESCRIPT_SYSTEM_PROMPT,
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            max_output_tokens=16384,
        ),
    )

    prompt = build_typescript_conversion_prompt(source_code, node_analysis, file_path)

    print(f"🔄 Sending {file_path} to Gemini for Java → TypeScript conversion...")
    response = _call_gemini_with_retry(model, prompt)

    if not response or not response.text:
        raise RuntimeError("Gemini returned an empty response")

    ts_code = _strip_code_fences(response.text, "typescript")
    print(f"✅ Gemini conversion complete ({len(ts_code)} chars)")
    return ts_code
