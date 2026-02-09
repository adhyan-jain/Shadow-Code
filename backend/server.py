from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import subprocess
import sys
import shutil
import stat
import uuid

from backboard_client import (
    build_backboard_message,
    send_to_backboard,
    extract_verdict,
)
from gemini_client import convert_java_to_go, convert_java_to_kotlin
from datetime import datetime, timezone

# Load .env file if present
from dotenv import load_dotenv
load_dotenv()

# ─── Credit-Safe Mode ────────────────────────────────────────
# When True, all external API calls (Gemini, Backboard) are skipped
# and replaced with deterministic placeholder responses.
# Set to False when you have API credits and want real conversions.
NO_CREDITS_MODE = True

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPOS_DIR = os.path.join(BASE_DIR, 'repos')
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
PARSER_JAR = os.path.join(BASE_DIR, 'parser', 'target', 'parser.jar')
AST_OUTPUT = BASE_DIR  # parser writes ast.json here


def remove_readonly(func, path, excinfo):
    """Error handler for shutil.rmtree to handle read-only files on Windows."""
    os.chmod(path, stat.S_IWRITE)
    func(path)
# ─── Placeholder Generators (NO_CREDITS_MODE) ────────────────

def _placeholder_go(source_code, file_path):
    """Return a realistic placeholder Go file when credits are disabled."""
    class_name = os.path.basename(file_path).replace('.java', '')
    return (
        f"package main\n\n"
        f"// AUTO-GENERATED PLACEHOLDER (credit-safe mode)\n"
        f"// Original: {file_path}\n\n"
        f"import (\n\t\"fmt\"\n)\n\n"
        f"// {class_name} is the Go equivalent of the Java class.\n"
        f"type {class_name} struct {{\n"
        f"\t// TODO: translate fields from Java source\n"
        f"}}\n\n"
        f"func (s *{class_name}) String() string {{\n"
        f"\treturn fmt.Sprintf(\"{class_name}{{}}\", s)\n"
        f"}}\n"
    )


def _placeholder_kotlin(source_code, file_path):
    """Return a realistic placeholder Kotlin file when credits are disabled."""
    class_name = os.path.basename(file_path).replace('.java', '')
    return (
        f"// AUTO-GENERATED PLACEHOLDER (credit-safe mode)\n"
        f"// Original: {file_path}\n\n"
        f"/**\n * {class_name} — Kotlin equivalent of the Java class.\n */\n"
        f"class {class_name} {{\n"
        f"    // TODO: translate fields and methods from Java source\n\n"
        f"    override fun toString(): String = \"{class_name}()\"\n"
        f"}}\n"
    )


def _placeholder_backboard_verdict(node_id, node_analysis):
    """Return a deterministic Backboard verdict when credits are disabled."""
    classification = node_analysis.get('classification', 'UNKNOWN')
    risk = node_analysis.get('riskScore', 50)
    if classification == 'GREEN' and risk < 40:
        verdict = 'YES'
        reasoning = (
            f'[CREDIT-SAFE MODE] Node {node_id} is classified GREEN with risk score {risk}/100. '
            f'Low complexity and minimal dependencies suggest safe conversion.'
        )
    elif classification == 'RED' or risk >= 70:
        verdict = 'NO'
        reasoning = (
            f'[CREDIT-SAFE MODE] Node {node_id} is classified {classification} with risk score {risk}/100. '
            f'High risk — manual review strongly recommended before conversion.'
        )
    else:
        verdict = 'MAYBE'
        reasoning = (
            f'[CREDIT-SAFE MODE] Node {node_id} is classified {classification} with risk score {risk}/100. '
            f'Moderate risk — review dependencies and test coverage before proceeding.'
        )
    return verdict, reasoning


# ─── Conversion Tracking ─────────────────────────────────────

def _get_project_id_from_analysis():
    """Derive a project identifier from the stored analysis data."""
    analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
    if not os.path.exists(analysis_path):
        return 'unknown'
    try:
        with open(analysis_path, 'r') as f:
            analysis = json.load(f)
        # Grab any filePath and extract the repo directory name
        for v in analysis.values():
            fp = v.get('filePath', '')
            if '/repos/' in fp:
                parts = fp.split('/repos/')
                if len(parts) > 1:
                    return parts[1].split('/')[0]
        return 'unknown'
    except Exception:
        return 'unknown'


