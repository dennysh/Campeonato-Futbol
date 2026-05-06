import { useWizardStore } from '../store/wizardStore';
import PasoDatosBasicos from '../components/wizard/PasoDatosBasicos';
import PasoCategorias from '../components/wizard/PasoCategorias';
import PasoCanchas from '../components/wizard/PasoCanchas';
import PasoEquipos from '../components/wizard/PasoEquipos';
import PasoDias from '../components/wizard/PasoDias';
import PasoPreview from '../components/wizard/PasoPreview';

const PASOS = ['Torneo', 'Categorias', 'Canchas', 'Equipos', 'Dias', 'Preview'];

export default function NuevoTorneo() {
  const { paso, setPaso } = useWizardStore();

  const avanzar = () => { if (paso < PASOS.length) setPaso(paso + 1); };
  const retroceder = () => { if (paso > 1) setPaso(paso - 1); };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1rem' }}>

      {/* Barra de progreso */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '2rem' }}>
        {PASOS.map((nombre, i) => {
          const num = i + 1;
          const completado = paso > num;
          const activo = paso === num;
          return (
            <div key={i} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 4, borderRadius: 2, marginBottom: 4,
                background: completado ? '#16a34a' : activo ? '#2563eb' : '#e5e7eb',
              }} />
              <span style={{
                fontSize: 11, fontWeight: activo ? 700 : 400,
                color: completado ? '#16a34a' : activo ? '#2563eb' : '#9ca3af',
              }}>
                {nombre}
              </span>
            </div>
          );
        })}
      </div>

      {paso === 1 && <PasoDatosBasicos onSiguiente={avanzar} />}
      {paso === 2 && <PasoCategorias onSiguiente={avanzar} onAtras={retroceder} />}
      {paso === 3 && <PasoCanchas onSiguiente={avanzar} onAtras={retroceder} />}
      {paso === 4 && <PasoEquipos onSiguiente={avanzar} onAtras={retroceder} />}
      {paso === 5 && <PasoDias onSiguiente={avanzar} onAtras={retroceder} />}
      {paso === 6 && <PasoPreview onAtras={retroceder} />}
    </div>
  );
}
