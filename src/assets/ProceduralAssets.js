// 程序化材質生成
// 所有遊戲材質在此生成，無需外部圖片檔案

export function generateTextures(scene) {
  generatePlatforms(scene);
  generatePlayer(scene);
  generateMonsters(scene);
  generateSkillEffects(scene);
  generateParticles(scene);
  generateItems(scene);
  generateBackground(scene);
  generateUI(scene);
}

function makeGraphics(scene) {
  return scene.add.graphics();
}

// ── 平台 ──────────────────────────────────────────────────────────────────────
function generatePlatforms(scene) {
  const configs = [
    { key: 'platform-grass',  top: 0x5aad32, mid: 0x4e9428, bot: 0x6b4226 },
    { key: 'platform-stone',  top: 0x8a8a8a, mid: 0x6e6e6e, bot: 0x555555 },
    { key: 'platform-brick',  top: 0xcc5533, mid: 0xaa4422, bot: 0x883311 },
    { key: 'platform-wood',   top: 0xc8a46e, mid: 0xb08d55, bot: 0x886633 },
  ];
  const W = 128, H = 24;
  for (const cfg of configs) {
    const g = makeGraphics(scene);
    g.fillStyle(cfg.mid);
    g.fillRect(0, 0, W, H);
    g.fillStyle(cfg.top);
    g.fillRect(0, 0, W, 6);
    g.fillStyle(cfg.bot);
    g.fillRect(0, H - 6, W, 6);
    // 磚塊紋理
    if (cfg.key === 'platform-brick') {
      g.fillStyle(0x773322, 0.5);
      for (let bx = 0; bx < W; bx += 32) {
        g.fillRect(bx, 8, 1, 8);
      }
      for (let bx = 16; bx < W; bx += 32) {
        g.fillRect(bx, 18, 1, 4);
      }
    }
    g.generateTexture(cfg.key, W, H);
    g.destroy();
  }
}

// ── 玩家 ──────────────────────────────────────────────────────────────────────
function generatePlayer(scene) {
  const drawThief = (g, bodyColor, accentColor) => {
    const W = 32, H = 48;
    // 腿
    g.fillStyle(0x222266);
    g.fillRect(8, 32, 7, 16);
    g.fillRect(17, 32, 7, 16);
    // 軀幹
    g.fillStyle(bodyColor);
    g.fillRect(6, 16, 20, 18);
    // 披風
    g.fillStyle(accentColor, 0.8);
    g.fillRect(4, 16, 4, 20);
    // 頭
    g.fillStyle(0xffcc99);
    g.fillRect(9, 4, 14, 13);
    // 頭巾
    g.fillStyle(accentColor);
    g.fillRect(7, 2, 18, 6);
    // 眼睛
    g.fillStyle(0x000000);
    g.fillRect(12, 9, 3, 3);
    g.fillRect(17, 9, 3, 3);
    // 手臂
    g.fillStyle(bodyColor);
    g.fillRect(1, 17, 6, 10);
    g.fillRect(25, 17, 6, 10);
    // 鞋子
    g.fillStyle(0x444444);
    g.fillRect(7, 44, 9, 4);
    g.fillRect(16, 44, 9, 4);
  };

  // idle
  let g = makeGraphics(scene);
  drawThief(g, 0x334477, 0x7722cc);
  g.generateTexture('player-idle', 32, 48);
  g.destroy();

  // walk (略微不同姿態)
  g = makeGraphics(scene);
  drawThief(g, 0x334477, 0x7722cc);
  g.fillStyle(0x222266);
  g.fillRect(8, 32, 7, 14);
  g.fillRect(17, 36, 7, 12);
  g.generateTexture('player-walk', 32, 48);
  g.destroy();

  // jump
  g = makeGraphics(scene);
  drawThief(g, 0x334477, 0x7722cc);
  g.fillStyle(0x222266);
  g.fillRect(6, 30, 8, 14);
  g.fillRect(18, 30, 8, 14);
  g.generateTexture('player-jump', 32, 48);
  g.destroy();

  // attack
  g = makeGraphics(scene);
  drawThief(g, 0x334477, 0x7722cc);
  g.fillStyle(0x334477);
  g.fillRect(25, 14, 8, 8);
  g.generateTexture('player-attack', 32, 48);
  g.destroy();
}

