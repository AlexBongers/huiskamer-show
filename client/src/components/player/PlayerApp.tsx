import React, { useEffect, useRef, useState } from 'react';
import {
  AVATAR_CATALOG,
  CATEGORIES,
  CATEGORY_MAP,
  CONTENT_PACKS,
  ContentPackId,
  DifficultyLevel,
  FamilyProfile,
  GAME_MODE_META,
  GameMode,
  GameStatePayload,
  ROUND_BONUS_META,
  ROUND_TYPE_META,
  RoundType,
} from '@huiskamer-show/shared';
import {
  Volume2,
  Pause,
  Play,
  SkipForward,
  PlusCircle,
  RotateCcw,
  Check,
  Sparkles,
  UserPlus,
  LogOut,
  Users,
  WifiOff,
} from 'lucide-react';
import {
  socketService,
  StoredPlayerSession,
  vibrateDevice,
} from '../../services/socket';
import { speechService } from '../../services/speechService';
import { IllustrationView } from '../illustrations/IllustrationLibrary';

const OPTION_COLORS = [
  'from-emerald-600 to-emerald-800 border-emerald-400',
  'from-purple-600 to-purple-800 border-purple-400',
  'from-blue-600 to-blue-800 border-blue-400',
  'from-amber-500 to-orange-700 border-amber-300',
];

