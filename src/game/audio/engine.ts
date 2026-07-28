// AUDIO SEAM — POD-AUDIOFX implementation.
// 100% original synthesized SFX + procedural chiptune loops (design.md §8).
// Raw WebAudio only: no files, no howler. Lazily-created AudioContext that
// resumes on the first user gesture; master/music/sfx gain buses fed by the
// zustand settings store (persisted). SFX auto-wired to the engine event bus.

import { on } from '../engine/events';
import { useGameStore } from '../state/store';

export type SfxName =
  | 'jump' | 'stomp' | 'coin' | 'powerupSpawn' | 'powerupCollect' | 'shoot'
  | 'brickBreak' | 'kickShell' | 'spring' | 'pipeEnter' | 'flagpole' | 'oneUp'
  | 'damage' | 'gameOver' | 'pause' | 'uiClick' | 'uiHover'
  // extended names (event-bus driven + manual overlay calls)
  | 'death' | 'checkpoint' | 'levelComplete' | 'bossDown' | 'flagGrab'
  | 'scoreTick' | 'timerWarn';

// ---------------------------------------------------------------------------
// Context + buses
// ---------------------------------------------------------------------------

let ctx: AudioContext | null = null;
let masterBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

let vols = { master: 0.8, music: 0.7, sfx: 0.9 };
let muted = false;
let paused = false; // ducks music while the pause menu is open
let busesWired = false;
let eventsWired = false;

function applyGains(): void {
  if (!ctx || !masterBus || !musicBus || !sfxBus) return;
  const t = ctx.currentTime;
  masterBus.gain.setTargetAtTime(muted ? 0 : vols.master, t, 0.02);
  musicBus.gain.setTargetAtTime(vols.music * (paused ? 0.3 : 1), t, 0.05);
  sfxBus.gain.setTargetAtTime(vols.sfx, t, 0.02);
}

