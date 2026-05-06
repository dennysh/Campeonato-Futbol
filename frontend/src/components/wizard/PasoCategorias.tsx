import { useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import type { CategoriaSeleccionada, Genero } from '../../store/wizardStore';

interface Props { onSiguiente: () => void; onAtras: () => void; }

const SUBS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const btnPrimario: React.CSSProperties = {
  background: '#2563eb', color: '#fff', padding: '0.6rem 2rem',
  border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15,
};
const btnSecundario: React.CSSProperties = {
  background: '#fff', color: '#374151', padding: '0.6rem 2rem',
  border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 15,
};

export default function PasoCategorias({ onSiguiente, onAtras }: Props) {
  const { categorias, setCategorias } = useWizardStore();
  const [error, setError] = useState('');

  const subSeleccionados = [...new Set(categorias.map((c) => c.sub))];

  function toggleSub(sub: number) {
    const yaExiste = categorias.some((c) => c.sub === sub);
    if (yaExiste) {
      setCategorias(categorias.filter((c) => c.sub !== sub));
    } else {
      setCategorias([...categorias, { sub, genero: 'masculino', num_equipos: 4 }]);
    }
  }

  function toggleGenero(sub: number, genero: Genero) {
    const existe = categorias.some((c) => c.sub === sub && c.genero === genero);
    if (existe) {
      const restantes = categorias.filter((c) => !(c.sub === sub && c.genero === genero));
      if (restantes.filter((c) => c.sub === sub).length === 0) return;
      setCategorias(restantes);
    } else {
      setCategorias([...categorias, { sub, genero, num_equipos: 4 }]);
    }
  }

  function isGeneroActivo(sub: number, genero: Genero) {
    return categorias.some((c) => c.sub === sub && c.genero === genero);
  }

  function handleSiguiente() {
    if (categorias.length === 0) { setError('Selecciona al menos una categoria'); return; }
    setError('');
    onSiguiente();
  }

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Categorias</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.25rem' }}>
        Toca una categoria para activarla, luego elige el genero.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SUBS.map((sub) => {
          const activo = subSeleccionados.includes(sub);
          return (
            <button key={sub} onClick={() => toggleSub(sub)} style={{
              padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
              fontSize: 15, border: activo ? '2px solid #2563eb' : '2px solid #d1d5db',
              background: activo ? '#2563eb' : '#fff', color: activo ? '#fff' : '#374151',
              minWidth: 72,
            }}>
              Sub-{sub}
            </button>
          );
        })}
      </div>

      {subSeleccionados.sort((a, b) => a - b).map((sub) => (
        <div key={sub} style={{
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
          background: '#f9fafb', borderRadius: 8, padding: '0.75rem 1rem',
          marginBottom: '0.5rem', border: '1px solid #e5e7eb',
        }}>
          <span style={{ fontWeight: 700, minWidth: 60, color: '#1d4ed8' }}>Sub-{sub}</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['masculino', 'femenino'] as Genero[]).map((g) => {
              const activo = isGeneroActivo(sub, g);
              return (
                <button key={g} onClick={() => toggleGenero(sub, g)} style={{
                  padding: '0.4rem 1rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: 13, fontWeight: activo ? 600 : 400,
                  border: activo ? '2px solid #16a34a' : '2px solid #d1d5db',
                  background: activo ? '#16a34a' : '#fff', color: activo ? '#fff' : '#374151',
                }}>
                  {g === 'masculino' ? 'Masculino' : 'Femenino'}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: '0.5rem' }}>{error}</p>}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <button onClick={onAtras} style={btnSecundario}>Atras</button>
        <button onClick={handleSiguiente} style={btnPrimario}>Siguiente</button>
      </div>
    </div>
  );
}
