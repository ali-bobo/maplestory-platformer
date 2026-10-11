// BGM 合成引擎（Web Audio）
//
// 設計目標：柔和、不刺耳、有空間感，而且「輕」（手機也跑得動）。
//  - 不直接用方波 / 鋸齒波：用 PeriodicWave 限制泛音，一個振盪器就是一個完整音色。
//  - 效能：離線量測顯示，每個音符各帶一個濾波器 / 平移節點的成本比振盪器本身還高。
//    所以濾波器與平移都放在「每種音色共用的匯流排」上（bus.dest），每個音符只有 振盪器 + 增益 兩個節點；
//    打擊樂的噪音預先濾波好存成緩衝，敲擊時只剩 緩衝播放 + 增益。
//  - 每個音符的包絡都從 0 起、指數釋放，停止前已衰減到 −48 dB 以下，沒有爆音；不留多餘尾巴（存活節點越少越省）。
//  - 襯底與弦樂用兩把微走音的振盪器（合唱效果），並依音高左右交替，聲音有寬度。
//  - 殘響（程式生成的脈衝響應）+ 低通 + 輕度壓縮，讓各聲部融在一起；low 品質時關閉殘響。
//  - 力度不再逐拍隨機抖動，只在伴奏型態內做固定的輕重，聽起來是律動而不是顆粒。

import { midiToFreq } from './theory.js';
import { compileTrack, TRACKS } from './tracks.js';

const STEP_SWING_SHIFT = 2 / 3;   // 三連音搖擺時，反拍延後 2/3 個十六分音符

// ── 每個 AudioContext 共用的素材（波形、噪音、殘響脈衝）──────────────────────────────
const assetCache = new WeakMap();

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function makeWave(ctx, harmonics) {
  const real = new Float32Array(harmonics.length + 1);
  const imag = new Float32Array(harmonics.length + 1);
  harmonics.forEach((h, i) => { imag[i + 1] = h; });
  return ctx.createPeriodicWave(real, imag);
}

function makeImpulse(ctx, seconds = 1.5) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * seconds);
  const ir = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    const rnd = lcg(9001 + ch * 77);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const amp = Math.pow(1 - t, 2.6);
      // 越到後面越暗（高頻先衰減），自然的房間感
      const k = 0.55 * (1 - t) + 0.08;
      lp += ((rnd() * 2 - 1) * amp - lp) * k;
      // 20ms 內淡入：保留預延遲，不把音頭抹糊
      data[i] = lp * Math.min(1, i / (0.02 * sr));
    }
  }
  return ir;
}

// 對緩衝做一次 RBJ 雙二階濾波（初始化時算一次，之後每次敲擊都不必再即時濾波）
function filterBuffer(ctx, src, type, freq, q) {
  const sr = ctx.sampleRate;
  const w0 = 2 * Math.PI * freq / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const cosw = Math.cos(w0);
  let b0, b1, b2;
  if (type === 'highpass') { b0 = (1 + cosw) / 2; b1 = -(1 + cosw); b2 = (1 + cosw) / 2; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; }   // bandpass（常數峰值增益）
  const a0 = 1 + alpha, a1 = -2 * cosw, a2 = 1 - alpha;
  const out = ctx.createBuffer(1, src.length, sr);
  const x = src.getChannelData(0), y = out.getChannelData(0);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, peak = 1e-6;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    if (Math.abs(v) > peak) peak = Math.abs(v);
  }
  for (let i = 0; i < y.length; i++) y[i] /= peak;   // 正規化，力度由增益控制
  return out;
}