function makeNoiseBuffer(c: AudioContext): AudioBuffer {
  const len = c.sampleRate; // 1s of white noise, reused by every noise voice
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/** Create/resume the AudioContext. Call on first user interaction. */
export function initAudio(): void {
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    masterBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(masterBus);
    sfxBus.connect(masterBus);
    masterBus.connect(ctx.destination);
    noiseBuf = makeNoiseBuffer(ctx);
    applyGains();
    wireStore();
    wireEvents();
    // a theme may have been requested before the first gesture
    if (pendingTheme) {
      const theme = pendingTheme;
      pendingTheme = null;
      startMusic(theme);
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

function wireStore(): void {
  if (busesWired) return;
  busesWired = true;
  const s = useGameStore.getState().settings;
  vols = { master: s.master, music: s.music, sfx: s.sfx };
  muted = s.muted;
  applyGains();
  useGameStore.subscribe((state, prev) => {
    if (state.settings !== prev.settings) {
      vols = {
        master: state.settings.master,
        music: state.settings.music,
        sfx: state.settings.sfx,
      };
      muted = state.settings.muted;
      applyGains();
    }
    // timer warning: tempo up when the clock runs low (design.md §9)
    if (state.run !== prev.run) {
      const warn = state.run.status === 'playing' && state.run.timeLeft < 100;
      if (warn !== timerWarning) {
        timerWarning = warn;
        if (warn) playSfx('timerWarn');
      }
      paused = state.run.status === 'paused';
      applyGains();
    }
  });
}

// ---------------------------------------------------------------------------
// Tiny synth helpers
// ---------------------------------------------------------------------------

const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

interface ToneOpts {
  freq: number;
  freq2?: number; // glide target
  dur: number;
  type?: OscillatorType;
  vol?: number;
  at?: number; // schedule offset in seconds
  bus?: GainNode | null;
  curve?: 'exp' | 'lin';
}

function tone(o: ToneOpts): void {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + (o.at ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const vol = o.vol ?? 0.2;
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(Math.max(1, o.freq), t0);
  if (o.freq2 !== undefined) {
    if (o.curve === 'lin') osc.frequency.linearRampToValueAtTime(Math.max(1, o.freq2), t0 + o.dur);
    else osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freq2), t0 + o.dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + o.dur);
  osc.connect(g);
  g.connect(o.bus ?? sfxBus ?? ctx.destination);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.05);
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  at?: number;
  filterFreq?: number;
  filterEnd?: number;
  type?: BiquadFilterType;
  q?: number;
  bus?: GainNode | null;
}

function noise(o: NoiseOpts): void {
  if (!ctx || !noiseBuf || ctx.state !== 'running') return;
  const t0 = ctx.currentTime + (o.at ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? 'lowpass';
  f.frequency.setValueAtTime(o.filterFreq ?? 1200, t0);
  if (o.filterEnd !== undefined) {
    f.frequency.exponentialRampToValueAtTime(Math.max(20, o.filterEnd), t0 + o.dur);
  }
  f.Q.value = o.q ?? 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + o.dur);
  src.connect(f);
  f.connect(g);
  g.connect(o.bus ?? sfxBus ?? ctx.destination);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + o.dur + 0.05);
}

/** Little original motif player (midi notes, evenly spaced). */
function motif(notes: number[], step: number, type: OscillatorType, vol: number, dur?: number): void {
  notes.forEach((n, i) => {
    tone({ freq: mtof(n), dur: dur ?? step * 1.6, type, vol, at: i * step });
  });
}

// ---------------------------------------------------------------------------
// SFX — all original, synthesized, short & punchy
// ---------------------------------------------------------------------------

function sfxJump(): void {
  tone({ freq: 300, freq2: 640, dur: 0.14, type: 'square', vol: 0.16 });
}

function sfxStomp(): void {
  noise({ dur: 0.12, vol: 0.3, filterFreq: 900, filterEnd: 200 });
  tone({ freq: 170, freq2: 55, dur: 0.14, type: 'sine', vol: 0.4 });
}

function sfxCoin(): void {
  // two bright blips, original interval (P5 up)
  tone({ freq: mtof(88), dur: 0.07, type: 'triangle', vol: 0.22 });
  tone({ freq: mtof(95), dur: 0.16, type: 'triangle', vol: 0.2, at: 0.07 });
}

function sfxOneUp(): void {
  motif([84, 88, 91, 96], 0.09, 'sine', 0.22, 0.22);
  tone({ freq: mtof(96), dur: 0.35, type: 'triangle', vol: 0.14, at: 0.38 });
}

function sfxPowerupSpawn(): void {
  tone({ freq: 380, freq2: 1150, dur: 0.2, type: 'square', vol: 0.14 });
  tone({ freq: 570, freq2: 1725, dur: 0.2, type: 'square', vol: 0.08 });
}

function sfxPowerupCollect(kind: string): void {
  if (kind === 'berry') motif([79, 83, 86, 91], 0.07, 'square', 0.16, 0.16);
  else if (kind === 'ember') motif([76, 83, 88, 92], 0.06, 'sawtooth', 0.12, 0.14);
  else if (kind === 'comet') {
    motif([84, 88, 91, 96, 100], 0.05, 'triangle', 0.18, 0.14);
    noise({ dur: 0.4, vol: 0.06, filterFreq: 8000, type: 'highpass' });
  } else motif([81, 85, 88, 93], 0.07, 'square', 0.16, 0.16);
}

function sfxShoot(): void {
  tone({ freq: 950, freq2: 260, dur: 0.1, type: 'square', vol: 0.16 });
  noise({ dur: 0.05, vol: 0.08, filterFreq: 3000, type: 'highpass' });
}

function sfxBrickBreak(): void {
  noise({ dur: 0.22, vol: 0.3, filterFreq: 1400, filterEnd: 300, type: 'bandpass', q: 1.2 });
  tone({ freq: 130, freq2: 60, dur: 0.16, type: 'sine', vol: 0.32 });
}

function sfxKickShell(): void {
  tone({ freq: 420, freq2: 190, dur: 0.08, type: 'sine', vol: 0.3 });
  noise({ dur: 0.05, vol: 0.14, filterFreq: 2400, type: 'bandpass', q: 2 });
}

function sfxSpring(): void {
  tone({ freq: 210, freq2: 880, dur: 0.24, type: 'triangle', vol: 0.24, curve: 'lin' });
  tone({ freq: 315, freq2: 1320, dur: 0.24, type: 'sine', vol: 0.1, curve: 'lin' });
}

function sfxPipeEnter(): void {
  tone({ freq: 760, freq2: 140, dur: 0.38, type: 'sine', vol: 0.22 });
  tone({ freq: 1140, freq2: 210, dur: 0.38, type: 'sine', vol: 0.07 });
}

function sfxFlagGrab(height01: number): void {
  // rising arpeggio — taller grabs earn more notes and a higher top
  const count = 4 + Math.round(Math.max(0, Math.min(1, height01)) * 4);
  const base = [72, 76, 79, 84, 88, 91, 96, 100];
  motif(base.slice(0, count), 0.075, 'square', 0.16, 0.18);
}

function sfxBossDown(): void {
  noise({ dur: 0.7, vol: 0.4, filterFreq: 1600, filterEnd: 120 });
  tone({ freq: 220, freq2: 38, dur: 0.7, type: 'sine', vol: 0.4 });
  motif([64, 67, 72, 76], 0.09, 'square', 0.12, 0.2);
}

function sfxDamage(): void {
  tone({ freq: 520, freq2: 240, dur: 0.18, type: 'square', vol: 0.2 });
  noise({ dur: 0.08, vol: 0.1, filterFreq: 1800, type: 'bandpass' });
}

function sfxDeath(): void {
  motif([79, 76, 72, 67, 60], 0.14, 'square', 0.16, 0.22);
  tone({ freq: 90, freq2: 45, dur: 0.5, type: 'sine', vol: 0.2, at: 0.6 });
}

function sfxCheckpoint(): void {
  tone({ freq: mtof(81), dur: 0.1, type: 'triangle', vol: 0.22 });
  tone({ freq: mtof(88), dur: 0.24, type: 'triangle', vol: 0.2, at: 0.1 });
}

function sfxLevelComplete(): void {
  // original fanfare: bright rising call, held resolve
  motif([72, 76, 79, 84, 83, 84], 0.13, 'square', 0.18, 0.24);
  motif([48, 52, 55, 60, 59, 60], 0.13, 'triangle', 0.16, 0.3);
  tone({ freq: mtof(84), dur: 0.7, type: 'square', vol: 0.14, at: 0.8 });
  tone({ freq: mtof(72), dur: 0.7, type: 'triangle', vol: 0.14, at: 0.8 });
}

function sfxGameOver(): void {
  motif([67, 64, 62, 60, 55], 0.22, 'triangle', 0.2, 0.4);
  tone({ freq: mtof(48), dur: 1.1, type: 'sine', vol: 0.18, at: 1.05 });
}

function sfxPause(pausedNow: boolean): void {
  if (pausedNow) motif([76, 72], 0.09, 'square', 0.14, 0.12);
  else motif([72, 76], 0.09, 'square', 0.14, 0.12);
}

function sfxUiClick(): void {
  tone({ freq: 1250, dur: 0.045, type: 'square', vol: 0.12 });
}

function sfxUiHover(): void {
  tone({ freq: 1900, dur: 0.03, type: 'sine', vol: 0.06 });
}

function sfxScoreTick(): void {
  tone({ freq: 2100, dur: 0.025, type: 'square', vol: 0.06 });
}

function sfxTimerWarn(): void {
  tone({ freq: 1050, dur: 0.09, type: 'square', vol: 0.14 });
  tone({ freq: 1050, dur: 0.09, type: 'square', vol: 0.14, at: 0.16 });
}

export function playSfx(name: SfxName): void {
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume();
    return;
  }
  switch (name) {
    case 'jump': sfxJump(); break;
    case 'stomp': sfxStomp(); break;
    case 'coin': sfxCoin(); break;
    case 'oneUp': sfxOneUp(); break;
    case 'powerupSpawn': sfxPowerupSpawn(); break;
    case 'powerupCollect': sfxPowerupCollect('berry'); break;
    case 'shoot': sfxShoot(); break;
    case 'brickBreak': sfxBrickBreak(); break;
    case 'kickShell': sfxKickShell(); break;
    case 'spring': sfxSpring(); break;
    case 'pipeEnter': sfxPipeEnter(); break;
    case 'flagpole': sfxFlagGrab(0.75); break;
    case 'flagGrab': sfxFlagGrab(0.75); break;
    case 'bossDown': sfxBossDown(); break;
    case 'damage': sfxDamage(); break;
    case 'death': sfxDeath(); break;
    case 'checkpoint': sfxCheckpoint(); break;
    case 'levelComplete': sfxLevelComplete(); break;
    case 'gameOver': sfxGameOver(); break;
    case 'pause': sfxPause(true); break;
    case 'uiClick': sfxUiClick(); break;
    case 'uiHover': sfxUiHover(); break;
    case 'scoreTick': sfxScoreTick(); break;
    case 'timerWarn': sfxTimerWarn(); break;
  }
}

