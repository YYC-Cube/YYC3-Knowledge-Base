// Copyright 2026 Anthropic PBC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Mineflayer bot + Express HTTP seam.
//
// Connects to a vanilla Minecraft server on localhost:25565 in offline mode
// as username "claude". Loads pathfinder + collectblock so we can navigate
// and harvest. Starts prismarine-viewer on :3007 for a browser view of
// what the bot sees, and an Express server on :8080 with two routes:
//
//   GET  /state   -> snapshot of position, vitals, inventory, surroundings
//   POST /action  -> {name, args} -> execute one action, return {ok,error?}
//
// Actions are serialized: only one runs at a time. Concurrent /action
// calls are queued in FIFO order (see withBusy); state.busy=true while an
// action is executing.
// Mineflayer throws on pathfinding failures, unreachable targets, and
// missing recipes — we catch those and surface them as clean error
// strings instead of crashing the process.

const crypto = require('node:crypto');
const express = require('express');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlockPlugin = require('mineflayer-collectblock').plugin;
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');

const MC_HOST = process.env.MC_HOST || 'localhost';
const MC_PORT = parseInt(process.env.MC_PORT || '25565', 10);
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '8088', 10);
const VIEWER_PORT = parseInt(process.env.VIEWER_PORT || '3007', 10);
const USERNAME = process.env.MC_USERNAME || 'claude';
// Report tick rate with each achievement; facilitator review is the real check.
const TICK_RATE = parseInt(process.env.TICK_RATE || '20', 10);
// When set, /action and /mcp require `Authorization: Bearer <BOT_TOKEN>`.
// Empty/unset = auth disabled (local-dev convenience; warning logged below).
const BOT_TOKEN = process.env.BOT_TOKEN || '';

let bot = null;
let busy = false;
let viewerStarted = false;
let lastError = null;
let spawned = false;
// Cumulative count of diamond items the bot has picked up this run. Exposed
// on /state as diamonds_collected and reported per-increment to the
// leaderboard as {id: "diamond_<N>"}. Primary scoring signal for the Agent
// Battle competition — the leaderboard sorts by this count desc, tokens asc.
let diamondsCollected = 0;
// Local best across all runs of this bot process. Shown on /view so
// the participant can see their personal best even if the shared
// leaderboard is unreachable. Resets only on bot restart.
let bestRunDiamonds = 0;

function createBot() {
  console.log(`[bot] connecting to ${MC_HOST}:${MC_PORT} as "${USERNAME}"`);
  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: USERNAME,
    auth: 'offline',
    // server.sh pins the jar to 1.20.6. Auto-detect is fragile
    // (depends on the resolved minecraft-data build having an
    // exact entry; some npm installs land on a build that maps
    // 1.20.6 to a near-miss protocol and fails the handshake).
    version: '1.20.6',
  });

  bot.loadPlugin(pathfinder);
  bot.loadPlugin(collectBlockPlugin);

  bot.once('spawn', () => {
    spawned = true;
    const movements = new Movements(bot);
    // Sprinting at TICK_RATE=40 lets pathfinder cover >4 blocks per server
    // tick, which trips the vanilla "Invalid move player packet" anti-cheat
    // and kicks the bot mid-run. Walk-only is slower but stays connected.
    movements.allowSprinting = false;
    movements.canDig = true;
    bot.pathfinder.setMovements(movements);
    // Default thinkTimeout is 5000ms — too short for cross-area go_near to
    // far {pos} goals on uneven terrain. Bumping to 15s reduces "Took to
    // long to decide path to goal!" failures during exploration. Each
    // think still has a hard ceiling, so the bot can't hang forever.
    bot.pathfinder.thinkTimeout = 15000;
    // BUG-7: default tickTimeout=40ms × physics PHYSICS_CATCHUP_TICKS=4
    // means a single doPhysics() can run 160ms of synchronous A*. Once
    // the accumulator falls behind (one slow GC or the goto thrash below)
    // it never catches up: each 50ms physics interval does ≥160ms of
    // compute, the setInterval refires immediately, and Express I/O
    // starves — /state times out even though no single call blocks for
    // more than 40ms. 10ms keeps worst-case catchup at 40ms, comfortably
    // under the 50ms tick so the loop drains and the server stays live.
    bot.pathfinder.tickTimeout = 10;
    // BUG-3 root cause: default searchRadius is -1 (unbounded). Underground
    // with canDig=true, every voxel is a valid A* neighbor — a single 15s
    // think can allocate tens of millions of nodes and blow the heap. Cap
    // f-cost to heuristic+64 so A* stays in a bounded shell around the goal.
    // See node_modules/mineflayer-pathfinder/lib/astar.js:51,95.
    bot.pathfinder.searchRadius = 64;
    if (TICK_RATE !== 20) bot.chat(`/tick rate ${TICK_RATE}`);
    spawnPos = bot.entity.position.clone();
    console.log('[bot] spawned at', bot.entity.position, `tick_rate=${TICK_RATE}`);
    if (!viewerStarted) {
      try {
        // firstPerson: true → camera rides on the bot's head and follows.
        // The default third-person mode is a free-orbit camera, which means
        // you watch the bot walk out of frame. First-person is what you
        // want for a demo audience: they see what the AI sees, the world
        // moves with the bot, and mining-target highlights are visible.
        mineflayerViewer(bot, { port: VIEWER_PORT, firstPerson: true });
        viewerStarted = true;
        console.log(`[bot] prismarine-viewer on http://localhost:${VIEWER_PORT}`);
      } catch (e) {
        console.log('[bot] viewer failed to start:', e.message);
      }
    }
  });

  bot.on('playerCollect', (collector, collected) => {
    if (collector !== bot.entity) return;
    checkMilestones();
    // Diamond competition: count each diamond item the bot picks up and
    // emit a uniquely-ID'd achievement (diamond_1, diamond_2, …). The
    // leaderboard sorts by diamonds_mined desc, tokens asc.
    try {
      const dropped = collected?.getDroppedItem?.();
      if (dropped && dropped.name === 'diamond') {
        const qty = dropped.count || 1;
        for (let i = 0; i < qty; i++) {
          diamondsCollected += 1;
          reportDiamond(diamondsCollected);
        }
      }
    } catch (e) {
      console.log('[diamond] pickup count error:', e.message);
    }
  });
  bot.on('diggingCompleted', () => reportAchievement('quest', 'first_block'));
  bot.on('kicked', (reason) => console.log('[bot] kicked:', reason));
  bot.on('error', (err) => console.log('[bot] error:', err.message));
  bot.on('end', (reason) => {
    console.log('[bot] disconnected:', reason);
    spawned = false;
    busy = false;
    busyTail = Promise.resolve();
    // Reconnect after a short delay so the harness survives server restarts.
    // The viewer stays bound to the old bot instance (frozen view) rather
    // than restarting — prismarine-viewer's HTTP server emits an async
    // 'error' on EADDRINUSE that try/catch can't trap, and a stale viewer
    // is better than a crashed process.
    setTimeout(createBot, 3000);
  });
}

