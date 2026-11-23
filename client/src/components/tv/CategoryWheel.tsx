import React, { useEffect, useState } from 'react';
import { CATEGORIES, CategoryId } from '@huiskamer-show/shared';

interface CategoryWheelProps {
  targetIndex: number;
  selectedCategory: CategoryId;
}

export const CategoryWheel: React.FC<CategoryWheelProps> = ({
  targetIndex,
  selectedCategory,
}) => {
  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  useEffect(() => {
    setLanded(false);
    // 6 slices = 60 deg per slice. Slice i is centered at i * 60 + 30 deg.
    // Pointer is at top (0 deg / 270 deg SVG).
    const sliceAngle = 360 / CATEGORIES.length;
    const targetSliceCenter = targetIndex * sliceAngle + sliceAngle / 2;
    const finalAngle = 360 * 5 - targetSliceCenter;
    // Wait 50ms so LG webOS Chromium paints rotate(0deg) before transitioning
    const timer = window.setTimeout(() => {
      setRotation(finalAngle);
    }, 50);

    // Subtle suspense highlight cycling across categories while wheel spins
    const scanInterval = window.setInterval(() => {
      setScanIndex((prev) => (prev + 1) % CATEGORIES.length);
    }, 240);

    const landTimer = window.setTimeout(() => {
      window.clearInterval(scanInterval);
      setLanded(true);
    }, 3450);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(scanInterval);
      window.clearTimeout(landTimer);
    };
  }, [targetIndex]);

  const activeCat =
    CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 w-full h-full">
      {/* Glowing Wheel Container */}
      <div className="relative w-[380px] h-[380px] xl:w-[450px] xl:h-[450px] flex items-center justify-center">
        {/* Top Golden Pointer */}
        <div className="absolute -top-5 z-20 flex flex-col items-center">
          <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[36px] border-t-studio-gold drop-shadow-[0_4px_12px_rgba(255, 210, 63,0.9)]" />
        </div>

        {/* Spinning SVG Wheel */}
        <div
          className="w-full h-full rounded-full border-8 border-studio-gold overflow-hidden transition-transform duration-[3600ms] ease-[cubic-bezier(0.15,0.85,0.25,1)]"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {CATEGORIES.map((cat, idx) => {
              const startDeg = idx * 60 - 90;
              const endDeg = (idx + 1) * 60 - 90;
              const startRad = (startDeg * Math.PI) / 180;
              const endRad = (endDeg * Math.PI) / 180;
              const x1 = 100 + 100 * Math.cos(startRad);
              const y1 = 100 + 100 * Math.sin(startRad);
              const x2 = 100 + 100 * Math.cos(endRad);
              const y2 = 100 + 100 * Math.sin(endRad);
              const midDeg = startDeg + 30;
              const midRad = (midDeg * Math.PI) / 180;
              const emojiX = 100 + 62 * Math.cos(midRad);
              const emojiY = 100 + 62 * Math.sin(midRad);

              return (
                <g key={cat.id}>
                  <path
                    d={`M100,100 L${x1},${y1} A100,100 0 0,1 ${x2},${y2} Z`}
                    fill={cat.color}
                    stroke="rgb(var(--studio-bg-rgb))"
                    strokeWidth="2.5"
                  />
                  <text
                    x={emojiX}
                    y={emojiY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="24"
                    transform={`rotate(${midDeg + 90}, ${emojiX}, ${emojiY})`}
                  >
                    {cat.emoji}
                  </text>
                </g>
              );
            })}
            {/* Center Gold Hub */}
            <circle
              cx="100"
              cy="100"
              r="22"
              fill="rgb(var(--studio-card-rgb))"
              stroke="rgb(var(--studio-gold-rgb))"
              strokeWidth="5"
            />
            <text
              x="100"
              y="101"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="16"
            >
              ⭐
            </text>
          </svg>
        </div>
      </div>

      {/* Category Legend on Right */}
      <div className="flex flex-col gap-3 max-w-lg">
        <div className="text-studio-gold font-display text-2xl tracking-wide">
          {landed
            ? `✨ GEKOZEN CATEGORIE: ${activeCat.name.toUpperCase()}!`
            : '🎡 HET GROTE CATEGORIE-RAD DRAAIT...'}
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {CATEGORIES.map((cat, idx) => {
            const isTarget = landed && cat.id === activeCat.id;
            const isScanning = !landed && idx === scanIndex;
            return (
              <div
                key={cat.id}
                className={`flex items-center gap-4 px-5 py-3 rounded-2xl border-2 transition-all duration-300 ${
                  isTarget
                    ? 'bg-studio-cardLight border-studio-gold scale-105'
                    : isScanning
                    ? 'bg-studio-cardLight/80 border-white/40 scale-[1.02]'
                    : 'bg-studio-card/75 border-white/10 opacity-75'
                }`}
              >
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shadow-md"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.emoji}
                </span>
                <div>
                  <div className="font-display text-2xl text-white">
                    {cat.name}
                  </div>
                  <div className="text-sm text-slate-300">{cat.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