def _record_conversion(node_id, original_file, converted_filename, target_language, converted_code):
    """Append a conversion record to the project's conversion registry."""
    project_id = _get_project_id_from_analysis()
    registry_path = os.path.join(STORAGE_DIR, f'{project_id}_conversions.json')

    records = []
    if os.path.exists(registry_path):
        try:
            with open(registry_path, 'r') as f:
                records = json.load(f)
        except Exception:
            records = []

    records.append({
        'node_id': node_id,
        'original_file': original_file,
        'converted_file': converted_filename,
        'target_language': target_language,
        'converted_at': datetime.now(timezone.utc).isoformat(),
        'converted_code': converted_code,
    })

    with open(registry_path, 'w') as f:
        json.dump(records, f, indent=2)

    print(f'📝 Recorded conversion: {original_file} → {converted_filename} ({target_language})')


def clone_repo(repo_url):
    """Clone a git repository into repos/ and return the path."""
    os.makedirs(REPOS_DIR, exist_ok=True)

    # Clean previous clones
    for item in os.listdir(REPOS_DIR):
        item_path = os.path.join(REPOS_DIR, item)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path, onerror=remove_readonly)

    repo_name = repo_url.rstrip('/').split('/')[-1].replace('.git', '')
    clone_path = os.path.join(REPOS_DIR, repo_name)

    print(f'📥 Cloning {repo_url} ...')
    result = subprocess.run(
        ['git', 'clone', '--depth', '1', repo_url, clone_path],
        capture_output=True, text=True, check=True
    )
    print(f'✅ Cloned into {clone_path}')
    return clone_path


def run_parser(repo_path):
    """Run the Java parser JAR on the cloned repo to produce ast.json."""
    if not os.path.exists(PARSER_JAR):
        raise FileNotFoundError(f'Parser JAR not found at {PARSER_JAR}. Run: cd parser && mvn clean package')

    print(f'🔍 Running Java parser on {repo_path} ...')
    result = subprocess.run(
        ['java', '-jar', PARSER_JAR, repo_path, AST_OUTPUT],
        capture_output=True, text=True, check=True
    )
    print(result.stdout)

    ast_path = os.path.join(AST_OUTPUT, 'ast.json')
    if not os.path.exists(ast_path):
        raise FileNotFoundError('Parser did not produce ast.json')

    print('✅ ast.json generated')
    return ast_path


def run_analysis_pipeline():
    """Run graph_builder.py and risk_analyzer.py to produce JSON files."""
    os.makedirs(STORAGE_DIR, exist_ok=True)

    print('📊 Running graph_builder.py ...')
    result = subprocess.run(
        [sys.executable, os.path.join(BASE_DIR, 'graph_builder.py')],
        capture_output=True, text=True, check=True
    )
    print(result.stdout)

    print('📈 Running risk_analyzer.py ...')
    result = subprocess.run(
        [sys.executable, os.path.join(BASE_DIR, 'risk_analyzer.py')],
        capture_output=True, text=True, check=True
    )
    print(result.stdout)

    print('✅ Analysis pipeline complete')

def get_green_nodes(analysis):
    return {
        k: v for k, v in analysis.items()
        if v["classification"] == "GREEN"
    }


# ─── Endpoints ────────────────────────────────────────────────

