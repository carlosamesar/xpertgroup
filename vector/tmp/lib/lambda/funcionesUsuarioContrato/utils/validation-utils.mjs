/**
 * Utilidades de validación para usuario-contrato
 * Siguiendo principios de Clean Code y seguridad
 */

/**
 * Valida que el ID de usuario sea un número entero positivo
 * @param {any} id_usuario - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdUsuario = (id_usuario) => {
  if (id_usuario === undefined || id_usuario === null) {
    throw new Error('id_usuario es requerido');
  }

  const numericId = Number(id_usuario);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_usuario debe ser un número entero positivo');
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
 * Valida que el ID de participante sea un número entero positivo
 * @param {any} id_participante - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdParticipante = (id_participante) => {
  if (id_participante === undefined || id_participante === null) {
    throw new Error('id_participante es requerido');
  }

  const numericId = Number(id_participante);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_participante debe ser un número entero positivo');
  }

  return numericId;
};

/**
 * Valida y sanitiza el token de participante
 * @param {any} token_participante - Token a validar
 * @returns {string} - Token sanitizado
 * @throws {Error} - Si la validación falla
 */
export const validateTokenParticipante = (token_participante) => {
  if (!token_participante || typeof token_participante !== 'string') {
    throw new Error('token_participante es requerido y debe ser una cadena de texto');
  }

  const trimmedToken = token_participante.trim();
  
  if (trimmedToken.length === 0) {
    throw new Error('token_participante no puede estar vacío');
  }

  if (trimmedToken.length > 255) {
    throw new Error('token_participante no puede exceder 255 caracteres');
  }

  // Validar formato de token (solo alfanumérico y guiones)
  if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedToken)) {
    throw new Error('token_participante contiene caracteres no permitidos');
  }

  return trimmedToken;
};

/**
 * Genera las claves primarias y de ordenamiento para DynamoDB
 * @param {number} id_usuario - ID del usuario
 * @param {number} id_origen - ID del origen
 * @param {number} id_contrato - ID del contrato
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_usuario, id_origen, id_contrato) => {
  return {
    _pk: `USUARIO#${id_usuario}`,
    _sk: `CONTRATO_USUARIO#${id_origen}#${id_contrato}`
  };
};

/**
 * Valida el cuerpo de la petición para operaciones POST/PUT
 * @param {Object} requestBody - Cuerpo de la petición
 * @returns {Object} - Datos validados
 * @throws {Error} - Si la validación falla
 */
export const validateRequestBody = (requestBody) => {
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new Error('Cuerpo de petición debe ser un objeto válido');
  }

  const { id_usuario, id_origen, id_contrato, id_ciclo, id_participante, token_participante } = requestBody;

  const validatedData = {
    id_usuario: validateIdUsuario(id_usuario),
    id_origen: validateIdOrigen(id_origen),
    id_contrato: validateIdContrato(id_contrato),
    id_ciclo: validateIdCiclo(id_ciclo),
    id_participante: validateIdParticipante(id_participante),
    token_participante: validateTokenParticipante(token_participante)
  };

  return validatedData;
};

/**
 * Crea la estructura completa del item para DynamoDB
 * @param {Object} validatedData - Datos validados
 * @param {boolean} isUpdate - Si es una actualización
 * @returns {Object} - Item completo para DynamoDB
 */
export const createDynamoDBItem = (validatedData, isUpdate = false) => {
  const keys = generateDynamoDBKeys(validatedData.id_usuario, validatedData.id_origen, validatedData.id_contrato);
  
  const item = {
    ...keys,
    id_usuario: validatedData.id_usuario,
    id_origen: validatedData.id_origen,
    id_contrato: validatedData.id_contrato,
    id_ciclo: validatedData.id_ciclo,
    id_participante: validatedData.id_participante,
    token_participante: validatedData.token_participante,
    item_type: 'RK_PAI_USUARIO_CONTRATO_DEV',
    // GSI5 keys para búsquedas por contrato
    gsi5pk: `CONTRATO#${validatedData.id_contrato}`,
    gsi5sk: `USUARIO#${validatedData.id_usuario}`
  };

  if (isUpdate) {
    item.updatedAt = new Date().toISOString();
  } else {
    item.createdAt = new Date().toISOString();
  }

  return item;
};

/**
 * Valida parámetros de path para operaciones GET/DELETE
 * @param {Object} pathParameters - Parámetros de la URL
 * @returns {Object} - Parámetros validados
 * @throws {Error} - Si la validación falla
 */
export const validatePathParameters = (pathParameters) => {
  if (!pathParameters) {
    throw new Error('Parámetros de URL son requeridos');
  }

  const { id_usuario, id_origen, id_contrato } = pathParameters;

  if (!id_usuario || !id_origen || !id_contrato) {
    throw new Error('Parámetros id_usuario, id_origen e id_contrato son requeridos en la URL');
  }

  const validatedData = {
    id_usuario: validateIdUsuario(id_usuario),
    id_origen: validateIdOrigen(id_origen),
    id_contrato: validateIdContrato(id_contrato)
  };
  
  return {
    ...validatedData,
    keys: generateDynamoDBKeys(validatedData.id_usuario, validatedData.id_origen, validatedData.id_contrato)
  };
};

/**
 * Valida parámetros de query para búsquedas
 * @param {Object} queryStringParameters - Parámetros de query
 * @returns {Object} - Parámetros validados
 */
export const validateQueryParameters = (queryStringParameters) => {
  const params = {};
  
  if (queryStringParameters) {
    // Validar filtros opcionales
    if (queryStringParameters.id_usuario) {
      params.id_usuario = validateIdUsuario(queryStringParameters.id_usuario);
    }
    
    if (queryStringParameters.id_contrato) {
      params.id_contrato = validateIdContrato(queryStringParameters.id_contrato);
    }
    
    if (queryStringParameters.id_ciclo) {
      params.id_ciclo = validateIdCiclo(queryStringParameters.id_ciclo);
    }
  }
  
  return params;
};
