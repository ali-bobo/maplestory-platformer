// 各地圖 BGM 樂曲資料（純資料 + 編譯函式，無 Web Audio 依賴）
//
// 每首 16 小節 = A 段 8 小節 + B 段 8 小節，整首循環；和弦、旋律、低音、伴奏、打擊樂各自獨立編寫，
// 但由和弦進行統一約束：旋律的強拍（第 1、3 拍）一定落在當下和弦的和弦音上，低音跟著和弦根音，
// 伴奏與襯底和弦由和弦自動展開並做聲部連接。這些規則由 test/music.test.js 驗證。
//
// 旋律記譜：'E5.4 G5.4 r.8'，點後數字 = 十六分音符數（4 = 一拍），一小節必須剛好 16。

import {
  STEPS_PER_BAR, parseChord, parseBar, voiceLead, bassNote,
} from './theory.js';

// ── 低音型態：[位置, 音級('R' 根音 / '5' 五度 / '8' 高八度根音), 長度] ─────────────────
const BASS_STYLES = {
  whole:  [[0, 'R', 16]],
  half:   [[0, 'R', 8], [8, '5', 8]],
  bounce: [[0, 'R', 3], [4, '5', 3], [8, 'R', 3], [12, '5', 3]],
  groove: [[0, 'R', 3], [6, 'R', 2], [8, '5', 3], [11, 'R', 2], [14, '8', 2]],
  drive8: [[0, 'R', 2], [2, 'R', 2], [4, 'R', 2], [6, '8', 2], [8, 'R', 2], [10, 'R', 2], [12, 'R', 2], [14, '5', 2]],
  walk:   [[0, 'R', 4], [4, '5', 4], [8, 'R', 4], [12, '5', 4]],
};

// ── 打擊樂型態：[位置, 種類, 力度]。K 大鼓 S 小鼓 H 閉鈸 R 木魚/邊擊 T 筒鼓 X 沙鈴 ───────
const PERC_STYLES = {
  none: [],
  shaker: [[0, 'X', 0.8], [2, 'X', 0.5], [4, 'X', 0.7], [6, 'X', 0.5], [8, 'X', 0.8], [10, 'X', 0.5], [12, 'X', 0.7], [14, 'X', 0.5]],
  folk: [[0, 'K', 0.7], [8, 'K', 0.6], [4, 'R', 0.6], [12, 'R', 0.6],
    [2, 'X', 0.4], [6, 'X', 0.4], [10, 'X', 0.4], [14, 'X', 0.4]],
  sparse: [[0, 'T', 0.55], [8, 'R', 0.35]],
  pop: [[0, 'K', 0.85], [10, 'K', 0.55], [4, 'S', 0.7], [12, 'S', 0.7],
    [0, 'H', 0.5], [2, 'H', 0.35], [4, 'H', 0.5], [6, 'H', 0.35], [8, 'H', 0.5], [10, 'H', 0.35], [12, 'H', 0.5], [14, 'H', 0.45]],
  noir: [[0, 'K', 0.8], [6, 'K', 0.45], [8, 'S', 0.65], [14, 'K', 0.4],
    [2, 'H', 0.3], [6, 'H', 0.3], [10, 'H', 0.3], [14, 'H', 0.3]],
  boss: [[0, 'K', 1.0], [6, 'K', 0.7], [8, 'K', 0.9], [14, 'K', 0.6], [4, 'S', 0.9], [12, 'S', 0.9],
    [0, 'H', 0.5], [2, 'H', 0.4], [4, 'H', 0.5], [6, 'H', 0.4], [8, 'H', 0.5], [10, 'H', 0.4], [12, 'H', 0.5], [14, 'H', 0.4]],
  dungeon: [[0, 'K', 0.9], [8, 'K', 0.8], [10, 'K', 0.5], [4, 'S', 0.8], [12, 'S', 0.8],
    [0, 'H', 0.4], [2, 'H', 0.3], [4, 'H', 0.4], [6, 'H', 0.3], [8, 'H', 0.4], [10, 'H', 0.3], [12, 'H', 0.4], [14, 'H', 0.3]],
};
// 樂句最後一小節的過門（取代該小節的打擊樂）
const FILLS = {
  boss: [[0, 'K', 1.0], [4, 'S', 0.9], [8, 'T', 0.8], [10, 'T', 0.8], [12, 'S', 0.7], [13, 'S', 0.8], [14, 'S', 0.9], [15, 'S', 1.0]],
  dungeon: [[0, 'K', 0.9], [4, 'S', 0.8], [8, 'K', 0.8], [12, 'S', 0.7], [14, 'S', 0.85], [15, 'S', 0.95]],
};

