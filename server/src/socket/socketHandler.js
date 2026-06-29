const roomService = require('../rooms/roomService');
const sessionService = require('../session/sessionService');

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
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const sessionId = cookies.sessionId;
    const session = sessionId ? sessionService.getSession(sessionId) : null;

    socket.on('join_room', ({ roomCode, name }) => {
      const room = roomService.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.sessionId = sessionId;
      socket.participantName = name;
      socket.isAdmin = room.adminSessionId === sessionId;

      console.log(`[join_room] socket=${socket.id} room=${roomCode} sessionId=${sessionId} isAdmin=${socket.isAdmin}`);

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
        topic: room.topic || '',
        resultMode: room.resultMode
      });

      socket.to(roomCode).emit('participant_joined', { name });
    });

    // Участник покидает комнату
    socket.on('leave_room', ({ roomCode }) => {
      const name = roomService.removeParticipant(roomCode, sessionId);
      if (!name) return;

      sessionService.updateSession(sessionId, { roomCode: null, name: null, hasVoted: false });

      // Уведомляем остальных об уходе
      io.to(roomCode).emit('participant_left', { name });

      socket.leave(roomCode);
      socket.roomCode = null;
      socket.emit('left_room');

      console.log(`[leave_room] ${name} покинул ${roomCode}`);
    });

    // Администратор закрывает комнату
    socket.on('close_room', ({ roomCode }) => {
      const room = roomService.getRoom(roomCode);
      if (!room || !socket.isAdmin) return;

      console.log(`[close_room] admin закрывает комнату ${roomCode}`);

      // Сначала рассылаем событие всем в комнате
      io.to(roomCode).emit('room_closed');

      // Затем удаляем комнату
      roomService.closeRoom(roomCode);
      sessionService.updateSession(sessionId, { roomCode: null, name: null });
    });

    socket.on('start_round', ({ roomCode, quorum }) => {
      const room = roomService.getRoom(roomCode);
      if (!room || !socket.isAdmin) return;

      roomService.startRound(roomCode, quorum);

      io.to(roomCode).emit('round_started', {
        round: room.currentRound,
        quorum: room.quorum,
      });
    });

    socket.on('set_topic', ({ roomCode, topic }) => {
      const room = roomService.getRoom(roomCode);
      if (!room || !socket.isAdmin) return;

      room.topic = topic.slice(0, 200); // лимит на сервере
      io.to(roomCode).emit('topic_updated', { topic: room.topic });
    });

    socket.on('cast_vote', ({ roomCode, value }) => {
      const result = roomService.castVote(roomCode, sessionId, value);
      if (!result.ok) {
        socket.emit('vote_error', { reason: result.reason });
        return;
      }

      io.to(roomCode).emit('vote_cast', {
        votedCount: result.votedCount,
        quorum: roomService.getRoom(roomCode)?.quorum,
        voterName: socket.participantName,
      });

      if (result.quorumReached) {
        const stopResult = roomService.stopRound(roomCode);
        io.to(roomCode).emit('round_stopped', {
          result: stopResult.result,
          allVotes: stopResult.allVotes,
          resultMode: stopResult.resultMode,
          votedCount: stopResult.votedCount,
          reason: 'quorum',
        });
      }
    });

    socket.on('stop_round', ({ roomCode }) => {
      const room = roomService.getRoom(roomCode);
      if (!room || !socket.isAdmin) return;

      const stopResult = roomService.stopRound(roomCode);
      io.to(roomCode).emit('round_stopped', {
        result: stopResult.result,
        allVotes: stopResult.allVotes,
        resultMode: stopResult.resultMode,
        votedCount: stopResult.votedCount,
        reason: 'manual',
      });
    });

    socket.on('new_round', ({ roomCode }) => {
      const room = roomService.getRoom(roomCode);
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