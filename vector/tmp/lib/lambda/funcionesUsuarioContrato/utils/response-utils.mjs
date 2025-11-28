/**
 * Utilidades de respuesta HTTP estandarizadas
 * Siguiendo principios de Clean Code
 */

/**
 * Headers CORS estándar
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, X-Amz-Date, X-Amz-Security-Token, Authorization, X-Api-Key, X-Requested-With, Accept, Access-Control-Allow-Methods, Access-Control-Allow-Origin, Access-Control-Allow-Headers, canal, cuentasesion, id, token, glat, glon, refresh',
  'Access-Control-Allow-Methods': 'OPTIONS,GET,PUT,POST,DELETE',
  'Access-Control-Allow-Credentials': false,
  'Content-Type': 'application/json'
};

/**
 * Crea una respuesta HTTP exitosa
 * @param {Object} data - Datos a devolver
 * @param {number} statusCode - Código de estado HTTP (por defecto 200)
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createSuccessResponse = (data, statusCode = 200) => {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  };
};

/**
 * Crea una respuesta HTTP de error
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (por defecto 400)
 * @param {Object} details - Detalles adicionales del error
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createErrorResponse = (message, statusCode = 400, details = null) => {
  const errorResponse = {
    success: false,
    error: {
      message,
      code: statusCode,
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    errorResponse.error.details = details;
  }

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(errorResponse)
  };
};

/**
 * Crea respuesta de validación fallida
 * @param {string} message - Mensaje de error de validación
 * @param {Array} validationErrors - Lista de errores de validación
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createValidationErrorResponse = (message, validationErrors = []) => {
  return createErrorResponse(message, 400, {
    type: 'validation_error',
    errors: validationErrors
  });
};

/**
 * Crea respuesta de no autorizado
 * @param {string} message - Mensaje de error de autorización
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createUnauthorizedResponse = (message = 'No autorizado') => {
  return createErrorResponse(message, 401, {
    type: 'authentication_error'
  });
};

/**
 * Crea respuesta de recurso no encontrado
 * @param {string} resource - Nombre del recurso no encontrado
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createNotFoundResponse = (resource = 'Recurso') => {
  return createErrorResponse(`${resource} no encontrado`, 404, {
    type: 'not_found_error'
  });
};

/**
 * Crea respuesta de conflicto (recurso ya existe)
 * @param {string} resource - Nombre del recurso que ya existe
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createConflictResponse = (resource = 'Recurso') => {
  return createErrorResponse(`${resource} ya existe`, 409, {
    type: 'conflict_error'
  });
};

/**
 * Crea respuesta de error interno del servidor
 * @param {string} message - Mensaje de error
 * @param {Error} error - Error original (opcional, para logging)
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createInternalServerErrorResponse = (message = 'Error interno del servidor', error = null) => {
  if (error) {
    console.error('Error interno:', error);
  }

  return createErrorResponse(message, 500, {
    type: 'internal_server_error'
  });
};

/**
 * Maneja errores de DynamoDB y los convierte a respuestas HTTP apropiadas
 * @param {Error} error - Error de DynamoDB
 * @returns {Object} - Respuesta HTTP formateada
 */
export const handleDynamoDBError = (error) => {
  console.error('Error de DynamoDB:', error);

  switch (error.name) {
    case 'ConditionalCheckFailedException':
      return createConflictResponse('Usuario-Contrato');
    
    case 'ResourceNotFoundException':
      return createNotFoundResponse('Usuario-Contrato');
    
    case 'ValidationException':
      return createValidationErrorResponse('Datos inválidos para DynamoDB', [error.message]);
    
    case 'AccessDeniedException':
      return createErrorResponse('Acceso denegado a DynamoDB', 403, {
        type: 'access_denied_error'
      });
    
    default:
      return createInternalServerErrorResponse('Error de base de datos', error);
  }
};

/**
 * Wrapper para manejo de errores en Lambda
 * @param {Function} handler - Función handler a ejecutar
 * @returns {Function} - Handler con manejo de errores
 */
export const withErrorHandling = (handler) => {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      console.error('Error no manejado en Lambda:', error);
      
      // Errores de validación personalizados
      if (error.message.includes('es requerido') || 
          error.message.includes('debe ser') || 
          error.message.includes('formato')) {
        return createValidationErrorResponse(error.message);
      }
      
      // Errores de autenticación
      if (error.message.includes('Token') || 
          error.message.includes('autorización') || 
          error.message.includes('autenticación')) {
        return createUnauthorizedResponse(error.message);
      }
      
      // Error genérico
      return createInternalServerErrorResponse('Error inesperado', error);
    }
  };
};
