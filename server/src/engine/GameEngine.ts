import {
  ActiveRoundPublicInfo,
  Award,
  CATEGORIES,
  CategoryId,
  ContentPackId,
  DifficultyLevel,
  EstimateChallenge,
  GameMode,
  GamePhase,
  GameSettings,
  GameStatePayload,
  LEVEL_META,
  PantomimeChallenge,
  Player,
  PlayerPrivateView,
  QuizQuestion,
  RoundBonusType,
  RoundType,
  SfxCue,
  SoundChallenge,
  Team,
  TIMERS,
  ZoomPhotoChallenge,
  BASE_CONTENT_PACKS,
  INTERMISSIONS,
  seasonalPackForDate,
  seasonThemeForDate,
} from '@huiskamer-show/shared';
import { DataStore } from '../storage/DataStore';
import { AwardsEngine } from './AwardsEngine';
import { RoomManager } from './RoomManager';

interface InternalThirtySecondsItem {
  id: string;
  word: string;
  illustrationId?: string;
  imageUrl?: string;
  status: 'pending' | 'guessed' | 'skipped';
}

const VALID_GAME_MODES = new Set<string>([
  'solo',
  'duo_fixed',
  'duo_rotating',
  'coop',
]);
const VALID_ROUND_TYPES = new Set<string>([
  'quiz',
  'thirty_seconds',
  'sound',
  'zoom_photo',
  'pantomime',
  'estimate',
]);
const VALID_PACKS = new Set<string>([
  'basis',
  'sinterklaas',
  'kerst',
  'zomer',
  'verjaardag',
  'kids_special',
]);

export class GameEngine {
  private store: DataStore;
  public roomManager: RoomManager;
  private onBroadcast: () => void;
  private onSfx: (cue: SfxCue, key?: string) => void;

  public phase: GamePhase = 'LOBBY';
  public previousPhaseBeforePause?: GamePhase;
  public tvMuted = false;
  public qrUrl = 'http://localhost:3000/play';
  public qrDataUrl = '';

  public settings: GameSettings = {
    gameMode: 'solo',
    totalRounds: 14,
    enabledRoundTypes: [
      'quiz',
      'thirty_seconds',
      'sound',
      'zoom_photo',
      'pantomime',
      'estimate',
    ],
    enabledPacks: ['basis', 'kids_special'],
    surpriseMode: true,
  };

  public players: Player[] = [];
  public teams: Team[] = [];
  public coopStars: CategoryId[] = [];
  public coopStarProgress: Record<CategoryId, number> = {
    dieren_dinos: 0,
    films_magie: 0,
    games_avontuur: 0,
    sport_eten: 0,
    wereld_raadsels: 0,
    ons_gezin: 0,
  };
  public awards: Award[] = [];

  // Round tracking
  public currentRoundNumber = 0;
  public currentRoundType: RoundType = 'quiz';
  public currentCategory: CategoryId = 'dieren_dinos';
  public currentBonusType: RoundBonusType = 'none';
  public wheelTargetIndex = 0;
  private familyBonusAwarded = false;

  // Shuffle bags for varied games (with optional deterministic mode for tests)
  private categoryBag: CategoryId[] = [];
  private roundTypeBag: RoundType[] = [];
  private deterministicMode = false;

  // Pause-aware timers
  public timerRemainingSec = 0;
  public timerTotalSec = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private phaseTimeout: NodeJS.Timeout | null = null;
  private phaseDeadlineMs = 0;
  private pausedPhaseRemainingMs: number | null = null;
  private pendingPhaseCallback: (() => void) | null = null;
  private roundStartedAtMs = 0;

  // Used content IDs within current game session
  private usedQuizIds = new Set<string>();
  private usedThirtySecIds = new Set<string>();
  private usedSoundIds = new Set<string>();
  private usedZoomIds = new Set<string>();
  private usedPantomimeIds = new Set<string>();
  private usedEstimateIds = new Set<string>();
  private actorRotationCursor = 0;

  // Active Round Internal Data
  private playerQuizQuestions = new Map<string, QuizQuestion>();
  private playerQuizAnswers = new Map<
    string,
    {
      optionId: string;
      isCorrect: boolean;
      elapsedMs: number;
      points: number;
      starEarned?: CategoryId;
    }
  >();

  // Thirty seconds internal data
  private activeActorPlayerId: string | null = null;
  private activeGuesserPlayerIds: string[] = [];
  private thirtySecondsStarted = false;
  private thirtySecondsItems: InternalThirtySecondsItem[] = [];
  private thirtySecondsActiveIndex = 0;

  // Sound challenge internal data
  private activeSoundChallenge: SoundChallenge | null = null;
  private soundCorrectOrder: string[] = [];
  private playerSoundAnswers = new Map<
    string,
    { optionId: string; isCorrect: boolean; elapsedMs: number; points: number }
  >();

  // Zoom photo internal data
  private activeZoomChallenge: ZoomPhotoChallenge | null = null;
  private zoomCurrentScale = 8.0;
  private zoomPossiblePoints = 150;
  private zoomBuzzedPlayerId: string | null = null;
  private zoomRemainingTicks = 40;
  /** Hoe lang de huidige buzz (Zoom-in of Pantomime) al op een oordeel van de host wacht. */
  private judgeWaitSec = 0;

  // Pantomime ("Wie of Wat ben ik?") internal data
  private activePantomimeChallenge: PantomimeChallenge | null = null;
  private pantomimeActorId: string | null = null;
  private pantomimeStarted = false;
  private pantomimeBuzzedPlayerId: string | null = null;

  // Estimate ("Dichtstbij Wint!") internal data
  private activeEstimateChallenge: EstimateChallenge | null = null;
  private playerEstimateSubmissions = new Map<
    string,
    { value: number; elapsedMs: number }
  >();
  private estimateResultsByPlayer = new Map<
    string,
    { value: number; diff: number; isWinner: boolean; pointsEarned: number }
  >();

  private autoAdvanceTimers = true;
  /** Klok voor de seizoensregels (in tests te vervangen). */
  public clock: () => Date = () => new Date();
  /** Heeft de host zelf pakketten gekozen? Dan laten we die staan; anders kiest de datum het seizoenspakket. */
  private packsChosenByHost = false;
  /** Tussendoortjes: na hoeveel vragen de volgende komt, en welke nog niet geweest zijn. */
  private roundsSinceIntermission = 0;
  private intermissionEvery = TIMERS.INTERMISSION_EVERY_MIN;
  private intermissionBag: string[] = [];
  public currentIntermissionId: string | null = null;
  /** Waar als het spel vanzelf is gepauzeerd omdat niemand meer verbonden was (dan hervat het ook vanzelf). */
  private autoPausedForNobody = false;

  constructor(
    store: DataStore,
    onBroadcast: () => void,
    onSfx: (cue: SfxCue, key?: string) => void,
    autoAdvanceTimers = true,
    deterministicMode = false
  ) {
    this.store = store;
    this.roomManager = new RoomManager();
    this.onBroadcast = onBroadcast;
    this.onSfx = onSfx;
    this.autoAdvanceTimers = autoAdvanceTimers;
    this.deterministicMode = deterministicMode;
    this.ensureDefaultTeams();
    this.settings.enabledPacks = this.defaultPacks();
    this.intermissionEvery = this.drawIntermissionInterval();
  }

