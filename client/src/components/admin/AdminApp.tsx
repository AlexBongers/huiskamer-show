import React, { useEffect, useState } from 'react';
import {
  AVATAR_CATALOG,
  CATEGORIES,
  CategoryId,
  CONTENT_PACKS,
  ContentPackId,
  DifficultyLevel,
  EstimateChallenge,
  HallOfFameStats,
  PantomimeChallenge,
  QuizQuestion,
  ShowConfig,
  SoundChallenge,
  ThirtySecondsCard,
  ZoomPhotoChallenge,
} from '@huiskamer-show/shared';
import {
  Plus,
  Trash2,
  Upload,
  Volume2,
  Download,
  Save,
  Eye,
  CheckCircle2,
  Pencil,
  X,
  Lock,
  History,
  Trophy,
  Images,
  Search,
  RefreshCw,
} from 'lucide-react';
import {
  ILLUSTRATION_LIST,
  IllustrationView,
} from '../illustrations/IllustrationLibrary';
import { SOUND_PRESET_LIST, soundEngine } from '../../services/soundEngine';

type AdminTab =
  | 'quiz'
  | 'thirty_seconds'
  | 'zoom'
  | 'sounds'
  | 'pantomime'
  | 'estimates'
  | 'settings';

export const AdminApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('quiz');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string>('');

  const [config, setConfig] = useState<ShowConfig | null>(null);
  const [quizList, setQuizList] = useState<QuizQuestion[]>([]);
  const [thirtyList, setThirtyList] = useState<ThirtySecondsCard[]>([]);
  const [soundList, setSoundList] = useState<SoundChallenge[]>([]);
  const [zoomList, setZoomList] = useState<ZoomPhotoChallenge[]>([]);
  const [pantomimeList, setPantomimeList] = useState<PantomimeChallenge[]>([]);
  const [estimateList, setEstimateList] = useState<EstimateChallenge[]>([]);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameStats | null>(null);
  const [playedHistoryCount, setPlayedHistoryCount] = useState<number>(0);
  const [backupSnapshots, setBackupSnapshots] = useState<
    Array<{ filename: string; createdAt: string; sizeBytes: number }>
  >([]);

  // Optional 4-Digit Parent PIN state
  const [pinRequired, setPinRequired] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState<string>(() =>
    typeof window !== 'undefined'
      ? sessionStorage.getItem('huiskamer_admin_pin') || ''
      : ''
  );
  const [pinInput, setPinInput] = useState('');
  const [newPinSetting, setNewPinSetting] = useState('');

  // Batch Family Photo Wizard state
  const [batchPhotos, setBatchPhotos] = useState<
    Array<{
      imageUrl: string;
      answer: string;
      category: CategoryId;
      focalPoint: { x: number; y: number };
    }>
  >([]);
  const [batchUploading, setBatchUploading] = useState(false);

  // Filters & Search
  const [filterCat, setFilterCat] = useState<string>('ALL');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterPack, setFilterPack] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quiz form state (+ editing ID & Pack)
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [newQCat, setNewQCat] = useState<CategoryId>('ons_gezin');
  const [newQLevel, setNewQLevel] = useState<DifficultyLevel>('ontdekker');
  const [newQPack, setNewQPack] = useState<ContentPackId>('basis');
  const [newQPrompt, setNewQPrompt] = useState('');
  const [newQFunFact, setNewQFunFact] = useState('');
  const [newQCorrectId, setNewQCorrectId] = useState('a');
  const [newQOptions, setNewQOptions] = useState([
    { id: 'a', label: '', illustrationId: 'trex', imageUrl: '' },
    { id: 'b', label: '', illustrationId: 'unicorn', imageUrl: '' },
    { id: 'c', label: '', illustrationId: 'sonic_hedgehog', imageUrl: '' },
    { id: 'd', label: '', illustrationId: 'pizza', imageUrl: '' },
  ]);

  // 30 Seconds form state (+ editing ID & Pack)
  const [editingTSId, setEditingTSId] = useState<string | null>(null);
  const [newTSCat, setNewTSCat] = useState<CategoryId>('ons_gezin');
  const [newTSLevel, setNewTSLevel] = useState<DifficultyLevel>('ontdekker');
  const [newTSPack, setNewTSPack] = useState<ContentPackId>('basis');
  const [newTSWords, setNewTSWords] = useState<
    Array<{ word: string; illustrationId: string; imageUrl?: string }>
  >([{ word: '', illustrationId: 'trex' }]);

  // Zoom Photo form state (+ editing ID & Pack)
  const [editingZoomId, setEditingZoomId] = useState<string | null>(null);
  const [newZoomCat, setNewZoomCat] = useState<CategoryId>('ons_gezin');
  const [newZoomPack, setNewZoomPack] = useState<ContentPackId>('basis');
  const [newZoomAnswer, setNewZoomAnswer] = useState('');
  const [newZoomIllustration, setNewZoomIllustration] =
    useState('house_family');
  const [newZoomImageUrl, setNewZoomImageUrl] = useState('');
  const [newZoomFocal, setNewZoomFocal] = useState({ x: 50, y: 40 });
  const [previewZoomScale, setPreviewZoomScale] = useState(8.0);

  // Sound form state (+ editing ID & Pack & full 4-option editor!)
  const [editingSoundId, setEditingSoundId] = useState<string | null>(null);
  const [newSndCat, setNewSndCat] = useState<CategoryId>('dieren_dinos');
  const [newSndPack, setNewSndPack] = useState<ContentPackId>('basis');
  const [newSndPrompt, setNewSndPrompt] = useState(
    'Welk geluid hoor je hier?'
  );
  const [newSndType, setNewSndType] = useState<'synth' | 'file'>('synth');
  const [newSndKey, setNewSndKey] = useState('trex_roar');
  const [newSndCorrectId, setNewSndCorrectId] = useState('a');
  const [newSndOptions, setNewSndOptions] = useState([
    { id: 'a', label: 'T-Rex Dino', illustrationId: 'trex', imageUrl: '' },
    { id: 'b', label: 'Kikker', illustrationId: 'frog', imageUrl: '' },
    { id: 'c', label: 'Olifant', illustrationId: 'elephant', imageUrl: '' },
    { id: 'd', label: 'Uil', illustrationId: 'owl', imageUrl: '' },
  ]);

  // Pantomime form state (Create + Edit + Delete)
  const [editingPantoId, setEditingPantoId] = useState<string | null>(null);
  const [newPantoCat, setNewPantoCat] = useState<CategoryId>('ons_gezin');
  const [newPantoLevel, setNewPantoLevel] =
    useState<DifficultyLevel>('ontdekker');
  const [newPantoPack, setNewPantoPack] = useState<ContentPackId>('basis');
  const [newPantoPrompt, setNewPantoPrompt] = useState('');
  const [newPantoHint, setNewPantoHint] = useState('');
  const [newPantoIllustration, setNewPantoIllustration] = useState('trex');

  // Estimate form state (Create + Edit + Delete)
  const [editingEstId, setEditingEstId] = useState<string | null>(null);
  const [newEstCat, setNewEstCat] = useState<CategoryId>('wereld_raadsels');
  const [newEstPack, setNewEstPack] = useState<ContentPackId>('basis');
  const [newEstPrompt, setNewEstPrompt] = useState('');
  const [newEstUnit, setNewEstUnit] = useState('stuks');
  const [newEstMin, setNewEstMin] = useState(0);
  const [newEstMax, setNewEstMax] = useState(100);
  const [newEstStep, setNewEstStep] = useState(1);
  const [newEstCorrect, setNewEstCorrect] = useState(50);
  const [newEstIllustration, setNewEstIllustration] = useState('star');
  const [newEstFunFact, setNewEstFunFact] = useState('');

  const showNotice = (msg: string) => {
    setErrorToast('');
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const showError = (msg: string) => {
    setToast('');
    setErrorToast(msg);
    setTimeout(() => setErrorToast(''), 4500);
  };

  const adminFetch = async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {});
    if (adminPin) {
      headers.set('X-Admin-Pin', adminPin);
    }
    return fetch(url, { ...init, headers });
  };

  const fetchOverview = async (pinOverride?: string) => {
    setLoading(true);
    try {
      const statusRes = await fetch('/api/admin/pin-status');
      const statusJson = await statusRes.json();
      setPinRequired(Boolean(statusJson.pinRequired));

      const activePin = pinOverride ?? adminPin;
      const res = await fetch('/api/admin/overview', {
        headers: activePin ? { 'X-Admin-Pin': activePin } : {},
      });
      if (res.status === 401) {
        setPinUnlocked(false);
        setLoading(false);
        return;
      }
      setPinUnlocked(true);
      const data = await res.json();
      setConfig(data.config);
      setQuizList(data.quizQuestions || []);
      setThirtyList(data.thirtySecondsCards || []);
      setSoundList(data.soundChallenges || []);
      setZoomList(data.zoomPhotos || []);
      setPantomimeList(data.pantomimeChallenges || []);
      setEstimateList(data.estimateChallenges || []);
      setHallOfFame(data.hallOfFame || null);
      setPlayedHistoryCount(data.playedHistoryCount || 0);
      setBackupSnapshots(data.backupSnapshots || []);
    } catch (err) {
      console.error('Admin load error:', err);
      showError('Kon gegevens niet laden van de server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  /**
   * Client-side canvas image resize to max 1600px JPEG so raw 12MB phone photos stay compact & fast!
   */
  const resizeImageIfNeeded = async (file: File): Promise<File> => {
    if (
      typeof document === 'undefined' ||
      !file.type.startsWith('image/') ||
      file.type === 'image/gif'
    ) {
      return file;
    }
    return new Promise((resolve) => {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const maxDim = 1600;
        if (img.width <= maxDim && img.height <= maxDim) {
          resolve(file);
          return;
        }
        const ratio = Math.min(maxDim / img.width, maxDim / img.height);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        cvs.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            resolve(
              new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
              })
            );
          },
          'image/jpeg',
          0.86
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(file);
      };
      img.src = objUrl;
    });
  };

  const uploadFile = async (
    rawFile: File,
    type: 'image' | 'audio'
  ): Promise<string | null> => {
    const file =
      type === 'image' ? await resizeImageIfNeeded(rawFile) : rawFile;
    const form = new FormData();
    form.append('file', file);
    const res = await adminFetch(`/api/admin/upload/${type}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      showError(errData.error || 'Upload mislukt (ongeldig bestandstype).');
      return null;
    }
    const data = await res.json();
    return data.url as string;
  };

  // ============================================================================
  // TAB 1: QUIZ CRUD (Create + Edit + Delete)
  // ============================================================================
  const resetQuizForm = () => {
    setEditingQuizId(null);
    setNewQPrompt('');
    setNewQFunFact('');
    setNewQCorrectId('a');
    setNewQOptions([
      { id: 'a', label: '', illustrationId: 'trex', imageUrl: '' },
      { id: 'b', label: '', illustrationId: 'unicorn', imageUrl: '' },
      { id: 'c', label: '', illustrationId: 'sonic_hedgehog', imageUrl: '' },
      { id: 'd', label: '', illustrationId: 'pizza', imageUrl: '' },
    ]);
  };

  const startEditQuiz = (q: QuizQuestion) => {
    setEditingQuizId(q.id);
    setNewQCat(q.category);
    setNewQLevel(q.level);
    setNewQPack(q.packId || 'basis');
    setNewQPrompt(q.prompt);
    setNewQFunFact(q.funFact || '');
    setNewQCorrectId(q.correctOptionId);
    const optIds = ['a', 'b', 'c', 'd'];
    setNewQOptions(
      optIds.map((oid, idx) => {
        const existing = q.options[idx];
        return {
          id: existing?.id || oid,
          label: existing?.label || '',
          illustrationId: existing?.illustrationId || 'star',
          imageUrl: existing?.imageUrl || '',
        };
      })
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQPrompt.trim()) return;
    const payload = {
      category: newQCat,
      level: newQLevel,
      packId: newQPack,
      prompt: newQPrompt.trim(),
      spokenPrompt: newQPrompt.trim(),
      options: newQOptions.map((o) => ({
        id: o.id,
        label: o.label.trim() || o.illustrationId,
        illustrationId: o.illustrationId,
        imageUrl: o.imageUrl || undefined,
      })),
      correctOptionId: newQCorrectId,
      funFact: newQFunFact.trim() || undefined,
    };

    const url = editingQuizId
      ? `/api/admin/quiz/${editingQuizId}`
      : '/api/admin/quiz';
    const method = editingQuizId ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved = (await res.json()) as QuizQuestion;
      if (editingQuizId) {
        setQuizList(quizList.map((q) => (q.id === saved.id ? saved : q)));
        showNotice('✅ Quizvraag bijgewerkt!');
      } else {
        setQuizList([saved, ...quizList]);
        showNotice('✅ Nieuwe quizvraag opgeslagen!');
      }
      resetQuizForm();
    } else {
      showError('Kon quizvraag niet opslaan. Controleer alle velden.');
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm('Weet je zeker dat je deze quizvraag wilt verwijderen?')) {
      return;
    }
    await adminFetch(`/api/admin/quiz/${id}`, { method: 'DELETE' });
    setQuizList(quizList.filter((q) => q.id !== id));
    if (editingQuizId === id) resetQuizForm();
    showNotice('Quizvraag verwijderd');
  };

  // ============================================================================
  // TAB 2: 30 SECONDS CRUD (Create + Edit + Delete)
  // ============================================================================
  const handleTSLevelChange = (lvl: DifficultyLevel) => {
    setNewTSLevel(lvl);
    const count = lvl === 'ontdekker' ? 1 : lvl === 'avonturier' ? 4 : 5;
    const defaults = ['trex', 'unicorn', 'sonic_hedgehog', 'pizza', 'rocket'];
    setNewTSWords(
      Array.from({ length: count }, (_, i) => ({
        word: '',
        illustrationId: defaults[i % defaults.length],
      }))
    );
  };

  const startEditTS = (card: ThirtySecondsCard) => {
    setEditingTSId(card.id);
    setNewTSCat(card.category);
    setNewTSLevel(card.level);
    setNewTSPack(card.packId || 'basis');
    setNewTSWords(
      card.items.map((it) => ({
        word: it.word,
        illustrationId: it.illustrationId || 'star',
        imageUrl: it.imageUrl,
      }))
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveThirtySeconds = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newTSWords
      .filter((w) => w.word.trim().length > 0)
      .map((w, i) => ({
        id: `item_${i + 1}`,
        word: w.word.trim(),
        illustrationId: w.illustrationId,
        imageUrl: w.imageUrl,
      }));
    if (validItems.length === 0) return;

    const url = editingTSId
      ? `/api/admin/thirty-seconds/${editingTSId}`
      : '/api/admin/thirty-seconds';
    const method = editingTSId ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newTSCat,
        level: newTSLevel,
        packId: newTSPack,
        items: validItems,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as ThirtySecondsCard;
      if (editingTSId) {
        setThirtyList(thirtyList.map((c) => (c.id === saved.id ? saved : c)));
        showNotice('✅ 30 Seconds kaart bijgewerkt!');
      } else {
        setThirtyList([saved, ...thirtyList]);
        showNotice('✅ 30 Seconds kaart toegevoegd!');
      }
      setEditingTSId(null);
      handleTSLevelChange(newTSLevel);
    }
  };

  // ============================================================================
  // TAB 3: ZOOM PHOTOS CRUD (Create + Edit + Delete + Batch Wizard)
  // ============================================================================
  const startEditZoom = (z: ZoomPhotoChallenge) => {
    setEditingZoomId(z.id);
    setNewZoomCat(z.category);
    setNewZoomPack(z.packId || 'basis');
    setNewZoomAnswer(z.answer);
    setNewZoomIllustration(z.illustrationId || 'house_family');
    setNewZoomImageUrl(z.imageUrl || '');
    setNewZoomFocal(z.focalPoint || { x: 50, y: 50 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveZoomPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoomAnswer.trim()) return;
    const url = editingZoomId
      ? `/api/admin/zoom-photos/${editingZoomId}`
      : '/api/admin/zoom-photos';
    const method = editingZoomId ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newZoomCat,
        packId: newZoomPack,
        answer: newZoomAnswer.trim(),
        illustrationId: newZoomImageUrl ? undefined : newZoomIllustration,
        imageUrl: newZoomImageUrl || undefined,
        focalPoint: newZoomFocal,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as ZoomPhotoChallenge;
      if (editingZoomId) {
        setZoomList(zoomList.map((z) => (z.id === saved.id ? saved : z)));
        showNotice('✅ Zoom-in Foto bijgewerkt!');
      } else {
        setZoomList([saved, ...zoomList]);
        showNotice('✅ Nieuwe Zoom-in Foto opgeslagen!');
      }
      setEditingZoomId(null);
      setNewZoomAnswer('');
      setNewZoomImageUrl('');
    }
  };

  const handleBatchPhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBatchUploading(true);
    const uploadedItems: Array<{
      imageUrl: string;
      answer: string;
      category: CategoryId;
      focalPoint: { x: number; y: number };
    }> = [];
    for (const rawFile of Array.from(files)) {
      const url = await uploadFile(rawFile, 'image');
      if (url) {
        const cleanName = rawFile.name
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]+/g, ' ');
        uploadedItems.push({
          imageUrl: url,
          answer: cleanName || 'Familiefoto',
          category: 'ons_gezin',
          focalPoint: { x: 50, y: 40 },
        });
      }
    }
    setBatchPhotos((prev) => [...prev, ...uploadedItems]);
    setBatchUploading(false);
    if (uploadedItems.length > 0) {
      showNotice(
        `📷 ${uploadedItems.length} foto('s) gecomprimeerd & klaargezet in de Batch Wizard!`
      );
    }
  };

  const handleSaveBatchPhotos = async () => {
    const valid = batchPhotos.filter((p) => p.answer.trim().length > 0);
    if (valid.length === 0) return;
    const res = await adminFetch('/api/admin/zoom-photos/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: valid.map((p) => ({
          category: p.category,
          answer: p.answer.trim(),
          imageUrl: p.imageUrl,
          focalPoint: p.focalPoint,
          packId: 'basis',
        })),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const created = (data.items || []) as ZoomPhotoChallenge[];
      setZoomList([...created, ...zoomList]);
      setBatchPhotos([]);
      showNotice(
        `✅ ${created.length} familiefoto's in één keer opgeslagen voor Ronde 4!`
      );
    } else {
      showError('Batch opslaan mislukt.');
    }
  };

  // ============================================================================
  // TAB 4: SOUND CHALLENGES CRUD (Full 4-Option Editor + Create + Edit + Delete)
  // ============================================================================
  const startEditSound = (s: SoundChallenge) => {
    setEditingSoundId(s.id);
    setNewSndCat(s.category);
    setNewSndPack(s.packId || 'basis');
    setNewSndPrompt(s.prompt);
    setNewSndType(s.soundType);
    setNewSndKey(s.soundKey);
    setNewSndCorrectId(s.correctOptionId);
    const optIds = ['a', 'b', 'c', 'd'];
    setNewSndOptions(
      optIds.map((oid, idx) => {
        const existing = s.options[idx];
        return {
          id: existing?.id || oid,
          label: existing?.label || '',
          illustrationId: existing?.illustrationId || 'star',
          imageUrl: existing?.imageUrl || '',
        };
      })
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetSoundForm = () => {
    setEditingSoundId(null);
    setNewSndPrompt('Welk geluid hoor je hier?');
    setNewSndType('synth');
    setNewSndKey('trex_roar');
    setNewSndCorrectId('a');
    setNewSndOptions([
      { id: 'a', label: 'T-Rex Dino', illustrationId: 'trex', imageUrl: '' },
      { id: 'b', label: 'Kikker', illustrationId: 'frog', imageUrl: '' },
      { id: 'c', label: 'Olifant', illustrationId: 'elephant', imageUrl: '' },
      { id: 'd', label: 'Uil', illustrationId: 'owl', imageUrl: '' },
    ]);
  };

  const handleSaveSound = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingSoundId
      ? `/api/admin/sounds/${editingSoundId}`
      : '/api/admin/sounds';
    const method = editingSoundId ? 'PUT' : 'POST';

    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newSndCat,
        packId: newSndPack,
        prompt: newSndPrompt.trim(),
        soundType: newSndType,
        soundKey: newSndKey,
        options: newSndOptions.map((o) => ({
          id: o.id,
          label: o.label.trim() || o.illustrationId,
          illustrationId: o.illustrationId,
          imageUrl: o.imageUrl || undefined,
        })),
        correctOptionId: newSndCorrectId,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as SoundChallenge;
      if (editingSoundId) {
        setSoundList(soundList.map((s) => (s.id === saved.id ? saved : s)));
        showNotice('✅ Geluidsuitdaging bijgewerkt!');
      } else {
        setSoundList([saved, ...soundList]);
        showNotice('✅ Nieuwe geluidsuitdaging opgeslagen!');
      }
      resetSoundForm();
    } else {
      showError('Kon geluidsuitdaging niet opslaan. Controleer alle 4 opties.');
    }
  };

  // ============================================================================
  // TAB 5: CONFIG, PIN, SNAPSHOTS, PLAYED HISTORY & JSON BACKUP
  // ============================================================================
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    const res = await adminFetch('/api/admin/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      showNotice('✅ Gezinsprofielen & Show-instellingen opgeslagen!');
    } else {
      showError('Instellingen bevatten ongeldige waarden.');
    }
  };

  const handleDownloadBackup = async () => {
    const res = await adminFetch('/api/admin/backup');
    if (!res.ok) {
      showError('Kon backup niet downloaden.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huiskamer-show-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await adminFetch('/api/admin/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        showError('Backup-bestand is ongeldig of beschadigd.');
        return;
      }
      await fetchOverview();
      showNotice('✅ Volledige JSON-backup succesvol hersteld!');
    } catch {
      showError('Kon JSON-bestand niet lezen.');
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/pin-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    });
    const data = await res.json();
    if (data.valid) {
      setAdminPin(pinInput);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('huiskamer_admin_pin', pinInput);
      }
      await fetchOverview(pinInput);
    } else {
      showError('Ongeldige 4-cijferige Ouder-PIN.');
    }
  };

  const handleUpdatePinSetting = async (pinValue: string | null) => {
    const res = await adminFetch('/api/admin/pin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinValue }),
    });
    if (res.ok) {
      const data = await res.json();
      setPinRequired(Boolean(data.pinRequired));
      if (pinValue) {
        setAdminPin(pinValue);
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('huiskamer_admin_pin', pinValue);
        }
        setNewPinSetting('');
        showNotice('🔒 4-cijferige Ouder-PIN ingesteld voor /admin!');
      } else {
        setAdminPin('');
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('huiskamer_admin_pin');
        }
        showNotice('🔓 Ouder-PIN beveiliging uitgeschakeld.');
      }
    } else {
      showError('PIN moet uit precies 4 cijfers bestaan (bijv. 1234).');
    }
  };

  const handleResetPlayedHistory = async () => {
    const res = await adminFetch('/api/admin/reset-history', {
      method: 'POST',
    });
    if (res.ok) {
      setPlayedHistoryCount(0);
      showNotice('🧹 Gespeelde vragen geheugen gewist! Alles doet weer vers mee.');
    }
  };

  const handleCreateSnapshot = async () => {
    const res = await adminFetch('/api/admin/backups/snapshot', {
      method: 'POST',
    });
    if (res.ok) {
      await fetchOverview();
      showNotice('📸 Nieuwe lokale snapshot opgeslagen in /app/data/backups!');
    }
  };

  const handleRestoreSnapshot = async (filename: string) => {
    if (
      !window.confirm(
        `Weet je zeker dat je snapshot "${filename}" wilt terugzetten?`
      )
    ) {
      return;
    }
    const res = await adminFetch(
      `/api/admin/backups/restore/${encodeURIComponent(filename)}`,
      { method: 'POST' }
    );
    if (res.ok) {
      await fetchOverview();
      showNotice(`✅ Snapshot ${filename} succesvol hersteld!`);
    } else {
      showError('Kon snapshot niet herstellen.');
    }
  };

  const handleLockAdmin = () => {
    setAdminPin('');
    setPinInput('');
    setPinUnlocked(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('huiskamer_admin_pin');
    }
  };

  const handleSyncSeeds = async () => {
    const res = await adminFetch('/api/admin/sync-seeds', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const totalAdded =
        (data.quizAdded || 0) +
        (data.thirtySecondsAdded || 0) +
        (data.soundsAdded || 0) +
        (data.zoomAdded || 0) +
        (data.pantomimeAdded || 0) +
        (data.estimatesAdded || 0);
      await fetchOverview();
      showNotice(
        totalAdded > 0
          ? `📥 ${totalAdded} nieuwe standaard vragen/opdrachten toegevoegd!`
          : '✅ Alle standaard content is al volledig up-to-date!'
      );
    } else {
      showError('Synchroniseren mislukt.');
    }
  };

  // ============================================================================
  // TAB 5: PANTOMIME CRUD (Create + Edit + Delete)
  // ============================================================================
  const resetPantoForm = () => {
    setEditingPantoId(null);
    setNewPantoPrompt('');
    setNewPantoHint('');
    setNewPantoPack('basis');
  };

  const startEditPanto = (p: PantomimeChallenge) => {
    setEditingPantoId(p.id);
    setNewPantoCat(p.category);
    setNewPantoLevel(p.level);
    setNewPantoPack(p.packId || 'basis');
    setNewPantoPrompt(p.prompt);
    setNewPantoHint(p.hint);
    setNewPantoIllustration(p.illustrationId || 'trex');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePantomime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPantoPrompt.trim() || !newPantoHint.trim()) return;
    const url = editingPantoId
      ? `/api/admin/pantomime/${editingPantoId}`
      : '/api/admin/pantomime';
    const method = editingPantoId ? 'PUT' : 'POST';
    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newPantoCat,
        level: newPantoLevel,
        packId: newPantoPack,
        prompt: newPantoPrompt.trim(),
        hint: newPantoHint.trim(),
        illustrationId: newPantoIllustration,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as PantomimeChallenge;
      if (editingPantoId) {
        setPantomimeList(
          pantomimeList.map((p) => (p.id === saved.id ? saved : p))
        );
        showNotice('✅ Pantomime-opdracht bijgewerkt!');
      } else {
        setPantomimeList([saved, ...pantomimeList]);
        showNotice('✅ Nieuwe Pantomime-opdracht opgeslagen!');
      }
      resetPantoForm();
    } else {
      showError('Kon Pantomime-opdracht niet opslaan.');
    }
  };

  // ============================================================================
  // TAB 6: ESTIMATES CRUD (Create + Edit + Delete)
  // ============================================================================
  const resetEstForm = () => {
    setEditingEstId(null);
    setNewEstPrompt('');
    setNewEstUnit('stuks');
    setNewEstMin(0);
    setNewEstMax(100);
    setNewEstStep(1);
    setNewEstCorrect(50);
    setNewEstPack('basis');
    setNewEstFunFact('');
  };

  const startEditEst = (est: EstimateChallenge) => {
    setEditingEstId(est.id);
    setNewEstCat(est.category);
    setNewEstPack(est.packId || 'basis');
    setNewEstPrompt(est.prompt);
    setNewEstUnit(est.unit);
    setNewEstMin(est.min);
    setNewEstMax(est.max);
    setNewEstStep(est.step);
    setNewEstCorrect(est.correctValue);
    setNewEstIllustration(est.illustrationId || 'star');
    setNewEstFunFact(est.funFact || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveEstimate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEstPrompt.trim()) return;
    if (
      newEstMin >= newEstMax ||
      newEstCorrect < newEstMin ||
      newEstCorrect > newEstMax
    ) {
      showError('Het juiste getal moet tussen Min en Max liggen (en Min < Max).');
      return;
    }
    const url = editingEstId
      ? `/api/admin/estimates/${editingEstId}`
      : '/api/admin/estimates';
    const method = editingEstId ? 'PUT' : 'POST';
    const res = await adminFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: newEstCat,
        packId: newEstPack,
        prompt: newEstPrompt.trim(),
        spokenPrompt: newEstPrompt.trim(),
        unit: newEstUnit.trim() || 'stuks',
        min: Number(newEstMin),
        max: Number(newEstMax),
        step: Math.max(1, Number(newEstStep)),
        correctValue: Number(newEstCorrect),
        illustrationId: newEstIllustration,
        funFact: newEstFunFact.trim() || undefined,
      }),
    });
    if (res.ok) {
      const saved = (await res.json()) as EstimateChallenge;
      if (editingEstId) {
        setEstimateList(
          estimateList.map((x) => (x.id === saved.id ? saved : x))
        );
        showNotice('✅ Schattingsvraag bijgewerkt!');
      } else {
        setEstimateList([saved, ...estimateList]);
        showNotice('✅ Nieuwe Schattingsvraag opgeslagen!');
      }
      resetEstForm();
    } else {
      showError('Kon schattingsvraag niet opslaan. Controleer Min/Max/Antwoord.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen studio-stage-bg flex items-center justify-center font-display text-3xl text-[#F5C542]">
        Gezins-Editor laden...
      </div>
    );
  }

  if (pinRequired && !pinUnlocked) {
    return (
      <div className="min-h-screen studio-stage-bg flex items-center justify-center p-6">
        <form
          onSubmit={handleVerifyPin}
          className="studio-panel-gold rounded-3xl p-8 max-w-md w-full flex flex-col items-center text-center gap-4"
        >
          <Lock className="w-12 h-12 text-[#F5C542]" />
          <h1 className="font-display text-3xl text-white">
            🔒 Ouder-PIN Vereist
          </h1>
          <p className="text-sm text-slate-300">
            Voer de 4-cijferige Ouder-PIN in om de Gezins-Editor te openen
            (zodat de kinderen niet per ongeluk alle antwoorden zien).
          </p>
          {errorToast && (
            <div className="w-full py-2 px-3 rounded-xl bg-rose-900/70 border border-rose-400 text-rose-200 text-sm font-bold">
              {errorToast}
            </div>
          )}
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) =>
              setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
            }
            placeholder="••••"
            className="w-44 text-center tracking-[0.5em] font-display text-3xl py-3 rounded-2xl bg-[#070B18] border-2 border-[#F5C542] text-[#F5C542]"
            autoFocus
          />
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#F5C542] text-[#070B18] font-display text-xl font-bold"
          >
            Ontgrendel Gezins-Editor
          </button>
        </form>
      </div>
    );
  }

  const qNorm = searchQuery.trim().toLowerCase();

  const filteredQuiz = quizList.filter(
    (q) =>
      (filterCat === 'ALL' || q.category === filterCat) &&
      (filterLevel === 'ALL' || q.level === filterLevel) &&
      (filterPack === 'ALL' || (q.packId || 'basis') === filterPack) &&
      (!qNorm ||
        q.prompt.toLowerCase().includes(qNorm) ||
        q.options.some((o) => o.label.toLowerCase().includes(qNorm)))
  );

  const filteredThirty = thirtyList.filter(
    (c) =>
      (filterCat === 'ALL' || c.category === filterCat) &&
      (filterLevel === 'ALL' || c.level === filterLevel) &&
      (filterPack === 'ALL' || (c.packId || 'basis') === filterPack) &&
      (!qNorm || c.items.some((it) => it.word.toLowerCase().includes(qNorm)))
  );

  return (
    <div className="min-h-screen studio-stage-bg p-4 md:p-8 max-w-6xl mx-auto">
      {/* Toast Notifications */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" /> {toast}
        </div>
      )}
      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 px-6 py-4 rounded-2xl bg-rose-600 text-white font-display text-xl font-bold shadow-2xl flex items-center gap-2">
          <X className="w-6 h-6" /> {errorToast}
        </div>
      )}

      {/* Header */}
      <header className="studio-panel-gold rounded-3xl p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[#F5C542] font-display text-sm uppercase tracking-wider">
            ⚙️ Lokale Familie Studio Beheer (/app/data)
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-white">
            Gezins-Editor — {config?.showTitle}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {pinRequired && (
            <button
              type="button"
              onClick={handleLockAdmin}
              className="px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-500/50 font-display text-base text-rose-200 flex items-center gap-1.5"
              title="Vergrendel Gezins-Editor met Ouder-PIN"
            >
              <Lock className="w-4 h-4" /> Vergrendel
            </button>
          )}
          <a
            href="/tv"
            className="px-4 py-2.5 rounded-xl bg-[#1B2752] border border-[#F5C542]/50 font-display text-base text-white"
          >
            📺 Open TV (/tv)
          </a>
          <a
            href="/play"
            className="px-4 py-2.5 rounded-xl bg-[#F5C542] text-[#070B18] font-display text-base font-bold"
          >
            📱 Open Controller (/play)
          </a>
        </div>
      </header>

      {/* 7 Navigation Tabs (All 6 Round Types + Settings!) */}
      <nav className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { id: 'quiz', label: `🟣 Quiz (${quizList.length})` },
            {
              id: 'thirty_seconds',
              label: `⏱️ 30 Seconds (${thirtyList.length})`,
            },
            { id: 'zoom', label: `🔍 Zoom-in (${zoomList.length})` },
            { id: 'sounds', label: `🔊 Geluiden (${soundList.length})` },
            { id: 'pantomime', label: `🎭 Pantomime (${pantomimeList.length})` },
            { id: 'estimates', label: `🎯 Schattingen (${estimateList.length})` },
            { id: 'settings', label: '👨‍👩‍👧‍👦 Profielen & Backup' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-2xl font-display text-base border-2 transition-all ${
              activeTab === tab.id
                ? 'bg-[#F5C542] text-[#070B18] border-white font-bold shadow-lg'
                : 'bg-[#111936] text-white border-white/15 hover:border-[#F5C542]/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ======================================================================
          TAB 1: QUIZVRAAG TOEVOEGEN, BEWERKEN & VERWIJDEREN
          ====================================================================== */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveQuiz}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542] flex items-center gap-2">
                {editingQuizId ? (
                  <>
                    <Pencil className="w-5 h-5" /> Quizvraag Bewerken
                  </>
                ) : (
                  <>
                    <Plus className="w-6 h-6" /> Nieuwe Quizvraag
                  </>
                )}
              </h2>
              {editingQuizId && (
                <button
                  type="button"
                  onClick={resetQuizForm}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Categorie
                </label>
                <select
                  value={newQCat}
                  onChange={(e) => setNewQCat(e.target.value as CategoryId)}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Niveau
                </label>
                <select
                  value={newQLevel}
                  onChange={(e) =>
                    setNewQLevel(e.target.value as DifficultyLevel)
                  }
                  className="w-full px-2.5 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  <option value="ontdekker">🦖 Lucas (5j)</option>
                  <option value="avonturier">🦄 Lana (7j)</option>
                  <option value="meester">🎩 Ouders</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Themapakket
                </label>
                <select
                  value={newQPack}
                  onChange={(e) => setNewQPack(e.target.value as ContentPackId)}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CONTENT_PACKS.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.emoji} {pk.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Vraag (wordt voorgelezen bij Lucas)
              </label>
              <input
                type="text"
                value={newQPrompt}
                onChange={(e) => setNewQPrompt(e.target.value)}
                placeholder="Bijv. Wat eet onze familie het liefst op zaterdag?"
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                required
              />
            </div>

            {/* 4 Options with Illustration / Photo upload */}
            <div className="flex flex-col gap-3">
              <label className="text-xs text-slate-300">
                4 Antwoordopties (vink het juiste antwoord aan):
              </label>
              {newQOptions.map((opt, idx) => (
                <div
                  key={opt.id}
                  className={`p-3 rounded-2xl border ${
                    newQCorrectId === opt.id
                      ? 'bg-emerald-950/60 border-[#22C55E]'
                      : 'bg-[#070B18]/70 border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={newQCorrectId === opt.id}
                      onChange={() => setNewQCorrectId(opt.id)}
                    />
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...newQOptions];
                        next[idx].label = e.target.value;
                        setNewQOptions(next);
                      }}
                      placeholder={`Optie ${opt.id.toUpperCase()}...`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#111936] border border-white/20 text-white text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                      <IllustrationView
                        illustrationId={opt.illustrationId}
                        imageUrl={opt.imageUrl}
                      />
                    </div>
                    <select
                      value={opt.illustrationId}
                      onChange={(e) => {
                        const next = [...newQOptions];
                        next[idx].illustrationId = e.target.value;
                        next[idx].imageUrl = '';
                        setNewQOptions(next);
                      }}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-[#111936] border border-white/20 text-white text-xs"
                    >
                      {ILLUSTRATION_LIST.map((il) => (
                        <option key={il.id} value={il.id}>
                          🎨 {il.label}
                        </option>
                      ))}
                    </select>
                    <label className="px-2.5 py-1.5 rounded-lg bg-[#1B2752] text-xs cursor-pointer flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Foto
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const url = await uploadFile(f, 'image');
                          if (url) {
                            const next = [...newQOptions];
                            next[idx].imageUrl = url;
                            setNewQOptions(next);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Leuk weetje op TV bij onthulling (optioneel)
              </label>
              <input
                type="text"
                value={newQFunFact}
                onChange={(e) => setNewQFunFact(e.target.value)}
                placeholder="Wist je dat..."
                className="w-full px-4 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingQuizId ? '💾 Wijzigingen Opslaan' : '💾 Vraag Opslaan'}
            </button>
          </form>

          {/* Quiz Question Browser */}
          <div className="lg:col-span-7 studio-panel rounded-3xl p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-2xl text-white">
                Alle Quizvragen ({filteredQuiz.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Zoek vraag of antwoord..."
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-[#070B18] border border-white/20 text-sm text-white w-48"
                  />
                </div>
                <select
                  value={filterCat}
                  onChange={(e) => setFilterCat(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#070B18] border border-white/20 text-sm"
                >
                  <option value="ALL">Alle categorieën</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#070B18] border border-white/20 text-sm"
                >
                  <option value="ALL">Alle niveaus</option>
                  <option value="ontdekker">Ontdekker (5j)</option>
                  <option value="avonturier">Avonturier (7j)</option>
                  <option value="meester">Meester (Ouders)</option>
                </select>
                <select
                  value={filterPack}
                  onChange={(e) => setFilterPack(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#070B18] border border-white/20 text-sm"
                >
                  <option value="ALL">Alle pakketten</option>
                  {CONTENT_PACKS.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.emoji} {pk.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[680px] overflow-y-auto pr-1">
              {filteredQuiz.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex items-start justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-[#1B2752] text-[#F5C542] font-bold">
                        {q.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {q.category}
                      </span>
                    </div>
                    <div className="font-display text-lg text-white">
                      {q.prompt}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {q.options.map((o) => (
                        <span
                          key={o.id}
                          className={`text-xs px-2.5 py-1 rounded-lg ${
                            o.id === q.correctOptionId
                              ? 'bg-emerald-900 text-emerald-200 border border-emerald-400 font-bold'
                              : 'bg-slate-900 text-slate-300'
                          }`}
                        >
                          {o.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEditQuiz(q)}
                      className="p-2 rounded-xl bg-[#1B2752] text-[#F5C542] hover:bg-amber-900/50"
                      title="Bewerk vraag"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteQuiz(q.id)}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300 hover:bg-rose-800"
                      title="Verwijder vraag"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 2: 30 SECONDS KAARTEN (MET BEWERKEN!)
          ====================================================================== */}
      {activeTab === 'thirty_seconds' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveThirtySeconds}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542]">
                {editingTSId
                  ? '✏️ 30 Seconds Kaart Bewerken'
                  : '⏱️ Nieuwe 30 Seconds Kaart'}
              </h2>
              {editingTSId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTSId(null);
                    handleTSLevelChange(newTSLevel);
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Categorie
                </label>
                <select
                  value={newTSCat}
                  onChange={(e) => setNewTSCat(e.target.value as CategoryId)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Niveau
                </label>
                <select
                  value={newTSLevel}
                  onChange={(e) =>
                    handleTSLevelChange(e.target.value as DifficultyLevel)
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                >
                  <option value="ontdekker">🦖 Lucas (1 groot plaatje)</option>
                  <option value="avonturier">
                    🦄 Lana (4 woorden + icoon)
                  </option>
                  <option value="meester">🎩 Ouders (5 begrippen)</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {newTSWords.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-[#070B18]/80 border border-white/15 flex flex-col gap-2"
                >
                  <input
                    type="text"
                    value={item.word}
                    onChange={(e) => {
                      const next = [...newTSWords];
                      next[idx].word = e.target.value;
                      setNewTSWords(next);
                    }}
                    placeholder={`Begrip / Plaatje #${idx + 1}...`}
                    className="w-full px-3 py-2 rounded-xl bg-[#111936] border border-white/20 text-white"
                    required
                  />
                  {newTSLevel !== 'meester' && (
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        <IllustrationView
                          illustrationId={item.illustrationId}
                          imageUrl={item.imageUrl}
                        />
                      </div>
                      <select
                        value={item.illustrationId}
                        onChange={(e) => {
                          const next = [...newTSWords];
                          next[idx].illustrationId = e.target.value;
                          next[idx].imageUrl = undefined;
                          setNewTSWords(next);
                        }}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-[#111936] border border-white/20 text-xs"
                      >
                        {ILLUSTRATION_LIST.map((il) => (
                          <option key={il.id} value={il.id}>
                            🎨 {il.label}
                          </option>
                        ))}
                      </select>
                      <label className="px-2.5 py-1.5 rounded-lg bg-[#1B2752] text-xs cursor-pointer">
                        📷 Foto
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const url = await uploadFile(f, 'image');
                            if (url) {
                              const next = [...newTSWords];
                              next[idx].imageUrl = url;
                              setNewTSWords(next);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingTSId
                ? '💾 Kaart Bijwerken'
                : '💾 30 Seconds Kaart Opslaan'}
            </button>
          </form>

          <div className="lg:col-span-7 studio-panel rounded-3xl p-6 flex flex-col gap-4">
            <h3 className="font-display text-2xl text-white">
              Alle 30 Seconds Kaarten ({filteredThirty.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[650px] overflow-y-auto">
              {filteredThirty.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex justify-between items-start gap-2"
                >
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded bg-[#1B2752] text-[#F5C542] font-bold">
                      {c.level.toUpperCase()} · {c.category}
                    </span>
                    <ul className="mt-2 space-y-1">
                      {c.items.map((it) => (
                        <li
                          key={it.id}
                          className="font-display text-base text-white flex items-center gap-2"
                        >
                          <span>• {it.word}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditTS(c)}
                      className="p-2 rounded-xl bg-[#1B2752] text-[#F5C542]"
                      title="Bewerk kaart"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await adminFetch(`/api/admin/thirty-seconds/${c.id}`, {
                          method: 'DELETE',
                        });
                        setThirtyList(thirtyList.filter((x) => x.id !== c.id));
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 3: ZOOM-IN FOTO'S (MET BEWERKEN & LIVE 8x -> 1x PREVIEW!)
          ====================================================================== */}
      {activeTab === 'zoom' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveZoomPhoto}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542]">
                {editingZoomId
                  ? '✏️ Zoom-in Foto Bewerken'
                  : '🔍 Nieuwe Zoom-in Familiefoto'}
              </h2>
              {editingZoomId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingZoomId(null);
                    setNewZoomAnswer('');
                    setNewZoomImageUrl('');
                  }}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Wat staat er op de foto? (Het juiste antwoord)
              </label>
              <input
                type="text"
                value={newZoomAnswer}
                onChange={(e) => setNewZoomAnswer(e.target.value)}
                placeholder="Bijv. Knuffel van Lucas op vakantie..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Categorie
                </label>
                <select
                  value={newZoomCat}
                  onChange={(e) => setNewZoomCat(e.target.value as CategoryId)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Of kies illustratie
                </label>
                <select
                  value={newZoomIllustration}
                  onChange={(e) => {
                    setNewZoomIllustration(e.target.value);
                    setNewZoomImageUrl('');
                  }}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                >
                  {ILLUSTRATION_LIST.map((il) => (
                    <option key={il.id} value={il.id}>
                      🎨 {il.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="w-full py-3 rounded-2xl bg-[#1B2752] border-2 border-dashed border-[#F5C542] text-center cursor-pointer font-display text-lg text-[#F5C542] flex items-center justify-center gap-2">
              <Upload className="w-5 h-5" /> 📷 Eigen Familiefoto Uploaden
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await uploadFile(f, 'image');
                  if (url) {
                    setNewZoomImageUrl(url);
                    showNotice('Foto geüpload!');
                  }
                }}
              />
            </label>

            {/* Live Interactive 8x -> 1x Zoom Preview */}
            <div className="bg-[#070B18] rounded-2xl p-4 border border-white/15">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#F5C542] font-bold flex items-center gap-1">
                  <Eye className="w-4 h-4" /> Live Zoom Preview (
                  {previewZoomScale.toFixed(1)}×)
                </span>
                <span className="text-xs text-slate-400">
                  Klik op het plaatje voor startpunt ({newZoomFocal.x}%,{' '}
                  {newZoomFocal.y}%)
                </span>
              </div>

              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = Math.round(
                    ((e.clientX - rect.left) / rect.width) * 100
                  );
                  const y = Math.round(
                    ((e.clientY - rect.top) / rect.height) * 100
                  );
                  setNewZoomFocal({ x, y });
                }}
                className="w-full h-52 rounded-xl overflow-hidden relative flex items-center justify-center bg-slate-950 cursor-crosshair"
              >
                <div
                  className="w-44 h-44 transition-transform duration-300"
                  style={{
                    transform: `scale(${previewZoomScale})`,
                    transformOrigin: `${newZoomFocal.x}% ${newZoomFocal.y}%`,
                  }}
                >
                  <IllustrationView
                    illustrationId={newZoomIllustration}
                    imageUrl={newZoomImageUrl || undefined}
                  />
                </div>
              </div>

              <input
                type="range"
                min={1}
                max={8}
                step={0.2}
                value={previewZoomScale}
                onChange={(e) => setPreviewZoomScale(Number(e.target.value))}
                className="w-full mt-3"
              />
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingZoomId
                ? '💾 Foto Bijwerken'
                : '💾 Zoom-in Foto Opslaan'}
            </button>
          </form>

          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Batch Family Photo Wizard */}
            <div className="studio-panel-gold rounded-3xl p-6 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-2xl text-[#F5C542] flex items-center gap-2">
                    <Images className="w-6 h-6" /> Batch Familiefoto Wizard
                  </h3>
                  <p className="text-xs text-slate-300">
                    Selecteer tot 15 foto&apos;s tegelijk vanaf je telefoon. Ze
                    worden automatisch verkleind naar 1600px JPEG!
                  </p>
                </div>
                <label className="px-4 py-2.5 rounded-2xl bg-[#F5C542] text-[#070B18] font-display text-base font-bold cursor-pointer flex items-center gap-2">
                  <Upload className="w-4 h-4" />{' '}
                  {batchUploading ? 'Bezig...' : 'Meerdere Foto’s Kiezen'}
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      handleBatchPhotoSelect(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              {batchPhotos.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {batchPhotos.map((bp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-[#070B18]/85 border border-white/15 flex gap-3 items-center"
                      >
                        <div
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const x = Math.round(
                              ((e.clientX - rect.left) / rect.width) * 100
                            );
                            const y = Math.round(
                              ((e.clientY - rect.top) / rect.height) * 100
                            );
                            const next = [...batchPhotos];
                            next[idx] = { ...bp, focalPoint: { x, y } };
                            setBatchPhotos(next);
                          }}
                          className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 relative cursor-crosshair border border-[#F5C542]/40"
                          title="Klik voor zoom-startpunt"
                        >
                          <img
                            src={bp.imageUrl}
                            alt={bp.answer}
                            className="w-full h-full object-cover"
                          />
                          <div
                            className="w-3 h-3 rounded-full bg-[#F5C542] border border-black absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                            style={{
                              left: `${bp.focalPoint.x}%`,
                              top: `${bp.focalPoint.y}%`,
                            }}
                          />
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                          <input
                            type="text"
                            value={bp.answer}
                            onChange={(e) => {
                              const next = [...batchPhotos];
                              next[idx] = { ...bp, answer: e.target.value };
                              setBatchPhotos(next);
                            }}
                            placeholder="Wat staat er op de foto?"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#111936] border border-white/20 text-white text-sm"
                          />
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">
                              Zoompunt: {bp.focalPoint.x}%, {bp.focalPoint.y}%
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setBatchPhotos(
                                  batchPhotos.filter((_, i) => i !== idx)
                                )
                              }
                              className="text-xs text-rose-400"
                            >
                              Verwijder
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveBatchPhotos}
                    className="py-3 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-lg font-bold"
                  >
                    💾 Alle {batchPhotos.length} Foto&apos;s Opslaan voor Ronde
                    4
                  </button>
                </div>
              )}
            </div>

            <div className="studio-panel rounded-3xl p-6">
              <h3 className="font-display text-2xl text-white mb-4">
                Alle Zoom-in Foto&apos;s ({zoomList.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[650px] overflow-y-auto">
                {zoomList.map((z) => (
                  <div
                    key={z.id}
                    className="p-3 rounded-2xl bg-[#070B18]/80 border border-white/15 flex flex-col items-center text-center gap-2 relative"
                  >
                    <div className="w-28 h-28 rounded-xl overflow-hidden">
                      <IllustrationView
                        illustrationId={z.illustrationId}
                        imageUrl={z.imageUrl}
                      />
                    </div>
                    <div className="font-display text-lg text-white">
                      {z.answer}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        onClick={() => startEditZoom(z)}
                        className="p-1.5 rounded-lg bg-[#1B2752] text-[#F5C542]"
                        title="Bewerken"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          await adminFetch(`/api/admin/zoom-photos/${z.id}`, {
                            method: 'DELETE',
                          });
                          setZoomList(zoomList.filter((x) => x.id !== z.id));
                        }}
                        className="p-1.5 rounded-lg bg-rose-950/80 text-rose-300"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 4: GELUIDEN BEHEREN (VOLLEDIGE 4-OPTIES EDITOR + BEWERKEN!)
          ====================================================================== */}
      {activeTab === 'sounds' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSound}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542]">
                {editingSoundId
                  ? '✏️ Geluid Bewerken'
                  : '🔊 Nieuw Geluid Toevoegen'}
              </h2>
              {editingSoundId && (
                <button
                  type="button"
                  onClick={resetSoundForm}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Categorie
              </label>
              <select
                value={newSndCat}
                onChange={(e) => setNewSndCat(e.target.value as CategoryId)}
                className="w-full px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Vraag op TV & tablets
              </label>
              <input
                type="text"
                value={newSndPrompt}
                onChange={(e) => setNewSndPrompt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={newSndType === 'synth' ? newSndKey : ''}
                onChange={(e) => {
                  setNewSndType('synth');
                  setNewSndKey(e.target.value);
                }}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
              >
                {newSndType === 'file' && (
                  <option value="">🎙️ Eigen upload: {newSndKey}</option>
                )}
                {SOUND_PRESET_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={async () => {
                  await soundEngine.unlock();
                  soundEngine.playSoundChallenge(newSndKey);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#3B82F6] text-white font-display text-base flex items-center gap-1"
              >
                <Volume2 className="w-5 h-5" /> Test
              </button>
            </div>

            <label className="w-full py-2.5 rounded-xl bg-[#1B2752] border border-dashed border-[#38BDF8] text-center cursor-pointer text-sm text-[#38BDF8]">
              🎙️ Of upload eigen MP3/WAV geluidsbestand
              <input
                type="file"
                accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/webm"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const url = await uploadFile(f, 'audio');
                  if (url) {
                    setNewSndType('file');
                    setNewSndKey(url);
                    showNotice('Audiobestand geüpload!');
                  }
                }}
              />
            </label>

            {/* All 4 Sound Answer Options + Correct Option Radio! */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs text-slate-300">
                4 Plaatjes-opties (vink het juiste geluid aan):
              </label>
              {newSndOptions.map((opt, idx) => (
                <div
                  key={opt.id}
                  className={`p-2.5 rounded-2xl border ${
                    newSndCorrectId === opt.id
                      ? 'bg-emerald-950/60 border-[#22C55E]'
                      : 'bg-[#070B18]/70 border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="radio"
                      name="correctSndOpt"
                      checked={newSndCorrectId === opt.id}
                      onChange={() => setNewSndCorrectId(opt.id)}
                    />
                    <input
                      type="text"
                      value={opt.label}
                      onChange={(e) => {
                        const next = [...newSndOptions];
                        next[idx].label = e.target.value;
                        setNewSndOptions(next);
                      }}
                      placeholder={`Antwoord ${opt.id.toUpperCase()}...`}
                      className="flex-1 px-3 py-1 rounded-lg bg-[#111936] border border-white/20 text-white text-sm"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                      <IllustrationView
                        illustrationId={opt.illustrationId}
                        imageUrl={opt.imageUrl}
                      />
                    </div>
                    <select
                      value={opt.illustrationId}
                      onChange={(e) => {
                        const next = [...newSndOptions];
                        next[idx].illustrationId = e.target.value;
                        next[idx].imageUrl = '';
                        setNewSndOptions(next);
                      }}
                      className="flex-1 px-2 py-1 rounded-lg bg-[#111936] border border-white/20 text-white text-xs"
                    >
                      {ILLUSTRATION_LIST.map((il) => (
                        <option key={il.id} value={il.id}>
                          🎨 {il.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingSoundId
                ? '💾 Geluid Bijwerken'
                : '💾 Geluidsuitdaging Opslaan'}
            </button>
          </form>

          <div className="lg:col-span-7 studio-panel rounded-3xl p-6">
            <h3 className="font-display text-2xl text-white mb-4">
              Alle Geluidsuitdagingen ({soundList.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[700px] overflow-y-auto">
              {soundList.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-display text-lg text-white">
                      {s.prompt}
                    </div>
                    <div className="text-xs text-[#F5C542]">
                      Antwoord:{' '}
                      {s.options.find((o) => o.id === s.correctOptionId)?.label}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => soundEngine.playSoundChallenge(s.soundKey)}
                      className="p-2 rounded-xl bg-[#3B82F6] text-white"
                      title="Luister"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => startEditSound(s)}
                      className="p-2 rounded-xl bg-[#1B2752] text-[#F5C542]"
                      title="Bewerken"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        await adminFetch(`/api/admin/sounds/${s.id}`, {
                          method: 'DELETE',
                        });
                        setSoundList(soundList.filter((x) => x.id !== s.id));
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 5: PANTOMIME ("Wie of Wat ben ik?") CRUD
          ====================================================================== */}
      {activeTab === 'pantomime' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSavePantomime}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542]">
                {editingPantoId
                  ? '✏️ Pantomime Bewerken'
                  : '🎭 Nieuwe Pantomime-opdracht'}
              </h2>
              {editingPantoId && (
                <button
                  type="button"
                  onClick={resetPantoForm}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Categorie
                </label>
                <select
                  value={newPantoCat}
                  onChange={(e) => setNewPantoCat(e.target.value as CategoryId)}
                  className="w-full px-2.5 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Niveau
                </label>
                <select
                  value={newPantoLevel}
                  onChange={(e) =>
                    setNewPantoLevel(e.target.value as DifficultyLevel)
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  <option value="ontdekker">🦖 Lucas (5j)</option>
                  <option value="avonturier">🦄 Lana (7j)</option>
                  <option value="meester">🎩 Ouders</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Pakket
                </label>
                <select
                  value={newPantoPack}
                  onChange={(e) =>
                    setNewPantoPack(e.target.value as ContentPackId)
                  }
                  className="w-full px-2.5 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CONTENT_PACKS.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.emoji} {pk.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Wat moet er uitgebeeld worden?
              </label>
              <input
                type="text"
                value={newPantoPrompt}
                onChange={(e) => setNewPantoPrompt(e.target.value)}
                placeholder="Bijv. Brullende T-Rex met korte armpjes"
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Uitbeeld-tip (alleen zichtbaar voor de uitbeelder)
              </label>
              <input
                type="text"
                value={newPantoHint}
                onChange={(e) => setNewPantoHint(e.target.value)}
                placeholder="Bijv. Stamp met je voeten en houd kleine armpjes voor je!"
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
                <IllustrationView illustrationId={newPantoIllustration} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-300 block mb-1">
                  Illustratie op kaartje
                </label>
                <select
                  value={newPantoIllustration}
                  onChange={(e) => setNewPantoIllustration(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {ILLUSTRATION_LIST.map((il) => (
                    <option key={il.id} value={il.id}>
                      🎨 {il.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingPantoId
                ? '💾 Pantomime Bijwerken'
                : '💾 Pantomime Opslaan'}
            </button>
          </form>

          <div className="lg:col-span-7 studio-panel rounded-3xl p-6">
            <h3 className="font-display text-2xl text-white mb-4">
              Alle Pantomime-opdrachten ({pantomimeList.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[680px] overflow-y-auto">
              {pantomimeList.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      <IllustrationView
                        illustrationId={p.illustrationId}
                        imageUrl={p.imageUrl}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] text-[#F5C542] font-bold uppercase">
                        {p.level} · {p.packId || 'basis'}
                      </div>
                      <div className="font-display text-base text-white">
                        {p.prompt}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        💡 {p.hint}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEditPanto(p)}
                      className="p-2 rounded-xl bg-[#1B2752] text-[#F5C542]"
                      title="Bewerken"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Weet je zeker dat je deze pantomime wilt verwijderen?'
                          )
                        ) {
                          return;
                        }
                        await adminFetch(`/api/admin/pantomime/${p.id}`, {
                          method: 'DELETE',
                        });
                        setPantomimeList(
                          pantomimeList.filter((x) => x.id !== p.id)
                        );
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 6: SCHATTINGSVRAAG ("Dichtstbij Wint!") CRUD
          ====================================================================== */}
      {activeTab === 'estimates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveEstimate}
            className="lg:col-span-5 studio-panel-gold rounded-3xl p-6 flex flex-col gap-4 h-fit"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-[#F5C542]">
                {editingEstId
                  ? '✏️ Schattingsvraag Bewerken'
                  : '🎯 Nieuwe Schattingsvraag'}
              </h2>
              {editingEstId && (
                <button
                  type="button"
                  onClick={resetEstForm}
                  className="text-xs px-3 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Annuleren
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Categorie
                </label>
                <select
                  value={newEstCat}
                  onChange={(e) => setNewEstCat(e.target.value as CategoryId)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.shortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Themapakket
                </label>
                <select
                  value={newEstPack}
                  onChange={(e) =>
                    setNewEstPack(e.target.value as ContentPackId)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                >
                  {CONTENT_PACKS.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.emoji} {pk.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Schattingsvraag
              </label>
              <input
                type="text"
                value={newEstPrompt}
                onChange={(e) => setNewEstPrompt(e.target.value)}
                placeholder="Bijv. Hoeveel tanden had een volwassen T-Rex?"
                className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Eenheid (bijv. km, jaar, tanden)
                </label>
                <input
                  type="text"
                  value={newEstUnit}
                  onChange={(e) => setNewEstUnit(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Juiste antwoord (getal)
                </label>
                <input
                  type="number"
                  value={newEstCorrect}
                  onChange={(e) => setNewEstCorrect(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-950/70 border border-[#22C55E] text-[#4ADE80] font-bold text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Min</label>
                <input
                  type="number"
                  value={newEstMin}
                  onChange={(e) => setNewEstMin(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">Max</label>
                <input
                  type="number"
                  value={newEstMax}
                  onChange={(e) => setNewEstMax(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  Stapgrootte
                </label>
                <input
                  type="number"
                  min={1}
                  value={newEstStep}
                  onChange={(e) => setNewEstStep(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
                <IllustrationView illustrationId={newEstIllustration} />
              </div>
              <select
                value={newEstIllustration}
                onChange={(e) => setNewEstIllustration(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
              >
                {ILLUSTRATION_LIST.map((il) => (
                  <option key={il.id} value={il.id}>
                    🎨 {il.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">
                Leuk weetje op TV bij onthulling (optioneel)
              </label>
              <input
                type="text"
                value={newEstFunFact}
                onChange={(e) => setNewEstFunFact(e.target.value)}
                placeholder="Wist je dat..."
                className="w-full px-4 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="py-3.5 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold"
            >
              {editingEstId
                ? '💾 Schattingsvraag Bijwerken'
                : '💾 Schattingsvraag Opslaan'}
            </button>
          </form>

          <div className="lg:col-span-7 studio-panel rounded-3xl p-6">
            <h3 className="font-display text-2xl text-white mb-4">
              Alle Schattingsvragen ({estimateList.length})
            </h3>
            <div className="flex flex-col gap-3 max-h-[680px] overflow-y-auto pr-1">
              {estimateList.map((est) => (
                <div
                  key={est.id}
                  className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                      <IllustrationView illustrationId={est.illustrationId} />
                    </div>
                    <div>
                      <div className="text-xs text-[#F5C542] font-bold">
                        🎯 Antwoord: {est.correctValue} {est.unit} (Schaal:{' '}
                        {est.min}–{est.max}, stap {est.step})
                      </div>
                      <div className="font-display text-lg text-white mt-0.5">
                        {est.prompt}
                      </div>
                      {est.funFact && (
                        <div className="text-xs text-slate-400 mt-1">
                          💡 {est.funFact}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => startEditEst(est)}
                      className="p-2 rounded-xl bg-[#1B2752] text-[#F5C542]"
                      title="Bewerken"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Weet je zeker dat je deze schattingsvraag wilt verwijderen?'
                          )
                        ) {
                          return;
                        }
                        await adminFetch(`/api/admin/estimates/${est.id}`, {
                          method: 'DELETE',
                        });
                        setEstimateList(
                          estimateList.filter((x) => x.id !== est.id)
                        );
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300"
                      title="Verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================
          TAB 7: GEZINSPROFIELEN, OUDER-PIN, HERHALINGSGEHEUGEN & BACKUPS
          ====================================================================== */}
      {activeTab === 'settings' && config && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <form
              onSubmit={handleSaveConfig}
              className="studio-panel-gold rounded-3xl p-6 flex flex-col gap-5"
            >
              <h2 className="font-display text-2xl text-[#F5C542]">
                👨‍👩‍👧‍👦 Show-Titel & Gezinsprofielen
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    Show-Titel op TV
                  </label>
                  <input
                    type="text"
                    value={config.showTitle}
                    onChange={(e) =>
                      setConfig({ ...config, showTitle: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">
                    Subtitel
                  </label>
                  <input
                    type="text"
                    value={config.subtitle}
                    onChange={(e) =>
                      setConfig({ ...config, subtitle: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-[#070B18] border border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.profiles.map((prof, idx) => (
                  <div
                    key={prof.id}
                    className="p-4 rounded-2xl bg-[#070B18]/80 border border-white/15 flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-white/20">
                        <IllustrationView
                          illustrationId={
                            AVATAR_CATALOG[prof.defaultAvatarId]
                              ?.illustrationId || prof.defaultAvatarId
                          }
                        />
                      </div>
                      <input
                        type="text"
                        value={prof.name}
                        onChange={(e) => {
                          const next = [...config.profiles];
                          next[idx] = { ...prof, name: e.target.value };
                          setConfig({ ...config, profiles: next });
                        }}
                        className="flex-1 px-3 py-1.5 rounded-xl bg-[#111936] border border-white/20 font-display text-xl text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={prof.level}
                        onChange={(e) => {
                          const next = [...config.profiles];
                          next[idx] = {
                            ...prof,
                            level: e.target.value as DifficultyLevel,
                          };
                          setConfig({ ...config, profiles: next });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#111936] border border-white/20 text-xs text-[#F5C542]"
                      >
                        <option value="ontdekker">Ontdekker (5j)</option>
                        <option value="avonturier">Avonturier (7j)</option>
                        <option value="meester">Meester (Ouder)</option>
                      </select>

                      <select
                        value={prof.defaultAvatarId}
                        onChange={(e) => {
                          const next = [...config.profiles];
                          next[idx] = {
                            ...prof,
                            defaultAvatarId: e.target.value,
                          };
                          setConfig({ ...config, profiles: next });
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#111936] border border-white/20 text-xs text-white"
                      >
                        {Object.values(AVATAR_CATALOG).map((av) => (
                          <option key={av.id} value={av.id}>
                            {av.emoji} {av.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={prof.autoSpeak}
                        onChange={(e) => {
                          const next = [...config.profiles];
                          next[idx] = { ...prof, autoSpeak: e.target.checked };
                          setConfig({ ...config, profiles: next });
                        }}
                      />
                      Automatisch Nederlands voorlezen (`nl-NL`)
                    </label>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="py-4 rounded-2xl bg-[#22C55E] text-[#070B18] font-display text-xl font-bold flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> Instellingen Opslaan
              </button>
            </form>

            {/* Familie Eregalerij (Hall of Fame) */}
            {hallOfFame && (
              <div className="studio-panel rounded-3xl p-6 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl text-[#F5C542] flex items-center gap-2">
                    <Trophy className="w-6 h-6" /> Familie Eregalerij (Hall of
                    Fame)
                  </h3>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#1B2752] text-[#F5C542] font-bold">
                    {hallOfFame.totalGamesPlayed} shows gespeeld
                  </span>
                </div>
                {Object.keys(hallOfFame.playerLifetime).length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Speel jullie eerste show tot de Finale om hier de
                    familie-records te zien!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(hallOfFame.playerLifetime).map(
                      ([key, p]) => (
                        <div
                          key={key}
                          className="p-3 rounded-2xl bg-[#070B18]/80 border border-white/15 text-center"
                        >
                          <div className="font-display text-lg text-white">
                            {p.name}
                          </div>
                          <div className="text-xs text-[#F5C542] font-bold mt-1">
                            🏆 {p.wins}× gewonnen · ⭐ {p.totalStars}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Totaal: {p.totalScore} pt ({p.gamesPlayed} shows)
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Ouder-PIN & Herhalingsgeheugen */}
            <div className="studio-panel rounded-3xl p-6 flex flex-col gap-4">
              <h3 className="font-display text-2xl text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#F5C542]" /> Ouder-PIN &
                Vragengeheugen
              </h3>
              <p className="text-xs text-slate-300">
                Stel optioneel een 4-cijferige pincode in zodat nieuwsgierige
                kinderen niet per ongeluk in <code>/admin</code> alle antwoorden
                zien.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={newPinSetting}
                  onChange={(e) =>
                    setNewPinSetting(
                      e.target.value.replace(/\D/g, '').slice(0, 4)
                    )
                  }
                  placeholder={
                    pinRequired ? 'Nieuwe 4-cijfer PIN' : 'Bijv. 1234'
                  }
                  className="flex-1 px-3 py-2 rounded-xl bg-[#070B18] border border-white/20 text-white text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleUpdatePinSetting(newPinSetting)}
                  disabled={newPinSetting.length !== 4}
                  className="px-4 py-2 rounded-xl bg-[#F5C542] text-[#070B18] font-display text-sm font-bold disabled:opacity-40"
                >
                  PIN Instellen
                </button>
                {pinRequired && (
                  <button
                    type="button"
                    onClick={() => handleUpdatePinSetting(null)}
                    className="px-3 py-2 rounded-xl bg-rose-950/80 text-rose-200 font-display text-xs"
                  >
                    Uitzetten
                  </button>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    Slim Herhalingsgeheugen
                  </div>
                  <div className="text-xs text-slate-400">
                    {playedHistoryCount} vragen/opdrachten onthouden over
                    avonden heen
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPlayedHistory}
                  className="px-3.5 py-2 rounded-xl bg-[#1B2752] border border-white/20 text-xs font-display text-[#F5C542]"
                >
                  🧹 Wis Geheugen
                </button>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-bold text-white">
                    Standaard Content Synchroniseren
                  </div>
                  <div className="text-xs text-slate-400">
                    Voegt nieuw meegeleverde vragen toe zonder eigen vragen te
                    overschrijven
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSyncSeeds}
                  className="px-3.5 py-2 rounded-xl bg-[#1B2752] border border-[#22C55E]/50 text-xs font-display text-[#4ADE80] flex items-center gap-1.5 flex-shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Sync Vragen
                </button>
              </div>
            </div>

            {/* JSON Backup Export, Import & Automatic Rotating Snapshots */}
            <div className="studio-panel rounded-3xl p-6 flex flex-col gap-4 h-fit">
              <h3 className="font-display text-2xl text-white">
                📦 Volledige JSON Backup & Snapshots
              </h3>
              <p className="text-sm text-slate-300">
                Alle vragen, 30 Seconds kaarten, geluiden, Zoom-in foto&apos;s,
                Pantomimes, Schattingen en profielen staan in{' '}
                <code>/app/data</code>.
              </p>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="py-3.5 px-5 rounded-2xl bg-[#F5C542] text-[#070B18] font-display text-lg font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Download JSON Backup
              </button>

              <label className="py-3.5 px-5 rounded-2xl bg-[#1B2752] border-2 border-dashed border-[#38BDF8] text-[#38BDF8] font-display text-lg font-bold flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" /> Herstel JSON Backup Importeren
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportBackup(f);
                    e.target.value = '';
                  }}
                />
              </label>

              <div className="pt-3 border-t border-white/15 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base text-[#F5C542] flex items-center gap-1.5">
                    <History className="w-4 h-4" /> Lokale Snapshots (
                    {backupSnapshots.length}/10)
                  </span>
                  <button
                    type="button"
                    onClick={handleCreateSnapshot}
                    className="text-xs px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold"
                  >
                    + Maak Snapshot
                  </button>
                </div>
                {backupSnapshots.length === 0 ? (
                  <div className="text-xs text-slate-400">
                    Nog geen lokale snapshots in /app/data/backups.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                    {backupSnapshots.map((snap) => (
                      <div
                        key={snap.filename}
                        className="px-3 py-2 rounded-xl bg-[#070B18]/80 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="truncate">
                          <div className="text-white font-mono truncate">
                            {snap.filename}
                          </div>
                          <div className="text-slate-400">
                            {Math.round(snap.sizeBytes / 1024)} KB
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.filename)}
                          className="px-2.5 py-1 rounded-lg bg-[#1B2752] text-[#F5C542] font-bold flex-shrink-0"
                        >
                          Herstel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
