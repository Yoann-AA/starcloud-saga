import { Link } from 'react-router';

const KEY_CHIPS = ['← → move', 'Space jump', 'X run', 'P pause'];

export default function Footer() {
  return (
    <footer className="border-t-[3px] border-[#1B1233] bg-[#33245E]">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/logo-star.svg" alt="" className="h-9 w-9" />
            <span className="font-display text-xl font-extrabold text-[#FFF6E8]">
              STARCLOUD <span className="text-[#FFC93C]">SAGA</span>
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#FFF6E8]/70">
            An original star-sprite platformer — 32 handcrafted levels across 8 worlds.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#FFC93C]">Quick links</h3>
          <ul className="mt-3 space-y-2 text-sm font-bold text-[#FFF6E8]/80">
            <li><Link className="star-cursor hover:text-[#FFC93C]" to="/map">World Map</Link></li>
            <li><Link className="star-cursor hover:text-[#FFC93C]" to="/worlds">Worlds Showcase</Link></li>
            <li><Link className="star-cursor hover:text-[#FFC93C]" to="/guide">How to Play</Link></li>
            <li><Link className="star-cursor hover:text-[#FFC93C]" to="/credits">Credits</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#FFC93C]">Made with Three.js</h3>
          <p className="mt-3 text-sm font-semibold text-[#FFF6E8]/70">
            Real-time 3D rendering with React Three Fiber. All music synthesized live with WebAudio.
          </p>
          <p className="mt-3 text-xs font-bold text-[#FFF6E8]/50">
            100% original characters, art &amp; music. Not affiliated with Nintendo.
          </p>
        </div>
      </div>
      <div className="border-t border-[#1B1233]/40">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-4">
          <span className="text-xs font-bold text-[#FFF6E8]/50">© STARCLOUD SAGA</span>
          <div className="flex flex-wrap gap-2">
            {KEY_CHIPS.map((k) => (
              <span key={k} className="stat-chip text-[10px]">{k}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