function getAssets(ctx) {
  let a = assetCache.get(ctx);
  if (a) return a;
  const rnd = lcg(424242);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const range = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
  // 共用顫音：整個 context 只有一個 LFO，所有長音的 detune 都接它（省下每個音符一個 LFO + 增益節點）
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 5.1;
  const vib = ctx.createGain();
  vib.gain.value = 5;   // 音分
  lfo.connect(vib);
  lfo.start(0);
  a = {
    noise,
    noises: {
      snare: filterBuffer(ctx, noise, 'bandpass', 1900, 0.8),
      hat: filterBuffer(ctx, noise, 'highpass', 7000, 0.6),
      shaker: filterBuffer(ctx, noise, 'bandpass', 5200, 1.1),
      tek: filterBuffer(ctx, noise, 'bandpass', 3600, 1.0),
    },
    vib,
    ir: makeImpulse(ctx),
    waves: {
      softSaw: makeWave(ctx, range(18, (n) => 1 / Math.pow(n, 1.25))),   // 柔和鋸齒：泛音衰減比標準鋸齒快
      flute:   makeWave(ctx, [1, 0.2, 0.07, 0.03, 0.012]),
      pad:     makeWave(ctx, [1, 0.5, 0.28, 0.16, 0.09, 0.05]),
      choir:   makeWave(ctx, [1, 0.34, 0.12, 0.05, 0.02]),
      // 以下是「一個振盪器就是一個完整音色」的波形（比多個振盪器疊加省很多 CPU）
      bell:    makeWave(ctx, [1, 0.26, 0.1, 0.04]),
      epiano:  makeWave(ctx, [1, 0.32, 0.06, 0.02]),
      harp:    makeWave(ctx, [1, 0.2, 0.06, 0.03, 0.012]),
      sub:     makeWave(ctx, [1, 0, 0.04, 0, 0.015]),
      bassSaw: makeWave(ctx, [1.5, 0.55, 0.36, 0.27, 0.2, 0.16, 0.13, 0.11]),
      drone:   makeWave(ctx, [1, 0.14, 0.05]),
      oud:     makeWave(ctx, [1, 0.8, 0.55, 0.3, 0.22, 0.12, 0.08]),     // 烏德琴：二、三次諧波強，鼻音感
      ney:     makeWave(ctx, [1, 0.12, 0.34, 0.05, 0.14, 0.02]),         // 奈伊笛：奇次諧波偏多，中空的氣息感
      organ:   makeWave(ctx, [1, 0.7, 0.5, 0.35, 0.22, 0.14]),           // 管風琴：教堂 / 暗黑感
    },
  };
  assetCache.set(ctx, a);
  return a;
}

// ── 小工具 ───────────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 起音（線性）→ 衰減到延音位準（指數）→ 放開（指數）。回傳可安全停止振盪器的時間。
// 效能重點：音符結束後節點還會活到 stop 為止（離線 / 即時的成本都 ∝ 存活節點數 × 存活時間），
// 所以停止時間抓「剛好衰減到 −50 dB 以下」（約 5.5 個時間常數），不留多餘的尾巴。
function envelope(gainNode, t, dur, peak, { a = 0.01, d = 0.1, s = 0.8, r = 0.1 }) {
  const g = gainNode.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  if (s < 1) g.setTargetAtTime(peak * s, t + a, Math.max(0.004, d / 3));
  const off = t + Math.max(dur, a + 0.02);
  g.setTargetAtTime(0, off, Math.max(0.01, r / 5));
  return off + r * 1.15;
}

// 打擊 / 撥奏類：起音後只做指數衰減。stop = 起音 + 5.5τ（−48 dB）
function decayEnv(gainNode, t, peak, attack, tau) {
  const g = gainNode.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setTargetAtTime(0, t + attack, tau);
  return t + attack + tau * 5.5;
}

function osc(ctx, type, freq, t, wave) {
  const o = ctx.createOscillator();
  if (wave) o.setPeriodicWave(wave); else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

function lowpass(ctx, freq, q = 0.5) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq; f.Q.value = q;
  return f;
}

// 把共用顫音接到振盪器的 detune
function withVibrato(a, o) { a.vib.connect(o.detune); }

// 一個音符 = 一個振盪器 + 一個增益（濾波 / 平移在 bus.dest 的共用匯流排上）
function voice(ctx, out, t, o, g, stop) {
  o.connect(g); g.connect(out);
  o.start(t); o.stop(stop);
}

// 襯底 / 弦樂 / 合唱：兩把微走音振盪器共用一個增益
function sustained(ctx, a, out, t, dur, freq, vel, { wave, gain, env, det, vib }) {
  const g = ctx.createGain();
  const stop = envelope(g, t, dur, vel * gain, env);
  g.connect(out);
  [-det, det].forEach((c) => {
    const o = osc(ctx, null, freq, t, wave); o.detune.value = c;
    if (vib) withVibrato(a, o);
    o.connect(g); o.start(t); o.stop(stop);
  });
}

