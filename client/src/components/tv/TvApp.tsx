import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AVATAR_CATALOG,
  CATEGORIES,
  CATEGORY_MAP,
  CONTENT_PACKS,
  GAME_MODE_META,
  GameStatePayload,
  LEVEL_META,
  Player,
  ROUND_BONUS_META,
  ROUND_TYPE_META,
  SfxCue,
} from '@huiskamer-show/shared';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Lock,
  CheckCircle2,
  XCircle,
  Trophy,
  Crown,
  WifiOff,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipForward,
  PlusCircle,
  BellRing,
  RotateCcw,
} from 'lucide-react';
import { socketService } from '../../services/socket';
import { soundEngine } from '../../services/soundEngine';
import { speechService } from '../../services/speechService';
import { IllustrationView } from '../illustrations/IllustrationLibrary';
import { CategoryWheel } from './CategoryWheel';

const TV_ROUND_INTRO_VOICE: Record<string, string> = {
  quiz: 'Tijd voor de Slimme Quiz! Kijk snel op je eigen scherm!',
  thirty_seconds:
    'Tijd voor Dertig Seconden! Omschrijf zoveel mogelijk woorden zonder het woord te zeggen!',
  sound: 'Spits je oren! Het is tijd voor de Geluidsronde!',
  zoom_photo: 'Ogen op de televisie! Wat zie je op deze ingezoomde foto?',
  pantomime: 'Tijd voor Pantomime! Uitbeelden maar, zonder geluid!',
  estimate:
    'Tijd voor de Schattingsvraag! Wie zit het dichtst bij het juiste getal?',
};

