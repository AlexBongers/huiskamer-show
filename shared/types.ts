export type DifficultyLevel = 'ontdekker' | 'avonturier' | 'meester';
export type GameMode = 'solo' | 'duo_fixed' | 'duo_rotating' | 'coop';
export type RoundType =
  | 'quiz'
  | 'thirty_seconds'
  | 'sound'
  | 'zoom_photo'
  | 'pantomime'
  | 'estimate';
export type CategoryId =
  | 'dieren_dinos'
  | 'films_magie'
  | 'games_avontuur'
  | 'sport_eten'
  | 'wereld_raadsels'
  | 'ons_gezin';

export type ContentPackId =
  | 'basis'
  | 'sinterklaas'
  | 'kerst'
  | 'zomer'
  | 'verjaardag'
  | 'kids_special';

export type RoundBonusType =
  | 'none'
  | 'double_points'
  | 'family_bonus'
  | 'star_hunt';

export type GamePhase =
  | 'LOBBY'
  | 'WHEEL_SPIN'
  | 'ROUND_INTRO'
  | 'ROUND_ACTIVE'
  | 'PAUSED'
  | 'ROUND_REVEAL'
  | 'SCOREBOARD'
  | 'FINALE';

export type SfxCue =
  | 'wheel_tick'
  | 'wheel_land'
  | 'correct'
  | 'wrong'
  | 'buzzer'
  | 'tick_urgent'
  | 'thirty_sec_urgent'
  | 'drumroll'
  | 'fanfare'
  | 'applause'
  | 'sound_challenge'
  | 'join_sparkle'
  | 'star_earned'
  | 'bonus_ding'
  | 'test_jingle';

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  shortName: string;
  emoji: string;
  color: string;
  description: string;
}

export interface ContentPackMeta {
  id: ContentPackId;
  name: string;
  emoji: string;
  description: string;
}

export interface FamilyProfile {
  id: string;
  name: string;
  ageLabel: string;
  level: DifficultyLevel;
  defaultAvatarId: string;
  avatarOptions: string[];
  color: string;
  isHostDefault: boolean;
  isCoHostDefault: boolean;
  autoSpeak: boolean;
}

export interface ShowConfig {
  showTitle: string;
  subtitle: string;
  profiles: FamilyProfile[];
  adminPinEnabled?: boolean;
  adminPinHash?: string;
  seedVersion?: string;
}

export interface PlayerStats {
  quizCorrect: number;
  quizTotal: number;
  thirtySecondsGuessed: number;
  thirtySecondsTurns: number;
  soundCorrect: number;
  soundTotal: number;
  zoomCorrect: number;
  pantomimeEarned: number;
  estimateWins: number;
  responseCount: number;
  totalResponseMs: number;
  avgResponseMs: number;
}

export interface Player {
  id: string;
  profileId?: string;
  name: string;
  avatarId: string;
  color: string;
  level: DifficultyLevel;
  isHost: boolean;
  isCoHost?: boolean;
  connected: boolean;
  paused?: boolean; // Host can mark player temporarily paused ("Even weg")
  score: number;
  stars: CategoryId[];
  teamId?: string;
  stats: PlayerStats;
  hasAnswered?: boolean;
  lastAnswerCorrect?: boolean;
  lastPointsAwarded?: number;
  lastSelectedOptionId?: string;
  lockedOutUntil?: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  playerIds: string[];
  score: number;
  stars: CategoryId[];
}

export interface QuizOption {
  id: string;
  label: string;
  illustrationId?: string;
  imageUrl?: string;
}

export interface QuizQuestion {
  id: string;
  category: CategoryId;
  level: DifficultyLevel;
  packId?: ContentPackId;
  prompt: string;
  spokenPrompt?: string;
  options: QuizOption[];
  correctOptionId: string;
  funFact?: string;
}

export interface ThirtySecondsItem {
  id: string;
  word: string;
  illustrationId?: string;
  imageUrl?: string;
}

