# STARCLOUD SAGA ⭐

An **original** Mario-style 2.5D platformer rendered in real 3D — React 19 + TypeScript + Three.js (R3F) + zustand. **32 handcrafted levels across 8 worlds**, castle bosses, 4 power-ups, synthesized WebAudio chiptune & SFX (zero audio files), touch controls, localStorage saves.

**Play it live:** https://starcloud.levier-ia.fr/

100% original characters, names, levels, art & music. Not affiliated with Nintendo.

## Run

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # tsc + vite build
npm run validate-levels  # headless bot proves all 32 levels beatable
```

## Repo notes (what's intentionally NOT here)

- **`public/*.png`** — AI-generated 2D art (hero diorama, world thumbnails, bestiary…), ~22 MB of binary. Excluded from this repo; the game runs without them for the most part (they're used by the site shell pages). Regenerate or grab them from the live deployment (`/hero-diorama.png`, `/world-w1.png`…`/world-w8.png`, `/boss-w4.png`, `/boss-w8.png`, `/pip-portrait.png`, `/powerups.png`, `/bestiary.png`, `/map-bg.png`, `/guide-controls.png`, `/og-cover.png`).
- **`src/components/ui/*`** — stock [shadcn/ui](https://ui.shadcn.com) components (176 KB of unmodified template code). Restore with:
  ```bash
  npx shadcn@latest init -y -f
  npx shadcn@latest add accordion alert alert-dialog aspect-ratio avatar badge breadcrumb button button-group calendar card carousel chart checkbox collapsible command context-menu dialog drawer dropdown-menu empty field form hover-card input input-group input-otp item kbd label menubar navigation-menu pagination popover progress radio-group resizable scroll-area select separator sheet sidebar skeleton slider sonner spinner switch table tabs textarea toggle toggle-group tooltip
  ```
- **`package-lock.json`** — regenerate with `npm install`.

Everything else (full game engine, entities, all 32 level JSONs, audio synth, overlays, site pages) is complete and buildable.

## Architecture

- `src/game/engine/` — fixed-timestep (1/120) loop, AABB tile physics, player controller (coyote time, jump buffering, variable jump), level loader with instanced tile meshes, parallax backdrop, entity registry, typed event bus, **headless bot simulator** (`sim/`) that validates every level is beatable.
- `src/game/entities/` — enemies (Waddler, Hopper, Turtleaf, Spikepod, Flapper, Burrower), moving/falling platforms, power-up items, ember projectiles, castle boss.
- `src/game/audio/` — procedural chiptune per world + boss variant, ~20 synthesized SFX, all raw WebAudio.
- `src/game/fx/` — pooled instanced particle systems driven by the event bus.
- `src/game/levels/` — 32 original levels in an ASCII-tile JSON schema (see `src/game/engine/types.ts`).
- `src/pages/` — Title, Game, Map (level select), Worlds (GSAP scroll tour), Guide, Credits.

Built by an agent swarm (designer → engine → 4 parallel feature pods → integration → QA). Level completability is machine-proven: `npm run validate-levels` runs a greedy bot through all 32 levels headlessly.
