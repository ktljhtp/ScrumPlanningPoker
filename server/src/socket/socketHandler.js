// Обработчик сокет-событий. Вся бизнес-логика вынесена в roomController —
// здесь только маршрутизация: принять событие, вызвать контроллер, разослать
// результат нужным клиентам.

const roomController = require('../rooms/roomController');

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

    socket.on('join_room', ({ roomCode, name }) => {
      const result = roomController.joinRoom(roomCode, sessionId);
      if (!result.ok) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.sessionId = sessionId;
      socket.participantName = name;
      socket.isAdmin = result.isAdmin;

      socket.emit('room_joined', {
        code: result.room.code,
        status: result.room.status,
        quorum: result.room.quorum,
        deck: result.room.deck,
        participants: result.participants,
        isAdmin: result.isAdmin,
        hasVoted: result.hasVoted,
        topic: result.room.topic || '',
        resultMode: result.room.resultMode,
      });

      socket.to(roomCode).emit('participant_joined', { name });
    });

    // Участник покидает комнату
    socket.on('leave_room', ({ roomCode }) => {
      const result = roomController.leaveRoom(roomCode, sessionId);
      if (!result.ok) return;

      // Уведомляем остальных об уходе
      io.to(roomCode).emit('participant_left', { name: result.name });

      socket.leave(roomCode);
      socket.roomCode = null;
      socket.emit('left_room');
    });

    // Администратор закрывает комнату
    socket.on('close_room', ({ roomCode }) => {
      const result = roomController.closeRoom(roomCode, sessionId);
      if (!result.ok) return;

      io.to(roomCode).emit('room_closed');
    });

    socket.on('start_round', ({ roomCode, quorum }) => {
      const result = roomController.startRound(roomCode, sessionId, quorum);
      if (!result.ok) return;

      io.to(roomCode).emit('round_started', {
        round: result.round,
        quorum: result.quorum,
      });
    });

    socket.on('set_topic', ({ roomCode, topic }) => {
      const result = roomController.setTopic(roomCode, sessionId, topic);
      if (!result.ok) return;

      io.to(roomCode).emit('topic_updated', { topic: result.topic });
    });

    socket.on('cast_vote', ({ roomCode, value }) => {
      const result = roomController.castVote(roomCode, sessionId, value);
      if (!result.ok) {
        socket.emit('vote_error', { reason: result.reason });
        return;
      }

      io.to(roomCode).emit('vote_cast', {
        votedCount: result.votedCount,
        quorum: result.quorum,
        voterName: result.voterName,
      });

      if (result.stopResult) {
        io.to(roomCode).emit('round_stopped', {
          ...result.stopResult,
          reason: 'quorum',
        });
      }
    });

    socket.on('stop_round', ({ roomCode }) => {
      const result = roomController.stopRound(roomCode, sessionId);
      if (!result.ok) return;

      io.to(roomCode).emit('round_stopped', {
        ...result.stopResult,
        reason: 'manual',
      });
    });

    socket.on('new_round', ({ roomCode }) => {
      const result = roomController.newRound(roomCode, sessionId);
      if (!result.ok) return;

      io.to(roomCode).emit('new_round_ready');
    });

    socket.on('disconnect', () => {
      if (!socket.roomCode) return;

      const result = roomController.handleDisconnect(socket.roomCode, socket.sessionId);
      if (!result.ok) return;

      socket.to(socket.roomCode).emit('participant_left', { name: result.name });
    });
  });
};