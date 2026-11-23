import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_FAMILY_PROFILES,
  EstimateChallenge,
  GameMode,
  HallOfFameStats,
  PantomimeChallenge,
  Player,
  QuizQuestion,
  SavedActiveSession,
  ShowConfig,
  SoundChallenge,
  ThirtySecondsCard,
  ZoomPhotoChallenge,
} from '@huiskamer-show/shared';
import {
  SeedContentFile,
  contentHash,
  loadSeedHistory,
} from './seedHistory';

const PIN_SALT = 'huiskamer-show-pin-salt-v2';
// Verhogen bij nieuwe standaardvragen: bestaande installaties voegen ze dan bij de volgende start toe
const CURRENT_SEED_VERSION = '2.2.0';

export class DataStore {
  public readonly dataDir: string;
  public readonly seedDir: string;
  public readonly uploadsDir: string;
  public readonly imagesDir: string;
  public readonly audioDir: string;
  public readonly backupsDir: string;

  private config!: ShowConfig;
  private quizQuestions: QuizQuestion[] = [];
  private thirtySecondsCards: ThirtySecondsCard[] = [];
  private soundChallenges: SoundChallenge[] = [];
  private zoomPhotos: ZoomPhotoChallenge[] = [];
  private pantomimeChallenges: PantomimeChallenge[] = [];
  private estimateChallenges: EstimateChallenge[] = [];
  private playedHistory: Record<string, number> = {};
  private hallOfFame!: HallOfFameStats;
  private activeSession: SavedActiveSession | null = null;

  constructor(customDataDir?: string, customSeedDir?: string) {
    this.dataDir =
      customDataDir ||
      process.env.DATA_DIR ||
      path.resolve(__dirname, '../../../data');
    this.seedDir =
      customSeedDir || path.resolve(__dirname, '../../seed');
    this.uploadsDir = path.join(this.dataDir, 'uploads');
    this.imagesDir = path.join(this.uploadsDir, 'images');
    this.audioDir = path.join(this.uploadsDir, 'audio');
    this.backupsDir = path.join(this.dataDir, 'backups');

    this.init();
  }

  public init(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    fs.mkdirSync(this.imagesDir, { recursive: true });
    fs.mkdirSync(this.audioDir, { recursive: true });
    fs.mkdirSync(this.backupsDir, { recursive: true });

    this.config = this.ensureFile<ShowConfig>('config.json', {
      showTitle: 'De Grote Familie Bongers Show',
      subtitle: 'Live vanuit onze eigen huiskamer op de 65" OLED!',
      profiles: DEFAULT_FAMILY_PROFILES,
      adminPinEnabled: false,
    });

    this.quizQuestions = this.ensureFile<QuizQuestion[]>('quiz.json', []);
    this.thirtySecondsCards = this.ensureFile<ThirtySecondsCard[]>(
      'thirtySeconds.json',
      []
    );
    this.soundChallenges = this.ensureFile<SoundChallenge[]>('sounds.json', []);
    this.zoomPhotos = this.ensureFile<ZoomPhotoChallenge[]>(
      'zoomPhotos.json',
      []
    );
    this.pantomimeChallenges = this.ensureFile<PantomimeChallenge[]>(
      'pantomime.json',
      []
    );
    this.estimateChallenges = this.ensureFile<EstimateChallenge[]>(
      'estimates.json',
      []
    );
    this.playedHistory = this.ensureFile<Record<string, number>>(
      'played-history.json',
      {}
    );
    this.hallOfFame = this.ensureFile<HallOfFameStats>('stats.json', {
      totalGamesPlayed: 0,
      coopWins: 0,
      highestScoreRecord: null,
      bestThirtySecondsRecord: null,
      playerLifetime: {},
      recentGames: [],
    });

    const sessionPath = path.join(this.dataDir, 'active-session.json');
    if (fs.existsSync(sessionPath)) {
      try {
        this.activeSession = JSON.parse(
          fs.readFileSync(sessionPath, 'utf-8')
        ) as SavedActiveSession;
      } catch {
        this.activeSession = null;
      }
    }

    // Automatically merge newly shipped seed content when upgrading from an older version (e.g. V1 -> V2)
    if (this.config.seedVersion !== CURRENT_SEED_VERSION) {
      this.syncMissingSeedItems();
      this.config.seedVersion = CURRENT_SEED_VERSION;
      this.atomicWrite(path.join(this.dataDir, 'config.json'), this.config);
    }

    // Verbeterde standaardvragen doorvoeren (alleen waar niemand ze zelf heeft aangepast)
    const updated = this.syncUpdatedSeedItems();
    if (updated.total > 0) {
      console.log(`📝 ${updated.total} verbeterde standaardvragen/opdrachten bijgewerkt.`);
    }
  }

