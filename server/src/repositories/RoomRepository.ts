/**
 * Репозиторий комнат — единственное место, которое знает, ГДЕ и КАК физически хранятся комнаты
 */

type RoomLike = any;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomRepository {
  private rooms = new Map<string, RoomLike>();

  /**
   * Генерирует код комнаты, которого гарантированно ещё нет в хранилище.
   */
  generateUniqueCode(length = 6): string {
    let code: string;
    do {
      code = Array.from(
        { length },
        () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
      ).join('');
    } while (this.rooms.has(code));
    return code;
  }

  save(room: RoomLike): RoomLike {
    this.rooms.set(room.code, room);
    return room;
  }

  findByCode(code: string): RoomLike | null {
    return this.rooms.get(code) ?? null;
  }

  exists(code: string): boolean {
    return this.rooms.has(code);
  }

  delete(code: string): boolean {
    return this.rooms.delete(code);
  }

  findAll(): RoomLike[] {
    return [...this.rooms.values()];
  }
}

export const roomRepository = new RoomRepository();