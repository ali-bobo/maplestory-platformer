// 測試執行器：以 esbuild 把 test/*.test.js（含 ESM import）打包成 Node 可執行檔後，用 node:test 執行。
// 用法：npm test
const esbuild = require('esbuild');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const dir = __dirname;
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.test.js'));
if (files.length === 0) { console.error('找不到測試檔'); process.exit(1); }

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'thief-legend-test-'));
const bundled = [];
for (const f of files) {
  const outfile = path.join(out, f.replace(/\.js$/, '.cjs'));
  esbuild.buildSync({
    entryPoints: [path.join(dir, f)],
    bundle: true, platform: 'node', format: 'cjs', outfile,
    external: ['node:*'],
  });
  bundled.push(outfile);
}
const r = spawnSync(process.execPath, ['--test', ...bundled], { stdio: 'inherit' });
fs.rmSync(out, { recursive: true, force: true });
process.exit(r.status ?? 1);
