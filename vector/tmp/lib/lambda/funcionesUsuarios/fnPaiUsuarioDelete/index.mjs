import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validatePathParameters } from "../utils/validation-utils.mjs";
import { 
  createSuccessResponse, 
  createErrorResponse,
  handleDynamoDBError, 
  handleValidationError, 
  handleAuthenticationError 
} from "../utils/response-utils.mjs";

// Configuración de DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

/**
 * Handler para eliminar un usuario por ID
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
    console.log("Eliminando usuario con ID:", id_usuario);

    // 3. Comando para eliminar de DynamoDB
    // Usamos condición para asegurar que el usuario existe antes de eliminarlo
    const deleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: {
        _pk: keys._pk,
        _sk: keys._sk
      },
      ConditionExpression: "attribute_exists(#pk) AND attribute_exists(#sk)",
      ExpressionAttributeNames: {
        "#pk": "_pk",
        "#sk": "_sk"
      },
      ReturnValues: "ALL_OLD"
    });

    // 4. Ejecutar eliminación
    const result = await docClient.send(deleteCommand);

    // 5. Verificar si se eliminó algo
    if (!result.Attributes) {
      console.log(`Usuario con ID ${id_usuario} no encontrado para eliminar`);
      return createErrorResponse(404, `Usuario con ID ${id_usuario} no encontrado`, 'RESOURCE_NOT_FOUND');
    }

    console.log("Usuario eliminado exitosamente:", id_usuario);
    return createSuccessResponse(200, null, `Usuario con ID ${id_usuario} eliminado exitosamente`);

  } catch (error) {
    console.error("Error en fnPaiUsuarioDelete:", error);

    // Manejo específico de tipos de error
    if (error.message.includes('autorización') || error.message.includes('Token')) {
      return handleAuthenticationError(error);
    }

    if (error.message.includes('requerido') || error.message.includes('debe ser')) {
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
