// Расчёт метрик по числовым голосам вынесен из Room.stopRound в отдельную
// чистую функцию. Раньше в зависимости от resultMode считалась только одна
// метрика (либо медиана, либо среднее). Теперь считаются сразу все —
// median, average и distribution, — а какую из них показывать, решает фронт.

function computeMedian(sortedValues) {
  if (sortedValues.length === 0) return null;
  const mid = Math.floor(sortedValues.length / 2);
  return sortedValues.length % 2 === 0
    ? (sortedValues[mid - 1] + sortedValues[mid]) / 2
    : sortedValues[mid];
}

function computeAverage(values) {
  if (values.length === 0) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

// Распределение голосов: сколько раз встретилось каждое значение,
// отсортировано по возрастанию значения (удобно для гистограммы).
function computeDistribution(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value - b.value);
}

// numericValues — массив «сырых» числовых значений голосов (уже без Special).
function computeMetrics(numericValues) {
  const sorted = [...numericValues].sort((a, b) => a - b);
  return {
    median: computeMedian(sorted),
    average: computeAverage(sorted),
    distribution: computeDistribution(numericValues),
  };
}

module.exports = { computeMetrics };