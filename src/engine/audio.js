// Web Audio 音效合成器

// ─── 音符名稱轉頻率 ──────────────────────────────────────────────
// 支援格式：'C4', 'Db4', 'Bb3', '_'（休止符）
const _NOTE_NAMES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
function noteToFreq(name) {
  if (!name || name === '_') return null;
  const m = name.match(/^([A-G]b?)(\d)$/);
  if (!m) return null;
  const idx = _NOTE_NAMES.indexOf(m[1]);
  if (idx < 0) return null;
  // A4 = 440 Hz，等程律：f = 440 × 2^((semitone - 9 + (octave - 4) × 12) / 12)
  return 440 * Math.pow(2, (idx - 9 + (parseInt(m[2]) - 4) * 12) / 12);
}

// ─── 各地圖 BGM 定義 ─────────────────────────────────────────────
// 每個 step = 1/8 拍（2 小節 = 16 steps），'_' = 休止符
// melody：旋律聲部；bass：低音聲部；bpm：速度
const BGM_PATTERNS = {
  // 浮空島：輕快，C 大調五聲音階，110 BPM
  sky: {
    bpm: 110,
    melody: { steps: ['G5','_','E5','_','C5','_','E5','_','G5','A5','G5','_','E5','D5','C5','_'], type: 'triangle', vol: 0.10 },
    bass:   { steps: ['C3','_','_','_','F3','_','_','_','C3','_','_','_','G3','_','_','_'],       type: 'sine',     vol: 0.07 },
  },
  // 海尼希斯：活潑歡快，C 大調進行曲，128 BPM
  henesys: {
    bpm: 128,
    melody: { steps: ['E5','E5','F5','G5','G5','F5','E5','D5','C5','C5','D5','E5','E5','_','D5','_'], type: 'square',   vol: 0.08 },
    bass:   { steps: ['C3','_','G3','_','C3','_','G3','_','F3','_','C3','_','G3','_','C3','_'],       type: 'sine',     vol: 0.07 },
  },
  // 廢墟：陰暗神秘，A 小調，88 BPM
  ruins: {
    bpm: 88,
    melody: { steps: ['A4','_','C5','_','E5','_','C5','_','B4','_','A4','_','G4','_','F4','_'], type: 'sawtooth', vol: 0.07 },
    bass:   { steps: ['A2','_','_','_','E3','_','_','_','A2','_','_','_','D3','_','_','_'],     type: 'sine',     vol: 0.08 },
  },
  // 精靈之城：神秘魔法，D 多利安調式，100 BPM
  ellinia: {
    bpm: 100,
    melody: { steps: ['D5','F5','A5','_','F5','E5','D5','_','E5','F5','A5','G5','F5','_','D5','_'], type: 'triangle', vol: 0.09 },
    bass:   { steps: ['D3','_','_','_','A3','_','_','_','G3','_','_','_','D3','_','_','_'],         type: 'sine',     vol: 0.07 },
  },
  // 台北：現代都市，G 大調，120 BPM
  taipei: {
    bpm: 120,
    melody: { steps: ['G4','A4','B4','_','A4','G4','_','G4','A4','B4','D5','_','B4','A4','G4','_'], type: 'square',   vol: 0.08 },
    bass:   { steps: ['G3','_','D3','_','G3','_','B2','_','C3','_','G3','_','D3','_','G3','_'],     type: 'sine',     vol: 0.07 },
  },
  // 克里寧：都市暗黑，A 小調五聲，115 BPM
  kerning: {
    bpm: 115,
    melody: { steps: ['A4','_','C5','D5','_','E5','_','D5','C5','A4','_','G4','_','A4','_','_'], type: 'sawtooth', vol: 0.07 },
    bass:   { steps: ['A2','_','_','_','A2','_','E3','_','A2','_','_','_','G2','_','_','_'],     type: 'sine',     vol: 0.08 },
  },
  // 城鎮：溫馨，F 大調，105 BPM
  town: {
    bpm: 105,
    melody: { steps: ['F4','G4','A4','_','Bb4','A4','G4','F4','G4','A4','C5','_','A4','G4','F4','_'], type: 'triangle', vol: 0.09 },
    bass:   { steps: ['F3','_','_','_','C3','_','_','_','F3','_','_','_','Bb2','_','C3','_'],         type: 'sine',     vol: 0.07 },
  },
  // Boss 戰：緊張，E 小調，140 BPM
  boss: {
    bpm: 140,
    melody: { steps: ['E4','_','F4','_','G4','_','F4','E4','D4','_','E4','_','B3','_','E4','_'], type: 'sawtooth', vol: 0.09 },
    bass:   { steps: ['E2','_','_','E2','_','E2','_','_','D2','_','_','D2','_','E2','_','_'],    type: 'sine',     vol: 0.09 },
  },
  // 副本：緊張快節奏，D 小調，135 BPM
  dungeon: {
    bpm: 135,
    melody: { steps: ['D5','_','F5','_','A5','_','F5','D5','E5','_','D5','_','C5','_','Bb4','_'], type: 'sawtooth', vol: 0.08 },
    bass:   { steps: ['D3','_','_','D3','_','A3','_','_','D3','_','_','C3','_','Bb2','_','_'],    type: 'sine',     vol: 0.08 },
  },
};