// ── 樂器 ─────────────────────────────────────────────────────────────────────────
// tone：這個音色共用的低通截止（Hz，null = 不濾波）；autoPan：'pitch' 依音高左右、'alt' 依音高奇偶左右交替。
// play(ctx, assets, out, t, dur, freq, vel)：out 是已經套好濾波 / 平移的共用節點。
const INSTRUMENTS = {
  // 音樂盒 / 鈴
  bell: { tone: null, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.34, 0.003, clamp(0.5 - freq / 5000, 0.18, 0.42));
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.bell), g, stop);
  } },
  // 顫音琴：比鈴更長的衰減、更柔
  vibes: { tone: 4500, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.3, 0.004, 0.55);
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.epiano), g, stop);
  } },
  flute: { tone: null, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.07, d: 0.12, s: 0.85, r: 0.16 });
    const o = osc(ctx, null, freq, t, a.waves.flute);
    withVibrato(a, o);
    voice(ctx, out, t, o, g, stop);
  } },
  // 奈伊笛（沙漠）：中空、氣息感，起音慢、顫音明顯
  ney: { tone: 3200, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.1, d: 0.15, s: 0.8, r: 0.2 });
    const o = osc(ctx, null, freq, t, a.waves.ney);
    withVibrato(a, o);
    voice(ctx, out, t, o, g, stop);
  } },
  // 人聲「啊」主奏（精靈）
  aah: { tone: 2400, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.14, d: 0.2, s: 0.85, r: 0.3 });
    const o = osc(ctx, null, freq, t, a.waves.choir);
    withVibrato(a, o);
    voice(ctx, out, t, o, g, stop);
  } },
  synth: { tone: 2900, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.22, { a: 0.02, d: 0.15, s: 0.7, r: 0.15 });
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.softSaw), g, stop);
  } },
  // 悶音小號（暗巷城）：較暗的低通，起音柔
  muted: { tone: 1500, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.26, { a: 0.04, d: 0.12, s: 0.8, r: 0.14 });
    const o = osc(ctx, null, freq, t, a.waves.softSaw);
    withVibrato(a, o);
    voice(ctx, out, t, o, g, stop);
  } },
  brass: { tone: 2300, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.22, { a: 0.05, d: 0.1, s: 0.85, r: 0.11 });
    const o = osc(ctx, null, freq, t, a.waves.softSaw);
    withVibrato(a, o);
    voice(ctx, out, t, o, g, stop);
  } },
  epiano: { tone: null, autoPan: 'pitch', play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.3, 0.004, 0.2);
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.epiano), g, stop);
  } },

  pad: { tone: 1800, autoPan: 'alt', play(ctx, a, out, t, dur, freq, vel) { sustained(ctx, a, out, t, dur, freq, vel, { wave: a.waves.pad, gain: 0.1, env: { a: 0.5, d: 0.3, s: 0.9, r: 0.7 }, det: 7 }); } },
  strings: { tone: 2300, autoPan: 'alt', play(ctx, a, out, t, dur, freq, vel) { sustained(ctx, a, out, t, dur, freq, vel, { wave: a.waves.softSaw, gain: 0.085, env: { a: 0.4, d: 0.3, s: 0.9, r: 0.6 }, det: 8, vib: true }); } },
  choir: { tone: 1700, autoPan: 'alt', play(ctx, a, out, t, dur, freq, vel) { sustained(ctx, a, out, t, dur, freq, vel, { wave: a.waves.choir, gain: 0.09, env: { a: 0.6, d: 0.3, s: 0.9, r: 0.7 }, det: 9, vib: true }); } },
  // 管風琴襯底（暗黑 / 教堂）
  organ: { tone: 1500, autoPan: 'alt', play(ctx, a, out, t, dur, freq, vel) { sustained(ctx, a, out, t, dur, freq, vel, { wave: a.waves.organ, gain: 0.075, env: { a: 0.25, d: 0.2, s: 0.95, r: 0.5 }, det: 5 }); } },
  // 暗色襯底：低通更低、慢起音，沉重
  darkpad: { tone: 900, autoPan: 'alt', play(ctx, a, out, t, dur, freq, vel) { sustained(ctx, a, out, t, dur, freq, vel, { wave: a.waves.softSaw, gain: 0.1, env: { a: 0.7, d: 0.3, s: 0.9, r: 0.9 }, det: 10 }); } },

  harp: { tone: 3200, autoPan: 'pitch', play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.3, 0.003, 0.28);
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.harp), g, stop);
  } },
  pluck: { tone: 2400, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.22, 0.003, 0.12);
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.softSaw), g, stop);
  } },
  // 烏德琴（沙漠撥弦）：鼻音感的波形，衰減稍長
  oud: { tone: 2800, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.2, 0.003, 0.17);
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.oud), g, stop);
  } },

  sub: { tone: 420, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.34, { a: 0.012, d: 0.12, s: 0.82, r: 0.1 });
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.sub), g, stop);
  } },
  pbass: { tone: 650, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.006, d: 0.25, s: 0.4, r: 0.07 });
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.bassSaw), g, stop);
  } },
  sawbass: { tone: 560, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.24, { a: 0.008, d: 0.08, s: 0.85, r: 0.06 });
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.bassSaw), g, stop);
  } },
  drone: { tone: 520, play(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const stop = envelope(g, t, dur, vel * 0.1, { a: 1.2, d: 0.5, s: 0.95, r: 1.2 });
    voice(ctx, out, t, osc(ctx, null, freq, t, a.waves.drone), g, stop);
  } },
};

