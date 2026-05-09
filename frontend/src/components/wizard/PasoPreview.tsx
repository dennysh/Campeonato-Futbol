import { useEffect, useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { generarPreview, confirmarTorneo } from '../../api/cronograma';
import { wizardToScheduleInput } from '../../utils/wizardToScheduleInput';

interface Props { onAtras: () => void; }

const btnPrimario: React.CSSProperties = {
  background: '#16a34a', color: '#fff', padding: '0.6rem 2rem',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15,
};
const btnSecundario: React.CSSProperties = {
  background: '#fff', color: '#374151', padding: '0.6rem 2rem',
  border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 15,
};

export default function PasoPreview({ onAtras }: Props) {
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState<{ tournament_id: string; total_partidos: number } | null>(null);
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);

  const {
    nombre_torneo, fecha_inicio,
    categorias, config_canchas, config_horario, dias_habilitados,
    preview, cargando_preview, error_preview,
    setPreview, setCargandoPreview, setErrorPreview,
    resetWizard,
  } = useWizardStore();

  async function handleConfirmar() {
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const result = await confirmarTorneo({
        nombre: nombre_torneo,
        fecha_inicio,
        categorias,
        config_canchas,
        config_horario,
        dias_habilitados,
      });
      setGuardado(result);
      resetWizard();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string }; status?: number } })?.response?.data?.error
        ?? (err as { response?: { status?: number } })?.response?.status?.toString()
        ?? (err as Error)?.message
        ?? 'Error desconocido';
      setErrorGuardar(`Error al guardar: ${msg}`);
    } finally {
      setGuardando(false);
    }
  }

  useEffect(() => {
    async function cargar() {
      setCargandoPreview(true);
      setErrorPreview(null);
      try {
        const input = wizardToScheduleInput(categorias, config_canchas, config_horario, dias_habilitados);
        const resultado = await generarPreview(input);
        setPreview(resultado);
      } catch {
        setErrorPreview('No se pudo conectar con el servidor. Verifica que el backend este corriendo en el puerto 3001.');
      } finally {
        setCargandoPreview(false);
      }
    }
    cargar();
  }, []);

  if (guardado) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ fontSize: 56, marginBottom: '1rem' }}>✅</div>
        <h2 style={{ color: '#16a34a' }}>Torneo guardado</h2>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Se guardaron <strong>{guardado.total_partidos}</strong> partidos en la base de datos.
        </p>
        <a href="/" style={{
          display: 'inline-block', background: '#2563eb', color: '#fff',
          padding: '0.6rem 2rem', borderRadius: 8, textDecoration: 'none', fontWeight: 600,
        }}>
          Volver al inicio
        </a>
      </div>
    );
  }

  if (cargando_preview) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div style={{ fontSize: 40, marginBottom: '1rem' }}>⏳</div>
        <p style={{ fontSize: 18, color: '#6b7280' }}>Generando cronograma...</p>
      </div>
    );
  }

  if (error_preview) {
    return (
      <div>
        <h2>Vista previa</h2>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ color: '#dc2626', margin: 0 }}>{error_preview}</p>
        </div>
        <button onClick={onAtras} style={btnSecundario}>Atras</button>
      </div>
    );
  }

  if (!preview) return null;

  const { resumen, conflictos, partidos_asignados, partidos_pendientes } = preview;
  const input = wizardToScheduleInput(categorias, config_canchas, config_horario, dias_habilitados);

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Vista previa del cronograma</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.5rem' }}>
        Los datos no se guardan hasta que confirmes.
      </p>

      {/* Tarjetas resumen */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { label: 'Partidos totales', value: resumen.total_partidos, color: '#1d4ed8', bg: '#eff6ff' },
          { label: 'Asignados', value: resumen.total_asignados, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Sin asignar', value: resumen.total_pendientes, color: resumen.total_pendientes > 0 ? '#dc2626' : '#16a34a', bg: resumen.total_pendientes > 0 ? '#fef2f2' : '#f0fdf4' },
          { label: 'Dias usados', value: resumen.dias_utilizados, color: '#6b7280', bg: '#f9fafb' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}40`, borderRadius: 10, padding: '0.75rem 1.25rem', minWidth: 110, textAlign: 'center' }}>
            <div style={{ fontSize: 30, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {resumen.fecha_fin_calculada && (
        <p style={{ fontSize: 14, color: '#374151', marginBottom: '1rem' }}>
          Periodo: <strong>{resumen.fecha_inicio}</strong> — <strong>{resumen.fecha_fin_calculada}</strong>
        </p>
      )}

      {/* Alertas */}
      {conflictos.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <strong style={{ color: '#c2410c' }}>Advertencias:</strong>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem', color: '#9a3412', fontSize: 14 }}>
            {conflictos.map((c, i) => <li key={i}>{c.descripcion}</li>)}
          </ul>
        </div>
      )}

      {/* Tabla partidos */}
      <h3 style={{ fontSize: 15, marginBottom: '0.5rem' }}>Partidos asignados ({partidos_asignados.length})</h3>
      <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: '1.25rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f3f4f6' }}>
            <tr>
              {['Fecha', 'Hora', 'Cancha', 'Categoria', 'Partido'].map((h) => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partidos_asignados.map((p) => {
              const local = input.equipos.find((e) => e.id === p.equipo_local_id);
              const visitante = input.equipos.find((e) => e.id === p.equipo_visitante_id);
              const cancha = input.canchas.find((c) => c.id === p.cancha_id);
              const cat = input.categorias.find((c) => c.id === p.categoria_id);
              return (
                <tr key={p.id_temp} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.4rem 0.75rem' }}>{p.fecha}</td>
                  <td style={{ padding: '0.4rem 0.75rem', whiteSpace: 'nowrap' }}>{p.hora_inicio}</td>
                  <td style={{ padding: '0.4rem 0.75rem' }}>{cancha?.nombre}</td>
                  <td style={{ padding: '0.4rem 0.75rem', fontSize: 12, color: '#6b7280' }}>{cat?.nombre}</td>
                  <td style={{ padding: '0.4rem 0.75rem', fontWeight: 500 }}>
                    {local?.nombre} <span style={{ color: '#9ca3af' }}>vs</span> {visitante?.nombre}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {partidos_pendientes.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: 13, color: '#9a3412' }}>
          <strong>{partidos_pendientes.length} partidos no se pudieron asignar.</strong> Agrega mas dias o canchas y regenera la vista previa.
        </div>
      )}

      {errorGuardar && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#dc2626', fontSize: 14 }}>
          {errorGuardar}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <button onClick={onAtras} disabled={guardando} style={btnSecundario}>Atras</button>
        <button
          onClick={handleConfirmar}
          disabled={resumen.total_asignados === 0 || guardando}
          style={{
            ...btnPrimario,
            background: resumen.total_asignados > 0 && !guardando ? '#16a34a' : '#9ca3af',
            cursor: resumen.total_asignados > 0 && !guardando ? 'pointer' : 'not-allowed',
          }}
        >
          {guardando ? 'Guardando...' : 'Confirmar y guardar torneo'}
        </button>
      </div>
    </div>
  );
}
