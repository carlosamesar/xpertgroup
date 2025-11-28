import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';
import { ConfigProps } from '../config';
import { CdkApisvectorPaiStack } from '../cdk-apisvector-pai-stack';
import { optionsMethodResponse } from './util'; 

export interface ApiContextoProps {
    readonly stack: CdkApisvectorPaiStack;
    readonly config: ConfigProps;
    readonly vpc: cdk.aws_ec2.IVpc;
    readonly subnets: cdk.aws_ec2.ISubnet[];
    readonly securityGroup: cdk.aws_ec2.ISecurityGroup;
}

const policy1 = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  /*actions: ["ec2:*"   , 
            "logs:*" ] ,     
            */
  actions: ["ec2:CreateNetworkInterface",
    "ec2:DescribeNetworkInterface",
    "ec2:DescribeSubnets",
    "ec2:DeleteNetworkInterface",
    "ec2:AssignPrivateIpAddresses",
    "ec2:UnassignPrivateIpAddresses"],
  resources: ["*"],
  /*actions: ["*"],
  resources: ["*"],*/
});

export class ApiContexto extends Construct {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: ApiContextoProps) {
        super(scope, id);
        
        const ALLOWED_HEADERS = ['Content-Type', 'X-Amz-Date', 'X-Amz-Security-Token', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'canal', 'cuentasesion', 'id', 'token', 'glat', 'glon', 'refresh'];
    
        const { stack, config } = props;

        // Lambda function for handling POST requests to /login
        const fnPaiContextoPost = new lambda.Function(stack, 'fnPaiContextoPost', {
            functionName: `${config.STATE_NAME}-fnPaiContextoPost`,
            description: 'Lambda function for handling POST requests to /login',
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/funcionesContexto/fnPaiContextoPost')), // Adjust path as needed
            handler: 'index.handler',
            vpc: props.vpc,
            vpcSubnets: { subnets: props.subnets },
            securityGroups: [props.securityGroup],
            environment: {
                STATE_NAME: config.STATE_NAME,
                COGNITO_CLIENT_ID: config.COGNITO_CLIENT_ID || '',
                COGNITO_REGION: config.REGION || '',
                COGNITO_CLIENT_SECRET: config.COGNITO_CLIENT_SECRET || ''
            }
        });
        fnPaiContextoPost.addToRolePolicy(policy1);

        // Lambda function for handling PUT requests to /login/validate
        const fnPaiContextoPut = new lambda.Function(stack, 'fnPaiContextoPut', {
            functionName: `${config.STATE_NAME}-fnPaiContextoPut`,
            description: 'Lambda function for handling PUT requests to /login/validate',
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/funcionesContexto/fnPaiContextoPut')), // Adjust path as needed
            handler: 'index.handler',
            vpc: props.vpc,
            vpcSubnets: { subnets: props.subnets },
            securityGroups: [props.securityGroup],
            environment: {
                STATE_NAME: config.STATE_NAME,
                COGNITO_CLIENT_ID: config.COGNITO_CLIENT_ID || '',
                COGNITO_REGION: config.REGION || '',
                COGNITO_CLIENT_SECRET: config.COGNITO_CLIENT_SECRET || ''
            }
        });
        fnPaiContextoPut.addToRolePolicy(policy1);
          
        // Lambda function for sending email POST requests to /send-email
        const fnPaiContextoEnviarEmailPost = new lambda.Function(stack, 'fnPaiContextoEnviarEmailPost', {
            functionName: `${config.STATE_NAME}-fnPaiContextoEnviarEmailPost`,
            description: 'Lambda function for send email POST requests to /send-email',
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/funcionesContexto/fnPaiContextoEnviarEmailPost')), // Adjust path as needed
            handler: 'index.handler',
            vpc: props.vpc,
            vpcSubnets: { subnets: props.subnets },
            securityGroups: [props.securityGroup],
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            environment: {
                STATE_NAME: config.STATE_NAME,
                SES_SOURCE_EMAIL: config.SES_SOURCE_EMAIL || 'vectordigital@vector.com.mx',
                COGNITO_CLIENT_ID: config.COGNITO_CLIENT_ID || '',
                COGNITO_REGION: config.REGION || '',
                COGNITO_CLIENT_SECRET: config.COGNITO_CLIENT_SECRET || ''
            }
        });
        