@app.route('/api/analyze', methods=['POST'])
def analyze_repo():
    """
    Full pipeline: clone repo → parse AST → build graph → risk analysis.
    Expects JSON body: { "repoUrl": "https://github.com/user/repo.git" }
    """
    data = request.get_json()
    if not data or 'repoUrl' not in data:
        return jsonify({'error': 'Missing repoUrl in request body'}), 400

    repo_url = data['repoUrl'].strip()
    if not repo_url:
        return jsonify({'error': 'repoUrl cannot be empty'}), 400

    try:
        # Step 1: Clone
        repo_path = clone_repo(repo_url)

        # Step 2: Parse
        run_parser(repo_path)

        # Step 3: Build graph + risk analysis
        run_analysis_pipeline()

        # Load results to return
        with open(os.path.join(STORAGE_DIR, 'graph.json'), 'r') as f:
            graph = json.load(f)
        with open(os.path.join(STORAGE_DIR, 'analysis.json'), 'r') as f:
            analysis = json.load(f)
        with open(os.path.join(STORAGE_DIR, 'metrics.json'), 'r') as f:
            metrics = json.load(f)

        return jsonify({
            'success': True,
            'graph': graph,
            'analysis': analysis,
            'metrics': metrics
        })

    except subprocess.CalledProcessError as e:
        print(f'❌ Pipeline error: {e}')
        print(f'   stderr: {e.stderr}')
        return jsonify({
            'error': 'Pipeline failed',
            'details': e.stderr or str(e)
        }), 500
    except FileNotFoundError as e:
        print(f'❌ {e}')
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f'❌ Unexpected error: {e}')
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Returns the dependency graph (nodes and edges)"""
    try:
        graph_path = os.path.join(STORAGE_DIR, 'graph.json')
        
        if not os.path.exists(graph_path):
            return jsonify({'error': 'Graph data not found. Analyze a repo first.'}), 404
        
        with open(graph_path, 'r') as f:
            graph = json.load(f)
        
        return jsonify(graph)
    except Exception as e:
        print(f"Error reading graph: {e}")
        return jsonify({'error': 'Failed to read graph data'}), 500

@app.route('/api/analysis', methods=['GET'])
def get_analysis():
    """Returns the risk analysis data"""
    try:
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
        
        if not os.path.exists(analysis_path):
            return jsonify({'error': 'Analysis data not found. Analyze a repo first.'}), 404
        
        with open(analysis_path, 'r') as f:
            analysis = json.load(f)
        
        return jsonify(analysis)
    except Exception as e:
        print(f"Error reading analysis: {e}")
        return jsonify({'error': 'Failed to read analysis data'}), 500

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Returns the metrics data"""
    try:
        metrics_path = os.path.join(STORAGE_DIR, 'metrics.json')
        
        if not os.path.exists(metrics_path):
            return jsonify({'error': 'Metrics data not found. Analyze a repo first.'}), 404
        
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
        
        return jsonify(metrics)
    except Exception as e:
        print(f"Error reading metrics: {e}")
        return jsonify({'error': 'Failed to read metrics data'}), 500
    
@app.route('/api/convert', methods=['GET'])
def get_green():
    """Returns the green risk data"""
    try:
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
        
        if not os.path.exists(analysis_path):
            return jsonify({'error': 'analysis data not found. Analyze a repo first.'}), 404
        
        with open(analysis_path, 'r') as f:
            analysis = json.load(f)
        
        return jsonify(get_green_nodes(analysis))
    except Exception as e:
        print(f"Error reading greens: {e}")
        return jsonify({'error': 'Failed to read greens data'}), 500


@app.route('/api/migrate', methods=['POST'])
def migrate_node():
    """
    Send a node to Backboard's ShadowArchitect for migration verdict.
    In NO_CREDITS_MODE, returns a local placeholder verdict instead.
    Expects JSON body: { "nodeId": "file_0" }
    Optionally include source code with: { "nodeId": "file_0", "includeSource": true }
    """
    data = request.get_json()
    if not data or 'nodeId' not in data:
        return jsonify({'error': 'Missing nodeId in request body'}), 400

    node_id = data['nodeId']
    include_source = data.get('includeSource', False)

    try:
        # Load analysis and graph
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
        graph_path = os.path.join(STORAGE_DIR, 'graph.json')

        if not os.path.exists(analysis_path) or not os.path.exists(graph_path):
            return jsonify({'error': 'Analysis data not found. Run /api/analyze first.'}), 404

        with open(analysis_path, 'r') as f:
            analysis = json.load(f)
        with open(graph_path, 'r') as f:
            graph = json.load(f)

        if node_id not in analysis:
            return jsonify({'error': f'Node {node_id} not found in analysis'}), 404

        node_analysis = analysis[node_id]

        if NO_CREDITS_MODE:
            # Credit-safe: generate local verdict without calling Backboard
            print(f'💳 [CREDIT-SAFE] Generating local verdict for node {node_id}')
            verdict, reasoning = _placeholder_backboard_verdict(node_id, node_analysis)
            return jsonify({
                'success': True,
                'nodeId': node_id,
                'filePath': node_analysis.get('filePath', ''),
                'classification': node_analysis.get('classification', ''),
                'verdict': verdict,
                'response': reasoning,
                'riskScore': node_analysis.get('riskScore', 0),
                'convertibilityScore': node_analysis.get('convertibilityScore', 0),
            })

        # Optionally read source code from cloned repo
        source_code = None
        if include_source:
            file_path = node_analysis.get('filePath', '')
            if file_path and os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        source_code = f.read()
                except Exception:
                    source_code = None

        # Build the structured message
        message = build_backboard_message(node_id, node_analysis, graph, source_code)

        # Send to Backboard
        print(f'🤖 Sending node {node_id} ({node_analysis.get("filePath", "")}) to Backboard...')
        raw_response = send_to_backboard(message)

        # Parse verdict
        parsed = extract_verdict(raw_response)

        return jsonify({
            'success': True,
            'nodeId': node_id,
            'filePath': node_analysis.get('filePath', ''),
            'classification': node_analysis.get('classification', ''),
            'verdict': parsed['verdict'],
            'response': parsed['fullResponse'],
            'riskScore': node_analysis.get('riskScore', 0),
            'convertibilityScore': node_analysis.get('convertibilityScore', 0),
        })

    except ValueError as e:
        print(f'❌ Config error: {e}')
        return jsonify({'error': str(e)}), 500
    except RuntimeError as e:
        print(f'❌ Backboard API error: {e}')
        return jsonify({'error': f'Backboard API error: {str(e)}'}), 502
    except Exception as e:
        print(f'❌ Migration error: {e}')
        return jsonify({'error': f'Migration failed: {str(e)}'}), 500


