/**
 * Единый набор кодов ошибок для всего сервера. Клиент (веб или сокет)
 * должен переключаться по `code`, а не по тексту `message` — текст можно
 * менять/переводить, не ломая клиентскую логику.
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
}

export interface AppError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * Result — обёртка над возвращаемым значением, вдохновлённая Rust'овским
 * Result<T, E>. Вместо `throw` сервисы/репозитории возвращают одну из двух
 * форм, и вызывающий код обязан явно проверить `success` перед тем как
 * достать `data`.
 */
export type Result<T> = { success: true; data: T } | { success: false; error: AppError };

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<T = never>(code: ErrorCode, message: string, details?: unknown): Result<T> {
  return { success: false, error: { code, message, details } };
}