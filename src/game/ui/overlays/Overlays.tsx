// OVERLAYS SEAM — POD-AUDIOFX implementation.
// Storybook modals (game.md §4) rendered in DOM above the canvas, driven by
// the zustand store run.status: Level Intro Card, Pause Menu (+ Settings
// drawer), Level Complete tally, Game Over, Win screen.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Coins, Heart, Home, Play, RotateCcw, Settings, Skull, Star, Timer, Volume2, VolumeX,
} from 'lucide-react';
import { useGameStore } from '../../state/store';
import type { SettingsState } from '../../state/store';
import { emit } from '../../engine/events';
import { LEVELS } from '../../levels/index';
import { playSfx, setMuted, setVolumes } from '../../audio/engine';

const OVERSHOOT = [0.34, 1.56, 0.64, 1] as [number, number, number, number];
const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function Backdrop({ night = false }: { night?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`absolute inset-0 backdrop-blur-[2px] ${night ? 'bg-[#1B1233]/80' : 'bg-[#241A45]/70'}`}
    />
  );
}

function Panel({
  children,
  className = '',
  drop = false,
}: {
  children: ReactNode;
  className?: string;
  drop?: boolean;
}) {
  return (
    <motion.div
      initial={drop ? { y: -140, opacity: 0 } : { scale: 0.85, opacity: 0 }}
      animate={drop ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.18, ease: EASE_OUT } }}
      transition={{ duration: 0.32, ease: OVERSHOOT }}
      className={`story-panel pointer-events-auto relative w-[min(92vw,430px)] p-6 text-center ${className}`}
    >
      {children}
    </motion.div>
  );
}

