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

/** Seizoen bij een datum; dezelfde grenzen als de TV-thema's (client/src/theme/seasons.ts). */
export type SeasonThemeId = 'sint' | 'kerst' | 'winter' | 'lente' | 'zomer' | 'herfst';

export function seasonThemeForDate(date: Date): SeasonThemeId {
  const key = (date.getMonth() + 1) * 100 + date.getDate();
  if (key >= 1112 && key <= 1207) return 'sint';
  if (key >= 1208 || key <= 114) return 'kerst';
  if (key < 320) return 'winter';
  if (key < 621) return 'lente';
  if (key < 923) return 'zomer';
  return 'herfst';
}

/** De bewegingen waaruit de tussendoortjes zijn opgebouwd (client: components/intermission). */
export type IntermissionTemplate =
  | 'parade'
  | 'launch'
  | 'zoomby'
  | 'rain'
  | 'orbit'
  | 'popgrid'
  | 'spotlight'
  | 'flip'
  | 'rainbow'
  | 'wave'
  | 'balloons'
  | 'duo'
  | 'burst'
  | 'volcano';

export interface IntermissionDef {
  id: string;
  /** Korte, vrolijke tekst in beeld */
  caption: string;
  template: IntermissionTemplate;
  /** Hoofdrolspelers (illustraties); de eerste is de ster */
  cast: string[];
  /** Bijrollen: wat valt, rondcirkelt, opgepakt wordt of tevoorschijn komt */
  extras?: string[];
  /** Losse deeltjes zonder illustratie */
  particle?: 'snow' | 'leaf' | 'note' | 'star' | 'cloud';
  /** Achtergrond- en accentkleur (vlak, in de stijl van de show) */
  bg: string;
  accent: string;
  /** Variaties op de beweging */
  variant?: 'spin';
  /** Alleen in dit seizoen */
  season?: SeasonThemeId;
}

