// Copyright 2026 Anthropic PBC
// SPDX-License-Identifier: Apache-2.0

// Post-install patch for prismarine-viewer to render below y=0.
// Upstream issue #250 (open since 2022); PR #471 has the full fix
// but is unmerged. Patches both source files (for readability) and
// the pre-built public/ bundles (which is what the browser actually
// runs). Bundle replacements use regex so minified-variable-name
// differences across npm builds don't break the patch. Idempotent.

const fs = require('fs');
const path = require('path');

const pv = path.join(__dirname, 'node_modules', 'prismarine-viewer');
let total = 0;

function patch(rel, replacements) {
  const p = path.join(pv, rel);
  if (!fs.existsSync(p)) {
    console.log(`[patch-viewer] skip ${rel} (not found)`);
    return;
  }
  let src = fs.readFileSync(p, 'utf8');
  let n = 0;
  for (const [pat, repl] of replacements) {
    const before = src;
    src = src.replace(pat, repl);
    if (src !== before) n += (before.match(pat) || ['']).length || 1;
  }
  if (n > 0) {
    fs.writeFileSync(p, src);
    total += n;
    console.log(`[patch-viewer] ${rel}: ${n} replacement(s)`);
  } else {
    console.log(`[patch-viewer] ${rel}: 0 (already patched or pattern absent)`);
  }
}

// ── Server-side (runs in node, not the browser) ──────────────────
// Force no-store on the viewer's static assets. The 63MB worker.js
// is loaded via `new Worker(url)` which browsers cache aggressively;
// after patch-viewer changes the bundle on disk, a stale cached
// worker can leave the page rendering ?-textures or pre-y<0-fix
// geometry until the user manually clears cache. no-store guarantees
// every page load fetches the patched bundles.
patch('lib/common.js', [
  [/express\.static\(path\.join\(__dirname, '\.\.\/public'\)\)/,
   "express.static(path.join(__dirname, '../public'), { etag: false, setHeaders: (res) => res.set('Cache-Control', 'no-store') })"],
]);

// ── Source files (reference; not what the browser loads) ──────────
patch('viewer/lib/worldrenderer.js', [
  [/for \(let y = 0; y < 256; y \+= 16\)/g,
   'for (let y = -64; y < 320; y += 16)'],
]);
patch('viewer/lib/models.js', [
  [/if \(neighbor\.position\.y < 0\) continue/g,
   '/* patched: allow negative y */'],
]);
patch('viewer/lib/worker.js', [
  [/chunk\.sections\[Math\.floor\(y \/ 16\)\]/g,
   'chunk.sections[Math.floor((y - (chunk.minY || 0)) / 16)]'],
]);

// ── Asset aliases ─────────────────────────────────────────────────
// The bot connects as 1.20.6, but the package only ships assets for
// 1.20.1. The viewer remaps 1.20.6→1.20.1 for asset URLs AND for the
// worker's chunk decoder — but block STATE IDs differ between the two
// (deepslate is 24905 in 1.20.6, 22450 in 1.20.1), so the worker
// decodes 1.20.6 chunk data with the 1.20.1 table → UNKNOWN → '?'.
// Fix: add 1.20.6 to supportedVersions (so the worker decodes with
// 1.20.6) and alias the 1.20.1 asset files as 1.20.6 (block NAMES are
// stable across the minor; only IDs shifted).
for (const [src, dst] of [
  ['public/blocksStates/1.20.1.json', 'public/blocksStates/1.20.6.json'],
  ['public/textures/1.20.1.png', 'public/textures/1.20.6.png'],
]) {
  const sp = path.join(pv, src), dp = path.join(pv, dst);
  if (fs.existsSync(sp) && !fs.existsSync(dp)) {
    fs.copyFileSync(sp, dp);
    console.log(`[patch-viewer] aliased ${src} → ${dst.split('/').pop()}`);
    total++;
  }
}

// ── Pre-built bundles (what actually runs in the browser) ──────────
// Minified var names vary across builds; capture and reuse them.
patch('public/index.js', [
  // supportedVersions: insert '1.20.6' after '1.20.1' so getVersion
  // returns it as-is and the worker decodes chunks with the right
  // state-ID table. (Asset files for 1.20.6 are aliased above.)
  [/"1\.20\.1","1\.21\.1"/, '"1.20.1","1.20.6","1.21.1"'],
  // worldrenderer y-loop:  X=0;X<256;X+=16  →  X=-64;X<320;X+=16
  [/([a-zA-Z_$])=0;\1<256;\1\+=16/g, '$1=-64;$1<320;$1+=16'],
  // Unknown-entity throw → empty mesh (glow_squid at depth)
  [/if\(!([a-zA-Z_$])\)throw new Error\(`Unknown entity \$\{[a-zA-Z_$]\}`\);?/g,
   'if(!$1){this.mesh=new THREE.Object3D;return}'],
]);
patch('public/worker.js', [
  // models.js face-cull:  .position.y<0  →  .position.y<-64
  [/\.position\.y<0\b/g, '.position.y<-64'],
  // Section-index bug:  V.sections[Math.floor(W/16)]  →  offset by minY
  [/([a-zA-Z_$])\.sections\[Math\.floor\(([a-zA-Z_$])\/16\)\]/g,
   '$1.sections[Math.floor(($2-($1.minY||0))/16)]'],
]);

// Verification: confirm the load-bearing patterns are now present.
function has(rel, pat) {
  try { return pat.test(fs.readFileSync(path.join(pv, rel), 'utf8')); }
  catch { return false; }
}
const ok =
  has('public/index.js', /=-64;[a-zA-Z_$]<320;/) &&
  has('public/worker.js', /minY\|\|0/);
console.log(`[patch-viewer] ${total} replacement(s) total — verify: ${ok ? '✓ patched' : '✗ NOT patched (report this)'}`);
if (!ok) process.exitCode = 1;
