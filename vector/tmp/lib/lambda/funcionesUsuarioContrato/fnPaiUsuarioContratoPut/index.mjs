import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from '../utils/auth-validator.mjs';
import { validatePathParameters, validateRequestBody } from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createValidationErrorResponse,
  handleDynamoDBError,
  withErrorHandling 
} from '../utils/response-utils.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para actualizar usuario-contratos
 * PUT /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato}
 */
const mainHandler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // 1. Validar autenticación JWT
  const userPayload = await authenticateUser(event);
  console.log('Usuario autenticado:', userPayload.sub);

  // 2. Validar parámetros de path
  const { keys } = validatePathParameters(event.pathParameters);

  // 3. Parsear cuerpo de la petición
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return createValidationErrorResponse("Formato JSON inválido en el cuerpo de la petición");
  }

  // 4. Validar datos de entrada (solo campos actualizables)
  const updateData = validateUpdateData(requestBody);

  // 5. Construir expresión de actualización dinámica
  const updateExpression = buildUpdateExpression(updateData);

  // 6. Configurar comando de actualización
  const command = new UpdateCommand({
    TableName: tableName,
    Key: keys,
    UpdateExpression: updateExpression.expression,
    ExpressionAttributeNames: updateExpression.names,
    ExpressionAttributeValues: updateExpression.values,
    ConditionExpression: "attribute_exists(_pk) AND attribute_exists(_sk)",
    ReturnValues: "ALL_NEW"
  });

  try {
    // 7. Ejecutar actualización en DynamoDB
    const result = await docClient.send(command);

    // 8. Formatear respuesta exitosa
    const responseData = {
      usuarioContrato: {
        id_usuario: result.Attributes.id_usuario,
        id_origen: result.Attributes.id_origen,
        id_contrato: result.Attributes.id_contrato,
        id_ciclo: result.Attributes.id_ciclo,
        id_participante: result.Attributes.id_participante,
        token_participante: result.Attributes.token_participante,
        createdAt: result.Attributes.createdAt,
        updatedAt: result.Attributes.updatedAt
      },
      message: 'Usuario-Contrato actualizado exitosamente'
    };

    return createSuccessResponse(responseData);

  } catch (error) {
    return handleDynamoDBError(error);
  }
};

/**
 * Valida los datos para actualización (solo campos permitidos)
 */
const validateUpdateData = (requestBody) => {
  if (!requestBody || typeof requestBody !== 'object' || Array.isArray(requestBody)) {
    throw new Error('Cuerpo de petición debe ser un objeto válido');
  }

  const allowedFields = ['id_ciclo', 'id_participante', 'token_participante'];
  const updateData = {};

  // Validar solo campos permitidos para actualización
  for (const field of allowedFields) {
    if (requestBody[field] !== undefined) {
      switch (field) {
        case 'id_ciclo':
          if (typeof requestBody[field] !== 'number' || requestBody[field] <= 0) {
            throw new Error('id_ciclo debe ser un número entero positivo');
          }
          updateData[field] = requestBody[field];
          break;
        
        case 'id_participante':
          if (typeof requestBody[field] !== 'number' || requestBody[field] <= 0) {
            throw new Error('id_participante debe ser un número entero positivo');
          }
          updateData[field] = requestBody[field];
          break;
        
        case 'token_participante':
          if (!requestBody[field] || typeof requestBody[field] !== 'string') {
            throw new Error('token_participante debe ser una cadena de texto válida');
          }
          const trimmedToken = requestBody[field].trim();
          if (trimmedToken.length === 0 || trimmedToken.length > 255) {
            throw new Error('token_participante debe tener entre 1 y 255 caracteres');
          }
          if (!/^[a-zA-Z0-9\-_]+$/.test(trimmedToken)) {
            throw new Error('token_participante contiene caracteres no permitidos');
          }
          updateData[field] = trimmedToken;
          break;
      }
    }
  }

  // Verificar que al menos un campo sea actualizable
  if (Object.keys(updateData).length === 0) {
    throw new Error('Se debe proporcionar al menos un campo para actualizar: id_ciclo, id_participante, token_participante');
  }

  return updateData;
};

/**
 * Construye la expresión de actualización dinámica para DynamoDB
 */
const buildUpdateExpression = (updateData) => {
  const setExpressions = [];
  const names = {};
  const values = {};

  // Agregar timestamp de actualización
  setExpressions.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  // Construir expresiones para cada campo a actualizar
  Object.keys(updateData).forEach(field => {
    const nameKey = `#${field}`;
    const valueKey = `:${field}`;
    
    setExpressions.push(`${nameKey} = ${valueKey}`);
    names[nameKey] = field;
    values[valueKey] = updateData[field];
  });

  return {
    expression: `SET ${setExpressions.join(', ')}`,
    names,
    values
  };
};

// Exportar handler con manejo de errores
export const handler = withErrorHandling(mainHandler);