  private contentStores(): Array<{
    file: SeedContentFile;
    get: () => Array<{ id: string }>;
    set: (items: Array<{ id: string }>) => void;
  }> {
    return [
      { file: 'quiz.json', get: () => this.quizQuestions, set: (v) => (this.quizQuestions = v as QuizQuestion[]) },
      { file: 'thirtySeconds.json', get: () => this.thirtySecondsCards, set: (v) => (this.thirtySecondsCards = v as ThirtySecondsCard[]) },
      { file: 'sounds.json', get: () => this.soundChallenges, set: (v) => (this.soundChallenges = v as SoundChallenge[]) },
      { file: 'zoomPhotos.json', get: () => this.zoomPhotos, set: (v) => (this.zoomPhotos = v as ZoomPhotoChallenge[]) },
      { file: 'pantomime.json', get: () => this.pantomimeChallenges, set: (v) => (this.pantomimeChallenges = v as PantomimeChallenge[]) },
      { file: 'estimates.json', get: () => this.estimateChallenges, set: (v) => (this.estimateChallenges = v as EstimateChallenge[]) },
    ];
  }

  /**
   * Brengt verbeterde standaardvragen naar deze installatie. Een vraag wordt alleen vervangen als hij
   * exact gelijk is aan een eerdere versie uit de seed (dus niet zelf aangepast in /admin).
   */
  public syncUpdatedSeedItems(): { total: number; perFile: Partial<Record<SeedContentFile, number>> } {
    const history = loadSeedHistory(this.seedDir);
    const perFile: Partial<Record<SeedContentFile, number>> = {};
    let total = 0;

    for (const store of this.contentStores()) {
      const oldVersionsById = history[store.file];
      if (!oldVersionsById) continue;
      const seedPath = path.join(this.seedDir, store.file);
      if (!fs.existsSync(seedPath)) continue;
      let seedItems: Array<{ id: string }>;
      try {
        seedItems = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
      } catch {
        continue;
      }

      const current = [...store.get()];
      const indexById = new Map(current.map((it, i) => [it.id, i]));
      let changed = 0;
      for (const seedItem of seedItems) {
        const oldVersions = oldVersionsById[seedItem.id];
        if (!oldVersions || oldVersions.length === 0) continue;
        const idx = indexById.get(seedItem.id);
        if (idx === undefined) continue;
        const currentHash = contentHash(current[idx]);
        if (currentHash === contentHash(seedItem)) continue;
        if (oldVersions.includes(currentHash)) {
          current[idx] = seedItem;
          changed += 1;
        }
      }
      if (changed > 0) {
        store.set(current);
        this.atomicWrite(path.join(this.dataDir, store.file), current);
        perFile[store.file] = changed;
        total += changed;
      }
    }
    return { total, perFile };
  }

