import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

// Utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validateRequestBody,
  createDynamoDBItem
} from '../utils/validation-utils.mjs';
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createConflictResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operaciones POST de contratos
 */
export const handler = async (event) => {
  console.log('Event POST Contrato:', JSON.stringify(event, null, 2));

  try {
    // 1. Autenticación
    let tokenPayload;
    try {
      tokenPayload = await authenticateRequest(event);
    } catch (authError) {
      console.error('Error de autenticación:', authError.message);
      return createUnauthorizedResponse(authError.message);
    }

    // 2. Autorización
    if (!authorizeOperation(tokenPayload, 'POST')) {
      return createUnauthorizedResponse('No tiene permisos para crear contratos');
    }

    // 3. Validar cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return createValidationErrorResponse('Formato JSON inválido en el cuerpo de la petición');
    }

    // 4. Validar datos de entrada
    let validatedData;
    try {
      validatedData = validateRequestBody(requestBody, false);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // 5. Crear item para DynamoDB
    const dynamoDBItem = createDynamoDBItem(validatedData, false);

    // 6. Insertar en DynamoDB con condición de no existencia
    try {
      const command = new PutCommand({
        TableName: tableName,
        Item: dynamoDBItem,
        ConditionExpression: 'attribute_not_exists(#pk) AND attribute_not_exists(#sk)',
        ExpressionAttributeNames: {
          '#pk': '_pk',
          '#sk': '_sk'
        }
      });

      await docClient.send(command);

      console.log('Contrato creado exitosamente:', dynamoDBItem._pk);

      return createSuccessResponse(
        dynamoDBItem,
        201,
        'Contrato creado exitosamente'
      );

    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        return createConflictResponse(
          `Ya existe un contrato para la empresa ${validatedData.id_empresa}`
        );
      }
      throw error;
    }

  } catch (error) {
    console.error('Error en handler POST:', error);
    return handleDynamoDBError(error);
  }
};
