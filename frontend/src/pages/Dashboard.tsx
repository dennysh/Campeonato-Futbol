import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTorneos } from '../api/cronograma';

interface Torneo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  status: string;
  created_at: string;
  _count: { categories: number };
  schedule_versions: { _count: { matches: number } }[];
}

export default function Dashboard() {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getTorneos()
      .then(setTorneos)
      .finally(() => setCargando(false));
  }, []);

  const badgeColor = (status: string) =>
    status === 'publicado' ? { bg: '#dcfce7', color: '#16a34a' } : { bg: '#fef9c3', color: '#854d0e' };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Mis torneos</h1>
          <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: 14 }}>
            Gestiona tus campeonatos de futbol formativo
          </p>
        </div>
        <Link to="/torneos/nuevo" style={{
          background: '#2563eb', color: '#fff', padding: '0.6rem 1.5rem',
          borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15,
        }}>
          + Nuevo torneo
        </Link>
      </div>

      {cargando && <p style={{ color: '#6b7280' }}>Cargando...</p>}

      {!cargando && torneos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', border: '2px dashed #e5e7eb', borderRadius: 12 }}>
          <p style={{ fontSize: 18, color: '#6b7280', marginBottom: '1rem' }}>
            Aun no tienes torneos creados
          </p>
          <Link to="/torneos/nuevo" style={{
            background: '#2563eb', color: '#fff', padding: '0.6rem 1.5rem',
            borderRadius: 8, textDecoration: 'none', fontWeight: 600,
          }}>
            Crear mi primer torneo
          </Link>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {torneos.map((t) => {
          const badge = badgeColor(t.status);
          const partidos = t.schedule_versions[0]?._count?.matches ?? 0;
          return (
            <div key={t.id} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
              padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{t.nombre}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: badge.bg, color: badge.color, textTransform: 'uppercase',
                  }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  Inicio: {t.fecha_inicio} &nbsp;·&nbsp; {t._count.categories} categorias &nbsp;·&nbsp; {partidos} partidos
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <Link to={`/torneos/${t.id}/equipos`} style={{
                  background: '#eff6ff', color: '#2563eb', padding: '0.4rem 1rem',
                  borderRadius: 6, textDecoration: 'none', fontWeight: 500, fontSize: 14,
                  whiteSpace: 'nowrap',
                }}>
                  👥 Equipos
                </Link>
                <Link to={`/torneos/${t.id}`} style={{
                  background: '#f3f4f6', color: '#374151', padding: '0.4rem 1rem',
                  borderRadius: 6, textDecoration: 'none', fontWeight: 500, fontSize: 14,
                  whiteSpace: 'nowrap',
                }}>
                  Ver calendario
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
