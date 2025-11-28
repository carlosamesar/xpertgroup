# fnPaiContextoEnviarEmailPost Lambda Function

## Descripción de la Solución

Esta función AWS Lambda (`fnPaiContextoEnviarEmailPost`) está diseñada para recibir solicitudes HTTPS a través de un API Gateway, validar un token JWT de AWS Cognito para autenticación, procesar un payload JSON para enviar un correo electrónico y utilizar AWS SES (Simple Email Service) para el envío.

**Funcionalidades Principales:**

1.  **Autenticación JWT:** Valida un token JWT (Access Token) proporcionado en el header `Authorization` (Bearer token) utilizando la librería `aws-jwt-verify` contra un User Pool de AWS Cognito configurado.
2.  **Validación de Payload:** Espera un cuerpo de solicitud (body) en formato JSON con los siguientes campos:
    *   `to` (string, email válido, requerido): Dirección de correo del destinatario.
    *   `subject` (string, máximo 100 caracteres, requerido): Asunto del correo.
    *   `bodyHtml` (string, requerido): Contenido HTML del correo.
    Utiliza la librería `Joi` para una validación estricta del esquema.
3.  **Sanitización de Entradas:** Sanitiza los campos `subject` y `bodyHtml` utilizando `DOMPurify` para prevenir ataques de Cross-Site Scripting (XSS).
4.  **Integración con AWS SES:** Construye y envía un correo electrónico utilizando el SDK de AWS v3 para JavaScript (`@aws-sdk/client-ses`). El email de origen (Source) se configura mediante una variable de entorno.
5.  **Manejo de Respuestas y Errores:**
    *   **Éxito (200 OK):** Si el correo se envía correctamente, responde con un JSON `{ "status": "success", "messageId": "SES_MESSAGE_ID" }`.
    *   **Error de Autenticación (401 Unauthorized):** Si el token JWT es inválido, ha expirado o no se proporciona.
    *   **Error de Validación (400 Bad Request):** Si el payload no cumple con el esquema esperado o el JSON es inválido. Se detalla el campo erróneo.
    *   **Error de SES (502 Bad Gateway):** Si AWS SES devuelve un error durante el envío. La excepción se registra en CloudWatch.
    *   **Error Inesperado (500 Internal Server Error):** Para cualquier otro error no capturado. Se loguea en CloudWatch.

## Arquitectura

```mermaid
graph TD
    A[Cliente API] -- HTTPS Request (POST /contexto/send-email) --> B(API Gateway);
    B -- Lambda Integration --> C{Lambda: fnPaiContextoEnviarEmailPost};
    C -- Valida Token JWT (aws-jwt-verify) --> D(AWS Cognito User Pool);
    C -- Parsea Payload JSON --> C;
    C -- Valida Esquema (Joi) --> C;
    C -- Sanitiza Entradas (DOMPurify) --> C;
    C -- Envía Email (AWS SDK v3 @aws-sdk/client-ses) --> E(AWS SES);
    E -- Email Enviado/Error --> C;
    C -- Log Errores/Éxito --> F(AWS CloudWatch Logs);
    C -- HTTP Response (200, 400, 401, 500, 502) --> B;
    B -- HTTP Response --> A;
```

## Pre-requisitos

*   AWS CLI: Configurada con credenciales y región por defecto.
*   Node.js: Versión 18.x o superior (recomendado para AWS Lambda Node.js 20.x runtime).
*   AWS CDK: Toolkit para desplegar infraestructura (`npm install -g aws-cdk`).
*   Dependencias del Proyecto: Instalar con `npm install` en la raíz del proyecto CDK.
*   Email Verificado en SES: La dirección de correo electrónico que se usará como `SES_SOURCE_EMAIL` debe estar verificada en AWS SES en la región correspondiente.
*   Cognito User Pool: Un User Pool de AWS Cognito existente con un App Client configurado.

## Instrucciones de Despliegue (Como parte del Stack CDK)

Esta función Lambda se despliega como parte del stack `CdkApisvectorPaiStack` (o un stack similar que incluya `ApiContexto`).

1.  **Configurar Variables de Entorno del Stack:**
    Asegúrate de que las variables de entorno necesarias para el stack de CDK (ej. `STATE_NAME`, `REGION`, `COGNITO_USER_POOL_ID`, `SES_SOURCE_EMAIL`, etc.) estén configuradas en tu sistema o en los archivos `.env` correspondientes (ej. `.env_dev`, `.env_pro`).

2.  **Instalar Dependencias del Proyecto CDK:**
    Desde la raíz del directorio del proyecto CDK (`cdk-apisvector-pai`):

    ```bash
    npm install
    ```

3.  **Sintetizar el Stack (Opcional, para revisión):**

    ```bash
    npx cdk synth
    ```

4.  **Bootstrap CDK (Si es la primera vez en la cuenta/región):**

    ```bash
    npx cdk bootstrap aws://ACCOUNT-ID/REGION
    ```
    Reemplaza `ACCOUNT-ID` y `REGION` con los valores correspondientes.

