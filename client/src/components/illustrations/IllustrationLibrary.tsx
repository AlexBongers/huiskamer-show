import React from 'react';

export interface IllustrationMeta {
  id: string;
  label: string;
  bg1: string;
  bg2: string;
}

export const ILLUSTRATION_LIST: IllustrationMeta[] = [
  { id: 'trex', label: 'T-Rex Dino', bg1: '#14532D', bg2: '#22C55E' },
  { id: 'triceratops', label: 'Triceratops', bg1: '#7C2D12', bg2: '#F97316' },
  { id: 'brachiosaurus', label: 'Langnek-Dino', bg1: '#065F46', bg2: '#10B981' },
  { id: 'stegosaurus', label: 'Stegosaurus', bg1: '#365314', bg2: '#84CC16' },
  { id: 'volcano', label: 'Uitbarstende Vulkaan', bg1: '#450A0A', bg2: '#EF4444' },
  { id: 'lion', label: 'Leeuw', bg1: '#78350F', bg2: '#F59E0B' },
  { id: 'elephant', label: 'Olifant', bg1: '#1E3A8A', bg2: '#60A5FA' },
  { id: 'frog', label: 'Groene Kikker', bg1: '#064E3B', bg2: '#34D399' },
  { id: 'dog', label: 'Blije Hond', bg1: '#713F12', bg2: '#FACC15' },
  { id: 'cat', label: 'Lieve Kat', bg1: '#831843', bg2: '#F472B6' },
  { id: 'cow', label: 'Boerderijkoe', bg1: '#14532D', bg2: '#4ADE80' },
  { id: 'horse', label: 'Paard', bg1: '#7C2D12', bg2: '#FB923C' },
  { id: 'shark', label: 'Haai in de Zee', bg1: '#0C4A6E', bg2: '#38BDF8' },
  { id: 'butterfly', label: 'Kleurrijke Vlinder', bg1: '#581C87', bg2: '#C084FC' },
  { id: 'owl', label: 'Wijze Uil', bg1: '#312E81', bg2: '#818CF8' },
  { id: 'fox', label: 'Slimme Vos', bg1: '#7C2D12', bg2: '#F97316' },
  { id: 'penguin', label: 'Pinguïn', bg1: '#1E3A8A', bg2: '#93C5FD' },
  { id: 'dolphin', label: 'Dolfijn', bg1: '#0369A1', bg2: '#22D3EE' },
  { id: 'unicorn', label: 'Magische Eenhoorn', bg1: '#701A75', bg2: '#F472B6' },
  { id: 'rainbow', label: 'Regenboog', bg1: '#1E1B4B', bg2: '#60A5FA' },
  { id: 'kpop_mic', label: 'K-Pop Microfoon (HUNTR/X)', bg1: '#581C87', bg2: '#EC4899' },
  { id: 'kpop_stage', label: 'HUNTR/X K-Pop Podium', bg1: '#3B0764', bg2: '#A855F7' },
  { id: 'magic_wand', label: 'Toverstaf & Honmoon', bg1: '#4C1D95', bg2: '#C084FC' },
  { id: 'guitar', label: 'Gitaar', bg1: '#7C2D12', bg2: '#F59E0B' },
  { id: 'piano', label: 'Piano', bg1: '#1E293B', bg2: '#64748B' },
  { id: 'drums', label: 'Drumstel', bg1: '#7F1D1D', bg2: '#F87171' },
  { id: 'trumpet', label: 'Gouden Trompet', bg1: '#713F12', bg2: '#FFD23F' },
  { id: 'castle', label: 'Sprookjeskasteel', bg1: '#4C1D95', bg2: '#F472B6' },
  { id: 'crown', label: 'Gouden Kroon', bg1: '#78350F', bg2: '#FFD23F' },
  { id: 'popcorn', label: 'Bioscoop Popcorn', bg1: '#7F1D1D', bg2: '#FBBF24' },
  { id: 'sonic_hedgehog', label: 'Blauwe Egel (Sonic)', bg1: '#1E3A8A', bg2: '#3B82F6' },
  { id: 'golden_ring', label: 'Gouden Ring', bg1: '#1E3A8A', bg2: '#FFD23F' },
  { id: 'tails_fox', label: 'Tails (2 Staarten)', bg1: '#78350F', bg2: '#F59E0B' },
  { id: 'knuckles_red', label: 'Knuckles', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'eggman_robot', label: 'Dokter Eggman Robot', bg1: '#450A0A', bg2: '#F97316' },
  { id: 'jungle_ape', label: 'Donkey Kong Aap', bg1: '#451A03', bg2: '#D97706' },
  { id: 'banana', label: 'Tros Gele Bananen', bg1: '#713F12', bg2: '#FACC15' },
  { id: 'barrel', label: 'Houten Jungle-Ton', bg1: '#451A03', bg2: '#B45309' },
  { id: 'mushroom', label: 'Power-Paddenstoel', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'super_star', label: 'Gouden Superster', bg1: '#312E81', bg2: '#FFD23F' },
  { id: 'star', label: 'Gouden Ster', bg1: '#312E81', bg2: '#FFD23F' },
  { id: 'yoshi_dino', label: 'Groene Dino Yoshi', bg1: '#14532D', bg2: '#4ADE80' },
  { id: 'race_kart', label: 'Snelle Raceauto / Kart', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'island', label: 'Animal Crossing Eiland', bg1: '#0369A1', bg2: '#34D399' },
  { id: 'nook_raccoon', label: 'Tom Nook Wasbeer', bg1: '#065F46', bg2: '#F59E0B' },
  { id: 'fishing_rod', label: 'Vishengel & Vis', bg1: '#0C4A6E', bg2: '#38BDF8' },
  { id: 'gamepad', label: 'Gamecontroller', bg1: '#1E1B4B', bg2: '#3B82F6' },
  { id: 'pizza', label: 'Warme Pizza', bg1: '#7F1D1D', bg2: '#F97316' },
  { id: 'pancake', label: 'Stapel Pannenkoeken', bg1: '#78350F', bg2: '#FBBF24' },
  { id: 'ice_cream', label: 'IJsje', bg1: '#831843', bg2: '#F472B6' },
  { id: 'strawberry', label: 'Zoete Aardbei', bg1: '#881337', bg2: '#FB7185' },
  { id: 'apple', label: 'Frisse Appel', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'cake', label: 'Verjaardagstaart', bg1: '#701A75', bg2: '#F472B6' },
  { id: 'soccer_ball', label: 'Voetbal', bg1: '#14532D', bg2: '#22C55E' },
  { id: 'bicycle', label: 'Fiets', bg1: '#1E3A8A', bg2: '#38BDF8' },
  { id: 'swimming', label: 'Zwembad & Zwembril', bg1: '#0369A1', bg2: '#22D3EE' },
  { id: 'trophy', label: 'Gouden Kampioensbeker', bg1: '#713F12', bg2: '#FFD23F' },
  { id: 'firetruck', label: 'Rode Brandweerauto', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'train', label: 'Snelle Trein', bg1: '#1E3A8A', bg2: '#3B82F6' },
  { id: 'rocket', label: 'Ruimteraket', bg1: '#0F172A', bg2: '#6366F1' },
  { id: 'airplane', label: 'Vliegtuig', bg1: '#0C4A6E', bg2: '#38BDF8' },
  { id: 'planet_saturn', label: 'Planeet Saturnus', bg1: '#1E1B4B', bg2: '#A855F7' },
  { id: 'sun', label: 'Stralende Zon', bg1: '#7C2D12', bg2: '#FACC15' },
  { id: 'moon_stars', label: 'Maan en Sterren', bg1: '#0F172A', bg2: '#FFD23F' },
  { id: 'house_family', label: 'Ons Familiehuis', bg1: '#1E3A8A', bg2: '#F43F5E' },
  { id: 'toothbrush', label: 'Tandenborstel', bg1: '#065F46', bg2: '#22D3EE' },
  { id: 'lighthouse', label: 'Vuurtoren aan Zee', bg1: '#0C4A6E', bg2: '#EF4444' },
  { id: 'top_hat', label: 'Showmaster Hoge Hoed', bg1: '#1E1B4B', bg2: '#FFD23F' },
  { id: 'heart_family', label: 'Groot Gezinshart', bg1: '#831843', bg2: '#EC4899' },
  { id: 'clock_alarm', label: 'Rinkelende Wekker', bg1: '#7C2D12', bg2: '#F59E0B' },
  { id: 'police_car', label: 'Politieauto', bg1: '#1E3A8A', bg2: '#38BDF8' },
  { id: 'mountain', label: 'Hoge Bergtop', bg1: '#1E293B', bg2: '#38BDF8' },
  { id: 'lemon', label: 'Gele Citroen', bg1: '#713F12', bg2: '#FDE047' },
  { id: 'carrot', label: 'Oranje Wortel', bg1: '#7C2D12', bg2: '#FB923C' },
  { id: 'hot_air_balloon', label: 'Luchtballon', bg1: '#0C4A6E', bg2: '#EC4899' },
  { id: 'ankylosaurus', label: 'Ankylosaurus (Pantser-dino)', bg1: '#365314', bg2: '#84CC16' },
  { id: 'spinosaurus', label: 'Spinosaurus (Zeil-dino)', bg1: '#7C2D12', bg2: '#F97316' },
  { id: 'pteranodon', label: 'Pteranodon (Vliegende dino)', bg1: '#0C4A6E', bg2: '#38BDF8' },
  { id: 'velociraptor', label: 'Velociraptor', bg1: '#14532D', bg2: '#4ADE80' },
  { id: 'dino_egg', label: 'Gespikkeld Dino-ei', bg1: '#065F46', bg2: '#A7F3D0' },
  { id: 'fossil', label: 'Dino-Fossiel', bg1: '#451A03', bg2: '#FDE68A' },
  { id: 'giraffe', label: 'Giraffe', bg1: '#78350F', bg2: '#FACC15' },
  { id: 'zebra', label: 'Zebra', bg1: '#1E293B', bg2: '#94A3B8' },
  { id: 'monkey', label: 'Vrolijk Aapje', bg1: '#451A03', bg2: '#F59E0B' },
  { id: 'turtle', label: 'Zeeschildpad', bg1: '#064E3B', bg2: '#34D399' },
  { id: 'octopus', label: 'Octopus', bg1: '#581C87', bg2: '#E879F9' },
  { id: 'whale', label: 'Blauwe Vinvis (Walvis)', bg1: '#0C4A6E', bg2: '#38BDF8' },
  { id: 'bee', label: 'Zoemende Bij', bg1: '#713F12', bg2: '#FACC15' },
  { id: 'ladybug', label: 'Lieveheersbeestje', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'bear', label: 'Bruine Beer', bg1: '#451A03', bg2: '#B45309' },
  { id: 'panda', label: 'Reuzenpanda', bg1: '#064E3B', bg2: '#E2E8F0' },
  { id: 'koala', label: 'Koala', bg1: '#1E293B', bg2: '#94A3B8' },
  { id: 'kangaroo', label: 'Kangoeroe', bg1: '#7C2D12', bg2: '#FB923C' },
  { id: 'camel', label: 'Kameel', bg1: '#78350F', bg2: '#FBBF24' },
  { id: 'flamingo', label: 'Roze Flamingo', bg1: '#831843', bg2: '#F472B6' },
  { id: 'peacock', label: 'Pauw', bg1: '#065F46', bg2: '#22D3EE' },
  { id: 'hedgehog', label: 'Bos-Egel', bg1: '#451A03', bg2: '#D97706' },
  { id: 'squirrel', label: 'Eekhoorn', bg1: '#7C2D12', bg2: '#F97316' },
  { id: 'rabbit', label: 'Konijn', bg1: '#701A75', bg2: '#F9A8D4' },
  { id: 'pig', label: 'Boerderijvarken', bg1: '#831843', bg2: '#F472B6' },
  { id: 'sheep', label: 'Wollig Schaap', bg1: '#14532D', bg2: '#F8FAFC' },
  { id: 'chicken', label: 'Boerderijkip', bg1: '#7C2D12', bg2: '#FACC15' },
  { id: 'duck', label: 'Gele Eend', bg1: '#0369A1', bg2: '#FDE047' },
  { id: 'shadow_hedgehog', label: 'Shadow de Egel', bg1: '#18181B', bg2: '#EF4444' },
  { id: 'amy_pink', label: 'Amy Rose', bg1: '#831843', bg2: '#F472B6' },
  { id: 'chaos_emerald', label: 'Chaos Emerald Diamant', bg1: '#064E3B', bg2: '#22C55E' },
  { id: 'treasure_chest', label: 'Gouden Schatkist', bg1: '#451A03', bg2: '#FFD23F' },
  { id: 'pirate_ship', label: 'Piratenschip', bg1: '#0C4A6E', bg2: '#B45309' },
  { id: 'helicopter', label: 'Helikopter', bg1: '#1E3A8A', bg2: '#38BDF8' },
  { id: 'tractor', label: 'Groene Tractor', bg1: '#14532D', bg2: '#22C55E' },
  { id: 'submarine', label: 'Gele Duikboot', bg1: '#0C4A6E', bg2: '#FACC15' },
  { id: 'sailboat', label: 'Zeilboot', bg1: '#0369A1', bg2: '#F8FAFC' },
  { id: 'motorcycle', label: 'Stoere Motor', bg1: '#7F1D1D', bg2: '#EF4444' },
  { id: 'ambulance', label: 'Ambulance', bg1: '#1E3A8A', bg2: '#F8FAFC' },
  { id: 'excavator', label: 'Graafmachine', bg1: '#713F12', bg2: '#FACC15' },
  { id: 'snowman', label: 'Sneeuwpop', bg1: '#1E3A8A', bg2: '#E0F2FE' },
  { id: 'christmas_tree', label: 'Kerstboom', bg1: '#14532D', bg2: '#22C55E' },
  { id: 'gift_box', label: 'Feestcadeau', bg1: '#7F1D1D', bg2: '#FFD23F' },
  { id: 'steamboat', label: 'Stoomboot van Sinterklaas', bg1: '#0C4A6E', bg2: '#EF4444' },
  { id: 'pepernoten', label: 'Mijter & Pepernoten', bg1: '#7F1D1D', bg2: '#FFD23F' },
  { id: 'tent_camp', label: 'Kampeertent', bg1: '#064E3B', bg2: '#F97316' },
  { id: 'sunglasses', label: 'Zonnebril & Zomer', bg1: '#0369A1', bg2: '#FACC15' },
  { id: 'watermelon', label: 'Watermeloen', bg1: '#14532D', bg2: '#F43F5E' },
  { id: 'fries', label: 'Frietjes', bg1: '#7F1D1D', bg2: '#FACC15' },
  { id: 'cheese', label: 'Hollandse Kaas', bg1: '#78350F', bg2: '#FACC15' },
];