createBot();

// ─── State serialization ────────────────────────────────────────────────────
function snapshotState() {
  if (!bot || !spawned || !bot.entity) {
    return { connected: false, busy, last_error: lastError };
  }

  const pos = bot.entity.position;
  const inventory = bot.inventory.items().map((it) => ({
    name: it.name,
    count: it.count,
    slot: it.slot,
  }));

  const equipped = {
    hand: bot.heldItem ? bot.heldItem.name : null,
    armor: {
      head: bot.inventory.slots[5]?.name || null,
      torso: bot.inventory.slots[6]?.name || null,
      legs: bot.inventory.slots[7]?.name || null,
      feet: bot.inventory.slots[8]?.name || null,
    },
  };

  // Nearby blocks: dedupe by name, keep nearest of each type within 16.
  const nearbyBlocks = [];
  try {
    const found = bot.findBlocks({
      matching: (block) => block && block.name && block.name !== 'air',
      maxDistance: 16,
      count: 256,
    });
    const bestByName = new Map();
    for (const p of found) {
      const block = bot.blockAt(p);
      if (!block) continue;
      const dist = pos.distanceTo(p);
      if (!Number.isFinite(dist)) continue;
      const prev = bestByName.get(block.name);
      if (!prev || dist < prev.distance) {
        bestByName.set(block.name, {
          name: block.name,
          pos: { x: p.x, y: p.y, z: p.z },
          distance: Math.round(dist * 100) / 100,
        });
      }
    }
    for (const v of bestByName.values()) nearbyBlocks.push(v);
    nearbyBlocks.sort((a, b) => a.distance - b.distance);
  } catch (e) {
    // findBlocks can throw if the world isn't loaded yet
  }

  const nearbyEntities = [];
  for (const id in bot.entities) {
    const e = bot.entities[id];
    if (!e || e === bot.entity || !e.position) continue;
    const dist = pos.distanceTo(e.position);
    if (!Number.isFinite(dist) || dist > 32) continue;
    nearbyEntities.push({
      name: e.name || e.username || e.displayName || 'unknown',
      type: e.type,
      pos: { x: e.position.x, y: e.position.y, z: e.position.z },
      distance: Math.round(dist * 100) / 100,
    });
  }
  nearbyEntities.sort((a, b) => a.distance - b.distance);

  return {
    connected: true,
    tick_rate: TICK_RATE,
    position: { x: pos.x, y: pos.y, z: pos.z },
    health: bot.health,
    food: bot.food,
    time_of_day: bot.time?.timeOfDay ?? null,
    dimension: bot.game?.dimension ?? null,
    inventory,
    equipped,
    nearby_blocks: nearbyBlocks,
    nearby_entities: nearbyEntities,
    diamonds_collected: diamondsCollected,
    best_run_diamonds: Math.max(bestRunDiamonds, diamondsCollected),
    run_elapsed_ms: runStartedAt != null ? Date.now() - runStartedAt : null,
    busy,
    last_error: lastError,
  };
}

// ─── Action helpers ─────────────────────────────────────────────────────────
const mcData = () => require('minecraft-data')(bot.version);

const ACTION_TIMEOUT_MS = parseInt(process.env.ACTION_TIMEOUT_MS || '90000', 10);

// Queue concurrent action requests instead of rejecting. Callers (CMA
// subagents, racing participant agents) can fire actions in parallel; the
// bot serializes them in FIFO order via a promise chain. The timeout,
// position-fixup, and milestone-check semantics per-action are unchanged.
let busyTail = Promise.resolve();

async function withBusy(fn) {
  const run = async () => {
    busy = true;
    const snap = bot?.entity?.position?.clone?.();
    // BUG-7: Promise.race doesn't cancel the loser. When the 90s timeout
    // wins, fn() (e.g. mine_block's for-loop) keeps running orphaned,
    // calling pathfinder.goto() again on the next position. The next
    // queued action then starts its own goto, and the two fight via
    // setGoal — each fires the other's goal_updated listener, producing
    // the "goal was changed before it could be completed" errors and a
    // resetPath storm that drives the physics-catchup spiral (see
    // tickTimeout note above). The signal lets multi-step actions bail
    // the moment the race is lost so the next action runs uncontested.
    const signal = { aborted: false };
    let timer;
    try {
      return await Promise.race([
        fn(signal),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            signal.aborted = true;
            // setGoal(null) halts pathing without the position-corrupting
            // teardown that stop()/collectBlock.cancelTask() can trigger.
            try { bot.pathfinder?.setGoal(null); } catch {}
            try { bot.stopDigging?.(); } catch {}
            reject(new Error(
              `action timed out after ${ACTION_TIMEOUT_MS / 1000}s — target likely ` +
              'unreachable; try go_near somewhere closer first',
            ));
          }, ACTION_TIMEOUT_MS);
        }),
      ]);
    } finally {
      clearTimeout(timer);
      signal.aborted = true; // belt-and-braces: stop orphan even on success
      const p = bot?.entity?.position;
      if (snap && p && !Number.isFinite(p.x)) p.set(snap.x, snap.y, snap.z);
      busy = false;
      checkMilestones();
    }
  };
  const task = busyTail.then(run, run);
  busyTail = task.catch(() => {});
  return task;
}

async function gotoBlock(block, range = 2) {
  const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, range);
  await bot.pathfinder.goto(goal);
}

