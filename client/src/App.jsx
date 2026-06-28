import { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import api from './api/http';
import JoinPage from './pages/JoinPage';
import AdminPage from './pages/AdminPage';
import ParticipantPage from './pages/ParticipantPage';

export default function App() {
  const [state, setState] = useState(null); // null = loading
  const [view, setView] = useState('join'); // join | admin | participant
  const [sessionReady, setSessionReady] = useState(false);

  // При загрузке пробуем восстановить сессию
  useEffect(() => {
    api.get('/session')
      .then(res => {
        setSessionReady(true); 
        if (res.data.active) {
          setState(res.data);
          setView(res.data.isAdmin ? 'admin' : 'participant');
        } else {
          const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{6})$/);
          if (match) setState({ roomCode: match[1] });
          setView('join');
        }
      })
      .catch(() => {
        setSessionReady(true); // всё равно разрешаем подключение
        setView('join');
      });
  }, []);

  function handleJoined(data) {
    setState(data);
    setView(data.isAdmin ? 'admin' : 'participant');
  }

  if (state === null && view !== 'join') {
    return <p style={{ textAlign: 'center', marginTop: '40px' }}>Загрузка...</p>;
  }

  return (
  <SocketProvider sessionReady={sessionReady}>
    {state === null && view !== 'join' ? (
      <p style={{ textAlign: 'center', marginTop: '40px' }}>Загрузка...</p>
    ) : view === 'admin' ? (
      <AdminPage roomCode={state.roomCode} />
    ) : view === 'participant' ? (
      <ParticipantPage roomCode={state.roomCode} name={state.name} />
    ) : (
      <JoinPage onJoined={handleJoined} initialCode={state?.roomCode} />
    )}
  </SocketProvider>
);
}