@app.route('/api/migrate/batch', methods=['POST'])
def migrate_batch():
    """
    Send all GREEN nodes to Backboard for migration verdicts.
    In NO_CREDITS_MODE, returns local placeholder verdicts.
    No body required — uses stored analysis data.
    """
    try:
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
        graph_path = os.path.join(STORAGE_DIR, 'graph.json')

        if not os.path.exists(analysis_path) or not os.path.exists(graph_path):
            return jsonify({'error': 'Analysis data not found. Run /api/analyze first.'}), 404

        with open(analysis_path, 'r') as f:
            analysis = json.load(f)
        with open(graph_path, 'r') as f:
            graph = json.load(f)

        green_nodes = get_green_nodes(analysis)

        if not green_nodes:
            return jsonify({
                'success': True,
                'message': 'No GREEN nodes found for migration',
                'results': []
            })

        results = []
        for node_id, node_analysis in green_nodes.items():
            try:
                if NO_CREDITS_MODE:
                    print(f'💳 [CREDIT-SAFE] [{node_id}] Generating local verdict...')
                    verdict, reasoning = _placeholder_backboard_verdict(node_id, node_analysis)
                    results.append({
                        'nodeId': node_id,
                        'filePath': node_analysis.get('filePath', ''),
                        'verdict': verdict,
                        'response': reasoning,
                    })
                else:
                    message = build_backboard_message(node_id, node_analysis, graph)
                    print(f'🤖 [{node_id}] Sending to Backboard...')
                    raw_response = send_to_backboard(message)
                    parsed = extract_verdict(raw_response)
                    results.append({
                        'nodeId': node_id,
                        'filePath': node_analysis.get('filePath', ''),
                        'verdict': parsed['verdict'],
                        'response': parsed['fullResponse'],
                    })
            except Exception as e:
                results.append({
                    'nodeId': node_id,
                    'filePath': node_analysis.get('filePath', ''),
                    'verdict': 'ERROR',
                    'response': str(e),
                })

        return jsonify({
            'success': True,
            'total': len(green_nodes),
            'results': results,
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': f'Batch migration failed: {str(e)}'}), 500


@app.route('/api/convert-code', methods=['POST'])
def convert_code():
    """
    Convert a Java file to Go or Kotlin using Gemini.
    Expects JSON body: { "nodeId": "file_0", "targetLanguage": "go" | "kotlin" }
    """
    data = request.get_json()
    if not data or 'nodeId' not in data:
        return jsonify({'error': 'Missing nodeId in request body'}), 400

    node_id = data['nodeId']
    target_language = data.get('targetLanguage', 'go').lower().strip()

    if target_language not in ('go', 'kotlin'):
        return jsonify({'error': f'Unsupported target language: {target_language}. Use "go" or "kotlin".'}), 400

    try:
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')
        if not os.path.exists(analysis_path):
            return jsonify({'error': 'Analysis data not found. Run /api/analyze first.'}), 404

        with open(analysis_path, 'r') as f:
            analysis = json.load(f)

        if node_id not in analysis:
            return jsonify({'error': f'Node {node_id} not found in analysis'}), 404

        node_analysis = analysis[node_id]
        file_path = node_analysis.get('filePath', '')

        if not file_path or not os.path.exists(file_path):
            return jsonify({'error': f'Source file not found: {file_path}'}), 404

        with open(file_path, 'r') as f:
            source_code = f.read()

        if not source_code.strip():
            return jsonify({'error': 'Source file is empty'}), 400

        # Determine output filename
        original_name = os.path.basename(file_path)
        if target_language == 'kotlin':
            out_filename = original_name.replace('.java', '.kt')
            lang_label = 'Kotlin'
        else:
            out_filename = original_name.replace('.java', '.go').lower()
            lang_label = 'Go'

        # Convert (or placeholder in credit-safe mode)
        if NO_CREDITS_MODE:
            print(f'💳 [CREDIT-SAFE] Generating placeholder {lang_label} for {file_path}')
            if target_language == 'kotlin':
                converted_code = _placeholder_kotlin(source_code, file_path)
            else:
                converted_code = _placeholder_go(source_code, file_path)
        else:
            print(f'🔄 Converting {file_path} (node {node_id}) Java → {lang_label} via Gemini...')
            if target_language == 'kotlin':
                converted_code = convert_java_to_kotlin(source_code, node_analysis, file_path)
            else:
                converted_code = convert_java_to_go(source_code, node_analysis, file_path)

        # Record the conversion
        _record_conversion(node_id, file_path, out_filename, lang_label, converted_code)

        return jsonify({
            'success': True,
            'nodeId': node_id,
            'originalFile': file_path,
            'goFilename': out_filename,
            'goCode': converted_code,
            'javaSource': source_code,
            'targetLanguage': lang_label,
        })

    except ValueError as e:
        print(f'❌ Config error: {e}')
        return jsonify({'error': str(e)}), 500
    except RuntimeError as e:
        print(f'❌ Gemini API error: {e}')
        return jsonify({'error': f'Gemini API error: {str(e)}'}), 502
    except Exception as e:
        print(f'❌ Conversion error: {e}')
        return jsonify({'error': f'Conversion failed: {str(e)}'}), 500


@app.route('/api/project/<project_id>/converted-files', methods=['GET'])
def get_converted_files(project_id):
    """
    Returns the list of files that have been converted for a given project.
    """
    try:
        registry_path = os.path.join(STORAGE_DIR, f'{project_id}_conversions.json')

        if not os.path.exists(registry_path):
            return jsonify({
                'success': True,
                'projectId': project_id,
                'conversions': [],
                'total': 0,
            })

        with open(registry_path, 'r') as f:
            records = json.load(f)

        return jsonify({
            'success': True,
            'projectId': project_id,
            'conversions': records,
            'total': len(records),
        })

    except Exception as e:
        print(f'❌ Error reading conversions: {e}')
        return jsonify({'error': f'Failed to read conversion records: {str(e)}'}), 500


@app.route('/api/file-content', methods=['GET'])
def get_file_content():
    """
    Returns the content of a source file.
    Only serves files under the REPOS_DIR directory for security.
    Query param: ?path=<absolute-path-to-file>
    """
    file_path = request.args.get('path', '')
    if not file_path:
        return jsonify({'error': 'Missing path query parameter'}), 400

    # Security: only serve files from the repos directory
    abs_path = os.path.abspath(file_path)
    abs_repos = os.path.abspath(REPOS_DIR)
    if not abs_path.startswith(abs_repos):
        return jsonify({'error': 'Access denied: path outside repos directory'}), 403

    if not os.path.exists(abs_path):
        return jsonify({'error': f'File not found: {file_path}'}), 404

    try:
        with open(abs_path, 'r') as f:
            content = f.read()
        return content, 200, {'Content-Type': 'text/plain; charset=utf-8'}
    except Exception as e:
        return jsonify({'error': f'Failed to read file: {str(e)}'}), 500


# Workflow view: fan-in subgraph (no external intelligence)
@app.route('/api/workflow/<node_id>', methods=['GET'])
def get_workflow(node_id):
    """
    Returns all files that need to be converted before converting the given node.
    Performs a forward traversal following dependency edges (from -> to) to collect
    all nodes that the selected node depends on (directly and transitively).
    This shows the complete "fan-in" - all prerequisite files for conversion.
    No external APIs are used.
    """
    try:
        graph_path = os.path.join(STORAGE_DIR, 'graph.json')
        analysis_path = os.path.join(STORAGE_DIR, 'analysis.json')

        if not os.path.exists(graph_path):
            return jsonify({'error': 'Graph data not found. Analyze a repo first.'}), 404

        with open(graph_path, 'r') as f:
            graph = json.load(f)

        # Build forward adjacency list: for each node, which nodes it depends on
        # Edge from A -> B means "A depends on B"
        # To convert A, we first need B (and all of B's dependencies)
        # So fan-in of A = all nodes that A depends on transitively
        forward_adj = {}
        for edge in graph.get('edges', []):
            source = edge['from']  # The node that depends on something
            target = edge['to']    # The dependency (what source needs)
            if source not in forward_adj:
                forward_adj[source] = []
            forward_adj[source].append(target)

        # BFS to collect all dependencies (nodes that need to be converted first)
        visited = set()
        queue = [node_id]
        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            # Add all nodes that current depends on
            for dependency in forward_adj.get(current, []):
                if dependency not in visited:
                    queue.append(dependency)

        # Filter nodes and edges
        all_node_ids = set(n['id'] for n in graph['nodes'])
        # Only keep visited nodes that actually exist in the graph
        visited = visited & all_node_ids

        if node_id not in all_node_ids:
            return jsonify({'error': f'Node {node_id} not found in graph'}), 404

        subgraph_nodes = [n for n in graph['nodes'] if n['id'] in visited]
        subgraph_edges = [
            e for e in graph['edges']
            if e['from'] in visited and e['to'] in visited
        ]

        # Load analysis data if available
        analysis_data = {}
        if os.path.exists(analysis_path):
            with open(analysis_path, 'r') as f:
                analysis_data = json.load(f)

        # Filter analysis to only include subgraph nodes
        subgraph_analysis = {
            k: v for k, v in analysis_data.items() if k in visited
        }

        return jsonify({
            'nodes': subgraph_nodes,
            'edges': subgraph_edges,
            'analysis': subgraph_analysis,
            'metadata': {
                'root_node': node_id,
                'total_nodes': len(subgraph_nodes),
                'total_edges': len(subgraph_edges),
            }
        })

    except Exception as e:
        print(f'❌ Error building workflow subgraph: {e}')
        return jsonify({'error': f'Failed to build workflow: {str(e)}'}), 500


if __name__ == '__main__':
    os.makedirs(REPOS_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)

    # Credit-safe mode status
    if NO_CREDITS_MODE:
        print('💳 ══════════════════════════════════════════════════')
        print('💳  CREDIT-SAFE MODE is ON')
        print('💳  All Gemini & Backboard calls are bypassed.')
        print('💳  Placeholder responses will be returned.')
        print('💳  Set NO_CREDITS_MODE = False for real API calls.')
        print('💳 ══════════════════════════════════════════════════')

    # Check Backboard config
    bb_configured = all([
        os.environ.get('BACKBOARD_API_KEY'),
        os.environ.get('BACKBOARD_THREAD_ID'),
        os.environ.get('BACKBOARD_ASSISTANT_ID'),
    ])

    print('🚀 Shadow-Code Backend running on http://localhost:3001')
    print('📡 POST /api/analyze                        — { "repoUrl": "..." }')
    print('📊 GET  /api/graph')
    print('📈 GET  /api/analysis')
    print('📋 GET  /api/metrics')
    print('🟢 GET  /api/convert                        — GREEN nodes only')
    print('🤖 POST /api/migrate                        — { "nodeId": "..." }')
    print('🤖 POST /api/migrate/batch                  — All GREEN nodes')
    print('🔄 POST /api/convert-code                   — { "nodeId": "...", "targetLanguage": "go"|"kotlin" }')
    print('📂 GET  /api/project/<id>/converted-files   — Conversion registry')
    print('📄 GET  /api/file-content?path=...           — Source file content')
    print('🔀 GET  /api/workflow/<node_id>              — Fan-in subgraph')
    print(f'🔑 Backboard: {"✅ configured" if bb_configured else "❌ NOT configured (set env vars)"}')

    gemini_configured = bool(os.environ.get('GEMINI_API_KEY'))
    print(f'🔑 Gemini: {"✅ configured" if gemini_configured else "❌ NOT configured (set GEMINI_API_KEY)"}')

    app.run(host='0.0.0.0', port=3001, debug=True)
