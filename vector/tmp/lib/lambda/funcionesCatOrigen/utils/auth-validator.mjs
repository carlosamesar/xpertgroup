import { CognitoJwtVerifier } from 'aws-jwt-verify';

// Cache del verificador JWT para mejor rendimiento
let jwtVerifier = null;

/**
 * Valida el token JWT de Cognito
 * @param {string} token - Token JWT del header Authorization
 * @returns {Promise<Object>} - Payload del token decodificado
 * @throws {Error} - Si el token es inválido
 */
export const validateJwtToken = async (token) => {
  // Validaciones iniciales
  if (!token) {
    throw new Error('Token de autorización no proporcionado');
  }

  // Remover prefijo 'Bearer ' si existe
  const cleanToken = token.replace(/^Bearer\s+/i, '');

  if (!cleanToken) {
    throw new Error('Token de autorización vacío');
  }

  // Inicializar verificador si no existe (Singleton pattern)
  if (!jwtVerifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;

    if (!userPoolId || !clientId) {
      throw new Error('Variables de entorno de Cognito no configuradas');
    }

    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    });
  }

  try {
    // Verificar y decodificar el token
    const payload = await jwtVerifier.verify(cleanToken);
    return payload;
  } catch (error) {
    console.error('Error validando token JWT:', error);
    throw new Error('Token de autorización inválido o expirado');
  }
};

/**
 * Extrae el token del header de autorización
 * @param {Object} headers - Headers del evento de API Gateway
 * @returns {string|null} - Token extraído o null si no existe
 */
export const extractTokenFromHeaders = (headers) => {
  // Buscar en diferentes variaciones del header (case-insensitive)
  const authHeader = headers?.Authorization || 
                    headers?.authorization || 
                    headers?.Authentication ||
                    headers?.authentication;

  return authHeader || null;
};

/**
 * Middleware para validar autenticación JWT
 * @param {Object} event - Evento de API Gateway
 * @returns {Promise<Object>} - Payload del usuario autenticado
 * @throws {Error} - Si la autenticación falla
 */
export const authenticateUser = async (event) => {
  const token = extractTokenFromHeaders(event.headers);
  
  if (!token) {
    throw new Error('Header de autorización requerido');
  }

  const userPayload = await validateJwtToken(token);
  
  // Log de auditoría (opcional)
  console.log('Usuario autenticado:', {
    sub: userPayload.sub,
    username: userPayload.username || userPayload['cognito:username'],
    timestamp: new Date().toISOString()
  });

  return userPayload;
};
