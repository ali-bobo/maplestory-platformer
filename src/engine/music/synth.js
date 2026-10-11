// BGM 合成引擎（Web Audio）
//
// 設計目標：柔和、不刺耳、有空間感。
//  - 不直接用方波 / 鋸齒波：改用 PeriodicWave 限制泛音（柔和鋸齒、長笛、風琴），再過低通濾波，高頻不會刺耳。
//  - 每個音符的包絡都從 0 起、用 setTargetAtTime 指數釋放，停止前已衰減到可忽略，沒有爆音 / 喀噠聲。
//  - 襯底與弦樂用兩三把微幅走音的振盪器分左右聲道（合唱效果），聲音有寬度而不是單薄的一條線。
//  - 殘響（程式生成的衰減噪音脈衝響應）+ 低通 + 輕度壓縮，讓各聲部融在一起。
//  - 力度不再逐拍隨機抖動，只在伴奏型態內做固定的輕重（拍點重音），聽起來是律動而不是顆粒。

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

function makeImpulse(ctx, seconds = 2.2) {
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

function getAssets(ctx) {
  let a = assetCache.get(ctx);
  if (a) return a;
  const rnd = lcg(424242);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = rnd() * 2 - 1;
  const range = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
  a = {
    noise,
    ir: makeImpulse(ctx),
    waves: {
      softSaw: makeWave(ctx, range(18, (n) => 1 / Math.pow(n, 1.25))),   // 柔和鋸齒：泛音衰減比標準鋸齒快
      flute:   makeWave(ctx, [1, 0.2, 0.07, 0.03, 0.012]),
      pad:     makeWave(ctx, [1, 0.5, 0.28, 0.16, 0.09, 0.05]),
      choir:   makeWave(ctx, [1, 0.34, 0.12, 0.05, 0.02]),
    },
  };
  assetCache.set(ctx, a);
  return a;
}

// ── 小工具 ───────────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// 起音（線性）→ 衰減到延音位準（指數）→ 放開（指數）。回傳可安全停止振盪器的時間。
function envelope(gainNode, t, dur, peak, { a = 0.01, d = 0.1, s = 0.8, r = 0.1 }) {
  const g = gainNode.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + a);
  if (s < 1) g.setTargetAtTime(peak * s, t + a, Math.max(0.004, d / 3));
  const off = t + Math.max(dur, a + 0.02);
  g.setTargetAtTime(0, off, Math.max(0.01, r / 5));
  return off + r * 2.2;
}

// 打擊 / 撥奏類：起音後只做指數衰減，不論音符長短
function decayEnv(gainNode, t, peak, attack, tau, stopAfter) {
  const g = gainNode.gain;
  g.setValueAtTime(0, t);
  g.linearRampToValueAtTime(peak, t + attack);
  g.setTargetAtTime(0, t + attack, tau);
  return t + attack + stopAfter;
}

