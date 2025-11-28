import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validatePathParameters, validateRequestBody } from "../utils/validation-utils.mjs";
import { 
  createSuccessResponse, 
  createErrorResponse,
  handleDynamoDBError, 
  handleValidationError, 
  handleAuthenticationError,
  sanitizeUserData 
} from "../utils/response-utils.mjs";

// Configuración de DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

/**
 * Handler para actualizar un usuario existente
 * Implementa autenticación JWT con Cognito y validaciones de seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Validar parámetros de path
    const { id_usuario, keys } = validatePathParameters(event.pathParameters);
    console.log("Actualizando usuario con ID:", id_usuario);

    // 3. Parsear cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      return createErrorResponse(400, "Formato JSON inválido en el cuerpo de la petición", "INVALID_JSON");
    }

    // 4. Validar datos de entrada (modo actualización)
    const validatedData = validateRequestBody(requestBody, true);
    
    // 5. Construir expresión de actualización dinámicamente
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Campos que pueden ser actualizados
    const updateableFields = [
      'email', 'cod_act', 'cognito_sub', 'id_disp', 'blk', 
      'id_blk_motivo', 'id_estatus', 'app_version',
      'disp_os_type', 'disp_os_version', 'disp_os_model', 'disp_id_estatus'
    ];

    updateableFields.forEach(field => {
      if (validatedData[field] !== undefined && validatedData[field] !== null) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = validatedData[field];
      }
    });

    // Siempre actualizar timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Si se actualiza el estatus, actualizar fecha_estatus
    if (validatedData.id_estatus !== undefined) {
      updateExpressions.push('#fecha_estatus = :fecha_estatus');
      expressionAttributeNames['#fecha_estatus'] = 'fecha_estatus';
      expressionAttributeValues[':fecha_estatus'] = new Date().toISOString();
    }

    // Si se actualiza el estatus del dispositivo, actualizar fecha
    if (validatedData.disp_id_estatus !== undefined) {
      updateExpressions.push('#disp_fecha_estatus = :disp_fecha_estatus');
      expressionAttributeNames['#disp_fecha_estatus'] = 'disp_fecha_estatus';
      expressionAttributeValues[':disp_fecha_estatus'] = new Date().toISOString();
    }

    if (updateExpressions.length === 1) { // Solo updatedAt
      return createErrorResponse(400, "No se proporcionaron campos para actualizar", "NO_FIELDS_TO_UPDATE");
    }

    // 6. Comando de actualización
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        _pk: keys._pk,
        _sk: keys._sk
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(#pk) AND attribute_exists(#sk)",
      ReturnValues: "ALL_NEW"
    });

    // Añadir nombres de atributos para la condición
    updateCommand.ExpressionAttributeNames['#pk'] = '_pk';
    updateCommand.ExpressionAttributeNames['#sk'] = '_sk';

    // 7. Ejecutar actualización
    const result = await docClient.send(updateCommand);

    // 8. Limpiar datos sensibles antes de retornar
    const sanitizedUser = sanitizeUserData(result.Attributes);

    console.log("Usuario actualizado exitosamente:", id_usuario);
    return createSuccessResponse(200, sanitizedUser, "Usuario actualizado exitosamente");

  } catch (error) {
    console.error("Error en fnPaiUsuarioPut:", error);

    // Manejo específico de tipos de error
    if (error.message.includes('autorización') || error.message.includes('Token')) {
      return handleAuthenticationError(error);
    }

    if (error.message.includes('requerido') || error.message.includes('debe ser') || 
        error.message.includes('formato') || error.message.includes('contiene')) {
      return handleValidationError(error);
    }

    // Error de DynamoDB
    if (error.name && error.name.includes('Exception')) {
      return handleDynamoDBError(error);
    }

    // Error genérico
    return createErrorResponse(500, 'Error interno del servidor', 'INTERNAL_SERVER_ERROR');
  }
};
