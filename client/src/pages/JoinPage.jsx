import { useState } from 'react';
import api from '../api/http';

const W = 42; // ширина рамки в символах
const line = (char = '─') => char.repeat(W);

export default function JoinPage({ onJoined }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) { setError('Заполни имя и код комнаты'); return; }
    setLoading(true);
    try {
      await api.post(`/room/${code.toUpperCase()}/join`, { name: name.trim() });
      localStorage.setItem('userName', name.trim());
      onJoined({ roomCode: code.toUpperCase(), name: name.trim(), isAdmin: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка подключения');
    } finally { setLoading(false); }
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Введи имя'); return; }
    setLoading(true);
    try {
      const res = await api.post('/room', {});
      localStorage.setItem('userName', name.trim());
      onJoined({ roomCode: res.data.code, name: name.trim(), isAdmin: true });
    } catch {
      setError('Не удалось создать комнату');
    } finally { setLoading(false); }
  }

  return (
    <div style={s.page}>

      {/* Логотип */}
      <pre style={s.logo}>{`
 ███████╗ ██████╗██████╗ ██╗   ██╗███╗   ███║
 ██╔════╝██╔════╝██╔══██╗██║   ██║████╗ ████║
 ███████╗██║     ██████╔╝██║   ██║██╔████╔██║
 ╚════██║██║     ██╔══██╗██║   ██║██║╚██╔╝██║
 ███████║╚██████╗██║  ██║╚██████╔╝██║ ╚═╝ ██║
 ╚══════╝ ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝

██████╗ ██╗      █████╗ ███╗   ██╗███╗   ██╗██╗███╗   ██╗ ██████╗
██╔══██╗██║     ██╔══██╗████╗  ██║████╗  ██║██║████╗  ██║██╔════╝
 ██████╔╝██║     ███████║██╔██╗ ██║██╔██╗ ██║██║██╔██╗ ██║██║  ███╗
 ██╔═══╝ ██║     ██╔══██║██║╚██╗██║██║╚██╗██║██║██║╚██╗██║██║   ██║
 ██║     ███████╗██║  ██║██║ ╚████║██║ ╚████║██║██║ ╚████║╚██████╔╝
╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝╚═╝╚═╝  ╚═══╝ ╚═════╝

██████╗  ██████╗ ██╗  ██╗███████╗██████╗
 ██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔══██╗
 ██████╔╝██║   ██║█████╔╝ █████╗  ██████╔╝
 ██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██╔══██╗
 ██║     ╚██████╔╝██║  ██╗███████╗██║  ██║
 ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
`}</pre>

      {error && (
        <p style={s.error}>! {error}</p>
      )}

      {/* Имя */}
      <div style={s.group}>
        <label style={s.label}>Имя:</label>
        <input
          placeholder="введи имя..."
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleCreateRoom(e)}
        />
      </div>

      {/* Разделитель */}
      <pre style={s.sep}>{`${line()}
 -- войти в существующую комнату --
${line()}`}</pre>

      {/* Код комнаты */}
      <div style={s.group}>
        <label style={s.label}>Код комнаты:</label>
        <input
          style={{ ...s.input, letterSpacing: 6, textTransform: 'uppercase' }}
          placeholder="XXXXXX"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleJoin(e)}
          maxLength={6}
          style={{ letterSpacing: 6, textTransform: 'uppercase' }}
        />
      </div>
      <button style={{ ...s.btn, width: '100%', marginBottom: 16, textAlign: 'center' }} onClick={handleJoin} disabled={loading}>
        [ Войти ]
      </button>

      <pre style={s.sep}>{`${line()}
 -- или --
${line()}`}</pre>

      <button style={{ ...s.btn, width: '100%', marginBottom: 16, textAlign: 'center' }}
        onClick={handleJoin}
        disabled={loading}>
        [ Создать комнату (я — администратор) ]
      </button>
    </div>
  );
}

const s = {
  page: { maxWidth: 460, margin: '0 auto', fontFamily: "'Courier New', monospace", backgroundColor: '#fff'},
  logo: { fontSize: 10, lineHeight: 1.2, color: '#000', margin: '0 0 24px', fontFamily: "'Courier New', monospace" },
  group: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, marginBottom: 4, color: '#555' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 14, background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 0, padding: '10px 16px', cursor: 'pointer', textAlign: 'left' },
  sep: { fontSize: 11, color: '#aaa', margin: '16px 0', lineHeight: 1.4, fontFamily: "'Courier New', monospace" },
  error: { border: '1px solid #000', padding: '8px 12px', marginBottom: 16, fontSize: 13, background: '#f5f5f5' },
  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    fontFamily: "'Courier New', monospace",
    backgroundColor: '#ffffff',
    color: '#000000',
    border: '1px solid #000000',
    borderRadius: 0,
    outline: 'none',
    boxSizing: 'border-box',
  },
};