// Substitute oak_planks (the only species minecraft-data 1.20.6 registers
// for stick / crafting_table / similar tag-based recipes) with whatever
// plank species the bot actually has. Returns a list of recipe objects
// patched in-place with the substituted item id; bot.craft() reads
// inShape/ingredients to drive slot clicks, so the patched recipe just
// works without going through prismarine-recipe's registry.
function trySubstitutePlanks(bot, data, itemId, craftingTable) {
  const oakId = data.itemsByName.oak_planks.id;
  // Pick the first non-oak plank species we have.
  const ourPlank = bot.inventory
    .items()
    .find((it) => it.name.endsWith('_planks') && it.type !== oakId);
  if (!ourPlank) return [];

  const Recipe = require('prismarine-recipe')(bot.registry).Recipe;
  const canonical = Recipe.find(itemId, null);
  if (canonical.length === 0) return [];

  const out = [];
  for (const r of canonical) {
    let touched = false;
    const patched = Object.create(Object.getPrototypeOf(r));
    Object.assign(patched, r);

    if (r.inShape) {
      patched.inShape = r.inShape.map((row) =>
        row.map((cell) => {
          if (cell && cell.id === oakId) {
            touched = true;
            return { id: ourPlank.type, metadata: cell.metadata, count: cell.count };
          }
          return cell;
        }),
      );
    }
    if (r.ingredients) {
      patched.ingredients = r.ingredients.map((cell) => {
        if (cell && cell.id === oakId) {
          touched = true;
          return { id: ourPlank.type, metadata: cell.metadata, count: cell.count };
        }
        return cell;
      });
    }

    if (!touched) continue;
    // Honor the table requirement: a recipe that needs a 3x3 grid still
    // needs a real workbench even after substitution.
    if (patched.requiresTable && !craftingTable) continue;
    out.push(patched);
  }
  return out;
}

