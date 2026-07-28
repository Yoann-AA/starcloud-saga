// Credits & About (/credits) — originality promise, tech stack, auto-scrolling
// credits roll, changelog accordion, final CTA.
import { useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Box,
  ChevronDown,
  Code2,
  Database,
  Music4,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Wind,
} from 'lucide-react';

const EASE_OVERSHOOT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

/* --------------------------------------------------------------- built with */

const TECH = [
  { icon: Box, name: 'Three.js', role: 'Real-time low-poly 3D worlds, rendered live in your browser', color: '#4FC4FF' },
  { icon: Code2, name: 'React + TypeScript', role: 'The shell — every screen, panel and button', color: '#59D99C' },
  { icon: Rocket, name: 'Vite', role: 'Instant builds and lightning-fast reloads', color: '#9B7BFF' },
  { icon: Wind, name: 'GSAP + Lenis', role: 'Buttery scroll-driven motion and page feel', color: '#FFC93C' },
  { icon: Music4, name: 'WebAudio API', role: 'Synthesized chiptune & SFX — zero audio files', color: '#FF5D7E' },
  { icon: Database, name: 'localStorage', role: 'Your stars, coins and settings — kept on your device', color: '#FF6B35' },
];

/* ---------------------------------------------------------------- cast roll */

const CAST: { role: string; name: string }[] = [
  { role: 'Starring', name: 'Pip — as Himself' },
  { role: '', name: 'A brave little star-sprite' },
  { role: 'Also featuring', name: 'Waddler' },
  { role: '', name: 'Hopper' },
  { role: '', name: 'Turtleaf & his shell' },
  { role: '', name: 'Spikepod · Flapper · Burrower' },
  { role: 'The Guardians', name: 'Brambleback' },
  { role: '', name: 'Scorch Sentinel' },
  { role: '', name: 'Frostjaw' },
  { role: '', name: 'Storm Roc' },
  { role: '', name: 'Thornmaw' },
  { role: '', name: 'Prism Warden' },
  { role: '', name: 'Magmawyrm' },
  { role: '', name: '…and the Umbra Knight' },
  { role: 'The Worlds', name: '32 handcrafted levels' },
  { role: '', name: '8 castles · 8 skies' },
  { role: 'Special appearance', name: '1 very brave flagpole' },
  { role: 'Music & SFX', name: 'Your browser, live, every note' },
  { role: 'And', name: 'You — Player One' },
];

/* ---------------------------------------------------------------- changelog */

const CHANGELOG = [
  {
    version: 'v1.0',
    title: 'Launch',
    date: 'Stardate 001.0',
    items: [
      '32 original levels across 8 worlds',
      '8 castle bosses with unique patterns',
      'Full power-up set: Star-Berry, Ember Flower, Comet Star, 1-Up Heart',
      'Touch controls for phones & tablets',
      'Save system: stars, coins and settings on your device',
    ],
  },
  {
    version: 'v1.1',
    title: 'Polish pass',
    date: 'Stardate 001.1',
    items: [
      'Coyote time tuning — ledge grace feels fairer',
      'Shell physics fix: ricochets no longer climb walls',
      'Timer warning music kicks in under 100 seconds',
    ],
  },
  {
    version: 'v1.2',
    title: 'Star ratings',
    date: 'Stardate 001.2',
    items: [
      'Per-level 3-star goals: finish, coin threshold, par time',
      'Par times shown on every level tile',
      'Map tracks your 96-star total',
    ],
  },
];

