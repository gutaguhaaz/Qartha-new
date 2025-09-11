#!/bin/bash

# Startup script for deployment
# This ensures all dependencies are properly installed before starting the app

set -e

echo "Starting application..."

# Install Python dependencies if needed
if [ -f "requirements.txt" ]; then
    echo "Installing Python dependencies..."
    pip install -r requirements.txt
fi

# Start the FastAPI application
echo "Starting FastAPI server..."
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

