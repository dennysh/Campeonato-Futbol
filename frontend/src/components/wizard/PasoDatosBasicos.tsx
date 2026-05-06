import { useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';

interface Props { onSiguiente: () => void; }

export default function PasoDatosBasicos({ onSiguiente }: Props) {
  const { nombre_torneo, setNombreTorneo, fecha_inicio, setFechaInicio } = useWizardStore();
  const [error, setError] = useState('');

  function handleSiguiente() {
    if (!nombre_torneo.trim()) { setError('Escribe el nombre del torneo'); return; }
    if (!fecha_inicio) { setError('Selecciona la fecha de inicio'); return; }
    setError('');
    onSiguiente();
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Datos del torneo</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.5rem' }}>
        Solo dos campos — todo lo demas es por botones.
      </p>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: 15 }}>
          Nombre del torneo
        </label>
        <input
          type="text"
          value={nombre_torneo}
          onChange={(e) => setNombreTorneo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSiguiente()}
          placeholder="Ej: Copa Formativa 2026"
          autoFocus
          style={{
            width: '100%', padding: '0.75rem 1rem', fontSize: 16,
            border: '2px solid #d1d5db', borderRadius: 8, outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: 15 }}>
          Fecha de inicio
        </label>
        <input
          type="date"
          value={fecha_inicio}
          onChange={(e) => setFechaInicio(e.target.value)}
          style={{
            padding: '0.65rem 1rem', fontSize: 16,
            border: '2px solid #d1d5db', borderRadius: 8, outline: 'none', cursor: 'pointer',
          }}
        />
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button onClick={handleSiguiente} style={btnPrimario}>Siguiente</button>
      </div>
    </div>
  );
}

const btnPrimario: React.CSSProperties = {
  background: '#2563eb', color: '#fff', padding: '0.6rem 2rem',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15,
};
