import { Suspense, lazy, useRef } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Play, Map as MapIcon, Star, Gamepad2, Sparkles, Castle, Lock } from 'lucide-react';
import { useGameStore } from '../game/state/store';
import { FIRST_LEVEL_ID } from '../game/levels';

const MiniDiorama = lazy(() => import('../components/MiniDiorama'));

const OVERSHOOT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

const WORLDS = [
  { id: 1, name: 'Meadow', color: '#59D99C', img: '/world-w1.png', flavor: 'Rolling green hills and forgiving jumps.' },
  { id: 2, name: 'Desert', color: '#F2B84B', img: '/world-w2.png', flavor: 'Sun-baked dunes and sleepy ruins.' },
  { id: 3, name: 'Snow', color: '#9ADCF5', img: '/world-w3.png', flavor: 'Crisp ice, quiet pines, slippery footing.' },
  { id: 4, name: 'Sky', color: '#7FB0FF', img: '/world-w4.png', flavor: 'Cloud islands drifting over forever.' },
  { id: 5, name: 'Jungle', color: '#2FA36B', img: '/world-w5.png', flavor: 'Dense canopy, vines, and hidden blocks.' },
  { id: 6, name: 'Crystal', color: '#9B7BFF', img: '/world-w6.png', flavor: 'Glowing caves humming with starlight.' },
  { id: 7, name: 'Volcano', color: '#FF6B35', img: '/world-w7.png', flavor: 'Lava rivers and crumbling basalt.' },
  { id: 8, name: 'Shadow Fortress', color: '#5B3FD4', img: '/world-w8.png', flavor: 'The storm at the end of the sky.' },
];

const STEPS = [
  { n: 1, title: 'Run & jump', body: 'Hold to sprint, tap for hops, hold for floaty highs.' },
  { n: 2, title: 'Stomp & kick', body: 'Bop Waddlers, kick Turtleaf shells into crowds.' },
  { n: 3, title: 'Bump blocks', body: 'Coins, berries, and secrets hide in ? blocks.' },
  { n: 4, title: 'Grab the flag', body: 'The higher you catch it, the bigger the bonus.' },
];

function StarDivider() {
  return (
    <div className="my-4 flex items-center justify-center gap-3" aria-hidden>
      <span className="h-[3px] w-16 rounded-full bg-[#FFC93C]/50" />
      <img src="/logo-star.svg" alt="" className="h-6 w-6" />
      <span className="h-[3px] w-16 rounded-full bg-[#FFC93C]/50" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Hero
// ---------------------------------------------------------------------------

function HeroTitle() {
  const word = 'STARCLOUD'.split('');
  return (
    <h1 className="font-display leading-none">
      <span className="sr-only">STARCLOUD SAGA</span>
      <span aria-hidden className="block text-[15vw] font-extrabold tracking-tight text-[#FFF6E8] text-shadow-ink-lg sm:text-7xl lg:text-[88px]">
        {word.map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, scale: 0.6, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.04, duration: 0.5, ease: OVERSHOOT }}
          >
            {ch}
          </motion.span>
        ))}
      </span>
      <motion.span
        aria-hidden
        className="relative -mt-2 block text-[15vw] font-extrabold tracking-tight sm:text-7xl lg:text-[88px]"
        initial={{ opacity: 0, scale: 0.6, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.15 + word.length * 0.04, duration: 0.5, ease: OVERSHOOT }}
      >
        <span className="absolute left-1 top-1 text-[#FF5D7E]" style={{ transform: 'translate(4px, 4px)' }}>
          SAGA
        </span>
        <span className="relative text-[#FFC93C] text-shadow-ink-lg">SAGA</span>
      </motion.span>
    </h1>
  );
}

