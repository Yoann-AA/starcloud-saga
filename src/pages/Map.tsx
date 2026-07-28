// WORLD MAP / LEVEL SELECT — storybook board-game map (map.md).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Castle, Coins, Flag, Lightbulb, Lock, Play, Star, Swords } from 'lucide-react';
import { FIRST_LEVEL_ID, LEVELS } from '../game/levels/index';
import { useGameStore } from '../game/state/store';
import { emit } from '../game/engine/events';

// ---------------------------------------------------------------------------
// World identity (design.md §3 world colors)
// ---------------------------------------------------------------------------
interface WorldInfo {
  world: number;
  name: string;
  tag: string;
  flavor: string;
  primary: string;
  secondary: string;
  thumb: string;
}

const WORLDS: WorldInfo[] = [
  { world: 1, name: 'Verdant Meadow', tag: 'Meadow', flavor: 'Soft hills and clover fields where Pip’s journey begins.', primary: '#59D99C', secondary: '#8FE388', thumb: '/world-w1.png' },
  { world: 2, name: 'Sunspill Desert', tag: 'Desert', flavor: 'Terracotta ruins half-buried in singing golden sand.', primary: '#F2B84B', secondary: '#E07B3F', thumb: '/world-w2.png' },
  { world: 3, name: 'Frostpeak Snowfields', tag: 'Snow', flavor: 'Hushed pines and glittering ice under a pale blue sky.', primary: '#9ADCF5', secondary: '#EAF7FF', thumb: '/world-w3.png' },
  { world: 4, name: 'Nimbus Expanse', tag: 'Sky', flavor: 'Floating cloud-islands drifting on zephyr currents.', primary: '#7FB0FF', secondary: '#FFFFFF', thumb: '/world-w4.png' },
  { world: 5, name: 'Mossveil Jungle', tag: 'Jungle', flavor: 'A humming green cathedral of vines and hidden hollows.', primary: '#2FA36B', secondary: '#B7E34C', thumb: '/world-w5.png' },
  { world: 6, name: 'Glimmerdeep Caverns', tag: 'Crystal', flavor: 'Violet crystal galleries that echo every footstep.', primary: '#9B7BFF', secondary: '#59E3D9', thumb: '/world-w6.png' },
  { world: 7, name: 'Cindercone Volcano', tag: 'Volcano', flavor: 'Basalt ridges and rivers of slow, hungry lava.', primary: '#FF6B35', secondary: '#8A4A2B', thumb: '/world-w7.png' },
  { world: 8, name: 'Umbra Fortress', tag: 'Fortress', flavor: 'The shadow keep where the stolen stars are held.', primary: '#5B3FD4', secondary: '#2A1B4A', thumb: '/world-w8.png' },
];

const TIPS = [
  'Kick a shell into a crowd for chain points.',
  'Top of the flagpole = 1-up. Aim high!',
  '100 coins = extra life. Grab every arc.',
  'Crouch on pipes — some are doors.',
  'Comet Star makes you untouchable… but pits still win.',
];

