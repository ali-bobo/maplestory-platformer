// ProceduralAssets v4.0
// 角色/怪物/背景已改用 dist/assets/ 真實圖片
// 此檔只保留：平台、技能效果、粒子、物品掉落、UI 材質

export function generateTextures(scene) {
  generatePlatforms(scene);
  generateSkillEffects(scene);
  generateParticles(scene);
  generateItems(scene);
  generateUI(scene);
  generateBossAssets(scene);
}

const g_ = (scene) => scene.add.graphics();

function R(g, x, y, w, h, c, a=1) {
  g.fillStyle(c, a); g.fillRect(x,y,w,h);
}
function B(g, x, y, w, h, c) {
  g.fillStyle(0x111111); g.fillRect(x-1,y-1,w+2,h+2);
  g.fillStyle(c);        g.fillRect(x,y,w,h);
}

// ── 平台（楓之谷風格精緻版）───────────────────────────────────────────────
function generatePlatforms(scene) {
  const W = 128, H = 24;

  // ── 草地平台：頂部草皮 + 泥土層 + 草絲細節 + 高光 ──
  {
    const g = g_(scene);
    // 底層泥土
    R(g, 0, 8, W, H - 8, 0x6B4226);
    // 泥土紋理暗帶
    for (let bx = 0; bx < W; bx += 18) {
      R(g, bx, 12, 10, 3, 0x5A3620, 0.6);
    }
    for (let bx = 8; bx < W; bx += 22) {
      R(g, bx, 17, 8, 3, 0x4E2E1A, 0.5);
    }
    // 泥土中的小石子
    g.fillStyle(0x8B7355, 0.4);
    g.fillCircle(15, 16, 2); g.fillCircle(45, 18, 1.5);
    g.fillCircle(78, 15, 2); g.fillCircle(110, 17, 1.5);
    // 頂部草地層（深綠）
    R(g, 0, 0, W, 10, 0x3D8B37);
    // 草地亮色中間帶
    R(g, 0, 2, W, 5, 0x4CA64C, 0.8);
    // 頂部高光帶
    R(g, 0, 0, W, 2, 0x6FCF6F, 0.6);
    // 草絲裝飾（不規則的小草叢）
    for (let gx = 0; gx < W; gx += 6) {
      const gh = 3 + Math.floor(Math.sin(gx * 0.8) * 2);
      const gc = (gx % 12 < 6) ? 0x5BBF5B : 0x7FD97F;
      g.fillStyle(gc, 0.7);
      g.fillRect(gx, 0, 3, -gh + 3);  // 草絲向上
    }
    // 草地與泥土交接處的陰影
    R(g, 0, 9, W, 2, 0x2D5A1E, 0.4);
    // 底部陰影
    R(g, 0, H - 3, W, 3, 0x000000, 0.25);
    // 左右邊緣暗化
    R(g, 0, 0, 2, H, 0x000000, 0.15);
    R(g, W - 2, 0, 2, H, 0x000000, 0.15);
    g.generateTexture('platform-grass', W, H);
    g.destroy();
  }

  // ── 石頭平台：灰石面 + 磚縫 + 苔蘚痕跡 + 高光 ──
  {
    const g = g_(scene);
    // 基底石色
    R(g, 0, 0, W, H, 0x778899);
    // 石面紋理（多層次灰色磚塊）
    for (let bx = 0; bx < W; bx += 32) {
      R(g, bx, 0, 30, 11, 0x8899AA, 0.8);
      R(g, bx + 16, 12, 30, 11, 0x7788A0, 0.8);
    }
    // 磚縫（深色線條）
    for (let bx = 0; bx < W; bx += 32) {
      R(g, bx, 0, 1, H, 0x3A4A5A, 0.5);
    }
    R(g, 0, 11, W, 1, 0x3A4A5A, 0.4);
    // 石面紋理暗斑
    g.fillStyle(0x667788, 0.3);
    g.fillCircle(20, 6, 4); g.fillCircle(60, 16, 3);
    g.fillCircle(100, 8, 3.5); g.fillCircle(45, 20, 2.5);
    // 苔蘚痕跡（淡綠）
    g.fillStyle(0x6B8E6B, 0.25);
    g.fillRect(5, 0, 12, 3); g.fillRect(50, 1, 8, 2);
    g.fillRect(90, 0, 15, 2); g.fillRect(115, 1, 10, 3);
    // 頂部高光
    R(g, 0, 0, W, 2, 0xBBCCDD, 0.4);
    // 底部陰影
    R(g, 0, H - 3, W, 3, 0x000000, 0.3);
    // 邊緣陰影
    R(g, 0, 0, 2, H, 0x000000, 0.12);
    R(g, W - 2, 0, 2, H, 0x000000, 0.12);
    g.generateTexture('platform-stone', W, H);
    g.destroy();
  }

  // ── 磚塊平台：紅磚牆面 + 水泥線 + 風化效果 ──
  {
    const g = g_(scene);
    // 基底磚色
    R(g, 0, 0, W, H, 0xB35533);
    // 磚塊（交錯排列）
    const brickW = 24, brickH = 10;
    for (let row = 0; row < 3; row++) {
      const offset = (row % 2) * (brickW / 2);
      for (let bx = -brickW + offset; bx < W; bx += brickW + 2) {
        const by = row * (brickH + 2);
        // 磚塊本體（用 bx/row 做偽隨機微色差，模擬自然風化）
        const shade = 0xAA4422 + (((bx * 7 + row * 13) % 30) << 8);
        g.fillStyle(shade, 0.9);
        g.fillRect(Math.max(0, bx), by, brickW, brickH);
        // 磚塊高光（頂部）
        g.fillStyle(0xCC6644, 0.4);
        g.fillRect(Math.max(0, bx), by, brickW, 2);
        // 磚塊暗邊（底部）
        g.fillStyle(0x882211, 0.3);
        g.fillRect(Math.max(0, bx), by + brickH - 2, brickW, 2);
      }
    }
    // 水泥縫隙
    R(g, 0, brickH, W, 2, 0xAA9988, 0.6);
    for (let bx = 0; bx < W; bx += brickW + 2) {
      R(g, bx, 0, 2, H, 0xAA9988, 0.4);
    }
    for (let bx = brickW / 2; bx < W; bx += brickW + 2) {
      R(g, bx, brickH + 2, 2, H, 0xAA9988, 0.4);
    }
    // 風化斑點
    g.fillStyle(0x996644, 0.2);
    g.fillCircle(30, 5, 3); g.fillCircle(75, 15, 2.5);
    g.fillCircle(110, 8, 2);
    // 頂部高光
    R(g, 0, 0, W, 2, 0xDD8866, 0.35);
    // 底部陰影
    R(g, 0, H - 3, W, 3, 0x000000, 0.3);
    g.generateTexture('platform-brick', W, H);
    g.destroy();
  }

  // ── 木頭平台：木紋 + 木釘 + 年輪紋理 + 高光 ──
  {
    const g = g_(scene);
    // 基底木色
    R(g, 0, 0, W, H, 0xAA8844);
    // 木板（橫向分段）
    for (let bx = 0; bx < W; bx += 28) {
      const shade = (bx % 56 < 28) ? 0xBB9955 : 0x997733;
      R(g, bx, 2, 26, H - 4, shade, 0.8);
    }
    // 木紋線條（水平波紋）
    for (let y = 3; y < H - 2; y += 3) {
      g.lineStyle(1, 0x886633, 0.2 + Math.sin(y * 0.5) * 0.1);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x < W; x += 4) {
        g.lineTo(x, y + Math.sin(x * 0.15 + y) * 0.8);
      }
      g.strokePath();
    }
    // 木板分隔線（垂直）
    for (let bx = 27; bx < W; bx += 28) {
      R(g, bx, 0, 2, H, 0x664422, 0.5);
    }
    // 木釘裝飾
    g.fillStyle(0x776644, 0.7);
    g.fillCircle(14, 6, 2); g.fillCircle(42, 6, 2);
    g.fillCircle(70, 6, 2); g.fillCircle(98, 6, 2);
    g.fillStyle(0x998866, 0.4);
    g.fillCircle(13, 5, 1); g.fillCircle(41, 5, 1);
    g.fillCircle(69, 5, 1); g.fillCircle(97, 5, 1);
    // 頂部高光
    R(g, 0, 0, W, 2, 0xDDCC88, 0.35);
    // 底部陰影
    R(g, 0, H - 3, W, 3, 0x000000, 0.25);
    // 邊緣暗化
    R(g, 0, 0, 2, H, 0x000000, 0.1);
    R(g, W - 2, 0, 2, H, 0x000000, 0.1);
    g.generateTexture('platform-wood', W, H);
    g.destroy();
  }
}

