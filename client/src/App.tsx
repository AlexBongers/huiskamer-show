import React, { useEffect, useRef, useState } from 'react';
import { Tv, Smartphone, Settings } from 'lucide-react';
import { TvApp } from './components/tv/TvApp';
import { PlayerApp } from './components/player/PlayerApp';
import { AdminApp } from './components/admin/AdminApp';

const LAUNCHER_ROUTES = ['/tv', '/play', '/admin'] as const;

export const App: React.FC = () => {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const btnRefs = useRef<Array<HTMLButtonElement | null>>([null, null, null]);

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPathname(to);
  };

  const isLauncher =
    !pathname.startsWith('/tv') &&
    !pathname.startsWith('/play') &&
    !pathname.startsWith('/admin');

  // LG Magic Remote D-pad (ArrowLeft/ArrowRight + OK/Enter) on Home Launcher
  useEffect(() => {
    if (!isLauncher) return;
    btnRefs.current[focusedIdx]?.focus();
  }, [isLauncher, focusedIdx]);

  useEffect(() => {
    if (!isLauncher) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || code === 39 || code === 40) {
        e.preventDefault();
        setFocusedIdx((prev) => (prev + 1) % LAUNCHER_ROUTES.length);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || code === 37 || code === 38) {
        e.preventDefault();
        setFocusedIdx(
          (prev) => (prev - 1 + LAUNCHER_ROUTES.length) % LAUNCHER_ROUTES.length
        );
      } else if (e.key === 'Enter' || e.key === ' ' || code === 13) {
        e.preventDefault();
        navigate(LAUNCHER_ROUTES[focusedIdx]);
      } else if (code === 403 || code === 415) {
        // LG Red button or Play button -> launch TV directly
        e.preventDefault();
        navigate('/tv');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLauncher, focusedIdx]);

  if (pathname.startsWith('/tv')) {
    return <TvApp />;
  }

  if (pathname.startsWith('/play')) {
    return <PlayerApp />;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminApp />;
  }

  // Festive Home Launcher (/) — LG Magic Remote & Air-Mouse Ready!
  return (
    <div className="min-h-screen w-full studio-stage-bg flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="studio-panel-gold rounded-3xl p-8 md:p-12 max-w-5xl w-full flex flex-col items-center gap-8">
        <div className="w-28 h-28 rounded-3xl overflow-hidden border-2 border-studio-gold">
          <img
            src="/art/show-trophy.jpg"
            alt="De Grote Familie Bongers Show Trofee"
            className="w-full h-full object-cover"
          />
        </div>

        <h1 className="font-display text-5xl md:text-6xl text-white">
          🎬 De Grote Familie Bongers Show
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <button
            ref={(el) => {
              btnRefs.current[0] = el;
            }}
            onMouseEnter={() => setFocusedIdx(0)}
            onFocus={() => setFocusedIdx(0)}
            onClick={() => navigate('/tv')}
            className="tv-focusable p-7 rounded-3xl bg-studio-cardLight border-2 border-studio-gold flex flex-col items-center gap-4 shadow-xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-studio-gold/20 border border-studio-gold flex items-center justify-center text-studio-gold">
              <Tv className="w-10 h-10" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">
                TV-Showpodium
              </div>
              <div className="text-sm text-studio-gold font-bold mt-0.5">
                /tv (65&quot; LG OLED)
              </div>
              <p className="text-sm text-slate-300 mt-2">
                Open dit scherm op de grote TV in de woonkamer.
              </p>
            </div>
          </button>

          <button
            ref={(el) => {
              btnRefs.current[1] = el;
            }}
            onMouseEnter={() => setFocusedIdx(1)}
            onFocus={() => setFocusedIdx(1)}
            onClick={() => navigate('/play')}
            className="tv-focusable p-7 rounded-3xl bg-emerald-800 border-2 border-[#22C55E] flex flex-col items-center gap-4 shadow-xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#22C55E]/20 border border-[#22C55E] flex items-center justify-center text-[#4ADE80]">
              <Smartphone className="w-10 h-10" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">
                Spelerscherm
              </div>
              <div className="text-sm text-[#4ADE80] font-bold mt-0.5">
                /play (Telefoon &amp; Tablet)
              </div>
              <p className="text-sm text-slate-300 mt-2">
                1-tik instappen voor Lucas, Lana, Papa &amp; Mama!
              </p>
            </div>
          </button>

          <button
            ref={(el) => {
              btnRefs.current[2] = el;
            }}
            onMouseEnter={() => setFocusedIdx(2)}
            onFocus={() => setFocusedIdx(2)}
            onClick={() => navigate('/admin')}
            className="tv-focusable p-7 rounded-3xl bg-purple-900 border-2 border-[#A855F7] flex flex-col items-center gap-4 shadow-xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#A855F7]/20 border border-[#A855F7] flex items-center justify-center text-purple-300">
              <Settings className="w-10 h-10" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">
                Gezins-Editor
              </div>
              <div className="text-sm text-purple-300 font-bold mt-0.5">
                /admin (Beheer)
              </div>
              <p className="text-sm text-slate-300 mt-2">
                Voeg eigen vragen, familiefoto&apos;s en geluiden toe.
              </p>
            </div>
          </button>
        </div>

        <div className="px-5 py-2.5 rounded-2xl bg-studio-bg/80 border border-white/15 text-base text-slate-300">
          🪄 <span className="text-studio-gold font-bold">LG Magic Remote:</span>{' '}
          wijs met de cursor of gebruik <kbd className="px-2 py-0.5 rounded bg-studio-cardLight text-white font-bold">◀</kbd>{' '}
          <kbd className="px-2 py-0.5 rounded bg-studio-cardLight text-white font-bold">▶</kbd> +{' '}
          <kbd className="px-2 py-0.5 rounded bg-studio-gold text-studio-bg font-bold">OK</kbd>{' '}
          om direct te kiezen.
        </div>
      </div>
    </div>
  );
};
