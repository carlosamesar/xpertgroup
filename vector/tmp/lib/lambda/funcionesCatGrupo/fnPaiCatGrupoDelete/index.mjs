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
 * Handler para eliminar un registro de catálogo de grupo
 * Sigue principios de Clean Code y seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Validar parámetros de path
    const { id_grupo, keys } = validatePathParameters(event.pathParameters);
    console.log("Eliminando registro con ID:", id_grupo);

    // 3. Comando para eliminar de DynamoDB
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

    // 5. Verificar si el item existía
    if (!result.Attributes) {
      console.log(`Registro con ID ${id_grupo} no encontrado para eliminar`);
      return createErrorResponse(404, `Catálogo de grupo con ID ${id_grupo} no encontrado`);
    }

    // 6. Log de auditoría
    console.log(`Catálogo de grupo eliminado exitosamente - ID: ${id_grupo} por usuario: ${userPayload.sub}`);

    // 7. Respuesta de éxito
    return createSuccessResponse(
      200, 
      {
        id_grupo: id_grupo,
        mensaje: "Registro eliminado exitosamente"
      },
      "Catálogo de grupo eliminado exitosamente"
    );

  } catch (error) {
    // Manejo centralizado de errores
    if (error.message.includes('Token') || error.message.includes('autorización')) {
      return handleAuthenticationError(error);
    }
    
    if (error.message.includes('requerido') || error.message.includes('debe ser') || error.message.includes('inválido')) {
      return handleValidationError(error);
    }
    
    if (error.name && error.name.includes('Exception')) {
      return handleDynamoDBError(error);
    }

    // Error genérico
    console.error("Error inesperado:", error);
    return createErrorResponse(500, "Error interno del servidor");
  }
};