// ── 打擊樂：(ctx, a, out, t, vel, variation) ─────────────────────────────────────
// 噪音類用預先濾波好的緩衝（BufferSource + 增益 = 兩個節點），不在每次敲擊時即時濾波。
function bufHit(ctx, buf, out, t, vel, attack, tau, offset) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const stop = decayEnv(g, t, vel, attack, tau);
  src.connect(g); g.connect(out);
  src.start(t, offset, stop - t + 0.01);
  src.stop(stop + 0.01);
}

function toneHit(ctx, out, t, type, f0, f1, sweep, peak, tau) {
  const o = osc(ctx, type, f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + sweep);
  const g = ctx.createGain();
  const stop = decayEnv(g, t, peak, 0.002, tau);
  o.connect(g); g.connect(out); o.start(t); o.stop(stop);
}

const PERCUSSION = {
  K: (ctx, a, out, t, vel) => toneHit(ctx, out, t, 'sine', 130, 46, 0.09, vel * 0.55, 0.07),
  S(ctx, a, out, t, vel, v) {
    bufHit(ctx, a.noises.snare, out, t, vel * 0.3, 0.002, 0.05, v * 0.97 % 1.7);
    toneHit(ctx, out, t, 'triangle', 190, 150, 0.05, vel * 0.2, 0.04);
  },
  H: (ctx, a, out, t, vel, v) => bufHit(ctx, a.noises.hat, out, t, vel * 0.1, 0.002, 0.016, v * 0.61 % 1.8),
  X: (ctx, a, out, t, vel, v) => bufHit(ctx, a.noises.shaker, out, t, vel * 0.16, 0.012, 0.03, v * 0.43 % 1.8),
  R: (ctx, a, out, t, vel) => toneHit(ctx, out, t, 'triangle', 820, 0, 0, vel * 0.16, 0.016),
  T: (ctx, a, out, t, vel) => toneHit(ctx, out, t, 'sine', 175, 88, 0.14, vel * 0.4, 0.11),
  // 手鼓（沙漠節奏）：B = 低音鼓面（Dum）、k = 邊緣高音（Tek）
  B: (ctx, a, out, t, vel) => toneHit(ctx, out, t, 'sine', 150, 96, 0.1, vel * 0.5, 0.09),
  k(ctx, a, out, t, vel, v) {
    bufHit(ctx, a.noises.tek, out, t, vel * 0.24, 0.002, 0.022, v * 0.37 % 1.8);
    toneHit(ctx, out, t, 'triangle', 520, 0, 0, vel * 0.1, 0.02);
  },
};

// ── 混音匯流排：各聲部群組 → 殘響送出 → 低通 → 壓縮 → 主音量 ─────────────────────────
const GROUP_SENDS = { lead: 0.8, pad: 1.0, comp: 0.9, sparkle: 1.4, drone: 1.0, bass: 0.0, perc: 0.35 };
const GROUP_LEVELS = { lead: 1, pad: 1, comp: 1, sparkle: 1, drone: 1, bass: 1, perc: 1 };

