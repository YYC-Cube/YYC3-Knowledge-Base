# 构建系统（`assets/build.mjs`）

**版本**：1.59D

## 用法

在**技能包根目录**（含 `assets/build.mjs`）：

```bash
node assets/build.mjs
node assets/build.mjs --check
```

环境变量与严格源校验见 [`section-4-commands.md`](../01-core/section-4-commands.md)。

## 与交付档位

输出须满足 [`html-deliverable-gate.md`](./html-deliverable-gate.md) 方可宣称 **D1**。

## npm

`package.json` 中 `build` / `build:check` 为同名封装。
