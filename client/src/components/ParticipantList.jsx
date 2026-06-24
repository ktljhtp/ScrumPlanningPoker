export default function ParticipantList({ participants, showVotes }) {
  return (
    <div>
      <h3>Участники ({participants.length})</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {participants.map((p, i) => (
          <li key={i} style={styles.item}>
            <span>{p.name}</span>
            <span style={p.hasVoted ? styles.voted : styles.pending}>
              {showVotes && p.vote !== undefined
                ? p.vote
                : p.hasVoted ? '✓' : '…'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid #eee',
    fontSize: '16px',
  },
  voted: { color: '#22c55e', fontWeight: 'bold' },
  pending: { color: '#94a3b8' },
};