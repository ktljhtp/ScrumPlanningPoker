import { useState } from 'react';
import api from '../api/http';

export default function JoinPage({ onJoined }) {
  const [name, setName] = useState(localStorage.getItem('userName') || '');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError('Заполни имя и код комнаты');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/room/${code.toUpperCase()}/join`, { name: name.trim() });
      localStorage.setItem('userName', name.trim()); // удобно для предзаполнения
      onJoined({ roomCode: code.toUpperCase(), name: name.trim(), isAdmin: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка подключения');
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🃏 Scrum Poker</h1>
      {error && <p style={styles.error}>{error}</p>}

      <input
        style={styles.input}
        placeholder="Твоё имя"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <div style={styles.divider}>— войти в комнату —</div>

      <input
        style={{ ...styles.input, textTransform: 'uppercase', letterSpacing: '4px' }}
        placeholder="Код комнаты"
        value={code}
        onChange={e => setCode(e.target.value)}
        maxLength={6}
      />
      <button style={styles.btnPrimary} onClick={handleJoin} disabled={loading}>
        Войти
      </button>

      <div style={styles.divider}>— или —</div>

      <button style={styles.btnSecondary} onClick={handleCreateRoom} disabled={loading}>
        Создать новую комнату (я — администратор)
      </button>
    </div>
  );
}

const styles = {
  container: { maxWidth: 400, margin: '60px auto', padding: '24px', fontFamily: 'sans-serif' },
  title: { textAlign: 'center', fontSize: '32px', marginBottom: '24px' },
  error: { color: 'red', textAlign: 'center' },
  input: { width: '100%', padding: '12px', fontSize: '18px', borderRadius: '8px', border: '1px solid #ccc', marginBottom: '12px', boxSizing: 'border-box' },
  btnPrimary: { width: '100%', padding: '14px', fontSize: '18px', background: '#4f6ef7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '8px' },
  btnSecondary: { width: '100%', padding: '14px', fontSize: '16px', background: '#f1f5f9', border: '1px solid #ccc', borderRadius: '8px', cursor: 'pointer' },
  divider: { textAlign: 'center', color: '#94a3b8', margin: '16px 0' },
};