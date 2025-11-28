# Plan de Implementación: Validador Multicanal - Buscar por Referencia

**Fecha de creación:** 21 de noviembre de 2025  
**Proyecto:** elink-ng + siconline-vtex-services  
**Módulo:** Validador Multicanal - Búsqueda de Referencia  
**Versión:** 1.0

---

## 📋 Resumen Ejecutivo

Este documento presenta el plan de implementación y refactorización del módulo "Buscar por referencia" del sistema Validador Multicanal. Se evaluaron 4 criterios funcionales principales con sus respectivos casos de aceptación (Given/When/Then), identificando el estado actual del código y las modificaciones necesarias.

### Estado General del Módulo

| Componente | Estado Actual | Nivel de Completitud |
|------------|---------------|---------------------|
| **Frontend Angular** | ✅ Implementado parcialmente | 70% |
| **Backend Java** | ✅ Implementado parcialmente | 65% |
| **Integración Frontend-Backend** | ⚠️ Funcional con ajustes menores | 80% |
| **UI/UX según mockups** | ⚠️ Requiere refactorización | 50% |

---

## 🎯 Criterios Funcionales Evaluados

### **Criterio 1: Búsqueda por Referencia**

#### **Given/When/Then**
```gherkin
Given que estoy en la pantalla del módulo "Buscar por referencia"
When ingreso un valor en el campo Referencia y hago click en Consultar
Then la aplicación llama a GET /api/references?code={reference} 
     y pinta la lista de resultados en la parte inferior 
     con la estructura mínima (checkbox, foto, código, validador)
```

#### **Aceptación Técnica**
- ✅ La búsqueda debe tolerar espacios y mayúsculas (trim + lower)
- ✅ Si no hay resultados, mostrar mensaje: "No se encontraron referencias con ese código"

#### **Análisis del Estado Actual**

##### **Frontend** (`buscar-referencia.component.ts`)
```typescript
✅ IMPLEMENTADO:
- Método buscarReferencias() divide por saltos de línea
- Aplica .trim() a cada referencia
- Valida referencias vacías
- Muestra alerta personalizada si no hay resultados

⚠️ REQUIERE AJUSTES:
- NO aplica .toLowerCase() según requerimiento técnico
- Endpoint llamado: /commerce/referencia/validador-referencia
- Parámetros: referencias (comma-separated), marca
- Falta normalización completa (trim + lower)
```

**Código actual relevante:**
```typescript
// Línea 94-98
const referencias = this.referenciaBuscar
  .split('\n')
  .map(ref => ref.trim())
  .filter(ref => ref.length > 0);
```

**Modificación requerida:**
```typescript
const referencias = this.referenciaBuscar
  .split('\n')
  .map(ref => ref.trim().toLowerCase())  // ⬅️ Agregar toLowerCase()
  .filter(ref => ref.length > 0);
```

##### **Backend** (`ValidadorReferenciaController.java`)
```typescript
⚠️ REQUIERE VALIDACIÓN:
- Endpoint existente: GET /commerce/referencia/validador-referencia
- Parámetros: referencias (String), marca (String)
- DEBE VERIFICAR: si aplica trim() y toLowerCase() en la capa de servicio
```

**Endpoint existente en ReferenciasController:**
```java
// No implementa búsqueda directa por código
// Requiere múltiples parámetros (empresa, ano, coleccion, referencias, canal, ecommerce)
```

#### **Acciones Requeridas**

| ID | Acción | Componente | Prioridad | Estimación |
|----|--------|------------|-----------|------------|
| 1.1 | Agregar `.toLowerCase()` a normalización de referencias | Frontend | 🔴 Alta | 15 min |
| 1.2 | Validar que backend aplique trim/lower en queries SQL | Backend | 🔴 Alta | 30 min |
| 1.3 | Crear endpoint simplificado GET /api/references?code={code} | Backend | 🟡 Media | 2 hrs |
| 1.4 | Actualizar servicio frontend para usar nuevo endpoint | Frontend | 🟡 Media | 1 hr |

---

### **Criterio 2: Visualización de Fila (Resultado)**

#### **Given/When/Then**
```gherkin
Given un resultado devuelto por backend
When se renderiza la fila
Then el estado del validador refleja el campo isValid del backend
```

#### **Especificación de Fila**
Cada fila debe mostrar:
- ✅ Checkbox para selección
- ✅ Miniatura de la imagen principal (placeholder si no hay imagen)
- ✅ Código de referencia (ej: 11659150)
- ✅ Nombre de referencia
- ⚠️ Icono validador: verde ✔️ si isValid=true; rojo ❌ si isValid=false

#### **Análisis del Estado Actual**