5.  **Desplegar el Stack:**

    ```bash
    npx cdk deploy CdkApisvectorPaiStack --parameters SES_SOURCE_EMAIL=tu-email-verificado@example.com --parameters CognitoUserPoolId=tu-user-pool-id
    ```

    *   Reemplaza `CdkApisvectorPaiStack` si el nombre de tu stack principal es diferente.
    *   Puedes pasar las variables de entorno `SES_SOURCE_EMAIL` y `CognitoUserPoolId` como parámetros al despliegue si no están configuradas directamente en el código del stack o a través de variables de entorno del sistema que el CDK pueda leer.
    *   Si las variables de entorno `SES_SOURCE_EMAIL` y `COGNITO_USER_POOL_ID` ya están configuradas en el `lib/config.ts` o a través de archivos `.env` que tu CDK carga, puedes omitir los `--parameters`.

## Uso del Endpoint

Una vez desplegado, el API Gateway expondrá un endpoint similar a:
`https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/contexto/send-email`

**Método:** `POST`

**Headers:**

*   `Authorization`: `Bearer <JWT_ACCESS_TOKEN>` (Token de acceso obtenido de AWS Cognito)
*   `Content-Type`: `application/json`

**Cuerpo (Body) - JSON:**

```json
{
  "to": "destinatario@example.com",
  "subject": "Asunto del Correo (Prueba)",
  "bodyHtml": "<h1>Hola Mundo!</h1><p>Este es un correo de prueba enviado desde la Lambda.</p>"
}
```

**Ejemplo con cURL:**

```bash
curl -X POST \\
  https://<api-id>.execute-api.<region>.amazonaws.com/<stage>/contexto/send-email \\
  -H 'Authorization: Bearer eyJraWQiOiI...exampletoken...MiJ9.eyJzdWIiOiI...example...' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "to": "destinatario@example.com",
    "subject": "Asunto del Correo desde cURL",
    "bodyHtml": "<h1>Hola desde cURL!</h1><p>Este es un correo de prueba.</p>"
  }'
```

**Respuestas Esperadas:**

*   **200 OK:**

    ```json
    {
      "status": "success",
      "messageId": "0100018fca123456-789a0b1c-de23-45f6-g789-1h2i3j4k5l6m-000000"
    }
    ```

*   **400 Bad Request (Error de Validación):**

    ```json
    {
      "error": "Bad Request",
      "details": [
        {
          "message": "\\"subject\\" is required",
          "field": "subject"
        }
      ]
    }
    ```

*   **401 Unauthorized (Token Inválido/Ausente):**

    ```json
    {
      "error": "Unauthorized",
      "details": "Invalid or expired token."
    }
    ```

*   **502 Bad Gateway (Error de SES):**

    ```json
    {
      "error": "SES Error",
      "details": "MessageRejected: Email address is not verified. The following identities failed the check in region US-EAST-1: sender@example.com"
    }
    ```

## Variables de Entorno (Configuradas en la Lambda por CDK)

*   `SES_SOURCE_EMAIL`: (Requerido) La dirección de correo electrónico verificada en AWS SES que se utilizará como remitente (ej. `noreply@tuempresa.com`). Esta se pasa desde la configuración del stack CDK.
*   `COGNITO_USER_POOL_ID`: (Requerido) El ID del User Pool de AWS Cognito utilizado para validar los tokens JWT (ej. `us-east-1_xxxxxxxxx`). Esta se pasa desde la configuración del stack CDK.
*   `AWS_REGION`: (Automáticamente proveído por AWS Lambda) La región de AWS donde se ejecuta la Lambda y donde reside el User Pool de Cognito y SES (ej. `us-east-1`).

## Consideraciones de Seguridad

*   **Permisos Mínimos (IAM):** La función Lambda tiene permisos específicos para:
    *   Enviar correos a través de SES (`ses:SendEmail`, `ses:SendRawEmail`).
    *   Escribir logs en CloudWatch (`logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`).
    *   Operar dentro de una VPC si está configurada (permisos `ec2:CreateNetworkInterface`, `ec2:DescribeNetworkInterfaces`, `ec2:DeleteNetworkInterface`).
*   **Validación de Token JWT:** Se asegura que solo usuarios autenticados puedan invocar la función.
*   **Validación de Esquema del Payload:** Previene el procesamiento de datos malformados.
*   **Sanitización XSS:** Protege contra la inyección de scripts maliciosos en el contenido del correo.
*   **Variables de Entorno:** Información sensible como ARNs o emails de origen se manejan a través de variables de entorno y no se hardcodean.

## Comentarios en el Código (index.mjs)

El archivo `index.mjs` incluye comentarios JSDoc para las funciones principales, explicando su propósito, parámetros y lo que retornan, siguiendo las mejores prácticas de documentación de código.