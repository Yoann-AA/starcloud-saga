// Worlds Showcase (/worlds) — scroll-pinned editorial tour of all 8 worlds.
// GSAP ScrollTrigger pinned storytelling on desktop, stacked fade-ups on mobile.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown, Lock, Play, Star, X } from 'lucide-react';
import { LEVELS } from '../game/levels';

gsap.registerPlugin(ScrollTrigger);

/** Real level names for a world from the level registry (empty if missing). */
function worldLevelNames(world: number): string[] {
  return LEVELS.filter((m) => m.world === world)
    .sort((a, b) => a.level - b.level)
    .map((m) => m.name);
}

interface WorldInfo {
  n: number;
  name: string;
  tag: string;
  lore: string;
  primary: string;
  secondary: string;
  skyFrom: string;
  skyTo: string;
  par: string;
  mechanic: string;
  foes: string[];
  boss: string;
  bossHint: string;
  image: string;
  levels: string[];
}

const WORLDS: WorldInfo[] = [
  {
    n: 1,
    name: 'Sunsprout Meadow',
    tag: 'Meadow · Where it all begins',
    lore: 'Soft green hills roll out beneath a honeyed sunrise, and every gap is just friendly enough to make you brave. This is where Pip first learns that stars, once scattered, can always be gathered home.',
    primary: '#59D99C',
    secondary: '#8FE388',
    skyFrom: '#7EC8FF',
    skyTo: '#C9F0FF',
    par: '~4 min',
    mechanic: 'First ? blocks & flagpoles',
    foes: ['Waddler shuffles in', 'Coins everywhere'],
    boss: 'Brambleback',
    bossHint: 'He charges in straight lines — jump him, then dive for the switch behind.',
    image: '/world-w1.png',
    levels: ['First Light Fields', 'Clover Crossing', 'Petalpipe Hollow', "Brambleback's Keep"],
  },
  {
    n: 2,
    name: 'Emberdune Expanse',
    tag: 'Desert · Ruins under a heat-shimmer sky',
    lore: 'Beyond the meadow the sand glows like warm brass, burying a half-forgotten ruin city. Platforms sink, the horizon wobbles, and something keeps popping up where you least expect it.',
    primary: '#F2B84B',
    secondary: '#E07B3F',
    skyFrom: '#FFD98A',
    skyTo: '#FFF1C9',
    par: '~5 min',
    mechanic: 'Sinking platforms & quicksand',
    foes: ['Burrower joins the chase', 'Quicksand pits'],
    boss: 'Scorch Sentinel',
    bossHint: 'Its armor glows before it slams — strike during the cooldown.',
    image: '/world-w2.png',
    levels: ['Sunspill Dunes', 'Sunken Relic Road', 'Quicksand Bazaar', "Scorch Sentinel's Gate"],
  },
  {
    n: 3,
    name: 'Glaciom Peaks',
    tag: 'Snow · Slippery slopes & frozen falls',
    lore: 'The air turns to crystal and the ground stops keeping its promises. Ice steals your friction, snowballs gather speed, and frozen waterfalls hang like paused music.',
    primary: '#9ADCF5',
    secondary: '#EAF7FF',
    skyFrom: '#A8C8F0',
    skyTo: '#E8F4FF',
    par: '~5 min',
    mechanic: 'Reduced-friction ice tiles',
    foes: ['Hopper finds its rhythm', 'Snowball rollers'],
    boss: 'Frostjaw',
    bossHint: 'It slides farther than you do. Lure it onto bare stone before you leap.',
    image: '/world-w3.png',
    levels: ['Frostfall Steps', 'Snowdrift Switchbacks', 'Frozen Falls Crossing', "Frostjaw's Den"],
  },
  {
    n: 4,
    name: 'Nimbus Heights',
    tag: 'Sky · Floating islands above the world',
    lore: 'Up here the ground is a rumor and the clouds are trampolines. Wind gusts rewrite your jumps mid-air, and every island drifts like it has somewhere better to be.',
    primary: '#7FB0FF',
    secondary: '#FFFFFF',
    skyFrom: '#6FA8FF',
    skyTo: '#E3EEFF',
    par: '~6 min',
    mechanic: 'Bouncy cloudtops & wind gusts',
    foes: ['Flapper rides the sine wave', 'Moving clouds'],
    boss: 'Storm Roc',
    bossHint: 'When it dives, the shadow arrives first. Watch the ground, not the bird.',
    image: '/world-w4.png',
    levels: ['Cloudhop Causeway', 'Gale Garden', 'Bounce-Top Boulevard', "Storm Roc's Roost"],
  },
  {
    n: 5,
    name: 'Verdant Wilds',
    tag: 'Jungle · Canopy, vines & hidden pools',
    lore: 'A green cathedral where the light arrives in coins of gold. Vines swing on perfect arcs, springs hide under every leaf, and the Turtleaf population is entirely out of hand.',
    primary: '#2FA36B',
    secondary: '#B7E34C',
    skyFrom: '#6FBF8A',
    skyTo: '#D9F2C2',
    par: '~6 min',
    mechanic: 'First springs & vine swings',
    foes: ['Turtleaf swarms', 'Shell ricochets'],
    boss: 'Thornmaw',
    bossHint: 'Its bloom opens wide before the bite — that is your only invitation.',
    image: '/world-w5.png',
    levels: ['Canopy Crawl', 'Vine Swing Vale', 'Turtleaf Thicket', "Thornmaw's Maw"],
  },
  {
    n: 6,
    name: 'Luminar Hollow',
    tag: 'Crystal Cave · Low gravity & glowing stone',
    lore: 'Beneath the wilds, the earth cracks open into violet light. Gravity forgets itself in pockets, platforms crumble like sugar glass, and every crystal hums a note you can almost remember.',
    primary: '#9B7BFF',
    secondary: '#59E3D9',
    skyFrom: '#3B2D6E',
    skyTo: '#6E5BB5',
    par: '~7 min',
    mechanic: 'Low-gravity pockets & crumbling crystal',
    foes: ['Spikepod — unstompable', 'Fading glow platforms'],
    boss: 'Prism Warden',
    bossHint: 'It splits into reflections. Only the one that casts a shadow is real.',
    image: '/world-w6.png',
    levels: ['Glimmervein Descent', 'Low-Glow Grotto', 'Prismfall Gallery', "Prism Warden's Vault"],
  },
  {
    n: 7,
    name: 'Cinderveil Caldera',
    tag: 'Volcano · Lava rivers & timed eruptions',
    lore: 'The mountain breathes, and it is not in a good mood. Lava climbs on a schedule, geysers fire in patterns, and basalt bridges are more of a suggestion than a promise.',
    primary: '#FF6B35',
    secondary: '#8A4A2B',
    skyFrom: '#B33B2E',
    skyTo: '#4A1F1F',
    par: '~7 min',
    mechanic: 'Rising lava & fireball geysers',
    foes: ['Lava — instant regret', 'Timed eruptions'],
    boss: 'Magmawyrm',
    bossHint: 'It surfaces where the lava bubbles brightest. Never stand still.',
    image: '/world-w7.png',
    levels: ['Emberline Rim', 'Geyser Gauntlet', 'Rising Tide of Fire', "Magmawyrm's Forge"],
  },
  {
    n: 8,
    name: 'Umbra Fortress',
    tag: 'Shadow Fortress · The final keep',
    lore: 'Every lesson you ever learned, stacked into one violet storm of a castle. The timers are tighter, the gaps are meaner, and at the top waits the knight who scattered the stars.',
    primary: '#5B3FD4',
    secondary: '#2A1B4A',
    skyFrom: '#1B1233',
    skyTo: '#3D2A6E',
    par: '~8 min',
    mechanic: 'Everything, combined',
    foes: ['Every foe returns', 'Tightest timers'],
    boss: 'Umbra Knight',
    bossHint: 'Three ember hits — or one brave dash for the bridge switch over the lava.',
    image: '/world-w8.png',
    levels: ['Shadowgate Approach', 'Voidlight Halls', 'The Gauntlet Reborn', "Umbra Knight's Throne"],
  },
];

