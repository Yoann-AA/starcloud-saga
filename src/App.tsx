import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import Home from './pages/Home';
import Map from './pages/Map';
import Worlds from './pages/Worlds';
import Guide from './pages/Guide';
import Credits from './pages/Credits';

// the game page pulls in Three.js — code-split it out of the site shell
const Game = lazy(() => import('./pages/Game'));

function GameFallback() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-[#241A45]">
      <img src="/logo-star.svg" alt="" className="h-16 w-16 animate-spin" style={{ animationDuration: '1.6s' }} />
      <p className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#FFF6E8]/70">
        Polishing stars…
      </p>
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/game"
          element={
            <Suspense fallback={<GameFallback />}>
              <Game />
            </Suspense>
          }
        />
        <Route path="/map" element={<Map />} />
        <Route path="/worlds" element={<Worlds />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
