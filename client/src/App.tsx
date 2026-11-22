import React, { useEffect, useState } from 'react';
import { Tv, Smartphone, Settings, Sparkles } from 'lucide-react';
import { TvApp } from './components/tv/TvApp';
import { PlayerApp } from './components/player/PlayerApp';
import { AdminApp } from './components/admin/AdminApp';

export const App: React.FC = () => {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (to: string) => {
    window.history.pushState({}, '', to);
    setPathname(to);
  };

  if (pathname.startsWith('/tv')) {
    return <TvApp />;
  }

  if (pathname.startsWith('/play')) {
    return <PlayerApp />;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminApp />;
  }

  // Festive Home Launcher (/)
  return (
    <div className="min-h-screen studio-stage-bg flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="studio-panel-gold rounded-3xl p-8 md:p-12 max-w-4xl w-full flex flex-col items-center gap-8">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#1B2752] border border-[#F5C542]/50 text-[#F5C542] font-display text-lg">
          <Sparkles className="w-5 h-5" /> Zaterdagavond Familie Spelshow
        </div>

        <div>
          <h1 className="font-display text-5xl md:text-6xl text-white mb-3">
            🎬 De Grote Familie Bongers Show
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Kies welk scherm je op dit apparaat wilt openen: het grote 65&quot;
            OLED TV-podium, jouw eigen telefoon/tablet controller, of de
            Gezins-Editor.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full">
          <button
            onClick={() => navigate('/tv')}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#1B2752] to-[#111936] border-2 border-[#F5C542] flex flex-col items-center gap-4 hover:scale-105 transition-transform shadow-xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#F5C542]/20 border border-[#F5C542] flex items-center justify-center text-[#F5C542]">
              <Tv className="w-10 h-10" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">
                TV-Showpodium
              </div>
              <div className="text-sm text-[#F5C542] font-bold mt-0.5">
                /tv (65&quot; LG OLED)
              </div>
              <p className="text-xs text-slate-300 mt-2">
                Open dit scherm op de grote TV in de woonkamer.
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/play')}
            className="p-6 rounded-3xl bg-gradient-to-b from-emerald-800 to-emerald-950 border-2 border-[#22C55E] flex flex-col items-center gap-4 hover:scale-105 transition-transform shadow-xl"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#22C55E]/20 border border-[#22C55E] flex items-center justify-center text-[#4ADE80]">
              <Smartphone className="w-10 h-10" />
            </div>
            <div>
              <div className="font-display text-2xl text-white">
                Spelerscherm
              </div>
              <div className="text-sm text-[#4ADE80] font-bold mt-0.5">
                /play (Telefoon & Tablet)
              </div>
              <p className="text-xs text-slate-300 mt-2">
                1-tik instappen voor Lucas, Lana, Papa & Mama!
              </p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="p-6 rounded-3xl bg-gradient-to-b from-purple-900 to-[#111936] border-2 border-[#A855F7] flex flex-col items-center gap-4 hover:scale-105 transition-transform shadow-xl"
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
              <p className="text-xs text-slate-300 mt-2">
                Voeg eigen vragen, familiefoto&apos;s en geluiden toe.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