function Hero() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const chips = [...WORLDS, ...WORLDS]; // duplicated for the seamless marquee

  const onMouseMove = (e: ReactMouseEvent) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width - 0.5;
    const ny = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--px', String(nx));
    el.style.setProperty('--py', String(ny));
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[100dvh] flex-col overflow-hidden"
    >
      {/* diorama background with cinematic settle */}
      <motion.div
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/hero-diorama.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'translate(calc(var(--px, 0) * -10px), calc(var(--py, 0) * -10px)) scale(1.05)',
          transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
        }}
      />
      {/* night gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(36,26,69,0.6) 0%, rgba(36,26,69,0) 40%, rgba(36,26,69,0.95) 92%)',
        }}
      />

      {/* foreground stack */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 items-center px-4 pt-24 pb-16">
        <div className="max-w-2xl">
          <motion.img
            src="/logo-star.svg"
            alt=""
            className="bob-sine mb-4 h-[72px] w-[72px]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: OVERSHOOT }}
          />
          <HeroTitle />
          <motion.p
            className="mt-5 text-lg font-semibold text-[#FFF6E8]/90"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            An original star-sprite platformer — 32 handcrafted levels across 8 worlds.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82, duration: 0.5 }}
          >
            <button
              type="button"
              onClick={() => navigate('/game')}
              className="btn-story btn-primary glow-pulse star-cursor h-14 px-8 text-base"
            >
              <Play size={20} fill="#1B1233" /> Press Start
            </button>
            <Link to="/map" className="btn-story btn-ghost h-14 px-8 text-base text-[#FFF6E8]" style={{ borderColor: '#FFF6E8' }}>
              <MapIcon size={18} /> Level Select
            </Link>
          </motion.div>
          <motion.p
            className="mt-5 text-xs font-bold tracking-[0.06em] text-[#FFF6E8]/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            Arrows / WASD to move · Space to jump · Full touch support
          </motion.p>
        </div>

        {/* Pip portrait (desktop) */}
        <motion.div
          className="relative ml-auto hidden lg:block"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.7, ease: OVERSHOOT }}
        >
          <div
            className="absolute inset-0 -z-10 scale-110 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,201,60,0.45) 0%, transparent 65%)' }}
          />
          <motion.img
            src="/pip-portrait.png"
            alt="Pip, the star-sprite hero, mid-jump"
            className="w-[420px] max-w-none drop-shadow-[0_24px_40px_rgba(27,18,51,0.5)]"
            animate={{ y: [-14, 14], rotate: [-2, 2] }}
            transition={{ duration: 3, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
          />
        </motion.div>
      </div>

      {/* world swatch marquee */}
      <div className="relative z-10 border-t-[3px] border-[#1B1233] bg-[#241A45]/70 py-3 backdrop-blur-sm">
        <div className="overflow-hidden">
          <div className="marquee-track flex w-max gap-3 px-3">
            {chips.map((w, i) => (
              <Link
                key={`${w.id}-${i}`}
                to="/worlds"
                className="stat-chip star-cursor shrink-0 gap-2 py-1.5"
              >
                <span className="h-3 w-3 rounded-full border-2 border-[#1B1233]" style={{ background: w.color }} />
                W{w.id} {w.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — feature trio
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Gamepad2,
    title: 'Tight Controls',
    body: 'Acceleration, coyote time, jump buffering — every jump lands exactly how you meant it.',
    extra: (
      <div className="mt-4 flex gap-2">
        {['W', 'A', 'S', 'D', 'Space'].map((k) => (
          <kbd
            key={k}
            className="rounded-lg border-[3px] border-[#1B1233] bg-[#FFF6E8] px-2.5 py-1 text-xs font-extrabold text-[#1B1233] shadow-[0_3px_0_rgba(27,18,51,0.35)] transition-transform hover:translate-y-[2px] hover:shadow-none"
          >
            {k}
          </kbd>
        ))}
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: 'Power-Ups',
    body: 'Star-Berry, Ember Flower, Comet Star. Grow, shoot, go invincible.',
    extra: (
      <img
        src="/powerups.png"
        alt="Star-Berry, Ember Flower, Comet Star and 1-up Heart power-ups"
        className="mt-4 h-16 w-full rounded-xl border-[3px] border-[#1B1233] object-cover"
      />
    ),
  },
  {
    icon: Castle,
    title: '32 Levels, 8 Bosses',
    body: 'Meadow to Shadow Fortress. Every fourth level: a castle, a boss, a bridge over lava.',
    extra: (
      <div className="mt-4 flex gap-1.5">
        {WORLDS.map((w) => (
          <span
            key={w.id}
            className="h-4 flex-1 rounded-full border-2 border-[#1B1233]"
            style={{ background: w.color }}
            title={w.name}
          />
        ))}
      </div>
    ),
  },
];

function FeatureTrio() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-24">
      <motion.h2
        className="text-center font-display text-4xl font-extrabold text-[#FFF6E8]"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.5 }}
      >
        Everything a platformer should be
      </motion.h2>
      <StarDivider />
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            className="story-panel pixel-notch star-cursor p-6 transition-transform duration-200 ease-overshoot hover:-translate-y-1.5 hover:rotate-[1.5deg]"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ delay: i * 0.15, duration: 0.55, ease: OVERSHOOT }}
          >
            <motion.div whileHover={{ y: [0, -8, 0] }} transition={{ duration: 0.4 }}>
              <f.icon size={36} className="text-[#1B1233]" strokeWidth={2.4} />
            </motion.div>
            <h3 className="mt-3 font-display text-2xl font-extrabold">{f.title}</h3>
            <p className="mt-2 font-semibold text-[#1B1233]/75">{f.body}</p>
            {f.extra}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — world teaser strip
// ---------------------------------------------------------------------------

function WorldTeaser() {
  const unlocked = useGameStore((s) => s.progress.unlocked);
  return (
    <section className="border-y-[3px] border-[#1B1233] bg-[#33245E] py-24">
      <div className="mx-auto max-w-[1200px] px-4">
        <motion.h2
          className="text-center font-display text-4xl font-extrabold text-[#FFF6E8]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          Eight worlds. One star-sprite.
        </motion.h2>
        <StarDivider />
      </div>
      <div className="mt-10 overflow-x-auto pb-4">
        <div className="mx-auto flex w-max gap-6 px-6">
          {WORLDS.map((w, i) => {
            const locked = w.id > 1 && unlocked.length === 0;
            return (
              <motion.div
                key={w.id}
                className="story-panel star-cursor group w-[260px] shrink-0 overflow-hidden p-0 transition-transform duration-200 ease-overshoot hover:-translate-y-1.5"
                initial={{ opacity: 0, x: 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.06, duration: 0.5, ease: OVERSHOOT }}
              >
                <div
                  className="flex items-center justify-between border-b-[3px] border-[#1B1233] px-4 py-2"
                  style={{ background: w.color }}
                >
                  <span className="font-display text-lg font-extrabold text-[#1B1233]">
                    W{w.id} · {w.name}
                  </span>
                  <span className="text-xs font-extrabold uppercase tracking-wide text-[#1B1233]/70">
                    4 levels
                  </span>
                </div>
                <div className="overflow-hidden">
                  <img
                    src={w.img}
                    alt={`${w.name} world diorama`}
                    className="h-[180px] w-full object-cover transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-1"
                    loading="lazy"
                  />
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-[#1B1233]/75">{w.flavor}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-[#1B1233]/60">
                      {locked ? (
                        <>
                          <Lock size={12} /> Locked
                        </>
                      ) : (
                        'Open'
                      )}
                    </span>
                    <Link
                      to={`/worlds#w${w.id}`}
                      className="text-sm font-extrabold text-[#E8A50F] hover:underline"
                    >
                      Explore →
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 4 — how it plays
// ---------------------------------------------------------------------------

function HowItPlays() {
  return (
    <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 py-24 lg:grid-cols-2">
      <div>
        <motion.h2
          className="font-display text-4xl font-extrabold text-[#FFF6E8]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          How it plays
        </motion.h2>
        <div className="mt-8 space-y-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: OVERSHOOT }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#FFC93C] font-display text-2xl font-extrabold text-[#1B1233] shadow-[0_4px_0_rgba(27,18,51,0.35)]">
                {s.n}
              </span>
              <div>
                <h3 className="font-display text-xl font-extrabold text-[#FFF6E8]">{s.title}</h3>
                <p className="mt-1 font-semibold text-[#FFF6E8]/70">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <motion.div
        className="story-panel-night overflow-hidden p-2"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: OVERSHOOT }}
      >
        <div className="h-[320px] w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#7EC8FF] to-[#C9F0FF]">
          <Suspense
            fallback={
              <img
                src="/hero-diorama.png"
                alt="Meadow diorama"
                className="h-full w-full object-cover"
              />
            }
          >
            <MiniDiorama />
          </Suspense>
        </div>
        <p className="px-2 py-3 text-center text-xs font-bold uppercase tracking-[0.08em] text-[#FFF6E8]/60">
          Live from World 1 — rendered in your browser
        </p>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — final CTA
// ---------------------------------------------------------------------------

function FinalCta() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden px-4 py-24">
      {/* twinkling stars */}
      {Array.from({ length: 14 }).map((_, i) => (
        <motion.img
          key={i}
          src="/logo-star.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute w-6 opacity-40"
          style={{
            left: `${(i * 71) % 100}%`,
            top: `${(i * 37) % 90}%`,
          }}
          animate={{ opacity: [0.15, 0.6, 0.15], scale: [0.8, 1.15, 0.8] }}
          transition={{ duration: 2 + (i % 4) * 0.7, repeat: Infinity, delay: (i * 0.43) % 2 }}
        />
      ))}
      <motion.div
        className="story-panel relative mx-auto max-w-[720px] p-10 text-center"
        initial={{ opacity: 0, scale: 0.85, y: 40 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6, ease: OVERSHOOT }}
      >
        <h2 className="font-display text-5xl font-extrabold">Ready, Pip?</h2>
        <p className="mx-auto mt-4 max-w-md font-semibold text-[#1B1233]/75">
          Your progress saves automatically. 3 lives, 100 coins to a 1-up, and a flagpole
          waiting at the end of every level.
        </p>
        <motion.button
          type="button"
          onClick={() => navigate(`/game?level=${FIRST_LEVEL_ID}`)}
          className="btn-story btn-primary glow-pulse star-cursor mx-auto mt-8 h-16 px-10 text-lg"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Play size={22} fill="#1B1233" /> Start World 1-1
        </motion.button>
        <div className="mt-4">
          <Link to="/map" className="text-sm font-extrabold text-[#5B3FD4] hover:underline">
            or pick any unlocked level
          </Link>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-[#E8A50F]">
          <Star size={16} fill="#E8A50F" />
          <Star size={20} fill="#E8A50F" />
          <Star size={16} fill="#E8A50F" />
        </div>
      </motion.div>
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <FeatureTrio />
      <WorldTeaser />
      <HowItPlays />
      <FinalCta />
    </>
  );
}
