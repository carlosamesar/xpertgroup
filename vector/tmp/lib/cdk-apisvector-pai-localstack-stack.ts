import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import {DomainName} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { ConfigProps } from './config';
import { ApiOperacion } from './apiGateway/ApiOperacion';
import { ApiContexto } from './apiGateway/ApiContexto';
import { ApiCatOrigen } from './apiGateway/api-cat-origen';
import { ApiCatGrupo } from './apiGateway/api-cat-grupo';
import { ApiUsuarios } from './apiGateway/api-usuarios';
import { ApiUsuarioContrato } from './apiGateway/api-usuario-contrato';
import { ApiContrato } from './apiGateway/api-contrato';
import { ApiContratoCiclo } from './apiGateway/ApiContratoCiclo';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import * as cognito from 'aws-cdk-lib/aws-cognito';

// Importa el nuevo construct de DynamoDB
import { DynamoDBConstruct } from './constructs/dynamodb-construct';

type AwsEnvStackProps = cdk.StackProps & {
  config: Readonly<ConfigProps>
}

export class CdkApisvectorPaiLocalStackStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AwsEnvStackProps) {
    super(scope, id, props);
    const { config } = props;

    console.log("LocalStack Deployment - STATE_ID_VC: " + config.STATE_ID_VC);
    console.log("LocalStack Deployment - REGION: " + config.REGION);

    /*-----------------------VPC para LocalStack-----------------------------------------*/
    // En LocalStack, creamos una VPC nueva en lugar de buscar una existente
    const myVPC = new ec2.Vpc(this, 'VPC-' + config.PROJECT_NAME, {
      maxAzs: 2,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        {
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        }
      ],
      enableDnsHostnames: true,
      enableDnsSupport: true
    });

    // Crear un certificado simulado para LocalStack
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: config.DOMAIN_NAME,
      validation: acm.CertificateValidation.fromDns()
    });

    const domain = new DomainName(this, 'CustomDomainName' + config.PROJECT_NAME, {
      domainName: config.DOMAIN_NAME,
      certificate
    });

    // Crear Security Group para LocalStack
    const mySecurityGroup = new ec2.SecurityGroup(this, 'Sg-' + config.PROJECT_NAME, {
      vpc: myVPC,
      description: 'Security Group for LocalStack deployment',
      allowAllOutbound: true
    });

    // Permitir tráfico HTTP/HTTPS
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP');
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'Allow HTTPS');
    mySecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(4566), 'Allow LocalStack');

    // Usar las subnets privadas de la VPC creada
    const mySubnet: cdk.aws_ec2.ISubnet[] = myVPC.privateSubnets;

    // --- Creación de recursos DynamoDB usando el nuevo Construct ---
    const dynamoDBResources = new DynamoDBConstruct(this, 'PaiAppSingleTableConstruct');

    // Crear un User Pool de Cognito
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `pai-user-pool-${config.STATE_NAME}`,
      selfSignUpEnabled: false,
      signInAliases: { username: true, email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true, 
      },
      // En LocalStack siempre usamos DESTROY para facilitar las pruebas
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Crear un App Client para el login
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      userPoolClientName: `pai-app-client-${config.STATE_NAME}`,
      generateSecret: false, 
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
      },
    });

    // APIs Gateway
    const apiOperacion = new ApiOperacion(this, config, myVPC, mySecurityGroup, mySubnet, domain); 
    apiOperacion.generaApiGateWay();

    const apiContexto = new ApiContexto(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.usuarioTable); 
    apiContexto.generaApiGateWay();
    
    const apiCatOrigen = new ApiCatOrigen(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.catOrigenTable, this.userPool);
    apiCatOrigen.generaApiGateWay();
    
    const apiCatGrupo = new ApiCatGrupo(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.catGrupoTable, this.userPool);
    apiCatGrupo.generaApiGateWay();

    const apiUsuarios = new ApiUsuarios(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.usuarioTable, this.userPool, this.userPoolClient);
    apiUsuarios.generaApiGateWay();

    const apiUsuarioContrato = new ApiUsuarioContrato(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.usuarioContratoTable, this.userPool);
    apiUsuarioContrato.generaApiGateWay();
    
    const apiContrato = new ApiContrato(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.contratoTable, this.userPool);
    apiContrato.generaApiGateWay();

    const apiContratoCiclo = new ApiContratoCiclo(this, config, myVPC, mySecurityGroup, mySubnet, domain, dynamoDBResources.contratoCicloTable, this.userPool);
    apiContratoCiclo.generaApiGateWay();

    // Outputs para LocalStack
    new cdk.CfnOutput(this, 'LocalStackEndpoint', {
      value: 'https://localhost.localstack.cloud:4566',
      description: 'LocalStack endpoint URL'
    });

    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: this.userPool.userPoolId,
      description: 'ID del User Pool de Cognito en LocalStack',
      exportName: `PaiUserPoolId-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: this.userPoolClient.userPoolClientId,
      description: 'ID del User Pool Client de Cognito en LocalStack',
      exportName: `PaiUserPoolClientId-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'UsuarioTableNameOutput', {
      value: dynamoDBResources.usuarioTable.tableName,
      description: 'Nombre de la tabla de usuarios de DynamoDB en LocalStack',
      exportName: `PaiAppUsuarioTableName-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'ContratoTableNameOutput', {
      value: dynamoDBResources.contratoTable.tableName,
      description: 'Nombre de la tabla de contratos de DynamoDB en LocalStack',
      exportName: `PaiAppContratoTableName-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'CatOrigenTableNameOutput', {
      value: dynamoDBResources.catOrigenTable.tableName,
      description: 'Nombre de la tabla de catálogo origen de DynamoDB en LocalStack',
      exportName: `PaiAppCatOrigenTableName-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'VPCIdOutput', {
      value: myVPC.vpcId,
      description: 'ID de la VPC creada en LocalStack',
      exportName: `PaiVPCId-${config.STATE_NAME}`
    });
  }
}
