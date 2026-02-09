import os
import requests

BACKBOARD_API_BASE = "https://app.backboard.io/api"


def get_config():
    """Load Backboard credentials from environment variables."""
    api_key = os.environ.get("BACKBOARD_API_KEY")
    thread_id = os.environ.get("BACKBOARD_THREAD_ID")
    assistant_id = os.environ.get("BACKBOARD_ASSISTANT_ID")

    if not api_key or not thread_id or not assistant_id:
        raise ValueError(
            "Missing Backboard credentials. Set BACKBOARD_API_KEY, "
            "BACKBOARD_THREAD_ID, and BACKBOARD_ASSISTANT_ID as env vars."
        )

    return {
        "api_key": api_key,
        "thread_id": thread_id,
        "assistant_id": assistant_id,
    }


def build_constraints(node_analysis):
    """
    Build a list of migration constraints based on the node's metrics.
    These constraints tell ShadowArchitect what the LLM is NOT allowed to do.
    """
    m = node_analysis.get("metrics", {})
    constraints = []

    # DB constraints
    if m.get("readsFromDb"):
        constraints.append("Preserve all database read operations and query semantics")
    if m.get("writesToDb"):
        constraints.append("No DB schema changes — preserve all write operations exactly")

    # Interface / inheritance contracts
    if m.get("hasInheritance"):
        constraints.append("Preserve class hierarchy and inheritance contracts")
    if m.get("implementsInterfaces"):
        constraints.append("Preserve all interface method signatures and contracts")

    # Concurrency
    if m.get("usesThreading"):
        constraints.append("No concurrency refactors — preserve threading model exactly")

    # Reflection
    if m.get("usesReflection"):
        constraints.append("No reflection changes — preserve all reflective access patterns")

    # Method signatures (always)
    constraints.append("Preserve all public method signatures")
    constraints.append("Preserve all return types and parameter types")

    # Exception handling
    if m.get("throwsExceptions") or m.get("catchBlockCount", 0) > 0:
        constraints.append("Preserve exception handling behavior and thrown exception types")

    # Generics
    if m.get("usesGenerics"):
        constraints.append("Preserve generic type parameters and bounds")

    # Streams
    if m.get("usesStreams"):
        constraints.append("Preserve stream pipeline semantics and ordering guarantees")

    # Inner classes
    if m.get("hasInnerClasses"):
        constraints.append("Preserve inner/nested class relationships and access patterns")

    # Annotations
    if m.get("usesAnnotations"):
        constraints.append("Preserve all annotation semantics (framework-specific behavior)")

    return constraints


def build_allowed_operations(node_analysis):
    """
    Determine what operations the LLM is allowed to perform on this node.
    Only GREEN nodes get broad permissions; everything else is restricted.
    """
    classification = node_analysis.get("classification", "RED")
    m = node_analysis.get("metrics", {})

    if classification == "GREEN":
        ops = [
            "Refactor internal logic",
            "Rename private variables",
            "Simplify control flow",
            "Add inline documentation",
            "Extract private helper methods",
        ]
        # Extra permissions for truly simple files
        if m.get("fanIn", 0) == 0 and m.get("fanOut", 0) == 0:
            ops.append("Restructure file layout")
        return ops

    elif classification == "YELLOW":
        return [
            "Add inline documentation only",
            "Minor variable renaming (private scope only)",
            "No structural changes",
        ]
    else:  # RED
        return [
            "Read-only analysis",
            "Documentation suggestions only",
            "No code modifications permitted",
        ]


def build_dependency_context(node_id, graph_data):
    """
    Extract the immediate dependency context for a node:
    what it depends on (fan-out) and what depends on it (fan-in).
    """
    depends_on = []
    depended_by = []

    node_lookup = {n["id"]: n for n in graph_data.get("nodes", [])}

    for edge in graph_data.get("edges", []):
        if edge["from"] == node_id:
            target = node_lookup.get(edge["to"], {})
            depends_on.append(target.get("filePath", edge["to"]))
        if edge["to"] == node_id:
            source = node_lookup.get(edge["from"], {})
            depended_by.append(source.get("filePath", edge["from"]))

    return {
        "dependsOn": depends_on,
        "dependedBy": depended_by,
    }


