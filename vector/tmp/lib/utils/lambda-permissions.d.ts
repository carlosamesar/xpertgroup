import * as lambda from 'aws-cdk-lib/aws-lambda';
/**
 * Utility functions for common Lambda permissions
 */
export declare class LambdaPermissions {
    /**
     * Grant CloudWatch logs permissions to a Lambda function
     * This is essential for Lambda functions to write logs to CloudWatch
     * @param lambdaFunction - The Lambda function to grant CloudWatch permissions to
     */
    static grantCloudWatchLogsAccess(lambdaFunction: lambda.Function): void;
    /**
     * Grant VPC permissions to a Lambda function
     * Required for Lambda functions that run inside a VPC
     * @param lambdaFunction - The Lambda function to grant VPC permissions to
     */
    static grantVpcAccess(lambdaFunction: lambda.Function): void;
    /**
     * Grant comprehensive permissions to a Lambda function including CloudWatch logs and VPC access
     * @param lambdaFunction - The Lambda function to grant permissions to
     * @param isLocalStack - Whether this is running in LocalStack environment (skips VPC permissions)
     */
    static grantComprehensiveAccess(lambdaFunction: lambda.Function, isLocalStack?: boolean): void;
}
