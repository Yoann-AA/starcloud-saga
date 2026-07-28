// How to Play (/guide) — controls keyboard-tester, looping move demos,
// power-ups, blocks & items, bestiary, scoring & 3-star rules.
import { memo, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import {
  Coins,
  Flag,
  Flame,
  Gamepad2,
  Heart,
  HeartPulse,
  Keyboard,
  Play,
  Skull,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';

const EASE_OVERSHOOT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

const SECTION_NAV = [
  { id: 'controls', label: 'Controls' },
  { id: 'moves', label: 'Moves' },
  { id: 'powerups', label: 'Power-Ups' },
  { id: 'blocks', label: 'Blocks & Items' },
  { id: 'bestiary', label: 'Bestiary' },
  { id: 'scoring', label: 'Scoring' },
];

/* ---------------------------------------------------------------- controls */

interface KeyDef {
  code: string | string[];
  label: string;
  wide?: boolean;
}

interface ControlRow {
  action: string;
  note: string;
  keys: KeyDef[];
}

const CONTROL_ROWS: ControlRow[] = [
  {
    action: 'Move',
    note: 'Hold to build speed',
    keys: [
      { code: 'ArrowLeft', label: '←' },
      { code: 'ArrowRight', label: '→' },
      { code: 'KeyA', label: 'A' },
      { code: 'KeyD', label: 'D' },
    ],
  },
  {
    action: 'Jump',
    note: 'Hold = higher arc',
    keys: [
      { code: 'Space', label: 'Space', wide: true },
      { code: 'KeyZ', label: 'Z' },
    ],
  },
  {
    action: 'Run / Fire ember',
    note: 'Run always; fire as Ember Pip',
    keys: [
      { code: 'KeyX', label: 'X' },
      { code: ['ShiftLeft', 'ShiftRight'], label: 'Shift', wide: true },
    ],
  },
  {
    action: 'Enter pipe',
    note: 'While standing on a pipe',
    keys: [
      { code: 'ArrowDown', label: '↓' },
      { code: 'KeyS', label: 'S' },
    ],
  },
  {
    action: 'Pause',
    note: 'Opens the pause menu',
    keys: [
      { code: 'Escape', label: 'Esc' },
      { code: 'KeyP', label: 'P' },
    ],
  },
  {
    action: 'Mute',
    note: 'Toggles all audio',
    keys: [{ code: 'KeyM', label: 'M' }],
  },
];

function KeyCap({ def, pressed }: { def: KeyDef; pressed: boolean }) {
  return (
    <span
      className={`inline-flex h-11 items-center justify-center rounded-[10px] border-[3px] border-[#1B1233] px-3 font-display text-sm font-extrabold transition-all duration-100 ${
        def.wide ? 'min-w-[84px]' : 'min-w-[44px]'
      } ${
        pressed
          ? 'translate-y-[3px] bg-[#FFC93C] text-[#1B1233] shadow-[0_1px_0_rgba(27,18,51,0.35)]'
          : 'bg-[#FFF6E8] text-[#1B1233] shadow-[0_4px_0_rgba(27,18,51,0.35)]'
      }`}
      style={pressed ? { boxShadow: '0 1px 0 rgba(27,18,51,0.35), 0 0 14px rgba(255,201,60,0.8)' } : undefined}
    >
      {def.label}
    </span>
  );
}

function ControlsSection() {
  const [pressedCodes, setPressedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // don't steal keys while typing in inputs (none here, but future-proof)
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
      setPressedCodes((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      setPressedCodes((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };
    const clear = () => setPressedCodes(new Set());
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const isPressed = (def: KeyDef) =>
    Array.isArray(def.code) ? def.code.some((c) => pressedCodes.has(c)) : pressedCodes.has(def.code);

  return (
    <section id="controls" className="scroll-mt-32">
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
        >
          <img
            src="/guide-controls.png"
            alt="Illustration of the keyboard controls and touch layout"
            className="w-full rounded-[20px] border-[3px] border-[#1B1233] shadow-[0_8px_0_rgba(27,18,51,0.35)]"
            loading="lazy"
          />
          {/* mobile touch card */}
          <div className="story-panel-night mt-6 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] text-[#4FC4FF]">
              <Gamepad2 size={16} /> On touch screens
            </p>
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[14px] border-[3px] border-[#1B1233] bg-[#241A45] p-4">
              <div className="flex gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#33245E] font-display text-lg font-extrabold text-[#FFF6E8]">←</span>
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#33245E] font-display text-lg font-extrabold text-[#FFF6E8]">→</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#FF6B35] text-[10px] font-extrabold uppercase text-[#1B1233]">Run</span>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#FFC93C] text-[10px] font-extrabold uppercase text-[#1B1233]">Jump</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-[#FFF6E8]/70">
              Left pad to move, big gold button to jump, orange to run &amp; fire. The game auto-pauses if you
              switch tabs.
            </p>
          </div>
        </motion.div>

        <div className="story-panel p-6">
          <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-[0.1em] text-[#1B1233]/60">
            <Keyboard size={16} /> Live keyboard tester — press your keys!
          </p>
          <div className="mt-5 space-y-4">
            {CONTROL_ROWS.map((row, i) => (
              <motion.div
                key={row.action}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: EASE_OVERSHOOT }}
                className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-[#1B1233]/15 pb-4 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-display text-lg font-extrabold text-[#1B1233]">{row.action}</p>
                  <p className="text-xs font-bold text-[#1B1233]/55">{row.note}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {row.keys.map((k, ki) => (
                    <span key={Array.isArray(k.code) ? k.code[0] : k.code} className="flex items-center gap-2">
                      {ki > 0 && <span className="text-xs font-extrabold text-[#1B1233]/40">/</span>}
                      <KeyCap def={k} pressed={isPressed(k)} />
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------- moves */

interface MoveDemo {
  title: string;
  blurb: string;
  why: string;
  demoClass: string;
  stage: React.ReactNode;
}

function DemoStage({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="demo-stage relative h-36 overflow-hidden rounded-[14px] border-[3px] border-[#1B1233] bg-[#241A45]" aria-label={label}>
      {children}
    </div>
  );
}

const MOVE_DEMOS: MoveDemo[] = [
  {
    title: 'Variable Jump',
    blurb: 'Tap for a hop. Hold for a soaring arc.',
    why: 'Feather the jump button to thread low ceilings; hold it to clear tall walls. One button, two jumps.',
    demoClass: 'demo-varjump',
    stage: (
      <DemoStage label="Variable jump demo">
        <svg className="absolute bottom-6 left-4 h-20 w-[calc(100%-2rem)]" viewBox="0 0 260 80" preserveAspectRatio="none" aria-hidden>
          <path d="M0 70 Q40 10 80 70" fill="none" stroke="#4FC4FF" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
          <path d="M120 70 Q180 -30 240 70" fill="none" stroke="#FFC93C" strokeWidth="2" strokeDasharray="4 4" opacity="0.8" />
        </svg>
        <span className="demo-pip pip-short" />
        <span className="demo-pip pip-tall" />
        <span className="demo-ground" />
      </DemoStage>
    ),
  },
  {
    title: 'Coyote Time',
    blurb: 'Run off a ledge? You still get a heartbeat of grace.',
    why: 'For ~0.1s after leaving a ledge, jump still works. Trust it — those last-pixel leaps are legal.',
    demoClass: 'demo-coyote',
    stage: (
      <DemoStage label="Coyote time demo">
        <span className="coyote-ledge coyote-ledge-l" />
        <span className="coyote-ledge coyote-ledge-r" />
        <span className="demo-pip pip-coyote" />
        <span className="coyote-ghost" />
        <span className="coyote-label">grace window</span>
      </DemoStage>
    ),
  },
  {
    title: 'Jump Buffering',
    blurb: 'Pressed early? Pip jumps the instant he lands.',
    why: 'A jump pressed ~0.12s before landing is remembered. Chain perfect hops without ever skidding.',
    demoClass: 'demo-buffer',
    stage: (
      <DemoStage label="Jump buffering demo">
        <span className="demo-ground" />
        <span className="demo-pip pip-buffer" />
        <span className="buffer-key">SPACE</span>
        <span className="buffer-flash" />
      </DemoStage>
    ),
  },
  {
    title: 'Stomp & Kick',
    blurb: 'Bounce off baddies. Turtleaf shells become bowling balls.',
    why: 'Stomping bounces you higher if you hold jump. A kicked shell clears crowds — and ricochets, so duck.',
    demoClass: 'demo-stomp',
    stage: (
      <DemoStage label="Stomp and kick demo">
        <span className="demo-ground" />
        <span className="demo-pip pip-stomp" />
        <span className="stomp-enemy" />
        <span className="stomp-shell" />
        <span className="stomp-pin stomp-pin-1" />
        <span className="stomp-pin stomp-pin-2" />
      </DemoStage>
    ),
  },
];

const MoveCard = memo(function MoveCard({ demo }: { demo: MoveDemo }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, ease: EASE_OVERSHOOT }}
      className="group story-panel-night relative p-5"
      data-paused={!inView}
    >
      <div className="demo-holder">{demo.stage}</div>
      <h3 className="mt-4 font-display text-xl font-extrabold text-[#FFF6E8]">{demo.title}</h3>
      <p className="mt-1 text-sm font-semibold text-[#FFF6E8]/75">{demo.blurb}</p>
      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-[12px] border-[3px] border-[#1B1233] bg-[#FFC93C] p-3 text-xs font-bold text-[#1B1233] opacity-0 shadow-[0_4px_0_rgba(27,18,51,0.35)] transition-opacity duration-200 group-hover:opacity-100">
        <span className="font-extrabold uppercase tracking-[0.08em]">Why it matters — </span>
        {demo.why}
      </div>
    </motion.div>
  );
});

/* ---------------------------------------------------------------- power-ups */

const POWERUPS = [
  {
    name: 'Star-Berry',
    icon: Heart,
    color: '#FF5D7E',
    effects: ['Grow tall — reach higher blocks', 'Smash brick blocks with a bump', 'Take one extra hit'],
    found: ['W1', 'W2', 'W5'],
  },
  {
    name: 'Ember Flower',
    icon: Flame,
    color: '#FF6B35',
    effects: ['Hurl bouncing embers with X', 'Lights dark caves', 'Three hits fells most castle bosses'],
    found: ['W3', 'W6', 'W7'],
  },
  {
    name: 'Comet Star',
    icon: Sparkles,
    color: '#FFC93C',
    effects: ['10 seconds of rainbow invincibility', 'Defeats foes on contact', 'Pits still win — watch your step'],
    found: ['W4', 'W6', 'W8'],
  },
  {
    name: '1-Up Heart',
    icon: HeartPulse,
    color: '#FF5D7E',
    effects: ['An extra life, on the house', 'Hidden where you least think to look', 'Also granted at 100 coins'],
    found: ['All worlds'],
  },
];

/* ------------------------------------------------------------ blocks/items */

const BLOCK_ITEMS = [
  { glyph: '?', name: 'Question Block', line: 'Bump from below for a coin — or something better.', note: 'bump from below', color: '#FFC93C' },
  { glyph: '▦', name: 'Brick Block', line: 'Bumps when small; shatters once you have grown.', note: 'break when grown', color: '#E07B3F' },
  { glyph: '⌐', name: 'Warp Pipe', line: 'Press down on top to slip inside. Some are… occupied.', note: 'down to enter', color: '#59D99C' },
  { glyph: '⌃', name: 'Spring', line: 'Launches Pip skyward. Hold jump for extra altitude.', note: 'bounce to fly', color: '#B7E34C' },
  { glyph: '●', name: 'Coin', line: 'Worth 100 points. A hundred of them buys a life.', note: '100 = 1-up', color: '#FFC93C' },
  { glyph: '⚑', name: 'Checkpoint Flag', line: 'Raises your colors mid-level. Respawn here on a fall.', note: 'touch to claim', color: '#4FC4FF' },
  { glyph: '⚐', name: 'Goal Flagpole', line: 'Ends the level. Grab high for bonus — the very top is a 1-up.', note: 'grab high', color: '#9B7BFF' },
];

/* ---------------------------------------------------------------- bestiary */

const BESTIARY = [
  { name: 'Waddler', behavior: 'Walks. That is genuinely it.', counter: 'Stomp it.', danger: 1, color: '#8FE388' },
  { name: 'Hopper', behavior: 'Jumps on a rhythm you can learn.', counter: 'Time it, then stomp.', danger: 2, color: '#9ADCF5' },
  { name: 'Turtleaf', behavior: 'Stomp it and it retreats into a leaf-shell.', counter: 'Kick the shell for crowd control. Watch the ricochet.', danger: 2, color: '#2FA36B' },
  { name: 'Spikepod', behavior: 'Untouchable from above — all spikes, no mercy.', counter: 'Ember it from range, or simply avoid.', danger: 3, color: '#9B7BFF' },
  { name: 'Flapper', behavior: 'Flies a lazy sine wave across the sky.', counter: 'Stomp it at the bottom of its dip.', danger: 3, color: '#7FB0FF' },
  { name: 'Burrower', behavior: 'Pops out of the ground right under your feet.', counter: 'Keep moving. Never linger.', danger: 4, color: '#F2B84B' },
];

/* ----------------------------------------------------------------- scoring */

const SCORE_ROWS = [
  { what: 'Coin', pts: '100' },
  { what: 'Stomp', pts: '200' },
  { what: 'Chain stomp (no landing)', pts: '×2 each' },
  { what: 'Brick smashed', pts: '50' },
  { what: 'Flagpole height', pts: '100 – 5,000' },
  { what: 'Time bonus', pts: '50 / sec left' },
];

/* --------------------------------------------------------------------- page */

export default function Guide() {
  return (
    <div className="relative">
      {/* sticky quick-jump nav */}
      <div className="sticky top-[72px] z-40 border-b-[3px] border-[#1B1233] bg-[#241A45]/90 backdrop-blur-[8px]">
        <div className="mx-auto flex max-w-[1200px] gap-2 overflow-x-auto px-4 py-2.5">
          {SECTION_NAV.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="star-cursor shrink-0 rounded-full border-[3px] border-[#1B1233] bg-[#33245E] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-[#FFF6E8]/85 transition-all hover:bg-[#FFC93C] hover:text-[#1B1233]"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] space-y-24 px-4 py-16">
        {/* header */}
        <header className="text-center">
          <motion.h1
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE_OVERSHOOT }}
            className="font-display text-5xl font-extrabold text-[#FFF6E8] sm:text-6xl"
          >
            The Player's <span className="text-[#FFC93C]">Guide</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mx-auto mt-4 max-w-lg text-lg font-semibold text-[#FFF6E8]/70"
          >
            Everything you need to rescue the Starcloud.
          </motion.p>
        </header>

        <ControlsSection />

        {/* moves */}
        <section id="moves" className="scroll-mt-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="font-display text-4xl font-extrabold text-[#FFF6E8]">Signature moves</h2>
              <p className="mt-2 max-w-lg text-base font-semibold text-[#FFF6E8]/70">
                Four little kindnesses hidden in the jump code. Master them and the Starcloud is as good as saved.
                Hover a card to pause the loop.
              </p>
            </div>
            <img src="/pip-portrait.png" alt="Pip, the star-sprite hero" className="bob-sine h-28 w-28 object-contain" loading="lazy" />
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {MOVE_DEMOS.map((d) => (
              <MoveCard key={d.title} demo={d} />
            ))}
          </div>
        </section>

        {/* power-ups */}
        <section id="powerups" className="scroll-mt-32 -mx-4 rounded-[24px] border-y-[3px] border-[#1B1233] bg-[#33245E] px-4 py-14 sm:mx-0 sm:border-[3px] sm:px-8">
          <h2 className="text-center font-display text-4xl font-extrabold text-[#FFF6E8]">Power-ups</h2>
          <motion.img
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            src="/powerups.png"
            alt="The four power-ups: Star-Berry, Ember Flower, Comet Star and 1-Up Heart"
            className="mx-auto mt-8 w-full max-w-3xl rounded-[20px] border-[3px] border-[#1B1233] shadow-[0_8px_0_rgba(27,18,51,0.35)]"
            loading="lazy"
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {POWERUPS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.45, ease: EASE_OVERSHOOT }}
                className="group rounded-[20px] border-[3px] border-[#1B1233] bg-[#241A45] p-5 shadow-[0_6px_0_rgba(27,18,51,0.35)] transition-all duration-200 ease-overshoot hover:-translate-y-1.5"
                style={{ ['--pu' as string]: p.color }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 8px 0 rgba(27,18,51,0.35), 0 0 18px ${p.color}66`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 6px 0 rgba(27,18,51,0.35)')}
              >
                <span
                  className="bob-sine flex h-14 w-14 items-center justify-center rounded-[14px] border-[3px] border-[#1B1233]"
                  style={{ background: p.color, animationDelay: `${i * 0.3}s` }}
                >
                  <p.icon size={26} className="text-[#1B1233]" fill={p.name === 'Comet Star' ? '#1B1233' : 'none'} />
                </span>
                <h3 className="mt-3 font-display text-xl font-extrabold text-[#FFF6E8]">{p.name}</h3>
                <ul className="mt-2 space-y-1.5">
                  {p.effects.map((ef) => (
                    <li key={ef} className="flex gap-2 text-sm font-semibold text-[#FFF6E8]/75">
                      <Star size={12} className="mt-1 shrink-0" style={{ color: p.color }} fill={p.color} />
                      {ef}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.found.map((f) => (
                    <span key={f} className="rounded-full border-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ borderColor: p.color, color: p.color }}>
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* blocks & items */}
        <section id="blocks" className="scroll-mt-32">
          <div className="story-panel p-6 sm:p-8">
            <h2 className="font-display text-4xl font-extrabold text-[#1B1233]">Blocks &amp; items</h2>
            <div className="mt-6 grid gap-x-10 lg:grid-cols-[1fr_260px]">
              <div className="space-y-3">
                {BLOCK_ITEMS.map((b, i) => (
                  <motion.div
                    key={b.name}
                    initial={{ opacity: 0, x: -32 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ delay: i * 0.06, duration: 0.4, ease: EASE_OVERSHOOT }}
                    className="group flex items-center gap-4"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border-[3px] border-[#1B1233] font-display text-xl font-extrabold text-[#1B1233] shadow-[0_3px_0_rgba(27,18,51,0.35)] transition-transform duration-300 group-hover:rotate-[8deg]"
                      style={{ background: b.color }}
                    >
                      {b.glyph}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg font-extrabold leading-tight text-[#1B1233]">{b.name}</p>
                      <p className="text-sm font-semibold text-[#1B1233]/65">{b.line}</p>
                    </div>
                    <span className="hidden shrink-0 rounded-full border-2 border-[#1B1233]/25 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#1B1233]/60 sm:inline">
                      {b.note}
                    </span>
                  </motion.div>
                ))}
              </div>
              <motion.aside
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: EASE_OVERSHOOT }}
                className="mt-8 flex flex-col items-center justify-center rounded-[16px] border-[3px] border-[#1B1233] bg-[#FFC93C] p-6 text-center shadow-[0_6px_0_rgba(27,18,51,0.35)] lg:mt-0"
              >
                <Coins size={36} className="text-[#1B1233]" />
                <p className="mt-3 font-display text-3xl font-extrabold leading-none text-[#1B1233]">100 coins</p>
                <p className="font-display text-3xl font-extrabold leading-none text-[#1B1233]">= 1-up</p>
                <p className="mt-2 text-sm font-bold text-[#1B1233]/70">
                  Your coin total carries across levels. Greed is a survival strategy.
                </p>
              </motion.aside>
            </div>
          </div>
        </section>

        {/* bestiary */}
        <section id="bestiary" className="scroll-mt-32">
          <h2 className="font-display text-4xl font-extrabold text-[#FFF6E8]">Field bestiary</h2>
          <p className="mt-2 max-w-lg text-base font-semibold text-[#FFF6E8]/70">
            Six regulars you will meet again and again — each with per-world reskins. Danger rated in skulls.
          </p>
          <motion.img
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            src="/bestiary.png"
            alt="Lineup of the six original enemies"
            className="mt-8 w-full rounded-[20px] border-[3px] border-[#1B1233] shadow-[0_8px_0_rgba(27,18,51,0.35)]"
            loading="lazy"
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BESTIARY.map((e, i) => (
              <motion.div
                key={e.name}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: (i % 3) * 0.08, duration: 0.45, ease: EASE_OVERSHOOT }}
                className="story-panel-night p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full border-[3px] border-[#1B1233]" style={{ background: e.color }} aria-hidden />
                    <h3 className="font-display text-xl font-extrabold text-[#FFF6E8]">{e.name}</h3>
                  </div>
                  <div className="flex gap-0.5" aria-label={`Danger ${e.danger} of 5`}>
                    {Array.from({ length: 5 }, (_, s) => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + s * 0.07, duration: 0.3, ease: EASE_OVERSHOOT }}
                      >
                        <Skull
                          size={14}
                          className={s < e.danger ? 'text-[#FF4757]' : 'text-[#FFF6E8]/20'}
                          fill={s < e.danger ? '#FF4757' : 'none'}
                        />
                      </motion.span>
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-[#FFF6E8]/75">{e.behavior}</p>
                <p className="mt-2 rounded-[10px] border-2 border-dashed border-[#FFC93C]/50 px-3 py-1.5 text-xs font-bold text-[#FFC93C]">
                  Counter: {e.counter}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* scoring & stars */}
        <section id="scoring" className="scroll-mt-32">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="story-panel p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-display text-3xl font-extrabold text-[#1B1233]">
                <Trophy size={28} /> Scoring
              </h2>
              <table className="mt-5 w-full">
                <tbody>
                  {SCORE_ROWS.map((r, i) => (
                    <motion.tr
                      key={r.what}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-30px' }}
                      transition={{ delay: i * 0.06, duration: 0.35 }}
                      className="border-b-2 border-dashed border-[#1B1233]/15 last:border-0"
                    >
                      <td className="py-2.5 text-sm font-bold text-[#1B1233]/80">{r.what}</td>
                      <td className="py-2.5 text-right font-display text-lg font-extrabold uppercase tracking-[0.06em] text-[#1B1233]">
                        {r.pts}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="story-panel-night flex flex-col p-6 sm:p-8">
              <h2 className="flex items-center gap-3 font-display text-3xl font-extrabold text-[#FFF6E8]">
                <Flag size={26} className="text-[#FFC93C]" /> The 3-star rules
              </h2>
              <ul className="mt-5 space-y-3">
                {[
                  'Finish the level — any way you can.',
                  'Meet the coin threshold hidden in the stage.',
                  'Beat the par time on the level select tile.',
                ].map((rule, i) => (
                  <motion.li
                    key={rule}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4, ease: EASE_OVERSHOOT }}
                    className="flex items-center gap-3 text-sm font-bold text-[#FFF6E8]/85"
                  >
                    <motion.span
                      initial={{ scale: 0, rotate: -30 }}
                      whileInView={{ scale: 1, rotate: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.15, duration: 0.4, ease: EASE_OVERSHOOT }}
                    >
                      <Star size={22} className="text-[#FFC93C]" fill="#FFC93C" />
                    </motion.span>
                    {rule}
                  </motion.li>
                ))}
              </ul>
              <p className="mt-4 text-sm font-semibold text-[#FFF6E8]/65">
                Stars are tracked per level — 96 across the whole saga. The map keeps count.
              </p>
              <Link to="/game" className="btn-story btn-primary star-cursor glow-pulse mt-6 self-start">
                <Play size={16} fill="#1B1233" /> Put it into practice — Play 1-1
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* move-demo keyframes (scoped to this page) */}
      <style>{`
        .demo-stage * { animation-play-state: running; }
        [data-paused="true"] .demo-stage *, .demo-stage:hover * { animation-play-state: paused !important; }

        .demo-pip {
          position: absolute; width: 18px; height: 18px; border-radius: 50%;
          background: #FFF6E8; border: 3px solid #1B1233; bottom: 10px;
        }
        .demo-pip::after {
          content: ''; position: absolute; inset: 3px; border-radius: 50%; background: #FFC93C;
        }
        .demo-ground {
          position: absolute; left: 0; right: 0; bottom: 0; height: 10px;
          background: #59D99C; border-top: 3px solid #1B1233;
        }

        /* variable jump */
        .pip-short { left: 12%; animation: vj-short 1.2s cubic-bezier(0.3,0,0.7,1) infinite; }
        .pip-tall  { left: 56%; animation: vj-tall 1.6s cubic-bezier(0.3,0,0.7,1) infinite; }
        @keyframes vj-short {
          0%,100% { transform: translateY(0); } 45% { transform: translateY(-34px); }
        }
        @keyframes vj-tall {
          0%,100% { transform: translateY(0); } 45% { transform: translateY(-84px); }
        }

        /* coyote time */
        .coyote-ledge { position: absolute; bottom: 0; height: 10px; background: #8FE388; border-top: 3px solid #1B1233; }
        .coyote-ledge-l { left: 0; width: 46%; }
        .coyote-ledge-r { right: 0; width: 24%; }
        .pip-coyote { left: 0; animation: coyote-run 3s linear infinite; }
        @keyframes coyote-run {
          0%   { transform: translate(6px, 0); }
          38%  { transform: translate(42cqw, 0); }
          52%  { transform: translate(56cqw, 2px); }
          66%  { transform: translate(64cqw, -30px); }
          80%  { transform: translate(74cqw, 0); }
          100% { transform: translate(74cqw, 0); }
        }
        .demo-stage { container-type: inline-size; }
        .coyote-ghost {
          position: absolute; bottom: 12px; left: 46%; width: 18px; height: 18px; border-radius: 50%;
          border: 2px dashed #4FC4FF; opacity: 0; animation: coyote-shimmer 3s linear infinite;
        }
        @keyframes coyote-shimmer {
          0%, 40% { opacity: 0; transform: translateX(0); }
          46% { opacity: 0.9; }
          52% { opacity: 0.9; transform: translateX(10cqw); }
          60%, 100% { opacity: 0; transform: translateX(10cqw); }
        }
        .coyote-label {
          position: absolute; bottom: 40px; left: 46%; font-size: 9px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.08em; color: #4FC4FF; opacity: 0;
          animation: coyote-tag 3s linear infinite;
        }
        @keyframes coyote-tag { 0%, 42% { opacity: 0; } 48%, 60% { opacity: 1; } 66%, 100% { opacity: 0; } }

        /* jump buffering */
        .pip-buffer { left: 44%; animation: buffer-hop 2.4s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes buffer-hop {
          0%   { transform: translateY(-90px); }
          35%  { transform: translateY(0); }
          40%  { transform: translateY(0); }
          62%  { transform: translateY(-56px); }
          85%, 100% { transform: translateY(0); }
        }
        .buffer-key {
          position: absolute; top: 10px; left: 50%; transform: translateX(-50%);
          padding: 2px 10px; border-radius: 8px; border: 3px solid #1B1233;
          background: #FFF6E8; color: #1B1233; font-family: 'Baloo 2', sans-serif;
          font-size: 11px; font-weight: 800; animation: buffer-press 2.4s linear infinite;
        }
        @keyframes buffer-press {
          0%, 26% { background: #FFF6E8; transform: translateX(-50%) translateY(0); }
          30%, 40% { background: #FFC93C; transform: translateX(-50%) translateY(3px); box-shadow: 0 0 12px rgba(255,201,60,0.9); }
          46%, 100% { background: #FFF6E8; transform: translateX(-50%) translateY(0); }
        }
        .buffer-flash {
          position: absolute; bottom: 10px; left: calc(44% - 8px); width: 34px; height: 6px;
          border-radius: 999px; background: #FFC93C; opacity: 0; animation: buffer-ring 2.4s linear infinite;
        }
        @keyframes buffer-ring {
          0%, 38% { opacity: 0; transform: scale(0.4); }
          42% { opacity: 0.9; transform: scale(1.2); }
          50%, 100% { opacity: 0; transform: scale(1.6); }
        }

        /* stomp & kick */
        .pip-stomp { left: 8%; animation: stomp-arc 3s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes stomp-arc {
          0%   { transform: translate(0, -60px); }
          25%  { transform: translate(16cqw, 0); }
          32%  { transform: translate(18cqw, 0); }
          45%  { transform: translate(26cqw, -40px); }
          62%, 100% { transform: translate(34cqw, 0); }
        }

        .stomp-enemy {
          position: absolute; bottom: 10px; left: calc(8% + 16cqw); width: 20px; height: 16px;
          border-radius: 8px 8px 3px 3px; background: #8FE388; border: 3px solid #1B1233;
          transform-origin: bottom; animation: enemy-squash 3s linear infinite;
        }
        @keyframes enemy-squash {
          0%, 24% { transform: scaleY(1); opacity: 1; }
          30% { transform: scaleY(0.25); opacity: 1; }
          36%, 100% { transform: scaleY(0.25); opacity: 0; }
        }
        .stomp-shell {
          position: absolute; bottom: 10px; left: calc(8% + 16cqw); width: 18px; height: 12px;
          border-radius: 9px 9px 3px 3px; background: #2FA36B; border: 3px solid #1B1233;
          opacity: 0; animation: shell-slide 3s linear infinite;
        }
        @keyframes shell-slide {
          0%, 34% { opacity: 0; transform: translateX(0); }
          38% { opacity: 1; transform: translateX(0); }
          70%, 100% { opacity: 1; transform: translateX(44cqw); }
        }
        .stomp-pin {
          position: absolute; bottom: 10px; width: 12px; height: 12px; border-radius: 50%;
          background: #FF5D7E; border: 3px solid #1B1233;
        }
        .stomp-pin-1 { left: calc(8% + 44cqw); animation: pin-fall-a 3s linear infinite; }
        .stomp-pin-2 { left: calc(8% + 54cqw); animation: pin-fall-b 3s linear infinite; }
        @keyframes pin-fall-a {
          0%, 55% { transform: translateY(0) rotate(0); opacity: 1; }
          62% { transform: translateY(-14px) rotate(40deg); opacity: 1; }
          70%, 100% { transform: translateY(6px) rotate(90deg); opacity: 0; }
        }
        @keyframes pin-fall-b {
          0%, 62% { transform: translateY(0) rotate(0); opacity: 1; }
          69% { transform: translateY(-14px) rotate(-40deg); opacity: 1; }
          77%, 100% { transform: translateY(6px) rotate(-90deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
