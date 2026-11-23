import cors from 'cors';
import express from 'express';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import QRCode from 'qrcode';
import { Server as SocketIOServer } from 'socket.io';
import { DifficultyLevel, SfxCue } from '@huiskamer-show/shared';
import { GameEngine } from './engine/GameEngine';
import { createAdminRouter } from './routes/adminApi';
import { DataStore } from './storage/DataStore';

const VALID_LEVELS = new Set<string>(['ontdekker', 'avonturier', 'meester']);

/** Korte, veilige tekst uit een socket-bericht (geen onbeperkte lengtes). */
function cleanText(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLen);
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Een TV mag het QR-adres alleen aanpassen naar het adres waarmee hij zelf verbonden is.
 * Zo kan een ander apparaat in het netwerk de QR-code niet naar een vreemde site laten wijzen.
 */
function originMatchesHandshake(
  origin: string,
  headers: Record<string, string | string[] | undefined>
): boolean {
  try {
    const originHost = new URL(origin).host;
    const hostHeader = headers.host;
    const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
    return Boolean(host) && originHost === host;
  } catch {
    return false;
  }
}

function getLocalLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

export async function createAppServer(options?: {
  dataDir?: string;
  seedDir?: string;
  port?: number;
  autoAdvanceTimers?: boolean;
  deterministicMode?: boolean;
}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof SyntaxError && 'body' in err) {
        res.status(400).json({ error: 'Ongeldige JSON in verzoek.' });
        return;
      }
      next(err);
    }
  );

  const store = new DataStore(options?.dataDir, options?.seedDir);
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  const tvSockets = new Set<string>();

  const broadcastState = () => {
    // 1. Send public show state to all TV clients
    const tvState = engine.getStateForClient(undefined);
    for (const tvSid of tvSockets) {
      io.to(tvSid).emit('state:update', tvState);
    }

    // 2. Send personalized adaptive state to each connected player socket
    for (const [sid, socket] of io.of('/').sockets) {
      if (tvSockets.has(sid)) continue;
      const pid = engine.roomManager.getPlayerIdBySocket(sid);
      const clientState = engine.getStateForClient(pid);
      socket.emit('state:update', clientState);
    }
  };

  const emitTvSfx = (cue: SfxCue, key?: string) => {
    if (engine.tvMuted) return;
    // Only send TV sound effects to TV clients (or all if no TV joined yet for testing)
    if (tvSockets.size > 0) {
      for (const tvSid of tvSockets) {
        io.to(tvSid).emit('tv:sfx', { cue, key });
      }
    } else {
      io.emit('tv:sfx', { cue, key });
    }
  };

  const engine = new GameEngine(
    store,
    broadcastState,
    emitTvSfx,
    options?.autoAdvanceTimers ?? true,
    options?.deterministicMode ?? false
  );

  const port = options?.port ?? Number(process.env.PORT || 3000);
  const lanIp = getLocalLanIp();
  const defaultBaseUrl =
    process.env.PUBLIC_URL && process.env.PUBLIC_URL.trim().length > 0
      ? process.env.PUBLIC_URL.trim().replace(/\/$/, '')
      : `http://${lanIp}:${port}`;

  const updateQrCode = async (baseUrl: string) => {
    const playUrl = `${baseUrl.replace(/\/$/, '')}/play`;
    engine.qrUrl = playUrl;
    try {
      engine.qrDataUrl = await QRCode.toDataURL(playUrl, {
        margin: 1,
        width: 280,
        color: {
          dark: '#0F2A3A',
          light: '#FFFFFF',
        },
      });
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  };

  await updateQrCode(defaultBaseUrl);

  // Static uploads (images & audio only, no HTML execution via Content-Disposition/nosniff)
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(store.uploadsDir)
  );

  // Pre-recorded ElevenLabs Dutch studio TTS audio clips (loudness-normalized -16 LUFS)
  const ttsDir = path.join(store.dataDir, 'tts');
  app.use(
    '/tts',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(ttsDir, { maxAge: '365d', immutable: true })
  );

  // Per-question generated 3D artwork (served from data/qart/<questionId>.jpg or client/dist/qart/)
  const qartDir = path.join(store.dataDir, 'qart');
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  const bundledQartDir = path.join(clientDistPath, 'qart');

  app.use(
    '/qart',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    express.static(qartDir, { maxAge: '365d', immutable: true }),
    express.static(bundledQartDir, { maxAge: '365d', immutable: true })
  );

  app.get('/api/qart/manifest', (_req, res) => {
    const idSet = new Set<string>();
    for (const dir of [bundledQartDir, qartDir]) {
      try {
        if (fs.existsSync(dir)) {
          for (const f of fs.readdirSync(dir)) {
            if (/\.(jpg|webp|png)$/i.test(f)) {
              idSet.add(f.replace(/\.(jpg|webp|png)$/i, ''));
            }
          }
        }
      } catch {
        // ignore
      }
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.json({ count: idSet.size, ids: Array.from(idSet) });
  });

  app.get('/api/tts/manifest', (_req, res) => {
    const manifestPath = path.join(ttsDir, 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(raw);
        return;
      } catch {
        // fall through to empty manifest
      }
    }
    res.json({ count: 0, hashes: [] });
  });

  // Admin & Health API
  app.use('/api', createAdminRouter(store, () => broadcastState()));

  // Serve built client in production
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/tts') ||
        req.path.startsWith('/qart')
      ) {
        next();
        return;
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Vangnet voor onverwachte fouten in routes: een nette JSON-melding, geen stacktrace naar de browser
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error('Onverwachte serverfout:', err);
      if (res.headersSent) return;
      res.status(500).json({ error: 'Er ging iets mis op de server.' });
    }
  );

  // Helper to verify host permission on socket events
  const requireHost = (socketId: string): boolean => {
    const pid = engine.roomManager.getPlayerIdBySocket(socketId);
    return engine.isPlayerHost(pid);
  };

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    // Send initial state immediately
    socket.emit('state:update', engine.getStateForClient(undefined));

    socket.on('tv:join', async (payload?: { origin?: string }) => {
      tvSockets.add(socket.id);
      if (
        (!process.env.PUBLIC_URL || process.env.PUBLIC_URL.trim() === '') &&
        typeof payload?.origin === 'string' &&
        /^https?:\/\/[^/\s]+$/i.test(payload.origin.trim()) &&
        originMatchesHandshake(payload.origin.trim(), socket.handshake.headers) &&
        !payload.origin.includes('localhost') &&
        !payload.origin.includes('127.0.0.1')
      ) {
        await updateQrCode(payload.origin.trim());
      }
      socket.emit('state:update', engine.getStateForClient(undefined));
    });

    socket.on('player:join', (payload, ack?: (res: unknown) => void) => {
      try {
        if (!payload || typeof payload !== 'object') return;
        // If this socket was previously bound to a different player, unbind cleanly
        const prevPid = engine.roomManager.getPlayerIdBySocket(socket.id);

        // Strip any client-supplied isHost — server derives Host/Co-Host strictly!
        const { player, sessionToken } = engine.joinOrReconnectPlayer({
          profileId: cleanText(payload.profileId, 64),
          name: cleanText(payload.name, 24) || 'Gast',
          avatarId: cleanText(payload.avatarId, 64) || 'star',
          level: (VALID_LEVELS.has(payload.level)
            ? payload.level
            : undefined) as DifficultyLevel,
          sessionToken: cleanText(payload.sessionToken, 128),
        });

        engine.roomManager.bindSocket(socket.id, player.id);

        if (
          prevPid &&
          prevPid !== player.id &&
          !engine.roomManager.isPlayerConnectedOnAnySocket(prevPid)
        ) {
          engine.leavePlayer(prevPid);
        }

        const sessionResponse = {
          playerId: player.id,
          sessionToken,
          player,
        };
        socket.emit('player:session', sessionResponse);
        if (typeof ack === 'function') {
          ack(sessionResponse);
        }
        broadcastState();
      } catch (err) {
        console.error('Error in player:join:', err);
      }
    });

    socket.on('player:leave', () => {
      const pid = engine.roomManager.unbindSocket(socket.id);
      if (pid && !engine.roomManager.isPlayerConnectedOnAnySocket(pid)) {
        engine.leavePlayer(pid);
      }
      broadcastState();
    });

    socket.on('player:claimHost', () => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid) {
        engine.claimHost(pid);
      }
    });

    socket.on('host:configure', (payload) => {
      if (!requireHost(socket.id)) return;
      engine.configureGame(payload || {});
    });

    socket.on('host:startGame', () => {
      if (!requireHost(socket.id)) return;
      engine.startGame();
    });

    socket.on('host:resumeSavedSession', () => {
      if (!requireHost(socket.id)) return;
      engine.resumeSavedSession();
    });

    socket.on('host:togglePlayerPause', (payload: { playerId?: string }) => {
      if (!requireHost(socket.id)) return;
      if (typeof payload?.playerId === 'string') {
        engine.togglePlayerPause(payload.playerId);
      }
    });

    socket.on('host:kickPlayer', (payload: { playerId?: string }) => {
      if (!requireHost(socket.id)) return;
      const callerPid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (
        typeof payload?.playerId === 'string' &&
        payload.playerId !== callerPid
      ) {
        engine.kickPlayer(payload.playerId);
      }
    });

    socket.on('host:selectGuessers', (payload: { playerIds?: string[] }) => {
      if (!requireHost(socket.id)) return;
      if (Array.isArray(payload?.playerIds)) {
        engine.selectThirtySecondsGuessers(payload.playerIds);
      }
    });

    socket.on('quiz:answer', (payload: { optionId: string }) => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid && typeof payload?.optionId === 'string') {
        engine.submitQuizAnswer(pid, payload.optionId);
      }
    });

    socket.on('thirtySeconds:start', () => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid) {
        engine.startThirtySecondsTurn(pid);
      }
    });

    socket.on(
      'thirtySeconds:mark',
      (payload: {
        itemId?: string;
        status: 'guessed' | 'skipped' | 'pending';
      }) => {
        const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
        if (
          pid &&
          (payload?.status === 'guessed' ||
            payload?.status === 'skipped' ||
            payload?.status === 'pending')
        ) {
          engine.markThirtySecondsItem(pid, payload.itemId, payload.status);
        }
      }
    );

    socket.on('sound:answer', (payload: { optionId: string }) => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid && typeof payload?.optionId === 'string') {
        engine.submitSoundAnswer(pid, payload.optionId);
      }
    });

    socket.on('zoom:buzz', () => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid) {
        engine.handleZoomBuzz(pid);
      }
    });

    socket.on('pantomime:start', () => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid) {
        engine.startPantomimeTurn(pid);
      }
    });

    socket.on('pantomime:buzz', () => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid) {
        engine.handlePantomimeBuzz(pid);
      }
    });

    socket.on('estimate:submit', (payload: { value?: number }) => {
      const pid = engine.roomManager.getPlayerIdBySocket(socket.id);
      if (pid && typeof payload?.value === 'number' && !Number.isNaN(payload.value)) {
        engine.submitEstimateAnswer(pid, payload.value);
      }
    });

    socket.on('host:judge', (payload: { correct: boolean }) => {
      if (!requireHost(socket.id)) return;
      if (typeof payload?.correct === 'boolean') {
        engine.handleHostJudgeZoom(payload.correct);
      }
    });

    socket.on('host:control', (payload: { action: string }) => {
      if (!requireHost(socket.id)) return;
      if (typeof payload?.action === 'string') {
        engine.handleHostControl(payload.action);
      }
    });

    // Safe TV-side remote controls (e.g., LG Magic Remote buttons on /tv)
    const ALLOWED_TV_ACTIONS = new Set([
      'pause',
      'resume',
      'addTime',
      'skip',
      'toggleMute',
      'testSound',
      'replaySound',
    ]);
    socket.on('tv:control', (payload: { action?: string }) => {
      if (!tvSockets.has(socket.id)) return;
      if (
        typeof payload?.action === 'string' &&
        ALLOWED_TV_ACTIONS.has(payload.action)
      ) {
        engine.handleHostControl(payload.action);
      }
    });

    socket.on('disconnect', () => {
      tvSockets.delete(socket.id);
      const pid = engine.roomManager.unbindSocket(socket.id);
      if (pid && !engine.roomManager.isPlayerConnectedOnAnySocket(pid)) {
        engine.setPlayerConnected(pid, false);
      }
    });
  });

  return { app, httpServer, io, store, engine };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createAppServer({ port }).then(({ httpServer, io, engine }) => {
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`🎬 De Grote Huiskamer Show draait op http://0.0.0.0:${port}`);
      console.log(`📺 TV-Scherm:      ${engine.qrUrl.replace('/play', '/tv')}`);
      console.log(`📱 Spelerscherm:   ${engine.qrUrl}`);
      console.log(`⚙️ Gezins-Editor:  ${engine.qrUrl.replace('/play', '/admin')}`);
    });

    const shutdown = (signal: string) => {
      console.log(`\n🛑 ${signal} ontvangen, studio sluit netjes af...`);
      engine.clearTimers();
      io.close(() => {
        httpServer.close(() => {
          process.exit(0);
        });
      });
      setTimeout(() => process.exit(0), 3000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  });
}
