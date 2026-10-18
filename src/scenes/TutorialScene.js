import Phaser from 'phaser';
import { createInitialGameState } from '../config/constants.js';
import { addParchmentPanel, addWoodButton } from '../engine/woodUi.js';
import { isTouchDevice } from '../engine/device.js';
import { addSoundButton } from '../engine/soundButton.js';
import { audio } from '../engine/audio.js';
import { STORY_ASSETS } from '../config/assetCatalog.js';
import { preloadAssets } from '../engine/assetLoader.js';
import { settings } from '../engine/settings.js';
import { DEFAULT_BINDINGS, keyLabel } from '../engine/keyBindings.js';

export const TUTORIAL_SEEN_KEY = 'thief-legend-tutorial-seen';

export function hasSeenTutorial() {
  try { return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1'; } catch (_) { return false; }
}

function markTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch (_) { /* 靜默 */ }
}

// ── 頁面內容 ─────────────────────────────────────────────────────────────────────
// kind: 'story'（故事）| 'keys'（按鍵）| 'text'（一般說明）| 'final'
// image：劇情插畫的材質 key（沒載到就退回 art 的表情符號）
// bindings：目前的按鍵設定（電腦版按鍵頁顯示玩家改過的鍵）
export function buildPages(touch, bindings = DEFAULT_BINDINGS) {
  const k = (action) => keyLabel(bindings[action]);
  const story = [
    {
      kind: 'story', title: '晨曦大陸的傳說', art: '🌟', image: 'story_1',
      body: [
        '很久很久以前，天空的盡頭懸著一顆「晨曦之星」。',
        '它的光讓浮空島嶼漂浮在雲海上，讓森林結出果實，也讓城鎮的夜晚不再令人害怕。',
      ],
    },
    {
      kind: 'story', title: '暗影魔君', art: '🌑', image: 'story_2',
      body: [
        '直到某個沒有月亮的夜晚，沉睡在古代廢墟地底的「暗影魔君」甦醒了。',
        '他奪走晨曦之星，把它擊成碎片，藏進自己的巢穴。失去星光的怪物被暗影侵蝕，變得狂暴，開始攻擊旅人與村莊。',
      ],
    },
    {
      kind: 'story', title: '影子盜賊', art: '🗡️', image: 'story_4',
      body: [
        '你是年輕的盜賊，人稱「影子」。盜賊最擅長的不是正面決鬥，而是潛入，奪回屬於別人的東西。',
        '晨曦鎮的商人老陳交給你一把短劍和一袋飛鏢：「在黑暗徹底吞沒大陸之前，把星光偷回來。」',
      ],
    },
    {
      kind: 'story', title: '你的旅程', art: '🗺️', image: 'story_3',
      body: [
        '從浮空島嶼出發，穿過森林獵場、古代廢墟、碧濤港，一路深入沙漠、雪山、熔岩與魔君王城。五個地區各有一名守護者，守著一塊星光碎片。',
        '把五塊碎片帶回晨曦鎮的星光之塔，塔重新亮起，通往魔君巢穴的傳送門就會開啟。打倒他，讓晨曦之星重新升起！',
      ],
    },
  ];

  const controls = touch
    ? {
      kind: 'keys', title: '操作方式（觸控）',
      rows: [
        { keys: ['搖桿'], text: '右下：左右滑動，控制左右移動' },
        { keys: ['跳', '↓'], text: '右下：跳躍（空中可再跳一次）／站在薄平台上按「↓」往下穿過' },
        { keys: ['普攻'], text: '左下：普通攻擊（近戰揮刀，不耗 MP）' },
        { keys: ['鏢', '步', '殺', '渦'], text: '左側：四個技能鈕（耗 MP；解鎖後可用，Lv.20 後可自選）' },
        { keys: ['互動'], text: '與 NPC 對話、開商店、接任務' },
        { keys: ['藥水槽'], text: '直接點畫面下方的藥水圖示使用藥水' },
        { keys: ['暫停'], text: '左上：開啟 / 關閉暫停選單（也等於 Esc：跳過教學、關閉視窗）' },
        { keys: ['🔊'], text: '右上：聲音開 / 關；暫停選單可看操作說明與回主選單' },
      ],
    }
    : {
      kind: 'keys', title: '操作按鍵（電腦版）',
      rows: [
        { keys: [k('left'), k('right')], text: '左右移動' },
        { keys: [k('up')], text: `跳躍（也可用 ${k('jump')}），空中可再跳一次` },
        { keys: [k('down')], text: '站在薄平台上按住：穿過平台往下走' },
        { keys: [bindings.attack === 'SPACE' ? 'SPACE' : k('attack')], text: '普通攻擊（近戰揮刀，不耗 MP，隨時可用）' },
        { keys: [k('skill1'), k('skill2'), k('skill3'), k('skill4')], text: `四個技能欄位（耗 MP；${k('skill1')} 預設是三連飛鏢）` },
        { keys: [k('potA'), k('potS'), k('potD'), k('potR'), k('potG')], text: '藥水（也可以直接用滑鼠點畫面下方的藥水槽）' },
        { keys: [k('interact')], text: '與 NPC 對話、開商店、接任務' },
        { keys: ['ESC'], text: '暫停選單（可存檔回主選單、開關聲音）／關閉視窗' },
        { keys: ['Enter'], text: '確認、繼續' },
      ],
    };

  const rest = [
    {
      kind: 'text', title: '技能與欄位',
      body: [
        '升級會得到技能點（SP），打開畫面右下的「技能」視窗，按「＋」提升技能傷害。',
        `一開始就有「三連飛鏢」（${k('skill1')}）；Lv.5 / 10 / 15 / 20 依序解鎖「影步伐」「暗殺」「暗影漩渦」「影分身」。${k('attack')}的普通攻擊不耗 MP，永遠在最左邊。`,
        '技能欄只有 4 格，但技能有 5 個。全部解鎖（Lv.20）之後，可拖曳畫面下方的技能圖示互換位置，也可在技能視窗按「換入」，自己挑要帶哪 4 個。',
      ],
    },
    {
      kind: 'text', title: '任務系統',
      body: [
        `每張地圖都有 NPC，頭上有名字。走近他們，按 ${k('interact')}（手機點「互動」）對話，就會接到那張地圖的任務。`,
        '任務有「擊敗幾隻指定怪物」「抵達某張地圖」等。進度會顯示在畫面右上角、小地圖下方的任務追蹤面板。',
        '完成後自動領取經驗值與金幣。每位 NPC 一次只給一個任務，完成後再找他對話可以接下一個。',
      ],
    },
    {
      kind: 'text', title: '畫面、存檔與死亡',
      body: [
        '左下是 HP（紅）、MP（藍）與經驗條；中間是技能欄與藥水槽；右下的按鈕可開啟道具、裝備、技能、地圖與設定。',
        '遊戲會自動存檔（進入新地圖、升級、每 30 秒），下次可從主選單「繼續遊戲」。',
        '倒下時會顯示分數，並從倒下的地方重新開始，但會失去身上的裝備，等級與進度都保留。',
      ],
    },
    {
      kind: 'final', title: '準備好了嗎？',
      body: ['去吧，影子。晨曦大陸的星光，就靠你了。'],
    },
  ];
  return [...story, controls, ...rest];
}

