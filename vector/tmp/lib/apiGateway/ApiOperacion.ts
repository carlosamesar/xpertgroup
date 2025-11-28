import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'; // Added import
import * as path from 'path';
import * as CfnOutput  from 'aws-cdk-lib';
import { CdkApisvectorPaiStack } from '../cdk-apisvector-pai-stack'
import { ConfigProps } from '../config';
import { LambdaPermissions } from '../utils/lambda-permissions';

import { standardIntegration, standardCorsMockIntegration, optionsMethodResponse } from './util';


export class ApiOperacion {

  readonly dirNameLambda: string = "./lib/lambda/funcionesOperaciones/";
  readonly config_div_opr_post = {
    nombre: "fnPaiOprPost",
    ruta: "fnPaiOprPost"
  }

  readonly config_div_opr_get = {
    nombre: "fnPaiOprGet",
    ruta: "fnPaiOprGet"
  }

  readonly config_div_opr_put = {
    nombre: "fnPaiOprPut",
    ruta: "fnPaiOprPut"
  }

  readonly config_div_opr_delete = {
    nombre: "fnPaiOprDelete",
    ruta: "fnPaiOprDelete"
  }

  private cdkApisvectorPaiStack: CdkApisvectorPaiStack;
  private configProps: ConfigProps;
  
  private vpc: cdk.aws_ec2.IVpc;
  private securityGroup: cdk.aws_ec2.ISecurityGroup;
  private subnets: cdk.aws_ec2.ISubnet[];

  constructor(CdkApisvectorPaiStack: CdkApisvectorPaiStack, configProps: ConfigProps, vpc: cdk.aws_ec2.IVpc, securityGroup: cdk.aws_ec2.ISecurityGroup, subnets: cdk.aws_ec2.ISubnet[] = []) {
    this.cdkApisvectorPaiStack = CdkApisvectorPaiStack;
    this.configProps = configProps;
    this.vpc = vpc;
    this.securityGroup = securityGroup;
    this.subnets = subnets;
  }