export function createMusicBus(ctx, destination, mix = {}) {
  const a = getAssets(ctx);
  const out = ctx.createGain();
  out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 22; comp.ratio.value = 3; comp.attack.value = 0.008; comp.release.value = 0.2;
  const tone = lowpass(ctx, mix.tone || 9000, 0.5);
  const sum = ctx.createGain();
  chain(sum, tone, comp, out, destination);

  const conv = ctx.createConvolver();
  if (!mix.noReverb) conv.buffer = a.ir;
  const revReturn = ctx.createGain();
  revReturn.gain.value = 0.9;
  chain(conv, revReturn, sum);

  const groups = {};
  const sends = [];
  for (const name of Object.keys(GROUP_SENDS)) {
    const g = ctx.createGain();
    g.gain.value = GROUP_LEVELS[name];
    g.connect(sum);
    const send = ctx.createGain();
    const amount = (mix.reverb ?? 0.25) * GROUP_SENDS[name];
    send.gain.value = amount;
    g.connect(send); send.connect(conv);
    groups[name] = g;
    sends.push([send, amount]);
  }

  // 共用的「音色匯流排」：同一音色 + 同一平移位置的所有音符共用一個低通與一個平移節點
  const dests = new Map();
  const dest = (group, toneHz, pan) => {
    const bucket = pan < -0.17 ? -0.35 : pan > 0.17 ? 0.35 : 0;
    const key = `${group}|${toneHz || 0}|${bucket}`;
    let node = dests.get(key);
    if (!node) {
      const target = groups[group];
      let tail = target;
      if (bucket && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner(); p.pan.value = bucket; p.connect(tail); tail = p;
      }
      if (toneHz) { const f = lowpass(ctx, toneHz, 0.6); f.connect(tail); tail = f; }
      if (tail === target) { tail = ctx.createGain(); tail.connect(target); }
      node = tail;
      dests.set(key, node);
    }
    return node;
  };

  return {
    ctx, assets: a, groups, out, dest, level: mix.level ?? 0.3, quality: 'high', stepSec: 0.125,
    // 品質切換：low 關閉殘響送出（省下卷積運算的負載）；其餘等級保持原送出量
    setQuality(level) {
      this.quality = level;
      const t = ctx.currentTime;
      for (const [send, amount] of sends) send.gain.setTargetAtTime(level === 'low' ? 0 : amount, t, 0.05);
    },
    fadeIn(t, seconds = 0.5) {
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(this.level, t + seconds);
    },
    fadeOut(t, seconds = 0.35) {
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + seconds);
    },
    dispose() { try { out.disconnect(); } catch (_) { /* 已斷開 */ } },
  };
}

// ── 品質分級：配合遊戲的自適應品質（high / medium / low），弱裝置自動減聲部 ─────────────────
//  high：全部；medium：去掉閃爍、沙鈴 / 閉鈸；low：只留旋律、襯底、低音、大小鼓，並關閉殘響。
const QUALITY_VOICES = {
  high: null,
  medium: ['lead', 'pad', 'comp', 'bass', 'perc', 'drone'],
  low: ['lead', 'pad', 'bass', 'perc'],
};
const LOW_PERC = new Set(['K', 'S', 'T']);

function allowed(quality, e) {
  const voices = QUALITY_VOICES[quality];
  if (!voices) return true;
  if (!voices.includes(e.voice)) return false;
  if (e.voice === 'perc') {
    if (quality === 'low') return LOW_PERC.has(e.inst);
    if (quality === 'medium') return e.inst !== 'X';
  }
  return true;
}

// 排程單一事件。t 為該事件的絕對音訊時間。
function scheduleEvent(bus, e, t, noiseSeed) {
  const { ctx, assets } = bus;
  if (!allowed(bus.quality, e)) return;
  if (!bus.groups[e.voice]) return;
  if (e.voice === 'perc') {
    const fn = PERCUSSION[e.inst];
    if (fn) fn(ctx, assets, bus.dest('perc', null, 0), t, e.vel, noiseSeed);
    return;
  }
  const def = INSTRUMENTS[e.inst];
  if (!def) return;
  let pan = e.pan;
  if (pan === undefined) {
    pan = def.autoPan === 'pitch' ? clamp((e.midi - 72) / 24, -0.5, 0.5)
      : def.autoPan === 'alt' ? (e.midi % 2 ? 0.35 : -0.35)
      : (e.voice === 'comp' ? 0.2 : 0);
  }
  def.play(ctx, assets, bus.dest(e.voice, def.tone, pan), t, e.dur * bus.stepSec, midiToFreq(e.midi), e.vel);
}

// 一小節內每個事件的絕對時間（含搖擺）
function eventTime(compiled, e, t0) {
  const stepSec = 60 / compiled.bpm / 4;
  const shift = compiled.swing && e.pos % 4 === 2 ? compiled.swing * STEP_SWING_SHIFT : 0;
  return t0 + (e.pos + shift) * stepSec;
}

// 離線 / 測試用：一次排好整小節。t0 = 該小節起點的音訊時間。
export function scheduleBar(bus, compiled, barIndex, t0, only) {
  bus.stepSec = 60 / compiled.bpm / 4;
  const events = compiled.events[barIndex % compiled.bars];
  for (const e of events) {
    if (only && !only.includes(e.voice)) continue;
    scheduleEvent(bus, e, eventTime(compiled, e, t0), barIndex * 16 + e.pos + 1);
  }
}

