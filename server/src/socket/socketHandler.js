const roomService = require('../rooms/roomService');
const sessionService = require('../session/sessionService');

// Вспомогательная функция: распарсить cookie из строки
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(part => {
    const [key, val] = part.trim().split('=');
    cookies[key] = decodeURIComponent(val || '');
  });
  return cookies;
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    // Получаем sessionId из cookie
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const sessionId = cookies.sessionId;
    const session = sessionId ? sessionService.getSession(sessionId) : null;

    console.log(`[connect] socket=${socket.id} sessionId=${sessionId} sessionFound=${!!session}`);

    // Клиент запрашивает вход в комнату через WebSocket
    socket.on('join_room', ({ roomCode, name }) => {
      const room = roomService.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.sessionId = sessionId;
      socket.isAdmin = room.adminSessionId === sessionId;

      console.log(`[join_room] socket=${socket.id} room=${roomCode} sessionId=${sessionId} adminSessionId=${room.adminSessionId} isAdmin=${socket.isAdmin}`);

      const participants = [...room.participants.entries()].map(([sid, p]) => ({
        name: p.name,
        hasVoted: p.hasVoted,
      }));

      socket.emit('room_joined', {
        code: room.code,
        status: room.status,
        quorum: room.quorum,
        deck: room.deck,
        participants,
        isAdmin: socket.isAdmin,
        hasVoted: room.participants.get(sessionId)?.hasVoted || false,
      });

      socket.to(roomCode).emit('participant_joined', { name });
    });

    // Администратор начинает раунд
    socket.on('start_round', ({ roomCode, quorum }) => {
      const room = roomService.getRoom(roomCode);
      console.log(`[start_round] socket=${socket.id} room=${roomCode} socket.isAdmin=${socket.isAdmin} sessionId=${sessionId} adminSessionId=${room?.adminSessionId}`);
      if (!room || !socket.isAdmin) return;

      if (quorum !== undefined) room.quorum = Number(quorum);
      roomService.startRound(roomCode);

      io.to(roomCode).emit('round_started', {
        round: room.currentRound,
        quorum: room.quorum,
      });
    });

    // Участник голосует
    socket.on('cast_vote', ({ roomCode, value }) => {
      const result = roomService.castVote(roomCode, sessionId, value);
      if (!result.ok) {
        socket.emit('vote_error', { reason: result.reason });
        return;
      }

      io.to(roomCode).emit('vote_cast', {
        votedCount: result.votedCount,
        quorum: roomService.getRoom(roomCode)?.quorum,
      });

      if (result.quorumReached) {
        const stopResult = roomService.stopRound(roomCode);
        io.to(roomCode).emit('round_stopped', {
          result: stopResult.result,
          allVotes: stopResult.allVotes,
          votedCount: stopResult.votedCount,
          reason: 'quorum',
        });
      }
    });

    // Администратор останавливает вручную
    socket.on('stop_round', ({ roomCode }) => {
      const room = roomService.getRoom(roomCode);
      console.log(`[stop_round] socket=${socket.id} socket.isAdmin=${socket.isAdmin}`);
      if (!room || !socket.isAdmin) return;

      const stopResult = roomService.stopRound(roomCode);
      io.to(roomCode).emit('round_stopped', {
        result: stopResult.result,
        allVotes: stopResult.allVotes,
        votedCount: stopResult.votedCount,
        reason: 'manual',
      });
    });

    // Администратор сбрасывает для нового раунда (без старта)
    socket.on('new_round', ({ roomCode }) => {
      const room = roomService.getRoom(roomCode);
      console.log(`[new_round] socket=${socket.id} socket.isAdmin=${socket.isAdmin}`);
      if (!room || !socket.isAdmin) return;
      room.status = 'waiting';
      io.to(roomCode).emit('new_round_ready');
    });

    socket.on('disconnect', () => {
      console.log(`[disconnect] socket=${socket.id}`);
      if (socket.roomCode) {
        const room = roomService.getRoom(socket.roomCode);
        const participant = room?.participants.get(socket.sessionId);
        if (participant) {
          socket.to(socket.roomCode).emit('participant_left', { name: participant.name });
        }
      }
    });
  });
};