const META_MAP: Record<string, IllustrationMeta> = ILLUSTRATION_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<string, IllustrationMeta>
);

function renderArtwork(id: string): React.ReactNode {
  switch (id) {
    case 'trex':
      return (
        <g>
          {/* Jungle ground & leaves */}
          <ellipse cx="100" cy="175" rx="80" ry="16" fill="#15803D" />
          {/* Tail & Body */}
          <path d="M25 145 Q55 140 75 115 L118 115 Q130 148 100 162 Z" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          {/* Big Head & Open Jaw */}
          <path d="M88 50 L156 50 Q168 55 165 78 L125 82 L158 95 Q155 110 120 108 L88 105 Z" fill="#4ADE80" stroke="#14532D" strokeWidth="4" />
          {/* Sharp White Teeth */}
          <polygon points="128,80 133,90 138,80 143,90 148,80 153,90 158,80" fill="#FFFFFF" />
          {/* Eye */}
          <circle cx="115" cy="64" r="7" fill="#FEF08A" />
          <circle cx="117" cy="64" r="3.5" fill="#0F2A3A" />
          {/* Cute tiny arm */}
          <path d="M118 118 L134 124 L130 132" fill="none" stroke="#14532D" strokeWidth="5" strokeLinecap="round" />
          {/* Strong legs */}
          <rect x="75" y="148" width="16" height="24" rx="6" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <rect x="102" y="148" width="16" height="24" rx="6" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          {/* Back spikes */}
          <polygon points="65,112 75,96 85,112" fill="#FFD23F" />
          <polygon points="48,125 58,110 68,125" fill="#FFD23F" />
        </g>
      );

    case 'triceratops':
      return (
        <g>
          <ellipse cx="100" cy="172" rx="82" ry="15" fill="#166534" />
          {/* Body */}
          <ellipse cx="115" cy="126" rx="52" ry="34" fill="#F97316" stroke="#7C2D12" strokeWidth="4" />
          {/* Big Crown Shield (Frill) */}
          <circle cx="78" cy="95" r="36" fill="#FB923C" stroke="#7C2D12" strokeWidth="5" />
          {/* Head */}
          <path d="M35 125 L78 88 L85 136 Z" fill="#FDBA74" stroke="#7C2D12" strokeWidth="4" />
          {/* 3 Horns! */}
          <polygon points="34,122 16,102 44,114" fill="#FEF08A" stroke="#7C2D12" strokeWidth="2" />
          <polygon points="62,92 32,64 70,82" fill="#FEF08A" stroke="#7C2D12" strokeWidth="2" />
          <polygon points="74,84 48,54 82,76" fill="#FEF08A" stroke="#7C2D12" strokeWidth="2" />
          <circle cx="62" cy="108" r="5" fill="#0F2A3A" />
          <rect x="85" y="148" width="16" height="24" rx="5" fill="#EA580C" />
          <rect x="130" y="148" width="16" height="24" rx="5" fill="#EA580C" />
        </g>
      );

    case 'brachiosaurus':
      return (
        <g>
          <ellipse cx="100" cy="175" rx="80" ry="15" fill="#065F46" />
          {/* Body */}
          <ellipse cx="95" cy="142" rx="45" ry="26" fill="#10B981" stroke="#064E3B" strokeWidth="4" />
          {/* Super Long Neck & Head */}
          <path d="M115 130 Q132 70 138 38 Q145 28 162 34 Q168 44 152 48 Q142 85 132 138 Z" fill="#34D399" stroke="#064E3B" strokeWidth="4" />
          <circle cx="150" cy="37" r="4" fill="#0F2A3A" />
          {/* Legs */}
          <rect x="65" y="152" width="15" height="24" rx="5" fill="#059669" />
          <rect x="112" y="152" width="15" height="24" rx="5" fill="#059669" />
          {/* Spots */}
          <circle cx="85" cy="135" r="7" fill="#A7F3D0" />
          <circle cx="105" cy="142" r="5" fill="#A7F3D0" />
        </g>
      );

    case 'stegosaurus':
      return (
        <g>
          <ellipse cx="100" cy="174" rx="82" ry="14" fill="#365314" />
          {/* Back diamond plates */}
          <polygon points="65,98 78,68 91,98" fill="#F97316" stroke="#7C2D12" strokeWidth="3" />
          <polygon points="88,92 104,58 120,92" fill="#F97316" stroke="#7C2D12" strokeWidth="3" />
          <polygon points="115,98 130,70 145,98" fill="#F97316" stroke="#7C2D12" strokeWidth="3" />
          {/* Body */}
          <path d="M35 142 Q100 72 165 145 Z" fill="#84CC16" stroke="#365314" strokeWidth="4" />
          {/* Head */}
          <ellipse cx="34" cy="140" rx="18" ry="11" fill="#A3E635" stroke="#365314" strokeWidth="3" />
          <circle cx="28" cy="138" r="3.5" fill="#0F2A3A" />
          {/* Tail spikes */}
          <line x1="160" y1="140" x2="180" y2="122" stroke="#FEF08A" strokeWidth="5" strokeLinecap="round" />
          <line x1="166" y1="145" x2="186" y2="134" stroke="#FEF08A" strokeWidth="5" strokeLinecap="round" />
        </g>
      );

    case 'volcano':
      return (
        <g>
          {/* Smoke clouds */}
          <circle cx="85" cy="36" r="18" fill="#94A3B8" opacity="0.8" />
          <circle cx="115" cy="32" r="22" fill="#CBD5E1" opacity="0.85" />
          {/* Lava fountain */}
          <path d="M85 75 Q70 35 52 48 M100 75 Q100 22 100 18 M115 75 Q132 35 148 48" stroke="#F97316" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="62" cy="40" r="6" fill="#FACC15" />
          <circle cx="138" cy="42" r="6" fill="#FACC15" />
          {/* Volcano mountain cone */}
          <polygon points="24,175 74,72 126,72 176,175" fill="#57534E" stroke="#292524" strokeWidth="4" />
          {/* Flowing Lava */}
          <path d="M74 72 L126 72 L134 105 Q122 120 116 98 Q102 135 94 102 Q80 122 68 98 Z" fill="#EF4444" />
          <path d="M82 74 L118 74 L110 105 L90 95 Z" fill="#FACC15" />
        </g>
      );

    case 'unicorn':
      return (
        <g>
          {/* Sparkles */}
          <circle cx="42" cy="48" r="5" fill="#FFD23F" />
          <circle cx="162" cy="56" r="6" fill="#38BDF8" />
          <circle cx="152" cy="145" r="5" fill="#F472B6" />
          {/* Rainbow mane */}
          <path d="M74 68 Q45 78 52 105" stroke="#EC4899" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M70 82 Q40 94 48 122" stroke="#A855F7" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M68 98 Q42 112 52 138" stroke="#38BDF8" strokeWidth="12" strokeLinecap="round" fill="none" />
          {/* White Unicorn Head & Neck */}
          <path d="M62 165 L75 72 Q82 52 105 62 L152 84 Q164 96 150 112 L112 110 L108 165 Z" fill="#FFFFFF" stroke="#F472B6" strokeWidth="4" />
          {/* Golden Magical Horn */}
          <polygon points="102,60 148,18 118,72" fill="#FFD23F" stroke="#B45309" strokeWidth="3" />
          {/* Eye & Smile */}
          <circle cx="114" cy="84" r="6" fill="#4C1D95" />
          <circle cx="116" cy="82" r="2" fill="#FFFFFF" />
          <circle cx="138" cy="96" r="7" fill="#FBCFE8" />
        </g>
      );

    case 'rainbow':
      return (
        <g>
          {/* Rainbow arcs */}
          <path d="M22 145 A78 78 0 0 1 178 145" fill="none" stroke="#EF4444" strokeWidth="11" />
          <path d="M33 145 A67 67 0 0 1 167 145" fill="none" stroke="#F97316" strokeWidth="11" />
          <path d="M44 145 A56 56 0 0 1 156 145" fill="none" stroke="#FACC15" strokeWidth="11" />
          <path d="M55 145 A45 45 0 0 1 145 145" fill="none" stroke="#22C55E" strokeWidth="11" />
          <path d="M66 145 A34 34 0 0 1 134 145" fill="none" stroke="#3B82F6" strokeWidth="11" />
          <path d="M77 145 A23 23 0 0 1 123 145" fill="none" stroke="#A855F7" strokeWidth="11" />
          {/* Fluffy white clouds */}
          <circle cx="32" cy="148" r="20" fill="#FFFFFF" />
          <circle cx="52" cy="152" r="18" fill="#FFFFFF" />
          <circle cx="148" cy="152" r="18" fill="#FFFFFF" />
          <circle cx="168" cy="148" r="20" fill="#FFFFFF" />
        </g>
      );

    case 'kpop_mic':
    case 'kpop_stage':
      return (
        <g>
          {/* Neon HUNTR/X Star & Glow */}
          <polygon points="100,18 118,62 166,66 128,98 140,145 100,118 60,145 72,98 34,66 82,62" fill="#A855F7" stroke="#FFD23F" strokeWidth="4" />
          {/* Glitter Microphone */}
          <rect x="88" y="88" width="24" height="72" rx="10" fill="#F472B6" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="100" cy="72" r="26" fill="#FFD23F" stroke="#FFFFFF" strokeWidth="4" />
          <line x1="76" y1="72" x2="124" y2="72" stroke="#78350F" strokeWidth="3" />
          {/* Sparkles */}
          <circle cx="42" cy="40" r="6" fill="#22D3EE" />
          <circle cx="158" cy="40" r="6" fill="#F472B6" />
        </g>
      );

    case 'sonic_hedgehog':
      return (
        <g>
          {/* Speed aura ring */}
          <circle cx="100" cy="100" r="76" fill="none" stroke="#FFD23F" strokeWidth="5" strokeDasharray="14 8" />
          {/* Iconic Blue Spikes */}
          <polygon points="85,42 22,56 72,88" fill="#2563EB" stroke="#1E3A8A" strokeWidth="4" />
          <polygon points="82,72 16,98 76,118" fill="#2563EB" stroke="#1E3A8A" strokeWidth="4" />
          <polygon points="85,105 28,138 88,142" fill="#2563EB" stroke="#1E3A8A" strokeWidth="4" />
          {/* Head */}
          <circle cx="112" cy="96" r="42" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="4" />
          {/* Ears */}
          <polygon points="96,60 108,30 124,58" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="4" />
          {/* Muzzle & Emerald Eyes */}
          <ellipse cx="122" cy="114" rx="28" ry="18" fill="#FDE68A" />
          <ellipse cx="122" cy="84" rx="11" ry="16" fill="#FFFFFF" />
          <ellipse cx="126" cy="86" rx="6" ry="10" fill="#22C55E" />
          <circle cx="127" cy="84" r="3" fill="#0F2A3A" />
          {/* Nose & confident grin */}
          <ellipse cx="148" cy="106" rx="7" ry="4.5" fill="#0F2A3A" />
          <path d="M114 118 Q128 126 138 116" fill="none" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      );

    case 'golden_ring':
      return (
        <g>
          <circle cx="100" cy="100" r="64" fill="none" stroke="#B45309" strokeWidth="26" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="#FFD23F" strokeWidth="20" />
          <circle cx="100" cy="100" r="64" fill="none" stroke="#FEF08A" strokeWidth="6" />
          {/* Shine */}
          <polygon points="148,36 154,50 168,56 154,62 148,76 142,62 128,56 142,50" fill="#FFFFFF" />
        </g>
      );

    case 'tails_fox':
    case 'fox':
      return (
        <g>
          {/* Twin fluffy tails */}
          <path d="M58 135 Q18 105 28 76 Q46 72 68 112" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <path d="M62 148 Q20 145 24 116 Q44 112 72 132" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          {/* Head */}
          <circle cx="114" cy="102" r="38" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          {/* Big fox ears */}
          <polygon points="86,74 74,28 110,64" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <polygon points="122,64 148,28 144,76" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="114" cy="116" rx="28" ry="18" fill="#FFFFFF" />
          <circle cx="102" cy="94" r="6" fill="#0284C7" />
          <circle cx="126" cy="94" r="6" fill="#0284C7" />
          <circle cx="114" cy="108" r="5" fill="#0F2A3A" />
        </g>
      );

    case 'jungle_ape':
      return (
        <g>
          {/* Head & Hair Curl */}
          <circle cx="100" cy="88" r="44" fill="#92400E" stroke="#451A03" strokeWidth="4" />
          <path d="M90 45 Q105 22 118 44" fill="#92400E" stroke="#451A03" strokeWidth="4" />
          {/* Muzzle & Big Smile */}
          <ellipse cx="100" cy="102" rx="34" ry="22" fill="#FDE68A" stroke="#451A03" strokeWidth="3" />
          <path d="M78 102 Q100 118 122 102" fill="none" stroke="#451A03" strokeWidth="4" strokeLinecap="round" />
          {/* Eyes */}
          <circle cx="86" cy="78" r="7" fill="#FFFFFF" />
          <circle cx="114" cy="78" r="7" fill="#FFFFFF" />
          <circle cx="86" cy="78" r="3.5" fill="#0F2A3A" />
          <circle cx="114" cy="78" r="3.5" fill="#0F2A3A" />
          {/* Famous Red Tie */}
          <polygon points="92,126 108,126 114,174 100,186 86,174" fill="#EF4444" stroke="#7F1D1D" strokeWidth="3" />
          <text x="100" y="166" textAnchor="middle" fill="#FACC15" fontSize="18" fontWeight="bold" fontFamily="Sora">DK</text>
        </g>
      );

    case 'banana':
      return (
        <g>
          <path d="M46 130 Q95 168 152 84 Q162 62 146 46 Q128 98 54 110 Z" fill="#FACC15" stroke="#854D0E" strokeWidth="4" />
          <path d="M54 148 Q112 182 164 102 Q172 80 156 64 Q138 118 62 128 Z" fill="#FDE047" stroke="#854D0E" strokeWidth="4" />
          <rect x="142" y="36" width="14" height="16" rx="4" fill="#65A30D" />
        </g>
      );

    case 'barrel':
      return (
        <g>
          <ellipse cx="100" cy="100" rx="54" ry="68" fill="#B45309" stroke="#451A03" strokeWidth="5" />
          <line x1="100" y1="32" x2="100" y2="168" stroke="#451A03" strokeWidth="3" />
          <line x1="72" y1="38" x2="72" y2="162" stroke="#451A03" strokeWidth="3" />
          <line x1="128" y1="38" x2="128" y2="162" stroke="#451A03" strokeWidth="3" />
          <rect x="50" y="56" width="100" height="14" rx="4" fill="#64748B" stroke="#1E293B" strokeWidth="3" />
          <rect x="50" y="130" width="100" height="14" rx="4" fill="#64748B" stroke="#1E293B" strokeWidth="3" />
        </g>
      );

    case 'mushroom':
      return (
        <g>
          {/* Stem & Eyes */}
          <rect x="64" y="108" width="72" height="58" rx="22" fill="#FEF3C7" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="88" cy="134" rx="5" ry="10" fill="#0F2A3A" />
          <ellipse cx="112" cy="134" rx="5" ry="10" fill="#0F2A3A" />
          {/* Red Cap with White Spots */}
          <path d="M28 114 C28 42 172 42 172 114 Z" fill="#EF4444" stroke="#7F1D1D" strokeWidth="4" />
          <circle cx="100" cy="74" r="18" fill="#FFFFFF" />
          <circle cx="54" cy="94" r="14" fill="#FFFFFF" />
          <circle cx="146" cy="94" r="14" fill="#FFFFFF" />
        </g>
      );

    case 'super_star':
    case 'star':
      return (
        <g>
          <polygon
            points="100,18 123,68 178,74 136,112 148,166 100,138 52,166 64,112 22,74 77,68"
            fill="#FFD23F"
            stroke="#B45309"
            strokeWidth="5"
          />
          <ellipse cx="88" cy="94" rx="5" ry="11" fill="#0F2A3A" />
          <ellipse cx="112" cy="94" rx="5" ry="11" fill="#0F2A3A" />
        </g>
      );

    case 'island':
      return (
        <g>
          {/* Ocean waves */}
          <rect x="10" y="140" width="180" height="45" rx="14" fill="#0284C7" />
          {/* Sandy Island */}
          <path d="M36 146 Q100 104 164 146 Z" fill="#FDE047" stroke="#CA8A04" strokeWidth="3" />
          {/* Palm tree trunk */}
          <path d="M100 130 Q112 88 94 52" fill="none" stroke="#92400E" strokeWidth="12" strokeLinecap="round" />
          {/* Palm leaves */}
          <path d="M94 52 Q52 40 44 68" fill="none" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" />
          <path d="M94 52 Q136 38 148 66" fill="none" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" />
          <path d="M94 52 Q94 18 124 28" fill="none" stroke="#4ADE80" strokeWidth="10" strokeLinecap="round" />
          {/* Red Apples on Island */}
          <circle cx="88" cy="58" r="7" fill="#EF4444" />
          <circle cx="102" cy="58" r="7" fill="#EF4444" />
        </g>
      );

    case 'pizza':
      return (
        <g>
          <circle cx="100" cy="100" r="72" fill="#D97706" stroke="#78350F" strokeWidth="5" />
          <circle cx="100" cy="100" r="60" fill="#FACC15" />
          {/* Pepperoni & Basil */}
          <circle cx="76" cy="76" r="12" fill="#DC2626" />
          <circle cx="124" cy="78" r="12" fill="#DC2626" />
          <circle cx="100" cy="122" r="12" fill="#DC2626" />
          <circle cx="72" cy="116" r="10" fill="#DC2626" />
          <circle cx="128" cy="116" r="10" fill="#DC2626" />
          <ellipse cx="100" cy="92" rx="9" ry="5" fill="#16A34A" />
        </g>
      );

    case 'pancake':
      return (
        <g>
          <ellipse cx="100" cy="142" rx="68" ry="22" fill="#FDE68A" stroke="#B45309" strokeWidth="4" />
          <ellipse cx="100" cy="124" rx="64" ry="20" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="100" cy="108" rx="64" ry="20" fill="#FBBF24" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="100" cy="92" rx="64" ry="20" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          {/* Syrup & Butter */}
          <path d="M62 88 Q100 108 138 88 Q126 118 118 106 Q100 130 82 104 Z" fill="#78350F" />
          <rect x="88" y="76" width="24" height="14" rx="4" fill="#FEF08A" stroke="#CA8A04" strokeWidth="2" />
        </g>
      );

    case 'ice_cream':
      return (
        <g>
          {/* Waffle Cone */}
          <polygon points="68,108 132,108 100,180" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          {/* 3 Scoops */}
          <circle cx="78" cy="94" r="24" fill="#F472B6" stroke="#831843" strokeWidth="3" />
          <circle cx="122" cy="94" r="24" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="3" />
          <circle cx="100" cy="64" r="26" fill="#FEF08A" stroke="#854D0E" strokeWidth="3" />
          {/* Cherry on top */}
          <circle cx="100" cy="34" r="10" fill="#EF4444" />
        </g>
      );

    case 'firetruck':
      return (
        <g>
          {/* Road */}
          <rect x="16" y="156" width="168" height="12" rx="6" fill="#334155" />
          {/* White ladder on top */}
          <rect x="34" y="54" width="112" height="14" rx="4" fill="#F8FAFC" stroke="#475569" strokeWidth="3" />
          {/* Red Firetruck Body */}
          <rect x="28" y="72" width="104" height="72" rx="10" fill="#EF4444" stroke="#7F1D1D" strokeWidth="4" />
          <path d="M132 86 L166 86 L176 112 L176 144 L132 144 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth="4" />
          {/* Window & Blue Siren */}
          <polygon points="138,94 162,94 168,112 138,112" fill="#BAE6FD" />
          <rect x="142" y="72" width="16" height="12" rx="5" fill="#38BDF8" />
          {/* Wheels */}
          <circle cx="62" cy="148" r="18" fill="#1E293B" stroke="#CBD5E1" strokeWidth="5" />
          <circle cx="148" cy="148" r="18" fill="#1E293B" stroke="#CBD5E1" strokeWidth="5" />
        </g>
      );

    case 'rocket':
      return (
        <g>
          {/* Flame */}
          <polygon points="82,146 100,186 118,146" fill="#F97316" />
          <polygon points="90,146 100,172 110,146" fill="#FACC15" />
          {/* Wings */}
          <polygon points="70,112 42,148 74,142" fill="#EF4444" stroke="#7F1D1D" strokeWidth="3" />
          <polygon points="130,112 158,148 126,142" fill="#EF4444" stroke="#7F1D1D" strokeWidth="3" />
          {/* Rocket body */}
          <path d="M100 22 C132 54 134 102 128 146 L72 146 C66 102 68 54 100 22 Z" fill="#F8FAFC" stroke="#334155" strokeWidth="4" />
          <path d="M100 22 C116 38 122 54 124 64 L76 64 C78 54 84 38 100 22 Z" fill="#EF4444" />
          {/* Window */}
          <circle cx="100" cy="94" r="18" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="5" />
        </g>
      );

    case 'guitar':
      return (
        <g>
          <line x1="88" y1="30" x2="146" y2="30" stroke="#78350F" strokeWidth="1" opacity="0" />
          <rect x="92" y="24" width="16" height="86" rx="4" fill="#78350F" stroke="#451A03" strokeWidth="3" />
          <circle cx="100" cy="118" r="32" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <circle cx="100" cy="146" r="40" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <circle cx="100" cy="130" r="14" fill="#451A03" />
          <line x1="97" y1="28" x2="97" y2="162" stroke="#FEF08A" strokeWidth="2" />
          <line x1="103" y1="28" x2="103" y2="162" stroke="#FEF08A" strokeWidth="2" />
        </g>
      );

    case 'elephant':
      return (
        <g>
          {/* Big Ears */}
          <ellipse cx="52" cy="96" rx="28" ry="38" fill="#60A5FA" stroke="#1E3A8A" strokeWidth="4" />
          <ellipse cx="148" cy="96" rx="28" ry="38" fill="#60A5FA" stroke="#1E3A8A" strokeWidth="4" />
          {/* Head */}
          <circle cx="100" cy="94" r="40" fill="#93C5FD" stroke="#1E3A8A" strokeWidth="4" />
          {/* Long Trunk */}
          <path d="M90 104 Q88 158 118 162 Q132 162 130 146" fill="none" stroke="#93C5FD" strokeWidth="20" strokeLinecap="round" />
          <circle cx="84" cy="84" r="6" fill="#0F2A3A" />
          <circle cx="116" cy="84" r="6" fill="#0F2A3A" />
        </g>
      );

    case 'frog':
      return (
        <g>
          <ellipse cx="100" cy="118" rx="58" ry="42" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <circle cx="70" cy="74" r="20" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <circle cx="130" cy="74" r="20" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <circle cx="70" cy="72" r="10" fill="#FFFFFF" />
          <circle cx="130" cy="72" r="10" fill="#FFFFFF" />
          <circle cx="70" cy="72" r="5" fill="#0F2A3A" />
          <circle cx="130" cy="72" r="5" fill="#0F2A3A" />
          <path d="M64 122 Q100 148 136 122" fill="none" stroke="#14532D" strokeWidth="5" strokeLinecap="round" />
        </g>
      );

    case 'lion':
      return (
        <g>
          <circle cx="100" cy="100" r="62" fill="#B45309" stroke="#451A03" strokeWidth="5" />
          <circle cx="100" cy="100" r="44" fill="#FBBF24" stroke="#78350F" strokeWidth="4" />
          <circle cx="84" cy="90" r="6" fill="#0F2A3A" />
          <circle cx="116" cy="90" r="6" fill="#0F2A3A" />
          <polygon points="92,104 108,104 100,114" fill="#78350F" />
          <path d="M84 122 Q100 132 116 122" fill="none" stroke="#78350F" strokeWidth="4" strokeLinecap="round" />
        </g>
      );

    case 'cat':
      return (
        <g>
          <polygon points="56,78 46,32 90,62" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <polygon points="144,78 154,32 110,62" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <circle cx="100" cy="106" r="48" fill="#F9A8D4" stroke="#831843" strokeWidth="4" />
          <circle cx="82" cy="96" r="6" fill="#0F2A3A" />
          <circle cx="118" cy="96" r="6" fill="#0F2A3A" />
          <polygon points="94,110 106,110 100,118" fill="#DB2777" />
          <line x1="36" y1="108" x2="70" y2="112" stroke="#831843" strokeWidth="3" />
          <line x1="36" y1="120" x2="70" y2="118" stroke="#831843" strokeWidth="3" />
          <line x1="164" y1="108" x2="130" y2="112" stroke="#831843" strokeWidth="3" />
          <line x1="164" y1="120" x2="130" y2="118" stroke="#831843" strokeWidth="3" />
        </g>
      );

    case 'dog':
      return (
        <g>
          <ellipse cx="48" cy="106" rx="18" ry="34" fill="#92400E" stroke="#451A03" strokeWidth="4" />
          <ellipse cx="152" cy="106" rx="18" ry="34" fill="#92400E" stroke="#451A03" strokeWidth="4" />
          <circle cx="100" cy="100" r="46" fill="#FBBF24" stroke="#78350F" strokeWidth="4" />
          <circle cx="82" cy="88" r="6" fill="#0F2A3A" />
          <circle cx="118" cy="88" r="6" fill="#0F2A3A" />
          <ellipse cx="100" cy="106" rx="10" ry="7" fill="#0F2A3A" />
          <path d="M92 124 Q100 144 108 124 Z" fill="#FB7185" />
        </g>
      );

    case 'cow':
      return (
        <g>
          <circle cx="100" cy="96" r="46" fill="#FFFFFF" stroke="#1E293B" strokeWidth="4" />
          <circle cx="78" cy="76" r="14" fill="#1E293B" />
          <circle cx="122" cy="84" r="12" fill="#1E293B" />
          <ellipse cx="100" cy="122" rx="34" ry="20" fill="#F9A8D4" stroke="#831843" strokeWidth="3" />
          <circle cx="88" cy="122" r="4" fill="#831843" />
          <circle cx="112" cy="122" r="4" fill="#831843" />
        </g>
      );

    case 'owl':
      return (
        <g>
          <ellipse cx="100" cy="112" rx="48" ry="54" fill="#818CF8" stroke="#312E81" strokeWidth="4" />
          <circle cx="80" cy="88" r="18" fill="#FFFFFF" stroke="#312E81" strokeWidth="4" />
          <circle cx="120" cy="88" r="18" fill="#FFFFFF" stroke="#312E81" strokeWidth="4" />
          <circle cx="80" cy="88" r="8" fill="#0F2A3A" />
          <circle cx="120" cy="88" r="8" fill="#0F2A3A" />
          <polygon points="92,102 108,102 100,118" fill="#F59E0B" />
        </g>
      );

    case 'crown':
      return (
        <g>
          <polygon
            points="28,144 40,64 76,102 100,48 124,102 160,64 172,144"
            fill="#FFD23F"
            stroke="#B45309"
            strokeWidth="5"
          />
          <circle cx="100" cy="44" r="9" fill="#EC4899" />
          <circle cx="38" cy="60" r="8" fill="#3B82F6" />
          <circle cx="162" cy="60" r="8" fill="#22C55E" />
          <circle cx="100" cy="120" r="10" fill="#EF4444" />
        </g>
      );

    case 'trophy':
      return (
        <g>
          <path d="M56 44 L144 44 L134 110 Q100 136 66 110 Z" fill="#FFD23F" stroke="#B45309" strokeWidth="5" />
          <path d="M56 56 Q28 56 36 88 Q44 104 64 100" fill="none" stroke="#FFD23F" strokeWidth="8" />
          <path d="M144 56 Q172 56 164 88 Q156 104 136 100" fill="none" stroke="#FFD23F" strokeWidth="8" />
          <rect x="88" y="120" width="24" height="28" fill="#D97706" />
          <rect x="64" y="148" width="72" height="20" rx="6" fill="#78350F" stroke="#FFD23F" strokeWidth="3" />
          <polygon points="100,58 106,74 122,74 110,84 114,100 100,90 86,100 90,84 78,74 94,74" fill="#FFFFFF" />
        </g>
      );

    case 'soccer_ball':
      return (
        <g>
          <circle cx="100" cy="100" r="64" fill="#FFFFFF" stroke="#0F172A" strokeWidth="5" />
          <polygon points="100,76 122,92 114,118 86,118 78,92" fill="#0F172A" />
          <polygon points="100,36 118,50 100,62 82,50" fill="#0F172A" />
          <polygon points="42,84 62,78 66,98 48,110" fill="#0F172A" />
          <polygon points="158,84 138,78 134,98 152,110" fill="#0F172A" />
        </g>
      );

    case 'bicycle':
      return (
        <g>
          <circle cx="56" cy="130" r="28" fill="none" stroke="#F8FAFC" strokeWidth="7" />
          <circle cx="144" cy="130" r="28" fill="none" stroke="#F8FAFC" strokeWidth="7" />
          <polyline points="56,130 88,86 134,86 100,130 56,130" fill="none" stroke="#FFD23F" strokeWidth="7" strokeLinejoin="round" />
          <line x1="134" y1="86" x2="144" y2="130" stroke="#FFD23F" strokeWidth="7" />
          <line x1="126" y1="68" x2="146" y2="68" stroke="#EF4444" strokeWidth="7" strokeLinecap="round" />
          <line x1="76" y1="74" x2="98" y2="74" stroke="#1E293B" strokeWidth="8" strokeLinecap="round" />
        </g>
      );

    case 'lighthouse':
      return (
        <g>
          {/* Yellow light beams */}
          <polygon points="100,48 18,22 18,72" fill="#FEF08A" opacity="0.45" />
          <polygon points="100,48 182,22 182,72" fill="#FEF08A" opacity="0.45" />
          {/* Tower */}
          <polygon points="72,172 82,56 118,56 128,172" fill="#FFFFFF" stroke="#1E293B" strokeWidth="4" />
          <polygon points="78,94 122,94 125,120 75,120" fill="#EF4444" />
          <polygon points="73,144 127,144 128,170 72,170" fill="#EF4444" />
          <rect x="82" y="38" width="36" height="18" fill="#FEF08A" stroke="#1E293B" strokeWidth="3" />
          <polygon points="76,38 100,20 124,38" fill="#EF4444" stroke="#1E293B" strokeWidth="3" />
        </g>
      );

    case 'planet_saturn':
      return (
        <g>
          <circle cx="100" cy="100" r="46" fill="#F59E0B" stroke="#78350F" strokeWidth="4" />
          <ellipse
            cx="100"
            cy="100"
            rx="82"
            ry="22"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="10"
            transform="rotate(-18 100 100)"
          />
        </g>
      );

    case 'house_family':
      return (
        <g>
          <rect x="44" y="88" width="112" height="82" rx="6" fill="#FDE68A" stroke="#78350F" strokeWidth="4" />
          <polygon points="28,92 100,32 172,92" fill="#EF4444" stroke="#7F1D1D" strokeWidth="5" />
          <rect x="86" y="122" width="28" height="48" rx="4" fill="#92400E" />
          <rect x="56" y="104" width="22" height="22" rx="3" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="3" />
          <rect x="122" y="104" width="22" height="22" rx="3" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="3" />
          {/* Family Heart on Roof */}
          <circle cx="95" cy="66" r="7" fill="#FEF08A" />
          <circle cx="105" cy="66" r="7" fill="#FEF08A" />
          <polygon points="89,70 111,70 100,82" fill="#FEF08A" />
        </g>
      );

    case 'heart_family':
      return (
        <g>
          <path
            d="M100 164 C100 164 32 120 32 72 C32 48 52 34 72 34 C86 34 96 42 100 52 C104 42 114 34 128 34 C148 34 168 48 168 72 C168 120 100 164 100 164 Z"
            fill="#EC4899"
            stroke="#FFFFFF"
            strokeWidth="5"
          />
          <polygon points="100,72 107,88 124,90 111,102 115,118 100,109 85,118 89,102 76,90 93,88" fill="#FFD23F" />
        </g>
      );

    case 'gamepad':
      return (
        <g>
          <rect x="28" y="64" width="144" height="76" rx="28" fill="#1E293B" stroke="#F8FAFC" strokeWidth="4" />
          <rect x="28" y="64" width="38" height="76" rx="18" fill="#38BDF8" />
          <rect x="134" y="64" width="38" height="76" rx="18" fill="#FB7185" />
          <rect x="70" y="76" width="60" height="52" rx="6" fill="#0F172A" />
          <circle cx="47" cy="94" r="7" fill="#1E293B" />
          <circle cx="153" cy="90" r="5" fill="#1E293B" />
          <circle cx="153" cy="110" r="5" fill="#1E293B" />
        </g>
      );

    case 'toothbrush':
      return (
        <g>
          <rect x="28" y="114" width="144" height="18" rx="9" fill="#22D3EE" stroke="#0E7490" strokeWidth="4" />
          <rect x="122" y="88" width="42" height="26" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="3" />
          <path d="M124 88 Q142 66 162 84" fill="#F472B6" stroke="#BE185D" strokeWidth="3" />
        </g>
      );

    case 'clock_alarm':
      return (
        <g>
          <circle cx="56" cy="52" r="18" fill="#FFD23F" stroke="#78350F" strokeWidth="4" />
          <circle cx="144" cy="52" r="18" fill="#FFD23F" stroke="#78350F" strokeWidth="4" />
          <circle cx="100" cy="108" r="54" fill="#EF4444" stroke="#7F1D1D" strokeWidth="5" />
          <circle cx="100" cy="108" r="42" fill="#FFFFFF" />
          <line x1="100" y1="108" x2="100" y2="78" stroke="#0F172A" strokeWidth="6" strokeLinecap="round" />
          <line x1="100" y1="108" x2="124" y2="108" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
        </g>
      );

    case 'train':
      return (
        <g>
          <rect x="26" y="76" width="136" height="66" rx="14" fill="#3B82F6" stroke="#1E3A8A" strokeWidth="4" />
          <rect x="40" y="90" width="32" height="24" rx="4" fill="#BAE6FD" />
          <rect x="84" y="90" width="32" height="24" rx="4" fill="#BAE6FD" />
          <polygon points="162,92 180,142 162,142" fill="#FFD23F" />
          <circle cx="56" cy="148" r="14" fill="#1E293B" stroke="#CBD5E1" strokeWidth="4" />
          <circle cx="100" cy="148" r="14" fill="#1E293B" stroke="#CBD5E1" strokeWidth="4" />
          <circle cx="144" cy="148" r="14" fill="#1E293B" stroke="#CBD5E1" strokeWidth="4" />
        </g>
      );

    case 'piano':
      return (
        <g>
          <rect x="26" y="54" width="148" height="96" rx="10" fill="#FFFFFF" stroke="#0F172A" strokeWidth="5" />
          <line x1="56" y1="54" x2="56" y2="150" stroke="#0F172A" strokeWidth="3" />
          <line x1="86" y1="54" x2="86" y2="150" stroke="#0F172A" strokeWidth="3" />
          <line x1="114" y1="54" x2="114" y2="150" stroke="#0F172A" strokeWidth="3" />
          <line x1="144" y1="54" x2="144" y2="150" stroke="#0F172A" strokeWidth="3" />
          <rect x="46" y="54" width="18" height="56" fill="#0F172A" />
          <rect x="76" y="54" width="18" height="56" fill="#0F172A" />
          <rect x="134" y="54" width="18" height="56" fill="#0F172A" />
        </g>
      );

    case 'drums':
      return (
        <g>
          <ellipse cx="100" cy="126" rx="56" ry="38" fill="#EF4444" stroke="#7F1D1D" strokeWidth="5" />
          <ellipse cx="100" cy="96" rx="56" ry="20" fill="#FEF3C7" stroke="#78350F" strokeWidth="4" />
          <line x1="48" y1="54" x2="96" y2="94" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" />
          <line x1="152" y1="54" x2="104" y2="94" stroke="#F59E0B" strokeWidth="7" strokeLinecap="round" />
        </g>
      );

    case 'trumpet':
      return (
        <g>
          <rect x="32" y="92" width="96" height="14" rx="5" fill="#FFD23F" stroke="#B45309" strokeWidth="3" />
          <polygon points="124,92 170,62 170,136 124,106" fill="#FFD23F" stroke="#B45309" strokeWidth="4" />
          <rect x="66" y="74" width="8" height="18" fill="#FEF08A" />
          <rect x="82" y="74" width="8" height="18" fill="#FEF08A" />
          <rect x="98" y="74" width="8" height="18" fill="#FEF08A" />
        </g>
      );

    case 'magic_wand':
      return (
        <g>
          <line x1="42" y1="158" x2="126" y2="74" stroke="#F472B6" strokeWidth="12" strokeLinecap="round" />
          <polygon points="134,34 145,58 172,62 152,80 156,106 134,92 112,106 116,80 96,62 123,58" fill="#FFD23F" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="72" cy="56" r="7" fill="#38BDF8" />
          <circle cx="152" cy="134" r="6" fill="#A855F7" />
        </g>
      );

    case 'fishing_rod':
      return (
        <g>
          <path d="M36 156 Q84 68 148 38" fill="none" stroke="#B45309" strokeWidth="8" strokeLinecap="round" />
          <line x1="148" y1="38" x2="148" y2="118" stroke="#E2E8F0" strokeWidth="3" />
          {/* Fish */}
          <ellipse cx="136" cy="134" rx="28" ry="16" fill="#38BDF8" stroke="#0284C7" strokeWidth="3" />
          <polygon points="106,134 88,120 88,148" fill="#38BDF8" />
          <circle cx="150" cy="130" r="4" fill="#0F2A3A" />
        </g>
      );

    case 'nook_raccoon':
      return (
        <g>
          <circle cx="62" cy="58" r="18" fill="#92400E" />
          <circle cx="138" cy="58" r="18" fill="#92400E" />
          <circle cx="100" cy="104" r="50" fill="#B45309" stroke="#451A03" strokeWidth="4" />
          {/* Raccoon mask */}
          <ellipse cx="100" cy="96" rx="42" ry="18" fill="#451A03" />
          <circle cx="82" cy="96" r="8" fill="#FFFFFF" />
          <circle cx="118" cy="96" r="8" fill="#FFFFFF" />
          <circle cx="82" cy="96" r="4" fill="#0F2A3A" />
          <circle cx="118" cy="96" r="4" fill="#0F2A3A" />
          <circle cx="100" cy="116" r="7" fill="#0F2A3A" />
        </g>
      );

    case 'strawberry':
      return (
        <g>
          <path d="M62 66 Q100 54 138 66 Q152 118 100 168 Q48 118 62 66 Z" fill="#F43F5E" stroke="#881337" strokeWidth="4" />
          <polygon points="74,62 100,40 126,62 100,74" fill="#22C55E" />
          <circle cx="86" cy="94" r="3.5" fill="#FEF08A" />
          <circle cx="114" cy="94" r="3.5" fill="#FEF08A" />
          <circle cx="100" cy="116" r="3.5" fill="#FEF08A" />
          <circle cx="88" cy="136" r="3.5" fill="#FEF08A" />
          <circle cx="112" cy="136" r="3.5" fill="#FEF08A" />
        </g>
      );

    case 'apple':
      return (
        <g>
          <circle cx="86" cy="110" r="38" fill="#EF4444" />
          <circle cx="114" cy="110" r="38" fill="#EF4444" />
          <path d="M100 72 L106 44" stroke="#78350F" strokeWidth="7" strokeLinecap="round" />
          <ellipse cx="120" cy="54" rx="16" ry="8" fill="#22C55E" />
        </g>
      );

    case 'cake':
      return (
        <g>
          <rect x="44" y="96" width="112" height="64" rx="10" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <path d="M44 114 Q62 130 80 114 Q100 130 120 114 Q138 130 156 114" fill="none" stroke="#FEF08A" strokeWidth="6" />
          <rect x="72" y="64" width="10" height="32" fill="#38BDF8" />
          <rect x="95" y="64" width="10" height="32" fill="#FACC15" />
          <rect x="118" y="64" width="10" height="32" fill="#4ADE80" />
          <circle cx="77" cy="54" r="7" fill="#F97316" />
          <circle cx="100" cy="54" r="7" fill="#F97316" />
          <circle cx="123" cy="54" r="7" fill="#F97316" />
        </g>
      );

    case 'sun':
      return (
        <g>
          <circle cx="100" cy="100" r="46" fill="#FACC15" stroke="#EA580C" strokeWidth="5" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="100"
              y1="22"
              x2="100"
              y2="42"
              stroke="#FACC15"
              strokeWidth="8"
              strokeLinecap="round"
              transform={`rotate(${deg} 100 100)`}
            />
          ))}
        </g>
      );

    case 'moon_stars':
      return (
        <g>
          <path
            d="M116 42 A56 56 0 1 0 156 138 A44 44 0 1 1 116 42 Z"
            fill="#FFD23F"
            stroke="#FEF08A"
            strokeWidth="3"
          />
          <circle cx="144" cy="64" r="6" fill="#FEF08A" />
          <circle cx="164" cy="96" r="5" fill="#38BDF8" />
        </g>
      );

    case 'top_hat':
      return (
        <g>
          <ellipse cx="100" cy="144" rx="70" ry="16" fill="#1E293B" stroke="#FFD23F" strokeWidth="4" />
          <rect x="58" y="48" width="84" height="96" rx="8" fill="#0F172A" stroke="#475569" strokeWidth="3" />
          <rect x="58" y="118" width="84" height="18" fill="#FFD23F" />
        </g>
      );

    case 'butterfly':
      return (
        <g>
          <ellipse cx="66" cy="78" rx="34" ry="26" fill="#C084FC" stroke="#581C87" strokeWidth="4" />
          <ellipse cx="134" cy="78" rx="34" ry="26" fill="#C084FC" stroke="#581C87" strokeWidth="4" />
          <ellipse cx="72" cy="124" rx="26" ry="22" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <ellipse cx="128" cy="124" rx="26" ry="22" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <rect x="94" y="54" width="12" height="92" rx="6" fill="#1E1B4B" />
          <circle cx="64" cy="78" r="10" fill="#FFD23F" />
          <circle cx="136" cy="78" r="10" fill="#FFD23F" />
        </g>
      );

    case 'penguin':
      return (
        <g>
          <ellipse cx="100" cy="110" rx="46" ry="58" fill="#0F172A" stroke="#38BDF8" strokeWidth="3" />
          <ellipse cx="100" cy="120" rx="30" ry="40" fill="#FFFFFF" />
          <circle cx="84" cy="78" r="6" fill="#FFFFFF" />
          <circle cx="116" cy="78" r="6" fill="#FFFFFF" />
          <polygon points="90,88 110,88 100,102" fill="#F97316" />
          <ellipse cx="76" cy="166" rx="14" ry="7" fill="#F97316" />
          <ellipse cx="124" cy="166" rx="14" ry="7" fill="#F97316" />
        </g>
      );

    case 'dolphin':
    case 'shark':
      return (
        <g>
          <path
            d="M32 126 Q76 62 152 94 Q172 104 156 116 Q104 114 54 146 Z"
            fill={id === 'shark' ? '#64748B' : '#38BDF8'}
            stroke="#0C4A6E"
            strokeWidth="4"
          />
          <polygon points="92,82 108,52 118,84" fill={id === 'shark' ? '#475569' : '#0284C7'} />
          <circle cx="138" cy="98" r="5" fill="#0F2A3A" />
        </g>
      );

    case 'horse':
      return (
        <g>
          <path d="M62 165 L76 68 Q86 48 110 62 L152 86 Q162 98 148 112 L110 110 L108 165 Z" fill="#B45309" stroke="#451A03" strokeWidth="4" />
          <circle cx="112" cy="84" r="6" fill="#0F2A3A" />
          <path d="M72 68 Q52 92 58 130" stroke="#451A03" strokeWidth="12" strokeLinecap="round" fill="none" />
        </g>
      );

    case 'castle':
      return (
        <g>
          <rect x="48" y="86" width="104" height="80" fill="#F472B6" stroke="#831843" strokeWidth="4" />
          <rect x="36" y="64" width="28" height="102" fill="#EC4899" stroke="#831843" strokeWidth="4" />
          <rect x="136" y="64" width="28" height="102" fill="#EC4899" stroke="#831843" strokeWidth="4" />
          <polygon points="32,64 50,32 68,64" fill="#A855F7" />
          <polygon points="132,64 150,32 168,64" fill="#A855F7" />
          <polygon points="78,86 100,44 122,86" fill="#FFD23F" />
          <path d="M84 166 L84 128 A16 16 0 0 1 116 128 L116 166 Z" fill="#4C1D95" />
        </g>
      );

    case 'popcorn':
      return (
        <g>
          <circle cx="76" cy="68" r="18" fill="#FEF08A" />
          <circle cx="100" cy="60" r="22" fill="#FDE047" />
          <circle cx="124" cy="68" r="18" fill="#FEF08A" />
          <polygon points="54,78 146,78 134,166 66,166" fill="#EF4444" stroke="#7F1D1D" strokeWidth="4" />
          <rect x="76" y="78" width="14" height="88" fill="#FFFFFF" />
          <rect x="110" y="78" width="14" height="88" fill="#FFFFFF" />
        </g>
      );

    case 'knuckles_red':
      return (
        <g>
          <circle cx="100" cy="96" r="46" fill="#EF4444" stroke="#7F1D1D" strokeWidth="4" />
          <ellipse cx="100" cy="114" rx="30" ry="18" fill="#FDE68A" />
          <circle cx="86" cy="86" r="7" fill="#FFFFFF" />
          <circle cx="114" cy="86" r="7" fill="#FFFFFF" />
          <circle cx="86" cy="86" r="4" fill="#7C3AED" />
          <circle cx="114" cy="86" r="4" fill="#7C3AED" />
        </g>
      );

    case 'eggman_robot':
      return (
        <g>
          <circle cx="100" cy="100" r="48" fill="#FDBA74" stroke="#7C2D12" strokeWidth="4" />
          <circle cx="82" cy="84" r="14" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="3" />
          <circle cx="118" cy="84" r="14" fill="#38BDF8" stroke="#1E3A8A" strokeWidth="3" />
          <circle cx="100" cy="100" r="9" fill="#EF4444" />
          <path d="M36 116 Q100 100 164 116 Q138 136 100 120 Q62 136 36 116 Z" fill="#78350F" />
        </g>
      );

    case 'yoshi_dino':
      return (
        <g>
          <circle cx="92" cy="82" r="32" fill="#4ADE80" stroke="#14532D" strokeWidth="4" />
          <circle cx="128" cy="94" r="28" fill="#4ADE80" stroke="#14532D" strokeWidth="4" />
          <circle cx="96" cy="64" r="10" fill="#FFFFFF" />
          <circle cx="98" cy="64" r="5" fill="#0F2A3A" />
          <ellipse cx="86" cy="136" rx="34" ry="26" fill="#FFFFFF" stroke="#22C55E" strokeWidth="6" />
        </g>
      );

    case 'race_kart':
    case 'police_car':
      return (
        <g>
          <rect x="30" y="96" width="140" height="44" rx="16" fill={id === 'police_car' ? '#1E3A8A' : '#EF4444'} stroke="#FFFFFF" strokeWidth="4" />
          <path d="M62 96 L80 68 L124 68 L142 96 Z" fill="#38BDF8" />
          <circle cx="62" cy="142" r="18" fill="#0F172A" stroke="#CBD5E1" strokeWidth="5" />
          <circle cx="138" cy="142" r="18" fill="#0F172A" stroke="#CBD5E1" strokeWidth="5" />
          <rect x="92" y="56" width="16" height="12" rx="4" fill="#FFD23F" />
        </g>
      );

    case 'swimming':
      return (
        <g>
          <rect x="24" y="106" width="152" height="58" rx="14" fill="#0284C7" />
          <ellipse cx="72" cy="76" rx="24" ry="16" fill="#38BDF8" stroke="#FFD23F" strokeWidth="5" />
          <ellipse cx="128" cy="76" rx="24" ry="16" fill="#38BDF8" stroke="#FFD23F" strokeWidth="5" />
          <line x1="96" y1="76" x2="104" y2="76" stroke="#FFD23F" strokeWidth="6" />
        </g>
      );

    case 'airplane':
      return (
        <g>
          <ellipse cx="100" cy="100" rx="68" ry="18" fill="#F8FAFC" stroke="#0284C7" strokeWidth="4" />
          <polygon points="84,84 106,36 122,84" fill="#38BDF8" />
          <polygon points="84,116 106,164 122,116" fill="#38BDF8" />
        </g>
      );

    case 'mountain':
      return (
        <g>
          <polygon points="22,168 82,56 142,168" fill="#64748B" stroke="#1E293B" strokeWidth="4" />
          <polygon points="78,168 128,44 178,168" fill="#475569" stroke="#0F172A" strokeWidth="4" />
          {/* Snow caps */}
          <polygon points="82,56 64,90 76,84 86,94 98,86" fill="#F8FAFC" />
          <polygon points="128,44 110,82 122,76 132,88 146,80" fill="#FFFFFF" />
        </g>
      );

    case 'lemon':
      return (
        <g>
          <ellipse cx="100" cy="104" rx="62" ry="44" fill="#FDE047" stroke="#A16207" strokeWidth="5" />
          <circle cx="38" cy="104" r="10" fill="#FDE047" stroke="#A16207" strokeWidth="4" />
          <circle cx="162" cy="104" r="10" fill="#FDE047" stroke="#A16207" strokeWidth="4" />
          <ellipse cx="116" cy="56" rx="22" ry="10" fill="#22C55E" transform="rotate(-20 116 56)" />
          <circle cx="80" cy="96" r="3" fill="#CA8A04" />
          <circle cx="105" cy="112" r="3" fill="#CA8A04" />
          <circle cx="122" cy="94" r="3" fill="#CA8A04" />
        </g>
      );

    case 'carrot':
      return (
        <g>
          {/* Green leafy top */}
          <path d="M100 58 Q80 26 66 36 M100 58 Q100 20 100 26 M100 58 Q120 26 134 36" fill="none" stroke="#22C55E" strokeWidth="10" strokeLinecap="round" />
          {/* Orange carrot body */}
          <polygon points="72,60 128,60 100,174" fill="#F97316" stroke="#9A3412" strokeWidth="4" strokeLinejoin="round" />
          <line x1="84" y1="86" x2="108" y2="86" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
          <line x1="90" y1="112" x2="112" y2="112" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
          <line x1="94" y1="138" x2="106" y2="138" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
        </g>
      );

    case 'hot_air_balloon':
      return (
        <g>
          {/* Colorful balloon */}
          <path d="M52 84 C52 34 148 34 148 84 C148 112 122 132 114 140 L86 140 C78 132 52 112 52 84 Z" fill="#EC4899" stroke="#831843" strokeWidth="4" />
          <path d="M80 42 C72 80 82 118 92 140 L108 140 C118 118 128 80 120 42 Z" fill="#FFD23F" />
          {/* Ropes & Basket */}
          <line x1="88" y1="140" x2="88" y2="156" stroke="#E2E8F0" strokeWidth="3" />
          <line x1="112" y1="140" x2="112" y2="156" stroke="#E2E8F0" strokeWidth="3" />
          <rect x="82" y="156" width="36" height="22" rx="4" fill="#92400E" stroke="#451A03" strokeWidth="3" />
        </g>
      );

    case 'ankylosaurus':
    case 'spinosaurus':
    case 'velociraptor':
      return (
        <g>
          <ellipse cx="100" cy="172" rx="80" ry="14" fill="#14532D" />
          {/* Sail or armor back */}
          <path
            d="M48 128 Q100 44 152 128 Z"
            fill={id === 'spinosaurus' ? '#F97316' : '#84CC16'}
            stroke="#14532D"
            strokeWidth="4"
          />
          <ellipse cx="100" cy="132" rx="52" ry="26" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <circle cx="44" cy="120" r="18" fill="#4ADE80" stroke="#14532D" strokeWidth="4" />
          <circle cx="38" cy="116" r="4" fill="#0F2A3A" />
          {/* Tail club for ankylosaurus */}
          <circle cx="168" cy="128" r="14" fill="#FFD23F" stroke="#78350F" strokeWidth="3" />
        </g>
      );

    case 'pteranodon':
      return (
        <g>
          <polygon points="18,86 92,102 64,132" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="4" />
          <polygon points="182,86 108,102 136,132" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="4" />
          <ellipse cx="100" cy="108" rx="18" ry="28" fill="#0284C7" />
          <polygon points="100,40 86,86 134,74" fill="#FFD23F" stroke="#78350F" strokeWidth="3" />
          <circle cx="104" cy="74" r="4" fill="#0F2A3A" />
        </g>
      );

    case 'dino_egg':
      return (
        <g>
          <path d="M100 32 C138 32 154 92 154 132 C154 164 130 176 100 176 C70 176 46 164 46 132 C46 92 62 32 100 32 Z" fill="#FEF3C7" stroke="#78350F" strokeWidth="5" />
          <circle cx="82" cy="86" r="12" fill="#22C55E" />
          <circle cx="122" cy="112" r="15" fill="#10B981" />
          <circle cx="86" cy="142" r="10" fill="#34D399" />
          <circle cx="114" cy="68" r="8" fill="#22C55E" />
        </g>
      );

    case 'fossil':
      return (
        <g>
          <rect x="34" y="44" width="132" height="112" rx="22" fill="#B45309" stroke="#451A03" strokeWidth="4" />
          <line x1="60" y1="100" x2="140" y2="100" stroke="#FEF3C7" strokeWidth="14" strokeLinecap="round" />
          <circle cx="56" cy="90" r="12" fill="#FEF3C7" />
          <circle cx="56" cy="110" r="12" fill="#FEF3C7" />
          <circle cx="144" cy="90" r="12" fill="#FEF3C7" />
          <circle cx="144" cy="110" r="12" fill="#FEF3C7" />
        </g>
      );

    case 'giraffe':
    case 'camel':
      return (
        <g>
          <rect x="86" y="48" width="24" height="112" rx="10" fill="#FACC15" stroke="#78350F" strokeWidth="4" />
          <ellipse cx="108" cy="48" rx="24" ry="16" fill="#FDE047" stroke="#78350F" strokeWidth="4" />
          <circle cx="116" cy="44" r="4" fill="#0F2A3A" />
          <circle cx="96" cy="82" r="7" fill="#92400E" />
          <circle cx="100" cy="112" r="8" fill="#92400E" />
          <circle cx="94" cy="140" r="7" fill="#92400E" />
        </g>
      );

    case 'zebra':
      return (
        <g>
          <circle cx="100" cy="100" r="48" fill="#F8FAFC" stroke="#0F172A" strokeWidth="4" />
          <path d="M64 76 L96 92 M60 98 L92 108 M136 76 L108 92 M140 98 L108 108" stroke="#0F172A" strokeWidth="8" strokeLinecap="round" />
          <ellipse cx="100" cy="126" rx="26" ry="16" fill="#1E293B" />
          <circle cx="82" cy="84" r="5" fill="#0F2A3A" />
          <circle cx="118" cy="84" r="5" fill="#0F2A3A" />
        </g>
      );

    case 'monkey':
    case 'bear':
    case 'koala':
    case 'panda':
    case 'kangaroo':
    case 'hedgehog':
    case 'squirrel':
      return (
        <g>
          <circle cx="56" cy="68" r="20" fill={id === 'panda' ? '#0F172A' : id === 'koala' ? '#94A3B8' : '#92400E'} />
          <circle cx="144" cy="68" r="20" fill={id === 'panda' ? '#0F172A' : id === 'koala' ? '#94A3B8' : '#92400E'} />
          <circle cx="100" cy="104" r="48" fill={id === 'panda' ? '#FFFFFF' : id === 'koala' ? '#CBD5E1' : '#B45309'} stroke="#451A03" strokeWidth="4" />
          <ellipse cx="100" cy="118" rx="28" ry="18" fill="#FDE68A" />
          <circle cx="82" cy="92" r="7" fill="#0F2A3A" />
          <circle cx="118" cy="92" r="7" fill="#0F2A3A" />
          <ellipse cx="100" cy="112" rx="9" ry="6" fill="#0F2A3A" />
        </g>
      );

    case 'turtle':
      return (
        <g>
          <ellipse cx="100" cy="108" rx="54" ry="40" fill="#15803D" stroke="#052E16" strokeWidth="5" />
          <circle cx="162" cy="104" r="18" fill="#4ADE80" stroke="#14532D" strokeWidth="4" />
          <circle cx="168" cy="100" r="4" fill="#0F2A3A" />
          <ellipse cx="64" cy="148" rx="12" ry="8" fill="#4ADE80" />
          <ellipse cx="136" cy="148" rx="12" ry="8" fill="#4ADE80" />
        </g>
      );

    case 'octopus':
      return (
        <g>
          <circle cx="100" cy="82" r="42" fill="#E879F9" stroke="#701A75" strokeWidth="4" />
          <path d="M62 114 Q42 156 64 164 M84 120 Q76 166 92 168 M116 120 Q124 166 108 168 M138 114 Q158 156 136 164" fill="none" stroke="#E879F9" strokeWidth="12" strokeLinecap="round" />
          <circle cx="86" cy="78" r="6" fill="#0F2A3A" />
          <circle cx="114" cy="78" r="6" fill="#0F2A3A" />
        </g>
      );

    case 'whale':
      return (
        <g>
          <path d="M28 126 C28 70 118 64 148 104 L176 86 L168 126 Z" fill="#38BDF8" stroke="#0C4A6E" strokeWidth="4" />
          <path d="M76 68 Q64 36 48 44 M76 68 Q88 36 104 44" fill="none" stroke="#BAE6FD" strokeWidth="6" strokeLinecap="round" />
          <circle cx="62" cy="104" r="5" fill="#0F2A3A" />
        </g>
      );

    case 'bee':
    case 'ladybug':
      return (
        <g>
          <ellipse cx="82" cy="64" rx="22" ry="14" fill="#E0F2FE" />
          <ellipse cx="118" cy="64" rx="22" ry="14" fill="#E0F2FE" />
          <ellipse cx="100" cy="108" rx="52" ry="38" fill={id === 'bee' ? '#FACC15' : '#EF4444'} stroke="#0F172A" strokeWidth="5" />
          <line x1="84" y1="72" x2="84" y2="144" stroke="#0F172A" strokeWidth="10" />
          <line x1="116" y1="72" x2="116" y2="144" stroke="#0F172A" strokeWidth="10" />
          <circle cx="64" cy="102" r="5" fill="#0F2A3A" />
        </g>
      );

    case 'flamingo':
    case 'peacock':
    case 'chicken':
    case 'duck':
      return (
        <g>
          <ellipse cx="100" cy="122" rx="44" ry="32" fill={id === 'flamingo' ? '#F472B6' : id === 'peacock' ? '#06B6D4' : '#FACC15'} stroke="#0F172A" strokeWidth="4" />
          <circle cx="132" cy="76" r="22" fill={id === 'flamingo' ? '#F472B6' : id === 'peacock' ? '#06B6D4' : '#FDE047'} stroke="#0F172A" strokeWidth="4" />
          <polygon points="152,72 176,80 152,88" fill="#F97316" />
          <circle cx="138" cy="72" r="4" fill="#0F2A3A" />
        </g>
      );

    case 'rabbit':
    case 'pig':
    case 'sheep':
      return (
        <g>
          {id === 'rabbit' && (
            <>
              <ellipse cx="80" cy="48" rx="12" ry="32" fill="#F9A8D4" stroke="#831843" strokeWidth="4" />
              <ellipse cx="120" cy="48" rx="12" ry="32" fill="#F9A8D4" stroke="#831843" strokeWidth="4" />
            </>
          )}
          <circle cx="100" cy="112" r="46" fill={id === 'sheep' ? '#F8FAFC' : '#F472B6'} stroke="#831843" strokeWidth="4" />
          <circle cx="84" cy="102" r="6" fill="#0F2A3A" />
          <circle cx="116" cy="102" r="6" fill="#0F2A3A" />
          <ellipse cx="100" cy="122" rx="16" ry="11" fill="#FB7185" />
        </g>
      );

    case 'shadow_hedgehog':
    case 'amy_pink':
      return (
        <g>
          <circle cx="100" cy="100" r="74" fill="none" stroke="#FFD23F" strokeWidth="4" strokeDasharray="10 6" />
          <circle cx="104" cy="100" r="44" fill={id === 'shadow_hedgehog' ? '#18181B' : '#F472B6'} stroke="#EF4444" strokeWidth="5" />
          <ellipse cx="114" cy="116" rx="26" ry="16" fill="#FDE68A" />
          <circle cx="114" cy="90" r="7" fill="#EF4444" />
        </g>
      );

    case 'chaos_emerald':
      return (
        <g>
          <polygon points="64,54 136,54 168,92 100,166 32,92" fill="#22C55E" stroke="#A7F3D0" strokeWidth="5" />
          <polyline points="32,92 168,92 M64,54 100,92 136,54 M100,92 100,166" fill="none" stroke="#A7F3D0" strokeWidth="3" />
        </g>
      );

    case 'treasure_chest':
      return (
        <g>
          <rect x="36" y="76" width="128" height="84" rx="12" fill="#B45309" stroke="#FFD23F" strokeWidth="6" />
          <line x1="36" y1="112" x2="164" y2="112" stroke="#FFD23F" strokeWidth="6" />
          <rect x="88" y="98" width="24" height="28" rx="4" fill="#FFD23F" />
        </g>
      );

    case 'pirate_ship':
    case 'sailboat':
    case 'steamboat':
    case 'submarine':
      return (
        <g>
          <path d="M28 124 L172 124 L148 164 L52 164 Z" fill={id === 'submarine' ? '#FACC15' : '#92400E'} stroke="#0F172A" strokeWidth="4" />
          <line x1="100" y1="36" x2="100" y2="124" stroke="#F8FAFC" strokeWidth="6" />
          <polygon points="100,40 156,82 100,110" fill={id === 'steamboat' ? '#EF4444' : '#F8FAFC'} />
        </g>
      );

    case 'helicopter':
    case 'tractor':
    case 'motorcycle':
    case 'ambulance':
    case 'excavator':
      return (
        <g>
          <rect x="42" y="82" width="116" height="58" rx="16" fill={id === 'tractor' ? '#22C55E' : id === 'excavator' ? '#FACC15' : '#38BDF8'} stroke="#0F172A" strokeWidth="4" />
          <line x1="28" y1="62" x2="172" y2="62" stroke="#FFD23F" strokeWidth="6" strokeLinecap="round" />
          <circle cx="64" cy="146" r="18" fill="#0F172A" stroke="#E2E8F0" strokeWidth="5" />
          <circle cx="136" cy="146" r="18" fill="#0F172A" stroke="#E2E8F0" strokeWidth="5" />
        </g>
      );

    case 'snowman':
      return (
        <g>
          <circle cx="100" cy="134" r="38" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="4" />
          <circle cx="100" cy="76" r="28" fill="#FFFFFF" stroke="#BAE6FD" strokeWidth="4" />
          <polygon points="100,76 132,82 100,86" fill="#F97316" />
          <circle cx="90" cy="68" r="4" fill="#0F2A3A" />
          <circle cx="110" cy="68" r="4" fill="#0F2A3A" />
          <rect x="78" y="34" width="44" height="20" fill="#1E293B" />
        </g>
      );

    case 'christmas_tree':
      return (
        <g>
          <rect x="86" y="146" width="28" height="28" fill="#78350F" />
          <polygon points="100,26 42,96 158,96" fill="#22C55E" stroke="#14532D" strokeWidth="4" />
          <polygon points="100,64 32,148 168,148" fill="#16A34A" stroke="#14532D" strokeWidth="4" />
          <circle cx="100" cy="26" r="10" fill="#FFD23F" />
          <circle cx="82" cy="112" r="7" fill="#EF4444" />
          <circle cx="122" cy="124" r="7" fill="#FFD23F" />
        </g>
      );

    case 'gift_box':
    case 'pepernoten':
      return (
        <g>
          <rect x="46" y="68" width="108" height="96" rx="10" fill="#EF4444" stroke="#7F1D1D" strokeWidth="4" />
          <rect x="88" y="68" width="24" height="96" fill="#FFD23F" />
          <rect x="46" y="104" width="108" height="22" fill="#FFD23F" />
          <circle cx="88" cy="56" r="14" fill="none" stroke="#FFD23F" strokeWidth="7" />
          <circle cx="112" cy="56" r="14" fill="none" stroke="#FFD23F" strokeWidth="7" />
        </g>
      );

    case 'tent_camp':
      return (
        <g>
          <polygon points="100,40 28,160 172,160" fill="#F97316" stroke="#7C2D12" strokeWidth="5" />
          <polygon points="100,92 74,160 126,160" fill="#451A03" />
        </g>
      );

    case 'sunglasses':
      return (
        <g>
          <rect x="28" y="82" width="62" height="44" rx="14" fill="#0F172A" stroke="#FFD23F" strokeWidth="5" />
          <rect x="110" y="82" width="62" height="44" rx="14" fill="#0F172A" stroke="#FFD23F" strokeWidth="5" />
          <line x1="90" y1="96" x2="110" y2="96" stroke="#FFD23F" strokeWidth="6" />
        </g>
      );

    case 'watermelon':
    case 'fries':
    case 'cheese':
      return (
        <g>
          <path d="M32 86 A68 68 0 0 0 168 86 Z" fill={id === 'cheese' ? '#FACC15' : '#F43F5E'} stroke="#16A34A" strokeWidth="10" />
          <circle cx="80" cy="110" r="4" fill="#0F2A3A" />
          <circle cx="100" cy="122" r="4" fill="#0F2A3A" />
          <circle cx="120" cy="110" r="4" fill="#0F2A3A" />
        </g>
      );

    default:
      return (
        <g>
          <polygon
            points="100,26 120,72 170,76 132,110 144,160 100,134 56,160 68,110 30,76 80,72"
            fill="#FFD23F"
            stroke="#FFFFFF"
            strokeWidth="4"
          />
        </g>
      );
  }
}

