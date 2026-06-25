const { nanoid } = require('nanoid');
const { sessions } = require('../rooms/store');

const SESSION_MAX_AGE = 86400; // 24 часа в секундах

function createSession() {
  const sessionId = nanoid(32);
  sessions.set(sessionId, { roomCode: null, name: null, hasVoted: false });
  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function updateSession(sessionId, data) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  Object.assign(session, data);
  return session;
}

// Устанавливает cookie с sessionId в ответ
function setSessionCookie(res, sessionId) {
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE * 1000, // maxAge в миллисекундах
  });
}

module.exports = { createSession, getSession, updateSession, setSessionCookie, SESSION_MAX_AGE };