/** Auto-wire: every engine event plays its SFX. */
function wireEvents(): void {
  if (eventsWired) return;
  eventsWired = true;
  on('coin', () => sfxCoin());
  on('oneUp', () => sfxOneUp());
  on('stomp', () => sfxStomp());
  on('brickBreak', () => sfxBrickBreak());
  on('powerupSpawn', () => sfxPowerupSpawn());
  on('powerupCollect', ({ kind }) => sfxPowerupCollect(kind));
  on('shoot', () => sfxShoot());
  on('damage', () => sfxDamage());
  on('death', () => sfxDeath());
  on('checkpoint', () => sfxCheckpoint());
  on('flagGrab', ({ height01 }) => sfxFlagGrab(height01));
  on('bossDown', () => sfxBossDown());
  on('levelComplete', () => sfxLevelComplete());
  on('gameOver', () => sfxGameOver());
  on('pipeEnter', () => sfxPipeEnter());
  on('spring', () => sfxSpring());
  on('kickShell', () => sfxKickShell());
  on('uiClick', () => sfxUiClick());
  on('uiHover', () => sfxUiHover());
  on('pause', ({ paused: p }) => sfxPause(p));
}

// ---------------------------------------------------------------------------
// MUSIC — procedural chiptune loops, 100% original melodies.
// 16-step (2 bars of 16ths) lookahead scheduler; square/triangle/noise voices.
// ---------------------------------------------------------------------------

