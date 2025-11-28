import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from "../utils/auth-validator.mjs";
import { validatePathParameters, validateDescripcion } from "../utils/validation-utils.mjs";
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
 * Handler para actualizar un registro de catálogo de origen
 * Sigue principios de Clean Code y seguridad
 */
export const handler = async (event) => {
  console.log("Evento recibido:", JSON.stringify(event, null, 2));

  try {
    // 1. Validar autenticación JWT
    const userPayload = await authenticateUser(event);
    console.log("Usuario autenticado:", userPayload.sub);

    // 2. Validar parámetros de path
    const { id_origen, keys } = validatePathParameters(event.pathParameters);
    console.log("Actualizando registro con ID:", id_origen);

    // 3. Validar y parsear el cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      return createErrorResponse(400, "Formato JSON inválido en el cuerpo de la petición");
    }

    // 4. Validar datos de entrada (solo descripción para PUT)
    if (!requestBody || typeof requestBody !== 'object') {
      return createErrorResponse(400, "Cuerpo de petición debe ser un objeto válido");
    }

    const { descripcion } = requestBody;
    const validatedDescripcion = validateDescripcion(descripcion);
    
    console.log("Descripción validada:", validatedDescripcion);

    // 5. Comando para actualizar en DynamoDB
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: {
        _pk: keys._pk,
        _sk: keys._sk
      },
      UpdateExpression: "SET descripcion = :desc, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(#pk) AND attribute_exists(#sk)",
      ExpressionAttributeNames: {
        "#pk": "_pk",
        "#sk": "_sk"
      },
      ExpressionAttributeValues: {
        ":desc": validatedDescripcion,
        ":updatedAt": new Date().toISOString()
      },
      ReturnValues: "ALL_NEW"
    });

    // 6. Ejecutar actualización
    const result = await docClient.send(updateCommand);

    // 7. Log de auditoría
    console.log(`Catálogo de origen actualizado - ID: ${id_origen} por usuario: ${userPayload.sub}`);

    // 8. Preparar datos de respuesta
    const responseData = {
      id_origen: result.Attributes.id_origen,
      descripcion: result.Attributes.descripcion,
      item_type: result.Attributes.item_type,
      created_at: result.Attributes.createdAt,
      updated_at: result.Attributes.updatedAt
    };

    // 9. Respuesta de éxito
    return createSuccessResponse(
      200, 
      responseData,
      "Catálogo de origen actualizado exitosamente"
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