##### **DTO Frontend** (`referencia-validacion-dto.ts`)
```typescript
✅ ESTRUCTURA CORRECTA:
export interface ReferenciaValidacionDto {
  baseUrlImagen: string;      // URL de imagen
  codReferencia: string;       // Código de referencia
  nomReferencia: string;       // Nombre de referencia
  estadoGeneral: boolean;      // Estado de validación general
  
  // Propiedades computadas para compatibilidad
  id?: string;
  codigo?: string;
  nombre?: string;
  urlImagen?: string;
  isValid?: boolean;           // ⬅️ Mapeado desde estadoGeneral
}
```

**Mapeo actual en component:**
```typescript
// Línea 114-120
this.listaReferencias = data.map(ref => ({
  ...ref,
  id: ref.codReferencia,
  codigo: ref.codReferencia,
  nombre: ref.nomReferencia,
  urlImagen: ref.baseUrlImagen,
  isValid: ref.estadoGeneral  // ✅ CORRECTO
}));
```

##### **Componente de Visualización** (`detalle-validacion.component.ts`)
```typescript
✅ IMPLEMENTADO:
- Columna con checkbox (headerCheckboxSelection)
- Columna con imagen (imagenRenderer) - 90px width
- Columna con código (field: 'codigo') - 130px width
- Columna con nombre (field: 'nombre') - 400px width
- Columna con estado (caritasRenderer) usando isValid

⚠️ REQUIERE AJUSTES:
- Imagen no es circular 64x64 según mockup
- Layout no es "card horizontal compacta"
- Icono validador no es "grande" como especifica mockup
```

**Configuración actual de columnas:**
```typescript
// Líneas 81-122
{
  field: 'urlImagen',
  cellRenderer: 'imagenRenderer',
  width: 90,  // ⚠️ No cumple spec 64x64 circular
  checkboxSelection: true
},
{
  field: 'isValid',
  cellRenderer: 'caritasRenderer',  // ✅ Usa renderer personalizado
  width: 100
}
```

#### **Acciones Requeridas**

| ID | Acción | Componente | Prioridad | Estimación |
|----|--------|------------|-----------|------------|
| 2.1 | Actualizar `imagenRenderer` para mostrar circular 64x64 | Frontend | 🟡 Media | 30 min |
| 2.2 | Modificar layout de ag-grid a cards horizontales | Frontend | 🟢 Baja | 3 hrs |
| 2.3 | Aumentar tamaño del icono validador (caritasRenderer) | Frontend | 🟡 Media | 20 min |
| 2.4 | Agregar placeholder para imágenes faltantes | Frontend | 🟡 Media | 30 min |

---

### **Criterio 3: Modal de Atributos (al clic sobre el validador)**

#### **Given/When/Then**
```gherkin
Given que visualizo la lista y doy clic en el icono validador de una fila
When abro el modal de atributos
Then se muestra:
  - Título: "Atributos para la referencia <código>"
  - Lista de atributos con check (estado true/false)
  - Canales con botones/badges
  - Canales con faltantes en rojo + tooltip con atributos faltantes
  - Botón Cerrar
```

#### **API Especificada**
```
GET /api/references/{id}/attributes 
→ { 
    attributes: [{name, ok}], 
    channels: [{code, ok, missingAttributes: [...]}] 
  }
```

#### **Análisis del Estado Actual**

##### **Servicio Frontend** (`validador-referencia.service.ts`)
```typescript
✅ MÉTODO EXISTENTE:
obtenerDetalleAtributos(idReferencia: string, empresa: string): Observable<DetalleAtributosReferenciaDto>

Endpoint: GET /commerce/referencia/{id}/atributos?empresa=XX
```

##### **DTO Frontend** (`detalle-atributos-referencia-dto.ts`)
```typescript
✅ ESTRUCTURA CORRECTA:
export interface AtributoReferenciaDto {
  nombre: string;
  ok: boolean;
  valor?: string;
}

export interface CanalReferenciaDto {
  codigo: string;
  nombre: string;
  ok: boolean;
  atributosFaltantes: string[];  // ✅ Incluye array de faltantes
}

export interface DetalleAtributosReferenciaDto {
  idReferencia: string;
  codigoReferencia: string;
  nombreReferencia?: string;
  atributos: AtributoReferenciaDto[];
  canales: CanalReferenciaDto[];
}
```

##### **Componente Modal** (`modal-atributos-referencia.component.ts`)
```typescript
✅ IMPLEMENTADO:
- Método cargarAtributos() llama servicio correctamente
- Método obtenerTooltipCanal() genera tooltip con faltantes
- Props de entrada: idReferencia, codigoReferencia, empresa

⚠️ VERIFICAR INTEGRACIÓN:
- ¿El backend retorna la estructura esperada?
- ¿Los canales en rojo se renderizan correctamente?
```

