from flask import Flask, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

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
    print('🚀 Shadow-Code Backend running on http://localhost:3001')
    print('📊 Graph API: http://localhost:3001/api/graph')
    print('📈 Analysis API: http://localhost:3001/api/analysis')
    print('📋 Metrics API: http://localhost:3001/api/metrics')
    app.run(host='0.0.0.0', port=3001, debug=True)
