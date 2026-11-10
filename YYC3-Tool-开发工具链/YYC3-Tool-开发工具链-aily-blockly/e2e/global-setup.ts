import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';

/**
 * Playwright global-setup。
 *
 * 职责：
 *  1. 执行 `ng build --base-href ./`，产出 dist/aily-blockly/browser。
 *  2. 把 browser 目录暂存为 <root>/renderer —— 这正是 electron-builder 在打包时
 *     的映射关系（dist/aily-blockly/browser -> renderer）。electron/main.js 在
 *     非 --serve 模式下用 loadFile('renderer/index.html') 加载，因此无需走完整
 *     electron-builder 打包即可对「生产渲染层」做测试。
 *
 * 加速开发循环：
 *  - 设置环境变量 E2E_SKIP_BUILD=1 且 renderer/ 已存在时，跳过构建。
 */
const ROOT = path.resolve(__dirname, '..');
const NG_CLI = path.join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js');
const BUILD_OUTPUT = path.join(ROOT, 'dist', 'aily-blockly', 'browser');
const RENDERER_DIR = path.join(ROOT, 'renderer');

function runAngularBuild(): void {
  console.log('[e2e] 正在执行 ng build --base-href ./ ...');
  const result = spawnSync(process.execPath, [NG_CLI, 'build', '--base-href', './'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  if (result.status !== 0) {
    const detail = result.error
      ? `错误：${result.error.message}`
      : result.signal
        ? `信号：${result.signal}`
        : `退出码：${result.status}`;
    throw new Error(`[e2e] ng build 失败，${detail}`);
  }
}

function stageRenderer(): void {
  if (!existsSync(BUILD_OUTPUT)) {
    throw new Error(`[e2e] 未找到构建产物：${BUILD_OUTPUT}`);
  }
  console.log(`[e2e] 暂存渲染层：${BUILD_OUTPUT} -> ${RENDERER_DIR}`);
  rmSync(RENDERER_DIR, { recursive: true, force: true });
  cpSync(BUILD_OUTPUT, RENDERER_DIR, { recursive: true });
}

export default function globalSetup(): void {
  const skipBuild = process.env['E2E_SKIP_BUILD'] === '1';

  if (skipBuild && existsSync(RENDERER_DIR)) {
    console.log('[e2e] E2E_SKIP_BUILD=1 且 renderer/ 已存在，跳过构建。');
    return;
  }

  if (skipBuild && existsSync(BUILD_OUTPUT)) {
    console.log('[e2e] E2E_SKIP_BUILD=1 且已有 dist 构建产物，跳过构建并暂存 renderer/。');
    stageRenderer();
    return;
  }

  runAngularBuild();
  stageRenderer();
}
