// 特效紋理預渲染模組
//
// 把高頻使用的複雜形狀（魔法陣、弧形斬擊、衝擊圓、命中環）在 BootScene 階段
// 用 Graphics + generateTexture() 預先繪製為 texture，遊戲過程中改用 Image +
// setTint + tween 套用，徹底避開 earcut 三角剖分熱點。
//
// 設計原則：
// - 所有預渲染都用白色 0xffffff（中性基底），實際使用時靠 setTint() 染色
// - 內部層次靠 alpha 區分（如外圈 alpha 0.85、內圈 alpha 0.4），預渲染時烘焙
// - 用 scene.textures.exists() 做冪等檢查，避免重複建立

export const VFX_TEX = {
  VORTEX_CIRCLE: 'vfx_vortex_circle',
  MAGIC_CIRCLE: 'vfx_magic_circle',
  SLASH_ARC_R: 'vfx_slash_arc_r',
  SLASH_ARC_L: 'vfx_slash_arc_l',
  BURST_RING_OUTER: 'vfx_burst_ring_outer',
  BURST_RING_INNER: 'vfx_burst_ring_inner',
  BURST_GLOW: 'vfx_burst_glow',
  SHOCK_CIRCLE: 'vfx_shock_circle',
  LIGHT_RAYS: 'vfx_light_rays',
  WHITE_PX: 'vfx_white_px', // 8×8 白方塊，供 Image 版 HP 條等 texture-based 元件用
  SPEED_LINES: 'vfx_speed_lines', // X 技能衝刺速度線（從中心向 +X 方向的多條水平線）
  SHURIKEN: 'vfx_shuriken', // 48×48 四刃飛鏢（金屬漸層 + 刃口高光，原色不需 tint）
  VORTEX_SPIRAL: 'vfx_vortex_spiral', // 256×256 白色螺旋臂（靠 tint 染色、旋轉）
  VORTEX_CORE: 'vfx_vortex_core', // 128×128 黑洞核心（深色中心 + 亮邊）
  GROUND_RUNE: 'vfx_ground_rune', // 256×256 符文環（使用時 scaleY 壓扁成地面橢圓）
  SOFT_GLOW: 'vfx_soft_glow', // 64×64 白色徑向柔光
};

/**
 * 預渲染 Vortex 大型魔法陣（24 齒 + 8 符文 + 六角星）
 * 對應原始：Skill.js castVortex 內部繪製（L709-770）
 */
function drawVortexCircleTo(g, cx, cy, radius) {
  // 最外圈
  g.lineStyle(3, 0xffffff, 0.85);
  g.strokeCircle(cx, cy, radius);
  // 24 齒紋
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const inner = (i % 3 === 0) ? radius - 10 : radius - 5;
    g.lineStyle(i % 3 === 0 ? 2 : 1, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    g.lineTo(cx + Math.cos(a) * (radius + 6), cy + Math.sin(a) * (radius + 6));
    g.strokePath();
  }
  // 中圈
  g.lineStyle(2.5, 0xffffff, 0.65);
  g.strokeCircle(cx, cy, radius * 0.65);
  // 內圈
  g.lineStyle(2, 0xffffff, 0.55);
  g.strokeCircle(cx, cy, radius * 0.38);
  // 最內圈
  g.lineStyle(1.5, 0xffffff, 0.4);
  g.strokeCircle(cx, cy, radius * 0.18);
  // 8 條放射符文線 + 符文圓 + 菱形
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.lineStyle(1.5, 0xffffff, 0.5);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * radius * 0.2, cy + Math.sin(a) * radius * 0.2);
    g.lineTo(cx + Math.cos(a) * radius * 0.62, cy + Math.sin(a) * radius * 0.62);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeCircle(cx + Math.cos(a) * radius * 0.52, cy + Math.sin(a) * radius * 0.52, 5);
    const dx = cx + Math.cos(a) * radius * 0.78;
    const dy = cy + Math.sin(a) * radius * 0.78;
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(dx - 3, dy - 3, 6, 6);
  }
  // 六角星（雙三角疊合）
  g.lineStyle(2, 0xffffff, 0.6);
  const starR = radius * 0.48;
  for (let s = 0; s < 2; s++) {
    const offset = s * (Math.PI / 6);
    g.beginPath();
    for (let vi = 0; vi <= 3; vi++) {
      const a = offset + (vi / 3) * Math.PI * 2;
      if (vi === 0) g.moveTo(cx + Math.cos(a) * starR, cy + Math.sin(a) * starR);
      else g.lineTo(cx + Math.cos(a) * starR, cy + Math.sin(a) * starR);
    }
    g.closePath();
    g.strokePath();
  }
  // 中心十字光
  g.lineStyle(2, 0xffffff, 0.45);
  g.beginPath(); g.moveTo(cx - radius * 0.14, cy); g.lineTo(cx + radius * 0.14, cy); g.strokePath();
  g.beginPath(); g.moveTo(cx, cy - radius * 0.14); g.lineTo(cx, cy + radius * 0.14); g.strokePath();
  // 中心光點
  g.fillStyle(0xffffff, 0.4);
  g.fillCircle(cx, cy, 10);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(cx, cy, 5);
}

