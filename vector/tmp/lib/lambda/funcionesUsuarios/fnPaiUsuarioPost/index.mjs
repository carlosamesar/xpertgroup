import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validateRequestBody, createDynamoDBItem } from "../utils/validation-utils.mjs";
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
 * Handler para crear un nuevo usuario
 * Implementa autenticación JWT con Cognito y validaciones de seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Parsear cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      return createErrorResponse(400, "Formato JSON inválido en el cuerpo de la petición", "INVALID_JSON");
    }

    // 3. Validar datos de entrada
    const validatedData = validateRequestBody(requestBody, false);
    console.log("Datos validados para crear usuario:", validatedData.id_usuario);

    // 4. Crear item para DynamoDB
    const userItem = createDynamoDBItem(validatedData, false);

    // 5. Comando PUT con condición para evitar sobrescribir usuarios existentes
    const putCommand = new PutCommand({
      TableName: tableName,
      Item: userItem,
      ConditionExpression: "attribute_not_exists(#pk) AND attribute_not_exists(#sk)",
      ExpressionAttributeNames: {
        "#pk": "_pk",
        "#sk": "_sk"
      }
    });

    // 6. Ejecutar inserción
    await docClient.send(putCommand);

    // 7. Limpiar datos sensibles antes de retornar
    const sanitizedUser = sanitizeUserData(userItem);

    console.log("Usuario creado exitosamente:", validatedData.id_usuario);
    return createSuccessResponse(201, sanitizedUser, "Usuario creado exitosamente");

  } catch (error) {
    console.error("Error en fnPaiUsuarioPost:", error);

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
