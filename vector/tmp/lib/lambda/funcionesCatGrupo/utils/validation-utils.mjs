/**
 * Utilidades de validación para catálogo de grupos
 * Siguiendo principios de Clean Code y seguridad
 */

/**
 * Valida que el ID de grupo sea un número entero positivo
 * @param {any} id_grupo - ID a validar
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdGrupo = (id_grupo) => {
  if (id_grupo === undefined || id_grupo === null) {
    throw new Error('id_grupo es requerido');
  }

  const numericId = Number(id_grupo);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error('id_grupo debe ser un número entero positivo');
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
 * @param {number} id_grupo - ID del grupo
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_grupo) => {
  return {
    _pk: `CAT_GRUPO#${id_grupo}`,
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

  const { id_grupo, descripcion } = requestBody;

  const validatedData = {
    id_grupo: validateIdGrupo(id_grupo),
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
  const keys = generateDynamoDBKeys(validatedData.id_grupo);
  
  const item = {
    ...keys,
    id_grupo: validatedData.id_grupo,
    descripcion: validatedData.descripcion,
    item_type: 'RK_PAI_CAT_GRUPO_DEV'
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

  const id_grupo = validateIdGrupo(pathParameters.id);
  
  return {
    id_grupo,
    keys: generateDynamoDBKeys(id_grupo)
  };
};
