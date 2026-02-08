from flask import Flask, jsonify
from flask_cors import CORS
import json
import os
import subprocess
import sys

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

def initialize_data():
    """Run graph_builder.py and risk_analyzer.py to generate JSON files"""
    print('🔧 Initializing data...')
    
    storage_dir = os.path.join(os.path.dirname(__file__), 'storage')
    os.makedirs(storage_dir, exist_ok=True)
    
    try:
        # Run graph_builder.py
        print('📊 Running graph_builder.py...')
        graph_builder_path = os.path.join(os.path.dirname(__file__), 'graph_builder.py')
        result = subprocess.run([sys.executable, graph_builder_path], 
                              capture_output=True, text=True, check=True)
        print(result.stdout)
        
        # Run risk_analyzer.py
        print('📈 Running risk_analyzer.py...')
        risk_analyzer_path = os.path.join(os.path.dirname(__file__), 'risk_analyzer.py')
        result = subprocess.run([sys.executable, risk_analyzer_path], 
                              capture_output=True, text=True, check=True)
        print(result.stdout)
        
        print('✅ Data initialization complete!')
        return True
    except subprocess.CalledProcessError as e:
        print(f'❌ Error during initialization: {e}')
        print(f'   stdout: {e.stdout}')
        print(f'   stderr: {e.stderr}')
        return False
    except Exception as e:
        print(f'❌ Unexpected error during initialization: {e}')
        return False

@app.route('/api/graph', methods=['GET'])
def get_graph():
    """Returns the dependency graph (nodes and edges)"""
    try:
        graph_path = os.path.join(os.path.dirname(__file__), 'storage', 'graph.json')
        
        if not os.path.exists(graph_path):
            return jsonify({'error': 'Graph data not found'}), 404
        
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
        analysis_path = os.path.join(os.path.dirname(__file__), 'storage', 'analysis.json')
        
        if not os.path.exists(analysis_path):
            return jsonify({'error': 'Analysis data not found'}), 404
        
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
        metrics_path = os.path.join(os.path.dirname(__file__), 'storage', 'metrics.json')
        
        if not os.path.exists(metrics_path):
            return jsonify({'error': 'Metrics data not found'}), 404
        
        with open(metrics_path, 'r') as f:
            metrics = json.load(f)
        
        return jsonify(metrics)
    except Exception as e:
        print(f"Error reading metrics: {e}")
        return jsonify({'error': 'Failed to read metrics data'}), 500

if __name__ == '__main__':
    # Initialize data before starting the server
    initialize_data()
    if not initialize_data():
        print('⚠️  Warning: Data initialization failed. Server will start but may not have data.')
    
    print('🚀 Shadow-Code Backend running on http://localhost:3001')
    print('📊 Graph API: http://localhost:3001/api/graph')
    print('📈 Analysis API: http://localhost:3001/api/analysis')
    print('📋 Metrics API: http://localhost:3001/api/metrics')
    app.run(host='0.0.0.0', port=3001, debug=True)