// ── 怪物 ──────────────────────────────────────────────────────────────────────
function generateMonsters(scene) {
  // 蝸牛
  drawMonster(scene, 'monster-snail', (g) => {
    g.fillStyle(0xffaa44); g.fillEllipse(16, 22, 28, 16);  // 身體
    g.fillStyle(0xff6622); g.fillEllipse(22, 14, 18, 18);  // 殼
    g.fillStyle(0xffcc66); g.fillRect(4, 24, 6, 6);        // 觸角
  });

  // 蘑菇
  drawMonster(scene, 'monster-mushroom', (g) => {
    g.fillStyle(0xcc3322); g.fillEllipse(16, 12, 28, 20);  // 帽子
    g.fillStyle(0xffffff); g.fillRect(7, 18, 5, 4); g.fillRect(18, 18, 5, 4); // 點
    g.fillStyle(0xffe0cc); g.fillRect(10, 20, 12, 12);     // 臉
    g.fillStyle(0x000000); g.fillRect(12, 22, 3, 3); g.fillRect(17, 22, 3, 3); // 眼
  });

  // 史萊姆
  drawMonster(scene, 'monster-slime', (g) => {
    g.fillStyle(0x44aaff); g.fillEllipse(16, 20, 28, 22);
    g.fillStyle(0x2288dd); g.fillEllipse(16, 22, 24, 14);
    g.fillStyle(0xffffff); g.fillEllipse(11, 15, 6, 7); g.fillEllipse(21, 15, 6, 7);
    g.fillStyle(0x000000); g.fillEllipse(12, 16, 3, 4); g.fillEllipse(22, 16, 3, 4);
  });

  // 野豬
  drawMonster(scene, 'monster-pig', (g) => {
    g.fillStyle(0xff99bb); g.fillEllipse(16, 22, 28, 20);
    g.fillStyle(0xff6688); g.fillRect(4, 20, 8, 6);   // 嘴
    g.fillStyle(0x000000); g.fillRect(10, 16, 4, 4); g.fillRect(18, 16, 4, 4);
    g.fillStyle(0xff99bb); g.fillRect(6, 28, 5, 6); g.fillRect(11, 28, 5, 6);
    g.fillRect(16, 28, 5, 6); g.fillRect(21, 28, 5, 6);
  });

  // 樹樁怪
  drawMonster(scene, 'monster-stump', (g) => {
    g.fillStyle(0x8b4513); g.fillRect(6, 10, 20, 22);
    g.fillStyle(0x5a2d0c); g.fillRect(4, 8, 24, 6);   // 頂部
    g.fillStyle(0x228b22); g.fillEllipse(16, 6, 30, 14); // 葉子
    g.fillStyle(0xffcc66); g.fillRect(9, 16, 5, 5); g.fillRect(18, 16, 5, 5);
    g.fillStyle(0x000000); g.fillRect(10, 17, 3, 3); g.fillRect(19, 17, 3, 3);
  });

  // 野豬獸 (較大)
  drawMonster(scene, 'monster-boar', (g) => {
    g.fillStyle(0x886644); g.fillEllipse(16, 20, 30, 22);
    g.fillStyle(0x664422); g.fillEllipse(8, 20, 12, 10);  // 口鼻
    g.fillStyle(0xffffff); g.fillRect(4, 15, 5, 8);        // 牙
    g.fillStyle(0x000000); g.fillRect(11, 14, 5, 5); g.fillRect(19, 14, 5, 5);
    g.fillStyle(0x886644); g.fillRect(5, 28, 6, 5); g.fillRect(21, 28, 6, 5);
  });

  // 石頭精
  drawMonster(scene, 'monster-golem', (g) => {
    g.fillStyle(0x888888); g.fillRect(4, 8, 24, 24);
    g.fillStyle(0xaaaaaa); g.fillRect(4, 8, 24, 4);
    g.fillStyle(0xff4400); g.fillRect(8, 14, 5, 5); g.fillRect(19, 14, 5, 5); // 眼
    g.fillStyle(0x666666); g.fillRect(10, 22, 12, 4); // 嘴縫
    g.fillStyle(0x777777); g.fillRect(2, 12, 4, 16); g.fillRect(26, 12, 4, 16); // 臂
  });

  // 殭屍蘑菇
  drawMonster(scene, 'monster-zombie', (g) => {
    g.fillStyle(0x556633); g.fillEllipse(16, 12, 28, 20);
    g.fillStyle(0x334422); g.fillRect(7, 18, 5, 4); g.fillRect(18, 18, 5, 4);
    g.fillStyle(0xaabb88); g.fillRect(10, 20, 12, 12);
    g.fillStyle(0xff0000); g.fillRect(12, 22, 3, 3); g.fillRect(17, 22, 3, 3);
    g.fillStyle(0x556633); g.fillRect(8, 30, 5, 3); // 傷疤
  });

  // 哥布林弓手
  drawMonster(scene, 'monster-goblin', (g) => {
    g.fillStyle(0x44aa44); g.fillRect(10, 16, 12, 16);
    g.fillStyle(0x66cc66); g.fillEllipse(16, 12, 16, 16);
    g.fillStyle(0xffff00); g.fillRect(11, 9, 4, 5); g.fillRect(17, 9, 4, 5); // 耳朵
    g.fillStyle(0x000000); g.fillRect(12, 11, 3, 3); g.fillRect(17, 11, 3, 3);
    g.fillStyle(0x886633); g.fillRect(22, 12, 3, 18); // 弓
  });

  // Boss
  drawMonster(scene, 'monster-boss', (g) => {
    g.fillStyle(0x220033); g.fillRect(2, 4, 28, 28);
    g.fillStyle(0x440066); g.fillEllipse(16, 10, 28, 16);
    g.fillStyle(0xff0066); g.fillRect(6, 12, 7, 7); g.fillRect(19, 12, 7, 7);
    g.fillStyle(0x660099); g.fillRect(0, 8, 4, 20); g.fillRect(28, 8, 4, 20);
    g.fillStyle(0xaa00ff, 0.7); g.fillRect(8, 22, 16, 3);
  });
}

