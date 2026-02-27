#!/bin/bash

# ReleaseHub360 MCP Server — Start Script
cd "$(dirname "$0")"

echo "Starting ReleaseHub360 MCP Server..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Run: cp .env.example .env  and fill in your Azure DevOps credentials."
    exit 1
fi

# Activate virtual environment (.venv veya venv)
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Virtual environment not found. Run:"
    echo "  python -m venv .venv && source .venv/bin/activate && pip install -e ."
    exit 1
fi

echo "Server starting at http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo "Health:   http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop."
echo ""

python api_server.py
