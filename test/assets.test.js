// 素材登錄：登錄了就必須有檔案（否則啟動時會有失敗的網路請求）；選配素材（背景、星光之塔、世界地圖 UI）
// 只在檔案存在時才登錄，缺檔時由程式畫占位圖。
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BACKGROUND_ASSETS, OPTIONAL_ASSETS, PRESENT_OPTIONAL_ASSETS, PRELOAD_IMAGE_ASSETS, hasOptionalAsset,
} from '../src/config/assetCatalog.js';
import { MAPS } from '../src/config/maps.js';

const root = process.cwd();   // npm test 從專案根目錄執行
const distFiles = readdirSync(resolve(root, 'dist/assets'));

test('已登錄的背景檔案都存在（登錄了卻缺檔 = 啟動時 404）', () => {
  const missing = BACKGROUND_ASSETS.filter((a) => !existsSync(resolve(root, a.path))).map((a) => a.path);
  assert.deepEqual(missing, [], `背景已登錄但檔案不存在：${missing.join(', ')}`);
});

test('預載清單裡每個檔案都存在', () => {
  const missing = PRELOAD_IMAGE_ASSETS.filter((a) => !existsSync(resolve(root, a.path))).map((a) => a.path);
  assert.deepEqual(missing, [], `預載清單有缺檔：${missing.join(', ')}`);
});

test('選配素材：檔案在 dist/assets 就登錄、不在就不登錄（不產生 404 請求）', () => {
  for (const a of OPTIONAL_ASSETS) {
    const exists = distFiles.includes(a.path.split('/').pop());
    assert.equal(PRESENT_OPTIONAL_ASSETS.includes(a), exists, `${a.key}：檔案${exists ? '存在' : '不存在'}，登錄狀態不符`);
    assert.equal(hasOptionalAsset(a.key), exists);
    if (a.kind === 'background') assert.equal(BACKGROUND_ASSETS.includes(a), exists, `${a.key} 與 BACKGROUND_ASSETS`);
  }
});

test('dist/bundle.js 是用目前的 dist/assets 檔案清單建置的（新增美術檔後要重新 npm run build）', () => {
  const list = distFiles.filter((f) => !f.startsWith('.')).sort().join('|');
  const bundle = readFileSync(resolve(root, 'dist/bundle.js'), 'utf8');
  assert.ok(bundle.includes(JSON.stringify(list)), 'dist/assets 的檔案和 dist/bundle.js 內嵌的清單不同：請執行 npm run build 並提交 dist/bundle.js');
});

test('每張地圖的背景：登錄的素材存在，或是選配背景且有占位設定（bgPlaceholder）', () => {
  for (const [key, map] of Object.entries(MAPS)) {
    const registered = BACKGROUND_ASSETS.some((a) => a.key === map.bgImage);
    const optional = OPTIONAL_ASSETS.some((a) => a.key === map.bgImage);
    assert.ok(registered || (optional && map.bgPlaceholder), `${key} 背景 ${map.bgImage} 既沒登錄、也沒有占位設定`);
  }
});
