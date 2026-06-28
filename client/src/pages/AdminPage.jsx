import { useState, useEffect } from 'react';
import ParticipantList from '../components/ParticipantList';
import { useSocket } from '../context/SocketContext';

export default function AdminPage({ roomCode, onClosed }) {
  const { socket } = useSocket();
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState('waiting');
  const [participants, setParticipants] = useState([]);
  const [votedCount, setVotedCount] = useState(0);
  const [quorum, setQuorum] = useState(0);
  const [result, setResult] = useState(null);
  const [allVotes, setAllVotes] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const joinUrl = `${roomCode}`;

  useEffect(() => {
    const doJoin = () => socket.emit('join_room', { roomCode, name: 'Admin' });
    const handleTopicUpdated = ({ topic: t }) => setTopic(t);

    const onRoomJoined = (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setParticipants(data.participants);
    };
    const onParticipantJoined = ({ name }) => {
      setParticipants(prev =>
        prev.some(p => p.name === name) ? prev : [...prev, { name, hasVoted: false }]
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
    const onQuorumUpdated = ({ quorum: q }) => {
      setQuorum(q);
    };
    const onRoundStarted = ({ quorum: q }) => {
  setStatus('active');
  setQuorum(q);
  setVotedCount(0);
  setResult(null);
  setAllVotes(null);
  setParticipants(prev => prev.map(p => ({ ...p, hasVoted: false, vote: undefined })));
  //                                                         ^^^^^ false, не true
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
      setParticipants(prev => prev.map(p => ({ ...p, hasVoted: false, vote: undefined })));
    };
    // Сервер подтвердил закрытие — переходим на главную
    const onRoomClosed = () => {
      onClosed();
    };

    socket.on('connect', doJoin);
    socket.on('room_joined', onRoomJoined);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('vote_cast', onVoteCast);
    socket.on('quorum_updated', onQuorumUpdated);
    socket.on('round_started', onRoundStarted);
    socket.on('round_stopped', onRoundStopped);
    socket.on('new_round_ready', onNewRoundReady);
    socket.on('room_closed', onRoomClosed);
    socket.on('topic_updated', handleTopicUpdated);
    if (socket.connected) doJoin();

    return () => {
      socket.off('connect', doJoin);
      socket.off('room_joined', onRoomJoined);
      socket.off('participant_joined', onParticipantJoined);
      socket.off('participant_left', onParticipantLeft);
      socket.off('vote_cast', onVoteCast);
      socket.off('quorum_updated', onQuorumUpdated);
      socket.off('round_started', onRoundStarted);
      socket.off('round_stopped', onRoundStopped);
      socket.off('new_round_ready', onNewRoundReady);
      socket.off('room_closed', onRoomClosed);
      socket.off('topic_updated', handleTopicUpdated);
    };
  }, [roomCode, socket]);

  function startRound() { socket.emit('start_round', { roomCode }); }
  function stopRound()  { socket.emit('stop_round',  { roomCode }); }
  function newRound()   { socket.emit('new_round',   { roomCode }); }

  function handleCloseRoom() {
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    setClosing(true);
    socket.emit('close_room', { roomCode });
    // onClosed() вызовется когда сервер пришлёт room_closed
  }

  function copyLink() {
    const text = joinUrl;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
        .catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Не удалось скопировать. Попробуй вручную.');
    }
    document.body.removeChild(textarea);
  }

  function handleTopicChange(e) {
    const val = e.target.value.slice(0, 200); // лимит на клиенте
    setTopic(val);
    socket.emit('set_topic', { roomCode, topic: val });
  }

  const statusLabel = {
    waiting: 'ожидание',
    active:  'голосование',
    stopped: 'завершён',
  }[status] || status;

  return (
    <div style={s.page}>

      {/* Заголовок */}
      <pre style={s.logo}>{logo}</pre>

      {/* Блок комнаты */}
      <div style={s.box}>
        <pre style={s.boxTop}>{'┌' + '─'.repeat(38) + '┐'}</pre>
        <div style={s.boxBody}>
          <span style={s.dim}>Код комнаты:  </span>
          <span style={{ fontSize: 24, letterSpacing: 8, fontFamily: 'inherit' }}>{roomCode}</span>
        </div>
        <div style={s.boxBody}>
          <button style={s.btn} onClick={copyLink}>
            [{copied ? ' скопировано! ' : ' скопировать код '}]
          </button>
        </div>
        <pre style={s.boxBot}>{'└' + '─'.repeat(38) + '┘'}</pre>
      </div>

      <div style={{ marginBottom: 16 }}>
  <label style={s.dim}>тема голосования:</label>
  <div style={{ position: 'relative' }}>
    <input
      style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
      placeholder="введи тему..."
      value={topic}
      onChange={handleTopicChange}
      maxLength={50}
    />
    <span style={{ ...s.dim, fontSize: 11, float: 'right' }}>
      {topic.length}/50
    </span>
  </div>
</div>

      {/* Статус */}
      <p style={s.statusLine}>
        {'> статус: '}<strong>{statusLabel}</strong>
        {' || участники: '}<strong>{participants.length}</strong>
        {status === 'active' && <>{' || голоса: '}<strong>{votedCount}/{quorum}</strong></>}
      </p>

      {/* Кнопки управления раундом */}
      <div style={s.btnRow}>
        <button style={s.btn} onClick={startRound} disabled={status === 'active' || participants.length === 0}>
          [ Старт раунда ]
        </button>
        <button style={s.btn} onClick={stopRound} disabled={status !== 'active'}>
          [ Стоп ]
        </button>
        <button style={s.btn} onClick={newRound} disabled={status === 'active'}>
          [ Новый раунд ]
        </button>
      </div>

      {/* Результат */}
      {status === 'stopped' && result !== null && (
        <div style={s.resultBox}>
          <pre style={s.boxTop}>{'┌' + '─'.repeat(38) + '┐'}</pre>
          <div style={{ ...s.boxBody, textAlign: 'center' }}>
            <span style={s.dim}>итоговая оценка</span>
          </div>
          <div style={{ ...s.boxBody, textAlign: 'center' }}>
            <span style={{ fontSize: 56, lineHeight: 1.1 }}>{result}</span>
          </div>
          <pre style={s.boxBot}>{'└' + '─'.repeat(38) + '┘'}</pre>
        </div>
      )}

      {/* Все голоса */}
      {allVotes && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...s.dim, marginBottom: 6 }}>все голоса:</p>
          {allVotes.map((v, i) => (
            <p key={i} style={s.voteLine}>
              <span>{v.name}</span>
              <span style={{ fontWeight: 'bold' }}>{v.vote}</span>
            </p>
          ))}
        </div>
      )}

      {/* Список участников */}
      <ParticipantList participants={participants} showVotes={status === 'stopped'} />

      {/* Закрытие комнаты */}
      <div style={s.closeSection}>
        <pre style={s.divider}>{'─'.repeat(40)}</pre>
        {confirmClose ? (
          <div style={s.confirmBox}>
            <p style={s.confirmText}>
              {'! комната будет закрыта, все участники отключатся'}
            </p>
            <div style={s.btnRow}>
              <button
                style={{ ...s.btn, ...s.btnDanger }}
                onClick={handleCloseRoom}
                disabled={closing}
              >
                {closing ? '[ закрываем... ]' : '[ да, закрыть комнату ]'}
              </button>
              <button
                style={s.btn}
                onClick={() => setConfirmClose(false)}
                disabled={closing}
              >
                [ отмена ]
              </button>
            </div>
          </div>
        ) : (
          <button style={{ ...s.btn, ...s.btnDanger }} onClick={handleCloseRoom}>
            [ закрыть комнату ]
          </button>
        )}
      </div>

    </div>
  );
}

