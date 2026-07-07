// Тонкая обёртка для обратной совместимости: roomController.js (WebSocket-путь)
// как и раньше работает с простыми функциями createRoom/getRoom/closeRoom,
// не зная о новом RoomService/RoomRepository. Реальная логика теперь в
// src/services/RoomService.ts.
const { roomService } = require('../services/RoomService');

function createRoom(adminSessionId, options = {}) {
  return roomService.createRoom(adminSessionId, options);
}

function getRoom(code) {
  return roomService.getRoom(code);
}

// closeRoom здесь — без проверки прав (её уже делает roomController.js
// перед вызовом). Для проверенной версии см. roomService.closeRoom(code, sessionId).
function closeRoom(code) {
  roomService.deleteRoom(code);
}

setInterval(() => roomService.cleanupStale(), 60 * 60 * 1000);

module.exports = { createRoom, getRoom, closeRoom };