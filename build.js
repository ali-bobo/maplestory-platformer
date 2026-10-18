// build.js — esbuild 打包腳本
// 用法：node build.js          ← 單次打包
//       node build.js --watch  ← 監聽模式（開發用）

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { writeVersionFiles } = require('./scripts/buildVersion.js');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/main.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  platform: 'browser',
  target: ['es2020'],
  minify: !isWatch,
  sourcemap: isWatch,
  loader: { '.js': 'js' },
};

async function build() {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('[esbuild] 監聽模式啟動，等待變更...');
    } else {
      const result = await esbuild.build(buildOptions);
      const stat = fs.statSync('dist/bundle.js');
      console.log(`[esbuild] 打包完成 → dist/bundle.js (${(stat.size / 1024).toFixed(1)} KB)`);
      // 版本資訊：dist/version.json 與 sw.js 的快取版本（依內容雜湊，可重現；見 scripts/buildVersion.js）
      const v = writeVersionFiles(__dirname);
      console.log(`[version] bundle ${v.hash} / assets ${v.assetsHash} → dist/version.json、sw.js`);
    }
  } catch (err) {
    console.error('[esbuild] 打包失敗:', err.message);
    process.exit(1);
  }
}

build();
