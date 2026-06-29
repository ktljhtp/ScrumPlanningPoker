import { useState, useEffect } from 'react';
import CardDeck from '../components/CardDeck';
import { useSocket } from '../context/SocketContext';

export default function ParticipantPage({ roomCode, name, onLeft }) {
  const { socket } = useSocket();
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('waiting');
  const [selected, setSelected] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedCount, setVotedCount] = useState(0);
  const [quorum, setQuorum] = useState('?');
  const [result, setResult] = useState(null);
  const [deck, setDeck] = useState([]);
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    socket.emit('join_room', { roomCode, name });

    
    const onRoomJoined = (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setHasVoted(data.hasVoted);
      setDeck(data.deck);
      setTopic(data.topic || '');
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
    const onQuorumUpdated = ({ quorum: q }) => {
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
    const onLeftRoom = () => {
      onLeft();
    };
    const onRoomClosed = () => {
      onLeft({ closed: true });
    };

    const handleTopicUpdated = ({ topic: t }) => setTopic(t);

    socket.on('room_joined', onRoomJoined);
    socket.on('round_started', onRoundStarted);
    socket.on('vote_cast', onVoteCast);
    socket.on('quorum_updated', onQuorumUpdated);
    socket.on('round_stopped', onRoundStopped);
    socket.on('new_round_ready', onNewRoundReady);
    socket.on('left_room', onLeftRoom);
    socket.on('room_closed', onRoomClosed);
    socket.on('topic_updated', handleTopicUpdated);

    return () => {
      socket.off('room_joined', onRoomJoined);
      socket.off('round_started', onRoundStarted);
      socket.off('vote_cast', onVoteCast);
      socket.off('quorum_updated', onQuorumUpdated);
      socket.off('round_stopped', onRoundStopped);
      socket.off('new_round_ready', onNewRoundReady);
      socket.off('left_room', onLeftRoom);
      socket.off('room_closed', onRoomClosed);
      socket.off('topic_updated', handleTopicUpdated);
    };
  }, [roomCode, name, socket]);

  function handleVote(value) {
    if (hasVoted || status !== 'active') return;
    socket.emit('cast_vote', { roomCode, value });
    setSelected(value);
    setHasVoted(true);
  }

  function handleLeave() {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    socket.emit('leave_room', { roomCode });
  }

  const statusMap = {
    waiting: 'ожидание раунда',
    active:  'голосование активно',
    stopped: 'раунд завершён',
  };

  return (
    <div style={s.page}>

      {/* Шапка */}
      <pre style={s.header}>
  {(() => {
    const W = 34;

// Функция для центрирования текста
const center = (text) => {
  const padding = Math.floor((W - text.length) / 2);
  return ' '.repeat(padding) + text + ' '.repeat(W - text.length - padding);
};

// Функция для левого выравнивания с отступом
const leftWithPadding = (prefix, value) => {
  const full = '   ' + prefix + value; // 3 пробела слева
  if (full.length >= W) return full.slice(0, W);
  return full + ' '.repeat(W - full.length);
};

// Данные
const safeRoomCode = String(roomCode || '').slice(0, 10);
const safeName = String(name || '').slice(0, 20);

// Формируем шапку
const header = `
┌${'─'.repeat(W)}┐
${center('SCRUM POKER')}
${leftWithPadding('комната: ', safeRoomCode)}
${leftWithPadding('участник: ', safeName)}
└${'─'.repeat(W)}┘
`;
    return header;
  })()}
</pre>
      {topic && (
  <div>
    <p style={{ ...s.dim, margin: '0 0 -5px' }}>тема:</p>
    <p style={{ margin: 0, fontWeight: 'bold' }}>{topic}</p>
  </div>
)}
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

      {/* Кнопка выхода */}
      <div style={s.leaveSection}>
        <pre style={s.divider}>{'─'.repeat(36)}</pre>
        {confirmLeave ? (
          <div style={s.confirmBox}>
            <p style={s.confirmText}>{'! вы покинете комнату и не сможете вернуться'}</p>
            <div style={s.btnRow}>
              <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleLeave}>
                [ да, выйти ]
              </button>
              <button style={s.btn} onClick={() => setConfirmLeave(false)}>
                [ отмена ]
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleLeave}>
            [ покинуть комнату ]
          </button>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { maxWidth: 480, margin: '0 auto', padding: '16px 16px 0', fontFamily: "'Courier New', Courier, monospace", fontSize: 14, backgroundColor: '#fff', boxSizing: 'border-box' },
  header: { fontSize: 12, lineHeight: 1.4, margin: '0 0 16px', color: '#000', textAlign: 'center'},
  statusLine: { margin: '10px 0 5px', fontSize: 14, color: '#000' },
  dim: { color: '#777', fontSize: 13 },
  voted: { margin: '0 0 16px', color: '#000', fontSize: 14 },
  resultBox: { marginBottom: 20, textAlign: 'center' },
  corner: { margin: 0, lineHeight: 1, color: '#000' },
  resultInner: {
    padding: '8px 16px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultValue: { fontSize: 52, lineHeight: 1},
  leaveSection: { marginTop: 8, paddingBottom: 32, textAlign: 'center' },
  divider: { margin: '0 0 16px', color: '#ccc', lineHeight: 1 },
  confirmBox: { background: '#f9f9f9', border: '1px solid #ccc', padding: '12px 16px' },
  confirmText: { margin: '0 0 12px', fontSize: 13, color: '#333' },
  btnRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 0, padding: '8px 14px', cursor: 'pointer' },
  btnDanger: { borderColor: '#888', color: '#555' },
};