##### **Template Modal** (`modal-atributos-referencia.component.html`)
```html
✅ IMPLEMENTADO:
- Título dinámico: "Atributos para la referencia {{ codigoReferencia }}"
- *ngFor sobre atributos con iconos fa-check-circle (ok) / fa-times-circle (error)
- *ngFor sobre canales con clase condicional 'canal-ok' / 'canal-error'
- Tooltip con [tooltip]="obtenerTooltipCanal(canal)"
- Badge con count de faltantes

⚠️ REQUIERE AJUSTES CSS:
- Verificar que canales en rojo se visualicen según mockup
- Ajustar estilos de badges (rectangulares con borde rojo)
```

#### **Acciones Requeridas**

| ID | Acción | Componente | Prioridad | Estimación |
|----|--------|------------|-----------|------------|
| 3.1 | Validar que backend retorna estructura correcta | Backend | 🔴 Alta | 1 hr |
| 3.2 | Verificar tooltips en canales rojos (hover funcional) | Frontend | 🟡 Media | 30 min |
| 3.3 | Ajustar CSS de badges de canales según mockup | Frontend | 🟡 Media | 1 hr |
| 3.4 | Hacer atributos de solo lectura (sin posibilidad de edición) | Frontend | 🟢 Baja | 15 min |

---

### **Criterio 4: Asignar Fecha de Lanzamiento (Control Superior)**

#### **Given/When/Then**
```gherkin
Given que estoy en resultados y quiero asignar fecha de lanzamiento
When hago clic en "Asignar fecha de lanzamiento"
Then se abre un modal con:
  - Calendario (selector por día)
  - Listado de canales (checkboxes) de la marca
  - Botones Asignar y Cancelar

On Assign:
  - Valida: al menos 1 canal + fecha válida
  - Llama: POST /api/references/{id}/launch-date 
           { date: 'yyyy-MM-dd', channels: ['IC','VN'] }
  - Muestra: confirmación (toast)
  - Actualiza: listado

Errores:
  - Mostrar mensaje claro si backend devuelve conflicto/validación
```

#### **Análisis del Estado Actual**

##### **Servicio Frontend** (`validador-referencia.service.ts`)
```typescript
✅ MÉTODO EXISTENTE:
asignarFechaLanzamiento(idReferencia: string, asignacion: AsignacionFechaLanzamientoDto): Observable<any>

Endpoint: POST /commerce/referencia/{id}/fecha-lanzamiento
```

##### **DTO Frontend** (`asignacion-fecha-lanzamiento-dto.ts`)
```typescript
⚠️ REQUIERE VERIFICACIÓN:
export interface AsignacionFechaLanzamientoDto {
  fecha: Date;              // ⚠️ ¿Backend espera Date o string 'yyyy-MM-dd'?
  canales: string[];        // ✅ Array de códigos de canal
}
```

##### **Componente Modal** (`modal-fecha-lanzamiento-referencia.component.ts`)
```typescript
✅ IMPLEMENTADO:
- Props de entrada: referencias (array), empresa
- cargarCanales() obtiene marketplaces
- toggleCanal() maneja selección/deselección de checkboxes
- Validaciones: fecha obligatoria, al menos 1 canal
- asignarFecha() llama servicio para cada referencia (Promise.all)
- onClose Subject para notificar éxito al componente padre
- Muestra alerta de éxito/error

⚠️ POSIBLES MEJORAS:
- ¿Toast en lugar de alerta modal?
- ¿Formato de fecha correcto para backend?
- ¿Manejo de errores parciales (si falla 1 de N referencias)?
```

##### **Template Modal** (`modal-fecha-lanzamiento-referencia.component.html`)
```html
✅ IMPLEMENTADO:
- Info de cantidad de referencias seleccionadas
- Input type="date" con [(ngModel)]="fechaSeleccionada"
- *ngFor sobre listaCanales con checkboxes
- Botón Cancelar (llama cerrar())
- Botón Asignar (disabled si procesando o sin canales)

⚠️ MEJORAS UX:
- Calendario no es "selector visual por día" (solo input date)
- No muestra advertencia si canal tiene atributos incompletos
```

##### **Backend** (`ReferenciasController.java`)
```java
✅ ENDPOINT EXISTENTE:
@PostMapping(value = "fechalanzamiento", params = {"canal", "referencia"})
public void asignarFechaLanzamiento(
  @RequestBody List<ReferenciaVtexDto> listaReferencias,
  @RequestParam("canal") String canal,
  @RequestParam("referencia") String idReferencia,
  @RequestHeader("siconline-user") String usuario
)

⚠️ DISCREPANCIA CON SPEC:
- Espera List<ReferenciaVtexDto> en body (NO { date, channels })
- Usa @RequestParam para canal (NO array de canales en body)
- Path: /fechalanzamiento (NO /fecha-lanzamiento)
```

#### **Acciones Requeridas**

