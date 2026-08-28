import { useState, useEffect } from 'react';

// Функции для перевода чисел между системами
const toBase = (num, base) => num.toString(base).toUpperCase();
const fromBase = (str, base) => parseInt(str, base);

// Генерация случайного целого в диапазоне [min, max]
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Генерация правдоподобных вариантов
const generateOptions = (correct, base) => {
  const options = new Set([correct]);
  const maxOffset = Math.max(1, Math.floor(parseInt(correct, base) * 0.3));
  
  while (options.size < 4) {
    const offset = randomInt(-maxOffset, maxOffset);
    const correctValue = parseInt(correct, base);
    const candidate = (correctValue + offset).toString(base).toUpperCase();
    if (parseInt(candidate, base) >= 0 && !options.has(candidate)) {
      options.add(candidate);
    }
  }
  
  return Array.from(options).sort(() => Math.random() - 0.5);
};

export default function NumberBaseGame() {
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [fromBaseVal, setFromBaseVal] = useState(2);
  const [toBaseVal, setToBaseVal] = useState(10);
  const [displayNum, setDisplayNum] = useState('');
  const [options, setOptions] = useState([]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState('');

  // Запуск нового раунда
  const newRound = () => {
    const bases = [2, 8, 10, 16];
    const from = bases[randomInt(0, bases.length - 1)];
    let to = bases[randomInt(0, bases.length - 1)];
    
    // Исключаем одинаковые системы
    while (to === from) {
      to = bases[randomInt(0, bases.length - 1)];
    }

    // Генерируем число
    const decimalValue = randomInt(2, 255);
    const displayValue = decimalValue.toString(from).toUpperCase();
    const answerValue = decimalValue.toString(to).toUpperCase();

    setFromBaseVal(from);
    setToBaseVal(to);
    setDisplayNum(displayValue);
    setCorrectAnswer(answerValue);
    setOptions(generateOptions(answerValue, to));
    setSelectedOption(null);
    setFeedback('');
  };

  // Начало игры
  useEffect(() => {
    newRound();
  }, []);

  const handleOptionClick = (option) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    
    if (option === correctAnswer) {
      setFeedback('✓ Верно! +1 очко');
      setScore(prev => prev + 1);
    } else {
      setFeedback(`✗ Неверно. Правильный ответ: ${correctAnswer}`);
    }
  };

  const handleNext = () => {
    setRound(prev => prev + 1);
    newRound();
  };

  return (
    <div style={styles.gameBox}>
      <div style={styles.inner}>
        <div style={styles.headerRow}>
          <span style={styles.title}>Мини-игра: перевод чисел</span>
          <span style={styles.score}>счёт: {score}</span>
        </div>
        
        <div style={styles.question}>
          Переведите число <strong>{displayNum}</strong>
          <sub> {fromBaseVal}</sub> в систему с основанием {toBaseVal}
        </div>
        
        <div style={styles.optionsGrid}>
          {options.map((opt, idx) => (
            <button
              key={idx}
              style={{
                ...styles.optionBtn,
                color: '#000',
                ...(selectedOption === opt && opt === correctAnswer ? styles.correct : {}),
                ...(selectedOption === opt && opt !== correctAnswer ? styles.wrong : {}),
                ...(selectedOption !== null && opt === correctAnswer ? styles.correct : {}),
              }}
              onClick={() => handleOptionClick(opt)}
              disabled={selectedOption !== null}
            >
              {opt}
            </button>
          ))}
        </div>
        
        {feedback && <div style={styles.feedback}>{feedback}</div>}
        
        {selectedOption !== null && (
          <button style={styles.nextBtn} onClick={handleNext}>
            Следующий раунд →
          </button>
        )}
      </div>

    </div>
  );
}

// Стили
const styles = {
  gameBox: {
    marginTop: 24,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: "'Courier New', Courier, monospace",
  },
  corner: { 
    margin: 0, 
    lineHeight: 1, 
    color: '#000',
    fontSize: 12,
  },
  inner: {
    padding: '8px 16px 16px',
    background: '#fdfdfd',
    borderLeft: '1px solid #000',
    borderRight: '1px solid #000',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 12,
    fontSize: 13,
  },
  title: { 
    fontWeight: 'bold',
    color: '#000',
  },
  score: { 
    color: '#555',
  },
  question: {
    marginBottom: 16,
    fontSize: 14,
    color: '#000',
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    marginBottom: 12,
  },
  optionBtn: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 14,
    padding: '8px 4px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  correct: {
    background: '#c8e6c9',
    borderColor: '#2e7d32',
    color: '#000',
  },
  wrong: {
    background: '#ffcdd2',
    borderColor: '#c62828',
    color: '#000',
  },
  feedback: {
    marginBottom: 12,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  nextBtn: {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: 13,
    padding: '8px 16px',
    background: '#fff',
    border: '1px solid #000',
    cursor: 'pointer',
    color: '#000',
  },
};