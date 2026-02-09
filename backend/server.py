from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import subprocess
import sys
import shutil
import uuid

from backboard_client import (
    build_backboard_message,
    send_to_backboard,
    extract_verdict,
)
from gemini_client import convert_java_to_go

# Load .env file if present
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REPOS_DIR = os.path.join(BASE_DIR, 'repos')
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')
PARSER_JAR = os.path.join(BASE_DIR, 'parser', 'target', 'parser.jar')
AST_OUTPUT = BASE_DIR  # parser writes ast.json here


def clone_repo(repo_url):
    """Clone a git repository into repos/ and return the path."""
    os.makedirs(REPOS_DIR, exist_ok=True)

    # Clean previous clones
    for item in os.listdir(REPOS_DIR):
        item_path = os.path.join(REPOS_DIR, item)
        if os.path.isdir(item_path):
            shutil.rmtree(item_path)

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
    Convert a Java file to Go using Gemini.
    Expects JSON body: { "nodeId": "file_0" }
    Should only be called after Backboard verdict is YES and user confirms.
    """
    data = request.get_json()
    if not data or 'nodeId' not in data:
        return jsonify({'error': 'Missing nodeId in request body'}), 400

    node_id = data['nodeId']

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

        print(f'🔄 Converting {file_path} (node {node_id}) Java → Go via Gemini...')
        go_code = convert_java_to_go(source_code, node_analysis, file_path)

        # Derive the output filename
        original_name = os.path.basename(file_path)
        go_filename = original_name.replace('.java', '.go').lower()

        return jsonify({
            'success': True,
            'nodeId': node_id,
            'originalFile': file_path,
            'goFilename': go_filename,
            'goCode': go_code,
            'javaSource': source_code,
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


if __name__ == '__main__':
    os.makedirs(REPOS_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)

    # Check Backboard config
    bb_configured = all([
        os.environ.get('BACKBOARD_API_KEY'),
        os.environ.get('BACKBOARD_THREAD_ID'),
        os.environ.get('BACKBOARD_ASSISTANT_ID'),
    ])

    print('🚀 Shadow-Code Backend running on http://localhost:3001')
    print('📡 POST /api/analyze        — { "repoUrl": "..." }')
    print('📊 GET  /api/graph')
    print('📈 GET  /api/analysis')
    print('📋 GET  /api/metrics')
    print('🟢 GET  /api/convert        — GREEN nodes only')
    print('🤖 POST /api/migrate        — { "nodeId": "..." }')
    print('🤖 POST /api/migrate/batch  — All GREEN nodes')
    print('🔄 POST /api/convert-code   — { "nodeId": "..." } (Gemini Java→Go)')
    print(f'🔑 Backboard: {"✅ configured" if bb_configured else "❌ NOT configured (set env vars)"}')

    gemini_configured = bool(os.environ.get('GEMINI_API_KEY'))
    print(f'🔑 Gemini: {"✅ configured" if gemini_configured else "❌ NOT configured (set GEMINI_API_KEY)"}')

    app.run(host='0.0.0.0', port=3001, debug=True)
