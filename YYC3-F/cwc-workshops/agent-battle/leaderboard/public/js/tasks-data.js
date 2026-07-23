// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// Minecraft workshop achievements.
//
// Points are assigned so a simple SUM matches Matt's formula:
//   (iron ? 1000 : milestone_idx*200) + (bonus_milestones*200) + (quests*100)
// Game mechanics enforce the milestone chain (you can't smelt iron without
// a furnace, can't mine iron without a stone pick, can't get cobble without
// a wooden pick), so reaching iron_ingot always means 200+200+200+400 = 1000.
//
// Cost penalty (-tokens/100 - turns*2) is applied in the SQL leaderboard
// view from the run_costs table, not here.

const TASKS = [
  // ─── Milestones (progression) ────────────────────────────────────────────
  {
    id: 'wooden_pickaxe',
    title: 'Wooden Pickaxe',
    subtitle: 'logs → planks → sticks → crafting table → pickaxe',
    category: 'milestone',
    points: 200,
    content: '<p>The first tool. Requires placing a crafting table.</p>',
  },
  {
    id: 'stone_pickaxe',
    title: 'Stone Pickaxe',
    subtitle: 'mine cobblestone with the wooden pick, upgrade',
    category: 'milestone',
    points: 200,
    content: '<p>Equip the wooden pickaxe before mining stone or it drops nothing.</p>',
  },
  {
    id: 'furnace',
    title: 'Furnace',
    subtitle: '8 cobblestone at the crafting table',
    category: 'milestone',
    points: 200,
    content: '<p>Needed to smelt raw iron into ingots.</p>',
  },
  {
    id: 'iron_ingot',
    title: 'Iron Ingot — PRIMARY OBJECTIVE',
    subtitle: 'mine raw_iron with stone pick → smelt in furnace',
    category: 'milestone',
    points: 400,
    content: '<p><strong>This is the workshop goal.</strong> Cumulative 1000 pts at this point.</p>',
  },
  {
    id: 'iron_pickaxe',
    title: 'Iron Pickaxe',
    subtitle: 'bonus glory — 3 ingots + 2 sticks',
    category: 'milestone',
    points: 200,
    content: '<p>Beyond the primary objective. Bragging rights.</p>',
  },
  {
    id: 'diamond',
    title: 'Diamond',
    subtitle: 'bonus glory — deep mining with iron pick',
    category: 'milestone',
    points: 200,
    content: '<p>If you get here in 15 minutes, you win the room.</p>',
  },

  // ─── Side quests (character) ─────────────────────────────────────────────
  {
    id: 'first_block',
    title: 'First Block',
    subtitle: 'mine anything',
    category: 'quest',
    points: 100,
    content: '<p>Free points for getting started.</p>',
  },
  {
    id: 'chat_to_player',
    title: 'Say Hello',
    subtitle: 'use the chat tool',
    category: 'quest',
    points: 100,
    content: '<p>Have your agent narrate or greet the audience.</p>',
  },
  {
    id: 'meet_a_friend',
    title: 'Meet a Friend',
    subtitle: 'stand near a passive mob for 3+ seconds',
    category: 'quest',
    points: 100,
    content: '<p>Cows, pigs, sheep, chickens — go say hi.</p>',
  },
  {
    id: 'home_builder',
    title: 'Home Builder',
    subtitle: 'place 4+ blocks within a 10-block radius',
    category: 'quest',
    points: 100,
    content: '<p>Crafting table + furnace + a couple more counts.</p>',
  },
  {
    id: 'light_it_up',
    title: 'Light It Up',
    subtitle: 'place a torch',
    category: 'quest',
    points: 100,
    content: '<p>Coal + stick → torch. Place it anywhere.</p>',
  },
  {
    id: 'deep_diver',
    title: 'Deep Diver',
    subtitle: 'reach y < 30',
    category: 'quest',
    points: 100,
    content: '<p>Dig down. Mind the lava.</p>',
  },
];

// Map for server-side point lookup (used by achievement.mjs).
const TASK_POINTS = Object.fromEntries(TASKS.map(t => [t.id, t.points]));

// app.js expects CORE_TASKS (sequential progression) and BONUS_TASKS
// (extras). Map milestones → core, quests → bonus.
const CORE_TASKS = TASKS.filter(t => t.category === 'milestone');
const BONUS_TASKS = TASKS.filter(t => t.category === 'quest');

if (typeof module !== 'undefined') {
  module.exports = { TASKS, TASK_POINTS, CORE_TASKS, BONUS_TASKS };
}
if (typeof window !== 'undefined') {
  window.TASKS = TASKS;
  window.TASK_POINTS = TASK_POINTS;
  window.CORE_TASKS = CORE_TASKS;
  window.BONUS_TASKS = BONUS_TASKS;
}