  public syncMissingSeedItems(): {
    quizAdded: number;
    thirtySecondsAdded: number;
    soundsAdded: number;
    zoomAdded: number;
    pantomimeAdded: number;
    estimatesAdded: number;
  } {
    const mergeSeed = <T extends { id: string }>(
      filename: string,
      current: T[]
    ): { merged: T[]; added: number } => {
      const seedPath = path.join(this.seedDir, filename);
      if (!fs.existsSync(seedPath)) return { merged: current, added: 0 };
      try {
        const seedItems = JSON.parse(fs.readFileSync(seedPath, 'utf-8')) as T[];
        const existingIds = new Set(current.map((x) => x.id));
        const toAdd = seedItems.filter((item) => !existingIds.has(item.id));
        if (toAdd.length === 0) return { merged: current, added: 0 };
        const merged = [...current, ...toAdd];
        this.atomicWrite(path.join(this.dataDir, filename), merged);
        return { merged, added: toAdd.length };
      } catch {
        return { merged: current, added: 0 };
      }
    };

    const q = mergeSeed('quiz.json', this.quizQuestions);
    this.quizQuestions = q.merged;

    const ts = mergeSeed('thirtySeconds.json', this.thirtySecondsCards);
    this.thirtySecondsCards = ts.merged;

    const s = mergeSeed('sounds.json', this.soundChallenges);
    // Normalize any legacy 'Mario_coin' key to 'mario_coin'
    let soundKeyNormalized = false;
    this.soundChallenges = s.merged.map((item) => {
      if (item.soundKey === 'Mario_coin') {
        soundKeyNormalized = true;
        return { ...item, soundKey: 'mario_coin' };
      }
      return item;
    });
    if (soundKeyNormalized) {
      this.atomicWrite(
        path.join(this.dataDir, 'sounds.json'),
        this.soundChallenges
      );
    }

    const z = mergeSeed('zoomPhotos.json', this.zoomPhotos);
    this.zoomPhotos = z.merged;

    const p = mergeSeed('pantomime.json', this.pantomimeChallenges);
    this.pantomimeChallenges = p.merged;

    const e = mergeSeed('estimates.json', this.estimateChallenges);
    this.estimateChallenges = e.merged;

    return {
      quizAdded: q.added,
      thirtySecondsAdded: ts.added,
      soundsAdded: s.added,
      zoomAdded: z.added,
      pantomimeAdded: p.added,
      estimatesAdded: e.added,
    };
  }

