import { useState, useEffect } from 'react';
import { SocketProvider } from './context/SocketContext';
import api from './api/http';
import JoinPage from './pages/JoinPage';
import AdminPage from './pages/AdminPage';
import ParticipantPage from './pages/ParticipantPage';

export default function App() {
  const [state, setState] = useState(null);
  const [view, setView] = useState('loading');
  const [sessionReady, setSessionReady] = useState(false);
  const [closedByAdmin, setClosedByAdmin] = useState(false);

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
        setSessionReady(true);
        setView('join');
      });
  }, []);

  function handleJoined(data) {
    setState(data);
    setClosedByAdmin(false);
    setView(data.isAdmin ? 'admin' : 'participant');
  }

  // Участник нажал «выйти» сам, или комната была закрыта админом
  function handleLeft(opts = {}) {
    setClosedByAdmin(!!opts.closed);
    setState(null);
    setView('join');
  }

  // Админ закрыл комнату
  function handleAdminClosed() {
    setState(null);
    setView('join');
  }

  if (view === 'loading') {
    return <p style={{ textAlign: 'center', marginTop: '40px', fontFamily: 'monospace' }}>загрузка...</p>;
  }

  return (
    <SocketProvider sessionReady={sessionReady}>
      {view === 'admin' && (
        <AdminPage roomCode={state.roomCode} onClosed={handleAdminClosed} />
      )}
      {view === 'participant' && (
        <ParticipantPage
          roomCode={state.roomCode}
          name={state.name}
          onLeft={handleLeft}
        />
      )}
      {view === 'join' && (
        <JoinPage
          onJoined={handleJoined}
          initialCode={state?.roomCode}
          roomClosed={closedByAdmin}
        />
      )}
    </SocketProvider>
  );
}
