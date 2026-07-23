#!/bin/bash
# Syncs skills/ → plugin/skills/ for shared skills.
# Preserves plugin-specific frontmatter (hooks, user-invocable, argument-hint)
# while syncing body content from the public skills/ copies.
#
# Usage: ./scripts/sync-plugin.sh [skill-name]
#   No args: sync all shared skills
#   With arg: sync only the named skill

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
PLUGIN_DIR="$REPO_ROOT/plugin/skills"

# Skills that exist in both directories
shared_skills() {
  for d in "$SKILLS_DIR"/*/; do
    skill=$(basename "$d")
    if [ -d "$PLUGIN_DIR/$skill" ]; then
      echo "$skill"
    fi
  done
}

sync_skill() {
  local skill="$1"
  local src="$SKILLS_DIR/$skill"
  local dst="$PLUGIN_DIR/$skill"

  if [ ! -d "$src" ] || [ ! -d "$dst" ]; then
    echo "  SKIP $skill (not in both directories)"
    return
  fi

  # Sync non-SKILL.md files (references, scripts, assets) directly
  for subdir in references scripts assets; do
    if [ -d "$src/$subdir" ]; then
      mkdir -p "$dst/$subdir"
      cp -R "$src/$subdir/"* "$dst/$subdir/" 2>/dev/null || true
    fi
  done

  # For SKILL.md: preserve plugin frontmatter, sync body
  local src_md="$src/SKILL.md"
  local dst_md="$dst/SKILL.md"

  if [ ! -f "$src_md" ] || [ ! -f "$dst_md" ]; then
    echo "  SKIP $skill (missing SKILL.md)"
    return
  fi

  # Check if plugin has extra frontmatter keys (hooks, user-invocable, etc.)
  local has_plugin_keys=false
  if grep -q "^hooks:\|^user-invocable:\|^argument-hint:" "$dst_md" 2>/dev/null; then
    has_plugin_keys=true
  fi

  if [ "$has_plugin_keys" = true ]; then
    # Plugin has custom frontmatter — keep plugin copy as-is, warn if body diverges
    # Body comparison: strip frontmatter from both, diff the rest
    local src_body dst_body
    src_body=$(sed '1,/^---$/{ /^---$/!d; /^---$/{ x; /^---$/d; x; d; } }; /^---$/d' "$src_md" | tail -n +2)
    dst_body=$(sed '1,/^---$/{ /^---$/!d; /^---$/{ x; /^---$/d; x; d; } }; /^---$/d' "$dst_md" | tail -n +2)

    if [ "$src_body" != "$dst_body" ]; then
      echo "  DIVERGED $skill (plugin has custom frontmatter + different body — manual review needed)"
    else
      echo "  OK $skill (plugin frontmatter preserved, body matches)"
    fi
  else
    # No plugin-specific keys — safe to copy directly
    cp "$src_md" "$dst_md"
    echo "  SYNCED $skill"
  fi
}

echo "Syncing skills/ → plugin/skills/"
echo

if [ -n "$1" ]; then
  sync_skill "$1"
else
  for skill in $(shared_skills); do
    sync_skill "$skill"
  done
fi

echo
echo "Done."
