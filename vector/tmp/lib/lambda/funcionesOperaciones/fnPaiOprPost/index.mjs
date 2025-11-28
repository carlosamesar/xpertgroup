import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME; // Environment variable for the DynamoDB table name

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON format in request body." }),
    };
  }

  const { periodo, actual, nombre_periodo } = requestBody;

  // 3. Define la validación de las propiedades del request para evitar vulnerabilidades con los tipos de datos.
  // 4. Define la validación de las propiedades del request para evitar SQL Injection (Input Sanitization).
  if (!periodo || typeof periodo !== 'string' || !/^\\d{4}-\\d{2}$/.test(periodo)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid 'periodo' format. Expected YYYY-MM string." }),
    };
  }

  if (!actual || (actual !== "0" && actual !== "1")) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid 'actual' value. Expected '0' or '1'." }),
    };
  }

  if (!nombre_periodo || typeof nombre_periodo !== 'string' || nombre_periodo.trim() === "") {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid 'nombre_periodo'. Expected a non-empty string." }),
    };
  }

  // Sanitize inputs (simple example, consider more robust libraries for production)
  const sanitizedPeriodo = periodo.replace(/[<>'"&]/g, '');
  const sanitizedActual = actual; // "0" or "1" are safe
  const sanitizedNombrePeriodo = nombre_periodo.replace(/[<>'"&]/g, '');


  // 5. Define la integración con DynamoDB para la operación [insert].
  const pk = "CATALOGO#PERIODOS";
  const sk = `PERIODO#${sanitizedPeriodo}`;

  const item = {
    _pk: pk,
    _sk: sk,
    valor_periodo: sanitizedPeriodo,
    actual_flag: sanitizedActual,
    nombre_periodo_display: sanitizedNombrePeriodo,
    item_type: "PAI_CATALOGO_PERIODOS_DEV", // Default from schema
  };

  const command = new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: "attribute_not_exists(_pk) AND attribute_not_exists(_sk)" // Prevent overwriting existing items
  });

  try {
    await docClient.send(command);
    // 6. Escribe un flujo de respuestas para la operación [insert].
    return {
      statusCode: 201, // 201 Created for successful insert
      body: JSON.stringify({ message: "Periodo created successfully.", item }),
    };
  } catch (error) {
    console.error("Error inserting item into DynamoDB:", error);
    if (error.name === 'ConditionalCheckFailedException') {
        return {
            statusCode: 409, // Conflict
            body: JSON.stringify({ message: "Periodo already exists." }),
        };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create periodo.", error: error.message }),
    };
  }
};