import { BaseMapScene } from './BaseMapScene.js';
import { audio } from '../engine/audio.js';

// 城鎮場景：和平安全區，商人 NPC 提供補給商店
// 商店沿用 BaseMapScene 的 NPC 互動系統（靠近顯示提示、F 開關、ESC 關閉），避免另開按鍵衝突
export class TownScene extends BaseMapScene {
  constructor() {
    super('TownScene', 'town');
  }

  // 商人 NPC 開啟商店，其餘 NPC 走一般對話
  _openNpcDialog(npcDef) {
    if (npcDef && npcDef.shop) {
      this._openShop(npcDef);
      return;
    }
    super._openNpcDialog(npcDef);
  }

  // 商店面板也存進 _npcDialog，沿用 F / ESC 的開關與場景關閉清理
  _closeNpcDialog() {
    if (this._npcDialog && this._npcDialog._shop) {
      for (const obj of this._npcDialog.objects) {
        if (obj && obj.destroy) obj.destroy();
      }
      this._npcDialog = null;
      return;
    }
    super._closeNpcDialog();
  }

  _openShop(npcDef) {
    if (this._npcDialog) return;

    const { width } = this.cameras.main;
    const panelW = 460, panelH = 332;
    const panelX = (width - panelW) / 2;
    const panelY = 80;
    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    const bg = push(this.add.graphics().setScrollFactor(0).setDepth(150));
    bg.fillStyle(0x0a0a1a, 0.96);
    bg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
    bg.lineStyle(2, 0xffcc44, 0.9);
    bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);

    push(this.add.text(panelX + panelW / 2, panelY + 22, `🏪 ${npcDef.name || '商人'}的雜貨店`, {
      fontSize: '18px', color: '#ffcc44', fontFamily: 'Arial', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    const gs = this.registry.get('gameState');
    const mesoText = push(this.add.text(panelX + panelW / 2, panelY + 46, `持有金幣：${gs.meso}`, {
      fontSize: '13px', color: '#ffee88', fontFamily: 'Arial', stroke: '#000', strokeThickness: 2,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    // 商品：購買後補進藥水庫存（gs.potions），HUD 藥水欄會自動刷新
    const items = [
      { name: 'HP藥水 ×3',    cost: 90,  apply: (g) => { g.potions.A += 3; } },
      { name: 'MP藥水 ×3',    cost: 90,  apply: (g) => { g.potions.D += 3; } },
      { name: '強效HP藥水 ×2', cost: 150, apply: (g) => { g.potions.S += 2; } },
      { name: '萬靈藥 ×1',    cost: 130, apply: (g) => { g.potions.G += 1; } },
    ];

    items.forEach((item, i) => {
      const rowY = panelY + 80 + i * 46;
      const label = `${item.name}  —  ${item.cost} 金幣`;
      const btn = push(this.add.text(panelX + panelW / 2, rowY, label, {
        fontSize: '15px', color: '#ffffff', fontFamily: 'Arial',
        backgroundColor: '#333355', padding: { x: 14, y: 7 },
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151)
        .setInteractive({ useHandCursor: true }));

      btn.on('pointerover', () => btn.setStyle({ color: '#ffff66' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
      btn.on('pointerdown', () => {
        const state = this.registry.get('gameState');
        if (state.meso >= item.cost) {
          state.meso -= item.cost;
          item.apply(state);
          this.registry.set('gameState', state);
          this.registry.events.emit('changedata-meso', null, state.meso);
          mesoText.setText(`持有金幣：${state.meso}`);
          audio.playPickup();
          btn.setText(`${item.name}  — 購買成功！`);
        } else {
          btn.setText(`${item.name}  — 金幣不足`);
        }
        this.time.delayedCall(900, () => { if (btn.active) btn.setText(label); });
      });
    });

    push(this.add.text(panelX + panelW / 2, panelY + panelH - 22, '[ 按 F 或 ESC 關閉 ]', {
      fontSize: '12px', color: '#88aacc', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    this._npcDialog = { _shop: true, objects: objs };
  }
}
