import fs from 'fs';
import os from 'os';
import path from 'path';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameStatePayload } from '@huiskamer-show/shared';
import { AwardsEngine } from '../engine/AwardsEngine';
import { GameEngine } from '../engine/GameEngine';
import { createAppServer } from '../index';
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
});
