import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

// Importar utilidades
import { authenticateRequest, authorizeOperation } from '../utils/auth-validator.mjs';
import { 
  validatePathParameters, 
  validateQueryParameters, 
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
  createPaginatedResponse,
  handleDynamoDBError
} from '../utils/response-utils.mjs';

// Configuración del cliente DynamoDB
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para operaciones GET del contrato ciclo
 * Soporta:
 * - GET /contrato-ciclo/{id_ciclo} - Obtener un ciclo específico
 * - GET /contrato-ciclo - Listar ciclos con filtros opcionales
 */
export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  try {
    // Validar método HTTP
    if (event.httpMethod !== 'GET') {
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
    if (!authorizeOperation(tokenPayload, 'GET')) {
      return createUnauthorizedResponse('No tiene permisos para realizar esta operación');
    }

    // Determinar si es una consulta específica o listado
    const pathParameters = event.pathParameters;
    
    if (pathParameters && pathParameters.id_ciclo) {
      // Consulta específica por id_ciclo
      return await getContratoCicloById(pathParameters);
    } else {
      // Listado con filtros opcionales
      return await listContratoCiclos(event.queryStringParameters);
    }

  } catch (error) {
    console.error('Error inesperado:', error);
    return createInternalErrorResponse('Error interno del servidor', error);
  }
};

/**
 * Obtiene un contrato ciclo específico por ID
 * @param {Object} pathParameters - Parámetros de la ruta
 * @returns {Object} - Respuesta HTTP
 */
async function getContratoCicloById(pathParameters) {
  try {
    // Validar parámetros de path
    const validatedParams = validatePathParameters(pathParameters);
    const { id_ciclo } = validatedParams;

    // Generar claves de DynamoDB
    const keys = generateDynamoDBKeys(id_ciclo);

    // Ejecutar consulta en DynamoDB
    const command = new GetCommand({
      TableName: tableName,
      Key: keys,
      ConsistentRead: false // Usar eventual consistency para mejor rendimiento
    });

    const result = await docClient.send(command);

    if (!result.Item) {
      return createNotFoundResponse(`Contrato ciclo con id_ciclo ${id_ciclo} no encontrado`);
    }

    // Preparar respuesta limpia (remover claves internas de DynamoDB)
    const item = { ...result.Item };
    delete item._pk;
    delete item._sk;
    delete item.gsi8pk;
    delete item.gsi8sk;

    return createSuccessResponse({
      item,
      metadata: {
        id_ciclo,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo contrato ciclo por ID:', error);
    
    if (error.message && error.message.includes('validación')) {
      return createValidationErrorResponse(error.message);
    }
    
    return handleDynamoDBError(error);
  }
}

/**
 * Lista contratos ciclos con filtros opcionales
 * @param {Object} queryStringParameters - Parámetros de consulta
 * @returns {Object} - Respuesta HTTP con paginación
 */
async function listContratoCiclos(queryStringParameters) {
  try {
    // Validar parámetros de consulta
    const validatedParams = validateQueryParameters(queryStringParameters);
    const { 
      limit = 20, 
      lastEvaluatedKey, 
      id_origen, 
      id_contrato, 
      activo 
    } = validatedParams;

    let command;
    let items = [];
    let lastKey = null;

    // Si se proporcionan id_origen e id_contrato, usar GSI8
    if (id_origen && id_contrato) {
      // Buscar usando GSI8
      const gsi8pk = `ORIGEN#${id_origen}#ID_CONTRATO#${id_contrato}`;
      
      command = new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI8',
        KeyConditionExpression: 'gsi8pk = :gsi8pk',
        ExpressionAttributeValues: {
          ':gsi8pk': gsi8pk
        },
        Limit: limit,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      });

    } else {
      // Búsqueda general por prefijo de PK
      command = new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: '_pk BEGINS_WITH :pkPrefix AND _sk = :sk',
        ExpressionAttributeValues: {
          ':pkPrefix': 'CAT_CONTRATO_CICLO#',
          ':sk': 'METADATA'
        },
        Limit: limit,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      });
    }

    // Agregar filtro por activo si se especifica
    if (activo !== undefined) {
      if (command.FilterExpression) {
        command.FilterExpression += ' AND activo = :activo';
      } else {
        command.FilterExpression = 'activo = :activo';
      }
      command.ExpressionAttributeValues[':activo'] = activo;
    }

    const result = await docClient.send(command);
    items = result.Items || [];
    lastKey = result.LastEvaluatedKey;

    // Limpiar items (remover claves internas)
    const cleanedItems = items.map(item => {
      const cleanItem = { ...item };
      delete cleanItem._pk;
      delete cleanItem._sk;
      delete cleanItem.gsi8pk;
      delete cleanItem.gsi8sk;
      return cleanItem;
    });

    const metadata = {
      query: {
        limit,
        ...(id_origen && { id_origen }),
        ...(id_contrato && { id_contrato }),
        ...(activo !== undefined && { activo })
      },
      timestamp: new Date().toISOString()
    };

    return createPaginatedResponse(
      cleanedItems,
      lastKey,
      cleanedItems.length,
      metadata
    );

  } catch (error) {
    console.error('Error listando contratos ciclos:', error);
    
    if (error.message && error.message.includes('validación')) {
      return createValidationErrorResponse(error.message);
    }
    
    return handleDynamoDBError(error);
  }
}
