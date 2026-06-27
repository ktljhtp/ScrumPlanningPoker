export default function CardDeck({ deck, selected, onSelect, disabled }) {
  return (
    <div style={s.grid}>
      {deck.map((value) => {
        const isSelected = selected === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onSelect(value)}
            disabled={disabled}
            style={{
              ...s.card,
              ...(isSelected ? s.selected : {}),
              ...(disabled && !isSelected ? s.disabled : {}),
            }}
          >
            {/* Верхний угол */}
            <span style={s.corner}>{isSelected ? '╔═══╗' : '┌───┐'}</span>
            {/* Значение */}
            <span style={s.value}>{value}</span>
            {/* Нижний угол */}
            <span style={s.corner}>{isSelected ? '╚═══╝' : '└───┘'}</span>
          </button>
        );
      })}
    </div>
  );
}

const s = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
    padding: '8px 0',
  },
  card: {
    fontFamily: "'Courier New', Courier, monospace",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 72,
    fontSize: 14,
    border: '1px solid #000',
    borderRadius: 0,
    background: '#fff',
    color: '#000',
    cursor: 'pointer',
    padding: '6px 0',
    transition: 'background 0.1s, color 0.1s',
  },
  selected: {
    background: '#000',
    color: '#fff',
    border: '1px solid #000',
  },
  disabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  corner: {
    fontSize: 11,
    lineHeight: 1,
    letterSpacing: 0,
    display: 'block',
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    lineHeight: 1,
    display: 'block',
  },
};
