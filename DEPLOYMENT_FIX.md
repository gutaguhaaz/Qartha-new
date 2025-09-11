# Deployment Build Command Fix

## Issue
The deployment was failing with the following error:
```
Build command contains invalid pip syntax with 'npm install npm run build' causing pip to fail with 'No matching distribution found for install'
Build command incorrectly combines multiple commands without proper separators
```

## Root Cause
The `.replit` file contains a deployment build command that incorrectly combines pip and npm commands:
```toml
build = ["pip install -r requirements.txt", "npm install", "npm run build"]
```

This causes the deployment system to incorrectly interpret the commands, leading to pip trying to install npm packages.

## Solution Options

### Option 1: Use Custom Build Script (Recommended)
A comprehensive build script (`build.sh`) has been created that properly handles both Python and Node.js dependencies:

```bash
#!/bin/bash
set -e

# Install Python dependencies
pip install -r requirements.txt

# Install Node.js dependencies  
npm install

# Build frontend application
npm run build
```

**To use this solution:**
1. Reference `./build.sh` as the build command in deployment configuration
2. Or use the individual commands with proper separators: `pip install -r requirements.txt && npm install && npm run build`

### Option 2: Modify .replit Configuration
If direct modification of `.replit` is possible, change the build command from:
```toml
build = ["pip install -r requirements.txt", "npm install", "npm run build"]
```

To:
```toml
build = ["pip install -r requirements.txt && npm install && npm run build"]
```

Or use the build script:
```toml
build = ["./build.sh"]
```

### Option 3: Separate Commands with Proper Chaining
Use proper shell command chaining:
```toml
build = ["bash -c 'pip install -r requirements.txt && npm install && npm run build'"]
```

## Verification
The build script has been tested and successfully:
- ✅ Installs Python dependencies via pip
- ✅ Installs Node.js dependencies via npm  
- ✅ Builds the frontend application
- ✅ Provides clear error handling and status messages

## Next Steps
1. Update deployment configuration to use one of the solution options above
2. Test deployment with the new build command
3. Verify both Python backend and Node.js frontend are properly built and deployed