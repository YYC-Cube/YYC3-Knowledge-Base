---
description: Implement, review, fix - worker, reviewer and worker again in a chain
description-zh: 实现、评审、修正：干活的子代理先做，评审的子代理检查，再由干活的子代理按意见修正
argument-hint: "<what to build or fix>"
argument-hint-zh: "<要做或要修的事>"
---
Carry out this task with a chain of sub-agents, reviewed before you call it done: $@

1. If your todo list does not yet say what must be true when this task is done, add those items first (todo add), each one checkable.
2. Call `delegate` once, with `chain: true` and three steps. Give every step `serves` with the id of the todo item it is for, and `done` with what must hold when that step is finished:
   - "implement" (agent `worker`): make the change. done: your todo items this covers, restated for this step, and the project's checks pass.
   - "review" (agent `reviewer`): review the change the step before made (`git diff`). done: every finding names a file and line and the input that triggers it; "nothing to fix" is said outright when that is the verdict.
   - "fix" (agent `worker`): fix what the review found that must be fixed, and say what it left and why. done: each must-fix finding is fixed or answered; the project's checks pass.
3. When the chain returns, read each step's acceptance list, not only its report. Tick the todo items the evidence supports (todo done, with the evidence), and tell me what the review found and what was left.