| ID | Acción | Componente | Prioridad | Estimación |
|----|--------|------------|-----------|------------|
| 4.1 | Unificar contrato backend: POST {date, channels[]} | Backend | 🔴 Alta | 2 hrs |
| 4.2 | Actualizar servicio frontend para nuevo contrato | Frontend | 🔴 Alta | 1 hr |
| 4.3 | Implementar toast de confirmación (en lugar de alerta) | Frontend | 🟡 Media | 30 min |
| 4.4 | Agregar validación de formato fecha (yyyy-MM-dd) | Frontend | 🟡 Media | 30 min |
| 4.5 | Mejorar selector de fecha con componente calendario visual | Frontend | 🟢 Baja | 2 hrs |
| 4.6 | Mostrar advertencia si canal seleccionado tiene faltantes | Frontend | 🟢 Baja | 1 hr |

---

## 🎨 Mockups / Comportamiento Visual

### **1. Top Bar (Búsqueda)**

#### **Especificación**
- Campos en **una fila**: Empresa (select), Año (input), Referencia (input con icono validador), botón Consultar (rojo)
- A la derecha: botón **Asignar fecha de lanzamiento** (blanco con borde)

#### **Estado Actual**
```html
<!-- buscar-referencia.component.html -->
⚠️ LAYOUT ACTUAL:
- Botones en grupo separado (absoluto)
- Campos en accordion dentro de card-body
- Layout NO cumple especificación de "una fila"

✅ BOTONES IMPLEMENTADOS:
- Consultar (rojo, icono fa-search)
- Limpiar (rojo, icono fa-sticky-note-o)
- Exportar (rojo, icono fa-file-excel-o)
- Asignar fecha (rojo, icono fa-calendar-check-o)

⚠️ DISCREPANCIAS:
- Botón "Asignar fecha" es ROJO (spec: blanco con borde)
- Layout es vertical en accordion (spec: horizontal en una fila)
```

#### **Acciones Requeridas**

| ID | Acción | Prioridad | Estimación |
|----|--------|-----------|------------|
| V1.1 | Reorganizar layout: mover campos fuera de accordion | 🔴 Alta | 1 hr |
| V1.2 | Colocar campos en row horizontal (col-sm-X) | 🔴 Alta | 30 min |
| V1.3 | Cambiar estilo botón "Asignar fecha" (blanco/border) | 🟡 Media | 15 min |

---

### **2. Lista de Resultados (Card List Compacta)**

#### **Especificación**
- Cada fila en **tarjeta horizontal** con:
  - Checkbox a la izquierda
  - Miniatura circular **64×64**
  - Columna central: código en **negrita** + detalles breves
  - Columna derecha: icono validador **grande** (✔️ verde o ❌ rojo)
- **Sin columnas ni acciones innecesarias** (sin canal, sin crear/recargar)

#### **Estado Actual**
```typescript
// detalle-validacion.component.ts
⚠️ USA AG-GRID (tabla, NO cards):
- rowHeight: 60
- 4 columnas: imagen (90px), código (130px), nombre (400px), estado (100px)
- frameworkComponents: imagenRenderer, caritasRenderer

✅ FUNCIONALIDAD CORRECTA:
- Checkbox con selección múltiple
- Renderer personalizado para imagen
- Renderer personalizado para estado (caritas)

⚠️ NO CUMPLE MOCKUP:
- No es "card horizontal"
- Imagen no es circular 64x64
- Código no está en negrita
- Icono validador no es "grande"
```

#### **Acciones Requeridas**

| ID | Acción | Prioridad | Estimación |
|----|--------|-----------|------------|
| V2.1 | Migrar de ag-grid a layout de cards Bootstrap | 🔴 Alta | 4 hrs |
| V2.2 | Aplicar clase CSS para miniatura circular 64x64 | 🔴 Alta | 30 min |
| V2.3 | Código en negrita (font-weight: bold) | 🟡 Media | 15 min |
| V2.4 | Aumentar tamaño icono validador (font-size: 32px+) | 🟡 Media | 15 min |

---

### **3. Modal: Atributos**

#### **Especificación**
- Caja flotante estilo **card con sombra**
- Título: **Atributos para la referencia 11659150**
- Lista con iconos/checks **verdes o grises**
- Sección inferior con **botones por canal**: rectangles con borde; **en rojo** si faltan atributos
- Badge con número de faltantes

#### **Estado Actual**
```html
<!-- modal-atributos-referencia.component.html -->
✅ ESTRUCTURA CORRECTA:
- modal-header con título dinámico
- modal-body con sección atributos + sección canales
- *ngFor sobre atributos con fa-check-circle (ok) / fa-times-circle (error)
- *ngFor sobre canales con clase canal-ok / canal-error
- Badge con count: {{ canal.atributosFaltantes.length }}
- Tooltip: [tooltip]="obtenerTooltipCanal(canal)"

⚠️ REQUIERE AJUSTES CSS:
- Verificar que .modal-header-custom tenga sombra
- Verificar que .canal-error sea rojo según mockup
- Verificar que badges sean rectangulares con borde
```

