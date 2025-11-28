import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// Importar utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validateRequestBody, 
  createDynamoDBItem
} from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createUnauthorizedResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  createMethodNotAllowedResponse,
  createConflictResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Configuración del cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operación POST del contrato ciclo
 * Crea un nuevo registro de contrato ciclo
 */
export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    // Validar método HTTP
    if (event.httpMethod !== 'POST') {
      return createMethodNotAllowedResponse(event.httpMethod);
    }

    // Autenticar la petición
    let tokenPayload;
    try {
      tokenPayload = await authenticateRequest(event);
    } catch (error) {
      console.error('Error de autenticación:', error);
      return createUnauthorizedResponse(error.message);
    }

    // Autorizar la operación
    if (!authorizeOperation(tokenPayload, 'POST')) {
      return createUnauthorizedResponse('No tiene permisos para realizar esta operación');
    }

    // Validar el cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error("Error parsing request body:", error);
      return createValidationErrorResponse("Formato JSON inválido en el cuerpo de la petición");
    }

    // Validar y sanitizar datos
    let validatedData;
    try {
      validatedData = validateRequestBody(requestBody, false); // false = no es actualización
    } catch (error) {
      console.error('Error de validación:', error);
      return createValidationErrorResponse(error.message);
    }

    // Crear item completo para DynamoDB
    const item = createDynamoDBItem(validatedData, false);

    // Agregar información del usuario que crea el registro
    item.created_by = tokenPayload.sub || 'unknown';
    item.updated_by = tokenPayload.sub || 'unknown';

    // Ejecutar inserción en DynamoDB
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
      // Condición para evitar sobreescribir registros existentes
      ConditionExpression: "attribute_not_exists(_pk) AND attribute_not_exists(_sk)"
    });

    try {
      await docClient.send(command);
      
      // Preparar respuesta limpia (remover claves internas)
      const responseItem = { ...item };
      delete responseItem._pk;
      delete responseItem._sk;
      delete responseItem.gsi8pk;
      delete responseItem.gsi8sk;

      return createSuccessResponse({
        message: "Contrato ciclo creado exitosamente",
        item: responseItem,
        metadata: {
          id_ciclo: validatedData.id_ciclo,
          created_at: item.fecha_creacion,
          timestamp: new Date().toISOString()
        }
      }, 201); // HTTP 201 Created

    } catch (error) {
      console.error("Error insertando en DynamoDB:", error);
      
      if (error.name === 'ConditionalCheckFailedException') {
        return createConflictResponse(
          `Contrato ciclo con id_ciclo ${validatedData.id_ciclo} ya existe`
        );
      }
      
      return handleDynamoDBError(error);
    }

  } catch (error) {
    console.error('Error inesperado:', error);
    return createInternalErrorResponse('Error interno del servidor', error);
  }
};