function drawMonster(scene, key, drawFn) {
  const g = makeGraphics(scene);
  drawFn(g);
  g.generateTexture(key, 32, 32);
  g.destroy();
}

// ── 技能效果 ──────────────────────────────────────────────────────────────────
function generateSkillEffects(scene) {
  // 手裏劍
  let g = makeGraphics(scene);
  g.fillStyle(0xccccff);
  g.fillRect(6, 6, 4, 4);
  g.fillStyle(0xffffff);
  // 尖刺
  g.fillTriangle(8, 0, 16, 8, 8, 8);
  g.fillTriangle(8, 8, 16, 8, 8, 16);
  g.fillTriangle(0, 8, 8, 0, 8, 8);
  g.fillTriangle(0, 8, 8, 8, 8, 16);
  g.fillStyle(0xaaaaff);
  g.fillRect(6, 6, 4, 4);
  g.generateTexture('skill-shuriken', 16, 16);
  g.destroy();

  // 能量球
  g = makeGraphics(scene);
  g.fillStyle(0xaa44ff);
  g.fillCircle(6, 6, 6);
  g.fillStyle(0xdd88ff, 0.6);
  g.fillCircle(4, 4, 3);
  g.generateTexture('skill-orb', 12, 12);
  g.destroy();

  // 分身
  g = makeGraphics(scene);
  g.fillStyle(0x442288, 0.7);
  g.fillRect(6, 16, 20, 18);
  g.fillRect(9, 4, 14, 13);
  g.fillRect(1, 17, 6, 10);
  g.fillRect(25, 17, 6, 10);
  g.fillRect(8, 32, 7, 16);
  g.fillRect(17, 32, 7, 16);
  g.generateTexture('skill-clone', 32, 48);
  g.destroy();
}

// ── 粒子 ──────────────────────────────────────────────────────────────────────
function generateParticles(scene) {
  let g = makeGraphics(scene);
  g.fillStyle(0xffffff);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture('particle-dot', 4, 4);
  g.destroy();

  g = makeGraphics(scene);
  g.fillStyle(0xffff88);
  g.fillTriangle(4, 0, 8, 4, 4, 8);
  g.fillTriangle(0, 4, 4, 0, 4, 4);
  g.fillTriangle(4, 8, 8, 4, 4, 4);
  g.fillTriangle(0, 4, 4, 4, 4, 8);
  g.generateTexture('particle-star', 8, 8);
  g.destroy();
}

