import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validateRequestBody, createDynamoDBItem } from "../utils/validation-utils.mjs";
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
 * Handler para crear un nuevo registro de catálogo de grupo
 * Sigue principios de Clean Code y seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Validar y parsear el cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      return createErrorResponse(400, "Formato JSON inválido en el cuerpo de la petición");
    }

    // 3. Validar datos de entrada
    const validatedData = validateRequestBody(requestBody);
    console.log("Datos validados:", validatedData);

    // 4. Crear item para DynamoDB
    const dynamoItem = createDynamoDBItem(validatedData, false);
    console.log("Item a crear:", dynamoItem);

    // 5. Comando para insertar en DynamoDB
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: dynamoItem,
      ConditionExpression: "attribute_not_exists(#pk) AND attribute_not_exists(#sk)",
      ExpressionAttributeNames: {
        "#pk": "_pk",
        "#sk": "_sk"
      }
    });

    // 6. Ejecutar inserción
    await docClient.send(putCommand);

    // 7. Log de auditoría
    console.log(`Catálogo de grupo creado exitosamente - ID: ${validatedData.id_grupo} por usuario: ${userPayload.sub}`);

    // 8. Respuesta de éxito
    return createSuccessResponse(
      201, 
      {
        id_grupo: dynamoItem.id_grupo,
        descripcion: dynamoItem.descripcion,
        created_at: dynamoItem.createdAt,
        item_type: dynamoItem.item_type
      },
      "Catálogo de grupo creado exitosamente"
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
