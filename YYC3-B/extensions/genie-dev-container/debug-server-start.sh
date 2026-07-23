#!/bin/bash
# Debug script to check VS Code Server startup in container
# Usage: docker exec -it <container-id> bash /path/to/this/script

echo "=== VS Code Server Startup Debug ==="
echo ""

CONTAINER_ID="${1:-c404e6038ffcaab896daa89e3f0d9048d2d4a79447f80e26243bd1362887b3a5}"
SERVER_DIR="$HOME/.codebuddy-server/bin/stable-33d688f054359fdb97de4060d1c964e73dc4d3a2-ed5b0929cd4ebcc943cbfced8479e3a68eab33b5"
SERVER_SCRIPT="$SERVER_DIR/bin/codebuddy-server"
LOG_FILE="$HOME/.codebuddy-server/.stable-33d688f054359fdb97de4060d1c964e73dc4d3a2-ed5b0929cd4ebcc943cbfced8479e3a68eab33b5.log"

echo "1. Checking if server directory exists..."
if [ -d "$SERVER_DIR" ]; then
    echo "   ✓ Server directory exists: $SERVER_DIR"
    ls -la "$SERVER_DIR"
else
    echo "   ✗ Server directory not found: $SERVER_DIR"
    exit 1
fi

echo ""
echo "2. Checking if server script exists and is executable..."
if [ -f "$SERVER_SCRIPT" ]; then
    echo "   ✓ Server script exists: $SERVER_SCRIPT"
    ls -la "$SERVER_SCRIPT"
    
    if [ -x "$SERVER_SCRIPT" ]; then
        echo "   ✓ Server script is executable"
    else
        echo "   ✗ Server script is not executable"
        exit 1
    fi
else
    echo "   ✗ Server script not found: $SERVER_SCRIPT"
    exit 1
fi

echo ""
echo "3. Checking Node.js binary..."
NODE_PATH="$SERVER_DIR/node"
if [ -f "$NODE_PATH" ]; then
    echo "   ✓ Node binary exists: $NODE_PATH"
    ls -la "$NODE_PATH"
    
    # Test Node.js
    echo "   Testing Node.js version:"
    "$NODE_PATH" --version || echo "   ✗ Node execution failed"
else
    echo "   ✗ Node binary not found: $NODE_PATH"
    exit 1
fi

echo ""
echo "4. Checking system dependencies..."
echo "   OS Information:"
cat /etc/os-release | head -5

echo ""
echo "   glibc version:"
ldd --version | head -1

echo ""
echo "   Available libraries:"
ldconfig -p | grep -E "libc\.|libstdc\+\+|libgcc" | head -10

echo ""
echo "5. Checking if server is already running..."
if pgrep -f "$SERVER_SCRIPT" > /dev/null; then
    echo "   ⚠ Server is already running:"
    ps aux | grep "$SERVER_SCRIPT" | grep -v grep
else
    echo "   ✓ No server process found"
fi

echo ""
echo "6. Checking previous log file..."
if [ -f "$LOG_FILE" ]; then
    echo "   Log file exists: $LOG_FILE"
    echo "   Size: $(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE" 2>/dev/null) bytes"
    echo "   Last 50 lines:"
    tail -50 "$LOG_FILE"
else
    echo "   No previous log file found"
fi

echo ""
echo "7. Testing server startup (dry run)..."
echo "   Attempting to run server with --help flag..."
"$SERVER_SCRIPT" --help 2>&1 | head -20

echo ""
echo "=== Debug Complete ==="