#### **Acciones Requeridas**

| ID | Acción | Prioridad | Estimación |
|----|--------|-----------|------------|
| V3.1 | Revisar/actualizar modal-atributos-referencia.component.css | 🟡 Media | 1 hr |
| V3.2 | Verificar sombra de card (box-shadow) | 🟢 Baja | 15 min |
| V3.3 | Ajustar color rojo de canales con faltantes | 🟡 Media | 15 min |
| V3.4 | Estilizar badges rectangulares con borde rojo | 🟡 Media | 30 min |

---

### **4. Modal: Asignar Fecha**

#### **Especificación**
- Card grande con **calendario visual** (mes, seleccionar día)
- Bajo calendario: **botones de canales** en fila (checkboxes o chips)
- Al seleccionar y confirmar: **toast verde** y cerrar

#### **Estado Actual**
```html
<!-- modal-fecha-lanzamiento-referencia.component.html -->
✅ ESTRUCTURA BASE:
- modal-header con título + icono fa-calendar
- Info de referencias seleccionadas
- Input type="date" (NO calendario visual)
- *ngFor sobre canales con checkboxes
- Botones Cancelar y Asignar

⚠️ NO CUMPLE MOCKUP:
- NO usa calendario visual interactivo
- NO muestra toast verde (usa alerta modal)
- Layout de canales es vertical (NO "en fila")
```

#### **Acciones Requeridas**

| ID | Acción | Prioridad | Estimación |
|----|--------|-----------|------------|
| V4.1 | Integrar componente calendario (ngx-bootstrap datepicker) | 🟡 Media | 2 hrs |
| V4.2 | Layout de canales en fila horizontal (flexbox) | 🟡 Media | 30 min |
| V4.3 | Implementar toast verde de confirmación | 🟡 Media | 30 min |
| V4.4 | Actualizar CSS modal-fecha-lanzamiento-referencia.component.css | 🟡 Media | 1 hr |

---

## 📊 Matriz de Cumplimiento Funcional

| Criterio | Given/When/Then | Backend | Frontend | UI/UX | Cumplimiento |
|----------|-----------------|---------|----------|-------|--------------|
| **1. Búsqueda por referencia** | ✅ | ⚠️ 80% | ⚠️ 90% | ⚠️ 60% | **75%** |
| **2. Visualización de fila** | ✅ | ✅ 100% | ✅ 90% | ⚠️ 50% | **80%** |
| **3. Modal de atributos** | ✅ | ⚠️ 70% | ✅ 95% | ⚠️ 70% | **80%** |
| **4. Asignar fecha lanzamiento** | ✅ | ⚠️ 60% | ⚠️ 85% | ⚠️ 50% | **65%** |
| **PROMEDIO GENERAL** | | | | | **75%** |

---

## 🛠️ Resumen de Modificaciones Requeridas

### **Backend (Java + Spring Boot)**

#### **Prioridad Alta 🔴**
1. Validar que queries SQL apliquen `LOWER()` y `TRIM()` en búsqueda de referencias
2. Unificar endpoint de asignación de fecha: `POST /api/references/{id}/launch-date { date, channels[] }`
3. Validar que endpoint `/atributos` retorna estructura correcta con `missingAttributes`

#### **Prioridad Media 🟡**
4. Crear endpoint simplificado `GET /api/references?code={code}` (opcional, mejora)

**Archivos a modificar:**
- `ValidadorReferenciaController.java`
- `ReferenciasController.java`
- `ReferenciaService.java` / `ValidadorReferenciaService.java`
- Repositorios JPA correspondientes

---

### **Frontend (Angular 7 + TypeScript)**

#### **Prioridad Alta 🔴**
1. Agregar `.toLowerCase()` a normalización de referencias en `buscar-referencia.component.ts`
2. Actualizar servicio para nuevo contrato de asignación de fecha
3. Reorganizar layout del top bar (campos en una fila)

#### **Prioridad Media 🟡**
4. Actualizar `imagenRenderer` para miniatura circular 64x64
5. Aumentar tamaño icono validador
6. Agregar placeholder para imágenes faltantes
7. Implementar toast de confirmación (en lugar de alertas modales)
8. Integrar componente calendario visual (ngx-bootstrap datepicker)
9. Ajustar CSS de modales según mockups

#### **Prioridad Baja 🟢**
10. Migrar de ag-grid a layout de cards Bootstrap (opcional, mejora visual)
11. Mostrar advertencia en modal de fecha si canal tiene atributos incompletos

**Archivos a modificar:**
- `buscar-referencia.component.ts` + `.html` + `.css`
- `detalle-validacion.component.ts` + `.html` + `.css`
- `modal-atributos-referencia.component.ts` + `.html` + `.css`
- `modal-fecha-lanzamiento-referencia.component.ts` + `.html` + `.css`
- `validador-referencia.service.ts`
- `imagen-renderer.component.ts` + `.html` + `.css`
- `caritas-renderer.component.ts`

