---
description: Analyze this project and write AGENTS.md, the instructions every future session starts with
description-zh: 分析这个项目，写出 AGENTS.md：以后每次会话开始都会先读它
argument-hint: "[what to emphasize]"
argument-hint-zh: "[想强调的地方]"
---
Create an `AGENTS.md` at the root of this project (or improve the one that exists). Every future session reads it first, so it must be short, specific and true.

1. Investigate before writing: the manifest and lockfile, the README, CI configuration, lint and format configuration, the test setup, and the layout of the source tree. If `CLAUDE.md`, `.cursorrules` or similar files exist, carry over what is still accurate.
2. Write only what a newcomer could not guess from a quick look:
   - the exact commands to build, lint, type-check, run all tests and run ONE test
   - the architecture in a few sentences: main modules, how they depend on each other, where a new feature usually goes
   - conventions that the tooling does not enforce
   - things that look wrong but are intentional, and things that must never be done
3. Leave out generic advice, anything the code already says, and file-by-file listings.
4. Keep it under about 60 lines. Verify every command you list by reading the scripts that define it.

${ARGUMENTS:-}
