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

export interface SpeechSequenceStep {
  text: string;
  pauseMs?: number;
  onStart?: () => void;
}

class SpeechService {
  private availableHashes = new Set<string>();
  private clipVersion = '';
  private manifestLoaded = false;
  private manifestPromise: Promise<void> | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private unlocked = false;
  private sequenceToken = 0;
  private pauseTimer: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      void this.loadManifest();
    }
  }

  public loadManifest(): Promise<void> {
    if (this.manifestPromise) return this.manifestPromise;
    this.manifestPromise = fetch('/api/tts/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { hashes?: string[]; version?: string } | null) => {
        if (data && Array.isArray(data.hashes)) {
          this.availableHashes = new Set(data.hashes);
          // Opnames worden lang bewaard; een nieuwe versie (andere opname met dezelfde naam) haalt ze opnieuw op
          this.clipVersion = typeof data.version === 'string' ? data.version : '';
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
    this.speakSequence([{ text: clean }]);
  }

  public speakSequence(
    steps: SpeechSequenceStep[],
    onDone?: () => void
  ): void {
    if (typeof window === 'undefined') return;
    const validSteps = steps
      .map((s) => ({ ...s, text: (s.text || '').trim() }))
      .filter((s) => s.text.length > 0);
    if (validSteps.length === 0) {
      onDone?.();
      return;
    }

    this.stop();
    const myToken = ++this.sequenceToken;

    const run = async () => {
      if (!this.manifestLoaded && this.manifestPromise) {
        await this.manifestPromise;
      }
      for (let i = 0; i < validSteps.length; i++) {
        if (myToken !== this.sequenceToken) return;
        const step = validSteps[i];
        step.onStart?.();
        await this.playOneClip(step.text, myToken);
        if (myToken !== this.sequenceToken) return;
        const pause = step.pauseMs ?? 120;
        if (pause > 0 && i < validSteps.length - 1) {
          await this.waitMs(pause, myToken);
        }
      }
      if (myToken === this.sequenceToken) {
        onDone?.();
      }
    };

    void run();
  }

  private waitMs(ms: number, token: number): Promise<void> {
    return new Promise((resolve) => {
      this.pauseTimer = window.setTimeout(() => {
        this.pauseTimer = null;
        if (token === this.sequenceToken) resolve();
        else resolve();
      }, ms);
    });
  }

  private playOneClip(clean: string, token: number): Promise<void> {
    const hash = fnv1a64Hex(clean);
    if (this.availableHashes.has(hash)) {
      const versionQuery = this.clipVersion
        ? `?v=${encodeURIComponent(this.clipVersion)}`
        : '';
      return this.playStudioMp3Async(
        `/tts/${hash}.mp3${versionQuery}`,
        clean,
        token
      );
    }
    return this.speakFallbackSynthesisAsync(clean, token);
  }

  private playStudioMp3Async(
    url: string,
    fallbackText: string,
    token: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (token !== this.sequenceToken) {
        resolve();
        return;
      }
      try {
        if (!this.activeAudio) {
          this.activeAudio = new Audio();
          this.activeAudio.preload = 'auto';
        }
        const audio = this.activeAudio;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.muted = false;
        audio.volume = 1.0;
        audio.src = url;
        audio.currentTime = 0;

        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          audio.onended = null;
          audio.onerror = null;
          resolve();
        };

        audio.onended = finish;
        audio.onerror = () => {
          if (settled) return;
          settled = true;
          audio.onended = null;
          audio.onerror = null;
          void this.speakFallbackSynthesisAsync(fallbackText, token).then(resolve);
        };

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(() => {
            if (settled) return;
            settled = true;
            audio.onended = null;
            audio.onerror = null;
            void this.speakFallbackSynthesisAsync(fallbackText, token).then(resolve);
          });
        }
      } catch {
        void this.speakFallbackSynthesisAsync(fallbackText, token).then(resolve);
      }
    });
  }

  private speakFallbackSynthesisAsync(
    text: string,
    token: number
  ): Promise<void> {
    return new Promise((resolve) => {
      if (
        token !== this.sequenceToken ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window) ||
        typeof window.SpeechSynthesisUtterance === 'undefined'
      ) {
        resolve();
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

        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('TTS speak warning:', err);
        resolve();
      }
    });
  }

  public stop(): void {
    this.sequenceToken++;
    if (this.pauseTimer !== null) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
    try {
      if (this.activeAudio) {
        this.activeAudio.onended = null;
        this.activeAudio.onerror = null;
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
