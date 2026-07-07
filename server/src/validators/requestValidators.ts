import { Result, ok, err, ErrorCode } from '../types/errors';

/** Имя участника: обязательно, обрезаем пробелы (как и раньше). */
export function validateName(raw: unknown): Result<string> {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return err(ErrorCode.NAME_REQUIRED, 'Укажите имя');
  return ok(trimmed);
}

/**
 * Кворум необязателен (undefined — оставить как есть у комнаты).
 * Если передан — должен быть положительным числом.
 */
export function validateQuorum(raw: unknown): Result<number | undefined> {
  if (raw === undefined || raw === null || raw === '') return ok(undefined);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return err(ErrorCode.INVALID_INPUT, 'Кворум должен быть положительным числом');
  }
  return ok(n);
}