  /** Elke 5 tot 10 vragen een tussendoortje; elke keer opnieuw willekeurig (in tests vast op het minimum). */
  private drawIntermissionInterval(): number {
    const min = TIMERS.INTERMISSION_EVERY_MIN;
    const max = TIMERS.INTERMISSION_EVERY_MAX;
    if (this.deterministicMode) return min;
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  /** Volgende tussendoortje: pas herhalen als alle andere geweest zijn; seizoensanimaties alleen in hun seizoen. */
  private nextIntermissionId(): string {
    const season = seasonThemeForDate(this.clock());
    const eligible = INTERMISSIONS.filter((a) => !a.season || a.season === season).map((a) => a.id);
    this.intermissionBag = this.intermissionBag.filter((id) => eligible.includes(id));
    if (this.intermissionBag.length === 0) {
      const fresh = this.shuffleArray(eligible);
      // niet dezelfde twee keer achter elkaar bij het opnieuw vullen
      if (fresh.length > 1 && fresh[0] === this.currentIntermissionId) fresh.push(fresh.shift()!);
      this.intermissionBag = fresh;
    }
    return this.intermissionBag.shift()!;
  }

  /** Na het scorebord: tussendoortje (als het weer tijd is) of meteen het rad. */
  public afterScoreboard(): void {
    this.roundsSinceIntermission += 1;
    const gameOver =
      this.currentRoundNumber >= this.settings.totalRounds ||
      (this.settings.gameMode === 'coop' &&
        this.coopStars.length >= CATEGORIES.length &&
        this.currentRoundNumber > 0);
    if (!gameOver && this.roundsSinceIntermission >= this.intermissionEvery) {
      this.enterIntermission();
      return;
    }
    this.startNextRoundWheel();
  }

  public enterIntermission(): void {
    this.clearTimers();
    this.roundsSinceIntermission = 0;
    this.intermissionEvery = this.drawIntermissionInterval();
    this.currentIntermissionId = this.nextIntermissionId();
    this.phase = 'INTERMISSION';
    this.timerTotalSec = TIMERS.INTERMISSION_SEC;
    this.timerRemainingSec = TIMERS.INTERMISSION_SEC;
    this.onSfx('join_sparkle');
    this.onBroadcast();
    this.schedulePhaseTransition(TIMERS.INTERMISSION_SEC * 1000, () => {
      this.startNextRoundWheel();
    });
  }

  /** Basis + Kids-Special, plus het seizoenspakket van vandaag (Sinterklaas, Kerst of Zomer). */
  private defaultPacks(): ContentPackId[] {
    const seasonal = seasonalPackForDate(this.clock());
    return seasonal ? [...BASE_CONTENT_PACKS, seasonal] : [...BASE_CONTENT_PACKS];
  }

  /**
   * Seizoens- en themavragen gaan voor als ze in de pot zitten, zodat je het seizoen echt merkt.
   * Maar niet als ze de afgelopen 3 dagen al gespeeld zijn: anders komt elke avond dezelfde vraag terug.
   */
  /** Zelfde voorkeur als preferSpecialPacks, maar dan als volgorde: seizoenskaarten eerst. */
  private preferSpecialFirst<T extends { id: string; packId?: ContentPackId }>(list: T[]): T[] {
    const special = new Set(this.preferSpecialPacks(list));
    if (special.size === list.length) return list;
    return [...list.filter((it) => special.has(it)), ...list.filter((it) => !special.has(it))];
  }

  private preferSpecialPacks<T extends { id: string; packId?: ContentPackId }>(pool: T[]): T[] {
    const recentMs = 3 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const special = pool.filter((it) => {
      const pack = it.packId || 'basis';
      return (
        !BASE_CONTENT_PACKS.includes(pack) &&
        this.matchesPack(pack) &&
        now - this.store.getLastPlayedAt(it.id) > recentMs
      );
    });
    return special.length > 0 ? special : pool;
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    if (this.deterministicMode) return copy;
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /**
   * Smart Picker using Evening-Spanning Played History (`/app/data/played-history.json`)!
   * Picks among items with the oldest `lastPlayedAt` timestamp (0 = never played first).
   */
  private pickLeastRecentlyPlayed<T extends { id: string }>(
    pool: T[]
  ): T | null {
    if (pool.length === 0) return null;
    if (this.deterministicMode) {
      const chosen = pool[0];
      this.store.markItemsPlayed([chosen.id]);
      return chosen;
    }

    let minTs = Infinity;
    for (const item of pool) {
      const ts = this.store.getLastPlayedAt(item.id);
      if (ts < minTs) minTs = ts;
    }
    // Group all candidates tied for least-recently played (or within 1s)
    const freshest = pool.filter(
      (item) => this.store.getLastPlayedAt(item.id) <= minTs + 1000
    );
    const chosen =
      freshest[Math.floor(Math.random() * freshest.length)] || pool[0];
    this.store.markItemsPlayed([chosen.id]);
    return chosen;
  }

  private matchesPack(packId?: ContentPackId): boolean {
    const itemPack = packId || 'basis';
    if (
      !this.settings.enabledPacks ||
      this.settings.enabledPacks.length === 0
    ) {
      return itemPack === 'basis' || itemPack === 'kids_special';
    }
    return this.settings.enabledPacks.includes(itemPack);
  }

  private ensureDefaultTeams(): void {
    this.teams = [
      {
        id: 'team_gold',
        name: 'Team Goud',
        color: '#FFD23F',
        playerIds: [],
        score: 0,
        stars: [],
      },
      {
        id: 'team_neon',
        name: 'Team Neon',
        color: '#A855F7',
        playerIds: [],
        score: 0,
        stars: [],
      },
    ];
  }

  public isPlayerHost(playerId: string | undefined): boolean {
    if (!playerId) return false;
    const p = this.players.find((pl) => pl.id === playerId);
    return Boolean(p?.isHost);
  }

  public hasConnectedHost(): boolean {
    return this.players.some((p) => p.connected && p.isHost);
  }

  public claimHost(playerId: string): boolean {
    if (this.hasConnectedHost()) return false;
    const player = this.players.find((p) => p.id === playerId && p.connected);
    if (!player) return false;
    player.isHost = true;
    this.onBroadcast();
    return true;
  }

  public togglePlayerPause(playerId: string): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;
    p.paused = !p.paused;
    if (p.paused) {
      this.checkAutoFinishAfterDisconnect();
    }
    this.onBroadcast();
  }

  private getActiveWaitingPool(): Player[] {
    const active = this.players.filter((p) => p.connected && !p.paused);
    return active.length > 0 ? active : this.players;
  }

  public joinOrReconnectPlayer(payload: {
    profileId?: string;
    name: string;
    avatarId: string;
    level: DifficultyLevel;
    sessionToken?: string;
  }): { player: Player; sessionToken: string } {
    const config = this.store.getConfig();
    const profile = payload.profileId
      ? config.profiles.find((p) => p.id === payload.profileId)
      : undefined;

    let existingPlayer: Player | undefined;
    if (payload.sessionToken) {
      const sess = this.roomManager.getSession(payload.sessionToken);
      if (sess) {
        existingPlayer = this.players.find((p) => p.id === sess.playerId);
      }
    }
    if (!existingPlayer && payload.profileId) {
      existingPlayer = this.players.find(
        (p) => p.profileId === payload.profileId
      );
    }
    if (!existingPlayer) {
      existingPlayer = this.players.find(
        (p) => p.name.toLowerCase() === payload.name.trim().toLowerCase()
      );
    }

    if (existingPlayer) {
      existingPlayer.connected = true;
      existingPlayer.name = payload.name?.trim() || existingPlayer.name;
      existingPlayer.avatarId = payload.avatarId || existingPlayer.avatarId;
      existingPlayer.level = payload.level || existingPlayer.level;
      const sess = this.roomManager.createOrRestoreSession(
        payload.sessionToken,
        existingPlayer.id,
        existingPlayer.profileId
      );
      if (
        (this.phase === 'ROUND_ACTIVE' || this.phase === 'ROUND_INTRO') &&
        this.currentRoundType === 'quiz' &&
        !this.playerQuizQuestions.has(existingPlayer.id)
      ) {
        const q = this.pickQuizQuestion(
          this.currentCategory,
          existingPlayer.level
        );
        if (q) this.playerQuizQuestions.set(existingPlayer.id, q);
      }
      this.onSfx('join_sparkle');
      this.resumeIfAutoPaused();
      this.onBroadcast();
      return { player: existingPlayer, sessionToken: sess.sessionToken };
    }

    const playerId = payload.profileId
      ? `plr_${payload.profileId.replace('profile_', '')}`
      : `plr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const isProfileHost = Boolean(profile?.isHostDefault);
    const isProfileCoHost = Boolean(profile?.isCoHostDefault);
    const noHostYet = !this.players.some((p) => p.isHost);
    const isHost =
      isProfileHost ||
      isProfileCoHost ||
      (noHostYet && !profile && payload.level === 'meester');

    const newPlayer: Player = {
      id: playerId,
      profileId: payload.profileId,
      name: payload.name.trim() || 'Gast',
      avatarId: payload.avatarId || profile?.defaultAvatarId || 'star',
      color: profile?.color || '#FFD23F',
      level: payload.level || profile?.level || 'avonturier',
      isHost,
      isCoHost: isProfileCoHost && !isProfileHost,
      connected: true,
      paused: false,
      score: 0,
      stars: [],
      stats: {
        quizCorrect: 0,
        quizTotal: 0,
        thirtySecondsGuessed: 0,
        thirtySecondsTurns: 0,
        soundCorrect: 0,
        soundTotal: 0,
        zoomCorrect: 0,
        pantomimeEarned: 0,
        estimateWins: 0,
        responseCount: 0,
        totalResponseMs: 0,
        avgResponseMs: 0,
      },
    };

    this.players.push(newPlayer);
    this.balanceTeamsIfNeeded();

    if (
      (this.phase === 'ROUND_ACTIVE' || this.phase === 'ROUND_INTRO') &&
      this.currentRoundType === 'quiz'
    ) {
      const q = this.pickQuizQuestion(this.currentCategory, newPlayer.level);
      if (q) this.playerQuizQuestions.set(newPlayer.id, q);
    }

    const sess = this.roomManager.createOrRestoreSession(
      payload.sessionToken,
      newPlayer.id,
      newPlayer.profileId
    );
    this.onSfx('join_sparkle');
    this.resumeIfAutoPaused();
    this.onBroadcast();
    return { player: newPlayer, sessionToken: sess.sessionToken };
  }

  public leavePlayer(playerId: string): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;

    if (this.phase === 'LOBBY') {
      this.players = this.players.filter((pl) => pl.id !== playerId);
      this.rebuildTeamsFromPlayerAssignments();
    } else {
      p.connected = false;
      this.checkAutoFinishAfterDisconnect();
      this.autoPauseIfNobodyConnected();
    }
    this.onBroadcast();
  }

  public kickPlayer(playerId: string): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (!p) return;

    if (this.phase === 'LOBBY') {
      this.players = this.players.filter((pl) => pl.id !== playerId);
      this.rebuildTeamsFromPlayerAssignments();
    } else {
      p.connected = false;
      p.paused = true;
      this.checkAutoFinishAfterDisconnect();
      this.autoPauseIfNobodyConnected();
    }
    this.onBroadcast();
  }

  public setPlayerConnected(playerId: string, connected: boolean): void {
    const p = this.players.find((pl) => pl.id === playerId);
    if (p) {
      p.connected = connected;
      if (!connected) {
        this.checkAutoFinishAfterDisconnect();
        this.autoPauseIfNobodyConnected();
      }
      this.onBroadcast();
    }
  }

  private checkAutoFinishAfterDisconnect(): void {
    if (this.phase !== 'ROUND_ACTIVE') return;
    const pool = this.getActiveWaitingPool();
    if (pool.length === 0) return;

    if (
      this.currentRoundType === 'quiz' &&
      pool.every((pl) => pl.hasAnswered)
    ) {
      this.finishQuizRound();
    } else if (
      this.currentRoundType === 'sound' &&
      pool.every((pl) => pl.hasAnswered)
    ) {
      this.finishSoundRound();
    } else if (
      this.currentRoundType === 'estimate' &&
      pool.every((pl) => pl.hasAnswered)
    ) {
      this.finishEstimateRound();
    }
  }

  /**
   * Als tijdens een spel alle spelers wegvallen (bijvoorbeeld schermen die in slaapstand gaan),
   * zou de show anders vanzelf doorspelen tot de finale: dan raakt het hervatbare spel kwijt en
   * komt er een spel in de Eregalerij waar niemand aan meedeed. Daarom pauzeren we dan.
   */
  private autoPauseIfNobodyConnected(): void {
    if (
      this.phase === 'LOBBY' ||
      this.phase === 'FINALE' ||
      this.phase === 'PAUSED'
    ) {
      return;
    }
    if (this.players.some((p) => p.connected)) return;
    this.handleHostControl('pause');
    // handleHostControl verandert this.phase; TypeScript weet dat niet na de vroege return hierboven.
    if ((this.phase as GamePhase) === 'PAUSED') this.autoPausedForNobody = true;
  }

  /** Hervat een automatische pauze zodra er weer iemand is. Een pauze die de host zelf drukte blijft staan. */
  private resumeIfAutoPaused(): void {
    if (!this.autoPausedForNobody) return;
    this.autoPausedForNobody = false;
    if (this.phase === 'PAUSED') this.handleHostControl('resume');
  }

  public configureGame(configPayload: {
    gameMode?: GameMode;
    totalRounds?: number;
    enabledRoundTypes?: RoundType[];
    enabledPacks?: ContentPackId[];
    surpriseMode?: boolean;
    teamAssignments?: Record<string, string>;
  }): void {
    if (
      configPayload.gameMode &&
      VALID_GAME_MODES.has(configPayload.gameMode)
    ) {
      this.settings.gameMode = configPayload.gameMode;
    }
    if (
      typeof configPayload.totalRounds === 'number' &&
      Number.isFinite(configPayload.totalRounds) &&
      configPayload.totalRounds >= 1
    ) {
      this.settings.totalRounds = Math.min(
        40,
        Math.max(1, Math.round(configPayload.totalRounds))
      );
    }
    if (Array.isArray(configPayload.enabledRoundTypes)) {
      const types = configPayload.enabledRoundTypes.filter((t) =>
        VALID_ROUND_TYPES.has(t)
      );
      if (types.length > 0) this.settings.enabledRoundTypes = types;
    }
    if (Array.isArray(configPayload.enabledPacks)) {
      const packs = configPayload.enabledPacks.filter((p) =>
        VALID_PACKS.has(p)
      );
      if (packs.length > 0) {
        this.settings.enabledPacks = packs;
        this.packsChosenByHost = true;
      }
    }
    if (typeof configPayload.surpriseMode === 'boolean') {
      this.settings.surpriseMode = configPayload.surpriseMode;
    }

    if (configPayload.teamAssignments) {
      for (const [pid, tid] of Object.entries(configPayload.teamAssignments)) {
        const p = this.players.find((pl) => pl.id === pid);
        if (p && this.teams.some((t) => t.id === tid)) p.teamId = tid;
      }
      this.rebuildTeamsFromPlayerAssignments();
    } else {
      this.balanceTeamsIfNeeded();
    }

    this.onBroadcast();
  }

  public selectThirtySecondsGuessers(guesserIds: string[]): void {
    if (this.currentRoundType !== 'thirty_seconds') return;
    const valid = guesserIds.filter(
      (id) =>
        id !== this.activeActorPlayerId &&
        this.players.some((p) => p.id === id)
    );
    this.activeGuesserPlayerIds =
      valid.length > 0
        ? valid
        : this.players
            .filter((p) => p.id !== this.activeActorPlayerId)
            .map((p) => p.id);
    this.onBroadcast();
  }

  private balanceTeamsIfNeeded(): void {
    if (this.teams.length < 2) this.ensureDefaultTeams();

    this.players.forEach((p, idx) => {
      if (!p.teamId) {
        if (p.profileId === 'profile_papa' || p.profileId === 'profile_lucas') {
          p.teamId = 'team_gold';
        } else if (
          p.profileId === 'profile_mama' ||
          p.profileId === 'profile_lana'
        ) {
          p.teamId = 'team_neon';
        } else {
          p.teamId = idx % 2 === 0 ? 'team_gold' : 'team_neon';
        }
      }
    });
    this.rebuildTeamsFromPlayerAssignments();
  }

  private rebuildTeamsFromPlayerAssignments(): void {
    for (const team of this.teams) {
      team.playerIds = this.players
        .filter((p) => p.teamId === team.id)
        .map((p) => p.id);
    }
  }

  public rotateDuoTeamsForRound(): void {
    if (this.players.length < 2) return;
    const ids = this.players.map((p) => p.id);

    if (ids.length === 4) {
      const pairings: Array<[string[], string[]]> = [
        [
          [ids[0], ids[1]],
          [ids[2], ids[3]],
        ],
        [
          [ids[0], ids[2]],
          [ids[1], ids[3]],
        ],
        [
          [ids[0], ids[3]],
          [ids[1], ids[2]],
        ],
      ];
      const [goldIds, neonIds] =
        pairings[(this.currentRoundNumber - 1) % pairings.length];
      this.teams[0].playerIds = goldIds;
      this.teams[1].playerIds = neonIds;
      for (const p of this.players) {
        p.teamId = goldIds.includes(p.id) ? this.teams[0].id : this.teams[1].id;
      }
      return;
    }

    const fixed = ids[0];
    const rest = ids.slice(1);
    const shift = (this.currentRoundNumber - 1) % Math.max(1, rest.length);
    const rotatedRest = [...rest.slice(shift), ...rest.slice(0, shift)];
    const ordered = [fixed, ...rotatedRest];

    const half = Math.ceil(ordered.length / 2);
    const goldIds = ordered.slice(0, half);
    const neonIds = ordered.slice(half);

    this.teams[0].playerIds = goldIds;
    this.teams[1].playerIds = neonIds;
    for (const p of this.players) {
      p.teamId = goldIds.includes(p.id) ? this.teams[0].id : this.teams[1].id;
    }
  }

  public startGame(): void {
    if (this.players.length === 0) return;
    // Alleen vanuit de lobby of de finale: een dubbele tik mag een lopend spel niet opnieuw starten.
    if (this.phase !== 'LOBBY' && this.phase !== 'FINALE') return;

    if (!this.packsChosenByHost) {
      this.settings.enabledPacks = this.defaultPacks();
    }
    this.roundsSinceIntermission = 0;
    this.intermissionEvery = this.drawIntermissionInterval();

    this.clearTimers();
    this.store.clearActiveSession();
    this.currentRoundNumber = 0;
    this.awards = [];
    this.categoryBag = [];
    this.roundTypeBag = [];
    this.usedQuizIds.clear();
    this.usedThirtySecIds.clear();
    this.usedSoundIds.clear();
    this.usedZoomIds.clear();
    this.usedPantomimeIds.clear();
    this.usedEstimateIds.clear();
    this.actorRotationCursor = 0;

    this.coopStars = [];
    this.coopStarProgress = {
      dieren_dinos: 0,
      films_magie: 0,
      games_avontuur: 0,
      sport_eten: 0,
      wereld_raadsels: 0,
      ons_gezin: 0,
    };

    for (const p of this.players) {
      p.score = 0;
      p.stars = [];
      p.hasAnswered = false;
      p.lastAnswerCorrect = undefined;
      p.lastPointsAwarded = 0;
      p.lastSelectedOptionId = undefined;
      p.lockedOutUntil = undefined;
      p.stats = {
        quizCorrect: 0,
        quizTotal: 0,
        thirtySecondsGuessed: 0,
        thirtySecondsTurns: 0,
        soundCorrect: 0,
        soundTotal: 0,
        zoomCorrect: 0,
        pantomimeEarned: 0,
        estimateWins: 0,
        responseCount: 0,
        totalResponseMs: 0,
        avgResponseMs: 0,
      };
    }

    this.ensureDefaultTeams();
    this.balanceTeamsIfNeeded();
    for (const t of this.teams) {
      t.score = 0;
      t.stars = [];
    }

    this.startNextRoundWheel();
  }

  public resumeSavedSession(): boolean {
    if (this.phase !== 'LOBBY') return false;
    const saved = this.store.getSavedActiveSession();
    if (!saved) return false;

    this.clearTimers();
    this.settings = saved.settings;
    this.currentRoundNumber = saved.roundNumber;
    this.coopStars = saved.coopStars || [];
    this.coopStarProgress = saved.coopStarProgress || this.coopStarProgress;

    // Merge saved player scores/stars/stats with currently connected players
    for (const sp of saved.players) {
      const existing = this.players.find(
        (p) =>
          p.id === sp.id ||
          (sp.profileId && p.profileId === sp.profileId) ||
          p.name.toLowerCase() === sp.name.toLowerCase()
      );
      if (existing) {
        existing.score = sp.score;
        existing.stars = [...(sp.stars || [])];
        existing.teamId = sp.teamId;
        existing.paused = false;
        existing.hasAnswered = false;
        existing.lockedOutUntil = undefined;
        existing.stats = { ...existing.stats, ...sp.stats };
      } else {
        this.players.push({
          ...sp,
          connected: false,
          paused: false,
          hasAnswered: false,
          lockedOutUntil: undefined,
        });
      }
    }

    if (Array.isArray(saved.teams) && saved.teams.length >= 2) {
      this.teams = saved.teams.map((t) => ({
        ...t,
        stars: [...(t.stars || [])],
        playerIds: [],
      }));
    }
    this.balanceTeamsIfNeeded();

    this.startNextRoundWheel();
    return true;
  }

  private drawNextRoundType(): RoundType {
    const enabled =
      this.settings.enabledRoundTypes.length > 0
        ? this.settings.enabledRoundTypes
        : ([
            'quiz',
            'thirty_seconds',
            'sound',
            'zoom_photo',
            'pantomime',
            'estimate',
          ] as RoundType[]);

    if (this.roundTypeBag.length === 0) {
      this.roundTypeBag = this.shuffleArray(enabled);
    }
    return this.roundTypeBag.shift()!;
  }

  private drawNextCategory(bonusType: RoundBonusType): {
    category: CategoryId;
    index: number;
  } {
    // In Star Hunt bonus mode, pick a category needed by the player with the fewest stars!
    if (bonusType === 'star_hunt' && this.players.length > 0) {
      const byFewestStars = [...this.players].sort(
        (a, b) => a.stars.length - b.stars.length
      );
      const trailing = byFewestStars[0];
      const missingForTrailing = CATEGORIES.map((c) => c.id).filter(
        (id) => !trailing.stars.includes(id)
      );
      if (missingForTrailing.length > 0) {
        const picked = this.shuffleArray(missingForTrailing)[0];
        const idx = CATEGORIES.findIndex((c) => c.id === picked);
        return { category: picked, index: Math.max(0, idx) };
      }
    }

    if (this.categoryBag.length === 0) {
      if (this.settings.gameMode === 'coop') {
        const missing = CATEGORIES.map((c) => c.id).filter(
          (id) => !this.coopStars.includes(id)
        );
        this.categoryBag =
          missing.length > 0
            ? this.shuffleArray(missing)
            : this.shuffleArray(CATEGORIES.map((c) => c.id));
      } else {
        this.categoryBag = this.shuffleArray(CATEGORIES.map((c) => c.id));
      }
    }
    const category = this.categoryBag.shift()!;
    const index = CATEGORIES.findIndex((c) => c.id === category);
    return { category, index: Math.max(0, index) };
  }

  private computeBonusTypeForRound(
    roundNum: number,
    roundType: RoundType
  ): RoundBonusType {
    if (!this.settings.surpriseMode || this.deterministicMode) {
      return 'none';
    }
    const remainingRounds = this.settings.totalRounds - roundNum;
    if (
      remainingRounds < 2 &&
      this.players.some((p) => p.stars.length < CATEGORIES.length)
    ) {
      return 'star_hunt';
    }
    if (roundNum % 4 === 0 && (roundType === 'quiz' || roundType === 'sound')) {
      return 'family_bonus';
    }
    if (roundNum % 3 === 0) {
      return 'double_points';
    }
    return 'none';
  }

  public startNextRoundWheel(): void {
    this.clearTimers();

    if (this.currentRoundNumber >= this.settings.totalRounds) {
      this.enterFinale();
      return;
    }

    if (
      this.settings.gameMode === 'coop' &&
      this.coopStars.length >= CATEGORIES.length &&
      this.currentRoundNumber > 0
    ) {
      this.enterFinale();
      return;
    }

    this.currentRoundNumber += 1;
    this.familyBonusAwarded = false;

    if (this.settings.gameMode === 'duo_rotating') {
      this.rotateDuoTeamsForRound();
    }

    this.currentRoundType = this.drawNextRoundType();
    this.currentBonusType = this.computeBonusTypeForRound(
      this.currentRoundNumber,
      this.currentRoundType
    );

    const { category, index } = this.drawNextCategory(this.currentBonusType);
    this.currentCategory = category;
    this.wheelTargetIndex = index;

    for (const p of this.players) {
      p.hasAnswered = false;
      p.lastAnswerCorrect = undefined;
      p.lastPointsAwarded = 0;
      p.lastSelectedOptionId = undefined;
      p.lockedOutUntil = undefined;
    }

    this.phase = 'WHEEL_SPIN';
    this.timerTotalSec = TIMERS.WHEEL_SPIN_SEC;
    this.timerRemainingSec = TIMERS.WHEEL_SPIN_SEC;
    this.onSfx('wheel_tick');
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.WHEEL_SPIN_SEC * 1000, () => {
      this.enterRoundIntro();
    });
  }

  public enterRoundIntro(): void {
    this.clearTimers();
    this.phase = 'ROUND_INTRO';
    this.timerTotalSec = TIMERS.ROUND_INTRO_SEC;
    this.timerRemainingSec = TIMERS.ROUND_INTRO_SEC;

    this.prepareRoundContent();
    this.onSfx(
      this.currentBonusType !== 'none' ? 'bonus_ding' : 'wheel_land'
    );
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.ROUND_INTRO_SEC * 1000, () => {
      this.enterRoundActive();
    });
  }

  private prepareRoundContent(): void {
    this.playerQuizQuestions.clear();
    this.playerQuizAnswers.clear();
    this.playerSoundAnswers.clear();
    this.soundCorrectOrder = [];
    this.thirtySecondsStarted = false;
    this.thirtySecondsItems = [];
    this.thirtySecondsActiveIndex = 0;
    this.zoomBuzzedPlayerId = null;
    this.pantomimeStarted = false;
    this.pantomimeBuzzedPlayerId = null;
    this.playerEstimateSubmissions.clear();
    this.estimateResultsByPlayer.clear();

    if (this.currentRoundType === 'quiz') {
      for (const player of this.players) {
        const q = this.pickQuizQuestion(this.currentCategory, player.level);
        if (q) {
          this.playerQuizQuestions.set(player.id, q);
        }
      }
    } else if (this.currentRoundType === 'thirty_seconds') {
      const pool = this.getActiveWaitingPool();
      const actor = pool[this.actorRotationCursor % pool.length];
      this.actorRotationCursor += 1;
      this.activeActorPlayerId = actor ? actor.id : null;

      if (actor) {
        if (
          (this.settings.gameMode === 'duo_fixed' ||
            this.settings.gameMode === 'duo_rotating') &&
          actor.teamId
        ) {
          const teammates = this.players
            .filter((p) => p.teamId === actor.teamId && p.id !== actor.id)
            .map((p) => p.id);
          this.activeGuesserPlayerIds =
            teammates.length > 0
              ? teammates
              : this.players.filter((p) => p.id !== actor.id).map((p) => p.id);
        } else {
          this.activeGuesserPlayerIds = this.players
            .filter((p) => p.id !== actor.id)
            .map((p) => p.id);
        }

        this.thirtySecondsItems = this.buildThirtySecondsDeck(
          this.currentCategory,
          actor.level
        );
      }
    } else if (this.currentRoundType === 'sound') {
      this.activeSoundChallenge = this.pickSoundChallenge(this.currentCategory);
    } else if (this.currentRoundType === 'zoom_photo') {
      this.activeZoomChallenge = this.pickZoomChallenge(this.currentCategory);
      this.zoomCurrentScale = 8.0;
      this.zoomPossiblePoints = 150;
      this.zoomRemainingTicks = TIMERS.ZOOM_DURATION_SEC * 2;
    } else if (this.currentRoundType === 'pantomime') {
      const pool = this.getActiveWaitingPool();
      const actor = pool[this.actorRotationCursor % pool.length];
      this.actorRotationCursor += 1;
      this.pantomimeActorId = actor ? actor.id : null;
      this.activePantomimeChallenge = this.pickPantomimeChallenge(
        this.currentCategory,
        actor?.level || 'avonturier'
      );
    } else if (this.currentRoundType === 'estimate') {
      this.activeEstimateChallenge = this.pickEstimateChallenge(
        this.currentCategory
      );
    }
  }

  public enterRoundActive(): void {
    this.clearTimers();
    this.phase = 'ROUND_ACTIVE';
    this.roundStartedAtMs = Date.now();

    if (this.currentRoundType === 'quiz') {
      this.timerTotalSec = TIMERS.QUIZ_DURATION_SEC;
      this.timerRemainingSec = TIMERS.QUIZ_DURATION_SEC;
      this.startSecondCountdown(() => this.finishQuizRound());
    } else if (this.currentRoundType === 'thirty_seconds') {
      const actor = this.players.find((p) => p.id === this.activeActorPlayerId);
      const dur = actor
        ? LEVEL_META[actor.level].thirtySecondsDurationSec
        : 30;
      this.timerTotalSec = dur;
      this.timerRemainingSec = dur;
      this.thirtySecondsStarted = false;
    } else if (this.currentRoundType === 'sound') {
      this.timerTotalSec = TIMERS.SOUND_DURATION_SEC;
      this.timerRemainingSec = TIMERS.SOUND_DURATION_SEC;
      if (this.activeSoundChallenge) {
        this.onSfx('sound_challenge', this.activeSoundChallenge.soundKey);
      }
      this.startSecondCountdown(() => this.finishSoundRound());
    } else if (this.currentRoundType === 'zoom_photo') {
      this.timerTotalSec = TIMERS.ZOOM_DURATION_SEC;
      this.timerRemainingSec = TIMERS.ZOOM_DURATION_SEC;
      this.zoomRemainingTicks = TIMERS.ZOOM_DURATION_SEC * 2;
      this.startZoomLoop();
    } else if (this.currentRoundType === 'pantomime') {
      this.timerTotalSec = TIMERS.PANTOMIME_DURATION_SEC;
      this.timerRemainingSec = TIMERS.PANTOMIME_DURATION_SEC;
      this.pantomimeStarted = false;
    } else if (this.currentRoundType === 'estimate') {
      this.timerTotalSec = TIMERS.ESTIMATE_DURATION_SEC;
      this.timerRemainingSec = TIMERS.ESTIMATE_DURATION_SEC;
      this.startSecondCountdown(() => this.finishEstimateRound());
    }

    this.onBroadcast();
  }

  private getPointMultiplier(): number {
    return this.currentBonusType === 'double_points' ? 2 : 1;
  }

  // ==========================================================================
  // ROUND TYPE 1: QUIZ HANDLERS
  // ==========================================================================
  public submitQuizAnswer(playerId: string, optionId: string): void {
    if (this.phase !== 'ROUND_ACTIVE' || this.currentRoundType !== 'quiz') {
      return;
    }
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.hasAnswered) return;

    const question = this.playerQuizQuestions.get(playerId);
    if (!question) return;

    const elapsedMs = Math.max(0, Date.now() - this.roundStartedAtMs);
    const isCorrect = question.correctOptionId === optionId;

    let points = 0;
    let starEarned: CategoryId | undefined;

    if (isCorrect) {
      const timeFraction = Math.max(
        0,
        Math.min(1, this.timerRemainingSec / Math.max(1, this.timerTotalSec))
      );
      const speedBonus = Math.round(timeFraction * 25);
      points = (100 + speedBonus) * this.getPointMultiplier();
      starEarned = this.awardPointsAndStar(player, points, this.currentCategory);
      player.stats.quizCorrect += 1;
    }

    player.stats.quizTotal += 1;
    this.recordResponseTime(player, elapsedMs);

    player.hasAnswered = true;
    player.lastSelectedOptionId = optionId;
    player.lastAnswerCorrect = isCorrect;
    player.lastPointsAwarded = points;

    this.playerQuizAnswers.set(playerId, {
      optionId,
      isCorrect,
      elapsedMs,
      points,
      starEarned,
    });

    this.onBroadcast();

    const checkPool = this.getActiveWaitingPool();
    if (checkPool.every((p) => p.hasAnswered)) {
      this.finishQuizRound();
    }
  }

  private grantFamilyBonus(pool: Player[]): void {
    this.familyBonusAwarded = true;
    const creditedTeams = new Set<string>();
    for (const p of pool) {
      p.score += 50;
      p.lastPointsAwarded = (p.lastPointsAwarded || 0) + 50;
      const quizAns = this.playerQuizAnswers.get(p.id);
      if (quizAns) quizAns.points += 50;
      const sndAns = this.playerSoundAnswers.get(p.id);
      if (sndAns) sndAns.points += 50;
      if (
        (this.settings.gameMode === 'duo_fixed' ||
          this.settings.gameMode === 'duo_rotating') &&
        p.teamId &&
        !creditedTeams.has(p.teamId)
      ) {
        const team = this.teams.find((t) => t.id === p.teamId);
        if (team) {
          team.score += 50 * team.playerIds.filter((id) => pool.some((x) => x.id === id)).length;
          creditedTeams.add(p.teamId);
        }
      }
    }
  }

  public finishQuizRound(): void {
    this.clearTimers();

    // Check Family Bonus (+50 for everyone if all active players answered right!)
    const checkPool = this.getActiveWaitingPool();
    if (
      this.currentBonusType === 'family_bonus' &&
      checkPool.length > 0 &&
      checkPool.every((p) => this.playerQuizAnswers.get(p.id)?.isCorrect)
    ) {
      this.grantFamilyBonus(checkPool);
    }

    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;

    const anyCorrect = Array.from(this.playerQuizAnswers.values()).some(
      (a) => a.isCorrect
    );
    this.onSfx(
      this.familyBonusAwarded ? 'bonus_ding' : anyCorrect ? 'correct' : 'wrong'
    );
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // ROUND TYPE 2: 30 SECONDS HANDLERS
  // ==========================================================================
  public startThirtySecondsTurn(requesterPlayerId: string): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'thirty_seconds' ||
      this.thirtySecondsStarted
    ) {
      return;
    }
    const requester = this.players.find((p) => p.id === requesterPlayerId);
    if (requesterPlayerId !== this.activeActorPlayerId && !requester?.isHost) {
      return;
    }

    const actor = this.players.find((p) => p.id === this.activeActorPlayerId);
    if (actor) {
      actor.stats.thirtySecondsTurns += 1;
    }

    this.thirtySecondsStarted = true;
    this.roundStartedAtMs = Date.now();
    this.onBroadcast();

    this.startSecondCountdown(() => this.finishThirtySecondsRound());
  }

  public markThirtySecondsItem(
    requesterPlayerId: string,
    itemId: string | undefined,
    status: 'guessed' | 'skipped' | 'pending'
  ): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'thirty_seconds' ||
      !this.thirtySecondsStarted
    ) {
      return;
    }

    const requester = this.players.find((p) => p.id === requesterPlayerId);
    if (requesterPlayerId !== this.activeActorPlayerId && !requester?.isHost) {
      return;
    }

    const actor = this.players.find((p) => p.id === this.activeActorPlayerId);
    if (!actor) return;

    const targetItem = itemId
      ? this.thirtySecondsItems.find((it) => it.id === itemId)
      : this.thirtySecondsItems[this.thirtySecondsActiveIndex];

    if (!targetItem) return;

    const wasAlreadyGuessed = targetItem.status === 'guessed';
    targetItem.status = status;

    if (status === 'guessed' && !wasAlreadyGuessed) {
      this.onSfx('correct');
    }

    const nextPendingIdx = this.thirtySecondsItems.findIndex(
      (it) => it.status === 'pending'
    );
    if (nextPendingIdx !== -1) {
      this.thirtySecondsActiveIndex = nextPendingIdx;
    } else if (actor.level === 'ontdekker') {
      this.finishThirtySecondsRound();
      return;
    } else {
      const allGuessed = this.thirtySecondsItems.every(
        (it) => it.status === 'guessed'
      );
      if (allGuessed) {
        this.finishThirtySecondsRound();
        return;
      }
    }

    this.onBroadcast();
  }

  public finishThirtySecondsRound(): void {
    this.clearTimers();
    const actor = this.players.find((p) => p.id === this.activeActorPlayerId);
    const guessedCount = this.thirtySecondsItems.filter(
      (it) => it.status === 'guessed'
    ).length;

    if (actor) {
      const points = guessedCount * 40 * this.getPointMultiplier();
      actor.stats.thirtySecondsGuessed += guessedCount;
      actor.lastPointsAwarded = points;
      actor.lastAnswerCorrect = guessedCount > 0;

      const starThreshold = actor.level === 'ontdekker' ? 2 : 3;
      if (points > 0) {
        if (guessedCount >= starThreshold) {
          this.awardPointsAndStar(actor, points, this.currentCategory);
        } else {
          this.awardPointsOnly(actor, points, this.currentCategory);
        }
      }
    }

    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;
    this.onSfx(guessedCount > 0 ? 'applause' : 'wrong');
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // ROUND TYPE 3: SOUND CHALLENGE HANDLERS
  // ==========================================================================
  public submitSoundAnswer(playerId: string, optionId: string): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'sound' ||
      !this.activeSoundChallenge
    ) {
      return;
    }
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.hasAnswered) return;

    const elapsedMs = Math.max(0, Date.now() - this.roundStartedAtMs);
    const isCorrect = this.activeSoundChallenge.correctOptionId === optionId;

    let points = 0;
    if (isCorrect) {
      this.soundCorrectOrder.push(playerId);
      const rank = this.soundCorrectOrder.length;
      const rankBonus = rank === 1 ? 50 : rank === 2 ? 30 : rank === 3 ? 15 : 5;
      points = (100 + rankBonus) * this.getPointMultiplier();
      this.awardPointsAndStar(player, points, this.currentCategory);
      player.stats.soundCorrect += 1;
    }

    player.stats.soundTotal += 1;
    this.recordResponseTime(player, elapsedMs);

    player.hasAnswered = true;
    player.lastSelectedOptionId = optionId;
    player.lastAnswerCorrect = isCorrect;
    player.lastPointsAwarded = points;

    this.playerSoundAnswers.set(playerId, {
      optionId,
      isCorrect,
      elapsedMs,
      points,
    });

    this.onBroadcast();

    const checkPool = this.getActiveWaitingPool();
    if (checkPool.every((p) => p.hasAnswered)) {
      this.finishSoundRound();
    }
  }

  public finishSoundRound(): void {
    this.clearTimers();

    const checkPool = this.getActiveWaitingPool();
    if (
      this.currentBonusType === 'family_bonus' &&
      checkPool.length > 0 &&
      checkPool.every((p) => this.playerSoundAnswers.get(p.id)?.isCorrect)
    ) {
      this.grantFamilyBonus(checkPool);
    }

    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;

    const anyCorrect = this.soundCorrectOrder.length > 0;
    this.onSfx(
      this.familyBonusAwarded ? 'bonus_ding' : anyCorrect ? 'correct' : 'wrong'
    );
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // ROUND TYPE 4: ZOOM-IN PHOTO HANDLERS
  // ==========================================================================
  private startZoomLoop(): void {
    this.clearTimers();
    if (!this.autoAdvanceTimers) return;

    this.tickInterval = setInterval(() => {
      if (this.phase !== 'ROUND_ACTIVE') return;
      if (this.zoomBuzzedPlayerId !== null) {
        this.advanceJudgeWait(0.5);
        return;
      }

      this.stepZoomTick();
    }, 500);
  }

  public stepZoomTick(): void {
    if (this.zoomRemainingTicks <= 1) {
      this.zoomRemainingTicks = 0;
      this.zoomCurrentScale = 1.0;
      this.zoomPossiblePoints = 50;
      this.timerRemainingSec = 0;
      this.finishZoomRound(null);
      return;
    }

    const scaleDelta = (this.zoomCurrentScale - 1.0) / this.zoomRemainingTicks;
    const ptsDelta = (this.zoomPossiblePoints - 50) / this.zoomRemainingTicks;

    this.zoomRemainingTicks -= 1;
    this.zoomCurrentScale = Math.max(
      1.0,
      Number((this.zoomCurrentScale - scaleDelta).toFixed(2))
    );
    this.zoomPossiblePoints = Math.max(
      50,
      Math.round(this.zoomPossiblePoints - ptsDelta)
    );
    this.timerRemainingSec = Math.ceil(this.zoomRemainingTicks * 0.5);

    this.onBroadcast();
  }

  public handleZoomBuzz(playerId: string): boolean {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'zoom_photo' ||
      this.zoomBuzzedPlayerId !== null
    ) {
      return false;
    }

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    const now = Date.now();
    if (player.lockedOutUntil && player.lockedOutUntil > now) {
      return false;
    }

    this.zoomBuzzedPlayerId = player.id;
    this.judgeWaitSec = 0;
    const elapsedMs = Math.max(0, now - this.roundStartedAtMs);
    this.recordResponseTime(player, elapsedMs);

    this.onSfx('buzzer');
    this.onBroadcast();
    return true;
  }

  /**
   * Na een buzz wacht de show op het oordeel van de host. Komt dat er niet binnen
   * TIMERS.JUDGE_TIMEOUT_SEC (telefoon weggelegd, host even weg), dan komt de buzzer weer vrij en speelt
   * de ronde verder, zonder straf voor wie buzzerde. Wordt aangeroepen vanuit de klok van de ronde
   * (die tijdens een pauze stilstaat, dus dan loopt deze wachttijd ook niet door).
   */
  public advanceJudgeWait(seconds: number): void {
    if (this.phase !== 'ROUND_ACTIVE') return;
    const zoomWaiting =
      this.currentRoundType === 'zoom_photo' && this.zoomBuzzedPlayerId !== null;
    const pantomimeWaiting =
      this.currentRoundType === 'pantomime' && this.pantomimeBuzzedPlayerId !== null;
    if (!zoomWaiting && !pantomimeWaiting) return;

    const shownBefore = Math.ceil(TIMERS.JUDGE_TIMEOUT_SEC - this.judgeWaitSec);
    this.judgeWaitSec += seconds;
    if (this.judgeWaitSec >= TIMERS.JUDGE_TIMEOUT_SEC) {
      this.judgeWaitSec = 0;
      if (zoomWaiting) this.zoomBuzzedPlayerId = null;
      if (pantomimeWaiting) this.pantomimeBuzzedPlayerId = null;
      this.onBroadcast();
      return;
    }
    if (Math.ceil(TIMERS.JUDGE_TIMEOUT_SEC - this.judgeWaitSec) !== shownBefore) {
      this.onBroadcast();
    }
  }

  private judgeRemainingSec(): number {
    return Math.max(0, Math.ceil(TIMERS.JUDGE_TIMEOUT_SEC - this.judgeWaitSec));
  }

  public handleHostJudgeZoom(correct: boolean): void {
    if (this.phase !== 'ROUND_ACTIVE') return;

    // Also route pantomime judgement if active round is pantomime!
    if (this.currentRoundType === 'pantomime') {
      this.handleHostJudgePantomime(correct);
      return;
    }

    if (
      this.currentRoundType !== 'zoom_photo' ||
      !this.zoomBuzzedPlayerId
    ) {
      return;
    }

    const buzzedPlayer = this.players.find(
      (p) => p.id === this.zoomBuzzedPlayerId
    );
    if (!buzzedPlayer) return;

    if (correct) {
      const pts = this.zoomPossiblePoints * this.getPointMultiplier();
      this.awardPointsAndStar(buzzedPlayer, pts, this.currentCategory);
      buzzedPlayer.stats.zoomCorrect += 1;
      buzzedPlayer.lastAnswerCorrect = true;
      buzzedPlayer.lastPointsAwarded = pts;
      this.zoomCurrentScale = 1.0;
      this.finishZoomRound(buzzedPlayer.id);
    } else {
      buzzedPlayer.lockedOutUntil = Date.now() + TIMERS.ZOOM_LOCKOUT_MS;
      buzzedPlayer.lastAnswerCorrect = false;
      this.zoomBuzzedPlayerId = null;
      this.onSfx('wrong');
      this.onBroadcast();
    }
  }

  public finishZoomRound(winnerPlayerId: string | null): void {
    this.clearTimers();
    this.zoomCurrentScale = 1.0;
    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;

    this.onSfx(winnerPlayerId ? 'correct' : 'wrong');
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // ROUND TYPE 5: PANTOMIME ("Wie of Wat ben ik?") HANDLERS
  // ==========================================================================
  public startPantomimeTurn(requesterPlayerId: string): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'pantomime' ||
      this.pantomimeStarted
    ) {
      return;
    }
    const requester = this.players.find((p) => p.id === requesterPlayerId);
    if (requesterPlayerId !== this.pantomimeActorId && !requester?.isHost) {
      return;
    }

    this.pantomimeStarted = true;
    this.roundStartedAtMs = Date.now();
    this.onBroadcast();

    this.startSecondCountdown(() => this.finishPantomimeRound(null));
  }

  public handlePantomimeBuzz(playerId: string): boolean {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'pantomime' ||
      !this.pantomimeStarted ||
      this.pantomimeBuzzedPlayerId !== null ||
      playerId === this.pantomimeActorId
    ) {
      return false;
    }

    const player = this.players.find((p) => p.id === playerId);
    if (!player) return false;

    const now = Date.now();
    if (player.lockedOutUntil && player.lockedOutUntil > now) {
      return false;
    }

    this.pantomimeBuzzedPlayerId = player.id;
    this.judgeWaitSec = 0;
    const elapsedMs = Math.max(0, now - this.roundStartedAtMs);
    this.recordResponseTime(player, elapsedMs);

    this.onSfx('buzzer');
    this.onBroadcast();
    return true;
  }

  public handleHostJudgePantomime(correct: boolean): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'pantomime' ||
      !this.pantomimeBuzzedPlayerId
    ) {
      return;
    }

    const buzzedPlayer = this.players.find(
      (p) => p.id === this.pantomimeBuzzedPlayerId
    );
    const actor = this.players.find((p) => p.id === this.pantomimeActorId);
    if (!buzzedPlayer) return;

    if (correct) {
      const mult = this.getPointMultiplier();
      const guesserPts = 100 * mult;
      const actorPts = 75 * mult;

      this.awardPointsAndStar(buzzedPlayer, guesserPts, this.currentCategory);
      buzzedPlayer.stats.pantomimeEarned += 1;
      buzzedPlayer.lastAnswerCorrect = true;
      buzzedPlayer.lastPointsAwarded = guesserPts;

      if (actor) {
        this.awardPointsAndStar(actor, actorPts, this.currentCategory);
        actor.stats.pantomimeEarned += 1;
        actor.lastAnswerCorrect = true;
        actor.lastPointsAwarded = actorPts;
      }

      this.finishPantomimeRound(buzzedPlayer.id);
    } else {
      buzzedPlayer.lockedOutUntil = Date.now() + TIMERS.ZOOM_LOCKOUT_MS;
      buzzedPlayer.lastAnswerCorrect = false;
      this.pantomimeBuzzedPlayerId = null;
      this.onSfx('wrong');
      this.onBroadcast();
    }
  }

  public finishPantomimeRound(winnerPlayerId: string | null): void {
    this.clearTimers();
    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;

    this.onSfx(winnerPlayerId ? 'applause' : 'wrong');
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // ROUND TYPE 6: ESTIMATE ("Dichtstbij Wint!") HANDLERS
  // ==========================================================================
  public submitEstimateAnswer(playerId: string, rawValue: number): void {
    if (
      this.phase !== 'ROUND_ACTIVE' ||
      this.currentRoundType !== 'estimate' ||
      !this.activeEstimateChallenge
    ) {
      return;
    }
    const player = this.players.find((p) => p.id === playerId);
    if (!player || player.hasAnswered) return;

    const value = Math.max(
      this.activeEstimateChallenge.min,
      Math.min(this.activeEstimateChallenge.max, Number(rawValue))
    );
    const elapsedMs = Math.max(0, Date.now() - this.roundStartedAtMs);

    this.playerEstimateSubmissions.set(player.id, { value, elapsedMs });
    this.recordResponseTime(player, elapsedMs);
    player.hasAnswered = true;
    this.onBroadcast();

    const checkPool = this.getActiveWaitingPool();
    if (checkPool.every((p) => p.hasAnswered)) {
      this.finishEstimateRound();
    }
  }

  public finishEstimateRound(): void {
    this.clearTimers();
    this.estimateResultsByPlayer.clear();

    if (this.activeEstimateChallenge) {
      const target = this.activeEstimateChallenge.correctValue;
      const span = Math.max(
        1,
        this.activeEstimateChallenge.max - this.activeEstimateChallenge.min
      );

      let minDiff = Infinity;
      for (const sub of this.playerEstimateSubmissions.values()) {
        const diff = Math.abs(sub.value - target);
        if (diff < minDiff) minDiff = diff;
      }

      const mult = this.getPointMultiplier();
      for (const p of this.players) {
        const sub = this.playerEstimateSubmissions.get(p.id);
        if (!sub) continue;

        const diff = Math.abs(sub.value - target);
        const isWinner = diff === minDiff;
        const isClose = diff <= span * 0.15;

        let pts = 0;
        if (isWinner) {
          pts = 125 * mult;
          this.awardPointsAndStar(p, pts, this.currentCategory);
          p.stats.estimateWins += 1;
          p.lastAnswerCorrect = true;
        } else if (isClose) {
          pts = 60 * mult;
          this.awardPointsOnly(p, pts, this.currentCategory);
          p.lastAnswerCorrect = true;
        } else {
          p.lastAnswerCorrect = false;
        }
        p.lastPointsAwarded = pts;

        this.estimateResultsByPlayer.set(p.id, {
          value: sub.value,
          diff,
          isWinner,
          pointsEarned: pts,
        });
      }
    }

    this.phase = 'ROUND_REVEAL';
    this.timerTotalSec = TIMERS.REVEAL_DURATION_SEC;
    this.timerRemainingSec = TIMERS.REVEAL_DURATION_SEC;
    this.onSfx(
      this.playerEstimateSubmissions.size > 0 ? 'correct' : 'wrong'
    );
    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.REVEAL_DURATION_SEC * 1000, () => {
      this.enterScoreboard();
    });
  }

  // ==========================================================================
  // SCOREBOARD & FINALE (With Crash-Recovery Save & Hall of Fame Update!)
  // ==========================================================================
  public enterScoreboard(): void {
    this.clearTimers();
    this.phase = 'SCOREBOARD';
    this.timerTotalSec = TIMERS.SCOREBOARD_DURATION_SEC;
    this.timerRemainingSec = TIMERS.SCOREBOARD_DURATION_SEC;

    // Persist active session for crash/restart recovery!
    if (this.currentRoundNumber < this.settings.totalRounds) {
      this.store.saveActiveSession({
        savedAt: new Date().toISOString(),
        roundNumber: this.currentRoundNumber,
        totalRounds: this.settings.totalRounds,
        settings: this.settings,
        players: this.players,
        teams: this.teams,
        coopStars: this.coopStars,
        coopStarProgress: this.coopStarProgress,
      });
    }

    this.onBroadcast();

    this.schedulePhaseTransition(TIMERS.SCOREBOARD_DURATION_SEC * 1000, () => {
      this.afterScoreboard();
    });
  }

  public enterFinale(): void {
    this.clearTimers();
    this.store.clearActiveSession();
    this.phase = 'FINALE';
    this.awards = AwardsEngine.computeAwards(
      this.players,
      this.settings.gameMode
    );

    const awardsCountByPlayer: Record<string, number> = {};
    for (const aw of this.awards) {
      awardsCountByPlayer[aw.playerId] =
        (awardsCountByPlayer[aw.playerId] || 0) + 1;
    }

    this.store.recordGameFinished({
      gameMode: this.settings.gameMode,
      players: this.players,
      coopWon:
        this.settings.gameMode === 'coop' &&
        this.coopStars.length >= CATEGORIES.length,
      awardsCountByPlayer,
    });

    this.onSfx('drumroll');
    this.onBroadcast();
  }

  // ==========================================================================
  // HOST CONTROLS
  // ==========================================================================
  public handleHostControl(action: string): void {
    switch (action) {
      case 'pause':
        if (
          this.phase !== 'PAUSED' &&
          this.phase !== 'LOBBY' &&
          this.phase !== 'FINALE'
        ) {
          this.previousPhaseBeforePause = this.phase;
          if (this.phaseTimeout) {
            clearTimeout(this.phaseTimeout);
            this.phaseTimeout = null;
            this.pausedPhaseRemainingMs = Math.max(
              250,
              this.phaseDeadlineMs - Date.now()
            );
          }
          this.phase = 'PAUSED';
          this.onBroadcast();
        }
        break;

      case 'resume':
        this.autoPausedForNobody = false;
        if (this.phase === 'PAUSED' && this.previousPhaseBeforePause) {
          this.phase = this.previousPhaseBeforePause;
          this.previousPhaseBeforePause = undefined;
          if (
            this.pausedPhaseRemainingMs !== null &&
            this.pendingPhaseCallback
          ) {
            const rem = this.pausedPhaseRemainingMs;
            const cb = this.pendingPhaseCallback;
            this.pausedPhaseRemainingMs = null;
            this.schedulePhaseTransition(rem, cb);
          }
          this.onBroadcast();
        }
        break;

      case 'addTime':
        if (
          this.phase === 'LOBBY' ||
          this.phase === 'FINALE' ||
          this.phase === 'INTERMISSION'
        ) {
          break;
        }
        this.timerRemainingSec += 15;
        this.timerTotalSec += 15;
        if (this.currentRoundType === 'zoom_photo' && this.phase === 'ROUND_ACTIVE') {
          this.zoomRemainingTicks += 30;
        }
        if (this.phaseTimeout && this.pendingPhaseCallback) {
          const remainingMs = Math.max(250, this.phaseDeadlineMs - Date.now());
          this.schedulePhaseTransition(
            remainingMs + 15000,
            this.pendingPhaseCallback
          );
        } else if (this.pausedPhaseRemainingMs !== null) {
          this.pausedPhaseRemainingMs += 15000;
        }
        this.onBroadcast();
        break;

      case 'skip': {
        this.autoPausedForNobody = false;
        const effectivePhase =
          this.phase === 'PAUSED' && this.previousPhaseBeforePause
            ? this.previousPhaseBeforePause
            : this.phase;
        this.previousPhaseBeforePause = undefined;
        this.pausedPhaseRemainingMs = null;

        if (effectivePhase === 'WHEEL_SPIN') {
          this.enterRoundIntro();
        } else if (effectivePhase === 'ROUND_INTRO') {
          this.enterRoundActive();
        } else if (effectivePhase === 'ROUND_ACTIVE') {
          if (this.currentRoundType === 'quiz') this.finishQuizRound();
          else if (this.currentRoundType === 'thirty_seconds')
            this.finishThirtySecondsRound();
          else if (this.currentRoundType === 'sound') this.finishSoundRound();
          else if (this.currentRoundType === 'zoom_photo')
            this.finishZoomRound(null);
          else if (this.currentRoundType === 'pantomime')
            this.finishPantomimeRound(null);
          else if (this.currentRoundType === 'estimate')
            this.finishEstimateRound();
        } else if (effectivePhase === 'ROUND_REVEAL') {
          this.enterScoreboard();
        } else if (effectivePhase === 'SCOREBOARD') {
          this.afterScoreboard();
        } else if (effectivePhase === 'INTERMISSION') {
          this.startNextRoundWheel();
        }
        break;
      }

      case 'replaySound':
        if (this.activeSoundChallenge) {
          this.onSfx('sound_challenge', this.activeSoundChallenge.soundKey);
        }
        break;

      case 'testSound':
        this.onSfx('test_jingle');
        break;

      case 'toggleMute':
        this.tvMuted = !this.tvMuted;
        this.onBroadcast();
        break;

      case 'reset':
        this.clearTimers();
        this.store.clearActiveSession();
        this.phase = 'LOBBY';
        this.previousPhaseBeforePause = undefined;
        this.currentRoundNumber = 0;
        this.awards = [];
        this.autoPausedForNobody = false;
        // Spelers die tijdens het vorige spel zijn weggevallen horen niet meer in de nieuwe lobby.
        this.players = this.players.filter((p) => p.connected);
        this.rebuildTeamsFromPlayerAssignments();
        this.onBroadcast();
        break;
    }
  }

  // ==========================================================================
  // SCORING & STARS HELPER
  // ==========================================================================
  private awardPointsOnly(
    player: Player,
    points: number,
    category: CategoryId
  ): void {
    player.score += points;

    if (
      (this.settings.gameMode === 'duo_fixed' ||
        this.settings.gameMode === 'duo_rotating') &&
      player.teamId
    ) {
      const team = this.teams.find((t) => t.id === player.teamId);
      if (team) {
        team.score += points;
        if (this.settings.gameMode === 'duo_rotating') {
          for (const pid of team.playerIds) {
            if (pid === player.id) continue;
            const partner = this.players.find((pl) => pl.id === pid);
            if (partner) {
              partner.score += points;
            }
          }
        }
      }
    }

    if (this.settings.gameMode === 'coop') {
      this.coopStarProgress[category] = Math.min(
        100,
        (this.coopStarProgress[category] || 0) + 50
      );
      if (
        this.coopStarProgress[category] >= 100 &&
        !this.coopStars.includes(category)
      ) {
        this.coopStars.push(category);
      }
    }
  }

  private awardPointsAndStar(
    player: Player,
    points: number,
    category: CategoryId
  ): CategoryId | undefined {
    player.score += points;
    let targetStar: CategoryId = category;
    let earnedNewStar: CategoryId | undefined;

    if (!player.stars.includes(category)) {
      player.stars.push(category);
      earnedNewStar = category;
    } else if (this.currentBonusType === 'star_hunt') {
      // Wildcard star hunt bonus: award a missing category star!
      const missing = CATEGORIES.map((c) => c.id).find(
        (id) => !player.stars.includes(id)
      );
      if (missing) {
        player.stars.push(missing);
        earnedNewStar = missing;
        targetStar = missing;
      }
    }

    if (
      (this.settings.gameMode === 'duo_fixed' ||
        this.settings.gameMode === 'duo_rotating') &&
      player.teamId
    ) {
      const team = this.teams.find((t) => t.id === player.teamId);
      if (team) {
        team.score += points;
        if (!team.stars.includes(targetStar)) {
          team.stars.push(targetStar);
        }
        if (this.settings.gameMode === 'duo_rotating') {
          for (const pid of team.playerIds) {
            if (pid === player.id) continue;
            const partner = this.players.find((pl) => pl.id === pid);
            if (partner) {
              partner.score += points;
              if (!partner.stars.includes(targetStar)) {
                partner.stars.push(targetStar);
              }
            }
          }
        }
      }
    }

    if (this.settings.gameMode === 'coop') {
      this.coopStarProgress[targetStar] = 100;
      if (!this.coopStars.includes(targetStar)) {
        this.coopStars.push(targetStar);
        earnedNewStar = targetStar;
      }
    }

    return earnedNewStar;
  }

  private recordResponseTime(player: Player, elapsedMs: number): void {
    player.stats.responseCount += 1;
    player.stats.totalResponseMs += elapsedMs;
    player.stats.avgResponseMs = Math.round(
      player.stats.totalResponseMs / player.stats.responseCount
    );
  }

  // ==========================================================================
  // CONTENT PICKERS (Pack-Filtered & Least-Recently-Played Sorted!)
  // ==========================================================================
  private pickQuizQuestion(
    category: CategoryId,
    level: DifficultyLevel
  ): QuizQuestion | null {
    const all = this.store.getQuizQuestions();
    let pool = all.filter(
      (q) =>
        q.category === category &&
        q.level === level &&
        this.matchesPack(q.packId) &&
        !this.usedQuizIds.has(q.id)
    );
    if (pool.length === 0) {
      pool = all.filter(
        (q) =>
          q.category === category &&
          q.level === level &&
          !this.usedQuizIds.has(q.id)
      );
    }
    if (pool.length === 0) {
      pool = all.filter((q) => q.category === category && q.level === level);
    }
    if (pool.length === 0) {
      pool = all.filter((q) => q.level === level);
    }

    const chosen = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (chosen) this.usedQuizIds.add(chosen.id);
    return chosen;
  }

  private buildThirtySecondsDeck(
    category: CategoryId,
    level: DifficultyLevel
  ): InternalThirtySecondsItem[] {
    const all = this.store.getThirtySecondsCards();

    if (level === 'ontdekker') {
      let unusedCat = all.filter(
        (c) =>
          c.level === 'ontdekker' &&
          c.category === category &&
          this.matchesPack(c.packId) &&
          !this.usedThirtySecIds.has(c.id)
      );
      let unusedOther = all.filter(
        (c) =>
          c.level === 'ontdekker' &&
          c.category !== category &&
          this.matchesPack(c.packId) &&
          !this.usedThirtySecIds.has(c.id)
      );

      if (unusedCat.length + unusedOther.length < 5) {
        for (const c of all.filter((x) => x.level === 'ontdekker')) {
          this.usedThirtySecIds.delete(c.id);
        }
        unusedCat = all.filter(
          (c) => c.level === 'ontdekker' && c.category === category
        );
        unusedOther = all.filter(
          (c) => c.level === 'ontdekker' && c.category !== category
        );
      }

      const combined = [
        ...this.preferSpecialFirst(this.shuffleArray(unusedCat)),
        ...this.shuffleArray(unusedOther),
      ].slice(0, 10);

      for (const c of combined) {
        this.usedThirtySecIds.add(c.id);
      }
      this.store.markItemsPlayed(combined.map((c) => c.id));

      return combined.flatMap((c, idx) =>
        c.items.map((it) => ({
          id: `${c.id}_${it.id}_${idx}`,
          word: it.word,
          illustrationId: it.illustrationId,
          imageUrl: it.imageUrl,
          status: 'pending' as const,
        }))
      );
    }

    let pool = all.filter(
      (c) =>
        c.category === category &&
        c.level === level &&
        this.matchesPack(c.packId) &&
        !this.usedThirtySecIds.has(c.id)
    );
    if (pool.length === 0) {
      pool = all.filter(
        (c) =>
          c.category === category &&
          c.level === level &&
          !this.usedThirtySecIds.has(c.id)
      );
    }
    if (pool.length === 0) {
      pool = all.filter((c) => c.category === category && c.level === level);
    }
    const card = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (!card) return [];

    this.usedThirtySecIds.add(card.id);
    return card.items.map((it) => ({
      id: it.id,
      word: it.word,
      illustrationId: it.illustrationId,
      imageUrl: it.imageUrl,
      status: 'pending' as const,
    }));
  }

  private pickSoundChallenge(category: CategoryId): SoundChallenge | null {
    const all = this.store.getSoundChallenges();
    let pool = all.filter(
      (s) =>
        s.category === category &&
        this.matchesPack(s.packId) &&
        !this.usedSoundIds.has(s.id)
    );
    if (pool.length === 0) {
      pool = all.filter(
        (s) => this.matchesPack(s.packId) && !this.usedSoundIds.has(s.id)
      );
    }
    if (pool.length === 0) {
      this.usedSoundIds.clear();
      pool = all;
    }
    const chosen = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (chosen) this.usedSoundIds.add(chosen.id);
    return chosen;
  }

  private pickZoomChallenge(category: CategoryId): ZoomPhotoChallenge | null {
    const all = this.store.getZoomPhotos();
    let pool = all.filter(
      (z) =>
        z.category === category &&
        this.matchesPack(z.packId) &&
        !this.usedZoomIds.has(z.id)
    );
    if (pool.length === 0) {
      pool = all.filter(
        (z) => this.matchesPack(z.packId) && !this.usedZoomIds.has(z.id)
      );
    }
    if (pool.length === 0) {
      this.usedZoomIds.clear();
      pool = all;
    }
    const chosen = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (chosen) this.usedZoomIds.add(chosen.id);
    return chosen;
  }

  private pickPantomimeChallenge(
    category: CategoryId,
    level: DifficultyLevel
  ): PantomimeChallenge | null {
    const all = this.store.getPantomimeChallenges();
    let pool = all.filter(
      (p) =>
        p.category === category &&
        p.level === level &&
        this.matchesPack(p.packId) &&
        !this.usedPantomimeIds.has(p.id)
    );
    if (pool.length === 0) {
      pool = all.filter(
        (p) => p.level === level && !this.usedPantomimeIds.has(p.id)
      );
    }
    if (pool.length === 0) {
      this.usedPantomimeIds.clear();
      pool = all;
    }
    const chosen = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (chosen) this.usedPantomimeIds.add(chosen.id);
    return chosen;
  }

  private pickEstimateChallenge(category: CategoryId): EstimateChallenge | null {
    const all = this.store.getEstimateChallenges();
    let pool = all.filter(
      (e) =>
        e.category === category &&
        this.matchesPack(e.packId) &&
        !this.usedEstimateIds.has(e.id)
    );
    if (pool.length === 0) {
      pool = all.filter((e) => !this.usedEstimateIds.has(e.id));
    }
    if (pool.length === 0) {
      this.usedEstimateIds.clear();
      pool = all;
    }
    const chosen = this.pickLeastRecentlyPlayed(this.preferSpecialPacks(pool));
    if (chosen) this.usedEstimateIds.add(chosen.id);
    return chosen;
  }

  // ==========================================================================
  // PAUSE-AWARE TIMERS
  // ==========================================================================
  private schedulePhaseTransition(delayMs: number, cb: () => void): void {
    if (!this.autoAdvanceTimers) return;
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }
    this.pendingPhaseCallback = cb;
    this.phaseDeadlineMs = Date.now() + delayMs;
    this.pausedPhaseRemainingMs = null;

    this.phaseTimeout = setTimeout(() => {
      this.phaseTimeout = null;
      this.pendingPhaseCallback = null;
      cb();
    }, delayMs);
  }

  private startSecondCountdown(onExpire: () => void): void {
    this.clearTimers();
    if (!this.autoAdvanceTimers) return;

    this.tickInterval = setInterval(() => {
      if (this.phase !== 'ROUND_ACTIVE') return;
      if (
        this.currentRoundType === 'pantomime' &&
        this.pantomimeBuzzedPlayerId !== null
      ) {
        this.advanceJudgeWait(1);
        return;
      }

      this.timerRemainingSec = Math.max(0, this.timerRemainingSec - 1);

      if (
        this.currentRoundType === 'thirty_seconds' &&
        this.timerRemainingSec <= 10 &&
        this.timerRemainingSec > 0
      ) {
        this.onSfx('thirty_sec_urgent');
      } else if (this.timerRemainingSec <= 5 && this.timerRemainingSec > 0) {
        this.onSfx('tick_urgent');
      }

      if (this.timerRemainingSec <= 0) {
        onExpire();
      } else {
        this.onBroadcast();
      }
    }, 1000);
  }

  public clearTimers(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.phaseTimeout) {
      clearTimeout(this.phaseTimeout);
      this.phaseTimeout = null;
    }
    this.pendingPhaseCallback = null;
    this.pausedPhaseRemainingMs = null;
  }

  // ==========================================================================
  // STATE SERIALIZATION
  // ==========================================================================
  /**
   * @param asTv true = het TV-scherm, dat extra mag zien (de naam van het geluid, de foto bij Zoom-in).
   *             Standaard is dat zo als er geen playerId is; de server geeft dit voor andere sockets
   *             zonder speler (meekijkers) expliciet op als false.
   */
  public getStateForClient(
    playerId?: string,
    asTv: boolean = playerId === undefined
  ): GameStatePayload {
    const config = this.store.getPublicConfig();
    const isTv = asTv;
    const nowMs = Date.now();
    const isRevealOrLater =
      this.phase === 'ROUND_REVEAL' ||
      this.phase === 'SCOREBOARD' ||
      this.phase === 'FINALE';

    let activeRound: ActiveRoundPublicInfo | null = null;

    if (this.phase !== 'LOBBY' && this.phase !== 'FINALE') {
      activeRound = {
        roundNumber: this.currentRoundNumber,
        totalRounds: this.settings.totalRounds,
        roundType: this.currentRoundType,
        category: this.currentCategory,
        bonusType: this.currentBonusType,
        timerRemainingSec: this.timerRemainingSec,
        timerTotalSec: this.timerTotalSec,
        timerEndsAtMs:
          this.phase === 'ROUND_ACTIVE'
            ? nowMs + this.timerRemainingSec * 1000
            : undefined,
        wheelTargetIndex: this.wheelTargetIndex,
        familyBonusAwarded: this.familyBonusAwarded,
      };

      if (this.currentRoundType === 'quiz' && isRevealOrLater) {
        const revealed: NonNullable<
          ActiveRoundPublicInfo['quizRevealedByPlayer']
        > = {};
        for (const p of this.players) {
          const q = this.playerQuizQuestions.get(p.id);
          const ans = this.playerQuizAnswers.get(p.id);
          if (q) {
            const correctOpt = q.options.find(
              (o) => o.id === q.correctOptionId
            );
            const selectedOpt = ans
              ? q.options.find((o) => o.id === ans.optionId)
              : undefined;
            revealed[p.id] = {
              prompt: q.prompt,
              selectedOptionLabel: selectedOpt?.label,
              correctOptionLabel: correctOpt?.label || '',
              correctOptionIllustrationId: correctOpt?.illustrationId,
              isCorrect: Boolean(ans?.isCorrect),
              pointsEarned: ans?.points || 0,
              starEarned: ans?.starEarned,
              funFact: q.funFact,
            };
          }
        }
        activeRound.quizRevealedByPlayer = revealed;
      }

      if (this.currentRoundType === 'thirty_seconds') {
        activeRound.actorPlayerId = this.activeActorPlayerId || undefined;
        activeRound.guesserPlayerIds = this.activeGuesserPlayerIds;
        activeRound.thirtySecondsStarted = this.thirtySecondsStarted;
        activeRound.thirtySecondsGuessedCount = this.thirtySecondsItems.filter(
          (it) => it.status === 'guessed'
        ).length;
        activeRound.thirtySecondsTotalItems = this.thirtySecondsItems.length;
        if (isRevealOrLater) {
          activeRound.thirtySecondsRevealedItems = this.thirtySecondsItems.filter(
            (it) => it.status !== 'pending'
          );
        }
      }

      if (this.currentRoundType === 'sound' && this.activeSoundChallenge) {
        activeRound.soundPrompt = this.activeSoundChallenge.prompt;
        activeRound.soundType = this.activeSoundChallenge.soundType;
        activeRound.soundKey = isTv
          ? this.activeSoundChallenge.soundKey
          : undefined;
        activeRound.soundOptions = this.activeSoundChallenge.options;
        if (isRevealOrLater) {
          activeRound.soundCorrectOptionId =
            this.activeSoundChallenge.correctOptionId;
        }
      }

      if (
        this.currentRoundType === 'zoom_photo' &&
        this.activeZoomChallenge
      ) {
        if (isTv || isRevealOrLater) {
          activeRound.zoomIllustrationId =
            this.activeZoomChallenge.illustrationId;
          activeRound.zoomImageUrl = this.activeZoomChallenge.imageUrl;
          activeRound.zoomFocalPoint = this.activeZoomChallenge.focalPoint || {
            x: 50,
            y: 50,
          };
        }
        activeRound.zoomCurrentScale = isRevealOrLater
          ? 1.0
          : this.zoomCurrentScale;
        activeRound.zoomPossiblePoints = this.zoomPossiblePoints;
        activeRound.zoomBuzzedPlayerId = this.zoomBuzzedPlayerId;
        if (this.zoomBuzzedPlayerId) {
          activeRound.judgeRemainingSec = this.judgeRemainingSec();
        }
        if (isRevealOrLater) {
          activeRound.zoomRevealedAnswer = this.activeZoomChallenge.answer;
        }
      }

      if (
        this.currentRoundType === 'pantomime' &&
        this.activePantomimeChallenge
      ) {
        activeRound.pantomimeActorId = this.pantomimeActorId || undefined;
        activeRound.pantomimeStarted = this.pantomimeStarted;
        activeRound.pantomimeBuzzedPlayerId = this.pantomimeBuzzedPlayerId;
        if (this.pantomimeBuzzedPlayerId) {
          activeRound.judgeRemainingSec = this.judgeRemainingSec();
        }
        if (isRevealOrLater) {
          activeRound.pantomimeRevealedAnswer =
            this.activePantomimeChallenge.prompt;
          activeRound.pantomimeRevealedIllustrationId =
            this.activePantomimeChallenge.illustrationId;
        }
      }

      if (
        this.currentRoundType === 'estimate' &&
        this.activeEstimateChallenge
      ) {
        activeRound.estimatePrompt = this.activeEstimateChallenge.prompt;
        activeRound.estimateUnit = this.activeEstimateChallenge.unit;
        activeRound.estimateMin = this.activeEstimateChallenge.min;
        activeRound.estimateMax = this.activeEstimateChallenge.max;
        activeRound.estimateStep = this.activeEstimateChallenge.step;
        activeRound.estimateIllustrationId =
          this.activeEstimateChallenge.illustrationId;
        if (isRevealOrLater) {
          activeRound.estimateRevealedCorrectValue =
            this.activeEstimateChallenge.correctValue;
          activeRound.estimateRevealedFunFact =
            this.activeEstimateChallenge.funFact;
          const revMap: NonNullable<
            ActiveRoundPublicInfo['estimateRevealedByPlayer']
          > = {};
          for (const [pid, res] of this.estimateResultsByPlayer.entries()) {
            revMap[pid] = res;
          }
          activeRound.estimateRevealedByPlayer = revMap;
        }
      }
    }

    const sanitizedPlayers: Player[] = this.players.map((p) => {
      if (!isRevealOrLater) {
        return {
          ...p,
          lastAnswerCorrect: undefined,
          lastPointsAwarded: undefined,
          lastSelectedOptionId: undefined,
        };
      }
      return p;
    });

    let privateView: PlayerPrivateView | undefined;
    if (playerId) {
      const player = this.players.find((p) => p.id === playerId);
      if (player) {
        privateView = {
          playerId: player.id,
        };

        if (this.currentRoundType === 'quiz') {
          const q = this.playerQuizQuestions.get(player.id);
          const ans = this.playerQuizAnswers.get(player.id);
          if (q) {
            privateView.myQuizQuestion = {
              id: q.id,
              category: q.category,
              level: q.level,
              prompt: q.prompt,
              spokenPrompt: q.spokenPrompt,
              options: q.options,
              selectedOptionId: ans?.optionId,
              correctOptionId: isRevealOrLater ? q.correctOptionId : undefined,
              funFact: isRevealOrLater ? q.funFact : undefined,
            };
          }
        } else if (this.currentRoundType === 'thirty_seconds') {
          const actor = this.players.find(
            (p) => p.id === this.activeActorPlayerId
          );
          const isActor = player.id === this.activeActorPlayerId;
          const isHostHelperForLucas =
            !isActor && player.isHost && actor?.level === 'ontdekker';

          if (actor && (isActor || isHostHelperForLucas)) {
            privateView.myThirtySecondsTurn = {
              isActor,
              isHostHelperForLucas,
              actorName: actor.name,
              actorLevel: actor.level,
              started: this.thirtySecondsStarted,
              activeItemIndex: this.thirtySecondsActiveIndex,
              items: this.thirtySecondsItems.map((it) => ({
                id: it.id,
                word: isActor ? it.word : 'Plaatjeskaart van ' + actor.name,
                illustrationId: isActor ? it.illustrationId : undefined,
                imageUrl: isActor ? it.imageUrl : undefined,
                status: it.status,
              })),
            };
          }
        } else if (
          this.currentRoundType === 'sound' &&
          this.activeSoundChallenge
        ) {
          const ans = this.playerSoundAnswers.get(player.id);
          privateView.mySoundChallenge = {
            prompt: this.activeSoundChallenge.prompt,
            options: this.activeSoundChallenge.options,
            selectedOptionId: ans?.optionId,
            correctOptionId: isRevealOrLater
              ? this.activeSoundChallenge.correctOptionId
              : undefined,
          };
        } else if (
          this.currentRoundType === 'zoom_photo' &&
          this.activeZoomChallenge
        ) {
          const lockRem =
            player.lockedOutUntil && player.lockedOutUntil > nowMs
              ? Math.ceil((player.lockedOutUntil - nowMs) / 1000)
              : 0;
          privateView.myZoomState = {
            canBuzz: lockRem === 0 && this.zoomBuzzedPlayerId === null,
            lockedOutRemainingSec: lockRem,
            isBuzzedPlayer: this.zoomBuzzedPlayerId === player.id,
            hostSecretAnswer: player.isHost
              ? this.activeZoomChallenge.answer
              : undefined,
            hostAcceptedHints: player.isHost
              ? this.activeZoomChallenge.acceptedHints
              : undefined,
          };
        } else if (
          this.currentRoundType === 'pantomime' &&
          this.activePantomimeChallenge
        ) {
          const actor = this.players.find(
            (p) => p.id === this.pantomimeActorId
          );
          const isActor = player.id === this.pantomimeActorId;
          const lockRem =
            player.lockedOutUntil && player.lockedOutUntil > nowMs
              ? Math.ceil((player.lockedOutUntil - nowMs) / 1000)
              : 0;
          privateView.myPantomimeState = {
            isActor,
            actorName: actor?.name || 'Speler',
            started: this.pantomimeStarted,
            secretPrompt: isActor
              ? this.activePantomimeChallenge.prompt
              : undefined,
            secretHint: isActor
              ? this.activePantomimeChallenge.hint
              : undefined,
            secretIllustrationId: isActor
              ? this.activePantomimeChallenge.illustrationId
              : undefined,
            secretImageUrl: isActor
              ? this.activePantomimeChallenge.imageUrl
              : undefined,
            canBuzz:
              !isActor &&
              this.pantomimeStarted &&
              lockRem === 0 &&
              this.pantomimeBuzzedPlayerId === null,
            lockedOutRemainingSec: lockRem,
            isBuzzedPlayer: this.pantomimeBuzzedPlayerId === player.id,
            hostSecretAnswer: player.isHost
              ? this.activePantomimeChallenge.prompt
              : undefined,
          };
        } else if (
          this.currentRoundType === 'estimate' &&
          this.activeEstimateChallenge
        ) {
          const sub = this.playerEstimateSubmissions.get(player.id);
          privateView.myEstimateChallenge = {
            id: this.activeEstimateChallenge.id,
            prompt: this.activeEstimateChallenge.prompt,
            spokenPrompt:
              this.activeEstimateChallenge.spokenPrompt ||
              this.activeEstimateChallenge.prompt,
            unit: this.activeEstimateChallenge.unit,
            min: this.activeEstimateChallenge.min,
            max: this.activeEstimateChallenge.max,
            step: this.activeEstimateChallenge.step,
            illustrationId: this.activeEstimateChallenge.illustrationId,
            submittedValue: sub?.value,
            correctValue: isRevealOrLater
              ? this.activeEstimateChallenge.correctValue
              : undefined,
            funFact: isRevealOrLater
              ? this.activeEstimateChallenge.funFact
              : undefined,
          };
        }
      }
    }

    const savedSess = this.store.getSavedActiveSession();

    return {
      roomCode: this.roomManager.roomCode,
      showTitle: config.showTitle,
      subtitle: config.subtitle,
      qrUrl: this.qrUrl,
      qrDataUrl: this.qrDataUrl,
      phase: this.phase,
      intermissionId:
        this.phase === 'INTERMISSION' ? this.currentIntermissionId ?? undefined : undefined,
      previousPhaseBeforePause: this.previousPhaseBeforePause,
      tvMuted: this.tvMuted,
      noConnectedHost: !this.hasConnectedHost(),
      serverNowMs: nowMs,
      hasResumableSession: Boolean(savedSess),
      resumableSessionInfo: savedSess
        ? {
            roundNumber: savedSess.roundNumber,
            totalRounds: savedSess.totalRounds,
            savedAt: savedSess.savedAt,
          }
        : undefined,
      hallOfFame: this.store.getHallOfFame(),
      settings: this.settings,
      profiles: config.profiles,
      players: sanitizedPlayers,
      teams: this.teams,
      coopStars: this.coopStars,
      coopStarProgress: this.coopStarProgress,
      activeRound,
      awards: this.awards,
      privateView,
    };
  }
}
