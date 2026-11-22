import { SfxCue } from '@huiskamer-show/shared';

export const SOUND_PRESET_LIST = [
  { key: 'trex_roar', label: '🦖 T-Rex Dino Gebrul' },
  { key: 'frog_croak', label: '🐸 Kikker (Kwaak-kwaak)' },
  { key: 'elephant_trumpet', label: '🐘 Olifant Trompet' },
  { key: 'owl_hoot', label: '🦉 Uil (Oehoe in het bos)' },
  { key: 'cow_moo', label: '🐄 Boerderijkoe (Boeoe)' },
  { key: 'dog_bark', label: '🐶 Blije Hond (Woef-woef)' },
  { key: 'cat_meow', label: '🐱 Lieve Kat (Miauw)' },
  { key: 'sonic_ring', label: '💍 Sonic Gouden Ring' },
  { key: 'mario_powerup', label: '🍄 Mario Power-Paddenstoel' },
  { key: 'dk_barrel', label: '🛢️ Donkey Kong Rollende Ton' },
  { key: 'water_splash', label: '🎣 Animal Crossing Vis-Plons' },
  { key: 'piano_melody', label: '🎹 Piano Melodie' },
  { key: 'guitar_strum', label: '🎸 Gitaar Akkoord' },
  { key: 'drum_beat', label: '🥁 Drumstel Solo' },
  { key: 'trumpet_call', label: '🎺 Gouden Trompet Fanfare' },
  { key: 'magic_sparkle', label: '✨ Eenhoorn & Honmoon Magie' },
  { key: 'firetruck_siren', label: '🚒 Brandweerauto Sirene' },
  { key: 'train_horn', label: '🚂 Trein Toeter & Rails' },
  { key: 'rocket_launch', label: '🚀 Ruimteraket Lancering' },
  { key: 'bicycle_bell', label: '🚲 Fietsbel (Tring-tring)' },
  { key: 'referee_whistle', label: '⚽ Scheidsrechtersfluitje' },
  { key: 'alarm_clock', label: '⏰ Rinkelende Wekker' },
  { key: 'lion_roar', label: '🦁 Leeuwenbrul' },
  { key: 'monkey_chatter', label: '🐒 Aapje (Oeh-oeh-aah-aah)' },
  { key: 'bee_buzz', label: '🐝 Zoemende Honingbij' },
  { key: 'duck_quack', label: '🦆 Eend (Kwak-kwak)' },
  { key: 'sheep_baa', label: '🐑 Schaap (Bèèèh)' },
  { key: 'pig_oink', label: '🐷 Varken (Knor-knor)' },
  { key: 'chicken_cluck', label: '🐔 Kip (Tok-tok-tok)' },
  { key: 'horse_neigh', label: '🐴 Hinnikend Paard' },
  { key: 'dolphin_clicks', label: '🐬 Dolfijn Klikjes & Fluit' },
  { key: 'whale_song', label: '🐋 Walvisgezang onder water' },
  { key: 'helicopter_chop', label: '🚁 Helikopter Wieken' },
  { key: 'police_siren', label: '🚓 Politieauto Sirene' },
  { key: 'ambulance_siren', label: '🚑 Ambulance Tweesoort-Sirene' },
  { key: 'steamboat_horn', label: '🚢 Stoomboot van Sinterklaas' },
  { key: 'racecar_zoom', label: '🏎️ Raceauto / Kart Vroemmm!' },
  { key: 'submarine_sonar', label: '⚓ Duikboot Sonar (Ping... Ping...)' },
  { key: 'kpop_synth_beat', label: '🎤 HUNTR/X K-Pop Dance Beat' },
  { key: 'unicorn_harp', label: '🦄 Magische Eenhoorn Harp' },
  { key: 'chaos_emerald_hum', label: '💎 Chaos Emerald Energie' },
  { key: 'mario_coin', label: '🪙 Super Mario Muntje' },
  { key: 'sinterklaas_knock', label: '🎁 Piet klopt op de deur!' },
  { key: 'sleigh_bells', label: '🎄 Kerstbelletjes & Arrenslee' },
  { key: 'birthday_horn', label: '🎂 Verjaardag Feesttoeter' },
  { key: 'thunder_storm', label: '⛈️ Onweer & Donderslag' },
];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private activeAudioEl: HTMLAudioElement | null = null;

  public async unlock(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      this.playIntroJingle();
    } catch (err) {
      console.warn('Audio unlock warning:', err);
    }
  }

  public setMuted(m: boolean): void {
    this.muted = m;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(
    freq: number,
    durationSec: number,
    delaySec = 0,
    type: OscillatorType = 'sine',
    gainVal = 0.22,
    endFreq?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFreq),
        now + durationSec
      );
    }
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(gainVal, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  private noise(durationSec: number, delaySec = 0, gainVal = 0.18, filterFreq = 800): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delaySec;
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
  }

  public playIntroJingle(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.25, idx * 0.11, 'triangle', 0.2);
    });
  }

  public playCue(cue: SfxCue, key?: string): void {
    if (this.muted) return;
    switch (cue) {
      case 'wheel_tick':
        for (let i = 0; i < 14; i++) {
          this.tone(420 + (i % 3) * 80, 0.05, i * (0.14 + i * 0.012), 'triangle', 0.16);
        }
        break;
      case 'wheel_land':
        this.tone(587.33, 0.16, 0, 'triangle', 0.24);
        this.tone(880, 0.35, 0.15, 'triangle', 0.26);
        break;
      case 'correct':
      case 'star_earned':
        this.tone(523.25, 0.15, 0, 'triangle', 0.25);
        this.tone(659.25, 0.15, 0.12, 'triangle', 0.25);
        this.tone(783.99, 0.18, 0.24, 'triangle', 0.25);
        this.tone(1046.5, 0.4, 0.36, 'triangle', 0.28);
        break;
      case 'wrong':
        this.tone(240, 0.28, 0, 'sawtooth', 0.2, 190);
        this.tone(180, 0.45, 0.26, 'sawtooth', 0.22, 130);
        break;
      case 'buzzer':
        this.tone(160, 0.45, 0, 'sawtooth', 0.32);
        this.tone(320, 0.45, 0, 'square', 0.22);
        break;
      case 'tick_urgent':
        this.tone(880, 0.08, 0, 'sine', 0.2);
        break;
      case 'thirty_sec_urgent':
        // Exciting upbeat bass + high synth pulse for last 10 seconds of 30 Seconds!
        this.tone(196, 0.14, 0, 'triangle', 0.26);
        this.tone(392, 0.1, 0.22, 'triangle', 0.18);
        this.noise(0.06, 0.45, 0.14, 2400);
        this.tone(523.25, 0.1, 0.65, 'sine', 0.18);
        break;
      case 'drumroll':
        // Dramatic drumroll building up into the grand Finale fanfare!
        for (let i = 0; i < 18; i++) {
          this.noise(0.055, i * 0.08, 0.08 + i * 0.01, 1400 + i * 60);
        }
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((freq, i) => {
          const delays = [1.55, 1.71, 1.87, 2.03, 2.27, 2.45];
          const durs = [0.14, 0.14, 0.14, 0.22, 0.16, 0.65];
          this.tone(freq, durs[i], delays[i], 'triangle', 0.28);
        });
        break;
      case 'join_sparkle':
        this.tone(659.25, 0.12, 0, 'sine', 0.18);
        this.tone(987.77, 0.22, 0.1, 'sine', 0.2);
        break;
      case 'bonus_ding':
        [587.33, 880, 1174.66, 1760].forEach((f, i) => {
          this.tone(f, 0.22, i * 0.09, 'triangle', 0.26);
        });
        break;
      case 'test_jingle':
        this.playIntroJingle();
        this.tone(1318.5, 0.35, 0.45, 'triangle', 0.25);
        break;
      case 'applause':
        this.noise(1.2, 0, 0.15, 1600);
        this.tone(523.25, 0.2, 0.1, 'triangle', 0.2);
        this.tone(783.99, 0.4, 0.3, 'triangle', 0.24);
        break;
      case 'fanfare':
        [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((freq, i) => {
          const delays = [0, 0.16, 0.32, 0.48, 0.72, 0.9];
          const durs = [0.14, 0.14, 0.14, 0.22, 0.16, 0.6];
          this.tone(freq, durs[i], delays[i], 'triangle', 0.26);
        });
        break;
      case 'sound_challenge':
        if (key) this.playSoundChallenge(key);
        break;
    }
  }

  public playSoundChallenge(soundKey: string): void {
    if (this.muted) return;

    // Support uploaded custom audio files (/uploads/audio/...)
    if (soundKey.startsWith('/uploads/') || soundKey.startsWith('http')) {
      if (this.activeAudioEl) {
        try {
          this.activeAudioEl.pause();
          this.activeAudioEl.currentTime = 0;
        } catch {
          // ignore
        }
      }
      const audio = new Audio(soundKey);
      this.activeAudioEl = audio;
      audio.play().catch((e) => console.warn('Audio file playback warning:', e));
      return;
    }

    switch (soundKey) {
      case 'trex_roar':
        this.noise(1.3, 0, 0.3, 350);
        this.tone(110, 1.2, 0, 'sawtooth', 0.28, 55);
        this.tone(95, 1.0, 0.2, 'sawtooth', 0.25, 48);
        break;
      case 'frog_croak':
        this.tone(180, 0.18, 0, 'sawtooth', 0.24, 340);
        this.tone(180, 0.18, 0.32, 'sawtooth', 0.24, 340);
        this.tone(190, 0.22, 0.7, 'sawtooth', 0.24, 360);
        break;
      case 'elephant_trumpet':
        this.tone(360, 0.3, 0, 'sawtooth', 0.25, 740);
        this.tone(740, 0.6, 0.28, 'sawtooth', 0.26, 520);
        break;
      case 'owl_hoot':
        this.tone(392, 0.28, 0, 'sine', 0.26, 370);
        this.tone(392, 0.55, 0.42, 'sine', 0.28, 330);
        break;
      case 'cow_moo':
        this.tone(155, 1.1, 0, 'sawtooth', 0.24, 125);
        break;
      case 'dog_bark':
        this.tone(320, 0.14, 0, 'triangle', 0.28, 180);
        this.noise(0.12, 0, 0.18, 900);
        this.tone(340, 0.16, 0.28, 'triangle', 0.28, 180);
        this.noise(0.12, 0.28, 0.18, 900);
        break;
      case 'cat_meow':
        this.tone(520, 0.3, 0, 'triangle', 0.22, 780);
        this.tone(780, 0.45, 0.28, 'triangle', 0.22, 440);
        break;
      case 'sonic_ring':
        this.tone(987.77, 0.12, 0, 'sine', 0.24);
        this.tone(1318.5, 0.45, 0.1, 'sine', 0.26);
        this.tone(1975.5, 0.35, 0.15, 'sine', 0.15);
        break;
      case 'mario_powerup':
        [330, 392, 659, 523, 587, 784].forEach((f, idx) => {
          this.tone(f, 0.1, idx * 0.085, 'square', 0.18);
        });
        break;
      case 'dk_barrel':
        for (let i = 0; i < 6; i++) {
          this.tone(140 - i * 8, 0.12, i * 0.15, 'triangle', 0.28, 80);
        }
        break;
      case 'water_splash':
        this.tone(600, 0.12, 0, 'sine', 0.22, 240);
        this.noise(0.55, 0.12, 0.24, 1200);
        this.tone(380, 0.15, 0.5, 'sine', 0.2, 620);
        break;
      case 'piano_melody':
        [523.25, 587.33, 659.25, 783.99, 659.25, 523.25].forEach((f, i) => {
          this.tone(f, 0.22, i * 0.18, 'triangle', 0.24);
        });
        break;
      case 'guitar_strum':
        [196, 246.94, 293.66, 392, 493.88, 587.33].forEach((f, i) => {
          this.tone(f, 0.65, i * 0.045, 'sawtooth', 0.14);
        });
        break;
      case 'drum_beat':
        [0, 0.25, 0.5, 0.75].forEach((t, i) => {
          if (i % 2 === 0) {
            this.tone(110, 0.14, t, 'sine', 0.35, 45);
          } else {
            this.noise(0.14, t, 0.25, 2200);
          }
        });
        break;
      case 'trumpet_call':
        [523.25, 523.25, 523.25, 659.25, 783.99].forEach((f, i) => {
          const delays = [0, 0.14, 0.28, 0.42, 0.64];
          const durs = [0.11, 0.11, 0.11, 0.18, 0.45];
          this.tone(f, durs[i], delays[i], 'sawtooth', 0.22);
        });
        break;
      case 'magic_sparkle':
        [880, 1046.5, 1174.66, 1318.5, 1567.98, 1760, 2093].forEach((f, i) => {
          this.tone(f, 0.18, i * 0.07, 'sine', 0.18);
        });
        break;
      case 'firetruck_siren':
        [0, 0.45, 0.9].forEach((t) => {
          this.tone(660, 0.21, t, 'triangle', 0.24);
          this.tone(880, 0.21, t + 0.22, 'triangle', 0.24);
        });
        break;
      case 'train_horn':
        this.tone(293.66, 0.45, 0, 'sawtooth', 0.2);
        this.tone(349.23, 0.45, 0, 'sawtooth', 0.2);
        this.tone(293.66, 0.6, 0.55, 'sawtooth', 0.22);
        this.tone(349.23, 0.6, 0.55, 'sawtooth', 0.22);
        break;
      case 'rocket_launch':
        this.noise(1.4, 0, 0.3, 650);
        this.tone(90, 1.3, 0, 'sawtooth', 0.22, 420);
        break;
      case 'bicycle_bell':
        for (let i = 0; i < 6; i++) {
          this.tone(1567.98, 0.09, i * 0.07, 'sine', 0.22);
        }
        break;
      case 'referee_whistle':
        for (let i = 0; i < 8; i++) {
          this.tone(2600 + (i % 2) * 180, 0.07, i * 0.055, 'sine', 0.22);
        }
        break;
      case 'alarm_clock':
        for (let i = 0; i < 8; i++) {
          this.tone(1200 + (i % 2) * 300, 0.08, i * 0.08, 'square', 0.18);
        }
        break;
      case 'lion_roar':
        this.noise(1.1, 0, 0.28, 300);
        this.tone(130, 1.0, 0, 'sawtooth', 0.26, 65);
        break;
      case 'monkey_chatter':
        [420, 520, 460, 640, 500, 720].forEach((f, i) => {
          this.tone(f, 0.12, i * 0.14, 'triangle', 0.24, f + 120);
        });
        break;
      case 'bee_buzz':
        this.tone(195, 0.9, 0, 'sawtooth', 0.18, 225);
        this.tone(205, 0.9, 0, 'sawtooth', 0.18, 185);
        break;
      case 'duck_quack':
        [0, 0.25, 0.55].forEach((t) => {
          this.tone(440, 0.16, t, 'sawtooth', 0.22, 310);
        });
        break;
      case 'sheep_baa':
        this.tone(280, 0.85, 0, 'sawtooth', 0.22, 250);
        break;
      case 'pig_oink':
        [0, 0.24, 0.5].forEach((t) => {
          this.tone(150, 0.16, t, 'sawtooth', 0.24, 210);
        });
        break;
      case 'chicken_cluck':
        [0, 0.16, 0.32, 0.52].forEach((t, i) => {
          this.tone(540 + i * 60, 0.1, t, 'triangle', 0.24, 380);
        });
        break;
      case 'horse_neigh':
        this.tone(680, 0.25, 0, 'sawtooth', 0.22, 920);
        this.tone(860, 0.5, 0.24, 'sawtooth', 0.22, 420);
        break;
      case 'dolphin_clicks':
        for (let i = 0; i < 7; i++) {
          this.tone(1400 + i * 160, 0.07, i * 0.1, 'sine', 0.22, 2200);
        }
        break;
      case 'whale_song':
        this.tone(240, 1.3, 0, 'sine', 0.26, 480);
        this.tone(480, 0.9, 0.6, 'sine', 0.22, 190);
        break;
      case 'helicopter_chop':
        for (let i = 0; i < 10; i++) {
          this.noise(0.06, i * 0.11, 0.25, 420);
        }
        break;
      case 'police_siren':
        this.tone(520, 0.55, 0, 'sine', 0.24, 980);
        this.tone(980, 0.55, 0.55, 'sine', 0.24, 520);
        break;
      case 'ambulance_siren':
        [0, 0.5].forEach((t) => {
          this.tone(587.33, 0.24, t, 'triangle', 0.22);
          this.tone(440, 0.24, t + 0.25, 'triangle', 0.22);
        });
        break;
      case 'steamboat_horn':
        this.tone(130.81, 0.9, 0, 'sawtooth', 0.26);
        this.tone(164.81, 0.9, 0, 'sawtooth', 0.22);
        break;
      case 'racecar_zoom':
        this.tone(140, 0.5, 0, 'sawtooth', 0.24, 480);
        this.tone(480, 0.6, 0.48, 'sawtooth', 0.24, 180);
        break;
      case 'submarine_sonar':
        this.tone(1320, 0.45, 0, 'sine', 0.25);
        this.tone(1320, 0.45, 0.7, 'sine', 0.18);
        break;
      case 'kpop_synth_beat':
        [440, 523.25, 659.25, 880, 659.25, 880].forEach((f, i) => {
          this.tone(f, 0.14, i * 0.13, 'sawtooth', 0.2);
        });
        break;
      case 'unicorn_harp':
        [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1567.98].forEach((f, i) => {
          this.tone(f, 0.3, i * 0.08, 'triangle', 0.2);
        });
        break;
      case 'chaos_emerald_hum':
        this.tone(440, 0.9, 0, 'sine', 0.2);
        this.tone(660, 0.9, 0.1, 'triangle', 0.18);
        this.tone(1320, 0.7, 0.2, 'sine', 0.15);
        break;
      case 'mario_coin':
      case 'Mario_coin':
        this.tone(987.77, 0.09, 0, 'square', 0.2);
        this.tone(1318.5, 0.38, 0.09, 'square', 0.22);
        break;
      case 'sinterklaas_knock':
        [0, 0.18, 0.36, 0.62].forEach((t) => {
          this.tone(120, 0.08, t, 'triangle', 0.32, 60);
          this.noise(0.06, t, 0.24, 500);
        });
        break;
      case 'sleigh_bells':
        for (let i = 0; i < 7; i++) {
          this.tone(2400 + (i % 2) * 400, 0.09, i * 0.12, 'sine', 0.18);
        }
        break;
      case 'birthday_horn':
        this.tone(349.23, 0.22, 0, 'sawtooth', 0.22);
        this.tone(523.25, 0.55, 0.22, 'sawtooth', 0.26);
        break;
      case 'thunder_storm':
        this.noise(1.3, 0, 0.32, 280);
        this.tone(75, 1.1, 0, 'sawtooth', 0.24, 38);
        break;
      default:
        this.playIntroJingle();
    }
  }
}

export const soundEngine = new SoundEngine();