/**
 * 預渲染 Magic Circle 小型魔法陣（16 齒 + 8 符文 + 六角星）
 * 對應原始：vfx.js drawMagicCircle（L260-348）
 */
function drawMagicCircleTo(g, cx, cy, radius, runeCount = 8) {
  // 外圈
  g.lineStyle(3, 0xffffff, 1);
  g.strokeCircle(cx, cy, radius);
  // 外圈裝飾齒（16 齒）
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.lineStyle(i % 4 === 0 ? 2 : 1, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (radius - 6), cy + Math.sin(a) * (radius - 6));
    g.lineTo(cx + Math.cos(a) * (radius + 8), cy + Math.sin(a) * (radius + 8));
    g.strokePath();
  }
  // 中圈
  g.lineStyle(2, 0xffffff, 0.7);
  g.strokeCircle(cx, cy, radius * 0.65);
  // 內圈
  g.lineStyle(1.5, 0xffffff, 0.5);
  g.strokeCircle(cx, cy, radius * 0.35);
  // 放射符文線 + 符文圓
  for (let i = 0; i < runeCount; i++) {
    const a = (i / runeCount) * Math.PI * 2;
    g.lineStyle(1.5, 0xffffff, 0.5);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * radius * 0.15, cy + Math.sin(a) * radius * 0.15);
    g.lineTo(cx + Math.cos(a) * radius * 0.9, cy + Math.sin(a) * radius * 0.9);
    g.strokePath();
    g.lineStyle(1, 0xffffff, 0.4);
    g.strokeCircle(cx + Math.cos(a) * radius * 0.5, cy + Math.sin(a) * radius * 0.5, 4);
  }
  // 六角星
  g.lineStyle(2, 0xffffff, 0.6);
  const starR = radius * 0.45;
  for (let s = 0; s < 2; s++) {
    const offset = s * (Math.PI / 6);
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = offset + (i / 3) * Math.PI * 2;
      if (i === 0) g.moveTo(cx + Math.cos(a) * starR, cy + Math.sin(a) * starR);
      else g.lineTo(cx + Math.cos(a) * starR, cy + Math.sin(a) * starR);
    }
    g.closePath();
    g.strokePath();
  }
  // 中心光點
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(cx, cy, 4);
}

/**
 * 預渲染速度線（X 技能衝刺用）
 * 從中心 (cx, cy) 向 +X 方向畫 count 條水平短線，alpha/length/width 隨機已烘焙。
 * 使用時靠 setTint 染色、setScale 對齊長度、setFlipX(true) 反向。
 * 對應原始：vfx.js spawnSpeedLines（L353-）
 */
