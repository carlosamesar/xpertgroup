import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";

// Utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters,
  generateDynamoDBKeys
} from '../utils/validation-utils.mjs';
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  createNoContentResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operaciones DELETE de contratos
 */
export const handler = async (event) => {
  console.log('Event DELETE Contrato:', JSON.stringify(event, null, 2));

  try {
    // 1. Autenticación
    let tokenPayload;
    try {
      tokenPayload = await authenticateRequest(event);
    } catch (authError) {
      console.error('Error de autenticación:', authError.message);
      return createUnauthorizedResponse(authError.message);
    }

    // 2. Autorización - Solo admin puede eliminar contratos
    if (!authorizeOperation(tokenPayload, 'DELETE')) {
      return createUnauthorizedResponse('No tiene permisos para eliminar contratos');
    }

    // 3. Validar parámetros de path
    let validatedParams;
    try {
      validatedParams = validatePathParameters(event.pathParameters);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // 4. Generar claves para DynamoDB
    const keys = generateDynamoDBKeys(validatedParams.id_empresa);

    // 5. Verificar que el item existe antes de eliminar
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: keys
    });

    const existingItem = await docClient.send(getCommand);
    if (!existingItem.Item) {
      return createNotFoundResponse(
        `Contrato con id_empresa ${validatedParams.id_empresa} no encontrado`
      );
    }

    // 6. Guardar datos del item antes de eliminar (para respuesta)
    const deletedItem = { ...existingItem.Item };

    // 7. Ejecutar eliminación
    const deleteCommand = new DeleteCommand({
      TableName: tableName,
      Key: keys,
      ConditionExpression: 'attribute_exists(#pk)',
      ExpressionAttributeNames: {
        '#pk': '_pk'
      }
    });

    await docClient.send(deleteCommand);

    console.log('Contrato eliminado exitosamente:', keys._pk);

    // 8. Retornar confirmación con datos del item eliminado
    return createSuccessResponse(
      {
        deleted: true,
        item: deletedItem,
        deletedAt: new Date().toISOString()
      },
      200,
      'Contrato eliminado exitosamente'
    );

  } catch (error) {
    console.error('Error en handler DELETE:', error);
    return handleDynamoDBError(error);
  }
};
