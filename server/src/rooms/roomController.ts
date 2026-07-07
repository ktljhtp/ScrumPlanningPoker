import { RoomService, roomService } from 'D:\ScrumPlanningPoker\server\src\services\RoomService.ts';
import { SessionService, sessionService } from '../services/SessionService';
import { Result, ok, err, ErrorCode } from '../types/errors';

type RoomLike = any; // см. комментарий в RoomRepository.ts

interface ParticipantView {
  name: string;
  hasVoted: boolean;
}

interface JoinRoomData {
  room: RoomLike;
  isAdmin: boolean;
  participants: ParticipantView[];
  hasVoted: boolean;
}

interface CastVoteData {
  votedCount: number;
  quorum: number;
  voterName: string | undefined;
  stopResult?: ReturnType<RoomLike['stopRound']>;
}

/**
 * Контроллер комнаты для WebSocket-слоя. Каждый публичный метод получает
 * комнату из RoomService ровно один раз и возвращает Result<T> — дальше
 * socketHandler.js только решает, что и куда эмитить.
 *
 * Правила, общие с HTTP API (кто админ, можно ли стартовать/останавливать
 * раунд), не дублируются — для них контроллер зовёт RoomService напрямую
 * (closeRoom/startRound/stopRound). Здесь остаётся только то, что специфично
 * для сокет-транспорта: подключение сокета к уже существующему участнику,
 * авто-стоп раунда по достижению кворума при голосовании и т.п.
 */
export class RoomController {
  constructor(
    private roomService: RoomService,
    private sessionService: SessionService,
  ) {}

  private getParticipantsList(room: RoomLike): ParticipantView[] {
    return [...room.participants.entries()].map(([, p]: [string, any]) => ({
      name: p.name,
      hasVoted: p.hasVoted,
    }));
  }

  private requireRoom(code: string): Result<RoomLike> {
    const room = this.roomService.getRoom(code);
    if (!room) return err(ErrorCode.ROOM_NOT_FOUND, 'Комната не найдена');
    return ok(room);
  }

  private requireAdminRoom(code: string, sessionId: string): Result<RoomLike> {
    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;
    if (roomResult.data.adminSessionId !== sessionId) {
      return err(ErrorCode.NOT_ADMIN, 'Только администратор комнаты может это сделать');
    }
    return roomResult;
  }

  /**
   * Подключение уже открытого сокета к комнате. Само добавление участника
   * (room.join) происходит раньше, через HTTP POST /room/:code/join —
   * здесь только собираем состояние для события room_joined.
   */
  joinRoom(roomCode: string, sessionId: string): Result<JoinRoomData> {
    const roomResult = this.requireRoom(roomCode);
    if (!roomResult.success) return roomResult;
    const room = roomResult.data;

    return ok({
      room,
      isAdmin: room.adminSessionId === sessionId,
      participants: this.getParticipantsList(room),
      hasVoted: room.participants.get(sessionId)?.hasVoted || false,
    });
  }

  leaveRoom(roomCode: string, sessionId: string): Result<{ name: string }> {
    const roomResult = this.requireRoom(roomCode);
    if (!roomResult.success) return roomResult;

    const name = roomResult.data.removeParticipant(sessionId);
    if (!name) return err(ErrorCode.NOT_IN_ROOM, 'Вы не находитесь в этой комнате');

    this.sessionService.update(sessionId, { roomCode: null, name: null, hasVoted: false });
    return ok({ name });
  }

  closeRoom(roomCode: string, sessionId: string): Result<null> {
    const result = this.roomService.closeRoom(roomCode, sessionId);
    if (!result.success) return result;

    this.sessionService.update(sessionId, { roomCode: null, name: null, hasVoted: false });
    return ok(null);
  }

  startRound(roomCode: string, sessionId: string, quorum: unknown): Result<{ round: number; quorum: number }> {
    return this.roomService.startRound(roomCode, sessionId, quorum);
  }

  setTopic(roomCode: string, sessionId: string, topic: unknown): Result<{ topic: string }> {
    const roomResult = this.requireAdminRoom(roomCode, sessionId);
    if (!roomResult.success) return roomResult;

    const room = roomResult.data;
    room.topic = (typeof topic === 'string' ? topic : '').slice(0, 200); // лимит на сервере
    return ok({ topic: room.topic });
  }

  /**
   * В отличие от HTTP-версии (RoomService.castVote) здесь дополнительно
   * авто-останавливаем раунд при достижении кворума — так было в исходном
   * WS-контроллере, HTTP так никогда не делал (см. этап 4).
   */
  castVote(roomCode: string, sessionId: string, value: unknown): Result<CastVoteData> {
    const roomResult = this.requireRoom(roomCode);
    if (!roomResult.success) return roomResult;
    const room = roomResult.data;

    const voteResult = room.castVote(sessionId, value);
    if (!voteResult.success) return voteResult;

    const data: CastVoteData = {
      votedCount: voteResult.data.votedCount,
      quorum: room.quorum,
      voterName: room.participants.get(sessionId)?.name,
    };
    if (voteResult.data.quorumReached) {
      data.stopResult = room.stopRound();
    }
    return ok(data);
  }

  stopRound(roomCode: string, sessionId: string): Result<ReturnType<RoomLike['stopRound']>> {
    return this.roomService.stopRound(roomCode, sessionId);
  }

  newRound(roomCode: string, sessionId: string): Result<null> {
    const roomResult = this.requireAdminRoom(roomCode, sessionId);
    if (!roomResult.success) return roomResult;

    roomResult.data.newRound();
    return ok(null);
  }

  handleDisconnect(roomCode: string, sessionId: string): Result<{ name: string }> {
    const room = this.roomService.getRoom(roomCode);
    const participant = room?.participants.get(sessionId);
    if (!participant) return err(ErrorCode.NOT_IN_ROOM, 'Пользователь не находится в комнате');
    return ok({ name: participant.name });
  }
}

/** Общий на процесс экземпляр — для мест, которым не нужен свой DI (socketHandler.js). */
export const roomController = new RoomController(roomService, sessionService);