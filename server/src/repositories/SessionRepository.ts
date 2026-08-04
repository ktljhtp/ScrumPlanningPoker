/**
 * Репозиторий сессий — аналогично RoomRepository, только для сессий
 * пользователей (cookie sessionId -> { roomCode, name, hasVoted }).
 */

export interface SessionData {
  roomCode: string | null;
  name: string | null;
  hasVoted: boolean;
}

export class SessionRepository {
  private sessions = new Map<string, SessionData>();

  create(sessionId: string, data: SessionData): SessionData {
    this.sessions.set(sessionId, data);
    return data;
  }

  findById(sessionId: string): SessionData | null {
    return this.sessions.get(sessionId) ?? null;
  }

  update(sessionId: string, patch: Partial<SessionData>): SessionData | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    Object.assign(session, patch);
    return session;
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const sessionRepository = new SessionRepository();