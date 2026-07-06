/**
 * Статусы комнаты. Значения совпадают со строками, которые уже отдаются
 * клиенту сегодня ('waiting' | 'active' | 'stopped') — обратная
 * совместимость не нарушается, просто больше не разбросаны строковые
 * литералы по коду.
 */
export enum RoomStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  STOPPED = 'stopped',
}

/**
 * Имена WebSocket-событий (both входящих от клиента и исходящих от сервера).
 * Используются socketHandler'ом при подписке (`socket.on`) и при рассылке
 * (`io.emit` / `socket.emit`), чтобы не было опечаток в строках и чтобы
 * IDE подсказывала все существующие события в одном месте.
 */
export enum WebSocketEvent {
  // Клиент → сервер
  JOIN_ROOM = 'join_room',
  LEAVE_ROOM = 'leave_room',
  CLOSE_ROOM = 'close_room',
  START_ROUND = 'start_round',
  SET_TOPIC = 'set_topic',
  CAST_VOTE = 'cast_vote',
  STOP_ROUND = 'stop_round',
  NEW_ROUND = 'new_round',

  // Сервер → клиент
  ROOM_JOINED = 'room_joined',
  LEFT_ROOM = 'left_room',
  PARTICIPANT_JOINED = 'participant_joined',
  PARTICIPANT_LEFT = 'participant_left',
  ROOM_CLOSED = 'room_closed',
  ROUND_STARTED = 'round_started',
  TOPIC_UPDATED = 'topic_updated',
  VOTE_CAST = 'vote_cast',
  VOTE_ERROR = 'vote_error',
  ROUND_STOPPED = 'round_stopped',
  NEW_ROUND_READY = 'new_round_ready',
  ERROR = 'error',
}

/**
 * ВАЖНО: в текущей модели роль участника (админ/обычный) нигде не хранится
 * отдельным полем — она всегда вычисляется сравнением
 * `room.adminSessionId === sessionId` (см. roomController.isAdmin). Поэтому
 * отдельный enum UserRole пока не заводим: заводить его было бы избыточно
 * и создало бы риск рассинхронизации между «вычисленной» и «хранимой» ролью.
 * Если в будущем появятся роли сложнее (например, observer/spectator),
 * тогда есть смысл вернуться к этому и хранить role прямо в участнике.
 */