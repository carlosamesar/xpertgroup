import { CognitoIdentityProviderClient, InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { createHmac } from 'crypto';

// --- Configuración ---
// Estas variables DEBEN ser configuradas en el entorno de la Lambda
const COGNITO_REGION = process.env.COGNITO_REGION;
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET;

const statusCode = 401;

// Validar que las variables de entorno esenciales estén presentes
if (!COGNITO_REGION || !COGNITO_CLIENT_ID || !COGNITO_CLIENT_SECRET) {
    statusCode = 500;
    console.error("Error Crítico: Faltan variables de entorno de Cognito (REGION, CLIENT_ID, CLIENT_SECRET).");
}

// Inicializar el cliente de Cognito con la región
const cognitoClient = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, sé más específico con el origen
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

/**
 * Calcula el SecretHash requerido por Cognito cuando un App Client tiene un secreto.
 * @param {string} username - El nombre de usuario (en este caso, el email).
 * @param {string} clientId - El ID del App Client de Cognito.
 * @param {string} clientSecret - El secreto del App Client de Cognito.
 * @returns {string} El SecretHash calculado.
 */
function calculateSecretHash(username, clientId, clientSecret) {
  if (!username || !clientId || !clientSecret) {
    console.error("Error en calculateSecretHash: Faltan parámetros.");
    throw new Error("Parámetros insuficientes para calcular SecretHash.");
  }
  const message = username + clientId;
  const hmac = createHmac('sha256', clientSecret);
  hmac.update(message);
  return hmac.digest('base64');
}

export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  // Manejo de solicitud OPTIONS para CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }; // 204 No Content es más apropiado para OPTIONS
  }

  // Verificar que las variables de entorno críticas estén cargadas para esta invocación
  if (!COGNITO_REGION || !COGNITO_CLIENT_ID || !COGNITO_CLIENT_SECRET) {
    console.error("Error de configuración: Variables de entorno de Cognito no disponibles en la invocación.");
    return {
        statusCode: 500, // Internal Server Error
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Error interno del servidor: Configuración incompleta." }),
    };
  }

  let requestBody;
  try {
    // API Gateway envía el cuerpo como una cadena si no está vacío, así que parseamos
    if (event) {
        requestBody = event;
    } else {
        // Si el cuerpo está vacío o no existe, se considera una solicitud incorrecta
        return {
            statusCode: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Cuerpo de la solicitud vacío o faltante." }),
        };
    }
  } catch (error) {
    console.error("Error al parsear el cuerpo de la solicitud:", error);
    return {
        statusCode: 400, // Bad Request
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Cuerpo de la solicitud inválido. Se esperaba JSON." }),
    };
  }

  const { email, password } = requestBody;

  if (!email || !password) {
    return {
      statusCode: 400, // Bad Request
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Faltan los parámetros 'email' o 'password' en la solicitud." }),
    };
  }

  try {
    const secretHash = calculateSecretHash(email, COGNITO_CLIENT_ID, COGNITO_CLIENT_SECRET);

    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH', // Asegúrate que este flujo esté habilitado en tu App Client
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    });

    const result = await cognitoClient.send(command);
    console.log('Resultado de la autenticación:', JSON.stringify(result, null, 2));

    if (result.AuthenticationResult) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Autenticación exitosa",
          accessToken: result.AuthenticationResult.AccessToken,
          idToken: result.AuthenticationResult.IdToken,
          refreshToken: result.AuthenticationResult.RefreshToken,
          expiresIn: result.AuthenticationResult.ExpiresIn
        })
      };
    } else {
      // Esto no debería ocurrir si Cognito responde correctamente sin error, pero es una salvaguarda
      console.error('Autenticación fallida - Cognito no devolvió AuthenticationResult:', result);
      return {
        statusCode: 500, // Internal Server Error, porque es un estado inesperado de Cognito
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: 'Fallo de autenticación: Respuesta inesperada de Cognito.',
          details: result // Incluye la respuesta completa de Cognito para depuración
        })
      };
    }

  } catch (error) {
    console.error('Error de autenticación en Cognito:', error);
    // Personalizar mensajes de error basados en el tipo de error de Cognito
    let responseMessage = 'Login failed.';

    if (error.name === "NotAuthorizedException") {
        responseMessage = "Email o contraseña incorrectos, o el usuario no existe.";
    } else if (error.name === "UserNotFoundException") {
        statusCode = 404; // Not Found
        responseMessage = "Usuario no encontrado.";
    } else if (error.name === "UserNotConfirmedException") {
        statusCode = 403; // Forbidden
        responseMessage = "El usuario no ha sido confirmado. Por favor, revisa tu email.";
    } else if (error.name === "InvalidParameterException") {
        // Este es el error que estás viendo. Indica un problema de configuración.
        statusCode = 400; // Bad Request (porque el flujo no es soportado por el cliente)
        responseMessage = "Parámetro inválido o flujo de autenticación no soportado para este cliente.";
    } else if (error.message && error.message.includes("Incorrect username or password")) {
        // A veces el error NotAuthorizedException no es tan específico
        responseMessage = "Email o contraseña incorrectos.";
    } else {
        statusCode = 500; // Internal Server Error para otros errores inesperados
        responseMessage = "Error interno del servidor durante la autenticación.";
    }

    return {
      statusCode: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: responseMessage,
        error: error.name || 'UnknownError', // Nombre del error
        details: error.message // Mensaje detallado del error
        // No incluyas error.stack en producción por seguridad, solo en depuración.
      })
    };
  }
};
