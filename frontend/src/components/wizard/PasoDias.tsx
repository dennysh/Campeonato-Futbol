import { useEffect, useMemo, useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import type { DiaHabilitado, CanchaConfigDia } from '../../store/wizardStore';

interface Props { onSiguiente: () => void; onAtras: () => void; }

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const HORAS_INICIO = ['06:00', '07:00', '08:00', '09:00', '10:00'];
const HORAS_FIN    = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function esFds(fecha: string) {
  const d = new Date(fecha + 'T12:00:00').getDay();
  return d === 0 || d === 6;
}

function generarDias(inicio: string, cantidad: number): string[] {
  const dias: string[] = [];
  const base = new Date(inicio + 'T12:00:00');
  for (let i = 0; i < cantidad; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dias.push(d.toISOString().split('T')[0]);
  }
  return dias;
}

function slotsEntre(horaI: string, horaF: string) {
  const [hI, mI] = horaI.split(':').map(Number);
  const [hF, mF] = horaF.split(':').map(Number);
  return Math.max(0, Math.floor(((hF * 60 + mF) - (hI * 60 + mI)) / 60));
}

function calcularDiasNecesarios(
  categorias: { num_equipos: number }[],
  numCanchas: number,
  horaI: string,
  horaF: string
): number {
  const total = categorias.reduce((s, c) => s + (c.num_equipos * (c.num_equipos - 1)) / 2, 0);
  const porDia = numCanchas * Math.max(slotsEntre(horaI, horaF), 1);
  // +25% buffer para que el engine tenga holgura frente a restricciones de descanso/max_por_dia
  return Math.ceil((total * 1.25) / porDia);
}

function tieneCusto(dia: DiaHabilitado) {
  return dia.canchas_config !== undefined && dia.canchas_config.length > 0;
}

export default function PasoDias({ onSiguiente, onAtras }: Props) {
  const {
    dias_habilitados, setDiasHabilitados,
    fecha_inicio, categorias,
    config_canchas, config_horario, setConfigHorario,
  } = useWizardStore();

  const [diaEditando, setDiaEditando] = useState<string | null>(null);

  const dias_base = useMemo(
    () => (fecha_inicio ? generarDias(fecha_inicio, 180) : []),
    [fecha_inicio]
  );

  const dias_necesarios = useMemo(
    () => calcularDiasNecesarios(categorias, config_canchas.num_canchas, config_horario.hora_inicio, config_horario.hora_fin),
    [categorias, config_canchas.num_canchas, config_horario]
  );

  const totalPartidos = useMemo(
    () => categorias.reduce((s, c) => s + (c.num_equipos * (c.num_equipos - 1)) / 2, 0),
    [categorias]
  );

  // Capacity of a day accounting for per-cancha overrides
  function capacidadDia(dia: DiaHabilitado): number {
    return config_canchas.canchas
      .filter((c) => c.categorias_ids.length > 0)
      .reduce((s, cancha) => {
        const cfg = dia.canchas_config?.find((c) => c.cancha_id === cancha.id);
        if (cfg && !cfg.activa) return s;
        return s + slotsEntre(
          cfg?.hora_inicio ?? config_horario.hora_inicio,
          cfg?.hora_fin    ?? config_horario.hora_fin,
        );
      }, 0);
  }

  const capacidadActualTotal = useMemo(
    () => dias_habilitados.reduce((s, d) => s + capacidadDia(d), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dias_habilitados, config_canchas, config_horario]
  );

  // After changing per-day hours, append more S/D days until capacity covers all matches
  // Uses 1.25× buffer so the engine has slack to resolve scheduling constraints
  function completarDiasHastaCapacidad(dias: DiaHabilitado[]): DiaHabilitado[] {
    if (totalPartidos === 0) return dias;
    const target = Math.ceil(totalPartidos * 1.25);
    const result = [...dias];
    const fechasUsadas = new Set(result.map((d) => d.fecha));
    const cap = () => result.reduce((s, d) => s + capacidadDia(d), 0);
    for (const f of dias_base) {
      if (cap() >= target) break;
      if (esFds(f) && !fechasUsadas.has(f)) {
        result.push({ fecha: f });
        fechasUsadas.add(f);
        result.sort((a, b) => a.fecha.localeCompare(b.fecha));
      }
    }
    return result;
  }

  // ── Sincronizar S/D al mínimo necesario cada vez que cambia dias_necesarios ──
  useEffect(() => {
    if (!fecha_inicio || dias_necesarios === 0 || dias_base.length === 0) return;
    const fds = dias_base.filter(esFds);
    const extras = dias_habilitados.filter((d) => !esFds(d.fecha));
    const nuevosSD = fds.slice(0, dias_necesarios).map((f) => {
      const existing = dias_habilitados.find((d) => d.fecha === f);
      return existing ?? { fecha: f };
    });
    setDiasHabilitados(
      [...nuevosSD, ...extras].sort((a, b) => a.fecha.localeCompare(b.fecha))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha_inicio, dias_base, dias_necesarios]);

  const fechasSeleccionadas = new Set(dias_habilitados.map((d) => d.fecha));

  const semanas = useMemo(() => {
    if (dias_base.length === 0) return [];
    const result: string[][] = [];
    const offset = new Date(dias_base[0] + 'T12:00:00').getDay();
    let sem: string[] = Array(offset).fill('');
    for (const f of dias_base) {
      sem.push(f);
      if (sem.length === 7) { result.push(sem); sem = []; }
    }
    if (sem.length > 0) result.push(sem);
    return result;
  }, [dias_base]);

  function toggleDia(fecha: string) {
    if (fechasSeleccionadas.has(fecha)) {
      const nuevos = dias_habilitados.filter((d) => d.fecha !== fecha);
      if (esFds(fecha)) {
        const ultimoFds = nuevos.filter((d) => esFds(d.fecha)).map((d) => d.fecha).sort().at(-1) ?? fecha;
        const siguiente = dias_base.find((f) => f > ultimoFds && esFds(f) && !fechasSeleccionadas.has(f));
        if (siguiente) {
          setDiasHabilitados([...nuevos, { fecha: siguiente }].sort((a, b) => a.fecha.localeCompare(b.fecha)));
          return;
        }
      }
      setDiasHabilitados(nuevos);
      if (diaEditando === fecha) setDiaEditando(null);
    } else {
      const nuevos = [...dias_habilitados, { fecha }].sort((a, b) => a.fecha.localeCompare(b.fecha));
      setDiasHabilitados(nuevos);
    }
  }

  function getCanchaConfig(dia: DiaHabilitado, canchaId: number): CanchaConfigDia {
    return dia.canchas_config?.find((c) => c.cancha_id === canchaId)
      ?? { cancha_id: canchaId, activa: true };
  }

  function actualizarCanchaEnDia(fecha: string, canchaId: number, cambios: Partial<CanchaConfigDia>) {
    const newDias = dias_habilitados.map((d) => {
      if (d.fecha !== fecha) return d;
      const prevConfig = getCanchaConfig(d, canchaId);
      const nueva: CanchaConfigDia = { ...prevConfig, ...cambios };
      const otrasConfigs = (d.canchas_config ?? []).filter((c) => c.cancha_id !== canchaId);
      const esDefault = nueva.activa && nueva.hora_inicio === undefined && nueva.hora_fin === undefined;
      const nuevasConfigs = esDefault ? otrasConfigs : [...otrasConfigs, nueva];
      return { ...d, canchas_config: nuevasConfigs.length > 0 ? nuevasConfigs : undefined };
    });
    setDiasHabilitados(completarDiasHastaCapacidad(newDias));
  }

  function resetearDia(fecha: string) {
    setDiasHabilitados(dias_habilitados.map((d) =>
      d.fecha !== fecha ? d : { fecha }
    ));
  }

  function resetearFds() {
    const fds = dias_base.filter(esFds);
    const extras = dias_habilitados.filter((d) => !esFds(d.fecha));
    setDiasHabilitados([
      ...fds.slice(0, dias_necesarios).map((f) => ({ fecha: f })),
      ...extras,
    ].sort((a, b) => a.fecha.localeCompare(b.fecha)));
    setDiaEditando(null);
  }

  const diasFds = dias_habilitados.filter((d) => esFds(d.fecha)).length;
  const diasExtra = dias_habilitados.length - diasFds;
  const suficiente = capacidadActualTotal >= totalPartidos;
  const diaEditandoData = dias_habilitados.find((d) => d.fecha === diaEditando);

  const totalPartidosPorDia = config_canchas.num_canchas * slotsEntre(config_horario.hora_inicio, config_horario.hora_fin);

  return (
    <div>
      <h2 style={{ marginBottom: '0.25rem' }}>Días disponibles</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: '1.25rem' }}>
        Los sábados y domingos necesarios se seleccionan automáticamente. Toca un día marcado para ajustar su horario por cancha.
      </p>

      {!fecha_inicio && (
        <p style={{ color: '#dc2626', marginBottom: '1rem' }}>Vuelve al paso 1 y define la fecha de inicio.</p>
      )}

      {fecha_inicio && (
        <>
          {/* ── Horario global ── */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.25rem', background: '#fff' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '0.75rem' }}>Horario por defecto</div>
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: '0.3rem' }}>Hora de inicio</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {HORAS_INICIO.map((h) => (
                    <button key={h} onClick={() => setConfigHorario({ ...config_horario, hora_inicio: h })} style={{
                      padding: '0.3rem 0.7rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: config_horario.hora_inicio === h ? '#2563eb' : '#f3f4f6',
                      color: config_horario.hora_inicio === h ? '#fff' : '#374151',
                      fontWeight: 600, fontSize: 13,
                    }}>{h}</button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: '0.3rem' }}>Hora de fin</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {HORAS_FIN.map((h) => (
                    <button key={h} onClick={() => setConfigHorario({ ...config_horario, hora_fin: h })} style={{
                      padding: '0.3rem 0.7rem', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: config_horario.hora_fin === h ? '#2563eb' : '#f3f4f6',
                      color: config_horario.hora_fin === h ? '#fff' : '#374151',
                      fontWeight: 600, fontSize: 13,
                    }}>{h}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#1d4ed8', background: '#eff6ff', borderRadius: 6, padding: '0.4rem 0.75rem' }}>
              {config_canchas.num_canchas} canchas · {config_horario.hora_inicio} a {config_horario.hora_fin} · <strong>{totalPartidosPorDia} partidos</strong> posibles por día
            </div>
          </div>

          {/* ── Contador ── */}
          {(() => {
            const sobrante = capacidadActualTotal - totalPartidos;
            const canchasActivas = config_canchas.canchas.filter(c => c.categorias_ids.length > 0).length || 1;
            const horasSobrantes = Math.floor(sobrante / canchasActivas);
            return (
              <div style={{
                background: suficiente ? '#f0fdf4' : '#fefce8',
                border: `1px solid ${suficiente ? '#bbf7d0' : '#fde68a'}`,
                borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem',
              }}>
                {/* Fila 1: métricas principales */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', marginBottom: suficiente ? '0.6rem' : 0 }}>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: suficiente ? '#16a34a' : '#92400e' }}>{dias_habilitados.length}</span>
                    <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 4 }}>días</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    S/D: <strong>{diasFds}</strong> · Extras: <strong>{diasExtra}</strong>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>Capacidad: </span>
                    <strong style={{ color: suficiente ? '#15803d' : '#92400e' }}>{capacidadActualTotal}</strong>
                    <span style={{ color: '#9ca3af' }}> / {totalPartidos} partidos</span>
                  </div>
                  {suficiente && (
                    <div style={{ fontSize: 13 }}>
                      <span style={{ color: '#6b7280' }}>Sobrante: </span>
                      <strong style={{ color: '#2563eb' }}>{sobrante} slots</strong>
                    </div>
                  )}
                </div>

                {/* Fila 2: consejo sobre el último día */}
                {suficiente && sobrante > 0 && (
                  <div style={{
                    background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6,
                    padding: '0.5rem 0.75rem', fontSize: 13, color: '#1d4ed8',
                  }}>
                    💡 Sobran <strong>{sobrante} slots</strong> — el último día podría terminar
                    aproximadamente <strong>{horasSobrantes}h antes</strong> ({canchasActivas} canchas × {horasSobrantes}h).
                    Usa ⚙ para ajustar su horario de fin.
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── Acciones ── */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <button onClick={resetearFds} style={{
              padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #d1d5db',
              background: '#f9fafb', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}>Restablecer S/D automáticos</button>
            {diaEditando && (
              <button onClick={() => {
                toggleDia(diaEditando);
                setDiaEditando(null);
              }} style={{
                padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #fed7aa',
                background: '#fff7ed', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#c2410c',
              }}>
                🗑 Liberar día ({new Date(diaEditando + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })})
              </button>
            )}
            <button onClick={() => { setDiasHabilitados([]); setDiaEditando(null); }} style={{
              padding: '0.4rem 1rem', borderRadius: 6, border: '1px solid #fecaca',
              background: '#fef2f2', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#dc2626',
            }}>Limpiar todo</button>
          </div>

          {/* ── Panel edición por cancha ── */}
          {diaEditando && diaEditandoData && (
            <div style={{ border: '2px solid #2563eb', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1rem', background: '#eff6ff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {new Date(diaEditando + 'T12:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <button onClick={() => setDiaEditando(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>×</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {config_canchas.canchas.map((cancha) => {
                  const cfg = getCanchaConfig(diaEditandoData, cancha.id);
                  const horaI = cfg.hora_inicio ?? config_horario.hora_inicio;
                  const horaF = cfg.hora_fin ?? config_horario.hora_fin;
                  const tieneOverride = cfg.hora_inicio !== undefined || cfg.hora_fin !== undefined || !cfg.activa;

                  return (
                    <div key={cancha.id} style={{
                      background: cfg.activa ? '#fff' : '#f9fafb',
                      border: `1px solid ${tieneOverride ? '#2563eb' : '#e5e7eb'}`,
                      borderRadius: 8, padding: '0.75rem 1rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: cfg.activa ? '0.6rem' : 0 }}>
                        <button
                          onClick={() => actualizarCanchaEnDia(diaEditando, cancha.id, { activa: !cfg.activa })}
                          style={{
                            padding: '0.25rem 0.7rem', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            background: cfg.activa ? '#16a34a' : '#f3f4f6',
                            color: cfg.activa ? '#fff' : '#9ca3af',
                            border: 'none',
                          }}
                        >
                          {cfg.activa ? '✓ Activa' : '✗ Inactiva'}
                        </button>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{cancha.nombre}</span>
                        {tieneOverride && (
                          <span style={{ fontSize: 11, color: '#2563eb', background: '#dbeafe', padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
                            personalizado
                          </span>
                        )}
                      </div>

                      {cfg.activa && (
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: '0.25rem' }}>
                              Inicio {cfg.hora_inicio === undefined && <span style={{ color: '#9ca3af' }}>(global: {config_horario.hora_inicio})</span>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {HORAS_INICIO.map((h) => (
                                <button
                                  key={h}
                                  onClick={() => actualizarCanchaEnDia(diaEditando, cancha.id, {
                                    hora_inicio: cfg.hora_inicio === h ? undefined : h,
                                  })}
                                  style={{
                                    padding: '0.25rem 0.55rem', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: horaI === h ? '#2563eb' : '#f3f4f6',
                                    color: horaI === h ? '#fff' : '#6b7280',
                                    border: cfg.hora_inicio === h ? '2px solid #2563eb' : '1px solid transparent',
                                  }}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: '0.25rem' }}>
                              Fin {cfg.hora_fin === undefined && <span style={{ color: '#9ca3af' }}>(global: {config_horario.hora_fin})</span>}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                              {HORAS_FIN.map((h) => (
                                <button
                                  key={h}
                                  onClick={() => actualizarCanchaEnDia(diaEditando, cancha.id, {
                                    hora_fin: cfg.hora_fin === h ? undefined : h,
                                  })}
                                  style={{
                                    padding: '0.25rem 0.55rem', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    background: horaF === h ? '#2563eb' : '#f3f4f6',
                                    color: horaF === h ? '#fff' : '#6b7280',
                                    border: cfg.hora_fin === h ? '2px solid #2563eb' : '1px solid transparent',
                                  }}
                                >{h}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {tieneCusto(diaEditandoData) && (
                <button onClick={() => resetearDia(diaEditando)} style={{
                  marginTop: '0.75rem', fontSize: 12, color: '#6b7280', background: 'none',
                  border: '1px solid #d1d5db', borderRadius: 6, padding: '0.25rem 0.65rem', cursor: 'pointer',
                }}>Restablecer este día al global</button>
              )}
            </div>
          )}

          {/* ── Encabezado días ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#6b7280', padding: '4px 0' }}>{d}</div>
            ))}
          </div>

          {/* ── Grilla ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1.5rem' }}>
            {semanas.map((semana, si) => (
              <div key={si} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                {semana.map((fecha, di) => {
                  if (!fecha) return <div key={di} />;
                  const d = new Date(fecha + 'T12:00:00');
                  const seleccionado = fechasSeleccionadas.has(fecha);
                  const fds = esFds(fecha);
                  const editando = diaEditando === fecha;
                  const diaData = dias_habilitados.find((x) => x.fecha === fecha);
                  const tieneConfig = diaData ? tieneCusto(diaData) : false;

                  return (
                    <button
                      key={fecha}
                      onClick={() => seleccionado
                        ? setDiaEditando(editando ? null : fecha)
                        : toggleDia(fecha)
                      }
                      title={seleccionado ? 'Click para configurar horario' : 'Click para agregar'}
                      style={{
                        width: '100%', padding: '5px 2px', borderRadius: 6, cursor: 'pointer', textAlign: 'center',
                        border: editando ? '2px solid #1d4ed8' : seleccionado ? '2px solid #2563eb' : '1px solid #e5e7eb',
                        background: seleccionado ? (editando ? '#1d4ed8' : tieneConfig ? '#1d4ed8' : '#2563eb') : fds ? '#f0fdf4' : '#fff',
                        color: seleccionado ? '#fff' : fds ? '#16a34a' : '#374151',
                        fontWeight: seleccionado ? 700 : 400, fontSize: 12, lineHeight: 1.3,
                        position: 'relative',
                      }}
                    >
                      <div>{d.getDate()}</div>
                      <div style={{ fontSize: 9 }}>{d.toLocaleString('es', { month: 'short' })}</div>
                      {tieneConfig && (
                        <div style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 8, opacity: 0.8 }}>⚙</div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: '1.5rem' }}>
            Click en día marcado → configura sus horarios · Click en día libre → lo agrega · "Liberar día" → lo quita y asigna el siguiente
          </p>
        </>
      )}

      {!suficiente && dias_habilitados.length > 0 && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8,
          padding: '0.65rem 1rem', marginBottom: '1rem', fontSize: 14, color: '#92400e',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          ⚠️ <strong>Faltan días:</strong> tienes {capacidadActualTotal} slots pero necesitas {totalPartidos} partidos.
          Agrega más días o usa el botón "Restablecer S/D automáticos".
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={onAtras} style={{
          background: '#fff', color: '#374151', padding: '0.6rem 2rem',
          border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 15,
        }}>Atras</button>
        <button
          onClick={() => (dias_habilitados.length > 0 && suficiente) ? onSiguiente() : undefined}
          disabled={dias_habilitados.length === 0 || !suficiente}
          style={{
            background: (dias_habilitados.length > 0 && suficiente) ? '#2563eb' : '#9ca3af',
            color: '#fff', padding: '0.6rem 2rem', border: 'none', borderRadius: 8,
            cursor: (dias_habilitados.length > 0 && suficiente) ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: 15,
          }}
        >Siguiente</button>
      </div>
    </div>
  );
}
