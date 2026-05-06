import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import NuevoTorneo from './pages/NuevoTorneo';
import Dashboard from './pages/Dashboard';
import TorneoCalendario from './pages/TorneoCalendario';
import TorneoPublico from './pages/TorneoPublico';
import Login from './pages/Login';
import Registro from './pages/Registro';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './store/authStore';

function Nav() {
  const { pathname } = useLocation();
  const { user, logout } = useAuthStore();
  if (pathname.startsWith('/p/') || pathname === '/login' || pathname === '/registro') return null;
  return (
    <nav style={{ background: '#1e3a5f', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 18 }}>
        Futbol Formativo
      </Link>
      <Link to="/torneos/nuevo" style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 14 }}>
        Nuevo torneo
      </Link>
      {user && (
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#cbd5e1', fontSize: 13 }}>{user.nombre}</span>
          <button
            onClick={logout}
            style={{ background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', padding: '0.3rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
          >
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/p/:slug" element={<TorneoPublico />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/torneos/nuevo" element={<ProtectedRoute><NuevoTorneo /></ProtectedRoute>} />
        <Route path="/torneos/:id" element={<ProtectedRoute><TorneoCalendario /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
