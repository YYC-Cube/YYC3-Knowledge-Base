---
description: Scout, then plan - two sub-agents in a chain; nothing is changed
description-zh: 先侦察，再计划：两个子代理接力，什么都不改
argument-hint: "<what you want planned>"
argument-hint-zh: "<要做计划的事>"
---
Plan this task with a chain of sub-agents, without changing anything: $@

1. Call `delegate` once, with `chain: true` and two steps, each with `done` saying what must hold when it is finished:
   - "scout" (agent `scout`): find the code the task touches and how it connects. done: the files that have to change are named, each with the reason.
   - "plan" (agent `planner`): turn what the scout found into ordered steps. done: every step names the file it changes; the plan says how to check the result; open questions are listed.
2. When the chain returns, give me the plan and the open questions, and say which of the steps' criteria were not met. Do not implement anything; wait for me.
