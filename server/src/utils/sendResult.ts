import { ErrorCode, Result } from '../types/errors';

/**
 * Клиент (client/src/pages/JoinPage.jsx) сейчас читает `err.response.data.error`
 * и показывает его пользователю как есть — поэтому `error` должен остаться
 * читаемым текстом, как было. `code` — новое поле, для будущего перехода
 * клиента на обработку по коду вместо текста (см. ТЗ, раздел 3.1).
 */
const HTTP_STATUS_BY_ERROR_CODE: Record<ErrorCode, number> = {
  [ErrorCode.ROOM_NOT_FOUND]: 404,
  [ErrorCode.NOT_IN_ROOM]: 400,
  [ErrorCode.NOT_ADMIN]: 403,
  [ErrorCode.ALREADY_VOTED]: 400,
  [ErrorCode.ROUND_NOT_ACTIVE]: 400,
  [ErrorCode.INVALID_VOTE]: 400,
  [ErrorCode.NAME_REQUIRED]: 400,
  [ErrorCode.SESSION_NOT_FOUND]: 401,
  [ErrorCode.INVALID_INPUT]: 400,
};

/** `res` типизирован слабо (`any`), чтобы не тянуть @types/express ради одной функции. */
export function sendResult<T>(res: any, result: Result<T>, successStatus = 200): void {
  if (result.success) {
    res.status(successStatus).json(result.data);
    return;
  }
  const status = HTTP_STATUS_BY_ERROR_CODE[result.error.code] ?? 400;
  res.status(status).json({ error: result.error.message, code: result.error.code });
}