// ── 按 Enter 之類的鍵時，忽略「按住不放」造成的連發 ──────────────────────────────────────
const GUARD_MS = 250;

export class TutorialScene extends Phaser.Scene {
  constructor() {
    super({ key: 'TutorialScene' });
  }

  init(data) {
    this._mode = (data && data.mode) || 'newGame';       // 'newGame'：看完進遊戲；'overlay'：暫停選單內查看，看完回到遊戲
    this._gameState = data && data.gameState;
  }

  preload() {
    preloadAssets(this, STORY_ASSETS);
  }

  create() {
    const { width, height } = this.cameras.main;
    this._touch = isTouchDevice();
    this._pages = buildPages(this._touch, settings.get().keys);
    this._index = 0;
    this._pageObjs = [];
    this._bornAt = this.time.now;
    this._done = false;
    if (this._mode === 'overlay') this.registry.set('helpOpen', true);

    // 背景：標題圖壓暗；浮層模式更暗，讓底下遊戲仍隱約可見
    if (this._mode === 'overlay') {
      this.add.rectangle(0, 0, width, height, 0x000000, 0.72).setOrigin(0, 0).setDepth(0).setInteractive();
    } else if (this.textures.exists('title_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'title_bg').setDepth(0);
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      this.add.rectangle(0, 0, width, height, 0x120a05, 0.62).setOrigin(0, 0).setDepth(1);
    } else {
      this.add.rectangle(0, 0, width, height, 0x120a05, 1).setOrigin(0, 0).setDepth(0);
    }

    addParchmentPanel(this, 70, 40, width - 140, height - 80, { depth: 10 });

    // 點面板任意處 = 下一頁（按鈕在更上層，不會被這個吃掉）
    this.add.zone(70, 40, width - 140, height - 130).setOrigin(0, 0).setDepth(11).setInteractive()
      .on('pointerdown', () => this._next());

    // 右上：跳過全部
    this._skipBtn = addWoodButton(this, width - 210, 66, 220, 38, this._touch ? '跳過全部' : '跳過全部（Esc）', () => this._finish(), { depth: 30, fontSize: 16 });
    this._soundBtn = addSoundButton(this, 120, 66, { depth: 30, size: 38 });

    // 底部：上一頁 / 下一頁
    this._prevBtn = addWoodButton(this, 250, height - 70, 170, 44, '← 上一頁', () => this._prev(), { depth: 30, fontSize: 18 });
    this._nextBtn = addWoodButton(this, width - 250, height - 70, 220, 44, '下一頁 →', () => this._next(), { depth: 30, fontSize: 18 });
    this._pageNo = this.add.text(width / 2, height - 92, '', {
      fontSize: '16px', color: '#e8d3a8', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);
    this._hint = this.add.text(width / 2, height - 62, this._touch
      ? '點畫面任何地方繼續　·　按右上角「跳過全部」略過'
      : 'Enter 或 → 繼續　·　← 上一頁　·　Esc 跳過全部', {
      fontSize: '17px', color: '#ffe9b0', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(30);

    // 鍵盤：Enter / → 下一頁、← 上一頁、Esc 跳過全部
    this._onKey = (ev) => {
      if (this._done || this.time.now - this._bornAt < GUARD_MS) return;
      if (ev && ev.repeat) return;
      const code = ev && ev.code;
      if (code === 'Enter' || code === 'NumpadEnter' || code === 'ArrowRight') this._next();
      else if (code === 'ArrowLeft') this._prev();
      else if (code === 'Escape') this._finish();
    };
    this.input.keyboard.on('keydown', this._onKey);
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown', this._onKey);
      if (this._mode === 'overlay') this.registry.set('helpOpen', false);
      // 劇情插畫只有這裡用，離開就釋放（四張 960×540 約占 8 MB 貼圖記憶體）
      for (const a of STORY_ASSETS) if (this.textures.exists(a.key)) this.textures.remove(a.key);
    });

    // 新遊戲的教學用溫暖的小鎮配樂（浮層模式不打斷遊戲中的音樂）
    if (this._mode === 'newGame') audio.playBgm('town');

    this._renderPage();
  }

  // ── 換頁 ────────────────────────────────────────────────────────────────────────
  _next() {
    if (this._done) return;
    if (this._index >= this._pages.length - 1) { this._finish(); return; }
    this._index++;
    this._renderPage();
  }

  _prev() {
    if (this._done || this._index === 0) return;
    this._index--;
    this._renderPage();
  }

  _clearPage() {
    for (const o of this._pageObjs) if (o && o.active) o.destroy();
    this._pageObjs = [];
  }

  _renderPage() {
    this._clearPage();
    const { width } = this.cameras.main;
    const page = this._pages[this._index];
    const last = this._index === this._pages.length - 1;
    const keep = (o) => { this._pageObjs.push(o); return o; };

    keep(this.add.text(width / 2, 118, page.title, {
      fontSize: '40px', color: '#ffe9b0', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(20));
    keep(this.add.rectangle(width / 2, 152, 420, 3, 0xd9a441, 0.9).setDepth(20));

    // 有插畫：左圖右文；沒有就照舊（文字置中，表情符號放下方）
    const withImage = !!(page.image && this.textures.exists(page.image));
    if (withImage) {
      keep(this.add.rectangle(372, 392, 532, 302, 0x1a0e06, 0.9).setStrokeStyle(3, 0xd9a441).setDepth(20));
      keep(this.add.image(372, 392, page.image).setDisplaySize(520, 290).setDepth(21));
    } else if (page.art) {
      keep(this.add.text(width / 2, 505, page.art, { fontSize: '96px', fontFamily: 'Arial, sans-serif' }).setOrigin(0.5).setDepth(20));
    }
    if (page.kind === 'keys') this._drawKeyRows(page.rows, keep);
    else this._drawParagraphs(page.body, page.kind, keep, withImage ? { x: 912, maxW: 520, fontPx: 25 } : null);

    this._pageNo.setText(`${this._index + 1} / ${this._pages.length}`);
    this._prevBtn.plate.setVisible(this._index > 0).setInteractive(this._index > 0);
    this._prevBtn.label.setVisible(this._index > 0);
    this._nextBtn.label.setText(last ? (this._mode === 'overlay' ? '關閉' : '開始冒險 ▶') : '下一頁 →');
  }

  // 把中文依實際寬度折行（Phaser 預設只會在空白處斷行，中文整段會超出面板）
  _wrap(text, fontPx, maxWidth) {
    if (!this._measureCtx) this._measureCtx = document.createElement('canvas').getContext('2d');
    const ctx = this._measureCtx;
    ctx.font = `bold ${fontPx}px Arial, sans-serif`;
    const lines = [];
    let line = '';
    for (const ch of text) {
      if (ctx.measureText(line + ch).width > maxWidth) { lines.push(line); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    return lines;
  }

  // column：插畫頁的右欄（中心 x、寬度、字級）
  _drawParagraphs(paragraphs, kind, keep, column = null) {
    const { width } = this.cameras.main;
    const fontPx = column ? column.fontPx : (kind === 'story' || kind === 'final' ? 27 : 23);
    const maxW = column ? column.maxW : width - 340;
    const x = column ? column.x : width / 2;
    let y = kind === 'final' ? 270 : 200;
    for (const p of paragraphs) {
      const lines = this._wrap(p, fontPx, maxW);
      const t = keep(this.add.text(x, y, lines.join('\n'), {
        fontSize: `${fontPx}px`, color: '#fff0c8', fontFamily: 'Arial', fontStyle: 'bold',
        align: kind === 'text' ? 'left' : 'center', lineSpacing: 10, stroke: '#1a0e06', strokeThickness: 4,
      }).setOrigin(0.5, 0).setDepth(20));
      // 用實際排出來的高度往下排（中文字型的行高比字級高，估算會讓段落疊在一起）
      y += Math.max(t.height, lines.length * (fontPx + 10)) + 22;
    }
    if (kind === 'final') {
      keep(this.add.text(width / 2, y + 30, this._touch ? '點「開始冒險」出發' : '按 Enter 出發', {
        fontSize: '24px', color: '#ffd24a', fontFamily: 'Arial', fontStyle: 'bold', stroke: '#1a0e06', strokeThickness: 5,
      }).setOrigin(0.5, 0).setDepth(20));
    }
  }

  // 按鍵說明：左邊畫按鍵帽（觸控版是按鈕名稱），右邊是功能
  _drawKeyRows(rows, keep) {
    const rowH = this._touch ? 52 : 45;
    const x0 = 140;
    const keyColW = 340;
    let y = 176;
    for (const row of rows) {
      let kx = x0;
      for (const label of row.keys) {
        const w = Math.max(44, label.length * (/^[\x00-\x7f]+$/.test(label) ? 15 : 22) + 24);
        const g = keep(this.add.graphics().setDepth(20));
        g.fillStyle(0xf4e6c8, 1); g.fillRoundedRect(kx, y, w, 36, 8);
        g.lineStyle(2, 0x6b4a22, 1); g.strokeRoundedRect(kx, y, w, 36, 8);
        g.fillStyle(0xd9c39a, 1); g.fillRoundedRect(kx + 3, y + 27, w - 6, 6, 3);
        keep(this.add.text(kx + w / 2, y + 17, label, {
          fontSize: '18px', color: '#3a2410', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(21));
        kx += w + 8;
      }
      const descX = x0 + keyColW + 20;
      const maxW = this.cameras.main.width - 70 - 50 - descX;
      const lines = this._wrap(row.text, 19, maxW);
      keep(this.add.text(descX, y + 18, lines.join('\n'), {
        fontSize: '19px', color: '#fff0c8', fontFamily: 'Arial', fontStyle: 'bold', lineSpacing: 4, stroke: '#1a0e06', strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(20));
      y += rowH;
    }
  }

  // ── 結束 ────────────────────────────────────────────────────────────────────────
  _finish() {
    if (this._done) return;
    this._done = true;
    markTutorialSeen();
    if (this._mode === 'overlay') {
      this.scene.stop();
      return;
    }
    const gs = this._gameState || createInitialGameState();
    this.registry.set('gameState', gs);
    this.scene.start('SkyIslandScene', { gameState: gs });
  }
}
