const { nanoid } = require('nanoid');
const { sessionRepository } = require('../repositories/SessionRepository');

const SESSION_MAX_AGE = 86400; // 24 часа в секундах

function createSession() {
  const sessionId = nanoid(32);
  sessionRepository.create(sessionId, { roomCode: null, name: null, hasVoted: false });
  return sessionId;
}

// Восстанавливает сессию с существующим sessionId (например, после рестарта сервера)
function restoreSession(sessionId) {
  sessionRepository.create(sessionId, { roomCode: null, name: null, hasVoted: false });
  return sessionId;
}

function getSession(sessionId) {
  return sessionRepository.findById(sessionId);
}

function updateSession(sessionId, data) {
  return sessionRepository.update(sessionId, data);
}

function setSessionCookie(res, sessionId) {
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE * 1000,
  });
}

module.exports = { createSession, restoreSession, getSession, updateSession, setSessionCookie, SESSION_MAX_AGE };