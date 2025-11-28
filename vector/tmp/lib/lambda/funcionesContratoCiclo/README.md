# Funciones Lambda para Gestión de Contrato Ciclo

Este directorio contiene las funciones Lambda para la gestión de la entidad `RK_PAI_CONTRATO_CICLO_DEV` en el sistema PAI.

## Estructura del Proyecto

```
funcionesContratoCiclo/
├── utils/                              # Utilidades compartidas
│   ├── auth-validator.mjs             # Validación JWT con Cognito
│   ├── validation-utils.mjs           # Validación de datos de entrada
│   └── response-utils.mjs             # Utilidades para respuestas HTTP
├── fnPaiContratoCicloGet/             # Función GET - Consultar
│   └── index.mjs
├── fnPaiContratoCicloPost/            # Función POST - Crear
│   └── index.mjs
├── fnPaiContratoCicloPut/             # Función PUT - Actualizar
│   └── index.mjs
├── fnPaiContratoCicloDelete/          # Función DELETE - Eliminar
│   └── index.mjs
├── test-examples.mjs                  # Ejemplos de prueba
└── README.md                          # Este archivo
```

## Descripción de la Entidad

La entidad `RK_PAI_CONTRATO_CICLO_DEV` representa la relación entre contratos y ciclos en el sistema, con la siguiente estructura:

### Campos Principales
- `id_ciclo` (string, requerido): Identificador único del ciclo
- `id_contrato` (string, requerido): Identificador del contrato asociado
- `id_origen` (string, requerido): Identificador del origen
- `activo` (boolean, requerido): Estado activo/inactivo del ciclo
- `descripcion` (string, opcional): Descripción del ciclo

### Estructura DynamoDB
- **PK (Partition Key)**: `CAT_CONTRATO_CICLO#{id_ciclo}`
- **SK (Sort Key)**: `METADATA`
- **GSI8**: 
  - **PK**: `ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato}`
  - **SK**: `{PK del ítem principal}`

## Funcionalidades Implementadas

### 1. GET - Consultar Contratos Ciclo
**Endpoint**: `GET /contrato-ciclo` y `GET /contrato-ciclo/{id_ciclo}`

#### Casos de uso:
- **Obtener todos los ciclos**: `GET /contrato-ciclo`
- **Obtener ciclo específico**: `GET /contrato-ciclo/{id_ciclo}`
- **Filtrar por origen y contrato**: `GET /contrato-ciclo?id_origen=XXX&id_contrato=YYY`

#### Parámetros de consulta:
- `limit`: Número máximo de resultados (default: 50, max: 100)
- `lastEvaluatedKey`: Para paginación
- `id_origen`: Filtrar por origen (usado con GSI8)
- `id_contrato`: Filtrar por contrato (usado con GSI8)

### 2. POST - Crear Contrato Ciclo
**Endpoint**: `POST /contrato-ciclo`

#### Cuerpo de la petición:
```json
{
  "id_ciclo": "CICLO_001",
  "id_contrato": "CONT_001", 
  "id_origen": "ORG_001",
  "activo": true,
  "descripcion": "Descripción del ciclo"
}
```

#### Validaciones:
- Todos los campos requeridos deben estar presentes
- `activo` debe ser un valor boolean válido
- No se permite crear duplicados (validación por PK)

### 3. PUT - Actualizar Contrato Ciclo
**Endpoint**: `PUT /contrato-ciclo/{id_ciclo}`

#### Características:
- Actualización parcial (solo campos enviados)
- Validación de existencia previa
- Actualización automática de GSI8 si cambian `id_origen` o `id_contrato`
- Tracking de usuario que realiza la actualización

### 4. DELETE - Eliminar Contrato Ciclo
**Endpoint**: `DELETE /contrato-ciclo/{id_ciclo}`

#### Características:
- Validación de existencia antes de eliminar
- Eliminación segura con confirmación
- Log de actividad para auditoría

## Características Técnicas

### Autenticación y Autorización
- **JWT Validation**: Integración con Cognito User Pool
- **Header requerido**: `Authentication: Bearer <token>`
- **Singleton Pattern**: Validador de autenticación optimizado

