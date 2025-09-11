#!/bin/bash

# Comprehensive build script for full-stack application
# This script properly separates Python and Node.js build commands
# to avoid the "invalid pip syntax" deployment error

set -e  # Exit on any error

echo "Starting full-stack application build..."

# Step 1: Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "Error: Failed to install Python dependencies"
    exit 1
fi

# Step 2: Install Node.js dependencies  
echo "Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Error: Failed to install Node.js dependencies"
    exit 1
fi

# Step 3: Build frontend application
echo "Building frontend application..."
npm run build
if [ $? -ne 0 ]; then
    echo "Error: Failed to build frontend application"
    exit 1
fi

echo "Build completed successfully!"
echo "Python dependencies: Installed"
echo "Node.js dependencies: Installed" 
echo "Frontend build: Complete"