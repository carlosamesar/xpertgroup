/**
 * Utilidades de validación para usuarios RK_PAI_USUARIO_DEV
 * Siguiendo principios de Clean Code y seguridad
 */

/**
 * Valida que el ID de usuario sea una cadena válida
 * @param {any} id_usuario - ID a validar
 * @returns {string} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdUsuario = (id_usuario) => {
  if (id_usuario === undefined || id_usuario === null) {
    throw new Error('id_usuario es requerido');
  }

  if (typeof id_usuario !== 'string') {
    throw new Error('id_usuario debe ser una cadena de texto');
  }

  const trimmedId = id_usuario.trim();
  
  if (trimmedId.length === 0) {
    throw new Error('id_usuario no puede estar vacío');
  }

  if (trimmedId.length > 50) {
    throw new Error('id_usuario no puede exceder 50 caracteres');
  }

  // Validar formato alfanumérico con guiones y underscores permitidos
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmedId)) {
    throw new Error('id_usuario solo puede contener letras, números, guiones y underscores');
  }

  return trimmedId;
};

/**
 * Valida el email del usuario
 * @param {any} email - Email a validar
 * @returns {string} - Email validado
 * @throws {Error} - Si la validación falla
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    throw new Error('email es requerido y debe ser una cadena de texto');
  }

  const trimmedEmail = email.trim().toLowerCase();
  
  if (trimmedEmail.length === 0) {
    throw new Error('email no puede estar vacío');
  }

  // Validación básica de formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new Error('formato de email inválido');
  }

  if (trimmedEmail.length > 255) {
    throw new Error('email no puede exceder 255 caracteres');
  }

  return trimmedEmail;
};

/**
 * Valida el código de activación
 * @param {any} cod_act - Código a validar
 * @returns {string} - Código validado
 * @throws {Error} - Si la validación falla
 */
export const validateCodAct = (cod_act) => {
  if (cod_act && typeof cod_act !== 'string') {
    throw new Error('cod_act debe ser una cadena de texto');
  }

  if (cod_act && cod_act.trim().length > 50) {
    throw new Error('cod_act no puede exceder 50 caracteres');
  }

  cod_act = generateActivationCode() || cod_act;
  return cod_act ? cod_act.trim() : null;
};

/**
 * Valida el cognito_sub
 * @param {any} cognito_sub - Sub a validar
 * @returns {string} - Sub validado
 * @throws {Error} - Si la validación falla
 */
export const validateCognitoSub = (cognito_sub) => {
  if (cognito_sub && typeof cognito_sub !== 'string') {
    throw new Error('cognito_sub debe ser una cadena de texto');
  }

  if (cognito_sub && cognito_sub.trim().length > 100) {
    throw new Error('cognito_sub no puede exceder 100 caracteres');
  }

  return cognito_sub ? cognito_sub.trim() : null;
};

/**
 * Valida el ID del dispositivo
 * @param {any} id_disp - ID del dispositivo a validar
 * @returns {string} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateIdDisp = (id_disp) => {
  if (id_disp && typeof id_disp !== 'string') {
    throw new Error('id_disp debe ser una cadena de texto');
  }

  if (id_disp && id_disp.trim().length > 100) {
    throw new Error('id_disp no puede exceder 100 caracteres');
  }

  return id_disp ? id_disp.trim() : null;
};

/**
 * Valida el estado de bloqueo
 * @param {any} blk - Estado de bloqueo a validar
 * @returns {string} - Estado validado
 * @throws {Error} - Si la validación falla
 */
export const validateBlk = (blk) => {
  if (blk && typeof blk !== 'string') {
    throw new Error('blk debe ser una cadena de texto');
  }

  const validValues = ['Y', 'N', 'S'];
  if (blk && !validValues.includes(blk.toUpperCase())) {
    throw new Error('blk debe ser Y, N o S');
  }

  return blk ? blk.toUpperCase() : 'N';
};

/**
 * Valida IDs numéricos (motivo de bloqueo, estatus)
 * @param {any} id - ID a validar
 * @param {string} fieldName - Nombre del campo para mensajes de error
 * @returns {number} - ID validado
 * @throws {Error} - Si la validación falla
 */
export const validateNumericId = (id, fieldName) => {
  if (id === undefined || id === null) {
    return null;
  }

  const numericId = Number(id);
  
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new Error(`${fieldName} debe ser un número entero positivo`);
  }

  return numericId;
};

/**
 * Valida la versión de la aplicación
 * @param {any} app_version - Versión a validar
 * @returns {string} - Versión validada
 * @throws {Error} - Si la validación falla
 */
export const validateAppVersion = (app_version) => {
  if (app_version && typeof app_version !== 'string') {
    throw new Error('app_version debe ser una cadena de texto');
  }

  if (app_version && app_version.trim().length > 20) {
    throw new Error('app_version no puede exceder 20 caracteres');
  }

  return app_version ? app_version.trim() : null;
};

/**
 * Valida campos de dispositivo
 * @param {any} value - Valor a validar
 * @param {string} fieldName - Nombre del campo
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Valor validado
 * @throws {Error} - Si la validación falla
 */
export const validateDeviceField = (value, fieldName, maxLength = 100) => {
  if (value && typeof value !== 'string') {
    throw new Error(`${fieldName} debe ser una cadena de texto`);
  }

  if (value && value.trim().length > maxLength) {
    throw new Error(`${fieldName} no puede exceder ${maxLength} caracteres`);
  }

  return value ? value.trim() : null;
};

