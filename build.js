// build.js — esbuild 打包腳本
// 用法：node build.js          ← 單次打包
//       node build.js --watch  ← 監聽模式（開發用）

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

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
    }
  } catch (err) {
    console.error('[esbuild] 打包失敗:', err.message);
    process.exit(1);
  }
}

build();
