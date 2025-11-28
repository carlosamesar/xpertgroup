/**
 * Utilidades de validación para entrada de datos
 * Siguiendo principios de Clean Code y seguridad
 */

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

  if (trimmedDesc.length > 255) {
    throw new Error('descripcion no puede exceder 255 caracteres');
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
 * @param {number} id_origen - ID del origen
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_origen) => {
  return {
    _pk: `CAT_ORIGEN#${id_origen}`,
    _sk: 'METADATA'
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

  const { id_origen, descripcion } = requestBody;

  const validatedData = {
    id_origen: validateIdOrigen(id_origen),
    descripcion: validateDescripcion(descripcion)
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
  const keys = generateDynamoDBKeys(validatedData.id_origen);
  
  const item = {
    ...keys,
    id_origen: validatedData.id_origen,
    descripcion: validatedData.descripcion,
    item_type: 'RK_PAI_CAT_ORIGEN_DEV'
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
  if (!pathParameters || !pathParameters.id) {
    throw new Error('Parámetro id es requerido en la URL');
  }

  const id_origen = validateIdOrigen(pathParameters.id);
  
  return {
    id_origen,
    keys: generateDynamoDBKeys(id_origen)
  };
};
