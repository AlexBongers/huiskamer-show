export interface SessionRecord {
  sessionToken: string;
  playerId: string;
  profileId?: string;
  createdAt: number;
}

export class RoomManager {
  public readonly roomCode: string = 'BONGERS';
  private sessions = new Map<string, SessionRecord>();
  private socketToPlayer = new Map<string, string>();

  public createOrRestoreSession(
    existingToken: string | undefined,
    playerId: string,
    profileId?: string
  ): SessionRecord {
    if (existingToken && this.sessions.has(existingToken)) {
      const rec = this.sessions.get(existingToken)!;
      return rec;
    }
    const token =
      existingToken ||
      `tok_${playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: SessionRecord = {
      sessionToken: token,
      playerId,
      profileId,
      createdAt: Date.now(),
    };
    this.sessions.set(token, record);
    return record;
  }

  public getSession(token: string): SessionRecord | undefined {
    return this.sessions.get(token);
  }

  public bindSocket(socketId: string, playerId: string): void {
    this.socketToPlayer.set(socketId, playerId);
  }

  public unbindSocket(socketId: string): string | undefined {
    const pid = this.socketToPlayer.get(socketId);
    this.socketToPlayer.delete(socketId);
    return pid;
  }

  public getPlayerIdBySocket(socketId: string): string | undefined {
    return this.socketToPlayer.get(socketId);
  }

  public isPlayerConnectedOnAnySocket(playerId: string): boolean {
    for (const pid of this.socketToPlayer.values()) {
      if (pid === playerId) return true;
    }
    return false;
  }
}
