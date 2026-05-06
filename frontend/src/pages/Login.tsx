import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/cronograma';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { token, user } = await login(email, password);
      setAuth(token, user);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg ?? 'Error al iniciar sesion');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '2.5rem 2rem', width: '100%', maxWidth: 380 }}>
        <h1 style={{ margin: '0 0 0.25rem', fontSize: 22, textAlign: 'center' }}>Iniciar sesion</h1>
        <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', margin: '0 0 1.75rem' }}>
          Futbol Formativo Ecuador
        </p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 7, padding: '0.6rem 1rem', fontSize: 14, marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required autoFocus
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit" disabled={cargando}
            style={{ background: '#2563eb', color: '#fff', padding: '0.7rem', border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 15, cursor: 'pointer', marginTop: '0.25rem' }}
          >
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1.25rem' }}>
          ¿No tienes cuenta?{' '}
          <Link to="/registro" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
            Registrarse
          </Link>
        </p>
      </div>
    </div>
  );
}
