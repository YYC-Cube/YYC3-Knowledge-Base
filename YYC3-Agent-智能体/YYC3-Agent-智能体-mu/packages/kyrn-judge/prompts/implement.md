---
description: Scout, plan, implement - a chain of three sub-agents, each working to its own checklist
description-zh: 侦察、计划、实现：三个子代理接力，每个按自己的清单做
argument-hint: "<what to build or fix>"
argument-hint-zh: "<要做或要修的事>"
---
Carry out this task with a chain of sub-agents: $@

1. If your todo list does not yet say what must be true when this task is done, add those items first (todo add), each one checkable.
2. Call `delegate` once, with `chain: true` and three steps. Give every step `serves` with the id of the todo item it is for, and `done` with what must hold when that step is finished:
   - "scout" (agent `scout`): find the code the task touches and how it connects. done: the files that have to change are named, each with the reason.
   - "plan" (agent `planner`): turn what the scout found into ordered steps. done: every step names the file it changes; the plan says how to check the result.
   - "implement" (agent `worker`): carry out the plan. done: your todo items this covers, restated for this step, and the checks the plan names pass.
   Each step receives the report of the step before it; write each step's instructions so they stand on their own apart from that.
3. When the chain returns, read each step's acceptance list, not only its report. Tick the todo items the evidence supports (todo done, with the evidence). If a step stopped or left items open, say what is missing and what you do next.
