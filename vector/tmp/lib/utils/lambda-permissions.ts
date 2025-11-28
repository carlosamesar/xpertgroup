import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * Utility functions for common Lambda permissions
 */
export class LambdaPermissions {
  
  /**
   * Grant CloudWatch logs permissions to a Lambda function
   * This is essential for Lambda functions to write logs to CloudWatch
   * @param lambdaFunction - The Lambda function to grant CloudWatch permissions to
   */
  static grantCloudWatchLogsAccess(lambdaFunction: lambda.Function): void {
    const cloudWatchLogsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream', 
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams'
      ],
      resources: [
        `arn:aws:logs:*:*:log-group:/aws/lambda/${lambdaFunction.functionName}`,
        `arn:aws:logs:*:*:log-group:/aws/lambda/${lambdaFunction.functionName}:*`
      ]
    });

    lambdaFunction.addToRolePolicy(cloudWatchLogsPolicy);
  }

  /**
   * Grant VPC permissions to a Lambda function
   * Required for Lambda functions that run inside a VPC
   * @param lambdaFunction - The Lambda function to grant VPC permissions to
   */
  static grantVpcAccess(lambdaFunction: lambda.Function): void {
    const vpcPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterface",
        "ec2:DescribeSubnets",
        "ec2:DeleteNetworkInterface",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses"
      ],
      resources: ["*"]
    });

    lambdaFunction.addToRolePolicy(vpcPolicy);
  }

  /**
   * Grant comprehensive permissions to a Lambda function including CloudWatch logs and VPC access
   * @param lambdaFunction - The Lambda function to grant permissions to
   * @param isLocalStack - Whether this is running in LocalStack environment (skips VPC permissions)
   */
  static grantComprehensiveAccess(lambdaFunction: lambda.Function, isLocalStack: boolean = false): void {
    // Always grant CloudWatch logs access
    this.grantCloudWatchLogsAccess(lambdaFunction);
    
    // Grant VPC access only if not in LocalStack environment
    if (!isLocalStack) {
      this.grantVpcAccess(lambdaFunction);
    }
  }
}
