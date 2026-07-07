// Контроллер комнаты: вся бизнес-логика, которая раньше была размазана
// по socketHandler.js. Каждая функция сама ищет комнату по коду один раз,
// проверяет права (админ/участник) и возвращает готовый результат —
// socketHandler дальше только решает, что и куда эмитить.
//
// Единый формат ответа: { ok: true, ... } либо { ok: false, reason? }.

const roomService = require('../rooms/roomService');
const sessionService = require('../session/sessionService');

function getParticipantsList(room) {
  return [...room.participants.entries()].map(([, p]) => ({
    name: p.name,
    hasVoted: p.hasVoted,
  }));
}

function isAdmin(room, sessionId) {
  return !!room && room.adminSessionId === sessionId;
}

function joinRoom(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  if (!room) return { ok: false, reason: 'not_found' };

  return {
    ok: true,
    room,
    isAdmin: isAdmin(room, sessionId),
    participants: getParticipantsList(room),
    hasVoted: room.participants.get(sessionId)?.hasVoted || false,
  };
}

function leaveRoom(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  if (!room) return { ok: false, reason: 'not_found' };

  const name = room.removeParticipant(sessionId);
  if (!name) return { ok: false, reason: 'not_in_room' };

  sessionService.updateSession(sessionId, { roomCode: null, name: null, hasVoted: false });
  return { ok: true, name };
}

function closeRoom(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  if (!isAdmin(room, sessionId)) return { ok: false, reason: 'not_admin' };

  roomService.closeRoom(roomCode);
  sessionService.updateSession(sessionId, { roomCode: null, name: null });
  return { ok: true };
}

function startRound(roomCode, sessionId, quorum) {
  const room = roomService.getRoom(roomCode);
  if (!isAdmin(room, sessionId)) return { ok: false, reason: 'not_admin' };

  room.startRound(quorum);
  return { ok: true, round: room.currentRound, quorum: room.quorum };
}

function setTopic(roomCode, sessionId, topic) {
  const room = roomService.getRoom(roomCode);
  if (!isAdmin(room, sessionId)) return { ok: false, reason: 'not_admin' };

  room.topic = (topic || '').slice(0, 200); // лимит на сервере
  return { ok: true, topic: room.topic };
}

// Room.castVote возвращает Result<CastVoteData> (см. src/rooms/Rooms.ts).
// Здесь переводим его в старый { ok, reason } формат, которым уже пользуется
// socketHandler.js — сам socketHandler на Result переведём отдельным этапом.
const REASON_BY_ERROR_CODE = {
  ROUND_NOT_ACTIVE: 'not_active',
  NOT_IN_ROOM: 'not_in_room',
  ALREADY_VOTED: 'already_voted',
};

function castVote(roomCode, sessionId, value) {
  const room = roomService.getRoom(roomCode);
  if (!room) return { ok: false, reason: 'not_in_room' };

  const result = room.castVote(sessionId, value);
  if (!result.success) {
    return { ok: false, reason: REASON_BY_ERROR_CODE[result.error.code] || result.error.code };
  }

  const response = {
    ok: true,
    votedCount: result.data.votedCount,
    quorum: room.quorum,
    voterName: room.participants.get(sessionId)?.name,
  };

  if (result.data.quorumReached) {
    response.stopResult = room.stopRound();
  }
  return response;
}

function stopRound(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  if (!isAdmin(room, sessionId)) return { ok: false, reason: 'not_admin' };

  return { ok: true, stopResult: room.stopRound() };
}

function newRound(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  if (!isAdmin(room, sessionId)) return { ok: false, reason: 'not_admin' };

  room.newRound();
  return { ok: true };
}

function handleDisconnect(roomCode, sessionId) {
  const room = roomService.getRoom(roomCode);
  const participant = room?.participants.get(sessionId);
  if (!participant) return { ok: false, reason: 'not_in_room' };

  return { ok: true, name: participant.name };
}

module.exports = {
  joinRoom,
  leaveRoom,
  closeRoom,
  startRound,
  setTopic,
  castVote,
  stopRound,
  newRound,
  handleDisconnect,
  getParticipantsList,
};