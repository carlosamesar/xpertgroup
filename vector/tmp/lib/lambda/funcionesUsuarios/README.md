# API de Usuarios PAI

## Descripción
API RESTful para la gestión de usuarios de la aplicación PAI. Implementa autenticación JWT con AWS Cognito y operaciones CRUD completas sobre la tabla `RK_PAI_USUARIO_DEV`.

## Arquitectura

### Estructura de Directorios
```
lib/lambda/funcionesUsuarios/
├── fnPaiUsuarioGet/          # Función GET - Obtener usuario(s)
├── fnPaiUsuarioPost/         # Función POST - Crear nuevo usuario
├── fnPaiUsuarioPut/          # Función PUT - Actualizar usuario
├── fnPaiUsuarioDelete/       # Función DELETE - Eliminar usuario
└── utils/                    # Utilidades compartidas
    ├── auth-validator.mjs    # Validación JWT con Cognito
    ├── validation-utils.mjs  # Validación de datos de entrada
    └── response-utils.mjs    # Formateo de respuestas
```

## Endpoints

### Base URL
- **Desarrollo**: `https://api-dev.dominio.com/usuarios`
- **Producción**: `https://api-prod.dominio.com/usuarios`

### Autenticación
Todas las operaciones requieren un token JWT válido en el header `Authentication`:
```
Authentication: Bearer <jwt_token>
```

### 1. GET /usuarios
Obtiene información de usuarios.

**Query Parameters:**
- `id_usuario` (opcional): ID específico del usuario
- Sin parámetros: Retorna todos los usuarios activos

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": [
    {
      "id_usuario": "USR001",
      "email": "usuario@ejemplo.com",
      "nombre": "Juan Pérez",
      "fec_act": "2025-06-03T10:30:00Z",
      "estado": "activo",
      "device_name": "iPhone 14",
      "device_model": "iPhone14,3",
      "device_type": "mobile",
      "os_name": "iOS",
      "os_version": "17.0"
    }
  ],
  "message": "Usuarios obtenidos exitosamente"
}
```

### 2. POST /usuarios
Crea un nuevo usuario.

**Cuerpo de la petición:**
```json
{
  "id_usuario": "USR002",
  "email": "nuevo@ejemplo.com",
  "nombre": "María García",
  "cognito_sub": "sub_cognito_123",
  "device_name": "Samsung Galaxy S23",
  "device_model": "SM-S911B",
  "device_type": "mobile",
  "os_name": "Android",
  "os_version": "14.0",
  "estado": "activo"
}
```

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "data": {
    "id_usuario": "USR002",
    "email": "nuevo@ejemplo.com",
    "nombre": "María García"
  },
  "message": "Usuario creado exitosamente"
}
```

### 3. PUT /usuarios
Actualiza un usuario existente.

**Cuerpo de la petición:**
```json
{
  "id_usuario": "USR002",
  "nombre": "María García Rodríguez",
  "device_name": "Samsung Galaxy S24",
  "estado": "inactivo"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "data": {
    "id_usuario": "USR002",
    "nombre": "María García Rodríguez",
    "device_name": "Samsung Galaxy S24",
    "estado": "inactivo"
  },
  "message": "Usuario actualizado exitosamente"
}
```

### 4. DELETE /usuarios
Elimina un usuario (soft delete).

**Query Parameters:**
- `id_usuario` (requerido): ID del usuario a eliminar

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

## Estructura de Datos

### Tabla RK_PAI_USUARIO_DEV
```
PK: USUARIO#{id_usuario}#METADATA
SK: USUARIO#{id_usuario}#METADATA

Atributos:
- id_usuario: string (PK)
- email: string (único)
- nombre: string
- cognito_sub: string (no expuesto en API)
- device_name: string
- device_model: string
- device_type: string
- os_name: string
- os_version: string
- fec_act: string (ISO 8601)
- cod_act: string (no expuesto en API)
- estado: string ('activo' | 'inactivo')
```

## Validaciones

### Campos Requeridos
- `id_usuario`: Alfanumérico, 3-50 caracteres
- `email`: Formato de email válido
- `nombre`: String, 2-100 caracteres

### Campos Opcionales
- `device_name`: String, hasta 100 caracteres
- `device_model`: String, hasta 50 caracteres
- `device_type`: String, hasta 20 caracteres
- `os_name`: String, hasta 20 caracteres
- `os_version`: String, hasta 20 caracteres
- `estado`: 'activo' o 'inactivo' (default: 'activo')

## Seguridad

### Autenticación JWT
- Validación con AWS Cognito User Pools
- Verificación de signature y expiración
- Support para headers `Authentication` y `Authorization`

### Sanitización de Datos
Los siguientes campos son removidos de las respuestas por seguridad:
- `cognito_sub`
- `cod_act`

### CORS
Configurado para permitir:
- Todos los orígenes en desarrollo
- Headers: `Content-Type`, `Authorization`, `Authentication`, etc.
- Métodos: GET, POST, PUT, DELETE, OPTIONS

## Códigos de Error

### 400 - Bad Request
```json
{
  "success": false,
  "error": "Datos de entrada inválidos",
  "details": "El campo email es requerido"
}
```

### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Token JWT inválido o faltante"
}
```

### 404 - Not Found
```json
{
  "success": false,
  "error": "Usuario no encontrado"
}
```

### 409 - Conflict
```json
{
  "success": false,
  "error": "El usuario ya existe"
}
```

### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Error interno del servidor"
}
```

## Deployment

### Requisitos
- AWS CDK v2
- Node.js 20.x
- Layer `aws-jwt-verify` construido

### Comandos
```bash
# Construir el proyecto
npm run build

# Desplegar a desarrollo
cdk deploy --profile dev

# Desplegar a producción
cdk deploy --profile prod
```

### Variables de Entorno
Las funciones Lambda reciben automáticamente:
- `TABLE_NAME`: Nombre de la tabla DynamoDB
- `USER_POOL_ID`: ID del Cognito User Pool
- `AWS_REGION`: Región de AWS

## Testing

### Postman Collection
Incluye ejemplos de todas las operaciones con diferentes escenarios:
- Usuarios válidos e inválidos
- Tokens JWT de prueba
- Casos de error

### Unit Tests
```bash
npm test
```

## Monitoreo

### CloudWatch Logs
Cada función Lambda genera logs estructurados con:
- Request ID
- Timestamp
- Nivel de log (INFO, WARN, ERROR)
- Contexto de la operación

### Métricas
- Latencia de respuesta
- Errores por función
- Uso de memoria
- Concurrent executions

## Changelog

### v1.0.0 - 2025-06-03
- Implementación inicial de CRUD completo
- Integración con Cognito JWT
- Validaciones de entrada
- Sanitización de respuestas
- Documentación completa