function AccordionItem({
  entry,
  open,
  onToggle,
}: {
  entry: (typeof CHANGELOG)[number];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="story-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="star-cursor flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <span className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border-[3px] border-[#1B1233] bg-[#FFC93C] px-3 py-0.5 font-display text-sm font-extrabold text-[#1B1233]">
            {entry.version}
          </span>
          <span className="font-display text-xl font-extrabold text-[#1B1233]">{entry.title}</span>
          <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#1B1233]/50">{entry.date}</span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}>
          <ChevronDown size={20} className="shrink-0 text-[#1B1233]" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.3, 0.64, 1] }}
          >
            <ul className="space-y-2 border-t-[3px] border-[#1B1233] px-5 py-4">
              {entry.items.map((item, i) => (
                <motion.li
                  key={item}
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="flex items-start gap-2 text-sm font-bold text-[#1B1233]/80"
                >
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-[#E8A50F]" />
                  {item}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------------------- page */

export default function Credits() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-[1200px] space-y-24 px-4 py-16">
      {/* hero */}
      <header className="text-center">
        <motion.img
          src="/logo-star.svg"
          alt=""
          className="bob-sine mx-auto h-20 w-20"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: EASE_OVERSHOOT }}
        />
        <h1 className="mt-6 font-display text-5xl font-extrabold leading-tight text-[#FFF6E8] sm:text-6xl">
          {'Made of stardust & JavaScript'.split(' ').map((word, i) => (
            <motion.span
              key={i}
              className="mr-3 inline-block"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: EASE_OVERSHOOT }}
            >
              {word === 'stardust' ? <span className="text-[#FFC93C]">{word}</span> : word}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="mx-auto mt-4 max-w-xl text-lg font-semibold text-[#FFF6E8]/70"
        >
          Starcloud Saga is a love letter to classic platformers — 32 original levels rendered in
          real-time 3D, running entirely in your browser.
        </motion.p>
      </header>

      {/* originality promise */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: EASE_OVERSHOOT }}
        className="story-panel pixel-notch relative p-8 sm:p-12"
      >
        <div className="flex items-center gap-3">
          <ShieldCheck size={30} className="text-[#1B1233]" />
          <h2 className="font-display text-3xl font-extrabold text-[#1B1233] sm:text-4xl">
            100% original. 0% borrowed.
          </h2>
        </div>
        <div className="my-5 flex items-center gap-2" aria-hidden>
          <span className="h-[3px] flex-1 rounded-full bg-[#1B1233]/15" />
          <img src="/logo-star.svg" alt="" className="h-6 w-6" />
          <span className="h-[3px] flex-1 rounded-full bg-[#1B1233]/15" />
        </div>
        <p className="max-w-3xl text-lg font-semibold leading-relaxed text-[#1B1233]/85">
          Every character, name, level, sprite, and note of music in Starcloud Saga is an{' '}
          <mark className="rounded bg-[#FFC93C]/60 px-1 text-[#1B1233]">original creation</mark>. Pip, the
          worlds, and the Starcloud are our own. The timeless <em>mechanics</em> of the genre — running,
          jumping, stomping — belong to everyone; this game's identity belongs to no one but itself.{' '}
          <mark className="rounded bg-[#FFC93C]/60 px-1 text-[#1B1233]">
            Starcloud Saga is not affiliated with, endorsed by, or connected to Nintendo
          </mark>{' '}
          or any other company.
        </p>
      </motion.section>

      {/* built with */}
      <section>
        <h2 className="text-center font-display text-4xl font-extrabold text-[#FFF6E8]">Built with</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TECH.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.08, duration: 0.45, ease: EASE_OVERSHOOT }}
              whileHover={{ y: -6, rotate: 2 }}
              className="story-panel-night flex items-start gap-4 p-5"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border-[3px] border-[#1B1233]"
                style={{ background: t.color }}
              >
                <t.icon size={22} className="text-[#1B1233]" />
              </span>
              <div>
                <h3 className="font-display text-lg font-extrabold text-[#FFF6E8]">{t.name}</h3>
                <p className="mt-1 text-sm font-semibold text-[#FFF6E8]/70">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* cast roll */}
      <section>
        <h2 className="text-center font-display text-4xl font-extrabold text-[#FFF6E8]">The cast</h2>
        <p className="mt-2 text-center text-sm font-semibold text-[#FFF6E8]/60">Hover to hold the roll.</p>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="credits-roll-mask story-panel-night relative mx-auto mt-8 h-[380px] max-w-xl overflow-hidden p-6"
        >
          <div className="credits-roll-track">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="pb-8">
                {CAST.map((c, i) => (
                  <div key={`${dup}-${i}`} className="mb-4 text-center">
                    {c.role && (
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#FFC93C]">{c.role}</p>
                    )}
                    <p className="font-display text-xl font-extrabold text-[#FFF6E8]">{c.name}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#33245E] to-transparent" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#33245E] to-transparent" aria-hidden />
        </motion.div>
        <div className="mt-6 flex justify-center">
          <img src="/pip-portrait.png" alt="Pip waves goodbye" className="bob-sine h-24 w-24 object-contain" loading="lazy" />
        </div>
      </section>

      {/* changelog */}
      <section>
        <h2 className="flex items-center justify-center gap-3 text-center font-display text-4xl font-extrabold text-[#FFF6E8]">
          <BookOpen size={30} className="text-[#FFC93C]" /> Changelog
        </h2>
        <div className="mx-auto mt-10 max-w-2xl space-y-4">
          {CHANGELOG.map((entry, i) => (
            <AccordionItem
              key={entry.version}
              entry={entry}
              open={openIdx === i}
              onToggle={() => setOpenIdx(openIdx === i ? null : i)}
            />
          ))}
        </div>
      </section>

      {/* final CTA */}
      <motion.section
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center pb-16 text-center"
      >
        <h2 className="font-display text-4xl font-extrabold text-[#FFF6E8] sm:text-5xl">
          Thanks for playing <span className="text-[#FFC93C]">among the stars.</span>
        </h2>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/game" className="btn-story btn-primary star-cursor glow-pulse text-lg">
            <Play size={18} fill="#1B1233" /> Play
          </Link>
          <Link to="/guide" className="btn-story btn-secondary star-cursor">
            Read the Guide
          </Link>
        </div>
      </motion.section>

      {/* credits-roll keyframes (scoped) */}
      <style>{`
        .credits-roll-track {
          animation: credits-roll 36s linear infinite;
          will-change: transform;
        }
        .credits-roll-mask:hover .credits-roll-track {
          animation-play-state: paused;
        }
        @keyframes credits-roll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}
