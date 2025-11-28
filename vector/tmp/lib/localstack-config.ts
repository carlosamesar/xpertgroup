import { ConfigProps } from './config';

export const getLocalStackConfig = (): ConfigProps => {
    return {
        PROJECT_NAME: "apisvector-pai-localstack",
        API_OPERACION: "apisVectorPaiOperacionLocal",
        API_OPERACION_DESC: "API Gateway apisVectorPaiOperacion LocalStack",
        API_CONTEXTO: "apisVectorPaiContextoLocal",
        API_CONTEXTO_DESC: "API Gateway apisVectorPaiContexto LocalStack",
        REGION: 'us-east-1',
        STATE_NAME: 'localstack',
        
        // Para LocalStack, usamos IDs simulados
        STATE_ID_VC: 'vpc-12345678',
        SECURITY_GROUP: 'sg-12345678',
        SUBNETS: 'subnet-12345678,subnet-87654321',
        
        // Dominio y certificado simulados
        DOMAIN_NAME: 'api.localstack.local',
        SSL_CERTIFICATE_ARN: 'arn:aws:acm:us-east-1:000000000000:certificate/12345678-1234-1234-1234-123456789012',
        
        // Tags para LocalStack
        CC: 'LocalStack',
        PRODUCTO: 'PAI-LocalStack',
        PROPIETARIO: 'Development',
        PROYECTO: 'ApisvectorPai-Local',
        
        // Cognito se configurará automáticamente
        USER_POOL_ID: process.env.USER_POOL_ID || '',
        CLIENT_ID: process.env.CLIENT_ID || '',
        USER_POOL_CLIENT_ID: process.env.USER_POOL_CLIENT_ID || ''
    };
};
