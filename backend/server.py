from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import subprocess
import sys
import shutil
import uuid

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

if __name__ == '__main__':
    os.makedirs(REPOS_DIR, exist_ok=True)
    os.makedirs(STORAGE_DIR, exist_ok=True)

    print('🚀 Shadow-Code Backend running on http://localhost:3001')
    print('📡 POST /api/analyze  — { "repoUrl": "..." }')
    print('📊 GET  /api/graph')
    print('📈 GET  /api/analysis')
    print('📋 GET  /api/metrics')
    app.run(host='0.0.0.0', port=3001, debug=True)
