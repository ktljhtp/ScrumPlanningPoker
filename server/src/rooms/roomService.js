const Room = require('./Rooms.ts');
const { roomRepository } = require('../repositories/RoomRepository');

function createRoom(adminSessionId, options = {}) {
  const code = roomRepository.generateUniqueCode();
  const room = new Room(code, adminSessionId, options);
  roomRepository.save(room);
  return room;
}

function getRoom(code) {
  return roomRepository.findByCode(code);
}

// Полностью удаляет комнату.
function closeRoom(code) {
  roomRepository.delete(code);
}

function cleanupRooms() {
  const now = Date.now();
  for (const room of roomRepository.findAll()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      roomRepository.delete(room.code);
    }
  }
}

setInterval(cleanupRooms, 60 * 60 * 1000);

module.exports = { createRoom, getRoom, closeRoom };