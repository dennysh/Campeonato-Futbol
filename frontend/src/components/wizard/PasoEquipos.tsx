import { useWizardStore } from '../../store/wizardStore';
import type { CategoriaSeleccionada } from '../../store/wizardStore';

interface Props { onSiguiente: () => void; onAtras: () => void; }

const btnPrimario: React.CSSProperties = {
  background: '#2563eb', color: '#fff', padding: '0.6rem 2rem',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15,
};
const btnSecundario: React.CSSProperties = {
  background: '#fff', color: '#374151', padding: '0.6rem 2rem',
  border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 15,
};

export default function PasoEquipos({ onSiguiente, onAtras }: Props) {
  const { categorias, setCategorias } = useWizardStore();

  function setNumEquipos(cat: CategoriaSeleccionada, delta: number) {
    const nuevo = Math.max(2, Math.min(16, cat.num_equipos + delta));
    setCategorias(categorias.map((c) =>
      c.sub === cat.sub && c.genero === cat.genero ? { ...c, num_equipos: nuevo } : c
    ));
  }

  const totalEquipos = categorias.reduce((sum, c) => sum + c.num_equipos, 0);
  const totalPartidos = categorias.reduce((sum, c) => {
    const n = c.num_equipos;
    return sum + (n * (n - 1)) / 2;
  }, 0);

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Equipos por categoria</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.5rem' }}>
        Los nombres se asignan automatico (Equipo 1, 2, 3...) y se editan despues. Minimo 2 por categoria.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {categorias.sort((a, b) => a.sub - b.sub || a.genero.localeCompare(b.genero)).map((cat) => {
          const partidos = (cat.num_equipos * (cat.num_equipos - 1)) / 2;
          return (
            <div key={`${cat.sub}-${cat.genero}`} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexWrap: 'wrap', gap: '0.75rem',
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '0.75rem 1rem',
            }}>
              <div>
                <span style={{ fontWeight: 700, color: '#1d4ed8', marginRight: 8 }}>Sub-{cat.sub}</span>
                <span style={{
                  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: cat.genero === 'masculino' ? '#dbeafe' : '#fce7f3',
                  color: cat.genero === 'masculino' ? '#1d4ed8' : '#9d174d',
                }}>
                  {cat.genero === 'masculino' ? 'Masculino' : 'Femenino'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => setNumEquipos(cat, -1)} style={{
                  width: 36, height: 36, borderRadius: 6, border: '2px solid #d1d5db',
                  background: '#fff', fontSize: 20, cursor: 'pointer', fontWeight: 700,
                  color: cat.num_equipos <= 2 ? '#d1d5db' : '#374151',
                }}>−</button>
                <span style={{ fontSize: 24, fontWeight: 700, minWidth: 32, textAlign: 'center', color: '#111' }}>
                  {cat.num_equipos}
                </span>
                <button onClick={() => setNumEquipos(cat, 1)} style={{
                  width: 36, height: 36, borderRadius: 6, border: '2px solid #d1d5db',
                  background: '#fff', fontSize: 20, cursor: 'pointer', fontWeight: 700,
                  color: cat.num_equipos >= 16 ? '#d1d5db' : '#374151',
                }}>+</button>
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  equipos · <strong>{partidos}</strong> partidos
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Totales */}
      <div style={{
        background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8,
        padding: '0.75rem 1rem', marginBottom: '1.5rem',
        display: 'flex', gap: '2rem', flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{totalEquipos}</div>
          <div style={{ fontSize: 13, color: '#166534' }}>equipos en total</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{totalPartidos}</div>
          <div style={{ fontSize: 13, color: '#166534' }}>partidos a generar</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onAtras} style={btnSecundario}>Atras</button>
        <button onClick={onSiguiente} style={btnPrimario}>Siguiente</button>
      </div>
    </div>
  );
}
