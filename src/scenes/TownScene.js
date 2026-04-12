import Phaser from 'phaser';
import { BaseMapScene } from './BaseMapScene.js';

// 城鎮場景：有 NPC 商店
export class TownScene extends BaseMapScene {
  constructor() {
    super('TownScene', 'town');
    this._shopOpen = false;
    this._shopHint = null;
    this._shopKey = null;
  }

  create() {
    super.create();
    this._setupShopInteraction();
  }

  _setupShopInteraction() {
    // 顯示互動提示
    this._shopHint = this.add.text(400, 600, '靠近商人按 F 開啟商店', {
      fontSize: '14px', color: '#ffee88', fontFamily: 'Arial',
      stroke: '#000', strokeThickness: 3,
    }).setDepth(30).setOrigin(0.5, 1).setScrollFactor(0).setVisible(false);

    this._shopKey = this.input.keyboard.addKey('F');
  }

  _openShop() {
    if (this._shopOpen) return;
    this._shopOpen = true;
    const gs = this.registry.get('gameState');
    const { width, height } = this.cameras.main;

    // 商店面板
    const panel = this.add.graphics().setScrollFactor(0).setDepth(100);
    panel.fillStyle(0x000000, 0.85);
    panel.fillRoundedRect(width / 2 - 250, 100, 500, 400, 12);
    panel.lineStyle(2, 0xffcc44);
    panel.strokeRoundedRect(width / 2 - 250, 100, 500, 400, 12);

    const items = [
      { name: 'HP藥水 ×1',  cost: 50,  action: (g) => { g.hp = Math.min(g.maxHp, g.hp + 100); } },
      { name: 'MP藥水 ×1',  cost: 50,  action: (g) => { g.mp = Math.min(g.maxMp, g.mp + 80);  } },
      { name: 'HP藥水 ×10', cost: 450, action: (g) => { g.hp = Math.min(g.maxHp, g.hp + 1000);} },
    ];

    const texts = [];

    this.add.text(width / 2, 130, '🏪 商人老陳的商店', {
      fontSize: '20px', color: '#ffcc44', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(101);

    items.forEach((item, i) => {
      const y = 210 + i * 70;
      const btn = this.add.text(width / 2, y, `${item.name}  —  ${item.cost} 金幣`, {
        fontSize: '18px', color: '#ffffff', fontFamily: 'Arial',
        backgroundColor: '#333355', padding: { x: 16, y: 8 },
      }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ color: '#ffff00' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#ffffff' }));
      btn.on('pointerdown', () => {
        if (gs.meso >= item.cost) {
          gs.meso -= item.cost;
          item.action(gs);
          this.registry.set('gameState', gs);
          this.registry.events.emit('changedata-hp', null, gs.hp);
          this.registry.events.emit('changedata-meso', null, gs.meso);
          btn.setText(`${item.name}  — 購買成功！`);
          this.time.delayedCall(1000, () => btn.setText(`${item.name}  —  ${item.cost} 金幣`));
        } else {
          btn.setText('金幣不足！');
          this.time.delayedCall(1000, () => btn.setText(`${item.name}  —  ${item.cost} 金幣`));
        }
      });
      texts.push(btn);
    });

    // 關閉按鈕
    const closeBtn = this.add.text(width / 2, 470, '[ 關閉 ]', {
      fontSize: '18px', color: '#ff8888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(102).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => {
      panel.destroy();
      texts.forEach(t => t.destroy());
      closeBtn.destroy();
      this._shopOpen = false;
    });
  }

  update(time, delta) {
    super.update(time, delta);

    if (!this.player || !this.player.active || !this._shopHint || !this._shopKey) return;

    const nearShop = Math.abs(this.player.x - 400) < 120;
    this._shopHint.setVisible(nearShop);

    if (nearShop && Phaser.Input.Keyboard.JustDown(this._shopKey)) {
      this._openShop();
    }
  }
}