  public generaApiGateWay() {
    

    
    const ALLOWED_HEADERS = ['Content-Type', 'X-Amz-Date', 'X-Amz-Security-Token', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'canal', 'cuentasesion', 'id', 'token', 'glat', 'glon', 'refresh'];


        const lambdaPaiOprGET = new lambda.Function(this.cdkApisvectorPaiStack, this.config_div_opr_get.nombre, {
      description: "",
      runtime: lambda.Runtime.NODEJS_20_X, // Updated runtime
      functionName: this.configProps.STATE_NAME + "-" + this.config_div_opr_get.nombre,
      handler: 'index.handler',
      memorySize: 128,
      code: lambda.Code.fromAsset(path.resolve(this.dirNameLambda + this.config_div_opr_get.ruta)),
      timeout: cdk.Duration.seconds(30),
      vpc: this.vpc,
      vpcSubnets: { subnets: this.subnets },
      securityGroups: [this.securityGroup],
      allowPublicSubnet: true
    });

    // Grant CloudWatch and VPC permissions
    const isLocalStack = process.env.LOCALSTACK_HOSTNAME !== undefined;
    LambdaPermissions.grantComprehensiveAccess(lambdaPaiOprGET, isLocalStack);

      const lambdaPaiOprPOST = new lambda.Function(this.cdkApisvectorPaiStack, this.config_div_opr_post.nombre, {
      description: "",
      runtime: lambda.Runtime.NODEJS_20_X, // Updated runtime
      functionName: this.configProps.STATE_NAME + "-" + this.config_div_opr_post.nombre,
      handler: 'index.handler',
      memorySize: 128,
      code: lambda.Code.fromAsset(path.resolve(this.dirNameLambda + this.config_div_opr_post.ruta)),
      timeout: cdk.Duration.seconds(30),
      vpc: this.vpc,
      vpcSubnets: { subnets: this.subnets },
      securityGroups: [this.securityGroup],
      allowPublicSubnet: true
    });

    // Grant CloudWatch and VPC permissions
    LambdaPermissions.grantComprehensiveAccess(lambdaPaiOprPOST, isLocalStack);

      const lambdaPaiOprPUT = new lambda.Function(this.cdkApisvectorPaiStack, this.config_div_opr_put.nombre, {
      description: "",
      runtime: lambda.Runtime.NODEJS_20_X, // Updated runtime
      functionName: this.configProps.STATE_NAME + "-" + this.config_div_opr_put.nombre,
      handler: 'index.handler',
      memorySize: 128,
      code: lambda.Code.fromAsset(path.resolve(this.dirNameLambda + this.config_div_opr_put.ruta)),
      timeout: cdk.Duration.seconds(30),
      vpc: this.vpc,
      vpcSubnets: { subnets: this.subnets },
      securityGroups: [this.securityGroup],
      allowPublicSubnet: true
    });

    // Grant CloudWatch and VPC permissions
    LambdaPermissions.grantComprehensiveAccess(lambdaPaiOprPUT, isLocalStack);
        const lambdaPaiOprDELETE = new lambda.Function(this.cdkApisvectorPaiStack, this.config_div_opr_delete.nombre, {
      description: "",
      runtime: lambda.Runtime.NODEJS_20_X, // Updated runtime
      functionName: this.configProps.STATE_NAME + "-" + this.config_div_opr_delete.nombre,
      handler: 'index.handler',
      memorySize: 128,
      code: lambda.Code.fromAsset(path.resolve(this.dirNameLambda + this.config_div_opr_delete.ruta)),
      timeout: cdk.Duration.seconds(30),
      vpc: this.vpc,
      vpcSubnets: { subnets: this.subnets },
      securityGroups: [this.securityGroup],
      allowPublicSubnet: true
    });

    // Grant CloudWatch and VPC permissions
    LambdaPermissions.grantComprehensiveAccess(lambdaPaiOprDELETE, isLocalStack);

    /*API Pai Operaciones */
    const API_OperacionDiv = new apigateway.RestApi(this.cdkApisvectorPaiStack, this.configProps.API_OPERACION, {
      deploy: true,
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: this.configProps.STATE_NAME
      },
      description: this.configProps.API_OPERACION_DESC

    });

    
    const basicValidator = API_OperacionDiv.addRequestValidator("BasicValidator", {
      requestValidatorName: "BasicValidator",
      validateRequestBody: true,
      validateRequestParameters: true,

    });

    // const apiKeyName = 'apiKey' + this.configProps.API_OPERACION;
    // const apiKey = new apigateway.ApiKey(this.cdkApisvectorPaiStack, 'apiKey' + this.configProps.API_OPERACION, {
    //   apiKeyName,
    //   description: 'APIKey ' + this.configProps.API_OPERACION,
    //   enabled: true,    
    // });

    // new cdk.CfnOutput(this.cdkApisvectorPaiStack, 'apiKey-' + this.configProps.API_OPERACION, {
    //   value: apiKey.keyId
    // });

    // const basicUsagePlan = API_OperacionDiv.addUsagePlan('UP-' + this.configProps.API_OPERACION, {
    //   name: "UP-" + this.configProps.API_OPERACION,
    //   apiStages: [{
    //     api: API_OperacionDiv,
    //     stage: API_OperacionDiv.deploymentStage
    //   }],
    //   throttle: {
    //     burstLimit: 500, // Límite máximo de uso en simultáneo rafaga
    //     rateLimit: 1000    //velocidad 
    //   },
    //   /*quota: {
    //       limit: 10000, // Cantidad máxima de peticiones
    //       period: apigw.Period.MONTH
    //     },*/
    //   description: "plan de uso" + this.configProps.API_OPERACION + "."
    // })

    // basicUsagePlan.addApiKey(apiKey);

