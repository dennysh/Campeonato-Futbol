# Pendientes del proyecto — Cronograma Futbol Formativo

---

## CAMBIO 1 — Paso "Canchas": rediseño completo

### Estado actual
- Muestra: número de canchas (stepper) + hora de inicio + hora de fin
- Todos los horarios son globales para todas las canchas

### Estado deseado
- **Quitar**: botones de hora de inicio y hora de fin de este paso
- **Default silencioso**: 08:00–17:00 (9 partidos/día) — se configura en el paso Días
- **Mantener**: stepper de número de canchas
- **Agregar**: asignación de categorías por cancha (qué subs juegan en cada cancha)

### Por qué categorías por cancha
- El usuario decide manualmente qué categorías juegan en cada cancha
- No hay lógica automática de tamaño — es decisión libre del organizador
- El engine NO asignará un partido a una cancha si la categoría no está asignada a ella

### Detalle UX — Asignación de categorías
Cada cancha generada muestra un bloque con:
- Nombre editable: "Cancha 1", "Cancha 2", etc.
- Badges toggle con cada categoría del torneo (las seleccionadas en paso 2)
- Badge activo (color lleno) = esa categoría SÍ juega en esa cancha
- Badge inactivo (gris) = esa categoría NO juega en esa cancha
- Por defecto: distribución equitativa automática entre canchas
  - 4 canchas, 8 categorías → 2 categorías por cancha
  - 2 canchas, 3 categorías → Cancha 1: 2 cats, Cancha 2: 1 cat

### Ejemplo visual esperado
```
Número de canchas:  [−]  3  [+]

┌────────────────────────────────────────────────┐
│ Cancha 1                                       │
│  [● Sub-6 Masculino] [● Sub-7 Masculino]       │
│  [○ Sub-8 Masculino] [○ Sub-9 Masculino]       │
└────────────────────────────────────────────────┘
┌────────────────────────────────────────────────┐
│ Cancha 2                                       │
│  [○ Sub-6 Masculino] [○ Sub-7 Masculino]       │
│  [● Sub-8 Masculino] [● Sub-9 Masculino]       │
└────────────────────────────────────────────────┘
```

### Cambios en el store (wizardStore.ts)
```ts
// ANTES
config_canchas: { num_canchas: number; hora_inicio: string; hora_fin: string }

// DESPUES — dos campos separados:
config_canchas: {
  num_canchas: number;
  canchas: {
    id: number;
    nombre: string;
    categorias_ids: string[]; // ej: ["sub6_masculino", "sub7_femenino"]
  }[];
}
config_horario: {
  hora_inicio: string; // default "08:00"
  hora_fin: string;    // default "17:00"
}
```

### Cambios en wizardToScheduleInput.ts
- `categorias_permitidas` de cada cancha = `cancha.categorias_ids`
- `hora_inicio` y `hora_fin` se leen de `config_horario`

### Validación antes de avanzar
- Cada categoría del torneo debe estar asignada a al menos una cancha
- Advertencia visual si alguna categoría no tiene cancha asignada

---

## CAMBIO 2 — Paso "Días": horario global + horario por día

### Estado actual
- Solo el calendario de selección de días
- Sin configuración de horarios (estaba en Canchas)

### Estado deseado — dos niveles de configuración

#### Nivel 1: Horario global (encima del calendario)
Aplica a todos los días que no tengan horario propio definido.
```
Horario por defecto

Hora de inicio:  [06:00] [07:00] [08:00*] [09:00] [10:00]
Hora de fin:     [15:00] [16:00] [17:00*] [18:00] [19:00] [20:00]

3 canchas · 08:00 a 17:00 · 27 partidos posibles por día
```

#### Nivel 2: Horario específico por día (al hacer click en un día)
Al tocar un día ya seleccionado en el calendario, se abre un panel/modal con:
- Hora de inicio para ese día (default: hereda el global)
- Hora de fin para ese día
- Canchas disponibles ese día (checkboxes — por si una cancha está ocupada)
  - Ej: sábado 17 mayo, Cancha 2 está ocupada → desmarcarla
- Resumen: X partidos posibles ese día específico
- Botón "Restablecer al global"

#### Indicadores visuales en el calendario
- Día normal (usa horario global): fondo azul oscuro
- Día con horario personalizado: fondo azul + ícono de lápiz o borde diferente
- Número de partidos posibles mostrado dentro de la celda del día

### Estructura de datos para días (wizardStore.ts)
```ts
// ANTES
dias_habilitados: string[]  // solo fechas

// DESPUES
dias_habilitados: {
  fecha: string;
  hora_inicio?: string;      // si es undefined, usa config_horario global
  hora_fin?: string;         // si es undefined, usa config_horario global
  canchas_activas?: number[]; // ids de canchas activas ese día; si undefined = todas
}[]
```

### Lógica de días necesarios
```ts
// Cada día puede tener diferente capacidad
function calcularDiasNecesarios(categorias, config_canchas, config_horario) {
  // Usa el horario global para estimar (los días personalizados se calculan al generar)
  const slots = horasEntre(config_horario.hora_inicio, config_horario.hora_fin);
  const porDia = config_canchas.num_canchas * slots;
  const total = totalPartidos(categorias);
  return Math.ceil(total / porDia);
}
```