export const TRACKS = {
  // ── 浮空島：C 大調，明亮輕盈（音樂盒 + 豎琴 + 柔和弦樂）──────────────────────────
  sky: {
    key: { tonic: 'C', mode: 'major' }, bpm: 108, swing: 0,
    chords: ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm7', 'G',
             'F', 'G', 'Em7', 'Am', 'Dm7', 'G', 'Cadd9', 'G'],
    lead: [
      'E5.4 G5.4 E5.2 D5.2 C5.4', 'D5.4 G5.4 B4.2 D5.2 G4.4', 'C5.4 E5.4 A5.4 G5.2 E5.2', 'G5.6 E5.2 B4.4 E5.4',
      'A5.4 F5.4 C5.2 A4.2 F5.4', 'G5.4 E5.4 C5.4 E5.2 G5.2', 'F5.4 A5.4 D5.4 C5.2 D5.2', 'B4.4 D5.4 G5.8',
      'C6.4 A5.2 F5.2 A5.4 C6.4', 'B5.4 G5.2 D5.2 G5.4 B5.4', 'G5.4 B5.4 E6.4 D6.4', 'C6.4 A5.4 E5.4 A5.4',
      'D6.4 C6.2 A5.2 F5.4 A5.4', 'G5.4 B5.4 D6.4 B5.4', 'E6.4 D6.2 C6.2 G5.4 E5.4', 'D6.6 B5.2 G5.8',
    ],
    parts: {
      lead: { inst: 'bell', vel: 0.55, pan: 0.0 },
      pad:  { inst: 'pad', vel: 0.42 },
      comp: { style: 'arp8', inst: 'harp', vel: 0.4 },
      sparkle: { inst: 'bell', vel: 0.28, positions: [6, 14] },
      bass: { style: 'half', inst: 'sub', vel: 0.55 },
      perc: { style: 'shaker', vel: 0.35 },
    },
    mix: { reverb: 0.34, tone: 9500 },
  },

  // ── 森林獵場：G 大調，輕快民謠（長笛 + 撥弦 + 手鼓）────────────────────────────
  henesys: {
    key: { tonic: 'G', mode: 'major' }, bpm: 120, swing: 0.1,
    chords: ['G', 'Em', 'C', 'D', 'G', 'Em', 'C', 'D',
             'Am', 'D', 'G', 'Em', 'C', 'D', 'G', 'D'],
    lead: [
      'D5.4 B4.2 G4.2 B4.4 D5.4', 'E5.6 D5.2 B4.4 G4.4', 'C5.4 E5.4 G5.4 E5.4', 'F#5.6 E5.2 D5.8',
      'B4.2 D5.2 G5.4 G5.2 F#5.2 E5.2 D5.2', 'E5.4 G5.4 B5.4 G5.4', 'C6.4 B5.2 A5.2 G5.4 E5.4', 'F#5.4 A5.4 D6.8',
      'E5.4 A5.4 C6.4 A5.4', 'A5.6 F#5.2 D5.4 F#5.4', 'G5.4 B5.4 D6.4 B5.4', 'E6.6 D6.2 B5.8',
      'C6.4 G5.4 E5.4 G5.4', 'A5.4 D6.4 F#6.4 A5.4', 'B5.4 D6.4 G6.4 D6.4', 'A5.4 F#5.4 D5.8',
    ],
    parts: {
      lead: { inst: 'flute', vel: 0.6, pan: 0.0 },
      pad:  { inst: 'pad', vel: 0.3 },
      comp: { style: 'chop', inst: 'pluck', vel: 0.42 },
      bass: { style: 'bounce', inst: 'sub', vel: 0.6 },
      perc: { style: 'folk', vel: 0.4 },
    },
    mix: { reverb: 0.2, tone: 9000 },
  },

  // ── 古代廢墟：A 小調，緩慢神祕（慢起音弦樂 + 豎琴 + 低鼓）─────────────────────────
  ruins: {
    key: { tonic: 'A', mode: 'minor' }, bpm: 84, swing: 0,
    chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E',
             'Am', 'Em', 'F', 'C', 'Dm', 'Am', 'F', 'E'],
    lead: [
      'E5.8 C5.4 B4.2 A4.2', 'A4.8 C5.4 F5.4', 'E5.8 G5.4 E5.4', 'D5.8 B4.4 G4.4',
      'C5.4 E5.4 A5.8', 'A5.6 G5.2 F5.4 C5.4', 'D5.4 F5.4 A5.4 F5.4', 'G#5.8 B4.4 E5.4',
      'A5.8 E5.4 C5.4', 'B5.8 G5.4 E5.4', 'C6.6 A5.2 F5.8', 'G5.8 E5.4 C5.4',
      'F5.4 A5.4 D6.8', 'C6.4 B5.2 A5.2 E5.8', 'A5.4 C6.4 F6.4 C6.4', 'B5.4 G#5.4 E5.8',
    ],
    parts: {
      lead: { inst: 'flute', vel: 0.5, pan: 0.0 },
      pad:  { inst: 'strings', vel: 0.5 },
      comp: { style: 'arp4', inst: 'harp', vel: 0.34 },
      drone: { inst: 'drone', vel: 0.34 },
      bass: { style: 'whole', inst: 'sub', vel: 0.6 },
      perc: { style: 'sparse', vel: 0.5 },
    },
    mix: { reverb: 0.38, tone: 7500 },
  },

  // ── 神秘之境：D 多利安，魔法感（音樂盒 + 豎琴 + 合唱般的襯底）──────────────────────
  ellinia: {
    key: { tonic: 'D', mode: 'dorian' }, bpm: 96, swing: 0,
    chords: ['Dm7', 'G', 'Cadd9', 'Am7', 'Dm7', 'G', 'Cadd9', 'Am7',
             'Fadd9', 'Cadd9', 'Dm7', 'Am7', 'Fadd9', 'G', 'Em7', 'A'],
    lead: [
      'A5.4 F5.4 D5.4 F5.4', 'B5.4 D6.4 G5.8', 'E6.6 D6.2 C6.4 G5.4', 'A5.4 C6.4 E6.4 C6.4',
      'F6.6 E6.2 D6.4 A5.4', 'D6.4 B5.4 G5.4 B5.4', 'C6.4 E6.4 G6.4 E6.4', 'A5.8 G5.4 E5.4',
      'C6.4 A5.4 F5.4 A5.4', 'G5.4 C6.4 E6.8', 'D6.4 A5.4 F5.4 D5.4', 'E5.4 A5.4 C6.4 E6.4',
      'F6.6 E6.2 C6.8', 'D6.4 B5.4 G5.4 D6.4', 'G5.4 B5.4 E6.4 D6.4', 'C#6.6 A5.2 E5.8',
    ],
    parts: {
      lead: { inst: 'bell', vel: 0.55, pan: 0.0 },
      pad:  { inst: 'choir', vel: 0.5 },
      comp: { style: 'arp8', inst: 'harp', vel: 0.42 },
      sparkle: { inst: 'bell', vel: 0.34, positions: [2, 6, 10, 14] },
      bass: { style: 'half', inst: 'sub', vel: 0.5 },
      perc: { style: 'shaker', vel: 0.25 },
    },
    mix: { reverb: 0.4, tone: 8500 },
  },

  // ── 台北都會：G 大調，現代流行（柔和合成主奏 + 電鋼琴切分 + 搖擺鼓組）──────────────
  taipei: {
    key: { tonic: 'G', mode: 'major' }, bpm: 118, swing: 0.55,
    chords: ['G', 'Em7', 'Cadd9', 'D', 'G', 'Em7', 'Am7', 'D7',
             'Cadd9', 'D', 'Bm7', 'Em7', 'Cadd9', 'D', 'G', 'D'],
    lead: [
      'B4.2 D5.2 G5.4 r.2 G5.2 A5.2 B5.2', 'B5.4 G5.4 E5.4 G5.4', 'E5.2 G5.2 C6.4 r.2 B5.2 G5.2 E5.2', 'F#5.6 E5.2 D5.4 F#5.4',
      'B4.2 D5.2 G5.4 r.2 G5.2 B5.2 D6.2', 'E6.4 D6.4 B5.4 G5.4', 'A5.4 C6.4 E6.4 D6.2 C6.2', 'D6.4 A5.4 F#5.4 A5.2 C6.2',
      'G5.4 E6.4 C6.4 G5.4', 'A5.4 F#5.4 D5.4 F#5.4', 'B5.4 D6.4 F#6.4 D6.4', 'E6.6 D6.2 B5.4 G5.4',
      'E5.2 G5.2 C6.4 E6.4 G6.4', 'F#6.4 D6.4 A5.4 D6.4', 'B5.4 D6.4 G6.8', 'A5.4 F#5.4 A5.2 D6.2 C6.2 A5.2',
    ],
    parts: {
      lead: { inst: 'synth', vel: 0.5, pan: 0.0 },
      pad:  { inst: 'pad', vel: 0.28 },
      comp: { style: 'chop', inst: 'epiano', vel: 0.5 },
      bass: { style: 'groove', inst: 'pbass', vel: 0.62 },
      perc: { style: 'pop', vel: 0.5 },
    },
    mix: { reverb: 0.18, tone: 10000 },
  },

  // ── 暗巷城：A 小調，夜色爵士感（深色弦樂 + 撥弦 + 慢搖擺）─────────────────────────
  kerning: {
    key: { tonic: 'A', mode: 'minor' }, bpm: 100, swing: 0.5,
    chords: ['Am', 'Am', 'F', 'E7', 'Am', 'Dm', 'F', 'E7',
             'Dm', 'Am', 'F', 'E7', 'Dm', 'G', 'C', 'E7'],
    lead: [
      'r.4 E5.4 A5.4 C6.4', 'C6.4 A5.4 E5.8', 'A5.4 C6.4 F6.4 E6.2 C6.2', 'E6.4 D6.4 B5.4 G#5.4',
      'r.4 E5.4 A5.4 E6.4', 'F6.4 D6.4 A5.4 D6.4', 'C6.4 A5.4 F5.4 A5.4', 'G#5.4 B5.4 E6.4 D6.4',
      'A5.6 F5.2 D5.8', 'E5.4 A5.4 C6.4 E6.4', 'F6.6 E6.2 C6.8', 'B5.4 G#5.4 E5.4 G#5.4',
      'D6.4 F6.4 A6.4 F6.4', 'G5.4 B5.4 D6.4 B5.4', 'E6.4 C6.4 G5.4 E5.4', 'G#5.4 B5.4 E6.8',
    ],
    parts: {
      lead: { inst: 'synth', vel: 0.46, pan: 0.0 },
      pad:  { inst: 'strings', vel: 0.38 },
      comp: { style: 'chop', inst: 'pluck', vel: 0.38 },
      bass: { style: 'groove', inst: 'pbass', vel: 0.62 },
      perc: { style: 'noir', vel: 0.5 },
    },
    mix: { reverb: 0.26, tone: 8000 },
  },

  // ── 晨曦鎮：F 大調，溫暖安心（長笛 + 吉他撥弦 + 柔和襯底）──────────────────────────
  town: {
    key: { tonic: 'F', mode: 'major' }, bpm: 100, swing: 0,
    chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C',
             'Gm7', 'C', 'F', 'Dm', 'Bb', 'C', 'F', 'C'],
    lead: [
      'A5.4 C6.4 A5.4 F5.4', 'A5.4 F5.4 D5.4 F5.4', 'D6.4 Bb5.4 F5.4 Bb5.4', 'G5.4 E5.4 C5.4 E5.4',
      'C6.4 A5.2 G5.2 F5.4 A5.4', 'E5.4 A5.4 C6.4 A5.4', 'Bb5.4 D6.4 F6.4 D6.4', 'E6.4 D6.2 C6.2 G5.8',
      'D6.4 Bb5.4 G5.4 Bb5.4', 'G5.4 C6.4 E6.8', 'F6.4 E6.2 D6.2 C6.4 A5.4', 'A5.4 D6.4 F6.4 D6.4',
      'D6.4 F6.4 Bb6.4 F6.4', 'E6.4 C6.4 G5.4 C6.4', 'A5.4 C6.4 F6.8', 'G5.6 E5.2 C5.4 E5.4',
    ],
    parts: {
      lead: { inst: 'flute', vel: 0.55, pan: 0.0 },
      pad:  { inst: 'pad', vel: 0.38 },
      comp: { style: 'arp8', inst: 'pluck', vel: 0.36 },
      bass: { style: 'half', inst: 'sub', vel: 0.55 },
      perc: { style: 'shaker', vel: 0.3 },
    },
    mix: { reverb: 0.26, tone: 9000 },
  },

  // ── Boss 戰：E 小調（V 級用和聲小調的 B 大三和弦），緊迫有力 ───────────────────────
  boss: {
    key: { tonic: 'E', mode: 'minor' }, bpm: 150, swing: 0,
    chords: ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'C', 'B',
             'Am', 'Em', 'C', 'D', 'Am', 'B', 'Em', 'B'],
    lead: [
      'E5.4 r.2 E5.2 G5.4 B5.4', 'E6.6 D6.2 B5.4 G5.4', 'C6.4 r.2 C6.2 G5.4 E5.4', 'F#5.4 A5.4 D6.4 A5.4',
      'G5.4 B5.4 E6.4 G6.4', 'G6.6 F#6.2 E6.4 B5.4', 'C6.4 E6.4 G6.4 E6.4', 'D#6.4 F#6.4 B5.4 D#6.4',
      'A5.4 C6.4 E6.4 C6.4', 'B5.4 G5.4 E5.4 G5.4', 'G5.4 C6.4 E6.4 C6.4', 'A5.4 D6.4 F#6.4 D6.4',
      'C6.4 E6.4 A6.4 E6.4', 'F#6.4 D#6.4 B5.4 D#6.4', 'E6.4 G6.4 B6.4 G6.4', 'D#6.4 F#6.4 B6.8',
    ],
    parts: {
      lead: { inst: 'brass', vel: 0.55, pan: 0.0 },
      pad:  { inst: 'strings', vel: 0.4 },
      comp: { style: 'arp16', inst: 'pluck', vel: 0.34 },
      bass: { style: 'drive8', inst: 'sawbass', vel: 0.6 },
      perc: { style: 'boss', vel: 0.8, fill: 'boss' },
    },
    mix: { reverb: 0.16, tone: 9000 },
  },

  // ── 副本：D 小調（V 級 A 大三和弦），緊張但不壓迫 ──────────────────────────────────
  dungeon: {
    key: { tonic: 'D', mode: 'minor' }, bpm: 138, swing: 0,
    chords: ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A',
             'Gm', 'Dm', 'Bb', 'A', 'Gm', 'F', 'A', 'A'],
    lead: [
      'D5.4 F5.4 A5.4 F5.4', 'D6.6 C6.2 A5.4 F5.4', 'Bb5.4 D6.4 F6.4 D6.4', 'E6.4 G6.4 C6.4 E6.4',
      'F5.4 A5.4 D6.4 F6.4', 'A5.2 D6.2 F6.4 D6.4 A5.4', 'D6.4 F6.4 Bb6.4 F6.4', 'C#6.4 E6.4 A5.4 C#6.4',
      'G5.4 Bb5.4 D6.4 Bb5.4', 'A5.4 F5.4 D5.4 F5.4', 'F5.4 Bb5.4 D6.4 F6.4', 'E6.4 C#6.4 A5.4 C#6.4',
      'D6.4 Bb5.4 G5.4 Bb5.4', 'C6.4 A5.4 F5.4 A5.4', 'A5.4 C#6.4 E6.4 A6.4', 'A6.4 E6.4 C#6.4 A5.4',
    ],
    parts: {
      lead: { inst: 'synth', vel: 0.5, pan: 0.0 },
      pad:  { inst: 'strings', vel: 0.36 },
      comp: { style: 'arp16', inst: 'pluck', vel: 0.3 },
      bass: { style: 'drive8', inst: 'sawbass', vel: 0.5 },
      perc: { style: 'dungeon', vel: 0.7, fill: 'dungeon' },
    },
    mix: { reverb: 0.2, tone: 9000 },
  },
};

