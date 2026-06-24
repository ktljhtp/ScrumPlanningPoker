export default function CardDeck({ deck, selected, onSelect, disabled }) {
  return (
    <div style={styles.grid}>
      {deck.map((value) => (
        <button
          key={value}
          onClick={() => !disabled && onSelect(value)}
          disabled={disabled}
          style={{
            ...styles.card,
            ...(selected === value ? styles.selected : {}),
            ...(disabled ? styles.disabled : {}),
          }}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    padding: '16px',
  },
  card: {
    minHeight: '72px',
    fontSize: '24px',
    fontWeight: 'bold',
    borderRadius: '12px',
    border: '2px solid #ccc',
    background: '#fff',
    cursor: 'pointer',
    transition: 'transform 0.1s, border-color 0.1s',
  },
  selected: {
    border: '2px solid #4f6ef7',
    background: '#eef0ff',
    transform: 'translateY(-4px)',
  },
  disabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};