function StoryButton({
  children,
  variant = 'secondary',
  onClick,
  disabled = false,
  className = '',
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: OVERSHOOT }}
      disabled={disabled}
      onClick={() => {
        emit('uiClick', undefined);
        onClick();
      }}
      onMouseEnter={() => emit('uiHover', undefined)}
      className={`btn-story star-cursor w-full ${
        variant === 'primary' ? 'btn-primary' : variant === 'ghost' ? 'btn-ghost' : 'btn-secondary'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
}

function StarIcon({ filled, size = 28 }: { filled: boolean; size?: number }) {
  return (
    <Star
      size={size}
      className={filled ? 'text-[#FFC93C]' : 'text-[#1B1233]/25'}
      fill={filled ? '#FFC93C' : 'none'}
      strokeWidth={2.5}
    />
  );
}

/** Full reload of the current level — guarantees a clean sim restart. */
function reloadLevel(levelId: string): void {
  window.location.assign(`/game?level=${levelId}`);
}

function useLevelMeta() {
  const levelId = useGameStore((s) => s.run.levelId);
  return useMemo(() => LEVELS.find((m) => m.id === levelId) ?? null, [levelId]);
}

// ---------------------------------------------------------------------------
// Level Intro Card (4a) — Game page auto-dismisses after 1.6s / any key
// ---------------------------------------------------------------------------

function IntroCard() {
  const run = useGameStore((s) => s.run);
  const setStatus = useGameStore((s) => s.setStatus);
  const meta = useLevelMeta();

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      onClick={() => setStatus('playing')}
    >
      <Panel className="w-[min(92vw,380px)]">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#1B1233]/60">
          World {run.world}-{run.level}
        </p>
        <h2 className="font-display mt-1 text-4xl font-extrabold text-[#1B1233]">
          {meta?.name ?? 'Untitled'}
        </h2>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="stat-chip !border-[#1B1233] !bg-[#F2E4CE] !text-[#1B1233]">
            <Timer size={13} /> Par {meta?.parTime ?? '—'}s
          </span>
          <span className="stat-chip !border-[#1B1233] !bg-[#F2E4CE] !text-[#1B1233]">
            <StarIcon filled size={13} /> 3-star goals
          </span>
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[#1B1233]/50">
          Press any key
        </p>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settings drawer — master/music/sfx sliders + mute (wired to store, persisted)
// ---------------------------------------------------------------------------

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block text-left">
      <span className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-[#FFF6E8]/80">
        {label}
        <span className="text-[#FFC93C]">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="star-cursor mt-1 w-full accent-[#FFC93C]"
      />
    </label>
  );
}

function SettingsDrawer({ onClose }: { onClose: () => void }) {
  const settings = useGameStore((s) => s.settings);
  const setSettings = useGameStore((s) => s.setSettings);

  const update = (patch: Partial<SettingsState>) => {
    setSettings(patch);
    const next = useGameStore.getState().settings;
    setVolumes({ master: next.master, music: next.music, sfx: next.sfx });
    if (patch.muted !== undefined) setMuted(next.muted);
  };

  return (
    <motion.div
      initial={{ x: '110%' }}
      animate={{ x: 0 }}
      exit={{ x: '110%' }}
      transition={{ duration: 0.3, ease: OVERSHOOT }}
      className="story-panel-night pointer-events-auto absolute right-4 top-4 z-10 w-[min(88vw,300px)] p-5"
    >
      <h3 className="font-display text-xl font-extrabold text-[#FFF6E8]">Settings</h3>
      <div className="mt-4 flex flex-col gap-4">
        <VolumeSlider label="Master" value={settings.master} onChange={(v) => update({ master: v })} />
        <VolumeSlider label="Music" value={settings.music} onChange={(v) => update({ music: v })} />
        <VolumeSlider label="SFX" value={settings.sfx} onChange={(v) => update({ sfx: v })} />
        <button
          type="button"
          onClick={() => {
            emit('uiClick', undefined);
            update({ muted: !settings.muted });
          }}
          onMouseEnter={() => emit('uiHover', undefined)}
          className="stat-chip star-cursor pointer-events-auto justify-center"
        >
          {settings.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          {settings.muted ? 'Muted' : 'Sound on'}
        </button>
        <div className="text-left text-[11px] font-bold uppercase tracking-wider text-[#FFF6E8]/50">
          Controls — Arrows/WASD move · Space/Z jump · X run+fire · ↓ pipes · Esc pause · M mute
        </div>
        <button
          type="button"
          onClick={() => {
            emit('uiClick', undefined);
            onClose();
          }}
          className="btn-story btn-primary star-cursor w-full"
        >
          Done
        </button>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Pause Menu (4b)
// ---------------------------------------------------------------------------

function PauseMenu() {
  const navigate = useNavigate();
  const run = useGameStore((s) => s.run);
  const setStatus = useGameStore((s) => s.setStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const resume = () => {
    setStatus('playing');
    emit('pause', { paused: false });
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Backdrop />
      <Panel>
        <h2 className="font-display text-4xl font-extrabold text-[#1B1233]">Paused</h2>
        <div className="mt-5 flex flex-col gap-3">
          <StoryButton variant="primary" onClick={resume}>
            <Play size={16} /> Resume
          </StoryButton>
          <StoryButton onClick={() => reloadLevel(run.levelId)}>
            <RotateCcw size={16} /> Restart level
          </StoryButton>
          <StoryButton onClick={() => setSettingsOpen((v) => !v)}>
            <Settings size={16} /> Settings
          </StoryButton>
          <StoryButton variant="ghost" onClick={() => navigate('/map')}>
            <Home size={16} /> Save & quit to map
          </StoryButton>
        </div>
      </Panel>
      <AnimatePresence>
        {settingsOpen && <SettingsDrawer onClose={() => setSettingsOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Level Complete (4c) — tally animation + star reveal
// ---------------------------------------------------------------------------

const CLEAR_BONUS = 1000;

function LevelComplete() {
  const navigate = useNavigate();
  const run = useGameStore((s) => s.run);
  const addScore = useGameStore((s) => s.addScore);
  const stars = useGameStore((s) => s.progress.stars[s.run.levelId] ?? 1);
  const meta = useLevelMeta();

  const idx = LEVELS.findIndex((m) => m.id === run.levelId);
  const next = idx >= 0 && idx + 1 < LEVELS.length ? LEVELS[idx + 1] : null;

  const [displayTime, setDisplayTime] = useState(run.timeLeft);
  const [tallyDone, setTallyDone] = useState(false);
  const scoredRef = useRef(false);

  // time bonus counts down into the score (~1.2s odometer run)
  useEffect(() => {
    const total = useGameStore.getState().run.timeLeft;
    if (total <= 0) {
      setTallyDone(true);
      return;
    }
    const started = performance.now();
    const DUR = 1200;
    let tick = 0;
    const iv = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / DUR);
      setDisplayTime(Math.round(total * (1 - t)));
      if (tick++ % 3 === 0) playSfx('scoreTick');
      if (t >= 1) {
        window.clearInterval(iv);
        setTallyDone(true);
      }
    }, 40);
    return () => window.clearInterval(iv);
  }, []);

  // bank the bonus once the tally lands; chime per star
  useEffect(() => {
    if (!tallyDone || scoredRef.current) return;
    scoredRef.current = true;
    addScore(CLEAR_BONUS + useGameStore.getState().run.timeLeft * 10);
    const timers: number[] = [];
    for (let i = 0; i < stars; i++) {
      timers.push(window.setTimeout(() => playSfx('coin'), 350 + i * 220));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [tallyDone, stars, addScore]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Backdrop />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0, transition: { duration: 0.18 } }}
        transition={{ duration: 0.4, ease: OVERSHOOT }}
        className="story-panel pointer-events-auto relative w-[min(92vw,430px)] p-6 text-center"
      >
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#59D99C]">
          Level clear!
        </p>
        <h2 className="font-display mt-1 text-3xl font-extrabold text-[#1B1233]">
          {meta?.name ?? `World ${run.world}-${run.level}`}
        </h2>

        {/* tally rows */}
        <div className="mt-4 flex flex-col gap-1.5 text-sm font-extrabold uppercase tracking-wider text-[#1B1233]/80">
          <div className="flex justify-between">
            <span>Clear bonus</span>
            <span className="text-[#E8A50F]">+{CLEAR_BONUS}</span>
          </div>
          <div className="flex justify-between">
            <span>Time bonus</span>
            <span className="text-[#E8A50F]">
              {displayTime} × 10 = +{displayTime * 10}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="inline-flex items-center gap-1">
              <Coins size={14} className="text-[#E8A50F]" /> Coins
            </span>
            <span>×{run.coins}</span>
          </div>
        </div>

        {/* star rating reveal */}
        <div className="mt-4 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={tallyDone ? { scale: 1, rotate: 0 } : {}}
              transition={{ delay: 0.35 + i * 0.22, duration: 0.35, ease: OVERSHOOT }}
            >
              <StarIcon filled={i < stars} size={36} />
            </motion.span>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: tallyDone ? 1 : 0 }}
          transition={{ delay: 1.1, duration: 0.3 }}
          className="mt-5 flex flex-col gap-3"
        >
          {next && (
            <StoryButton variant="primary" onClick={() => navigate(`/game?level=${next.id}`)}>
              <Play size={16} /> Next level
            </StoryButton>
          )}
          <StoryButton onClick={() => reloadLevel(run.levelId)}>
            <RotateCcw size={16} /> Replay
          </StoryButton>
          <StoryButton variant="ghost" onClick={() => navigate('/map')}>
            <Home size={16} /> Map
          </StoryButton>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Game Over (4d) — continue with countdown ring, or quit to map
// ---------------------------------------------------------------------------

function GameOver() {
  const navigate = useNavigate();
  const run = useGameStore((s) => s.run);
  const continueRun = useGameStore((s) => s.useContinue);
  const canContinue = run.continues > 0;

  const R = 15;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Backdrop night />
      <Panel drop>
        <h2 className="font-display text-4xl font-extrabold text-[#FF5D7E]">Game Over</h2>
        <p className="mt-2 text-sm font-bold text-[#1B1233]/70">
          The stars dim… but only for a moment.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <div className="relative">
            <StoryButton
              variant="primary"
              disabled={!canContinue}
              onClick={() => {
                continueRun();
                reloadLevel(run.levelId);
              }}
            >
              <Heart size={16} fill="#1B1233" /> Continue ({run.continues} left · 3 lives)
            </StoryButton>
            {canContinue && (
              <svg
                viewBox="0 0 36 36"
                className="pointer-events-none absolute -right-2 -top-2 h-9 w-9 -rotate-90"
              >
                <circle cx="18" cy="18" r={R} fill="#FFF6E8" stroke="#1B1233" strokeWidth="3" />
                <motion.circle
                  cx="18"
                  cy="18"
                  r={R}
                  fill="none"
                  stroke="#FF5D7E"
                  strokeWidth="3"
                  strokeDasharray={CIRC}
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: CIRC }}
                  transition={{ duration: 10, ease: 'linear' }}
                  onAnimationComplete={() => navigate('/map')}
                />
              </svg>
            )}
          </div>
          <StoryButton variant="ghost" onClick={() => navigate('/map')}>
            <Home size={16} /> Quit to map
          </StoryButton>
        </div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Win Screen (4e) — after 8-4: star shower + stats + credits link
// ---------------------------------------------------------------------------

const HEADLINE = 'YOU SAVED THE STARCLOUD!';

function StarShower() {
  const stars = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: (i * 37 + 11) % 100,
        delay: (i % 12) * 0.55,
        dur: 4 + (i % 5) * 0.9,
        size: 10 + (i % 4) * 5,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <motion.span
          key={s.id}
          className="absolute -top-8"
          style={{ left: `${s.left}%` }}
          animate={{ y: ['0vh', '115vh'], rotate: [0, 220], opacity: [0, 1, 1, 0.6] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'linear' }}
        >
          <Star size={s.size} className="text-[#FFC93C]" fill="#FFC93C" />
        </motion.span>
      ))}
    </div>
  );
}

function WinScreen() {
  const navigate = useNavigate();
  const run = useGameStore((s) => s.run);
  const totalStars = useGameStore((s) =>
    Object.values(s.progress.stars).reduce((a, b) => a + b, 0),
  );
  const maxStars = LEVELS.length * 3;

  const stats: { label: string; value: string; icon: ReactNode }[] = [
    { label: 'Total score', value: String(run.score).padStart(6, '0'), icon: <Star size={14} className="text-[#E8A50F]" fill="#E8A50F" /> },
    { label: 'Coins', value: `×${run.coins}`, icon: <Coins size={14} className="text-[#E8A50F]" /> },
    { label: 'Stars', value: `${totalStars}/${maxStars}`, icon: <Star size={14} className="text-[#E8A50F]" /> },
    { label: 'Deaths', value: `×${run.deaths}`, icon: <Skull size={14} className="text-[#FF5D7E]" /> },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0 bg-[#1B1233]/85" />
      <StarShower />
      <Panel className="w-[min(92vw,470px)]">
        <h2 className="font-display text-3xl font-extrabold leading-tight text-[#E8A50F] sm:text-4xl">
          {HEADLINE.split('').map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 14, scale: 0.6 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.035, duration: 0.3, ease: OVERSHOOT }}
              className="inline-block"
            >
              {ch === ' ' ? ' ' : ch}
            </motion.span>
          ))}
        </h2>
        <p className="mt-2 text-sm font-bold text-[#1B1233]/70">
          Pip brought the starlight home. Thank you for playing!
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.15, duration: 0.35, ease: OVERSHOOT }}
              className="rounded-xl border-[3px] border-[#1B1233] bg-[#F2E4CE] px-3 py-2"
            >
              <span className="flex items-center justify-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1B1233]/60">
                {s.icon} {s.label}
              </span>
              <span className="font-display text-xl font-extrabold text-[#1B1233]">{s.value}</span>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.3 }}
          className="mt-5 flex flex-col gap-3"
        >
          <StoryButton variant="primary" onClick={() => navigate('/map')}>
            <Play size={16} /> Free play (map)
          </StoryButton>
          <StoryButton onClick={() => navigate('/credits')}>
            <Star size={16} /> Credits
          </StoryButton>
        </motion.div>
      </Panel>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root — render per run.status
// ---------------------------------------------------------------------------

export default function Overlays(): JSX.Element | null {
  const status = useGameStore((s) => s.run.status);

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <AnimatePresence mode="wait">
        {status === 'intro' && <IntroCard key="intro" />}
        {status === 'paused' && <PauseMenu key="pause" />}
        {status === 'complete' && <LevelComplete key="complete" />}
        {status === 'gameover' && <GameOver key="gameover" />}
        {status === 'win' && <WinScreen key="win" />}
      </AnimatePresence>
    </div>
  );
}
