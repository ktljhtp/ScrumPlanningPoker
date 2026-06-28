const { nanoid } = require('nanoid');
const { rooms, sessions } = require('./store');

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(adminSessionId, options = {}) {
  const code = generateRoomCode();
  const room = {
    code,
    adminSessionId,
    participants: new Map(),
    status: 'waiting',
    quorum: options.quorum || 999,
    deck: options.deck || [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '∞'],
    resultMode: options.resultMode || 'median',
    currentRound: 0,
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function joinRoom(code, sessionId, name) {
  const room = getRoom(code);
  if (!room) return null;
  room.participants.set(sessionId, { name, hasVoted: false, vote: null });
  return room;
}

// Удаляет участника из комнаты. Возвращает имя удалённого или null.
function removeParticipant(code, sessionId) {
  const room = getRoom(code);
  if (!room) return null;
  const participant = room.participants.get(sessionId);
  if (!participant) return null;
  room.participants.delete(sessionId);
  // Пересчитываем кворум, если раунд активен
  if (room.status === 'active') {
    room.quorum = room.participants.size;
  }
  return participant.name;
}

// Полностью удаляет комнату.
function closeRoom(code) {
  rooms.delete(code);
}

function castVote(code, sessionId, value) {
  const room = getRoom(code);
  if (!room || room.status !== 'active') return { ok: false, reason: 'not_active' };
  const participant = room.participants.get(sessionId);
  if (!participant) return { ok: false, reason: 'not_in_room' };
  if (participant.hasVoted) return { ok: false, reason: 'already_voted' };

  participant.vote = value;
  participant.hasVoted = true;

  const votedCount = [...room.participants.values()].filter(p => p.hasVoted).length;
  const quorumReached = votedCount >= room.quorum;
  return { ok: true, votedCount, quorumReached };
}

function startRound(code) {
  const room = getRoom(code);
  if (!room) return null;
  room.status = 'active';
  room.currentRound++;
  room.quorum = room.participants.size;
  for (const p of room.participants.values()) {
    p.hasVoted = false;
    p.vote = null;
  }
  return room;
}

function stopRound(code) {
  const room = getRoom(code);
  if (!room) return null;
  room.status = 'stopped';

  const votes = [...room.participants.values()]
    .filter(p => p.hasVoted && typeof p.vote === 'number')
    .map(p => p.vote)
    .sort((a, b) => a - b);

  let result;
  if (votes.length === 0) {
    result = null;
  } else if (room.resultMode === 'median') {
    const mid = Math.floor(votes.length / 2);
    result = votes.length % 2 === 0
      ? (votes[mid - 1] + votes[mid]) / 2
      : votes[mid];
  } else if (room.resultMode === 'average') {
    result = votes.reduce((a, b) => a + b, 0) / votes.length;
  }

  const allVotes = room.resultMode === 'all'
    ? [...room.participants.entries()].map(([sid, p]) => ({ name: p.name, vote: p.vote }))
    : null;

  return { result, allVotes, votedCount: votes.length };
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      rooms.delete(code);
    }
  }
}

setInterval(cleanupRooms, 60 * 60 * 1000);

module.exports = { createRoom, getRoom, joinRoom, removeParticipant, closeRoom, castVote, startRound, stopRound };