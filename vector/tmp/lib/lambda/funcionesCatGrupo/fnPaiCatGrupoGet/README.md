# Lambda Function: fnPaiCatGrupoGet

## Descripción
Esta función Lambda maneja las peticiones GET para obtener un registro específico del catálogo de grupos.

## Funcionalidades
- ✅ Validación de autenticación JWT mediante Cognito
- ✅ Validación de parámetros de entrada
- ✅ Consulta a DynamoDB usando claves primarias
- ✅ Manejo centralizado de errores
- ✅ Logging de auditoría
- ✅ Respuestas HTTP estandarizadas

## Parámetros
- **Path Parameters**: `{id}` - ID del grupo a consultar
- **Headers**: `Authentication` - Token JWT de Cognito

## Respuestas
- **200**: Registro encontrado exitosamente
- **404**: Registro no encontrado
- **401**: Token inválido o no autorizado
- **400**: Parámetros inválidos
- **500**: Error interno del servidor

## Ejemplo de uso
```
GET /grupo/123
Headers:
  Authentication: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Estructura de respuesta exitosa
```json
{
  "statusCode": 200,
  "data": {
    "id_grupo": 123,
    "descripcion": "Grupo de ejemplo",
    "item_type": "RK_PAI_CAT_GRUPO_DEV",
    "created_at": "2025-06-02T12:00:00.000Z",
    "updated_at": "2025-06-02T12:00:00.000Z"
  },
  "message": "Catálogo de grupo obtenido exitosamente"
}
```
