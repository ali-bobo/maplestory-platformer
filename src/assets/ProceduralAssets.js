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

// ── 平台 ──────────────────────────────────────────────────────────────────────
function generatePlatforms(scene) {
  const cfgs = [
    { key:'platform-grass', top:0x55cc33, mid:0x3d7722, bot:0x7a5230, det:'grass' },
    { key:'platform-stone', top:0xaaaaaa, mid:0x777788, bot:0x44445a, det:'stone' },
    { key:'platform-brick', top:0xdd5533, mid:0xbb3311, bot:0x882200, det:'brick' },
    { key:'platform-wood',  top:0xddbb66, mid:0xbb9933, bot:0x886611, det:'wood'  },
  ];
  const W=128, H=24;
  cfgs.forEach(({key,top,mid,bot,det})=>{
    const g=g_(scene);
    R(g,0,0,W,H,mid);
    R(g,0,0,W,8,top);
    R(g,0,H-5,W,5,bot);
    R(g,0,0,W,3,0xffffff,0.18);
    if(det==='brick'){
      R(g,0,8,W,1,0x000000,0.3);
      for(let bx=0;bx<W;bx+=32){ R(g,bx,8,1,H-8,0x000000,0.25); }
      for(let bx=16;bx<W;bx+=32){ R(g,bx,16,1,H-16,0x000000,0.25); }
    } else if(det==='stone'){
      for(let bx=0;bx<W;bx+=24){ R(g,bx,8,1,H-8,0x000000,0.2); }
    } else if(det==='grass'){
      R(g,0,0,W,5,0x55cc33);
      for(let gx=2;gx<W;gx+=8){ R(g,gx,0,5,4,0x88ee44); }
    } else if(det==='wood'){
      for(let bx=0;bx<W;bx+=16){ R(g,bx,5,1,H-5,0x000000,0.15); }
    }
    R(g,0,H-3,W,3,0x000000,0.3);
    g.generateTexture(key,W,H); g.destroy();
  });
}

// ── 技能效果 ──────────────────────────────────────────────────────────────────
function generateSkillEffects(scene){
  // 手裏劍
  let g=g_(scene);
  R(g,9,0,2,20,0x111122); R(g,0,9,20,2,0x111122);
  R(g,9,1,2,18,0xccccdd); R(g,1,9,18,2,0xccccdd);
  R(g,0,0,10,10,0x111122,0.7); R(g,10,10,10,10,0x111122,0.7);
  R(g,7,7,6,6,0xffee55);
  g.fillStyle(0xffffff,0.8); g.fillRect(7,7,3,3);
  g.generateTexture('skill-shuriken',20,20); g.destroy();

  // 能量球（暗紫）
  g=g_(scene);
  g.fillStyle(0x110022); g.fillCircle(8,8,8);
  g.fillStyle(0x6611cc); g.fillCircle(8,8,6);
  g.fillStyle(0xaa44ff); g.fillCircle(8,8,4);
  g.fillStyle(0xddaaff,0.8); g.fillCircle(6,6,2);
  g.generateTexture('skill-orb',16,16); g.destroy();

  // 分身
  g=g_(scene);
  g.fillStyle(0x7700bb,0.85);
  g.fillRect(8,22,24,16); g.fillRect(8,3,24,21);
  g.fillRect(0,22,9,13); g.fillRect(31,22,9,13);
  g.fillRect(10,36,10,18); g.fillRect(20,36,10,18);
  g.fillStyle(0xcc55ff,0.5); g.fillRect(10,5,20,15); g.fillRect(9,23,22,6);
  g.generateTexture('skill-clone',40,56); g.destroy();

  // 暗影殘影
  g=g_(scene);
  R(g,0,4,44,12,0x330066,0.9); R(g,2,5,40,10,0x8833ff,0.7);
  R(g,4,6,36,8,0xcc88ff,0.5); R(g,6,7,32,4,0xffffff,0.25);
  g.generateTexture('skill-dash-trail',44,20); g.destroy();

  // 扇形斬
  g=g_(scene);
  g.fillStyle(0xaa00ff,0.9); g.fillTriangle(0,16,32,0,32,32);
  g.fillStyle(0xdd66ff,0.7); g.fillTriangle(4,16,32,4,32,28);
  g.fillStyle(0xffffff,0.4); g.fillTriangle(8,16,32,8,32,24);
  g.generateTexture('skill-slash',32,32); g.destroy();
}

// ── 粒子 ──────────────────────────────────────────────────────────────────────
function generateParticles(scene){
  let g=g_(scene);
  g.fillStyle(0xffffff); g.fillCircle(4,4,4);
  g.generateTexture('particle-dot',8,8); g.destroy();

  g=g_(scene);
  g.fillStyle(0xffee44);
  g.fillTriangle(5,0,10,5,5,10); g.fillTriangle(0,5,5,0,5,5);
  g.fillTriangle(5,10,10,5,5,5); g.fillTriangle(0,5,5,5,5,10);
  g.generateTexture('particle-star',10,10); g.destroy();
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
