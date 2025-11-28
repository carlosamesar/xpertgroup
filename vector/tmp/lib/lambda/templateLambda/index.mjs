import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const tableName = process.env.TABLE_NAME; // Environment variable for the DynamoDB table name
const primaryKeyName = process.env.PRIMARY_KEY_NAME || "_pk"; // e.g., '_pk'
const sortKeyName = process.env.SORT_KEY_NAME || "_sk";       // e.g., '_sk'

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  const httpMethod = event.httpMethod; // Assuming API Gateway event
  let response;
  let requestBody = null;
  let pathParameters = event.pathParameters || {};
  let queryStringParameters = event.queryStringParameters || {};

  try {
    if (event.body) {
      requestBody = JSON.parse(event.body);
    }
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON format in request body." }),
    };
  }

  try {
    // -----------------------------------------------------------------------
    // 1. INPUT VALIDATION (Customize based on httpMethod and specific needs)
    // -----------------------------------------------------------------------
    // Example: if (httpMethod === "POST" && (!requestBody || !requestBody.someProperty)) {
    //   return { statusCode: 400, body: JSON.stringify({ message: "Missing required property." }) };
    // }
    // Example: if ((httpMethod === "GET" || httpMethod === "DELETE") && !pathParameters.id) {
    //   return { statusCode: 400, body: JSON.stringify({ message: "Missing ID in path." }) };
    // }

    // -----------------------------------------------------------------------
    // 2. DETERMINE OPERATION & INTERACT WITH DYNAMODB
    // -----------------------------------------------------------------------
    let command;
    let operationMessage = "";

    switch (httpMethod) {
      case "POST": // Create
        // --- TODO: Customize item creation logic ---
        if (!requestBody || typeof requestBody.data !== 'object' || requestBody.data === null || Array.isArray(requestBody.data)) { // Ensure data is a plain object
             return { statusCode: 400, body: JSON.stringify({ message: "Property 'data' in request body must be a non-null, non-array object for POST." }) };
        }
        const newItem = {
          [primaryKeyName]: `ITEM#${Date.now()}`, // Example PK
          [sortKeyName]: `METADATA#${Date.now()}`,  // Example SK
          ...requestBody.data,
          createdAt: new Date().toISOString(),
          item_type: "DEFAULT_ITEM_TYPE" // TODO: Customize or make dynamic
        };
        command = new PutCommand({
          TableName: tableName,
          Item: newItem,
          ConditionExpression: "attribute_not_exists(:pk) AND attribute_not_exists(:sk)", // Optional: prevent overwrite
          ExpressionAttributeValues: {
            ":pk": newItem[primaryKeyName],
            ":sk": newItem[sortKeyName]
          }
        });
        await docClient.send(command);
        response = {
          statusCode: 201,
          body: JSON.stringify({ message: "Item created successfully.", item: newItem }),
        };
        operationMessage = "Item created successfully.";
        break;

      case "GET": // Read
        // --- TODO: Customize key retrieval logic ---
        const getItemId = pathParameters.id || queryStringParameters.id; // Example: get ID from path or query
        if (!getItemId) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing item ID for GET." }) };
        }
        command = new GetCommand({
          TableName: tableName,
          Key: {
            [primaryKeyName]: `YOUR_PK_VALUE_FOR#${getItemId}`, // TODO: Construct actual PK
            [sortKeyName]: `YOUR_SK_VALUE_FOR#${getItemId}`    // TODO: Construct actual SK (if applicable)
          },
        });
        const { Item: getItem } = await docClient.send(command);
        if (getItem) {
          response = { statusCode: 200, body: JSON.stringify(getItem) };
        } else {
          response = { statusCode: 404, body: JSON.stringify({ message: "Item not found." }) };
        }
        operationMessage = getItem ? "Item retrieved successfully." : "Item not found.";
        break;

      case "PUT": // Update
        // --- TODO: Customize update logic and item identification ---
        const updateItemId = pathParameters.id;
        if (!updateItemId || !requestBody) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing item ID or request body for PUT." }) };
        }
        // Example: Construct UpdateExpression, ExpressionAttributeValues, etc.
        // This is a simplified Put for replacement, for partial updates use UpdateCommand
        const updatedItemData = { // Renamed to avoid conflict with updatedItem in some scopes
          ...requestBody.data,
          updatedAt: new Date().toISOString(),
        };
        const itemToUpdate = {
            [primaryKeyName]: `YOUR_PK_VALUE_FOR#${updateItemId}`, // TODO: Construct actual PK
            [sortKeyName]: `YOUR_SK_VALUE_FOR#${updateItemId}`,    // TODO: Construct actual SK
            ...updatedItemData
        };
        command = new PutCommand({ // Or UpdateCommand for partial updates
          TableName: tableName,
          Item: itemToUpdate,
          // ConditionExpression: \`attribute_exists(\${primaryKeyName})\` // Optional: ensure item exists
        });
        await docClient.send(command);
        response = {
          statusCode: 200,
          body: JSON.stringify({ message: "Item updated successfully.", item: itemToUpdate }),
        };
        operationMessage = "Item updated successfully.";
        break;

      case "DELETE": // Delete
        // --- TODO: Customize key deletion logic ---
        const deleteItemId = pathParameters.id;
        if (!deleteItemId) {
            return { statusCode: 400, body: JSON.stringify({ message: "Missing item ID for DELETE." }) };
        }
        command = new DeleteCommand({
          TableName: tableName,
          Key: {
            [primaryKeyName]: `YOUR_PK_VALUE_FOR#${deleteItemId}`, // TODO: Construct actual PK
            [sortKeyName]: `YOUR_SK_VALUE_FOR#${deleteItemId}`    // TODO: Construct actual SK
          },
        });
        await docClient.send(command);
        response = {
          statusCode: 200, // Or 204 No Content
          body: JSON.stringify({ message: "Item deleted successfully." }),
        };
        operationMessage = "Item deleted successfully.";
        break;

      default:
        response = {
          statusCode: 405, // Method Not Allowed
          body: JSON.stringify({ message: `HTTP method ${httpMethod} not supported.` }),
        };
        operationMessage = `HTTP method ${httpMethod} not supported.`;
    }
    console.log(operationMessage);
    return response;

  } catch (error) {
    console.error("Error processing request:", error);
    if (error.name === 'ConditionalCheckFailedException') {
        return {
            statusCode: 409, // Conflict
            body: JSON.stringify({ message: "Operation failed due to a condition check (e.g., item already exists or does not exist as expected)." , error: error.message }),
        };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to process request.", error: error.message }),
    };
  }
};
