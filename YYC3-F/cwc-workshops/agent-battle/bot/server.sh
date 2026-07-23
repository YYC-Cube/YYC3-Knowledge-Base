#!/usr/bin/env bash
# Copyright 2026 Anthropic PBC
# SPDX-License-Identifier: Apache-2.0

# Download and launch a vanilla Minecraft server on localhost:25565 in
# offline mode (no Mojang auth required — load-bearing for the demo so
# audience members can join without accounts).
#
# Usage:  ./bot/server.sh
#
# Idempotent: re-running reuses the existing jar and world.
set -euo pipefail

# Pin the server version. 1.20.6 is the validated combo with current
# mineflayer + pathfinder. Bump cautiously — mineflayer protocol support
# lags vanilla releases.
MC_VERSION="1.20.6"

# Seed precedence (highest wins):
#   1. MC_SEED env var — exact seed, wipes world/ for fresh generation.
#      Used by the Agent Battle competition so all participants race the
#      same random world on their own local servers. Facilitator mints it
#      with ./bot/mint-seed.sh and broadcasts MC_SEED=… for paste-in.
#   2. --random-seed — Mojang picks a fresh seed, wipes world/.
#   3. Pinned default below — demo reproducibility.
RANDOM_SEED=0
MC_SEED="${MC_SEED:-}"
# Workshop default is 4x speed (80 TPS). bot.js issues `/tick rate
# $TICK_RATE` on spawn (it has op via ops.json below). Soak-tested at
# 80 for 90 min with no kicks/desync and flat RSS; 20 is vanilla.
TICK_RATE="${TICK_RATE:-80}"
# --instance lets compete.sh run several servers side-by-side, each with
# its own world dir + port. "default" keeps the historical bot/server/ path.
INSTANCE="${INSTANCE:-default}"
MC_PORT="${MC_PORT:-25565}"
while [ $# -gt 0 ]; do
  case "$1" in
    --random-seed) RANDOM_SEED=1 ;;
    --tick-rate) shift; TICK_RATE="$1" ;;
    --tick-rate=*) TICK_RATE="${1#*=}" ;;
    --instance) shift; INSTANCE="$1" ;;
    --instance=*) INSTANCE="${1#*=}" ;;
    --port) shift; MC_PORT="$1" ;;
    --port=*) MC_PORT="${1#*=}" ;;
    -h|--help)
      echo "Usage: $0 [--random-seed] [--tick-rate N] [--instance NAME] [--port N]"
      echo "  --random-seed   wipe world/ and use a fresh random seed"
      echo "  --tick-rate N   server TPS (default 80; 20 = vanilla)"
      echo "  --instance NAME separate world dir at bot/server-NAME/ (default: bot/server/)"
      echo "  --port N        server-port (default 25565)"
      echo ""
      echo "Env vars:"
      echo "  MC_SEED=<int>   pin this level-seed, wipe world/ on launch"
      echo "                  (overrides --random-seed and the pinned default)"
      exit 0
      ;;
  esac
  shift
done
export TICK_RATE

# Direct URL for the 1.20.6 server jar from Mojang's official
# piston-data CDN — same artifact a vanilla launcher fetches.
# Pinned because mineflayer's protocol support is version-specific.
SERVER_JAR_URL="https://piston-data.mojang.com/v1/objects/145ff0858209bcfc164859ba735d4199aafa1eea/server.jar"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ "${INSTANCE}" = "default" ]; then
  SERVER_DIR="${SCRIPT_DIR}/server"
else
  SERVER_DIR="${SCRIPT_DIR}/server-${INSTANCE}"
fi
JAR_PATH="${SERVER_DIR}/server.jar"

mkdir -p "${SERVER_DIR}"
cd "${SERVER_DIR}"

if [ -n "${MC_SEED}" ]; then
  echo "[server.sh] MC_SEED=${MC_SEED}: wiping world/ and pinning level-seed"
  rm -rf world
  rm -f server.properties
elif [ "${RANDOM_SEED}" = "1" ]; then
  echo "[server.sh] --random-seed: wiping world/ and removing pinned seed"
  rm -rf world
  rm -f server.properties
fi

