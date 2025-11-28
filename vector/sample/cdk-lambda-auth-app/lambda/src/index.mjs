import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const SES_REGION = process.env.COGNITO_REGION || 'us-east-1';
const sesClient = new SESClient({ region: SES_REGION });

const cognitoUserPoolId = process.env.USER_POOL_ID;
const cognitoRegion = process.env.COGNITO_REGION; // AWS_REGION is more standard for Lambda
const cognitoAppClientId = process.env.COGNITO_CLIENT_ID; // Not strictly needed for backend token validation if audience (client ID) is not checked

if (!cognitoUserPoolId || !cognitoRegion) {
  console.error('Error: Cognito User Pool ID or Region environment variables are not set.');
  // This will cause token verification to fail.
}

/**
 * Handles incoming API Gateway requests to send an email.
 * It validates the JWT, parses and validates the request body,
 * sanitizes inputs, and sends an email using AWS SES.
 *
 * @param {LambdaEvent} event - The event object from API Gateway.
 * @returns {Promise<LambdaResponse>} The response object for API Gateway.
 */
export const handler = async (event) => {
  const { CognitoJwtVerifier } = await import('aws-jwt-verify');
  const { Joi } = await import('joi');
  const { createDOMPurify } = await import('dompurify');
  const { JSDOM } = await import('jsdom');

  const verifier = CognitoJwtVerifier.create({
    userPoolId: cognitoUserPoolId,
    tokenUse: 'access', // Or 'id' depending on which token you expect
    clientId: cognitoAppClientId, // Uncomment if you want to verify the audience
  });

  // Schema for request body validation
  const emailSchema = Joi.object({
    to: Joi.string().email().required(),
    subject: Joi.string().max(100).required(),
    bodyHtml: Joi.string().required(),
  });

  // Initialize DOMPurify with JSDOM
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  
  console.log('Received event:', JSON.stringify(event, null, 2));

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Or a specific origin
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  // 1. Authentication
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Missing or invalid Authorization header');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized', details: 'Missing or invalid Authorization token.' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }
  const token = authHeader.substring(7);

  try {
    const payload = await verifier.verify(token);
    console.log('Token is valid. Payload:', payload);
    // You can use payload.username or payload.sub for user identification if needed
  } catch (error) {
    console.error('Token verification failed:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized', details: 'Invalid or expired token.' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }

  // 2. Validation del Payload (Body)
  let requestBody;
  try {
    requestBody = JSON.parse(event.body);
  } catch (error) {
    console.error('Invalid JSON in request body:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Bad Request', details: 'Invalid JSON format in request body.' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }

  const { error: validationError, value: validatedBody } = emailSchema.validate(requestBody);
  if (validationError) {
    console.error('Validation error:', validationError.details);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Bad Request',
        details: validationError.details.map((d) => ({ message: d.message, field: d.path.join('.') })),
      }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }

  const { to, subject, bodyHtml } = validatedBody;

  // Sanitización de entradas para prevenir XSS
  const sanitizedSubject = purify.sanitize(subject, { USE_PROFILES: { html: false } });
  const sanitizedBodyHtml = purify.sanitize(bodyHtml, { USE_PROFILES: { html: true } });

  if (subject !== sanitizedSubject) {
      console.warn(`Subject was sanitized. Original: "${subject}", Sanitized: "${sanitizedSubject}"`);
  }
  if (bodyHtml !== sanitizedBodyHtml) {
      console.warn('bodyHtml was sanitized.'); // Full HTML might be too long to log
  }


  // 3. Integración con AWS SES
  const sourceEmail = process.env.SES_SOURCE_EMAIL || 'vectordigital@vector.com.mx';
  if (!sourceEmail) {
    console.error('SES_SOURCE_EMAIL environment variable is not set.');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: 'Email source not configured.' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }

  const params = {
    Source: sourceEmail,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: {
        Data: sanitizedSubject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: sanitizedBodyHtml,
          Charset: 'UTF-8',
        },
        // You can also add a Text part for email clients that don't support HTML
        /*
        Text: {
          Data: "This is the text body of the email.", // Generate a text version from HTML if possible
          Charset: "UTF-8"
        }
        */
      },
    },
  };

  try {
    console.log('Sending email with params:', JSON.stringify(params, null, 2));
    const command = new SendEmailCommand(params);
    const data = await sesClient.send(command);
    console.log('Email sent successfully. MessageId:', data.MessageId);
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', messageId: data.MessageId }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  } catch (sesError) {
    console.error('SES Error:', sesError);
    // Log the full error to CloudWatch
    return {
      statusCode: 502, // Bad Gateway, as the error is with a downstream service (SES)
      body: JSON.stringify({ error: 'SES Error', details: sesError.message || 'Failed to send email' }),
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    };
  }
};