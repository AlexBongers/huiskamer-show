class SpeechService {
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof window.SpeechSynthesisUtterance !== 'undefined'
    );
  }

  public speak(text: string): void {
    if (!this.isSupported() || !text) return;
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
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export const speechService = new SpeechService();
