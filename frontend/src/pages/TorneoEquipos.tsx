import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEquipos, updateEquipo, getClubes, crearClub } from '../api/cronograma';

interface Club { id: string; nombre: string; ciudad?: string }
interface Team {
  id: string;
  nombre: string;
  club_id: string | null;
  club: Club | null;
  _count: { players: number };
}
interface Categoria {
  id: string;
  nombre: string;
  sub: number;
  genero: string;
  color: string | null;
  teams: Team[];
}

export default function TorneoEquipos() {
  const { id: torneoId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState<string | null>(null); // teamId en edición
  const [nombreEdit, setNombreEdit] = useState('');
  const [clubEdit, setClubEdit] = useState('');
  const [nuevoClub, setNuevoClub] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!torneoId) return;
    Promise.all([getEquipos(torneoId), getClubes()])
      .then(([cats, cls]) => { setCategorias(cats); setClubes(cls); })
      .finally(() => setCargando(false));
  }, [torneoId]);

  function iniciarEdicion(team: Team) {
    setEditando(team.id);
    setNombreEdit(team.nombre);
    setClubEdit(team.club_id ?? '');
  }

  async function guardarEquipo(teamId: string) {
    if (!torneoId) return;
    setGuardando(true);
    try {
      const updated = await updateEquipo(torneoId, teamId, {
        nombre: nombreEdit.trim() || undefined,
        club_id: clubEdit || null,
      });
      setCategorias(prev => prev.map(cat => ({
        ...cat,
        teams: cat.teams.map(t => t.id === teamId ? { ...t, ...updated } : t),
      })));
      setEditando(null);
    } finally {
      setGuardando(false);
    }
  }

  async function handleCrearClub() {
    const nombre = nuevoClub.trim();
    if (!nombre) return;
    const club = await crearClub({ nombre });
    setClubes(prev => [...prev, club].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setClubEdit(club.id);
    setNuevoClub('');
  }

  if (cargando) return <div style={{ padding: '2rem', color: '#6b7280' }}>Cargando equipos...</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => navigate(`/torneos/${torneoId}`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, padding: 0 }}
        >
          ←
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 22 }}>Equipos del torneo</h1>
          <p style={{ margin: '0.2rem 0 0', fontSize: 13, color: '#6b7280' }}>
            Renombra los equipos, asigna un club y gestiona la plantilla
          </p>
        </div>
      </div>

      {categorias.map(cat => (
        <div key={cat.id} style={{ marginBottom: '2rem' }}>
          {/* Cabecera categoría */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            borderBottom: `3px solid ${cat.color ?? '#2563eb'}`,
            paddingBottom: '0.5rem', marginBottom: '0.75rem',
          }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{cat.nombre}</h2>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{cat.teams.length} equipos</span>
          </div>

          {/* Grid de equipos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
            {cat.teams.map(team => (
              <div key={team.id} style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
                padding: '0.9rem 1rem',
              }}>
                {editando === team.id ? (
                  // Modo edición
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      value={nombreEdit}
                      onChange={e => setNombreEdit(e.target.value)}
                      placeholder="Nombre del equipo"
                      style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                      autoFocus
                    />
                    <select
                      value={clubEdit}
                      onChange={e => setClubEdit(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                    >
                      <option value="">Sin club</option>
                      {clubes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    {/* Crear club rápido */}
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        value={nuevoClub}
                        onChange={e => setNuevoClub(e.target.value)}
                        placeholder="Nuevo club..."
                        style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 12 }}
                        onKeyDown={e => e.key === 'Enter' && handleCrearClub()}
                      />
                      <button
                        onClick={handleCrearClub}
                        style={{ padding: '0.35rem 0.6rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}
                      >
                        + Club
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => guardarEquipo(team.id)}
                        disabled={guardando}
                        style={{ flex: 1, padding: '0.4rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditando(null)}
                        style={{ padding: '0.4rem 0.7rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  // Modo visualización
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{team.nombre}</div>
                        {team.club && (
                          <div style={{ fontSize: 12, color: '#6b7280' }}>{team.club.nombre}</div>
                        )}
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                          {team._count.players} jugadores
                        </div>
                      </div>
                      <button
                        onClick={() => iniciarEdicion(team)}
                        style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: 12, color: '#374151' }}
                      >
                        ✏️ Editar
                      </button>
                    </div>
                    <Link
                      to={`/torneos/${torneoId}/equipos/${team.id}`}
                      style={{
                        display: 'block', marginTop: '0.75rem', textAlign: 'center',
                        padding: '0.35rem', background: '#f0f9ff', color: '#0369a1',
                        borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                      }}
                    >
                      👥 Ver jugadores
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {categorias.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          No hay equipos en este torneo
        </div>
      )}
    </div>
  );
}
