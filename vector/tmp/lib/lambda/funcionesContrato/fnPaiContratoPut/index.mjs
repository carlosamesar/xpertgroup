import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

// Utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters,
  validateRequestBody,
  generateDynamoDBKeys,
  generateGSI7Keys
} from '../utils/validation-utils.mjs';
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operaciones PUT de contratos
 */
export const handler = async (event) => {
  console.log('Event PUT Contrato:', JSON.stringify(event, null, 2));

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
    if (!authorizeOperation(tokenPayload, 'PUT')) {
      return createUnauthorizedResponse('No tiene permisos para actualizar contratos');
    }

    // 3. Validar parámetros de path
    let validatedParams;
    try {
      validatedParams = validatePathParameters(event.pathParameters);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // 4. Validar cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      return createValidationErrorResponse('Formato JSON inválido en el cuerpo de la petición');
    }

    // 5. Validar datos de entrada para actualización
    let validatedData;
    try {
      validatedData = validateRequestBody(requestBody, true);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // 6. Generar claves para DynamoDB
    const keys = generateDynamoDBKeys(validatedParams.id_empresa);

    // 7. Verificar que el item existe antes de actualizar
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

    // 8. Construir expresión de actualización
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Campos a actualizar
    if (validatedData.id_contrato !== undefined) {
      updateExpressions.push('#id_contrato = :id_contrato');
      expressionAttributeNames['#id_contrato'] = 'id_contrato';
      expressionAttributeValues[':id_contrato'] = validatedData.id_contrato;
    }

    if (validatedData.id_origen !== undefined) {
      updateExpressions.push('#id_origen = :id_origen');
      expressionAttributeNames['#id_origen'] = 'id_origen';
      expressionAttributeValues[':id_origen'] = validatedData.id_origen;
    }

    if (validatedData.descripcion !== undefined) {
      updateExpressions.push('#descripcion = :descripcion');
      expressionAttributeNames['#descripcion'] = 'descripcion';
      expressionAttributeValues[':descripcion'] = validatedData.descripcion;
    }

    // Actualizar timestamp
    updateExpressions.push('#fecha_actualizacion = :fecha_actualizacion');
    expressionAttributeNames['#fecha_actualizacion'] = 'fecha_actualizacion';
    expressionAttributeValues[':fecha_actualizacion'] = new Date().toISOString();

    // Actualizar GSI7 si se modifican id_origen o id_contrato
    if (validatedData.id_origen !== undefined || validatedData.id_contrato !== undefined) {
      const currentOrigen = validatedData.id_origen || existingItem.Item.id_origen;
      const currentContrato = validatedData.id_contrato || existingItem.Item.id_contrato;
      
      if (currentOrigen && currentContrato) {
        const gsi7Keys = generateGSI7Keys(currentOrigen, currentContrato, keys._pk);
        
        updateExpressions.push('#gsi7pk = :gsi7pk');
        updateExpressions.push('#gsi7sk = :gsi7sk');
        expressionAttributeNames['#gsi7pk'] = 'gsi7pk';
        expressionAttributeNames['#gsi7sk'] = 'gsi7sk';
        expressionAttributeValues[':gsi7pk'] = gsi7Keys.gsi7pk;
        expressionAttributeValues[':gsi7sk'] = gsi7Keys.gsi7sk;
      }
    }

    // 9. Ejecutar actualización
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: keys,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(#pk)',
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(updateCommand);

    console.log('Contrato actualizado exitosamente:', keys._pk);

    return createSuccessResponse(
      result.Attributes,
      200,
      'Contrato actualizado exitosamente'
    );

  } catch (error) {
    console.error('Error en handler PUT:', error);
    return handleDynamoDBError(error);
  }
};