const _ = null;
type Step = number | null;

interface Song {
  bpm: number;
  /** 32 sixteenth-note steps (2 bars), midi note or null */
  lead: Step[];
  /** 16 eighth-note steps (2 bars) */
  bass: Step[];
  /** 16 eighth-note hat steps */
  hat?: boolean[];
  /** one chord (midi notes) per bar — [bar0, bar1] */
  pad?: number[][];
  leadWave?: OscillatorType;
  /** short plucky notes (desert) / long ringing notes (bells, pads) */
  noteLen?: number;
  /** quiet echo repeat 3 steps later (crystal / sky) */
  echo?: boolean;
}

// W1 Meadow — bouncy major (C), 124 bpm
const meadow: Song = {
  bpm: 124,
  lead: [
    72, _, 76, _, 79, _, 76, _, 81, _, 79, 76, 74, _, 77, _,
    76, _, 79, _, 84, _, 81, 79, 76, _, 74, _, 72, _, _, _,
  ],
  bass: [48, _, 52, _, 53, _, 57, _, 55, _, 59, _, 48, _, 52, _],
  hat: [false, false, true, false, false, false, true, false,
        false, false, true, false, false, false, true, false],
  pad: [[60, 64, 67], [55, 59, 62]],
  leadWave: 'square',
};

// W2 Desert — plucky Phrygian-ish (E), 112 bpm
const desert: Song = {
  bpm: 112,
  lead: [
    76, _, _, 77, _, 79, _, _, 81, _, 79, _, 77, _, 76, _,
    83, _, _, 81, _, 79, _, 77, 76, _, _, _, 71, _, _, _,
  ],
  bass: [40, _, 52, _, 40, _, 52, _, 41, _, 53, _, 40, _, 52, _],
  hat: [false, false, true, false, false, true, false, false,
        false, false, true, false, false, true, false, true],
  pad: [[52, 56, 59], [53, 57, 60]],
  leadWave: 'square',
  noteLen: 0.13,
};

// W3 Snow — bell lullaby (G), 112 bpm half-time feel
const snow: Song = {
  bpm: 112,
  lead: [
    86, _, _, _, 83, _, _, _, 84, _, _, _, 79, _, _, _,
    88, _, _, _, 86, _, _, _, 84, _, 83, _, 79, _, _, _,
  ],
  bass: [55, _, _, _, 52, _, _, _, 48, _, _, _, 50, _, _, _],
  hat: [false, false, false, false, true, false, false, false,
        false, false, false, false, true, false, false, false],
  pad: [[55, 59, 62], [60, 64, 67]],
  leadWave: 'sine',
  noteLen: 0.55,
  echo: true,
};