function osc(ctx, type, freq, t, wave) {
  const o = ctx.createOscillator();
  if (wave) o.setPeriodicWave(wave); else o.type = type;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

function pannerOf(ctx, pan) {
  if (!pan || !ctx.createStereoPanner) return null;
  const p = ctx.createStereoPanner();
  p.pan.value = clamp(pan, -1, 1);
  return p;
}

function chain(...nodes) {
  for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
  return nodes[nodes.length - 1];
}

function vibrato(ctx, o, t, dur, { rate = 5.2, depth = 5, delay = 0.2 } = {}) {
  const lfo = ctx.createOscillator();
  lfo.frequency.value = rate;
  const amt = ctx.createGain();
  amt.gain.setValueAtTime(0, t);
  amt.gain.setValueAtTime(0, t + delay);
  amt.gain.linearRampToValueAtTime(depth, t + delay + 0.35);
  lfo.connect(amt);
  amt.connect(o.detune);
  lfo.start(t);
  return lfo;
}

// ── 樂器：(ctx, a, out, t, dur, freq, vel, pan) ─────────────────────────────────────
const INSTRUMENTS = {
  // 音樂盒 / 鈴：幾個諧波正弦，指數衰減，高音衰減較快
  bell(ctx, a, out, t, dur, freq, vel, pan) {
    const decay = clamp(1.5 - freq / 1800, 0.4, 1.3);
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.34, 0.003, decay / 3, decay * 2.6);
    const p = pannerOf(ctx, pan);
    chain(g, ...(p ? [p] : []), out);
    [[1, 1], [2, 0.26], [3, 0.1], [4.01, 0.04]].forEach(([ratio, amp]) => {
      if (freq * ratio > 11000) return;
      const o = osc(ctx, 'sine', freq * ratio, t);
      const og = ctx.createGain(); og.gain.value = amp;
      chain(o, og, g);
      o.start(t); o.stop(stop);
    });
  },

  // 長笛：只有低次諧波的柔和波形 + 延遲出現的顫音
  flute(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(freq * 4.5, 1800, 4200); lp.Q.value = 0.4;
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.07, d: 0.12, s: 0.85, r: 0.16 });
    chain(g, lp, out);
    const o = osc(ctx, null, freq, t, a.waves.flute);
    const lfo = vibrato(ctx, o, t, dur, { rate: 5.0, depth: 5, delay: 0.18 });
    chain(o, g);
    o.start(t); o.stop(stop); lfo.stop(stop);
  },

  // 柔和合成主奏：兩把微走音的柔和鋸齒 + 濾波器起音掃頻
  synth(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    const top = clamp(freq * 4, 1500, 3400);
    lp.frequency.setValueAtTime(top * 0.45, t);
    lp.frequency.setTargetAtTime(top, t, 0.05);
    const stop = envelope(g, t, dur, vel * 0.2, { a: 0.02, d: 0.15, s: 0.7, r: 0.15 });
    chain(g, lp, out);
    [-6, 6].forEach((c) => {
      const o = osc(ctx, null, freq, t, a.waves.softSaw); o.detune.value = c;
      chain(o, g); o.start(t); o.stop(stop);
    });
  },

  // 銅管感：濾波器隨起音張開 + 延遲顫音
  brass(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.9;
    const top = clamp(freq * 3.5, 1600, 3000);
    lp.frequency.setValueAtTime(top * 0.3, t);
    lp.frequency.setTargetAtTime(top, t, 0.045);
    const stop = envelope(g, t, dur, vel * 0.2, { a: 0.03, d: 0.1, s: 0.85, r: 0.11 });
    chain(g, lp, out);
    [-5, 5].forEach((c) => {
      const o = osc(ctx, null, freq, t, a.waves.softSaw); o.detune.value = c;
      const lfo = vibrato(ctx, o, t, dur, { rate: 5.4, depth: 4, delay: 0.25 });
      chain(o, g); o.start(t); o.stop(stop); lfo.stop(stop);
    });
  },

  // 電鋼琴：基音 + 衰減較快的二倍音，圓潤
  epiano(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.3, 0.004, 0.22, 1.3);
    const p = pannerOf(ctx, pan);
    chain(g, ...(p ? [p] : []), out);
    [['sine', 1, 1], ['sine', 2, 0.3], ['triangle', 1, 0.25]].forEach(([type, ratio, amp]) => {
      const o = osc(ctx, type, freq * ratio, t);
      const og = ctx.createGain(); og.gain.value = amp;
      chain(o, og, g); o.start(t); o.stop(stop);
    });
  },

  // 襯底：兩把微走音、分左右聲道，慢起音
  pad(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(freq * 2.4, 650, 1900); lp.Q.value = 0.3;
    const stop = envelope(g, t, dur, vel * 0.09, { a: 0.5, d: 0.3, s: 0.9, r: 0.9 });
    chain(g, lp, out);
    [[-7, -0.4], [7, 0.4]].forEach(([c, pan]) => {
      const o = osc(ctx, null, freq, t, a.waves.pad); o.detune.value = c;
      const p = pannerOf(ctx, pan);
      chain(o, ...(p ? [p] : []), g); o.start(t); o.stop(stop);
    });
  },

  strings(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(freq * 2.8, 800, 2600); lp.Q.value = 0.35;
    const stop = envelope(g, t, dur, vel * 0.075, { a: 0.4, d: 0.3, s: 0.9, r: 0.7 });
    chain(g, lp, out);
    [[-8, -0.45], [0, 0], [8, 0.45]].forEach(([c, pan]) => {
      const o = osc(ctx, null, freq, t, a.waves.softSaw); o.detune.value = c;
      const lfo = vibrato(ctx, o, t, dur, { rate: 5.0, depth: 4, delay: 0.4 });
      const p = pannerOf(ctx, pan);
      chain(o, ...(p ? [p] : []), g); o.start(t); o.stop(stop); lfo.stop(stop);
    });
  },

  choir(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(freq * 2.4, 700, 1700); lp.Q.value = 0.5;
    const stop = envelope(g, t, dur, vel * 0.08, { a: 0.6, d: 0.3, s: 0.9, r: 0.9 });
    chain(g, lp, out);
    [[-9, -0.5], [0, 0], [9, 0.5]].forEach(([c, pan]) => {
      const o = osc(ctx, null, freq, t, a.waves.choir); o.detune.value = c;
      const lfo = vibrato(ctx, o, t, dur, { rate: 4.6, depth: 5, delay: 0.5 });
      const p = pannerOf(ctx, pan);
      chain(o, ...(p ? [p] : []), g); o.start(t); o.stop(stop); lfo.stop(stop);
    });
  },

  // 豎琴 / 撥弦：三角波 + 二倍音，濾波器隨衰減關閉（越後面越暗）
  harp(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.5;
    lp.frequency.setValueAtTime(clamp(freq * 7, 1200, 6500), t);
    lp.frequency.setTargetAtTime(freq * 1.6, t + 0.004, 0.2);
    const stop = decayEnv(g, t, vel * 0.3, 0.003, 0.5, 1.5);
    const p = pannerOf(ctx, pan);
    chain(g, lp, ...(p ? [p] : []), out);
    [['triangle', 1, 1], ['sine', 2, 0.18]].forEach(([type, ratio, amp]) => {
      const o = osc(ctx, type, freq * ratio, t);
      const og = ctx.createGain(); og.gain.value = amp;
      chain(o, og, g); o.start(t); o.stop(stop);
    });
  },

  // 吉他式撥奏：柔和鋸齒過會關閉的低通；用在和弦切分與 16 分音符琶音
  pluck(ctx, a, out, t, dur, freq, vel, pan) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.6;
    lp.frequency.setValueAtTime(clamp(freq * 5, 900, 4200), t);
    lp.frequency.setTargetAtTime(freq * 1.4, t + 0.003, 0.09);
    const stop = decayEnv(g, t, vel * 0.22, 0.003, 0.16, 0.9);
    const p = pannerOf(ctx, pan);
    chain(g, lp, ...(p ? [p] : []), out);
    const o = osc(ctx, null, freq, t, a.waves.softSaw);
    chain(o, g); o.start(t); o.stop(stop);
  },

  // 低音：正弦 + 少量三角波，低通；圓潤的低頻
  sub(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 0.4;
    const stop = envelope(g, t, dur, vel * 0.34, { a: 0.012, d: 0.12, s: 0.82, r: 0.1 });
    chain(g, lp, out);
    [['sine', 1], ['triangle', 0.32]].forEach(([type, amp]) => {
      const o = osc(ctx, type, freq, t);
      const og = ctx.createGain(); og.gain.value = amp;
      chain(o, og, g); o.start(t); o.stop(stop);
    });
  },

  // 彈撥低音：濾波器隨衰減關閉，加上純正弦的低頻底
  pbass(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(clamp(freq * 7, 380, 900), t);
    lp.frequency.setTargetAtTime(freq * 2, t + 0.004, 0.12);
    const stop = envelope(g, t, dur, vel * 0.3, { a: 0.006, d: 0.25, s: 0.4, r: 0.07 });
    chain(g, lp, out);
    const o = osc(ctx, null, freq, t, a.waves.softSaw);
    const sine = osc(ctx, 'sine', freq, t);
    const sg = ctx.createGain(); sg.gain.value = 0.7;
    chain(o, g); chain(sine, sg, g);
    o.start(t); o.stop(stop); sine.start(t); sine.stop(stop);
  },

  // 驅動型低音（Boss / 副本）：兩把柔和鋸齒 + 正弦低頻，濾波器短促張開
  sawbass(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.setTargetAtTime(480, t + 0.01, 0.07);
    const stop = envelope(g, t, dur, vel * 0.24, { a: 0.008, d: 0.08, s: 0.85, r: 0.06 });
    chain(g, lp, out);
    [-4, 4].forEach((c) => {
      const o = osc(ctx, null, freq, t, a.waves.softSaw); o.detune.value = c;
      chain(o, g); o.start(t); o.stop(stop);
    });
    const sine = osc(ctx, 'sine', freq, t);
    const sg = ctx.createGain(); sg.gain.value = 0.9;
    chain(sine, sg, g); sine.start(t); sine.stop(stop);
  },

  // 持續音：低頻、極慢起音，營造遠古的空洞感
  drone(ctx, a, out, t, dur, freq, vel) {
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; lp.Q.value = 0.3;
    const stop = envelope(g, t, dur, vel * 0.1, { a: 1.2, d: 0.5, s: 0.95, r: 1.4 });
    chain(g, lp, out);
    [['sine', 1], ['triangle', 0.5]].forEach(([type, amp]) => {
      const o = osc(ctx, type, freq, t);
      const og = ctx.createGain(); og.gain.value = amp;
      chain(o, og, g); o.start(t); o.stop(stop);
    });
  },
};

