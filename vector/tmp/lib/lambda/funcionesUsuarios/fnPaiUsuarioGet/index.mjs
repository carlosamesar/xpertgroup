import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validatePathParameters } from "../utils/validation-utils.mjs";
import { 
  createSuccessResponse, 
  createNotFoundResponse, 
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
 * Handler para obtener un usuario por ID
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
    console.log("Buscando usuario con ID:", id_usuario);

    // 3. Comando para obtener de DynamoDB
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: {
        _pk: keys._pk,
        _sk: keys._sk
      }
    });

    // 4. Ejecutar consulta
    const result = await docClient.send(getCommand);

    // 5. Verificar si el usuario existe
    if (!result.Item) {
      console.log(`Usuario con ID ${id_usuario} no encontrado`);
      return createNotFoundResponse("Usuario", id_usuario);
    }

    // 6. Limpiar datos sensibles antes de retornar
    const sanitizedUser = sanitizeUserData(result.Item);

    console.log("Usuario encontrado exitosamente");
    return createSuccessResponse(200, sanitizedUser, "Usuario obtenido exitosamente");

  } catch (error) {
    console.error("Error en fnPaiUsuarioGet:", error);

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