export interface ThirtySecondsCard {
  id: string;
  category: CategoryId;
  level: DifficultyLevel;
  packId?: ContentPackId;
  items: ThirtySecondsItem[];
}

export interface SoundChallenge {
  id: string;
  category: CategoryId;
  packId?: ContentPackId;
  prompt: string;
  soundType: 'synth' | 'file';
  soundKey: string;
  options: QuizOption[];
  correctOptionId: string;
}

export interface ZoomPhotoChallenge {
  id: string;
  category: CategoryId;
  packId?: ContentPackId;
  answer: string;
  acceptedHints?: string[];
  illustrationId?: string;
  imageUrl?: string;
  focalPoint?: { x: number; y: number };
}

export interface PantomimeChallenge {
  id: string;
  category: CategoryId;
  level: DifficultyLevel;
  packId?: ContentPackId;
  prompt: string;
  hint: string;
  illustrationId: string;
  imageUrl?: string;
}

export interface EstimateChallenge {
  id: string;
  category: CategoryId;
  packId?: ContentPackId;
  prompt: string;
  spokenPrompt?: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  correctValue: number;
  illustrationId: string;
  funFact?: string;
}

export interface GameSettings {
  gameMode: GameMode;
  totalRounds: number;
  enabledRoundTypes: RoundType[];
  enabledPacks: ContentPackId[];
  surpriseMode: boolean;
}

export interface Award {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  playerId: string;
  playerName: string;
  avatarId: string;
  color: string;
  valueLabel: string;
}

export interface HallOfFameStats {
  totalGamesPlayed: number;
  coopWins: number;
  highestScoreRecord: {
    playerName: string;
    score: number;
    date: string;
  } | null;
  bestThirtySecondsRecord: {
    playerName: string;
    count: number;
    date: string;
  } | null;
  playerLifetime: Record<
    string,
    {
      name: string;
      gamesPlayed: number;
      wins: number;
      totalScore: number;
      totalStars: number;
      awardsCount: number;
    }
  >;
  recentGames: Array<{
    date: string;
    gameMode: GameMode;
    winnerName: string;
    topScore: number;
  }>;
}

export interface SavedActiveSession {
  savedAt: string;
  roundNumber: number;
  totalRounds: number;
  settings: GameSettings;
  players: Player[];
  teams: Team[];
  coopStars: CategoryId[];
  coopStarProgress: Record<CategoryId, number>;
}

export interface ActiveRoundPublicInfo {
  roundNumber: number;
  totalRounds: number;
  roundType: RoundType;
  category: CategoryId;
  bonusType: RoundBonusType;
  timerRemainingSec: number;
  timerTotalSec: number;
  timerEndsAtMs?: number;
  wheelTargetIndex?: number;
  // Thirty Seconds public info
  actorPlayerId?: string;
  guesserPlayerIds?: string[];
  thirtySecondsStarted?: boolean;
  thirtySecondsGuessedCount?: number;
  thirtySecondsTotalItems?: number;
  thirtySecondsRevealedItems?: Array<{
    id: string;
    word: string;
    illustrationId?: string;
    imageUrl?: string;
    status: 'pending' | 'guessed' | 'skipped';
  }>;
  // Sound Challenge public info
  soundPrompt?: string;
  soundType?: 'synth' | 'file';
  soundKey?: string;
  soundOptions?: QuizOption[];
  soundCorrectOptionId?: string;
  // Zoom Photo public info
  zoomIllustrationId?: string;
  zoomImageUrl?: string;
  zoomFocalPoint?: { x: number; y: number };
  zoomCurrentScale?: number;
  zoomPossiblePoints?: number;
  zoomBuzzedPlayerId?: string | null;
  zoomRevealedAnswer?: string;
  // Pantomime ("Wie of Wat ben ik?") public info
  pantomimeActorId?: string;
  pantomimeStarted?: boolean;
  pantomimeBuzzedPlayerId?: string | null;
  pantomimeRevealedAnswer?: string;
  pantomimeRevealedIllustrationId?: string;
  // Estimate ("Dichtstbij Wint!") public info
  estimatePrompt?: string;
  estimateUnit?: string;
  estimateMin?: number;
  estimateMax?: number;
  estimateStep?: number;
  estimateIllustrationId?: string;
  estimateRevealedCorrectValue?: number;
  estimateRevealedFunFact?: string;
  estimateRevealedByPlayer?: Record<
    string,
    {
      value: number;
      diff: number;
      isWinner: boolean;
      pointsEarned: number;
    }
  >;
  // Quiz Reveal info
  quizRevealedByPlayer?: Record<
    string,
    {
      prompt: string;
      selectedOptionLabel?: string;
      correctOptionLabel: string;
      correctOptionIllustrationId?: string;
      isCorrect: boolean;
      pointsEarned: number;
      starEarned?: CategoryId;
      funFact?: string;
    }
  >;
  familyBonusAwarded?: boolean;
}