---

## 📝 Checklist de Tareas (TODO List con Estados)

### **Fase 1: Análisis y Validación (Completado)**
- [x] **1.1** Revisar código existente del módulo 'Buscar por referencia'
- [x] **1.2** Evaluar cumplimiento de criterios funcionales
- [x] **1.3** Identificar discrepancias entre spec y código actual
- [x] **1.4** Crear matriz de cumplimiento funcional

---

### **Fase 2: Backend - Correcciones Críticas**
- [ ] **2.1** Validar queries SQL con `LOWER()` y `TRIM()` en búsqueda
  - **Archivo:** `ReferenciaService.java` o repositorio JPA
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **2.2** Crear/actualizar endpoint unificado POST /fecha-lanzamiento
  - **Archivo:** `ReferenciasController.java`
  - **DTO esperado:** `{ date: 'yyyy-MM-dd', channels: ['IC','VN'] }`
  - **Estimación:** 2 hrs
  - **Estado:** ⏳ Pendiente

- [ ] **2.3** Validar respuesta de GET /{id}/atributos
  - **Archivo:** `ReferenciasController.java`
  - **Verificar:** estructura con `attributes[]` y `channels[{ok, missingAttributes}]`
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

---

### **Fase 3: Frontend - Normalización de Datos**
- [ ] **3.1** Agregar `.toLowerCase()` en normalización de referencias
  - **Archivo:** `buscar-referencia.component.ts` (línea ~96)
  - **Código:**
    ```typescript
    .map(ref => ref.trim().toLowerCase())
    ```
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

- [ ] **3.2** Actualizar DTO de asignación de fecha
  - **Archivo:** `asignacion-fecha-lanzamiento-dto.ts`
  - **Cambio:** `fecha: string` (formato 'yyyy-MM-dd')
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

- [ ] **3.3** Actualizar método asignarFechaLanzamiento() en servicio
  - **Archivo:** `validador-referencia.service.ts`
  - **Endpoint:** POST `/commerce/referencia/{id}/fecha-lanzamiento`
  - **Body:** `{ fecha: 'yyyy-MM-dd', canales: ['IC','VN'] }`
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **3.4** Formatear fecha antes de enviar al backend
  - **Archivo:** `modal-fecha-lanzamiento-referencia.component.ts`
  - **Método:** `asignarFecha()`
  - **Usar:** `moment(this.fechaSeleccionada).format('YYYY-MM-DD')`
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

---

### **Fase 4: Frontend - Mejoras Visuales Top Bar**
- [ ] **4.1** Reorganizar layout: campos en una fila horizontal
  - **Archivo:** `buscar-referencia.component.html`
  - **Cambio:** Sacar campos de accordion, usar `.row > .col-sm-X`
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **4.2** Cambiar estilo botón "Asignar fecha de lanzamiento"
  - **Archivo:** `buscar-referencia.component.html`
  - **Clase:** `btn-outline-secondary` (blanco con borde)
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

---

### **Fase 5: Frontend - Mejoras Visuales Lista de Resultados**
- [ ] **5.1** Actualizar imagenRenderer: miniatura circular 64x64
  - **Archivo:** `imagen-renderer.component.ts` + `.css`
  - **CSS:** `border-radius: 50%; width: 64px; height: 64px; object-fit: cover;`
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **5.2** Agregar placeholder para imágenes faltantes
  - **Archivo:** `imagen-renderer.component.html`
  - **Placeholder:** Icono fa-image o imagen por defecto
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **5.3** Aumentar tamaño icono validador (caritasRenderer)
  - **Archivo:** `caritas-renderer.component.ts` + `.css`
  - **CSS:** `font-size: 32px;` o mayor
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

- [ ] **5.4** Aplicar negrita al código de referencia
  - **Archivo:** `detalle-validacion.component.ts` (columnDefs)
  - **Opción 1:** `cellStyle: { 'font-weight': 'bold' }`
  - **Opción 2:** CSS en `.ag-cell` para columna código
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

- [ ] **5.5** (Opcional) Migrar ag-grid a cards Bootstrap
  - **Archivo:** `detalle-validacion.component.html` + `.css`
  - **Cambio:** Reemplazar `<ag-grid-angular>` por `<div class="card-list">`
  - **Estimación:** 4 hrs
  - **Prioridad:** 🟢 Baja
  - **Estado:** ⏳ Pendiente

---

### **Fase 6: Frontend - Modal de Atributos**
- [ ] **6.1** Revisar tooltips en badges de canales
  - **Archivo:** `modal-atributos-referencia.component.html`
  - **Verificar:** `[tooltip]="obtenerTooltipCanal(canal)"` funciona correctamente
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **6.2** Actualizar CSS badges de canales (rectangulares, rojos si faltantes)
  - **Archivo:** `modal-atributos-referencia.component.css`
  - **Clases:** `.canal-badge`, `.canal-error`
  - **Estilo:** `border: 2px solid red; border-radius: 4px;`
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **6.3** Aplicar sombra al modal (card con sombra)
  - **Archivo:** `modal-atributos-referencia.component.css`
  - **CSS:** `.modal-content { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }`
  - **Estimación:** 15 min
  - **Estado:** ⏳ Pendiente

