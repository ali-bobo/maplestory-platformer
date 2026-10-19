// 怪物前搖 / 命中演出截圖：在怪物原本的地圖上讓牠出招，停在前搖尾段截一張，放開後在命中瞬間再截一張。
// 用法：PORT=8402 node e2e/tele-shots.cjs <截圖目錄> [前綴]
const fs = require('fs');
const { launch, start, api } = require('./world/lib.cjs');

const OUT = process.argv[2] || '/tmp/tele-shots';
const PREFIX = process.argv[3] || '';
fs.mkdirSync(OUT, { recursive: true });

const CASES = [
  { scene: 'ForestScene', id: 'boar', type: 'charge', dist: 230 },
  { scene: 'MysticScene', id: 'cyclops', type: 'pound', dist: 70 },
  { scene: 'RuinsScene', id: 'ruin_golem', type: 'slam', dist: 190 },
  { scene: 'MysticScene', id: 'dragon', type: 'shoot', dist: 280 },
  { scene: 'DesertScene', id: 'sandworm', type: 'burrow', dist: 240 },
];

(async () => {
  const { browser, page } = await launch();
  await start(page);
  await page.evaluate(() => window.__setJob('assassin', 45));
  const a = api(page);
  for (const c of CASES) {
    await a.go(c.scene, 600);
    await page.evaluate((t) => { window.__aiStats.freezeWindup = t; }, c.type);
    const got = await page.evaluate(async (c) => {
      const g = window.__game;
      const sc = g.scene.getScenes(true).find((s) => s.player);
      const gs = g.registry.get('gameState');
      gs.hp = gs.maxHp = 99999; sc.player.isInvincible = true;
      const all = sc.monsters.getChildren();
      const m = all.find((x) => x.config.id === c.id && x.active && !x.isDead);
      if (!m) return 'no monster';
      for (const o of all) if (o !== m) { o.brain.cleanup(); o.destroy(); }
      const p = sc.player;
      p.setPosition(m.x - c.dist, m.body.top - 10); p.body.setVelocity(0, 0);
      window.__tm = m;
      const t0 = performance.now();
      while (performance.now() - t0 < 40000) {
        await new Promise((r) => setTimeout(r, 50));
        const b = m.brain;
        if ((b.stage === 1 || b.stage === 4) && b.def.type === c.type && (b.stage === 4 || b.t >= b.windupMs * 0.84)) return 'ok';
        if (b.stage === 0 && Math.abs(p.x - m.x) > c.dist + 60) { p.setPosition(m.x - c.dist, m.body.top - 10); p.body.setVelocity(0, 0); }
      }
      return 'timeout';
    }, c);
    console.log(c.id, got);
    if (got !== 'ok') continue;
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/${PREFIX}${c.type}-1-windup.png` });
    await page.evaluate(() => { window.__aiStats.freezeWindup = null; });
    await page.waitForFunction(() => { const b = window.__tm.brain; return b.stage === 3 || b.stage === 0; }, null, { timeout: 15000, polling: 16 }).catch(() => {});
    await page.waitForTimeout(60);
    await page.screenshot({ path: `${OUT}/${PREFIX}${c.type}-2-impact.png` });
  }
  await browser.close();
})();