// W4 Sky — airy arpeggios (F), 126 bpm
const sky: Song = {
  bpm: 126,
  lead: [
    77, _, 81, _, 84, _, 89, _, 93, _, 89, _, 84, _, 81, _,
    79, _, 84, _, 88, _, 91, _, 86, _, 84, _, 81, _, _, _,
  ],
  bass: [53, _, 60, _, 57, _, 60, _, 50, _, 57, _, 53, _, 57, _],
  hat: [false, false, true, false, false, false, true, false,
        false, false, true, false, false, true, true, false],
  pad: [[65, 69, 72], [62, 65, 69]],
  leadWave: 'triangle',
  echo: true,
};

// W5 Jungle — marimba groove (D dorian), 120 bpm
const jungle: Song = {
  bpm: 120,
  lead: [
    74, _, _, 74, _, 77, _, _, 81, _, _, 79, _, 77, _, 74,
    _, 86, _, _, 84, _, 81, _, 79, _, 77, _, 74, _, _, _,
  ],
  bass: [50, _, 50, _, _, 48, _, 50, 45, _, _, 45, 48, _, 50, _],
  hat: [true, false, true, true, false, true, true, false,
        true, false, true, true, false, true, true, false],
  pad: [[62, 65, 69], [60, 64, 67]],
  leadWave: 'square',
  noteLen: 0.14,
};

// W6 Crystal — echoing pads (A minor add9), 112 bpm
const crystal: Song = {
  bpm: 112,
  lead: [
    81, _, _, _, _, _, 83, _, 84, _, _, _, _, _, _, _,
    88, _, _, _, _, _, 91, _, 93, _, _, _, _, _, _, _,
  ],
  bass: [45, _, _, _, _, _, _, _, 43, _, _, _, _, _, _, _],
  pad: [[57, 60, 64, 71], [55, 59, 62, 67]],
  leadWave: 'triangle',
  noteLen: 0.7,
  echo: true,
};

// W7 Volcano — driving minor (E), 132 bpm
const volcano: Song = {
  bpm: 132,
  lead: [
    76, _, 76, _, 79, _, 81, _, 83, _, 81, 79, 81, _, _, _,
    86, _, 86, _, 83, _, 79, _, 76, _, 79, _, 81, _, _, _,
  ],
  bass: [40, 40, _, 40, 40, _, 40, 40, 43, _, 43, _, 45, _, 47, _],
  hat: [true, false, true, false, true, false, true, false,
        true, false, true, false, true, false, true, true],
  pad: [[52, 55, 59], [47, 50, 53]],
  leadWave: 'square',
  noteLen: 0.16,
};

// W8 Fortress — dark march (D minor), 120 bpm
const fortress: Song = {
  bpm: 120,
  lead: [
    74, _, _, 74, 77, _, _, 77, 79, _, _, _, 81, _, 82, 81,
    86, _, _, _, 84, _, 81, _, 79, _, 77, _, 76, _, _, _,
  ],
  bass: [38, _, 38, _, 38, _, 38, _, 41, _, 41, _, 43, _, 44, _],
  hat: [false, false, false, false, true, false, false, false,
        false, false, false, false, true, false, true, false],
  pad: [[50, 53, 57], [49, 52, 56]],
  leadWave: 'square',
};

// Boss variation (castle X-4) — faster, tenser (E minor, chromatic sting)
const boss: Song = {
  bpm: 140,
  lead: [
    76, _, 79, _, 81, _, 83, _, 84, _, 83, 81, 83, _, _, _,
    88, _, 87, _, 86, _, 83, _, 81, _, 80, _, 79, _, _, _,
  ],
  bass: [40, _, 40, 40, _, 40, _, 40, 44, _, 44, 44, _, 45, _, _],
  hat: [true, true, false, true, true, true, false, true,
        true, true, false, true, true, true, true, false],
  pad: [[52, 55, 58], [51, 54, 58]],
  leadWave: 'square',
  noteLen: 0.15,
};

const SONGS: Record<string, Song> = {
  meadow, desert, snow, sky, jungle, crystal, volcano, fortress, boss,
};

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

