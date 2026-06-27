export default function ParticipantList({ participants, showVotes }) {
  if (participants.length === 0) {
    return (
      <div style={s.empty}>
        <pre style={s.pre}>{`┌─────────────────────────────┐
│ участников пока нет         │
└─────────────────────────────┘`}</pre>
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <p style={s.heading}>{'участники (' + participants.length + '):'}</p>
      <pre style={s.line}>{'─'.repeat(36)}</pre>
      {participants.map((p, i) => (
        <div key={i} style={s.row}>
          <span style={s.name}>{p.name}</span>
          <span style={p.hasVoted ? s.voted : s.pending}>
            {showVotes && p.vote !== undefined
              ? `[${p.vote}]`
              : p.hasVoted ? '[+]' : '[ ]'}
          </span>
        </div>
      ))}
      <pre style={s.line}>{'─'.repeat(36)}</pre>
    </div>
  );
}

const s = {
  wrap: { marginTop: 8, fontFamily: "'Courier New', Courier, monospace" },
  empty: { marginTop: 8 },
  pre: { fontSize: 12, lineHeight: 1.3, color: '#000', margin: 0 },
  heading: { fontSize: 13, color: '#555', margin: '0 0 4px' },
  line: { color: '#aaa', margin: '2px 0', fontSize: 12 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '5px 0',
    borderBottom: '1px dashed #ddd',
    fontSize: 14,
    fontFamily: "'Courier New', Courier, monospace",
  },
  name: { color: '#000' },
  voted: { color: '#000', fontWeight: 'bold' },
  pending: { color: '#aaa' },
};
