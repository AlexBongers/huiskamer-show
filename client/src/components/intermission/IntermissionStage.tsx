import React, { CSSProperties, useEffect, useRef } from 'react';
import {
  INTERMISSION_MAP,
  IntermissionDef,
  IntermissionTemplate,
} from '@huiskamer-show/shared';
import { IllustrationView } from '../illustrations/IllustrationLibrary';

/**
 * Tussendoortjes: korte animaties van 3 seconden tussen de rondes.
 *
 * Alles is opgebouwd uit een paar bewegingen (sjablonen) en de illustraties van de show als "stickers".
 * Maten zijn in --u: 1/100 van de hoogte van een 16:9-vlak binnen het podium. Daardoor ziet een animatie
 * er op de TV, een tablet en de voorbeeldpagina hetzelfde uit, alleen groter of kleiner.
 * Er bewegen alleen transform en opacity, zodat het ook op de LG-TV soepel loopt.
 */

type Vars = CSSProperties & Record<string, string | number | undefined>;

const u = (n: number) => `calc(var(--u) * ${n})`;

/** Voorspelbare "willekeur": dezelfde animatie ziet er altijd hetzelfde uit. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const Sticker: React.FC<{ id: string; size: number }> = ({ id, size }) => (
  <div className="im-sticker" style={{ '--s': u(size) } as Vars}>
    <IllustrationView illustrationId={id} />
  </div>
);

// ---------------------------------------------------------------- kleine bouwstenen
const Twinkles: React.FC<{ count?: number }> = ({ count = 14 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="im-twinkle"
        style={{
          left: `${4 + rand(i + 1) * 92}%`,
          top: `${18 + rand(i + 31) * 70}%`,
          '--d': `${rand(i + 61) * 0.9}s`,
          '--sz': u(0.8 + rand(i + 91) * 1.4),
        } as Vars}
      />
    ))}
  </>
);

const Clouds: React.FC<{ direction: 'down' | 'left' }> = ({ direction }) => (
  <>
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={direction === 'down' ? 'im-cloud-track-v' : 'im-cloud-track-h'}
        style={{
          [direction === 'down' ? 'left' : 'top']: `${8 + rand(i + 5) * 76}%`,
          '--d': `${rand(i + 15) * 1.2 - 0.6}s`,
          '--dur': `${2.2 + rand(i + 25) * 1.2}s`,
        } as Vars}
      >
        <div className="im-cloud" style={{ '--cs': u(9 + rand(i + 35) * 7) } as Vars} />
      </div>
    ))}
  </>
);

const Notes: React.FC<{ count?: number }> = ({ count = 7 }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className="im-note"
        style={{
          left: `${28 + rand(i + 3) * 44}%`,
          '--d': `${0.5 + i * 0.28}s`,
          '--r': `${(rand(i + 13) - 0.5) * 50}deg`,
        } as Vars}
      >
        {i % 2 ? '♫' : '♪'}
      </div>
    ))}
  </>
);

const Confetti: React.FC<{ at: number; top?: string; colors: string[] }> = ({
  at,
  top = '56%',
  colors,
}) => (
  <div className="im-burst-origin" style={{ top }}>
    {Array.from({ length: 16 }, (_, i) => (
      <div key={i} className="im-confetti-arm" style={{ transform: `rotate(${i * 22.5 + rand(i) * 10}deg)` }}>
        <div
          className="im-confetti"
          style={{
            background: colors[i % colors.length],
            '--d': `${at}s`,
            '--dist': u(26 + rand(i + 7) * 22),
          } as Vars}
        />
      </div>
    ))}
  </div>
);

const SpeedLines: React.FC<{ color: string }> = ({ color }) => (
  <>
    {Array.from({ length: 8 }, (_, i) => (
      <div
        key={i}
        className="im-speed-track"
        style={{ top: `${22 + rand(i + 2) * 66}%`, '--d': `${rand(i + 12) * 0.5}s` } as Vars}
      >
        <div className="im-speed" style={{ background: color }} />
      </div>
    ))}
  </>
);

const RAINBOW = ['#E8434F', '#FF8A5B', '#FFD23F', '#6FE0B5', '#7FB6FF', '#B9A4FF'];

// ---------------------------------------------------------------- de sjablonen
type TemplateProps = { def: IntermissionDef };

const Parade: React.FC<TemplateProps> = ({ def }) => (
  <>
    <div className="im-ground" />
    {def.particle === 'note' && <Notes count={8} />}
    {def.cast.map((id, i) => (
      <div key={i} className="im-track im-parade" style={{ '--d': `${0.05 + i * 0.26}s` } as Vars}>
        <div className="im-hop" style={{ '--hd': `${i * 0.11}s` } as Vars}>
          <Sticker id={id} size={22} />
        </div>
      </div>
    ))}
  </>
);

const Launch: React.FC<TemplateProps> = ({ def }) => {
  const space = def.particle !== 'cloud';
  return (
    <>
      {space ? <Twinkles /> : <Clouds direction="down" />}
      <div className="im-vtrack im-launch">
        <div className="im-wobble">
          <Sticker id={def.cast[0]} size={26} />
        </div>
        {space && <div className="im-flame" style={{ background: def.accent }} />}
      </div>
      {space &&
        Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="im-puff" style={{ left: `${42 + i * 4}%`, '--d': `${0.15 + i * 0.12}s` } as Vars} />
        ))}
    </>
  );
};

const ZoomBy: React.FC<TemplateProps> = ({ def }) => {
  const collectible = def.extras?.[0];
  return (
    <>
      {def.particle === 'cloud' ? <Clouds direction="left" /> : <SpeedLines color={def.accent} />}
      {collectible &&
        [0.16, 0.33, 0.5, 0.67, 0.84].map((x, i) => (
          <div
            key={i}
            className="im-collect"
            style={{ left: `${x * 100}%`, '--pop': `${0.3 + 2.0 * ((x + 0.25) / 1.45)}s` } as Vars}
          >
            <div className="im-coin">
              <Sticker id={collectible} size={10} />
            </div>
          </div>
        ))}
      <div className="im-track im-zoom">
        <div className={def.variant === 'spin' ? 'im-roll' : 'im-run'}>
          <Sticker id={def.cast[0]} size={24} />
        </div>
      </div>
    </>
  );
};

const Rain: React.FC<TemplateProps> = ({ def }) => (
  <>
    {Array.from({ length: 18 }, (_, i) => {
      const style = {
        left: `${2 + rand(i + 1) * 92}%`,
        '--d': `${rand(i + 21) * 1.25}s`,
        '--dur': `${1.35 + rand(i + 41) * 0.6}s`,
        '--r': `${(rand(i + 61) - 0.5) * 600}deg`,
      } as Vars;
      const size = 8 + rand(i + 81) * 5.5;
      let piece: React.ReactNode;
      if (def.particle === 'snow') {
        piece = <div className="im-snow" style={{ '--sz': u(size * 0.38) } as Vars} />;
      } else if (def.particle === 'leaf') {
        piece = (
          <div
            className="im-leaf"
            style={{ '--sz': u(size * 0.7), background: i % 3 === 0 ? '#D9622B' : i % 3 === 1 ? def.accent : '#A8C66C' } as Vars}
          />
        );
      } else {
        const extras = def.extras && def.extras.length > 0 ? def.extras : ['star'];
        piece = <Sticker id={extras[i % extras.length]} size={size} />;
      }
      return (
        <div key={i} className="im-fall-track" style={style}>
          <div className="im-fall-spin">{piece}</div>
        </div>
      );
    })}
    {def.cast[0] && (
      <div className="im-hero-bottom">
        <div className="im-popin">
          <div className="im-bob">
            <Sticker id={def.cast[0]} size={26} />
          </div>
        </div>
      </div>
    )}
  </>
);

const Orbit: React.FC<TemplateProps> = ({ def }) => {
  const sats = def.extras ?? [];
  return (
    <>
      <Twinkles count={8} />
      <div className="im-ring">
        {sats.map((id, i) => {
          const a = (360 / sats.length) * i;
          return (
            <div key={i} className="im-sat" style={{ transform: `rotate(${a}deg) translateY(${u(-33)}) rotate(${-a}deg)` }}>
              <div className="im-sat-counter">
                <div className="im-popin" style={{ '--d': `${0.15 + i * 0.12}s` } as Vars}>
                  <Sticker id={id} size={14} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="im-center">
        <div className="im-popin">
          <div className="im-pulse">
            <Sticker id={def.cast[0]} size={28} />
          </div>
        </div>
      </div>
    </>
  );
};

const PopGrid: React.FC<TemplateProps> = ({ def }) => (
  <div className="im-grid">
    {def.cast.slice(0, 6).map((id, i) => (
      <div key={i} className="im-popin" style={{ '--d': `${0.15 + i * 0.17}s` } as Vars}>
        <div className="im-wiggle" style={{ '--w': `${1.4 + (i % 3) * 0.12}s` } as Vars}>
          <Sticker id={id} size={19} />
        </div>
      </div>
    ))}
  </div>
);

const Spotlight: React.FC<TemplateProps> = ({ def }) => (
  <>
    {def.particle === 'star' && <Twinkles />}
    <div className="im-beam im-beam-l" style={{ background: def.accent }} />
    <div className="im-beam im-beam-r" style={{ background: def.accent }} />
    <div className="im-floor" style={{ background: def.accent }} />
    {def.particle === 'note' && <Notes count={8} />}
    <div className="im-rise">
      <div className="im-beat">
        <Sticker id={def.cast[0]} size={28} />
      </div>
    </div>
  </>
);

const Flip: React.FC<TemplateProps> = ({ def }) => (
  <>
    <div className="im-shadow" />
    <div className="im-toss">
      <div className="im-toss-spin">
        <Sticker id={def.cast[0]} size={26} />
      </div>
    </div>
    <Confetti at={1.2} top="30%" colors={[def.accent, '#FDF6E9', '#FF8A5B', '#6FE0B5']} />
  </>
);

const Rainbow: React.FC<TemplateProps> = ({ def }) => (
  <>
    <Twinkles count={10} />
    <svg className="im-rainbow" viewBox="0 0 200 100" preserveAspectRatio="xMidYMax meet">
      {RAINBOW.map((c, i) => {
        const r = 92 - i * 7;
        const len = Math.ceil(Math.PI * r);
        return (
          <path
            key={c}
            d={`M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`}
            stroke={c}
            strokeWidth="6.5"
            fill="none"
            strokeLinecap="round"
            style={{ strokeDasharray: len, strokeDashoffset: len, animationDelay: `${0.1 + i * 0.08}s` }}
            className="im-draw"
          />
        );
      })}
    </svg>
    <div className="im-arc-pivot">
      <div className="im-arc-rider">
        <div className="im-hop" style={{ '--hd': '0s' } as Vars}>
          <Sticker id={def.cast[0]} size={20} />
        </div>
      </div>
    </div>
  </>
);

const WaveLayer: React.FC<{ color: string; className: string }> = ({ color, className }) => (
  <svg className={`im-waves ${className}`} viewBox="0 0 400 40" preserveAspectRatio="none">
    <path
      d="M0 20 Q25 4 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20 V40 H0 Z"
      fill={color}
    />
  </svg>
);

const Wave: React.FC<TemplateProps> = ({ def }) => (
  <>
    {def.extras?.[0] && (
      <div className="im-jump-pivot">
        <div className="im-jump-rider">
          <Sticker id={def.extras[0]} size={15} />
        </div>
      </div>
    )}
    <WaveLayer color="#2F80B7" className="im-waves-back" />
    <div className="im-track im-sail">
      <div className="im-bob-boat">
        <Sticker id={def.cast[0]} size={26} />
      </div>
    </div>
    <WaveLayer color="#0A2540" className="im-waves-front" />
  </>
);

const Balloons: React.FC<TemplateProps> = ({ def }) => {
  const colors = [def.accent, '#FF8A5B', '#6FE0B5', '#B9A4FF', '#FF8FB1', '#7FB6FF', '#FFD23F', '#E8434F'];
  return (
    <>
      {colors.map((c, i) => {
        const extra = def.extras && i % 3 === 0 ? def.extras[(i / 3) % def.extras.length] : undefined;
        return (
          <div
            key={i}
            className="im-balloon-track"
            style={{
              left: `${5 + i * 11.6 + (rand(i) * 4 - 2)}%`,
              '--d': `${rand(i + 9) * 0.7}s`,
              '--dur': `${2.0 + rand(i + 19) * 0.7}s`,
            } as Vars}
          >
            <div className="im-sway" style={{ '--sd': `${rand(i + 29) * 0.5}s` } as Vars}>
              <div className="im-balloon" style={{ background: c }}>
                {extra && (
                  <div className="im-balloon-ill">
                    <Sticker id={extra} size={7} />
                  </div>
                )}
              </div>
              <div className="im-string" />
            </div>
          </div>
        );
      })}
      <div className="im-hero-bottom">
        <div className="im-popin">
          <div className="im-jump">
            <Sticker id={def.cast[0]} size={24} />
          </div>
        </div>
      </div>
    </>
  );
};

const Duo: React.FC<TemplateProps> = ({ def }) => (
  <>
    <div className="im-track im-duo-l">
      <div className="im-duo-jump">
        <Sticker id={def.cast[0]} size={26} />
      </div>
    </div>
    <div className="im-track im-duo-r">
      <div className="im-duo-jump">
        <Sticker id={def.cast[1] ?? def.cast[0]} size={26} />
      </div>
    </div>
    <div className="im-duo-pop">
      {def.extras?.[0] ? <Sticker id={def.extras[0]} size={15} /> : <div className="im-heart" />}
    </div>
    <Confetti at={1.25} top="44%" colors={[def.accent, '#FDF6E9', '#FF8FB1', '#6FE0B5']} />
  </>
);

const Burst: React.FC<TemplateProps> = ({ def }) => (
  <>
    <div className="im-rays">
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="im-ray" style={{ transform: `rotate(${i * 30}deg)` }}>
          <div className="im-ray-bar" style={{ background: def.accent, '--d': `${i * 0.03}s` } as Vars} />
        </div>
      ))}
    </div>
    <Confetti at={0.35} colors={[def.accent, '#FDF6E9', '#FF8A5B', '#6FE0B5', '#B9A4FF']} />
    {def.extras?.[0] && (
      <div className="im-reveal">
        <div className="im-hop" style={{ '--hd': '0s' } as Vars}>
          <Sticker id={def.extras[0]} size={18} />
        </div>
      </div>
    )}
    <div className="im-center">
      <div className="im-popin">
        <div className="im-spin-once">
          <Sticker id={def.cast[0]} size={30} />
        </div>
      </div>
    </div>
  </>
);

const Volcano: React.FC<TemplateProps> = ({ def }) => (
  <>
    {Array.from({ length: 14 }, (_, i) => (
      <div
        key={i}
        className="im-lava-x"
        style={{ '--dx': u((rand(i + 3) - 0.5) * 80), '--d': `${0.45 + rand(i + 11) * 1.3}s` } as Vars}
      >
        <div
          className="im-lava-y"
          style={{
            '--h': u(28 + rand(i + 7) * 30),
            '--d': `${0.45 + rand(i + 11) * 1.3}s`,
            background: [def.accent, '#FFD23F', '#E8434F'][i % 3],
          } as Vars}
        />
      </div>
    ))}
    <div className="im-volcano">
      <div className="im-shake">
        <Sticker id={def.cast[0]} size={32} />
      </div>
    </div>
    {def.cast[1] && (
      <div className="im-peek">
        <div className="im-scared">
          <Sticker id={def.cast[1]} size={18} />
        </div>
      </div>
    )}
  </>
);

export const TEMPLATES: Record<IntermissionTemplate, React.FC<TemplateProps>> = {
  parade: Parade,
  launch: Launch,
  zoomby: ZoomBy,
  rain: Rain,
  orbit: Orbit,
  popgrid: PopGrid,
  spotlight: Spotlight,
  flip: Flip,
  rainbow: Rainbow,
  wave: Wave,
  balloons: Balloons,
  duo: Duo,
  burst: Burst,
  volcano: Volcano,
};

/** Het podium: kiest het sjabloon, zet de kleuren en rekent de maateenheid uit. */
export const IntermissionStage: React.FC<{ id: string; className?: string }> = ({ id, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const def = INTERMISSION_MAP[id];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const { width, height } = el.getBoundingClientRect();
      const unit = Math.max(1, Math.min(height, (width * 9) / 16) / 100);
      el.style.setProperty('--u', `${unit}px`);
    };
    apply();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!def) return null;
  const Template = TEMPLATES[def.template];
  return (
    <div
      ref={ref}
      className={`im-stage ${className}`}
      style={{ background: def.bg, '--im-accent': def.accent } as Vars}
      aria-label={def.caption}
      role="img"
    >
      <div className="im-blob" style={{ left: '-8%', top: '-14%', '--bs': u(48) } as Vars} />
      <div className="im-blob" style={{ right: '-10%', bottom: '-18%', '--bs': u(62) } as Vars} />
      <div className="im-blob im-blob-small" style={{ right: '12%', top: '8%', '--bs': u(14) } as Vars} />
      <Template def={def} />
      <div className="im-caption">{def.caption}</div>
    </div>
  );
};
