/**
 * Deterministic 64-bit FNV-1a hash (UTF-8) matching scripts/generate-tts.py.
 * Works synchronously on plain HTTP LAN URLs (no WebCrypto / HTTPS required).
 */
export function fnv1a64Hex(text: string): string {
  const bytes = new TextEncoder().encode(text.trim());
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < bytes.length; i++) {
    h ^= BigInt(bytes[i]);
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

class SpeechService {
  private availableHashes = new Set<string>();
  private manifestLoaded = false;
  private manifestPromise: Promise<void> | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private unlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      void this.loadManifest();
    }
  }

  public loadManifest(): Promise<void> {
    if (this.manifestPromise) return this.manifestPromise;
    this.manifestPromise = fetch('/api/tts/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hashes?: string[] } | null) => {
        if (data && Array.isArray(data.hashes)) {
          this.availableHashes = new Set(data.hashes);
        }
        this.manifestLoaded = true;
      })
      .catch(() => {
        this.manifestLoaded = true;
      });
    return this.manifestPromise;
  }

  public hasStudioRecording(text: string): boolean {
    if (!text) return false;
    return this.availableHashes.has(fnv1a64Hex(text));
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      (this.availableHashes.size > 0 ||
        ('speechSynthesis' in window &&
          typeof window.SpeechSynthesisUtterance !== 'undefined'))
    );
  }

  public unlock(): void {
    if (this.unlocked || typeof window === 'undefined') return;
    this.unlocked = true;
    try {
      if (!this.activeAudio) {
        this.activeAudio = new Audio();
        this.activeAudio.preload = 'auto';
        this.activeAudio.volume = 1.0;
      }
      // Prime audio element silently on user gesture for iOS Safari & LG webOS
      this.activeAudio.muted = true;
      this.activeAudio.src =
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      const p = this.activeAudio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          if (this.activeAudio) {
            this.activeAudio.pause();
            this.activeAudio.muted = false;
          }
        }).catch(() => {
          if (this.activeAudio) this.activeAudio.muted = false;
        });
      } else {
        this.activeAudio.muted = false;
      }
    } catch {
      // ignore
    }
  }

  public speak(text: string): void {
    const clean = (text || '').trim();
    if (!clean || typeof window === 'undefined') return;

    this.stop();

    const playNow = () => {
      const hash = fnv1a64Hex(clean);
      if (this.availableHashes.has(hash)) {
        this.playStudioMp3(`/tts/${hash}.mp3`, clean);
        return;
      }
      this.speakFallbackSynthesis(clean);
    };

    if (!this.manifestLoaded && this.manifestPromise) {
      void this.manifestPromise.then(playNow);
    } else {
      playNow();
    }
  }

  private playStudioMp3(url: string, fallbackText: string): void {
    try {
      if (!this.activeAudio) {
        this.activeAudio = new Audio();
        this.activeAudio.preload = 'auto';
      }
      const audio = this.activeAudio;
      audio.pause();
      audio.muted = false;
      audio.volume = 1.0;
      audio.src = url;
      audio.currentTime = 0;

      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // If autoplay was blocked or clip failed, fall back cleanly to browser TTS
          this.speakFallbackSynthesis(fallbackText);
        });
      }
    } catch {
      this.speakFallbackSynthesis(fallbackText);
    }
  }

  private speakFallbackSynthesis(text: string): void {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof window.SpeechSynthesisUtterance === 'undefined'
    ) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = 0.92;
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const dutchVoice =
        voices.find((v) => v.lang.toLowerCase().startsWith('nl-nl')) ||
        voices.find((v) => v.lang.toLowerCase().startsWith('nl'));
      if (dutchVoice) {
        utterance.voice = dutchVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TTS speak warning:', err);
    }
  }

  public stop(): void {
    try {
      if (this.activeAudio) {
        this.activeAudio.pause();
        this.activeAudio.currentTime = 0;
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }
}

export const speechService = new SpeechService();
