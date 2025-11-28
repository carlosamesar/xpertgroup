# Contrato Lambda Functions

Este módulo contiene las funciones Lambda para gestionar contratos en el sistema PAI.

## Tabla: RK_PAI_CONTRATO_DEV

### Estructura de Claves Primarias
- **PK**: `CAT_CONTRATO#{id_empresa}` - Clave de partición basada en ID de empresa
- **SK**: `METADATA` - Clave de ordenamiento fija

### Estructura GSI7 (Consultas por origen y contrato)
- **gsi7pk**: `ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato}` - Consulta por origen y contrato
- **gsi7sk**: `{_pk}` - Referencia a la clave primaria

### Atributos
- `id_empresa` (varint): Identificador de empresa (usado en _pk)
- `id_contrato` (varint): Identificador del contrato
- `id_origen` (varint): Identificador del origen
- `descripcion` (varchar): Descripción del contrato
- `item_type` (varchar): Tipo de item (default: "RK_PAI_CAT_CONTRATO_DEV")
- `fecha_creacion` (string): Timestamp de creación (formato ISO)
- `fecha_actualizacion` (string): Timestamp de última actualización (formato ISO)

## Funciones Lambda

### 1. fnPaiContratoGet
**Propósito**: Recuperar contratos

**Endpoints**:
- `GET /contrato` - Obtener todos los contratos (con paginación)
- `GET /contrato/{id_empresa}` - Obtener contrato específico por empresa
- `GET /contrato?id_origen={id_origen}` - Obtener contratos por origen (usa GSI7)

**Parámetros de Consulta**:
- `limit` (opcional): Número de items a retornar (default: 50, max: 100)
- `lastEvaluatedKey` (opcional): Para paginación
- `id_origen` (opcional): Filtrar por ID de origen

### 2. fnPaiContratoPost
**Propósito**: Crear nuevos contratos

**Endpoint**: `POST /contrato`

**Cuerpo de Petición**:
```json
{
  "id_empresa": 123,
  "id_contrato": 456,
  "id_origen": 789,
  "descripcion": "Descripción del contrato"
}
```

### 3. fnPaiContratoPut
**Propósito**: Actualizar contratos existentes

**Endpoint**: `PUT /contrato/{id_empresa}`

**Cuerpo de Petición** (actualización parcial soportada):
```json
{
  "id_contrato": 456,
  "id_origen": 789,
  "descripcion": "Nueva descripción"
}
```

### 4. fnPaiContratoDelete
**Propósito**: Eliminar contratos

**Endpoint**: `DELETE /contrato/{id_empresa}`

**Nota**: Solo usuarios con rol 'admin' pueden eliminar contratos.

## Autenticación

Todos los endpoints requieren autenticación JWT vía Cognito:
- Header: `Authentication: Bearer <jwt_token>`
- El token es validado contra el User Pool de Cognito configurado

## Validación

### Validación de Entrada
- Todos los campos requeridos son validados por presencia y formato
- Los campos numéricos deben ser enteros positivos
- La descripción tiene límite de 500 caracteres
- Se sanitizan caracteres peligrosos para prevenir XSS

### Generación de Claves
- PK: `CAT_CONTRATO#{id_empresa}`
- SK: `METADATA`
- GSI7PK: `ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato}`
- GSI7SK: `{_pk}`

## Manejo de Errores

Códigos de estado HTTP estándar:
- `200` - Éxito
- `201` - Creado
- `400` - Petición Incorrecta (errores de validación)
- `401` - No Autorizado (token inválido/faltante)
- `404` - No Encontrado
- `409` - Conflicto (item ya existe)
- `500` - Error Interno del Servidor

## Ejemplos de Uso

### Crear Contrato
```bash
POST /contrato
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "id_empresa": 123,
  "id_contrato": 456,
  "id_origen": 789,
  "descripcion": "Contrato de servicios profesionales"
}
```

### Obtener Contrato Específico
```bash
GET /contrato/123
Authorization: Bearer <jwt_token>
```

### Obtener Contratos por Origen
```bash
GET /contrato?id_origen=789
Authorization: Bearer <jwt_token>
```

### Actualizar Contrato
```bash
PUT /contrato/123
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "descripcion": "Descripción actualizada del contrato"
}
```

### Eliminar Contrato (Solo Admin)
```bash
DELETE /contrato/123
Authorization: Bearer <jwt_token>
```

## Arquitectura

Las funciones siguen principios de Clean Code con:
- **Separación de Responsabilidades**: Autenticación, validación y lógica de negocio separadas
- **Módulos de Utilidad**: Utilidades reutilizables para auth, validación y respuestas
- **Manejo de Errores**: Manejo comprensivo de errores con códigos HTTP apropiados
- **Validación de Entrada**: Validación estricta de todas las entradas
- **Seguridad**: Validación de token JWT para todas las operaciones

## Dependencias

- `@aws-sdk/client-dynamodb` - Operaciones DynamoDB
- `@aws-sdk/lib-dynamodb` - Utilidades DynamoDB
- `aws-jwt-verify` - Verificación JWT de Cognito
- Variables de entorno para nombre de tabla y configuración del user pool

## Configuración de Variables de Entorno

- `TABLE_NAME`: Nombre de la tabla DynamoDB
- `COGNITO_USER_POOL_ID`: ID del User Pool de Cognito
- `COGNITO_CLIENT_ID`: ID del cliente de Cognito
- `NODE_ENV`: Entorno de ejecución (development/production)

## Permisos IAM Requeridos

- DynamoDB:
  - `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`
  - `Scan`, `Query` (para GSI7)
- Cognito:
  - Acceso de lectura al User Pool (implícito en JWT verification)

## Índices DynamoDB

- **GSI7**: Índice secundario global para consultas por origen y contrato
  - PK: `gsi7pk` (ORIGEN#{id_origen}#ID_CONTRATO#{id_contrato})
  - SK: `gsi7sk` (referencia a _pk)

La implementación proporciona una API REST completa para la gestión de contratos con seguridad, validación y manejo de errores de nivel empresarial.
