// Web Audio 音效合成器

// BGM 的作曲資料與合成引擎在 ./music/（柔和音色、和弦進行、殘響）；本檔保留音效（SFX）與對外介面。
import { MusicPlayer } from './music/synth.js';

export class AudioSynth {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    // BGM 播放器（懶建立：第一次 playBgm 才需要）
    this._music = null;
    this._lastMap = null;
    // 靜音開關（音樂 + 音效；偏好存在 localStorage，與存檔分開）
    this._muted = false;
    try { this._muted = localStorage.getItem('thief-legend-sound') === 'off'; } catch (_) { /* 靜默 */ }
  }

  // ─── 內部：即時播放單音（SFX 用）────────────────────────────
  _tone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx || this._muted) return;
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

  // 技能命中音：短促高頻「喀」+ 暴擊時加一聲低頻重擊；40ms 節流避免多段命中糊成一團
  playImpact(isCrit = false) {
    const now = performance.now();
    if (this._lastImpactAt && now - this._lastImpactAt < 40) return;
    this._lastImpactAt = now;
    this._tone(1400, 0.035, 'square', 0.05);
    this._tone(320, 0.07, 'triangle', 0.08);
    if (isCrit) this._tone(110, 0.16, 'sawtooth', 0.09);
  }

  playSkill(skillKey) {
    switch (skillKey) {
      case 'ATK':   // 近戰揮刀：短促的氣流 + 刀刃摩擦
        this._tone(520, 0.07, 'sawtooth', 0.09);
        this._tone(1500, 0.04, 'square', 0.04);
        break;
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

  // ─── BGM ─────────────────────────────────────────────────────────────────
  // 每張地圖一首 16 小節的曲子（和弦 + 旋律 + 低音 + 伴奏 + 打擊樂），整首循環。
  // 切換地圖時舊曲淡出、新曲淡入，不會疊音。
  playBgm(mapKey) {
    this._lastMap = mapKey;
    if (!this.ctx || this._muted) return;
    if (typeof location !== 'undefined' && /[?&]bgm=0(&|$)/.test(location.search)) return;   // 效能 A/B 測試用
    if (!this._music) this._music = new MusicPlayer(this.ctx);
    this.resumeContext();
    this._music.setQuality(this._musicQuality || 'high');
    this._music.play(mapKey);
  }

  stopBgm() {
    if (this._music) this._music.stop();
  }

  isMuted() { return this._muted; }

  // 靜音開關：音樂與音效一起。靜音時音樂立刻淡出；取消靜音時從目前地圖的曲子重新開始。
  setMuted(muted) {
    this._muted = !!muted;
    try { localStorage.setItem('thief-legend-sound', muted ? 'off' : 'on'); } catch (_) { /* 靜默 */ }
    if (muted) this.stopBgm();
    else {
      this.resumeContext();
      if (this._lastMap) this.playBgm(this._lastMap);
    }
  }

  // 配合遊戲的自適應品質（high / medium / low）：弱裝置自動減少音樂聲部與殘響
  setMusicQuality(level) {
    this._musicQuality = level;
    if (this._music) this._music.setQuality(level);
  }

  resumeContext() {
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') {
      this.ctx.resume().catch(() => {});
    }
  }
}

// 全局單例
export const audio = new AudioSynth();