// ---------------------------------------------------------------------------
// Level tile (72px storybook tile)
// ---------------------------------------------------------------------------
function LevelTile({
  id,
  world,
  level,
  name,
  unlocked,
  stars,
  bestCoins,
  isCurrent,
  primary,
  onPlay,
}: {
  id: string;
  world: number;
  level: number;
  name: string;
  unlocked: boolean;
  stars: number;
  bestCoins: number;
  isCurrent: boolean;
  primary: string;
  onPlay: (id: string) => void;
}) {
  const isCastle = level === 4;
  const base =
    'relative flex h-[72px] w-[72px] flex-col items-center justify-center rounded-2xl border-[3px] border-[#1B1233] transition-transform duration-150';
  if (!unlocked) {
    return (
      <div
        className={`${base} bg-[#33245E]`}
        title={`World ${world}-${level} — locked`}
        aria-label={`Level ${world}-${level} locked`}
      >
        <Lock size={22} className="text-[#1B1233]/60" />
        {isCastle && <Castle size={12} className="mt-1 text-[#FFF6E8]/30" />}
      </div>
    );
  }
  return (
    <motion.button
      type="button"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.92 }}
      onClick={onPlay.bind(null, id)}
      onMouseEnter={() => emit('uiHover', undefined)}
      title={`${world}-${level} ${name}`}
      aria-label={`Play level ${world}-${level} ${name}`}
      className={`${base} star-cursor overflow-hidden ${
        isCurrent ? 'animate-pulse ring-4 ring-[#FFC93C]' : ''
      }`}
      style={{
        backgroundColor: primary,
        boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.35), 0 6px 0 rgba(27,18,51,0.35)',
      }}
    >
      {isCastle && <div className="absolute inset-x-0 top-0 h-2 bg-[#1B1233]/35" />}
      <span className="font-display text-[26px] font-extrabold leading-none text-[#1B1233]">
        {isCastle ? <Castle size={24} strokeWidth={2.5} /> : level}
      </span>
      {/* 0–3 star rating */}
      <span className="mt-1 flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <Star
            key={i}
            size={10}
            className={i < stars ? 'text-[#FFC93C]' : 'text-[#1B1233]/30'}
            fill={i < stars ? '#FFC93C' : 'none'}
            strokeWidth={3}
          />
        ))}
      </span>
      {bestCoins > 0 && (
        <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold text-[#1B1233]/60">
          {bestCoins}c
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-2 border-[#1B1233] bg-[#FFC93C] px-1.5 text-[8px] font-extrabold uppercase tracking-wider text-[#1B1233]">
          You are here
        </span>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Map page
// ---------------------------------------------------------------------------
export default function Map() {
  const navigate = useNavigate();
  const progress = useGameStore((s) => s.progress);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const isUnlocked = (id: string): boolean =>
    id === FIRST_LEVEL_ID || progress.unlocked.includes(id);

  const totalStars = useMemo(
    () => Object.values(progress.stars).reduce((a, b) => a + b, 0),
    [progress.stars],
  );
  const totalCoins = useMemo(
    () => Object.values(progress.bestCoins).reduce((a, b) => a + b, 0),
    [progress.bestCoins],
  );
  const worldsCleared = useMemo(
    () =>
      WORLDS.filter((w) =>
        LEVELS.filter((l) => l.world === w.world).every((l) => (progress.stars[l.id] ?? 0) > 0),
      ).length,
    [progress.stars],
  );

  /** Furthest unlocked, not-yet-starred level = "you are here". */
  const currentId = useMemo(() => {
    const candidate =
      [...LEVELS].reverse().find((l) => isUnlocked(l.id) && (progress.stars[l.id] ?? 0) === 0) ??
      LEVELS.find((l) => isUnlocked(l.id)) ??
      LEVELS[0];
    return candidate.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.unlocked, progress.stars]);

  const hasProgress = Object.keys(progress.stars).length > 0;

  const play = (id: string): void => {
    emit('uiClick', undefined);
    navigate(`/game?level=${id}`);
  };

  return (
    <div className="relative">
      {/* ============ Section 1 — header band ============ */}
      <section
        className="relative border-b-[3px] border-[#1B1233] bg-cover bg-center"
        style={{ backgroundImage: 'url(/map-bg.png)' }}
      >
        <div className="absolute inset-0 bg-[#241A45]/70" aria-hidden />
        <div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-4 py-14 text-center">
          <h1 className="font-display text-4xl font-extrabold text-[#FFF6E8] sm:text-[56px] sm:leading-tight">
            Choose Your <span className="text-[#FFC93C]">Path</span>
          </h1>
          <p className="mt-3 max-w-xl text-base font-semibold text-[#FFF6E8]/75 sm:text-lg">
            32 levels · 8 worlds · your progress saves automatically
          </p>

          {/* progress chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }} className="stat-chip">
              <Star size={14} className="text-[#FFC93C]" fill="#FFC93C" /> Stars {totalStars}/96
            </motion.span>
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.13 }} className="stat-chip">
              <Coins size={14} className="text-[#FFC93C]" /> Coins {totalCoins}
            </motion.span>
            <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.21 }} className="stat-chip">
              <Castle size={14} className="text-[#FF5D7E]" /> Worlds cleared {worldsCleared}/8
            </motion.span>
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.29 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => play(currentId)}
              className="btn-story btn-primary star-cursor"
            >
              <Play size={16} fill="#1B1233" /> Continue: {currentId}
            </motion.button>
          </div>

          {/* empty state */}
          {!hasProgress && (
            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="story-panel mt-8 flex items-center gap-4 px-5 py-4 text-left"
            >
              <img src="/pip-portrait.png" alt="Pip, the star-sprite hero" className="h-16 w-16 rounded-xl border-[3px] border-[#1B1233] object-cover" />
              <div>
                <p className="font-display text-lg font-extrabold text-[#1B1233]">No progress yet — the stars await!</p>
                <p className="text-sm font-semibold text-[#1B1233]/70">
                  Start World 1-1 and begin Pip’s saga.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ============ Section 2 — the map board ============ */}
      <section className="relative mx-auto max-w-[1200px] px-4 py-14">
        {/* serpentine dashed path behind the zones */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1000 1600"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M500 0 C 180 120, 180 280, 500 400 S 820 680, 500 800 S 180 1080, 500 1200 S 820 1480, 500 1600"
            fill="none"
            stroke="rgba(255,246,232,0.4)"
            strokeWidth="4"
            strokeDasharray="2 14"
            strokeLinecap="round"
          />
        </svg>

        <div className="relative flex flex-col gap-10">
          {WORLDS.map((w, wi) => {
            const levels = LEVELS.filter((l) => l.world === w.world);
            const worldUnlocked = levels.some((l) => isUnlocked(l.id));
            const left = wi % 2 === 0;
            return (
              <motion.div
                key={w.world}
                initial={{ x: left ? -80 : 80, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                className={`flex ${left ? 'md:justify-start' : 'md:justify-end'}`}
              >
                <div
                  className={`story-panel pixel-notch w-full p-5 md:w-[78%] ${
                    worldUnlocked ? '' : 'opacity-60 saturate-[0.6]'
                  }`}
                >
                  <div className={`flex flex-col gap-5 md:flex-row ${left ? '' : 'md:flex-row-reverse'}`}>
                    {/* world identity block */}
                    <div className="flex items-center gap-4 md:w-[300px] md:shrink-0">
                      <div
                        className="overflow-hidden rounded-2xl border-[3px] border-[#1B1233]"
                        style={{ backgroundColor: w.primary }}
                      >
                        <motion.img
                          src={w.thumb}
                          alt={`${w.name} diorama`}
                          className="h-[120px] w-[120px] object-cover md:h-[150px] md:w-[150px]"
                          whileHover={{ scale: 1.08 }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <div>
                        <span
                          className="inline-block rounded-full border-2 border-[#1B1233] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#1B1233]"
                          style={{ backgroundColor: w.primary }}
                        >
                          World {w.world} · {w.tag}
                        </span>
                        <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight text-[#1B1233]">
                          {w.name}
                        </h3>
                        <p className="mt-1 text-sm font-semibold leading-snug text-[#1B1233]/70">
                          {worldUnlocked ? w.flavor : `Clear World ${w.world - 1} to unlock.`}
                        </p>
                      </div>
                    </div>

                    {/* level tiles */}
                    <div className="flex flex-1 flex-wrap items-center justify-center gap-3 sm:gap-4">
                      {levels.map((l, li) => (
                        <motion.div
                          key={l.id}
                          initial={{ scale: 0.7, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.1 + li * 0.07, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                          className="pt-3"
                        >
                          <LevelTile
                            id={l.id}
                            world={l.world}
                            level={l.level}
                            name={l.name}
                            unlocked={isUnlocked(l.id)}
                            stars={progress.stars[l.id] ?? 0}
                            bestCoins={progress.bestCoins[l.id] ?? 0}
                            isCurrent={l.id === currentId}
                            primary={w.primary}
                            onPlay={play}
                          />
                          <p className="mt-1.5 max-w-[90px] text-center text-[10px] font-bold leading-tight text-[#1B1233]/60">
                            {l.name}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ============ Section 3 — legend & tips ============ */}
      <section className="mx-auto max-w-[1200px] px-4 pb-16">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="grid gap-5 md:grid-cols-2"
        >
          {/* legend */}
          <div className="story-panel p-6">
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#1B1233]">
              <Flag size={20} className="text-[#FF5D7E]" /> Legend
            </h3>
            <ul className="mt-4 space-y-3 text-sm font-bold text-[#1B1233]/80">
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-[#1B1233] bg-[#59D99C] font-display font-extrabold text-[#1B1233]">2</span>
                Unlocked level — click to play
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-[#1B1233] bg-[#33245E]">
                  <Lock size={14} className="text-[#FFF6E8]/50" />
                </span>
                Locked — clear the previous level first
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border-[3px] border-[#1B1233] bg-[#5B3FD4]">
                  <Castle size={14} className="text-[#1B1233]" />
                </span>
                Castle — boss battle at the end of each world
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center gap-0.5 rounded-lg border-[3px] border-[#1B1233] bg-[#FFC93C]">
                  {[0, 1, 2].map((i) => (
                    <Star key={i} size={8} fill="#1B1233" className="text-[#1B1233]" />
                  ))}
                </span>
                3-star perfect — finish, rich in coins, under par
              </li>
            </ul>
          </div>

          {/* rotating tips */}
          <div className="story-panel flex flex-col p-6">
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold text-[#1B1233]">
              <Lightbulb size={20} className="text-[#FFC93C]" /> Pip’s Tips
            </h3>
            <div className="relative mt-4 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={tipIdx}
                  initial={{ x: 60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -60, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 text-lg font-bold leading-snug text-[#1B1233]"
                >
                  <Swords size={22} className="shrink-0 text-[#9B7BFF]" />
                  {TIPS[tipIdx]}
                </motion.p>
              </AnimatePresence>
            </div>
            <div className="mt-4 flex gap-2">
              {TIPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Tip ${i + 1}`}
                  onClick={() => setTipIdx(i)}
                  className={`h-2.5 rounded-full border-2 border-[#1B1233] transition-all ${
                    i === tipIdx ? 'w-7 bg-[#FFC93C]' : 'w-2.5 bg-[#1B1233]/20'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
