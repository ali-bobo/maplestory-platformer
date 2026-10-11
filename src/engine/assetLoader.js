// 素材的載入 / 釋放（Phaser 端）。要載哪些由 assetPlan.js 決定。
// 原則：同一個 key 只載入一次；離開地圖後把不再需要的 map / job 範圍素材從 TextureManager 移除，
// 讓顯存與解碼後的圖片記憶體維持有上限（相鄰地圖會預先載入，傳送時不卡）。
import Phaser from 'phaser';
import { isSpritesheet, ALL_ASSETS, ASSET_BY_KEY } from '../config/assetCatalog.js';
import { releasable } from './assetPlan.js';

const SOLID_SUFFIX = '--solid-alpha';            // Monster.js 去背後的副本
const PLATFORM_SLICES = ['__L', '__R', '__M'];   // BaseMapScene 從跳台圖切出的三張 canvas

// 場景切換時，舊場景還在下載的檔案不會被取消，下載完仍會寫進紋理快取；若新場景已經載了同一個 key，
// Phaser 會 console.error「Texture key already in use」。素材目錄內的 key 重複載入是無害的（第一份留下），這裡讓它安靜略過。
const TM = Phaser.Textures.TextureManager.prototype;
if (!TM.__quietAssetDupes) {
  const checkKey = TM.checkKey;
  TM.checkKey = function (key) {
    if (ASSET_BY_KEY.has(key) && this.exists(key)) return false;
    return checkKey.call(this, key);
  };
  TM.__quietAssetDupes = true;
}

export const isLoaded = (scene, key) => scene.textures.exists(key);

// 背景圖載入後縮到 ≤ 1280×720（像素風設定用最近鄰取樣，縮放比例接近 1 時用平滑縮小畫質較好），
// 並用同 key 重新註冊、釋放原圖。規則 D：紋理尺寸應對齊顯示尺寸。
function downscaleTexture(scene, key, maxW = 1280, maxH = 720) {
  if (!scene.textures.exists(key)) return;
  const src = scene.textures.get(key).getSourceImage();
  if (!src || (src.width <= maxW && src.height <= maxH)) return;
  const scale = Math.min(maxW / src.width, maxH / src.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(src.width * scale));
  canvas.height = Math.max(1, Math.round(src.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  scene.textures.remove(key);
  scene.textures.addCanvas(key, canvas);
}

// 把還沒載入的素材排進 scene.load；回傳排進去的數量
export function queueAssets(scene, assets) {
  let n = 0;
  const seen = new Set();
  for (const a of assets) {
    if (!a || seen.has(a.key) || scene.textures.exists(a.key)) continue;
    seen.add(a.key);
    if (isSpritesheet(a)) scene.load.spritesheet(a.key, a.path, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
    else {
      scene.load.image(a.key, a.path);
      if (a.kind === 'background') scene.load.once(`filecomplete-image-${a.key}`, () => downscaleTexture(scene, a.key));
    }
    n++;
  }
  return n;
}

// 小型載入條：載入超過 150 ms 才出現，避免正常（快取命中 / 本機）流程閃一下
export function attachLoadingBar(scene) {
  const t0 = performance.now();
  let objs = null;
  const W = 360, H = 14;
  const onProgress = (v) => {
    if (!objs) {
      if (performance.now() - t0 < 150) return;
      const cx = scene.scale.width / 2, cy = scene.scale.height / 2;
      const back = scene.add.rectangle(cx, cy, W + 8, H + 8, 0x000000, 0.7).setStrokeStyle(2, 0xd9b45a).setDepth(1000).setScrollFactor(0);
      const fill = scene.add.rectangle(cx - W / 2, cy, 1, H, 0xf2cf7a).setOrigin(0, 0.5).setDepth(1001).setScrollFactor(0);
      const label = scene.add.text(cx, cy - 26, '載入中…', { fontSize: '18px', color: '#f5e6c0', fontFamily: 'Arial, sans-serif' })
        .setOrigin(0.5).setDepth(1001).setScrollFactor(0);
      objs = { back, fill, label };
    }
    objs.fill.width = Math.max(1, W * v);
  };
  const done = () => {
    scene.load.off('progress', onProgress);
    if (objs) { for (const o of Object.values(objs)) o.destroy(); objs = null; }
  };
  scene.load.on('progress', onProgress);
  scene.load.once('complete', done);
  scene.events.once('shutdown', done);
}

// 在 preload() 內使用：排入缺的素材並掛載入條（Phaser 會等載完才呼叫 create）
export function preloadAssets(scene, assets) {
  const n = queueAssets(scene, assets);
  if (n > 0) attachLoadingBar(scene);
  scene.load.on('loaderror', (file) => { if (typeof console !== 'undefined') console.warn('[assets] 載入失敗', file && file.key); });
  return n;
}

// 場景執行中補載（預先載入相鄰地圖、換職業）；全部就緒（含原本就在記憶體）時呼叫 onDone
export function loadAssets(scene, assets, onDone) {
  const n = queueAssets(scene, assets);
  if (n === 0) { if (onDone) onDone(); return 0; }
  const loader = scene.load;
  if (onDone) loader.once('complete', onDone);
  if (loader.isReady()) loader.start();
  return n;
}

function removeAnimsOf(scene, key) {
  const anims = scene.anims && scene.anims.anims;
  if (!anims) return;
  const stale = [];
  anims.each((k, anim) => { if (anim.frames && anim.frames.some((f) => f.textureKey === key)) stale.push(k); });
  for (const k of stale) scene.anims.remove(k);
}

function removeTexture(scene, key) {
  if (!scene.textures.exists(key)) return false;
  removeAnimsOf(scene, key);   // 動畫的影格參照著舊的 Frame；紋理之後重載時動畫要重建
  scene.textures.remove(key);
  return true;
}

// 移除所有 map / job 範圍、已載入、且不在 keep 內的素材。回傳移除的 key 數量
export function releaseExcept(scene, keep) {
  let n = 0;
  for (const a of ALL_ASSETS) {
    if (!releasable(a) || keep.has(a.key)) continue;
    if (removeTexture(scene, a.key)) n++;
    if (removeTexture(scene, a.key + SOLID_SUFFIX)) n++;
    if (a.kind === 'platform') for (const s of PLATFORM_SLICES) if (removeTexture(scene, a.key + s)) n++;
  }
  return n;
}
