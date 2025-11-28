# Lambda Function: fnPaiCatGrupoPost

## Descripción
Esta función Lambda maneja las peticiones POST para crear nuevos registros en el catálogo de grupos.

## Funcionalidades
- ✅ Validación de autenticación JWT mediante Cognito
- ✅ Validación y sanitización de datos de entrada
- ✅ Inserción en DynamoDB con prevención de duplicados
- ✅ Manejo centralizado de errores
- ✅ Logging de auditoría
- ✅ Respuestas HTTP estandarizadas

## Parámetros
- **Body**: JSON con los datos del grupo
- **Headers**: `Authentication` - Token JWT de Cognito

## Estructura del Body
```json
{
  "id_grupo": 123,
  "descripcion": "Descripción del grupo"
}
```

## Validaciones
- `id_grupo`: Número entero positivo (requerido)
- `descripcion`: Cadena de texto, máximo 255 caracteres, sin caracteres especiales (requerido)

## Respuestas
- **201**: Registro creado exitosamente
- **409**: Registro ya existe
- **401**: Token inválido o no autorizado
- **400**: Datos inválidos
- **500**: Error interno del servidor

## Ejemplo de uso
```
POST /grupo
Headers:
  Authentication: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json

Body:
{
  "id_grupo": 123,
  "descripcion": "Nuevo grupo de trabajo"
}
```

## Estructura de respuesta exitosa
```json
{
  "statusCode": 201,
  "data": {
    "id_grupo": 123,
    "descripcion": "Nuevo grupo de trabajo",
    "item_type": "RK_PAI_CAT_GRUPO_DEV",
    "created_at": "2025-06-02T12:00:00.000Z"
  },
  "message": "Catálogo de grupo creado exitosamente"
}
```
