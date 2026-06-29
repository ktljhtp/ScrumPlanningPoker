const express = require('express');
const router = express.Router();
const roomService = require('./rooms/roomService');
const sessionService = require('./session/sessionService');

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
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const participants = [...room.participants.entries()].map(([sid, p]) => ({
    name: p.name,
    hasVoted: p.hasVoted,
    vote: room.status === 'stopped' ? p.vote : undefined,
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
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name required' });

  const room = roomService.joinRoom(req.params.code, req.sessionId, name.trim());
  if (!room) return res.status(404).json({ error: 'Room not found' });

  sessionService.updateSession(req.sessionId, { roomCode: room.code, name: name.trim() });
  res.json({ ok: true });
});

// POST /api/room/:code/start
router.post('/room/:code/start', requireSession, (req, res) => {
  const room = roomService.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.adminSessionId !== req.sessionId) return res.status(403).json({ error: 'Not admin' });

  const quorum = req.body.quorum !== undefined ? Number(req.body.quorum) : undefined;
  roomService.startRound(req.params.code, quorum);
  res.json({ ok: true, quorum: room.quorum });
});

// POST /api/room/:code/stop
router.post('/room/:code/stop', requireSession, (req, res) => {
  const room = roomService.getRoom(req.params.code);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.adminSessionId !== req.sessionId) return res.status(403).json({ error: 'Not admin' });

  const result = roomService.stopRound(req.params.code);
  res.json({ ok: true, ...result });
});

// POST /api/room/:code/vote
router.post('/room/:code/vote', requireSession, (req, res) => {
  const { value } = req.body;
  const result = roomService.castVote(req.params.code, req.sessionId, value);
  if (!result.ok) return res.status(400).json({ error: result.reason });
  res.json({ ok: true, votedCount: result.votedCount });
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

module.exports = router;