export interface PlayerPrivateView {
  playerId: string;
  sessionToken?: string;
  // Adaptive Quiz question for this specific player
  myQuizQuestion?: {
    id: string;
    category: CategoryId;
    level: DifficultyLevel;
    prompt: string;
    spokenPrompt?: string;
    options: QuizOption[];
    selectedOptionId?: string;
    correctOptionId?: string;
    funFact?: string;
  };
  // Thirty Seconds card (if player is actor, OR if player is Host helping Lucas!)
  myThirtySecondsTurn?: {
    isActor: boolean;
    isHostHelperForLucas: boolean;
    actorName: string;
    actorLevel: DifficultyLevel;
    started: boolean;
    activeItemIndex: number;
    items: Array<{
      id: string;
      word: string;
      illustrationId?: string;
      imageUrl?: string;
      status: 'pending' | 'guessed' | 'skipped';
    }>;
  };
  // Sound challenge options for this player
  mySoundChallenge?: {
    prompt: string;
    options: QuizOption[];
    selectedOptionId?: string;
    correctOptionId?: string;
  };
  // Zoom photo buzzer state + Host judge secret answer
  myZoomState?: {
    canBuzz: boolean;
    lockedOutRemainingSec: number;
    isBuzzedPlayer: boolean;
    hostSecretAnswer?: string;
    hostAcceptedHints?: string[];
  };
  // Pantomime state (secret card for actor + buzzer for guessers + secret answer for Host)
  myPantomimeState?: {
    isActor: boolean;
    actorName: string;
    started: boolean;
    secretPrompt?: string;
    secretHint?: string;
    secretIllustrationId?: string;
    secretImageUrl?: string;
    canBuzz: boolean;
    lockedOutRemainingSec: number;
    isBuzzedPlayer: boolean;
    hostSecretAnswer?: string;
  };
  // Estimate challenge state for this player
  myEstimateChallenge?: {
    id: string;
    prompt: string;
    spokenPrompt?: string;
    unit: string;
    min: number;
    max: number;
    step: number;
    illustrationId: string;
    submittedValue?: number;
    correctValue?: number;
    funFact?: string;
  };
}

export interface GameStatePayload {
  roomCode: string;
  showTitle: string;
  subtitle: string;
  qrUrl: string;
  qrDataUrl?: string;
  phase: GamePhase;
  previousPhaseBeforePause?: GamePhase;
  tvMuted: boolean;
  noConnectedHost: boolean;
  serverNowMs: number;
  hasResumableSession: boolean;
  resumableSessionInfo?: {
    roundNumber: number;
    totalRounds: number;
    savedAt: string;
  };
  hallOfFame: HallOfFameStats;
  settings: GameSettings;
  profiles: FamilyProfile[];
  players: Player[];
  teams: Team[];
  coopStars: CategoryId[];
  coopStarProgress: Record<CategoryId, number>;
  activeRound: ActiveRoundPublicInfo | null;
  awards: Award[];
  privateView?: PlayerPrivateView;
}
