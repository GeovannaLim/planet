// Cinematic audio engine.
//
// Everything here is synthesised live with the Web Audio API, so the experience
// ships with original, license-free sound out of the box. Each cue can be
// replaced by a licensed recording: set its path in AUDIO_FILES (see
// audio/README.md). A cue with a file uses the file; a cue without one keeps
// the synthesised version. Nothing plays until the visitor turns sound on.

export const AUDIO_FILES = {
  // key            path (relative to index.html) or null while no file exists
  music: null,          // looping cinematic score bed, ~2–4 min, intensity driven by gain/filter
  amb_facility: null,   // looping room tone of the briefing corridor
  amb_pad: null,        // looping launch-pad ambience (wind, venting, pumps)
  amb_cockpit: null,    // looping cockpit fans / electrical hum
  engine: null,         // looping rocket-engine rumble (launch)
  ignition: null,       // one-shot ignition boom
  radio_in: null,       // one-shot radio open (quindar + static)
  radio_out: null,      // one-shot radio close
  ui_click: null,       // one-shot control click
  ui_confirm: null,     // one-shot confirmation tone
  power_up: null,       // one-shot main bus power-up
  door: null,           // one-shot hatch opening
  servo: null,          // one-shot switch / servo
};

const CHORDS = [
  [73.42, 110.0, 174.61, 261.63, 329.63], // Dm(add9) voicing
  [58.27, 87.31, 146.83, 220.0, 261.63],  // Bbmaj7
  [87.31, 130.81, 220.0, 329.63, 392.0],  // Fmaj9
  [65.41, 98.0, 164.81, 293.66, 392.0],   // Cadd9
];

