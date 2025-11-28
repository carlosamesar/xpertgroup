/**
 * Utilidades de validación para contratos ciclo
 * Siguiendo principios de Clean Code y seguridad
 */

/**
 * Valida que el ID de ciclo sea un número entero positivo
 * @param {any} id_ciclo - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdCiclo = (id_ciclo) => {
  if (id_ciclo === undefined || id_ciclo === null) {
    throw new Error('id_ciclo es requerido');
  }

  const numericId = Number(id_ciclo);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_ciclo debe ser un número entero positivo');
  }

  return numericId;
};

/**
 * Valida que el ID de contrato sea un número entero positivo
 * @param {any} id_contrato - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdContrato = (id_contrato) => {
  if (id_contrato === undefined || id_contrato === null) {
    throw new Error('id_contrato es requerido');
  }

  const numericId = Number(id_contrato);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_contrato debe ser un número entero positivo');
  }

  return numericId;
};

/**
 * Valida que el ID de origen sea un número entero positivo
 * @param {any} id_origen - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdOrigen = (id_origen) => {
  if (id_origen === undefined || id_origen === null) {
    throw new Error('id_origen es requerido');
  }

  const numericId = Number(id_origen);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_origen debe ser un número entero positivo');
  }

  return numericId;
};

/**
 * Valida el campo activo (boolean)
 * @param {any} activo - Valor a validar
 * @returns {boolean} - Valor booleano validado
 * @throws {Error} - Si la validación falla
 */
export const validateActivo = (activo) => {
  if (activo === undefined || activo === null) {
    throw new Error('activo es requerido');
  }

  // Aceptar valores boolean directos
  if (typeof activo === 'boolean') {
    return activo;
  }

  // Convertir strings a boolean
  if (typeof activo === 'string') {
    const lowerValue = activo.toLowerCase().trim();
    if (lowerValue === 'true' || lowerValue === '1') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === '0') {
      return false;
    }
  }

  // Convertir números a boolean
  if (typeof activo === 'number') {
    return activo !== 0;
  }

  throw new Error('activo debe ser un valor booleano válido (true/false, 1/0)');
};

/**
 * Valida y sanitiza la descripción
 * @param {any} descripcion - Descripción a validar
 * @returns {string} - Descripción sanitizada
 * @throws {Error} - Si la validación falla
 */