// ─── Action implementations ─────────────────────────────────────────────────
// Each action receives (args, signal). signal.aborted flips true when
// withBusy's timeout fires; multi-step actions must check it between
// awaits so an orphaned loop doesn't fight the next queued action.
const actions = {
  async mine_block({ name, max = 1 }, signal) {
    if (!name) throw new Error('mine_block requires {name}');
    const data = mcData();
    const blockType = data.blocksByName[name];
    if (!blockType) throw new Error(`unknown block: ${name}`);

    // BUG-3: bot.collectBlock.collect() OOMs the heap even on a single
    // target. Repro'd at 12 GB with max=1 (~250 MB/s retained while it
    // runs). The plugin installs its own Movements and uses GoalLookAtBlock
    // with raycast-heavy isEnd(); something in that path retains every A*
    // context. Rather than patch node_modules (workshop participants do a
    // clean npm install), do the goto+dig loop ourselves with the
    // searchRadius-bounded pathfinder configured at spawn.
    // Defence-in-depth: also cap max so one call can't queue 40 legs.
    const cappedMax = Math.min(Number(max) || 1, 8);
    const positions = bot.findBlocks({
      matching: blockType.id,
      maxDistance: 64,
      count: cappedMax,
    });
    if (positions.length === 0) throw new Error(`no ${name} within 64 blocks`);

    let collected = 0;
    const errors = [];
    for (const p of positions) {
      // BUG-7: bail the moment withBusy's timeout fires so this loop
      // doesn't keep issuing pathfinder.goto() after the next queued
      // action has started. Without this the orphan and the new action
      // thrash setGoal and the bot livelocks in deepslate.
      if (signal?.aborted) break;
      const block = bot.blockAt(p);
      if (!block || block.type !== blockType.id) continue; // already gone
      try {
        await bot.pathfinder.goto(new goals.GoalGetToBlock(p.x, p.y, p.z));
        if (signal?.aborted) break;
        if (bot.tool) await bot.tool.equipForBlock(block, { requireHarvest: false });
        await bot.dig(bot.blockAt(p));
        collected++;
      } catch (e) {
        errors.push(`${p.x},${p.y},${p.z}: ${e.message}`);
      }
    }
    if (collected === 0 && errors.length > 0) {
      throw new Error(`could not mine any ${name}: ${errors[0]}`);
    }
    const result = { collected };
    if (cappedMax < max) {
      result.note = `max capped to ${cappedMax} (requested ${max}); call again for more`;
    }
    if (errors.length > 0) result.skipped = errors.length;
    return result;
  },

  async craft_item({ name, count = 1 }) {
    if (!name) throw new Error('craft_item requires {name}');
    const data = mcData();
    const item = data.itemsByName[name];
    if (!item) throw new Error(`unknown item: ${name}`);

    // Strategy 1: standard recipesFor with no table (2x2 grid).
    let recipes = bot.recipesFor(item.id, null, 1, null);
    let craftingTable = null;

    // Strategy 2: try with a placed crafting_table within 32 blocks (3x3 grid).
    if (recipes.length === 0) {
      const tableBlock = bot.findBlock({
        matching: data.blocksByName.crafting_table.id,
        maxDistance: 32,
      });
      if (tableBlock) {
        await gotoBlock(tableBlock);
        craftingTable = tableBlock;
        recipes = bot.recipesFor(item.id, null, 1, craftingTable);
      }
    }

    // Strategy 3: minecraft-data 1.20.6 only registers many recipes (stick,
    // crafting_table, etc.) with oak_planks (item id 36) — not jungle/birch/
    // spruce/cherry/etc. If we have non-oak planks in inventory, substitute
    // them into the canonical recipe and try again. Without this, a bot
    // that spawns in a jungle/spruce/cherry biome cannot craft anything.
    if (recipes.length === 0) {
      recipes = trySubstitutePlanks(bot, data, item.id, craftingTable);
    }

    if (recipes.length === 0) {
      if (craftingTable === null) {
        throw new Error(
          `no recipe for ${name} with current inventory; no crafting_table within 32 ` +
          `(if it's a 3x3 recipe, place one first)`
        );
      }
      throw new Error(`no recipe for ${name}`);
    }
    await bot.craft(recipes[0], count, craftingTable);
    return { crafted: name, count };
  },

  async smelt({ input, fuel, count = 1 }) {
    if (!input || !fuel) throw new Error('smelt requires {input, fuel}');
    const data = mcData();
    const furnaceBlock = bot.findBlock({
      matching: data.blocksByName.furnace.id,
      maxDistance: 32,
    });
    if (!furnaceBlock) throw new Error('no furnace within 32');
    await gotoBlock(furnaceBlock);
    const furnace = await bot.openFurnace(furnaceBlock);
    try {
      const inputItem = bot.inventory.items().find((i) => i.name === input);
      const fuelItem = bot.inventory.items().find((i) => i.name === fuel);
      if (!inputItem) throw new Error(`no ${input} in inventory`);
      if (!fuelItem) throw new Error(`no ${fuel} in inventory`);
      await furnace.putInput(inputItem.type, null, count);
      await furnace.putFuel(fuelItem.type, null, 1);

      // BUG-5: a fixed 11s sleep only covers ~1 item (vanilla = 10s/item).
      // Poll until the input slot drains, the output stalls (fuel ran out),
      // or a generous timeout elapses. 12s/item + 5s slack covers vanilla
      // tick rate; faster TICK_RATE just finishes early.
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const putIn = furnace.inputItem()?.count ?? count;
      const deadline = Date.now() + putIn * 12000 + 5000;
      let lastOut = furnace.outputItem()?.count ?? 0;
      let stalledTicks = 0;
      let warning = null;
      while (Date.now() < deadline) {
        await sleep(2000);
        const remaining = furnace.inputItem()?.count ?? 0;
        const produced = furnace.outputItem()?.count ?? 0;
        if (remaining === 0) break; // all smelted
        if (produced > lastOut) {
          lastOut = produced;
          stalledTicks = 0;
        } else if (++stalledTicks >= 3) {
          // ~6s with no progress while input remains → fuel exhausted.
          warning = `fuel exhausted, ${produced} of ${putIn} items smelted`;
          break;
        }
      }
      if (!warning && (furnace.inputItem()?.count ?? 0) > 0) {
        warning = `timed out after ${putIn * 12 + 5}s with input remaining`;
      }

      let out = null;
      if (furnace.outputItem()) out = await furnace.takeOutput();
      const result = {
        ok: true,
        smelted: out ? out.name : null,
        count: out ? out.count : 0,
      };
      if (warning) result.warning = warning;
      return result;
    } finally {
      furnace.close();
    }
  },

  async go_near({ block_name, entity_name, pos }) {
    if (pos) {
      await bot.pathfinder.goto(new goals.GoalNear(pos.x, pos.y, pos.z, 1));
      return { arrived: pos };
    }
    if (block_name) {
      const data = mcData();
      const block = data.blocksByName[block_name];
      if (!block) throw new Error(`unknown block: ${block_name}`);
      const found = bot.findBlock({ matching: block.id, maxDistance: 96 });
      if (!found) throw new Error(`no ${block_name} within 96`);
      await gotoBlock(found);
      return { arrived_at: found.position };
    }
    if (entity_name) {
      const target = Object.values(bot.entities).find(
        (e) => e && (e.name === entity_name || e.username === entity_name)
      );
      if (!target) throw new Error(`no entity ${entity_name} nearby`);
      await bot.pathfinder.goto(
        new goals.GoalNear(target.position.x, target.position.y, target.position.z, 2)
      );
      return { arrived_at: target.position };
    }
    throw new Error('go_near requires {block_name|entity_name|pos}');
  },

  async place_block({ name, against }) {
    if (!name) throw new Error('place_block requires {name}');
    const item = bot.inventory.items().find((i) => i.name === name);
    if (!item) throw new Error(`no ${name} in inventory`);
    await bot.equip(item, 'hand');

    const Vec3 = require('vec3').Vec3 || require('vec3');

    if (against) {
      // Caller supplied an explicit reference block: place on its top face.
      const referenceBlock = bot.blockAt(new Vec3(against.x, against.y, against.z));
      if (!referenceBlock) throw new Error('no reference block at given pos');
      await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
      const at = { x: against.x, y: against.y + 1, z: against.z };
      notePlacedBlock(name, at);
      return { placed: name, at };
    }

    // Auto-pick a target. Strategy: scan a 5x3x5 region around the bot. For
    // each candidate target position p, find a face vector to a solid
    // neighbor (the reference block). Skip targets that intersect the bot's
    // own hitbox, and skip if the resulting placement would be too far to
    // reach. Try each candidate; the first one bot.placeBlock accepts wins.
    const feet = bot.entity.position.floored();
    const faces = [
      new Vec3(0, 1, 0),
      new Vec3(0, -1, 0),
      new Vec3(1, 0, 0),
      new Vec3(-1, 0, 0),
      new Vec3(0, 0, 1),
      new Vec3(0, 0, -1),
    ];
    const candidates = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (dx === 0 && dz === 0 && (dy === 0 || dy === 1)) continue; // bot hitbox
          const targetPos = feet.offset(dx, dy, dz);
          const targetBlock = bot.blockAt(targetPos);
          if (!targetBlock || targetBlock.name !== 'air') continue;
          candidates.push(targetPos);
        }
      }
    }
    // Sort by distance from feet so we prefer close placements.
    candidates.sort((a, b) => feet.distanceTo(a) - feet.distanceTo(b));

    for (const targetPos of candidates) {
      for (const face of faces) {
        const refPos = targetPos.minus(face);
        const refBlock = bot.blockAt(refPos);
        if (!refBlock || refBlock.name === 'air') continue;
        if (refBlock.boundingBox !== 'block') continue;
        try {
          await bot.lookAt(refPos.offset(0.5, 0.5, 0.5), true);
          await bot.placeBlock(refBlock, face);
          const at = { x: targetPos.x, y: targetPos.y, z: targetPos.z };
          notePlacedBlock(name, at);
          return { placed: name, at };
        } catch (e) {
          // Try the next face / candidate
        }
      }
    }
    throw new Error('no valid adjacent ground spot to place block');
  },

  async equip({ name, destination = 'hand' }) {
    if (!name) throw new Error('equip requires {name}');
    const item = bot.inventory.items().find((i) => i.name === name);
    if (!item) throw new Error(`no ${name} in inventory`);
    await bot.equip(item, destination);
    return { equipped: name, destination };
  },

  async drop({ name, count = 1 }) {
    if (!name) throw new Error('drop requires {name}');
    const item = bot.inventory.items().find((i) => i.name === name);
    if (!item) throw new Error(`no ${name} in inventory`);
    await bot.toss(item.type, null, count);
    return { dropped: name, count };
  },

  // Halt whatever the bot is doing. Called by my_agent.py's deadline
  // watchdog so the viewer cleanly stops at 5:05 instead of finishing
  // a long go_near. Not exposed via MCP — direct HTTP only.
  async stop() {
    try { bot.pathfinder?.setGoal(null); } catch {}
    try { bot.stopDigging?.(); } catch {}
    try { bot.collectBlock?.cancelTask?.(); } catch {}
    return { stopped: true };
  },

  async chat({ text }) {
    if (!text) throw new Error('chat requires {text}');
    bot.chat(text);
    reportAchievement('quest', 'chat_to_player');
    reportNarration('chat', text);
    return { said: text };
  },

  // Called by my_agent.py at the start of each run so per-run diamond
  // counts begin at 0 even when the bot/world process persists across runs.
  // Every run is official (posts to leaderboard) and applies the fixed
  // start_kit. runStartedAt is the anti-abuse anchor: every achievement
  // POST carries run_elapsed_ms = now - runStartedAt and the leaderboard
  // rejects anything past 305s, so extending the client-side deadline
  // gains nothing. bot_hash in webhook meta lets verify.py confirm this
  // file wasn't tampered.
  async reset_run() {
    bestRunDiamonds = Math.max(bestRunDiamonds, diamondsCollected);
    diamondsCollected = 0;
    achieved.clear();
    officialRun = true;
    runStartedAt = Date.now();
    if (spawnPos) {
      // Carve a lit 3×3×3 room at diamond depth under spawn x/z and TP
      // into it, so the run begins at "find veins" rather than "descend
      // 120 blocks". Lit because an unlit 2×2 deepslate pocket renders as
      // a black screen in the viewer (Matt's "bats floating in void").
      const sx = Math.floor(spawnPos.x), sz = Math.floor(spawnPos.z);
      const y = START_KIT_Y;
      console.log(`[reset_run] start_kit: carving lit room at (${sx},${y},${sz})`);
      // Death protection: at depth the bot can fall into a cavern or
      // hit lava. keepInventory + spawnpoint-in-the-pocket turns a
      // death from "run over, respawn at surface with nothing" into
      // "lost a few seconds, back in the room with the kit intact."
      // Pace commands ~120ms apart — vanilla server's spam protection
      // kicks at ~10 chats/half-second with disconnect.spam, which
      // drops the start_kit on the floor mid-apply.
      const cmd = async (s) => { bot.chat(s); await new Promise((r) => setTimeout(r, 120)); };
      await cmd('/gamerule keepInventory true');
      await cmd('/clear @s');
      await cmd(`/fill ${sx - 1} ${y} ${sz - 1} ${sx + 1} ${y + 2} ${sz + 1} air`);
      await cmd(`/fill ${sx - 1} ${y - 1} ${sz - 1} ${sx + 1} ${y - 1} ${sz + 1} cobblestone`);
      await cmd(`/setblock ${sx - 1} ${y + 1} ${sz} wall_torch[facing=east]`);
      await cmd(`/setblock ${sx + 1} ${y + 1} ${sz} wall_torch[facing=west]`);
      await cmd(`/setblock ${sx} ${y + 1} ${sz - 1} wall_torch[facing=south]`);
      await cmd(`/setblock ${sx} ${y + 1} ${sz + 1} wall_torch[facing=north]`);
      await cmd(`/tp @s ${sx + 0.5} ${y} ${sz + 0.5}`);
      await cmd(`/spawnpoint @s ${sx} ${y} ${sz}`);
      for (const [item, n] of START_KIT) await cmd(`/give @s ${item} ${n}`);
      await new Promise((r) => setTimeout(r, 300));
      // Verify op commands actually took effect. If the bot isn't in
      // ops.json, the server silently ignores /tp /give /fill and the
      // run starts at the surface with nothing — surface that here.
      const py = bot.entity.position.y;
      if (py > 0) {
        return {
          reset: true,
          ok: false,
          error: `start_kit op commands had no effect (still at y=${Math.round(py)}). `
            + `Bot is not an operator — bot/server*/ops.json is missing or `
            + `has the wrong username. Fix: ./setup.sh --restart`,
        };
      }
    }
    return { reset: true, official: officialRun, start_kit: true };
  },
};

