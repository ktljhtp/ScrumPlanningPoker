import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './context/SocketContext'  // ← добавить

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SocketProvider>   {/* ← добавить */}
      <App />
    </SocketProvider>  {/* ← добавить */}
  </StrictMode>,
)