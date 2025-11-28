import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Importar utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters,
  generateDynamoDBKeys
} from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createNotFoundResponse,
  createUnauthorizedResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  createMethodNotAllowedResponse,
  createNoContentResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Configuración del cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operación DELETE del contrato ciclo
 * Elimina un registro existente de contrato ciclo
 */
export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    // Validar método HTTP
    if (event.httpMethod !== 'DELETE') {
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
    if (!authorizeOperation(tokenPayload, 'DELETE')) {
      return createUnauthorizedResponse('No tiene permisos para realizar esta operación');
    }

    // Validar parámetros de path
    let pathValidation;
    try {
      pathValidation = validatePathParameters(event.pathParameters);
    } catch (error) {
      console.error('Error validando path parameters:', error);
      return createValidationErrorResponse(error.message);
    }

    const { id_ciclo } = pathValidation;

    // Generar claves de DynamoDB
    const keys = generateDynamoDBKeys(id_ciclo);

    // Verificar que el registro existe antes de eliminar
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: keys
    });

    let existingItem;
    try {
      const result = await docClient.send(getCommand);
      existingItem = result.Item;
    } catch (error) {
      console.error("Error verificando existencia del item:", error);
      return handleDynamoDBError(error);
    }

    if (!existingItem) {
      return createNotFoundResponse(`Contrato ciclo con id_ciclo ${id_ciclo} no encontrado`);
    }

    // Preparar item para respuesta antes de eliminarlo
    const itemToDelete = { ...existingItem };
    delete itemToDelete._pk;
    delete itemToDelete._sk;
    delete itemToDelete.gsi8pk;
    delete itemToDelete.gsi8sk;

    // Ejecutar eliminación
    const deleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: keys,
      // Condición para asegurar que el item aún existe al momento de eliminar
      ConditionExpression: "attribute_exists(_pk) AND attribute_exists(_sk)",
      ReturnValues: 'ALL_OLD'
    });

    try {
      const result = await docClient.send(deleteCommand);
      
      return createSuccessResponse({
        message: "Contrato ciclo eliminado exitosamente",
        deleted_item: itemToDelete,
        metadata: {
          id_ciclo,
          deleted_at: new Date().toISOString(),
          deleted_by: tokenPayload.sub || 'unknown',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Error eliminando de DynamoDB:", error);
      
      if (error.name === 'ConditionalCheckFailedException') {
        return createNotFoundResponse(
          `Contrato ciclo con id_ciclo ${id_ciclo} no encontrado o ya fue eliminado`
        );
      }
      
      return handleDynamoDBError(error);
    }

  } catch (error) {
    console.error('Error inesperado:', error);
    return createInternalErrorResponse('Error interno del servidor', error);
  }
};
