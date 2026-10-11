import { BaseMapScene } from './BaseMapScene.js';
import { audio } from '../engine/audio.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { POTION_ICON_KEYS } from '../config/assetCatalog.js';
import { keyHint } from '../engine/device.js';

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
    const panelW = 480, panelH = 400;
    const panelX = (width - panelW) / 2;
    const panelY = 70;
    const objs = [];
    const push = (obj) => { objs.push(obj); return obj; };

    push(addParchmentPanel(this, panelX, panelY, panelW, panelH, { depth: 150 }));

    push(this.add.text(panelX + panelW / 2, panelY + 34, `🏪 ${npcDef.name || '商人'}的雜貨店`, {
      fontSize: '19px', color: '#ffe27a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    const gs = this.registry.get('gameState');
    const mesoText = push(this.add.text(panelX + panelW / 2, panelY + 60, `持有金幣：${gs.meso}`, {
      fontSize: '14px', color: '#fff3c8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151));

    // 商品：購買後補進藥水庫存（gs.potions），HUD 藥水欄會自動刷新
    const items = [
      { key: 'A', name: 'HP藥水 ×3',    cost: 90,  apply: (g) => { g.potions.A += 3; } },
      { key: 'D', name: 'MP藥水 ×3',    cost: 90,  apply: (g) => { g.potions.D += 3; } },
      { key: 'S', name: '強效HP藥水 ×2', cost: 150, apply: (g) => { g.potions.S += 2; } },
      { key: 'R', name: '強效MP藥水 ×2', cost: 150, apply: (g) => { g.potions.R += 2; } },
      { key: 'G', name: '萬靈藥 ×1',    cost: 130, apply: (g) => { g.potions.G += 1; } },
    ];

    items.forEach((item, i) => {
      const rowY = panelY + 98 + i * 50;
      const iconKey = POTION_ICON_KEYS[item.key];
      if (iconKey && this.textures.exists(iconKey)) {
        const icon = push(this.add.image(panelX + 70, rowY, iconKey).setScrollFactor(0).setDepth(152));
        icon.setScale(32 / icon.height);
      }
      const label = `${item.name}  —  ${item.cost} 金幣`;
      const btn = addWoodButton(this, panelX + panelW / 2 + 20, rowY, 300, 38, label, () => {
        const state = this.registry.get('gameState');
        if (state.meso >= item.cost) {
          state.meso -= item.cost;
          item.apply(state);
          this.registry.set('gameState', state);
          this.registry.events.emit('changedata-meso', null, state.meso);
          mesoText.setText(`持有金幣：${state.meso}`);
          audio.playPickup();
          btn.label.setText(`${item.name}  — 購買成功！`);
        } else {
          btn.label.setText(`${item.name}  — 金幣不足`);
        }
        this.time.delayedCall(900, () => { if (btn.label.active) btn.label.setText(label); });
      }, { depth: 151, fontSize: 15 });
      btn.objects.forEach(push);
    });

    // 觸控裝置沒有鍵盤：關閉字樣本身可點擊
    push(this.add.text(panelX + panelW / 2, panelY + panelH - 30, keyHint('[ 按 F 或 ESC 關閉 ]', '[ 點此關閉 ]'), {
      fontSize: '12px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(151)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeNpcDialog()));

    this._npcDialog = { _shop: true, objects: objs };
  }
}