    const ApiOpr_node_opr = API_OperacionDiv.root.addResource('opr');
    ApiOpr_node_opr.addMethod('OPTIONS', standardCorsMockIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [optionsMethodResponse]

    });

    const ApiOpr_node_operacion = ApiOpr_node_opr.addResource('{opr+}')

    /*GET*/
    // ApiOpr_node_operacion.addMethod('GET',
    //   new apigateway.LambdaIntegration(lambdaPaiOprGET, {
    //     proxy: true,
    //     allowTestInvoke: false,
    //     cacheKeyParameters: ["method.request.path.opr"],
    //     integrationResponses: [{
    //       statusCode: '200',
    //       responseParameters: {

    //         'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
    //         'method.response.header.Access-Control-Allow-Origin': "'*'",
    //         'method.response.header.Access-Control-Allow-Credentials': "'false'",
    //         'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    //       },
    //     }],
    //     requestTemplates: {
    //       "application/json": "{\\"statusCode\\": 200}"
    //     }
    //   }), {
    //   methodResponses: [optionsMethodResponse],
    //   // apiKeyRequired: true,
    //   requestParameters: { "method.request.path.opr": true },
    //   requestValidator: basicValidator,
    // });

    /*POST*/
    // ApiOpr_node_operacion.addMethod('POST',
    //   new apigateway.LambdaIntegration(lambdaPaiOprPOST, {
    //     proxy: true,
    //     allowTestInvoke: false,
    //     cacheKeyParameters: ["method.request.path.opr"],
    //     integrationResponses: [{
    //       statusCode: '200',
    //       responseParameters: {

    //         'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
    //         'method.response.header.Access-Control-Allow-Origin': "'*'",
    //         'method.response.header.Access-Control-Allow-Credentials': "'false'",
    //         'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    //       },
    //     }],
    //     requestTemplates: {
    //       "application/json": "{\\"statusCode\\": 200}"
    //     }
    //   }), {
    //   methodResponses: [optionsMethodResponse],
    //   // apiKeyRequired: true,
    //   requestParameters: { "method.request.path.opr": true },
    //   requestValidator: basicValidator,


    // });

    /*DELETE*/
    // ApiOpr_node_operacion.addMethod('DELETE',
    //   new apigateway.LambdaIntegration(lambdaPaiOprDELETE, {
    //     proxy: true,
    //     allowTestInvoke: false,
    //     cacheKeyParameters: ["method.request.path.opr"],
    //     integrationResponses: [{
    //       statusCode: '200',
    //       responseParameters: {

    //         'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
    //         'method.response.header.Access-Control-Allow-Origin': "'*'",
    //         'method.response.header.Access-Control-Allow-Credentials': "'false'",
    //         'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    //       },
    //     }],
    //     requestTemplates: {
    //       "application/json": "{\\"statusCode\\": 200}"
    //     }
    //   }), {
    //   methodResponses: [optionsMethodResponse],
    //   // apiKeyRequired: true,
    //   requestParameters: { "method.request.path.opr": true },
    //   requestValidator: basicValidator,
    // });

    /*PUT*/
    // ApiOpr_node_operacion.addMethod('PUT',
    //   new apigateway.LambdaIntegration(lambdaPaiOprPUT, {
    //     proxy: true,
    //     allowTestInvoke: false,
    //     cacheKeyParameters: ["method.request.path.opr"],
    //     integrationResponses: [{
    //       statusCode: '200',
    //       responseParameters: {

    //         'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
    //         'method.response.header.Access-Control-Allow-Origin': "'*'",
    //         'method.response.header.Access-Control-Allow-Credentials': "'false'",
    //         'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    //       },
    //     }],
    //     requestTemplates: {
    //       "application/json": "{\\"statusCode\\": 200}"
    //     }

    //   }), {
    //   methodResponses: [optionsMethodResponse],
    //   // apiKeyRequired: true,
    //   requestParameters: { "method.request.path.opr": true },
    //   requestValidator: basicValidator,
    // });


    ApiOpr_node_operacion.addMethod("OPTIONS", standardCorsMockIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
      methodResponses: [optionsMethodResponse]
    });

   
    /*
    new apigateway.BasePathMapping(this.cdkApisvectorPaiStack, 'api-gw-base-path-mapping_' + this.configProps.API_OPERACION, {
        domainName: this.domainName ,        
        restApi: API_OperacionDiv,
        basePath: 'operacion', // Make sure this is unique if ApiContexto also uses a base path
        stage: API_OperacionDiv.deploymentStage
      });      
    */  


    


  }
}