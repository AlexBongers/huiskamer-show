/**
 * Seizoensthema's voor De Grote Huiskamer Show.
 * De look wisselt automatisch op datum; met ?thema=<naam> (of de keuze in het beheerscherm)
 * kun je een thema vastzetten, met ?thema=auto ga je terug naar de datum.
 */
export type ThemeId = 'sint' | 'kerst' | 'winter' | 'lente' | 'zomer' | 'herfst';

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  /** Eerste dag van het thema als [maand, dag] (maand 1-12). */
  from: [number, number];
  themeColor: string;
}

/** Op volgorde van het jaar; het thema blijft gelden tot het volgende begint. */
export const THEMES: ThemeInfo[] = [
  { id: 'winter', label: 'Winter (midden jan - 19 mrt)', from: [1, 15], themeColor: '#0F2A3A' },
  { id: 'lente', label: 'Lente (20 mrt - 20 jun)', from: [3, 20], themeColor: '#123A3A' },
  { id: 'zomer', label: 'Zomer (21 jun - 22 sep)', from: [6, 21], themeColor: '#0B3550' },
  { id: 'herfst', label: 'Herfst (23 sep - 11 nov)', from: [9, 23], themeColor: '#2A2230' },
  { id: 'sint', label: 'Sinterklaas (12 nov - 7 dec)', from: [11, 12], themeColor: '#14274A' },
  { id: 'kerst', label: 'Kerst (8 dec - 14 jan)', from: [12, 8], themeColor: '#0E2E26' },
];

const STORAGE_KEY = 'huiskamer-thema';

export function themeForDate(date: Date): ThemeInfo {
  const key = (date.getMonth() + 1) * 100 + date.getDate();
  const starts = THEMES.map((t) => ({ t, key: t.from[0] * 100 + t.from[1] }));
  // Het laatste thema waarvan de startdatum al geweest is; vóór 15 jan geldt Kerst (jaarwisseling).
  const past = starts.filter((s) => s.key <= key).sort((a, b) => b.key - a.key)[0];
  return (past ? past.t : THEMES.find((t) => t.id === 'kerst'))!;
}

function readOverride(): ThemeId | null {
  try {
    const q = new URLSearchParams(window.location.search).get('thema');
    if (q === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else if (q && THEMES.some((t) => t.id === q)) window.localStorage.setItem(STORAGE_KEY, q);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === stored) ? (stored as ThemeId) : null;
  } catch {
    return null;
  }
}

export function setThemeOverride(id: ThemeId | 'auto'): void {
  try {
    if (id === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* geen opslag beschikbaar */
  }
  applyTheme();
}

export function getThemeOverride(): ThemeId | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return THEMES.some((t) => t.id === stored) ? (stored as ThemeId) : null;
  } catch {
    return null;
  }
}

export function applyTheme(now: Date = new Date()): ThemeInfo {
  const override = readOverride();
  const info = (override && THEMES.find((t) => t.id === override)) || themeForDate(now);
  document.documentElement.dataset.theme = info.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', info.themeColor);
  return info;
}

/** Past het thema nu toe en controleert elk uur opnieuw (de TV kan dagenlang aan blijven staan). */
export function startSeasonalTheme(): void {
  applyTheme();
  window.setInterval(() => applyTheme(), 60 * 60 * 1000);
}
