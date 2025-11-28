"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaPermissions = void 0;
const iam = require("aws-cdk-lib/aws-iam");
/**
 * Utility functions for common Lambda permissions
 */
class LambdaPermissions {
    /**
     * Grant CloudWatch logs permissions to a Lambda function
     * This is essential for Lambda functions to write logs to CloudWatch
     * @param lambdaFunction - The Lambda function to grant CloudWatch permissions to
     */
    static grantCloudWatchLogsAccess(lambdaFunction) {
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
    static grantVpcAccess(lambdaFunction) {
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
    static grantComprehensiveAccess(lambdaFunction, isLocalStack = false) {
        // Always grant CloudWatch logs access
        this.grantCloudWatchLogsAccess(lambdaFunction);
        // Grant VPC access only if not in LocalStack environment
        if (!isLocalStack) {
            this.grantVpcAccess(lambdaFunction);
        }
    }
}
exports.LambdaPermissions = LambdaPermissions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXBlcm1pc3Npb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibGFtYmRhLXBlcm1pc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUEyQztBQUczQzs7R0FFRztBQUNILE1BQWEsaUJBQWlCO0lBRTVCOzs7O09BSUc7SUFDSCxNQUFNLENBQUMseUJBQXlCLENBQUMsY0FBK0I7UUFDOUQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDbkQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AscUJBQXFCO2dCQUNyQixzQkFBc0I7Z0JBQ3RCLG1CQUFtQjtnQkFDbkIsd0JBQXdCO2dCQUN4Qix5QkFBeUI7YUFDMUI7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsMENBQTBDLGNBQWMsQ0FBQyxZQUFZLEVBQUU7Z0JBQ3ZFLDBDQUEwQyxjQUFjLENBQUMsWUFBWSxJQUFJO2FBQzFFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsY0FBYyxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLGNBQWMsQ0FBQyxjQUErQjtRQUNuRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDeEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUU7Z0JBQ1AsNEJBQTRCO2dCQUM1Qiw4QkFBOEI7Z0JBQzlCLHFCQUFxQjtnQkFDckIsNEJBQTRCO2dCQUM1Qiw4QkFBOEI7Z0JBQzlCLGdDQUFnQzthQUNqQztZQUNELFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUM7UUFFSCxjQUFjLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLHdCQUF3QixDQUFDLGNBQStCLEVBQUUsZUFBd0IsS0FBSztRQUM1RixzQ0FBc0M7UUFDdEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRS9DLHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN0QyxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBOURELDhDQThEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5cclxuLyoqXHJcbiAqIFV0aWxpdHkgZnVuY3Rpb25zIGZvciBjb21tb24gTGFtYmRhIHBlcm1pc3Npb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTGFtYmRhUGVybWlzc2lvbnMge1xyXG4gIFxyXG4gIC8qKlxyXG4gICAqIEdyYW50IENsb3VkV2F0Y2ggbG9ncyBwZXJtaXNzaW9ucyB0byBhIExhbWJkYSBmdW5jdGlvblxyXG4gICAqIFRoaXMgaXMgZXNzZW50aWFsIGZvciBMYW1iZGEgZnVuY3Rpb25zIHRvIHdyaXRlIGxvZ3MgdG8gQ2xvdWRXYXRjaFxyXG4gICAqIEBwYXJhbSBsYW1iZGFGdW5jdGlvbiAtIFRoZSBMYW1iZGEgZnVuY3Rpb24gdG8gZ3JhbnQgQ2xvdWRXYXRjaCBwZXJtaXNzaW9ucyB0b1xyXG4gICAqL1xyXG4gIHN0YXRpYyBncmFudENsb3VkV2F0Y2hMb2dzQWNjZXNzKGxhbWJkYUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb24pOiB2b2lkIHtcclxuICAgIGNvbnN0IGNsb3VkV2F0Y2hMb2dzUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJywgXHJcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXHJcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpsb2dzOio6Kjpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEvJHtsYW1iZGFGdW5jdGlvbi5mdW5jdGlvbk5hbWV9YCxcclxuICAgICAgICBgYXJuOmF3czpsb2dzOio6Kjpsb2ctZ3JvdXA6L2F3cy9sYW1iZGEvJHtsYW1iZGFGdW5jdGlvbi5mdW5jdGlvbk5hbWV9OipgXHJcbiAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIGxhbWJkYUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTG9nc1BvbGljeSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBWUEMgcGVybWlzc2lvbnMgdG8gYSBMYW1iZGEgZnVuY3Rpb25cclxuICAgKiBSZXF1aXJlZCBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB0aGF0IHJ1biBpbnNpZGUgYSBWUENcclxuICAgKiBAcGFyYW0gbGFtYmRhRnVuY3Rpb24gLSBUaGUgTGFtYmRhIGZ1bmN0aW9uIHRvIGdyYW50IFZQQyBwZXJtaXNzaW9ucyB0b1xyXG4gICAqL1xyXG4gIHN0YXRpYyBncmFudFZwY0FjY2VzcyhsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uKTogdm9pZCB7XHJcbiAgICBjb25zdCB2cGNQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgIFwiZWMyOkNyZWF0ZU5ldHdvcmtJbnRlcmZhY2VcIixcclxuICAgICAgICBcImVjMjpEZXNjcmliZU5ldHdvcmtJbnRlcmZhY2VcIixcclxuICAgICAgICBcImVjMjpEZXNjcmliZVN1Ym5ldHNcIixcclxuICAgICAgICBcImVjMjpEZWxldGVOZXR3b3JrSW50ZXJmYWNlXCIsXHJcbiAgICAgICAgXCJlYzI6QXNzaWduUHJpdmF0ZUlwQWRkcmVzc2VzXCIsXHJcbiAgICAgICAgXCJlYzI6VW5hc3NpZ25Qcml2YXRlSXBBZGRyZXNzZXNcIlxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcIipcIl1cclxuICAgIH0pO1xyXG5cclxuICAgIGxhbWJkYUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeSh2cGNQb2xpY3kpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgY29tcHJlaGVuc2l2ZSBwZXJtaXNzaW9ucyB0byBhIExhbWJkYSBmdW5jdGlvbiBpbmNsdWRpbmcgQ2xvdWRXYXRjaCBsb2dzIGFuZCBWUEMgYWNjZXNzXHJcbiAgICogQHBhcmFtIGxhbWJkYUZ1bmN0aW9uIC0gVGhlIExhbWJkYSBmdW5jdGlvbiB0byBncmFudCBwZXJtaXNzaW9ucyB0b1xyXG4gICAqIEBwYXJhbSBpc0xvY2FsU3RhY2sgLSBXaGV0aGVyIHRoaXMgaXMgcnVubmluZyBpbiBMb2NhbFN0YWNrIGVudmlyb25tZW50IChza2lwcyBWUEMgcGVybWlzc2lvbnMpXHJcbiAgICovXHJcbiAgc3RhdGljIGdyYW50Q29tcHJlaGVuc2l2ZUFjY2VzcyhsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uLCBpc0xvY2FsU3RhY2s6IGJvb2xlYW4gPSBmYWxzZSk6IHZvaWQge1xyXG4gICAgLy8gQWx3YXlzIGdyYW50IENsb3VkV2F0Y2ggbG9ncyBhY2Nlc3NcclxuICAgIHRoaXMuZ3JhbnRDbG91ZFdhdGNoTG9nc0FjY2VzcyhsYW1iZGFGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IFZQQyBhY2Nlc3Mgb25seSBpZiBub3QgaW4gTG9jYWxTdGFjayBlbnZpcm9ubWVudFxyXG4gICAgaWYgKCFpc0xvY2FsU3RhY2spIHtcclxuICAgICAgdGhpcy5ncmFudFZwY0FjY2VzcyhsYW1iZGFGdW5jdGlvbik7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==