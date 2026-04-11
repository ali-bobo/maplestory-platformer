// Web Audio 音效合成器

export class AudioSynth {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this.ctx = null;
    }
    this._bgmOsc = null;
    this._bgmGain = null;
  }

  _tone(freq, duration, type = 'square', volume = 0.15) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
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

  playHit() {
    this._tone(220, 0.08, 'square', 0.12);
    setTimeout(() => this._tone(180, 0.06, 'square', 0.08), 40);
  }

  playSkill(skillKey) {
    switch (skillKey) {
      case 'Z': // 飛鏢
        this._tone(660, 0.1, 'sawtooth', 0.1);
        break;
      case 'X': // 衝刺
        this._chord([330, 440, 550], 0.15, 'triangle', 0.12);
        break;
      case 'C': // 暗殺
        this._tone(880, 0.05, 'square', 0.15);
        setTimeout(() => this._tone(440, 0.2, 'sawtooth', 0.12), 60);
        break;
      case 'V': // 漩渦
        for (let i = 0; i < 8; i++) {
          setTimeout(() => this._tone(220 + i * 55, 0.1, 'triangle', 0.1), i * 50);
        }
        break;
      case 'B': // 分身
        this._chord([220, 330, 440, 550], 0.3, 'sine', 0.1);
        break;
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

  playBgm(mapKey) {
    if (!this.ctx) return;
    this._stopBgm();
    // 簡單的背景音效（低頻氛圍音）
    try {
      const freqMap = {
        maple: 130, henesys: 146, ellinia: 116, perion: 98, kerning: 87, boss: 65,
      };
      const freq = freqMap[mapKey] || 130;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      osc.start();
      this._bgmOsc = osc;
      this._bgmGain = gain;
    } catch (e) { /* 靜默 */ }
  }

  _stopBgm() {
    try {
      if (this._bgmOsc) {
        this._bgmOsc.stop();
        this._bgmOsc.disconnect();
        this._bgmOsc = null;
      }
    } catch (e) { /* 靜默 */ }
  }

  resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }
}

// 全局單例
export const audio = new AudioSynth();
