#!/usr/bin/env bash
# Seed open diligence issues in the Deal Committee Linear team.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
: "${LINEAR_API_KEY:?LINEAR_API_KEY not set}"
: "${LINEAR_TEAM_ID:?LINEAR_TEAM_ID not set}"

gql() {
  curl -fsS https://api.linear.app/graphql \
    -H "Authorization: $LINEAR_API_KEY" -H "Content-Type: application/json" \
    -d "$1"
}

ensure_label() { # $1=name
  local id
  id=$(gql "{\"query\":\"{ issueLabels(filter:{name:{eq:\\\"$1\\\"}}){ nodes{ id }}}\"}" \
    | jq -r '.data.issueLabels.nodes[0].id // empty')
  if [[ -z "$id" ]]; then
    id=$(gql "{\"query\":\"mutation{ issueLabelCreate(input:{name:\\\"$1\\\",teamId:\\\"$LINEAR_TEAM_ID\\\"}){ issueLabel{ id }}}\"}" \
      | jq -r '.data.issueLabelCreate.issueLabel.id')
  fi
  echo "$id"
}

create_issue() { # $1=title $2=desc $3=labelIds(json array)
  gql "$(jq -n --arg t "$1" --arg d "$2" --arg team "$LINEAR_TEAM_ID" --argjson labels "$3" \
    '{query:"mutation($i:IssueCreateInput!){issueCreate(input:$i){issue{identifier title}}}",
      variables:{i:{title:$t,description:$d,teamId:$team,labelIds:$labels}}}')" \
    | jq -r '.data.issueCreate.issue | "  \(.identifier) \(.title)"'
}

echo "── labels ──"
diligence=$(ensure_label diligence)
acme=$(ensure_label acme); bridgewell=$(ensure_label bridgewell); norwood=$(ensure_label norwood)
echo "  diligence=$diligence acme=$acme bridgewell=$bridgewell norwood=$norwood"

echo "── issues ──"
create_issue "Acme: ERP/MES integration scope unverified" \
  "Vendor has not provided integration timeline or scope. Brightline lesson: get this pre-LOI." \
  "[\"$diligence\",\"$acme\"]"
create_issue "Bridgewell: top-customer renewal status unconfirmed" \
  "~35% revenue from one auto OEM, contract renewal in ~12mo. Keswick rule applies." \
  "[\"$diligence\",\"$bridgewell\"]"
create_issue "Norwood: CFO departed, no successor named" \
  "Leadership vacuum risk. No interim CFO announced." \
  "[\"$diligence\",\"$norwood\"]"