// Captured on first spawn so reset_run() can TP back.
let spawnPos = null;
let runStartedAt = null;
// Fixed competition parameters. NOT env-overridable: every participant
// starts at the same depth with the same kit. Changing these changes
// bot_hash and gets caught by verify.py on top-3 review.
// y=-40: ~18 blocks above peak diamond density. Still requires a
// deliberate descent (one go_near or several mine_blocks — a real
// prompt-tuning lever) but doesn't eat half a 5-min run the way
// y=-25 did, and is above the heavy lava band that starts ~-54.
const START_KIT_Y = -40;
const START_KIT = [
  ['iron_pickaxe', 1],
  ['crafting_table', 1],
  ['iron_ingot', 3],
  ['stick', 4],
  ['oak_log', 16],
  ['torch', 16],
];

// ─── Achievements (milestones + side quests) ────────────────────────────────
// Backend-agnostic leaderboard reporting. bot.js observes game state and
// POSTs each achievement to LEADERBOARD_URL exactly once. Fire-and-forget;
// gameplay never blocks on it. Works identically whether the driving agent
// is the Messages-API harness, the Agent SDK, or Managed Agents.
//
// Score formula (computed leaderboard-side, not here):
//   (iron ? 1000 : milestone_idx*200) + (bonus_milestones*200)
//     + (quests*100) - (tokens/100) - (turns*2)