### Validación de Datos
- Validación exhaustiva de tipos de datos
- Validación específica para campos boolean
- Mensajes de error descriptivos
- Validación de campos requeridos vs opcionales

### Gestión de Errores
- Manejo de errores de DynamoDB (ConditionalCheckFailedException, etc.)
- Respuestas HTTP estandarizadas
- CORS habilitado en todas las respuestas
- Logging estructurado para debugging

### Optimizaciones
- Uso de GSI8 para consultas eficientes por origen y contrato
- Proyección de atributos optimizada
- Paginación para grandes conjuntos de datos
- Cacheo de validador JWT (singleton)

## Configuración de Variables de Entorno

Las siguientes variables de entorno son requeridas:

```bash
DYNAMODB_TABLE_NAME=RK_PAI_SINGLE_TABLE_DEV
USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_REGION=us-east-1
```

## Uso de las Funciones

### Ejemplo de Consulta GET
```javascript
// Obtener todos los ciclos
const response = await fetch('/contrato-ciclo', {
  headers: {
    'Authentication': 'Bearer <jwt-token>',
    'Content-Type': 'application/json'
  }
});

// Obtener ciclo específico
const response = await fetch('/contrato-ciclo/CICLO_001', {
  headers: {
    'Authentication': 'Bearer <jwt-token>',
    'Content-Type': 'application/json'
  }
});
```

### Ejemplo de Creación POST
```javascript
const response = await fetch('/contrato-ciclo', {
  method: 'POST',
  headers: {
    'Authentication': 'Bearer <jwt-token>',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id_ciclo: 'CICLO_002',
    id_contrato: 'CONT_001',
    id_origen: 'ORG_001',
    activo: true,
    descripcion: 'Nuevo ciclo trimestral'
  })
});
```

## Testing

### Ejecutar Pruebas de Ejemplo
```javascript
import { runCompleteTestSuite } from './test-examples.mjs';
await runCompleteTestSuite();
```

### Casos de Prueba Incluidos
- ✅ GET - Obtener todos los ciclos
- ✅ GET - Obtener ciclo específico  
- ✅ GET - Filtrar por origen y contrato
- ✅ POST - Crear nuevo ciclo
- ✅ PUT - Actualizar ciclo existente
- ✅ DELETE - Eliminar ciclo
- ✅ Validación de datos inválidos
- ✅ Manejo de errores de autenticación

## Patrones de Código Limpio Implementados

### 1. Separación de Responsabilidades
- **Validación**: Módulo separado (`validation-utils.mjs`)
- **Autenticación**: Módulo separado (`auth-validator.mjs`)
- **Respuestas**: Utilidades estandarizadas (`response-utils.mjs`)

### 2. Reutilización de Código
- Utilidades compartidas entre todas las funciones
- Patrones consistentes de manejo de errores
- Estructura de respuesta estandarizada

### 3. Configurabilidad
- Variables de entorno para configuración
- Límites configurables en consultas
- Logging configurable

### 4. Mantenibilidad
- Código autodocumentado con comentarios JSDoc
- Estructura modular y escalable
- Patrones consistentes en todas las funciones

## Integración con CDK

Las funciones están completamente integradas con AWS CDK mediante la clase `ApiContratoCiclo`:

- **API Gateway**: Configuración RESTful completa
- **Permisos**: IAM roles y políticas optimizadas
- **CORS**: Configuración completa para aplicaciones web
- **Throttling**: Límites de velocidad configurados
- **API Keys**: Gestión de claves de API

## Monitoreo y Observabilidad

- **CloudWatch Logs**: Logging estructurado en todas las funciones
- **Error Tracking**: Captura y registro de errores detallados
- **Performance Metrics**: Métricas de rendimiento automáticas
- **Tracing**: Información de debugging para cada operación

## Consideraciones de Seguridad

- **Autenticación requerida**: Todas las operaciones requieren JWT válido
- **Validación de entrada**: Sanitización de todos los datos de entrada
- **Principle of Least Privilege**: Permisos mínimos necesarios
- **Error Information Disclosure**: Mensajes de error no exponen información sensible

---

**Nota**: Este README documenta la implementación completa de las funciones Lambda para gestión de Contrato Ciclo, siguiendo las mejores prácticas de AWS Lambda y Clean Code.
