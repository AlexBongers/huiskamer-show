import {
  CategoryId,
  CategoryMeta,
  ContentPackId,
  ContentPackMeta,
  DifficultyLevel,
  FamilyProfile,
  GameMode,
  RoundBonusType,
  RoundType,
} from './types';

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'dieren_dinos',
    name: "Dieren, Dino's & Natuur",
    shortName: "Dino's & Dieren",
    emoji: '🦕',
    color: '#22C55E',
    description: "T-Rex, Triceratops, vulkanen, boerderij- en jungledieren & natuurrecordhouders",
  },
  {
    id: 'films_magie',
    name: 'Films, Muziek & Magie',
    shortName: 'Muziek & Magie',
    emoji: '🎤',
    color: '#A855F7',
    description: 'KPop Demon Hunters (HUNTR/X), eenhoorns, regenbogen, Disney & filmklassiekers',
  },
  {
    id: 'games_avontuur',
    name: 'Games & Avontuur',
    shortName: 'Games & Avontuur',
    emoji: '🎮',
    color: '#3B82F6',
    description: 'Sonic the Hedgehog, Donkey Kong, Animal Crossing, Mario & retro games',
  },
  {
    id: 'sport_eten',
    name: 'Sport, Spel & Lekker Eten',
    shortName: 'Sport & Eten',
    emoji: '⚽',
    color: '#F97316',
    description: 'Pannenkoeken, fruit, ijsjes, sporten, spelregels & lekkernijen uit de wereld',
  },
  {
    id: 'wereld_raadsels',
    name: 'De Wereld & Slimme Raadsels',
    shortName: 'Wereld & Raadsels',
    emoji: '🌍',
    color: '#EAB308',
    description: 'Voertuigen, raketten, planeten, landen, vlaggen, tellen & slimme puzzels',
  },
  {
    id: 'ons_gezin',
    name: 'Ons Gezin!',
    shortName: 'Ons Gezin',
    emoji: '❤️',
    color: '#EC4899',
    description: 'Gezellige vragen over Lucas, Lana, Papa, Mama en ons huis!',
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce(
  (acc, cat) => {
    acc[cat.id] = cat;
    return acc;
  },
  {} as Record<CategoryId, CategoryMeta>
);

export const CONTENT_PACKS: ContentPackMeta[] = [
  {
    id: 'basis',
    name: 'Basis Familieshow',
    emoji: '🎬',
    description: 'Het grote standaardpakket voor Lucas, Lana, Papa & Mama',
  },
  {
    id: 'kids_special',
    name: 'Kids-Special: Dino, Sonic, Eenhoorn & K-Pop',
    emoji: '🦖',
    description: 'Extra veel dino’s, Sonic, Donkey Kong, HUNTR/X, eenhoorns & Animal Crossing!',
  },
  {
    id: 'sinterklaas',
    name: 'Sinterklaas & Pieten Feest',
    emoji: '🎁',
    description: 'Pepernoten, de stoomboot, schoentje zetten, Ozosnel & pakjesavond!',
  },
  {
    id: 'kerst',
    name: 'Kerst & Wintergezelligheid',
    emoji: '🎄',
    description: 'Kerstboom, sneeuwpoppen, rendieren, lichtjes & warme chocolademelk!',
  },
  {
    id: 'zomer',
    name: 'Zomervakantie & Strand',
    emoji: '☀️',
    description: 'Strand, zwembad, kamperen, ijsjes, vliegtuigen & zomerse avonturen!',
  },
  {
    id: 'verjaardag',
    name: 'Verjaardag & Feest!',
    emoji: '🎂',
    description: 'Slingers, taart met kaarsjes, cadeautjes & feestspellen!',
  },
];

export const DEFAULT_FAMILY_PROFILES: FamilyProfile[] = [
  {
    id: 'profile_lucas',
    name: 'Lucas',
    ageLabel: '5 jaar · Ontdekker',
    level: 'ontdekker',
    defaultAvatarId: 'trex',
    avatarOptions: ['trex', 'sonic_hedgehog', 'jungle_ape', 'star'],
    color: '#22C55E',
    isHostDefault: false,
    isCoHostDefault: false,
    autoSpeak: true,
  },
  {
    id: 'profile_lana',
    name: 'Lana',
    ageLabel: '7 jaar · Avonturier',
    level: 'avonturier',
    defaultAvatarId: 'unicorn',
    avatarOptions: ['unicorn', 'rainbow', 'island_friend', 'kpop_star'],
    color: '#A855F7',
    isHostDefault: false,
    isCoHostDefault: false,
    autoSpeak: false,
  },
  {
    id: 'profile_papa',
    name: 'Papa',
    ageLabel: 'Meester · Showhost',
    level: 'meester',
    defaultAvatarId: 'showmaster',
    avatarOptions: ['showmaster', 'owl', 'rocket', 'gamepad'],
    color: '#3B82F6',
    isHostDefault: true,
    isCoHostDefault: false,
    autoSpeak: false,
  },
  {
    id: 'profile_mama',
    name: 'Mama',
    ageLabel: 'Meester · Co-Host',
    level: 'meester',
    defaultAvatarId: 'crown',
    avatarOptions: ['crown', 'fox', 'star', 'music_note'],
    color: '#EC4899',
    isHostDefault: false,
    isCoHostDefault: true,
    autoSpeak: false,
  },
];

export const AVATAR_CATALOG: Record<
  string,
  { id: string; label: string; emoji: string; illustrationId: string }
> = {
  trex: { id: 'trex', label: 'T-Rex', emoji: '🦖', illustrationId: 'trex' },
  sonic_hedgehog: { id: 'sonic_hedgehog', label: 'Blauwe Egel', emoji: '💙', illustrationId: 'sonic_hedgehog' },
  jungle_ape: { id: 'jungle_ape', label: 'Jungle-Aap', emoji: '🦍', illustrationId: 'jungle_ape' },
  star: { id: 'star', label: 'Gouden Ster', emoji: '⭐', illustrationId: 'star' },
  unicorn: { id: 'unicorn', label: 'Eenhoorn', emoji: '🦄', illustrationId: 'unicorn' },
  rainbow: { id: 'rainbow', label: 'Regenboog', emoji: '🌈', illustrationId: 'rainbow' },
  island_friend: { id: 'island_friend', label: 'Eiland-Vriend', emoji: '🏝️', illustrationId: 'island' },
  kpop_star: { id: 'kpop_star', label: 'K-Pop Ster', emoji: '🎤', illustrationId: 'kpop_mic' },
  showmaster: { id: 'showmaster', label: 'Showmaster', emoji: '🎩', illustrationId: 'top_hat' },
  owl: { id: 'owl', label: 'Wijze Uil', emoji: '🦉', illustrationId: 'owl' },
  rocket: { id: 'rocket', label: 'Raket', emoji: '🚀', illustrationId: 'rocket' },
  gamepad: { id: 'gamepad', label: 'Retro Gamer', emoji: '🎮', illustrationId: 'gamepad' },
  crown: { id: 'crown', label: 'Kroon', emoji: '👑', illustrationId: 'crown' },
  fox: { id: 'fox', label: 'Slimme Vos', emoji: '🦊', illustrationId: 'fox' },
  music_note: { id: 'music_note', label: 'Muziekster', emoji: '🎵', illustrationId: 'guitar' },
};

export const ROUND_TYPE_META: Record<
  RoundType,
  { id: RoundType; name: string; emoji: string; shortDesc: string; accentColor: string }
> = {
  quiz: {
    id: 'quiz',
    name: 'Slimme Quiz',
    emoji: '🟣',
    shortDesc: 'Iedereen krijgt tegelijk een vraag op eigen niveau!',
    accentColor: '#A855F7',
  },
  thirty_seconds: {
    id: 'thirty_seconds',
    name: '30 Seconds Familie-editie',
    emoji: '⏱️',
    shortDesc: 'Omschrijf, maak geluiden of beeld zo veel mogelijk kaartjes uit!',
    accentColor: '#FFD23F',
  },
  sound: {
    id: 'sound',
    name: 'Wat hoor je?',
    emoji: '🔊',
    shortDesc: 'Luister goed naar de TV en tik zo snel mogelijk op het juiste plaatje!',
    accentColor: '#3B82F6',
  },
  zoom_photo: {
    id: 'zoom_photo',
    name: 'Zoom-in Foto',
    emoji: '🔍',
    shortDesc: 'De foto zoomt langzaam uit van 8× naar 1×. Wie drukt het eerst op de rode BUZZER?',
    accentColor: '#EC4899',
  },
  pantomime: {
    id: 'pantomime',
    name: 'Wie of Wat ben ik?',
    emoji: '🎭',
    shortDesc: 'Beeld het geheime plaatje uit zonder woorden! Wie drukt het eerst op de BUZZER?',
    accentColor: '#22C55E',
  },
  estimate: {
    id: 'estimate',
    name: 'Dichtstbij Wint!',
    emoji: '🎯',
    shortDesc: 'Schuif de balk naar jouw beste schatting! Wie het dichtst bij het antwoord zit, wint!',
    accentColor: '#F97316',
  },
};

export const ROUND_BONUS_META: Record<
  RoundBonusType,
  { id: RoundBonusType; label: string; emoji: string; description: string }
> = {
  none: {
    id: 'none',
    label: '',
    emoji: '',
    description: '',
  },
  double_points: {
    id: 'double_points',
    label: 'DUBBELE PUNTEN (2×)!',
    emoji: '✨',
    description: 'Alle verdiende punten in deze ronde tellen dubbel!',
  },
  family_bonus: {
    id: 'family_bonus',
    label: 'GEZINS-BONUS (+50)!',
    emoji: '🤝',
    description: 'Als iedereen deze ronde goed heeft, krijgt iedereen +50 extra bonuspunten!',
  },
  star_hunt: {
    id: 'star_hunt',
    label: 'STERREN-JACHT!',
    emoji: '🌟',
    description: 'Extra kans op een nog ontbrekende Categorie-Ster!',
  },
};

export const GAME_MODE_META: Record<
  GameMode,
  { id: GameMode; name: string; emoji: string; description: string }
> = {
  solo: {
    id: 'solo',
    name: 'Ieder voor zich',
    emoji: '🏆',
    description: 'Elke speler verzamelt eigen punten én een eigen 6-sterren kroon.',
  },
  duo_fixed: {
    id: 'duo_fixed',
    name: 'Vaste Duo-teams',
    emoji: '🤝',
    description: 'Twee vaste duo-teams (bijv. Team Goud vs. Team Neon) strijden samen!',
  },
  duo_rotating: {
    id: 'duo_rotating',
    name: 'Wisselende Duo-teams',
    emoji: '🔄',
    description: 'Elke ronde vormt de show nieuwe duo-koppels; teamwinst telt op bij je eigen score!',
  },
  coop: {
    id: 'coop',
    name: 'Samen-modus (Gezin tegen de Show)',
    emoji: '🌟',
    description: 'Het hele gezin speelt samen voor één grote Gezins-Kroon met alle 6 Categorie-Sterren!',
  },
};

export const LEVEL_META: Record<
  DifficultyLevel,
  {
    id: DifficultyLevel;
    label: string;
    thirtySecondsDurationSec: number;
    thirtySecondsItemCount: number;
    autoSpeak: boolean;
  }
> = {
  ontdekker: {
    id: 'ontdekker',
    label: 'Ontdekker (Kleuter · 5 jaar)',
    thirtySecondsDurationSec: 45,
    thirtySecondsItemCount: 1,
    autoSpeak: true,
  },
  avonturier: {
    id: 'avonturier',
    label: 'Avonturier (Junior · 7 jaar)',
    thirtySecondsDurationSec: 40,
    thirtySecondsItemCount: 4,
    autoSpeak: false,
  },
  meester: {
    id: 'meester',
    label: 'Meester (Volwassene)',
    thirtySecondsDurationSec: 30,
    thirtySecondsItemCount: 5,
    autoSpeak: false,
  },
};

export const TIMERS = {
  WHEEL_SPIN_SEC: 4,
  ROUND_INTRO_SEC: 3,
  QUIZ_DURATION_SEC: 25,
  SOUND_DURATION_SEC: 20,
  ZOOM_DURATION_SEC: 20,
  PANTOMIME_DURATION_SEC: 40,
  ESTIMATE_DURATION_SEC: 25,
  ZOOM_LOCKOUT_MS: 4000,
  REVEAL_DURATION_SEC: 4,
  SCOREBOARD_DURATION_SEC: 5,
};