let pendingTheme: string | null = null;
let currentKey: string | null = null;
let song: Song | null = null;
let schedTimer: number | null = null;
let step = 0;
let nextTime = 0;
let timerWarning = false;
let fading = false;
let musicToken = 0;

function stepDuration(): number {
  if (!song) return 0.1;
  const mult = timerWarning ? 1.3 : 1;
  return 60 / (song.bpm * mult) / 4; // sixteenth notes
}

function playLeadNote(midi: number, t: number, len: number, vol: number): void {
  if (!ctx || !musicBus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = song?.leadWave ?? 'square';
  osc.frequency.setValueAtTime(mtof(midi), t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0008, t + len);
  osc.connect(g);
  g.connect(musicBus);
  osc.start(t);
  osc.stop(t + len + 0.05);
}

function playBassNote(midi: number, t: number, len: number): void {
  if (!ctx || !musicBus) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(mtof(midi), t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t + Math.max(len, 0.12));
  osc.connect(g);
  g.connect(musicBus);
  osc.start(t);
  osc.stop(t + Math.max(len, 0.12) + 0.05);
}

function playHat(t: number): void {
  noise({ dur: 0.04, vol: 0.05, filterFreq: 7500, type: 'highpass', bus: musicBus, at: t - (ctx?.currentTime ?? 0) });
}

function playPad(chord: number[], t: number, barDur: number): void {
  if (!ctx || !musicBus) return;
  for (const midi of chord) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(mtof(midi), t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.05, t + barDur * 0.3);
    g.gain.linearRampToValueAtTime(0.0001, t + barDur * 1.05);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(t);
    osc.stop(t + barDur * 1.1);
  }
}

function scheduleStep(s: number, t: number): void {
  if (!song) return;
  const sd = stepDuration();
  const barDur = sd * 16;
  const lead = song.lead[s % 32];
  if (lead !== null && lead !== undefined) {
    const len = song.noteLen ?? Math.min(0.3, sd * 3);
    playLeadNote(lead, t, len, 0.14);
    if (song.echo) playLeadNote(lead, t + sd * 3, len * 0.8, 0.05);
  }
  if (s % 2 === 0) {
    const b = song.bass[(s / 2) % 16];
    if (b !== null && b !== undefined) playBassNote(b, t, sd * 3.2);
    if (song.hat?.[(s / 2) % 16]) playHat(t);
  }
  if (song.pad && s % 16 === 0) playPad(song.pad[(s / 16) % 2], t, barDur);
}

function schedulerTick(): void {
  if (!ctx || !song || fading) return;
  while (nextTime < ctx.currentTime + 0.18) {
    scheduleStep(step, nextTime);
    nextTime += stepDuration();
    step = (step + 1) % 32;
  }
}

function resolveSongKey(theme: string): string {
  // castle levels (X-4) get the boss variation — faster & tenser
  const { run } = useGameStore.getState();
  if (run.level === 4) return 'boss';
  return theme in SONGS ? theme : 'meadow';
}

export function startMusic(theme: string): void {
  if (!ctx) {
    pendingTheme = theme; // will start once the first gesture unlocks audio
    return;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  const key = resolveSongKey(theme);
  if (key === currentKey && song) return;

  const token = ++musicToken;
  const begin = () => {
    if (token !== musicToken) return; // stopped or superseded during the fade
    fading = false;
    currentKey = key;
    song = SONGS[key];
    step = 0;
    nextTime = (ctx?.currentTime ?? 0) + 0.06;
    if (schedTimer === null) schedTimer = window.setInterval(schedulerTick, 40);
    applyGains();
  };

  if (song && musicBus && ctx) {
    // crossfade: dip the music bus, swap the loop, bring it back
    fading = true;
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    window.setTimeout(begin, 420);
  } else {
    begin();
  }
}

export function stopMusic(): void {
  musicToken += 1;
  fading = false;
  pendingTheme = null;
  currentKey = null;
  song = null;
  if (schedTimer !== null) {
    window.clearInterval(schedTimer);
    schedTimer = null;
  }
}

export function setVolumes(v: { master: number; music: number; sfx: number }): void {
  vols = { ...v };
  applyGains();
}

export function setMuted(m: boolean): void {
  muted = m;
  applyGains();
}
