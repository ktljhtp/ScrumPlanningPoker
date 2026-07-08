/**
 * Статусы комнаты. 
 */
export enum RoomStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  STOPPED = 'stopped',
}

/**
 * Имена WebSocket-событий.
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
