import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

// Importar utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters,
  validateRequestBody, 
  generateDynamoDBKeys,
  generateGSI8Keys
} from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createNotFoundResponse,
  createUnauthorizedResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  createMethodNotAllowedResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Configuración del cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operación PUT del contrato ciclo
 * Actualiza un registro existente de contrato ciclo
 */
export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    // Validar método HTTP
    if (event.httpMethod !== 'PUT') {
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
    if (!authorizeOperation(tokenPayload, 'PUT')) {
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

    // Validar el cuerpo de la petición
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error("Error parsing request body:", error);
      return createValidationErrorResponse("Formato JSON inválido en el cuerpo de la petición");
    }

    // Validar y sanitizar datos para actualización
    let validatedData;
    try {
      validatedData = validateRequestBody(requestBody, true); // true = es actualización
    } catch (error) {
      console.error('Error de validación:', error);
      return createValidationErrorResponse(error.message);
    }

    // Verificar que el registro existe antes de actualizar
    const keys = generateDynamoDBKeys(id_ciclo);
    
    const getCommand = new GetCommand({
      TableName: tableName,
      Key: keys
    });

    const existingItem = await docClient.send(getCommand);
    
    if (!existingItem.Item) {
      return createNotFoundResponse(`Contrato ciclo con id_ciclo ${id_ciclo} no encontrado`);
    }

    // Construir expresión de actualización dinámica
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    // Campos que siempre se actualizan
    updateExpressions.push('#fecha_actualizacion = :fecha_actualizacion');
    updateExpressions.push('#updated_by = :updated_by');
    expressionAttributeNames['#fecha_actualizacion'] = 'fecha_actualizacion';
    expressionAttributeNames['#updated_by'] = 'updated_by';
    expressionAttributeValues[':fecha_actualizacion'] = new Date().toISOString();
    expressionAttributeValues[':updated_by'] = tokenPayload.sub || 'unknown';

    // Agregar campos del request que están presentes
    Object.keys(validatedData).forEach(key => {
      if (key !== 'id_ciclo') { // id_ciclo no se puede actualizar
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = validatedData[key];
      }
    });

    // Actualizar GSI8 keys si se actualizaron id_origen o id_contrato
    const currentItem = existingItem.Item;
    const newIdOrigen = validatedData.id_origen || currentItem.id_origen;
    const newIdContrato = validatedData.id_contrato || currentItem.id_contrato;
    
    if (newIdOrigen && newIdContrato) {
      const gsi8Keys = generateGSI8Keys(newIdOrigen, newIdContrato, keys._pk);
      updateExpressions.push('#gsi8pk = :gsi8pk');
      updateExpressions.push('#gsi8sk = :gsi8sk');
      expressionAttributeNames['#gsi8pk'] = 'gsi8pk';
      expressionAttributeNames['#gsi8sk'] = 'gsi8sk';
      expressionAttributeValues[':gsi8pk'] = gsi8Keys.gsi8pk;
      expressionAttributeValues[':gsi8sk'] = gsi8Keys.gsi8sk;
    }

    // Ejecutar actualización
    const updateCommand = new UpdateCommand({
      TableName: tableName,
      Key: keys,
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    try {
      const result = await docClient.send(updateCommand);
      
      // Preparar respuesta limpia
      const updatedItem = { ...result.Attributes };
      delete updatedItem._pk;
      delete updatedItem._sk;
      delete updatedItem.gsi8pk;
      delete updatedItem.gsi8sk;

      return createSuccessResponse({
        message: "Contrato ciclo actualizado exitosamente",
        item: updatedItem,
        metadata: {
          id_ciclo,
          updated_at: updatedItem.fecha_actualizacion,
          updated_fields: Object.keys(validatedData),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error("Error actualizando en DynamoDB:", error);
      return handleDynamoDBError(error);
    }

  } catch (error) {
    console.error('Error inesperado:', error);
    return createInternalErrorResponse('Error interno del servidor', error);
  }
};
