/**
 * Единый набор кодов ошибок для всего сервера.
 */
export enum ErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  NOT_IN_ROOM = 'NOT_IN_ROOM',
  NOT_ADMIN = 'NOT_ADMIN',
  ALREADY_VOTED = 'ALREADY_VOTED',
  ROUND_NOT_ACTIVE = 'ROUND_NOT_ACTIVE',
  INVALID_VOTE = 'INVALID_VOTE',
  NAME_REQUIRED = 'NAME_REQUIRED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_INPUT = 'INVALID_INPUT',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

export type Result<T> = { success: true; data: T } | { success: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<T = never>(code: ErrorCode, message: string, details?: unknown): Result<T> {
  return { success: false, error: { code, message, details } };
}