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
  // Boss 戰：激昂緊張，E Phrygian，165 BPM
  // 高音域 E5-G5 全滿，含 Eb5 半音張力 + square 低音 + kick/snare 打擊樂
  boss: {
    bpm: 165,
    melody: { steps: ['E5','E5','G5','Eb5','E5','G5','F5','E5','B4','C5','B4','Bb4','A4','B4','E5','_'], type: 'sawtooth', vol: 0.10 },
    bass:   { steps: ['E2','_','E2','F2','E2','_','E2','G2','E2','_','E2','Eb2','E2','B1','E2','_'],     type: 'square',   vol: 0.10 },
    perc:   { steps: ['K','_','S','_','K','K','S','_','K','_','S','_','K','_','S','K'],                  vol: 0.18 },
  },
  // 副本：緊張快節奏，D 小調，140 BPM
  // 旋律密度提高，減少休止符，加入輕版打擊樂
  dungeon: {
    bpm: 140,
    melody: { steps: ['D5','F5','A5','F5','Eb5','D5','_','D5','F5','A5','G5','F5','Eb5','D5','C5','Bb4'], type: 'sawtooth', vol: 0.09 },
    bass:   { steps: ['D3','_','D3','A3','D3','_','C3','_','D3','_','D3','Bb2','A2','_','D3','_'],        type: 'sine',     vol: 0.08 },
    perc:   { steps: ['K','_','S','_','K','_','S','_','K','_','S','_','K','K','S','_'],                   vol: 0.14 },
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
    // BGM master gain：每次 playBgm 重建，躂斸地圖時用旨諶 gain 淡出舊音符、新音符不重疊
    this._bgmMasterGain = null;
    // 舊 API 相容（部分場景仍可能存取）
    this._bgmOsc  = null;
    this._bgmGain = null;
    // 打擊音效：噪音 buffer 懶初始化，一次性建立後重複使用（避免 GC 壓力）
    this._noiseBuffer = null;
  }

  // ─── 內部：排程單一 BGM 音符（Web Audio 精準時間軸）────────
  _scheduleNote(freq, time, duration, type, volume, destNode) {
    if (!this.ctx) return;
    const dest = destNode || this.ctx.destination;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;

      // 鋸齒波加低通濾波，避免高頻刺耳
      if (type === 'sawtooth') {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = freq * 2.5;
        filter.Q.value = 0.4;
        osc.connect(filter);
        filter.connect(gain);
      } else {
        osc.connect(gain);
      }

      gain.connect(dest);
      // ADSR 包絡：快速 attack → sustain → release
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volume, time + 0.015);
      gain.gain.setValueAtTime(volume * 0.75, time + duration * 0.6);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch (e) { /* 靜默失敗 */ }
  }

  // ─── 內部：kick 鼓（正弦音調快速降頻，衝擊感強）──────────
  _scheduleKick(time, vol, destNode) {
    if (!this.ctx) return;
    const dest = destNode || this.ctx.destination;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(dest);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.start(time);
      osc.stop(time + 0.13);
    } catch (e) { /* 靜默失敗 */ }
  }

  // ─── 內部：噪音 buffer 懶初始化（僅建立一次，零 GC）──────
  _getNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;
    const len  = Math.ceil(this.ctx.sampleRate * 0.08);  // 80ms 白噪音
    const buf  = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
    return buf;
  }

  // ─── 內部：snare 鼓（低頻體鳴 + bandpass 噪音）───────────
  _scheduleSnare(time, vol, destNode) {
    if (!this.ctx) return;
    const dest = destNode || this.ctx.destination;
    try {
      // 低頻體鳴
      const osc = this.ctx.createOscillator();
      const g1  = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 180;
      osc.connect(g1);
      g1.connect(dest);
      g1.gain.setValueAtTime(vol * 0.5, time);
      g1.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc.start(time);
      osc.stop(time + 0.07);
      // 高頻噪音（重複使用快取 buffer）
      const src    = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const g2     = this.ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.value = 3000;
      filter.Q.value = 0.8;
      src.buffer = this._getNoiseBuffer();
      src.connect(filter);
      filter.connect(g2);
      g2.connect(dest);
      g2.gain.setValueAtTime(vol * 0.9, time);
      g2.gain.exponentialRampToValueAtTime(0.001, time + 0.07);
      src.start(time);
      src.stop(time + 0.08);
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
    this.stopBgm();  // 舊 masterGain 淡出 + 停止排程

    const pattern = BGM_PATTERNS[mapKey];
    if (!pattern) return;

    const { bpm, melody, bass, perc } = pattern;
    const stepSec   = 60 / bpm / 2;        // 1/8 拍時長（秒）
    const loopLen   = melody.steps.length;  // 16 steps = 2 小節
    const LOOKAHEAD = 0.15;                 // 提前排程 150 ms
    const INTERVAL  = 40;                   // 排程器輪詢間隔 ms

    // 每次 playBgm 建立新的 masterGain：舊音符經舊 gain 淡出，新音符經新 gain 滿音，完全不重疊
    const masterGain = this.ctx.createGain();
    masterGain.connect(this.ctx.destination);
    masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
    this._bgmMasterGain = masterGain;

    this._bgmActive   = true;
    this._bgmStep     = 0;
    this._bgmNextTime = this.ctx.currentTime + 0.05;

    const schedule = () => {
      if (!this._bgmActive) return;

      while (this._bgmNextTime < this.ctx.currentTime + LOOKAHEAD) {
        // 時間錨點保護：context 被暫停（視窗切換）後 resume，舊錨點落在過去會一次噴出音符
        if (this._bgmNextTime < this.ctx.currentTime - 0.5) {
          this._bgmNextTime = this.ctx.currentTime + 0.05;
        }

        const step  = this._bgmStep % loopLen;
        const t     = this._bgmNextTime;

        // ── 段落強弱（每 loopLen 步為一段落，4 段落一週期）──────────────
        // 週期模式：[1.0, 1.0, 0.68, 0.92]
        //   段落 0、1：正常音量
        //   段落 2：輕聲（製造「verse 退回」感）
        //   段落 3：稍弱後返回（準備下一個高峰）
        const phrase      = Math.floor(this._bgmStep / loopLen) % 4;
        const PHRASE_MULS = [1.0, 1.0, 0.68, 0.92];
        const phraseMul   = PHRASE_MULS[phrase];

        // ── 拍位強弱 ────────────────────────────────────────────────────
        // 句首重音（step 0, 8）× 1.35；奇數弱拍（off-beat）× 0.82
        const beatMul   = (step % 8 === 0) ? 1.35
                        : (step % 2 === 1) ? 0.82
                        : 1.0;

        const dynMul    = phraseMul * beatMul;

        const mFreq = noteToFreq(melody.steps[step]);
        if (mFreq) this._scheduleNote(mFreq, t, stepSec * 0.85, melody.type, melody.vol * dynMul, masterGain);

        const bFreq = noteToFreq(bass.steps[step]);
        // 低音聲部段落強弱輕微（保持節奏支撐），弱拍不衰減
        if (bFreq) this._scheduleNote(bFreq, t, stepSec * 0.90, bass.type, bass.vol * phraseMul, masterGain);

        // 打擊樂聲部（boss / dungeon 專用，K=kick, S=snare）
        if (perc) {
          const p = perc.steps[step];
          if (p === 'K') this._scheduleKick(t, perc.vol * phraseMul, masterGain);
          else if (p === 'S') this._scheduleSnare(t, perc.vol * phraseMul, masterGain);
        }

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
    // 淡出舊 masterGain：已排程的音符在 80ms 內淡出，不與新 BGM 重疊
    const oldGain = this._bgmMasterGain;
    if (oldGain && this.ctx) {
      try {
        const t = this.ctx.currentTime;
        oldGain.gain.cancelScheduledValues(t);
        oldGain.gain.setValueAtTime(oldGain.gain.value, t);
        oldGain.gain.linearRampToValueAtTime(0, t + 0.10);
      } catch (e) {}
    }
    this._bgmMasterGain = null;
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
