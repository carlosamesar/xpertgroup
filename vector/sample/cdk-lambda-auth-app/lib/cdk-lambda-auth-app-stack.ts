import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as path from 'path';

export class CdkLambdaAuthAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a Cognito User Pool
    const userPool = new cognito.UserPool(this, 'MyUserPool', {
      userPoolName: 'my-app-user-pool',
      selfSignUpEnabled: true, // Adjust as needed
      signInAliases: { email: true },
      autoVerify: { email: true }, // Adjust as needed
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireLowercase: true,
        requireSymbols: true,
        requireUppercase: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
    });

    // Create a Cognito User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'MyUserPoolClient', {
      userPool,
      userPoolClientName: 'my-app-client',
      authFlows: {
        userSrp: true, // Secure Remote Password protocol
      },
      // oAuth: { // Uncomment and configure if you need OAuth2 flows
      //   flows: {
      //     authorizationCodeGrant: true,
      //   },
      //  scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      //   callbackUrls: ['https://your-app-callback-url.com'], // Replace with your callback URL
      //   logoutUrls: ['https://your-app-logout-url.com'], // Replace with your logout URL
      // },
    });

    // Output the User Pool ID and Client ID
    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    // Define the Lambda function
    const authLambda = new lambda.Function(this, 'AuthLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      // The handler is specified as 'index.handler' where 'index' is the file name (index.mjs)
      // and 'handler' is the exported function name.
      handler: 'index.handler',
      // Code is loaded from the 'lambda/dist' directory, as specified in lambda/tsconfig.json outDir
      // and the lambda/package.json main field.
      // CDK will bundle this code.
      code: lambda.Code.fromAsset(path.join(__dirname, '..', 'lambda')),
      // Pass environment variables to the Lambda function
      environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        NODE_OPTIONS: '--enable-source-maps', // Optional: for better debugging
      },
      // It's good practice to set memory and timeout
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
    });

    // Define the API Gateway
    const api = new apigateway.RestApi(this, 'AuthApi', {
      restApiName: 'Authentication Service',
      description: 'This service handles authentication and payload validation.',
      deployOptions: {
        stageName: 'prod',
      },
      // Enable CORS for all origins (for development, restrict in production)
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS, // Or specify methods like ['POST', 'OPTIONS']
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Amz-Security-Token'],
      }
    });

    // Create an API Gateway resource and method
    // e.g., POST /validate
    const validateResource = api.root.addResource('validate');
    validateResource.addMethod('POST', new apigateway.LambdaIntegration(authLambda), {
      // Secure the API method using a Cognito User Pool Authorizer
      authorizer: new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
        cognitoUserPools: [userPool],
      }),
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Output the API Gateway endpoint URL
    new cdk.CfnOutput(this, 'ApiEndpointOutput', {
      value: api.url,
      description: 'API Gateway Endpoint URL',
    });
     new cdk.CfnOutput(this, 'ApiValidateEndpointOutput', {
      value: `${api.url}validate`,
      description: 'API Gateway Validate Endpoint URL (POST)',
    });
  }
}
