import express from 'express';
import multer from 'multer';
import { z } from 'zod';
import { DataStore } from '../storage/DataStore';

const categoryEnum = z.enum([
  'dieren_dinos',
  'films_magie',
  'games_avontuur',
  'sport_eten',
  'wereld_raadsels',
  'ons_gezin',
]);

const levelEnum = z.enum(['ontdekker', 'avonturier', 'meester']);

const packEnum = z
  .enum([
    'basis',
    'sinterklaas',
    'kerst',
    'zomer',
    'verjaardag',
    'kids_special',
  ])
  .optional();

const optionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  illustrationId: z.string().optional(),
  imageUrl: z.string().optional(),
});

const quizBaseSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  level: levelEnum,
  packId: packEnum,
  prompt: z.string().min(1),
  spokenPrompt: z.string().optional(),
  options: z.array(optionSchema).min(2),
  correctOptionId: z.string().min(1),
  funFact: z.string().optional(),
});

const quizSchema = quizBaseSchema.refine(
  (q) => q.options.some((o) => o.id === q.correctOptionId),
  { message: 'correctOptionId moet overeenkomen met een van de opties' }
);

const thirtySecondsSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  level: levelEnum,
  packId: packEnum,
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        word: z.string().min(1),
        illustrationId: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .min(1),
});

const soundBaseSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  packId: packEnum,
  prompt: z.string().min(1),
  soundType: z.enum(['synth', 'file']),
  soundKey: z.string().min(1),
  options: z.array(optionSchema).min(2),
  correctOptionId: z.string().min(1),
});

const soundSchema = soundBaseSchema.refine(
  (s) => s.options.some((o) => o.id === s.correctOptionId),
  { message: 'correctOptionId moet overeenkomen met een van de opties' }
);

const zoomPhotoSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  packId: packEnum,
  answer: z.string().min(1),
  acceptedHints: z.array(z.string()).optional(),
  illustrationId: z.string().optional(),
  imageUrl: z.string().optional(),
  focalPoint: z
    .object({
      x: z.number().min(0).max(100),
      y: z.number().min(0).max(100),
    })
    .optional(),
});

const pantomimeSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  level: levelEnum,
  packId: packEnum,
  prompt: z.string().min(1),
  hint: z.string().min(1),
  illustrationId: z.string().min(1),
  imageUrl: z.string().optional(),
});

const estimateBaseSchema = z.object({
  id: z.string().optional(),
  category: categoryEnum,
  packId: packEnum,
  prompt: z.string().min(1),
  spokenPrompt: z.string().optional(),
  unit: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  correctValue: z.number(),
  illustrationId: z.string().min(1),
  funFact: z.string().optional(),
});

const estimateSchema = estimateBaseSchema.refine(
  (e) => e.min < e.max && e.correctValue >= e.min && e.correctValue <= e.max,
  { message: 'correctValue moet tussen min en max liggen (en min < max)' }
);

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  ageLabel: z.string().min(1),
  level: levelEnum,
  defaultAvatarId: z.string().min(1),
  avatarOptions: z.array(z.string().min(1)).min(1),
  color: z.string().min(1),
  isHostDefault: z.boolean(),
  isCoHostDefault: z.boolean(),
  autoSpeak: z.boolean(),
});

const configSchema = z.object({
  showTitle: z.string().min(1),
  subtitle: z.string().min(1),
  profiles: z.array(profileSchema).min(1),
  adminPinEnabled: z.boolean().optional(),
});

const backupSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  config: configSchema.optional(),
  quizQuestions: z
    .array(quizBaseSchema.extend({ id: z.string().min(1) }))
    .optional(),
  thirtySecondsCards: z
    .array(thirtySecondsSchema.extend({ id: z.string().min(1) }))
    .optional(),
  soundChallenges: z
    .array(soundBaseSchema.extend({ id: z.string().min(1) }))
    .optional(),
  zoomPhotos: z
    .array(zoomPhotoSchema.extend({ id: z.string().min(1) }))
    .optional(),
  pantomimeChallenges: z
    .array(pantomimeSchema.extend({ id: z.string().min(1) }))
    .optional(),
  estimateChallenges: z
    .array(estimateBaseSchema.extend({ id: z.string().min(1) }))
    .optional(),
  hallOfFame: z
    .object({
      totalGamesPlayed: z.number(),
      coopWins: z.number(),
      highestScoreRecord: z
        .object({
          playerName: z.string(),
          score: z.number(),
          date: z.string(),
        })
        .nullable(),
      bestThirtySecondsRecord: z
        .object({
          playerName: z.string(),
          count: z.number(),
          date: z.string(),
        })
        .nullable(),
      playerLifetime: z.record(
        z.string(),
        z.object({
          name: z.string(),
          gamesPlayed: z.number(),
          wins: z.number(),
          totalScore: z.number(),
          totalStars: z.number(),
          awardsCount: z.number(),
        })
      ),
      recentGames: z.array(
        z.object({
          date: z.string(),
          gameMode: z.enum(['solo', 'duo_fixed', 'duo_rotating', 'coop']),
          winnerName: z.string(),
          topScore: z.number(),
        })
      ),
    })
    .optional(),
});