---

### **Fase 7: Frontend - Modal de Fecha de Lanzamiento**
- [ ] **7.1** Integrar componente calendario visual (ngx-bootstrap datepicker)
  - **Archivo:** `modal-fecha-lanzamiento-referencia.component.html`
  - **Componente:** `<input type="text" bsDatepicker>`
  - **Estimación:** 2 hrs
  - **Estado:** ⏳ Pendiente

- [ ] **7.2** Layout de canales en fila horizontal
  - **Archivo:** `modal-fecha-lanzamiento-referencia.component.html` + `.css`
  - **CSS:** `.canales-list { display: flex; flex-wrap: wrap; gap: 10px; }`
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **7.3** Implementar toast verde de confirmación
  - **Archivo:** `modal-fecha-lanzamiento-referencia.component.ts`
  - **Librería:** `ngx-toastr` o `ngx-bootstrap/toast`
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **7.4** (Opcional) Mostrar advertencia si canal tiene atributos incompletos
  - **Archivo:** `modal-fecha-lanzamiento-referencia.component.html`
  - **Lógica:** Cruzar canales seleccionados con canales en rojo de atributos
  - **Estimación:** 1 hr
  - **Prioridad:** 🟢 Baja
  - **Estado:** ⏳ Pendiente

---

### **Fase 8: Testing - Verificación de Criterios de Aceptación**
- [ ] **8.1** Testing Criterio 1: Búsqueda por referencia
  - **Given:** Pantalla "Buscar por referencia"
  - **When:** Ingreso referencia (con espacios/mayúsculas) y click Consultar
  - **Then:** Llama GET /api/references, pinta lista, mensaje si no hay resultados
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **8.2** Testing Criterio 2: Visualización de fila
  - **Given:** Resultado devuelto por backend
  - **When:** Se renderiza fila
  - **Then:** Muestra checkbox, imagen (o placeholder), código, nombre, icono validador según isValid
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **8.3** Testing Criterio 3: Modal de atributos
  - **Given:** Lista visible, click en icono validador
  - **When:** Abre modal
  - **Then:** Título dinámico, lista de atributos con checks, canales con badges (rojos + tooltip si faltantes)
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **8.4** Testing Criterio 4: Asignar fecha de lanzamiento
  - **Given:** Click en "Asignar fecha de lanzamiento"
  - **When:** Abre modal, selecciona fecha y canales, click Asignar
  - **Then:** Valida, llama POST, muestra toast verde, actualiza listado
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

---

### **Fase 9: Documentación**
- [ ] **9.1** Actualizar README.md con nuevos endpoints
  - **Archivo:** `README.md` en raíz de proyecto
  - **Contenido:** Documentar GET /api/references, POST /fecha-lanzamiento
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

- [ ] **9.2** Crear/actualizar diagramas de flujo
  - **Herramienta:** Draw.io, PlantUML o similar
  - **Diagramas:** Flujo de búsqueda, flujo de asignación de fecha
  - **Estimación:** 1 hr
  - **Estado:** ⏳ Pendiente

- [ ] **9.3** Documentar cambios en CHANGELOG.md
  - **Archivo:** `CHANGELOG.md` (crear si no existe)
  - **Versión:** v3.1.1 o v3.2.0 según impacto de cambios
  - **Estimación:** 30 min
  - **Estado:** ⏳ Pendiente

---

## ⏱️ Estimación Total de Esfuerzo

| Fase | Tareas | Horas Estimadas | Prioridad |
|------|--------|-----------------|-----------|
| **Fase 1: Análisis** | 4 | ✅ 4 hrs | Completado |
| **Fase 2: Backend** | 3 | 3.5 hrs | 🔴 Alta |
| **Fase 3: Frontend - Datos** | 4 | 2.5 hrs | 🔴 Alta |
| **Fase 4: Frontend - Top Bar** | 2 | 1.25 hrs | 🔴 Alta |
| **Fase 5: Frontend - Lista** | 5 | 5.5 hrs | 🟡 Media |
| **Fase 6: Frontend - Modal Atributos** | 3 | 1.75 hrs | 🟡 Media |
| **Fase 7: Frontend - Modal Fecha** | 4 | 4 hrs | 🟡 Media |
| **Fase 8: Testing** | 4 | 3.5 hrs | 🟡 Media |
| **Fase 9: Documentación** | 3 | 2 hrs | 🟢 Baja |
| **TOTAL** | **32** | **28 hrs** | |

