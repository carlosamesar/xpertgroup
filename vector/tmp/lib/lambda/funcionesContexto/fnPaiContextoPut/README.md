# Lambda: fnPaiContextoPut - Validación de JWT Cognito

Esta Lambda valida tokens JWT emitidos por AWS Cognito, permitiendo proteger endpoints o funcionar como un autorizador personalizado para API Gateway.

---

## Estructura del Proyecto

```
lib/
  lambda/
    funcionesContexto/
      fnPaiContextoPut/
        index.mjs
        README.md (este archivo)
```

---

## ¿Qué hace esta Lambda?
- Valida tokens JWT (Access o ID Token) generados por Cognito.
- Permite proteger endpoints o servir como autorizador Lambda en API Gateway.
- Devuelve información del usuario si el token es válido.
- Responde con error 401 si el token es inválido o está expirado.

---

## Variables de entorno necesarias

Debes definir las siguientes variables de entorno en la configuración de la Lambda:

- `COGNITO_USER_POOL_ID`   → ID del User Pool de Cognito (ej: `us-east-1_XXXXXXXXX`)
- `COGNITO_CLIENT_ID`      → App Client ID de Cognito
- `COGNITO_REGION`         → Región AWS donde está el User Pool (ej: `us-east-1`)
- `TOKEN_USE`              → (opcional) "access" o "id" (por defecto: "access")

Ejemplo en `.env_dev`:
```
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1
TOKEN_USE=access
```

---

## Instalación de dependencias

Esta Lambda requiere el paquete `aws-jwt-verify`:

```bash
cd lib/lambda/funcionesContexto/fnPaiContextoPut
npm init -y
npm install aws-jwt-verify
```

---

## Uso típico

### 1. Como endpoint protegido
- El cliente debe enviar el token JWT en el header `Authorization`:
  - `Authorization: Bearer <token>`
- La Lambda responde 200 si el token es válido, 401 si no lo es.

### 2. Como autorizador Lambda en API Gateway
- Configura esta Lambda como "Lambda Authorizer" en tu recurso de API Gateway.
- La Lambda puede devolver una política IAM de Allow/Deny según la validez del token.

---

## Ejemplo de evento de entrada

```json
{
  "headers": {
    "Authorization": "Bearer eyJraWQiOiJ..."
  },
  "httpMethod": "GET"
}
```

---

## Ejemplo de respuesta exitosa

```json
{
  "statusCode": 200,
  "body": "{\"message\":\"Token validado exitosamente.\",\"userId\":\"...\",\"username\":\"...\",\"clientId\":\"...\"}"
}
```

## Ejemplo de respuesta de error

```json
{
  "statusCode": 401,
  "body": "{\"message\":\"No autorizado: Token inválido.\",\"errorType\":\"JwtInvalidError\"}"
}
```

---

## Pruebas manuales

Puedes probar la Lambda desde Postman o curl:

```
curl -X GET \
  -H "Authorization: Bearer <tu_token_jwt>" \
  <URL_DEL_ENDPOINT_PROTEGIDO>
```

---

## Notas de seguridad
- Usa HTTPS siempre.
- No expongas información sensible en los mensajes de error.
- Ajusta los orígenes permitidos en CORS para producción.

---

## Recursos útiles
- [aws-jwt-verify (npm)](https://www.npmjs.com/package/aws-jwt-verify)
- [Documentación AWS Cognito](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [Lambda Authorizer en API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)
