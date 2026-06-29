import { useState } from 'react';
import api from '../api/http';

const W = 42;
const line = (char = '─') => char.repeat(W);

export default function JoinPage({ onJoined, initialCode, roomClosed }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  const [code, setCode] = useState(initialCode || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultMode, setResultMode] = useState('median');

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
      const res = await api.post('/room', { resultMode });
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

      {/* Уведомление о закрытии комнаты */}
      {roomClosed && (
        <p style={s.notice}>! комната была закрыта администратором</p>
      )}

      {error && (
        <p style={s.error}>! {error}</p>
      )}

      {/* Имя */}
      <div style={s.group}>
        <label style={s.label}>Имя:</label>
        <input
          style={s.input}
          placeholder="введи имя..."
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleCreateRoom(e)}
        />
      </div>

      {/* Разделитель */}
      <pre style={s.sep}>{`${line()}\n -- войти в существующую комнату --\n${line()}`}</pre>

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
        />
      </div>
      <button style={{ ...s.btn, width: '100%', marginBottom: 16, textAlign: 'center' }} onClick={handleJoin} disabled={loading}>
        [ Войти ]
      </button>

      <pre style={s.sep}>{`${line()}\n -- или создать новую комнату --\n${line()}`}</pre>

      {/* Режим результатов */}
      <div style={s.group}>
        <label style={s.label}>Режим результатов:</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          {[
            { value: 'median',  label: 'медиана (по умолчанию)' },
            { value: 'average', label: 'среднее' },
            { value: 'all',     label: 'показать все голоса + медиана' },
          ].map(opt => (
            <label key={opt.value} style={{ ...s.radioLabel, fontWeight: resultMode === opt.value ? 'bold' : 'normal' }}>
              <input
                type="radio"
                name="resultMode"
                value={opt.value}
                checked={resultMode === opt.value}
                onChange={() => setResultMode(opt.value)}
                style={{ marginRight: 8 }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <button style={{ ...s.btn, width: '100%', marginBottom: 16, textAlign: 'center' }} onClick={handleCreateRoom} disabled={loading}>
        [ Создать комнату (я — администратор) ]
      </button>

    </div>
  );
}

const s = {
  page: { maxWidth: 460, margin: '0 auto', padding: '16px 16px 0', fontFamily: "'Courier New', monospace", backgroundColor: '#fff', boxSizing: 'border-box' },
  logo: { fontSize: 10, lineHeight: 1.2, color: '#000', margin: '0 0 24px', fontFamily: "'Courier New', monospace" },
  group: { marginBottom: 12 },
  label: { display: 'block', fontSize: 13, marginBottom: 4, color: '#000' },
  radioLabel: { display: 'flex', alignItems: 'center', fontSize: 13, color: '#000', cursor: 'pointer', fontFamily: "'Courier New', monospace" },
  input: { fontFamily: "'Courier New', monospace", fontSize: 14, width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #000', borderRadius: 0, outline: 'none', background: '#fff' },
  btn: { fontFamily: "'Courier New', monospace", fontSize: 14, background: '#fff', color: '#000', border: '1px solid #000', borderRadius: 0, padding: '10px 16px', cursor: 'pointer', textAlign: 'left' },
  sep: { fontSize: 11, color: '#aaa', margin: '16px 0', lineHeight: 1.4, fontFamily: "'Courier New', monospace", textAlign: 'center' },
  error: { border: '1px solid #000', padding: '8px 12px', marginBottom: 16, fontSize: 13, background: '#f5f5f5' },
  notice: { border: '1px solid #888', padding: '8px 12px', marginBottom: 16, fontSize: 13, background: '#f5f5f5', color: '#555' },
};