// ── 物品 ──────────────────────────────────────────────────────────────────────
function generateItems(scene) {
  // 金幣
  let g = makeGraphics(scene);
  g.fillStyle(0xffcc00);
  g.fillCircle(6, 6, 6);
  g.fillStyle(0xffee88, 0.6);
  g.fillCircle(4, 4, 3);
  g.generateTexture('item-meso', 12, 12);
  g.destroy();

  // HP藥水 (紅)
  g = makeGraphics(scene);
  g.fillStyle(0xff4444); g.fillRect(2, 4, 8, 10);
  g.fillStyle(0xff8888); g.fillRect(3, 3, 6, 2);
  g.fillStyle(0xcccccc); g.fillRect(4, 1, 4, 3);
  g.fillStyle(0xff9999, 0.5); g.fillRect(4, 6, 2, 5);
  g.generateTexture('item-hp-potion', 12, 16);
  g.destroy();

  // MP藥水 (藍)
  g = makeGraphics(scene);
  g.fillStyle(0x4444ff); g.fillRect(2, 4, 8, 10);
  g.fillStyle(0x8888ff); g.fillRect(3, 3, 6, 2);
  g.fillStyle(0xcccccc); g.fillRect(4, 1, 4, 3);
  g.fillStyle(0x9999ff, 0.5); g.fillRect(4, 6, 2, 5);
  g.generateTexture('item-mp-potion', 12, 16);
  g.destroy();

  // 裝備圖示 (16×16)
  const equipDefs = [
    { key: 'item-weapon',  fn: (g) => { g.fillStyle(0xcccccc); g.fillRect(4,2,3,12); g.fillRect(2,10,8,3); g.fillStyle(0xffcc44); g.fillRect(5,1,2,4); } },
    { key: 'item-armor',   fn: (g) => { g.fillStyle(0x4466aa); g.fillRect(3,2,10,12); g.fillRect(1,2,3,8); g.fillRect(12,2,3,8); g.fillStyle(0x88aadd); g.fillRect(5,3,6,4); } },
    { key: 'item-gloves',  fn: (g) => { g.fillStyle(0x886622); g.fillRect(3,4,10,10); g.fillRect(2,2,3,5); g.fillRect(5,2,3,5); g.fillRect(8,2,3,5); g.fillRect(11,2,3,5); } },
    { key: 'item-helmet',  fn: (g) => { g.fillStyle(0x6677aa); g.fillEllipse(8,7,14,12); g.fillRect(2,10,12,4); g.fillStyle(0x9999cc); g.fillEllipse(8,5,8,6); } },
    { key: 'item-boots',   fn: (g) => { g.fillStyle(0x664422); g.fillRect(4,2,8,10); g.fillRect(2,10,10,4); g.fillStyle(0x886644); g.fillRect(5,3,3,6); } },
  ];
  for (const { key, fn } of equipDefs) {
    const g = makeGraphics(scene);
    fn(g);
    g.generateTexture(key, 16, 16);
    g.destroy();
  }
}

// ── 背景元素 ──────────────────────────────────────────────────────────────────
function generateBackground(scene) {
  // 雲
  let g = makeGraphics(scene);
  g.fillStyle(0xffffff, 0.9);
  g.fillEllipse(32, 20, 40, 22);
  g.fillEllipse(20, 24, 30, 18);
  g.fillEllipse(46, 24, 30, 18);
  g.generateTexture('bg-cloud', 64, 32);
  g.destroy();

  // 樹
  g = makeGraphics(scene);
  g.fillStyle(0x228b22); g.fillTriangle(24, 0, 48, 36, 0, 36);
  g.fillStyle(0x1a6b1a); g.fillTriangle(24, 8, 46, 42, 2, 42);
  g.fillStyle(0x8b4513); g.fillRect(20, 40, 8, 24);
  g.generateTexture('bg-tree', 48, 64);
  g.destroy();

  // 山
  g = makeGraphics(scene);
  g.fillStyle(0x7788aa); g.fillTriangle(64, 0, 128, 80, 0, 80);
  g.fillStyle(0x8899bb); g.fillTriangle(64, 8, 120, 80, 8, 80);
  g.fillStyle(0xffffff); g.fillTriangle(64, 0, 80, 24, 48, 24);
  g.generateTexture('bg-mountain', 128, 80);
  g.destroy();
}

// ── UI元素 ──────────────────────────────────────────────────────────────────
function generateUI(scene) {
  // NPC商人
  let g = makeGraphics(scene);
  g.fillStyle(0xffcc99); g.fillRect(9, 4, 14, 14);
  g.fillStyle(0xee6622); g.fillRect(7, 2, 18, 6);
  g.fillStyle(0x3355aa); g.fillRect(6, 18, 20, 18);
  g.fillStyle(0xffcc99); g.fillRect(1, 18, 6, 10); g.fillRect(25, 18, 6, 10);
  g.fillStyle(0x223399); g.fillRect(7, 34, 8, 14); g.fillRect(17, 34, 8, 14);
  g.fillStyle(0x000000); g.fillRect(12, 9, 3, 3); g.fillRect(17, 9, 3, 3);
  g.fillStyle(0xffcc00); g.fillEllipse(16, 46, 12, 5);
  g.generateTexture('npc-shop', 32, 48);
  g.destroy();

  // 傳送門
  g = makeGraphics(scene);
  g.fillStyle(0x4400aa, 0.8); g.fillRect(0, 0, 40, 72);
  g.fillStyle(0x8844ff, 0.9); g.fillRect(4, 0, 32, 72);
  g.fillStyle(0xaa66ff); g.fillRect(8, 0, 24, 72);
  g.fillStyle(0xddaaff, 0.5); g.fillRect(14, 0, 12, 72);
  // 邊框閃光
  g.lineStyle(2, 0xcc88ff);
  g.strokeRect(2, 2, 36, 68);
  g.generateTexture('portal', 40, 72);
  g.destroy();
}
