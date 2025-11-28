/**
 * Utilidades para generar respuestas estandarizadas
 * Siguiendo principios de Clean Code
 */

/**
 * Genera respuesta de éxito
 * @param {number} statusCode - Código de estado HTTP
 * @param {Object} data - Datos a retornar
 * @param {string} message - Mensaje descriptivo
 * @returns {Object} - Respuesta formateada
 */
export const createSuccessResponse = (statusCode, data = null, message = null) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
  };

  const body = {};
  
  if (message) {
    body.message = message;
  }
  
  if (data) {
    body.data = data;
  }

  response.body = JSON.stringify(body);
  return response;
};

/**
 * Genera respuesta de error
 * @param {number} statusCode - Código de estado HTTP
 * @param {string} message - Mensaje de error
 * @param {string} errorCode - Código de error interno (opcional)
 * @returns {Object} - Respuesta de error formateada
 */
export const createErrorResponse = (statusCode, message, errorCode = null) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
  };

  const body = {
    error: true,
    message
  };

  if (errorCode) {
    body.errorCode = errorCode;
  }

  response.body = JSON.stringify(body);
  return response;
};

/**
 * Maneja errores de DynamoDB y genera respuesta apropiada
 * @param {Error} error - Error de DynamoDB
 * @returns {Object} - Respuesta de error
 */
export const handleDynamoDBError = (error) => {
  console.error('Error de DynamoDB:', error);

  switch (error.name) {
    case 'ConditionalCheckFailedException':
      return createErrorResponse(409, 'El recurso ya existe o no cumple las condiciones', 'RESOURCE_CONFLICT');
    
    case 'ValidationException':
      return createErrorResponse(400, 'Datos de entrada inválidos', 'VALIDATION_ERROR');
    
    case 'ResourceNotFoundException':
      return createErrorResponse(404, 'Recurso no encontrado', 'RESOURCE_NOT_FOUND');
    
    case 'ProvisionedThroughputExceededException':
      return createErrorResponse(429, 'Demasiadas solicitudes, intente más tarde', 'RATE_LIMIT_EXCEEDED');
    
    case 'ThrottlingException':
      return createErrorResponse(429, 'Servicio temporalmente ocupado, intente más tarde', 'SERVICE_THROTTLED');
    
    default:
      return createErrorResponse(500, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR');
  }
};

/**
 * Maneja errores de validación
 * @param {Error} error - Error de validación
 * @returns {Object} - Respuesta de error
 */
export const handleValidationError = (error) => {
  console.error('Error de validación:', error.message);
  return createErrorResponse(400, error.message, 'VALIDATION_ERROR');
};

/**
 * Maneja errores de autenticación
 * @param {Error} error - Error de autenticación
 * @returns {Object} - Respuesta de error
 */
export const handleAuthenticationError = (error) => {
  console.error('Error de autenticación:', error.message);
  return createErrorResponse(401, 'No autorizado: ' + error.message, 'AUTHENTICATION_ERROR');
};

/**
 * Respuesta para recurso no encontrado
 * @param {string} resourceType - Tipo de recurso
 * @param {string} resourceId - ID del recurso
 * @returns {Object} - Respuesta 404
 */
export const createNotFoundResponse = (resourceType = 'Recurso', resourceId = '') => {
  const message = resourceId 
    ? `${resourceType} con ID ${resourceId} no encontrado`
    : `${resourceType} no encontrado`;
  
  return createErrorResponse(404, message, 'RESOURCE_NOT_FOUND');
};
