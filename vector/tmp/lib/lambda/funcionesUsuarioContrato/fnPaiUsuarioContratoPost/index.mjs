import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { authenticateUser } from '../utils/auth-validator.mjs';
import { validateRequestBody, createDynamoDBItem } from '../utils/validation-utils.mjs';
import { 
  createSuccessResponse, 
  createValidationErrorResponse,
  handleDynamoDBError,
  withErrorHandling 
} from '../utils/response-utils.mjs';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME;

/**
 * Handler principal para crear usuario-contratos
 * POST /usuario-contrato
 */
const mainHandler = async (event, context) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // 1. Validar autenticación JWT
  const userPayload = await authenticateUser(event);
  console.log('Usuario autenticado:', userPayload.sub);

  // 2. Parsear cuerpo de la petición
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return createValidationErrorResponse("Formato JSON inválido en el cuerpo de la petición");
  }

  // 3. Validar datos de entrada
  const validatedData = validateRequestBody(requestBody);

  // 4. Crear item para DynamoDB
  const item = createDynamoDBItem(validatedData, false);

  // 5. Configurar comando de inserción con condición de no existencia
  const command = new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: "attribute_not_exists(_pk) AND attribute_not_exists(_sk)"
  });

  try {
    // 6. Ejecutar inserción en DynamoDB
    await docClient.send(command);

    // 7. Formatear respuesta exitosa
    const responseData = {
      usuarioContrato: {
        id_usuario: item.id_usuario,
        id_origen: item.id_origen,
        id_contrato: item.id_contrato,
        id_ciclo: item.id_ciclo,
        id_participante: item.id_participante,
        token_participante: item.token_participante,
        createdAt: item.createdAt
      },
      message: 'Usuario-Contrato creado exitosamente'
    };

    return createSuccessResponse(responseData, 201);

  } catch (error) {
    return handleDynamoDBError(error);
  }
};

// Exportar handler con manejo de errores
export const handler = withErrorHandling(mainHandler);
