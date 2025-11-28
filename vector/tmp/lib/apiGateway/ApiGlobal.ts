import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Construct } from 'constructs';
import { ConfigProps } from '../config';
import { CdkApisvectorPaiStack } from '../cdk-apisvector-pai-stack';
import { optionsMethodResponse } from './util'; 

export interface ApiGlobalProps {
    readonly stack: CdkApisvectorPaiStack;
    readonly config: ConfigProps;
    readonly vpc: cdk.aws_ec2.IVpc;
    readonly subnets: cdk.aws_ec2.ISubnet[];
    readonly securityGroup: cdk.aws_ec2.ISecurityGroup;
}

export class ApiGlobal extends Construct {
    public readonly api: apigateway.RestApi;

    constructor(scope: Construct, id: string, props: ApiGlobalProps) {
        super(scope, id);
        
        const ALLOWED_HEADERS = ['Content-Type', 'X-Amz-Date', 'X-Amz-Security-Token', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'canal', 'cuentasesion', 'id', 'token', 'glat', 'glon', 'refresh'];
    
        const { stack, config } = props;

        const fnPaiContextoPost = new lambda.Function(stack, 'fnPaiContextoPost', {
            functionName: `fnPaiGlobalPost-${config.STATE_NAME}`,
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

        const fnPaiContextoPut = new lambda.Function(stack, 'fnPaiContextoPut', {
            functionName: `fnPaiGlobalPut-${config.STATE_NAME}`,
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

        this.api = new apigateway.RestApi(stack, 'ApiGlobalGateway', {
            restApiName: `ApiGlobal-${config.STATE_NAME}`,
            description: 'Global API Gateway for various functions in context.',
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
        const contextoResourcePost = this.api.root.addResource('login');

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

        const contextoResourcePut = this.api.root.addResource('validate');

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

        // Output the API Gateway URL
        new cdk.CfnOutput(stack, 'ApiGlobalEndpoint', {
            value: this.api.url,
            description: 'Endpoint URL for ApiGlobal',
        });
    }
}