**Distribución por prioridad:**
- 🔴 **Alta:** 11.25 hrs (40%)
- 🟡 **Media:** 14.75 hrs (53%)
- 🟢 **Baja:** 2 hrs (7%)

---

## 🚀 Estrategia de Implementación

### **Sprint 1: Correcciones Críticas (Semana 1)**
**Duración:** 2-3 días  
**Foco:** Backend + Normalización de datos

**Tareas:**
- ✅ Fase 2: Backend - Correcciones críticas
- ✅ Fase 3: Frontend - Normalización de datos
- ✅ Fase 4: Frontend - Top Bar

**Objetivo:** Asegurar que la funcionalidad core cumpla con requisitos técnicos.

---

### **Sprint 2: Mejoras Visuales (Semana 2)**
**Duración:** 3-4 días  
**Foco:** UI/UX según mockups

**Tareas:**
- ✅ Fase 5: Frontend - Lista de resultados
- ✅ Fase 6: Frontend - Modal de atributos
- ✅ Fase 7: Frontend - Modal de fecha

**Objetivo:** Alinear la interfaz con los mockups especificados.

---

### **Sprint 3: Testing y Documentación (Semana 3)**
**Duración:** 2 días  
**Foco:** Validación y cierre

**Tareas:**
- ✅ Fase 8: Testing - Verificación de criterios
- ✅ Fase 9: Documentación

**Objetivo:** Certificar que todos los criterios de aceptación se cumplen.

---

## 📌 Reglas de Negocio Validadas

✅ **Validado en código actual:**

1. ✅ El módulo no permite crear o recargar referencias (solo consulta/validación)
   - **Componente:** `buscar-referencia.component.ts` - No tiene métodos de creación
   - **UI:** No hay botones de crear/recargar en interfaz

2. ✅ El validador proviene del backend (reglas centralizadas)
   - **Backend:** `ValidadorReferenciaService.java` con lógica SQL
   - **Frontend:** Renderiza `isValid` recibido del backend

3. ⚠️ Asignación de fecha solo aplica a canales de la marca seleccionada
   - **Componente:** `modal-fecha-lanzamiento-referencia.component.ts`
   - **Servicio:** `marketplaceService.obtenerMarketPlaces()`
   - **⚠️ VERIFICAR:** Si el servicio filtra por marca o retorna todos los canales

4. ✅ Canales con atributos incompletos se visualizan en rojo
   - **Modal Atributos:** Clase `canal-error` aplicada cuando `canal.ok === false`
   - **Tooltip:** Muestra `atributosFaltantes` al hacer hover

---

## 🔍 Puntos de Atención

### **🔴 Crítico**
1. **Discrepancia en contrato de asignación de fecha**
   - Backend espera `List<ReferenciaVtexDto>` + params
   - Spec requiere `{ date, channels[] }` en body
   - **Acción:** Unificar contrato o documentar razón de discrepancia

2. **Normalización de referencias incompleta**
   - Falta `.toLowerCase()` en frontend
   - No validado si backend aplica `LOWER()` en queries
   - **Acción:** Implementar en ambas capas

### **🟡 Importante**
3. **Layout no cumple mockups**
   - Top bar no es horizontal en una fila
   - Lista no es "cards horizontales compactas"
   - Botón "Asignar fecha" es rojo (debe ser blanco con borde)
   - **Acción:** Refactorizar HTML/CSS según especificación

4. **Calendario no es visual**
   - Usa `<input type="date">` nativo (no calendario interactivo)
   - **Acción:** Integrar `ngx-bootstrap/datepicker`

### **🟢 Mejoras opcionales**
5. **Toast vs Alerta modal**
   - Actualmente usa `alertaService.mostrar()` (modal)
   - Spec sugiere "toast verde"
   - **Acción:** Integrar `ngx-toastr` para mejor UX

---

## ✅ Conclusiones

### **Estado General:** Funcional pero requiere refactorización

**Fortalezas:**
- ✅ Arquitectura bien estructurada (componentes modulares, servicios separados)
- ✅ DTOs correctamente definidos
- ✅ Integración frontend-backend funcional
- ✅ Validaciones de negocio implementadas

**Debilidades:**
- ⚠️ Discrepancia entre spec y código en contratos de API
- ⚠️ Layout visual no cumple mockups
- ⚠️ Normalización de datos incompleta
- ⚠️ Componentes UI básicos (no calendario visual, no toasts)

**Recomendación:** 
Proceder con refactorización incremental siguiendo los sprints propuestos, priorizando las correcciones críticas del backend y la normalización de datos antes de abordar las mejoras visuales.

---

## 📞 Contacto y Soporte

**Autor del plan:** GitHub Copilot  
**Fecha:** 21 de noviembre de 2025  
**Versión del plan:** 1.0  
**Próxima revisión:** Después de Sprint 1

---

**Última actualización:** 2025-11-21
