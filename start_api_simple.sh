#!/bin/bash
# Simple startup script without API key check (for testing)

cd "$(dirname "$0")"
source venv/bin/activate
echo "🚀 Starting Listant API Server..."
echo "📍 API will be available at http://localhost:8000"
echo ""
python3 api_server.py