export const TvApp: React.FC = () => {
  const [started, setStarted] = useState<boolean>(() =>
    typeof window !== 'undefined' &&
    window.location.search.includes('autostart=1')
  );
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [socketConnected, setSocketConnected] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [remoteToast, setRemoteToast] = useState<string | null>(null);
  const remoteToastTimerRef = useRef<number | null>(null);
  const startBtnRef = useRef<HTMLButtonElement | null>(null);
  const resumeBtnRef = useRef<HTMLButtonElement | null>(null);
  const antiSaverCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const antiSaverVideoRef = useRef<HTMLVideoElement | null>(null);
  const prevPlayerCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string>('LOBBY');

  const showRemoteToast = (msg: string) => {
    setRemoteToast(msg);
    if (remoteToastTimerRef.current) {
      window.clearTimeout(remoteToastTimerRef.current);
    }
    remoteToastTimerRef.current = window.setTimeout(() => {
      setRemoteToast(null);
    }, 2400);
  };

  const sendTvControl = (
    action:
      | 'pause'
      | 'resume'
      | 'addTime'
      | 'skip'
      | 'toggleMute'
      | 'testSound'
      | 'replaySound',
    toastMsg?: string
  ) => {
    socketService.socket.emit('tv:control', { action });
    if (toastMsg) showRemoteToast(toastMsg);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        showRemoteToast('🗗 Vensterweergave');
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        showRemoteToast('⛶ Volledig scherm');
      }
    } catch {
      // ignore if browser blocks fullscreen
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      if (remoteToastTimerRef.current) {
        window.clearTimeout(remoteToastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const sock = socketService.socket;

    const onConnect = () => {
      setSocketConnected(true);
      sock.emit('tv:join', {
        origin: typeof window !== 'undefined' ? window.location.origin : '',
      });
    };
    const onDisconnect = () => setSocketConnected(false);

    const handleState = (state: GameStatePayload) => {
      setGameState(state);
      soundEngine.setMuted(state.tvMuted);

      // Confetti sparkle when a new player joins in lobby
      const connectedCount = state.players.filter((p) => p.connected).length;
      if (
        state.phase === 'LOBBY' &&
        connectedCount > prevPlayerCountRef.current
      ) {
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.75 },
          });
        } catch {
          // ignore in headless
        }
      }
      prevPlayerCountRef.current = connectedCount;

      if (state.phase === 'FINALE' && prevPhaseRef.current !== 'FINALE') {
        try {
          confetti({
            particleCount: 140,
            spread: 95,
            origin: { y: 0.5 },
          });
        } catch {
          // ignore
        }
      }
      prevPhaseRef.current = state.phase;
    };

    const handleSfx = (payload: { cue: SfxCue; key?: string }) => {
      soundEngine.playCue(payload.cue, payload.key);
      if (payload.cue === 'correct' || payload.cue === 'fanfare') {
        try {
          confetti({
            particleCount: 55,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('state:update', handleState);
    sock.on('tv:sfx', handleSfx);

    sock.emit('tv:join', {
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    });

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('state:update', handleState);
      sock.off('tv:sfx', handleSfx);
    };
  }, []);

  // Subtle anti-screensaver canvas + looping muted MediaStream video for LG webOS OLED
  useEffect(() => {
    if (!started) return;
    let animId = 0;
    let tick = 0;
    const loop = () => {
      tick += 0.03;
      const cvs = antiSaverCanvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 16, 16);
          ctx.fillStyle = `rgba(245, 197, 66, ${0.15 + Math.sin(tick) * 0.1})`;
          ctx.fillRect(0, 0, 16, 16);
        }
      }
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    // Pipe canvas stream to hidden muted looping <video> so LG webOS never activates screensaver
    try {
      const cvs = antiSaverCanvasRef.current as
        | (HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream })
        | null;
      const vid = antiSaverVideoRef.current;
      if (cvs && vid && typeof cvs.captureStream === 'function') {
        vid.srcObject = cvs.captureStream(1);
        vid.play().catch(() => {});
      }
    } catch {
      // ignore if captureStream is unsupported
    }

    // Also try Screen Wake Lock API if available
    try {
      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        navigator.wakeLock
      ) {
        navigator.wakeLock.request('screen').catch(() => {});
      }
    } catch {
      // ignore on HTTP
    }

    return () => cancelAnimationFrame(animId);
  }, [started]);

  const handleStartShowClick = async () => {
    await soundEngine.unlock();
    speechService.unlock();
    setStarted(true);
    if (!gameState?.tvMuted) {
      speechService.speak(
        'Welkom bij De Grote Familie Bongers Show! Pak jullie telefoons en maak je klaar!'
      );
    }
    try {
      if (
        typeof document !== 'undefined' &&
        document.documentElement.requestFullscreen
      ) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  // Studio Showmaster voice announcements on TV phase transitions (respects tvMuted)
  const lastSpokenPhaseKeyRef = useRef<string>('');
  useEffect(() => {
    if (!started || !gameState) return;
    if (gameState.tvMuted) {
      speechService.stop();
      return;
    }

    const phase = gameState.phase;
    const roundNum = gameState.activeRound?.roundNumber || 0;
    const roundType = gameState.activeRound?.roundType || '';
    const key = `${phase}:${roundNum}:${roundType}`;
    if (key === lastSpokenPhaseKeyRef.current) return;

    const prevKey = lastSpokenPhaseKeyRef.current;
    lastSpokenPhaseKeyRef.current = key;

    if (phase === 'ROUND_INTRO' && TV_ROUND_INTRO_VOICE[roundType]) {
      speechService.speak(TV_ROUND_INTRO_VOICE[roundType]);
    } else if (phase === 'PAUSED') {
      speechService.speak('Even pauze! Alle klokken staan netjes stil.');
    } else if (prevKey.startsWith('PAUSED:') && phase !== 'LOBBY') {
      speechService.speak('We gaan weer verder! Veel succes allemaal!');
    } else if (phase === 'FINALE') {
      speechService.speak(
        'En dat was de grote finale! Wat een fantastische show, applaus voor iedereen!'
      );
    }
  }, [
    started,
    gameState?.phase,
    gameState?.tvMuted,
    gameState?.activeRound?.roundNumber,
    gameState?.activeRound?.roundType,
  ]);

  // Auto-focus primary CTA for LG Magic Remote D-pad / OK button
  useEffect(() => {
    if (!started) {
      startBtnRef.current?.focus();
    } else if (gameState?.phase === 'PAUSED') {
      resumeBtnRef.current?.focus();
    }
  }, [started, gameState?.phase]);

  // LG Magic Remote hardware keys (OK, Color buttons 403-406, Media keys 412/415/417/19, D-pad)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;

      // Splash screen: OK / Enter / Space / Play starts the show immediately
      if (!started) {
        if (
          e.key === 'Enter' ||
          e.key === ' ' ||
          code === 13 ||
          code === 32 ||
          code === 415
        ) {
          e.preventDefault();
          void handleStartShowClick();
        }
        return;
      }

      const curPhase = gameState?.phase;
      const inActiveGame = Boolean(
        curPhase && curPhase !== 'LOBBY' && curPhase !== 'FINALE'
      );

      // D-pad Left / Right cycles focus cleanly across TV header controls
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const controls = Array.from(
          document.querySelectorAll<HTMLButtonElement>('[data-tv-control="1"]')
        );
        if (controls.length > 0) {
          e.preventDefault();
          const idx = controls.indexOf(
            document.activeElement as HTMLButtonElement
          );
          const next =
            idx === -1
              ? 0
              : e.key === 'ArrowRight'
              ? (idx + 1) % controls.length
              : (idx - 1 + controls.length) % controls.length;
          controls[next]?.focus();
        }
        return;
      }

      // Red button (403) / Pause (19) / Play (415) / MediaPlayPause / 'p' -> Pause / Resume
      if (
        code === 403 ||
        code === 19 ||
        code === 415 ||
        e.key === 'MediaPlayPause' ||
        e.key === 'MediaPause' ||
        e.key === 'MediaPlay' ||
        e.key.toLowerCase() === 'p'
      ) {
        if (curPhase === 'PAUSED') {
          e.preventDefault();
          sendTvControl('resume', '▶️ Show hervat!');
        } else if (inActiveGame) {
          e.preventDefault();
          sendTvControl('pause', '⏸️ Show gepauzeerd');
        }
        return;
      }

      // When PAUSED, pressing OK / Space resumes right away (unless another header TV button is focused)
      if (
        curPhase === 'PAUSED' &&
        (e.key === 'Enter' || e.key === ' ' || code === 13 || code === 32)
      ) {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl?.getAttribute('data-tv-control') === '1') {
          return;
        }
        e.preventDefault();
        sendTvControl('resume', '▶️ Show hervat!');
        return;
      }

      // Green button (404) -> Test sound in Lobby, +15s during active game
      if (code === 404) {
        e.preventDefault();
        if (curPhase === 'LOBBY') {
          sendTvControl('testSound', '🔊 Geluidstest afgespeeld!');
        } else if (inActiveGame) {
          sendTvControl('addTime', '⏱️ +15 seconden extra!');
        }
        return;
      }

      // Yellow button (405) / 'm' -> Toggle TV Mute
      if (code === 405 || e.key.toLowerCase() === 'm') {
        e.preventDefault();
        const willMute = !gameState?.tvMuted;
        sendTvControl(
          'toggleMute',
          willMute ? '🔇 TV-geluid gedempt' : '🔊 TV-geluid weer aan'
        );
        return;
      }

      // Blue button (406) / 'f' -> Toggle Fullscreen
      if (code === 406 || e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }

      // FastForward (417) / MediaTrackNext -> Skip / Next step during game
      if (code === 417 || e.key === 'MediaFastForward' || e.key === 'MediaTrackNext') {
        if (inActiveGame) {
          e.preventDefault();
          sendTvControl('skip', '⏭️ Volgende stap');
        }
        return;
      }

      // Rewind (412) -> Replay audio clip in Sound Challenge
      if (code === 412 || e.key === 'MediaRewind') {
        if (gameState?.activeRound?.roundType === 'sound') {
          e.preventDefault();
          sendTvControl('replaySound', '🔊 Geluid opnieuw afgespeeld!');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [started, gameState?.phase, gameState?.tvMuted, gameState?.activeRound?.roundType]);

  if (!started) {
    return (
      <div
        onContextMenu={(e) => e.preventDefault()}
        className="min-h-screen w-full studio-stage-bg flex flex-col items-center justify-center p-8 text-center select-none"
      >
        <div className="studio-panel-gold rounded-3xl p-12 max-w-3xl w-full flex flex-col items-center gap-8">
          <div className="w-36 h-36 rounded-3xl overflow-hidden border-2 border-[#F5C542] shadow-[0_0_40px_rgba(245,197,66,0.5)]">
            <img
              src="/art/show-trophy.jpg"
              alt="De Grote Familie Bongers Show Trofee"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-[#F5C542] font-display text-2xl tracking-wider uppercase mb-2">
              65&quot; LG OLED Studio Podium
            </div>
            <h1 className="font-display text-6xl text-white mb-4">
              {gameState?.showTitle || 'De Grote Familie Bongers Show'}
            </h1>
            <p className="text-2xl text-slate-300 max-w-xl mx-auto">
              Richt de LG Magic Remote en klik één keer — of druk direct op{' '}
              <span className="text-[#F5C542] font-bold">OK (wiel)</span> — om
              het TV-geluid en het showpodium op volledig scherm te starten!
            </p>
          </div>
          <button
            ref={startBtnRef}
            autoFocus
            onClick={handleStartShowClick}
            className="tv-focusable px-14 py-7 rounded-2xl bg-gradient-to-r from-[#F5C542] to-[#F59E0B] text-[#070B18] font-display text-4xl font-bold shadow-[0_0_40px_rgba(245,197,66,0.6)] hover:scale-105 active:scale-95 transition-transform"
          >
            🎬 START DE SHOW
          </button>
          <div className="text-lg text-slate-300 flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-white/10 w-full">
            <span className="px-3 py-1 rounded-lg bg-white/10 text-[#F5C542] font-semibold">
              ✨ OK / Klik = Starten
            </span>
            <span>🔴 Pauze</span>
            <span>🟢 Geluidstest / +15s</span>
            <span>🟡 Geluid aan/uit</span>
            <span>🔵 Volledig scherm</span>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen studio-stage-bg flex items-center justify-center font-display text-4xl text-[#F5C542]">
        Verbinden met de Huiskamer Show Studio...
      </div>
    );
  }

  const {
    phase,
    activeRound,
    players,
    profiles,
    settings,
    teams,
    coopStars,
    awards,
  } = gameState;
  const activeCat = activeRound
    ? CATEGORY_MAP[activeRound.category]
    : CATEGORIES[0];
  const roundMeta = activeRound
    ? ROUND_TYPE_META[activeRound.roundType]
    : ROUND_TYPE_META.quiz;
  const modeMeta = GAME_MODE_META[settings.gameMode];

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="tv-safe-area studio-stage-bg relative select-none"
    >
      {/* LG Magic Remote Action Toast */}
      {remoteToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-7 py-3 rounded-2xl bg-[#070B18]/95 border-2 border-[#F5C542] text-[#F5C542] font-display text-2xl shadow-[0_0_30px_rgba(245,197,66,0.55)] pointer-events-none">
          {remoteToast}
        </div>
      )}
      {/* Animated OLED Studio Spotlights */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden z-0"
        aria-hidden="true"
      >
        <div
          className="spotlight-beam absolute -top-24 -left-24 w-[48vw] h-[48vw] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 65%)',
          }}
        />
        <div
          className="spotlight-beam absolute -top-24 -right-24 w-[48vw] h-[48vw] rounded-full"
          style={{
            animationDelay: '3s',
            background:
              'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Hidden anti-screensaver canvas & looping silent video for LG webOS */}
      <canvas
        ref={antiSaverCanvasRef}
        width={16}
        height={16}
        className="fixed bottom-1 right-1 w-2 h-2 opacity-10 pointer-events-none"
      />
      <video
        ref={antiSaverVideoRef}
        muted
        loop
        playsInline
        className="fixed bottom-1 right-1 w-1 h-1 opacity-0 pointer-events-none"
      />

      {/* TOP STUDIO HEADER BAR */}
      <header className="flex items-center justify-between gap-6 studio-panel rounded-2xl px-7 py-3.5 z-10">
        <div className="flex items-center gap-4">
          <span className="text-4xl">🎬</span>
          <div>
            <h1 className="font-display text-3xl text-white leading-tight">
              {gameState.showTitle}
            </h1>
            <div className="text-lg text-[#F5C542] font-semibold">
              {gameState.subtitle}
            </div>
          </div>
        </div>

        {/* Center Status Badges */}
        <div className="flex items-center gap-4">
          <div className="px-5 py-2 rounded-xl bg-[#1B2752] border border-[#F5C542]/40 flex items-center gap-2.5">
            <span className="text-2xl">{modeMeta.emoji}</span>
            <span className="font-display text-xl text-white">
              {modeMeta.name}
            </span>
          </div>

          {activeRound && (
            <div className="px-5 py-2 rounded-xl bg-[#F5C542] text-[#070B18] font-display text-2xl font-bold">
              Ronde {activeRound.roundNumber} / {activeRound.totalRounds}
            </div>
          )}

          {activeRound && phase !== 'WHEEL_SPIN' && (
            <div
              className="px-5 py-2 rounded-xl font-display text-xl text-white flex items-center gap-2 shadow-md"
              style={{ backgroundColor: activeCat.color }}
            >
              <span>{activeCat.emoji}</span>
              <span>{activeCat.shortName}</span>
            </div>
          )}

          {activeRound &&
            activeRound.bonusType &&
            activeRound.bonusType !== 'none' && (
              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#F5C542] to-amber-500 text-[#070B18] font-display text-xl font-bold animate-pulse">
                {ROUND_BONUS_META[activeRound.bonusType].emoji}{' '}
                {ROUND_BONUS_META[activeRound.bonusType].label}
              </div>
            )}

          {!socketConnected && (
            <div className="px-4 py-2 rounded-xl bg-rose-600 text-white font-display text-lg flex items-center gap-2 animate-pulse">
              <WifiOff className="w-5 h-5" /> Herverbinden...
            </div>
          )}
        </div>

        {/* Co-op Family Crown + LG Magic Remote Controls */}
        <div className="flex items-center gap-3">
          {settings.gameMode === 'coop' && (
            <div className="flex items-center gap-2 bg-[#1B2752] px-4 py-2 rounded-xl border border-[#F5C542]">
              <Crown className="w-6 h-6 text-[#F5C542]" />
              <span className="font-display text-lg text-[#F5C542] mr-1">
                Gezins-Kroon:
              </span>
              <div className="flex items-center gap-1.5">
                {CATEGORIES.map((cat) => {
                  const hasStar = coopStars.includes(cat.id);
                  return (
                    <div
                      key={cat.id}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border ${
                        hasStar
                          ? 'scale-110 border-white shadow-[0_0_10px_rgba(245,197,66,0.8)]'
                          : 'opacity-25 border-white/30 bg-slate-900'
                      }`}
                      style={{
                        backgroundColor: hasStar ? cat.color : undefined,
                      }}
                    >
                      ⭐
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Contextual LG Magic Remote Controls (large air-mouse + D-pad buttons) */}
          {phase === 'LOBBY' && (
            <button
              type="button"
              data-tv-control="1"
              onClick={() =>
                sendTvControl('testSound', '🔊 Geluidstest afgespeeld!')
              }
              title="Geluidstest (Groene knop)"
              className="tv-focusable min-h-[48px] px-4 py-2 rounded-xl bg-[#1B2752] border border-emerald-400/50 text-emerald-300 font-display text-lg flex items-center gap-2 hover:bg-emerald-500/20"
            >
              <BellRing className="w-5 h-5" />
              <span>Test</span>
            </button>
          )}

          {phase !== 'LOBBY' && phase !== 'FINALE' && (
            <>
              <button
                type="button"
                data-tv-control="1"
                onClick={() =>
                  phase === 'PAUSED'
                    ? sendTvControl('resume', '▶️ Show hervat!')
                    : sendTvControl('pause', '⏸️ Show gepauzeerd')
                }
                title="Pauze / Hervat (Rode knop)"
                className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-rose-400/50 text-white font-display text-lg flex items-center gap-1.5 hover:bg-rose-500/20"
              >
                {phase === 'PAUSED' ? (
                  <Play className="w-5 h-5 text-[#4ADE80]" />
                ) : (
                  <Pause className="w-5 h-5 text-amber-300" />
                )}
              </button>

              <button
                type="button"
                data-tv-control="1"
                onClick={() =>
                  sendTvControl('addTime', '⏱️ +15 seconden extra!')
                }
                title="+15 seconden (Groene knop)"
                className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-emerald-400/50 text-emerald-300 font-display text-lg flex items-center gap-1 hover:bg-emerald-500/20"
              >
                <PlusCircle className="w-5 h-5" />
                <span>15s</span>
              </button>

              {activeRound?.roundType === 'sound' && (
                <button
                  type="button"
                  data-tv-control="1"
                  onClick={() =>
                    sendTvControl('replaySound', '🔊 Geluid opnieuw!')
                  }
                  title="Geluid opnieuw (Terugspoelen)"
                  className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-sky-400/50 text-sky-300 font-display text-lg flex items-center gap-1 hover:bg-sky-500/20"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}

              <button
                type="button"
                data-tv-control="1"
                onClick={() => sendTvControl('skip', '⏭️ Volgende stap')}
                title="Volgende stap (Doorspoelen)"
                className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-white/25 text-slate-200 font-display text-lg flex items-center gap-1 hover:bg-white/15"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            data-tv-control="1"
            onClick={() =>
              sendTvControl(
                'toggleMute',
                !gameState.tvMuted
                  ? '🔇 TV-geluid gedempt'
                  : '🔊 TV-geluid weer aan'
              )
            }
            title="TV-geluid aan/uit (Gele knop)"
            className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-amber-400/40 flex items-center justify-center hover:bg-amber-400/15"
          >
            {gameState.tvMuted ? (
              <VolumeX className="w-6 h-6 text-red-400" />
            ) : (
              <Volume2 className="w-6 h-6 text-[#22C55E]" />
            )}
          </button>

          <button
            type="button"
            data-tv-control="1"
            onClick={toggleFullscreen}
            title="Volledig scherm (Blauwe knop)"
            className="tv-focusable min-h-[48px] px-3.5 py-2 rounded-xl bg-[#1B2752] border border-sky-400/40 text-sky-300 flex items-center justify-center hover:bg-sky-400/15"
          >
            {isFullscreen ? (
              <Minimize2 className="w-6 h-6" />
            ) : (
              <Maximize2 className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      {/* CENTRAL SHOW STAGE */}
      <main className="flex-1 my-4 flex items-center justify-center relative overflow-hidden">
        {/* 1. LOBBY VIEW */}
        {phase === 'LOBBY' && (
          <div className="grid grid-cols-12 gap-8 w-full h-full items-center">
            {/* QR & Join Card */}
            <div className="col-span-5 studio-panel-gold rounded-3xl p-7 flex flex-col items-center text-center gap-5">
              <div className="text-[#F5C542] font-display text-2xl">
                📱 STAP IN MET TELEFOON OF TABLET
              </div>
              {gameState.qrDataUrl && (
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  <img
                    src={gameState.qrDataUrl}
                    alt="Scan QR om mee te spelen"
                    className="w-52 h-52"
                  />
                </div>
              )}
              <div>
                <div className="text-slate-300 text-lg mb-1">
                  Open op telefoon of tablet:
                </div>
                <div className="px-6 py-2.5 rounded-xl bg-[#070B18] border-2 border-[#F5C542] font-display text-3xl text-[#F5C542] tracking-wide">
                  {gameState.qrUrl}
                </div>
              </div>
              <div className="text-base text-slate-300">
                Geen typwerk nodig! Tik op jouw eigen gezinskaart om direct op
                het podium te springen.
              </div>
            </div>

            {/* Family Podium Preview & Game Settings */}
            <div className="col-span-7 flex flex-col gap-6">
              <div className="studio-panel rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-3xl text-white flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-[#F5C542]" />
                    Onze Sterren in de Studio
                  </h2>
                  <span className="px-4 py-1.5 rounded-full bg-[#22C55E]/20 border border-[#22C55E] text-[#4ADE80] font-bold text-lg">
                    {players.filter((p) => p.connected).length} spelers klaar
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {profiles.map((prof) => {
                    const joinedPlayer = players.find(
                      (p) => p.profileId === prof.id
                    );
                    const isReady = Boolean(
                      joinedPlayer && joinedPlayer.connected
                    );
                    const avatarKey =
                      joinedPlayer?.avatarId || prof.defaultAvatarId;
                    const avatarInfo = AVATAR_CATALOG[avatarKey];

                    return (
                      <div
                        key={prof.id}
                        className={`rounded-2xl p-4 border-2 flex items-center gap-4 transition-all duration-300 ${
                          isReady
                            ? 'bg-[#1B2752] border-[#F5C542] shadow-[0_0_24px_rgba(245,197,66,0.3)] scale-[1.02]'
                            : 'bg-[#070B18]/60 border-white/10 opacity-65'
                        }`}
                      >
                        <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white/20">
                          <IllustrationView
                            illustrationId={
                              avatarInfo?.illustrationId || avatarKey
                            }
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-3xl text-white truncate">
                              {joinedPlayer?.name || prof.name}
                            </span>
                            {joinedPlayer?.isHost && (
                              <span className="px-2.5 py-0.5 text-xs rounded-full bg-[#F5C542] text-[#070B18] font-bold">
                                HOST
                              </span>
                            )}
                          </div>
                          <div className="text-base text-slate-300">
                            {prof.ageLabel}
                          </div>
                          <div
                            className={`mt-1 text-base font-bold ${
                              isReady ? 'text-[#4ADE80]' : 'text-slate-400'
                            }`}
                          >
                            {isReady
                              ? '✅ Klaar op het podium!'
                              : '⏳ Wacht op 1-tik instappen...'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Extra Guests if any joined */}
                {players.filter((p) => !p.profileId).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap gap-3">
                    {players
                      .filter((p) => !p.profileId)
                      .map((guest) => (
                        <div
                          key={guest.id}
                          className="px-4 py-2 rounded-xl bg-[#1B2752] border border-[#F5C542] flex items-center gap-3"
                        >
                          <span className="text-2xl">
                            {AVATAR_CATALOG[guest.avatarId]?.emoji || '⭐'}
                          </span>
                          <span className="font-display text-xl text-white">
                            {guest.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-200">
                            Gast · {guest.level}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Active Lobby Configuration Summary */}
              <div className="studio-panel rounded-2xl px-6 py-4 flex items-center justify-between">
                <div>
                  <div className="text-base text-slate-300 uppercase tracking-wider">
                    Gekozen Spelvorm
                  </div>
                  <div className="font-display text-2xl text-[#F5C542]">
                    {modeMeta.emoji} {modeMeta.name}
                  </div>
                </div>
                <div>
                  <div className="text-base text-slate-300 uppercase tracking-wider">
                    Spelduur
                  </div>
                  <div className="font-display text-2xl text-white">
                    {settings.totalRounds} Rondes
                  </div>
                </div>
                <div>
                  <div className="text-base text-slate-300 uppercase tracking-wider">
                    Rondemix & Thema&apos;s
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {settings.enabledRoundTypes.map((rt) => (
                      <span
                        key={rt}
                        className="px-2.5 py-1 rounded-lg bg-[#1B2752] text-sm font-bold text-white"
                      >
                        {ROUND_TYPE_META[rt].emoji} {ROUND_TYPE_META[rt].name.split(' ')[0]}
                      </span>
                    ))}
                    {(settings.enabledPacks || []).map((pk) => {
                      const pm = CONTENT_PACKS.find((x) => x.id === pk);
                      return pm ? (
                        <span
                          key={pk}
                          className="px-2.5 py-1 rounded-lg bg-[#F5C542]/20 border border-[#F5C542]/50 text-sm font-bold text-[#F5C542]"
                        >
                          {pm.emoji} {pm.name.split(' ')[0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              {/* Hall of Fame Record Ticker in TV Lobby */}
              {gameState.hallOfFame &&
                gameState.hallOfFame.totalGamesPlayed > 0 && (
                  <div className="studio-panel-gold rounded-2xl px-6 py-3 flex items-center justify-between text-lg">
                    <span className="font-display text-xl text-[#F5C542]">
                      🏆 Gezins Hall of Fame:
                    </span>
                    <span className="text-white font-semibold">
                      🎬 {gameState.hallOfFame.totalGamesPlayed} shows gespeeld
                    </span>
                    {gameState.hallOfFame.highestScoreRecord && (
                      <span className="text-[#4ADE80] font-bold">
                        ⭐ Topscore:{' '}
                        {gameState.hallOfFame.highestScoreRecord.playerName} (
                        {gameState.hallOfFame.highestScoreRecord.score} ptn)
                      </span>
                    )}
                    {gameState.hallOfFame.bestThirtySecondsRecord && (
                      <span className="text-purple-300 font-bold">
                        🎭 30s Record:{' '}
                        {
                          gameState.hallOfFame.bestThirtySecondsRecord
                            .playerName
                        }{' '}
                        ({gameState.hallOfFame.bestThirtySecondsRecord.count}{' '}
                        kaartjes)
                      </span>
                    )}
                  </div>
                )}

              {/* LG Magic Remote Sneltoetsen Legend */}
              <div className="studio-panel rounded-2xl px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-base text-slate-200">
                <span className="font-display text-lg text-[#F5C542]">
                  📺 LG Magic Remote:
                </span>
                <span>🔴 Pauze / Hervat</span>
                <span>🟢 Test / +15s</span>
                <span>🟡 Geluid aan/uit</span>
                <span>🔵 Volledig scherm</span>
                <span>⏩ Volgende</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. WHEEL SPIN VIEW */}
        {phase === 'WHEEL_SPIN' && activeRound && (
          <CategoryWheel
            targetIndex={activeRound.wheelTargetIndex || 0}
            selectedCategory={activeRound.category}
          />
        )}

        {/* 3. ROUND INTRO VIEW */}
        {phase === 'ROUND_INTRO' && activeRound && (
          <div className="studio-panel-gold rounded-3xl p-12 max-w-4xl w-full text-center flex flex-col items-center gap-6 animate-bounce-soft">
            {activeRound.bonusType && activeRound.bonusType !== 'none' && (
              <div className="px-8 py-2.5 rounded-2xl bg-gradient-to-r from-[#F5C542] to-amber-500 text-[#070B18] font-display text-3xl font-bold shadow-lg">
                {ROUND_BONUS_META[activeRound.bonusType].emoji}{' '}
                {ROUND_BONUS_META[activeRound.bonusType].label} —{' '}
                {ROUND_BONUS_META[activeRound.bonusType].description}
              </div>
            )}
            <div
              className="px-8 py-3 rounded-2xl font-display text-3xl text-white shadow-lg flex items-center gap-3"
              style={{ backgroundColor: activeCat.color }}
            >
              <span className="text-4xl">{activeCat.emoji}</span>
              <span>{activeCat.name}</span>
            </div>
            <div className="text-7xl my-2">{roundMeta.emoji}</div>
            <h2 className="font-display text-6xl text-[#F5C542]">
              {roundMeta.name}
            </h2>
            <p className="text-3xl text-slate-200 max-w-2xl">
              {roundMeta.shortDesc}
            </p>
          </div>
        )}

        {/* 4. ROUND ACTIVE & REVEAL: QUIZ */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'quiz' && (
            <div className="w-full h-full flex flex-col justify-between gap-5">
              {/* Top Prompt & Big Timer */}
              <div className="studio-panel-gold rounded-3xl px-8 py-5 flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-lg"
                    style={{ backgroundColor: activeCat.color }}
                  >
                    {activeCat.emoji}
                  </div>
                  <div>
                    <div className="text-[#F5C542] font-display text-xl uppercase">
                      🟣 Slimme Quiz op Eigen Niveau
                    </div>
                    <h2 className="font-display text-4xl text-white">
                      {phase === 'ROUND_ACTIVE'
                        ? 'Kijk op jouw eigen scherm en kies het juiste antwoord!'
                        : 'En dit zijn de antwoorden!'}
                    </h2>
                  </div>
                </div>

                {phase === 'ROUND_ACTIVE' && (
                  <div
                    className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-display text-5xl ${
                      activeRound.timerRemainingSec <= 5
                        ? 'border-red-500 bg-red-950/90 text-red-200 ring-4 ring-red-500/70 animate-pulse'
                        : 'border-[#F5C542] bg-[#070B18] text-[#F5C542]'
                    }`}
                  >
                    {activeRound.timerRemainingSec}
                  </div>
                )}
              </div>

              {phase === 'ROUND_REVEAL' && activeRound.familyBonusAwarded && (
                <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F5C542] via-amber-400 to-[#F5C542] text-[#070B18] font-display text-3xl font-bold text-center shadow-[0_0_30px_rgba(245,197,66,0.6)]">
                  🤝 GEZINS-BONUS GEWONNEN! Iedereen had het goed: +50 EXTRA PUNTEN!
                </div>
              )}

              {/* Player Quiz Status or Reveal Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
                {players.map((p) => {
                  const rev = activeRound.quizRevealedByPlayer?.[p.id];
                  const levelInfo = LEVEL_META[p.level];

                  return (
                    <div
                      key={p.id}
                      className={`rounded-3xl p-5 border-2 flex flex-col justify-between transition-all ${
                        phase === 'ROUND_REVEAL'
                          ? rev?.isCorrect
                            ? 'bg-emerald-950/70 border-[#22C55E] shadow-[0_0_30px_rgba(34,197,94,0.35)]'
                            : 'bg-rose-950/50 border-rose-500/60'
                          : p.hasAnswered
                          ? 'bg-[#1B2752] border-[#F5C542] shadow-[0_0_25px_rgba(245,197,66,0.3)]'
                          : 'bg-[#111936]/90 border-white/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <IllustrationView
                            illustrationId={
                              AVATAR_CATALOG[p.avatarId]?.illustrationId ||
                              p.avatarId
                            }
                          />
                        </div>
                        <div>
                          <div className="font-display text-3xl text-white">
                            {p.name}
                          </div>
                          <div className="text-lg text-[#F5C542]">
                            {levelInfo.label}
                          </div>
                        </div>
                      </div>

                      {phase === 'ROUND_ACTIVE' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-6 gap-3">
                          {p.paused ? (
                            <>
                              <div className="text-5xl">⏸️</div>
                              <div className="font-display text-2xl text-amber-300">
                                Even weg...
                              </div>
                            </>
                          ) : p.hasAnswered ? (
                            <>
                              <div className="w-20 h-20 rounded-full bg-[#22C55E]/20 border-2 border-[#22C55E] flex items-center justify-center text-[#4ADE80]">
                                <Lock className="w-10 h-10" />
                              </div>
                              <div className="font-display text-3xl text-[#4ADE80]">
                                Antwoord gekozen!
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-5xl animate-bounce">🤔</div>
                              <div className="font-display text-2xl text-slate-300">
                                Aan het denken...
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col justify-between py-3 gap-2">
                          <div className="text-xl text-slate-100 font-semibold line-clamp-2">
                            {rev?.prompt}
                          </div>

                          {rev?.correctOptionIllustrationId && (
                            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-white/20">
                              <IllustrationView
                                illustrationId={rev.correctOptionIllustrationId}
                              />
                            </div>
                          )}

                          <div className="bg-[#070B18]/70 rounded-xl p-3 text-center">
                            <div className="text-base text-slate-300 uppercase">
                              Juiste antwoord:
                            </div>
                            <div className="font-display text-2xl text-[#F5C542]">
                              {rev?.correctOptionLabel}
                            </div>
                          </div>

                          {rev?.funFact && (
                            <div className="text-base text-slate-200 bg-[#1B2752]/70 rounded-xl px-3 py-2 line-clamp-2">
                              💡 {rev.funFact}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            {rev?.isCorrect ? (
                              <span className="flex items-center gap-1.5 font-display text-2xl text-[#4ADE80]">
                                <CheckCircle2 className="w-7 h-7" /> GOED!
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 font-display text-2xl text-rose-400">
                                <XCircle className="w-7 h-7" /> Helaas
                              </span>
                            )}
                            <span className="font-display text-2xl text-[#F5C542]">
                              +{rev?.pointsEarned || 0} ptn
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* 5. ROUND ACTIVE & REVEAL: 30 SECONDS */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'thirty_seconds' && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {(() => {
                const actor = players.find(
                  (p) => p.id === activeRound.actorPlayerId
                );
                const guessers = players.filter((p) =>
                  activeRound.guesserPlayerIds?.includes(p.id)
                );

                return (
                  <div className="studio-panel-gold rounded-3xl p-8 max-w-5xl w-full flex flex-col items-center gap-6">
                    <div className="flex items-center justify-between w-full border-b border-white/15 pb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#F5C542]">
                          <IllustrationView
                            illustrationId={
                              actor
                                ? AVATAR_CATALOG[actor.avatarId]
                                    ?.illustrationId || actor.avatarId
                                : 'star'
                            }
                          />
                        </div>
                        <div>
                          <div className="text-[#F5C542] font-display text-xl uppercase">
                            🎭 De Verteller & Uitbeelder in de Spotlight
                          </div>
                          <div className="font-display text-5xl text-white">
                            {actor?.name || 'Speler'} is aan de beurt!
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-300 uppercase">
                          Wie mogen er raden?
                        </div>
                        <div className="font-display text-2xl text-[#4ADE80]">
                          {guessers.map((g) => g.name).join(', ') ||
                            'Het hele gezin!'}
                        </div>
                      </div>
                    </div>

                    {phase === 'ROUND_ACTIVE' ? (
                      <div className="flex items-center justify-around w-full py-6">
                        {!activeRound.thirtySecondsStarted ? (
                          <div className="text-center py-6">
                            <div className="text-6xl mb-4 animate-bounce">
                              👀
                            </div>
                            <div className="font-display text-4xl text-white mb-2">
                              Wachten tot {actor?.name} op{' '}
                              <span className="text-[#F5C542]">[START]</span>{' '}
                              drukt...
                            </div>
                            <div className="text-2xl text-slate-300">
                              {actor?.level === 'ontdekker'
                                ? `${actor.name} krijgt 45 seconden en grote plaatjes om uit te beelden of geluiden bij te maken!`
                                : actor?.level === 'avonturier'
                                ? `${actor.name} krijgt 40 seconden voor 4 woorden met plaatjes!`
                                : '30 seconden voor 5 begrippen — zet hem op!'}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Giant Neon Countdown Clock */}
                            <div className="flex flex-col items-center">
                              <div
                                className={`w-48 h-48 rounded-full border-8 flex flex-col items-center justify-center shadow-[0_0_50px_rgba(245,197,66,0.4)] ${
                                  activeRound.timerRemainingSec <= 10
                                    ? 'border-red-500 bg-red-950/70 text-red-300 animate-pulse'
                                    : 'border-[#F5C542] bg-[#070B18] text-[#F5C542]'
                                }`}
                              >
                                <span className="font-display text-7xl">
                                  {activeRound.timerRemainingSec}
                                </span>
                                <span className="text-base uppercase tracking-wider text-slate-300">
                                  seconden
                                </span>
                              </div>
                            </div>

                            {/* Live Guessed Counter */}
                            <div className="bg-[#070B18]/80 border-2 border-[#22C55E] rounded-3xl px-12 py-8 text-center">
                              <div className="text-2xl text-slate-300 mb-2">
                                Live Score deze beurt:
                              </div>
                              <div className="font-display text-7xl text-[#4ADE80]">
                                ⭐ {activeRound.thirtySecondsGuessedCount || 0}{' '}
                                geraden!
                              </div>
                              <div className="text-xl text-[#F5C542] mt-2">
                                +
                                {(activeRound.thirtySecondsGuessedCount || 0) *
                                  (activeRound.bonusType === 'double_points'
                                    ? 80
                                    : 40)}{' '}
                                punten
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Reveal of Guessed & Skipped cards */
                      <div className="w-full">
                        <div className="font-display text-3xl text-[#F5C542] mb-4 text-center">
                          ⭐ {activeRound.thirtySecondsGuessedCount || 0}{' '}
                          kaartjes geraden door het team! (+
                          {(activeRound.thirtySecondsGuessedCount || 0) *
                            (activeRound.bonusType === 'double_points'
                              ? 80
                              : 40)}{' '}
                          punten)
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {(activeRound.thirtySecondsRevealedItems || []).map(
                            (item) => (
                              <div
                                key={item.id}
                                className={`rounded-2xl p-3 border-2 flex flex-col items-center text-center gap-2 ${
                                  item.status === 'guessed'
                                    ? 'bg-emerald-950/80 border-[#22C55E]'
                                    : 'bg-slate-900/80 border-white/20 opacity-70'
                                }`}
                              >
                                {(item.illustrationId || item.imageUrl) && (
                                  <div className="w-20 h-20 rounded-xl overflow-hidden">
                                    <IllustrationView
                                      illustrationId={item.illustrationId}
                                      imageUrl={item.imageUrl}
                                    />
                                  </div>
                                )}
                                <div className="font-display text-xl text-white">
                                  {item.word}
                                </div>
                                <div className="text-sm font-bold">
                                  {item.status === 'guessed'
                                    ? '✅ Geraden!'
                                    : '⏭️ Overgeslagen'}
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        {/* 6. ROUND ACTIVE & REVEAL: SOUND CHALLENGE ("Wat hoor je?") */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'sound' && (
            <div className="w-full h-full flex flex-col justify-between gap-6">
              <div className="studio-panel-gold rounded-3xl px-8 py-5 flex items-center justify-between">
                <div>
                  <div className="text-[#38BDF8] font-display text-xl uppercase">
                    🔊 Wat hoor je? — Geluiden-Quiz
                  </div>
                  <h2 className="font-display text-4xl text-white">
                    {activeRound.soundPrompt}
                  </h2>
                </div>

                {/* Neon Audio Equalizer */}
                <div className="flex items-end gap-1.5 h-16 px-6">
                  {[
                    0.4, 0.9, 0.6, 1.0, 0.5, 0.8, 0.3, 0.95, 0.7, 0.4, 0.85,
                    0.6,
                  ].map((delay, idx) => (
                    <div
                      key={idx}
                      className="w-2.5 bg-gradient-to-t from-[#3B82F6] via-[#A855F7] to-[#F5C542] rounded-full eq-bar"
                      style={{
                        height: '100%',
                        animationDelay: `${idx * 0.09}s`,
                        animationDuration: `${0.6 + delay * 0.4}s`,
                      }}
                    />
                  ))}
                </div>

                {phase === 'ROUND_ACTIVE' && (
                  <div className="w-20 h-20 rounded-full border-4 border-[#F5C542] bg-[#070B18] flex items-center justify-center font-display text-4xl text-[#F5C542]">
                    {activeRound.timerRemainingSec}
                  </div>
                )}
              </div>

              {phase === 'ROUND_REVEAL' && activeRound.familyBonusAwarded && (
                <div className="px-6 py-3 rounded-2xl bg-gradient-to-r from-[#F5C542] via-amber-400 to-[#F5C542] text-[#070B18] font-display text-3xl font-bold text-center shadow-[0_0_30px_rgba(245,197,66,0.6)]">
                  🤝 GEZINS-BONUS GEWONNEN! Iedereen had het geluid goed: +50 EXTRA PUNTEN!
                </div>
              )}

              {/* 4 Big Picture Options on TV */}
              <div className="grid grid-cols-4 gap-6 flex-1">
                {(activeRound.soundOptions || []).map((opt) => {
                  const isCorrect =
                    phase === 'ROUND_REVEAL' &&
                    opt.id === activeRound.soundCorrectOptionId;
                  const isDimmed =
                    phase === 'ROUND_REVEAL' &&
                    opt.id !== activeRound.soundCorrectOptionId;

                  return (
                    <div
                      key={opt.id}
                      className={`rounded-3xl p-5 border-4 flex flex-col items-center justify-center gap-4 transition-all ${
                        isCorrect
                          ? 'bg-emerald-950/90 border-[#22C55E] scale-105 shadow-[0_0_40px_rgba(34,197,94,0.5)]'
                          : isDimmed
                          ? 'bg-[#111936]/40 border-white/10 opacity-40'
                          : 'bg-[#111936] border-[#3B82F6]/50'
                      }`}
                    >
                      <div className="w-40 h-40 rounded-2xl overflow-hidden">
                        <IllustrationView
                          illustrationId={opt.illustrationId}
                          imageUrl={opt.imageUrl}
                          alt={opt.label}
                        />
                      </div>
                      <div className="font-display text-3xl text-white text-center">
                        {opt.label}
                      </div>
                      {isCorrect && (
                        <div className="px-4 py-1 rounded-full bg-[#22C55E] text-[#070B18] font-display text-xl font-bold">
                          ✅ JUISTE GELUID!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* 7. ROUND ACTIVE & REVEAL: ZOOM-IN FOTO (65" OLED Showstopper) */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'zoom_photo' && (
            <div className="w-full h-full grid grid-cols-12 gap-8 items-center">
              {/* Zooming Picture Stage */}
              <div className="col-span-8 h-full max-h-[54vh] studio-panel-gold rounded-3xl overflow-hidden relative flex items-center justify-center bg-[#070B18]">
                <div
                  className="w-full h-full flex items-center justify-center transition-transform duration-500 ease-linear"
                  style={{
                    transform: `scale(${activeRound.zoomCurrentScale || 1})`,
                    transformOrigin: `${
                      activeRound.zoomFocalPoint?.x ?? 50
                    }% ${activeRound.zoomFocalPoint?.y ?? 50}%`,
                  }}
                >
                  <div className="w-80 h-80">
                    <IllustrationView
                      illustrationId={activeRound.zoomIllustrationId}
                      imageUrl={activeRound.zoomImageUrl}
                    />
                  </div>
                </div>

                {/* Live Zoom Badge */}
                <div className="absolute top-4 left-4 px-5 py-2 rounded-xl bg-[#070B18]/85 border border-[#F5C542] font-display text-2xl text-[#F5C542]">
                  🔍 Zoom: {(activeRound.zoomCurrentScale || 1).toFixed(1)}×
                </div>

                {/* Buzzer Spotlight Overlay when someone buzzes! */}
                {phase === 'ROUND_ACTIVE' && activeRound.zoomBuzzedPlayerId && (
                  <div className="absolute inset-0 bg-[#070B18]/88 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    {(() => {
                      const buzzerPlayer = players.find(
                        (p) => p.id === activeRound.zoomBuzzedPlayerId
                      );
                      return (
                        <div className="studio-panel-gold rounded-3xl p-8 flex flex-col items-center gap-4 max-w-xl">
                          <div className="w-28 h-28 rounded-3xl overflow-hidden border-4 border-[#F5C542]">
                            <IllustrationView
                              illustrationId={
                                buzzerPlayer
                                  ? AVATAR_CATALOG[buzzerPlayer.avatarId]
                                      ?.illustrationId || buzzerPlayer.avatarId
                                  : 'star'
                              }
                            />
                          </div>
                          <div className="text-[#EC4899] font-display text-2xl uppercase">
                            🔴 BUZZER INGEDRUKT!
                          </div>
                          <div className="font-display text-6xl text-white">
                            {buzzerPlayer?.name} mag het zeggen!
                          </div>
                          <div className="text-2xl text-[#F5C542]">
                            Roep je antwoord hardop! De Host keurt op de
                            telefoon...
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Right Column: Live Points Ticker & Reveal Answer */}
              <div className="col-span-4 flex flex-col gap-6">
                <div className="studio-panel-gold rounded-3xl p-7 text-center">
                  <div className="text-[#EC4899] font-display text-2xl uppercase mb-2">
                    🔍 Zoom-in Foto
                  </div>
                  {phase === 'ROUND_ACTIVE' ? (
                    <>
                      <div className="text-slate-300 text-xl mb-2">
                        Druk op je rode BUZZER zodra je het herkent!
                      </div>
                      <div className="my-4 py-4 rounded-2xl bg-[#070B18] border-2 border-[#F5C542]">
                        <div className="text-base text-slate-400 uppercase">
                          Nu waard:
                        </div>
                        <div className="font-display text-7xl text-[#F5C542]">
                          {(activeRound.zoomPossiblePoints || 150) *
                            (activeRound.bonusType === 'double_points' ? 2 : 1)}
                        </div>
                        <div className="text-lg text-[#F5C542]">
                          {activeRound.bonusType === 'double_points'
                            ? 'punten (2× DUBBEL!)'
                            : 'punten'}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="my-4 py-6 rounded-2xl bg-emerald-950/90 border-2 border-[#22C55E]">
                      <div className="text-base text-emerald-300 uppercase mb-1">
                        Het juiste antwoord was:
                      </div>
                      <div className="font-display text-4xl text-white">
                        {activeRound.zoomRevealedAnswer}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* 7B. ROUND ACTIVE & REVEAL: PANTOMIME ("Wie of Wat ben ik?") */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'pantomime' && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {(() => {
                const actor = players.find(
                  (p) => p.id === activeRound.pantomimeActorId
                );
                const buzzerPlayer = players.find(
                  (p) => p.id === activeRound.pantomimeBuzzedPlayerId
                );

                return (
                  <div className="studio-panel-gold rounded-3xl p-10 max-w-5xl w-full flex flex-col items-center gap-6 text-center">
                    <div className="flex items-center gap-5">
                      <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-[#F5C542]">
                        <IllustrationView
                          illustrationId={
                            actor
                              ? AVATAR_CATALOG[actor.avatarId]
                                  ?.illustrationId || actor.avatarId
                              : 'star'
                          }
                        />
                      </div>
                      <div className="text-left">
                        <div className="text-[#22C55E] font-display text-2xl uppercase">
                          🎭 Wie of Wat ben ik? — Uitbeelden zonder woorden!
                        </div>
                        <h2 className="font-display text-5xl text-white">
                          {actor?.name} beeldt nu uit!
                        </h2>
                      </div>
                    </div>

                    {phase === 'ROUND_ACTIVE' ? (
                      !activeRound.pantomimeStarted ? (
                        <div className="py-6">
                          <div className="text-6xl mb-3 animate-bounce">🤫</div>
                          <div className="font-display text-4xl text-white">
                            Wachten tot {actor?.name} op{' '}
                            <span className="text-[#F5C542]">[START]</span>{' '}
                            drukt...
                          </div>
                          <div className="text-2xl text-slate-300 mt-2">
                            De rest houdt de rode BUZZER op de telefoon of
                            tablet gereed!
                          </div>
                        </div>
                      ) : buzzerPlayer ? (
                        <div className="studio-panel-gold rounded-3xl p-8 border-4 border-[#EC4899] flex flex-col items-center gap-3 w-full max-w-2xl">
                          <div className="text-[#EC4899] font-display text-2xl uppercase">
                            🔴 BUZZER INGEDRUKT!
                          </div>
                          <div className="font-display text-5xl text-white">
                            {buzzerPlayer.name} mag het zeggen!
                          </div>
                          <div className="text-2xl text-[#F5C542]">
                            Roep hardop wat {actor?.name} uitbeeldt!
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-around w-full py-4">
                          <div className="w-40 h-40 rounded-full border-8 border-[#F5C542] bg-[#070B18] flex flex-col items-center justify-center">
                            <span className="font-display text-6xl text-[#F5C542]">
                              {activeRound.timerRemainingSec}
                            </span>
                            <span className="text-base text-slate-300 uppercase">
                              sec
                            </span>
                          </div>
                          <div className="text-left max-w-xl">
                            <div className="font-display text-4xl text-white mb-2">
                              Kijk goed naar {actor?.name}!
                            </div>
                            <div className="text-2xl text-slate-300">
                              Herken je het? Druk direct op jouw rode{' '}
                              <span className="text-red-400 font-bold">
                                BUZZER!
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-8 bg-emerald-950/80 border-2 border-[#22C55E] rounded-3xl p-6 w-full justify-center">
                        {activeRound.pantomimeRevealedIllustrationId && (
                          <div className="w-36 h-36 rounded-2xl overflow-hidden border-2 border-white/30">
                            <IllustrationView
                              illustrationId={
                                activeRound.pantomimeRevealedIllustrationId
                              }
                            />
                          </div>
                        )}
                        <div className="text-left">
                          <div className="text-xl text-emerald-300 uppercase">
                            {actor?.name} beeldde uit:
                          </div>
                          <div className="font-display text-5xl text-white mt-1">
                            {activeRound.pantomimeRevealedAnswer}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

        {/* 7C. ROUND ACTIVE & REVEAL: ESTIMATE ("Dichtstbij Wint!") */}
        {(phase === 'ROUND_ACTIVE' || phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'estimate' && (
            <div className="w-full h-full flex flex-col justify-between gap-6">
              <div className="studio-panel-gold rounded-3xl px-8 py-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-[#F5C542]">
                    <IllustrationView
                      illustrationId={activeRound.estimateIllustrationId}
                    />
                  </div>
                  <div>
                    <div className="text-[#F97316] font-display text-2xl uppercase">
                      🎯 Dichtstbij Wint! — Schattingsronde (
                      {activeRound.estimateMin} t/m {activeRound.estimateMax}{' '}
                      {activeRound.estimateUnit})
                    </div>
                    <h2 className="font-display text-4xl text-white">
                      {activeRound.estimatePrompt}
                    </h2>
                  </div>
                </div>

                {phase === 'ROUND_ACTIVE' && (
                  <div className="w-24 h-24 rounded-full border-4 border-[#F5C542] bg-[#070B18] flex items-center justify-center font-display text-5xl text-[#F5C542]">
                    {activeRound.timerRemainingSec}
                  </div>
                )}
              </div>

              {phase === 'ROUND_ACTIVE' ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
                  {players.map((p) => (
                    <div
                      key={p.id}
                      className={`rounded-3xl p-6 border-2 flex flex-col items-center justify-center text-center gap-4 ${
                        p.hasAnswered
                          ? 'bg-[#1B2752] border-[#F5C542]'
                          : 'bg-[#111936]/90 border-white/15'
                      }`}
                    >
                      <div className="w-20 h-20 rounded-2xl overflow-hidden">
                        <IllustrationView
                          illustrationId={
                            AVATAR_CATALOG[p.avatarId]?.illustrationId ||
                            p.avatarId
                          }
                        />
                      </div>
                      <div className="font-display text-3xl text-white">
                        {p.name}
                      </div>
                      <div className="font-display text-2xl text-[#4ADE80]">
                        {p.paused
                          ? '⏸️ Even weg...'
                          : p.hasAnswered
                          ? '🔒 Schatting staat vast!'
                          : '🎚️ Aan het schuiven...'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="studio-panel-gold rounded-3xl p-7 flex-1 flex flex-col justify-between">
                  <div className="text-center">
                    <div className="text-xl text-slate-300 uppercase">
                      Het exacte antwoord is:
                    </div>
                    <div className="font-display text-6xl text-[#4ADE80] mt-1">
                      🎯 {activeRound.estimateRevealedCorrectValue}{' '}
                      {activeRound.estimateUnit}
                    </div>
                    {activeRound.estimateRevealedFunFact && (
                      <div className="text-xl text-slate-200 mt-2">
                        💡 {activeRound.estimateRevealedFunFact}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {players.map((p) => {
                      const res = activeRound.estimateRevealedByPlayer?.[p.id];
                      return (
                        <div
                          key={p.id}
                          className={`rounded-2xl p-4 border-2 text-center ${
                            res?.isWinner
                              ? 'bg-emerald-950/90 border-[#22C55E] scale-105 shadow-xl'
                              : 'bg-[#070B18]/80 border-white/15'
                          }`}
                        >
                          <div className="font-display text-2xl text-white">
                            {p.name}
                          </div>
                          <div className="font-display text-4xl text-[#F5C542] my-1">
                            {res ? `${res.value} ${activeRound.estimateUnit}` : '—'}
                          </div>
                          <div className="text-lg text-slate-300">
                            {res
                              ? `Verschil: ${res.diff} · +${res.pointsEarned} ptn`
                              : 'Geen schatting'}
                          </div>
                          {res?.isWinner && (
                            <div className="mt-1 inline-block px-3 py-0.5 rounded-full bg-[#22C55E] text-[#070B18] font-display text-lg font-bold">
                              🏆 DICHTSTBIJ!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* 8. SCOREBOARD VIEW */}
        {phase === 'SCOREBOARD' && (
          <div className="studio-panel-gold rounded-3xl p-8 max-w-5xl w-full flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <h2 className="font-display text-4xl text-[#F5C542] flex items-center gap-3">
                <Trophy className="w-10 h-10" />
                Tussenstand na Ronde {activeRound?.roundNumber}
              </h2>
              <div className="text-xl text-slate-300">
                Op naar het volgende Categorie-Rad!
              </div>
            </div>

            {(settings.gameMode === 'duo_fixed' ||
              settings.gameMode === 'duo_rotating') && (
              <div className="grid grid-cols-2 gap-6 mb-2">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl p-5 bg-[#070B18]/80 border-2 flex items-center justify-between"
                    style={{ borderColor: t.color }}
                  >
                    <div>
                      <div
                        className="font-display text-3xl"
                        style={{ color: t.color }}
                      >
                        {t.name}
                      </div>
                      <div className="text-lg text-slate-300">
                        {players
                          .filter((p) => t.playerIds.includes(p.id))
                          .map((p) => p.name)
                          .join(' & ')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-4xl text-white">
                        {t.score} ptn
                      </div>
                      <div className="text-base text-[#F5C542]">
                        {t.stars.length} / 6 ⭐
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className="rounded-2xl p-4 bg-[#1B2752] border border-white/15 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#F5C542] text-[#070B18] font-display text-2xl font-bold flex items-center justify-center">
                        #{idx + 1}
                      </div>
                      <div className="w-14 h-14 rounded-xl overflow-hidden">
                        <IllustrationView
                          illustrationId={
                            AVATAR_CATALOG[p.avatarId]?.illustrationId ||
                            p.avatarId
                          }
                        />
                      </div>
                      <div>
                        <div className="font-display text-3xl text-white">
                          {p.name}
                        </div>
                        <div className="text-sm text-slate-300">
                          {p.stars.length} / 6 Categorie-Sterren
                        </div>
                      </div>
                    </div>
                    <div className="font-display text-4xl text-[#F5C542]">
                      {p.score} ptn
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 9. FESTIVE FINALE: 1e-4e PODIUM / CO-OP TROPHY + PERSONAL AWARDS */}
        {phase === 'FINALE' && (
          <div className="w-full h-full flex flex-col justify-between gap-4">
            {/* Podium or Co-op Golden Family Trophy Banner */}
            {settings.gameMode === 'coop' ? (
              <div className="studio-panel-gold rounded-3xl p-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="text-7xl">🏆</div>
                  <div>
                    <div className="text-[#F5C542] font-display text-2xl uppercase">
                      🎆 SAMEN-MODUS GROTE FINALE 🎆
                    </div>
                    <h2 className="font-display text-4xl text-white">
                      {coopStars.length >= CATEGORIES.length
                        ? 'GOUDEN SHOW-TROFEE GEWONNEN! Alle 6 Sterren binnen!'
                        : `Geweldig samengespeeld: ${coopStars.length} van de 6 Sterren veroverd!`}
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {CATEGORIES.map((cat) => {
                    const has = coopStars.includes(cat.id);
                    return (
                      <div
                        key={cat.id}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${
                          has
                            ? 'border-white shadow-[0_0_16px_rgba(245,197,66,0.85)]'
                            : 'opacity-25 border-white/20 bg-slate-900'
                        }`}
                        style={{ backgroundColor: has ? cat.color : undefined }}
                      >
                        ⭐
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : settings.gameMode === 'duo_fixed' ? (
              /* Duo Fixed Team Victory Banner */
              <div className="studio-panel-gold rounded-3xl p-5 flex flex-col gap-3">
                <div className="text-center text-[#F5C542] font-display text-2xl uppercase">
                  🎆 DE GROTE FINALE — DUO-TEAM KAMPIOENEN 🎆
                </div>
                <div className="grid grid-cols-2 gap-6">
                  {[...teams]
                    .sort((a, b) => b.score - a.score || b.stars.length - a.stars.length)
                    .map((team, idx) => (
                      <div
                        key={team.id}
                        className="rounded-2xl p-5 bg-[#070B18]/85 border-4 flex items-center justify-between"
                        style={{ borderColor: team.color }}
                      >
                        <div>
                          <div className="font-display text-2xl text-[#F5C542]">
                            {idx === 0 ? '🏆 WINNEND TEAM!' : '🥈 2e PLEK'}
                          </div>
                          <div
                            className="font-display text-4xl"
                            style={{ color: team.color }}
                          >
                            {team.name}
                          </div>
                          <div className="text-xl text-white mt-1">
                            {players
                              .filter((pl) => team.playerIds.includes(pl.id))
                              .map((pl) => pl.name)
                              .join(' & ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-5xl text-white">
                            {team.score}
                          </div>
                          <div className="text-xl text-[#F5C542]">
                            {team.stars.length} / 6 ⭐
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              /* Ranked 1e - 4e Podium */
              <div className="studio-panel-gold rounded-3xl p-5 flex flex-col gap-3">
                <div className="text-center text-[#F5C542] font-display text-2xl uppercase">
                  🎆 DE GROTE FINALE — HET ERE-PODIUM 🎆
                </div>
                <div className="grid grid-cols-4 gap-4 items-end">
                  {[...players]
                    .sort((a, b) => b.score - a.score || b.stars.length - a.stars.length)
                    .map((pl, idx) => {
                      const medals = ['🥇 1e plek', '🥈 2e plek', '🥉 3e plek', '⭐ 4e plek'];
                      const heights = ['py-5 bg-amber-500/20 border-[#F5C542]', 'py-4 bg-slate-300/10 border-slate-300', 'py-3 bg-orange-900/25 border-orange-400', 'py-3 bg-[#111936] border-white/20'];
                      return (
                        <div
                          key={pl.id}
                          className={`rounded-2xl px-4 border-2 flex items-center justify-between gap-3 ${heights[idx] || heights[3]}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/30">
                              <IllustrationView
                                illustrationId={
                                  AVATAR_CATALOG[pl.avatarId]?.illustrationId ||
                                  pl.avatarId
                                }
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="font-display text-lg text-[#F5C542]">
                                {medals[idx] || `#${idx + 1}`}
                              </div>
                              <div className="font-display text-3xl text-white truncate">
                                {pl.name}
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-display text-3xl text-white">
                              {pl.score}
                            </div>
                            <div className="text-base text-[#F5C542]">
                              {pl.stars.length} ⭐
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Personal Awards Ceremony Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 flex-1">
              {awards.map((aw) => (
                <div
                  key={aw.id}
                  className="studio-panel-gold rounded-3xl p-4 flex flex-col items-center text-center justify-between"
                >
                  <div className="text-5xl">{aw.icon}</div>
                  <div>
                    <div className="text-base text-[#F5C542] uppercase font-bold tracking-wider">
                      Persoonlijke Medaille
                    </div>
                    <div className="font-display text-3xl text-white mt-0.5">
                      {aw.title}
                    </div>
                  </div>

                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#F5C542]">
                    <IllustrationView
                      illustrationId={
                        AVATAR_CATALOG[aw.avatarId]?.illustrationId ||
                        aw.avatarId
                      }
                    />
                  </div>

                  <div>
                    <div className="font-display text-3xl text-[#F5C542]">
                      {aw.playerName}
                    </div>
                    <div className="text-lg text-slate-200 mt-0.5 leading-snug">
                      {aw.subtitle}
                    </div>
                  </div>

                  <div className="px-4 py-1.5 rounded-xl bg-[#070B18] border border-[#F5C542]/50 font-display text-xl text-[#4ADE80] w-full">
                    {aw.valueLabel}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAUSE OVERLAY */}
        {phase === 'PAUSED' && (
          <div className="absolute inset-0 bg-[#070B18]/90 backdrop-blur-md z-40 flex items-center justify-center">
            <div className="studio-panel-gold rounded-3xl p-12 text-center max-w-2xl flex flex-col items-center gap-6">
              <div className="text-7xl">⏸️</div>
              <h2 className="font-display text-6xl text-[#F5C542]">
                PAUZE — Zo weer verder!
              </h2>
              <p className="text-2xl text-slate-300">
                Alle klokken staan netjes stil. Druk op de Host-telefoon of op
                de LG Magic Remote (<span className="text-[#F5C542] font-bold">OK</span> of{' '}
                <span className="text-rose-400 font-bold">Rood</span>) zodra
                iedereen weer zit!
              </p>
              <button
                ref={resumeBtnRef}
                type="button"
                autoFocus
                onClick={() => sendTvControl('resume', '▶️ Show hervat!')}
                className="tv-focusable px-10 py-5 rounded-2xl bg-gradient-to-r from-[#22C55E] to-emerald-500 text-[#070B18] font-display text-3xl font-bold shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-105 transition-transform"
              >
                ▶️ HERVAT DE SHOW
              </button>
            </div>
          </div>
        )}
      </main>

      {/* BOTTOM PLAYER PODIUM BAR WITH 6 CATEGORY STARS (Adapts to 1-6 players!) */}
      <footer
        className="grid gap-4 z-10"
        style={{
          gridTemplateColumns: `repeat(${Math.max(
            1,
            Math.min(6, players.length || 4)
          )}, minmax(0, 1fr))`,
        }}
      >
        {players.map((p: Player) => {
          const avatarInfo = AVATAR_CATALOG[p.avatarId];
          const isTurn =
            (activeRound?.roundType === 'thirty_seconds' &&
              activeRound.actorPlayerId === p.id) ||
            (activeRound?.roundType === 'pantomime' &&
              activeRound.pantomimeActorId === p.id);

          return (
            <div
              key={p.id}
              className={`rounded-2xl px-4 py-3 border-2 flex items-center justify-between transition-all ${
                p.paused
                  ? 'studio-panel opacity-60 border-amber-400/50'
                  : isTurn
                  ? 'bg-[#1B2752] border-[#F5C542] shadow-[0_0_25px_rgba(245,197,66,0.45)]'
                  : 'studio-panel'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
                  <IllustrationView
                    illustrationId={avatarInfo?.illustrationId || p.avatarId}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl text-white truncate">
                      {p.name}
                    </span>
                    {p.paused && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 font-bold">
                        ⏸️
                      </span>
                    )}
                    {!p.connected && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-amber-400"
                        title="Tijdelijk offline"
                      />
                    )}
                  </div>
                  {/* 6 Category Star Slots */}
                  <div className="flex items-center gap-1 mt-1">
                    {CATEGORIES.map((cat) => {
                      const earned = p.stars.includes(cat.id);
                      return (
                        <div
                          key={cat.id}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border transition-transform ${
                            earned
                              ? 'scale-110 border-white shadow-[0_0_8px_rgba(245,197,66,0.8)]'
                              : 'opacity-25 border-white/20 bg-slate-900'
                          }`}
                          style={{
                            backgroundColor: earned ? cat.color : undefined,
                          }}
                          title={cat.name}
                        >
                          ⭐
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-display text-4xl text-[#F5C542]">
                  {p.score}
                </div>
                <div className="text-base text-slate-300 uppercase">punten</div>
              </div>
            </div>
          );
        })}
      </footer>
    </div>
  );
};
