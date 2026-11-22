import { io, Socket } from 'socket.io-client';
import { DifficultyLevel } from '@huiskamer-show/shared';

const STORAGE_KEY = 'huiskamer_show_session_v1';

export interface StoredPlayerSession {
  playerId: string;
  profileId?: string;
  name: string;
  avatarId: string;
  level: DifficultyLevel;
  sessionToken: string;
}

class SocketService {
  public socket: Socket;

  constructor() {
    this.socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2500,
    });
  }

  public getStoredSession(): StoredPlayerSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredPlayerSession;
    } catch {
      return null;
    }
  }

  public saveStoredSession(sess: StoredPlayerSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
    } catch {
      // ignore storage quota errors
    }
  }

  public clearStoredSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const socketService = new SocketService();

export function vibrateDevice(msOrPattern: number | number[] = 40): void {
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      navigator.vibrate(msOrPattern);
    }
  } catch {
    // ignore on HTTP or unsupported devices
  }
}
