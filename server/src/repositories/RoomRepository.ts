/**
 * Репозиторий комнат — единственное место, которое знает, ГДЕ и КАК физически
 * хранятся комнаты (сейчас — Map в памяти процесса). RoomService и всё, что
 * выше, обращаются только сюда и не работают с Map напрямую.
 *
 * Тип комнаты сейчас — `any`: класс `Room` (src/rooms/Rooms.js) ещё на JS.
 * Когда Room переедет на TS, здесь достаточно будет заменить `RoomLike` на
 * реальный тип — сигнатуры методов репозитория не изменятся.
 */

type RoomLike = any;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class RoomRepository {
  private rooms = new Map<string, RoomLike>();

  /**
   * Генерирует код комнаты, которого гарантированно ещё нет в хранилище.
   * Уникальность — свойство хранилища, поэтому генерация кода живёт здесь,
   * а не в сервисе.
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

/**
 * Общий на весь процесс экземпляр — сохраняет прежнее поведение
 * (одна Map на всё приложение), но за интерфейсом класса.
 */
export const roomRepository = new RoomRepository();