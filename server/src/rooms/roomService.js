const { nanoid } = require('nanoid');
const { rooms, sessions } = require('./store');
const Room = require('./Rooms.js');

function generateRoomCode(usedCodes) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (usedCodes.has(code));
  return code;
}

function createRoom(adminSessionId, options = {}) {
  const code = generateRoomCode(rooms);
  const room = new Room(code, adminSessionId, options);
  rooms.set(code, room);
  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

// Полностью удаляет комнату.
function closeRoom(code) {
  rooms.delete(code);
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

module.exports = { createRoom, getRoom, closeRoom };