export const PlayerApp: React.FC = () => {
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [session, setSession] = useState<StoredPlayerSession | null>(() =>
    socketService.getStoredSession()
  );
  const [selectedProfile, setSelectedProfile] = useState<FamilyProfile | null>(
    null
  );
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestLevel, setGuestLevel] = useState<DifficultyLevel>('avonturier');
  const [guestAvatar, setGuestAvatar] = useState('star');
  const [confirmReset, setConfirmReset] = useState(false);
  const [coHostBarExpanded, setCoHostBarExpanded] = useState(false);
  const [showPlayerPauseMenu, setShowPlayerPauseMenu] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [socketConnected, setSocketConnected] = useState(true);
  const [estimateDraft, setEstimateDraft] = useState<number>(50);
  const [lastEstimateId, setLastEstimateId] = useState<string>('');

  // Anti-double-click 400ms debounce for Lucas (ontdekker)
  const lastTapTimeRef = useRef<number>(0);
  const lastSpokenQuestionIdRef = useRef<string>('');
  const lastVibratedSecondRef = useRef<number>(-1);

  useEffect(() => {
    const sock = socketService.socket;

    const handleState = (state: GameStatePayload) => {
      setGameState(state);
    };

    const handleSession = (res: {
      playerId: string;
      sessionToken: string;
      player: {
        id: string;
        profileId?: string;
        name: string;
        avatarId: string;
        level: DifficultyLevel;
      };
    }) => {
      const stored: StoredPlayerSession = {
        playerId: res.playerId,
        profileId: res.player.profileId,
        name: res.player.name,
        avatarId: res.player.avatarId,
        level: res.player.level,
        sessionToken: res.sessionToken,
      };
      setSession(stored);
      socketService.saveStoredSession(stored);
    };

    const handleConnect = () => {
      setSocketConnected(true);
      const existing = socketService.getStoredSession();
      if (existing) {
        sock.emit('player:join', existing);
      }
    };
    const handleDisconnect = () => setSocketConnected(false);

    sock.on('state:update', handleState);
    sock.on('player:session', handleSession);
    sock.on('connect', handleConnect);
    sock.on('disconnect', handleDisconnect);

    // If already connected and we have a stored session, auto-rejoin immediately
    const initialStored = socketService.getStoredSession();
    if (initialStored) {
      sock.emit('player:join', initialStored);
    }

    return () => {
      sock.off('state:update', handleState);
      sock.off('player:session', handleSession);
      sock.off('connect', handleConnect);
      sock.off('disconnect', handleDisconnect);
    };
  }, []);

  const myPlayer = gameState?.players.find((p) => p.id === session?.playerId);
  const myProfile = gameState?.profiles.find(
    (pr) => pr.id === myPlayer?.profileId
  );
  const shouldAutoSpeak =
    myProfile !== undefined
      ? myProfile.autoSpeak
      : myPlayer?.level === 'ontdekker';
  const privateView = gameState?.privateView;

  // Stop speech when leaving ROUND_ACTIVE so TTS never talks over Reveal/Scoreboard
  useEffect(() => {
    if (gameState?.phase && gameState.phase !== 'ROUND_ACTIVE') {
      speechService.stop();
    }
  }, [gameState?.phase]);

  // Keep player phones/tablets awake during the show (best-effort Screen Wake Lock)
  useEffect(() => {
    if (!session) return;
    let wakeLock: { release?: () => Promise<void> } | null = null;
    try {
      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        navigator.wakeLock
      ) {
        navigator.wakeLock
          .request('screen')
          .then((wl) => {
            wakeLock = wl;
          })
          .catch(() => {});
      }
    } catch {
      // ignore on HTTP or unsupported browsers
    }
    return () => {
      wakeLock?.release?.().catch?.(() => {});
    };
  }, [session]);

  // Auto-disarm "Nieuw Spel" confirmation after 4 seconds
  useEffect(() => {
    if (!confirmReset) return;
    const t = window.setTimeout(() => setConfirmReset(false), 4000);
    return () => window.clearTimeout(t);
  }, [confirmReset]);

  // Automatic Dutch TTS reading when autoSpeak is enabled (e.g. Lucas) & a new Quiz question arrives
  useEffect(() => {
    if (!myPlayer || !privateView?.myQuizQuestion) return;
    if (gameState?.phase !== 'ROUND_ACTIVE') return;

    const q = privateView.myQuizQuestion;
    if (shouldAutoSpeak && lastSpokenQuestionIdRef.current !== q.id) {
      lastSpokenQuestionIdRef.current = q.id;
      const optionLabels = q.options.map((o) => o.label).join(', of ');
      speechService.speak(
        `${q.spokenPrompt || q.prompt}. Kies uit: ${optionLabels}`
      );
    }
  }, [myPlayer, shouldAutoSpeak, privateView?.myQuizQuestion, gameState?.phase]);

  // Initialize estimate slider midpoint & auto-speak when a new Estimate round starts
  useEffect(() => {
    const est = privateView?.myEstimateChallenge;
    if (!est || gameState?.phase !== 'ROUND_ACTIVE') return;
    if (lastEstimateId !== est.id) {
      setLastEstimateId(est.id);
      const mid =
        Math.round(((est.min + est.max) / 2) / est.step) * est.step;
      setEstimateDraft(Math.max(est.min, Math.min(est.max, mid)));
      if (shouldAutoSpeak) {
        speechService.speak(est.spokenPrompt || est.prompt);
      }
    }
  }, [
    privateView?.myEstimateChallenge,
    gameState?.phase,
    lastEstimateId,
    shouldAutoSpeak,
  ]);

  // Vibrate when it's our 30 Seconds turn & in the last 5 seconds of 30 Seconds!
  useEffect(() => {
    if (
      gameState?.phase === 'ROUND_ACTIVE' &&
      privateView?.myThirtySecondsTurn?.isActor &&
      !privateView.myThirtySecondsTurn.started
    ) {
      vibrateDevice([50, 80, 50]);
    }

    const rem = gameState?.activeRound?.timerRemainingSec ?? 99;
    if (
      gameState?.phase === 'ROUND_ACTIVE' &&
      gameState.activeRound?.roundType === 'thirty_seconds' &&
      gameState.activeRound.thirtySecondsStarted &&
      privateView?.myThirtySecondsTurn?.isActor &&
      rem <= 5 &&
      rem > 0 &&
      lastVibratedSecondRef.current !== rem
    ) {
      lastVibratedSecondRef.current = rem;
      vibrateDevice(40);
    }
  }, [
    gameState?.phase,
    gameState?.activeRound?.roundType,
    gameState?.activeRound?.thirtySecondsStarted,
    gameState?.activeRound?.timerRemainingSec,
    privateView?.myThirtySecondsTurn,
  ]);

  const canPassDebounce = (isOntdekker: boolean): boolean => {
    const now = Date.now();
    const minGap = isOntdekker ? 400 : 180;
    if (now - lastTapTimeRef.current < minGap) {
      return false;
    }
    lastTapTimeRef.current = now;
    return true;
  };

  const handleJoinFamilyProfile = (prof: FamilyProfile, avatarOverride?: string) => {
    setHasUserInteracted(true);
    vibrateDevice(30);
    socketService.socket.emit('player:join', {
      profileId: prof.id,
      name: prof.name,
      avatarId: avatarOverride || prof.defaultAvatarId,
      level: prof.level,
    });
    setSelectedProfile(null);
  };

  const handleJoinGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;
    setHasUserInteracted(true);
    vibrateDevice(30);
    socketService.socket.emit('player:join', {
      name: guestName.trim(),
      avatarId: guestAvatar,
      level: guestLevel,
    });
    setShowGuestModal(false);
    setGuestName('');
  };

  const handleSwitchPlayer = () => {
    speechService.stop();
    socketService.socket.emit('player:leave');
    socketService.clearStoredSession();
    setSession(null);
    setSelectedProfile(null);
    setCoHostBarExpanded(false);
  };

  const sendHostControl = (action: string) => {
    vibrateDevice(25);
    socketService.socket.emit('host:control', { action });
    if (action === 'reset') {
      setConfirmReset(false);
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen studio-stage-bg flex items-center justify-center p-6 text-center">
        <div className="font-display text-2xl text-[#F5C542]">
          Verbinden met De Grote Huiskamer Show...
        </div>
      </div>
    );
  }

  // ============================================================================
  // 1-TAP FAMILY PICKER (IF NOT JOINED YET)
  // ============================================================================
  if (!session || !myPlayer) {
    return (
      <div className="min-h-screen w-full studio-stage-bg select-none">
        <div className="min-h-screen p-4 md:p-8 flex flex-col justify-between max-w-3xl mx-auto">
          <header className="text-center py-3">
          <div className="text-[#F5C542] font-display text-lg uppercase tracking-wider">
            🎬 {gameState.showTitle}
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-white mt-1">
            Wie ben jij? Tik op jouw kaart!
          </h1>
        </header>

        {/* Avatar Customizer Modal if a profile card was tapped to change avatar */}
        {selectedProfile ? (
          <div className="studio-panel-gold rounded-3xl p-6 my-auto flex flex-col items-center gap-6">
            <h2 className="font-display text-3xl text-white">
              Hoi {selectedProfile.name}! Kies jouw show-avatar:
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
              {selectedProfile.avatarOptions.map((avId) => {
                const av = AVATAR_CATALOG[avId];
                const isChosen =
                  (selectedAvatar || selectedProfile.defaultAvatarId) === avId;
                return (
                  <button
                    key={avId}
                    onClick={() => setSelectedAvatar(avId)}
                    className={`rounded-2xl p-4 border-4 flex flex-col items-center gap-2 transition-all ${
                      isChosen
                        ? 'bg-[#1B2752] border-[#F5C542] scale-105 shadow-[0_0_20px_rgba(245,197,66,0.4)]'
                        : 'bg-[#070B18]/70 border-white/15'
                    }`}
                  >
                    <div className="w-24 h-24 rounded-xl overflow-hidden">
                      <IllustrationView
                        illustrationId={av?.illustrationId || avId}
                      />
                    </div>
                    <span className="font-display text-xl text-white">
                      {av?.emoji} {av?.label || avId}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setSelectedProfile(null)}
                className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-200 font-display text-xl"
              >
                Terug
              </button>
              <button
                onClick={() =>
                  handleJoinFamilyProfile(
                    selectedProfile,
                    selectedAvatar || selectedProfile.defaultAvatarId
                  )
                }
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-[#F5C542] to-[#F59E0B] text-[#070B18] font-display text-2xl font-bold shadow-lg"
              >
                🚀 STAP OP HET PODIUM!
              </button>
            </div>
          </div>
        ) : (
          /* 4 Big Family Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
            {gameState.profiles.map((prof) => {
              const av = AVATAR_CATALOG[prof.defaultAvatarId];
              return (
                <div
                  key={prof.id}
                  className="studio-panel-gold rounded-3xl p-5 flex flex-col justify-between gap-4 hover:scale-[1.01] transition-transform"
                  style={{ borderColor: prof.color }}
                >
                  <div
                    onClick={() => handleJoinFamilyProfile(prof)}
                    className="flex items-center gap-4 cursor-pointer"
                  >
                    <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-white/25">
                      <IllustrationView
                        illustrationId={
                          av?.illustrationId || prof.defaultAvatarId
                        }
                      />
                    </div>
                    <div>
                      <div className="font-display text-3xl text-white">
                        {prof.name}
                      </div>
                      <div className="text-sm font-bold text-[#F5C542]">
                        {prof.ageLabel}
                      </div>
                      <div className="mt-2 inline-block px-4 py-1.5 rounded-xl bg-[#22C55E] text-[#070B18] font-display text-lg font-bold">
                        ▶ Direct Meespelen
                      </div>
                    </div>
                  </div>

                  {/* Quick Avatar Switch pills + Full Avatar Picker */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProfile(prof);
                        setSelectedAvatar(prof.defaultAvatarId);
                      }}
                      className="text-xs text-[#F5C542] underline underline-offset-2"
                    >
                      🎨 Kies grote avatar
                    </button>
                    <div className="flex items-center gap-1.5">
                      {prof.avatarOptions.map((avId) => (
                        <button
                          key={avId}
                          onClick={() => handleJoinFamilyProfile(prof, avId)}
                          className="w-9 h-9 rounded-lg bg-[#070B18] border border-white/20 flex items-center justify-center text-lg hover:border-[#F5C542]"
                          title={AVATAR_CATALOG[avId]?.label}
                        >
                          {AVATAR_CATALOG[avId]?.emoji || '⭐'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* + Add Guest Button & Modal */}
        <footer className="py-2 text-center">
          {!showGuestModal ? (
            <button
              onClick={() => setShowGuestModal(true)}
              className="px-6 py-3 rounded-2xl bg-[#111936] border border-[#F5C542]/50 text-[#F5C542] font-display text-lg inline-flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" /> + Gast toevoegen (Opa, Oma of
              Vriendje)
            </button>
          ) : (
            <form
              onSubmit={handleJoinGuest}
              className="studio-panel rounded-2xl p-5 text-left flex flex-col gap-4"
            >
              <div className="font-display text-2xl text-[#F5C542]">
                ✨ Gast-speler toevoegen
              </div>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Naam van gast..."
                className="w-full px-4 py-3 rounded-xl bg-[#070B18] border border-white/20 text-white text-lg"
                required
              />
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'ontdekker', label: 'Kleuter (5j)' },
                    { id: 'avonturier', label: 'Junior (7-10j)' },
                    { id: 'meester', label: 'Volwassene' },
                  ] as const
                ).map((lvl) => (
                  <button
                    type="button"
                    key={lvl.id}
                    onClick={() => setGuestLevel(lvl.id)}
                    className={`py-2.5 rounded-xl font-bold text-sm border ${
                      guestLevel === lvl.id
                        ? 'bg-[#F5C542] text-[#070B18] border-[#F5C542]'
                        : 'bg-[#070B18] text-slate-300 border-white/15'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
              <div>
                <div className="text-xs text-slate-300 mb-1.5">
                  Kies een avatar:
                </div>
                <div className="flex flex-wrap gap-2">
                  {['star', 'trex', 'unicorn', 'sonic_hedgehog', 'owl', 'fox', 'rocket', 'crown'].map(
                    (avId) => (
                      <button
                        type="button"
                        key={avId}
                        onClick={() => setGuestAvatar(avId)}
                        className={`w-11 h-11 rounded-xl border-2 text-xl flex items-center justify-center ${
                          guestAvatar === avId
                            ? 'bg-[#1B2752] border-[#F5C542] scale-110'
                            : 'bg-[#070B18] border-white/15'
                        }`}
                      >
                        {AVATAR_CATALOG[avId]?.emoji || '⭐'}
                      </button>
                    )
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
                >
                  Meedoen!
                </button>
              </div>
            </form>
          )}
        </footer>
        </div>
      </div>
    );
  }

  // ============================================================================
  // ACTIVE PLAYER CONTROLLER VIEW
  // ============================================================================
  const isOntdekker = myPlayer.level === 'ontdekker';
  const isAvonturier = myPlayer.level === 'avonturier';
  const activeRound = gameState.activeRound;
  const activeCat = activeRound
    ? CATEGORY_MAP[activeRound.category]
    : CATEGORIES[0];
  const showHostBarControls =
    myPlayer.isHost && (!myPlayer.isCoHost || coHostBarExpanded);

  return (
    <div
      onClick={() => {
        if (!hasUserInteracted) setHasUserInteracted(true);
      }}
      className="min-h-screen w-full studio-stage-bg select-none"
    >
      <div className="min-h-screen flex flex-col justify-between p-3 sm:p-5 max-w-3xl mx-auto">
      {/* Connection Lost Banner */}
      {!socketConnected && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl bg-rose-600 text-white font-display text-base flex items-center justify-center gap-2 animate-pulse shadow-lg">
          <WifiOff className="w-5 h-5" /> Verbinding kwijt — automatisch
          herverbinden...
        </div>
      )}

      {/* Individual Pause Banner ("Even weg") */}
      {myPlayer.paused && (
        <div className="mb-3 px-4 py-2.5 rounded-2xl bg-amber-900/90 border border-amber-400 text-amber-100 font-display text-base text-center">
          ⏸️ Je staat even op &quot;Even weg&quot; (WC-pauze). Papa/Mama zet je
          zo weer actief!
        </div>
      )}
      {/* 1. HOST CONTROL BAR (Always open for Papa, 1-tap toggleable for Co-Host Mama!) */}
      {myPlayer.isHost ? (
        <div className="studio-panel rounded-2xl p-2.5 mb-3 border border-[#F5C542]/50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-display uppercase tracking-wider text-[#F5C542] px-2">
                {myPlayer.isCoHost ? '👑 Co-Host Regie' : '🎩 Host Regie'}
              </span>
              {myPlayer.isCoHost && (
                <button
                  onClick={() => setCoHostBarExpanded((v) => !v)}
                  className="px-3 py-1 rounded-xl bg-[#1B2752] border border-[#F5C542]/40 text-xs font-bold text-[#F5C542]"
                >
                  {coHostBarExpanded ? 'Verberg regiebalk' : 'Toon regiebalk'}
                </button>
              )}
            </div>

            {showHostBarControls && (
              <div className="flex flex-wrap items-center gap-1.5">
                {gameState.phase !== 'LOBBY' && gameState.phase !== 'FINALE' && (
                  <>
                    {gameState.phase === 'PAUSED' ? (
                      <button
                        onClick={() => sendHostControl('resume')}
                        className="px-3 py-1.5 rounded-xl bg-[#22C55E] text-[#070B18] font-bold text-xs flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5" /> Hervat
                      </button>
                    ) : (
                      <button
                        onClick={() => sendHostControl('pause')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 text-[#070B18] font-bold text-xs flex items-center gap-1"
                      >
                        <Pause className="w-3.5 h-3.5" /> Pauze
                      </button>
                    )}

                    <button
                      onClick={() => sendHostControl('addTime')}
                      className="px-3 py-1.5 rounded-xl bg-[#1B2752] border border-white/20 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-[#F5C542]" /> +15s
                    </button>

                    <button
                      onClick={() => sendHostControl('skip')}
                      className="px-3 py-1.5 rounded-xl bg-[#1B2752] border border-white/20 text-white font-bold text-xs flex items-center gap-1"
                    >
                      <SkipForward className="w-3.5 h-3.5 text-[#38BDF8]" />{' '}
                      Overslaan
                    </button>
                  </>
                )}

                <button
                  onClick={() => sendHostControl('toggleMute')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs border ${
                    gameState.tvMuted
                      ? 'bg-red-950 border-red-400 text-red-200'
                      : 'bg-[#1B2752] border-white/20 text-white'
                  }`}
                >
                  {gameState.tvMuted ? '🔇 TV Stil' : '🔊 Geluid TV'}
                </button>

                <button
                  onClick={() => setShowPlayerPauseMenu((v) => !v)}
                  className="px-3 py-1.5 rounded-xl bg-[#1B2752] border border-white/20 text-white font-bold text-xs flex items-center gap-1"
                  title="Zet een speler tijdelijk op 'Even weg'"
                >
                  <Users className="w-3.5 h-3.5 text-[#F5C542]" /> Spelers
                </button>

                {gameState.phase !== 'LOBBY' && (
                  <>
                    {!confirmReset ? (
                      <button
                        onClick={() => setConfirmReset(true)}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Nieuw Spel
                      </button>
                    ) : (
                      <button
                        onClick={() => sendHostControl('reset')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold text-xs"
                      >
                        Zeker? Tik voor Lobby
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Host Individual Player Pause & Lobby Kick Drawer */}
          {showHostBarControls && showPlayerPauseMenu && (
            <div className="mt-2 pt-2 border-t border-white/15 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-300">
                Tik voor &apos;Even weg&apos;
                {gameState.phase === 'LOBBY' ? ' (of ✕ om te verwijderen)' : ''}:
              </span>
              {gameState.players.map((pl) => (
                <div key={pl.id} className="inline-flex items-center gap-1">
                  <button
                    onClick={() =>
                      socketService.socket.emit('host:togglePlayerPause', {
                        playerId: pl.id,
                      })
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      pl.paused
                        ? 'bg-amber-900 border-amber-400 text-amber-200'
                        : 'bg-[#070B18] border-white/20 text-white'
                    }`}
                  >
                    {pl.paused ? `⏸️ ${pl.name} (Even weg)` : `✅ ${pl.name}`}
                  </button>
                  {gameState.phase === 'LOBBY' && pl.id !== myPlayer.id && (
                    <button
                      onClick={() =>
                        socketService.socket.emit('host:kickPlayer', {
                          playerId: pl.id,
                        })
                      }
                      className="px-1.5 py-1 rounded-lg bg-rose-950/90 border border-rose-500/40 text-rose-200 text-xs font-bold"
                      title={`Verwijder ${pl.name} uit Lobby`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        gameState.noConnectedHost && (
          <div className="studio-panel rounded-2xl p-2.5 mb-3 border border-amber-400/60 flex items-center justify-between gap-2">
            <span className="text-xs text-amber-200">
              Geen Host verbonden op dit moment.
            </span>
            <button
              onClick={() => socketService.socket.emit('player:claimHost')}
              className="px-3 py-1.5 rounded-xl bg-[#F5C542] text-[#070B18] font-bold text-xs"
            >
              🎩 Neem Host-regie over
            </button>
          </div>
        )
      )}

      {/* 2. PLAYER TOP STATUS HEADER */}
      <header className="studio-panel rounded-2xl px-4 py-2.5 flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#F5C542]">
            <IllustrationView
              illustrationId={
                AVATAR_CATALOG[myPlayer.avatarId]?.illustrationId ||
                myPlayer.avatarId
              }
            />
          </div>
          <div>
            <div className="font-display text-xl text-white leading-tight">
              {myPlayer.name}
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              {CATEGORIES.map((cat) => {
                const has = myPlayer.stars.includes(cat.id);
                return (
                  <span
                    key={cat.id}
                    className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center ${
                      has ? 'opacity-100' : 'opacity-20 bg-slate-800'
                    }`}
                    style={{ backgroundColor: has ? cat.color : undefined }}
                  >
                    ⭐
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-display text-2xl text-[#F5C542]">
              {myPlayer.score} ptn
            </div>
          </div>
          <button
            onClick={handleSwitchPlayer}
            className="p-2 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white"
            title="Wissel speler"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 3. MAIN INTERACTIVE CONTROLLER AREA */}
      <main className="flex-1 flex flex-col justify-center">
        {/* PHASE: LOBBY */}
        {gameState.phase === 'LOBBY' && (
          <div className="studio-panel-gold rounded-3xl p-5 flex flex-col gap-5">
            <div className="text-center">
              <div className="text-4xl mb-1">🎉</div>
              <h2 className="font-display text-3xl text-white">
                Je staat op het TV-Podium, {myPlayer.name}!
              </h2>
              <p className="text-base text-slate-300">
                {myPlayer.isHost
                  ? 'Kies hieronder de spelvorm en start de show zodra iedereen klaar zit!'
                  : 'Kijk naar de grote TV — Papa of Mama start zo het spel!'}
              </p>
            </div>

            {/* Host Lobby Configuration Controls */}
            {myPlayer.isHost && (
              <div className="flex flex-col gap-4 pt-3 border-t border-white/15">
                {/* 1. Spelduur */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#F5C542] block mb-2">
                    1. Spelduur kiezen
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { rounds: 8, label: '⚡ Snel (8 rondes)' },
                      { rounds: 14, label: '🍿 Gezinsavond (14)' },
                      { rounds: 20, label: '🎬 Grote Show (20)' },
                    ].map((opt) => (
                      <button
                        key={opt.rounds}
                        onClick={() =>
                          socketService.socket.emit('host:configure', {
                            totalRounds: opt.rounds,
                          })
                        }
                        className={`py-3 px-2 rounded-xl font-display text-base border-2 transition-all ${
                          gameState.settings.totalRounds === opt.rounds
                            ? 'bg-[#F5C542] text-[#070B18] border-white font-bold'
                            : 'bg-[#070B18] text-white border-white/15'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Spelvorm */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#F5C542] block mb-2">
                    2. Spelvorm kiezen (Alle 3 + Wisselende Duo&apos;s)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ['solo', 'duo_fixed', 'duo_rotating', 'coop'] as GameMode[]
                    ).map((gm) => {
                      const meta = GAME_MODE_META[gm];
                      const active = gameState.settings.gameMode === gm;
                      return (
                        <button
                          key={gm}
                          onClick={() =>
                            socketService.socket.emit('host:configure', {
                              gameMode: gm,
                            })
                          }
                          className={`p-3 rounded-xl text-left border-2 transition-all ${
                            active
                              ? 'bg-[#1B2752] border-[#F5C542]'
                              : 'bg-[#070B18]/70 border-white/15'
                          }`}
                        >
                          <div className="font-display text-lg text-white">
                            {meta.emoji} {meta.name}
                          </div>
                          <div className="text-xs text-slate-300 line-clamp-2">
                            {meta.description}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vaste Duo-Teams Indeling (1-tap switch team) */}
                {gameState.settings.gameMode === 'duo_fixed' && (
                  <div className="bg-[#070B18]/80 rounded-2xl p-3 border border-[#F5C542]/40">
                    <div className="text-xs font-bold uppercase text-[#F5C542] mb-2">
                      🤝 Tik op een speler om van Duo-Team te wisselen:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {gameState.players.map((pl) => {
                        const isGold = pl.teamId === 'team_gold';
                        return (
                          <button
                            key={pl.id}
                            onClick={() =>
                              socketService.socket.emit('host:configure', {
                                teamAssignments: {
                                  [pl.id]: isGold ? 'team_neon' : 'team_gold',
                                },
                              })
                            }
                            className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between ${
                              isGold
                                ? 'bg-amber-950/60 border-[#F5C542] text-[#F5C542]'
                                : 'bg-purple-950/60 border-[#A855F7] text-purple-200'
                            }`}
                          >
                            <span className="font-display text-base text-white">
                              {pl.name}
                            </span>
                            <span className="text-xs font-bold">
                              {isGold ? '🟡 Team Goud' : '🟣 Team Neon'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Rondemix (Alle 6 Rondetypes!) */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#F5C542] block mb-2">
                    3. Rondetypes aan/uit (6 Spelvormen)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {(
                      [
                        'quiz',
                        'thirty_seconds',
                        'sound',
                        'zoom_photo',
                        'pantomime',
                        'estimate',
                      ] as RoundType[]
                    ).map((rt) => {
                      const enabled =
                        gameState.settings.enabledRoundTypes.includes(rt);
                      const rMeta = ROUND_TYPE_META[rt];
                      return (
                        <button
                          key={rt}
                          onClick={() => {
                            const curr = gameState.settings.enabledRoundTypes;
                            const next = enabled
                              ? curr.length > 1
                                ? curr.filter((x) => x !== rt)
                                : curr
                              : [...curr, rt];
                            socketService.socket.emit('host:configure', {
                              enabledRoundTypes: next,
                            });
                          }}
                          className={`py-2.5 px-3 rounded-xl font-bold text-sm border-2 flex items-center justify-center gap-1.5 ${
                            enabled
                              ? 'bg-[#1B2752] border-[#22C55E] text-white'
                              : 'bg-[#070B18]/50 border-white/10 text-slate-500'
                          }`}
                        >
                          <span>{rMeta.emoji}</span>
                          <span className="truncate">{rMeta.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Themapakketten & Seizoensmodi */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-[#F5C542] block mb-2">
                    4. Themapakketten & Seizoenen
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CONTENT_PACKS.map((pk) => {
                      const activePacks = gameState.settings.enabledPacks || [
                        'basis',
                        'kids_special',
                      ];
                      const enabled = activePacks.includes(pk.id);
                      return (
                        <button
                          key={pk.id}
                          onClick={() => {
                            const next = enabled
                              ? activePacks.length > 1
                                ? activePacks.filter((x) => x !== pk.id)
                                : activePacks
                              : [...activePacks, pk.id];
                            socketService.socket.emit('host:configure', {
                              enabledPacks: next as ContentPackId[],
                            });
                          }}
                          className={`py-2 px-2.5 rounded-xl font-bold text-xs border-2 flex items-center gap-1.5 ${
                            enabled
                              ? 'bg-amber-950/60 border-[#F5C542] text-[#F5C542]'
                              : 'bg-[#070B18]/50 border-white/10 text-slate-400'
                          }`}
                        >
                          <span>{pk.emoji}</span>
                          <span className="truncate">{pk.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Show-Verrassingen (2x / Gezins-Bonus) & TV Geluidstest */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      socketService.socket.emit('host:configure', {
                        surpriseMode: !gameState.settings.surpriseMode,
                      })
                    }
                    className={`py-2.5 px-3 rounded-xl font-bold text-xs border-2 ${
                      gameState.settings.surpriseMode
                        ? 'bg-purple-950/70 border-[#A855F7] text-purple-200'
                        : 'bg-[#070B18]/50 border-white/10 text-slate-400'
                    }`}
                  >
                    {gameState.settings.surpriseMode
                      ? '⚡ Show-Verrassingen: AAN (2× / Bonus)'
                      : '⚡ Show-Verrassingen: UIT'}
                  </button>
                  <button
                    type="button"
                    onClick={() => sendHostControl('testSound')}
                    className="py-2.5 px-3 rounded-xl bg-[#1B2752] border border-[#38BDF8] text-[#38BDF8] font-bold text-xs"
                  >
                    🔊 Test TV-Geluid
                  </button>
                </div>

                {/* Crash-Recovery Resume Saved Session Button if available */}
                {gameState.hasResumableSession &&
                  gameState.resumableSessionInfo && (
                    <button
                      onClick={() => {
                        vibrateDevice(50);
                        socketService.socket.emit('host:resumeSavedSession');
                      }}
                      className="w-full py-3.5 rounded-2xl bg-emerald-600 border-2 border-white text-[#070B18] font-display text-xl font-bold shadow-lg"
                    >
                      🔄 VORIG POTJE HERVATTEN (Ronde{' '}
                      {gameState.resumableSessionInfo.roundNumber} /{' '}
                      {gameState.resumableSessionInfo.totalRounds})
                    </button>
                  )}

                {/* START SHOW BUTTON */}
                <button
                  onClick={() => {
                    vibrateDevice(50);
                    socketService.socket.emit('host:startGame');
                  }}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#F5C542] to-[#F59E0B] text-[#070B18] font-display text-3xl font-bold shadow-[0_0_30px_rgba(245,197,66,0.5)] active:scale-95 transition-transform"
                >
                  🎬 START DE SHOW OP TV!
                </button>
              </div>
            )}
          </div>
        )}

        {/* PHASE: WHEEL_SPIN or ROUND_INTRO */}
        {(gameState.phase === 'WHEEL_SPIN' ||
          gameState.phase === 'ROUND_INTRO') && (
          <div className="studio-panel-gold rounded-3xl p-8 text-center flex flex-col items-center gap-4">
            <div className="text-6xl animate-bounce">
              {gameState.phase === 'WHEEL_SPIN' ? '🎡' : activeCat.emoji}
            </div>
            <h2 className="font-display text-3xl text-[#F5C542]">
              {gameState.phase === 'WHEEL_SPIN'
                ? 'Het grote rad draait op de TV...'
                : `${activeCat.name}!`}
            </h2>
            {activeRound && gameState.phase === 'ROUND_INTRO' && (
              <>
                <div className="text-2xl font-display text-white">
                  {ROUND_TYPE_META[activeRound.roundType].emoji}{' '}
                  {ROUND_TYPE_META[activeRound.roundType].name}
                </div>
                {activeRound.bonusType && activeRound.bonusType !== 'none' && (
                  <div className="px-4 py-2 rounded-2xl bg-gradient-to-r from-[#F5C542] to-amber-500 text-[#070B18] font-display text-lg font-bold">
                    {ROUND_BONUS_META[activeRound.bonusType].emoji}{' '}
                    {ROUND_BONUS_META[activeRound.bonusType].label}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ====================================================================
            ROUND TYPE 1: SLIMME QUIZ CONTROLLER (Adaptive per age!)
            ==================================================================== */}
        {(gameState.phase === 'ROUND_ACTIVE' ||
          gameState.phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'quiz' &&
          privateView?.myQuizQuestion && (
            <div className="flex flex-col gap-4">
              {/* Question Header + Dutch Read-Aloud Button for Lucas & Lana */}
              <div className="studio-panel-gold rounded-3xl p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span
                    className="px-3 py-1 rounded-lg font-display text-sm text-white"
                    style={{ backgroundColor: activeCat.color }}
                  >
                    {activeCat.emoji} {activeCat.shortName}
                  </span>
                  <span className="font-display text-2xl text-[#F5C542]">
                    ⏱️ {activeRound.timerRemainingSec}s
                  </span>
                </div>

                {/* Prompt text (or big TTS button for Lucas!) */}
                <h2
                  className={`font-display text-white ${
                    isOntdekker
                      ? 'text-2xl sm:text-3xl'
                      : 'text-xl sm:text-2xl'
                  }`}
                >
                  {privateView.myQuizQuestion.prompt}
                </h2>

                {(isOntdekker || isAvonturier) && (
                  <button
                    onClick={() => {
                      setHasUserInteracted(true);
                      const q = privateView.myQuizQuestion!;
                      const optionLabels = q.options.map((o) => o.label).join(', of ');
                      speechService.speak(
                        isOntdekker
                          ? `${q.spokenPrompt || q.prompt}. Kies uit: ${optionLabels}`
                          : q.spokenPrompt || q.prompt
                      );
                    }}
                    className={`mt-3 w-full py-3 rounded-2xl bg-[#3B82F6] text-white font-display text-xl flex items-center justify-center gap-2 shadow-md active:scale-95 ${
                      isOntdekker && !hasUserInteracted
                        ? 'ring-4 ring-[#F5C542] animate-pulse'
                        : ''
                    }`}
                  >
                    <Volume2 className="w-7 h-7" />{' '}
                    {isOntdekker && !hasUserInteracted
                      ? '🔊 TIK HIER OM DE VRAAG TE HOREN!'
                      : '🔊 LEES VRAAG VOOR'}
                  </button>
                )}
              </div>

              {/* 4 Answer Buttons (Giant >= 120px picture cards for Lucas & Lana!) */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {privateView.myQuizQuestion.options.map((opt, idx) => {
                  const selectedId =
                    privateView.myQuizQuestion?.selectedOptionId;
                  const correctId = privateView.myQuizQuestion?.correctOptionId;
                  const isSelected = selectedId === opt.id;
                  const isReveal = gameState.phase === 'ROUND_REVEAL';

                  let btnStyle = `bg-gradient-to-br ${
                    OPTION_COLORS[idx % OPTION_COLORS.length]
                  }`;
                  if (isReveal) {
                    if (opt.id === correctId) {
                      btnStyle =
                        'bg-emerald-600 border-4 border-white ring-4 ring-emerald-400 scale-[1.02]';
                    } else if (isSelected) {
                      btnStyle = 'bg-rose-800 border-rose-400 opacity-75';
                    } else {
                      btnStyle = 'bg-slate-900 border-white/10 opacity-40';
                    }
                  } else if (selectedId) {
                    btnStyle = isSelected
                      ? 'bg-[#F5C542] text-[#070B18] border-4 border-white scale-[1.03] shadow-[0_0_25px_rgba(245,197,66,0.6)]'
                      : 'bg-slate-900/70 border-white/10 opacity-45';
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={
                        Boolean(selectedId) ||
                        gameState.phase !== 'ROUND_ACTIVE'
                      }
                      onClick={() => {
                        if (!canPassDebounce(isOntdekker)) return;
                        vibrateDevice(40);
                        socketService.socket.emit('quiz:answer', {
                          optionId: opt.id,
                        });
                      }}
                      className={`min-h-[136px] sm:min-h-[164px] rounded-3xl p-3 sm:p-4 border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${btnStyle}`}
                    >
                      {(opt.illustrationId || opt.imageUrl) && (
                        <div
                          className={`${
                            isOntdekker
                              ? 'w-24 h-24 sm:w-32 sm:h-32'
                              : 'w-16 h-16 sm:w-20 sm:h-20'
                          } rounded-2xl overflow-hidden flex-shrink-0`}
                        >
                          <IllustrationView
                            illustrationId={opt.illustrationId}
                            imageUrl={opt.imageUrl}
                            alt={opt.label}
                          />
                        </div>
                      )}
                      <span
                        className={`font-display text-center leading-tight ${
                          isOntdekker
                            ? 'text-xl sm:text-2xl'
                            : 'text-lg sm:text-xl'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quiz Reveal Result & Fun Fact Banner */}
              {gameState.phase === 'ROUND_REVEAL' && (
                <div
                  className={`rounded-2xl p-4 border-2 text-center ${
                    myPlayer.lastAnswerCorrect
                      ? 'bg-emerald-950/90 border-[#22C55E]'
                      : 'bg-[#111936] border-[#F5C542]/50'
                  }`}
                >
                  {activeRound.familyBonusAwarded && (
                    <div className="mb-2 px-3 py-1 rounded-xl bg-[#F5C542] text-[#070B18] font-display text-base font-bold">
                      🤝 GEZINS-BONUS! +50 EXTRA PUNTEN VOOR IEDEREEN!
                    </div>
                  )}
                  <div className="font-display text-2xl text-white">
                    {myPlayer.lastAnswerCorrect
                      ? `🎉 SUPER GOED! +${myPlayer.lastPointsAwarded || 0} punten!`
                      : '👍 Bijna! Op naar de volgende ronde!'}
                  </div>
                  {privateView.myQuizQuestion.funFact && (
                    <div className="text-sm text-slate-200 mt-1">
                      💡 {privateView.myQuizQuestion.funFact}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* ====================================================================
            ROUND TYPE 2: 30 SECONDS FAMILIE-EDITIE CONTROLLER
            ==================================================================== */}
        {gameState.phase === 'ROUND_ACTIVE' &&
          activeRound?.roundType === 'thirty_seconds' && (
            <div>
              {privateView?.myThirtySecondsTurn ? (
                <div className="studio-panel-gold rounded-3xl p-5 flex flex-col gap-4">
                  {/* Secret Start Screen before timer starts */}
                  {!privateView.myThirtySecondsTurn.started ? (
                    <div className="text-center py-6 flex flex-col items-center gap-5">
                      <div className="text-6xl">🤫</div>
                      <h2 className="font-display text-3xl text-white">
                        {privateView.myThirtySecondsTurn.isHostHelperForLucas
                          ? `Beurt van ${privateView.myThirtySecondsTurn.actorName} (Host Hulp-knop)`
                          : 'Klaar? Kijk alleen op jouw scherm!'}
                      </h2>
                      <p className="text-lg text-slate-300">
                        {privateView.myThirtySecondsTurn.actorLevel ===
                        'ontdekker'
                          ? 'Beeld het plaatje uit, maak het geluid na of omschrijf het!'
                          : 'Omschrijf de woorden zonder het woord zelf te noemen!'}
                      </p>
                      <button
                        onClick={() => {
                          vibrateDevice(60);
                          socketService.socket.emit('thirtySeconds:start');
                        }}
                        className="w-full py-6 rounded-3xl bg-gradient-to-r from-[#22C55E] to-emerald-600 text-[#070B18] font-display text-3xl font-bold shadow-[0_0_30px_rgba(34,197,94,0.5)] active:scale-95"
                      >
                        🚀 START! ({activeRound.timerTotalSec} SEC)
                      </button>
                    </div>
                  ) : (
                    /* Active 30 Seconds Turn */
                    <>
                      <div className="flex items-center justify-between border-b border-white/15 pb-3">
                        <span className="font-display text-xl text-[#F5C542]">
                          ⭐ {activeRound.thirtySecondsGuessedCount || 0}{' '}
                          geraden!
                        </span>
                        <span
                          className={`font-display text-3xl px-4 py-1 rounded-xl ${
                            activeRound.timerRemainingSec <= 10
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-[#070B18] text-[#F5C542]'
                          }`}
                        >
                          ⏱️ {activeRound.timerRemainingSec}s
                        </span>
                      </div>

                      {/* CASE A: LUCAS ('ontdekker') OR HOST HELPER FOR LUCAS -> 1 Giant Picture at a time! */}
                      {privateView.myThirtySecondsTurn.actorLevel ===
                      'ontdekker' ? (
                        (() => {
                          const currentItem =
                            privateView.myThirtySecondsTurn.items[
                              privateView.myThirtySecondsTurn.activeItemIndex
                            ];
                          if (!currentItem) return null;

                          return (
                            <div className="flex flex-col items-center gap-4">
                              {privateView.myThirtySecondsTurn.isActor ? (
                                <>
                                  <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-3xl overflow-hidden border-4 border-[#F5C542] shadow-2xl">
                                    <IllustrationView
                                      illustrationId={
                                        currentItem.illustrationId
                                      }
                                      imageUrl={currentItem.imageUrl}
                                      alt={currentItem.word}
                                    />
                                  </div>
                                  <div className="font-display text-3xl text-white text-center">
                                    {currentItem.word}
                                  </div>
                                  <button
                                    onClick={() =>
                                      speechService.speak(currentItem.word)
                                    }
                                    className="px-5 py-2.5 rounded-2xl bg-[#3B82F6] text-white font-display text-lg flex items-center gap-2"
                                  >
                                    <Volume2 className="w-6 h-6" /> 🔊 Fluister
                                    woord
                                  </button>
                                </>
                              ) : (
                                <div className="text-center py-4">
                                  <div className="text-5xl mb-2">🦖</div>
                                  <div className="font-display text-2xl text-white">
                                    {
                                      privateView.myThirtySecondsTurn
                                        .actorName
                                    }{' '}
                                    beeldt nu plaatje #
                                    {privateView.myThirtySecondsTurn
                                      .activeItemIndex + 1}{' '}
                                    uit!
                                  </div>
                                  <div className="text-sm text-slate-300 mt-1">
                                    Tik hieronder mee terwijl Lucas zijn handen
                                    vrij heeft:
                                  </div>
                                </div>
                              )}

                              {/* Two Mega Buttons: GERADEN & VOLGENDE */}
                              <div className="grid grid-cols-2 gap-4 w-full mt-2">
                                <button
                                  onClick={() => {
                                    if (!canPassDebounce(true)) return;
                                    vibrateDevice(50);
                                    socketService.socket.emit(
                                      'thirtySeconds:mark',
                                      {
                                        itemId: currentItem.id,
                                        status: 'guessed',
                                      }
                                    );
                                  }}
                                  className="min-h-[110px] rounded-3xl bg-gradient-to-b from-[#22C55E] to-emerald-700 border-4 border-white text-[#070B18] font-display text-3xl font-bold shadow-xl active:scale-95"
                                >
                                  ✅ GERADEN!
                                </button>
                                <button
                                  onClick={() => {
                                    if (!canPassDebounce(true)) return;
                                    vibrateDevice(30);
                                    socketService.socket.emit(
                                      'thirtySeconds:mark',
                                      {
                                        itemId: currentItem.id,
                                        status: 'skipped',
                                      }
                                    );
                                  }}
                                  className="min-h-[110px] rounded-3xl bg-gradient-to-b from-[#F5C542] to-amber-600 border-4 border-white text-[#070B18] font-display text-3xl font-bold shadow-xl active:scale-95"
                                >
                                  ⏭️ VOLGENDE
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* CASE B: LANA ('avonturier', 4 words+icons) & PAPA/MAMA ('meester', 5 words) */
                        <div className="flex flex-col gap-3">
                          {privateView.myThirtySecondsTurn.items.map((item) => {
                            const isGuessed = item.status === 'guessed';
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  vibrateDevice(35);
                                  socketService.socket.emit(
                                    'thirtySeconds:mark',
                                    {
                                      itemId: item.id,
                                      status: isGuessed ? 'pending' : 'guessed',
                                    }
                                  );
                                }}
                                className={`w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                  isGuessed
                                    ? 'bg-emerald-700 border-emerald-300 text-white scale-[0.99]'
                                    : 'bg-[#1B2752] border-[#F5C542]/60 text-white'
                                }`}
                              >
                                <div className="flex items-center gap-3.5">
                                  {(item.illustrationId || item.imageUrl) && (
                                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                                      <IllustrationView
                                        illustrationId={item.illustrationId}
                                        imageUrl={item.imageUrl}
                                      />
                                    </div>
                                  )}
                                  <span className="font-display text-2xl text-left">
                                    {item.word}
                                  </span>
                                </div>

                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center border-2 ${
                                    isGuessed
                                      ? 'bg-white text-emerald-700 border-white'
                                      : 'bg-[#070B18] border-white/30 text-transparent'
                                  }`}
                                >
                                  <Check className="w-7 h-7 stroke-[3]" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* Guessing player view during 30 Seconds (plus optional Host guesser picker!) */
                <div className="studio-panel-gold rounded-3xl p-7 text-center flex flex-col items-center gap-4">
                  <div className="text-6xl animate-bounce">👂</div>
                  <h2 className="font-display text-3xl text-[#F5C542]">
                    Luister & Kijk goed en RAAD MEE!
                  </h2>
                  <p className="text-xl text-white">
                    Roep zo snel mogelijk wat er wordt uitgebeeld of omschreven!
                  </p>
                  <div className="font-display text-5xl text-[#4ADE80] mt-2">
                    ⭐ {activeRound.thirtySecondsGuessedCount || 0} geraden!
                  </div>

                  {/* Host can optionally pick who is guessing in Solo / Co-op mode */}
                  {myPlayer.isHost &&
                    (gameState.settings.gameMode === 'solo' ||
                      gameState.settings.gameMode === 'coop') && (
                      <div className="w-full pt-4 border-t border-white/15 text-left">
                        <div className="text-xs text-[#F5C542] font-bold uppercase mb-2">
                          🎩 Wie mag er raden? (optioneel aanpassen)
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              socketService.socket.emit('host:selectGuessers', {
                                playerIds: gameState.players
                                  .filter(
                                    (pl) => pl.id !== activeRound.actorPlayerId
                                  )
                                  .map((pl) => pl.id),
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-[#1B2752] border border-[#F5C542]/40 text-xs font-bold text-white"
                          >
                            👨‍👩‍👧‍👦 Iedereen
                          </button>
                          {gameState.players
                            .filter(
                              (pl) => pl.id !== activeRound.actorPlayerId
                            )
                            .map((pl) => {
                              const selected =
                                activeRound.guesserPlayerIds?.length === 1 &&
                                activeRound.guesserPlayerIds[0] === pl.id;
                              return (
                                <button
                                  key={pl.id}
                                  onClick={() =>
                                    socketService.socket.emit(
                                      'host:selectGuessers',
                                      { playerIds: [pl.id] }
                                    )
                                  }
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                                    selected
                                      ? 'bg-[#22C55E] text-[#070B18] border-white'
                                      : 'bg-[#070B18] text-slate-200 border-white/20'
                                  }`}
                                >
                                  Alleen {pl.name}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

        {/* 30 SECONDS ROUND REVEAL ON PLAYER SCREEN */}
        {gameState.phase === 'ROUND_REVEAL' &&
          activeRound?.roundType === 'thirty_seconds' && (
            <div className="studio-panel-gold rounded-3xl p-6 text-center flex flex-col items-center gap-4">
              <div className="text-5xl">🎉</div>
              <h2 className="font-display text-3xl text-[#F5C542]">
                ⭐ {activeRound.thirtySecondsGuessedCount || 0} kaartjes geraden!
              </h2>
              <div className="grid grid-cols-2 gap-2 w-full">
                {(activeRound.thirtySecondsRevealedItems || []).map((it) => (
                  <div
                    key={it.id}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between ${
                      it.status === 'guessed'
                        ? 'bg-emerald-950/70 border-[#22C55E]'
                        : 'bg-slate-900/70 border-white/15 opacity-70'
                    }`}
                  >
                    <span className="font-display text-lg text-white">
                      {it.word}
                    </span>
                    <span>{it.status === 'guessed' ? '✅' : '⏭️'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* PAUSED SCREEN ON PLAYER DEVICES */}
        {gameState.phase === 'PAUSED' && (
          <div className="studio-panel-gold rounded-3xl p-8 text-center flex flex-col items-center gap-4">
            <div className="text-6xl">⏸️</div>
            <h2 className="font-display text-3xl text-[#F5C542]">
              PAUZE — Zo weer verder!
            </h2>
            <p className="text-lg text-slate-300">
              Alle timers staan netjes stil. Even een slokje drinken pakken!
            </p>
            {myPlayer.isHost && (
              <button
                onClick={() => sendHostControl('resume')}
                className="mt-2 px-8 py-4 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-2xl font-bold"
              >
                ▶️ HERVAT DE SHOW
              </button>
            )}
          </div>
        )}

        {/* ====================================================================
            ROUND TYPE 3: WAT HOOR JE? (SOUND CHALLENGE CONTROLLER)
            ==================================================================== */}
        {(gameState.phase === 'ROUND_ACTIVE' ||
          gameState.phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'sound' &&
          privateView?.mySoundChallenge && (
            <div className="flex flex-col gap-4">
              <div className="studio-panel-gold rounded-3xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-display uppercase text-[#38BDF8]">
                    🔊 Luister naar de TV!
                  </div>
                  <h2 className="font-display text-2xl text-white">
                    {privateView.mySoundChallenge.prompt}
                  </h2>
                </div>
                {myPlayer.isHost && (
                  <button
                    onClick={() => sendHostControl('replaySound')}
                    className="px-4 py-2.5 rounded-xl bg-[#3B82F6] text-white font-display text-base flex-shrink-0"
                  >
                    🔁 Speel opnieuw
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {privateView.mySoundChallenge.options.map((opt, idx) => {
                  const selectedId =
                    privateView.mySoundChallenge?.selectedOptionId;
                  const correctId =
                    privateView.mySoundChallenge?.correctOptionId;
                  const isSelected = selectedId === opt.id;
                  const isReveal = gameState.phase === 'ROUND_REVEAL';

                  let btnStyle = `bg-gradient-to-br ${
                    OPTION_COLORS[idx % OPTION_COLORS.length]
                  }`;
                  if (isReveal) {
                    if (opt.id === correctId) {
                      btnStyle =
                        'bg-emerald-600 border-4 border-white scale-105';
                    } else {
                      btnStyle = 'bg-slate-900 opacity-40';
                    }
                  } else if (selectedId) {
                    btnStyle = isSelected
                      ? 'bg-[#F5C542] text-[#070B18] border-4 border-white scale-105'
                      : 'bg-slate-900 opacity-40';
                  }

                  return (
                    <button
                      key={opt.id}
                      disabled={
                        Boolean(selectedId) ||
                        gameState.phase !== 'ROUND_ACTIVE'
                      }
                      onClick={() => {
                        if (!canPassDebounce(isOntdekker)) return;
                        vibrateDevice(40);
                        socketService.socket.emit('sound:answer', {
                          optionId: opt.id,
                        });
                      }}
                      className={`min-h-[140px] sm:min-h-[168px] rounded-3xl p-4 border-2 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 ${btnStyle}`}
                    >
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden">
                        <IllustrationView
                          illustrationId={opt.illustrationId}
                          imageUrl={opt.imageUrl}
                          alt={opt.label}
                        />
                      </div>
                      <span className="font-display text-xl sm:text-2xl text-center">
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {gameState.phase === 'ROUND_REVEAL' && (
                <div
                  className={`rounded-2xl p-4 border-2 text-center ${
                    myPlayer.lastAnswerCorrect
                      ? 'bg-emerald-950/90 border-[#22C55E]'
                      : 'bg-[#111936] border-[#F5C542]/50'
                  }`}
                >
                  {activeRound.familyBonusAwarded && (
                    <div className="mb-2 px-3 py-1 rounded-xl bg-[#F5C542] text-[#070B18] font-display text-base font-bold">
                      🤝 GEZINS-BONUS! +50 EXTRA PUNTEN VOOR IEDEREEN!
                    </div>
                  )}
                  <div className="font-display text-2xl text-white">
                    {myPlayer.lastAnswerCorrect
                      ? `🎵 GOUDEN OREN! +${myPlayer.lastPointsAwarded || 0} punten!`
                      : '👂 Goed geluisterd! Volgende keer raak!'}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* ====================================================================
            ROUND TYPE 4: ZOOM-IN FOTO BUZZER & HOST JUDGE CONTROLLER
            ==================================================================== */}
        {(gameState.phase === 'ROUND_ACTIVE' ||
          gameState.phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'zoom_photo' &&
          privateView?.myZoomState && (
            <div className="flex flex-col items-center gap-5">
              {/* Host Secret Judge Panel when someone has buzzed! */}
              {myPlayer.isHost && activeRound.zoomBuzzedPlayerId && (
                <div className="studio-panel-gold rounded-3xl p-5 w-full border-4 border-[#F5C542]">
                  <div className="text-xs font-bold uppercase text-[#F5C542]">
                    🎩 Host Jury — Geheim antwoord alleen voor jou:
                  </div>
                  <div className="font-display text-3xl text-white my-1">
                    {privateView.myZoomState.hostSecretAnswer}
                  </div>
                  <div className="text-sm text-slate-300 mb-4">
                    Heeft{' '}
                    {
                      gameState.players.find(
                        (p) => p.id === activeRound.zoomBuzzedPlayerId
                      )?.name
                    }{' '}
                    het goed geroepen?
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        vibrateDevice(50);
                        socketService.socket.emit('host:judge', {
                          correct: true,
                        });
                      }}
                      className="py-4 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-2xl font-bold shadow-lg"
                    >
                      ✅ GOED!
                    </button>
                    <button
                      onClick={() => {
                        vibrateDevice(40);
                        socketService.socket.emit('host:judge', {
                          correct: false,
                        });
                      }}
                      className="py-4 rounded-2xl bg-rose-600 text-white font-display text-2xl font-bold shadow-lg"
                    >
                      ❌ HELAAS
                    </button>
                  </div>
                </div>
              )}

              {/* The Giant Pulsing Red BUZZER */}
              {gameState.phase === 'ROUND_ACTIVE' ? (
                <div className="flex flex-col items-center gap-4 py-4">
                  <div className="font-display text-2xl text-[#F5C542]">
                    Nu waard:{' '}
                    {(activeRound.zoomPossiblePoints || 150) *
                      (activeRound.bonusType === 'double_points' ? 2 : 1)}{' '}
                    punten
                    {activeRound.bonusType === 'double_points' ? ' (2×!)' : ''}
                  </div>

                  <button
                    disabled={!privateView.myZoomState.canBuzz}
                    onClick={() => {
                      vibrateDevice([60, 40, 60]);
                      socketService.socket.emit('zoom:buzz');
                    }}
                    className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full border-8 flex flex-col items-center justify-center gap-2 transition-all ${
                      privateView.myZoomState.isBuzzedPlayer
                        ? 'bg-[#22C55E] border-white text-[#070B18] scale-105 shadow-[0_0_60px_rgba(34,197,94,0.8)]'
                        : privateView.myZoomState.lockedOutRemainingSec > 0
                        ? 'bg-slate-800 border-slate-600 text-slate-400 opacity-60'
                        : activeRound.zoomBuzzedPlayerId
                        ? 'bg-amber-900/60 border-amber-500/50 text-amber-200'
                        : 'bg-gradient-to-b from-red-500 to-red-700 border-white text-white shadow-[0_0_50px_rgba(239,68,68,0.75)] active:scale-90 animate-pulse'
                    }`}
                  >
                    <span className="text-6xl">
                      {privateView.myZoomState.isBuzzedPlayer
                        ? '🗣️'
                        : privateView.myZoomState.lockedOutRemainingSec > 0
                        ? '⏳'
                        : '🔴'}
                    </span>
                    <span className="font-display text-4xl font-bold">
                      {privateView.myZoomState.isBuzzedPlayer
                        ? 'ROEP HET!'
                        : privateView.myZoomState.lockedOutRemainingSec > 0
                        ? `Wacht ${privateView.myZoomState.lockedOutRemainingSec}s`
                        : activeRound.zoomBuzzedPlayerId
                        ? 'Even luisteren...'
                        : 'BUZZER!'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="studio-panel-gold rounded-3xl p-6 text-center w-full">
                  <div className="text-sm text-slate-300 uppercase">
                    Het was:
                  </div>
                  <div className="font-display text-4xl text-[#4ADE80] mt-1">
                    {activeRound.zoomRevealedAnswer}
                  </div>
                </div>
              )}
            </div>
          )}

        {/* ====================================================================
            ROUND TYPE 5: WIE OF WAT BEN IK? (PANTOMIME CONTROLLER)
            ==================================================================== */}
        {(gameState.phase === 'ROUND_ACTIVE' ||
          gameState.phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'pantomime' &&
          privateView?.myPantomimeState && (
            <div className="flex flex-col items-center gap-4">
              {gameState.phase === 'ROUND_ACTIVE' ? (
                privateView.myPantomimeState.isActor ? (
                  <div className="studio-panel-gold rounded-3xl p-5 w-full flex flex-col items-center text-center gap-4">
                    {!privateView.myPantomimeState.started ? (
                      <>
                        <div className="text-6xl">🎭</div>
                        <h2 className="font-display text-3xl text-white">
                          Jij mag zo uitbeelden zonder woorden!
                        </h2>
                        <p className="text-base text-slate-300">
                          Kijk alleen op jouw scherm en druk op START zodra je
                          er klaar voor staat!
                        </p>
                        <button
                          onClick={() => {
                            vibrateDevice(50);
                            socketService.socket.emit('pantomime:start');
                          }}
                          className="w-full py-5 rounded-3xl bg-gradient-to-r from-[#22C55E] to-emerald-600 text-[#070B18] font-display text-3xl font-bold shadow-xl"
                        >
                          🚀 START UITBEELDING ({activeRound.timerTotalSec}s)
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between w-full border-b border-white/15 pb-2">
                          <span className="text-xs font-display uppercase text-[#22C55E]">
                            🤫 Geheim — Beeld dit uit!
                          </span>
                          <span className="font-display text-2xl text-[#F5C542]">
                            ⏱️ {activeRound.timerRemainingSec}s
                          </span>
                        </div>
                        <div className="w-48 h-48 rounded-3xl overflow-hidden border-4 border-[#F5C542]">
                          <IllustrationView
                            illustrationId={
                              privateView.myPantomimeState.secretIllustrationId
                            }
                            imageUrl={
                              privateView.myPantomimeState.secretImageUrl
                            }
                          />
                        </div>
                        <div className="font-display text-3xl text-white">
                          {privateView.myPantomimeState.secretPrompt}
                        </div>
                        {privateView.myPantomimeState.secretHint && (
                          <div className="text-sm text-[#F5C542] bg-[#070B18]/80 px-4 py-2 rounded-xl">
                            💡 Tip: {privateView.myPantomimeState.secretHint}
                          </div>
                        )}
                        {(isOntdekker || isAvonturier) && (
                          <button
                            onClick={() =>
                              speechService.speak(
                                `${privateView.myPantomimeState?.secretPrompt}. ${privateView.myPantomimeState?.secretHint || ''}`
                              )
                            }
                            className="px-5 py-2.5 rounded-2xl bg-[#3B82F6] text-white font-display text-lg flex items-center gap-2"
                          >
                            <Volume2 className="w-5 h-5" /> 🔊 Fluister opdracht
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  /* Guesser & Host Judge View for Pantomime */
                  <div className="flex flex-col items-center gap-4 w-full">
                    {myPlayer.isHost && activeRound.pantomimeBuzzedPlayerId && (
                      <div className="studio-panel-gold rounded-3xl p-5 w-full border-4 border-[#F5C542]">
                        <div className="text-xs font-bold uppercase text-[#F5C542]">
                          🎩 Host Jury — Geheim antwoord:
                        </div>
                        <div className="font-display text-2xl text-white my-1">
                          {privateView.myPantomimeState.hostSecretAnswer}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <button
                            onClick={() =>
                              socketService.socket.emit('host:judge', {
                                correct: true,
                              })
                            }
                            className="py-4 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-2xl font-bold"
                          >
                            ✅ GOED!
                          </button>
                          <button
                            onClick={() =>
                              socketService.socket.emit('host:judge', {
                                correct: false,
                              })
                            }
                            className="py-4 rounded-2xl bg-rose-600 text-white font-display text-2xl font-bold"
                          >
                            ❌ HELAAS
                          </button>
                        </div>
                      </div>
                    )}

                    {myPlayer.isHost && !privateView.myPantomimeState.started && (
                      <button
                        onClick={() =>
                          socketService.socket.emit('pantomime:start')
                        }
                        className="w-full py-3 rounded-2xl bg-[#1B2752] border border-[#F5C542] text-[#F5C542] font-display text-lg"
                      >
                        🚀 Start beurt van{' '}
                        {privateView.myPantomimeState.actorName}
                      </button>
                    )}

                    <button
                      disabled={!privateView.myPantomimeState.canBuzz}
                      onClick={() => {
                        vibrateDevice([60, 40, 60]);
                        socketService.socket.emit('pantomime:buzz');
                      }}
                      className={`w-60 h-60 rounded-full border-8 flex flex-col items-center justify-center gap-2 transition-all ${
                        privateView.myPantomimeState.isBuzzedPlayer
                          ? 'bg-[#22C55E] border-white text-[#070B18] scale-105'
                          : !privateView.myPantomimeState.started
                          ? 'bg-slate-900 border-slate-700 text-slate-400 opacity-60'
                          : privateView.myPantomimeState.lockedOutRemainingSec >
                            0
                          ? 'bg-slate-800 border-slate-600 text-slate-400 opacity-60'
                          : 'bg-gradient-to-b from-red-500 to-red-700 border-white text-white shadow-[0_0_50px_rgba(239,68,68,0.75)] active:scale-90 animate-pulse'
                      }`}
                    >
                      <span className="text-5xl">
                        {privateView.myPantomimeState.isBuzzedPlayer
                          ? '🗣️'
                          : '🔴'}
                      </span>
                      <span className="font-display text-3xl font-bold">
                        {privateView.myPantomimeState.isBuzzedPlayer
                          ? 'ROEP HET!'
                          : !privateView.myPantomimeState.started
                          ? 'Even wachten...'
                          : privateView.myPantomimeState.lockedOutRemainingSec >
                            0
                          ? `Wacht ${privateView.myPantomimeState.lockedOutRemainingSec}s`
                          : 'BUZZER!'}
                      </span>
                    </button>
                  </div>
                )
              ) : (
                <div className="studio-panel-gold rounded-3xl p-6 text-center w-full">
                  <div className="text-sm text-slate-300 uppercase">
                    Het uitgebeelde plaatje was:
                  </div>
                  <div className="font-display text-3xl text-[#4ADE80] mt-1">
                    {activeRound.pantomimeRevealedAnswer}
                  </div>
                  {(myPlayer.lastPointsAwarded || 0) > 0 && (
                    <div className="mt-2 font-display text-2xl text-[#F5C542]">
                      🎉 +{myPlayer.lastPointsAwarded} punten verdiend!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* ====================================================================
            ROUND TYPE 6: DICHTSTBIJ WINT! (ESTIMATE SLIDER CONTROLLER)
            ==================================================================== */}
        {(gameState.phase === 'ROUND_ACTIVE' ||
          gameState.phase === 'ROUND_REVEAL') &&
          activeRound?.roundType === 'estimate' &&
          privateView?.myEstimateChallenge && (
            <div className="studio-panel-gold rounded-3xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-display uppercase text-[#F97316]">
                  🎯 Dichtstbij Wint!
                </span>
                <span className="font-display text-2xl text-[#F5C542]">
                  ⏱️ {activeRound.timerRemainingSec}s
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-white/20">
                  <IllustrationView
                    illustrationId={
                      privateView.myEstimateChallenge.illustrationId
                    }
                  />
                </div>
                <h2 className="font-display text-xl sm:text-2xl text-white">
                  {privateView.myEstimateChallenge.prompt}
                </h2>
              </div>

              {(isOntdekker || isAvonturier) && (
                <button
                  onClick={() =>
                    speechService.speak(
                      privateView.myEstimateChallenge?.spokenPrompt ||
                        privateView.myEstimateChallenge?.prompt ||
                        ''
                    )
                  }
                  className="py-2.5 rounded-xl bg-[#3B82F6] text-white font-display text-lg flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-5 h-5" /> 🔊 Lees schattingsvraag voor
                </button>
              )}

              {gameState.phase === 'ROUND_ACTIVE' ? (
                privateView.myEstimateChallenge.submittedValue !== undefined ? (
                  <div className="py-6 text-center bg-[#070B18]/80 rounded-2xl border-2 border-[#22C55E]">
                    <div className="text-sm text-emerald-300 uppercase">
                      Jouw gekozen schatting:
                    </div>
                    <div className="font-display text-5xl text-[#F5C542] my-1">
                      {privateView.myEstimateChallenge.submittedValue}{' '}
                      {privateView.myEstimateChallenge.unit}
                    </div>
                    <div className="text-base text-white">
                      🔒 Vastgezet! Kijk naar de TV voor de onthulling!
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Giant Live Number Display + -/+ Buttons */}
                    <div className="flex items-center justify-between bg-[#070B18] rounded-2xl p-4 border-2 border-[#F5C542]">
                      <button
                        type="button"
                        onClick={() => {
                          const c = privateView.myEstimateChallenge!;
                          setEstimateDraft((v) =>
                            Math.max(c.min, v - c.step)
                          );
                        }}
                        className="w-14 h-14 rounded-xl bg-[#1B2752] text-white font-display text-3xl font-bold"
                      >
                        −
                      </button>
                      <div className="text-center">
                        <div className="font-display text-5xl text-[#F5C542]">
                          {estimateDraft}
                        </div>
                        <div className="text-sm text-slate-300">
                          {privateView.myEstimateChallenge.unit}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const c = privateView.myEstimateChallenge!;
                          setEstimateDraft((v) =>
                            Math.min(c.max, v + c.step)
                          );
                        }}
                        className="w-14 h-14 rounded-xl bg-[#1B2752] text-white font-display text-3xl font-bold"
                      >
                        +
                      </button>
                    </div>

                    <input
                      type="range"
                      min={privateView.myEstimateChallenge.min}
                      max={privateView.myEstimateChallenge.max}
                      step={privateView.myEstimateChallenge.step}
                      value={estimateDraft}
                      onChange={(e) => setEstimateDraft(Number(e.target.value))}
                      className="w-full h-4 accent-[#F5C542] cursor-pointer"
                    />

                    <div className="flex justify-between text-xs text-slate-400">
                      <span>
                        Min: {privateView.myEstimateChallenge.min}{' '}
                        {privateView.myEstimateChallenge.unit}
                      </span>
                      <span>
                        Max: {privateView.myEstimateChallenge.max}{' '}
                        {privateView.myEstimateChallenge.unit}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        vibrateDevice(45);
                        socketService.socket.emit('estimate:submit', {
                          value: estimateDraft,
                        });
                      }}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#22C55E] to-emerald-600 text-[#070B18] font-display text-2xl font-bold shadow-lg"
                    >
                      🔒 BEVESTIG SCHATTING ({estimateDraft}{' '}
                      {privateView.myEstimateChallenge.unit})
                    </button>
                  </div>
                )
              ) : (
                <div className="py-5 text-center bg-emerald-950/80 rounded-2xl border-2 border-[#22C55E]">
                  <div className="text-xs text-emerald-300 uppercase">
                    Het exacte antwoord was:
                  </div>
                  <div className="font-display text-4xl text-white my-1">
                    🎯 {privateView.myEstimateChallenge.correctValue}{' '}
                    {privateView.myEstimateChallenge.unit}
                  </div>
                  {(myPlayer.lastPointsAwarded || 0) > 0 && (
                    <div className="font-display text-2xl text-[#F5C542] mb-1">
                      🎉 +{myPlayer.lastPointsAwarded} punten verdiend!
                    </div>
                  )}
                  {privateView.myEstimateChallenge.funFact && (
                    <div className="text-sm text-slate-200 px-3">
                      💡 {privateView.myEstimateChallenge.funFact}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* PHASE: SCOREBOARD OR FINALE */}
        {(gameState.phase === 'SCOREBOARD' ||
          gameState.phase === 'FINALE') && (
          <div className="studio-panel-gold rounded-3xl p-6 text-center flex flex-col items-center gap-4">
            <Sparkles className="w-12 h-12 text-[#F5C542]" />
            <h2 className="font-display text-3xl text-white">
              {gameState.phase === 'FINALE'
                ? '🏆 De Grote Finale op TV!'
                : 'Tussenstand op de TV!'}
            </h2>
            <div className="text-2xl font-display text-[#F5C542]">
              Jouw score: {myPlayer.score} punten ({myPlayer.stars.length} / 6 ⭐)
            </div>
            {gameState.phase === 'FINALE' &&
              gameState.awards
                .filter((a) => a.playerId === myPlayer.id)
                .map((aw) => (
                  <div
                    key={aw.id}
                    className="w-full p-4 rounded-2xl bg-[#070B18] border-2 border-[#F5C542]"
                  >
                    <div className="text-4xl mb-1">{aw.icon}</div>
                    <div className="font-display text-2xl text-[#F5C542]">
                      {aw.title}
                    </div>
                    <div className="text-sm text-slate-300">{aw.subtitle}</div>
                  </div>
                ))}
          </div>
        )}
      </main>

      <footer className="text-center text-xs text-slate-500 pt-3">
        Niveau: {myPlayer.level.toUpperCase()} · Kamer: {gameState.roomCode}
      </footer>
      </div>
    </div>
  );
};
