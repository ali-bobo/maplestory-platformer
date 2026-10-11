// 素材登錄：登錄了就必須有檔案（否則啟動時會有失敗的網路請求）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BACKGROUND_ASSETS, PRELOAD_IMAGE_ASSETS, PRELOAD_SPRITESHEET_ASSETS } from '../src/config/assetCatalog.js';

const root = process.cwd();   // npm test 從專案根目錄執行

test('已登錄的背景檔案都存在（登錄了卻缺檔 = 啟動時 404）', () => {
  const missing = BACKGROUND_ASSETS.filter((a) => !existsSync(resolve(root, a.path))).map((a) => a.path);
  assert.deepEqual(missing, [], `背景已登錄但檔案不存在：${missing.join(', ')}`);
});

test('預載清單（圖片 + 逐格動畫）裡每個檔案都存在', () => {
  const missing = [...PRELOAD_IMAGE_ASSETS, ...PRELOAD_SPRITESHEET_ASSETS].filter((a) => !existsSync(resolve(root, a.path))).map((a) => a.path);
  assert.deepEqual(missing, [], `預載清單有缺檔：${missing.join(', ')}`);
});
