import { useState, useEffect } from 'react';
import CardDeck from '../components/CardDeck';
import { useSocket } from '../context/SocketContext';

export default function ParticipantPage({ roomCode, name }) {
  const { socket } = useSocket();

  const [status, setStatus] = useState('waiting');
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCount, setVotedCount] = useState(0);
  const [quorum, setQuorum] = useState('?');
  const [result, setResult] = useState(null);
  const [deck, setDeck] = useState([]);

  useEffect(() => {
    socket.emit('join_room', { roomCode, name });

    const onRoomJoined = (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setHasVoted(data.hasVoted);
      setDeck(data.deck);
    };
    const onRoundStarted = ({ quorum: q }) => {
      setStatus('active');
      setQuorum(q);
      setSelected(null);
      setHasVoted(false);
      setResult(null);
      setVotedCount(0);
    };
    const onVoteCast = ({ votedCount: vc, quorum: q }) => {
      setVotedCount(vc);
      setQuorum(q);
    };
    const onRoundStopped = ({ result: r }) => {
      setStatus('stopped');
      setResult(r);
    };
    const onNewRoundReady = () => {
      setStatus('waiting');
      setSelected(null);
      setHasVoted(false);
      setResult(null);
    };

    socket.on('room_joined', onRoomJoined);
    socket.on('round_started', onRoundStarted);
    socket.on('vote_cast', onVoteCast);
    socket.on('round_stopped', onRoundStopped);
    socket.on('new_round_ready', onNewRoundReady);

    return () => {
      socket.off('room_joined', onRoomJoined);
      socket.off('round_started', onRoundStarted);
      socket.off('vote_cast', onVoteCast);
      socket.off('round_stopped', onRoundStopped);
      socket.off('new_round_ready', onNewRoundReady);
    };
  }, [roomCode, name, socket]);

  function handleVote(value) {
    if (hasVoted || status !== 'active') return;
    socket.emit('cast_vote', { roomCode, value });
    setSelected(value);
    setHasVoted(true);
  }

  const statusMap = {
    waiting: 'ожидание раунда',
    active:  'голосование активно',
    stopped: 'раунд завершён',
  };

  return (
    <div style={s.page}>

      {/* Шапка */}
      <pre style={s.header}>{`┌──────────────────────────────────┐
│ SCRUM POKER  комната: ${roomCode.padEnd(10)} │
│ участник:    ${name.slice(0, 20).padEnd(20)}       │
└──────────────────────────────────┘`}</pre>

      {/* Статус */}
      <p style={s.statusLine}>
        {'> '}<strong>{statusMap[status] || status}</strong>
        {status === 'active' && <span style={s.dim}>{`  проголосовало: ${votedCount} / кворум: ${quorum}`}</span>}
      </p>

      {/* Итог раунда */}
      {status === 'stopped' && result !== null && (
        <div style={s.resultBox}>
          <pre style={s.corner}>{'┌' + '─'.repeat(30) + '┐'}</pre>
          <div style={s.resultInner}>
            <span style={s.dim}>итог</span>
            <span style={s.resultValue}>{result}</span>
          </div>
          <pre style={s.corner}>{'└' + '─'.repeat(30) + '┘'}</pre>
        </div>
      )}

      {/* Подтверждение голоса */}
      {hasVoted && status === 'active' && (
        <p style={s.voted}>{'> голос принят: ['}<strong>{selected}</strong>{']'}</p>
      )}

      {/* Карточки */}
      <CardDeck
        deck={deck}
        selected={selected}
        onSelect={handleVote}
        disabled={status !== 'active' || hasVoted}
      />
    </div>
  );
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', fontFamily: "'Courier New', Courier, monospace", fontSize: 14, backgroundColor: '#fff'},
  header: { fontSize: 12, lineHeight: 1.4, margin: '0 0 16px', color: '#000' },
  statusLine: { margin: '0 0 16px', fontSize: 14, color: '#000' },
  dim: { color: '#777', fontSize: 13 },
  voted: { margin: '0 0 16px', color: '#000', fontSize: 14 },
  resultBox: { marginBottom: 20 },
  corner: { margin: 0, lineHeight: 1, color: '#000' },
  resultInner: {
    borderLeft: '1px solid #000', borderRight: '1px solid #000',
    padding: '8px 16px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultValue: { fontSize: 52, lineHeight: 1, fontWeight: 'bold' },
};