interface BossInfo {
  name: string;
  world: string;
  color: string;
  art?: string;
  silhouette: string;
  lore: string;
  strategy: string;
}

const BOSSES: BossInfo[] = [
  {
    name: 'Brambleback',
    world: 'World 1 · Sunsprout Meadow',
    color: '#59D99C',
    silhouette: 'M50 78 C30 78 22 64 24 52 C26 42 34 38 40 40 C42 30 52 26 58 32 C66 26 78 32 78 44 C86 46 88 56 84 62 C80 72 68 78 50 78 Z',
    lore: 'A bramble-armored boar who naps in the meadow castle and hates being woken. His thorny hide shrugs off stomps.',
    strategy: 'He telegraphs his charge — bait him into the wall, then hit the switch while he is dizzy.',
  },
  {
    name: 'Scorch Sentinel',
    world: 'World 2 · Emberdune Expanse',
    color: '#F2B84B',
    silhouette: 'M50 82 L34 82 L30 54 L38 50 L36 34 L50 22 L64 34 L62 50 L70 54 L66 82 Z',
    lore: 'A terracotta war-statue that guarded the ruin city long before the sand swallowed it. Still on duty. Still grumpy.',
    strategy: 'Its chest plate glows before each slam — three ember hits during the cooldown cracks it open.',
  },
  {
    name: 'Frostjaw',
    world: 'World 3 · Glaciom Peaks',
    color: '#9ADCF5',
    silhouette: 'M22 70 C22 50 34 38 50 38 C66 38 78 50 78 70 L70 70 L66 60 L58 70 L50 60 L42 70 L34 60 L30 70 Z',
    lore: 'A glacier-toothed yeti of the high peaks who hoards anything shiny — including, unfortunately, a piece of the Starcloud.',
    strategy: 'It cannot turn on bare stone. Keep the fight off the ice and stomp between lunges.',
  },
  {
    name: 'Storm Roc',
    world: 'World 4 · Nimbus Heights',
    color: '#7FB0FF',
    art: '/boss-w4.png',
    silhouette: 'M50 30 C60 30 68 38 68 48 L84 40 L76 54 L88 56 L72 64 C70 74 62 80 50 80 C38 80 30 74 28 64 L12 56 L24 54 L16 40 L32 48 C32 38 40 30 50 30 Z',
    lore: 'A giant feathered cloud-bird whose wingbeats summon the gales of Nimbus Heights. The nest holds a stolen star-fragment.',
    strategy: 'Its shadow lands a heartbeat before it does. Sidestep the dive, then stomp while it is grounded.',
  },
  {
    name: 'Thornmaw',
    world: 'World 5 · Verdant Wilds',
    color: '#2FA36B',
    silhouette: 'M50 80 C36 80 28 70 28 58 C28 46 38 40 50 40 C62 40 72 46 72 58 C72 70 64 80 50 80 Z M50 40 L42 24 L50 32 L58 24 Z',
    lore: 'A carnivorous jungle bloom the size of a castle gate. It has eaten three flagpoles and shows no remorse.',
    strategy: 'When the petals open wide, the soft heart is exposed — one clean stomp per bloom. Three will do it.',
  },
  {
    name: 'Prism Warden',
    world: 'World 6 · Luminar Hollow',
    color: '#9B7BFF',
    silhouette: 'M50 18 L70 44 L62 80 L38 80 L30 44 Z M50 18 L50 80',
    lore: 'A living crystal that sings in four-part harmony with its own reflections. It considers the Hollow its choir hall.',
    strategy: 'Only the reflection that casts a shadow can be hurt — and can hurt you. Strike the real one.',
  },
  {
    name: 'Magmawyrm',
    world: 'World 7 · Cinderveil Caldera',
    color: '#FF6B35',
    silhouette: 'M18 74 C30 60 26 48 38 44 C32 34 40 24 52 28 C50 20 60 16 66 24 C78 22 84 34 76 42 C86 50 80 64 68 64 C72 72 60 80 50 74 C40 82 24 82 18 74 Z',
    lore: 'A serpent of cooling basalt and running fire, coiled around the caldera vent. It dreams in eruptions.',
    strategy: 'It surfaces where the lava bubbles brightest. Keep moving, and answer each surfacing with an ember.',
  },
  {
    name: 'Umbra Knight',
    world: 'World 8 · Umbra Fortress',
    color: '#5B3FD4',
    art: '/boss-w8.png',
    silhouette: 'M50 14 L58 24 L56 34 L68 40 L64 50 L70 82 L30 82 L36 50 L32 40 L44 34 L42 24 Z',
    lore: 'The shadow-armored guardian who shattered the Starcloud and scattered its light across eight worlds. It has been waiting for you.',
    strategy: 'Three ember hits will crack the armor — or dash past and cut the bridge switch over the lava. Your call, hero.',
  },
];