function drawSpeedLinesTo(g, cx, cy, length, spread, count) {
  for (let i = 0; i < count; i++) {
    const yOff = (Math.random() - 0.5) * spread;
    const len = length * (0.5 + Math.random() * 0.5);
    const a = 0.3 + Math.random() * 0.7; // alpha 隨機
    const lw = 1 + Math.random() * 2;
    g.lineStyle(lw, 0xffffff, a);
    g.beginPath();
    g.moveTo(cx, cy + yOff);
    g.lineTo(cx + len, cy + yOff); // +X 方向；使用時靠 setFlipX 反向
    g.strokePath();
  }
}

/**
 * 預渲染 12 條放射光線（命中爆炸用）
 * 對應原始：vfx.js spawnLightRays（L221-258）
 * 每條光線長度 120，alpha 0.3-1.0 隨機已烘焙，width 2-3.5 隨機已烘焙
 */
function drawLightRaysTo(g, cx, cy, length, count) {
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    // alpha 在 0.3-1.0 區間隨機，模擬原本 a = alpha * (0.3 + Math.random() * 0.7) 的視覺
    const a = 0.3 + Math.random() * 0.7;
    // width 在 2-3.5 區間隨機，模擬原本 width + Math.random() * 1.5
    const w = 2 + Math.random() * 1.5;
    // length 在 0.6-1.0 區間隨機（同原本 len 計算）
    const len = length * (0.6 + Math.random() * 0.4);
    g.lineStyle(w, 0xffffff, a);
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    g.strokePath();
  }
}

/**
 * 預渲染弧形斬擊（3 層弧光：外光暈 + 主弧 + 內高光）
 * 對應原始：vfx.js spawnSlashWave（L354-411）
 * facingRight = true 時弧線從右上向右下；false 時鏡像對稱
 */
function drawSlashArcTo(g, cx, cy, radius, facingRight) {
  const arcStart = -1.2;
  const arcEnd = 0.8;
  const lineWidth = 6;

  const startA = facingRight ? arcStart : (Math.PI - arcEnd);
  const endA = facingRight ? arcEnd : (Math.PI - arcStart);

  // 外層光暈弧
  g.lineStyle(lineWidth + 6, 0xffffff, 0.3);
  g.beginPath();
  g.arc(cx, cy, radius, startA, endA, false);
  g.strokePath();
  // 中層主弧
  g.lineStyle(lineWidth, 0xffffff, 0.9);
  g.beginPath();
  g.arc(cx, cy, radius, startA, endA, false);
  g.strokePath();
  // 內層高光弧
  const innerStartA = facingRight ? arcStart + 0.1 : (Math.PI - arcEnd + 0.1);
  const innerEndA = facingRight ? arcEnd - 0.1 : (Math.PI - arcStart - 0.1);
  g.lineStyle(lineWidth * 0.4, 0xffffff, 1);
  g.beginPath();
  g.arc(cx, cy, radius * 0.95, innerStartA, innerEndA, false);
  g.strokePath();
}

/**
 * 在 BootScene 階段呼叫，一次性預渲染所有 VFX 紋理
 * 啟動成本：~50-100ms（單次付出，遊戲過程中歸 0）
 */