// DEPRECATED: 'diamond' here is the one-shot milestone kept for audit/back-
// compat only. It no longer drives the leaderboard — see the cumulative
// diamond counter and reportDiamond() below, which emit diamond_1,
// diamond_2, … per-pickup for the Agent Battle scoring model
// (diamonds_mined desc, tokens asc).
const MILESTONES = [
  'wooden_pickaxe', 'stone_pickaxe', 'furnace', 'iron_ingot',
  'iron_pickaxe', 'diamond',
];
const QUESTS = [
  'first_block', 'chat_to_player', 'meet_a_friend',
  'home_builder', 'light_it_up', 'deep_diver',
];
const PASSIVE_MOBS = new Set([
  'cow', 'pig', 'sheep', 'chicken', 'horse', 'donkey', 'rabbit',
  'wolf', 'cat', 'ocelot', 'fox', 'parrot', 'llama', 'bee',
]);

const achieved = new Set();
const placedPositions = [];
let friendNearSince = null;
// Always true under the every-run-counts model; reset_run sets it on
// each call. Kept as a variable so demo.sh / bench.sh can suppress
// posting when running multiple stacks against a local-only board.
let officialRun = true;

// Webhook auth: prefer per-participant JWT (PARTICIPANT_TOKEN), fall back to
// the legacy shared secret (LEADERBOARD_KEY). Server accepts either.
function lbHeaders() {
  const h = { 'content-type': 'application/json' };
  if (process.env.PARTICIPANT_TOKEN) {
    h['authorization'] = `Bearer ${process.env.PARTICIPANT_TOKEN}`;
  }
  if (process.env.LEADERBOARD_KEY) {
    h['x-workshop-key'] = process.env.LEADERBOARD_KEY;
  }
  return h;
}

function reportAchievement(kind, id) {
  if (achieved.has(id)) return;
  achieved.add(id);
  console.log(`[${kind}] ${id}`);
  const base = process.env.LEADERBOARD_URL;
  if (!base || !officialRun) return;
  fetch(`${base.replace(/\/$/, '')}/achievement`, {
    method: 'POST',
    headers: lbHeaders(),
    body: JSON.stringify({
      participant: process.env.PARTICIPANT || 'unknown',
      kind,
      id,
      ts: Date.now(),
      run_elapsed_ms: runStartedAt != null ? Date.now() - runStartedAt : null,
      meta: { tick_rate: TICK_RATE },
    }),
  }).catch((e) => console.log(`[${kind}] post failed:`, e.message));
}

// Emit a diamond achievement with the running count baked into the ID so
// every pickup produces a unique, idempotent webhook fire (diamond_1,
// diamond_2, …). Reuses the dedupe Set inside reportAchievement — if the
// bot restarts mid-run, the agent MUST reset diamondsCollected back to 0
// to preserve idempotence on the server side. We don't persist the counter
// across process boundaries on purpose: the 45-minute clock starts fresh
// from an empty inventory every time.
function reportDiamond(n) {
  reportAchievement('milestone', `diamond_${n}`);
}

function reportNarration(kind, text) {
  const base = process.env.LEADERBOARD_URL;
  if (!base || !officialRun) return;
  fetch(`${base.replace(/\/$/, '')}/narration`, {
    method: 'POST',
    headers: lbHeaders(),
    body: JSON.stringify({
      participant: process.env.PARTICIPANT || 'unknown',
      kind,
      text,
      ts: Date.now(),
    }),
  }).catch((e) => console.log('[narration] post failed:', e.message));
}

function checkMilestones() {
  if (!bot || !spawned) return;
  const have = new Set(bot.inventory.items().map((it) => it.name));
  for (const m of MILESTONES) {
    if (have.has(m)) reportAchievement('milestone', m);
  }
}

function notePlacedBlock(name, pos) {
  if (name === 'torch') reportAchievement('quest', 'light_it_up');
  if (!pos) return;
  placedPositions.push(pos);
  if (achieved.has('home_builder')) return;
  for (const anchor of placedPositions) {
    let n = 0;
    for (const p of placedPositions) {
      const dx = p.x - anchor.x, dy = p.y - anchor.y, dz = p.z - anchor.z;
      if (dx * dx + dy * dy + dz * dz <= 100) n++;
    }
    if (n >= 4) { reportAchievement('quest', 'home_builder'); break; }
  }
}

function periodicQuestCheck() {
  if (!bot || !spawned || !bot.entity) return;
  const pos = bot.entity.position;
  if (pos.y < 30) reportAchievement('quest', 'deep_diver');

  // meet_a_friend: any passive mob within 4 blocks, sustained for 3+ seconds.
  let friendNear = false;
  for (const id in bot.entities) {
    const e = bot.entities[id];
    if (!e || e === bot.entity || !e.position) continue;
    if (PASSIVE_MOBS.has(e.name) && pos.distanceTo(e.position) <= 4) {
      friendNear = true;
      break;
    }
  }
  if (friendNear) {
    if (friendNearSince === null) friendNearSince = Date.now();
    else if (Date.now() - friendNearSince >= 3000) {
      reportAchievement('quest', 'meet_a_friend');
    }
  } else {
    friendNearSince = null;
  }
}

setInterval(periodicQuestCheck, 1000);

// ─── MCP tool schemas ───────────────────────────────────────────────────────
// Port of harness/tools.py — same names/descriptions/shapes — plus get_state.
// All three workshop backends (Messages API, Agent SDK, Managed Agents)
// consume MCP natively, so declaring schemas here once means every backend
// discovers them via list_tools instead of re-authoring per client.
const _REASONING = {
  type: 'string',
  description: 'One sentence: why this action, right now. Logged but not executed.',
};

