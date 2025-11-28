import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import {DomainName} from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { ConfigProps } from './config';
import { ApiOperacion } from './apiGateway/ApiOperacion';
import { ApiContexto } from './apiGateway/ApiContexto';
import { ApiGlobal } from './apiGateway/ApiGlobal'; // Import ApiGlobal
import * as cognito from 'aws-cdk-lib/aws-cognito';

// Importa el nuevo construct de DynamoDB
import { DynamoDBConstruct } from './constructs/dynamodb-construct';

type AwsEnvStackProps = cdk.StackProps & {
  config: Readonly<ConfigProps>
}

export class CdkApisvectorPaiStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AwsEnvStackProps) {
    super(scope, id, props);
    const { config } = props;

    console.log("STATE_ID_VC: " + config.STATE_ID_VC);
    console.log("REGION: " + config.REGION);

    /*-----------------------VPC-----------------------------------------*/
    const myVPC = ec2.Vpc.fromLookup(this, 'VPC-' + config.PROJECT_NAME, {
      vpcId: config.STATE_ID_VC,
      region: config.REGION
    });

    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', config.SSL_CERTIFICATE_ARN);
        const domain =  new DomainName(this , 'CustomDomainName'  + config.PROJECT_NAME, {
          domainName: config.DOMAIN_NAME,
          certificate
    });

    const mySecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(this, 'Sg-' + config.PROJECT_NAME, config.SECURITY_GROUP);

    const mySubnet: cdk.aws_ec2.ISubnet[] = [];

    const subnets: string[] = config.SUBNETS.split(",");

    let i: number = 0;

    for (let obj of subnets) {
      i = i + 1;
      mySubnet.push(ec2.Subnet.fromSubnetId(this, 'Subnet-' + i, obj));
    }

    // --- Creación de recursos DynamoDB usando el nuevo Construct ---
    const dynamoDBResources = new DynamoDBConstruct(this, 'PaiAppSingleTableConstruct');
    //-----------------------------------------------------------------

    // Crear un User Pool de Cognito
    this.userPool = new cognito.UserPool(this, 'UserPool', { // Assign to class property
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
      removalPolicy: config.STATE_NAME === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Crear un App Client para el login
    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', { // Assign to class property
      userPool: this.userPool,
      userPoolClientName: `pai-app-client-${config.STATE_NAME}`,
      generateSecret: false, 
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
      },
      
    });    
    
    // API Operación
    //const apiOperacion = new ApiOperacion(this, config, myVPC, mySecurityGroup, mySubnet, domain); 
    //apiOperacion.generaApiGateWay();

    // API Contexto 
    //const apiContexto = new ApiContexto(this, config, myVPC, mySecurityGroup, mySubnet); 
    //apiContexto.generaApiGateWay();

    // API Global
    new ApiContexto(this, 'ApiContexto', { stack: this, config: config, vpc: myVPC, subnets: mySubnet, securityGroup: mySecurityGroup } ); // Instantiate ApiGlobal
    
    // Exportar IDs de Cognito
    new cdk.CfnOutput(this, 'UserPoolIdOutput', {
      value: this.userPool.userPoolId,
      description: 'ID del User Pool de Cognito',
      exportName: `PaiUserPoolId-${config.STATE_NAME}`
    });

    new cdk.CfnOutput(this, 'UserPoolClientIdOutput', {
      value: this.userPoolClient.userPoolClientId,
      description: 'ID del User Pool Client de Cognito',
      exportName: `PaiUserPoolClientId-${config.STATE_NAME}`
    });   
    
  }
}
