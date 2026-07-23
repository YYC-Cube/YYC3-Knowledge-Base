#!/bin/bash
# Diagnostic script for glibc 2.17 container terminal issues
# Usage: ./diagnose-glibc217-terminal.sh <container-id>

CONTAINER_ID="${1}"

if [ -z "$CONTAINER_ID" ]; then
    echo "Usage: $0 <container-id>"
    echo "Example: $0 0809892220b1fc3aec521efc4f603c3fdeefc6ba8db6c282daf35fc53b63810e"
    exit 1
fi

echo "========================================="
echo "Diagnosing glibc 2.17 Container Terminal Issues"
echo "Container: $CONTAINER_ID"
echo "========================================="
echo ""

echo "1. Checking container OS and glibc version..."
docker exec -u root "$CONTAINER_ID" sh -c 'cat /etc/os-release | head -5'
echo ""
docker exec -u root "$CONTAINER_ID" sh -c 'ldd --version | head -1'
echo ""

echo "2. Checking VS Code Server installation..."
SERVER_DIR="/root/.codebuddy-server/bin/stable-33d688f054359fdb97de4060d1c964e73dc4d3a2-ed5b0929cd4ebcc943cbfced8479e3a68eab33b5"
docker exec -u root "$CONTAINER_ID" sh -c "ls -la $SERVER_DIR/bin/ | head -10"
echo ""

echo "3. Checking Node.js binary..."
docker exec -u root "$CONTAINER_ID" sh -c "$SERVER_DIR/node --version" 2>&1
echo ""

echo "4. Checking Node.js binary dependencies (glibc compatibility)..."
docker exec -u root "$CONTAINER_ID" sh -c "ldd $SERVER_DIR/node | grep -E 'not found|libc\\.'" 2>&1
echo ""

echo "5. Checking server log file..."
LOG_FILE="/root/.codebuddy-server/.stable-33d688f054359fdb97de4060d1c964e73dc4d3a2-ed5b0929cd4ebcc943cbfced8479e3a68eab33b5.log"
if docker exec -u root "$CONTAINER_ID" test -f "$LOG_FILE"; then
    echo "Log file exists, showing last 50 lines..."
    docker exec -u root "$CONTAINER_ID" sh -c "tail -50 $LOG_FILE"
else
    echo "Log file not found: $LOG_FILE"
fi
echo ""

echo "6. Checking server process..."
docker exec -u root "$CONTAINER_ID" sh -c "ps aux | grep codebuddy-server | grep -v grep" || echo "No server process found"
echo ""

echo "7. Checking for .node native modules..."
docker exec -u root "$CONTAINER_ID" sh -c "find $SERVER_DIR -name '*.node' | head -5"
echo ""

echo "8. Testing a sample .node module (if found)..."
SAMPLE_NODE_MODULE=$(docker exec -u root "$CONTAINER_ID" sh -c "find $SERVER_DIR -name '*.node' | head -1")
if [ -n "$SAMPLE_NODE_MODULE" ]; then
    echo "Testing module: $SAMPLE_NODE_MODULE"
    docker exec -u root "$CONTAINER_ID" sh -c "ldd $SAMPLE_NODE_MODULE 2>&1 | grep -E 'not found|libc\\.'"
else
    echo "No .node modules found"
fi
echo ""

echo "9. Checking for pty-related errors in log..."
if docker exec -u root "$CONTAINER_ID" test -f "$LOG_FILE"; then
    docker exec -u root "$CONTAINER_ID" sh -c "grep -i 'pty\\|terminal\\|spawn\\|Module._extensions' $LOG_FILE | tail -20" || echo "No pty-related errors found"
else
    echo "Log file not found"
fi
echo ""

echo "========================================="
echo "Diagnosis Complete"
echo "========================================="
echo ""
echo "Common Issues and Solutions:"
echo ""
echo "1. If you see 'not found' in ldd output:"
echo "   - Missing system libraries"
echo "   - Solution: Install missing libraries or use a newer base image"
echo ""
echo "2. If .node modules fail to load:"
echo "   - Native modules incompatible with glibc 2.17"
echo "   - Solution: Use -glibc-2-17 compatible server build"
echo ""
echo "3. If server process is running but terminal doesn't work:"
echo "   - PTY module might have failed to load"
echo "   - Check log file for 'Module._extensions' errors"
echo "   - Solution: Verify server was downloaded with -glibc-2-17 suffix"
echo ""