// ── 技能效果（強化版 — 多層漸層 + 光暈）──────────────────────────────────
function generateSkillEffects(scene){
  // 手裏劍（多層金屬光澤）
  let g=g_(scene);
  // 外框暗色
  R(g,8,0,4,20,0x222244); R(g,0,8,20,4,0x222244);
  // 十字金屬
  R(g,9,1,2,18,0xDDDDEE); R(g,1,9,18,2,0xDDDDEE);
  // 斜角暗影
  g.fillStyle(0x333355, 0.7);
  g.fillTriangle(0,0,10,10,0,10); g.fillTriangle(20,20,10,10,20,10);
  // 中心寶石
  g.fillStyle(0xFFDD44); g.fillCircle(10,10,4);
  g.fillStyle(0xFFFF88, 0.8); g.fillCircle(9,9,2);
  // 外圍光暈
  g.fillStyle(0x88CCFF, 0.15); g.fillCircle(10,10,9);
  g.generateTexture('skill-shuriken',20,20); g.destroy();

  // 能量球（多層漸層光球）
  g=g_(scene);
  // 外圍柔和光暈
  g.fillStyle(0x4400aa, 0.2); g.fillCircle(8,8,8);
  g.fillStyle(0x6611cc, 0.4); g.fillCircle(8,8,7);
  // 核心
  g.fillStyle(0x8822ee, 0.8); g.fillCircle(8,8,5);
  g.fillStyle(0xBB66FF, 0.9); g.fillCircle(8,8,3.5);
  // 高光
  g.fillStyle(0xEECCFF, 0.9); g.fillCircle(6,6,2);
  g.fillStyle(0xFFFFFF, 0.7); g.fillCircle(6,5,1);
  g.generateTexture('skill-orb',16,16); g.destroy();

  // 分身（帶光暈輪廓）
  g=g_(scene);
  // 外圍氣場
  g.fillStyle(0x5500aa, 0.2); g.fillEllipse(20,28,42,58);
  // 身體
  g.fillStyle(0x7700bb,0.85);
  g.fillRect(8,22,24,16); g.fillRect(8,3,24,21);
  g.fillRect(0,22,9,13); g.fillRect(31,22,9,13);
  g.fillRect(10,36,10,18); g.fillRect(20,36,10,18);
  // 發光邊緣
  g.fillStyle(0xCC55FF,0.5); g.fillRect(10,5,20,15); g.fillRect(9,23,22,6);
  // 核心光點
  g.fillStyle(0xEEAAFF,0.4); g.fillCircle(20,15,6);
  g.generateTexture('skill-clone',40,56); g.destroy();

  // 暗影殘影（帶漸層光帶）
  g=g_(scene);
  R(g,0,2,44,16,0x220044,0.4);
  R(g,0,4,44,12,0x330066,0.9);
  R(g,2,5,40,10,0x8833ff,0.7);
  R(g,4,6,36,8,0xCC88FF,0.5);
  R(g,8,8,28,4,0xFFCCFF,0.3);
  g.generateTexture('skill-dash-trail',44,20); g.destroy();

  // 扇形斬（多層漸變）
  g=g_(scene);
  g.fillStyle(0xaa00ff,0.9); g.fillTriangle(0,16,32,0,32,32);
  g.fillStyle(0xCC44FF,0.7); g.fillTriangle(4,16,32,4,32,28);
  g.fillStyle(0xEE88FF,0.5); g.fillTriangle(8,16,32,8,32,24);
  g.fillStyle(0xFFCCFF,0.3); g.fillTriangle(12,16,32,12,32,20);
  g.generateTexture('skill-slash',32,32); g.destroy();
}

