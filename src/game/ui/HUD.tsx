import { motion } from 'framer-motion';
import { Cherry, Coins, Flame, Heart, Pause, Sparkles, Volume2, VolumeX, Star } from 'lucide-react';
import type { PowerState } from '../engine/types';
import { LEVELS } from '../levels/index';
import { useGameStore } from '../state/store';
import { emit } from '../engine/events';
import { setMuted } from '../audio/engine';

function pad(n: number, len: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(len, '0');
}

/** Power-state chip config (small shows nothing). */
const POWER_CHIPS: Record<Exclude<PowerState, 'small'>, { label: string; color: string; Icon: typeof Flame }> = {
  berry: { label: 'Berry', color: '#FF5D7E', Icon: Cherry },
  ember: { label: 'Ember', color: '#FF6B35', Icon: Flame },
  comet: { label: 'Comet', color: '#FFC93C', Icon: Sparkles },
};

/** In-game HUD: score / coins / lives / world / timer + pause & mute buttons. */
export default function HUD({
  onPause,
}: {
  onPause: () => void;
}) {
  const run = useGameStore((s) => s.run);
  const muted = useGameStore((s) => s.settings.muted);
  const setSettings = useGameStore((s) => s.setSettings);
  const totalStars = useGameStore((s) =>
    Object.values(s.progress.stars).reduce((a, b) => a + b, 0),
  );
  const meta = LEVELS.find((m) => m.id === run.levelId);
  const timeWarning = run.timeLeft < 100;

  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-4"
    >
      {/* left cluster */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="stat-chip">
          <span className="opacity-70">Score</span> {pad(run.score, 6)}
        </span>
        <span className="stat-chip">
          <Coins size={14} className="text-[#FFC93C]" /> ×{pad(run.coins, 2)}
        </span>
        <span className="stat-chip">
          <Heart size={14} className="text-[#FF5D7E]" fill="#FF5D7E" /> ×{run.lives}
        </span>
        {run.power !== 'small' && (
          <span className="stat-chip" style={{ color: POWER_CHIPS[run.power].color }}>
            {(() => {
              const { Icon, label } = POWER_CHIPS[run.power];
              return (
                <>
                  <Icon size={14} /> {label}
                </>
              );
            })()}
          </span>
        )}
      </div>

      {/* center */}
      <div className="hidden flex-col items-center sm:flex">
        <span
          className="font-display text-xl font-extrabold text-[#FFF6E8] text-shadow-ink"
        >
          WORLD {meta ? `${meta.world}-${meta.level}` : run.levelId}
        </span>
        <span className="text-xs font-bold tracking-wider text-[#FFF6E8]/70 uppercase">
          {meta?.name ?? ''}
        </span>
      </div>

      {/* right cluster */}
      <div className="flex items-center gap-2">
        <motion.span
          animate={timeWarning ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={timeWarning ? { repeat: Infinity, duration: 1 } : { duration: 0.2 }}
          className="stat-chip"
          style={timeWarning ? { color: '#FF6B35', borderColor: '#FF6B35' } : undefined}
        >
          <span className="opacity-70">Time</span> {pad(run.timeLeft, 3)}
        </motion.span>
        <span className="stat-chip">
          <Star size={14} className="text-[#FFC93C]" fill="#FFC93C" />
          {totalStars}
        </span>
        <button
          type="button"
          aria-label={muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            const next = !muted;
            setSettings({ muted: next });
            setMuted(next);
            emit('uiClick', undefined);
          }}
          className="stat-chip pointer-events-auto star-cursor transition-transform hover:-translate-y-0.5"
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          type="button"
          aria-label="Pause"
          onClick={() => {
            emit('uiClick', undefined);
            onPause();
          }}
          className="stat-chip pointer-events-auto star-cursor transition-transform hover:-translate-y-0.5"
        >
          <Pause size={16} />
        </button>
      </div>
    </motion.div>
  );
}
