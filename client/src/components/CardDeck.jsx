export default function CardDeck({ deck, selected, onSelect, disabled }) {
  return (
    <>
      <style>{`
        .card-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 8px 0;
        }
        @media (max-width: 400px) {
          .card-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
        }
      `}</style>
      <div className="card-grid">
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
              <span style={s.corner}>{isSelected ? '╔═══╗' : '┌───┐'}</span>
              <span style={s.value}>{value}</span>
              <span style={s.corner}>{isSelected ? '╚═══╝' : '└───┘'}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

const s = {
  card: {
    fontFamily: "'Courier New', Courier, monospace",
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minHeight: 80,        /* было 72 — увеличили для touch-удобства */
    fontSize: 14,
    border: '1px solid #000',
    borderRadius: 0,
    background: '#fff',
    color: '#000',
    cursor: 'pointer',
    padding: '6px 2px',
    transition: 'background 0.1s, color 0.1s',
    touchAction: 'manipulation',   /* убирает задержку 300ms на iOS */
    WebkitTapHighlightColor: 'transparent',
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
    fontSize: 10,
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