const MCP_TOOLS = [
  {
    name: 'get_state',
    description:
      'Returns current game state: position, health, food, inventory, ' +
      'equipped items, nearby blocks (deduped, within 16), nearby entities. ' +
      'Call this before deciding an action and after each action to see ' +
      'what changed.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'mine_block',
    description:
      'Walk to and mine the nearest blocks of the given type. Use this to ' +
      'gather raw materials (logs, stone, ores). The block must exist within ' +
      "~64 blocks of the bot, ideally one you can see in nearby_blocks. " +
      "Returns 'no <name> within 64 blocks' if none found.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Block name, e.g. 'oak_log', 'stone', 'iron_ore', 'coal_ore'." },
        max: { type: 'integer', description: 'How many to collect. Default 1, hard-capped at 8 per call; call again for more.', default: 1 },
        reasoning: _REASONING,
      },
      required: ['name'],
    },
  },
  {
    name: 'craft_item',
    description:
      'Craft an item using inventory ingredients. 2x2 recipes (planks, ' +
      'sticks, crafting_table) work from inventory. 3x3 recipes (any ' +
      'pickaxe, furnace, etc.) require a placed crafting_table within 32 ' +
      'blocks — the bot will pathfind to it automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Item name, e.g. 'oak_planks', 'stick', 'wooden_pickaxe'." },
        count: { type: 'integer', description: 'Number of times to apply the recipe. Default 1.', default: 1 },
        reasoning: _REASONING,
      },
      required: ['name'],
    },
  },
  {
    name: 'smelt',
    description:
      'Smelt one item type in a placed furnace within 32 blocks, using a ' +
      'fuel item from inventory (e.g. coal, oak_planks). Place the furnace ' +
      "first if there isn't one nearby.",
    inputSchema: {
      type: 'object',
      properties: {
        input: { type: 'string', description: "Item to smelt, e.g. 'raw_iron'." },
        fuel: { type: 'string', description: "Fuel item, e.g. 'coal' or 'oak_planks'." },
        count: { type: 'integer', default: 1 },
        reasoning: _REASONING,
      },
      required: ['input', 'fuel'],
    },
  },
  {
    name: 'place_block',
    description:
      'Place a block from inventory next to the bot. Use this to put down a ' +
      'crafting_table or furnace before crafting items that need them.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Block name in inventory.' },
        reasoning: _REASONING,
      },
      required: ['name'],
    },
  },
  {
    name: 'equip',
    description:
      "Equip an item to a slot. Use destination='hand' before mining stone " +
      "or ores so the pickaxe is in hand and the drops aren't lost.",
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name in inventory.' },
        destination: {
          type: 'string',
          description: "Slot: 'hand', 'head', 'torso', 'legs', 'feet'. Default 'hand'.",
          default: 'hand',
        },
        reasoning: _REASONING,
      },
      required: ['name'],
    },
  },
  {
    name: 'go_near',
    description:
      'Walk near a target. Provide ONE of: block_name (nearest of that type ' +
      'within 64), entity_name (nearest entity matching), or pos {x,y,z}. ' +
      "Use this to reposition before mining a block the bot can't currently see.",
    inputSchema: {
      type: 'object',
      properties: {
        block_name: { type: 'string' },
        entity_name: { type: 'string' },
        pos: {
          type: 'object',
          properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
        },
        reasoning: _REASONING,
      },
    },
  },
  {
    name: 'drop',
    description: 'Drop items from inventory onto the ground. Use to discard junk.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'integer', default: 1 },
        reasoning: _REASONING,
      },
      required: ['name'],
    },
  },
  {
    name: 'chat',
    description:
      "Say something in-game chat. Use to narrate what you're doing — this " +
      'shows up in the demo viewer for the audience. Cheap and ' +
      "doesn't count toward your turn budget.",
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        reasoning: _REASONING,
      },
      required: ['text'],
    },
  },
];

async function dispatchMcpTool(name, args) {
  if (name === 'get_state') {
    return snapshotState();
  }
  if (!actions[name]) throw new Error(`unknown tool: ${name}`);
  if (!spawned) throw new Error('bot not spawned yet');
  // Strip reasoning (logged only) and dispatch to the same action map the
  // express POST /action route uses. No duplicated logic.
  const { reasoning, ...actionArgs } = args || {};
  if (reasoning) console.log(`[mcp ${name}] reasoning: ${reasoning}`);
  const result = await withBusy((signal) => actions[name](actionArgs, signal));
  lastError = null;
  checkMilestones();
  return { ok: true, ...result };
}

// ─── HTTP server ────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// Bearer-token auth gate for /action and /mcp. /state stays open (read-only,
// used by liveness checks and prismarine-viewer sidecars). No-op when
// BOT_TOKEN is unset/empty — see startup warning below.
function requireAuth(req, res, next) {
  if (!BOT_TOKEN) return next();
  const hdr = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/.exec(hdr);
  if (!m) return res.status(401).json({ ok: false, error: 'missing bearer token' });
  const got = Buffer.from(m[1]);
  const want = Buffer.from(BOT_TOKEN);
  // timingSafeEqual requires equal-length buffers; guard first so a length
  // mismatch doesn't throw a 500 instead of a clean 401.
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
    return res.status(401).json({ ok: false, error: 'invalid bearer token' });
  }
  next();
}