export interface IllustrationViewProps {
  illustrationId?: string;
  imageUrl?: string;
  alt?: string;
  className?: string;
}

const STUDIO_ART_MAP: Record<string, string> = {
  trex: '/art/avatar-trex.jpg',
  unicorn: '/art/avatar-unicorn.jpg',
  showmaster: '/art/avatar-showmaster.jpg',
  crown: '/art/avatar-crown.jpg',
  sonic_hedgehog: '/art/avatar-sonic.jpg',
  jungle_ape: '/art/avatar-ape.jpg',
  trophy: '/art/show-trophy.jpg',
  bicycle: '/art/ill-bicycle.jpg',
  clock_alarm: '/art/ill-clock-alarm.jpg',
  owl: '/art/ill-owl.jpg',
  soccer_ball: '/art/ill-soccer-ball.jpg',
  firetruck: '/art/ill-firetruck.jpg',
  toothbrush: '/art/ill-toothbrush.jpg',
  rocket: '/art/ill-rocket.jpg',
  island: '/art/ill-island.jpg',
  frog: '/art/ill-frog.jpg',
  pancake: '/art/ill-pancake.jpg',
  cake: '/art/ill-cake.jpg',
  penguin: '/art/ill-penguin.jpg',
};

export const IllustrationView: React.FC<IllustrationViewProps> = ({
  illustrationId,
  imageUrl,
  alt,
  className = 'w-full h-full',
}) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={alt || 'Spelafbeelding'}
        className={`object-cover rounded-xl ${className}`}
      />
    );
  }

  const key = illustrationId || 'star';
  const meta = META_MAP[key] || {
    id: key,
    label: alt || key,
    bg1: '#1E1B4B',
    bg2: '#6366F1',
  };

  if (STUDIO_ART_MAP[key]) {
    return (
      <img
        src={STUDIO_ART_MAP[key]}
        alt={alt || meta.label}
        loading="lazy"
        className={`object-cover select-none ${className}`}
      />
    );
  }
  const gradId = `grad_${meta.id}`;

  return (
    <svg
      viewBox="0 0 200 200"
      className={`select-none ${className}`}
      role="img"
      aria-label={alt || meta.label}
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={meta.bg2} stopOpacity="0.48" />
          <stop offset="100%" stopColor={meta.bg1} stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="192"
        height="192"
        rx="28"
        fill={`url(#${gradId})`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
      />
      {/* Subtle decorative stars in corners for Zoom-in detail */}
      <circle cx="26" cy="28" r="2.5" fill="rgba(255,255,255,0.35)" />
      <circle cx="174" cy="30" r="3" fill="rgba(255, 210, 63,0.4)" />
      <circle cx="28" cy="172" r="2.5" fill="rgba(255, 210, 63,0.35)" />
      <circle cx="172" cy="170" r="2.5" fill="rgba(255,255,255,0.35)" />
      {renderArtwork(key)}
    </svg>
  );
};