export function initVfxTextures(scene) {
  const tex = scene.textures;

  // 1. Vortex 大型魔法陣 320x320，圖案半徑 150
  if (!tex.exists(VFX_TEX.VORTEX_CIRCLE)) {
    const g = scene.add.graphics();
    drawVortexCircleTo(g, 160, 160, 150);
    g.generateTexture(VFX_TEX.VORTEX_CIRCLE, 320, 320);
    g.destroy();
  }

  // 2. 小型魔法陣 240x240，圖案半徑 100
  if (!tex.exists(VFX_TEX.MAGIC_CIRCLE)) {
    const g = scene.add.graphics();
    drawMagicCircleTo(g, 120, 120, 100, 8);
    g.generateTexture(VFX_TEX.MAGIC_CIRCLE, 240, 240);
    g.destroy();
  }

  // 3-4. 弧形斬擊 200x200，圖案半徑 80
  if (!tex.exists(VFX_TEX.SLASH_ARC_R)) {
    const g = scene.add.graphics();
    drawSlashArcTo(g, 100, 100, 80, true);
    g.generateTexture(VFX_TEX.SLASH_ARC_R, 200, 200);
    g.destroy();
  }
  if (!tex.exists(VFX_TEX.SLASH_ARC_L)) {
    const g = scene.add.graphics();
    drawSlashArcTo(g, 100, 100, 80, false);
    g.generateTexture(VFX_TEX.SLASH_ARC_L, 200, 200);
    g.destroy();
  }

  // 5. 命中外環 64x64（描邊圓，半徑 10，烘焙 alpha 0.9）
  if (!tex.exists(VFX_TEX.BURST_RING_OUTER)) {
    const g = scene.add.graphics();
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(32, 32, 10);
    g.generateTexture(VFX_TEX.BURST_RING_OUTER, 64, 64);
    g.destroy();
  }

  // 6. 命中內環 48x48（描邊圓，半徑 8，烘焙 alpha 0.5）
  if (!tex.exists(VFX_TEX.BURST_RING_INNER)) {
    const g = scene.add.graphics();
    g.lineStyle(2, 0xffffff, 0.5);
    g.strokeCircle(24, 24, 8);
    g.generateTexture(VFX_TEX.BURST_RING_INNER, 48, 48);
    g.destroy();
  }

  // 7. 命中中心光暈 32x32（實心圓，半徑 6，烘焙 alpha 0.3）
  if (!tex.exists(VFX_TEX.BURST_GLOW)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 0.3);
    g.fillCircle(16, 16, 6);
    g.generateTexture(VFX_TEX.BURST_GLOW, 32, 32);
    g.destroy();
  }

  // 8. 衝擊圓 80x80（描邊圓，半徑 24，alpha 1.0；使用時 setTint + setAlpha 控制）
  if (!tex.exists(VFX_TEX.SHOCK_CIRCLE)) {
    const g = scene.add.graphics();
    g.lineStyle(3, 0xffffff, 1);
    g.strokeCircle(40, 40, 24);
    g.generateTexture(VFX_TEX.SHOCK_CIRCLE, 80, 80);
    g.destroy();
  }

  // 9. 放射光線 280x280（12 條從中心放射的光線，長 120）
  // 使用時靠 setTint 染色、setScale 控制長度、setRotation 控制角度
  if (!tex.exists(VFX_TEX.LIGHT_RAYS)) {
    const g = scene.add.graphics();
    drawLightRaysTo(g, 140, 140, 120, 12);
    g.generateTexture(VFX_TEX.LIGHT_RAYS, 280, 280);
    g.destroy();
  }

  // 10. 白方塊 8×8（純白，靠 setTint 染色、setDisplaySize 縮放）
  // 供 texture-based 元件用（如 Image 版 HP 條），走 batchSprite 不走 batchFillPath
  if (!tex.exists(VFX_TEX.WHITE_PX)) {
    const g = scene.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 8);
    g.generateTexture(VFX_TEX.WHITE_PX, 8, 8);
    g.destroy();
  }

  // 11. 速度線 200×100（從中心向 +X 方向的 10 條水平短線）
  // X 技能衝刺用。使用時靠 setTint 染色、setScale 對齊長度、setFlipX 反向
  if (!tex.exists(VFX_TEX.SPEED_LINES)) {
    const g = scene.add.graphics();
    drawSpeedLinesTo(g, 100, 50, 60, 80, 10); // cx, cy, length, spread, count
    g.generateTexture(VFX_TEX.SPEED_LINES, 200, 100);
    g.destroy();
  }

  // 12-16. Canvas 2D 漸層紋理（Graphics 無法做漸層，改用 createCanvas）
  canvasTexture(scene, VFX_TEX.SHURIKEN, 48, 48, drawShurikenCanvas);
  canvasTexture(scene, VFX_TEX.VORTEX_SPIRAL, 256, 256, drawVortexSpiralCanvas);
  canvasTexture(scene, VFX_TEX.VORTEX_CORE, 128, 128, drawVortexCoreCanvas);
  canvasTexture(scene, VFX_TEX.GROUND_RUNE, 256, 256, drawGroundRuneCanvas);
  canvasTexture(scene, VFX_TEX.SOFT_GLOW, 64, 64, (ctx, w) => {
    const grad = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, w);
  });
}

