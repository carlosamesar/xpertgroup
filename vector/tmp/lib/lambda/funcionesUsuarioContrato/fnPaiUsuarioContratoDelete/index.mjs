import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from '../utils/auth-validator.mjs';
import { validatePathParameters } from '../utils/validation-utils.mjs';
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
 * Handler principal para eliminar usuario-contratos
 * DELETE /usuario-contrato/{id_usuario}/{id_origen}/{id_contrato}
 */
const mainHandler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // 1. Validar autenticación JWT
  const userPayload = await authenticateUser(event);
  console.log('Usuario autenticado:', userPayload.sub);

  // 2. Validar parámetros de path
  const { keys, id_usuario, id_origen, id_contrato } = validatePathParameters(event.pathParameters);

  // 3. Configurar comando de eliminación con condición de existencia
  const command = new DeleteCommand({
    TableName: tableName,
    Key: keys,
    ConditionExpression: "attribute_exists(_pk) AND attribute_exists(_sk)",
    ReturnValues: "ALL_OLD"
  });

  try {
    // 4. Ejecutar eliminación en DynamoDB
    const result = await docClient.send(command);

    // 5. Verificar que el item existía
    if (!result.Attributes) {
      return createNotFoundResponse('Usuario-Contrato');
    }

    // 6. Formatear respuesta exitosa
    const responseData = {
      deletedUsuarioContrato: {
        id_usuario: result.Attributes.id_usuario,
        id_origen: result.Attributes.id_origen,
        id_contrato: result.Attributes.id_contrato,
        id_ciclo: result.Attributes.id_ciclo,
        id_participante: result.Attributes.id_participante,
        token_participante: result.Attributes.token_participante,
        createdAt: result.Attributes.createdAt,
        updatedAt: result.Attributes.updatedAt,
        deletedAt: new Date().toISOString()
      },
      message: 'Usuario-Contrato eliminado exitosamente'
    };

    return createSuccessResponse(responseData);

  } catch (error) {
    return handleDynamoDBError(error);
  }
};

// Exportar handler con manejo de errores
export const handler = withErrorHandling(mainHandler);
