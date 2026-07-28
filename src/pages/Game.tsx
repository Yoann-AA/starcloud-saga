import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, Flame, Zap } from 'lucide-react';
import GameCanvas from '../game/engine/GameCanvas';
import { emit } from '../game/engine/events';
import { bindKeyboard, resetInput, setTouchInput } from '../game/engine/input';
import { loadLevel } from '../game/engine/level';
import { initAudio, startMusic, stopMusic } from '../game/audio/engine';
import { registerAllEntities } from '../game/entities';
import HUD from '../game/ui/HUD';
import Overlays from '../game/ui/overlays/Overlays';
import { FIRST_LEVEL_ID, LEVELS } from '../game/levels';
import { useGameStore } from '../game/state/store';
import '../game/engine/sim/bot'; // dev-only: installs window.__sim QA hook

// register entity defs exactly once before the first loadLevel
let entitiesRegistered = false;
function ensureEntities(): void {
  if (!entitiesRegistered) {
    registerAllEntities();
    entitiesRegistered = true;
  }
}

/** Audio seam driver: init on first interaction, music follows the level theme. */
function AudioDriver({ theme }: { theme: string }) {
  useEffect(() => {
    const init = () => initAudio();
    window.addEventListener('pointerdown', init, { once: true });
    window.addEventListener('keydown', init, { once: true });
    startMusic(theme);
    return () => {
      window.removeEventListener('pointerdown', init);
      window.removeEventListener('keydown', init);
      stopMusic();
    };
  }, [theme]);
  return null;
}

function TouchButton({
  label,
  className,
  onChange,
  size = 72,
}: {
  label: ReactNode;
  className?: string;
  onChange: (pressed: boolean) => void;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label="touch control"
      className={`pointer-events-auto flex items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#241A45]/45 text-[#FFF6E8] backdrop-blur-sm transition-transform active:scale-90 ${className ?? ''}`}
      style={{ width: size, height: size, touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        navigator.vibrate?.(10);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** On-screen controls, shown only on coarse-pointer (touch) devices. */
function TouchControls() {
  const [coarse, setCoarse] = useState(false);
  const power = useGameStore((s) => s.run.power);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setCoarse(mq.matches);
    const cb = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  if (!coarse) return null;

  return (
    <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-4 pb-6 pointer-events-none">
      <div className="flex gap-3">
        <TouchButton label={<ChevronLeft size={34} />} onChange={(v) => setTouchInput('left', v)} />
        <TouchButton label={<ChevronRight size={34} />} onChange={(v) => setTouchInput('right', v)} />
        <TouchButton
          label={<ChevronDown size={30} />}
          size={60}
          onChange={(v) => setTouchInput('down', v)}
        />
      </div>
      <div className="flex items-end gap-3">
        {power === 'ember' && (
          <TouchButton
            label={<Flame size={28} />}
            className="bg-[#FF6B35]/60"
            onChange={(v) => setTouchInput('shoot', v)}
          />
        )}
        <TouchButton
          label={<Zap size={28} />}
          className="bg-[#FF5D7E]/50"
          onChange={(v) => setTouchInput('run', v)}
        />
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <TouchButton
            label={<span className="font-display text-lg font-extrabold">A</span>}
            size={96}
            className="bg-[#4FC4FF]/50"
            onChange={(v) => setTouchInput('jump', v)}
          />
        </motion.div>
      </div>
    </div>
  );
}

export default function Game() {
  const [params] = useSearchParams();
  const startLevel = useGameStore((s) => s.startLevel);
  const setStatus = useGameStore((s) => s.setStatus);
  const setTimeLeft = useGameStore((s) => s.setTimeLeft);
  const status = useGameStore((s) => s.run.status);
  const introTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // resolve ?level= param (default: furthest unlocked, else first level)
  const level = useMemo(() => {
    ensureEntities();
    const requested = params.get('level');
    const unlocked = useGameStore.getState().progress.unlocked;
    const fallback =
      [...LEVELS].reverse().find(
        (m) => m.id === FIRST_LEVEL_ID || unlocked.includes(m.id),
      ) ?? LEVELS[0];
    const id = requested && LEVELS.some((m) => m.id === requested) ? requested : fallback.id;
    return loadLevel(id);
  }, [params]);

  // start the run for this level
  useEffect(() => {
    startLevel(level.id, level.world, level.level);
    setTimeLeft(level.timeLimit);
    // intro card auto-dismiss (Overlays pod renders the visual card)
    introTimer.current = setTimeout(() => {
      if (useGameStore.getState().run.status === 'intro') setStatus('playing');
    }, 1600);
    return () => {
      if (introTimer.current) clearTimeout(introTimer.current);
      resetInput();
    };
  }, [level, startLevel, setStatus, setTimeLeft]);

  // keyboard input + pause/mute/dismiss-intro keys
  useEffect(() => {
    const unbind = bindKeyboard();
    const onKey = (e: KeyboardEvent) => {
      const s = useGameStore.getState();
      if (s.run.status === 'intro' && e.code !== 'Escape') {
        setStatus('playing');
        return;
      }
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (s.run.status === 'playing') {
          s.setStatus('paused');
          emit('pause', { paused: true });
        } else if (s.run.status === 'paused') {
          s.setStatus('playing');
          emit('pause', { paused: false });
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unbind();
      window.removeEventListener('keydown', onKey);
    };
  }, [setStatus]);

  // auto-pause when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      const s = useGameStore.getState();
      if (document.hidden && s.run.status === 'playing') {
        s.setStatus('paused');
        emit('pause', { paused: true });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#241A45]">
      <GameCanvas key={level.id} level={level} />
      <HUD
        onPause={() => {
          if (status === 'playing') {
            setStatus('paused');
            emit('pause', { paused: true });
          }
        }}
      />
      <Overlays />
      <TouchControls />
      <AudioDriver theme={level.theme} />
    </div>
  );
}
