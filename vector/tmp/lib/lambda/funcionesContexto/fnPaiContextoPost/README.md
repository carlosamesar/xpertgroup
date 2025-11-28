# Lambda de Autenticación con Amazon Cognito

Esta función de AWS Lambda proporciona un endpoint para autenticar usuarios contra un User Pool de Amazon Cognito utilizando el flujo de autenticación con nombre de usuario y contraseña (`USER_PASSWORD_AUTH`). Si la autenticación es exitosa, devuelve tokens JWT (ID Token, Access Token y Refresh Token).

## Índice

- [Propósito](#propósito)
- [Prerrequisitos](#prerrequisitos)
- [Configuración](#configuración)
  - [Variables de Entorno](#variables-de-entorno)
  - [Configuración del App Client en Cognito](#configuración-del-app-client-en-cognito)
- [Flujo de Autenticación](#flujo-de-autenticación)
- [Tokens JWT](#tokens-jwt)
  - [ID Token](#id-token)
  - [Access Token](#access-token)
  - [Refresh Token](#refresh-token)
- [Despliegue](#despliegue)
- [Uso y Pruebas](#uso-y-pruebas)
  - [Solicitud](#solicitud)
  - [Respuesta Exitosa (200 OK)](#respuesta-exitosa-200-ok)
  - [Respuesta de Error (Ejemplos)](#respuesta-de-error-ejemplos)
- [Consideraciones de Seguridad](#consideraciones-de-seguridad)
- [Estructura del Código](#estructura-del-código)

## Propósito

El propósito principal de esta Lambda es:

1.  Recibir credenciales de usuario (email y contraseña) a través de un endpoint de API Gateway.
2.  Calcular el `SecretHash` si el App Client de Cognito está configurado con un secreto.
3.  Autenticar al usuario contra Amazon Cognito usando el comando `InitiateAuthCommand`.
4.  Devolver los tokens JWT (ID, Access, Refresh) al cliente si la autenticación es exitosa.
5.  Manejar errores comunes de autenticación y configuración.

## Prerrequisitos

Antes de desplegar y utilizar esta Lambda, asegúrate de tener:

1.  Una cuenta de AWS.
2.  Un **User Pool de Amazon Cognito** configurado.
3.  Un **App Client** configurado dentro de tu User Pool. Este App Client debe tener un **secreto de cliente (client secret)** generado.
4.  Node.js y npm instalados si deseas empaquetar la Lambda manualmente.
5.  AWS CLI configurada (opcional, para despliegue y gestión).

## Configuración

### Variables de Entorno

La Lambda requiere las siguientes variables de entorno para su correcta ejecución:

- `COGNITO_REGION`: La región de AWS donde tu User Pool de Cognito está alojado (ej: `us-east-1`, `eu-west-2`).
- `COGNITO_CLIENT_ID`: El ID del App Client de Cognito que utilizará esta Lambda.
- `COGNITO_USER_POOL_ID`: El ID de tu User Pool de Cognito. (Aunque no se usa directamente en `InitiateAuthCommand` en este código, es una buena práctica tenerla para referencia y consistencia, y podría ser útil para futuras extensiones).
- `COGNITO_CLIENT_SECRET`: El secreto del App Client de Cognito. **Este es un valor sensible y debe manejarse con cuidado.**

### Configuración del App Client en Cognito

Es crucial que el App Client que utilices con esta Lambda esté configurado correctamente en Amazon Cognito:

1.  **Generar Secreto de Cliente:** El App Client debe tener un secreto de cliente generado. Si no lo tiene, la lógica de `SecretHash` no es necesaria (y el código actual fallaría o necesitaría ajustes).
2.  **Habilitar Flujos de Autenticación:**
    - Ve a tu User Pool -> App Clients -> (Selecciona tu App Client).
    - Asegúrate de que el flujo de autenticación **`Permitir autenticación basada en nombre de usuario y contraseña (ALLOW_USER_PASSWORD_AUTH)`** esté **HABILITADO**.
    - *Nota:* No lo confundas con `ALLOW_USER_SRP_AUTH` (que es un flujo diferente y más seguro, pero requiere lógica de cliente distinta) ni con `ALLOW_ADMIN_USER_PASSWORD_AUTH` (que es para operaciones administrativas).
3.  **Guardar Cambios:** Siempre guarda los cambios en la configuración de tu App Client.

## Flujo de Autenticación

1.  El cliente envía una solicitud `POST` al endpoint de API Gateway asociado con esta Lambda, incluyendo `email` y `password` en el cuerpo JSON.
2.  API Gateway invoca la Lambda.
3.  La Lambda parsea el `email` y `password` del cuerpo de la solicitud.
4.  Calcula el `SecretHash` usando `email` (como nombre de usuario), `COGNITO_CLIENT_ID` y `COGNITO_CLIENT_SECRET`.
5.  Prepara los parámetros para `InitiateAuthCommand` con `AuthFlow: 'USER_PASSWORD_AUTH'`.
6.  Envía el comando a Cognito.
7.  **Si la autenticación es exitosa:**
    - Cognito devuelve `AuthenticationResult` que contiene `IdToken`, `AccessToken`, `RefreshToken`, y `ExpiresIn`.
    - La Lambda devuelve una respuesta `200 OK` con estos tokens.
8.  **Si la autenticación falla:**
    - Cognito devuelve un error (ej: `NotAuthorizedException`, `UserNotFoundException`).
    - La Lambda devuelve una respuesta de error HTTP apropiada (ej: `401 Unauthorized`, `404 Not Found`) con un mensaje descriptivo.

## Tokens JWT

Tras una autenticación exitosa, Cognito emite los siguientes tokens JWT:

### ID Token (`idToken`)

- Contiene claims sobre la identidad del usuario autenticado (ej: `sub`, `email`, `cognito:username`).
- Está destinado a ser utilizado por el cliente para obtener información del perfil del usuario.
- Su audiencia (`aud`) claim es el `COGNITO_CLIENT_ID`.
- **No uses el ID Token para conceder acceso a tus APIs directamente.** Para eso está el Access Token.

### Access Token (`accessToken`)

- Concede permisos para acceder a recursos protegidos (tus APIs).
- Contiene scopes y puede tener claims personalizados.
- Su audiencia (`aud`) puede ser diferente o no estar presente de la misma manera que en el ID Token, dependiendo de la configuración. El claim `client_id` dentro del Access Token corresponde al `COGNITO_CLIENT_ID`.
- Este es el token que tus APIs deberían validar para autorizar solicitudes.

### Refresh Token (`refreshToken`)

- Es un token de larga duración que se utiliza para obtener nuevos ID Tokens y Access Tokens cuando los actuales expiran, sin necesidad de que el usuario vuelva a ingresar sus credenciales.
- Debe almacenarse de forma segura por el cliente.
- Para usarlo, se llama a `InitiateAuthCommand` con `AuthFlow: 'REFRESH_TOKEN_AUTH'` y el `REFRESH_TOKEN` en `AuthParameters`.

## Despliegue

1.  **Empaquetar la Lambda:**
    - Asegúrate de que `package.json` incluya `@aws-sdk/client-cognito-identity-provider` como dependencia.
    - Ejecuta `npm install`.
    - Crea un archivo `.zip` que contenga `index.mjs` (o `index.js`), `node_modules/`, y `package.json`.
2.  **Crear la Función Lambda en AWS:**
    - Ve a la consola de AWS Lambda.
    - Crea una nueva función.
    - **Nombre:** Ej: `miFuncionAutenticacionCognito`
    - **Runtime:** Node.js (elige una versión LTS reciente, ej: Node.js 20.x)
    - **Permisos:** Crea un nuevo rol con permisos básicos de ejecución de Lambda (para CloudWatch Logs). El rol *no* necesita permisos especiales de Cognito para `InitiateAuth` ya que la autenticación se basa en las credenciales del usuario y la configuración del App Client.
    - Sube el archivo `.zip`.
    - **Handler:** `index.handler` (si tu archivo se llama `index.mjs` y la función exportada es `handler`).
    - **Configura las Variables de Entorno** mencionadas anteriormente.
    - Ajusta el tiempo de espera y la memoria según sea necesario.
3.  **Configurar API Gateway:**
    - Crea una nueva API REST o HTTP en API Gateway.
    - Crea un recurso (ej: `/login` o `/auth/token`).
    - Crea un método `POST` para ese recurso.
    - **Tipo de Integración:** `Función Lambda`.
    - **Usar integración de proxy Lambda:** **HABILITADO**.
    - Selecciona la función Lambda que creaste.
    - Despliega tu API a una etapa (ej: `dev`, `prod`).

## Uso y Pruebas

Puedes probar el endpoint usando herramientas como cURL o Postman.

### Solicitud

- **Método:** `POST`
- **URL:** La URL de invocación de tu API Gateway (ej: `https://xxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev/login`)
- **Encabezados:**
  - `Content-Type: application/json`
- **Cuerpo (raw JSON):**

  ```json
  {
    "email": "tu_usuario@example.com",
    "password": "tu_contraseña_segura"
  }
Respuesta Exitosa (200 OK){
  "message": "Autenticación exitosa",
  "accessToken": "ey...",
  "idToken": "ey...",
  "refreshToken": "ey...",
  "expiresIn": 3600
}
Respuesta de Error (Ejemplos)Credenciales incorrectas (401 Unauthorized):{
  "message": "Email o contraseña incorrectos, o el usuario no existe.",
  "error": "NotAuthorizedException",
  "details": "Incorrect username or password."
}
Cuerpo de solicitud faltante (400 Bad Request):{
  "message": "Cuerpo de la solicitud vacío o faltante."
}
Parámetros faltantes en el cuerpo (400 Bad Request):{
  "message": "Faltan los parámetros 'email' o 'password' en la solicitud."
}
Flujo no soportado (400 Bad Request - debido a configuración incorrecta del App Client):{
  "message": "Parámetro inválido o flujo de autenticación no soportado para este cliente.",
  "error": "InvalidParameterException",
  "details": "Initiate Auth method not supported."
}
Consideraciones de SeguridadCORS: La Lambda incluye encabezados CORS básicos (Access-Control-Allow-Origin: '*'). En un entorno de producción, restringe Access-Control-Allow-Origin a los dominios específicos de tu frontend.Gestión del Secreto del Cliente: El COGNITO_CLIENT_SECRET es un dato sensible. Asegúrate de que esté configurado de forma segura como variable de entorno en Lambda y no esté expuesto en el código fuente del cliente o en repositorios públicos. Considera el uso de AWS Secrets Manager para una gestión más robusta de secretos.Validación de Entradas: La Lambda realiza validaciones básicas (existencia de email/password). Podrías añadir validaciones más estrictas (formato de email, complejidad de contraseña si fuera un registro, etc.) si fuera necesario, aunque Cognito ya maneja políticas de contraseña.HTTPS: API Gateway por defecto utiliza HTTPS, lo cual es crucial para proteger las credenciales en tránsito.Limitación de Tasa (Rate Limiting): Considera configurar la limitación de tasa en API Gateway para protegerte contra ataques de fuerza bruta.Estructura del CódigoEl archivo index.mjs (o index.js) contiene:Importaciones: SDK de AWS para Cognito y módulo crypto de Node.js.Configuración: Lectura de variables de entorno e inicialización del cliente de Cognito.corsHeaders: Objeto con los encabezados CORS.calculateSecretHash(...): Función para calcular el hash secreto.handler(event): Función principal de la Lambda:Manejo de solicitudes OPTIONS (CORS preflight).Verificación de variables de entorno.Parseo del cuerpo de la solicitud.Validación de parámetros email y password.Bloque try...catch para la lógica de autenticación:Cálculo del SecretHash.Creación y envío del InitiateAuthCommand.Procesamiento de la respuesta exitosa o de error.Manejo detallado de errores comunes de Cognito.Este README debería proporcionar una buena base para entender y utilizar tu Lambda de autenticación.