const ALLOWED_IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const ALLOWED_AUDIO_MIME_TO_EXT: Record<string, string> = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/wav': '.wav',
  'audio/x-wav': '.wav',
  'audio/wave': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'audio/x-m4a': '.m4a',
  'audio/webm': '.webm',
};

export function createAdminRouter(
  store: DataStore,
  onConfigUpdated: () => void
): express.Router {
  const router = express.Router();

  const imageStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, store.imagesDir),
    filename: (_req, file, cb) => {
      const ext =
        ALLOWED_IMAGE_MIME_TO_EXT[file.mimetype.toLowerCase()] || '.jpg';
      const safeName = `img_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}${ext}`;
      cb(null, safeName);
    },
  });

  const audioStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, store.audioDir),
    filename: (_req, file, cb) => {
      const ext =
        ALLOWED_AUDIO_MIME_TO_EXT[file.mimetype.toLowerCase()] || '.mp3';
      const safeName = `aud_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}${ext}`;
      cb(null, safeName);
    },
  });

  const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_MIME_TO_EXT[file.mimetype.toLowerCase()]) {
        cb(null, true);
      } else {
        cb(
          new Error(
            'Alleen PNG, JPG, WEBP of GIF afbeeldingen zijn toegestaan.'
          )
        );
      }
    },
  });

  const uploadAudio = multer({
    storage: audioStorage,
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_AUDIO_MIME_TO_EXT[file.mimetype.toLowerCase()]) {
        cb(null, true);
      } else {
        cb(
          new Error(
            'Alleen MP3, WAV, OGG, M4A of WebM audiobestanden zijn toegestaan.'
          )
        );
      }
    },
  });

  // Public Healthcheck & Hall of Fame
  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      counts: {
        quiz: store.getQuizQuestions().length,
        thirtySeconds: store.getThirtySecondsCards().length,
        sounds: store.getSoundChallenges().length,
        zoomPhotos: store.getZoomPhotos().length,
        pantomime: store.getPantomimeChallenges().length,
        estimates: store.getEstimateChallenges().length,
      },
    });
  });

  router.get('/stats', (_req, res) => {
    res.json(store.getHallOfFame());
  });

  // Public PIN Status & Verification endpoints
  router.get('/admin/pin-status', (_req, res) => {
    const cfg = store.getConfig();
    res.json({ pinRequired: Boolean(cfg.adminPinEnabled && cfg.adminPinHash) });
  });

  router.post('/admin/pin-verify', (req, res) => {
    const pin = String(req.body?.pin || '');
    const ok = store.verifyAdminPin(pin);
    if (!ok) {
      res.status(401).json({ valid: false, error: 'Onjuiste Ouder-PIN' });
      return;
    }
    res.json({ valid: true });
  });

  // Optional Parent PIN protection middleware for all other /admin/* routes
  router.use('/admin', (req, res, next) => {
    const pinHeader = req.header('X-Admin-Pin');
    if (!store.verifyAdminPin(pinHeader)) {
      res.status(401).json({ error: 'Ouder-PIN vereist voor Gezins-Editor' });
      return;
    }
    next();
  });

  // Full Admin Overview
  router.get('/admin/overview', (_req, res) => {
    res.json({
      config: store.getPublicConfig(),
      quizQuestions: store.getQuizQuestions(),
      thirtySecondsCards: store.getThirtySecondsCards(),
      soundChallenges: store.getSoundChallenges(),
      zoomPhotos: store.getZoomPhotos(),
      pantomimeChallenges: store.getPantomimeChallenges(),
      estimateChallenges: store.getEstimateChallenges(),
      hallOfFame: store.getHallOfFame(),
      playedHistoryCount: store.getPlayedHistoryCount(),
      backupSnapshots: store.listBackupSnapshots(),
    });
  });

  // Set or Disable 4-digit Parent PIN
  router.put('/admin/pin', (req, res) => {
    const pin = req.body?.pin ? String(req.body.pin).trim() : null;
    if (pin && !/^\d{4,8}$/.test(pin)) {
      res
        .status(400)
        .json({ error: 'Kies een pincode van 4 tot 8 cijfers (of leeg om uit te zetten).' });
      return;
    }
    const updated = store.setAdminPin(pin);
    onConfigUpdated();
    res.json({
      ...updated,
      pinRequired: Boolean(updated.adminPinEnabled),
    });
  });

  // Non-destructive sync of newly shipped default seed content
  router.post('/admin/sync-seeds', (_req, res) => {
    const summary = store.syncMissingSeedItems();
    onConfigUpdated();
    res.json({ status: 'synced', ...summary });
  });

  // Reset Played History
  router.post('/admin/reset-history', (_req, res) => {
    store.resetPlayedHistory();
    res.json({ status: 'reset', playedHistoryCount: 0 });
  });

  // Show Config & Family Profiles
  router.put('/admin/config', (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const saved = store.saveConfig(parsed.data);
    onConfigUpdated();
    res.json(saved);
  });

  // Quiz CRUD
  router.post('/admin/quiz', (req, res) => {
    const parsed = quizSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addQuizQuestion(parsed.data);
    res.status(201).json(created);
  });

  router.put('/admin/quiz/:id', (req, res) => {
    const parsed = quizBaseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (
      parsed.data.options &&
      parsed.data.correctOptionId &&
      !parsed.data.options.some((o) => o.id === parsed.data.correctOptionId)
    ) {
      res.status(400).json({
        error: 'correctOptionId moet overeenkomen met een van de opties',
      });
      return;
    }
    const updated = store.updateQuizQuestion(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Quizvraag niet gevonden' });
      return;
    }
    res.json(updated);
  });

  router.delete('/admin/quiz/:id', (req, res) => {
    const ok = store.deleteQuizQuestion(req.params.id);
    res.json({ deleted: ok });
  });

  // 30 Seconds CRUD
  router.post('/admin/thirty-seconds', (req, res) => {
    const parsed = thirtySecondsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addThirtySecondsCard(parsed.data);
    res.status(201).json(created);
  });

  router.put('/admin/thirty-seconds/:id', (req, res) => {
    const parsed = thirtySecondsSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = store.updateThirtySecondsCard(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Kaart niet gevonden' });
      return;
    }
    res.json(updated);
  });

  router.delete('/admin/thirty-seconds/:id', (req, res) => {
    const ok = store.deleteThirtySecondsCard(req.params.id);
    res.json({ deleted: ok });
  });

  // Sound Challenges CRUD
  router.post('/admin/sounds', (req, res) => {
    const parsed = soundSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addSoundChallenge(parsed.data);
    res.status(201).json(created);
  });

  router.put('/admin/sounds/:id', (req, res) => {
    const parsed = soundBaseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (
      parsed.data.options &&
      parsed.data.correctOptionId &&
      !parsed.data.options.some((o) => o.id === parsed.data.correctOptionId)
    ) {
      res.status(400).json({
        error: 'correctOptionId moet overeenkomen met een van de opties',
      });
      return;
    }
    const updated = store.updateSoundChallenge(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Geluidsuitdaging niet gevonden' });
      return;
    }
    res.json(updated);
  });

  router.delete('/admin/sounds/:id', (req, res) => {
    const ok = store.deleteSoundChallenge(req.params.id);
    res.json({ deleted: ok });
  });

  // Zoom Photos CRUD (+ Batch Wizard endpoint!)
  router.post('/admin/zoom-photos', (req, res) => {
    const parsed = zoomPhotoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addZoomPhoto(parsed.data);
    res.status(201).json(created);
  });

  router.post('/admin/zoom-photos/batch', (req, res) => {
    const batchSchema = z.object({
      items: z.array(zoomPhotoSchema).min(1),
    });
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const createdList = parsed.data.items.map((item) =>
      store.addZoomPhoto(item)
    );
    res.status(201).json({ count: createdList.length, items: createdList });
  });

  router.put('/admin/zoom-photos/:id', (req, res) => {
    const parsed = zoomPhotoSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = store.updateZoomPhoto(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Zoom-in foto niet gevonden' });
      return;
    }
    res.json(updated);
  });

  router.delete('/admin/zoom-photos/:id', (req, res) => {
    const ok = store.deleteZoomPhoto(req.params.id);
    res.json({ deleted: ok });
  });

  // Pantomime CRUD
  router.post('/admin/pantomime', (req, res) => {
    const parsed = pantomimeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addPantomimeChallenge(parsed.data);
    res.status(201).json(created);
  });

  router.put('/admin/pantomime/:id', (req, res) => {
    const parsed = pantomimeSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const updated = store.updatePantomimeChallenge(req.params.id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Pantomime-opdracht niet gevonden' });
      return;
    }
    res.json(updated);
  });

  router.delete('/admin/pantomime/:id', (req, res) => {
    const ok = store.deletePantomimeChallenge(req.params.id);
    res.json({ deleted: ok });
  });

  // Estimates CRUD
  router.post('/admin/estimates', (req, res) => {
    const parsed = estimateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const created = store.addEstimateChallenge(parsed.data);
    res.status(201).json(created);
  });

  router.put('/admin/estimates/:id', (req, res) => {
    const parsed = estimateBaseSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const existing = store
      .getEstimateChallenges()
      .find((e) => e.id === req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Schattingsvraag niet gevonden' });
      return;
    }
    const mergedMin = parsed.data.min ?? existing.min;
    const mergedMax = parsed.data.max ?? existing.max;
    const mergedVal = parsed.data.correctValue ?? existing.correctValue;
    if (mergedMin >= mergedMax || mergedVal < mergedMin || mergedVal > mergedMax) {
      res.status(400).json({
        error: 'correctValue moet tussen min en max liggen (en min < max)',
      });
      return;
    }
    const updated = store.updateEstimateChallenge(req.params.id, parsed.data);
    res.json(updated);
  });

  router.delete('/admin/estimates/:id', (req, res) => {
    const ok = store.deleteEstimateChallenge(req.params.id);
    res.json({ deleted: ok });
  });

  // Uploads (Strict Whitelisted Foto & Audio)
  router.post('/admin/upload/image', (req, res) => {
    uploadImage.single('file')(req, res, (err) => {
      if (err) {
        res
          .status(400)
          .json({ error: err.message || 'Ongeldig afbeeldingstype' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Geen afbeelding ontvangen' });
        return;
      }
      res.status(201).json({
        url: `/uploads/images/${req.file.filename}`,
        filename: req.file.filename,
      });
    });
  });

  router.post('/admin/upload/audio', (req, res) => {
    uploadAudio.single('file')(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || 'Ongeldig audiotype' });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Geen audiobestand ontvangen' });
        return;
      }
      res.status(201).json({
        url: `/uploads/audio/${req.file.filename}`,
        filename: req.file.filename,
      });
    });
  });

  // Full JSON Backup Export / Import & Rotating Snapshots
  router.get('/admin/backup', (_req, res) => {
    res.json(store.exportFullBackup());
  });

  router.post('/admin/backup', (req, res) => {
    const parsed = backupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    store.importFullBackup(parsed.data);
    onConfigUpdated();
    res.json({
      status: 'imported',
      counts: {
        quiz: store.getQuizQuestions().length,
        thirtySeconds: store.getThirtySecondsCards().length,
        sounds: store.getSoundChallenges().length,
        zoomPhotos: store.getZoomPhotos().length,
        pantomime: store.getPantomimeChallenges().length,
        estimates: store.getEstimateChallenges().length,
      },
    });
  });

  router.get('/admin/backups', (_req, res) => {
    res.json(store.listBackupSnapshots());
  });

  router.post('/admin/backups/snapshot', (_req, res) => {
    const filename = store.createBackupSnapshot();
    res.status(201).json({ filename, snapshots: store.listBackupSnapshots() });
  });

  router.post('/admin/backups/restore/:filename', (req, res) => {
    const ok = store.restoreBackupSnapshot(req.params.filename);
    if (!ok) {
      res.status(404).json({ error: 'Snapshot niet gevonden of ongeldig' });
      return;
    }
    onConfigUpdated();
    res.json({ status: 'restored' });
  });

  return router;
}
