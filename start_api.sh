#!/bin/bash
# Start the Listant API Server

cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists and has API key
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Please create a .env file with your ANTHROPIC_API_KEY"
    echo "Example:"
    echo "  ANTHROPIC_API_KEY=your_api_key_here"
    exit 1
fi

# Check if API key is set (not the placeholder)
if grep -q "ANTHROPIC_API_KEY=your_api_key_here" .env 2>/dev/null || ! grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
    if ! grep -q "ANTHROPIC_API_KEY=sk-" .env 2>/dev/null; then
        echo "⚠️  Warning: Please set your ANTHROPIC_API_KEY in .env file"
        echo "Get your API key from: https://console.anthropic.com/"
        echo ""
        echo "Current .env content:"
        grep ANTHROPIC_API_KEY .env 2>/dev/null | sed 's/sk-[^ ]*/sk-***HIDDEN***/'
        exit 1
    fi
fi

echo "🚀 Starting Listant API Server..."
echo "📍 API will be available at http://localhost:8000"
echo ""

# Start the server
python3 api_server.py