function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return;
  const canvasTex = scene.textures.createCanvas(key, w, h);
  draw(canvasTex.getContext(), w, h);
  canvasTex.refresh();
}

function drawShurikenCanvas(ctx, w) {
  const c = w / 2;
  ctx.translate(c, c);
  // 外圍藍色光暈
  const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, c);
  halo.addColorStop(0, 'rgba(150,190,255,0.55)');
  halo.addColorStop(1, 'rgba(150,190,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(0, 0, c, 0, Math.PI * 2); ctx.fill();
  // 四片刃，每片一半亮一半暗，做出立體感
  const tip = c - 3;
  const root = 6;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate((Math.PI / 2) * i);
    ctx.fillStyle = '#e8eef8';
    ctx.beginPath(); ctx.moveTo(0, -tip); ctx.lineTo(root, -root); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7d879c';
    ctx.beginPath(); ctx.moveTo(0, -tip); ctx.lineTo(-root, -root); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(30,34,52,0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-root, -root); ctx.lineTo(0, -tip); ctx.lineTo(root, -root); ctx.stroke();
    ctx.restore();
  }
  // 中心環 + 孔
  ctx.fillStyle = '#3a4158';
  ctx.beginPath(); ctx.arc(0, 0, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9d4ea';
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1d2a';
  ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
}

function drawVortexSpiralCanvas(ctx, w) {
  const c = w / 2;
  const arms = 4;
  ctx.translate(c, c);
  ctx.lineCap = 'round';
  for (let a = 0; a < arms; a++) {
    const base = (Math.PI * 2 * a) / arms;
    // 由外向內畫，越內越粗越亮
    for (let t = 0; t < 1; t += 0.012) {
      const r = (c - 6) * (1 - t);
      const ang = base + t * Math.PI * 2.6;
      const r2 = (c - 6) * (1 - t - 0.014);
      const ang2 = base + (t + 0.014) * Math.PI * 2.6;
      ctx.strokeStyle = `rgba(255,255,255,${(0.25 + t * 0.75).toFixed(3)})`;
      ctx.lineWidth = 4 + t * 14;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      ctx.lineTo(Math.cos(ang2) * r2, Math.sin(ang2) * r2);
      ctx.stroke();
    }
  }
}

function drawVortexCoreCanvas(ctx, w) {
  const c = w / 2;
  const glow = ctx.createRadialGradient(c, c, 0, c, c, c);
  glow.addColorStop(0, 'rgba(8,0,18,1)');
  glow.addColorStop(0.32, 'rgba(20,0,40,1)');
  glow.addColorStop(0.45, 'rgba(210,140,255,0.95)');
  glow.addColorStop(0.6, 'rgba(140,60,230,0.55)');
  glow.addColorStop(1, 'rgba(90,20,170,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, w);
}

function drawGroundRuneCanvas(ctx, w) {
  const c = w / 2;
  ctx.translate(c, c);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, c - 4, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.arc(0, 0, c - 14, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, c * 0.45, 0, Math.PI * 2); ctx.stroke();
  // 符文刻痕（環帶上的短筆劃）
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  const marks = 24;
  for (let i = 0; i < marks; i++) {
    const ang = (Math.PI * 2 * i) / marks;
    ctx.save();
    ctx.rotate(ang);
    ctx.translate(0, -(c - 9));
    ctx.beginPath();
    if (i % 3 === 0) { ctx.moveTo(-3, -3); ctx.lineTo(3, 3); ctx.moveTo(3, -3); ctx.lineTo(-3, 3); }
    else if (i % 3 === 1) { ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); }
    else { ctx.arc(0, 0, 2.5, 0, Math.PI * 2); }
    ctx.stroke();
    ctx.restore();
  }
  // 內部六芒星
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const ang = -Math.PI / 2 + k * Math.PI / 3 + (Math.PI * 2 * i) / 3;
      const x = Math.cos(ang) * (c - 16);
      const y = Math.sin(ang) * (c - 16);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}
