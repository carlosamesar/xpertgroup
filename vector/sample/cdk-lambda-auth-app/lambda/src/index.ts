import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

// Define the expected structure for the request body
interface ExpectedPayload {
  to: string;
  subject: string;
  bodyHtml: string;
}

// Configure the JWT verifier
// These must be set as environment variables in your Lambda configuration
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

// Initialize verifier outside handler for reuse
let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

if (USER_POOL_ID && USER_POOL_CLIENT_ID) {
  verifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: "access", // Ensure this matches your Cognito User Pool client configuration
    clientId: USER_POOL_CLIENT_ID,
  });
} else {
  // Log an error if environment variables are missing.
  // The Lambda will still deploy, but authentication will fail.
  console.error("Missing environment variables: USER_POOL_ID and/or USER_POOL_CLIENT_ID. JWT verification will not work.");
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("Event:", JSON.stringify(event, null, 2));

  // 1. Authentication
  if (!verifier) {
    console.error("JWT Verifier not initialized. This is likely due to missing environment variables.");
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ message: "Internal Server Error: Authenticator not properly configured." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Missing Authorization header." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const tokenParts = authHeader.split(" ");
  if (tokenParts.length !== 2 || tokenParts[0].toLowerCase() !== "bearer") {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Malformed Authorization header. Expected format: 'Bearer <token>'." }),
      headers: { "Content-Type": "application/json" },
    };
  }
  const token = tokenParts[1];

  try {
    const payload = await verifier.verify(token);
    console.log("Token is valid. Payload:", payload);
  } catch (error: any) {
    console.error("Token verification failed:", error.message || error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: "Unauthorized: Invalid or expired token.", details: error.message || "Unknown error" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  // 2. Validation of the Payload (Body)
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Missing request body." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  let parsedBody: any;
  try {
    parsedBody = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Invalid JSON format in request body." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const { to, subject, bodyHtml } = parsedBody as ExpectedPayload;
  const validationErrors: string[] = [];

  if (typeof to !== "string" || !to.includes("@") || to.trim() === "") {
    validationErrors.push("Field 'to' is invalid. Expected a non-empty, valid email string.");
  }
  if (typeof subject !== "string" || subject.trim() === "") {
    validationErrors.push("Field 'subject' is invalid. Expected a non-empty string.");
  }
  if (typeof bodyHtml !== "string" || bodyHtml.trim() === "") {
    validationErrors.push("Field 'bodyHtml' is invalid. Expected a non-empty string.");
  }

  if (validationErrors.length > 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Bad Request: Payload validation failed.",
        errors: validationErrors,
      }),
      headers: { "Content-Type": "application/json" },
    };
  }

  // If validation is correct
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Request processed successfully.",
      receivedPayload: { to, subject, bodyHtml },
    }),
    headers: { "Content-Type": "application/json" },
  };
};