// ── 粒子（強化版 — 柔和光暈 + ADD blend 友好）──────────────────────────────
function generateParticles(scene){
  // 柔和光暈圓點（較大，帶 falloff 適合 ADD blend）
  let g=g_(scene);
  g.fillStyle(0xffffff, 0.2); g.fillCircle(6,6,6);
  g.fillStyle(0xffffff, 0.5); g.fillCircle(6,6,4);
  g.fillStyle(0xffffff, 0.9); g.fillCircle(6,6,2);
  g.fillStyle(0xffffff, 1.0); g.fillCircle(6,6,1);
  g.generateTexture('particle-dot',12,12); g.destroy();

  // 星形粒子（帶光暈）
  g=g_(scene);
  g.fillStyle(0xffee44, 0.15); g.fillCircle(7,7,7);
  g.fillStyle(0xffee44, 0.6);
  g.fillTriangle(7,0,10,5,7,10); g.fillTriangle(0,5,7,0,7,5);
  g.fillTriangle(7,10,14,5,7,5); g.fillTriangle(0,5,7,5,7,10);
  g.fillStyle(0xffffff, 0.5); g.fillCircle(7,7,2);
  g.generateTexture('particle-star',14,14); g.destroy();

  // 新增：光束粒子（長條形，適合拖尾）
  g=g_(scene);
  g.fillStyle(0xffffff, 0.1); g.fillRect(0,1,16,6);
  g.fillStyle(0xffffff, 0.4); g.fillRect(2,2,12,4);
  g.fillStyle(0xffffff, 0.8); g.fillRect(4,3,8,2);
  g.generateTexture('particle-beam',16,8); g.destroy();
}

