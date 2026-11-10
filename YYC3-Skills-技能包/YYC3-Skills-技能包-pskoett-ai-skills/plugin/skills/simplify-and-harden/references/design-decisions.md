# Design Decisions

**Why post-completion and not continuous?**
Continuous review during implementation creates feedback loops that slow the agent down and can cause oscillation (simplify, then re-complicate, then re-simplify). Post-completion gives the agent a stable codebase to review against.

**Why simplify-first, not refactor-first?**
Agents love to refactor. Given permission to "improve" code, they will restructure it. But most post-task improvements are cosmetic: a dead import, a bad name, a needlessly deep conditional. These account for 80%+ of the value with near-zero risk. Refactoring carries real risk -- it can introduce bugs, break tests, and bloat diffs. By making simplification the default and refactoring the exception, the skill delivers consistent value without surprise rewrites. The bar for a refactor should be "this is genuinely wrong" not "this could be slightly better."

**Why a budget?**
Without constraints, agents will use review passes as license for unbounded refactoring. The 20% rule keeps the skill focused: improve what you built, don't rebuild it.

**Why separate simplify from harden?**
They require different mindsets. Simplify asks "is this the clearest expression of my intent?" while Harden asks "how could this be exploited?" Conflating them leads to mediocre results on both. Running them sequentially also lets us prioritize security fixes when budget is tight.

**Why the document micro-pass?**
Agents are terrible at documenting their reasoning unprompted. Humans reviewing agent-generated code consistently report that the biggest friction is understanding *why* a choice was made. Five comments is a trivial cost for enormous review-time savings.

## Future Considerations

- **Team calibration**: Allow teams to weight the review checklist (e.g., "we care more about injection vectors than naming")
- **Diff-aware context loading**: For large codebases, intelligently load only the files and symbols relevant to the diff rather than the full project
- **Cross-skill composition**: Simplify & Harden could feed into a "PR Description" skill that uses its summary to auto-generate meaningful PR descriptions
