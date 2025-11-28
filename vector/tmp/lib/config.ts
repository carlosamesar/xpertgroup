export type ConfigProps = {
    PROJECT_NAME: string
    REGION: string
    STATE_NAME: string
    API_OPERACION: string
    API_OPERACION_DESC: string
    STATE_ID_VC: string
    SECURITY_GROUP: string
    SUBNETS: string
    DOMAIN_NAME: string
    SSL_CERTIFICATE_ARN: string
    CC: string    
    PRODUCTO: string
    PROPIETARIO: string 
    PROYECTO: string
    USER_POOL_ID?: string
    CLIENT_ID?: string
    USER_POOL_CLIENT_ID?: string
    API_CONTEXTO: string
    API_CONTEXTO_DESC: string,
    COGNITO_CLIENT_ID?: string
    COGNITO_CLIENT_SECRET?: string
    SES_SOURCE_EMAIL?: string
}

export const getConfig = (): ConfigProps => {

    /*
    console.log('Loading environment variables...');
    console.log('process.env.PAS_DIV_IP: ', process.env.PAS_DIV_IP);
    console.log('process.env.PAS_DIV_PORT: ', process.env.PAS_DIV_PORT);    
    console.log('process.env.PAS_DIV_URL: ', process.env.PAS_DIV_URL);
    console.log('process.env.PAS_INT_IP: ', process.env.PAS_INT_IP);
    console.log('process.env.PAS_INT_PORT: ', process.env.PAS_INT_PORT);
    console.log('process.env.PAS_INT_URL: ', process.env.PAS_INT_URL);
    console.log('process.env.REGION: ', process.env.REGION);
    console.log('process.env.STATE_NAME: ', process.env.STATE_NAME);
    console.log('process.env.STATE_ID_VC: ', process.env.STATE_ID_VC);
    console.log('process.env.SECURITY_GROUP: ', process.env.SECURITY_GROUP);
    console.log('process.env.SUBNET_A: ', process.env.SUBNET_A);
    console.log('process.env.SUBNET_B: ', process.env.SUBNET_B);    
    console.log('process.env.DOMAIN_NAME: ', process.env.DOMAIN_NAME);
    console.log('process.env.SSL_CERTIFICATE_ARN: ', process.env.SSL_CERTIFICATE_ARN);
    */

 //console.log('process.env.STATE_NAME: ', process.env.STATE_NAME);


    return {
        PROJECT_NAME: "apisvector-pai",
        API_OPERACION: "apisVectorPaiOperacion",
        API_OPERACION_DESC: "API Gateway apisVectorPaiOperacion",
        API_CONTEXTO: "apisVectorPaiContexto",
        API_CONTEXTO_DESC: "API Gateway apisVectorPaiContexto",
        REGION: process.env.REGION || 'us-east-1',
        STATE_NAME: process.env.STATE_NAME || 'dev',
        STATE_ID_VC: process.env.STATE_ID_VC || '',
        SECURITY_GROUP: process.env.SECURITY_GROUP || '',
        SUBNETS: (process.env.SUBNET_A && process.env.SUBNET_B) ? 
                 `${process.env.SUBNET_A},${process.env.SUBNET_B}` : '',
        DOMAIN_NAME: process.env.DOMAIN_NAME || '',
        SSL_CERTIFICATE_ARN: process.env.SSL_CERTIFICATE_ARN || '',
        CC: process.env.CC || 'CC',
        PRODUCTO: process.env.PRODUCTO || 'PRODUCTO',
        PROPIETARIO: process.env.PROPIETARIO || 'PROPIETARIO',
        PROYECTO: process.env.PROYECTO || 'PROYECTO',
        USER_POOL_ID: process.env.USER_POOL_ID || '',
        CLIENT_ID: process.env.CLIENT_ID || '',
        USER_POOL_CLIENT_ID: process.env.USER_POOL_CLIENT_ID || '',
        COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || '',
        COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET || '',
        SES_SOURCE_EMAIL: process.env.SES_SOURCE_EMAIL || '' 
    }

}