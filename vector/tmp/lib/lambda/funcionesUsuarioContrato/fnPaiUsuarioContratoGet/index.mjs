import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from '../utils/auth-validator.mjs';
import { validatePathParameters, validateQueryParameters } from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createNotFoundResponse, 
  handleDynamoDBError,
  withErrorHandling 
} from '../utils/response-utils.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para obtener usuario-contratos
 * Soporta:
 * - GET /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato} - Obtiene un registro específico
 * - GET /usuario-contrato?id_usuario=X - Obtiene todos los contratos de un usuario
 * - GET /usuario-contrato?id_contrato=X - Obtiene todos los usuarios de un contrato
 */
const mainHandler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // 1. Validar autenticación JWT
  const userPayload = await authenticateUser(event);
  console.log('Usuario autenticado:', userPayload.sub);

  // 2. Determinar tipo de consulta basado en parámetros
  const { pathParameters, queryStringParameters } = event;

  // Si hay parámetros de path, es una búsqueda específica
  if (pathParameters && Object.keys(pathParameters).length > 0) {
    return await getSpecificUsuarioContrato(pathParameters);
  }

  // Si hay parámetros de query, es una búsqueda filtrada
  if (queryStringParameters) {
    return await getFilteredUsuarioContratos(queryStringParameters);
  }

  // Si no hay parámetros, devolver error
  throw new Error('Se requieren parámetros de búsqueda');
};

/**
 * Obtiene un registro específico de usuario-contrato
 */
const getSpecificUsuarioContrato = async (pathParameters) => {
  // 3. Validar parámetros de path
  const { keys } = validatePathParameters(pathParameters);

  // 4. Consultar DynamoDB
  const command = new GetCommand({
    TableName: tableName,
    Key: keys
  });

  try {
    const result = await docClient.send(command);

    if (!result.Item) {
      return createNotFoundResponse('Usuario-Contrato');
    }

    // 5. Formatear respuesta
    const usuarioContrato = {
      id_usuario: result.Item.id_usuario,
      id_origen: result.Item.id_origen,
      id_contrato: result.Item.id_contrato,
      id_ciclo: result.Item.id_ciclo,
      id_participante: result.Item.id_participante,
      token_participante: result.Item.token_participante,
      createdAt: result.Item.createdAt,
      updatedAt: result.Item.updatedAt
    };

    return createSuccessResponse({
      usuarioContrato,
      message: 'Usuario-Contrato encontrado exitosamente'
    });

  } catch (error) {
    return handleDynamoDBError(error);
  }
};

/**
 * Obtiene registros filtrados de usuario-contratos
 */
const getFilteredUsuarioContratos = async (queryStringParameters) => {
  // 3. Validar parámetros de query
  const queryParams = validateQueryParameters(queryStringParameters);

  try {
    let result;

    if (queryParams.id_usuario) {
      // Buscar por usuario (PK)
      result = await queryByUsuario(queryParams.id_usuario, queryParams.id_ciclo);
    } else if (queryParams.id_contrato) {
      // Buscar por contrato (GSI5)
      result = await queryByContrato(queryParams.id_contrato, queryParams.id_ciclo);
    } else {
      throw new Error('Se requiere al menos id_usuario o id_contrato como parámetro de búsqueda');
    }

    // 4. Formatear respuesta
    const usuarioContratos = result.Items.map(item => ({
      id_usuario: item.id_usuario,
      id_origen: item.id_origen,
      id_contrato: item.id_contrato,
      id_ciclo: item.id_ciclo,
      id_participante: item.id_participante,
      token_participante: item.token_participante,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }));

    return createSuccessResponse({
      usuarioContratos,
      count: usuarioContratos.length,
      message: `${usuarioContratos.length} Usuario-Contratos encontrados`
    });

  } catch (error) {
    return handleDynamoDBError(error);
  }
};

/**
 * Consulta por usuario usando PK
 */
const queryByUsuario = async (id_usuario, id_ciclo = null) => {
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: '_pk = :pk',
    ExpressionAttributeValues: {
      ':pk': `USUARIO#${id_usuario}`
    }
  };

  // Filtrar por ciclo si se proporciona
  if (id_ciclo) {
    queryParams.FilterExpression = 'id_ciclo = :ciclo';
    queryParams.ExpressionAttributeValues[':ciclo'] = id_ciclo;
  }

  const command = new QueryCommand(queryParams);
  return await docClient.send(command);
};

/**
 * Consulta por contrato usando GSI5
 */
const queryByContrato = async (id_contrato, id_ciclo = null) => {
  const queryParams = {
    TableName: tableName,
    IndexName: 'GSI5',
    KeyConditionExpression: 'gsi5pk = :gsi5pk',
    ExpressionAttributeValues: {
      ':gsi5pk': `CONTRATO#${id_contrato}`
    }
  };

  // Filtrar por ciclo si se proporciona
  if (id_ciclo) {
    queryParams.FilterExpression = 'id_ciclo = :ciclo';
    queryParams.ExpressionAttributeValues[':ciclo'] = id_ciclo;
  }

  const command = new QueryCommand(queryParams);
  return await docClient.send(command);
};

// Exportar handler con manejo de errores
export const handler = withErrorHandling(mainHandler);