// ── 物品 ──────────────────────────────────────────────────────────────────────
function generateItems(scene){
  let g=g_(scene);
  g.fillStyle(0x997700); g.fillCircle(8,8,8);
  g.fillStyle(0xffcc00); g.fillCircle(8,8,6);
  g.fillStyle(0xffee88); g.fillCircle(6,6,3);
  g.generateTexture('item-meso',16,16); g.destroy();

  g=g_(scene);
  R(g,2,3,10,12,0x111111); R(g,3,4,8,10,0xcc2222);
  R(g,4,5,3,7,0xff7777); R(g,4,1,6,4,0x888888); R(g,5,1,4,2,0xaaaaaa);
  g.generateTexture('item-hp-potion',14,16); g.destroy();

  g=g_(scene);
  R(g,2,3,10,12,0x111111); R(g,3,4,8,10,0x2222cc);
  R(g,4,5,3,7,0x7777ff); R(g,4,1,6,4,0x888888); R(g,5,1,4,2,0xaaaaaa);
  g.generateTexture('item-mp-potion',14,16); g.destroy();

  const eqs=[
    {key:'item-weapon', fn:g=>{ R(g,5,0,5,14,0x444455); R(g,5,0,5,12,0xcccccc); R(g,2,9,12,4,0x999999); R(g,6,0,3,6,0xffcc33); R(g,6,1,1,4,0xffffff,0.5); }},
    {key:'item-armor',  fn:g=>{ R(g,3,2,10,12,0x113388); R(g,1,2,3,9,0x2244aa); R(g,12,2,3,9,0x2244aa); R(g,5,3,6,5,0x4488cc); R(g,6,4,4,3,0x99ccff,0.5); }},
    {key:'item-gloves', fn:g=>{ R(g,3,5,10,9,0x664411); for(let i=0;i<4;i++) R(g,2+i*3,2,3,7,0x7a4d1c); }},
    {key:'item-helmet', fn:g=>{ g.fillStyle(0x334466); g.fillEllipse(8,7,14,12); R(g,2,10,12,4,0x3355aa); g.fillStyle(0x7799cc); g.fillEllipse(8,5,8,6); }},
    {key:'item-boots',  fn:g=>{ R(g,4,2,8,10,0x553311); R(g,2,10,11,4,0x442211); R(g,5,3,3,7,0x886644); }},
  ];
  eqs.forEach(({key,fn})=>{ const g=g_(scene); fn(g); g.generateTexture(key,16,16); g.destroy(); });
}

// ── UI ──────────────────────────────────────────────────────────────────────
function generateUI(scene){
  // 商人 NPC
  let g=g_(scene);
  B(g,7,36,8,16,0x224499); B(g,17,36,8,16,0x224499);
  B(g,4,18,24,20,0x3366aa); R(g,5,19,22,8,0x4477bb);
  B(g,7,3,18,16,0xffcc99); R(g,8,4,16,8,0xffe0bb);
  B(g,5,1,22,7,0x994411); R(g,6,1,20,3,0xbb5522);
  g.fillStyle(0x111111); g.fillRect(9,9,4,4); g.fillRect(19,9,4,4);
  g.fillStyle(0xffffff); g.fillRect(10,9,2,2); g.fillRect(20,9,2,2);
  R(g,12,15,8,2,0xcc7755);
  B(g,0,18,6,13,0xffcc99); B(g,26,18,6,13,0xffcc99);
  g.fillStyle(0xffcc00); g.fillCircle(16,50,5);
  g.fillStyle(0xffee88); g.fillCircle(15,49,2);
  g.generateTexture('npc-shop',32,52); g.destroy();

  // 傳送門
  g=g_(scene);
  R(g,0,0,44,78,0x110022,0.95);
  R(g,4,0,36,78,0x550099,0.9);
  R(g,8,0,28,78,0x9933ff,0.85);
  R(g,13,0,18,78,0xcc77ff,0.65);
  R(g,18,0,8,78,0xeeccff,0.3);
  g.lineStyle(2,0xdd88ff,0.9); g.strokeRect(2,2,40,74);
  g.fillStyle(0xffffff,0.55); g.fillEllipse(22,5,28,12);
  g.fillStyle(0xeeddff,0.4); g.fillEllipse(22,5,20,8);
  g.generateTexture('portal',44,78); g.destroy();
}

