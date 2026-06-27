import { useState, useEffect } from 'react';
import ParticipantList from '../components/ParticipantList';
import { useSocket } from '../context/SocketContext';


export default function AdminPage({ roomCode }) {
  const { socket } = useSocket();

  const [status, setStatus] = useState('waiting');
  const [participants, setParticipants] = useState([]);
  const [votedCount, setVotedCount] = useState(0);
  const [quorum, setQuorum] = useState(0);
  const [result, setResult] = useState(null);
  const [allVotes, setAllVotes] = useState(null);

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    const doJoin = () => {
      socket.emit('join_room', { roomCode, name: 'Admin' });
    };

    const onRoomJoined = (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setParticipants(data.participants);
    };

    const onParticipantJoined = ({ name }) => {
      setParticipants(prev =>
        prev.some(p => p.name === name)
        ? prev
        : [...prev, { name, hasVoted: false }]
      );
    };

    const onParticipantLeft = ({ name }) => {
      setParticipants(prev => prev.filter(p => p.name !== name));
    };

    const onVoteCast = ({ votedCount: vc, quorum: q, voterName }) => {
      setVotedCount(vc);
      setQuorum(q);
      if (voterName) {
        setParticipants(prev =>
          prev.map(p => p.name === voterName ? { ...p, hasVoted: true } : p)
        );
      }
    };

    const onRoundStarted = ({ quorum: q }) => {
      setStatus('active');
      setQuorum(q);
      setVotedCount(0);
      setResult(null);
      setAllVotes(null);
      setParticipants(prev => prev.map(p => ({ ...p, hasVoted: false, vote: undefined })));
    };

    const onRoundStopped = ({ result: r, allVotes: av }) => {
      setStatus('stopped');
      setResult(r);
      setAllVotes(av);
    };

    const onNewRoundReady = () => {
      setStatus('waiting');
      setResult(null);
      setAllVotes(null);
      setVotedCount(0);
    };

    socket.on('connect', doJoin);
    socket.on('room_joined', onRoomJoined);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('vote_cast', onVoteCast);
    socket.on('round_started', onRoundStarted);
    socket.on('round_stopped', onRoundStopped);
    socket.on('new_round_ready', onNewRoundReady);

    if (socket.connected) {
      doJoin();
    }

    return () => {
      socket.off('connect', doJoin);
      socket.off('room_joined', onRoomJoined);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('participant_left', onParticipantLeft);
      socket.off('vote_cast', onVoteCast);
      socket.off('round_started', onRoundStarted);
      socket.off('round_stopped', onRoundStopped);
      socket.off('new_round_ready', onNewRoundReady);
    };
  }, [roomCode, socket]);

  function startRound() {
    socket.emit('start_round', { roomCode });
  }

  function stopRound() {
    socket.emit('stop_round', { roomCode });
  }

  function newRound() {
    socket.emit('new_round', { roomCode });
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Scrum Poker — Администратор</h1>

      <div style={styles.codeBox}>
        <p style={styles.codeLabel}>Код комнаты</p>
        <p style={styles.code}>{roomCode}</p>
        <p style={styles.link}>{joinUrl}</p>
        <button style={styles.copyBtn} onClick={() => navigator.clipboard.writeText(joinUrl)}>
          Скопировать ссылку
        </button>
      </div>

      <p style={styles.counter}>
        Участников: <strong>{participants.length}</strong>
        {status === 'active' && (
          <> &nbsp;|&nbsp; Проголосовало: <strong>{votedCount}</strong> / <strong>{quorum}</strong></>
        )}
      </p>

      <div style={styles.btnRow}>
        <button
          style={{ ...styles.btn, background: '#22c55e' }}
          onClick={startRound}
          disabled={status === 'active' || participants.length === 0}
        >
          Старт раунда
        </button>
        <button
          style={{ ...styles.btn, background: '#ef4444' }}
          onClick={stopRound}
          disabled={status !== 'active'}
        >
          Стоп (вручную)
        </button>
        <button
          style={{ ...styles.btn, background: '#64748b' }}
          onClick={newRound}
          disabled={status === 'active'}
        >
          Новый раунд
        </button>
      </div>

      {status === 'stopped' && result !== null && (
        <div style={styles.resultBox}>
          <p>Итоговая оценка:</p>
          <p style={styles.resultValue}>{result}</p>
        </div>
      )}

      {allVotes && (
        <div>
          <h3>Все голоса:</h3>
          {allVotes.map((v, i) => (
            <p key={i}>{v.name}: <strong>{v.vote}</strong></p>
          ))}
        </div>
      )}

      <ParticipantList participants={participants} showVotes={status === 'stopped'} />
    </div>
  );
}

const styles = {
  container: { maxWidth: 600, margin: '0 auto', padding: '24px', fontFamily: 'sans-serif' },
  title: { fontSize: '24px', marginBottom: '16px' },
  codeBox: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center' },
  codeLabel: { color: '#64748b', margin: 0, fontSize: '14px' },
  code: { fontSize: '48px', fontWeight: 'bold', letterSpacing: '8px', margin: '4px 0' },
  link: { fontSize: '12px', color: '#94a3b8', margin: '4px 0' },
  copyBtn: { padding: '8px 16px', borderRadius: '8px', border: '1px solid #ccc', cursor: 'pointer', background: '#fff' },
  counter: { fontSize: '18px', marginBottom: '16px', color: '#475569' },
  btnRow: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  btn: { flex: 1, padding: '14px', fontSize: '16px', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', minWidth: '120px' },
  resultBox: { textAlign: 'center', background: '#f0fdf4', borderRadius: '12px', padding: '20px', marginBottom: '20px' },
  resultValue: { fontSize: '72px', fontWeight: 'bold', color: '#15803d', margin: 0 },
};
