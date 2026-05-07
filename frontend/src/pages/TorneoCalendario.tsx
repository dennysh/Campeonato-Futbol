import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg } from '@fullcalendar/interaction';
import { getTorneo, moverPartido, publicarTorneo } from '../api/cronograma';

interface Match {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  field_id: string;
  home_team: { id: string; nombre: string; category: { nombre: string } };
  away_team: { id: string; nombre: string; category: { nombre: string } };
  field: { id: string; nombre: string };
}

interface Torneo {
  id: string;
  nombre: string;
  slug: string;
  status: string;
  schedule_versions: { id: string; matches: Match[] }[];
}

const COLORES = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function colorPorCategoria(cat: string, cats: string[]) {
  return COLORES[cats.indexOf(cat) % COLORES.length];
}

function nombreDia(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ─── Buscador de equipos ──────────────────────────────────────────────────────
function BuscarEquipo({ matches, cats }: { matches: Match[]; cats: string[] }) {
  const [query, setQuery] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [equipoSel, setEquipoSel] = useState<{ id: string; nombre: string; cat: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Lista única de equipos
  const equipos = [
    ...new Map(
      matches.flatMap((m) => [
        { id: m.home_team.id, nombre: m.home_team.nombre, cat: m.home_team.category.nombre },
        { id: m.away_team.id, nombre: m.away_team.nombre, cat: m.away_team.category.nombre },
      ]).map((e) => [e.id, e])
    ).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));

  const sugerencias = query.trim().length >= 1
    ? equipos.filter((e) => e.nombre.toLowerCase().includes(query.toLowerCase()))
    : [];

  function seleccionar(eq: typeof equipoSel) {
    setEquipoSel(eq);
    setQuery(eq?.nombre ?? '');
    setAbierto(false);
  }

  function limpiar() {
    setEquipoSel(null);
    setQuery('');
    inputRef.current?.focus();
  }

  const partidosEquipo = equipoSel
    ? matches
        .filter((m) => m.home_team.id === equipoSel.id || m.away_team.id === equipoSel.id)
        .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora_inicio.localeCompare(b.hora_inicio))
    : [];

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Input con autocompletado */}
      <div style={{ position: 'relative', maxWidth: 380 }}>
        <div style={{ position: 'relative' }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAbierto(true); setEquipoSel(null); }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            placeholder="Buscar equipo..."
            style={{
              width: '100%', padding: '0.5rem 2.5rem 0.5rem 0.9rem',
              border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
              borderColor: equipoSel ? '#2563eb' : '#d1d5db',
            }}
          />
          {query && (
            <button onClick={limpiar} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1,
            }}>×</button>
          )}
        </div>

        {/* Dropdown sugerencias */}
        {abierto && sugerencias.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginTop: 4, overflow: 'hidden',
          }}>
            {sugerencias.slice(0, 8).map((eq) => (
              <button key={eq.id} onMouseDown={() => seleccionar(eq)} style={{
                width: '100%', padding: '0.5rem 0.9rem', textAlign: 'left',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{eq.nombre}</span>
                <span style={{
                  fontSize: 11, color: '#fff', fontWeight: 600, padding: '1px 8px', borderRadius: 20,
                  background: colorPorCategoria(eq.cat, cats),
                }}>{eq.cat}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resultados del equipo seleccionado */}
      {equipoSel && (
        <div style={{
          marginTop: '0.75rem', border: '1px solid #dbeafe', borderRadius: 10,
          background: '#fff', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: '#eff6ff', padding: '0.65rem 1rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{equipoSel.nombre}</span>
              <span style={{
                marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#fff',
                background: colorPorCategoria(equipoSel.cat, cats),
                padding: '1px 8px', borderRadius: 20,
              }}>{equipoSel.cat}</span>
            </div>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{partidosEquipo.length} partidos</span>
          </div>

          {/* Lista de partidos */}
          {partidosEquipo.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Sin partidos asignados
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Fecha', 'Hora', 'Cancha', 'Rival'].map((h) => (
                    <th key={h} style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partidosEquipo.map((m, i) => {
                  const esLocal = m.home_team.id === equipoSel.id;
                  const rival = esLocal ? m.away_team.nombre : m.home_team.nombre;
                  return (
                    <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                        {new Date(m.fecha + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid #f3f4f6', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {m.hora_inicio} – {m.hora_fin}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                        {m.field.nombre}
                      </td>
                      <td style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280', fontSize: 11, marginRight: 4 }}>{esLocal ? 'vs' : 'vs'}</span>
                        <span style={{ fontWeight: 600 }}>{rival}</span>
                        <span style={{ marginLeft: 6, fontSize: 10, color: '#9ca3af' }}>{esLocal ? '(local)' : '(visita)'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Vista tabla: Hora × Cancha ───────────────────────────────────────────────
function VistaTabla({
  matches, fecha, setFecha, dias, cats, matchDetalle, setMatchDetalle,
}: {
  matches: Match[]; fecha: string; setFecha: (f: string) => void;
  dias: string[]; cats: string[];
  matchDetalle: Match | null; setMatchDetalle: (m: Match | null) => void;
}) {
  const matchesDia = matches.filter((m) => m.fecha === fecha);
  const canchas = [
    ...new Map(
      [...matches].sort((a, b) => a.field.nombre.localeCompare(b.field.nombre))
        .map((m) => [m.field.id, m.field])
    ).values(),
  ];
  const horas = [...new Set(matchesDia.map((m) => m.hora_inicio))].sort();

  const grid: Record<string, Record<string, Match>> = {};
  for (const m of matchesDia) {
    if (!grid[m.hora_inicio]) grid[m.hora_inicio] = {};
    grid[m.hora_inicio][m.field_id] = m;
  }

  const diaIdx = dias.indexOf(fecha);

  return (
    <div>
      {/* Navegacion de fechas */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
        borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap',
      }}>
        <button
          onClick={() => setFecha(dias[diaIdx - 1])}
          disabled={diaIdx === 0}
          style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', cursor: diaIdx === 0 ? 'not-allowed' : 'pointer', background: '#fff' }}
        >‹ Anterior</button>

        <select
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          {dias.map((d) => (
            <option key={d} value={d}>
              {new Date(d + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
            </option>
          ))}
        </select>

        <span style={{ fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
          {nombreDia(fecha)}
        </span>

        <button
          onClick={() => setFecha(dias[diaIdx + 1])}
          disabled={diaIdx === dias.length - 1}
          style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid #d1d5db', cursor: diaIdx === dias.length - 1 ? 'not-allowed' : 'pointer', background: '#fff' }}
        >Siguiente ›</button>

        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>
          {matchesDia.length} partidos este dia
        </span>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '0.6rem 1rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb', width: 80, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Hora
              </th>
              {canchas.map((c) => (
                <th key={c.id} style={{ padding: '0.6rem 1rem', textAlign: 'center', borderBottom: '2px solid #e5e7eb', borderLeft: '1px solid #f3f4f6', fontWeight: 700, color: '#111827' }}>
                  {c.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {horas.length === 0 ? (
              <tr>
                <td colSpan={canchas.length + 1} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                  No hay partidos programados para esta fecha
                </td>
              </tr>
            ) : (
              horas.map((hora, ri) => (
                <tr key={hora} style={{ background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '0.6rem 1rem', fontWeight: 700, color: '#374151', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                    {hora}
                  </td>
                  {canchas.map((cancha) => {
                    const m = grid[hora]?.[cancha.id];
                    return (
                      <td key={cancha.id} style={{ padding: '0.4rem 0.5rem', borderBottom: '1px solid #f3f4f6', borderLeft: '1px solid #f3f4f6', verticalAlign: 'middle' }}>
                        {m ? (
                          <button
                            onClick={() => setMatchDetalle(matchDetalle?.id === m.id ? null : m)}
                            style={{
                              width: '100%', padding: '0.4rem 0.6rem', borderRadius: 7, cursor: 'pointer', textAlign: 'left',
                              background: matchDetalle?.id === m.id
                                ? colorPorCategoria(m.home_team.category.nombre, cats)
                                : colorPorCategoria(m.home_team.category.nombre, cats) + 'dd',
                              border: `2px solid ${matchDetalle?.id === m.id ? '#1e40af' : 'transparent'}`,
                              transition: 'opacity 0.15s',
                            }}
                          >
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.3 }}>
                              {m.home_team.nombre}
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', margin: '1px 0' }}>vs</div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', lineHeight: 1.3 }}>
                              {m.away_team.nombre}
                            </div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                              {m.home_team.category.nombre}
                            </div>
                          </button>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#e5e7eb', fontSize: 18 }}>—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Vista programa: todos los días → columnas por cancha ────────────────────
function VistaProgramaDias({
  matches, cats, torneoNombre,
}: { matches: Match[]; cats: string[]; torneoNombre: string }) {
  const dias = [...new Set(matches.map((m) => m.fecha))].sort();

  if (dias.length === 0) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>No hay partidos programados.</div>;
  }

  return (
    <div style={{ padding: '1.25rem' }}>
      {/* Cabecera visible solo en impresión */}
      <div className="print-header" style={{ display: 'none' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{torneoNombre}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {dias[0]} — {dias[dias.length - 1]} · {matches.length} partidos · {cats.length} categorías
          </div>
        </div>
        <div style={{ fontSize: 11, color: '#9ca3af' }}>
          Generado {new Date().toLocaleDateString('es')}
        </div>
      </div>

      {dias.map((dia) => {
        const matchesDia = matches.filter((m) => m.fecha === dia);
        const canchasDelDia = [
          ...new Map(
            [...matchesDia]
              .sort((a, b) => a.field.nombre.localeCompare(b.field.nombre))
              .map((m) => [m.field.id, m.field])
          ).values(),
        ];

        return (
          <div key={dia} className="print-dia" style={{ marginBottom: '2.5rem' }}>
            {/* Cabecera del día */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              borderLeft: '4px solid #2563eb', paddingLeft: '0.75rem', marginBottom: '1rem',
            }}>
              <span style={{ fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>
                {nombreDia(dia)}
              </span>
              <span style={{
                fontSize: 12, background: '#dbeafe', color: '#1d4ed8',
                padding: '2px 10px', borderRadius: 20, fontWeight: 600,
              }}>
                {matchesDia.length} partidos
              </span>
            </div>

            {/* Grid de canchas */}
            <div style={{ overflowX: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${canchasDelDia.length}, minmax(220px, 1fr))`,
                gap: '0.75rem',
              }}>
                {canchasDelDia.map((cancha) => {
                  const matchesCancha = matchesDia
                    .filter((m) => m.field_id === cancha.id)
                    .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

                  return (
                    <div key={cancha.id} className="print-cancha-card"
                      style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                      {/* Header cancha */}
                      <div style={{
                        background: '#1e3a8a', color: '#fff',
                        padding: '0.5rem 0.75rem', fontWeight: 700,
                        fontSize: 13, textAlign: 'center', letterSpacing: '0.05em',
                      }}>
                        {cancha.nombre.toUpperCase()}
                      </div>

                      {/* Partidos */}
                      {matchesCancha.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>
                          Sin partidos
                        </div>
                      ) : (
                        matchesCancha.map((m, i) => {
                          const color = colorPorCategoria(m.home_team.category.nombre, cats);
                          return (
                            <div key={m.id} style={{
                              padding: '0.6rem 0.75rem',
                              background: i % 2 === 0 ? '#fff' : '#f9fafb',
                              borderBottom: '1px solid #f3f4f6',
                              borderLeft: `3px solid ${color}`,
                            }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: '#111827', marginBottom: 2 }}>
                                {m.hora_inicio} – {m.hora_fin}
                              </div>
                              <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3, textTransform: 'uppercase' }}>
                                {m.home_team.category.nombre}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                                {m.home_team.nombre}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0', textAlign: 'center' }}>vs</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>
                                {m.away_team.nombre}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function TorneoCalendario() {
  const { id } = useParams<{ id: string }>();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [alerta, setAlerta] = useState<{ tipo: 'error' | 'ok'; msg: string } | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [vista, setVista] = useState<'tabla' | 'programa' | 'calendario'>('tabla');
  const [fechaActiva, setFechaActiva] = useState('');
  const [matchDetalle, setMatchDetalle] = useState<Match | null>(null);
  const [confirmarConflicto, setConfirmarConflicto] = useState<{
    arg: EventDropArg; conflictos: string[];
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    getTorneo(id).then((t) => {
      setTorneo(t);
      const primera = t?.schedule_versions?.[0]?.matches?.[0]?.fecha ?? '';
      setFechaActiva(primera);
    }).finally(() => setCargando(false));
  }, [id]);

  const matches: Match[] = torneo?.schedule_versions[0]?.matches ?? [];
  const cats = [...new Set(matches.map((m) => m.home_team.category.nombre))];
  const dias = [...new Set(matches.map((m) => m.fecha))].sort();

  const events = matches.map((m) => ({
    id: m.id,
    title: `${m.home_team.nombre} vs ${m.away_team.nombre}`,
    start: `${m.fecha}T${m.hora_inicio}`,
    end: `${m.fecha}T${m.hora_fin}`,
    backgroundColor: colorPorCategoria(m.home_team.category.nombre, cats),
    borderColor: colorPorCategoria(m.home_team.category.nombre, cats),
    extendedProps: { match: m },
  }));

  const handleDrop = useCallback(async (arg: EventDropArg) => {
    if (!id || !arg.event.start || !arg.event.end) { arg.revert(); return; }
    const fecha = arg.event.startStr.split('T')[0];
    const hora_inicio = arg.event.startStr.split('T')[1]?.substring(0, 5) ?? '';
    const hora_fin = arg.event.endStr.split('T')[1]?.substring(0, 5) ?? '';
    try {
      await moverPartido(id, arg.event.id, { fecha, hora_inicio, hora_fin });
      setAlerta({ tipo: 'ok', msg: 'Partido movido correctamente' });
      setTimeout(() => setAlerta(null), 3000);
      getTorneo(id).then(setTorneo);
    } catch (err: unknown) {
      const resp = (err as { response?: { data?: { conflictos?: string[]; puede_forzar?: boolean } } })?.response?.data;
      if (resp?.puede_forzar && resp.conflictos?.length) {
        // No revertir — mostrar modal de confirmación
        setConfirmarConflicto({ arg, conflictos: resp.conflictos });
      } else {
        arg.revert();
        setAlerta({ tipo: 'error', msg: 'No se pudo mover el partido' });
        setTimeout(() => setAlerta(null), 4000);
      }
    }
  }, [id]);

  async function handleForzarMovimiento() {
    if (!confirmarConflicto || !id) return;
    const { arg } = confirmarConflicto;
    const fecha = arg.event.startStr.split('T')[0];
    const hora_inicio = arg.event.startStr.split('T')[1]?.substring(0, 5) ?? '';
    const hora_fin = arg.event.endStr.split('T')[1]?.substring(0, 5) ?? '';
    setConfirmarConflicto(null);
    try {
      await moverPartido(id, arg.event.id, { fecha, hora_inicio, hora_fin }, true);
      setAlerta({ tipo: 'ok', msg: 'Partido movido (con conflicto confirmado)' });
      setTimeout(() => setAlerta(null), 3000);
      getTorneo(id).then(setTorneo);
    } catch {
      arg.revert();
      setAlerta({ tipo: 'error', msg: 'No se pudo mover el partido' });
      setTimeout(() => setAlerta(null), 4000);
    }
  }

  function handleCancelarConflicto() {
    confirmarConflicto?.arg.revert();
    setConfirmarConflicto(null);
  }

  function handleCopiarEnlace() {
    const url = `${window.location.origin}/p/${torneo!.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  async function handlePublicar() {
    if (!id) return;
    setPublicando(true);
    try {
      await publicarTorneo(id);
      setTorneo((prev) => prev ? { ...prev, status: 'publicado' } : prev);
      setAlerta({ tipo: 'ok', msg: 'Torneo publicado. Ya es visible para todos.' });
    } catch {
      setAlerta({ tipo: 'error', msg: 'Error al publicar el torneo' });
    } finally {
      setPublicando(false);
    }
  }

  if (cargando) return <div style={{ padding: '2rem', color: '#6b7280' }}>Cargando calendario...</div>;
  if (!torneo) return <div style={{ padding: '2rem', color: '#dc2626' }}>Torneo no encontrado</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <Link to="/" style={{ color: '#6b7280', fontSize: 13, textDecoration: 'none' }}>← Mis torneos</Link>
          <h1 style={{ margin: '0.25rem 0 0', fontSize: 22 }}>{torneo.nombre}</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0.25rem 0 0' }}>
            {matches.length} partidos · {cats.length} categorias · {dias.length} jornadas
            &nbsp;·&nbsp;
            <span style={{
              fontWeight: 600, fontSize: 12, padding: '1px 8px', borderRadius: 20,
              background: torneo.status === 'publicado' ? '#dcfce7' : '#fef9c3',
              color: torneo.status === 'publicado' ? '#16a34a' : '#854d0e',
            }}>
              {torneo.status.toUpperCase()}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {vista === 'programa' && (
            <button onClick={() => window.print()} style={{
              background: '#1e3a8a', color: '#fff', padding: '0.5rem 1.25rem',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              Descargar PDF
            </button>
          )}
          {torneo.status === 'publicado' && (
            <button onClick={handleCopiarEnlace} style={{
              background: copiado ? '#f0fdf4' : '#f3f4f6', color: copiado ? '#16a34a' : '#374151',
              padding: '0.5rem 1.25rem', border: `1px solid ${copiado ? '#bbf7d0' : '#d1d5db'}`,
              borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              {copiado ? '✓ Enlace copiado' : 'Compartir enlace'}
            </button>
          )}
          {torneo.status === 'borrador' && (
            <button onClick={handlePublicar} disabled={publicando} style={{
              background: '#16a34a', color: '#fff', padding: '0.5rem 1.25rem',
              border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}>
              {publicando ? 'Publicando...' : 'Publicar torneo'}
            </button>
          )}
        </div>
      </div>

      {/* Alerta */}
      {alerta && (
        <div style={{
          padding: '0.6rem 1rem', borderRadius: 7, marginBottom: '1rem', fontSize: 14, fontWeight: 500,
          background: alerta.tipo === 'error' ? '#fef2f2' : '#f0fdf4',
          color: alerta.tipo === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${alerta.tipo === 'error' ? '#fecaca' : '#bbf7d0'}`,
        }}>
          {alerta.msg}
        </div>
      )}

      {/* Buscador de equipos */}
      <BuscarEquipo matches={matches} cats={cats} />

      {/* Leyenda + selector de vista */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', flex: 1 }}>
          {cats.map((cat) => (
            <span key={cat} style={{
              fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600,
              background: colorPorCategoria(cat, cats), color: '#fff',
            }}>
              {cat}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 3, gap: 2 }}>
          {([
            { key: 'tabla', label: 'Por jornada' },
            { key: 'programa', label: 'Programa' },
            { key: 'calendario', label: 'Calendario' },
          ] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setVista(key)} style={{
              padding: '0.35rem 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: vista === key ? '#fff' : 'transparent',
              color: vista === key ? '#111827' : '#6b7280',
              boxShadow: vista === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {vista === 'tabla' ? (
            <VistaTabla
              matches={matches}
              fecha={fechaActiva}
              setFecha={setFechaActiva}
              dias={dias}
              cats={cats}
              matchDetalle={matchDetalle}
              setMatchDetalle={setMatchDetalle}
            />
          ) : vista === 'programa' ? (
            <div id="programa-print-wrapper">
              <VistaProgramaDias matches={matches} cats={cats} torneoNombre={torneo.nombre} />
            </div>
          ) : (
            <FullCalendar
              plugins={[timeGridPlugin, interactionPlugin]}
              initialView="timeGridDay"
              initialDate={dias[0] ?? new Date().toISOString().split('T')[0]}
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridDay,timeGridWeek' }}
              locale="es"
              firstDay={0}
              slotMinTime="06:00:00"
              slotMaxTime="21:00:00"
              slotDuration="01:00:00"
              slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
              allDaySlot={false}
              events={events}
              editable={torneo.status === 'borrador'}
              droppable={torneo.status === 'borrador'}
              eventDrop={handleDrop}
              eventClick={(arg) => setMatchDetalle(arg.event.extendedProps.match)}
              height="auto"
              buttonText={{ today: 'Hoy', week: 'Semana', day: 'Dia' }}
            />
          )}
        </div>

        {/* Panel de detalle */}
        {matchDetalle && (
          <div style={{
            width: 260, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '1.25rem', flexShrink: 0, position: 'sticky', top: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Detalle del partido</span>
              <button onClick={() => setMatchDetalle(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
            <div style={{
              background: colorPorCategoria(matchDetalle.home_team.category.nombre, cats) + '18',
              border: `1px solid ${colorPorCategoria(matchDetalle.home_team.category.nombre, cats)}44`,
              borderRadius: 8, padding: '0.75rem', marginBottom: '1rem',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: colorPorCategoria(matchDetalle.home_team.category.nombre, cats), marginBottom: 6 }}>
                {matchDetalle.home_team.category.nombre}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{matchDetalle.home_team.nombre}</div>
              <div style={{ color: '#9ca3af', fontSize: 12, margin: '4px 0' }}>vs</div>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.3 }}>{matchDetalle.away_team.nombre}</div>
            </div>
            {[
              { label: 'Fecha', value: nombreDia(matchDetalle.fecha) },
              { label: 'Hora', value: `${matchDetalle.hora_inicio} – ${matchDetalle.hora_fin}` },
              { label: 'Cancha', value: matchDetalle.field.nombre },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: '0.4rem' }}>
                <span style={{ color: '#6b7280' }}>{label}</span>
                <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 160 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {vista === 'calendario' && torneo.status === 'borrador' && (
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: '0.75rem', textAlign: 'center' }}>
          Arrastra los partidos para cambiar su horario.
        </p>
      )}

      {/* Modal de conflicto */}
      {confirmarConflicto && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.75rem', maxWidth: 420, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: '0.5rem' }}>⚠️</div>
            <h3 style={{ textAlign: 'center', margin: '0 0 0.75rem', fontSize: 18 }}>Conflicto detectado</h3>
            <ul style={{ margin: '0 0 1.25rem', paddingLeft: '1.25rem', color: '#374151', fontSize: 14, lineHeight: 1.7 }}>
              {confirmarConflicto.conflictos.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: '1.5rem', textAlign: 'center' }}>
              ¿Deseas mover el partido de todas formas?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={handleCancelarConflicto} style={{
                flex: 1, padding: '0.65rem', borderRadius: 8, border: '1px solid #d1d5db',
                background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>
                Cancelar
              </button>
              <button onClick={handleForzarMovimiento} style={{
                flex: 1, padding: '0.65rem', borderRadius: 8, border: 'none',
                background: '#f59e0b', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}>
                Mover de todas formas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