// ── Boss 素材 ────────────────────────────────────────────────────────────────
function generateBossAssets(scene) {
  // ─ monster-boss：64×64 暗影魔君（紫黑人形＋紅眼＋披風）─
  {
    const W = 64, H = 64;
    const g = g_(scene);

    // 外光環
    g.fillStyle(0x3300aa, 0.35); g.fillCircle(32, 36, 26);
    g.fillStyle(0x5500cc, 0.25); g.fillCircle(32, 36, 20);

    // 披風（深紫三角）
    g.fillStyle(0x1a0030, 0.95);
    g.fillTriangle(8, 62, 56, 62, 32, 10);
    g.fillStyle(0x3300aa, 0.75);
    g.fillTriangle(13, 60, 51, 60, 32, 14);

    // 身體
    g.fillStyle(0x0a0015);
    g.fillRect(22, 28, 20, 24);
    g.fillStyle(0x220040, 0.9);
    g.fillRect(23, 29, 18, 22);

    // 手臂
    g.fillStyle(0x0a0015);
    g.fillRect(10, 29, 12, 5);
    g.fillRect(42, 29, 12, 5);
    g.fillStyle(0x550088, 0.8);
    g.fillRect(6, 32, 8, 4);
    g.fillRect(50, 32, 8, 4);

    // 腿
    g.fillStyle(0x0a0015);
    g.fillRect(23, 51, 7, 12);
    g.fillRect(34, 51, 7, 12);

    // 頭
    g.fillStyle(0x110022);
    g.fillCircle(32, 22, 11);
    g.fillStyle(0x220044, 0.8);
    g.fillCircle(32, 22, 9);

    // 角（尖刺）
    g.fillStyle(0x0a0018);
    g.fillTriangle(22, 14, 28, 4,  30, 16);
    g.fillTriangle(42, 14, 36, 4,  34, 16);

    // 紅眼
    g.fillStyle(0xff0000, 0.95); g.fillEllipse(27, 20, 5, 4);
    g.fillStyle(0xff0000, 0.95); g.fillEllipse(37, 20, 5, 4);
    g.fillStyle(0xff8888);       g.fillCircle(27, 20, 1.5);
    g.fillStyle(0xff8888);       g.fillCircle(37, 20, 1.5);

    // 能量紋路
    g.lineStyle(1, 0xaa00ff, 0.6);
    g.beginPath(); g.moveTo(14, 33); g.lineTo(7, 27); g.strokePath();
    g.beginPath(); g.moveTo(50, 32); g.lineTo(57, 26); g.strokePath();

    g.generateTexture('monster-boss', W, H);
    g.destroy();
  }

  // ─ bg_boss：256×256 暗影領域背景 tile（暗紫漸層＋六芒星符文）─
  {
    const S = 256;
    const g = g_(scene);

    // 基底黑
    g.fillStyle(0x0D0018); g.fillRect(0, 0, S, S);

    // 暗紫圓暈（模擬漸層）
    const levels = [
      { r: 110, c: 0x1A0035, a: 0.55 },
      { r: 75,  c: 0x250050, a: 0.35 },
      { r: 45,  c: 0x300066, a: 0.2  },
    ];
    for (const { r, c, a } of levels) {
      g.fillStyle(c, a); g.fillCircle(S / 2, S / 2, r);
    }

    // 六芒星（2個等邊三角形交疊）
    const drawTri = (cx, cy, r, rot) => {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + rot;
        pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      g.lineStyle(1, 0x6600cc, 0.22);
      g.beginPath();
      g.moveTo(pts[0], pts[1]);
      g.lineTo(pts[2], pts[3]);
      g.lineTo(pts[4], pts[5]);
      g.closePath();
      g.strokePath();
    };
    drawTri(S / 2, S / 2, 90, -Math.PI / 2);
    drawTri(S / 2, S / 2, 90,  Math.PI / 2);

    // 外圈
    g.lineStyle(1, 0x550099, 0.18);
    g.strokeCircle(S / 2, S / 2, 100);
    g.lineStyle(1, 0x440077, 0.12);
    g.strokeCircle(S / 2, S / 2, 60);

    // 8條放射線（極暗）
    g.lineStyle(1, 0x4400aa, 0.1);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(S / 2, S / 2);
      g.lineTo(S / 2 + 110 * Math.cos(a), S / 2 + 110 * Math.sin(a));
      g.strokePath();
    }

    g.generateTexture('bg_boss', S, S);
    g.destroy();
  }
}
