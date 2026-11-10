// Spike: verify the Jev call path through the Vercel AI Gateway.
// Run: npm run smoke   (reads AI_GATEWAY_API_KEY from the repo-root .env; never prints it)
// All states below are synthetic — no private data leaves the machine.
import { experimental_evaluate as evaluate } from 'ai';
import { mkdirSync, writeFileSync } from 'node:fs';

const MODEL = 'typesafe-ai/jev';
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error('AI_GATEWAY_API_KEY missing (expected in repo-root .env)');
  process.exit(1);
}

const results = {};

async function run(name, { state, questions }) {
  const t0 = performance.now();
  try {
    const r = await evaluate({ model: MODEL, state, questions, maxRetries: 0 });
    const ms = Math.round(performance.now() - t0);
    const out = {
      ms,
      answers: r.answers,
      usage: r.usage,
      rounding: r.rounding,
      warnings: r.warnings,
      providerMetadata: r.providerMetadata,
      modelId: r.response?.modelId,
      responseHeaderKeys: Object.keys(r.response?.headers ?? {}),
    };
    results[name] = out;
    console.log(`\n=== ${name} (${ms} ms, in=${r.usage?.inputTokens}) ===`);
    console.log(JSON.stringify(out.answers, null, 2));
    return out;
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    const out = {
      ms,
      error: { name: err?.name, message: err?.message, statusCode: err?.statusCode, type: err?.type },
    };
    results[name] = out;
    console.log(`\n=== ${name} FAILED (${ms} ms) ===`);
    console.log(JSON.stringify(out.error, null, 2));
    return out;
  }
}

// ---------------------------------------------------------------- 1. three primitives
await run('1_primitives', {
  state: 'Customer: I was charged twice for order #88121. Please fix this today.',
  questions: {
    urgent: { type: 'boolean', instructions: 'Does the sender ask for help today?' },
    team: {
      type: 'choice',
      instructions: 'Which team should handle this?',
      criteria: { billing: 'Charges and payments', technical: 'Software failures', other: 'None of these' },
    },
    frustration: {
      type: 'score',
      instructions: 'How frustrated does the sender sound?',
      criteria: ['Neutral request', 'Frustrated but civil', 'Explicit anger or threats'],
    },
  },
});

// ---------------------------------------------------------------- 2. billing: 1 question vs 10 on the same state
const frame = {
  task_frame: {
    goal: 'Fix the flaky login test in packages/auth',
    constraints: ['do not change public API', 'keep Node 20 support'],
    current_subgoal: 'find why session cookie is missing in CI',
  },
  recent_turns: ['user asked to fix flaky test', 'agent ran the test suite: 1 failure in login.spec.ts'],
  user_message: 'By the way, can you explain what the refreshToken helper does? Just curious.',
};

const turnType = {
  type: 'choice',
  instructions: 'What kind of turn is `user_message`, given `task_frame`?',
  criteria: {
    chat_question: 'A question or discussion that needs an explanation, no file changes',
    quick_lookup: 'Find one fact in the codebase',
    single_edit: 'One small, local change',
    multi_step_task: 'A task needing several edits, runs, or investigation',
    research: 'Broad exploration across many files or sources',
    design_discussion: 'Weighing approaches before any work',
    other: 'None of these',
  },
};

await run('2a_preflight_1q', { state: frame, questions: { turn_type: turnType } });

const preflight = {
  turn_type: turnType,
  is_side_question: {
    type: 'boolean',
    instructions: 'Is `user_message` a side question unrelated to `task_frame.current_subgoal`?',
  },
  needs_clarification: {
    type: 'boolean',
    instructions: 'Is `user_message` so under-specified that a wrong assumption would waste significant work?',
  },
  needs_files_changed: { type: 'boolean', instructions: 'Does `user_message` ask for any file to be changed?' },
  needs_memory: {
    type: 'boolean',
    instructions: 'Would lessons from past sessions in this project plausibly change how to respond to `user_message`?',
  },
  swarm_worthy: {
    type: 'boolean',
    instructions: 'Can `user_message` be split into two or more independent subtasks that could run in parallel?',
  },
  plan_first: {
    type: 'boolean',
    instructions: 'Is `user_message` large or risky enough that a written plan should come before any edit?',
  },
  task_complexity: {
    type: 'score',
    instructions: 'How much work does `user_message` require?',
    criteria: ['Answerable from what is already known', 'Read one or two files', 'Several files and a few commands', 'A long multi-stage effort'],
  },
  reasoning_depth: {
    type: 'score',
    instructions: 'How much careful reasoning does `user_message` require?',
    criteria: ['Recall or lookup', 'Straightforward explanation', 'Non-obvious analysis', 'Deep multi-factor reasoning'],
  },
  tool_complexity: {
    type: 'score',
    instructions: 'How much tool use does `user_message` require?',
    criteria: ['None', 'One or two read-only calls', 'Several calls including edits', 'Many calls with build or test cycles'],
  },
};

