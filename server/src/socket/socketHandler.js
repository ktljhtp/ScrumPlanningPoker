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

    if (!session) {
      // Сессия не найдена — просто подключаем без восстановления
      console.log(`Socket connected (no session): ${socket.id}`);
    }

    // Клиент запрашивает вход в комнату через WebSocket
    socket.on('join_room', ({ roomCode, name }) => {
      const room = roomService.getRoom(roomCode);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Подключаем сокет к комнате Socket.IO
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.sessionId = sessionId;

      // Отправляем новому участнику текущее состояние комнаты
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
        isAdmin: room.adminSessionId === sessionId,
        hasVoted: room.participants.get(sessionId)?.hasVoted || false,
      });

      // Уведомляем остальных в комнате о новом участнике
      socket.to(roomCode).emit('participant_joined', { name });
    });

    // Администратор начинает раунд
    socket.on('start_round', ({ roomCode, quorum }) => {
      const room = roomService.getRoom(roomCode);
      if (!room || room.adminSessionId !== sessionId) return;

      if (quorum !== undefined) room.quorum = Number(quorum);
      roomService.startRound(roomCode);

      // Оповещаем всю комнату
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

      // Все видят счётчик, но не сами оценки
      io.to(roomCode).emit('vote_cast', {
        votedCount: result.votedCount,
        quorum: roomService.getRoom(roomCode)?.quorum,
      });

      // Если достигли кворума — автоматически останавливаем раунд
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
      if (!room || room.adminSessionId !== sessionId) return;

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
      if (!room || room.adminSessionId !== sessionId) return;
      room.status = 'waiting';
      io.to(roomCode).emit('new_round_ready');
    });

    socket.on('disconnect', () => {
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