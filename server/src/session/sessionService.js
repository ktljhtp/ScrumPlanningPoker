const { sessionService, setSessionCookie, SESSION_MAX_AGE } = require('../services/SessionService');

function createSession() {
  return sessionService.create();
}

function restoreSession(sessionId) {
  return sessionService.restore(sessionId);
}

function getSession(sessionId) {
  return sessionService.get(sessionId);
}

function updateSession(sessionId, data) {
  return sessionService.update(sessionId, data);
}

module.exports = { createSession, restoreSession, getSession, updateSession, setSessionCookie, SESSION_MAX_AGE };