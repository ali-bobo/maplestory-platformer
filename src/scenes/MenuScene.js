import Phaser from 'phaser';
import { createInitialGameState, MAP_SCENE_KEYS } from '../config/constants.js';
import { MAPS } from '../config/maps.js';
import { addWoodButton } from '../engine/woodUi.js';
import { getSaveSummary, loadGame, getSaveStatus } from '../engine/saveGame.js';
import { openSaveDialog, closeSaveDialog } from '../ui/saveDialog.js';
import { addSoundButton } from '../engine/soundButton.js';
import { hasSeenTutorial } from './TutorialScene.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this._starting = false;
    const { width, height } = this.cameras.main;

    // 主選單背景（等比放大填滿畫面）
    if (this.textures.exists('title_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'title_bg');
      bg.setScale(Math.max(width / bg.width, height / bg.height));
    } else {
      this.add.rectangle(width / 2, height / 2, width, height, 0xffffff);
    }

    // 遊戲標題：有徽章圖就把名稱寫在徽章的緞帶上，沒有就照舊用大字
    let heroY = 370;
    if (this.textures.exists('title_emblem')) {
      const EMBLEM_SCALE = 0.75;
      const emblemY = 140;
      this.add.image(width / 2, emblemY, 'title_emblem').setScale(EMBLEM_SCALE);
      // 緞帶正面在原圖 (180, 278)，圖高 322
      this.add.text(width / 2, emblemY + (278 - 161) * EMBLEM_SCALE, '盜賊傳說', {
        fontSize: '38px', color: '#3a2410', fontFamily: 'Arial, sans-serif',
        stroke: '#fff4dc', strokeThickness: 4, fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
      heroY = 385;
    } else {
      this.add.text(width / 2, 140, '盜賊傳說', {
        fontSize: '72px', color: '#3a2410', fontFamily: 'Arial, sans-serif',
        stroke: '#fff4dc', strokeThickness: 8,
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);
    }

    // 封面角色圖（title_hero，保持原比例，浮動動畫）
    const charImg = this.add.image(width / 2, heroY, 'title_hero')
      .setOrigin(0.5, 0.5);
    if (heroY !== 370) charImg.setScale(0.8);

    this.tweens.add({
      targets: charImg, y: heroY - 14, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const summary = getSaveSummary();
    if (summary) {
      // 有存檔：繼續遊戲（主按鈕）+ 新遊戲（要按兩次確認，避免誤蓋存檔）
      const mapName = MAPS[summary.map]?.name || '晨曦鎮';
      addWoodButton(this, width / 2, 520, 300, 58, '繼續遊戲', () => this._continueGame(), { fontSize: 26 });
      this.add.text(width / 2, 560, `Lv.${summary.level} · ${mapName}`, {
        fontSize: '16px', color: '#fff4dc', fontFamily: 'Arial', fontStyle: 'bold',
        stroke: '#3a2410', strokeThickness: 4,
      }).setOrigin(0.5, 0);
      let confirmNew = false;
      const newBtn = addWoodButton(this, width / 2, 618, 220, 42, '新遊戲', () => {
        if (!confirmNew) {
          confirmNew = true;
          newBtn.label.setText('再按一次：覆蓋存檔');
          this.time.delayedCall(2500, () => { confirmNew = false; newBtn.label.setText('新遊戲'); });
          return;
        }
        this._startGame();
      }, { fontSize: 17 });
      this.input.keyboard.once('keydown', () => this._continueGame());
    } else {
      addWoodButton(this, width / 2, 530, 300, 60, '開始遊戲', () => this._startGame(), { fontSize: 28 });
      // 按任意鍵也可開始
      this.input.keyboard.once('keydown', () => this._startGame());
    }

    // 聲音開關（右上角）
    this._soundBtn = addSoundButton(this, width - 44, 44, { depth: 50, size: 44 });

    // 匯出 / 匯入存檔代碼（換瀏覽器、換裝置，或這個環境存不了檔時使用）
    const linkY = 676;
    if (summary) {
      this._makeLink(width / 2 - 90, linkY, '匯出存檔', () => this._openSaveCode('export'));
    }
    this._makeLink(width / 2 + (summary ? 90 : 0), linkY, '匯入存檔', () => this._openSaveCode('import'));

    this._toastText = this.add.text(width / 2, 646, '', {
      fontSize: '18px', color: '#ffd0c0', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#3a1008', strokeThickness: 4,
    }).setOrigin(0.5, 0.5);
    // 存不了檔（隱私模式、內嵌頁面）：常駐紅色「未存檔」，並提醒用存檔代碼備份
    this._unsavedBadge = null;
    if (getSaveStatus().unsaved) {
      this._unsavedBadge = this.add.text(16, 16, '未存檔　此環境無法保存進度，請用「匯出存檔」複製代碼', {
        fontSize: '16px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        backgroundColor: '#a63a2a', padding: { x: 10, y: 6 },
      }).setOrigin(0, 0).setDepth(60);
    }
    this.events.once('shutdown', () => closeSaveDialog());
  }

  _makeLink(x, y, label, onClick) {
    const t = this.add.text(x, y, label, {
      fontSize: '18px', color: '#fff4dc', fontFamily: 'Arial', fontStyle: 'bold',
      stroke: '#3a2410', strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    t.on('pointerover', () => t.setColor('#ffd966'));
    t.on('pointerout', () => t.setColor('#fff4dc'));
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

  _openSaveCode(mode) {
    if (this._starting) return;
    openSaveDialog({
      mode,
      onImported: () => this.scene.restart(),
    });
  }

  _continueGame() {
    if (this._starting) return;
    const gs = loadGame();
    if (!gs) { this._startGame(); return; }
    this._starting = true;
    this.registry.set('gameState', gs);
    this.scene.start(MAP_SCENE_KEYS[gs.currentMap] || 'TownScene', { gameState: gs });
  }

  _startGame() {
    if (this._starting) return;
    this._starting = true;
    const gs = createInitialGameState();
    this.registry.set('gameState', gs);
    // 第一次進遊戲先看新手教學（故事 + 按鍵 + 任務系統）；可用 Esc / 「跳過全部」略過，之後可在暫停選單重看
    if (!hasSeenTutorial()) {
      this.scene.start('TutorialScene', { mode: 'newGame', gameState: gs });
      return;
    }
    this.scene.start('SkyIslandScene');
  }
}