/* Small storybook chip */
function Chip({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-[#1B1233] px-3 py-1 text-xs font-extrabold uppercase tracking-[0.08em]"
      style={{ background: color ?? '#33245E', color: color ? '#1B1233' : '#FFF6E8' }}
    >
      {children}
    </span>
  );
}

export default function Worlds() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [modalBoss, setModalBoss] = useState<BossInfo | null>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Intro title character pop-in (12 chars) + scroll cue + progress rail
      gsap.fromTo(
        '.worlds-title-char',
        { yPercent: 120, opacity: 0, scale: 0.7 },
        {
          yPercent: 0,
          opacity: 1,
          scale: 1,
          duration: 0.7,
          ease: 'back.out(1.8)',
          stagger: 0.045,
          delay: 0.15,
        },
      );
      gsap.fromTo(
        '.worlds-rail',
        { x: 60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.6 },
      );

      mm.add('(min-width: 1024px)', () => {
        const sections = gsap.utils.toArray<HTMLElement>('.world-segment');
        sections.forEach((section, i) => {
          const panel = section.querySelector('.world-panel');
          const diorama = section.querySelector('.world-diorama');
          const contentItems = section.querySelectorAll('.world-reveal');
          const bg = section.querySelector('.world-sky');

          // pin each 150vh segment's inner panel
          ScrollTrigger.create({
            trigger: section,
            start: 'top top',
            end: 'bottom bottom',
            pin: panel,
            pinSpacing: false,
          });

          // world sky crossfades in over the segment
          if (bg) {
            gsap.fromTo(
              bg,
              { opacity: 0 },
              {
                opacity: 1,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top 80%', end: 'top 10%', scrub: true },
              },
            );
          }

          // diorama settles: scale 1.15 → 1, rotate 2° → 0
          if (diorama) {
            gsap.fromTo(
              diorama,
              { scale: 1.15, rotate: 2 },
              {
                scale: 1,
                rotate: 0,
                ease: 'none',
                scrollTrigger: { trigger: section, start: 'top bottom', end: 'top top', scrub: true },
              },
            );
          }

          // content stack slides in right-to-left, staggered
          gsap.fromTo(
            contentItems,
            { x: 60, opacity: 0 },
            {
              x: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'back.out(1.4)',
              stagger: 0.1,
              scrollTrigger: { trigger: section, start: 'top 55%', toggleActions: 'play none none reverse' },
            },
          );

          // slight parallax exit for depth
          gsap.to(contentItems, {
            y: -30,
            ease: 'none',
            scrollTrigger: { trigger: section, start: 'bottom bottom', end: 'bottom top', scrub: true },
          });

          // progress rail active state
          ScrollTrigger.create({
            trigger: section,
            start: 'top 50%',
            end: 'bottom 50%',
            onEnter: () => setActive(i),
            onEnterBack: () => setActive(i),
          });
        });
      });

      mm.add('(max-width: 1023px)', () => {
        // mobile: no pinning, simple fade-up reveals
        gsap.utils.toArray<HTMLElement>('.world-segment').forEach((section, i) => {
          gsap.fromTo(
            section.querySelectorAll('.world-reveal, .world-diorama'),
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: 'power3.out',
              stagger: 0.08,
              scrollTrigger: { trigger: section, start: 'top 75%', toggleActions: 'play none none none' },
            },
          );
          ScrollTrigger.create({
            trigger: section,
            start: 'top 60%',
            end: 'bottom 40%',
            onEnter: () => setActive(i),
            onEnterBack: () => setActive(i),
          });
        });
      });

      // boss gallery + outro reveals
      gsap.utils.toArray<HTMLElement>('.pop-in-view').forEach((el) => {
        gsap.fromTo(
          el,
          { scale: 0.8, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: 0.55,
            ease: 'back.out(1.7)',
            scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  // lock body scroll while boss modal is open
  useEffect(() => {
    document.body.style.overflow = modalBoss ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalBoss]);

  return (
    <div ref={rootRef} className="relative">
      {/* progress rail */}
      <nav
        aria-label="World progress"
        className="worlds-rail fixed right-3 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2.5 lg:flex"
      >
        {WORLDS.map((w, i) => (
          <div key={w.n} className="flex items-center gap-2">
            <span
              className="text-[10px] font-extrabold tracking-[0.08em] transition-colors"
              style={{ color: active === i ? w.primary : 'rgba(255,246,232,0.45)' }}
            >
              W{w.n}
            </span>
            <span
              className="block h-3.5 w-3.5 rounded-full border-2 border-[#1B1233] transition-all duration-300"
              style={{
                background: active === i ? w.primary : 'rgba(51,36,94,0.9)',
                transform: active === i ? 'scale(1.35)' : 'scale(1)',
                boxShadow: active === i ? `0 0 10px ${w.primary}` : 'none',
              }}
            />
          </div>
        ))}
      </nav>

      {/* Section 1 — intro */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-4 text-center">
        <h1
          className="font-display text-[clamp(3rem,10vw,5.5rem)] font-extrabold leading-none text-[#FFF6E8]"
          style={{ textShadow: '6px 6px 0 rgba(255,201,60,0.55)' }}
          aria-label="Eight Worlds"
        >
          {'EIGHT WORLDS'.split('').map((ch, i) => (
            <span key={i} className="worlds-title-char inline-block will-change-transform" aria-hidden>
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-xl text-lg font-semibold text-[#FFF6E8]/75">
          Scroll to travel from Sunsprout Meadow to the Umbra Fortress — eight hand-built dioramas,
          thirty-two levels, one scattered sky.
        </p>
        <div className="mt-14 flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-[#1B1233] bg-[#FFC93C] shadow-[0_6px_0_rgba(27,18,51,0.35)]">
            <ChevronDown size={26} className="bob-sine text-[#1B1233]" />
          </span>
          <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-[#FFC93C]">
            Scroll to begin the tour
          </span>
        </div>
      </section>

      {/* Sections 2–9 — one pinned panel per world */}
      {WORLDS.map((w) => (
        <section key={w.n} className="world-segment relative lg:h-[150vh]">
          {/* world sky gradient backdrop */}
          <div
            className="world-sky pointer-events-none absolute inset-0"
            style={{ background: `linear-gradient(180deg, ${w.skyFrom} 0%, ${w.skyTo} 60%, #241A45 100%)`, opacity: 0.35 }}
            aria-hidden
          />
          {/* faint world silhouette shapes */}
          <svg
            className="pointer-events-none absolute bottom-0 left-0 w-full opacity-[0.12]"
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 200 L0 140 Q120 60 260 130 T520 120 Q640 40 780 130 T1200 110 L1200 200 Z"
              fill={w.primary}
            />
            <circle cx="980" cy="60" r="38" fill={w.secondary} />
          </svg>

          <div className="world-panel relative flex min-h-[100dvh] items-center">
            <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-4 py-20 lg:grid-cols-[55%_45%] lg:gap-6">
              {/* diorama */}
              <div className="world-diorama relative will-change-transform">
                <div
                  className="absolute inset-0 -z-10 scale-90 rounded-full blur-3xl"
                  style={{ background: w.primary, opacity: 0.35 }}
                  aria-hidden
                />
                <img
                  src={w.image}
                  alt={`${w.name} diorama`}
                  className="mx-auto w-full max-w-[520px] rounded-[20px] border-[3px] border-[#1B1233] shadow-[0_12px_0_rgba(27,18,51,0.35)]"
                  loading="lazy"
                />
                <span
                  className="absolute -left-3 -top-3 rotate-[-6deg] rounded-[14px] border-[3px] border-[#1B1233] px-4 py-2 font-display text-lg font-extrabold text-[#1B1233] shadow-[0_4px_0_rgba(27,18,51,0.35)]"
                  style={{ background: w.primary }}
                >
                  WORLD {w.n}
                </span>
              </div>

              {/* content stack */}
              <div className="story-panel-night p-6 sm:p-8">
                <p className="world-reveal text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: w.primary }}>
                  {w.tag}
                </p>
                <h2 className="world-reveal mt-2 font-display text-4xl font-extrabold text-[#FFF6E8] sm:text-5xl">
                  {w.name}
                </h2>
                <p className="world-reveal mt-4 text-base font-semibold leading-relaxed text-[#FFF6E8]/80 sm:text-lg">
                  {w.lore}
                </p>

                <div className="world-reveal mt-5 flex flex-wrap gap-2">
                  <span className="stat-chip">Levels {w.n}-1 → {w.n}-4</span>
                  <span className="stat-chip">Par {w.par}</span>
                  <Chip color={w.primary}>{w.mechanic}</Chip>
                </div>

                <div className="world-reveal mt-4 flex flex-wrap gap-2">
                  {w.foes.map((f) => (
                    <span
                      key={f}
                      className="rounded-full border-2 border-dashed px-3 py-1 text-xs font-bold"
                      style={{ borderColor: w.primary, color: w.primary }}
                    >
                      {f}
                    </span>
                  ))}
                </div>

                <ol className="world-reveal mt-5 space-y-1.5">
                  {(() => {
                    const real = worldLevelNames(w.n);
                    const names = real.length > 0 ? real : w.levels;
                    return names.map((lv, li) => (
                      <li key={`${w.n}-${li + 1}`} className="flex items-center gap-3 text-sm font-bold text-[#FFF6E8]/85">
                        <span
                          className="flex h-7 w-10 items-center justify-center rounded-[8px] border-2 border-[#1B1233] text-[11px] font-extrabold text-[#1B1233]"
                          style={{ background: li === 3 ? w.secondary : w.primary }}
                        >
                          {w.n}-{li + 1}
                        </span>
                        {lv}
                      </li>
                    ));
                  })()}
                </ol>

                <div className="world-reveal mt-5 rounded-[14px] border-[3px] border-[#1B1233] bg-[#241A45] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[#FFC93C]">
                    Boss {w.n}-4 · {w.boss}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#FFF6E8]/75">{w.bossHint}</p>
                </div>

                <div className="world-reveal mt-6">
                  <Link
                    to="/game"
                    className="btn-story star-cursor"
                    style={{ background: w.primary, color: '#1B1233' }}
                  >
                    <Play size={16} fill="#1B1233" /> Play World {w.n} →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* Section 10 — boss gallery */}
      <section className="relative px-4 py-24">
        <div className="mx-auto max-w-[1200px]">
          <h2 className="pop-in-view text-center font-display text-4xl font-extrabold text-[#FFF6E8] sm:text-5xl">
            Eight guardians stand <span className="text-[#FFC93C]">in your way</span>
          </h2>
          <p className="pop-in-view mx-auto mt-4 max-w-xl text-center text-lg font-semibold text-[#FFF6E8]/70">
            One castle boss at the end of every world. Some have been sighted — the rest remain a mystery
            until you reach their gate.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BOSSES.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => setModalBoss(b)}
                className="pop-in-view star-cursor group relative overflow-hidden rounded-[20px] border-[3px] border-[#1B1233] bg-[#33245E] text-left shadow-[0_6px_0_rgba(27,18,51,0.35)] transition-transform duration-200 ease-overshoot hover:-translate-y-1.5 hover:rotate-[1.5deg]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  {b.art ? (
                    <img src={b.art} alt={`${b.name} boss artwork`} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{ background: `radial-gradient(circle at 50% 60%, ${b.color}33, #241A45 75%)` }}
                    >
                      <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
                        <path d={b.silhouette} fill="#1B1233" stroke={b.color} strokeWidth="1.5" opacity="0.9" />
                      </svg>
                      <span
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-[#1B1233] font-display text-lg font-extrabold text-[#1B1233]"
                        style={{ background: b.color }}
                        aria-hidden
                      >
                        ?
                      </span>
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FFF6E8]/50">
                        Unsighted — mystery
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t-[3px] border-[#1B1233] p-3.5">
                  <p className="font-display text-lg font-extrabold leading-tight text-[#FFF6E8] group-hover:text-[#FFC93C]">
                    {b.name}
                  </p>
                  <p className="mt-0.5 text-[11px] font-extrabold uppercase tracking-[0.1em]" style={{ color: b.color }}>
                    {b.world}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Section 11 — outro CTA */}
      <section className="relative flex flex-col items-center px-4 pb-28 pt-8 text-center">
        <img src="/logo-star.svg" alt="" className="bob-sine h-16 w-16" />
        <h2 className="pop-in-view mt-6 font-display text-4xl font-extrabold text-[#FFF6E8] sm:text-5xl">
          The stars won't save <span className="text-[#FFC93C]">themselves.</span>
        </h2>
        <Link to="/game" className="btn-story btn-primary star-cursor glow-pulse pop-in-view mt-8 text-lg">
          <Play size={18} fill="#1B1233" /> Start the Journey
        </Link>
      </section>

      {/* Boss detail modal */}
      {modalBoss && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[#241A45]/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`${modalBoss.name} details`}
          onClick={() => setModalBoss(null)}
        >
          <div
            className="story-panel pixel-notch w-full max-w-lg p-6 sm:p-8"
            style={{ animation: 'worlds-modal-in 300ms cubic-bezier(0.34,1.56,0.64,1) both' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.12em]" style={{ color: modalBoss.color }}>
                  {modalBoss.world}
                </p>
                <h3 className="mt-1 font-display text-3xl font-extrabold text-[#1B1233]">{modalBoss.name}</h3>
              </div>
              <button
                type="button"
                aria-label="Close"
                className="star-cursor flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border-[3px] border-[#1B1233] bg-[#FF5D7E] text-[#1B1233] shadow-[0_4px_0_rgba(27,18,51,0.35)] transition-transform hover:-translate-y-0.5"
                onClick={() => setModalBoss(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-[14px] border-[3px] border-[#1B1233]">
              {modalBoss.art ? (
                <img src={modalBoss.art} alt={`${modalBoss.name} boss artwork`} className="aspect-[4/3] w-full object-cover" />
              ) : (
                <div
                  className="flex aspect-[4/3] w-full items-center justify-center"
                  style={{ background: `radial-gradient(circle at 50% 60%, ${modalBoss.color}44, #241A45 75%)` }}
                >
                  <svg viewBox="0 0 100 100" className="h-3/5 w-3/5" aria-hidden>
                    <path d={modalBoss.silhouette} fill="#1B1233" stroke={modalBoss.color} strokeWidth="1.5" />
                  </svg>
                </div>
              )}
            </div>

            <p className="mt-4 text-base font-semibold leading-relaxed text-[#1B1233]/85">{modalBoss.lore}</p>
            <div className="mt-4 rounded-[12px] border-[3px] border-[#1B1233] bg-[#FFC93C]/30 p-3.5">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#1B1233]">
                <Star size={14} fill="#1B1233" /> Strategy hint
              </p>
              <p className="mt-1 text-sm font-bold text-[#1B1233]/85">{modalBoss.strategy}</p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#1B1233]/50">
              <Lock size={13} /> Defeat it in World {WORLDS.find((w) => w.boss === modalBoss.name)?.n}-4
            </div>
          </div>
        </div>
      )}

      {/* modal entrance keyframes (scoped) */}
      <style>{`
        @keyframes worlds-modal-in {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
