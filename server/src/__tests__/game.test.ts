import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  GameStatePayload,
  INTERMISSIONS,
  INTERMISSION_MAP,
  TIMERS,
  seasonThemeForDate,
  seasonalPackForDate,
} from '@huiskamer-show/shared';
import { AwardsEngine } from '../engine/AwardsEngine';
import { GameEngine } from '../engine/GameEngine';
import { createAppServer, readTtsClips } from '../index';
import { DataStore } from '../storage/DataStore';

describe('De Grote Huiskamer Show — Complete Verification & Code-Check Suite', () => {
  let tmpDataDir: string;
  const seedDir = path.resolve(__dirname, '../../seed');

  beforeEach(() => {
    tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huiskamer-test-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDataDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it('1. V2 Seed Content (450 Quiz, 180 30s, 46 Sounds, 46 Zoom, 30 Pantomime, 26 Estimates), 125 SVGs & Zero External CDNs', () => {
    const store = new DataStore(tmpDataDir, seedDir);

    const quiz = store.getQuizQuestions();
    expect(quiz.length).toBeGreaterThanOrEqual(450);
    expect(quiz.filter((q) => q.level === 'ontdekker').length).toBeGreaterThanOrEqual(150);
    expect(quiz.filter((q) => q.level === 'avonturier').length).toBeGreaterThanOrEqual(150);
    expect(quiz.filter((q) => q.level === 'meester').length).toBeGreaterThanOrEqual(150);

    // Ensure no option duplicates the correct option's illustrationId and no typos
    for (const q of quiz) {
      const correct = q.options.find((o) => o.id === q.correctOptionId)!;
      expect(correct).toBeDefined();
      for (const o of q.options) {
        expect(o.label).toBe(o.label.trim());
        expect(o.label).not.toContain('EenDuiker');
        expect(o.label).not.toContain('enDiamant');
        if (o.id !== correct.id && correct.illustrationId) {
          expect(o.illustrationId).not.toBe(correct.illustrationId);
        }
      }
    }

    // Ensure every illustrationId referenced in ALL 6 seed JSONs exists in IllustrationLibrary.tsx
    const illLibPath = path.resolve(
      __dirname,
      '../../../client/src/components/illustrations/IllustrationLibrary.tsx'
    );
    const illLibSrc = fs.readFileSync(illLibPath, 'utf-8');
    const implementedCases = new Set(
      [...illLibSrc.matchAll(/case '([a-z_]+)':/g)].map((m) => m[1])
    );
    expect(implementedCases.size).toBeGreaterThanOrEqual(123);
    for (const f of [
      'quiz.json',
      'sounds.json',
      'zoomPhotos.json',
      'thirtySeconds.json',
      'pantomime.json',
      'estimates.json',
    ]) {
      const raw = fs.readFileSync(path.join(seedDir, f), 'utf-8');
      for (const m of raw.matchAll(/"illustrationId": "([a-z_]+)"/g)) {
        expect(implementedCases.has(m[1])).toBe(true);
      }
    }

    const cards = store.getThirtySecondsCards();
    expect(cards.length).toBeGreaterThanOrEqual(180);
    expect(cards.filter((c) => c.level === 'ontdekker').length).toBeGreaterThanOrEqual(60);
    expect(cards.filter((c) => c.level === 'avonturier').length).toBeGreaterThanOrEqual(60);
    expect(cards.filter((c) => c.level === 'meester').length).toBeGreaterThanOrEqual(60);

    // Ensure zero duplicate 30-Seconds words within the same level
    const seenWordsByLevel = new Set<string>();
    for (const c of cards) {
      for (const it of c.items) {
        const key = `${c.level}::${it.word.toLowerCase().trim()}`;
        expect(seenWordsByLevel.has(key)).toBe(false);
        seenWordsByLevel.add(key);
      }
    }

    // Ensure every synth soundKey in sounds.json exists in soundEngine.ts
    const soundEnginePath = path.resolve(
      __dirname,
      '../../../client/src/services/soundEngine.ts'
    );
    const soundEngineSrc = fs.readFileSync(soundEnginePath, 'utf-8');
    const implementedSoundKeys = new Set(
      [...soundEngineSrc.matchAll(/case '([a-z0-9_]+)':/g)].map((m) => m[1])
    );
    for (const s of store.getSoundChallenges()) {
      if (s.soundType === 'synth') {
        expect(implementedSoundKeys.has(s.soundKey)).toBe(true);
      }
    }

    expect(store.getSoundChallenges().length).toBeGreaterThanOrEqual(45);
    expect(store.getZoomPhotos().length).toBeGreaterThanOrEqual(45);
    expect(store.getPantomimeChallenges().length).toBeGreaterThanOrEqual(30);
    expect(store.getEstimateChallenges().length).toBeGreaterThanOrEqual(25);

    // Check compiled client index.html has zero external CDN links
    const clientIndexHtml = path.resolve(__dirname, '../../../client/dist/index.html');
    if (fs.existsSync(clientIndexHtml)) {
      const html = fs.readFileSync(clientIndexHtml, 'utf-8');
      expect(html).not.toMatch(/https?:\/\/fonts\.googleapis\.com/i);
      expect(html).not.toMatch(/https?:\/\/cdn\./i);
    }
  });

  it('2. Adaptive Levels (45s/40s/30s), All 4 Round Types, Monotonic Zoom +15s & No Answer Leakage', () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(
      store,
      () => {},
      () => {},
      false,
      true // deterministic round-type cycle for structured testing
    );

    const lucas = engine.joinOrReconnectPlayer({
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    }).player;
    const lana = engine.joinOrReconnectPlayer({
      profileId: 'profile_lana',
      name: 'Lana',
      avatarId: 'unicorn',
      level: 'avonturier',
    }).player;
    const papa = engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;
    const mama = engine.joinOrReconnectPlayer({
      profileId: 'profile_mama',
      name: 'Mama',
      avatarId: 'crown',
      level: 'meester',
    }).player;

    // Server derives Host (Papa) & Co-Host (Mama) strictly from config profiles
    expect(papa.isHost).toBe(true);
    expect(papa.isCoHost).toBe(false);
    expect(mama.isHost).toBe(true);
    expect(mama.isCoHost).toBe(true);
    expect(lucas.isHost).toBe(false);
    expect(lana.isHost).toBe(false);

    engine.configureGame({
      gameMode: 'solo',
      totalRounds: 8,
      enabledRoundTypes: ['quiz', 'thirty_seconds', 'sound', 'zoom_photo'],
    });

    // ROUND 1: QUIZ
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('quiz');

    const lucasView = engine.getStateForClient(lucas.id).privateView!;
    const lanaView = engine.getStateForClient(lana.id).privateView!;
    const papaView = engine.getStateForClient(papa.id).privateView!;
    expect(lucasView.myQuizQuestion?.level).toBe('ontdekker');
    expect(lanaView.myQuizQuestion?.level).toBe('avonturier');
    expect(papaView.myQuizQuestion?.level).toBe('meester');

    const lucasQ = store
      .getQuizQuestions()
      .find((q) => q.id === lucasView.myQuizQuestion?.id)!;
    engine.submitQuizAnswer(lucas.id, lucasQ.correctOptionId);

    // NO ANSWER LEAKAGE during ROUND_ACTIVE!
    const tvStateDuringQuiz = engine.getStateForClient(undefined);
    const lucasPublic = tvStateDuringQuiz.players.find((p) => p.id === lucas.id)!;
    expect(lucasPublic.hasAnswered).toBe(true);
    expect(lucasPublic.lastAnswerCorrect).toBeUndefined();
    expect(lucasPublic.lastPointsAwarded).toBeUndefined();
    expect(lucasPublic.lastSelectedOptionId).toBeUndefined();

    engine.finishQuizRound();
    expect(engine.phase).toBe('ROUND_REVEAL');
    engine.enterScoreboard();

    // ROUND 2: 30 SECONDS — Lucas (ontdekker) -> 45s!
    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('thirty_seconds');
    expect(engine.timerTotalSec).toBe(45);
    engine.startThirtySecondsTurn(lucas.id);
    engine.markThirtySecondsItem(papa.id, undefined, 'guessed');
    engine.markThirtySecondsItem(papa.id, undefined, 'guessed');
    engine.markThirtySecondsItem(papa.id, undefined, 'guessed');
    engine.finishThirtySecondsRound();
    engine.enterScoreboard();

    // ROUND 3: SOUND CHALLENGE
    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('sound');
    const snd = store
      .getSoundChallenges()
      .find(
        (s) => s.prompt === engine.getStateForClient(lana.id).activeRound?.soundPrompt
      )!;
    engine.submitSoundAnswer(lana.id, snd.correctOptionId);
    expect(lana.score).toBe(150);
    engine.finishSoundRound();
    engine.enterScoreboard();

    // ROUND 4: ZOOM-IN PHOTO (+15s monotonicity & no illustrationId leakage to players!)
    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('zoom_photo');

    // TV gets zoomIllustrationId, players do NOT!
    expect(engine.getStateForClient(undefined).activeRound?.zoomIllustrationId).toBeDefined();
    expect(engine.getStateForClient(lucas.id).activeRound?.zoomIllustrationId).toBeUndefined();

    // Step zoom 10 ticks, then Host presses +15s -> scale must NEVER jump backwards!
    for (let i = 0; i < 10; i++) engine.stepZoomTick();
    const scaleBeforeAdd = engine.getStateForClient(undefined).activeRound!.zoomCurrentScale!;
    const ptsBeforeAdd = engine.getStateForClient(undefined).activeRound!.zoomPossiblePoints!;
    engine.handleHostControl('addTime');
    engine.stepZoomTick();
    const scaleAfterAdd = engine.getStateForClient(undefined).activeRound!.zoomCurrentScale!;
    const ptsAfterAdd = engine.getStateForClient(undefined).activeRound!.zoomPossiblePoints!;
    expect(scaleAfterAdd).toBeLessThanOrEqual(scaleBeforeAdd);
    expect(ptsAfterAdd).toBeLessThanOrEqual(ptsBeforeAdd);

    // Buzzer Lockout test
    expect(engine.handleZoomBuzz(papa.id)).toBe(true);
    engine.handleHostJudgeZoom(false);
    expect(engine.handleZoomBuzz(papa.id)).toBe(false);
    expect(engine.handleZoomBuzz(mama.id)).toBe(true);
    engine.handleHostJudgeZoom(true);
    expect(engine.phase).toBe('ROUND_REVEAL');
    engine.enterScoreboard();

    // Verify 30 Seconds durations for Lana (40s) and Papa (30s) in subsequent 30s rounds!
    engine.configureGame({ enabledRoundTypes: ['thirty_seconds'] });
    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.timerTotalSec).toBe(40); // Lana (avonturier)
    engine.finishThirtySecondsRound();
    engine.enterScoreboard();

    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.timerTotalSec).toBe(30); // Papa (meester)
  });

  it('3. All Game Modes: Truly Rotating Duos (3 distinct pairings + partner score), Fixed Duos & Co-op', () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);

    const lucas = engine.joinOrReconnectPlayer({
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    }).player;
    const lana = engine.joinOrReconnectPlayer({
      profileId: 'profile_lana',
      name: 'Lana',
      avatarId: 'unicorn',
      level: 'avonturier',
    }).player;
    const papa = engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;
    const mama = engine.joinOrReconnectPlayer({
      profileId: 'profile_mama',
      name: 'Mama',
      avatarId: 'crown',
      level: 'meester',
    }).player;

    // A. DUO_ROTATING: Verify 3 consecutive rounds produce 3 DIFFERENT partners for Lucas!
    engine.configureGame({
      gameMode: 'duo_rotating',
      totalRounds: 6,
      enabledRoundTypes: ['quiz'],
    });
    engine.startGame();

    const lucasPartners = new Set<string>();
    for (let r = 0; r < 3; r++) {
      const lucasTeam = engine.teams.find((t) => t.playerIds.includes(lucas.id))!;
      const partnerId = lucasTeam.playerIds.find((id) => id !== lucas.id)!;
      lucasPartners.add(partnerId);

      // Verify partner also receives points & star when Lucas scores!
      engine.enterRoundIntro();
      engine.enterRoundActive();
      const partnerBefore = engine.players.find((p) => p.id === partnerId)!.score;
      const q = store
        .getQuizQuestions()
        .find((x) => x.id === engine.getStateForClient(lucas.id).privateView?.myQuizQuestion?.id)!;
      engine.submitQuizAnswer(lucas.id, q.correctOptionId);
      const partnerAfter = engine.players.find((p) => p.id === partnerId)!.score;
      expect(partnerAfter).toBeGreaterThan(partnerBefore);

      engine.finishQuizRound();
      engine.enterScoreboard();
      engine.startNextRoundWheel();
    }
    expect(lucasPartners.size).toBe(3); // Played with Lana, Papa, AND Mama!

    // B. DUO_FIXED: Verify fixed teams stay constant across rounds!
    engine.configureGame({
      gameMode: 'duo_fixed',
      totalRounds: 4,
      enabledRoundTypes: ['quiz'],
      teamAssignments: {
        [papa.id]: 'team_gold',
        [lucas.id]: 'team_gold',
        [mama.id]: 'team_neon',
        [lana.id]: 'team_neon',
      },
    });
    engine.startGame();
    expect(engine.teams[0].playerIds).toContain(papa.id);
    expect(engine.teams[0].playerIds).toContain(lucas.id);
    expect(engine.teams[1].playerIds).toContain(mama.id);
    expect(engine.teams[1].playerIds).toContain(lana.id);

    // C. CO-OP MODE: Collect all 6 category stars -> automatic FINALE!
    engine.configureGame({
      gameMode: 'coop',
      totalRounds: 10,
      enabledRoundTypes: ['quiz'],
    });
    engine.startGame();
    for (let r = 0; r < 6; r++) {
      engine.enterRoundIntro();
      engine.enterRoundActive();
      const lq = store
        .getQuizQuestions()
        .find((x) => x.id === engine.getStateForClient(lana.id).privateView?.myQuizQuestion?.id)!;
      engine.submitQuizAnswer(lana.id, lq.correctOptionId);
      engine.finishQuizRound();
      engine.enterScoreboard();
      engine.startNextRoundWheel();
    }
    expect(engine.coopStars.length).toBe(6);
    expect(engine.phase).toBe('FINALE');
    expect(AwardsEngine.computeAwards([lucas, lana, papa, mama], 'coop').length).toBe(4);
  });

  it('4. Pause freezes phase timeouts cleanly & Corrupt JSON Recovery preserves backup', async () => {
    // Test corrupt JSON backup behavior
    const badPath = path.join(tmpDataDir, 'quiz.json');
    fs.writeFileSync(badPath, '{CORRUPT JSON', 'utf-8');
    const recoveredStore = new DataStore(tmpDataDir, seedDir);
    expect(recoveredStore.getQuizQuestions().length).toBeGreaterThanOrEqual(180);
    const files = fs.readdirSync(tmpDataDir);
    expect(files.some((f) => f.startsWith('quiz.json.corrupt.'))).toBe(true);

    // Test real pause/resume freezing a phase timeout
    const engine = new GameEngine(recoveredStore, () => {}, () => {}, true, true);
    engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    engine.startGame();
    expect(engine.phase).toBe('WHEEL_SPIN');

    // Pause immediately during WHEEL_SPIN!
    engine.handleHostControl('pause');
    expect(engine.phase).toBe('PAUSED');
    expect(engine.previousPhaseBeforePause).toBe('WHEEL_SPIN');

    // Wait 500ms while paused -> phase MUST remain PAUSED!
    await new Promise((r) => setTimeout(r, 500));
    expect(engine.phase).toBe('PAUSED');

    // Skip while paused during WHEEL_SPIN -> transitions cleanly to ROUND_INTRO (not uninitialized ROUND_ACTIVE!)
    engine.handleHostControl('skip');
    expect(engine.phase).toBe('ROUND_INTRO');
    engine.clearTimers();
  });

  it('5. Multi-Client E2E: Host Auth, Leave (no ghost), Reconnect, Upload Whitelist & Zod Validation', async () => {
    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });

    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const tvClient: ClientSocket = ClientIO(baseUrl);
    const papaClient: ClientSocket = ClientIO(baseUrl);
    const lucasClient: ClientSocket = ClientIO(baseUrl);

    let latestTvState: GameStatePayload | null = null;
    tvClient.on('state:update', (st: GameStatePayload) => {
      latestTvState = st;
    });
    tvClient.emit('tv:join', { origin: baseUrl });

    const joinClient = (
      client: ClientSocket,
      payload: Record<string, unknown>
    ) =>
      new Promise<{ playerId: string; sessionToken: string; player: { isHost: boolean } }>((resolve) => {
        client.emit('player:join', payload, (ack: { playerId: string; sessionToken: string; player: { isHost: boolean } }) => {
          resolve(ack);
        });
      });

    await joinClient(papaClient, {
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });

    // Lucas tries to spoof isHost: true -> server MUST reject it!
    const lucasSess = await joinClient(lucasClient, {
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
      isHost: true,
    });
    expect(lucasSess.player.isHost).toBe(false);

    // Non-host Lucas tries to call host:startGame -> server MUST ignore it!
    lucasClient.emit('host:startGame');
    await new Promise((r) => setTimeout(r, 40));
    expect(latestTvState!.phase).toBe('LOBBY');

    // Lucas clicks "Wissel speler" (player:leave) -> removed cleanly from lobby with NO ghost!
    lucasClient.emit('player:leave');
    await new Promise((r) => setTimeout(r, 40));
    expect(latestTvState!.players.some((p) => p.id === lucasSess.playerId)).toBe(false);

    // Lucas rejoins cleanly
    await joinClient(lucasClient, {
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    });

    // Papa (real Host) starts game -> succeeds!
    papaClient.emit('host:startGame');
    await new Promise((r) => setTimeout(r, 40));
    expect(latestTvState!.phase).toBe('WHEEL_SPIN');

    // Upload Security Check: .html file MUST be rejected with 400!
    const badForm = new FormData();
    badForm.append(
      'file',
      new Blob(['<script>alert(1)</script>'], { type: 'text/html' }),
      'xss.html'
    );
    const badUploadRes = await fetch(`${baseUrl}/api/admin/upload/image`, {
      method: 'POST',
      body: badForm,
    });
    expect(badUploadRes.status).toBe(400);

    // Valid PNG upload succeeds with 201
    const goodForm = new FormData();
    goodForm.append(
      'file',
      new Blob([Buffer.from('89504e470d0a1a0a', 'hex')], { type: 'image/png' }),
      'vakantie.png'
    );
    const goodUploadRes = await fetch(`${baseUrl}/api/admin/upload/image`, {
      method: 'POST',
      body: goodForm,
    });
    expect(goodUploadRes.status).toBe(201);

    // Invalid config & backup payloads MUST be rejected with 400 by Zod!
    const badConfigRes = await fetch(`${baseUrl}/api/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ showTitle: '', profiles: [] }),
    });
    expect(badConfigRes.status).toBe(400);

    const badBackupRes = await fetch(`${baseUrl}/api/admin/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { broken: true } }),
    });
    expect(badBackupRes.status).toBe(400);

    // Static routes & healthcheck
    const healthRes = await fetch(`${baseUrl}/api/health`);
    expect(healthRes.status).toBe(200);
    for (const p of ['/tv', '/play', '/admin']) {
      const r = await fetch(`${baseUrl}${p}`);
      expect(r.status).toBe(200);
    }

    tvClient.disconnect();
    papaClient.disconnect();
    lucasClient.disconnect();
    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );
  });

  it('6. V2 New Round Types: RoundType 5 (Pantomime) & RoundType 6 (Estimate — Dichtstbij Wint)', () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);

    const lucas = engine.joinOrReconnectPlayer({
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    }).player;
    const lana = engine.joinOrReconnectPlayer({
      profileId: 'profile_lana',
      name: 'Lana',
      avatarId: 'unicorn',
      level: 'avonturier',
    }).player;
    const papa = engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;

    // ROUNDTYPE 5: PANTOMIME ("🎭 Wie of Wat ben ik?")
    engine.configureGame({
      gameMode: 'solo',
      totalRounds: 4,
      enabledRoundTypes: ['pantomime', 'estimate'],
      surpriseMode: false,
    });
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('pantomime');

    // Lucas is the first actor: gets private prompt, others do not!
    const lucasPriv = engine.getStateForClient(lucas.id).privateView!;
    expect(lucasPriv.myPantomimeState?.isActor).toBe(true);
    expect(lucasPriv.myPantomimeState?.secretPrompt).toBeDefined();
    expect(
      engine.getStateForClient(lana.id).privateView?.myPantomimeState?.secretPrompt
    ).toBeUndefined();

    // Start pantomime turn -> Lana buzzes -> wrong answer locks her out -> Papa buzzes right -> BOTH Papa (+100) and Lucas (+75) score!
    engine.startPantomimeTurn(lucas.id);
    expect(engine.handlePantomimeBuzz(lucas.id)).toBe(false); // Actor cannot buzz own act
    expect(engine.handlePantomimeBuzz(lana.id)).toBe(true);
    engine.handleHostJudgePantomime(false); // wrong -> locked out!
    expect(engine.handlePantomimeBuzz(lana.id)).toBe(false);

    expect(engine.handlePantomimeBuzz(papa.id)).toBe(true);
    engine.handleHostJudgePantomime(true);
    expect(engine.phase).toBe('ROUND_REVEAL');
    expect(papa.score).toBe(100);
    expect(lucas.score).toBe(75);
    expect(papa.stars.length).toBe(1);
    expect(lucas.stars.length).toBe(1);
    engine.enterScoreboard();

    // ROUNDTYPE 6: ESTIMATE ("🎯 Dichtstbij Wint!")
    engine.startNextRoundWheel();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.currentRoundType).toBe('estimate');

    const estPrompt = engine.getStateForClient(undefined).activeRound!.estimatePrompt!;
    const estChallenge = store
      .getEstimateChallenges()
      .find((e) => e.prompt === estPrompt)!;
    expect(estChallenge).toBeDefined();

    // Lucas submits far guess, Lana submits exact correctValue, Papa submits slightly off
    engine.submitEstimateAnswer(lucas.id, estChallenge.min);
    engine.submitEstimateAnswer(lana.id, estChallenge.correctValue);
    expect(engine.phase).toBe('ROUND_ACTIVE'); // Still waiting for Papa
    engine.submitEstimateAnswer(
      papa.id,
      Math.min(estChallenge.max, estChallenge.correctValue + estChallenge.step * 2)
    );

    // Auto-finishes to ROUND_REVEAL and awards Lana +125 points!
    expect(engine.phase).toBe('ROUND_REVEAL');
    expect(lana.score).toBe(125);
    const activeRev = engine.getStateForClient(undefined).activeRound!;
    expect(activeRev.estimateRevealedByPlayer?.[lana.id]?.isWinner).toBe(true);
    expect(activeRev.estimateRevealedCorrectValue).toBe(estChallenge.correctValue);
  });

  it('7. V3 Robustness: Individual Player Pause, Active Session Crash-Recovery, Played History & Hall of Fame', () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);

    const lucas = engine.joinOrReconnectPlayer({
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    }).player;
    const lana = engine.joinOrReconnectPlayer({
      profileId: 'profile_lana',
      name: 'Lana',
      avatarId: 'unicorn',
      level: 'avonturier',
    }).player;
    const papa = engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;

    engine.configureGame({
      gameMode: 'solo',
      totalRounds: 2,
      enabledRoundTypes: ['quiz'],
      surpriseMode: false,
    });
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();

    // Lana goes to the bathroom -> Host pauses Lana individually ("⏸️ Even weg")
    engine.togglePlayerPause(lana.id);
    expect(lana.paused).toBe(true);

    // Only Lucas and Papa answer -> round auto-completes without waiting for paused Lana!
    const lucasQ = engine.getStateForClient(lucas.id).privateView!.myQuizQuestion!;
    const papaQ = engine.getStateForClient(papa.id).privateView!.myQuizQuestion!;
    engine.submitQuizAnswer(lucas.id, lucasQ.options[0].id);
    expect(engine.phase).toBe('ROUND_ACTIVE');
    engine.submitQuizAnswer(papa.id, papaQ.options[0].id);
    expect(engine.phase).toBe('ROUND_REVEAL');

    // Played history persisted to played-history.json
    expect(store.getPlayedHistoryCount()).toBeGreaterThanOrEqual(2);

    // Enter SCOREBOARD after Round 1 of 2 -> active-session.json is persisted for crash recovery!
    engine.enterScoreboard();
    expect(store.getSavedActiveSession()).not.toBeNull();

    // Simulate container restart: brand-new GameEngine resumes saved session into next round's WHEEL_SPIN!
    const restartedEngine = new GameEngine(store, () => {}, () => {}, false, true);
    expect(restartedEngine.resumeSavedSession()).toBe(true);
    expect(restartedEngine.phase).toBe('WHEEL_SPIN');
    expect(restartedEngine.currentRoundNumber).toBe(2);
    expect(restartedEngine.players.length).toBe(3);

    // Finish Round 2 and advance to FINALE -> records Hall of Fame in stats.json and clears active-session.json!
    restartedEngine.enterRoundIntro();
    restartedEngine.enterRoundActive();
    restartedEngine.finishQuizRound();
    restartedEngine.enterScoreboard();
    restartedEngine.startNextRoundWheel();
    expect(restartedEngine.phase).toBe('FINALE');
    expect(store.getSavedActiveSession()).toBeNull();
    const hof = store.getHallOfFame();
    expect(hof.totalGamesPlayed).toBe(1);
    expect(Object.keys(hof.playerLifetime).length).toBe(3);

    // Reset played history
    store.resetPlayedHistory();
    expect(store.getPlayedHistoryCount()).toBe(0);
  });

  it('8. V3 Admin Security & Tools: Optional 4-Digit Parent PIN, Batch Family Photo Wizard & Rotating Snapshots', async () => {
    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });

    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Initially no PIN is required
    const status0 = await (await fetch(`${baseUrl}/api/admin/pin-status`)).json();
    expect(status0.pinRequired).toBe(false);

    // Enable 4-digit Parent PIN "2468" & verify pinRequired flag is returned
    const setPinRes = await fetch(`${baseUrl}/api/admin/pin`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '2468' }),
    });
    expect(setPinRes.status).toBe(200);
    const setPinBody = await setPinRes.json();
    expect(setPinBody.pinRequired).toBe(true);

    // Without X-Admin-Pin -> 401 Unauthorized
    const unauthRes = await fetch(`${baseUrl}/api/admin/overview`);
    expect(unauthRes.status).toBe(401);

    // With X-Admin-Pin: 2468 -> 200 OK
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Admin-Pin': '2468',
    };
    const authRes = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: authHeaders,
    });
    expect(authRes.status).toBe(200);

    // Pantomime & Estimate PUT CRUD + Zod range validation
    const createEstRes = await fetch(`${baseUrl}/api/admin/estimates`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        category: 'ons_gezin',
        prompt: 'Hoeveel pannenkoeken eten we?',
        unit: 'stuks',
        min: 1,
        max: 20,
        step: 1,
        correctValue: 10,
        illustrationId: 'pancake',
      }),
    });
    expect(createEstRes.status).toBe(201);
    const createdEst = await createEstRes.json();

    // Reject out-of-range update via PUT
    const badEstUpdate = await fetch(
      `${baseUrl}/api/admin/estimates/${createdEst.id}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ correctValue: 999 }),
      }
    );
    expect(badEstUpdate.status).toBe(400);

    // Valid PUT update succeeds
    const goodEstUpdate = await fetch(
      `${baseUrl}/api/admin/estimates/${createdEst.id}`,
      {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ correctValue: 12 }),
      }
    );
    expect(goodEstUpdate.status).toBe(200);

    // Batch Family Photo Wizard endpoint creates multiple zoom photos at once
    const batchRes = await fetch(`${baseUrl}/api/admin/zoom-photos/batch`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [
          {
            category: 'ons_gezin',
            answer: 'Lucas met dino-pet op vakantie',
            imageUrl: '/uploads/images/test1.jpg',
            focalPoint: { x: 40, y: 60 },
          },
          {
            category: 'ons_gezin',
            answer: 'Lana met eenhoorn-taart',
            imageUrl: '/uploads/images/test2.jpg',
            focalPoint: { x: 55, y: 35 },
          },
        ],
      }),
    });
    expect(batchRes.status).toBe(201);
    const batchData = await batchRes.json();
    expect(batchData.count).toBe(2);

    // Create manual snapshot in /app/data/backups & restore it
    const snapRes = await fetch(`${baseUrl}/api/admin/backups/snapshot`, {
      method: 'POST',
      headers: authHeaders,
    });
    expect(snapRes.status).toBe(201);
    const snapList = await (
      await fetch(`${baseUrl}/api/admin/backups`, { headers: authHeaders })
    ).json();
    expect(snapList.length).toBeGreaterThanOrEqual(1);

    // Path traversal / non-snapshot filename MUST be rejected!
    const badSnapRestore = await fetch(
      `${baseUrl}/api/admin/backups/restore/${encodeURIComponent('../config.json')}`,
      {
        method: 'POST',
        headers: authHeaders,
      }
    );
    expect(badSnapRestore.status).toBe(404);

    const restoreRes = await fetch(
      `${baseUrl}/api/admin/backups/restore/${encodeURIComponent(snapList[0].filename)}`,
      {
        method: 'POST',
        headers: authHeaders,
      }
    );
    expect(restoreRes.status).toBe(200);

    // Non-destructive seed sync endpoint works
    const syncRes = await fetch(`${baseUrl}/api/admin/sync-seeds`, {
      method: 'POST',
      headers: authHeaders,
    });
    expect(syncRes.status).toBe(200);

    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );
  });

  it('9. Non-destructive V1->V2 Seed Migration & V2 Finale Awards (Schattings-Meester)', () => {
    // Simulate a legacy V1 dataDir with only 1 custom quiz question and no seedVersion
    fs.writeFileSync(
      path.join(tmpDataDir, 'config.json'),
      JSON.stringify({
        showTitle: 'Familie Show V1',
        subtitle: 'Oude versie',
        profiles: [
          {
            id: 'profile_papa',
            name: 'Papa',
            ageLabel: 'Meester',
            level: 'meester',
            defaultAvatarId: 'showmaster',
            avatarOptions: ['showmaster'],
            color: '#3B82F6',
            isHostDefault: true,
            isCoHostDefault: false,
            autoSpeak: false,
          },
        ],
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(tmpDataDir, 'quiz.json'),
      JSON.stringify([
        {
          id: 'qz_custom_family_1',
          category: 'ons_gezin',
          level: 'ontdekker',
          prompt: 'Wat is onze eigen custom gezinsvraag?',
          options: [
            { id: 'a', label: 'Pizza', illustrationId: 'pizza' },
            { id: 'b', label: 'Pannenkoek', illustrationId: 'pancake' },
          ],
          correctOptionId: 'a',
        },
      ]),
      'utf-8'
    );

    // Initializing DataStore MUST keep custom question AND merge all 450 seed quiz questions!
    const migratedStore = new DataStore(tmpDataDir, seedDir);
    const mergedQuiz = migratedStore.getQuizQuestions();
    expect(mergedQuiz.some((q) => q.id === 'qz_custom_family_1')).toBe(true);
    expect(mergedQuiz.length).toBeGreaterThanOrEqual(451);

    // Verify AwardsEngine recognizes estimateWins ("Schattings-Meester")
    const engine = new GameEngine(migratedStore, () => {}, () => {}, false, true);
    const p1 = engine.joinOrReconnectPlayer({
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;
    const p2 = engine.joinOrReconnectPlayer({
      name: 'Lana',
      avatarId: 'unicorn',
      level: 'avonturier',
    }).player;
    p1.score = 500;
    p2.score = 300;
    p2.stats.estimateWins = 2;
    const awards = AwardsEngine.computeAwards([p1, p2], 'solo');
    expect(awards.some((a) => a.id === 'award_estimate' && a.playerId === p2.id)).toBe(true);
  });

  it('10. LG Magic Remote tv:control works exclusively for joined TV sockets and blocks unsafe actions', async () => {
    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      publicUrl: 'http://127.0.0.1:0',
      enableTimers: false,
      deterministicCycles: true,
    });

    await new Promise<void>((resolve) =>
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve())
    );
    const addr = serverInstance.httpServer.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    const baseUrl = `http://127.0.0.1:${port}`;

    const tvSock: ClientSocket = ClientIO(baseUrl, { transports: ['websocket'] });
    const playerSock: ClientSocket = ClientIO(baseUrl, { transports: ['websocket'] });

    let latestState: GameStatePayload | null = null;
    tvSock.on('state:update', (s: GameStatePayload) => {
      latestState = s;
    });

    await new Promise<void>((resolve) => tvSock.on('connect', () => resolve()));
    await new Promise<void>((resolve) => playerSock.on('connect', () => resolve()));

    // Non-TV player socket tries tv:control toggleMute -> MUST be ignored
    playerSock.emit('tv:control', { action: 'toggleMute' });
    await new Promise((r) => setTimeout(r, 80));
    expect(latestState?.tvMuted).toBe(false);

    // Join TV socket, then send toggleMute -> MUST succeed
    tvSock.emit('tv:join', { origin: baseUrl });
    await new Promise((r) => setTimeout(r, 80));
    tvSock.emit('tv:control', { action: 'toggleMute' });
    await new Promise((r) => setTimeout(r, 80));
    expect(latestState?.tvMuted).toBe(true);

    // Start a game and test pause / resume from TV remote, while blocking resetToLobby
    serverInstance.engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    serverInstance.engine.startGame();
    serverInstance.engine.enterRoundIntro();
    serverInstance.engine.enterRoundActive();
    expect(serverInstance.engine.phase).toBe('ROUND_ACTIVE');

    tvSock.emit('tv:control', { action: 'pause' });
    await new Promise((r) => setTimeout(r, 80));
    expect(serverInstance.engine.phase).toBe('PAUSED');

    // Disallowed action via tv:control MUST be ignored
    tvSock.emit('tv:control', { action: 'resetToLobby' });
    await new Promise((r) => setTimeout(r, 80));
    expect(serverInstance.engine.phase).toBe('PAUSED');

    tvSock.emit('tv:control', { action: 'resume' });
    await new Promise((r) => setTimeout(r, 80));
    expect(serverInstance.engine.phase).toBe('ROUND_ACTIVE');

    tvSock.disconnect();
    playerSock.disconnect();
    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );
  });

  it('11. Code-review hardening: PIN-rem, scrypt-migratie, correctOptionId-check bij bewerken, startGame-guard & ongeldige join-invoer', async () => {
    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const json = { 'Content-Type': 'application/json' };

    // --- PIN wordt in het nieuwe scrypt-formaat bewaard ---
    await fetch(`${baseUrl}/api/admin/pin`, {
      method: 'PUT',
      headers: json,
      body: JSON.stringify({ pin: '2468' }),
    });
    const storedHash = serverInstance.store.getConfig().adminPinHash || '';
    expect(storedHash.startsWith('scrypt$')).toBe(true);
    expect(serverInstance.store.verifyAdminPin('2468')).toBe(true);
    expect(serverInstance.store.verifyAdminPin('0000')).toBe(false);

    // --- Een bestaande PIN in het oude sha256-formaat blijft werken en wordt omgezet ---
    const legacy = (DataStore as unknown as {
      legacyHashPin: (p: string) => string;
    }).legacyHashPin('1357');
    serverInstance.store.getConfig().adminPinHash = legacy;
    expect(serverInstance.store.verifyAdminPin('1357')).toBe(true);
    expect(
      (serverInstance.store.getConfig().adminPinHash || '').startsWith('scrypt$')
    ).toBe(true);
    expect(serverInstance.store.verifyAdminPin('1357')).toBe(true);
    serverInstance.store.setAdminPin('2468');

    // --- correctOptionId moet bij bewerken kloppen met de bestaande opties ---
    const authHeaders = { ...json, 'X-Admin-Pin': '2468' };
    const quiz = serverInstance.store.getQuizQuestions()[0];
    const badQuizRes = await fetch(`${baseUrl}/api/admin/quiz/${quiz.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ correctOptionId: 'bestaat_niet' }),
    });
    expect(badQuizRes.status).toBe(400);
    const missingQuizRes = await fetch(`${baseUrl}/api/admin/quiz/bestaat_niet`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ prompt: 'x' }),
    });
    expect(missingQuizRes.status).toBe(404);
    const okQuizRes = await fetch(`${baseUrl}/api/admin/quiz/${quiz.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ funFact: 'Test' }),
    });
    expect(okQuizRes.status).toBe(200);

    // --- Na 5 foute PIN-pogingen volgt een blokkade (ook voor de juiste PIN) ---
    for (let i = 0; i < 5; i++) {
      const bad = await fetch(`${baseUrl}/api/admin/pin-verify`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ pin: '0000' }),
      });
      expect(bad.status).toBe(401);
    }
    const blockedRes = await fetch(`${baseUrl}/api/admin/pin-verify`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ pin: '2468' }),
    });
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get('Retry-After')).toBeTruthy();
    const blockedAdmin = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: authHeaders,
    });
    expect(blockedAdmin.status).toBe(429);

    // --- startGame mag een lopend spel niet opnieuw starten ---
    const engine = serverInstance.engine;
    engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    engine.startGame();
    expect(engine.phase).toBe('WHEEL_SPIN');
    const roundBefore = engine.currentRoundNumber;
    engine.startGame();
    expect(engine.currentRoundNumber).toBe(roundBefore);
    expect(engine.resumeSavedSession()).toBe(false);

    // --- configureGame negeert ongeldige waarden ---
    const modeBefore = engine.settings.gameMode;
    engine.configureGame({
      gameMode: 'hacker_mode' as never,
      enabledRoundTypes: ['bestaat_niet' as never],
      enabledPacks: ['onbekend' as never],
    });
    expect(engine.settings.gameMode).toBe(modeBefore);
    expect(engine.settings.enabledRoundTypes).not.toContain('bestaat_niet');

    // --- Ongeldige join-invoer wordt opgeschoond (lange naam, onbekend niveau) ---
    const sock = ClientIO(baseUrl, { transports: ['websocket'] });
    await new Promise<void>((resolve) => sock.on('connect', () => resolve()));
    const session = await new Promise<{ player: { name: string; level: string } }>(
      (resolve) => {
        sock.emit(
          'player:join',
          {
            name: 'X'.repeat(200),
            avatarId: 'star',
            level: 'superheld',
          },
          resolve
        );
      }
    );
    expect(session.player.name.length).toBeLessThanOrEqual(24);
    expect(['ontdekker', 'avonturier', 'meester']).toContain(session.player.level);

    sock.disconnect();
    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );
  });

  it('12. Tweede review: auto-pauze zonder spelers, geen TV-info voor meekijkers, schoonmaak bij reset & teamvalidatie', async () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);

    const papa = engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    }).player;
    const mama = engine.joinOrReconnectPlayer({
      profileId: 'profile_mama',
      name: 'Mama',
      avatarId: 'crown',
      level: 'meester',
    }).player;
    engine.configureGame({ gameMode: 'solo', totalRounds: 6, enabledRoundTypes: ['sound'] });
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.phase).toBe('ROUND_ACTIVE');
    expect(engine.currentRoundType).toBe('sound');

    // --- Meekijkers (geen TV, geen speler) krijgen de naam van het geluid niet; de TV wel ---
    expect(engine.getStateForClient(undefined, true).activeRound?.soundKey).toBeDefined();
    expect(engine.getStateForClient(undefined, false).activeRound?.soundKey).toBeUndefined();
    expect(engine.getStateForClient(undefined).activeRound?.soundKey).toBeDefined(); // standaard = TV
    expect(engine.getStateForClient(papa.id).activeRound?.soundKey).toBeUndefined();

    // --- Valt er één speler weg, dan gaat het spel gewoon door ---
    engine.setPlayerConnected(papa.id, false);
    expect(engine.phase).toBe('ROUND_ACTIVE');

    // --- Vallen ze allemaal weg, dan pauzeert het spel vanzelf (en blijft het hervatbaar) ---
    engine.setPlayerConnected(mama.id, false);
    expect(engine.phase).toBe('PAUSED');
    expect(engine.previousPhaseBeforePause).toBe('ROUND_ACTIVE');

    // --- Komt er weer iemand terug, dan hervat het vanzelf ---
    engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    expect(engine.phase).toBe('ROUND_ACTIVE');

    // --- Een pauze die de host zelf drukte wordt NIET vanzelf opgeheven ---
    engine.handleHostControl('pause');
    expect(engine.phase).toBe('PAUSED');
    engine.setPlayerConnected(papa.id, false);
    engine.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    expect(engine.phase).toBe('PAUSED');
    engine.handleHostControl('resume');
    expect(engine.phase).toBe('ROUND_ACTIVE');

    // --- In de lobby gebeurt er niets als iedereen wegvalt ---
    engine.handleHostControl('reset');
    expect(engine.phase).toBe('LOBBY');
    engine.setPlayerConnected(papa.id, false);
    expect(engine.phase).toBe('LOBBY');

    // --- Nieuw spel: weggevallen spelers verdwijnen uit de lobby, aanwezige blijven ---
    const lucas = engine.joinOrReconnectPlayer({
      profileId: 'profile_lucas',
      name: 'Lucas',
      avatarId: 'trex',
      level: 'ontdekker',
    }).player;
    engine.startGame();
    engine.setPlayerConnected(lucas.id, true);
    engine.setPlayerConnected(mama.id, false);
    engine.handleHostControl('reset');
    expect(engine.players.map((pl) => pl.id)).toContain(lucas.id);
    expect(engine.players.map((pl) => pl.id)).not.toContain(mama.id);

    // --- Ongeldige teamnamen worden genegeerd ---
    const teamBefore = lucas.teamId;
    engine.configureGame({ teamAssignments: { [lucas.id]: 'team_bestaat_niet' } });
    expect(lucas.teamId).toBe(teamBefore);
    engine.configureGame({ teamAssignments: { [lucas.id]: 'team_neon' } });
    expect(lucas.teamId).toBe('team_neon');

    // --- Socket-niveau: een kale verbinding (geen tv:join) krijgt geen TV-gegevens ---
    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const e2 = serverInstance.engine;
    e2.joinOrReconnectPlayer({
      profileId: 'profile_papa',
      name: 'Papa',
      avatarId: 'showmaster',
      level: 'meester',
    });
    e2.configureGame({ gameMode: 'solo', enabledRoundTypes: ['sound'] });
    e2.startGame();
    e2.enterRoundIntro();
    e2.enterRoundActive();

    const spectator = ClientIO(baseUrl, { transports: ['websocket'] });
    const tv = ClientIO(baseUrl, { transports: ['websocket'] });
    let spectatorState: GameStatePayload | null = null;
    let tvState: GameStatePayload | null = null;
    spectator.on('state:update', (st: GameStatePayload) => {
      spectatorState = st;
    });
    tv.on('state:update', (st: GameStatePayload) => {
      tvState = st;
    });
    await new Promise<void>((resolve) => spectator.on('connect', () => resolve()));
    await new Promise<void>((resolve) => tv.on('connect', () => resolve()));
    tv.emit('tv:join', { origin: baseUrl });
    await new Promise((r) => setTimeout(r, 150));
    expect((spectatorState as GameStatePayload | null)?.activeRound?.soundKey).toBeUndefined();
    expect((tvState as GameStatePayload | null)?.activeRound?.soundKey).toBeDefined();

    // Een vreemd adres in tv:join mag de QR-code niet verleggen
    const qrBefore = e2.qrUrl;
    tv.emit('tv:join', { origin: 'http://evil.example.com' });
    await new Promise((r) => setTimeout(r, 150));
    expect(e2.qrUrl).toBe(qrBefore);

    spectator.disconnect();
    tv.disconnect();
    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );
  });

  it('13. Seed-integriteit: unieke id\'s, 4 unieke opties, antwoord niet in de vraag, geluidssleutels bestaan, schattingen op de schuifbalk-stap', () => {
    const store = new DataStore(tmpDataDir, seedDir);

    const uniqueIds = (name: string, items: Array<{ id: string }>) => {
      const seen = new Set<string>();
      const dups: string[] = [];
      for (const it of items) {
        if (seen.has(it.id)) dups.push(it.id);
        seen.add(it.id);
      }
      expect(dups, `dubbele id's in ${name}`).toEqual([]);
    };
    uniqueIds('quiz', store.getQuizQuestions());
    uniqueIds('thirtySeconds', store.getThirtySecondsCards());
    uniqueIds('sounds', store.getSoundChallenges());
    uniqueIds('zoomPhotos', store.getZoomPhotos());
    uniqueIds('pantomime', store.getPantomimeChallenges());
    uniqueIds('estimates', store.getEstimateChallenges());

    const problems: string[] = [];

    for (const q of store.getQuizQuestions()) {
      if (q.options.length !== 4) problems.push(`quiz ${q.id}: ${q.options.length} opties`);
      const labels = q.options.map((o) => o.label.trim().toLowerCase());
      if (new Set(labels).size !== labels.length) problems.push(`quiz ${q.id}: dubbele optietekst`);
      const correct = q.options.find((o) => o.id === q.correctOptionId);
      if (!correct) {
        problems.push(`quiz ${q.id}: correctOptionId niet in opties`);
        continue;
      }
      if (
        correct.label.length > 3 &&
        q.prompt.toLowerCase().includes(correct.label.toLowerCase())
      ) {
        problems.push(`quiz ${q.id}: het antwoord "${correct.label}" staat in de vraag`);
      }
    }

    const engineSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../client/src/services/soundEngine.ts'),
      'utf-8'
    );
    const knownSoundKeys = new Set(
      [...engineSrc.matchAll(/key:\s*'([a-z0-9_]+)'/g)].map((m) => m[1])
    );
    for (const sc of store.getSoundChallenges()) {
      if (sc.options.length !== 4) problems.push(`geluid ${sc.id}: ${sc.options.length} opties`);
      if (!sc.options.some((o) => o.id === sc.correctOptionId)) {
        problems.push(`geluid ${sc.id}: correctOptionId niet in opties`);
      }
      if (sc.soundType === 'synth' && !knownSoundKeys.has(sc.soundKey)) {
        problems.push(`geluid ${sc.id}: soundKey "${sc.soundKey}" bestaat niet in soundEngine`);
      }
    }

    for (const e of store.getEstimateChallenges()) {
      const steps = (e.correctValue - e.min) / e.step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6) {
        problems.push(`schatting ${e.id}: antwoord ligt niet op de schuifbalk-stap`);
      }
    }

    expect(problems).toEqual([]);
  });

  it('14. Roos-opnamen: de lijst komt uit de bestanden in de map (niet uit een verouderd manifest), met versie en zonder vreemde namen', async () => {
    const ttsDir = path.join(tmpDataDir, 'tts');
    fs.mkdirSync(ttsDir, { recursive: true });
    fs.writeFileSync(path.join(ttsDir, '0123456789abcdef.mp3'), 'x');
    fs.writeFileSync(path.join(ttsDir, 'fedcba9876543210.mp3'), 'x');
    fs.writeFileSync(path.join(ttsDir, 'notities.txt'), 'x');
    fs.writeFileSync(path.join(ttsDir, 'kort.mp3'), 'x'); // geen geldige hash-naam
    fs.writeFileSync(path.join(ttsDir, 'ABCDEF0123456789.mp3'), 'x'); // hoofdletters horen er niet bij
    // verouderd manifest: noemt een bestand dat er niet is en mist de twee echte
    fs.writeFileSync(
      path.join(ttsDir, 'manifest.json'),
      JSON.stringify({
        voiceName: 'Roos (NL)',
        modelId: 'eleven_flash_v2_5',
        targetLufs: -16,
        count: 1,
        hashes: ['aaaaaaaaaaaaaaaa'],
      })
    );

    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const getManifest = async () => (await fetch(`${baseUrl}/api/tts/manifest`)).json();

    const first = await getManifest();
    expect(first.hashes).toEqual(['0123456789abcdef', 'fedcba9876543210']);
    expect(first.count).toBe(2);
    expect(first.voiceName).toBe('Roos (NL)');
    expect(first.modelId).toBe('eleven_flash_v2_5');
    expect(typeof first.version).toBe('string');

    // Een nieuwe opname erbij verschijnt zonder dat manifest.json wordt bijgewerkt, en de versie verandert
    fs.writeFileSync(path.join(ttsDir, '1111111111111111.mp3'), 'x');
    const second = await getManifest();
    expect(second.hashes).toContain('1111111111111111');
    expect(second.version).not.toBe(first.version);

    // Een opname vervangen door een nieuwere versie (zelfde naam) verandert de versie ook:
    // zo halen telefoons en tablets, die opnames lang bewaren, de nieuwe op
    const later = new Date(Date.now() + 60_000);
    fs.utimesSync(path.join(ttsDir, '0123456789abcdef.mp3'), later, later);
    const third = await getManifest();
    expect(third.version).not.toBe(second.version);

    // De opnames worden zelf ook geserveerd
    const clip = await fetch(`${baseUrl}/tts/0123456789abcdef.mp3?v=${third.version}`);
    expect(clip.status).toBe(200);

    await new Promise<void>((resolve) =>
      serverInstance.httpServer.close(() => resolve())
    );

    // Zonder map: lege lijst in plaats van een fout
    expect(readTtsClips(path.join(tmpDataDir, 'bestaat-niet')).hashes).toEqual([]);
  });

  it('15. Elke vaste TV-zin in de app staat ook in het opname-script (anders klinkt die met de computerstem)', () => {
    const tvSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../client/src/components/tv/TvApp.tsx'),
      'utf-8'
    );
    const genSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../scripts/generate-tts.py'),
      'utf-8'
    );

    const listStart = genSrc.indexOf('TV_ANNOUNCEMENTS = [');
    const listBlock = genSrc.slice(listStart, genSrc.indexOf('\n]', listStart));
    const scriptPhrases = new Set([...listBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
    expect(scriptPhrases.size).toBeGreaterThanOrEqual(10);

    const introStart = tvSrc.indexOf('const TV_ROUND_INTRO_VOICE');
    const introBlock = tvSrc.slice(introStart, tvSrc.indexOf('};', introStart));
    const spoken = new Set<string>([
      ...[...introBlock.matchAll(/'([^'\n]{12,})'/g)].map((m) => m[1]),
      ...[...tvSrc.matchAll(/speechService\.speak\(\s*'([^']+)'/g)].map((m) => m[1]),
    ]);
    expect(spoken.size).toBeGreaterThanOrEqual(10);

    const missing = [...spoken].filter((t) => !scriptPhrases.has(t));
    expect(missing, 'TV-zinnen zonder opname in scripts/generate-tts.py').toEqual([]);
  });

  it('16. Buzzer-time-out: zonder oordeel van de host komt de buzzer na de wachttijd weer vrij (Zoom-in en Pantomime)', () => {
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);
    const join = (profileId: string, name: string, avatarId: string, level: 'ontdekker' | 'avonturier' | 'meester') =>
      engine.joinOrReconnectPlayer({ profileId, name, avatarId, level }).player;
    const papa = join('profile_papa', 'Papa', 'showmaster', 'meester');
    const lucas = join('profile_lucas', 'Lucas', 'trex', 'ontdekker');
    const lana = join('profile_lana', 'Lana', 'unicorn', 'avonturier');
    const T = TIMERS.JUDGE_TIMEOUT_SEC;

    // --- Zoom-in
    engine.configureGame({ gameMode: 'solo', totalRounds: 6, enabledRoundTypes: ['zoom_photo'] });
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    expect(engine.handleZoomBuzz(lucas.id)).toBe(true);
    expect(engine.getStateForClient(papa.id).activeRound?.judgeRemainingSec).toBe(T);
    engine.advanceJudgeWait(T - 1);
    expect(engine.getStateForClient(undefined).activeRound?.zoomBuzzedPlayerId).toBe(lucas.id);
    expect(engine.getStateForClient(undefined).activeRound?.judgeRemainingSec).toBe(1);
    engine.advanceJudgeWait(1);
    expect(engine.getStateForClient(undefined).activeRound?.zoomBuzzedPlayerId).toBeNull();
    expect(engine.getStateForClient(undefined).activeRound?.judgeRemainingSec).toBeUndefined();
    // geen straf: Lucas mag meteen weer buzzen, en de wachttijd begint opnieuw
    expect(engine.handleZoomBuzz(lucas.id)).toBe(true);
    engine.advanceJudgeWait(T - 1);
    expect(engine.getStateForClient(undefined).activeRound?.zoomBuzzedPlayerId).toBe(lucas.id);
    // een oordeel van de host werkt gewoon
    engine.handleHostJudgeZoom(true);
    expect(engine.phase).toBe('ROUND_REVEAL');
    // na de ronde doet de wachttijd niets meer
    engine.advanceJudgeWait(T * 2);
    expect(engine.phase).toBe('ROUND_REVEAL');

    // --- Pantomime: tijdens een pauze loopt de wachttijd niet door
    engine.handleHostControl('reset');
    engine.configureGame({ enabledRoundTypes: ['pantomime'] });
    engine.startGame();
    engine.enterRoundIntro();
    engine.enterRoundActive();
    const actorId = engine.getStateForClient(undefined).activeRound!.pantomimeActorId!;
    const guesser = [papa, lucas, lana].find((p) => p.id !== actorId)!;
    engine.startPantomimeTurn(actorId);
    expect(engine.handlePantomimeBuzz(guesser.id)).toBe(true);
    engine.handleHostControl('pause');
    engine.advanceJudgeWait(T * 2);
    engine.handleHostControl('resume');
    expect(engine.getStateForClient(undefined).activeRound?.pantomimeBuzzedPlayerId).toBe(guesser.id);
    engine.advanceJudgeWait(T);
    expect(engine.getStateForClient(undefined).activeRound?.pantomimeBuzzedPlayerId).toBeNull();
    expect(engine.phase).toBe('ROUND_ACTIVE');
  });

  it('17. Verbeterde standaardvragen bereiken bestaande installaties, eigen aanpassingen blijven staan', async () => {
    // Bestaande installatie: data-map met de OUDE versie van qz_mee_176 (zoals die vroeger in de seed stond)
    // en een vraag die de gebruiker zelf heeft aangepast.
    const seedQuiz = JSON.parse(fs.readFileSync(path.join(seedDir, 'quiz.json'), 'utf-8')) as Array<{
      id: string;
      prompt: string;
      spokenPrompt?: string;
    }>;
    const fixed = seedQuiz.find((q) => q.id === 'qz_mee_176')!;
    const oldVersion = {
      ...fixed,
      prompt: fixed.prompt.replace('"De Herberg"', '"Ganzenbord"'),
      spokenPrompt: fixed.spokenPrompt?.replace('"De Herberg"', '"Ganzenbord"'),
    };
    const userEdited = { ...seedQuiz[0], prompt: 'Onze eigen vraag over opa?' };
    const dataQuiz = seedQuiz.map((q) =>
      q.id === oldVersion.id ? oldVersion : q.id === userEdited.id ? userEdited : q
    );
    fs.writeFileSync(path.join(tmpDataDir, 'quiz.json'), JSON.stringify(dataQuiz));

    const store = new DataStore(tmpDataDir, seedDir);
    const after = store.getQuizQuestions();
    expect(after.find((q) => q.id === 'qz_mee_176')!.prompt).toBe(fixed.prompt); // bijgewerkt
    expect(after.find((q) => q.id === userEdited.id)!.prompt).toBe('Onze eigen vraag over opa?'); // blijft
    // ook op schijf bijgewerkt, en een tweede keer verandert er niets meer
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDataDir, 'quiz.json'), 'utf-8'));
    expect(onDisk.find((q: { id: string }) => q.id === 'qz_mee_176').prompt).toBe(fixed.prompt);
    expect(store.syncUpdatedSeedItems().total).toBe(0);

    // Een installatie van vóór de seizoensuitbreiding (seed 2.1.0) krijgt de nieuwe vragen bij de volgende start
    const oldDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huiskamer-oud-'));
    try {
      const withoutNew = seedQuiz.filter((q) => !['qz_ont_271', 'qz_avo_361', 'qz_mee_451'].includes(q.id));
      fs.writeFileSync(path.join(oldDir, 'quiz.json'), JSON.stringify(withoutNew));
      fs.writeFileSync(
        path.join(oldDir, 'config.json'),
        JSON.stringify({ ...JSON.parse(fs.readFileSync(path.join(tmpDataDir, 'config.json'), 'utf-8')), seedVersion: '2.1.0' })
      );
      const upgraded = new DataStore(oldDir, seedDir);
      const ids = new Set(upgraded.getQuizQuestions().map((q) => q.id));
      expect(ids.has('qz_ont_271') && ids.has('qz_avo_361') && ids.has('qz_mee_451')).toBe(true);
      expect(upgraded.getConfig().seedVersion).not.toBe('2.1.0');
    } finally {
      fs.rmSync(oldDir, { recursive: true, force: true });
    }

    // seed-history.json moet passen bij de git-geschiedenis (alleen als die er is)
    const repoRoot = path.resolve(__dirname, '../../..');
    if (fs.existsSync(path.join(repoRoot, '.git'))) {
      const { execFileSync } = await import('child_process');
      const out = execFileSync(
        process.execPath,
        [path.join(repoRoot, 'node_modules/tsx/dist/cli.mjs'), path.join(repoRoot, 'scripts/build-seed-history.ts'), '--check'],
        { cwd: repoRoot }
      ).toString();
      expect(out).toContain('actueel');
    }
  });

  it('18. Seizoenspakket: gaat automatisch aan op datum (zelfde grenzen als de TV-thema\'s), host kan het overrulen, seizoensvragen gaan voor', async () => {
    const { themeForDate } = await import('../../../client/src/theme/seasons');
    const packForTheme: Record<string, string | null> = {
      sint: 'sinterklaas',
      kerst: 'kerst',
      zomer: 'zomer',
      winter: null,
      lente: null,
      herfst: null,
    };
    for (let day = 0; day < 366; day++) {
      const d = new Date(2028, 0, 1 + day, 12);
      expect(seasonalPackForDate(d), d.toDateString()).toBe(packForTheme[themeForDate(d).id]);
    }

    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);
    engine.clock = () => new Date(2026, 10, 25, 12); // 25 november: Sinterklaas
    engine.joinOrReconnectPlayer({ profileId: 'profile_lucas', name: 'Lucas', avatarId: 'trex', level: 'ontdekker' });
    engine.joinOrReconnectPlayer({ profileId: 'profile_papa', name: 'Papa', avatarId: 'showmaster', level: 'meester' });
    engine.configureGame({ gameMode: 'solo', totalRounds: 10, enabledRoundTypes: ['quiz'] });
    engine.startGame();
    expect(engine.settings.enabledPacks).toEqual(['basis', 'kids_special', 'sinterklaas']);

    // Seizoensvragen gaan voor: speel rondes tot een categorie met Sinterklaas-vragen voor Lucas valt
    const sintIds = new Set(
      store.getQuizQuestions().filter((q) => q.packId === 'sinterklaas').map((q) => q.id)
    );
    let sawSeasonal = false;
    for (let round = 0; round < 10 && !sawSeasonal; round++) {
      if (round > 0) {
        engine.enterScoreboard();
        engine.startNextRoundWheel();
      }
      engine.enterRoundIntro();
      engine.enterRoundActive();
      const st = engine.getStateForClient(engine.players[0].id);
      const qid = st.privateView?.myQuizQuestion?.id;
      const cat = engine.currentCategory;
      const seasonalAvailable = store
        .getQuizQuestions()
        .some((q) => q.packId === 'sinterklaas' && q.level === 'ontdekker' && q.category === cat);
      if (seasonalAvailable) {
        expect(sintIds.has(qid!)).toBe(true);
        sawSeasonal = true;
      }
      engine.finishQuizRound();
    }
    expect(sawSeasonal).toBe(true);

    // In het voorjaar doet er geen seizoenspakket mee
    engine.handleHostControl('reset');
    engine.clock = () => new Date(2027, 3, 10, 12);
    engine.startGame();
    expect(engine.settings.enabledPacks).toEqual(['basis', 'kids_special']);

    // Kiest de host zelf pakketten, dan blijft die keuze staan, ook als het seizoen wisselt
    engine.handleHostControl('reset');
    engine.configureGame({ enabledPacks: ['basis', 'verjaardag'] });
    engine.clock = () => new Date(2026, 11, 20, 12); // kerst
    engine.startGame();
    expect(engine.settings.enabledPacks).toEqual(['basis', 'verjaardag']);
  });

  it('19. Roos-opnames vanuit /admin: status, zonder sleutel geweigerd, met (nagebootste) ElevenLabs gemaakt en even hard', async () => {
    const { spawnSync } = await import('child_process');
    const hasTools =
      spawnSync('python3', ['--version']).status === 0 &&
      spawnSync('ffmpeg', ['-version']).status === 0;
    if (!hasTools) return; // zonder python3/ffmpeg kan dit deel niet draaien

    const repoEnv = path.resolve(__dirname, '../../../.env');
    const repoEnvHasKey =
      fs.existsSync(repoEnv) && /ELEVENLABS_API_KEY=\S+/.test(fs.readFileSync(repoEnv, 'utf-8'));
    const savedKey = process.env.ELEVENLABS_API_KEY;
    const savedBase = process.env.ELEVENLABS_API_BASE;
    delete process.env.ELEVENLABS_API_KEY;

    const serverInstance = await createAppServer({
      dataDir: tmpDataDir,
      seedDir,
      port: 0,
      autoAdvanceTimers: false,
      deterministicMode: true,
    });
    await new Promise<void>((resolve) => {
      serverInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = serverInstance.httpServer.address() as { port: number };
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const json = { 'Content-Type': 'application/json' };

    const status1 = await (await fetch(`${baseUrl}/api/admin/tts/status`)).json();
    expect(status1.toolsAvailable).toBe(true);
    expect(status1.missingCount).toBeGreaterThan(0); // lege data-map: nog niets opgenomen
    expect(status1.total).toBe(status1.missingCount);
    if (!repoEnvHasKey) {
      expect(status1.keyConfigured).toBe(false);
      const noKey = await fetch(`${baseUrl}/api/admin/tts/generate`, { method: 'POST', headers: json, body: '{}' });
      expect(noKey.status).toBe(400);
    }

    // Nagebootste ElevenLabs: geeft een (zachte) synthetische opname terug
    const fakeMp3 = path.join(tmpDataDir, 'nep.mp3');
    spawnSync('ffmpeg', [
      '-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i',
      "aevalsrc='0.3*sin(2*PI*200*t)+0.2*sin(2*PI*900*t)':s=44100:d=1.0",
      '-af', 'volume=-20dB', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k', fakeMp3,
    ]);
    const mp3 = fs.readFileSync(fakeMp3);
    let ttsCalls = 0;
    const fake = http.createServer((req, res) => {
      if (req.url?.startsWith('/v1/user/subscription')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ character_count: 0, character_limit: 100000 }));
        return;
      }
      if (req.url?.startsWith('/v1/text-to-speech/')) {
        ttsCalls += 1;
        req.resume();
        req.on('end', () => {
          res.setHeader('Content-Type', 'audio/mpeg');
          res.setHeader('character-cost', '10');
          res.end(mp3);
        });
        return;
      }
      res.statusCode = 404;
      res.end();
    });
    await new Promise<void>((resolve) => fake.listen(0, '127.0.0.1', () => resolve()));
    process.env.ELEVENLABS_API_KEY = 'test-sleutel';
    process.env.ELEVENLABS_API_BASE = `http://127.0.0.1:${(fake.address() as { port: number }).port}`;

    try {
      const started = await fetch(`${baseUrl}/api/admin/tts/generate`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ limit: 2 }),
      });
      expect(started.status).toBe(202);

      let jobState: { running: boolean; exitCode?: number; lines: string[] } = { running: true, lines: [] };
      for (let i = 0; i < 240 && jobState.running; i++) {
        await new Promise((r) => setTimeout(r, 250));
        jobState = await (await fetch(`${baseUrl}/api/admin/tts/job`)).json();
      }
      expect(jobState.running).toBe(false);
      expect(jobState.exitCode, jobState.lines.join('\n')).toBe(0);
      expect(ttsCalls).toBe(2);

      const clips = fs
        .readdirSync(path.join(tmpDataDir, 'tts'))
        .filter((f) => /^[0-9a-f]{16}\.mp3$/.test(f));
      expect(clips.length).toBe(2);
      const manifest = await (await fetch(`${baseUrl}/api/tts/manifest`)).json();
      expect(manifest.count).toBe(2);
      // de opnames zijn bewerkt: de log meldt de geluidssterkte rond -16 LUFS
      const loudLine = jobState.lines.find((l) => l.includes('Geluidssterkte nieuwe opnames')) || '';
      const nums = [...loudLine.matchAll(/(-?\d+\.\d+) tot (-?\d+\.\d+) LUFS/g)][0];
      expect(nums).toBeTruthy();
      expect(Math.abs(parseFloat(nums![1]) + 16)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(parseFloat(nums![2]) + 16)).toBeLessThanOrEqual(0.5);

      const status2 = await (await fetch(`${baseUrl}/api/admin/tts/status`)).json();
      expect(status2.missingCount).toBe(status1.missingCount - 2);
    } finally {
      if (savedKey === undefined) delete process.env.ELEVENLABS_API_KEY;
      else process.env.ELEVENLABS_API_KEY = savedKey;
      if (savedBase === undefined) delete process.env.ELEVENLABS_API_BASE;
      else process.env.ELEVENLABS_API_BASE = savedBase;
      await new Promise<void>((resolve) => fake.close(() => resolve()));
      await new Promise<void>((resolve) => serverInstance.httpServer.close(() => resolve()));
    }
  }, 120_000);

  it('20. Tussendoortjes: elke 5 tot 10 vragen een animatie van 3 s, niet voor de finale, zonder herhaling, seizoensanimaties alleen in hun seizoen', async () => {
    // --- de catalogus
    expect(INTERMISSIONS.length).toBeGreaterThanOrEqual(50);
    expect(new Set(INTERMISSIONS.map((a) => a.id)).size).toBe(INTERMISSIONS.length);
    const illSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../client/src/components/illustrations/IllustrationLibrary.tsx'),
      'utf-8'
    );
    const illustrations = new Set([...illSrc.matchAll(/case '([a-z_]+)':/g)].map((m) => m[1]));
    const stageSrc = fs.readFileSync(
      path.resolve(__dirname, '../../../client/src/components/intermission/IntermissionStage.tsx'),
      'utf-8'
    );
    for (const a of INTERMISSIONS) {
      for (const id of [...a.cast, ...(a.extras ?? [])]) {
        expect(illustrations.has(id), `${a.id}: illustratie ${id}`).toBe(true);
      }
      expect(stageSrc.includes(`  ${a.template}: `), `${a.id}: sjabloon ${a.template}`).toBe(true);
      expect(a.caption.length, a.id).toBeLessThanOrEqual(26);
    }
    for (const season of ['sint', 'kerst', 'winter', 'lente', 'zomer', 'herfst']) {
      expect(INTERMISSIONS.filter((a) => a.season === season).length).toBeGreaterThanOrEqual(2);
    }
    const { themeForDate } = await import('../../../client/src/theme/seasons');
    for (let day = 0; day < 366; day++) {
      const d = new Date(2028, 0, 1 + day, 12);
      expect(seasonThemeForDate(d), d.toDateString()).toBe(themeForDate(d).id);
    }

    // --- in het spel (vast interval van 5 in tests)
    const store = new DataStore(tmpDataDir, seedDir);
    const engine = new GameEngine(store, () => {}, () => {}, false, true);
    engine.clock = () => new Date(2026, 10, 25, 12); // Sinterklaas
    engine.joinOrReconnectPlayer({ profileId: 'profile_papa', name: 'Papa', avatarId: 'showmaster', level: 'meester' });
    engine.configureGame({ gameMode: 'solo', totalRounds: 12, enabledRoundTypes: ['quiz'] });
    engine.startGame();

    const after: string[] = [];
    const seen: string[] = [];
    for (let round = 1; round <= 12; round++) {
      engine.enterRoundIntro();
      engine.enterRoundActive();
      engine.finishQuizRound();
      engine.enterScoreboard();
      engine.afterScoreboard();
      after.push(engine.phase);
      if (engine.phase === 'INTERMISSION') {
        const st = engine.getStateForClient(undefined);
        expect(st.intermissionId).toBeTruthy();
        expect(st.activeRound?.timerTotalSec).toBe(TIMERS.INTERMISSION_SEC);
        expect(engine.getStateForClient(engine.players[0].id).intermissionId).toBe(st.intermissionId);
        seen.push(st.intermissionId!);
        // eerste keer na 3 s vanzelf door, tweede keer met "Overslaan" van de host
        if (seen.length === 1) engine.startNextRoundWheel();
        else engine.handleHostControl('skip');
        expect(engine.phase).toBe('WHEEL_SPIN');
      }
      if (engine.phase === 'FINALE') break;
    }
    expect(after.indexOf('INTERMISSION')).toBe(4); // na vraag 5
    expect(after.filter((p) => p === 'INTERMISSION').length).toBe(2); // na 5 en 10
    expect(after[after.length - 1]).toBe('FINALE'); // na de laatste vraag meteen de finale
    expect(new Set(seen).size).toBe(seen.length);
    for (const id of seen) {
      const season = INTERMISSION_MAP[id].season;
      expect(!season || season === 'sint').toBe(true);
    }

    // --- buiten de tests: elke keer willekeurig tussen 5 en 10
    const live = new GameEngine(store, () => {}, () => {}, false, false);
    const intervals = new Set<number>();
    for (let i = 0; i < 400; i++) {
      intervals.add((live as unknown as { drawIntermissionInterval(): number }).drawIntermissionInterval());
    }
    expect(Math.min(...intervals)).toBe(TIMERS.INTERMISSION_EVERY_MIN);
    expect(Math.max(...intervals)).toBe(TIMERS.INTERMISSION_EVERY_MAX);

    // --- geen herhaling tot alles geweest is, en seizoensanimaties alleen in hun seizoen
    const winterEngine = new GameEngine(store, () => {}, () => {}, false, false);
    winterEngine.clock = () => new Date(2027, 1, 1, 12); // winter
    const picks: string[] = [];
    const eligible = INTERMISSIONS.filter((a) => !a.season || a.season === 'winter').length;
    for (let i = 0; i < eligible; i++) {
      picks.push((winterEngine as unknown as { nextIntermissionId(): string }).nextIntermissionId());
    }
    expect(new Set(picks).size).toBe(eligible);
    expect(picks.every((id) => !INTERMISSION_MAP[id].season || INTERMISSION_MAP[id].season === 'winter')).toBe(true);
    expect(picks.some((id) => INTERMISSION_MAP[id].season === 'winter')).toBe(true);
  });
});
