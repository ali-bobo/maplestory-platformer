import Phaser from 'phaser';
import { audio } from '../engine/audio.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this._victory = data && data.victory;
    this._gs = data && data.gameState;
  }

  create() {
    audio.stopBgm();   // 結算畫面停止地圖 BGM
    const { width, height } = this.cameras.main;
    const gs = this._gs || {};

    // 背景：Boss 房 / 主選單背景 cover 縮放後蓋一層色調
    const bgKey = this._victory ? 'bg_boss_room' : 'title_bg';
    if (this.textures.exists(bgKey)) {
      const img = this.add.image(width / 2, height / 2, bgKey);
      img.setScale(Math.max(width / img.width, height / img.height));
    }
    this.add.rectangle(0, 0, width, height, this._victory ? 0x2a1a00 : 0x1a0005, this._victory ? 0.55 : 0.72)
      .setOrigin(0, 0);

    // 勝利時飄落金光
    if (this._victory) {
      this.add.particles(0, -10, 'particle-dot', {
        x: { min: 0, max: width },
        speedY: { min: 40, max: 110 },
        speedX: { min: -20, max: 20 },
        lifespan: 9000,
        frequency: 120,
        scale: { min: 0.6, max: 1.4 },
        alpha: { start: 0.9, end: 0.2 },
        tint: [0xffd966, 0xffb030, 0xfff2b0],
        blendMode: 'ADD',
      });
    }

    // 標題
    const title = this._victory ? '🏆 勝利！' : '☠ 你倒下了';
    const titleColor = this._victory ? '#ffd24a' : '#ff6a5a';
    this.add.text(width / 2, 110, title, {
      fontSize: '64px', color: titleColor, fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#1a0e06', strokeThickness: 10,
    }).setOrigin(0.5, 0.5);

    this.add.text(width / 2, 178, this._victory ? '恭喜您擊敗了暗影魔君！' : '在晨曦鎮重新站起來，冒險還沒結束。', {
      fontSize: '22px', color: '#fff0c8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);

    // 統計資訊（羊皮紙面板）
    const statsY = 240;
    const statsData = [
      ['達到等級',    `Lv.${gs.level || 1}`],
      ['擊殺數',      `${gs.killCount || 0} 隻`],
      ['持有金幣',    `${gs.meso || 0} 金`],
      ['遊戲時間',    this._formatTime(gs.playTime || 0)],
    ];
    addParchmentPanel(this, width / 2 - 220, statsY - 30, 440, statsData.length * 44 + 64, { depth: 1 });

    statsData.forEach(([label, value], i) => {
      const y = statsY + 6 + i * 44;
      this.add.text(width / 2 - 160, y, label, {
        fontSize: '20px', color: '#e8d3a8', fontFamily: 'Arial', stroke: '#1a0e06', strokeThickness: 3,
      }).setDepth(2);
      this.add.text(width / 2 + 160, y, value, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3,
      }).setOrigin(1, 0).setDepth(2);
    });

    // 按鈕：勝利 → 回城繼續冒險；倒下 → 在晨曦鎮復活（扣當級 10% 經驗）
    const btnY = statsY + statsData.length * 44 + 80;
    const mainLabel = this._victory ? '繼續冒險' : '在晨曦鎮復活';
    addWoodButton(this, width / 2 - 130, btnY, 220, 48, mainLabel, () => this._returnToTown(), { depth: 3, fontSize: 19 });
    addWoodButton(this, width / 2 + 130, btnY, 220, 48, '主選單', () => this.scene.start('MenuScene'), { depth: 3, fontSize: 19 });
  }

  _returnToTown() {
    const gs = this._gs || this.registry.get('gameState');
    if (!gs) {
      this.scene.start('MenuScene');
      return;
    }
    if (!this._victory) {
      gs.exp = Math.max(0, Math.floor(gs.exp - gs.expNeeded * 0.1));
    }
    gs.hp = gs.maxHp;
    gs.mp = gs.maxMp;
    gs.currentMap = 'town';
    gs.skillCooldowns = { Z: 0, X: 0, C: 0, V: 0, B: 0 };
    this.registry.set('gameState', gs);
    this.scene.start('TownScene', { gameState: gs, spawnX: 200 });
  }

  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  }
}