// ── 編譯：把一首曲子展開成「每小節的事件清單」 ─────────────────────────────────────
// 事件：{ voice, inst, midi?, pos, dur, vel }；perc 事件 inst 為鼓種（K/S/H/R/T/X），無 midi。
// pos / dur 的單位是十六分音符；pad 事件的 dur 可能超過一小節（相同和弦連續時合併成一個長音）。
export function compileTrack(track) {
  const chords = track.chords.map(parseChord);
  const nBars = chords.length;
  const bars = Array.from({ length: nBars }, () => []);
  const { parts } = track;

  // 旋律
  if (track.lead.length !== nBars) throw new Error(`旋律小節數 ${track.lead.length} ≠ 和弦小節數 ${nBars}`);
  track.lead.forEach((str, b) => {
    for (const e of parseBar(str)) {
      if (e.midi === null) continue;
      bars[b].push({
        voice: 'lead', inst: parts.lead.inst, midi: e.midi, pos: e.pos, dur: e.dur,
        vel: parts.lead.vel * (e.pos % 8 === 0 ? 1.0 : 0.88), pan: parts.lead.pan || 0,
      });
    }
  });

  // 襯底和弦：相同和弦連續出現時合併成長音，並做聲部連接
  let prevVoicing = null;
  for (let b = 0; b < nBars;) {
    let run = 1;
    while (b + run < nBars && chords[b + run].name === chords[b].name) run++;
    const voicing = voiceLead(prevVoicing, chords[b].pcs, 55, 74);
    prevVoicing = voicing;
    for (const midi of voicing) {
      bars[b].push({ voice: 'pad', inst: parts.pad.inst, midi, pos: 0, dur: STEPS_PER_BAR * run, vel: parts.pad.vel });
    }
    b += run;
  }

  // 伴奏
  chords.forEach((chord, b) => {
    const comp = parts.comp;
    if (!comp || comp.style === 'none') return;
    const inRange = (lo, hi) => {
      const list = [];
      for (let m = lo; m <= hi; m++) if (chord.pcs.includes(((m % 12) + 12) % 12)) list.push(m);
      return list;
    };
    const add = (midi, pos, dur, vel) => bars[b].push({ voice: 'comp', inst: comp.inst, midi, pos, dur, vel: comp.vel * vel });
    if (comp.style === 'arp8') {
      const pool = inRange(60, 80);
      const idx = [0, 1, 2, 3, 4, 3, 2, 1];
      idx.forEach((i, k) => add(pool[Math.min(i, pool.length - 1)], k * 2, 3, k === 0 ? 1.0 : k % 2 === 0 ? 0.8 : 0.65));
    } else if (comp.style === 'arp4') {
      const pool = inRange(48, 72);
      [0, 2, 4, 2].forEach((i, k) => add(pool[Math.min(i, pool.length - 1)], k * 4, 7, k === 0 ? 1.0 : 0.75));
    } else if (comp.style === 'arp16') {
      const pool = inRange(48, 70);
      const idx = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 1, 2, 1];
      idx.forEach((i, k) => add(pool[Math.min(i, pool.length - 1)], k, 1, k % 4 === 0 ? 1.0 : k % 2 === 0 ? 0.75 : 0.6));
    } else if (comp.style === 'chop') {
      const voicing = voiceLead(null, chord.pcs, 55, 74);
      for (const midi of voicing) { add(midi, 4, 2, 0.9); add(midi, 12, 2, 0.85); }
    } else {
      throw new Error(`未知的伴奏型態：${comp.style}`);
    }
  });

  // 持續音：和弦根音 + 五度的空洞底（古代廢墟的遠古感）。相同和弦連續時合併成長音
  if (parts.drone) {
    for (let b = 0; b < nBars;) {
      let run = 1;
      while (b + run < nBars && chords[b + run].name === chords[b].name) run++;
      const root = bassNote(chords[b].rootPc, 43);        // G2..F#3 區
      const fifth = root + 7;
      for (const midi of [root, fifth]) {
        bars[b].push({ voice: 'drone', inst: parts.drone.inst, midi, pos: 0, dur: STEPS_PER_BAR * run, vel: parts.drone.vel });
      }
      b += run;
    }
  }

  // 高音閃爍：在高音域挑和弦音，像星塵 / 魔法粒子（浮空島、精靈之境）
  if (parts.sparkle) {
    chords.forEach((chord, b) => {
      const pool = [];
      for (let m = 84; m <= 96; m++) if (chord.pcs.includes(((m % 12) + 12) % 12)) pool.push(m);
      (parts.sparkle.positions || [6, 14]).forEach((pos, k) => {
        const midi = pool[(b * 2 + k) % pool.length];
        bars[b].push({ voice: 'sparkle', inst: parts.sparkle.inst, midi, pos, dur: 4, vel: parts.sparkle.vel * (k === 0 ? 1.0 : 0.75), pan: (b + k) % 2 ? 0.4 : -0.4 });
      });
    });
  }

  // 低音
  chords.forEach((chord, b) => {
    const style = BASS_STYLES[parts.bass.style];
    if (!style) throw new Error(`未知的低音型態：${parts.bass.style}`);
    const root = bassNote(chord.bassPc, 36);
    const fifth = bassNote(chord.fifthPc, 36);
    for (const [pos, degree, dur] of style) {
      const midi = degree === 'R' ? root : degree === '5' ? (fifth > root + 9 ? fifth - 12 : fifth) : root + 12;
      bars[b].push({ voice: 'bass', inst: parts.bass.inst, midi, pos, dur, vel: parts.bass.vel * (pos === 0 ? 1.0 : 0.85) });
    }
  });

  // 打擊樂
  const perc = parts.perc;
  if (perc && perc.style !== 'none') {
    const base = PERC_STYLES[perc.style];
    if (!base) throw new Error(`未知的打擊樂型態：${perc.style}`);
    for (let b = 0; b < nBars; b++) {
      const isPhraseEnd = (b + 1) % 8 === 0;
      const pattern = isPhraseEnd && perc.fill ? FILLS[perc.fill] : base;
      for (const [pos, kind, vel] of pattern) {
        bars[b].push({ voice: 'perc', inst: kind, pos, dur: 1, vel: perc.vel * vel });
      }
    }
  }

  return {
    bpm: track.bpm, swing: track.swing || 0, bars: nBars, events: bars,
    mix: track.mix || {}, chords,
  };
}
