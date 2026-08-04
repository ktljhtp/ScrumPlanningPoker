import { nanoid } from 'nanoid';
import { SessionRepository, sessionRepository, SessionData } from '../repositories/SessionRepository';

export const SESSION_MAX_AGE = 86400; // 24 часа в секундах

export class SessionService {
  constructor(private sessions: SessionRepository) {}

  /** Создаёт новую сессию и возвращает её ID. */
  create(): string {
    const sessionId = nanoid(32);
    this.sessions.create(sessionId, { roomCode: null, name: null, hasVoted: false });
    return sessionId;
  }

  /** Восстанавливает сессию с существующим sessionId (например, после рестарта сервера). */
  restore(sessionId: string): string {
    this.sessions.create(sessionId, { roomCode: null, name: null, hasVoted: false });
    return sessionId;
  }

  get(sessionId: string): SessionData | null {
    return this.sessions.findById(sessionId);
  }

  update(sessionId: string, patch: Partial<SessionData>): SessionData | null {
    return this.sessions.update(sessionId, patch);
  }
}

export const sessionService = new SessionService(sessionRepository);

/** Express Response — типизируем слабо (`any`), чтобы не тянуть @types/express ради одной функции. */
export function setSessionCookie(res: any, sessionId: string): void {
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE * 1000,
  });
}