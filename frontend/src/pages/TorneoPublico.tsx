import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { EventContentArg } from '@fullcalendar/core';
import axios from 'axios';

interface Match {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  home_team: { id: string; nombre: string; category: { nombre: string } };
  away_team: { id: string; nombre: string; category: { nombre: string } };
  field: { id: string; nombre: string };
}

interface Torneo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  status: string;
  schedule_versions: { matches: Match[] }[];
}

const COLORES = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function colorPorCategoria(cat: string, cats: string[]) {
  return COLORES[cats.indexOf(cat) % COLORES.length];
}

function EventoContenido({ arg, cats }: { arg: EventContentArg; cats: string[] }) {
  const m: Match = arg.event.extendedProps.match;
  const color = colorPorCategoria(m.home_team.category.nombre, cats);
  return (
    <div style={{
      padding: '3px 5px', height: '100%', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', gap: 1, background: color, borderRadius: 3,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {m.hora_inicio} — {m.field.nombre}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {m.home_team.nombre} vs {m.away_team.nombre}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {m.home_team.category.nombre}
      </div>
    </div>
  );
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001' });

export default function TorneoPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [matchDetalle, setMatchDetalle] = useState<Match | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/api/public/torneos/${slug}`)
      .then((r) => setTorneo(r.data))
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, [slug]);

  if (cargando) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#6b7280' }}>
      Cargando calendario...
    </div>
  );

  if (error || !torneo) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ color: '#6b7280', fontSize: 16 }}>Torneo no encontrado</p>
    </div>
  );

  const matches = torneo.schedule_versions[0]?.matches ?? [];
  const cats = [...new Set(matches.map((m) => m.home_team.category.nombre))];

  const events = matches.map((m) => ({
    id: m.id,
    title: `${m.home_team.nombre} vs ${m.away_team.nombre}`,
    start: `${m.fecha}T${m.hora_inicio}`,
    end: `${m.fecha}T${m.hora_fin}`,
    backgroundColor: colorPorCategoria(m.home_team.category.nombre, cats),
    borderColor: colorPorCategoria(m.home_team.category.nombre, cats),
    extendedProps: { match: m },
  }));

  const fechaInicial = matches[0]?.fecha ?? torneo.fecha_inicio;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Cabecera */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>{torneo.nombre}</h1>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase',
            background: torneo.status === 'publicado' ? '#dcfce7' : '#fef9c3',
            color: torneo.status === 'publicado' ? '#16a34a' : '#854d0e',
          }}>
            {torneo.status}
          </span>
        </div>
        <p style={{ color: '#6b7280', fontSize: 13, margin: '0.25rem 0 0' }}>
          {matches.length} partidos · {cats.length} categorias · Inicio: {torneo.fecha_inicio}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        {/* Calendario */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          {/* Leyenda */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.75rem 1rem', borderBottom: '1px solid #f3f4f6' }}>
            {cats.map((cat) => (
              <span key={cat} style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                background: colorPorCategoria(cat, cats), color: '#fff',
              }}>
                {cat}
              </span>
            ))}
          </div>

          <FullCalendar
            plugins={[timeGridPlugin, dayGridPlugin]}
            initialView="timeGridDay"
            initialDate={fechaInicial}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridDay,timeGridWeek,dayGridMonth',
            }}
            locale="es"
            firstDay={0}
            slotMinTime="06:00:00"
            slotMaxTime="21:00:00"
            slotDuration="01:00:00"
            slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            allDaySlot={false}
            events={events}
            editable={false}
            droppable={false}
            height="auto"
            eventContent={(arg) => <EventoContenido arg={arg} cats={cats} />}
            eventClick={(arg) => setMatchDetalle(arg.event.extendedProps.match)}
            buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Dia' }}
          />
        </div>

        {/* Panel de detalle */}
        {matchDetalle && (
          <div style={{
            width: 260, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '1.25rem', flexShrink: 0, position: 'sticky', top: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Detalle del partido</span>
              <button onClick={() => setMatchDetalle(null)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1,
              }}>×</button>
            </div>

            <div style={{
              background: colorPorCategoria(matchDetalle.home_team.category.nombre, cats) + '15',
              border: `1px solid ${colorPorCategoria(matchDetalle.home_team.category.nombre, cats)}44`,
              borderRadius: 7, padding: '0.6rem 0.75rem', marginBottom: '1rem',
            }}>
              <div style={{ fontSize: 11, color: colorPorCategoria(matchDetalle.home_team.category.nombre, cats), fontWeight: 600, marginBottom: 4 }}>
                {matchDetalle.home_team.category.nombre}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{matchDetalle.home_team.nombre}</div>
              <div style={{ color: '#6b7280', fontSize: 13, margin: '4px 0', fontWeight: 500 }}>vs</div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{matchDetalle.away_team.nombre}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Fecha', value: matchDetalle.fecha },
                { label: 'Hora', value: `${matchDetalle.hora_inicio} — ${matchDetalle.hora_fin}` },
                { label: 'Cancha', value: matchDetalle.field.nombre },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: '#6b7280' }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <p style={{ fontSize: 12, color: '#9ca3af', marginTop: '0.75rem', textAlign: 'center' }}>
        Futbol Formativo Ecuador
      </p>
    </div>
  );
}
