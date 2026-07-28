import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './Navbar';
import Footer from './Footer';

gsap.registerPlugin(ScrollTrigger);

/**
 * Site shell. Hidden entirely on /game (full-viewport canvas, zero chrome).
 * Children pattern: App wraps <Layout><Routes>…</Routes></Layout>.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isGame = pathname.startsWith('/game');

  // Lenis smooth scrolling on site pages only. Driven by gsap's ticker and
  // forwarding scroll to ScrollTrigger so pinned pages don't jitter.
  useEffect(() => {
    if (isGame) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [isGame]);

  // scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  if (isGame) return <>{children}</>;

  return (
    <div className="relative min-h-[100dvh] bg-[#241A45]">
      {/* parallax star field behind every site page */}
      <div className="starfield-layer opacity-60" aria-hidden />
      <div className="starfield-layer starfield-layer--near" aria-hidden />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
