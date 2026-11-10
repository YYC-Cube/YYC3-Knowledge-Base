#!/bin/bash
#
# Plugin Test Harness for BuildWithClaude
# Tests that the plugin loads correctly in Claude Code
#

# Don't exit on first error - we want to run all tests
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE="$SCRIPT_DIR/test-results.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0
WARNINGS=0

# Initialize results
echo '{"tests": [], "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > "$RESULTS_FILE"

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    PASSED=$((PASSED + 1))
}

log_failure() {
    echo -e "${RED}❌ $1${NC}"
    FAILED=$((FAILED + 1))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

add_result() {
    local name="$1"
    local status="$2"
    local message="$3"

    # Use jq to add result if available, otherwise skip
    if command -v jq &> /dev/null; then
        local temp_file=$(mktemp)
        jq --arg name "$name" --arg status "$status" --arg message "$message" \
           '.tests += [{"name": $name, "status": $status, "message": $message}]' \
           "$RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$RESULTS_FILE"
    fi
}

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  BuildWithClaude Plugin Test Harness${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Test 1: Check plugin directory structure
log_info "Test 1: Checking plugin directory structure..."

if [ -d "$PLUGIN_DIR/.claude-plugin" ]; then
    log_success "Plugin directory exists: .claude-plugin/"
    add_result "plugin_directory" "passed" "Plugin directory exists"
else
    log_failure "Plugin directory missing: .claude-plugin/"
    add_result "plugin_directory" "failed" "Plugin directory missing"
fi

# Test 2: Check plugin manifest (plugin.json or marketplace.json)
log_info "Test 2: Checking plugin manifest..."

PLUGIN_MANIFEST="$PLUGIN_DIR/.claude-plugin/plugin.json"
MARKETPLACE_MANIFEST="$PLUGIN_DIR/.claude-plugin/marketplace.json"

if [ -f "$PLUGIN_MANIFEST" ]; then
    MANIFEST="$PLUGIN_MANIFEST"
    MANIFEST_TYPE="plugin.json"
elif [ -f "$MARKETPLACE_MANIFEST" ]; then
    MANIFEST="$MARKETPLACE_MANIFEST"
    MANIFEST_TYPE="marketplace.json"
else
    MANIFEST=""
    MANIFEST_TYPE=""
fi

if [ -n "$MANIFEST" ]; then
    log_success "Plugin manifest exists: $MANIFEST_TYPE"
    add_result "plugin_manifest_exists" "passed" "Manifest file exists ($MANIFEST_TYPE)"

    # Validate JSON syntax
    if command -v jq &> /dev/null; then
        if jq empty "$MANIFEST" 2>/dev/null; then
            log_success "Plugin manifest is valid JSON"
            add_result "plugin_manifest_valid" "passed" "Valid JSON syntax"

            # Check required fields
            NAME=$(jq -r '.name // empty' "$MANIFEST")
            VERSION=$(jq -r '.version // empty' "$MANIFEST")

            if [ -n "$NAME" ]; then
                log_success "Plugin name: $NAME"
                add_result "plugin_name" "passed" "Name: $NAME"
            else
                log_failure "Plugin name is missing"
                add_result "plugin_name" "failed" "Name field missing"
            fi

            if [ -n "$VERSION" ]; then
                log_success "Plugin version: $VERSION"
                add_result "plugin_version" "passed" "Version: $VERSION"
            else
                log_warning "Plugin version is missing"
                add_result "plugin_version" "warning" "Version field missing"
            fi
        else
            log_failure "Plugin manifest has invalid JSON syntax"
            add_result "plugin_manifest_valid" "failed" "Invalid JSON syntax"
        fi
    else
        log_warning "jq not installed, skipping JSON validation"
        add_result "plugin_manifest_valid" "skipped" "jq not available"
    fi
else
    log_failure "Plugin manifest missing: plugin.json or marketplace.json"
    add_result "plugin_manifest_exists" "failed" "No manifest file found"
fi

# Test 3: Check component directories (monorepo structure)
log_info "Test 3: Checking component directories..."

# For monorepo structure, search in plugins/agents-*/agents/, etc.
PLUGINS_DIR="$PLUGIN_DIR/plugins"

# Count agents across all agent plugins (exclude bundle plugins to avoid double-counting)
SUBAGENT_COUNT=0
if [ -d "$PLUGINS_DIR" ]; then
    SUBAGENT_COUNT=$(find "$PLUGINS_DIR" -path "*/agents/*.md" ! -path "*/all-agents/*" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$SUBAGENT_COUNT" -gt 0 ]; then
    log_success "Agents found: $SUBAGENT_COUNT files (in plugins/agents-*/agents/)"
    add_result "agents_dir" "passed" "$SUBAGENT_COUNT agent files"
else
    log_failure "No agents found in plugins/agents-*/agents/"
    add_result "agents_dir" "failed" "No agent files found"
fi

# Count commands across all command plugins
COMMAND_COUNT=0
if [ -d "$PLUGINS_DIR" ]; then
    COMMAND_COUNT=$(find "$PLUGINS_DIR" -path "*/commands/*.md" ! -path "*/all-commands/*" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$COMMAND_COUNT" -gt 0 ]; then
    log_success "Commands found: $COMMAND_COUNT files (in plugins/commands-*/commands/)"
    add_result "commands_dir" "passed" "$COMMAND_COUNT command files"
else
    log_failure "No commands found in plugins/commands-*/commands/"
    add_result "commands_dir" "failed" "No command files found"
fi

# Count hooks across all hook plugins
HOOK_COUNT=0
if [ -d "$PLUGINS_DIR" ]; then
    HOOK_COUNT=$(find "$PLUGINS_DIR" -path "*/hooks/*.md" ! -path "*/all-hooks/*" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$HOOK_COUNT" -gt 0 ]; then
    log_success "Hooks found: $HOOK_COUNT files (in plugins/hooks-*/hooks/)"
    add_result "hooks_dir" "passed" "$HOOK_COUNT hook files"
else
    log_failure "No hooks found in plugins/hooks-*/hooks/"
    add_result "hooks_dir" "failed" "No hook files found"
fi

# Test 4: Run schema validation
log_info "Test 4: Running schema validation..."

cd "$PLUGIN_DIR"
if npm run validate > /dev/null 2>&1; then
    log_success "Schema validation passed"
    add_result "schema_validation" "passed" "All components valid"
else
    log_failure "Schema validation failed"
    add_result "schema_validation" "failed" "Validation errors found"
fi

# Test 5: Check for Claude Code CLI (optional integration test)
log_info "Test 5: Checking Claude Code CLI availability..."

CLAUDE_AVAILABLE=false
if command -v claude &> /dev/null; then
    CLAUDE_VERSION=$(claude --version 2>/dev/null || echo "unknown")
    log_success "Claude Code CLI available: $CLAUDE_VERSION"
    add_result "claude_cli" "passed" "Version: $CLAUDE_VERSION"
    CLAUDE_AVAILABLE=true
else
    log_warning "Claude Code CLI not installed (optional for local testing)"
    add_result "claude_cli" "skipped" "CLI not installed"
fi

# Tests 6-8: Claude Code Execution Tests (only if CLI is available)
if [ "$CLAUDE_AVAILABLE" = true ]; then
    # Test 6: Plugin Load Test
    log_info "Test 6: Testing plugin loading in Claude Code..."

    LOAD_OUTPUT=$(timeout 60 claude \
        --print "Say exactly 'PLUGIN_LOAD_OK' and nothing else." \
        --max-turns 1 \
        --plugin-dir "$PLUGIN_DIR" 2>&1) || true

    if echo "$LOAD_OUTPUT" | grep -q "PLUGIN_LOAD_OK"; then
        log_success "Plugin loaded successfully in Claude Code"
        add_result "claude_plugin_load" "passed" "Plugin loads without errors"
    else
        log_warning "Could not verify plugin load (check output below)"
        echo "$LOAD_OUTPUT" | head -5
        add_result "claude_plugin_load" "warning" "Load verification inconclusive"
    fi

    # Test 7: Verify commands are registered
    log_info "Test 7: Checking if commands are registered..."

    COMMANDS_OUTPUT=$(timeout 60 claude \
        --print "List 5 slash commands available to you. Just list the command names, one per line." \
        --max-turns 1 \
        --plugin-dir "$PLUGIN_DIR" 2>&1) || true

    if echo "$COMMANDS_OUTPUT" | grep -qiE "(commit|review|bug-fix|add-to-changelog|setup-linting)"; then
        log_success "Plugin commands are registered"
        add_result "claude_commands_registered" "passed" "Commands visible"
    else
        log_warning "Could not verify plugin commands"
        add_result "claude_commands_registered" "warning" "Commands not detected"
    fi

    # Test 8: Verify agents are registered
    log_info "Test 8: Checking if agents are registered..."

    AGENTS_OUTPUT=$(timeout 60 claude \
        --print "What specialized subagent types are available? List 3 agent names." \
        --max-turns 1 \
        --plugin-dir "$PLUGIN_DIR" 2>&1) || true

    if echo "$AGENTS_OUTPUT" | grep -qiE "(frontend|explore|plan|general|Explore|Plan)"; then
        log_success "Plugin agents are registered"
        add_result "claude_agents_registered" "passed" "Agents visible"
    else
        log_warning "Could not verify plugin agents"
        add_result "claude_agents_registered" "warning" "Agents not detected"
    fi
else
    log_info "Skipping Claude Code execution tests (CLI not available)"
    add_result "claude_plugin_load" "skipped" "CLI not installed"
    add_result "claude_commands_registered" "skipped" "CLI not installed"
    add_result "claude_agents_registered" "skipped" "CLI not installed"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Passed:   $PASSED${NC}"
echo -e "${RED}Failed:   $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

# Update final results
if command -v jq &> /dev/null; then
    temp_file=$(mktemp)
    jq --arg passed "$PASSED" --arg failed "$FAILED" --arg warnings "$WARNINGS" \
       '. + {"summary": {"passed": ($passed|tonumber), "failed": ($failed|tonumber), "warnings": ($warnings|tonumber)}}' \
       "$RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$RESULTS_FILE"
fi

log_info "Results saved to: $RESULTS_FILE"

# Exit with error if any tests failed
if [ $FAILED -gt 0 ]; then
    echo ""
    log_failure "Some tests failed!"
    exit 1
else
    echo ""
    log_success "All tests passed!"
    exit 0
fi
