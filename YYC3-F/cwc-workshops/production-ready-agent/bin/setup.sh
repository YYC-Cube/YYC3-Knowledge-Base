#!/usr/bin/env bash
# Provision CMA resources and write IDs back into .env.
# Idempotent: re-running updates existing agents (new version) instead of
# creating new ones, and reuses environment / memory-store / files by ID.
set -euo pipefail
cd "$(dirname "$0")/.."

[[ -f .env ]] || { echo "✗ .env missing — cp .env.example .env first"; exit 1; }
set -a; source .env; set +a
: "${ANTHROPIC_API_KEY:?ANTHROPIC_API_KEY not set in .env}"
command -v ant >/dev/null || { echo "✗ ant CLI not found — install it: brew install anthropics/tap/ant"; exit 1; }

write_env() { # write_env KEY VALUE
  grep -q "^$1=" .env && sed -i '' "s|^$1=.*|$1=$2|" .env || echo "$1=$2" >> .env
  echo "  $1=$2"
}

# upsert_agent ENV_KEY < body.json -> echoes "id version"
upsert_agent() {
  local key=$1 cur=${!1:-} body json
  body=$(cat)
  if [[ -n "$cur" && "$cur" == agent_* ]]; then
    local ver
    ver=$(ant beta:agents retrieve --agent-id "$cur" --transform version -r 2>/dev/null) || ver=
    if [[ -n "$ver" ]]; then
      if json=$(ant beta:agents update --agent-id "$cur" --version "$ver" \
                  --format json --format-error json 2>&1 <<<"$body"); then
        echo "$(jq -r .id <<<"$json") $(jq -r .version <<<"$json")"; return
      fi
      echo "  ⚠ update of $cur failed, falling back to create" >&2
      jq -r '.error.message // .' <<<"$json" 2>/dev/null | sed 's/^/    /' >&2
    fi
  fi
  json=$(ant beta:agents create --format json --format-error json <<<"$body")
  echo "$(jq -r .id <<<"$json") $(jq -r .version <<<"$json")"
}

echo "── environment ────────────────────────────────────────"
if [[ -z "${ENVIRONMENT_ID:-}" || "$ENVIRONMENT_ID" == env_... ]]; then
  ENVIRONMENT_ID=$(ant beta:environments create < seed/environments/research.yaml \
    --transform id -r --format-error json)
  write_env ENVIRONMENT_ID "$ENVIRONMENT_ID"
else
  echo "  reusing $ENVIRONMENT_ID"
fi

echo "── sub-agents ────────────────────────────────────────"
declare -a sub_ids
i=0
for f in macro-trends financial-analyst competitive-positioning valuation-comps; do
  key="AGENT_SUB_${i}_ID"
  read -r id ver < <(upsert_agent "$key" < "seed/agents/$f.yaml")
  sub_ids+=("\"$id\"")
  write_env "$key" "$id"
  echo "  $f -> $id (v$ver)"
  i=$((i+1))
done

echo "── coordinator agent ─────────────────────────────────"
# Created fresh at v1 each run, from deal-team.yaml minus its `multiagent`
# block (agents.update cannot clear an existing roster, so we always start
# without one). bin/enable-multiagent.sh adds the roster as v2 — that's the
# live workshop step.
AGENT_JSON=$(awk '/^multiagent:/{exit} 1' seed/agents/deal-team.yaml \
  | ant beta:agents create --format json)
write_env AGENT_DEAL_TEAM_ID "$(jq -r .id <<<"$AGENT_JSON")"
write_env AGENT_SUB_IDS "$(IFS=,; echo "${sub_ids[*]//\"/}")"

echo "── memory store ──────────────────────────────────────"
if [[ -z "${MEMORY_STORE_ID:-}" || "$MEMORY_STORE_ID" == memstore_... ]]; then
  MEMORY_STORE_ID=$(ant beta:memory-stores create \
    --name "deal-priors" \
    --description "Lessons from prior M&A evaluations. Consult before recommending." \
    --transform id -r)
  write_env MEMORY_STORE_ID "$MEMORY_STORE_ID"
  for f in seed/memories/*.md; do
    base=$(basename "$f" .md)
    jq -n --arg p "/$base.md" --rawfile c "$f" '{path:$p, content:$c}' \
      | ant beta:memory-stores:memories create --memory-store-id "$MEMORY_STORE_ID" >/dev/null
    echo "  seeded /$base.md"
  done
else
  echo "  reusing $MEMORY_STORE_ID"
fi

echo "── target financials (Files API) ─────────────────────"
if [[ -z "${FILE_IDS:-}" || "$FILE_IDS" == file_... ]]; then
  ids=()
  for f in seed/targets/*.csv; do
    fid=$(ant beta:files upload --file "$f" --transform id -r)
    ids+=("$fid")
    echo "  $(basename "$f") -> $fid"
  done
  write_env FILE_IDS "$(IFS=,; echo "${ids[*]}")"
else
  echo "  reusing FILE_IDS"
fi

echo "── sync .env into the apps ───────────────────────────"
# Both apps read their own ./.env so they're standard self-contained Next.js
# apps. Keep the root .env as the source of truth; copy it into each app.
for app in starter solution; do
  cp .env "$app/.env"
  echo "  $app/.env"
done

echo
echo "✓ setup complete. Next: cd starter && bun install"