        // Add SES permissions to the Lambda function
        fnPaiContextoEnviarEmailPost.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail',
                'ses:GetSendQuota',
                'ses:GetSendStatistics'
            ],
            resources: ['*']
        }));
        
        // Add CloudWatch logs permissions
        fnPaiContextoEnviarEmailPost.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [`arn:aws:logs:${config.REGION}:*:log-group:/aws/lambda/${config.STATE_NAME}-fnPaiContextoEnviarEmailPost:*`]
        }));
        
        // Add VPC permissions
        fnPaiContextoEnviarEmailPost.addToRolePolicy(policy1);

        this.api = new apigateway.RestApi(stack, 'ApiContextoGateway', {
            restApiName: `ApiContexto-${config.STATE_NAME}`,
            description: 'Contexto API Gateway for various functions in context.',
            deployOptions: {
                stageName: config.STATE_NAME,
            },
            // Enable CORS
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS, // Or specify methods like ['POST', 'GET', 'OPTIONS']
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                    'X-Amz-Security-Token',
                    'X-Amz-User-Agent',
                    'canal', // custom headers
                    'cuentasesion',
                    'id',
                    'token',
                    'glat',
                    'glon',
                    'refresh'
                ],
            },
        });

        const basicValidator = this.api.addRequestValidator("BasicValidator", {
            requestValidatorName: "BasicValidator",
            validateRequestBody: true,
            validateRequestParameters: true,
        });

        const ApiContexto_node = this.api.root.addResource('contexto');
        const contextoResourcePost = ApiContexto_node.addResource('login');

        contextoResourcePost.addMethod('POST', 
            new apigateway.LambdaIntegration(fnPaiContextoPost, {
            proxy: true,
            allowTestInvoke: false,
            cacheKeyParameters: ["method.request.path.opr"],
            integrationResponses: [{
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Credentials': "'false'",
                'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
            },
            }],
            requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
            }
        }), {
              methodResponses: [optionsMethodResponse],
              apiKeyRequired: true,
              requestParameters: { "method.request.path.opr": true },
              requestValidator: basicValidator,
        });

        const contextoResourcePut = ApiContexto_node.addResource('validate');

        contextoResourcePut.addMethod('PUT', 
            new apigateway.LambdaIntegration(fnPaiContextoPut, {
            proxy: true,
            allowTestInvoke: false,
            cacheKeyParameters: ["method.request.path.opr"],
            integrationResponses: [{
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Credentials': "'false'",
                'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
            },
            }],
            requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
            }
        }), {
              methodResponses: [optionsMethodResponse],
              apiKeyRequired: true,
              requestParameters: { "method.request.path.opr": true },
              requestValidator: basicValidator,
        });

        const contextoResourceSendEmailPost = ApiContexto_node.addResource('send-email');

        contextoResourceSendEmailPost.addMethod('POST', 
            new apigateway.LambdaIntegration(fnPaiContextoEnviarEmailPost, {
            proxy: true,
            allowTestInvoke: false,
            cacheKeyParameters: ["method.request.path.opr"],
            integrationResponses: [{
            statusCode: '200',
            responseParameters: {
                'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
                'method.response.header.Access-Control-Allow-Origin': "'*'",
                'method.response.header.Access-Control-Allow-Credentials': "'false'",
                'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
            },
            }],
            requestTemplates: {
            "application/json": "{\"statusCode\": 200}"
            }
        }), {
              methodResponses: [optionsMethodResponse],
              apiKeyRequired: true,
              requestParameters: { "method.request.path.opr": true },
              requestValidator: basicValidator,
        });

        // Output the API Gateway URL
        new cdk.CfnOutput(stack, 'ApiContextoEndpoint', {
            value: this.api.url,
            description: 'Endpoint URL for ApiContexto',
        });
    }
}