def build_backboard_message(node_id, node_analysis, graph_data, source_code=None):
    """
    Build the full structured message to send to Backboard's ShadowArchitect.
    """
    m = node_analysis.get("metrics", {})
    dep_ctx = build_dependency_context(node_id, graph_data)
    constraints = build_constraints(node_analysis)
    allowed_ops = build_allowed_operations(node_analysis)

    message_parts = [
        "=== SHADOW-CODE MIGRATION REQUEST ===",
        "",
        f"Node ID: {node_id}",
        f"File: {node_analysis.get('filePath', 'unknown')}",
        f"Language: Java",
        "",
        "── Risk Metrics ──",
        f"  Risk Score: {node_analysis.get('riskScore', 'N/A')}/100",
        f"  Complexity Score: {node_analysis.get('complexityScore', 'N/A')}/100",
        f"  Convertibility Score: {node_analysis.get('convertibilityScore', 'N/A')}/100",
        f"  Blast Radius: {node_analysis.get('blastRadius', {}).get('percentage', 0)}% ({node_analysis.get('blastRadius', {}).get('affectedNodes', 0)}/{node_analysis.get('blastRadius', {}).get('totalNodes', 0)} nodes)",
        "",
        "── Structural Metrics ──",
        f"  Fan-In: {m.get('fanIn', 0)}",
        f"  Fan-Out: {m.get('fanOut', 0)}",
        f"  Line Count: {m.get('lineCount', 0)}",
        f"  Method Count: {m.get('methodCount', 0)}",
        f"  Class Count: {m.get('classCount', 0)}",
        f"  Field Count: {m.get('fieldCount', 0)}",
        f"  Import Count: {m.get('importCount', 0)}",
        f"  In Cycle: {m.get('inCycle', False)}",
        "",
        "── Flags ──",
        f"  Reads DB: {m.get('readsFromDb', False)}",
        f"  Writes DB: {m.get('writesToDb', False)}",
        f"  Uses Reflection: {m.get('usesReflection', False)}",
        f"  Uses Threading: {m.get('usesThreading', False)}",
        f"  Uses Streams: {m.get('usesStreams', False)}",
        f"  Uses Generics: {m.get('usesGenerics', False)}",
        f"  Has Inheritance: {m.get('hasInheritance', False)}",
        f"  Implements Interfaces: {m.get('implementsInterfaces', False)}",
        f"  Has Inner Classes: {m.get('hasInnerClasses', False)}",
        f"  Uses Annotations: {m.get('usesAnnotations', False)}",
        f"  Throws Exceptions: {m.get('throwsExceptions', False)}",
        "",
        "── Dependency Context ──",
        f"  Depends On ({len(dep_ctx['dependsOn'])}): {', '.join(dep_ctx['dependsOn']) if dep_ctx['dependsOn'] else 'None'}",
        f"  Depended By ({len(dep_ctx['dependedBy'])}): {', '.join(dep_ctx['dependedBy']) if dep_ctx['dependedBy'] else 'None'}",
        "",
        "── Constraints (MUST enforce) ──",
    ]

    for i, c in enumerate(constraints, 1):
        message_parts.append(f"  {i}. {c}")

    message_parts.extend([
        "",
        "── Allowed Operations ──",
    ])
    for i, op in enumerate(allowed_ops, 1):
        message_parts.append(f"  {i}. {op}")

    if source_code:
        message_parts.extend([
            "",
            "── Source Code ──",
            source_code[:8000],  # cap at 8k chars to respect token limits
        ])

    message_parts.extend([
        "",
        "=== END OF REQUEST ===",
        "",
        "Analyze this node for migration suitability. Summarize risks, validate constraints, "
        "and provide your FINAL VERDICT: YES or NO for conversion.",
    ])

    return "\n".join(message_parts)


def send_to_backboard(message_content):
    """
    Send a message to Backboard's thread and return the assistant's response.
    Uses form-data as required by the Backboard messages endpoint.
    """
    config = get_config()

    url = f"{BACKBOARD_API_BASE}/threads/{config['thread_id']}/messages"

    headers = {
        "X-API-key": config['api_key'],
    }

    form_data = {
        "content": message_content,
        "stream": "false",
        "memory": "Auto",
        "assistant_id": config["assistant_id"],
    }

    print(f"📡 Sending to Backboard (thread: {config['thread_id'][:8]}...)")

    response = requests.post(url, headers=headers, data=form_data, timeout=120)

    if response.status_code != 200:
        raise RuntimeError(
            f"Backboard API error {response.status_code}: {response.text}"
        )

    result = response.json()
    print(f"✅ Backboard responded")

    return result


def extract_verdict(backboard_response):
    """
    Parse the Backboard response to extract the structured verdict.
    Looks for FINAL VERDICT: YES or NO in the response text.
    """
    # The response structure may vary — try common paths
    text = ""

    if isinstance(backboard_response, dict):
        # Try common response shapes
        text = backboard_response.get("content", "")
        if not text:
            text = backboard_response.get("message", "")
        if not text and "data" in backboard_response:
            data = backboard_response["data"]
            if isinstance(data, dict):
                text = data.get("content", "")
                if not text:
                    # OpenAI-style message content
                    content_parts = data.get("content", [])
                    if isinstance(content_parts, list):
                        text = " ".join(
                            p.get("text", {}).get("value", "")
                            if isinstance(p, dict) else str(p)
                            for p in content_parts
                        )
        if not text:
            # Fallback: stringify the whole response
            text = str(backboard_response)
    elif isinstance(backboard_response, str):
        text = backboard_response

    # Extract verdict
    verdict = "UNKNOWN"
    text_upper = text.upper()
    if "FINAL VERDICT" in text_upper:
        if "FINAL VERDICT: YES" in text_upper or "FINAL VERDICT — YES" in text_upper:
            verdict = "YES"
        elif "FINAL VERDICT: NO" in text_upper or "FINAL VERDICT — NO" in text_upper:
            verdict = "NO"

    return {
        "verdict": verdict,
        "fullResponse": text,
    }