// ── 打擊樂：(ctx, a, out, t, vel, variation) ─────────────────────────────────────
function noiseHit(ctx, a, out, t, vel, { filter, freq, q, attack, tau, length, offset }) {
  const src = ctx.createBufferSource();
  src.buffer = a.noise;
  const f = ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  const stop = decayEnv(g, t, vel, attack, tau, length);
  chain(src, f, g, out);
  src.start(t, offset, length + attack + 0.02);
  src.stop(stop + 0.02);
}

const PERCUSSION = {
  K(ctx, a, out, t, vel) {
    const o = osc(ctx, 'sine', 130, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.55, 0.002, 0.07, 0.4);
    chain(o, g, out); o.start(t); o.stop(stop);
  },
  S(ctx, a, out, t, vel, v) {
    noiseHit(ctx, a, out, t, vel * 0.3, { filter: 'bandpass', freq: 1900, q: 0.8, attack: 0.002, tau: 0.055, length: 0.3, offset: v * 0.97 % 1.7 });
    const o = osc(ctx, 'triangle', 190, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.05);
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.2, 0.002, 0.04, 0.25);
    chain(o, g, out); o.start(t); o.stop(stop);
  },
  H(ctx, a, out, t, vel, v) {
    noiseHit(ctx, a, out, t, vel * 0.1, { filter: 'highpass', freq: 7000, q: 0.5, attack: 0.002, tau: 0.017, length: 0.12, offset: v * 0.61 % 1.8 });
  },
  X(ctx, a, out, t, vel, v) {
    noiseHit(ctx, a, out, t, vel * 0.11, { filter: 'bandpass', freq: 5200, q: 1.1, attack: 0.012, tau: 0.03, length: 0.16, offset: v * 0.43 % 1.8 });
  },
  R(ctx, a, out, t, vel) {
    const o = osc(ctx, 'triangle', 820, t);
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.16, 0.002, 0.016, 0.12);
    chain(o, g, out); o.start(t); o.stop(stop);
  },
  T(ctx, a, out, t, vel) {
    const o = osc(ctx, 'sine', 175, t);
    o.frequency.exponentialRampToValueAtTime(88, t + 0.14);
    const g = ctx.createGain();
    const stop = decayEnv(g, t, vel * 0.4, 0.003, 0.12, 0.6);
    chain(o, g, out); o.start(t); o.stop(stop);
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
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = mix.tone || 9000; tone.Q.value = 0.5;
  const sum = ctx.createGain();
  chain(sum, tone, comp, out, destination);

  const conv = ctx.createConvolver();
  conv.buffer = a.ir;
  const revReturn = ctx.createGain();
  revReturn.gain.value = 0.9;
  chain(conv, revReturn, sum);

  const groups = {};
  for (const name of Object.keys(GROUP_SENDS)) {
    const g = ctx.createGain();
    g.gain.value = GROUP_LEVELS[name];
    g.connect(sum);
    const send = ctx.createGain();
    send.gain.value = (mix.reverb ?? 0.25) * GROUP_SENDS[name];
    g.connect(send); send.connect(conv);
    groups[name] = g;
  }
  return {
    ctx, assets: a, groups, out, level: mix.level ?? 0.3,
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

// 排程一小節。t0 = 該小節起點的音訊時間。
export function scheduleBar(bus, compiled, barIndex, t0, only) {
  const { ctx, assets } = bus;
  const stepSec = 60 / compiled.bpm / 4;
  const events = compiled.events[barIndex % compiled.bars];
  const swing = compiled.swing;
  for (const e of events) {
    const shift = swing && e.pos % 4 === 2 ? swing * STEP_SWING_SHIFT : 0;
    const t = t0 + (e.pos + shift) * stepSec;
    if (only && !only.includes(e.voice)) continue;
    const group = bus.groups[e.voice];
    if (!group) continue;
    if (e.voice === 'perc') {
      const fn = PERCUSSION[e.inst];
      if (fn) fn(ctx, assets, group, t, e.vel, barIndex * 16 + e.pos + 1);
      continue;
    }
    const inst = INSTRUMENTS[e.inst];
    if (!inst) continue;
    const pan = e.pan !== undefined ? e.pan : (e.inst === 'harp' ? clamp((e.midi - 72) / 24, -0.5, 0.5) : (e.voice === 'comp' ? 0.2 : 0));
    inst(ctx, assets, group, t, e.dur * stepSec, midiToFreq(e.midi), e.vel, pan);
  }
}

const compiledCache = new Map();
export function getCompiled(mapKey) {
  if (!TRACKS[mapKey]) return null;
  if (!compiledCache.has(mapKey)) compiledCache.set(mapKey, compileTrack(TRACKS[mapKey]));
  return compiledCache.get(mapKey);
}

// 離線渲染（單元測試 / 音質分析用）：整首排好再 render
export async function renderTrackOffline(mapKey, seconds, sampleRate = 44100, only) {
  const compiled = getCompiled(mapKey);
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const bus = createMusicBus(ctx, ctx.destination, compiled.mix);
  bus.fadeIn(0, 0.05);
  const barSec = (4 * 60) / compiled.bpm;
  for (let b = 0, t = 0.05; t < seconds; b++, t += barSec) scheduleBar(bus, compiled, b, t, only);
  return ctx.startRendering();
}

// ── 即時播放器：提前排程約 1 小節，每 200ms 檢查一次 ─────────────────────────────────
export class MusicPlayer {
  constructor(ctx, destination) {
    this.ctx = ctx;
    this.destination = destination || ctx.destination;
    this.bus = null;
    this.timer = null;
    this.compiled = null;
    this.bar = 0;
    this.nextBarTime = 0;
    this.playing = false;
  }

  play(mapKey) {
    this.stop();
    const compiled = getCompiled(mapKey);
    if (!compiled) return false;
    this.compiled = compiled;
    this.bus = createMusicBus(this.ctx, this.destination, compiled.mix);
    const now = this.ctx.currentTime;
    this.bus.fadeIn(now, 0.6);
    this.bar = 0;
    this.nextBarTime = now + 0.08;
    this.playing = true;
    const barSec = (4 * 60) / compiled.bpm;
    const tick = () => {
      if (!this.playing) return;
      const cur = this.ctx.currentTime;
      // 時間錨點保護：分頁被暫停後 resume，舊錨點落在過去會一次噴出整排音符
      if (this.nextBarTime < cur - 0.3) this.nextBarTime = cur + 0.05;
      while (this.nextBarTime < cur + 1.2) {
        scheduleBar(this.bus, this.compiled, this.bar, this.nextBarTime);
        this.bar = (this.bar + 1) % this.compiled.bars;
        this.nextBarTime += barSec;
      }
      this.timer = setTimeout(tick, 200);
    };
    tick();
    return true;
  }

  stop(fadeSeconds = 0.35) {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
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
