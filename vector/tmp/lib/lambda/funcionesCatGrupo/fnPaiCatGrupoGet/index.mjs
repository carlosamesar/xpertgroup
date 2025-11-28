import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validatePathParameters } from "../utils/validation-utils.mjs";
import { 
  createSuccessResponse, 
  createErrorResponse,
  createNotFoundResponse, 
  handleDynamoDBError, 
  handleValidationError, 
  handleAuthenticationError 
} from "../utils/response-utils.mjs";

// Configuración de DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const tableName = process.env.TABLE_NAME;

/**
 * Handler para obtener un registro de catálogo de grupo por ID
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
    console.log("Buscando registro con ID:", id_grupo);

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

    // 5. Verificar si el item existe
    if (!result.Item) {
      console.log(`Registro con ID ${id_grupo} no encontrado`);
      return createNotFoundResponse("Catálogo de grupo", id_grupo.toString());
    }

    // 6. Log de auditoría
    console.log(`Catálogo de grupo consultado - ID: ${id_grupo} por usuario: ${userPayload.sub}`);

    // 7. Preparar datos de respuesta (eliminar campos internos)
    const responseData = {
      id_grupo: result.Item.id_grupo,
      descripcion: result.Item.descripcion,
      item_type: result.Item.item_type,
      created_at: result.Item.createdAt,
      updated_at: result.Item.updatedAt
    };

    // 8. Respuesta de éxito
    return createSuccessResponse(
      200, 
      responseData,
      "Catálogo de grupo obtenido exitosamente"
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