await run('2b_preflight_10q', { state: frame, questions: preflight });

// ---------------------------------------------------------------- 3. same preflight, Chinese user message
await run('3_preflight_10q_zh', {
  state: { ...frame, user_message: '顺便问一下，refreshToken 这个辅助函数是干嘛的？就是好奇。' },
  questions: preflight,
});

// a Chinese message that IS a multi-step task, to see the contrast
await run('3b_preflight_10q_zh_task', {
  state: {
    ...frame,
    user_message: '把整个 auth 包从 cookie 会话迁移到 JWT，同时更新所有测试和文档，三个子包可以分开做。',
  },
  questions: preflight,
});

// ---------------------------------------------------------------- 4. tool-output admission (B1)
const chunks = {
  chunk_a: 'npm warn deprecated inflight@1.0.6: This module is not supported\nnpm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported\nadded 412 packages in 9s',
  chunk_b: ' PASS  src/token.spec.ts (12 tests)\n PASS  src/hash.spec.ts (8 tests)\n PASS  src/rbac.spec.ts (31 tests)',
  chunk_c: ' FAIL  src/login.spec.ts\n  ● login › sets session cookie\n    expect(received).toContain(expected)\n    Expected substring: "sid="\n    Received string: ""\n      at Object.<anonymous> (src/login.spec.ts:48:31)',
  chunk_d: 'Browserslist: caniuse-lite is outdated. Please run:\n  npx update-browserslist-db@latest\n  Why you should do it regularly: https://github.com/browserslist/update-db#readme',
};
const keepQ = (id) => ({
  type: 'boolean',
  instructions: `Does \`${id}\` contain information needed for \`intent\`? Error messages, failing test names, file paths and line numbers count as needed.`,
});
await run('4_admission', {
  state: {
    intent: 'run the auth test suite to see which test fails and why',
    task_frame: frame.task_frame,
    ...chunks,
  },
  questions: Object.fromEntries(Object.keys(chunks).map((id) => [`keep_${id}`, keepQ(id)])),
});

// ---------------------------------------------------------------- 5. escape hatch: Choice with vs without a no-match option
const offTopic = 'What is the boiling point of water at sea level?';
const routes = { billing: 'Charges and payments', shipping: 'Delivery timing', account: 'Login or profile' };
await run('5a_choice_no_escape', {
  state: offTopic,
  questions: { queue: { type: 'choice', instructions: 'Route this support ticket.', criteria: routes } },
});
await run('5b_choice_with_escape', {
  state: offTopic,
  questions: {
    queue: {
      type: 'choice',
      instructions: 'Route this support ticket.',
      criteria: { ...routes, none: 'Not a support ticket, or fits none of the queues' },
    },
  },
});

// ---------------------------------------------------------------- 6. latency sample (5 small sequential calls)
const lat = [];
for (let i = 0; i < 5; i++) {
  const r = await run(`6_latency_${i}`, {
    state: 'Command: rm -rf ./build && npm run build',
    questions: { destructive: { type: 'boolean', instructions: 'Does the command delete files outside of build output directories?' } },
  });
  if (!r.error) lat.push(r.ms);
}
lat.sort((a, b) => a - b);
results.latency_summary = { samples: lat, p50: lat[Math.floor(lat.length / 2)], min: lat[0], max: lat[lat.length - 1] };
console.log('\n=== latency summary ===');
console.log(JSON.stringify(results.latency_summary));

mkdirSync('results', { recursive: true });
const file = `results/smoke-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nsaved ${file}`);
