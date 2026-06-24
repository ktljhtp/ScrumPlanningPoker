import { useState, useEffect } from 'react';
import socket from '../api/socket';
import api from '../api/http';
import CardDeck from '../components/CardDeck';

const DECK = [0, 1, 2, 3, 5, 8, 13, 20, 40, 100, '?', '∞'];

export default function ParticipantPage({ roomCode, name }) {
  const [status, setStatus] = useState('waiting'); // waiting | active | stopped
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCount, setVotedCount] = useState(0);
  const [quorum, setQuorum] = useState('?');
  const [result, setResult] = useState(null);

  useEffect(() => {
    socket.connect();
    socket.emit('join_room', { roomCode, name });

    socket.on('room_joined', (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setHasVoted(data.hasVoted);
    });

    socket.on('round_started', ({ quorum: q }) => {
      setStatus('active');
      setQuorum(q);
      setSelected(null);
      setHasVoted(false);
      setResult(null);
      setVotedCount(0);
    });

    socket.on('vote_cast', ({ votedCount: vc, quorum: q }) => {
      setVotedCount(vc);
      setQuorum(q);
    });

    socket.on('round_stopped', ({ result: r }) => {
      setStatus('stopped');
      setResult(r);
    });

    socket.on('new_round_ready', () => {
      setStatus('waiting');
      setSelected(null);
      setHasVoted(false);
      setResult(null);
    });

    return () => {
      socket.off('room_joined');
      socket.off('round_started');
      socket.off('vote_cast');
      socket.off('round_stopped');
      socket.off('new_round_ready');
      socket.disconnect();
    };
  }, [roomCode, name]);

  function handleVote(value) {
    if (hasVoted || status !== 'active') return;
    socket.emit('cast_vote', { roomCode, value });
    setSelected(value);
    setHasVoted(true);
  }

  const statusLabel = {
    waiting: '⏳ Ожидание раунда',
    active: '🗳️ Голосование активно',
    stopped: `✅ Раунд завершён`,
  }[status];

  return (
    <div style={styles.container}>
      <h2 style={styles.room}>Комната: {roomCode}</h2>
      <p style={styles.statusBadge}>{statusLabel}</p>

      {status === 'active' && (
        <p style={styles.counter}>Проголосовало: {votedCount} / Кворум: {quorum}</p>
      )}

      {status === 'stopped' && result !== null && (
        <div style={styles.resultBox}>
          <p style={styles.resultLabel}>Итог</p>
          <p style={styles.resultValue}>{result}</p>
        </div>
      )}

      {hasVoted && status === 'active' && (
        <p style={{ textAlign: 'center', color: '#22c55e', fontSize: '18px' }}>
          ✓ Ты проголосовал: <strong>{selected}</strong>
        </p>
      )}

      <CardDeck
        deck={DECK}
        selected={selected}
        onSelect={handleVote}
        disabled={status !== 'active' || hasVoted}
      />
    </div>
  );
}

const styles = {
  container: { maxWidth: 480, margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' },
  room: { textAlign: 'center', fontSize: '22px', color: '#475569' },
  statusBadge: { textAlign: 'center', fontSize: '20px', fontWeight: 'bold', margin: '12px 0' },
  counter: { textAlign: 'center', color: '#64748b', fontSize: '16px' },
  resultBox: { textAlign: 'center', margin: '16px 0', padding: '16px', background: '#f0fdf4', borderRadius: '12px' },
  resultLabel: { fontSize: '14px', color: '#16a34a', margin: 0 },
  resultValue: { fontSize: '64px', fontWeight: 'bold', color: '#15803d', margin: 0 },
};