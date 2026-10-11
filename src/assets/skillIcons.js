// 技能圖示（程式繪製）：38×38 canvas 紋理，key 為 skill_icon_<技能 id>
//
// 每個圖示 = 深紫寶石底 + 主體圖案，放進 HUD 木框技能格中央使用。
// 轉職技能（backstab poison mark whirl steal smoke）與刺客 / 俠盜的普通攻擊（ATK_assassin / ATK_bandit）
// 目前也是程式繪製的暫代圖；手繪 PNG 到位後把 id 加進 assetCatalog 的 SKILL_ICON_PNG_IDS，
// BootScene 會預載 skill_icon_<id>，這裡偵測到該紋理已存在就不再繪製（見下方 exists 檢查）。

const SIZE = 38;
const DESIGN = 44; // 繪圖座標以 44px 設計，輸出時縮放到 SIZE

// HUD / 拖曳用的圖示鍵：普通攻擊欄依職業換圖
export function skillIconKey(skillId, job) {
  if (skillId === 'ATK' && job && job !== 'thief') return `skill_icon_ATK_${job}`;
  return `skill_icon_${skillId}`;
}

export function ensureSkillIcons(scene) {
  const draws = {
    ATK: drawSlash, Z: drawShurikens, X: drawDash, C: drawDagger, V: drawVortex, B: drawClone,
    ATK_assassin: drawTwinBlades, ATK_bandit: drawSabre,
    backstab: drawBackstab, poison: drawPoison, mark: drawMark,
    whirl: drawWhirl, steal: drawSteal, smoke: drawSmoke,
  };
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

function drawSlash(ctx) {
  // 斜斬弧光 + 匕首
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(190,220,255,0.75)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(24, 26, 15, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(24, 26, 11, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
  ctx.save();
  ctx.translate(22, 24);
  ctx.rotate(-0.8);
  ctx.fillStyle = '#e8eefc';
  ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(3, -16); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a95b0';
  ctx.fillRect(0, -16, 3, 21);
  ctx.fillStyle = '#6b4a22';
  ctx.fillRect(-6, 5, 12, 3);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(-2, 8, 4, 8);
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

// ── 轉職技能（暫代圖）──────────────────────────────────────────────────────

function blade(ctx, x, y, rot, len = 17, color = ['#9aa3b8', '#ffffff', '#6d7590']) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const g = ctx.createLinearGradient(-4, 0, 4, 0);
  g.addColorStop(0, color[0]); g.addColorStop(0.5, color[1]); g.addColorStop(1, color[2]);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, -len); ctx.lineTo(3.5, -len * 0.3); ctx.lineTo(3.5, 3); ctx.lineTo(-3.5, 3); ctx.lineTo(-3.5, -len * 0.3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0b04a'; ctx.fillRect(-6, 3, 12, 2.5);
  ctx.fillStyle = '#3a2410'; ctx.fillRect(-2, 5.5, 4, 7);
  ctx.restore();
}

function drawTwinBlades(ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(120,230,255,0.7)'; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.arc(22, 24, 15, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  blade(ctx, 15, 25, -0.7, 15);
  blade(ctx, 29, 25, 0.7, 15);
}

function drawSabre(ctx) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,150,60,0.8)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(22, 28, 17, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(22, 28, 13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  // 彎刀：弧形刀身
  ctx.save();
  ctx.translate(22, 24); ctx.rotate(-0.5);
  ctx.fillStyle = '#e8eefc';
  ctx.beginPath(); ctx.moveTo(-14, 6); ctx.quadraticCurveTo(0, -16, 15, -4); ctx.quadraticCurveTo(2, -8, -14, 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e0b04a'; ctx.fillRect(-18, 5, 6, 4);
  ctx.restore();
}

function drawBackstab(ctx) {
  // 背後的暗影人形 + 三道刺擊
  ctx.fillStyle = 'rgba(30,10,60,0.9)';
  ctx.beginPath(); ctx.arc(14, 13, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(7, 36); ctx.lineTo(10, 19); ctx.lineTo(19, 19); ctx.lineTo(22, 36); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,70,110,0.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  [[22, 10, 36, 20], [24, 16, 38, 26], [22, 22, 36, 32]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  blade(ctx, 30, 24, 1.9, 16);
}

function drawPoison(ctx) {
  // 綠色毒鏢 + 滴落的毒液
  ctx.save();
  ctx.translate(22, 20); ctx.rotate(-0.7);
  ctx.fillStyle = '#b6ff7a';
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(3, -4); ctx.lineTo(3, 8); ctx.lineTo(-3, 8); ctx.lineTo(-3, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4fa332'; ctx.fillRect(0, -16, 3, 24);
  ctx.fillStyle = '#6b4a22'; ctx.fillRect(-4, 8, 8, 3);
  ctx.restore();
  ctx.fillStyle = 'rgba(140,255,90,0.9)';
  [[13, 30, 3.2], [24, 35, 2.6], [32, 31, 3]].forEach(([x, y, r]) => {
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.8); ctx.quadraticCurveTo(x + r * 1.2, y, x, y + r); ctx.quadraticCurveTo(x - r * 1.2, y, x, y - r * 1.8); ctx.fill();
  });
}

function drawMark(ctx) {
  ctx.strokeStyle = 'rgba(255,60,90,0.95)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(22, 22, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(22, 22, 7, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2.5;
  [[22, 4, 22, 13], [22, 31, 22, 40], [4, 22, 13, 22], [31, 22, 40, 22]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });
  ctx.fillStyle = '#ffd0d8';
  ctx.beginPath(); ctx.arc(22, 22, 2.5, 0, Math.PI * 2); ctx.fill();
}

function drawWhirl(ctx) {
  // 赤紅月牙狀迴旋斬
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a0 = (Math.PI * 2 * i) / 3;
    ctx.strokeStyle = `rgba(255,${90 + i * 30},${70 + i * 20},${0.95 - i * 0.15})`;
    ctx.lineWidth = 5 - i;
    ctx.beginPath(); ctx.arc(22, 22, 14 - i * 2.5, a0, a0 + Math.PI * 0.85); ctx.stroke();
  }
  ctx.fillStyle = '#ffe9c8';
  ctx.beginPath(); ctx.arc(22, 22, 3, 0, Math.PI * 2); ctx.fill();
}

function drawSteal(ctx) {
  // 金幣 + 閃光 + 伸出的手指
  const g = ctx.createRadialGradient(20, 20, 2, 22, 22, 12);
  g.addColorStop(0, '#fff3a0'); g.addColorStop(1, '#d9951c');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(22, 21, 11, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#8a5a10'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#8a5a10'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', 22, 22);
  ctx.fillStyle = '#ffe9c8';
  ctx.beginPath(); ctx.moveTo(30, 34); ctx.quadraticCurveTo(34, 26, 38, 30); ctx.lineTo(37, 38); ctx.lineTo(28, 38); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  [[10, 10], [36, 12]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 1.2, y - 1.2); ctx.lineTo(x + 4, y); ctx.lineTo(x + 1.2, y + 1.2); ctx.lineTo(x, y + 4); ctx.lineTo(x - 1.2, y + 1.2); ctx.lineTo(x - 4, y); ctx.lineTo(x - 1.2, y - 1.2); ctx.closePath(); ctx.fill();
  });
}

function drawSmoke(ctx) {
  [[14, 28, 9, 0.7], [27, 26, 11, 0.8], [21, 17, 9, 0.9], [32, 33, 7, 0.6], [10, 36, 6, 0.55]].forEach(([x, y, r, a]) => {
    const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, r);
    g.addColorStop(0, `rgba(235,235,245,${a})`); g.addColorStop(1, `rgba(120,120,150,${a * 0.5})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  });
  // 小炸彈
  ctx.fillStyle = '#2a2a38'; ctx.beginPath(); ctx.arc(22, 22, 5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ffb04a'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(22, 17); ctx.quadraticCurveTo(25, 12, 29, 13); ctx.stroke();
}
