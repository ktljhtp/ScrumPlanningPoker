/**
 * Тип голоса: явно разделяет числовые значения (Number) и специальные,
 * например '?' или '∞' (Special). Раньше это был голый примитив, и по всему
 * коду приходилось повторять `typeof vote === 'number'`. Теперь фильтрация
 * и расчёт метрик опираются на один и тот же предикат.
 */

/** «Сырое» значение карты в колоде — то, что приходит от клиента и уходит обратно. */
export type CardValue = number | string;

export interface NumberVote {
  kind: 'number';
  value: number;
}

export interface SpecialVote {
  kind: 'special';
  value: string;
}

export type Vote = NumberVote | SpecialVote;

function NumberVote(value: number): NumberVote {
  return { kind: 'number', value };
}

function SpecialVote(value: string): SpecialVote {
  return { kind: 'special', value };
}

/** Конвертирует «сырое» значение (то, что пришло от клиента) в Vote. */
export function from(raw: CardValue): Vote {
  return typeof raw === 'number' ? NumberVote(raw) : SpecialVote(raw);
}

export function isNumber(vote: Vote | null | undefined): vote is NumberVote {
  return !!vote && vote.kind === 'number';
}

export function isSpecial(vote: Vote | null | undefined): vote is SpecialVote {
  return !!vote && vote.kind === 'special';
}

/** Возвращает исходное «сырое» значение — то, что можно безопасно отдать клиенту. */
export function unwrap(vote: Vote | null | undefined): CardValue | null {
  return vote ? vote.value : null;
}

// Экспортируем под теми же именами, что были в vote.js (Number/Special),
// чтобы существующие вызовы `Vote.Number(...)`, `Vote.Special(...)` не сломались.
export { NumberVote as Number, SpecialVote as Special };