export class AudioSynth {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    // BGM 排程器狀態
    this._bgmActive   = false;
    this._bgmTimer    = null;
    this._bgmStep     = 0;
    this._bgmNextTime = 0;
    // 舊 API 相容（部分場景仍可能存取）
    this._bgmOsc  = null;
    this._bgmGain = null;
  }

  // ─── 內部：排程單一 BGM 音符（Web Audio 精準時間軸）────────
  _scheduleNote(freq, time, duration, type, volume) {
    if (!this.ctx) return;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;

      // 鋸齒波加低通濾波，避免高頻刺耳
      if (type === 'sawtooth') {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 4;
        filter.Q.value = 0.8;
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(this.ctx.destination);
      // ADSR 包絡：快速 attack → sustain → release
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.015);
      gain.gain.setValueAtTime(volume * 0.75, time + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch (e) { /* 靜默失敗 */ }
  }

  // ─── 內部：即時播放單音（SFX 用）────────────────────────────
  _tone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx) return;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) { /* 靜默失敗 */ }
  }

  _chord(freqs, duration, type = 'square', volume = 0.1) {
    freqs.forEach(f => this._tone(f, duration, type, volume));
  }

  // ─── SFX ─────────────────────────────────────────────────────
  playHit() {
    this._tone(220, 0.08, 'square', 0.12);
    setTimeout(() => this._tone(180, 0.06, 'square', 0.08), 40);
  }

  playSkill(skillKey) {
    switch (skillKey) {
      case 'Z': this._tone(660, 0.1, 'sawtooth', 0.1); break;
      case 'X': this._chord([330, 440, 550], 0.15, 'triangle', 0.12); break;
      case 'C':
        this._tone(880, 0.05, 'square', 0.15);
        setTimeout(() => this._tone(440, 0.2, 'sawtooth', 0.12), 60);
        break;
      case 'V':
        for (let i = 0; i < 8; i++) {
          setTimeout(() => this._tone(220 + i * 55, 0.1, 'triangle', 0.1), i * 50);
        }
        break;
      case 'B': this._chord([220, 330, 440, 550], 0.3, 'sine', 0.1); break;
    }
  }

  playLevelUp() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this._tone(n, 0.3, 'triangle', 0.15), i * 120));
  }

  playPickup() {
    this._tone(880, 0.06, 'sine', 0.1);
    setTimeout(() => this._tone(1100, 0.06, 'sine', 0.1), 60);
  }

  playDeath() {
    this._chord([220, 180, 150], 0.4, 'sawtooth', 0.1);
  }

  // ─── BGM：Lookahead 排程器 ───────────────────────────────────
  // 使用 Web Audio 精準時間軸預排音符，避免 setTimeout 漂移造成節拍不穩定。
  // 每 40ms 輪詢，提前 150ms 排程，在任何設備上都不會掉拍。
  playBgm(mapKey) {
    if (!this.ctx) return;
    this.stopBgm();

    const pattern = BGM_PATTERNS[mapKey];
    if (!pattern) return;

    const { bpm, melody, bass } = pattern;
    const stepSec   = 60 / bpm / 2;        // 1/8 拍時長（秒）
    const loopLen   = melody.steps.length;  // 16 steps = 2 小節
    const LOOKAHEAD = 0.15;                 // 提前排程 150 ms
    const INTERVAL  = 40;                   // 排程器輪詢間隔 ms

    this._bgmActive   = true;
    this._bgmStep     = 0;
    this._bgmNextTime = this.ctx.currentTime + 0.05;

    const schedule = () => {
      if (!this._bgmActive) return;

      while (this._bgmNextTime < this.ctx.currentTime + LOOKAHEAD) {
        const step = this._bgmStep % loopLen;
        const t    = this._bgmNextTime;

        const mFreq = noteToFreq(melody.steps[step]);
        if (mFreq) this._scheduleNote(mFreq, t, stepSec * 0.85, melody.type, melody.vol);

        const bFreq = noteToFreq(bass.steps[step]);
        if (bFreq) this._scheduleNote(bFreq, t, stepSec * 0.90, bass.type, bass.vol);

        this._bgmStep++;
        this._bgmNextTime += stepSec;
      }

      this._bgmTimer = setTimeout(schedule, INTERVAL);
    };

    schedule();
  }

  stopBgm() {
    this._bgmActive = false;
    if (this._bgmTimer) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
    this._bgmStep     = 0;
    this._bgmNextTime = 0;
    // 相容舊 API
    try { if (this._bgmOsc) { this._bgmOsc.stop(); this._bgmOsc.disconnect(); } } catch (e) {}
    this._bgmOsc  = null;
    this._bgmGain = null;
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

// 全局單例
export const audio = new AudioSynth();
