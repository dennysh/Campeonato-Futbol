import { useWizardStore } from '../../store/wizardStore';

interface Props {
  onSiguiente: () => void;
  onAtras: () => void;
}

export default function PasoReglas({ onSiguiente, onAtras }: Props) {
  const { reglas, setReglas } = useWizardStore();

  function update(campo: keyof typeof reglas, valor: number) {
    setReglas({ ...reglas, [campo]: valor });
  }

  return (
    <div>
      <h2>Reglas del cronograma</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400, marginBottom: '2rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Duracion de cada partido (minutos)
          </label>
          <input
            type="number"
            min={30}
            max={120}
            value={reglas.duracion_partido_minutos}
            onChange={(e) => update('duracion_partido_minutos', Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Descanso minimo entre partidos (minutos)
          </label>
          <input
            type="number"
            min={60}
            max={480}
            value={reglas.descanso_minimo_minutos}
            onChange={(e) => update('descanso_minimo_minutos', Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
            Maximo de partidos por equipo por dia
          </label>
          <input
            type="number"
            min={1}
            max={5}
            value={reglas.max_partidos_por_dia}
            onChange={(e) => update('max_partidos_por_dia', Number(e.target.value))}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
      </div>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '1rem', marginBottom: '1.5rem' }}>
        <p style={{ margin: 0, fontSize: 14, color: '#166534' }}>
          Resumen: partidos de <strong>{reglas.duracion_partido_minutos} min</strong>, con <strong>{reglas.descanso_minimo_minutos} min</strong> de descanso minimo, maxima <strong>{reglas.max_partidos_por_dia} partido(s)</strong> por equipo por dia.
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onAtras} style={{ padding: '0.5rem 1.5rem', border: '1px solid #d1d5db', borderRadius: 4, cursor: 'pointer' }}>Atras</button>
        <button onClick={onSiguiente} style={{ background: '#2563eb', color: '#fff', padding: '0.5rem 1.5rem', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}>
          Ver vista previa
        </button>
      </div>
    </div>
  );
}
