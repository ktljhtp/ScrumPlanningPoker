/**
 * Бизнес-логика для комнат. Ничего не знает про req/res и не трогает Map
 * напрямую — только через RoomRepository (DI через конструктор, см. низ
 * файла — там же собран синглтон для обратной совместимости).
 *
 * Все публичные методы, которые могут завершиться неудачей, возвращают
 * Result<T> вместо throw — единый формат для всего сервера (раздел 3.1 ТЗ).
 */

import { RoomRepository, roomRepository } from '../repositories/RoomRepository';
import { Result, ok, err, ErrorCode } from '../types/errors';
import { validateName, validateQuorum } from '../validators/requestValidators';

const Room = require('../rooms/Rooms');

type RoomLike = any; // см. комментарий в RoomRepository.ts — станет реальным типом, когда Room обзаведётся полноценным TS-интерфейсом наружу

export interface CreateRoomOptions {
  quorum?: number | string;
  resultMode?: 'median' | 'average';
}

const ROOM_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export class RoomService {
  constructor(private rooms: RoomRepository) {}

  // --- простые операции без валидации (используются внутри сервера,
  // например roomController.js уже сам проверяет права до вызова) ---

  createRoom(adminSessionId: string, options: CreateRoomOptions = {}): RoomLike {
    const code = this.rooms.generateUniqueCode();
    const room = new Room(code, adminSessionId, options);
    this.rooms.save(room);
    return room;
  }

  getRoom(code: string): RoomLike | null {
    return this.rooms.findByCode(code);
  }

  /** Удаляет комнату без проверки прав — вызывающий код должен проверить сам. */
  deleteRoom(code: string): void {
    this.rooms.delete(code);
  }

  cleanupStale(maxAgeMs: number = ROOM_MAX_AGE_MS): void {
    const now = Date.now();
    for (const room of this.rooms.findAll()) {
      if (now - room.createdAt > maxAgeMs) {
        this.rooms.delete(room.code);
      }
    }
  }

  // --- валидированные операции для API-слоя (routes.js) ---

  private requireRoom(code: string): Result<RoomLike> {
    const room = this.rooms.findByCode(code);
    if (!room) return err(ErrorCode.ROOM_NOT_FOUND, 'Комната не найдена');
    return ok(room);
  }

  private requireAdmin(room: RoomLike, sessionId: string): Result<null> {
    if (room.adminSessionId !== sessionId) {
      return err(ErrorCode.NOT_ADMIN, 'Только администратор комнаты может это сделать');
    }
    return ok(null);
  }

  joinRoom(code: string, sessionId: string, rawName: unknown): Result<{ room: RoomLike; name: string }> {
    const nameResult = validateName(rawName);
    if (!nameResult.success) return nameResult;

    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;

    const room = roomResult.data;

    // Админ может попасть сюда, если открыл форму «Войти» в свою же комнату
    // (например, во второй вкладке) — он не должен становиться обычным
    // участником: не в списке участников, не учитывается в кворуме.
    if (room.adminSessionId !== sessionId) {
      room.join(sessionId, nameResult.data);
    }

    return ok({ room, name: nameResult.data });
  }

  closeRoom(code: string, sessionId: string): Result<null> {
    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;

    const adminCheck = this.requireAdmin(roomResult.data, sessionId);
    if (!adminCheck.success) return adminCheck;

    this.rooms.delete(code);
    return ok(null);
  }

  startRound(code: string, sessionId: string, rawQuorum: unknown): Result<{ round: number; quorum: number }> {
    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;
    const room = roomResult.data;

    const adminCheck = this.requireAdmin(room, sessionId);
    if (!adminCheck.success) return adminCheck;

    const quorumResult = validateQuorum(rawQuorum);
    if (!quorumResult.success) return quorumResult;

    room.startRound(quorumResult.data);
    return ok({ round: room.currentRound, quorum: room.quorum });
  }

  stopRound(code: string, sessionId: string): Result<ReturnType<RoomLike['stopRound']>> {
    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;
    const room = roomResult.data;

    const adminCheck = this.requireAdmin(room, sessionId);
    if (!adminCheck.success) return adminCheck;

    return ok(room.stopRound());
  }

  castVote(code: string, sessionId: string, value: unknown): Result<{ votedCount: number }> {
    const roomResult = this.requireRoom(code);
    if (!roomResult.success) return roomResult;

    // Room.castVote уже возвращает Result<CastVoteData> — прокидываем как есть.
    const result = roomResult.data.castVote(sessionId, value);
    if (!result.success) return result;
    return ok({ votedCount: result.data.votedCount });
  }
}

/** Общий на процесс экземпляр — используется старыми модулями через шим-обёртки. */
export const roomService = new RoomService(roomRepository);