/**
 * Genera las claves primarias y de ordenamiento para DynamoDB
 * @param {string} id_usuario - ID del usuario
 * @returns {Object} - Objeto con _pk y _sk
 */
export const generateDynamoDBKeys = (id_usuario) => {
  return {
    _pk: `USUARIO#${id_usuario}`,
    _sk: 'METADATA'
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

  const {
    id_usuario,
    email,
    cod_act,
    cognito_sub,
    id_disp,
    blk,
    id_blk_motivo,
    id_estatus,
    app_version,
    // Campos de dispositivo embebidos
    disp_os_type,
    disp_os_version,
    disp_os_model,
    disp_id_estatus
  } = requestBody;

  // Para updates, id_usuario es opcional ya que viene del path
  const validatedData = {};

  if (id_usuario || !isUpdate) {
    validatedData.id_usuario = validateIdUsuario(id_usuario);
  }

  if (email || !isUpdate) {
    validatedData.email = validateEmail(email);
  }

  // Campos opcionales
  validatedData.cod_act = validateCodAct(cod_act);
  validatedData.cognito_sub = validateCognitoSub(cognito_sub);
  validatedData.id_disp = validateIdDisp(id_disp);
  validatedData.blk = validateBlk(blk);
  validatedData.id_blk_motivo = validateNumericId(id_blk_motivo, 'id_blk_motivo');
  validatedData.id_estatus = validateNumericId(id_estatus, 'id_estatus');
  validatedData.app_version = validateAppVersion(app_version);

  // Campos de dispositivo embebidos
  validatedData.disp_os_type = validateDeviceField(disp_os_type, 'disp_os_type', 50);
  validatedData.disp_os_version = validateDeviceField(disp_os_version, 'disp_os_version', 50);
  validatedData.disp_os_model = validateDeviceField(disp_os_model, 'disp_os_model', 100);
  validatedData.disp_id_estatus = validateNumericId(disp_id_estatus, 'disp_id_estatus');

  return validatedData;
};

/**
 * Crea la estructura completa del item para DynamoDB
 * @param {Object} validatedData - Datos validados
 * @param {boolean} isUpdate - Si es una actualización
 * @returns {Object} - Item completo para DynamoDB
 */
export const createDynamoDBItem = (validatedData, isUpdate = false) => {
  const keys = generateDynamoDBKeys(validatedData.id_usuario);
  
  const item = {
    ...keys,
    id_usuario: validatedData.id_usuario,
    email: validatedData.email,
    item_type: 'RK_PAI_USUARIO_APP_DEV'
  };

  // Añadir campos opcionales solo si tienen valor
  if (validatedData.cod_act) item.cod_act = validatedData.cod_act;
  if (validatedData.cognito_sub) item.cognito_sub = validatedData.cognito_sub;
  if (validatedData.id_disp) item.id_disp = validatedData.id_disp;
  if (validatedData.blk) item.blk = validatedData.blk;
  if (validatedData.id_blk_motivo) item.id_blk_motivo = validatedData.id_blk_motivo;
  if (validatedData.id_estatus) item.id_estatus = validatedData.id_estatus;
  if (validatedData.app_version) item.app_version = validatedData.app_version;

  // Campos de dispositivo embebidos
  if (validatedData.disp_os_type) item.disp_os_type = validatedData.disp_os_type;
  if (validatedData.disp_os_version) item.disp_os_version = validatedData.disp_os_version;
  if (validatedData.disp_os_model) item.disp_os_model = validatedData.disp_os_model;
  if (validatedData.disp_id_estatus) item.disp_id_estatus = validatedData.disp_id_estatus;

  // Timestamps
  if (isUpdate) {
    item.updatedAt = new Date().toISOString();
    if (validatedData.disp_id_estatus) {
      item.disp_fecha_estatus = new Date().toISOString();
    }
  } else {
    item.createdAt = new Date().toISOString();
    item.cod_act_vig = new Date().toISOString();
    item.fecha_estatus = new Date().toISOString();
    if (validatedData.disp_id_estatus) {
      item.disp_fecha_estatus = new Date().toISOString();
    }
  }

  return item;
};

/**
 * Valida parámetros de path para operaciones GET/PUT/DELETE
 * @param {Object} pathParameters - Parámetros de la URL
 * @returns {Object} - Parámetros validados
 * @throws {Error} - Si la validación falla
 */
export const validatePathParameters = (pathParameters) => {
  if (!pathParameters || !pathParameters.id) {
    throw new Error('Parámetro id es requerido en la URL');
  }

  const id_usuario = validateIdUsuario(pathParameters.id);
  
  return {
    id_usuario,
    keys: generateDynamoDBKeys(id_usuario)
  };
};

/**
 * Genera un código de activación aleatorio de 9 caracteres
 * Utiliza caracteres alfanuméricos excluyendo caracteres ambiguos (0, O, I, l, 1)
 * @returns {string} - Código de activación de 9 caracteres
 */
export const generateActivationCode = () => {
  // Caracteres permitidos (excluyendo ambiguos para mayor claridad)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  
  // Usar crypto.getRandomValues para mayor seguridad si está disponible
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(9);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < 9; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    // Fallback usando Math.random
    for (let i = 0; i < 9; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  
  return result;
};
