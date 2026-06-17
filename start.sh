#!/bin/bash

# Function to stop background processes on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $PYTHON_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Activate python virtual environment if exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment (.venv)..."
    source .venv/bin/activate
fi

# Start Python Groww Bridge
echo "Starting Groww API Bridge on port 5050..."
python groww_bridge.py &
PYTHON_PID=$!

# Give the bridge a second to initialize
sleep 1

# Start Node.js Live Server
echo "Starting Node.js Live Server on port 3000..."
node server.js

# Cleanup on exit
cleanup