if [ ! -f "${JAR_PATH}" ] && [ -f "${SCRIPT_DIR}/server/server.jar" ]; then
  cp "${SCRIPT_DIR}/server/server.jar" "${JAR_PATH}"
fi
if [ ! -f "${JAR_PATH}" ]; then
  echo "[server.sh] downloading Minecraft ${MC_VERSION} server jar..."
  curl -fsSL -o "${JAR_PATH}" "${SERVER_JAR_URL}"
fi

# Mojang's EULA must be accepted by the USER, not by this script.
# setup.sh prompts and sets MINECRAFT_EULA=accept on consent; if
# server.sh is run directly, the user does the same.
if [ ! -f eula.txt ] || ! grep -q "^eula=true" eula.txt; then
  if [ "${MINECRAFT_EULA:-}" = "accept" ]; then
    echo "eula=true" > eula.txt
  else
    echo "✗ Minecraft server EULA not accepted." >&2
    echo "  Read: https://www.minecraft.net/eula" >&2
    echo "  Then: export MINECRAFT_EULA=accept   and re-run." >&2
    exit 1
  fi
fi

# server.properties — minimal config for a flat-ish, peaceful, no-auth
# bot playground. Only written on first launch so the user can edit it
# afterwards.
if [ ! -f server.properties ]; then
  cat > server.properties <<'EOF'
online-mode=false
gamemode=survival
difficulty=peaceful
spawn-protection=0
max-players=20
view-distance=10
simulation-distance=10
allow-flight=true
enable-command-block=true
motd=Claude Plays Minecraft
level-type=minecraft\:normal
EOF
  echo "server-port=${MC_PORT}" >> server.properties
  if [ -n "${MC_SEED}" ]; then
    # Agent Battle mode: all participants play the same seed on their own
    # local servers. Facilitator distributes MC_SEED at kickoff.
    echo "level-seed=${MC_SEED}" >> server.properties
    echo "[server.sh] using MC_SEED=${MC_SEED}"
  elif [ "${RANDOM_SEED}" = "0" ]; then
    # Pinned seed: forest spawn with logs reachable within 64 blocks of
    # spawn. Pinned for demo reproducibility — workshop participants get
    # the same world every time so we can debug agent behavior without
    # seed variance. Pass `./server.sh --random-seed` to omit this line
    # so Mojang's server picks a fresh seed on first launch.
    echo "level-seed=5587119049428751064" >> server.properties
    echo "[server.sh] using pinned default seed=5587119049428751064"
  else
    echo "[server.sh] --random-seed: leaving level-seed unset for fresh generation"
  fi
fi

# Op the bot so it can issue `/tick rate`. Offline-mode UUID is the
# v3 (name-based MD5) UUID of "OfflinePlayer:<name>" — same algorithm
# the Mojang server uses when online-mode=false.
MC_USERNAME="${MC_USERNAME:-claude}"
BOT_UUID=$(python3 - "$MC_USERNAME" <<'PY'
import hashlib, sys, uuid
h = bytearray(hashlib.md5(("OfflinePlayer:" + sys.argv[1]).encode()).digest())
h[6] = (h[6] & 0x0F) | 0x30
h[8] = (h[8] & 0x3F) | 0x80
print(uuid.UUID(bytes=bytes(h)))
PY
)
cat > ops.json <<EOF
[{"uuid":"${BOT_UUID}","name":"${MC_USERNAME}","level":4,"bypassesPlayerLimit":false}]
EOF

# Echo the level-seed that will actually take effect so participants can
# confirm they're on the facilitator's advertised seed.
EFFECTIVE_SEED=$(grep -E '^level-seed=' server.properties 2>/dev/null | head -1 | cut -d= -f2-)
if [ -z "${EFFECTIVE_SEED}" ]; then EFFECTIVE_SEED="(server-generated on first launch)"; fi
echo "[server.sh] launching Minecraft server on :${MC_PORT} (instance=${INSTANCE}, offline-mode, tick-rate=${TICK_RATE}, seed=${EFFECTIVE_SEED})"
# The vanilla server reads stdin for its admin console. When backgrounded
# from an interactive shell (`./server.sh &`) that triggers SIGTTIN and the
# job suspends. Detach stdin so `&` just works.
exec java -Xms1G -Xmx2G -jar "${JAR_PATH}" nogui </dev/null
