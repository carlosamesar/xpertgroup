/**
 * Utilidades para manejo de respuestas HTTP estandarizadas
 * Siguiendo principios de Clean Code y consistencia
 */

/**
 * Crea una respuesta HTTP exitosa
 * @param {any} data - Datos a retornar
 * @param {number} statusCode - Código de estado HTTP (default: 200)
 * @param {string} message - Mensaje adicional (opcional)
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createSuccessResponse = (data, statusCode = 200, message = null) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Authentication',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      data,
      ...(message && { message }),
      timestamp: new Date().toISOString()
    })
  };

  return response;
};

/**
 * Crea una respuesta HTTP de error
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código de estado HTTP (default: 400)
 * @param {Object} details - Detalles adicionales del error (opcional)
 * @returns {Object} - Respuesta HTTP formateada
 */
export const createErrorResponse = (message, statusCode = 400, details = null) => {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Authentication',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        ...(details && { details }),
        code: statusCode
      },
      timestamp: new Date().toISOString()
    })
  };

  return response;
};

/**
 * Crea una respuesta de autorización fallida
 * @param {string} message - Mensaje de error (opcional)
 * @returns {Object} - Respuesta HTTP 401
 */
export const createUnauthorizedResponse = (message = 'No autorizado') => {
  return createErrorResponse(message, 401);
};

/**
 * Crea una respuesta de recurso no encontrado
 * @param {string} message - Mensaje de error (opcional)
 * @returns {Object} - Respuesta HTTP 404
 */
export const createNotFoundResponse = (message = 'Recurso no encontrado') => {
  return createErrorResponse(message, 404);
};

/**
 * Crea una respuesta de conflicto (recurso ya existe)
 * @param {string} message - Mensaje de error (opcional)
 * @returns {Object} - Respuesta HTTP 409
 */
export const createConflictResponse = (message = 'El recurso ya existe') => {
  return createErrorResponse(message, 409);
};

/**
 * Crea una respuesta de error interno del servidor
 * @param {string} message - Mensaje de error (opcional)
 * @param {Error} error - Error original (opcional)
 * @returns {Object} - Respuesta HTTP 500
 */
export const createInternalErrorResponse = (message = 'Error interno del servidor', error = null) => {
  const details = error ? {
    errorName: error.name,
    errorMessage: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  } : null;

  return createErrorResponse(message, 500, details);
};

/**
 * Crea una respuesta de método no permitido
 * @param {string} method - Método HTTP recibido
 * @returns {Object} - Respuesta HTTP 405
 */
export const createMethodNotAllowedResponse = (method) => {
  return createErrorResponse(`Método HTTP ${method} no permitido`, 405);
};

/**
 * Crea una respuesta de validación fallida
 * @param {string} message - Mensaje de error de validación
 * @param {Array} validationErrors - Lista de errores de validación (opcional)
 * @returns {Object} - Respuesta HTTP 400
 */
export const createValidationErrorResponse = (message, validationErrors = null) => {
  const details = validationErrors ? { validationErrors } : null;
  return createErrorResponse(message, 400, details);
};

/**
 * Crea una respuesta para operación exitosa sin contenido
 * @param {string} message - Mensaje de éxito (opcional)
 * @returns {Object} - Respuesta HTTP 204
 */
export const createNoContentResponse = (message = 'Operación completada exitosamente') => {
  return {
    statusCode: 204,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,Authentication',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }
  };
};

/**
 * Maneja errores de DynamoDB y los convierte en respuestas HTTP apropiadas
 * @param {Error} error - Error de DynamoDB
 * @returns {Object} - Respuesta HTTP formateada
 */
export const handleDynamoDBError = (error) => {
  console.error('Error de DynamoDB:', error);

  switch (error.name) {
    case 'ConditionalCheckFailedException':
      return createConflictResponse('La operación falló debido a una condición no cumplida');
    
    case 'ResourceNotFoundException':
      return createNotFoundResponse('El recurso solicitado no existe');
    
    case 'ValidationException':
      return createValidationErrorResponse('Error de validación en los datos', [error.message]);
    
    case 'ProvisionedThroughputExceededException':
      return createErrorResponse('Límite de capacidad excedido, intente más tarde', 429);
    
    case 'ItemCollectionSizeLimitExceededException':
      return createErrorResponse('Límite de tamaño de colección excedido', 413);
    
    case 'AccessDeniedException':
      return createUnauthorizedResponse('Acceso denegado al recurso');
    
    default:
      return createInternalErrorResponse('Error de base de datos', error);
  }
};

/**
 * Crea una respuesta paginada para listados
 * @param {Array} items - Lista de items
 * @param {Object} lastEvaluatedKey - Clave para siguiente página (opcional)
 * @param {number} count - Número total de items en la respuesta
 * @param {Object} metadata - Metadata adicional (opcional)
 * @returns {Object} - Respuesta HTTP con paginación
 */
export const createPaginatedResponse = (items, lastEvaluatedKey = null, count = null, metadata = null) => {
  const data = {
    items,
    count: count !== null ? count : items.length,
    ...(lastEvaluatedKey && { 
      pagination: {
        lastEvaluatedKey: encodeURIComponent(JSON.stringify(lastEvaluatedKey)),
        hasMoreItems: true
      }
    }),
    ...(metadata && { metadata })
  };

  return createSuccessResponse(data);
};