  private ensureFile<T>(filename: string, fallback: T): T {
    const targetPath = path.join(this.dataDir, filename);
    const seedPath = path.join(this.seedDir, filename);

    if (!fs.existsSync(targetPath)) {
      if (fs.existsSync(seedPath)) {
        fs.copyFileSync(seedPath, targetPath);
      } else {
        this.atomicWrite(targetPath, fallback);
      }
    }

    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`Error reading ${filename}, backing up corrupt file:`, err);
      const corruptBackupPath = `${targetPath}.corrupt.${Date.now()}.bak`;
      try {
        fs.renameSync(targetPath, corruptBackupPath);
      } catch (renameErr) {
        console.error(`Could not rename corrupt file ${filename}:`, renameErr);
      }
      if (fs.existsSync(seedPath)) {
        fs.copyFileSync(seedPath, targetPath);
        try {
          return JSON.parse(fs.readFileSync(targetPath, 'utf-8')) as T;
        } catch {
          return fallback;
        }
      }
      return fallback;
    }
  }

  private atomicWrite(targetPath: string, data: unknown): void {
    const tmpPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2, 6)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, targetPath);
  }

  // ==========================================================================
  // CONFIG & OPTIONAL PARENT PIN
  // ==========================================================================
  public getConfig(): ShowConfig {
    return this.config;
  }

  public getPublicConfig(): ShowConfig {
    return {
      ...this.config,
      adminPinHash: undefined,
    };
  }

  public saveConfig(newConfig: ShowConfig): ShowConfig {
    this.config = {
      ...newConfig,
      adminPinEnabled:
        typeof newConfig.adminPinEnabled === 'boolean'
          ? newConfig.adminPinEnabled
          : this.config.adminPinEnabled,
      adminPinHash: newConfig.adminPinHash ?? this.config.adminPinHash,
      seedVersion: newConfig.seedVersion ?? this.config.seedVersion,
    };
    this.atomicWrite(path.join(this.dataDir, 'config.json'), this.config);
    return this.getPublicConfig();
  }

  /** Oud formaat (v1): sha256 met een vaste salt. Alleen nog nodig om bestaande PIN's te herkennen. */
  private static legacyHashPin(pin: string): string {
    return crypto
      .createHash('sha256')
      .update(`${PIN_SALT}:${pin.trim()}`)
      .digest('hex');
  }

  /** Nieuw formaat: scrypt met een eigen willekeurige salt per PIN ("scrypt$<salt>$<hash>"). */
  public static hashPin(pin: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(pin.trim(), salt, 32).toString('hex');
    return `scrypt$${salt}$${hash}`;
  }

  public setAdminPin(pin: string | null): ShowConfig {
    if (!pin || pin.trim() === '') {
      this.config.adminPinEnabled = false;
      this.config.adminPinHash = undefined;
    } else {
      this.config.adminPinEnabled = true;
      this.config.adminPinHash = DataStore.hashPin(pin);
    }
    this.atomicWrite(path.join(this.dataDir, 'config.json'), this.config);
    return this.getPublicConfig();
  }

  public verifyAdminPin(pin: string | undefined): boolean {
    if (!this.config.adminPinEnabled || !this.config.adminPinHash) {
      return true;
    }
    if (!pin) return false;
    const storedHash = this.config.adminPinHash;

    let ok = false;
    if (storedHash.startsWith('scrypt$')) {
      const [, salt, hash] = storedHash.split('$');
      if (!salt || !hash) return false;
      const stored = Buffer.from(hash, 'hex');
      const candidate = crypto.scryptSync(pin.trim(), salt, stored.length);
      ok = crypto.timingSafeEqual(candidate, stored);
    } else {
      const candidate = Buffer.from(DataStore.legacyHashPin(pin), 'hex');
      const stored = Buffer.from(storedHash, 'hex');
      ok =
        candidate.length === stored.length &&
        crypto.timingSafeEqual(candidate, stored);
      if (ok) {
        // Bij de eerste geslaagde controle automatisch naar het veiligere formaat omzetten.
        this.config.adminPinHash = DataStore.hashPin(pin);
        this.atomicWrite(path.join(this.dataDir, 'config.json'), this.config);
      }
    }
    return ok;
  }

  // ==========================================================================
  // EVENING-SPANNING PLAYED HISTORY (played-history.json)
  // ==========================================================================
  public getLastPlayedAt(id: string): number {
    return this.playedHistory[id] || 0;
  }

  public markItemsPlayed(ids: string[]): void {
    const now = Date.now();
    for (const id of ids) {
      if (id) this.playedHistory[id] = now;
    }
    this.atomicWrite(
      path.join(this.dataDir, 'played-history.json'),
      this.playedHistory
    );
  }

  public resetPlayedHistory(): void {
    this.playedHistory = {};
    this.atomicWrite(
      path.join(this.dataDir, 'played-history.json'),
      this.playedHistory
    );
  }

  public getPlayedHistoryCount(): number {
    return Object.keys(this.playedHistory).length;
  }

  // ==========================================================================
  // CRASH-RESILIENT ACTIVE SESSION (active-session.json)
  // ==========================================================================
  public getSavedActiveSession(): SavedActiveSession | null {
    return this.activeSession;
  }

  public saveActiveSession(session: SavedActiveSession): void {
    this.activeSession = session;
    this.atomicWrite(
      path.join(this.dataDir, 'active-session.json'),
      this.activeSession
    );
  }

  public clearActiveSession(): void {
    this.activeSession = null;
    const p = path.join(this.dataDir, 'active-session.json');
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {
        // ignore
      }
    }
  }

  // ==========================================================================
  // FAMILY HALL OF FAME (stats.json)
  // ==========================================================================
  public getHallOfFame(): HallOfFameStats {
    return this.hallOfFame;
  }

  public recordGameFinished(params: {
    gameMode: GameMode;
    players: Player[];
    coopWon: boolean;
    awardsCountByPlayer: Record<string, number>;
  }): HallOfFameStats {
    const nowIso = new Date().toISOString();
    this.hallOfFame.totalGamesPlayed += 1;
    if (params.coopWon) {
      this.hallOfFame.coopWins += 1;
    }

    const sorted = [...params.players].sort(
      (a, b) => b.score - a.score || b.stars.length - a.stars.length
    );
    const winner = sorted[0];

    for (const p of params.players) {
      if (
        !this.hallOfFame.highestScoreRecord ||
        p.score > this.hallOfFame.highestScoreRecord.score
      ) {
        this.hallOfFame.highestScoreRecord = {
          playerName: p.name,
          score: p.score,
          date: nowIso,
        };
      }

      if (
        p.stats.thirtySecondsGuessed > 0 &&
        (!this.hallOfFame.bestThirtySecondsRecord ||
          p.stats.thirtySecondsGuessed >
            this.hallOfFame.bestThirtySecondsRecord.count)
      ) {
        this.hallOfFame.bestThirtySecondsRecord = {
          playerName: p.name,
          count: p.stats.thirtySecondsGuessed,
          date: nowIso,
        };
      }

      const key = p.profileId || p.name.toLowerCase();
      const existing = this.hallOfFame.playerLifetime[key] || {
        name: p.name,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        totalStars: 0,
        awardsCount: 0,
      };
      existing.name = p.name;
      existing.gamesPlayed += 1;
      const isWinner =
        (params.gameMode === 'coop' && params.coopWon) ||
        (winner &&
          p.score === winner.score &&
          p.stars.length === winner.stars.length);
      if (isWinner) {
        existing.wins += 1;
      }
      existing.totalScore += p.score;
      existing.totalStars += p.stars.length;
      existing.awardsCount += params.awardsCountByPlayer[p.id] || 1;
      this.hallOfFame.playerLifetime[key] = existing;
    }

    if (winner) {
      this.hallOfFame.recentGames.unshift({
        date: nowIso,
        gameMode: params.gameMode,
        winnerName:
          params.gameMode === 'coop' && params.coopWon
            ? 'Gezamenlijke Gezins-Overwinning!'
            : winner.name,
        topScore: winner.score,
      });
      this.hallOfFame.recentGames = this.hallOfFame.recentGames.slice(0, 15);
    }

    this.atomicWrite(path.join(this.dataDir, 'stats.json'), this.hallOfFame);
    return this.hallOfFame;
  }

  // ==========================================================================
  // CONTENT CRUD (Quiz, 30 Seconds, Sounds, Zoom, Pantomime, Estimates)
  // ==========================================================================
  public getQuizQuestions(): QuizQuestion[] {
    return this.quizQuestions;
  }

  public addQuizQuestion(
    q: Omit<QuizQuestion, 'id'> & { id?: string }
  ): QuizQuestion {
    const item: QuizQuestion = {
      ...q,
      packId: q.packId || 'basis',
      id:
        q.id ||
        `qz_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.quizQuestions.unshift(item);
    this.atomicWrite(path.join(this.dataDir, 'quiz.json'), this.quizQuestions);
    return item;
  }

  public updateQuizQuestion(
    id: string,
    updated: Partial<QuizQuestion>
  ): QuizQuestion | null {
    const idx = this.quizQuestions.findIndex((q) => q.id === id);
    if (idx === -1) return null;
    this.quizQuestions[idx] = { ...this.quizQuestions[idx], ...updated, id };
    this.atomicWrite(path.join(this.dataDir, 'quiz.json'), this.quizQuestions);
    return this.quizQuestions[idx];
  }

  public deleteQuizQuestion(id: string): boolean {
    const lenBefore = this.quizQuestions.length;
    this.quizQuestions = this.quizQuestions.filter((q) => q.id !== id);
    if (this.quizQuestions.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'quiz.json'),
        this.quizQuestions
      );
      return true;
    }
    return false;
  }

  public getThirtySecondsCards(): ThirtySecondsCard[] {
    return this.thirtySecondsCards;
  }

  public addThirtySecondsCard(
    c: Omit<ThirtySecondsCard, 'id'> & { id?: string }
  ): ThirtySecondsCard {
    const card: ThirtySecondsCard = {
      ...c,
      packId: c.packId || 'basis',
      id:
        c.id ||
        `ts_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.thirtySecondsCards.unshift(card);
    this.atomicWrite(
      path.join(this.dataDir, 'thirtySeconds.json'),
      this.thirtySecondsCards
    );
    return card;
  }

  public updateThirtySecondsCard(
    id: string,
    updated: Partial<ThirtySecondsCard>
  ): ThirtySecondsCard | null {
    const idx = this.thirtySecondsCards.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.thirtySecondsCards[idx] = {
      ...this.thirtySecondsCards[idx],
      ...updated,
      id,
    };
    this.atomicWrite(
      path.join(this.dataDir, 'thirtySeconds.json'),
      this.thirtySecondsCards
    );
    return this.thirtySecondsCards[idx];
  }

  public deleteThirtySecondsCard(id: string): boolean {
    const lenBefore = this.thirtySecondsCards.length;
    this.thirtySecondsCards = this.thirtySecondsCards.filter(
      (c) => c.id !== id
    );
    if (this.thirtySecondsCards.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'thirtySeconds.json'),
        this.thirtySecondsCards
      );
      return true;
    }
    return false;
  }

  public getSoundChallenges(): SoundChallenge[] {
    return this.soundChallenges;
  }

  public addSoundChallenge(
    s: Omit<SoundChallenge, 'id'> & { id?: string }
  ): SoundChallenge {
    const item: SoundChallenge = {
      ...s,
      packId: s.packId || 'basis',
      id:
        s.id ||
        `snd_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.soundChallenges.unshift(item);
    this.atomicWrite(
      path.join(this.dataDir, 'sounds.json'),
      this.soundChallenges
    );
    return item;
  }

  public updateSoundChallenge(
    id: string,
    updated: Partial<SoundChallenge>
  ): SoundChallenge | null {
    const idx = this.soundChallenges.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.soundChallenges[idx] = {
      ...this.soundChallenges[idx],
      ...updated,
      id,
    };
    this.atomicWrite(
      path.join(this.dataDir, 'sounds.json'),
      this.soundChallenges
    );
    return this.soundChallenges[idx];
  }

  public deleteSoundChallenge(id: string): boolean {
    const lenBefore = this.soundChallenges.length;
    this.soundChallenges = this.soundChallenges.filter((s) => s.id !== id);
    if (this.soundChallenges.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'sounds.json'),
        this.soundChallenges
      );
      return true;
    }
    return false;
  }

  public getZoomPhotos(): ZoomPhotoChallenge[] {
    return this.zoomPhotos;
  }

  public addZoomPhoto(
    z: Omit<ZoomPhotoChallenge, 'id'> & { id?: string }
  ): ZoomPhotoChallenge {
    const item: ZoomPhotoChallenge = {
      ...z,
      packId: z.packId || 'basis',
      id:
        z.id ||
        `zm_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.zoomPhotos.unshift(item);
    this.atomicWrite(
      path.join(this.dataDir, 'zoomPhotos.json'),
      this.zoomPhotos
    );
    return item;
  }

  public updateZoomPhoto(
    id: string,
    updated: Partial<ZoomPhotoChallenge>
  ): ZoomPhotoChallenge | null {
    const idx = this.zoomPhotos.findIndex((z) => z.id === id);
    if (idx === -1) return null;
    this.zoomPhotos[idx] = { ...this.zoomPhotos[idx], ...updated, id };
    this.atomicWrite(
      path.join(this.dataDir, 'zoomPhotos.json'),
      this.zoomPhotos
    );
    return this.zoomPhotos[idx];
  }

  public deleteZoomPhoto(id: string): boolean {
    const lenBefore = this.zoomPhotos.length;
    this.zoomPhotos = this.zoomPhotos.filter((z) => z.id !== id);
    if (this.zoomPhotos.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'zoomPhotos.json'),
        this.zoomPhotos
      );
      return true;
    }
    return false;
  }

  public getPantomimeChallenges(): PantomimeChallenge[] {
    return this.pantomimeChallenges;
  }

  public addPantomimeChallenge(
    p: Omit<PantomimeChallenge, 'id'> & { id?: string }
  ): PantomimeChallenge {
    const item: PantomimeChallenge = {
      ...p,
      packId: p.packId || 'basis',
      id:
        p.id ||
        `pan_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.pantomimeChallenges.unshift(item);
    this.atomicWrite(
      path.join(this.dataDir, 'pantomime.json'),
      this.pantomimeChallenges
    );
    return item;
  }

  public updatePantomimeChallenge(
    id: string,
    updated: Partial<PantomimeChallenge>
  ): PantomimeChallenge | null {
    const idx = this.pantomimeChallenges.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.pantomimeChallenges[idx] = {
      ...this.pantomimeChallenges[idx],
      ...updated,
      id,
    };
    this.atomicWrite(
      path.join(this.dataDir, 'pantomime.json'),
      this.pantomimeChallenges
    );
    return this.pantomimeChallenges[idx];
  }

  public deletePantomimeChallenge(id: string): boolean {
    const lenBefore = this.pantomimeChallenges.length;
    this.pantomimeChallenges = this.pantomimeChallenges.filter(
      (p) => p.id !== id
    );
    if (this.pantomimeChallenges.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'pantomime.json'),
        this.pantomimeChallenges
      );
      return true;
    }
    return false;
  }

  public getEstimateChallenges(): EstimateChallenge[] {
    return this.estimateChallenges;
  }

  public addEstimateChallenge(
    e: Omit<EstimateChallenge, 'id'> & { id?: string }
  ): EstimateChallenge {
    const item: EstimateChallenge = {
      ...e,
      packId: e.packId || 'basis',
      id:
        e.id ||
        `est_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.estimateChallenges.unshift(item);
    this.atomicWrite(
      path.join(this.dataDir, 'estimates.json'),
      this.estimateChallenges
    );
    return item;
  }

  public updateEstimateChallenge(
    id: string,
    updated: Partial<EstimateChallenge>
  ): EstimateChallenge | null {
    const idx = this.estimateChallenges.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.estimateChallenges[idx] = {
      ...this.estimateChallenges[idx],
      ...updated,
      id,
    };
    this.atomicWrite(
      path.join(this.dataDir, 'estimates.json'),
      this.estimateChallenges
    );
    return this.estimateChallenges[idx];
  }

  public deleteEstimateChallenge(id: string): boolean {
    const lenBefore = this.estimateChallenges.length;
    this.estimateChallenges = this.estimateChallenges.filter(
      (e) => e.id !== id
    );
    if (this.estimateChallenges.length !== lenBefore) {
      this.atomicWrite(
        path.join(this.dataDir, 'estimates.json'),
        this.estimateChallenges
      );
      return true;
    }
    return false;
  }

  // ==========================================================================
  // BACKUP EXPORT, IMPORT & ROTATING SNAPSHOTS (/app/data/backups/)
  // ==========================================================================
  public exportFullBackup() {
    return {
      version: CURRENT_SEED_VERSION,
      exportedAt: new Date().toISOString(),
      config: this.getPublicConfig(),
      quizQuestions: this.quizQuestions,
      thirtySecondsCards: this.thirtySecondsCards,
      soundChallenges: this.soundChallenges,
      zoomPhotos: this.zoomPhotos,
      pantomimeChallenges: this.pantomimeChallenges,
      estimateChallenges: this.estimateChallenges,
      hallOfFame: this.hallOfFame,
    };
  }

  public createBackupSnapshot(): string {
    fs.mkdirSync(this.backupsDir, { recursive: true });
    const filename = `snapshot_${Date.now()}.json`;
    const snapPath = path.join(this.backupsDir, filename);
    this.atomicWrite(snapPath, this.exportFullBackup());

    // Keep max 10 most recent snapshots
    const files = fs
      .readdirSync(this.backupsDir)
      .filter((f) => f.startsWith('snapshot_') && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const oldFile of files.slice(10)) {
      try {
        fs.unlinkSync(path.join(this.backupsDir, oldFile));
      } catch {
        // ignore
      }
    }
    return filename;
  }

  public listBackupSnapshots(): Array<{
    filename: string;
    createdAt: string;
    sizeBytes: number;
  }> {
    if (!fs.existsSync(this.backupsDir)) return [];
    return fs
      .readdirSync(this.backupsDir)
      .filter((f) => f.startsWith('snapshot_') && f.endsWith('.json'))
      .sort()
      .reverse()
      .map((filename) => {
        const stat = fs.statSync(path.join(this.backupsDir, filename));
        return {
          filename,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
        };
      });
  }

  public restoreBackupSnapshot(filename: string): boolean {
    const safeName = path.basename(filename);
    if (
      safeName !== filename ||
      !safeName.startsWith('snapshot_') ||
      !safeName.endsWith('.json')
    ) {
      return false;
    }
    const snapPath = path.join(this.backupsDir, safeName);
    if (!fs.existsSync(snapPath)) return false;
    try {
      const data = JSON.parse(fs.readFileSync(snapPath, 'utf-8'));
      if (!data || typeof data !== 'object') return false;
      this.importFullBackup(data);
      return true;
    } catch {
      return false;
    }
  }

  public importFullBackup(backup: {
    config?: ShowConfig;
    quizQuestions?: QuizQuestion[];
    thirtySecondsCards?: ThirtySecondsCard[];
    soundChallenges?: SoundChallenge[];
    zoomPhotos?: ZoomPhotoChallenge[];
    pantomimeChallenges?: PantomimeChallenge[];
    estimateChallenges?: EstimateChallenge[];
    hallOfFame?: HallOfFameStats;
  }): void {
    // Automatically snapshot current state before importing!
    this.createBackupSnapshot();

    if (backup.config) this.saveConfig(backup.config);
    if (Array.isArray(backup.quizQuestions)) {
      this.quizQuestions = backup.quizQuestions;
      this.atomicWrite(
        path.join(this.dataDir, 'quiz.json'),
        this.quizQuestions
      );
    }
    if (Array.isArray(backup.thirtySecondsCards)) {
      this.thirtySecondsCards = backup.thirtySecondsCards;
      this.atomicWrite(
        path.join(this.dataDir, 'thirtySeconds.json'),
        this.thirtySecondsCards
      );
    }
    if (Array.isArray(backup.soundChallenges)) {
      this.soundChallenges = backup.soundChallenges;
      this.atomicWrite(
        path.join(this.dataDir, 'sounds.json'),
        this.soundChallenges
      );
    }
    if (Array.isArray(backup.zoomPhotos)) {
      this.zoomPhotos = backup.zoomPhotos;
      this.atomicWrite(
        path.join(this.dataDir, 'zoomPhotos.json'),
        this.zoomPhotos
      );
    }
    if (Array.isArray(backup.pantomimeChallenges)) {
      this.pantomimeChallenges = backup.pantomimeChallenges;
      this.atomicWrite(
        path.join(this.dataDir, 'pantomime.json'),
        this.pantomimeChallenges
      );
    }
    if (Array.isArray(backup.estimateChallenges)) {
      this.estimateChallenges = backup.estimateChallenges;
      this.atomicWrite(
        path.join(this.dataDir, 'estimates.json'),
        this.estimateChallenges
      );
    }
    if (
      backup.hallOfFame &&
      typeof backup.hallOfFame === 'object' &&
      typeof backup.hallOfFame.totalGamesPlayed === 'number'
    ) {
      this.hallOfFame = backup.hallOfFame;
      this.atomicWrite(path.join(this.dataDir, 'stats.json'), this.hallOfFame);
    }
  }
}
