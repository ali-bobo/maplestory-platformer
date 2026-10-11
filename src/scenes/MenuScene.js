import Phaser from 'phaser';
import { createInitialGameState } from '../config/constants.js';
import {
  hasSave, loadSave, canSave, startFromState, exportSaveFile, importSaveFile,
} from '../engine/saveService.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.cameras.main;
    this._starting = false;
    this._overwriteArmed = false;

    // 白色背景
    this.add.rectangle(width / 2, height / 2, width, height, 0xffffff);

    // 遊戲標題
    this.add.text(width / 2, 140, 'MapleGame', {
      fontSize: '80px', color: '#222222', fontFamily: 'Arial Black, Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);

    // 封面角色圖（thief，浮動動畫）
    const charImg = this.add.image(width / 2, 320, 'thief')
      .setDisplaySize(220, 220)
      .setOrigin(0.5, 0.5);

    this.tweens.add({
      targets: charImg, y: 320 - 14, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const save = hasSave() ? loadSave() : null;
    this._save = save && save.ok ? save : null;

    if (this._save) {
      const s = this._save.state;
      this._makeButton(width / 2, 480, '繼續遊戲', 0x222222, () => this._continueGame());
      this.add.text(width / 2, 520, `Lv.${s.level}　擊殺 ${s.killCount}　${this._mapName(s.currentMap)}`, {
        fontSize: '16px', color: '#666666', fontFamily: 'Arial',
      }).setOrigin(0.5, 0.5);
      this._newGameLabel = this._makeButton(width / 2, 575, '新遊戲', 0x884444, () => this._onNewGameClick(), 200, 46, '22px');
    } else {
      this._makeButton(width / 2, 500, '開始遊戲', 0x222222, () => this._startNewGame());
    }

    // 匯出 / 匯入存檔
    const linkY = 660;
    if (this._save) {
      this._makeLink(width / 2 - 90, linkY, '匯出存檔', () => {
        if (!exportSaveFile()) this._toast('匯出失敗');
      });
    }
    this._makeLink(width / 2 + (this._save ? 90 : 0), linkY, '匯入存檔', () => this._importSave());

    this._toastText = this.add.text(width / 2, 620, '', {
      fontSize: '18px', color: '#cc3333', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5);

    if (!canSave()) {
      this._toast('此瀏覽器無法使用本機存檔（隱私模式？），進度將不會保留', 5000);
    }

    // 按任意鍵：有存檔就繼續，沒有就開新遊戲（不會覆蓋既有存檔）
    this.input.keyboard.once('keydown', () => {
      if (this._save) this._continueGame();
      else this._startNewGame();
    });
  }

  _mapName(key) {
    const names = {
      sky: '浮空島嶼', henesys: '森林獵場', ruins: '古代廢墟', ellinia: '神秘之境',
      taipei: '台北都會', kerning: 'Kerning City', town: '楓葉城',
    };
    return names[key] || key;
  }

  _makeButton(x, y, label, color, onClick, w = 260, h = 60, fontSize = '30px') {
    const bg = this.add.rectangle(x, y, w, h, color, 1).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontSize, color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5);
    bg.on('pointerover', () => bg.setAlpha(0.8));
    bg.on('pointerout', () => bg.setAlpha(1));
    bg.on('pointerdown', onClick);
    return text;
  }

  _makeLink(x, y, label, onClick) {
    const t = this.add.text(x, y, label, {
      fontSize: '18px', color: '#336699', fontFamily: 'Arial',
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#112244'));
    t.on('pointerout', () => t.setColor('#336699'));
    t.on('pointerdown', onClick);
    return t;
  }

  _toast(msg, ms = 2500) {
    if (!this._toastText || !this._toastText.active) return;
    this._toastText.setText(msg);
    this.time.delayedCall(ms, () => {
      if (this._toastText && this._toastText.active) this._toastText.setText('');
    });
  }

  // 有存檔時，「新遊戲」需連按兩下確認，避免誤觸蓋掉進度
  _onNewGameClick() {
    if (!this._overwriteArmed) {
      this._overwriteArmed = true;
      this._newGameLabel.setText('再按一次確認');
      this._toast('新遊戲會覆蓋目前的存檔', 3000);
      this.time.delayedCall(3000, () => {
        this._overwriteArmed = false;
        if (this._newGameLabel && this._newGameLabel.active) this._newGameLabel.setText('新遊戲');
      });
      return;
    }
    this._startNewGame();
  }

  _continueGame() {
    if (this._starting || !this._save) return;
    this._starting = true;
    startFromState(this, this._save.state);
  }

  _startNewGame() {
    if (this._starting) return;
    this._starting = true;
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);
    this.scene.start('MapleIslandScene');
  }

  async _importSave() {
    if (this._starting) return;
    const res = await importSaveFile();
    if (res.cancelled) return;
    if (!res.ok) { this._toast(`匯入失敗：${res.error}`, 4000); return; }
    this.scene.restart();
  }
}
