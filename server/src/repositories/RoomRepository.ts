/**
 * Репозиторий комнат — единственное место, которое знает, ГДЕ и КАК физически хранятся комнаты
 */

import Room = require('../rooms/Rooms');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Контракт репозитория. RoomService зависит от этого интерфейса, а не от
 * конкретного класса RoomRepository — иначе вынос хранения в отдельный
 * класс не давал бы ничего, кроме лишнего слоя: сервис всё равно был бы
 * жёстко завязан на то, что комнаты лежат в Map в памяти. С интерфейсом
 * реализацию можно подменить (БД, тестовый дубль в памяти) не трогая
 * RoomService.
 */
export interface IRoomRepository {
  createUnique(build: (code: string) => Room, codeLength?: number): Room;
  findByCode(code: string): Room | null;
  exists(code: string): boolean;
  delete(code: string): boolean;
  findAll(): Room[];
}

export class RoomRepository implements IRoomRepository {
  private rooms = new Map<string, Room>();

  /**
   * Генерирует уникальный код и сохраняет комнату одним синхронным шагом.
   *
   * Раньше generateUniqueCode() и save() вызывались раздельно из RoomService:
   *   const code = this.rooms.generateUniqueCode();
   *   const room = new Room(code, ...);
   *   this.rooms.save(room);
   * Между первой и третьей строкой был промежуток, в течение которого код
   * мог быть занят кем-то ещё. При текущем синхронном Map-хранилище в
   * однопоточном Node.js гонки внутри этого промежутка не возникает, но
   * это ничем не гарантировано на уровне контракта — вызывающий код не
   * может и не должен полагаться на то, КАК именно реализовано хранилище.
   * Поэтому «сгенерировать код и записать» теперь атомарная операция
   * репозитория: сравнение с наличием кода в Map и запись происходят без
   * await между ними, а на случай коллизии (например, если build() успеет
   * дернуть асинхронное хранилище) — явная проверка перед записью.
   */
  createUnique(build: (code: string) => Room, codeLength = 6): Room {
    let code: string;
    do {
      code = this.generateCode(codeLength);
    } while (this.rooms.has(code));

    const room = build(code);
    if (this.rooms.has(room.code)) {
      throw new Error(`Не удалось сохранить комнату: код "${room.code}" уже занят`);
    }
    this.rooms.set(room.code, room);
    return room;
  }

  private generateCode(length: number): string {
    return Array.from(
      { length },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join('');
  }

  findByCode(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  exists(code: string): boolean {
    return this.rooms.has(code);
  }

  delete(code: string): boolean {
    return this.rooms.delete(code);
  }

  findAll(): Room[] {
    return [...this.rooms.values()];
  }
}

export const roomRepository = new RoomRepository();
