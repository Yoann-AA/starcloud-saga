import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Play, Star, X } from 'lucide-react';
import { LEVELS } from '../game/levels/index';
import { useGameStore } from '../game/state/store';
import { emit } from '../game/engine/events';

const LINKS = [
  { to: '/', label: 'Title' },
  { to: '/map', label: 'Map' },
  { to: '/worlds', label: 'Worlds' },
  { to: '/guide', label: 'Guide' },
  { to: '/credits', label: 'Credits' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const totalStars = useGameStore((s) =>
    Object.values(s.progress.stars).reduce((a, b) => a + b, 0),
  );
  const maxStars = LEVELS.length * 3;

  return (
    <header className="sticky top-0 z-50 h-[72px] border-b-[3px] border-[#1B1233] bg-[#241A45]/85 backdrop-blur-[12px]">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-4 px-4">
        {/* logo */}
        <Link to="/" className="star-cursor flex items-center gap-2.5" onClick={() => emit('uiClick', undefined)}>
          <img src="/logo-star.svg" alt="STARCLOUD SAGA star logo" className="h-9 w-9" />
          <span className="font-display text-[22px] font-extrabold tracking-tight text-[#FFF6E8]">
            STARCLOUD <span className="text-[#FFC93C]">SAGA</span>
          </span>
        </Link>

        {/* center nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onMouseEnter={() => emit('uiHover', undefined)}
              className={({ isActive }) =>
                `group relative text-sm font-extrabold uppercase tracking-[0.08em] transition-colors ${
                  isActive ? 'text-[#FFC93C]' : 'text-[#FFF6E8]/80 hover:text-[#FFF6E8]'
                }`
              }
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[3px] w-0 rounded-full bg-[#FFC93C] transition-all duration-200 group-hover:w-full" />
            </NavLink>
          ))}
        </nav>

        {/* right cluster */}
        <div className="flex items-center gap-3">
          <span className="stat-chip hidden sm:inline-flex">
            <Star size={14} className="text-[#FFC93C]" fill="#FFC93C" />
            {totalStars}/{maxStars}
          </span>
          <button
            type="button"
            className="btn-story btn-primary star-cursor hidden md:inline-flex"
            onClick={() => {
              emit('uiClick', undefined);
              navigate('/game');
            }}
          >
            <Play size={16} fill="#1B1233" /> Play
          </button>
          <button
            type="button"
            aria-label="Open menu"
            className="star-cursor flex h-11 w-11 items-center justify-center rounded-[14px] border-[3px] border-[#1B1233] bg-[#33245E] text-[#FFF6E8] md:hidden"
            onClick={() => setOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* mobile full-screen menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[#241A45]/97 backdrop-blur-lg md:hidden"
          >
            <div className="flex h-[72px] items-center justify-between px-4">
              <span className="font-display text-xl font-extrabold text-[#FFF6E8]">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                className="flex h-11 w-11 items-center justify-center rounded-[14px] border-[3px] border-[#1B1233] bg-[#33245E] text-[#FFF6E8]"
                onClick={() => setOpen(false)}
              >
                <X size={22} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col items-center justify-center gap-6">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ opacity: 0, y: 24, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <Link
                    to={l.to}
                    className="font-display text-4xl font-extrabold text-[#FFF6E8] hover:text-[#FFC93C]"
                    onClick={() => setOpen(false)}
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: LINKS.length * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <Link to="/game" className="btn-story btn-primary mt-4 text-lg" onClick={() => setOpen(false)}>
                  <Play size={18} fill="#1B1233" /> Play
                </Link>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
