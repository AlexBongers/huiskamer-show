import React, { useEffect, useState } from 'react';
import { INTERMISSIONS, TIMERS } from '@huiskamer-show/shared';
import { IntermissionStage } from './IntermissionStage';

const SEASON_LABEL: Record<string, string> = {
  sint: 'Sinterklaas',
  kerst: 'Kerst',
  winter: 'Winter',
  lente: 'Lente',
  zomer: 'Zomer',
  herfst: 'Herfst',
};

/**
 * /animaties: alle tussendoortjes achter elkaar bekijken (zonder geluid).
 * Pijltjestoetsen gaan naar de vorige of volgende, spatie pauzeert.
 */
export const IntermissionGallery: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(0);
  const [playing, setPlaying] = useState(true);
  const total = INTERMISSIONS.length;
  const def = INTERMISSIONS[index];

  const go = (next: number) => {
    setIndex(((next % total) + total) % total);
    setRun((r) => r + 1);
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => go(index + 1), TIMERS.INTERMISSION_SEC * 1000 + 400);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, run, playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1);
      else if (e.key === 'ArrowLeft') go(index - 1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div className="studio-stage-bg min-h-screen px-4 py-6 sm:px-8 flex flex-col gap-4 text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 max-w-[1100px] w-full mx-auto">
        <h1 className="font-display text-2xl sm:text-3xl">
          Tussendoortjes <span className="text-studio-gold">{index + 1}</span> / {total}
        </h1>
        <div className="flex gap-2">
          <button type="button" onClick={() => go(index - 1)} className="px-4 py-2 rounded-xl bg-studio-card border border-white/20 font-display">
            Vorige
          </button>
          <button type="button" onClick={() => setPlaying((p) => !p)} className="px-4 py-2 rounded-xl bg-studio-card border border-white/20 font-display">
            {playing ? 'Pauze' : 'Afspelen'}
          </button>
          <button type="button" onClick={() => go(index)} className="px-4 py-2 rounded-xl bg-studio-card border border-white/20 font-display">
            Opnieuw
          </button>
          <button type="button" onClick={() => go(index + 1)} className="px-4 py-2 rounded-xl bg-studio-gold text-studio-bg font-display">
            Volgende
          </button>
        </div>
      </header>

      <div className="im-gallery-frame">
        <div className="im-gallery-inner">
          <IntermissionStage key={`${def.id}-${run}`} id={def.id} />
        </div>
      </div>

      <p className="text-slate-300 text-center">
        {def.caption} · beweging: {def.template}
        {def.season ? ` · alleen in het seizoen ${SEASON_LABEL[def.season]}` : ' · het hele jaar'}
      </p>

      <div className="flex flex-wrap gap-2 max-w-[1100px] w-full mx-auto justify-center">
        {INTERMISSIONS.map((d, i) => (
          <button
            key={d.id}
            type="button"
            onClick={() => go(i)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              i === index
                ? 'bg-studio-gold text-studio-bg border-studio-gold'
                : 'bg-studio-card border-white/15 text-slate-200'
            }`}
          >
            {d.caption}
            {d.season ? ` (${SEASON_LABEL[d.season]})` : ''}
          </button>
        ))}
      </div>
    </div>
  );
};
