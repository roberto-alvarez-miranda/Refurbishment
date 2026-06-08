# Plan de Implementación: Flujo Entidad-Trabajo ("Qué" vs. "Cómo")

Este plan detalla el rediseño y la refactorización arquitectónica de la plataforma para adoptar un modelo de **Presupuestación Centrada en Entidades (BIM-Style)**. Separamos estrictamente la definición física de "Qué intervenir" en el Estado Actual de la configuración técnica de "Cómo intervenir" en la Planificación.

---

## 🏗️ 1. Conceptualización del Flujo de Datos "Qué vs. Cómo"

```
[ PASO 1: ESTADO ACTUAL ("¿QUÉ HAY QUE HACER?") ]
- Define el "Levantamiento" físico de las Unidades de Actuación (Entidades).
- Lista: 
  - Estancias (Salón, Cocina, Baños...)
  - Tabiques individuales (Largo, Alto, Área)
  - Sanitarios individuales (Inodoro, Lavabo, Fregadero)
  - Superficies (Suelos m², Techos m²)
- No se eligen calidades ni tareas de colocación aquí. Solo se valida "Lo que existe".

                       │
                       ▼ (Entidades Aceptadas pasan a Planificación)
                       
[ PASO 2: PLANIFICACIÓN ("¿CÓMO HACERLO?") ]
- Para cada Entidad Aceptada, se abre el panel de "Cómo hacerlo" (Zoom CYPE).
- Permite asignar MULTIPLES TRABAJOS (Partidas) a una misma entidad física:
  - Tabique 1 (Salón-Cocina):
    - [x] Demoler tabique existente (Base CYPE DPT010)
    - [x] Construir tabique nuevo Pladur (Base CYPE DPT030)
    - [x] Pintar Cara A (Salón) (Base CYPE REV110)
    - [x] Alicatar Cara B (Cocina) (Base CYPE REV120) -> Busca baldosa comercial con IA (ACAE)
- El sistema suma los tiempos de rendimiento y calcula los precios unitarios combinados.

                       │
                       ▼ (Consolidación Dinámica)
                       
[ PASO 3: PRESUPUESTO GENERAL Y TIEMPOS ]
- Colapsa las partidas homogéneas de todas las estancias en capítulos del presupuesto.
- Suma los rendimientos de mano de obra oficiales de CYPE para actualizar la duración (Gantt) y Gantt de plazos en vivo.
- Permite guardar el presupuesto como una versión nominada ("Gama Lujo", "Reforma Básica") en Firestore.
```

---

## 📋 2. Detalle de las Tareas de Desarrollo

### 📐 Fase 1: Estado Actual — Levantamiento de Entidades (What is there)
- [ ] Task: Refactorizar `AIPreview.tsx` para listar Entidades Físicas (Unidades de Actuación) en lugar de partidas de presupuesto brutas.
    - [ ] Mostrar secciones claras: "Tabiquería a Intervenir", "Aparatos Sanitarios Existentes", "Superficies de Estancias".
    - [ ] Eliminar los códigos de presupuesto (como `DEM-` o `REV-`) de esta fase preliminar; cada entidad tendrá un ID de Levantamiento físico (ej: `ENT-T01` para Tabique 1, `ENT-S01` para Inodoro).
    - [ ] El botón final de esta pantalla cambiará a: **"CONFIRMAR LEVANTAMIENTO Y PASAR A PLANIFICACIÓN"**.

### 🎨 Fase 2: Planificación — Configurador "Cómo Hacerlo" por Entidad (How to do it)
- [ ] Task: Rediseñar `PlanningView.tsx` como un Gestor de Obras por Entidad.
    - [ ] Cargar las entidades validadas y confirmadas del paso anterior.
    - [ ] Al hacer clic en una Entidad (ej: `Tabique 1`), abrir el **CYPE Parameter Popup (El Zoom)** adaptado para asignar tareas múltiples con selectores conmutables (Demoler, Construir, Pintar, Alicatar).
    - [ ] Integrar el **Especulador de Materiales con IA (Google Search)** para cotizar baldosas, pinturas o sanitarios de marcas reales sobre la marcha al seleccionar alicatados o solados.

### 📊 Fase 3: Consolidación y Guardado de Versiones (Budget Compilation)
- [ ] Task: Implementar el compilador dinámico de partidas en el frontend/backend.
    - [ ] Agrupar de forma automática los trabajos de todas las estancias que compartan el mismo código CYPE.
    - [ ] Sumar los rendimientos de mano de obra del `.bc3` para calcular el plazo estimado de obra.
    - [ ] Guardar las versiones parametrizadas del presupuesto en Firestore en la subcolección `/budget_versions`.
