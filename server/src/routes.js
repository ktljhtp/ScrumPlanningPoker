const express = require('express');
const router = express.Router();

// Тонкая обёртка над SessionService — оставляет привычные имена функций.
const sessionService = require('./session/sessionService');
// Новый RoomService с валидацией и Result — используется напрямую, без шима,
// т.к. роуты нужен именно Result-based API (в отличие от roomController.js,
// который работает через WebSocket и пока живёт на старом { ok, reason }).
const { roomService } = require('./services/RoomService');
const { sendResult } = require('./utils/sendResult');
const Vote = require('./rooms/vote');

// Middleware: получить или создать сессию.
// Если cookie есть но сессия не найдена (например, после рестарта сервера) —
// восстанавливаем сессию с тем же sessionId, чтобы adminSessionId в комнате совпал.
function requireSession(req, res, next) {
  const sessionId = req.cookies.sessionId;
  if (sessionId && !sessionService.getSession(sessionId)) {
    // Сессия была, но сервер перезапустился — восстанавливаем с тем же ID
    sessionService.restoreSession(sessionId);
    sessionService.setSessionCookie(res, sessionId);
    req.sessionId = sessionId;
  } else if (!sessionId || !sessionService.getSession(sessionId)) {
    // Совсем новый пользователь — создаём новую сессию
    const newId = sessionService.createSession();
    sessionService.setSessionCookie(res, newId);
    req.sessionId = newId;
  } else {
    req.sessionId = sessionId;
  }
  next();
}

// POST /api/room — создать комнату
router.post('/room', requireSession, (req, res) => {
  const { quorum, resultMode } = req.body;
  const room = roomService.createRoom(req.sessionId, { quorum, resultMode });
  sessionService.updateSession(req.sessionId, { roomCode: room.code, role: 'admin' });
  res.json({ code: room.code, joinUrl: `/join/${room.code}` });
});

// GET /api/room/:code — состояние комнаты
router.get('/room/:code', requireSession, (req, res) => {
  const room = roomService.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Комната не найдена' });

  const participants = [...room.participants.entries()].map(([sid, p]) => ({
    name: p.name,
    hasVoted: p.hasVoted,
    vote: room.status === 'stopped' ? Vote.unwrap(p.vote) : undefined,
  }));

  res.json({
    code: room.code,
    status: room.status,
    quorum: room.quorum,
    deck: room.deck,
    resultMode: room.resultMode,
    participants,
    isAdmin: room.adminSessionId === req.sessionId,
  });
});

// POST /api/room/:code/join — войти в комнату
router.post('/room/:code/join', requireSession, (req, res) => {
  const result = roomService.joinRoom(req.params.code, req.sessionId, req.body.name);
  if (!result.success) return sendResult(res, result);

  sessionService.updateSession(req.sessionId, { roomCode: result.data.room.code, name: result.data.name });
  res.json({ ok: true });
});

// POST /api/room/:code/start
router.post('/room/:code/start', requireSession, (req, res) => {
  const result = roomService.startRound(req.params.code, req.sessionId, req.body.quorum);
  sendResult(res, mapOk(result, (data) => ({ ok: true, quorum: data.quorum })));
});

// POST /api/room/:code/stop
router.post('/room/:code/stop', requireSession, (req, res) => {
  const result = roomService.stopRound(req.params.code, req.sessionId);
  sendResult(res, mapOk(result, (data) => ({ ok: true, ...data })));
});

// POST /api/room/:code/vote
router.post('/room/:code/vote', requireSession, (req, res) => {
  const result = roomService.castVote(req.params.code, req.sessionId, req.body.value);
  sendResult(res, mapOk(result, (data) => ({ ok: true, votedCount: data.votedCount })));
});

// GET /api/session
router.get('/session', requireSession, (req, res) => {
  const session = sessionService.getSession(req.sessionId);
  if (!session || !session.roomCode) return res.json({ active: false });

  const room = roomService.getRoom(session.roomCode);
  if (!room) return res.json({ active: false });

  res.json({
    active: true,
    sessionId: req.sessionId,
    roomCode: session.roomCode,
    name: session.name,
    isAdmin: room.adminSessionId === req.sessionId,
    roomStatus: room.status,
    hasVoted: room.participants.get(req.sessionId)?.hasVoted || false,
  });
});

// Небольшой хелпер: сохраняет ok/error-обёртку Result, но подменяет
// содержимое data на нужную роуту форму ответа (совместимую со старым API).
function mapOk(result, transform) {
  return result.success ? { success: true, data: transform(result.data) } : result;
}

module.exports = router;