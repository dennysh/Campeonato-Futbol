import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getJugadores, crearJugador, updateJugador, eliminarJugador } from '../api/cronograma';

interface Player {
  id: string;
  nombre: string;
  numero: number | null;
  posicion: string | null;
}

interface TeamDetalle {
  id: string;
  nombre: string;
  club: { id: string; nombre: string } | null;
  category: { nombre: string; color: string | null };
  players: Player[];
}

const POSICIONES = ['Portero', 'Defensa', 'Mediocampista', 'Delantero'];

const emptyForm = { nombre: '', numero: '', posicion: '' };

export default function EquipoDetalle() {
  const { id: torneoId, teamId } = useParams<{ id: string; teamId: string }>();
  const navigate = useNavigate();

  const [equipo, setEquipo] = useState<TeamDetalle | null>(null);
  const [cargando, setCargando] = useState(true);

  const [form, setForm] = useState(emptyForm);
  const [agregando, setAgregando] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!torneoId || !teamId) return;
    getJugadores(torneoId, teamId)
      .then(setEquipo)
      .finally(() => setCargando(false));
  }, [torneoId, teamId]);

  async function handleAgregar() {
    if (!torneoId || !teamId || !form.nombre.trim()) return;
    setGuardando(true);
    try {
      const player = await crearJugador(torneoId, teamId, {
        nombre: form.nombre.trim(),
        numero: form.numero !== '' ? Number(form.numero) : null,
        posicion: form.posicion || undefined,
      });
      setEquipo(prev => prev ? { ...prev, players: [...prev.players, player] } : prev);
      setForm(emptyForm);
      setAgregando(false);
    } finally {
      setGuardando(false);
    }
  }

  async function handleGuardarEdit(playerId: string) {
    if (!torneoId || !teamId) return;
    setGuardando(true);
    try {
      const updated = await updateJugador(torneoId, teamId, playerId, {
        nombre: editForm.nombre.trim(),
        numero: editForm.numero !== '' ? Number(editForm.numero) : null,
        posicion: editForm.posicion || undefined,
      });
      setEquipo(prev => prev ? {
        ...prev,
        players: prev.players.map(p => p.id === playerId ? updated : p),
      } : prev);
      setEditId(null);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(playerId: string) {
    if (!torneoId || !teamId) return;
    if (!confirm('¿Eliminar jugador?')) return;
    await eliminarJugador(torneoId, teamId, playerId);
    setEquipo(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== playerId) } : prev);
  }

  if (cargando) return <div style={{ padding: '2rem', color: '#6b7280' }}>Cargando...</div>;
  if (!equipo) return <div style={{ padding: '2rem', color: '#ef4444' }}>Equipo no encontrado</div>;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(`/torneos/${torneoId}/equipos`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, padding: 0 }}
        >
          ←
        </button>
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>{equipo.category.nombre}</div>
          <h1 style={{ margin: 0, fontSize: 22 }}>{equipo.nombre}</h1>
          {equipo.club && <div style={{ fontSize: 13, color: '#6b7280' }}>{equipo.club.nombre}</div>}
        </div>
        <span style={{
          marginLeft: 'auto', background: '#f0f9ff', color: '#0369a1',
          padding: '0.3rem 0.8rem', borderRadius: 20, fontSize: 13,
        }}>
          {equipo.players.length} jugadores
        </span>
      </div>

      {/* Lista de jugadores */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
        {/* Cabecera tabla */}
        <div style={{
          display: 'grid', gridTemplateColumns: '50px 1fr 100px 130px 90px',
          padding: '0.6rem 1rem', background: '#f9fafb',
          fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb',
        }}>
          <span>#</span>
          <span>Nombre</span>
          <span>Posición</span>
          <span></span>
          <span></span>
        </div>

        {equipo.players.length === 0 && (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Aún no hay jugadores. Agrega el primero.
          </div>
        )}

        {equipo.players.map(player => (
          <div key={player.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
            {editId === player.id ? (
              // Modo edición inline
              <div style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 120px 100px',
                gap: '0.5rem', padding: '0.6rem 1rem', alignItems: 'center',
              }}>
                <input
                  type="number"
                  value={editForm.numero}
                  onChange={e => setEditForm(f => ({ ...f, numero: e.target.value }))}
                  placeholder="#"
                  style={{ padding: '0.35rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13, width: '100%' }}
                />
                <input
                  value={editForm.nombre}
                  onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))}
                  style={{ padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                />
                <select
                  value={editForm.posicion}
                  onChange={e => setEditForm(f => ({ ...f, posicion: e.target.value }))}
                  style={{ padding: '0.35rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
                >
                  <option value="">—</option>
                  {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => handleGuardarEdit(player.id)}
                    disabled={guardando}
                    style={{ flex: 1, padding: '0.35rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    style={{ padding: '0.35rem 0.5rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              // Vista normal
              <div style={{
                display: 'grid', gridTemplateColumns: '50px 1fr 100px 130px 90px',
                padding: '0.65rem 1rem', alignItems: 'center', fontSize: 14,
              }}>
                <span style={{ color: '#9ca3af', fontWeight: 600 }}>{player.numero ?? '—'}</span>
                <span style={{ fontWeight: 500 }}>{player.nombre}</span>
                <span style={{ color: '#6b7280', fontSize: 13 }}>{player.posicion ?? '—'}</span>
                <span></span>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      setEditId(player.id);
                      setEditForm({ nombre: player.nombre, numero: player.numero?.toString() ?? '', posicion: player.posicion ?? '' });
                    }}
                    style={{ padding: '0.25rem 0.5rem', background: 'none', border: '1px solid #e5e7eb', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleEliminar(player.id)}
                    style={{ padding: '0.25rem 0.5rem', background: 'none', border: '1px solid #fee2e2', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#ef4444' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario agregar jugador */}
      {agregando ? (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
        }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Nuevo jugador</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 150px', gap: '0.5rem' }}>
            <input
              type="number"
              placeholder="# Camiseta"
              value={form.numero}
              onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            />
            <input
              placeholder="Nombre completo *"
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAgregar()}
              style={{ padding: '0.5rem 0.7rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
              autoFocus
            />
            <select
              value={form.posicion}
              onChange={e => setForm(f => ({ ...f, posicion: e.target.value }))}
              style={{ padding: '0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            >
              <option value="">Posición</option>
              {POSICIONES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleAgregar}
              disabled={guardando || !form.nombre.trim()}
              style={{ padding: '0.5rem 1.5rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}
            >
              Agregar
            </button>
            <button
              onClick={() => { setAgregando(false); setForm(emptyForm); }}
              style={{ padding: '0.5rem 1rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAgregando(true)}
          style={{
            width: '100%', padding: '0.7rem', background: '#f0f9ff', color: '#0369a1',
            border: '2px dashed #bae6fd', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
          }}
        >
          + Agregar jugador
        </button>
      )}
    </div>
  );
}