// Viewer with a HUD overlay (diamond counter, y-position, inventory).
// Wraps the prismarine-viewer iframe so participants get live feedback
// on what the agent has — the raw :3007 view is just the world with no
// inventory, which reads as a black room until something happens.
app.get('/view', (_req, res) => {
  res.type('html').send(`<!doctype html>
<title>${process.env.PARTICIPANT || 'agent'} — bot view</title>
<style>
  body{margin:0;font:14px/1.4 ui-monospace,Menlo,monospace;background:#000;color:#eee}
  iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
  #hud{position:fixed;top:12px;left:12px;padding:12px 16px;background:rgba(0,0,0,.75);
       border:1px solid #444;border-radius:8px;min-width:240px;backdrop-filter:blur(4px)}
  #diamonds{font-size:28px;font-weight:600;margin-bottom:6px}
  #pos{color:#9ca3af;margin-bottom:10px}
  #inv{display:flex;flex-wrap:wrap;gap:6px;max-width:320px}
  .slot{padding:4px 8px;background:#1f2937;border:1px solid #374151;border-radius:4px;
        font-size:12px;white-space:nowrap}
  .slot.diamond{background:#0e7490;border-color:#22d3ee}
  .slot.pick{background:#374151;border-color:#9ca3af}
  #status{position:fixed;bottom:12px;left:12px;color:#6b7280;font-size:11px}
</style>
<iframe id=world></iframe>
<div id=hud>
  <div id=diamonds>💎 —</div>
  <div id=best style="font-size:14px;font-weight:600;color:#22c55e">best run: 💎 —</div>
  <div id=clock style="font-size:18px;font-weight:600;color:#fbbf24">⏱ —</div>
  <div id=pos>y: —</div>
  <div id=inv></div>
</div>
<div id=status>polling /state…</div>
<script>
document.getElementById('world').src='http://'+location.hostname+':${VIEWER_PORT}';
async function tick(){
  try{
    const r=await fetch('/state');const s=await r.json();
    const d=s.diamonds_collected??0;
    document.getElementById('diamonds').textContent='💎 '+d;
    const b=s.best_run_diamonds??0;
    document.getElementById('best').textContent='best run: 💎 '+b;
    const RUN=300; const el=s.run_elapsed_ms;
    const clk=document.getElementById('clock');
    if(el==null){clk.textContent='⏱ no run yet';clk.style.color='#6b7280'}
    else if(el>=RUN*1000){clk.textContent='⏱ TIME — run over';clk.style.color='#ef4444'}
    else{const left=RUN-Math.floor(el/1000);
      clk.textContent='⏱ '+Math.floor(left/60)+':'+String(left%60).padStart(2,'0')+' / 5:00';
      clk.style.color=left<60?'#ef4444':'#fbbf24'}
    const p=s.position||{};
    document.getElementById('pos').textContent=
      'y: '+(p.y!=null?Math.round(p.y):'—')+'   x:'+Math.round(p.x||0)+' z:'+Math.round(p.z||0);
    const inv=document.getElementById('inv');inv.replaceChildren();
    for(const it of (s.inventory||[]).slice(0,18)){
      const el=document.createElement('span');el.className='slot';
      if(/diamond/.test(it.name))el.classList.add('diamond');
      if(/pickaxe/.test(it.name))el.classList.add('pick');
      el.textContent=it.name.replace(/_/g,' ')+(it.count>1?' ×'+it.count:'');
      inv.appendChild(el);
    }
    document.getElementById('status').textContent=
      (s.connected?'connected':'DISCONNECTED')+' · '+new Date().toLocaleTimeString();
  }catch(e){document.getElementById('status').textContent='error: '+e.message}
}
tick();setInterval(tick,2000);
</script>`);
});

app.get('/state', (req, res) => {
  try {
    res.json(snapshotState());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/action', requireAuth, async (req, res) => {
  const { name, args } = req.body || {};
  if (!name) return res.status(400).json({ ok: false, error: 'missing action name' });
  if (!actions[name]) return res.status(400).json({ ok: false, error: `unknown action: ${name}` });
  if (!spawned) return res.status(503).json({ ok: false, error: 'bot not spawned yet' });
  // reset_run and stop must preempt: --eval can leave long go_near/
  // mine_block calls queued (4 concurrent probes × up to 90s each),
  // and a reset_run that queues behind them times out the harness.
  // Cancel the in-flight action AND drop the pending queue, then run
  // outside withBusy so it can't be blocked.
  if (name === 'stop' || name === 'reset_run') {
    try {
      try { bot.pathfinder?.setGoal(null); } catch {}
      try { bot.stopDigging?.(); } catch {}
      try { bot.collectBlock?.cancelTask?.(); } catch {}
      busyTail = Promise.resolve();
      busy = false;
      const result = await actions[name](args || {});
      lastError = null;
      return res.json({ ok: true, ...result });
    } catch (e) {
      lastError = e.message;
      return res.json({ ok: false, error: e.message });
    }
  }
  // Concurrent requests queue inside withBusy; no upfront 409.
  try {
    const result = await withBusy((signal) => actions[name](args || {}, signal));
    lastError = null;
    res.json({ ok: true, ...result });
  } catch (e) {
    lastError = e.message;
    console.log(`[action ${name}] error:`, e.message);
    res.json({ ok: false, error: e.message });
  }
});

// ─── MCP server (Streamable HTTP) ───────────────────────────────────────────
// Mounted on the SAME express app at /mcp, alongside GET /state and
// POST /action. The MCP SDK is ESM-only and bot.js is CJS, so we load it
// via dynamic import(). One Server+transport per session, keyed by the
// mcp-session-id header the transport assigns on initialize.
async function setupMcp() {
  const { randomUUID } = require('node:crypto');
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { ListToolsRequestSchema, CallToolRequestSchema, isInitializeRequest } = await import(
    '@modelcontextprotocol/sdk/types.js'
  );

  const transports = {};

  function buildServer() {
    const mcp = new Server(
      { name: 'minecraft-bot', version: '0.1.0' },
      { capabilities: { tools: {} } },
    );
    mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: MCP_TOOLS }));
    mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
      const { name, arguments: args } = req.params;
      try {
        const result = await dispatchMcpTool(name, args);
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (e) {
        lastError = String(e.message || e);
        console.log(`[mcp ${name}] error:`, lastError);
        return {
          content: [{ type: 'text', text: JSON.stringify({ ok: false, error: lastError }) }],
          isError: true,
        };
      }
    });
    return mcp;
  }

  app.post('/mcp', requireAuth, async (req, res) => {
    const sid = req.headers['mcp-session-id'];
    let transport = sid && transports[sid];
    if (!transport) {
      if (sid || !isInitializeRequest(req.body)) {
        return res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'no valid session' },
          id: null,
        });
      }
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => { transports[id] = transport; },
      });
      transport.onclose = () => {
        if (transport.sessionId) delete transports[transport.sessionId];
      };
      await buildServer().connect(transport);
    }
    await transport.handleRequest(req, res, req.body);
  });

  const handleSession = async (req, res) => {
    const sid = req.headers['mcp-session-id'];
    const transport = sid && transports[sid];
    if (!transport) return res.status(400).send('invalid session');
    await transport.handleRequest(req, res);
  };
  app.get('/mcp', requireAuth, handleSession);
  app.delete('/mcp', requireAuth, handleSession);

  console.log(`[bot] MCP server on http://localhost:${HTTP_PORT}/mcp`);
}

setupMcp().catch((e) => console.log('[bot] MCP setup failed:', e));

app.listen(HTTP_PORT, () => {
  console.log(`[bot] HTTP API on http://localhost:${HTTP_PORT}`);
  if (BOT_TOKEN) {
    console.log(`[bot] auth: BOT_TOKEN set (${BOT_TOKEN.length} chars) — /action and /mcp require Bearer token`);
  } else {
    console.log('[bot] WARNING: BOT_TOKEN not set — /action and /mcp are UNAUTHENTICATED (dev mode)');
  }
});
