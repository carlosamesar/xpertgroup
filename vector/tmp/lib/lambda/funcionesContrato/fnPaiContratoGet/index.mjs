import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

// Utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters,
  validateQueryParameters,
  generateDynamoDBKeys
} from '../utils/validation-utils.mjs';
import {
  createSuccessResponse,
  createErrorResponse,
  createUnauthorizedResponse,
  createNotFoundResponse,
  createInternalErrorResponse,
  createValidationErrorResponse,
  createPaginatedResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operaciones GET de contratos
 */
export const handler = async (event) => {
  console.log('Event GET Contrato:', JSON.stringify(event, null, 2));

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
    if (!authorizeOperation(tokenPayload, 'GET')) {
      return createUnauthorizedResponse('No tiene permisos para realizar esta operación');
    }

    // 3. Determinar tipo de operación GET
    const pathParameters = event.pathParameters;
    const queryStringParameters = event.queryStringParameters;

    // Validar parámetros de consulta
    let queryParams;
    try {
      queryParams = validateQueryParameters(queryStringParameters);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // Caso 1: GET específico por id_empresa
    if (pathParameters && pathParameters.id_empresa) {
      return await getContratoById(pathParameters, queryParams);
    }

    // Caso 2: GET con filtros por query parameters
    if (queryParams.id_origen) {
      return await getContratosByOrigen(queryParams);
    }

    // Caso 3: GET todos los contratos (con paginación)
    return await getAllContratos(queryParams);

  } catch (error) {
    console.error('Error en handler GET:', error);
    return createInternalErrorResponse('Error interno del servidor', error);
  }
};

/**
 * Obtiene un contrato específico por ID de empresa
 */
const getContratoById = async (pathParameters, queryParams) => {
  try {
    // Validar parámetros de path
    let validatedParams;
    try {
      validatedParams = validatePathParameters(pathParameters);
    } catch (validationError) {
      return createValidationErrorResponse(validationError.message);
    }

    // Generar claves para DynamoDB
    const keys = generateDynamoDBKeys(validatedParams.id_empresa);

    // Ejecutar consulta
    const command = new GetCommand({
      TableName: tableName,
      Key: keys
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return createNotFoundResponse(`Contrato con id_empresa ${validatedParams.id_empresa} no encontrado`);
    }

    return createSuccessResponse(result.Item, 200, 'Contrato obtenido exitosamente');

  } catch (error) {
    console.error('Error obteniendo contrato por ID:', error);
    return handleDynamoDBError(error);
  }
};

/**
 * Obtiene contratos filtrados por origen usando GSI7
 */
const getContratosByOrigen = async (queryParams) => {
  try {
    const { id_origen, limit = 50, lastEvaluatedKey } = queryParams;

    const params = {
      TableName: tableName,
      IndexName: 'GSI7', // Índice por origen
      KeyConditionExpression: 'begins_with(gsi7pk, :origenPrefix)',
      ExpressionAttributeValues: {
        ':origenPrefix': `ORIGEN#${id_origen}#`
      },
      Limit: limit
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const command = new QueryCommand(params);
    const result = await docClient.send(command);

    return createPaginatedResponse(
      result.Items || [],
      result.LastEvaluatedKey,
      result.Count,
      { 
        filteredBy: 'origen',
        id_origen 
      }
    );

  } catch (error) {
    console.error('Error obteniendo contratos por origen:', error);
    return handleDynamoDBError(error);
  }
};

/**
 * Obtiene todos los contratos con paginación
 */
const getAllContratos = async (queryParams) => {
  try {
    const { limit = 50, lastEvaluatedKey } = queryParams;

    const params = {
      TableName: tableName,
      FilterExpression: 'item_type = :itemType',
      ExpressionAttributeValues: {
        ':itemType': 'RK_PAI_CAT_CONTRATO_DEV'
      },
      Limit: limit
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    return createPaginatedResponse(
      result.Items || [],
      result.LastEvaluatedKey,
      result.Count,
      { 
        operation: 'scan_all',
        totalScanned: result.ScannedCount 
      }
    );

  } catch (error) {
    console.error('Error obteniendo todos los contratos:', error);
    return handleDynamoDBError(error);
  }
};
