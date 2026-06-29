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
  const [quorumInput, setQuorumInput] = useState('');
  const [result, setResult] = useState(null);
  const [allVotes, setAllVotes] = useState(null);
  const [resultMode, setResultMode] = useState('median');
  const [copied, setCopied] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const joinUrl = `${window.location.origin}/join/${roomCode}`;

  useEffect(() => {
    const doJoin = () => socket.emit('join_room', { roomCode, name: 'Admin' });
    const handleTopicUpdated = ({ topic: t }) => setTopic(t);

    const onRoomJoined = (data) => {
      setStatus(data.status);
      setQuorum(data.quorum);
      setQuorumInput(String(data.quorum === 999 ? '' : data.quorum));
      setParticipants(data.participants);
      setResultMode(data.resultMode || 'median');
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
      if (q !== undefined) setQuorum(q);
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
    const onRoundStopped = ({ result: r, allVotes: av, resultMode: rm }) => {
      setStatus('stopped');
      setResult(r);
      setAllVotes(av);
      if (rm) setResultMode(rm);
      if (av && av.length > 0) {
        const voteMap = Object.fromEntries(av.map(v => [v.name, v.vote]));
        setParticipants(prev =>
          prev.map(p => ({ ...p, vote: voteMap[p.name] }))
        );
      }
    };
    const onNewRoundReady = () => {
      setStatus('waiting');
      setResult(null);
      setAllVotes(null);
      setVotedCount(0);
      setParticipants(prev => prev.map(p => ({ ...p, hasVoted: false, vote: undefined })));
    };
    const onRoomClosed = () => { onClosed(); };

    socket.on('connect', doJoin);
    socket.on('room_joined', onRoomJoined);
    socket.on('participant_joined', onParticipantJoined);
    socket.on('participant_left', onParticipantLeft);
    socket.on('vote_cast', onVoteCast);
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
      socket.off('round_started', onRoundStarted);
      socket.off('round_stopped', onRoundStopped);
      socket.off('new_round_ready', onNewRoundReady);
      socket.off('room_closed', onRoomClosed);
      socket.off('topic_updated', handleTopicUpdated);
    };
  }, [roomCode, socket]);

  function startRound() {
    const q = quorumInput.trim() !== '' ? Number(quorumInput) : undefined;
    socket.emit('start_round', { roomCode, quorum: q });
  }
  function stopRound()  { socket.emit('stop_round',  { roomCode }); }
  function newRound()   { socket.emit('new_round',   { roomCode }); }

  function handleCloseRoom() {
    if (!confirmClose) { setConfirmClose(true); return; }
    setClosing(true);
    socket.emit('close_room', { roomCode });
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
    const val = e.target.value.slice(0, 200);
    setTopic(val);
    socket.emit('set_topic', { roomCode, topic: val });
  }

  // Строим гистограмму из allVotes
  function buildHistogram(votes) {
    const counts = {};
    for (const v of votes) {
      const key = String(v.vote);
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => {
      const na = Number(a[0]), nb = Number(b[0]);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return String(a[0]).localeCompare(String(b[0]));
    });
  }

  const statusLabel = {
    waiting: 'ожидание',
    active:  'голосование',
    stopped: 'завершён',
  }[status] || status;

  const resultModeLabel = {
    median: 'медиана',
    average: 'среднее',
    all: 'все голоса',
  }[resultMode] || resultMode;

  const onRoomJoined = (data) => {
  setStatus(data.status);
  setQuorum(data.quorum);
  setParticipants(data.participants);
  setResultMode(data.resultMode || 'median'); // ← берётся из data
};

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
          <span style={s.dim}>Ссылка:  </span>
          <span style={{ fontSize: 12, wordBreak: 'break-all' }}>{joinUrl}</span>
        </div>
        <div style={s.boxBody}>
          <button style={s.btn} onClick={copyLink}>
            [{copied ? ' скопировано! ' : ' скопировать ссылку '}]
          </button>
        </div>
        <pre style={s.boxBot}>{'└' + '─'.repeat(38) + '┘'}</pre>
      </div>

      {/* Тема голосования */}
      <div style={{ marginBottom: 16 }}>
        <label style={s.dim}>тема голосования:</label>
        <div style={{ position: 'relative' }}>
          <input
            style={{ ...s.input, width: '100%', boxSizing: 'border-box' }}
            placeholder="введи тему..."
            value={topic}
            onChange={handleTopicChange}
            maxLength={200}
          />
          <span style={{ ...s.dim, fontSize: 11, float: 'right' }}>
            {topic.length}/200
          </span>
        </div>
      </div>

      {/* Кворум */}
      <div style={{ marginBottom: 16 }}>
        <label style={s.dim}>{'кворум (число голосов):'}</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, justifyContent: 'center' }}>
          <input
            style={{ ...s.input, width: 88 }}
            type="number"
            min="1"
            placeholder="авто(999)"
            value={quorumInput}
            onChange={e => setQuorumInput(e.target.value)}
            disabled={status === 'active'}
          />
          <span style={s.dim}>
            {status === 'active'
              ? `текущий кворум: ${quorum}`
              : ''}
          </span>
        </div>
      </div>

      {/* Статус */}
      <p style={s.statusLine}>
        {'> статус: '}<strong>{statusLabel}</strong>
        {' || участники: '}<strong>{participants.length}</strong>
        {status === 'active' && <>{' || голоса: '}<strong>{votedCount}/{quorum}</strong></>}
        {' || режим: '}<strong>{resultModeLabel}</strong>
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
      {status === 'stopped' && (
        <div style={s.resultBox}>
          <pre style={s.boxTop}>{'┌' + '─'.repeat(38) + '┐'}</pre>
          <div style={{ ...s.boxBody, textAlign: 'center' }}>
            <span style={s.dim}>
              итоговая оценка ({resultModeLabel})
            </span>
          </div>
          {result !== null && (
            <div style={{ ...s.boxBody, textAlign: 'center' }}>
              <span style={{ fontSize: 56, lineHeight: 1.1 }}>{result}</span>
            </div>
          )}
          {result === null && (
            <div style={{ ...s.boxBody, textAlign: 'center' }}>
              <span style={s.dim}>нет числовых голосов</span>
            </div>
          )}
          <pre style={s.boxBot}>{'└' + '─'.repeat(38) + '┘'}</pre>
        </div>
      )}

      {/* Гистограмма и список — только в режиме 'all' */}
      {status === 'stopped' && resultMode === 'all' && allVotes && allVotes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ ...s.dim, marginBottom: 8 }}>распределение голосов:</p>
          {buildHistogram(allVotes).map(([val, count]) => {
            const maxCount = Math.max(...buildHistogram(allVotes).map(([, c]) => c));
            const barLen = Math.round((count / maxCount) * 20);
            return (
              <div key={val} style={s.histRow}>
                <span style={s.histLabel}>{String(val).padStart(4)}</span>
                <span style={s.histBar}>{'█'.repeat(barLen)}</span>
                <span style={s.histCount}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Список участников: в режиме 'all' показываем оценки, иначе только [+]/[ ] */}
      <ParticipantList
        participants={participants}
        showVotes={status === 'stopped' && resultMode === 'all'}
      />

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
  page: { maxWidth: 560, margin: '0 auto', padding: '16px 16px 0', fontFamily: "'Courier New', Courier, monospace", fontSize: 14, backgroundColor: '#fff', boxSizing: 'border-box' },
  logo: { fontSize: 9, lineHeight: 1.2, margin: '0 0 20px', color: '#000', textAlign: 'center' },
  box: { marginBottom: 16 },
  boxTop: { margin: 0, lineHeight: 1, color: '#000', textAlign: 'center' },
  boxBot: { margin: 0, lineHeight: 1, color: '#000', textAlign: 'center' },
  boxBody: { padding: '4px 12px', lineHeight: 1.6, textAlign: 'center' },
  dim: { color: '#555', fontSize: 13, textAlign: 'center' },
  statusLine: { margin: '12px 0', fontSize: 13, color: '#555' },
  btnRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', textAlign: 'center' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 13, background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 0, padding: '8px 14px', cursor: 'pointer' },
  resultBox: { marginBottom: 20 },
  histRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 3, fontFamily: "'Courier New', monospace" },
  histLabel: { width: 36, textAlign: 'right', flexShrink: 0 },
  histBar: { color: '#000', letterSpacing: -1 },
  histCount: { color: '#555', fontSize: 12 },
  voteLine: { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', padding: '4px 0', fontSize: 14 },
  closeSection: { marginTop: 8, paddingBottom: 32, textAlign: 'center'  },
  divider: { margin: '0 0 16px', color: '#ccc', lineHeight: 1, textAlign: 'center' }, // ← добавлено textAlign: 'center'
  btnDanger: { borderColor: '#888', color: '#555' },
  confirmBox: { background: '#f9f9f9', border: '1px solid #ccc', padding: '12px 16px' },
  confirmText: { margin: '0 0 12px', fontSize: 13, color: '#333' },
  input: { fontFamily: "'Courier New', monospace", fontSize: 14, padding: '8px 10px', border: '1px solid #000', borderRadius: 0, outline: 'none', background: '#fff' },
};
