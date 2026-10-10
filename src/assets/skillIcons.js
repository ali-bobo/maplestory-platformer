// 技能圖示（程式繪製）：5 個 38×38 canvas 紋理，key 為 skill_icon_<快捷鍵>
//
// 每個圖示 = 深紫寶石底 + 主體圖案，放進 HUD 木框技能格中央使用。

const SIZE = 38;
const DESIGN = 44; // 繪圖座標以 44px 設計，輸出時縮放到 SIZE

export function ensureSkillIcons(scene) {
  const draws = { Z: drawShurikens, X: drawDash, C: drawDagger, V: drawVortex, B: drawClone };
  for (const [key, draw] of Object.entries(draws)) {
    const texKey = `skill_icon_${key}`;
    if (scene.textures.exists(texKey)) continue;
    const tex = scene.textures.createCanvas(texKey, SIZE, SIZE);
    const ctx = tex.getContext();
    ctx.scale(SIZE / DESIGN, SIZE / DESIGN);
    drawBase(ctx);
    draw(ctx, scene);
    tex.refresh();
  }
}

function drawBase(ctx) {
  const grad = ctx.createRadialGradient(DESIGN / 2, DESIGN / 2 - 4, 2, DESIGN / 2, DESIGN / 2, DESIGN * 0.7);
  grad.addColorStop(0, '#4b2a78');
  grad.addColorStop(1, '#140a24');
  ctx.fillStyle = grad;
  roundRect(ctx, 1, 1, DESIGN - 2, DESIGN - 2, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(214,176,255,0.55)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 1.5, 1.5, DESIGN - 3, DESIGN - 3, 7);
  ctx.stroke();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, cx, cy, r, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#eef3ff';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.28, -r * 0.28); ctx.lineTo(0, 0); ctx.fill();
    ctx.fillStyle = '#8a95b0';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.28, -r * 0.28); ctx.lineTo(0, 0); ctx.fill();
  }
  ctx.fillStyle = '#2a2f44';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawShurikens(ctx) {
  ctx.strokeStyle = 'rgba(150,190,255,0.5)';
  ctx.lineWidth = 2;
  [[10, 30], [8, 20], [12, 12]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x - 6, y + 4); ctx.lineTo(x + 6, y); ctx.stroke();
  });
  star(ctx, 30, 13, 8, 0.3);
  star(ctx, 24, 24, 9, 0.9);
  star(ctx, 32, 33, 7, 0.1);
}

function drawDash(ctx) {
  for (let i = 0; i < 3; i++) {
    const x = 10 + i * 9;
    ctx.strokeStyle = `rgba(${180 + i * 25},${120 + i * 50},255,${0.35 + i * 0.3})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x, 12); ctx.lineTo(x + 10, 22); ctx.lineTo(x, 32); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  [[5, 16, 12], [4, 28, 10], [6, 22, 8]].forEach(([x, y, len]) => {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  });
}

function drawDagger(ctx) {
  // 紅色斬痕
  ctx.strokeStyle = 'rgba(255,70,110,0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(22, 22, 15, Math.PI * 0.9, Math.PI * 1.9); ctx.stroke();
  ctx.save();
  ctx.translate(22, 22);
  ctx.rotate(-Math.PI / 4);
  // 刀身
  const blade = ctx.createLinearGradient(-4, 0, 4, 0);
  blade.addColorStop(0, '#9aa3b8');
  blade.addColorStop(0.5, '#ffffff');
  blade.addColorStop(1, '#6d7590');
  ctx.fillStyle = blade;
  ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.lineTo(-4, -4); ctx.closePath(); ctx.fill();
  // 護手
  ctx.fillStyle = '#e0b04a';
  ctx.fillRect(-8, 4, 16, 3);
  // 握把
  ctx.fillStyle = '#5a3418';
  ctx.fillRect(-2.5, 7, 5, 8);
  ctx.fillStyle = '#e0b04a';
  ctx.beginPath(); ctx.arc(0, 16.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawVortex(ctx) {
  ctx.save();
  ctx.translate(22, 22);
  ctx.lineCap = 'round';
  for (let a = 0; a < 3; a++) {
    const base = (Math.PI * 2 * a) / 3;
    for (let t = 0; t < 1; t += 0.04) {
      const r = 17 * (1 - t);
      const ang = base + t * Math.PI * 2.4;
      const r2 = 17 * (1 - t - 0.04);
      const ang2 = base + (t + 0.04) * Math.PI * 2.4;
      ctx.strokeStyle = `rgba(${200 + t * 55},${140 + t * 100},255,${0.3 + t * 0.7})`;
      ctx.lineWidth = 1.5 + t * 3.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      ctx.lineTo(Math.cos(ang2) * r2, Math.sin(ang2) * r2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#0a0414';
  ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawClone(ctx, scene) {
  const src = scene.textures.exists('player_idle') ? scene.textures.get('player_idle').getSourceImage() : null;
  if (!src) {
    ctx.fillStyle = '#2a1450';
    ctx.beginPath(); ctx.arc(16, 18, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c9a0ff';
    ctx.beginPath(); ctx.arc(26, 20, 7, 0, Math.PI * 2); ctx.fill();
    return;
  }
  // 以角色圖做剪影：先畫黑紫影子（偏左），再畫本體
  const scale = 38 / src.height;
  const w = src.width * scale;
  const h = src.height * scale;
  const shadow = document.createElement('canvas');
  shadow.width = Math.ceil(w);
  shadow.height = Math.ceil(h);
  const sctx = shadow.getContext('2d');
  sctx.drawImage(src, 0, 0, w, h);
  sctx.globalCompositeOperation = 'source-atop';
  sctx.fillStyle = 'rgba(70,30,130,0.92)';
  sctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.9;
  ctx.drawImage(shadow, 22 - w / 2 - 7, 4);
  ctx.globalAlpha = 1;
  ctx.drawImage(src, 22 - w / 2 + 5, 4, w, h);
}
