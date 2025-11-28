import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validateRequestBody, validatePathParameters, createDynamoDBItem } from "../utils/validation-utils.mjs";
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
 * Handler para actualizar un registro de catálogo de grupo
 * Sigue principios de Clean Code y seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Validar parámetros de path
    const { id_grupo } = validatePathParameters(event.pathParameters);
    console.log("Actualizando registro con ID:", id_grupo);

    // 3. Validar y parsear el cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      return createErrorResponse(400, "Formato JSON inválido en el cuerpo de la petición");
    }

    // 4. Validar datos de entrada
    const validatedData = validateRequestBody(requestBody);
    
    // 5. Verificar que el ID del path coincida con el del body
    if (validatedData.id_grupo !== id_grupo) {
      return createErrorResponse(400, "El ID en la URL no coincide con el ID en el cuerpo de la petición");
    }

    console.log("Datos validados:", validatedData);

    // 6. Crear item para DynamoDB (actualización)
    const dynamoItem = createDynamoDBItem(validatedData, true);
    console.log("Item a actualizar:", dynamoItem);

    // 7. Comando para actualizar en DynamoDB
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: dynamoItem,
      ConditionExpression: "attribute_exists(#pk) AND attribute_exists(#sk)",
      ExpressionAttributeNames: {
        "#pk": "_pk",
        "#sk": "_sk"
      }
    });

    // 8. Ejecutar actualización
    await docClient.send(putCommand);

    // 9. Log de auditoría
    console.log(`Catálogo de grupo actualizado exitosamente - ID: ${validatedData.id_grupo} por usuario: ${userPayload.sub}`);

    // 10. Respuesta de éxito
    return createSuccessResponse(
      200, 
      {
        id_grupo: dynamoItem.id_grupo,
        descripcion: dynamoItem.descripcion,
        updated_at: dynamoItem.updatedAt,
        item_type: dynamoItem.item_type
      },
      "Catálogo de grupo actualizado exitosamente"
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