---

## CAMBIO 3 — Backend: ajustar confirmarTorneo.ts y engine

### Cambios en confirmarTorneo.ts
- Recibir nueva estructura: `config_canchas.canchas[].categorias_ids`
- Recibir `config_horario` separado
- Recibir `dias_habilitados` como array de objetos con hora opcional y canchas activas opcionales

### Cambios en wizardToScheduleInput.ts
Al construir el input del engine para cada cancha:
```ts
{
  id: cancha.id,
  nombre: cancha.nombre,
  categorias_permitidas: cancha.categorias_ids,
  disponibilidad: dias_habilitados.map(dia => {
    const canchaActiva = dia.canchas_activas === undefined || dia.canchas_activas.includes(cancha.id);
    if (!canchaActiva) return null; // cancha no disponible ese día
    return {
      fecha: dia.fecha,
      hora_inicio: dia.hora_inicio ?? config_horario.hora_inicio,
      hora_fin: dia.hora_fin ?? config_horario.hora_fin,
    };
  }).filter(Boolean)
}
```

---

## CAMBIO 4 — Mover partidos en el cronograma generado (admin)

### Descripción
En la vista admin del calendario (TorneoCalendario), el usuario puede mover partidos
ya asignados por solicitud de equipos o por fuerza mayor.

### Comportamiento actual (a cambiar)
- Al arrastrar un partido a un slot ocupado → 409 bloqueado, se revierte
- No hay forma de forzar el movimiento

### Comportamiento nuevo
Cuando el usuario mueve (arrastra) un partido:

**Caso A: Sin conflictos** → mover directamente, sin alerta.

**Caso B: Conflicto detectado** (equipo ya tiene partido ese día/hora) →
- NO bloquear la acción
- Mostrar modal de confirmación:
  ```
  ⚠️ Conflicto detectado
  "Equipo Dragones ya tiene un partido asignado el sábado 17 may a las 10:00"
  
  ¿Deseas mover el partido de todas formas?
  
  [Cancelar — mantener en su lugar]   [Confirmar — mover de todas formas]
  ```
- Si el usuario confirma → guardar el movimiento aunque haya conflicto
- Si el usuario cancela → revertir el drag al lugar original

**Caso C: Recorrido automático de partidos** (mejora futura)
- Cuando un partido se mueve, ofrecer opción de "recorrer" el resto de partidos
  del equipo para cubrir el hueco que dejó
- Por ejemplo: Equipo A tenía partidos a las 09:00, 11:00, 13:00
  Si el de 09:00 se mueve a otro día, el de 11:00 podría bajar a 09:00, etc.
- **Este sub-caso es mejora futura, no parte del sprint actual**

### Cambios en backend (routes/torneos.ts — PATCH /:id/partidos/:matchId)
```ts
// ANTES: devolver 409 si hay conflicto
// DESPUES: aceptar param ?forzar=true para saltarse la validación

router.patch('/:id/partidos/:matchId', async (req, res) => {
  const forzar = req.query.forzar === 'true';
  
  // ... detectar conflictos ...
  
  if (conflictos.length > 0 && !forzar) {
    // Devolver 409 con los conflictos (igual que antes)
    res.status(409).json({ error: 'Conflicto', conflictos, puede_forzar: true });
    return;
  }
  // Si forzar=true, ignorar conflictos y guardar
  await prisma.match.update(...);
  res.json(updated);
});
```

### Cambios en frontend (TorneoCalendario.tsx)
```ts
// handleDrop:
// 1. Intentar moverPartido sin ?forzar
// 2. Si llega 409 con puede_forzar=true:
//    - NO revertir el drag todavía
//    - Mostrar modal: "¿Confirmar movimiento con conflicto?"
//    - Si confirma: llamar moverPartido con ?forzar=true
//    - Si cancela: arg.revert()
```

### Estado del modal de confirmación
```ts
const [confirmarConflicto, setConfirmarConflicto] = useState<{
  arg: EventDropArg;
  conflictos: string[];
} | null>(null);
```

---

## Orden de implementación

1. `wizardStore.ts` — nuevo tipo `config_canchas` (sin horas) + `config_horario` + `dias_habilitados` como objetos
2. `PasoCanchas.tsx` — quitar horas, agregar asignación de categorías por cancha
3. `PasoDias.tsx` — agregar horario global encima + horario/canchas por día al click
4. `wizardToScheduleInput.ts` — usar nueva estructura completa
5. `confirmarTorneo.ts` — recibir y procesar nueva estructura
6. `routes/torneos.ts` — agregar param `?forzar=true` al PATCH de partidos
7. `TorneoCalendario.tsx` — modal de confirmación de conflicto en drag & drop
8. Testing del flujo completo

---

## Notas clave

- Partido = 60 min fijos (20+5+20+15), no cambia nunca
- Default global siempre: 08:00–17:00 = 9 slots/día
- Asignación por cancha afecta directamente al engine de generación
- Una cancha sin categorías asignadas queda inactiva
- Una cancha marcada como no disponible un día específico = no genera partidos ese día
- Al mover partidos: ADVERTIR pero no bloquear si el usuario confirma
- El recorrido automático de partidos vecinos es mejora futura