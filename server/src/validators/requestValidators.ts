import { Result, ok, err, ErrorCode } from '../types/errors';

/** Имя участника */
export function validateName(raw: unknown): Result<string> {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return err(ErrorCode.NAME_REQUIRED, 'Укажите имя');
  return ok(trimmed);
}

export function validateQuorum(raw: unknown): Result<number | undefined> {
  if (raw === undefined || raw === null || raw === '') return ok(undefined);
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return err(ErrorCode.INVALID_INPUT, 'Кворум должен быть положительным числом');
  }
  return ok(n);
}