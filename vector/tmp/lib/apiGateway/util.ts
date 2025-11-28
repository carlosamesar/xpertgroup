
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

const ALLOWED_HEADERS = ['Content-Type', 'X-Amz-Date', 'X-Amz-Security-Token', 'Authorization', 'X-Api-Key', 'X-Requested-With', 'Accept', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'canal', 'cuentasesion', 'id', 'token', 'glat', 'glon', 'refresh'];

export const standardIntegration = {
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

};


export const standardCorsMockIntegration = new apigateway.MockIntegration({
  integrationResponses: [{
    statusCode: '200',
    responseParameters: {
      'method.response.header.Access-Control-Allow-Headers': `'${ALLOWED_HEADERS.join(",")}'`,
      'method.response.header.Access-Control-Allow-Origin': "'*'",
      'method.response.header.Access-Control-Allow-Credentials': "'false'",
      'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
    },
  }],
  passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
  requestTemplates: {
    "application/json": "{\"statusCode\": 200}"
  }
});



export const optionsMethodResponse = {
  statusCode: '200',
  responseModels: {
    'application/json': apigateway.Model.EMPTY_MODEL
  },
  responseParameters: {
    'method.response.header.Access-Control-Allow-Headers': true,
    'method.response.header.Access-Control-Allow-Methods': true,
    'method.response.header.Access-Control-Allow-Credentials': true,
    'method.response.header.Access-Control-Allow-Origin': true,
  },
};