const compiledCache = new Map();
export function getCompiled(mapKey) {
  if (!TRACKS[mapKey]) return null;
  if (!compiledCache.has(mapKey)) compiledCache.set(mapKey, compileTrack(TRACKS[mapKey]));
  return compiledCache.get(mapKey);
}

// 離線渲染（單元測試 / 音質分析用）：整首排好再 render
export async function renderTrackOffline(mapKey, seconds, sampleRate = 44100, only, mixOverride) {
  const compiled = getCompiled(mapKey);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = createMusicBus(ctx, ctx.destination, { ...compiled.mix, ...(mixOverride || {}) });
  bus.quality = (mixOverride && mixOverride.quality) || 'high';
  bus.fadeIn(0, 0.05);
  const barSec = (4 * 60) / compiled.bpm;
  for (let b = 0, t = 0.05; t < seconds; b++, t += barSec) scheduleBar(bus, compiled, b, t, only);
  return ctx.startRendering();
}

// ── 即時播放器 ────────────────────────────────────────────────────────────────────
// 事件逐筆、只排「未來 0.4 秒內」的：一次只建立幾個節點，不會在每小節開頭一口氣建立上百個
// （一口氣建立會讓主執行緒規律地掉幀，在手機上特別明顯）。
const LOOKAHEAD = 0.4;
const TICK_MS = 80;

export class MusicPlayer {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination || ctx.destination;
    this.bus = null;
    this.timer = null;
    this.compiled = null;
    this.bar = 0;
    this.nextBarTime = 0;
    this.queue = [];
    this.playing = false;
    this.quality = 'high';
  }

  setQuality(level) {
    if (!QUALITY_VOICES.hasOwnProperty(level)) return;
    this.quality = level;
    if (this.bus) this.bus.setQuality(level);
  }

  _fillQueue(cur) {
    const barSec = (4 * 60) / this.compiled.bpm;
    // 佇列保持約 1.5 小節的量；每小節的事件依時間排序後放入
    while (this.queue.length === 0 || this.nextBarTime < cur + LOOKAHEAD + barSec) {
      const events = this.compiled.events[this.bar];
      const items = events.map((e) => ({ e, t: eventTime(this.compiled, e, this.nextBarTime), seed: this.bar * 16 + e.pos + 1 }));
      items.sort((x, y) => x.t - y.t);
      for (const it of items) this.queue.push(it);
      this.bar = (this.bar + 1) % this.compiled.bars;
      this.nextBarTime += barSec;
    }
  }

  play(mapKey) {
    this.stop();
    const compiled = getCompiled(mapKey);
    if (!compiled) return false;
    this.compiled = compiled;
    this.bus = createMusicBus(this.ctx, this.destination, compiled.mix);
    this.bus.stepSec = 60 / compiled.bpm / 4;
    this.bus.setQuality(this.quality);
    const now = this.ctx.currentTime;
    this.bus.fadeIn(now, 0.6);
    this.bar = 0;
    this.queue = [];
    this.nextBarTime = now + 0.08;
    this.playing = true;
    const tick = () => {
      if (!this.playing) return;
      try {
        const cur = this.ctx.currentTime;
        // 時間錨點保護：分頁被暫停後 resume，舊錨點落在過去會一次噴出整排音符
        if (this.queue.length && this.queue[0].t < cur - 0.3) {
          const lag = cur + 0.05 - this.queue[0].t;
          for (const it of this.queue) it.t += lag;
          this.nextBarTime += lag;
        }
        this._fillQueue(cur);
        while (this.queue.length && this.queue[0].t < cur + LOOKAHEAD) {
          const it = this.queue.shift();
          scheduleEvent(this.bus, it.e, it.t, it.seed);
        }
      } catch (err) {
        // 音樂出任何狀況都不能拖垮遊戲：記錄後繼續下一次排程
        if (typeof console !== 'undefined') console.warn('[music]', err);
      }
      this.timer = setTimeout(tick, TICK_MS);
    };
    tick();
    return true;
  }

  stop(fadeSeconds = 0.35) {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.queue = [];
    const bus = this.bus;
    this.bus = null;
    if (bus) {
      try {
        bus.fadeOut(this.ctx.currentTime, fadeSeconds);
        setTimeout(() => bus.dispose(), (fadeSeconds + 0.15) * 1000);
      } catch (_) { bus.dispose(); }
    }
  }
}