/** Vijftig tussendoortjes van 3 seconden rond de thema's van de show. */
export const INTERMISSIONS: IntermissionDef[] = [
  // Dieren, dino's en natuur
  { id: 'dino-parade', caption: 'Dino-parade!', template: 'parade', cast: ['trex', 'triceratops', 'stegosaurus', 'brachiosaurus'], bg: '#1E5B3A', accent: '#FFD23F' },
  { id: 'dino-ei', caption: 'Krak! Een dino-ei!', template: 'burst', cast: ['dino_egg'], extras: ['velociraptor'], bg: '#2F4F1E', accent: '#F9D65C' },
  { id: 'vulkaan', caption: 'Vulkaan-alarm!', template: 'volcano', cast: ['volcano', 'trex'], bg: '#3A1F1A', accent: '#FF8A5B' },
  { id: 'pteranodon', caption: 'Zoef, een pteranodon!', template: 'zoomby', cast: ['pteranodon'], particle: 'cloud', bg: '#14506B', accent: '#FFD23F' },
  { id: 'boerderij', caption: 'Op de boerderij!', template: 'parade', cast: ['cow', 'pig', 'sheep', 'chicken', 'horse'], bg: '#2E6B2F', accent: '#FFE88A' },
  { id: 'jungle', caption: 'Welkom in de jungle!', template: 'popgrid', cast: ['jungle_ape', 'lion', 'giraffe', 'zebra', 'elephant', 'monkey'], bg: '#1F5132', accent: '#F9D65C' },
  { id: 'zeedieren', caption: 'Spetter in de zee!', template: 'wave', cast: ['turtle'], extras: ['dolphin'], bg: '#0B3550', accent: '#4FE0D0' },
  { id: 'vlindertuin', caption: 'Vlindertuin!', template: 'orbit', cast: ['butterfly'], extras: ['ladybug', 'bee', 'butterfly', 'ladybug', 'bee'], bg: '#23615D', accent: '#FF8FB1' },
  // Films, muziek en magie
  { id: 'eenhoorn', caption: 'Eenhoorn op de regenboog!', template: 'rainbow', cast: ['unicorn'], bg: '#2B2F6B', accent: '#FF8FB1' },
  { id: 'kpop', caption: 'Op het K-pop podium!', template: 'spotlight', cast: ['kpop_mic'], particle: 'note', bg: '#1A1033', accent: '#FF4FA3' },
  { id: 'toverstaf', caption: 'Abracadabra!', template: 'burst', cast: ['magic_wand'], extras: ['rabbit'], bg: '#3B2470', accent: '#B9A4FF' },
  { id: 'drumsolo', caption: 'Drumsolo!', template: 'spotlight', cast: ['drums'], particle: 'note', bg: '#24133D', accent: '#FFD23F' },
  { id: 'familieband', caption: 'De familieband speelt!', template: 'parade', cast: ['guitar', 'piano', 'trumpet', 'drums'], particle: 'note', bg: '#3B2470', accent: '#FFD23F' },
  { id: 'sterrenregen', caption: 'Sterrenregen!', template: 'rain', cast: ['moon_stars'], extras: ['star', 'super_star'], bg: '#1A1F4D', accent: '#FFD23F' },
  // Games en avontuur
  { id: 'sonic', caption: 'Supersnelle Sonic!', template: 'zoomby', cast: ['sonic_hedgehog'], extras: ['golden_ring'], bg: '#1C4FA0', accent: '#FFD23F' },
  { id: 'tails', caption: 'Tails vliegt mee!', template: 'launch', cast: ['tails_fox'], particle: 'cloud', bg: '#2A6FB5', accent: '#FFE88A' },
  { id: 'chaos-emeralds', caption: 'Chaos Emeralds!', template: 'orbit', cast: ['knuckles_red'], extras: ['chaos_emerald', 'chaos_emerald', 'chaos_emerald', 'chaos_emerald', 'chaos_emerald', 'chaos_emerald'], bg: '#14274A', accent: '#6FE0B5' },
  { id: 'superster', caption: 'Superster-kracht!', template: 'burst', cast: ['super_star'], bg: '#123F7A', accent: '#FFD23F' },
  { id: 'tonnen', caption: 'Pas op, rollende ton!', template: 'zoomby', cast: ['barrel'], variant: 'spin', bg: '#5A3214', accent: '#FFD23F' },
  { id: 'eiland', caption: 'Op je eigen eiland!', template: 'popgrid', cast: ['nook_raccoon', 'fishing_rod', 'island', 'tent_camp', 'apple', 'butterfly'], bg: '#1F6F6B', accent: '#FFE88A' },
  { id: 'raceauto', caption: 'Vroem vroem!', template: 'zoomby', cast: ['race_kart'], extras: ['star'], bg: '#2B2F6B', accent: '#FF8A5B' },
  // Sport, spel en lekker eten
  { id: 'pannenkoek', caption: 'Pannenkoek omdraaien!', template: 'flip', cast: ['pancake'], bg: '#7A3A12', accent: '#FFD23F' },
  { id: 'hooghouden', caption: 'Hooghouden!', template: 'flip', cast: ['soccer_ball'], bg: '#1F6B3A', accent: '#FDF6E9' },
  { id: 'fruitregen', caption: 'Fruitregen!', template: 'rain', cast: [], extras: ['apple', 'banana', 'strawberry', 'watermelon', 'lemon'], bg: '#6B2346', accent: '#F9D65C' },
  { id: 'smullen', caption: 'Smullen maar!', template: 'orbit', cast: ['pizza'], extras: ['fries', 'popcorn', 'cheese', 'ice_cream', 'carrot'], bg: '#7A3A12', accent: '#FFD23F' },
  { id: 'kampioen', caption: 'Kampioen!', template: 'burst', cast: ['trophy'], bg: '#5A4210', accent: '#FFD23F' },
  { id: 'popcorn', caption: 'Popcorn-tijd!', template: 'rain', cast: ['popcorn'], extras: ['popcorn'], bg: '#3B2470', accent: '#FFE88A' },
  // De wereld en slimme raadsels
  { id: 'raket', caption: '3, 2, 1... lancering!', template: 'launch', cast: ['rocket'], particle: 'star', bg: '#0E1A3A', accent: '#FF8A5B' },
  { id: 'planeten', caption: 'Rondje om de zon!', template: 'orbit', cast: ['sun'], extras: ['planet_saturn', 'moon_stars', 'rocket', 'star'], bg: '#0E1A3A', accent: '#FFD23F' },
  { id: 'luchtballon', caption: 'Hoog in de lucht!', template: 'launch', cast: ['hot_air_balloon'], particle: 'cloud', bg: '#2A6FB5', accent: '#FFE88A' },
  { id: 'voertuigen', caption: 'Toet toet, daar gaan we!', template: 'parade', cast: ['train', 'bicycle', 'motorcycle', 'tractor'], bg: '#0F3D52', accent: '#FFD23F' },
  { id: 'brandweer', caption: 'Brandweer met spoed!', template: 'zoomby', cast: ['firetruck'], extras: ['star'], bg: '#5A1414', accent: '#FFD23F' },
  { id: 'piraten', caption: 'Ahoy, piraten!', template: 'wave', cast: ['pirate_ship'], extras: ['treasure_chest'], bg: '#0B3550', accent: '#FFD23F' },
  { id: 'vuurtoren', caption: 'Licht op zee!', template: 'spotlight', cast: ['lighthouse'], particle: 'star', bg: '#0A1E33', accent: '#FFE88A' },
  // Ons gezin
  { id: 'high-five', caption: 'High five!', template: 'duo', cast: ['trex', 'unicorn'], extras: ['star'], bg: '#6B2346', accent: '#FFD23F' },
  { id: 'team', caption: 'Wij zijn een team!', template: 'duo', cast: ['house_family', 'heart_family'], extras: ['heart_family'], bg: '#7A2E4F', accent: '#FF8FB1' },
  { id: 'feest', caption: 'Hoera, feest!', template: 'balloons', cast: ['cake'], extras: ['gift_box', 'star'], bg: '#5A2A6B', accent: '#FFD23F' },
  { id: 'slimme-familie', caption: 'Slimme familie!', template: 'popgrid', cast: ['crown', 'star', 'trophy', 'heart_family', 'magic_wand', 'super_star'], bg: '#6B2346', accent: '#FFD23F' },
  // Seizoenen (alleen in hun eigen seizoen)
  { id: 'sint-pepernoten', caption: 'Pepernotenregen!', template: 'rain', cast: ['steamboat'], extras: ['pepernoten'], bg: '#14274A', accent: '#E8434F', season: 'sint' },
  { id: 'sint-stoomboot', caption: 'Daar is de stoomboot!', template: 'wave', cast: ['steamboat'], extras: ['gift_box'], bg: '#14274A', accent: '#FFC93C', season: 'sint' },
  { id: 'kerst-boom', caption: 'Lichtjes in de boom!', template: 'orbit', cast: ['christmas_tree'], extras: ['star', 'gift_box', 'snowman', 'star'], bg: '#0E2E26', accent: '#F5C84C', season: 'kerst' },
  { id: 'kerst-cadeaus', caption: 'Cadeautjesregen!', template: 'rain', cast: ['christmas_tree'], extras: ['gift_box'], bg: '#0E2E26', accent: '#E5484D', season: 'kerst' },
  { id: 'winter-sneeuw', caption: 'Sneeuwpret!', template: 'rain', cast: ['snowman'], particle: 'snow', bg: '#0F2A3A', accent: '#FDF6E9', season: 'winter' },
  { id: 'winter-pinguins', caption: 'Pinguïnparade!', template: 'parade', cast: ['penguin', 'penguin', 'penguin', 'penguin'], bg: '#0F2A3A', accent: '#6FE0B5', season: 'winter' },
  { id: 'lente-tuin', caption: 'Lente in de tuin!', template: 'popgrid', cast: ['butterfly', 'ladybug', 'bee', 'rabbit', 'frog', 'rainbow'], bg: '#123A3A', accent: '#FF8FB1', season: 'lente' },
  { id: 'lente-haas', caption: 'Haasje rap!', template: 'zoomby', cast: ['rabbit'], extras: ['carrot'], bg: '#1A4D4A', accent: '#F9D65C', season: 'lente' },
  { id: 'zomer-zon', caption: 'Zonnige zomer!', template: 'orbit', cast: ['sun'], extras: ['ice_cream', 'sunglasses', 'watermelon', 'swimming'], bg: '#0B3550', accent: '#FFC83D', season: 'zomer' },
  { id: 'zomer-strand', caption: 'Strandpret!', template: 'wave', cast: ['sailboat'], extras: ['dolphin'], bg: '#0B3550', accent: '#4FE0D0', season: 'zomer' },
  { id: 'herfst-blaadjes', caption: 'Herfstwind!', template: 'rain', cast: ['squirrel'], particle: 'leaf', bg: '#2A2230', accent: '#F2A93B', season: 'herfst' },
  { id: 'herfst-bos', caption: 'Wie woont er in het bos?', template: 'popgrid', cast: ['mushroom', 'squirrel', 'fox', 'owl', 'hedgehog', 'bear'], bg: '#2A2230', accent: '#F2A93B', season: 'herfst' },
];