export class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.buffers = {};
    this.bed = null;          // current ambience id
    this.intensity = 0.15;    // music intensity 0..1
    this.engineLevel = 0;
    this.listeners = new Set();
  }

  onChange(fn) { this.listeners.add(fn); }
  _emit() { this.listeners.forEach((fn) => fn(this.enabled)); }

  async enable() {
    if (!this.ctx) await this._build();
    await this.ctx.resume();
    this.enabled = true;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(0.85, now, 0.6);
    this._applyBed(true);
    this._applyIntensity();
    this._applyEngine();
    this._emit();
  }

  disable() {
    this.enabled = false;
    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0, now, 0.15);
    }
    this._emit();
  }

  toggle() { return this.enabled ? this.disable() : this.enable(); }

  // ---------------------------------------------------------------- graph
  async _build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = (this.ctx = new AC());

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.4;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    this.master.connect(this.comp).connect(ctx.destination);

    const bus = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(this.master); return g; };
    this.musicBus = bus(0.55);
    this.ambBus = bus(0.7);
    this.sfxBus = bus(0.8);
    this.radioBus = bus(0.7);
    this.engineBus = bus(0.9);

    // Reverb for space/scale.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(3.2, 2.4);
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    this.reverb.connect(wet).connect(this.master);

    this.white = this._noise('white', 3);
    this.brown = this._noise('brown', 6);

    await this._loadFiles();
    this._buildMusic();
    this._buildBeds();
    this._buildEngine();
  }

  async _loadFiles() {
    const entries = Object.entries(AUDIO_FILES).filter(([, path]) => path);
    await Promise.all(entries.map(async ([key, path]) => {
      try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(res.status);
        this.buffers[key] = await this.ctx.decodeAudioData(await res.arrayBuffer());
      } catch (err) {
        console.warn(`[audio] "${key}" (${path}) could not load, using synthesised cue`, err);
      }
    }));
  }

  _noise(kind, seconds) {
    const ctx = this.ctx; const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate); const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }

  _impulse(seconds, decay) {
    const ctx = this.ctx; const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  _loop(buffer, dest, gain = 1) {
    const src = this.ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    const g = this.ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(dest); src.start();
    return { src, gain: g };
  }

  // ---------------------------------------------------------------- music
  _buildMusic() {
    const ctx = this.ctx;
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = 0;
    this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.Q.value = 0.6;
    this.musicFilter.connect(this.musicGain);
    this.musicGain.connect(this.musicBus);
    this.musicGain.connect(this.reverb);

    if (this.buffers.music) {
      this._loop(this.buffers.music, this.musicFilter, 1);
      return;
    }

    // Slow filter breathing.
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 180;
    lfo.connect(lfoAmt).connect(this.musicFilter.frequency); lfo.start();

    this.voices = CHORDS[0].map((f, i) => {
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.11 : 0.06;
      const pan = ctx.createStereoPanner(); pan.pan.value = (i / (CHORDS[0].length - 1)) * 1.2 - 0.6;
      const oscs = [-7, 7].map((cents) => {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.frequency.value = f; o.detune.value = cents; o.connect(g); o.start(); return o;
      });
      g.connect(pan).connect(this.musicFilter);
      return { oscs, g };
    });

    // High shimmer layer that only opens with intensity.
    this.shimmer = ctx.createGain(); this.shimmer.gain.value = 0;
    const sh = ctx.createOscillator(); sh.type = 'sine'; sh.frequency.value = CHORDS[0][4] * 2;
    const tremolo = ctx.createOscillator(); tremolo.frequency.value = 4.5;
    const tremAmt = ctx.createGain(); tremAmt.gain.value = 0.3;
    const shAmp = ctx.createGain(); shAmp.gain.value = 0.7;
    tremolo.connect(tremAmt).connect(shAmp.gain);
    sh.connect(shAmp).connect(this.shimmer).connect(this.musicGain);
    sh.start(); tremolo.start();
    this.shimmerOsc = sh;

    let chord = 0;
    this._chordTimer = setInterval(() => {
      if (!this.enabled) return;
      chord = (chord + 1) % CHORDS.length;
      const now = ctx.currentTime;
      this.voices.forEach((v, i) => v.oscs.forEach((o) => o.frequency.setTargetAtTime(CHORDS[chord][i], now, 1.4)));
      this.shimmerOsc.frequency.setTargetAtTime(CHORDS[chord][4] * 2, now, 1.4);
    }, 9000);
  }

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); this._applyIntensity(); }

  _applyIntensity() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime; const i = this.intensity;
    this.musicGain.gain.setTargetAtTime(0.25 + i * 0.75, now, 1.5);
    this.musicFilter.frequency.setTargetAtTime(380 + i * i * 3200, now, 1.5);
    if (this.shimmer) this.shimmer.gain.setTargetAtTime(Math.max(0, i - 0.45) * 0.06, now, 2);
  }

  // ---------------------------------------------------------------- ambience
  _buildBeds() {
    const ctx = this.ctx;
    const make = (fileKey, synth) => {
      const out = ctx.createGain(); out.gain.value = 0; out.connect(this.ambBus);
      if (this.buffers[fileKey]) this._loop(this.buffers[fileKey], out, 1); else synth(out);
      return out;
    };
    this.beds = {
      facility: make('amb_facility', (out) => {
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
        lp.connect(out);
        this._loop(this.brown, lp, 0.5);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const la = ctx.createGain(); la.gain.value = 90;
        lfo.connect(la).connect(lp.frequency); lfo.start();
        [48, 96, 144].forEach((f, k) => {
          const o = ctx.createOscillator(); o.frequency.value = f; const g = ctx.createGain(); g.gain.value = [0.05, 0.018, 0.006][k];
          o.connect(g).connect(out); o.start();
        });
      }),
      pad: make('amb_pad', (out) => {
        // Wind gusting across the pad, cryogenic venting hiss, distant pumps.
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        const gust = ctx.createGain(); gust.gain.value = 0.5;
        lp.connect(gust).connect(out);
        this._loop(this.brown, lp, 0.6);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.11; const la = ctx.createGain(); la.gain.value = 0.3;
        lfo.connect(la).connect(gust.gain); lfo.start();
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3800;
        hp.connect(out); this._loop(this.white, hp, 0.018);
        const pump = ctx.createOscillator(); pump.type = 'triangle'; pump.frequency.value = 58;
        const pg = ctx.createGain(); pg.gain.value = 0.02; pump.connect(pg).connect(out); pump.start();
      }),
      cockpit: make('amb_cockpit', (out) => {
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
        bp.connect(out);
        this._loop(this.brown, bp, 0.35);
        const hum = ctx.createOscillator(); hum.type = 'triangle'; hum.frequency.value = 120;
        const hg = ctx.createGain(); hg.gain.value = 0.012; hum.connect(hg).connect(out); hum.start();
        this.cockpitHum = hg;
      }),
      space: make('__none', (out) => {
        const o = ctx.createOscillator(); o.frequency.value = 41; const g = ctx.createGain(); g.gain.value = 0.05;
        o.connect(g).connect(out); o.start();
      }),
    };
  }

  setBed(id) { this.bed = id; this._applyBed(); }

  _applyBed(immediate) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    Object.entries(this.beds).forEach(([id, g]) => {
      g.gain.setTargetAtTime(id === this.bed ? 1 : 0, now, immediate ? 0.3 : 1.2);
    });
  }

  // ---------------------------------------------------------------- engine
  _buildEngine() {
    const ctx = this.ctx;
    this.engineGain = ctx.createGain(); this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 120;
    this.engineFilter.connect(this.engineGain).connect(this.engineBus);
    if (this.buffers.engine) { this._loop(this.buffers.engine, this.engineFilter, 1); return; }
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 2.6); }
    shaper.curve = curve;
    shaper.connect(this.engineFilter);
    this._loop(this.brown, shaper, 1.6);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.4;
    this.crackleGain = ctx.createGain(); this.crackleGain.gain.value = 0;
    bp.connect(this.crackleGain).connect(this.engineBus);
    this._loop(this.white, bp, 0.12);
    const sub = ctx.createOscillator(); sub.frequency.value = 34; const sg = ctx.createGain(); sg.gain.value = 0.5;
    sub.connect(sg).connect(this.engineFilter); sub.start();
  }

  setEngine(level, seconds = 1) { this.engineLevel = level; this._applyEngine(seconds); }

  _applyEngine(seconds = 0.5) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime; const l = this.engineLevel; const tc = Math.max(0.05, seconds / 3);
    this.engineGain.gain.setTargetAtTime(l * 0.9, now, tc);
    this.engineFilter.frequency.setTargetAtTime(90 + l * 900, now, tc);
    if (this.crackleGain) this.crackleGain.gain.setTargetAtTime(l * l * 0.5, now, tc);
  }

  // ---------------------------------------------------------------- one-shots
  _env(node, t0, a, peak, d) {
    node.gain.setValueAtTime(0, t0);
    node.gain.linearRampToValueAtTime(peak, t0 + a);
    node.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
  }

  _tone(type, f0, f1, dur, peak, dest = this.sfxBus, delay = 0) {
    const ctx = this.ctx; const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain(); this._env(g, t0, 0.005, peak, dur);
    o.connect(g).connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }

  _burst(buffer, filterType, freq, q, dur, peak, dest = this.sfxBus, delay = 0, attack = 0.005) {
    const ctx = this.ctx; const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = buffer;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); this._env(g, t0, attack, peak, dur);
    s.connect(f).connect(g).connect(dest); s.start(t0, Math.random()); s.stop(t0 + attack + dur + 0.1);
    return { f, t0 };
  }

  _file(key, dest = this.sfxBus, gain = 1) {
    if (!this.buffers[key]) return false;
    const s = this.ctx.createBufferSource(); s.buffer = this.buffers[key];
    const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g).connect(dest); s.start();
    return true;
  }

  play(name) {
    if (!this.enabled || !this.ctx) return;
    switch (name) {
      case 'hover':
        this._tone('sine', 3200, 3000, 0.03, 0.012); break;
      case 'click':
        if (this._file('ui_click')) break;
        this._tone('sine', 1900, 1200, 0.05, 0.05);
        this._burst(this.white, 'highpass', 4000, 0.7, 0.03, 0.03); break;
      case 'confirm':
        if (this._file('ui_confirm')) break;
        this._tone('triangle', 660, 660, 0.12, 0.05);
        this._tone('triangle', 990, 990, 0.22, 0.05, this.sfxBus, 0.09); break;
      case 'scan':
        for (let k = 0; k < 5; k++) this._tone('sine', 1400 + k * 180, 1400 + k * 180, 0.05, 0.02, this.sfxBus, k * 0.11);
        break;
      case 'deny':
        this._tone('square', 140, 120, 0.18, 0.025); break;
      case 'servo':
        if (this._file('servo')) break;
        this._tone('sawtooth', 110, 190, 0.45, 0.025);
        this._burst(this.white, 'bandpass', 2500, 1.2, 0.35, 0.02); break;
      case 'relay':
        this._burst(this.brown, 'lowpass', 260, 0.7, 0.12, 0.5);
        this._tone('square', 60, 40, 0.08, 0.03); break;
      case 'powerUp':
        if (this._file('power_up')) break;
        this.play('relay');
        this._tone('sine', 55, 220, 1.6, 0.12);
        this._tone('sine', 110, 440, 1.6, 0.03);
        this._burst(this.white, 'highpass', 6000, 0.5, 1.4, 0.015, this.sfxBus, 0.1, 0.6); break;
      case 'door':
        if (this._file('door')) break;
        this._burst(this.brown, 'lowpass', 300, 0.8, 2.6, 0.9, this.sfxBus, 0, 0.4);
        this._burst(this.white, 'highpass', 3000, 0.6, 1.6, 0.06, this.sfxBus, 0.1, 0.2);
        this._burst(this.brown, 'lowpass', 160, 1, 0.5, 1.2, this.sfxBus, 2.4); break;
      case 'tick':
        this._tone('sine', 1000, 1000, 0.07, 0.04); break;
      case 'ignition': {
        if (this._file('ignition', this.engineBus)) break;
        this._burst(this.brown, 'lowpass', 180, 0.7, 3.5, 2.2, this.engineBus, 0, 0.02);
        this._tone('sine', 70, 28, 2.5, 0.6, this.engineBus);
        this._burst(this.white, 'lowpass', 1400, 0.5, 2, 0.4, this.reverb, 0, 0.01); break;
      }
      case 'whoosh': {
        const { f, t0 } = this._burst(this.white, 'bandpass', 300, 1.2, 2.8, 0.18, this.sfxBus, 0, 1.2);
        f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(2400, t0 + 2.4); break;
      }
      case 'rcs':
        this._burst(this.white, 'highpass', 1800, 0.6, 0.18, 0.09);
        this._burst(this.brown, 'lowpass', 400, 0.7, 0.12, 0.25); break;
      case 'boom':
        this._burst(this.brown, 'lowpass', 120, 0.7, 2.2, 1.4, this.engineBus);
        this._tone('sine', 50, 30, 1.6, 0.4, this.engineBus); break;
      default: break;
    }
  }

  // NASA-style "Quindar" tones bracket every Mission Control transmission.
  radioIn() {
    if (!this.enabled || !this.ctx) return;
    if (this._file('radio_in', this.radioBus)) return;
    this._burst(this.white, 'bandpass', 1800, 0.8, 0.18, 0.08, this.radioBus);
    this._tone('sine', 2525, 2525, 0.25, 0.05, this.radioBus, 0.08);
  }

  radioOut() {
    if (!this.enabled || !this.ctx) return;
    if (this._file('radio_out', this.radioBus)) return;
    this._tone('sine', 2475, 2475, 0.25, 0.05, this.radioBus);
    this._burst(this.white, 'bandpass', 1800, 0.8, 0.14, 0.06, this.radioBus, 0.25);
  }

  // Faint open-channel hiss with crackle while a line is "spoken".
  radioChatter(seconds) {
    if (!this.enabled || !this.ctx) return;
    const { f } = this._burst(this.white, 'bandpass', 2200, 0.9, seconds, 0.022, this.radioBus, 0, 0.05);
    f.Q.value = 0.9;
    const syl = Math.floor(seconds * 7);
    for (let k = 0; k < syl; k++) {
      this._burst(this.white, 'bandpass', 700 + Math.random() * 1400, 3, 0.06 + Math.random() * 0.06,
        0.012 + Math.random() * 0.015, this.radioBus, k / 7 + Math.random() * 0.05);
    }
  }
}

export const audio = new AudioEngine();
