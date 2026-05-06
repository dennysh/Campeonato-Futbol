import { useEffect } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import type { ConfigCanchaItem } from '../../store/wizardStore';

interface Props { onSiguiente: () => void; onAtras: () => void; }

function buildCatId(sub: number, genero: string) {
  return `sub${sub}_${genero}`;
}

function distribuirCategorias(numCanchas: number, catIds: string[]): ConfigCanchaItem[] {
  return Array.from({ length: numCanchas }, (_, i) => {
    const asignadas = catIds.filter((_, ci) => ci % numCanchas === i);
    return { id: i + 1, nombre: `Cancha ${i + 1}`, categorias_ids: asignadas };
  });
}

export default function PasoCanchas({ onSiguiente, onAtras }: Props) {
  const { config_canchas, setConfigCanchas, categorias, config_horario } = useWizardStore();
  const { num_canchas, canchas } = config_canchas;

  const todasCatIds = categorias.map((c) => buildCatId(c.sub, c.genero));
  const catLabels: Record<string, string> = {};
  categorias.forEach((c) => {
    catLabels[buildCatId(c.sub, c.genero)] =
      `Sub-${c.sub} ${c.genero === 'masculino' ? 'Masculino' : 'Femenino'}`;
  });

  useEffect(() => {
    if (canchas.length !== num_canchas || canchas.every((c) => c.categorias_ids.length === 0)) {
      setConfigCanchas({
        num_canchas,
        canchas: distribuirCategorias(num_canchas, todasCatIds),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarNumCanchas(delta: number) {
    const nuevo = Math.max(1, Math.min(10, num_canchas + delta));
    if (nuevo === num_canchas) return;
    setConfigCanchas({
      num_canchas: nuevo,
      canchas: distribuirCategorias(nuevo, todasCatIds),
    });
  }

  function toggleCategoria(canchaId: number, cid: string) {
    setConfigCanchas({
      ...config_canchas,
      canchas: canchas.map((c) =>
        c.id !== canchaId ? c : {
          ...c,
          categorias_ids: c.categorias_ids.includes(cid)
            ? c.categorias_ids.filter((x) => x !== cid)
            : [...c.categorias_ids, cid],
        }
      ),
    });
  }

  const catsSinCancha = todasCatIds.filter(
    (cid) => !canchas.some((c) => c.categorias_ids.includes(cid))
  );

  const [hI, mI] = config_horario.hora_inicio.split(':').map(Number);
  const [hF, mF] = config_horario.hora_fin.split(':').map(Number);
  const slots = Math.max(0, Math.floor(((hF * 60 + mF) - (hI * 60 + mI)) / 60));
  const partidosPorDia = num_canchas * slots;

  const puedeAvanzar = catsSinCancha.length === 0 && todasCatIds.length > 0;

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Canchas</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.5rem' }}>
        Define cuántas canchas hay y qué categorías juegan en cada una.
      </p>

      {/* Stepper */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Número de canchas</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => cambiarNumCanchas(-1)} disabled={num_canchas <= 1} style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid #d1d5db',
            background: '#fff', fontSize: 20, cursor: num_canchas <= 1 ? 'not-allowed' : 'pointer',
            color: num_canchas <= 1 ? '#d1d5db' : '#374151',
          }}>−</button>
          <span style={{ fontSize: 28, fontWeight: 800, minWidth: 32, textAlign: 'center' }}>{num_canchas}</span>
          <button onClick={() => cambiarNumCanchas(1)} disabled={num_canchas >= 10} style={{
            width: 36, height: 36, borderRadius: 8, border: '2px solid #2563eb',
            background: '#fff', fontSize: 20, cursor: num_canchas >= 10 ? 'not-allowed' : 'pointer',
            color: '#2563eb',
          }}>+</button>
          <span style={{ color: '#6b7280', fontSize: 14 }}>canchas</span>
        </div>
      </div>

      {/* Resumen */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
        padding: '0.6rem 1rem', marginBottom: '1.5rem', fontSize: 13, color: '#1d4ed8',
      }}>
        {num_canchas} {num_canchas === 1 ? 'cancha' : 'canchas'} · {config_horario.hora_inicio} a {config_horario.hora_fin} · <strong>{partidosPorDia} partidos</strong> posibles por día
        <span style={{ color: '#9ca3af', marginLeft: 6 }}>(horario se ajusta en el paso Días)</span>
      </div>

      {/* Advertencia */}
      {catsSinCancha.length > 0 && (
        <div style={{
          background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8,
          padding: '0.6rem 1rem', marginBottom: '1.25rem', fontSize: 13, color: '#92400e',
        }}>
          ⚠ Sin cancha asignada: <strong>{catsSinCancha.map((id) => catLabels[id]).join(', ')}</strong>
        </div>
      )}

      {/* Lista de canchas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
        {canchas.map((cancha) => (
          <div key={cancha.id} style={{
            border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', background: '#fff',
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: '0.75rem', color: '#111827' }}>
              {cancha.nombre}
            </div>

            {todasCatIds.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Vuelve al paso Categorías.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {todasCatIds.map((cid) => {
                  const activa = cancha.categorias_ids.includes(cid);
                  return (
                    <button
                      key={cid}
                      onClick={() => toggleCategoria(cancha.id, cid)}
                      style={{
                        padding: '0.35rem 0.85rem', borderRadius: 20, fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                        background: activa ? '#2563eb' : '#f3f4f6',
                        color: activa ? '#fff' : '#6b7280',
                        border: activa ? '2px solid #2563eb' : '2px solid transparent',
                      }}
                    >
                      {catLabels[cid]}
                    </button>
                  );
                })}
              </div>
            )}

            {cancha.categorias_ids.length === 0 && todasCatIds.length > 0 && (
              <p style={{ fontSize: 12, color: '#f59e0b', marginTop: '0.5rem', fontWeight: 500 }}>
                Sin categorías — esta cancha no se usará
              </p>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onAtras} style={{
          background: '#fff', color: '#374151', padding: '0.6rem 2rem',
          border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 15,
        }}>Atras</button>
        <button onClick={puedeAvanzar ? onSiguiente : undefined} disabled={!puedeAvanzar} style={{
          background: puedeAvanzar ? '#2563eb' : '#9ca3af',
          color: '#fff', padding: '0.6rem 2rem', border: 'none', borderRadius: 8,
          cursor: puedeAvanzar ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 15,
        }}>Siguiente</button>
      </div>
    </div>
  );
}
