// Тип голоса: явно разделяет числовые значения (Number) и специальные,
// например '?' или '∞' (Special). Раньше это был голый примитив, и по всему
// коду приходилось повторять `typeof vote === 'number'`. Теперь фильтрация
// и расчёт метрик опираются на один и тот же предикат.

function NumberVote(value) {
  return { kind: 'number', value };
}

function SpecialVote(value) {
  return { kind: 'special', value };
}

// Конвертирует «сырое» значение (то, что пришло от клиента) в Vote.
function from(raw) {
  return typeof raw === 'number' ? NumberVote(raw) : SpecialVote(raw);
}

function isNumber(vote) {
  return !!vote && vote.kind === 'number';
}

function isSpecial(vote) {
  return !!vote && vote.kind === 'special';
}

// Возвращает исходное «сырое» значение — то, что можно безопасно отдать клиенту.
function unwrap(vote) {
  return vote ? vote.value : null;
}

module.exports = {
  Number: NumberVote,
  Special: SpecialVote,
  from,
  isNumber,
  isSpecial,
  unwrap,
};