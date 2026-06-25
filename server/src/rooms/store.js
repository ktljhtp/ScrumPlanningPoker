// Все комнаты хранятся здесь.
// Map<roomCode, roomObject>
const rooms = new Map();

// Map<sessionId, { roomCode, name, hasVoted }>
const sessions = new Map();

module.exports = { rooms, sessions };