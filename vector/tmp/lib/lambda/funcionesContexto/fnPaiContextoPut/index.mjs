import { CognitoJwtVerifier } from 'aws-jwt-verify';

const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;
const COGNITO_APP_CLIENT_ID = process.env.COGNITO_CLIENT_ID;
const COGNITO_REGION = process.env.COGNITO_REGION;
const TOKEN_USE = process.env.TOKEN_USE || "access";

// Validar que las variables de entorno esenciales estén presentes
if (!COGNITO_USER_POOL_ID || !COGNITO_APP_CLIENT_ID || !COGNITO_REGION) {
    console.error("Error Crítico: Faltan variables de entorno de Cognito (USER_POOL_ID, APP_CLIENT_ID, REGION).");
    // Es mejor que falle aquí en la inicialización a que intente operar sin configuración.
    throw new Error("Configuración de Cognito incompleta en variables de entorno.");
}

// Inicializa el verificador de JWT.
// Este objeto se reutilizará en las invocaciones de la Lambda (buena práctica para el rendimiento).
// aws-jwt-verify maneja el caché de JWKS (JSON Web Key Set) automáticamente.
const verifier = CognitoJwtVerifier.create({
    userPoolId: COGNITO_USER_POOL_ID,
    tokenUse: TOKEN_USE,
    clientId: COGNITO_APP_CLIENT_ID
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // En producción, sé más específico con el origen
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,POST,PUT,DELETE' // Ajusta los métodos según necesites
};

/**
 * Extrae el token del encabezado Authorization.
 * Espera el formato "Bearer <token>".
 * @param {object} headers - Los encabezados de la solicitud HTTP.
 * @returns {string|null} El token o null si no se encuentra o el formato es incorrecto.
 */
function extractTokenFromHeader(headers) {
    // API Gateway puede pasar los encabezados con diferentes capitalizaciones
    const authorizationHeader = headers?.authorization || headers?.Authorization;
    if (authorizationHeader && typeof authorizationHeader === 'string' && authorizationHeader.startsWith("Bearer ")) {
        return authorizationHeader.substring(7); // Remueve "Bearer "
    }
    console.log("Encabezado Authorization no encontrado o con formato incorrecto.");
    return null;
}

/**
 * Handler principal de la Lambda.
 * Esta función puede ser usada como un autorizador Lambda de API Gateway
 * o como parte de la lógica de un endpoint protegido.
 */
export const handler = async (event) => {
    console.log("Evento de validación de JWT recibido:", JSON.stringify(event, null, 2));

    // Manejo de solicitud OPTIONS para CORS preflight si esta Lambda es el backend directo de un endpoint
    // Si se usa como Autorizador Lambda, este bloque OPTIONS no es típicamente necesario aquí.
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // Verificar que las variables de entorno críticas estén cargadas para esta invocación
    if (!COGNITO_USER_POOL_ID || !COGNITO_APP_CLIENT_ID || !COGNITO_REGION) {
        console.error("Error de configuración: Variables de entorno de Cognito no disponibles en la invocación.");
        // Esta respuesta es para si la Lambda es un backend directo.
        // Si es un autorizador, debería devolver una política de denegación o lanzar un error.
        return {
            statusCode: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "Error interno del servidor: Configuración de autorización incompleta." }),
        };
    }

    const token = extractTokenFromHeader(event.headers);

    if (!token) {
        console.log("No se encontró token JWT en el encabezado Authorization.");
        // Para un autorizador Lambda, lanzar "Unauthorized" o devolver política de denegación.
        // Para un backend directo:
        return {
            statusCode: 401, // Unauthorized
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "No autorizado: Token no proporcionado o con formato incorrecto." }),
        };
    }

    try {
        // Verifica el token. Si es inválido, lanzará una excepción.
        // La librería maneja la obtención y caché de los JWKS (JSON Web Key Set) de Cognito.
        const payload = await verifier.verify(token);
        console.log("Token JWT es válido. Payload:", JSON.stringify(payload, null, 2));

        // SI ESTA LAMBDA SE USA COMO AUTORIZADOR DE API GATEWAY:
        // Deberías generar y devolver una política IAM aquí.
        // Ejemplo de política de "Permitir":
        /*
        const policy = generatePolicy(payload.sub, 'Allow', event.methodArn);
        console.log("Política generada para autorizador:", JSON.stringify(policy));
        return policy;
        */

        // SI ESTA LAMBDA ES PARTE DE UN ENDPOINT PROTEGIDO (no un autorizador separado):
        // El token es válido, puedes proceder con la lógica de tu endpoint.
        // Puedes añadir el 'userId' (payload.sub) u otros claims del token
        // al evento o contexto para que la lógica de negocio posterior los use.
        return {
            statusCode: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: "Token validado exitosamente.",
                userId: payload.sub, // 'sub' es el subject (identificador único) del usuario
                username: payload['cognito:username'],
                clientId: payload.client_id || payload.aud, // Depende si es Access o ID token
                // Otros claims relevantes del payload podrían incluirse aquí si es necesario
            }),
        };

    } catch (error) {
        console.error("Error de validación de token JWT:", error.name, error.message);
        let errorMessage = "No autorizado: Token inválido.";
        let statusCode = 401; // Unauthorized

        // Personalizar mensajes basados en el tipo de error de aws-jwt-verify
        if (error instanceof JwtExpiredError) {
            errorMessage = "No autorizado: El token ha expirado.";
        }
        // Otros errores específicos de aws-jwt-verify...

        // SI ESTA LAMBDA SE USA COMO AUTORIZADOR DE API GATEWAY:
        // Deberías lanzar un error 'Unauthorized' para que API Gateway devuelva 401/403.
        // O devolver una política de "Denegar".
        // throw new Error("Unauthorized"); // API Gateway lo mapea a 401 o 403 dependiendo de la configuración

        // SI ESTA LAMBDA ES PARTE DE UN ENDPOINT PROTEGIDO:
        return {
            statusCode: statusCode,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            body: JSON.stringify({ message: errorMessage, errorType: error.name }),
        };
    }
};

// Función de ayuda para generar políticas IAM (si se usa como Autorizador Lambda)
// Esta función no se llama en el flujo actual si la Lambda es un backend directo.
/*
const generatePolicy = (principalId, effect, resource) => {
    const authResponse = {};
    authResponse.principalId = principalId;
    if (effect && resource) {
        const policyDocument = {};
        policyDocument.Version = '2012-10-17';
        policyDocument.Statement = [];
        const statementOne = {};
        statementOne.Action = 'execute-api:Invoke'; // Permite invocar la API
        statementOne.Effect = effect;
        statementOne.Resource = resource;
        policyDocument.Statement[0] = statementOne;
        authResponse.policyDocument = policyDocument;
    }
   
    return authResponse;
};
*/