export const INTERMISSION_MAP: Record<string, IntermissionDef> = Object.fromEntries(
  INTERMISSIONS.map((d) => [d.id, d])
);

/**
 * Welk seizoenspakket hoort bij een datum? Dezelfde grenzen als de seizoensthema's van de TV
 * (client/src/theme/seasons.ts): Sinterklaas 12 nov t/m 7 dec, Kerst 8 dec t/m 14 jan, Zomer 21 jun t/m 22 sep.
 */
export function seasonalPackForDate(date: Date): ContentPackId | null {
  const key = (date.getMonth() + 1) * 100 + date.getDate();
  if (key >= 1112 && key <= 1207) return 'sinterklaas';
  if (key >= 1208 || key <= 114) return 'kerst';
  if (key >= 621 && key <= 922) return 'zomer';
  return null;
}

/** De pakketten die altijd meedoen; het seizoenspakket komt er automatisch bij. */
export const BASE_CONTENT_PACKS: ContentPackId[] = ['basis', 'kids_special'];

export const TIMERS = {
  WHEEL_SPIN_SEC: 4,
  ROUND_INTRO_SEC: 3,
  QUIZ_DURATION_SEC: 25,
  SOUND_DURATION_SEC: 20,
  ZOOM_DURATION_SEC: 20,
  PANTOMIME_DURATION_SEC: 40,
  ESTIMATE_DURATION_SEC: 25,
  ZOOM_LOCKOUT_MS: 4000,
  /** Zo lang wacht de show op het oordeel van de host na een buzz; daarna is de buzzer weer vrij. */
  JUDGE_TIMEOUT_SEC: 20,
  /** Tussendoortje: zo lang duurt het, en na hoeveel vragen (willekeurig tussen min en max) komt er een. */
  INTERMISSION_SEC: 3,
  INTERMISSION_EVERY_MIN: 5,
  INTERMISSION_EVERY_MAX: 10,
  REVEAL_DURATION_SEC: 4,
  SCOREBOARD_DURATION_SEC: 5,
};