const logo = `                      
  ███████╗ ██████╗██████╗ ██╗   ██╗███╗   ███║
 ██╔════╝██╔════╝██╔══██╗██║   ██║████╗ ████║
 ███████╗██║     ██████╔╝██║   ██║██╔████╔██║
 ╚════██║██║     ██╔══██╗██║   ██║██║╚██╔╝██║
 ███████║╚██████╗██║  ██║╚██████╔╝██║ ╚═╝ ██║
 ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝
██████╗  ██████╗ ██╗  ██╗███████╗██████╗
 ██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔══██╗
 ██████╔╝██║   ██║█████╔╝ █████╗  ██████╔╝
 ██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██╔══██╗
 ██║     ╚██████╔╝██║  ██╗███████╗██║  ██║
 ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
                                           ADMIN`;

const s = {
  page: { maxWidth: 560, margin: '0 auto', fontFamily: "'Courier New', Courier, monospace", fontSize: 14, backgroundColor: '#fff' },
  logo: { fontSize: 9, lineHeight: 1.2, margin: '0 0 20px', color: '#000' },
  box: { marginBottom: 16 },
  boxTop: { margin: 0, lineHeight: 1, color: '#000' },
  boxBot: { margin: 0, lineHeight: 1, color: '#000' },
  boxBody: { padding: '4px 12px', lineHeight: 1.6 },
  dim: { color: '#555', fontSize: 13 },
  statusLine: { margin: '12px 0', fontSize: 13, color: '#555' },
  btnRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 0, padding: '8px 14px', cursor: 'pointer' },
  resultBox: { marginBottom: 20 },
  voteLine: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '4px 0', fontSize: 14 },
  closeSection: { marginTop: 8, paddingBottom: 32 },
  divider: { margin: '0 0 16px', color: '#ccc', lineHeight: 1 },
  btnDanger: { borderColor: '#888', color: '#555' },
  confirmBox: { background: '#f9f9f9', border: '1px solid #ccc', padding: '12px 16px' },
  confirmText: { margin: '0 0 12px', fontSize: 13, color: '#333' },
  input: { fontFamily: "'Courier New', monospace", fontSize: 14, padding: '8px 10px', border: '1px solid #000', borderRadius: 0, outline: 'none', background: '#fff' },
};
