#!/bin/bash

# Script to process and rewrite command files from commands/new/ to commands/

# List of files to skip (already exist in commands/)
SKIP_FILES=(
  "add-to-changelog.md"
  "clean.md"
  "commit.md"
  "context-prime.md"
  "create-jtbd.md"
  "create-pr.md"
  "create-prd.md"
  "create-prp.md"
  "create-pull-request.md"
  "create-worktrees.md"
  "fix-github-issue.md"
  "fix-issue.md"
  "husky.md"
  "initref.md"
  "pr-review.md"
  "prime.md"
  "release.md"
  "todo.md"
  "update-branch-name.md"
  "update-docs.md"
)

# Function to check if file should be skipped
should_skip() {
  local filename=$1
  for skip in "${SKIP_FILES[@]}"; do
    if [[ "$filename" == "$skip" ]]; then
      return 0
    fi
  done
  return 1
}

# Function to determine category based on folder
get_category() {
  local folder=$1
  case "$folder" in
    "automation") echo "automation-workflow" ;;
    "deployment") echo "ci-deployment" ;;
    "documentation") echo "documentation-changelogs" ;;
    "game-development") echo "game-development" ;;
    "git-workflow") echo "version-control-git" ;;
    "orchestration") echo "workflow-orchestration" ;;
    "performance") echo "performance-optimization" ;;
    "project-management") echo "project-task-management" ;;
    "security") echo "security-audit" ;;
    "setup") echo "project-setup" ;;
    "simulation") echo "simulation-modeling" ;;
    "svelte") echo "framework-svelte" ;;
    "sync") echo "integration-sync" ;;
    "team") echo "team-collaboration" ;;
    "testing") echo "code-analysis-testing" ;;
    "utilities") echo "utilities-debugging" ;;
    *) echo "miscellaneous" ;;
  esac
}

# Process all .md files in commands/new/
find commands/new -name "*.md" -type f | while read -r file; do
  filename=$(basename "$file")
  folder=$(basename $(dirname "$file"))
  
  # Skip if file already exists
  if should_skip "$filename"; then
    echo "Skipping $filename (already exists)"
    continue
  fi
  
  # Skip SIMULATION_EXAMPLES.md
  if [[ "$filename" == "SIMULATION_EXAMPLES.md" ]]; then
    echo "Skipping $filename (documentation file)"
    continue
  fi
  
  # Get category
  category=$(get_category "$folder")
  
  # Special cases for specific files
  case "$filename" in
    "migrate-to-typescript.md") category="typescript-migration" ;;
    "design-database-schema.md"|"create-database-migrations.md"|"optimize-database-performance.md") category="database-operations" ;;
    "design-rest-api.md"|"implement-graphql-api.md"|"doc-api.md"|"generate-api-documentation.md") category="api-development" ;;
    "setup-monitoring-observability.md"|"add-performance-monitoring.md") category="monitoring-observability" ;;
  esac
  
  echo "Processing $folder/$filename -> category: $category"
  
  # Create output file path
  output="commands/$filename"
  
  # Process file will be done by Node.js script
  node scripts/process-command-file.js "$file" "$output" "$category"
done

echo "Processing complete!"