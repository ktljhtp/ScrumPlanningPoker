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

// Стандартная колода по ТЗ: числа Фибоначчи + специальные значения
const DEFAULT_DECK = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '∞'];

function createRoom(adminSessionId, options = {}) {
  const code = generateRoomCode();
  const room = {
    code,
    adminSessionId,
    participants: new Map(),
    status: 'waiting',
    quorum: options.quorum ? Number(options.quorum) : 999,
    deck: options.deck || DEFAULT_DECK,
    resultMode: options.resultMode || 'median',
    currentRound: 0,
    createdAt: Date.now(),
    topic: '',
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
  // Кворум НЕ пересчитываем автоматически —
  // по ТЗ администратор устанавливает кворум вручную независимо от числа участников
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

function startRound(code, quorum) {
  const room = getRoom(code);
  if (!room) return null;
  room.status = 'active';
  room.currentRound++;
  // Устанавливаем кворум только если явно передан; иначе оставляем текущий
  if (quorum !== undefined && quorum !== null) {
    room.quorum = Number(quorum);
  }
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

  // Собираем только числовые голоса для вычисления итога
  const numericVotes = [...room.participants.values()]
    .filter(p => p.hasVoted && typeof p.vote === 'number')
    .map(p => p.vote)
    .sort((a, b) => a - b);

  let result = null;
  if (numericVotes.length > 0) {
    if (room.resultMode === 'average') {
      result = Math.round((numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length) * 10) / 10;
    } else {
      // median — используется и для 'median', и для 'all'
      const mid = Math.floor(numericVotes.length / 2);
      result = numericVotes.length % 2 === 0
        ? (numericVotes[mid - 1] + numericVotes[mid]) / 2
        : numericVotes[mid];
    }
  }

  // allVotes возвращаем для режимов 'all' и всегда для полноты (используется в гистограмме)
  const allVotes = [...room.participants.entries()]
    .filter(([, p]) => p.hasVoted)
    .map(([, p]) => ({ name: p.name, vote: p.vote }));

  const votedCount = [...room.participants.values()].filter(p => p.hasVoted).length;

  return { result, allVotes: allVotes.length > 0 ? allVotes : null, votedCount, resultMode: room.resultMode };
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