/**
 * Utilidades de validación para contratos
 * Siguiendo principios de Clean Code y seguridad
 */

/**
 * Valida que el ID de empresa sea un número entero positivo
 * @param {any} id_empresa - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdEmpresa = (id_empresa) => {
  if (id_empresa === undefined || id_empresa === null) {
    throw new Error('id_empresa es requerido');
  }

  const numericId = Number(id_empresa);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_empresa debe ser un número entero positivo');
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
 * @param {number} id_empresa - ID de la empresa
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_empresa) => {
  return {
    _pk: `CAT_CONTRATO#${id_empresa}`,
    _sk: 'METADATA'
  };
};

/**
 * Genera las claves para GSI7 (Global Secondary Index)
 * @param {number} id_origen - ID del origen
 * @param {number} id_contrato - ID del contrato
 * @param {string} pk - Primary key para GSI7SK
 * @returns {Object} - Objeto con claves GSI7
 */
export const generateGSI7Keys = (id_origen, id_contrato, pk) => {
  return {
    gsi7pk: `ORIGEN#${id_origen}#ID_CONTRATO#${id_contrato}`,
    gsi7sk: pk
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

  const { id_empresa, id_contrato, id_origen, descripcion } = requestBody;

  const validatedData = {};

  // Para POST, todos los campos son requeridos
  if (!isUpdate) {
    validatedData.id_empresa = validateIdEmpresa(id_empresa);
    validatedData.id_contrato = validateIdContrato(id_contrato);
    validatedData.id_origen = validateIdOrigen(id_origen);
    validatedData.descripcion = validateDescripcion(descripcion);
  } else {
    // Para PUT, solo validar campos presentes
    if (id_empresa !== undefined) {
      validatedData.id_empresa = validateIdEmpresa(id_empresa);
    }
    if (id_contrato !== undefined) {
      validatedData.id_contrato = validateIdContrato(id_contrato);
    }
    if (id_origen !== undefined) {
      validatedData.id_origen = validateIdOrigen(id_origen);
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
  if (!pathParameters || !pathParameters.id_empresa) {
    throw new Error('id_empresa es requerido en la ruta');
  }

  return {
    id_empresa: validateIdEmpresa(pathParameters.id_empresa)
  };
};

/**
 * Crea la estructura completa del item para DynamoDB
 * @param {Object} validatedData - Datos validados
 * @param {boolean} isUpdate - Si es una actualización
 * @returns {Object} - Item completo para DynamoDB
 */
export const createDynamoDBItem = (validatedData, isUpdate = false) => {
  const keys = generateDynamoDBKeys(validatedData.id_empresa);
  const currentTimestamp = new Date().toISOString();
  
  const item = {
    ...keys,
    id_empresa: validatedData.id_empresa,
    id_contrato: validatedData.id_contrato,
    id_origen: validatedData.id_origen,
    descripcion: validatedData.descripcion,
    item_type: 'RK_PAI_CAT_CONTRATO_DEV'
  };

  // Agregar GSI7 keys
  if (validatedData.id_origen && validatedData.id_contrato) {
    const gsi7Keys = generateGSI7Keys(validatedData.id_origen, validatedData.id_contrato, keys._pk);
    Object.assign(item, gsi7Keys);
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
  }

  return params;
};
