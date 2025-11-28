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
 * Middleware de autenticación para Lambda
 * @param {Object} event - Evento de API Gateway
 * @returns {Promise<Object>} - Payload del token validado
 * @throws {Error} - Si la autenticación falla
 */
export const authenticateRequest = async (event) => {
  const authHeader = event.headers?.Authentication || event.headers?.authorization;
  
  if (!authHeader) {
    throw new Error('Header Authentication requerido');
  }

  return await validateJwtToken(authHeader);
};

/**
 * Valida que el usuario tenga permisos para la operación
 * @param {Object} tokenPayload - Payload del token JWT
 * @param {string} operation - Operación a realizar (GET, POST, PUT, DELETE)
 * @param {Object} resourceData - Datos del recurso (opcional)
 * @returns {boolean} - true si tiene permisos
 */
export const authorizeOperation = (tokenPayload, operation, resourceData = null) => {
  // Validar que el token tenga la información básica requerida
  if (!tokenPayload.sub || !tokenPayload.token_use) {
    return false;
  }

  // Por ahora, permitir todas las operaciones para usuarios autenticados
  // Aquí se pueden agregar reglas de autorización más específicas
  const allowedOperations = ['GET', 'POST', 'PUT', 'DELETE'];
  
  if (!allowedOperations.includes(operation.toUpperCase())) {
    return false;
  }

  // Verificar roles o grupos si están presentes
  const userGroups = tokenPayload['cognito:groups'] || [];
  
  // Ejemplo: Solo admin puede DELETE
  if (operation.toUpperCase() === 'DELETE' && !userGroups.includes('admin')) {
    return false;
  }

  return true;
};