export const validateDescripcion = (descripcion) => {
  if (!descripcion || typeof descripcion !== 'string') {
    throw new Error('descripcion es requerida y debe ser una cadena de texto');
  }

  const trimmedDesc = descripcion.trim();
  
  if (trimmedDesc.length === 0) {
    throw new Error('descripcion no puede estar vacía');
  }

  if (trimmedDesc.length > 500) {
    throw new Error('descripcion no puede exceder 500 caracteres');
  }

  // Sanitizar caracteres peligrosos (prevenir XSS)
  const sanitized = trimmedDesc.replace(/[<>'"&]/g, '');
  
  if (sanitized !== trimmedDesc) {
    throw new Error('descripcion contiene caracteres no permitidos');
  }

  return sanitized;
};

/**
 * Genera las claves primarias y de ordenamiento para DynamoDB
 * @param {number} id_ciclo - ID del ciclo
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_ciclo) => {
  return {
    _pk: `CAT_CONTRATO_CICLO#${id_ciclo}`,
    _sk: 'METADATA'
  };
};

/**
 * Genera las claves para GSI8 (Global Secondary Index)
 * @param {number} id_origen - ID del origen
 * @param {number} id_contrato - ID del contrato
 * @param {string} pk - Primary key para GSI8SK
 * @returns {Object} - Objeto con claves GSI8
 */
export const generateGSI8Keys = (id_origen, id_contrato, pk) => {
  return {
    gsi8pk: `ORIGEN#${id_origen}#ID_CONTRATO#${id_contrato}`,
    gsi8sk: pk
  };
};

/**
 * Valida el cuerpo de la petición para operaciones POST/PUT
 * @param {Object} requestBody - Cuerpo de la petición
 * @param {boolean} isUpdate - Si es una actualización (PUT)
 * @returns {Object} - Datos validados
 * @throws {Error} - Si la validación falla
 */
export const validateRequestBody = (requestBody, isUpdate = false) => {
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new Error('Cuerpo de petición debe ser un objeto válido');
  }

  const { id_ciclo, id_contrato, id_origen, activo, descripcion } = requestBody;

  const validatedData = {};

  // Para POST, todos los campos son requeridos
  if (!isUpdate) {
    validatedData.id_ciclo = validateIdCiclo(id_ciclo);
    validatedData.id_contrato = validateIdContrato(id_contrato);
    validatedData.id_origen = validateIdOrigen(id_origen);
    validatedData.activo = validateActivo(activo);
    validatedData.descripcion = validateDescripcion(descripcion);
  } else {
    // Para PUT, solo validar campos presentes
    if (id_ciclo !== undefined) {
      validatedData.id_ciclo = validateIdCiclo(id_ciclo);
    }
    if (id_contrato !== undefined) {
      validatedData.id_contrato = validateIdContrato(id_contrato);
    }
    if (id_origen !== undefined) {
      validatedData.id_origen = validateIdOrigen(id_origen);
    }
    if (activo !== undefined) {
      validatedData.activo = validateActivo(activo);
    }
    if (descripcion !== undefined) {
      validatedData.descripcion = validateDescripcion(descripcion);
    }

    // Al menos un campo debe estar presente para actualización
    if (Object.keys(validatedData).length === 0) {
      throw new Error('Al menos un campo debe ser proporcionado para actualización');
    }
  }

  return validatedData;
};

/**
 * Valida parámetros de path para operaciones GET/PUT/DELETE
 * @param {Object} pathParameters - Parámetros de path
 * @returns {Object} - Parámetros validados
 * @throws {Error} - Si la validación falla
 */
export const validatePathParameters = (pathParameters) => {
  if (!pathParameters || !pathParameters.id_ciclo) {
    throw new Error('id_ciclo es requerido en la ruta');
  }

  return {
    id_ciclo: validateIdCiclo(pathParameters.id_ciclo)
  };
};

/**
 * Crea la estructura completa del item para DynamoDB
 * @param {Object} validatedData - Datos validados
 * @param {boolean} isUpdate - Si es una actualización
 * @returns {Object} - Item completo para DynamoDB
 */
export const createDynamoDBItem = (validatedData, isUpdate = false) => {
  const keys = generateDynamoDBKeys(validatedData.id_ciclo);
  const currentTimestamp = new Date().toISOString();
  
  const item = {
    ...keys,
    id_ciclo: validatedData.id_ciclo,
    id_contrato: validatedData.id_contrato,
    id_origen: validatedData.id_origen,
    activo: validatedData.activo,
    descripcion: validatedData.descripcion,
    item_type: 'RK_PAI_CAT_CONTRATO_CICLO_DEV'
  };

  // Agregar GSI8 keys
  if (validatedData.id_origen && validatedData.id_contrato) {
    const gsi8Keys = generateGSI8Keys(validatedData.id_origen, validatedData.id_contrato, keys._pk);
    Object.assign(item, gsi8Keys);
  }

  if (isUpdate) {
    item.fecha_actualizacion = currentTimestamp;
  } else {
    item.fecha_creacion = currentTimestamp;
    item.fecha_actualizacion = currentTimestamp;
  }

  return item;
};

/**
 * Valida parámetros de consulta para operaciones GET
 * @param {Object} queryStringParameters - Parámetros de consulta
 * @returns {Object} - Parámetros validados
 */
export const validateQueryParameters = (queryStringParameters) => {
  const params = {};

  if (queryStringParameters) {
    // Validar limit
    if (queryStringParameters.limit) {
      const limit = Number(queryStringParameters.limit);
      if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
        throw new Error('limit debe ser un número entero entre 1 y 100');
      }
      params.limit = limit;
    }

    // Validar lastEvaluatedKey para paginación
    if (queryStringParameters.lastEvaluatedKey) {
      try {
        params.lastEvaluatedKey = JSON.parse(decodeURIComponent(queryStringParameters.lastEvaluatedKey));
      } catch (error) {
        throw new Error('lastEvaluatedKey debe ser un JSON válido');
      }
    }

    // Validar id_origen para filtros
    if (queryStringParameters.id_origen) {
      params.id_origen = validateIdOrigen(queryStringParameters.id_origen);
    }

    // Validar id_contrato para filtros
    if (queryStringParameters.id_contrato) {
      params.id_contrato = validateIdContrato(queryStringParameters.id_contrato);
    }

    // Validar activo para filtros
    if (queryStringParameters.activo !== undefined) {
      params.activo = validateActivo(queryStringParameters.activo);
    }
  }

  return params;
};
