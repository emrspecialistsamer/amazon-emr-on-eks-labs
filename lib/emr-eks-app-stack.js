"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmrEksAppStack = void 0;
const cdk = require("@aws-cdk/core");
const eks = require("@aws-cdk/aws-eks");
const ec2 = require("@aws-cdk/aws-ec2");
const aws_iam_1 = require("@aws-cdk/aws-iam");
class EmrEksAppStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const clusterAdmin = new aws_iam_1.Role(this, 'emr-eks-adminRole', {
            assumedBy: new aws_iam_1.ServicePrincipal('ec2.amazonaws.com'),
        });
        clusterAdmin.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
        clusterAdmin.addManagedPolicy(aws_iam_1.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));
        const emrEksRole = new aws_iam_1.Role(this, 'EMR_EKS_Job_Execution_Role', {
            assumedBy: new aws_iam_1.ServicePrincipal('eks.amazonaws.com'),
            roleName: 'EMR_EKS_Job_Execution_Role'
        });
        // Attach this instance role to Cloud9-EC2 instance and disable AWS Temp Credentials on Cloud9
        const emreksInstanceProfile = new aws_iam_1.CfnInstanceProfile(this, 'InstanceProfile', {
            instanceProfileName: 'emr-eks-instance-profile',
            roles: [
                clusterAdmin.roleName,
            ],
        });
        emrEksRole.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['*'],
            actions: ['s3:PutObject', 's3:GetObject', 's3:ListBucket'],
        }));
        emrEksRole.addToPolicy(new aws_iam_1.PolicyStatement({
            resources: ['arn:aws:logs:*:*:*'],
            actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams'],
        }));
        const vpc = new ec2.Vpc(this, "eks-vpc");
        const eksCluster = new eks.Cluster(this, "Cluster", {
            vpc: vpc,
            mastersRole: clusterAdmin,
            defaultCapacity: 0,
            version: eks.KubernetesVersion.V1_18,
        });
        eksCluster.addNodegroupCapacity("ondemand-ng", {
            instanceTypes: [
                new ec2.InstanceType('r5.xlarge'),
                new ec2.InstanceType('r5.2xlarge'),
                new ec2.InstanceType('r5.4xlarge')
            ],
            minSize: 3,
            maxSize: 6,
            capacityType: eks.CapacityType.ON_DEMAND,
        });
        eksCluster.addNodegroupCapacity("spot-ng", {
            instanceTypes: [
                new ec2.InstanceType('m5.xlarge'),
                new ec2.InstanceType('m5.2xlarge'),
                new ec2.InstanceType('m5.4xlarge')
            ],
            minSize: 3,
            maxSize: 6,
            capacityType: eks.CapacityType.SPOT,
        });
        //   const s3bucket = new s3.Bucket(this, 'emr-eks-workshop-'.concat(this.account));
        //   const c9env = new cloud9.Ec2Environment(this, 'Cloud9Env', { vpc });
        //   new cdk.CfnOutput(this, 'URL', { value: c9env.ideUrl });
        new cdk.CfnOutput(this, 'EKSCluster', {
            value: eksCluster.clusterName,
            description: 'Eks cluster name',
            exportName: "EKSClusterName"
        });
        new cdk.CfnOutput(this, 'EKSClusterAdminArn', { value: clusterAdmin.roleArn });
        new cdk.CfnOutput(this, 'EMRJobExecutionRoleArn', { value: emrEksRole.roleArn });
        //new cdk.CfnOutput(this, 'BootStrapCommand', { value: 'sh bootstrap_cdk.sh '.join() emrEksRole.roleArn });
        //   new cdk.CfnOutput(this,'S3Bucket', { value: s3bucket.bucketName });
        new cdk.CfnOutput(this, 'BootStrapCommand', { value: 'sh bootstrap.sh '.concat(eksCluster.clusterName).concat(' ').concat(this.region).concat(' ').concat(clusterAdmin.roleArn) });
        new cdk.CfnOutput(this, 'GetToken', { value: 'aws eks get-token --cluster-name '.concat(eksCluster.clusterName).concat(' --region ').concat(this.region).concat(' --role-arn ').concat(clusterAdmin.roleArn).concat(" | jq -r '.status.token' ") });
    }
}
exports.EmrEksAppStack = EmrEksAppStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1yLWVrcy1hcHAtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbXItZWtzLWFwcC1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxQ0FBcUM7QUFDckMsd0NBQXdDO0FBQ3hDLHdDQUF3QztBQUt4Qyw4Q0FPMEI7QUFHMUIsTUFBYSxjQUFlLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDekMsWUFBWSxLQUFjLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sWUFBWSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUN2RCxTQUFTLEVBQUUsSUFBSSwwQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztTQUVyRCxDQUFDLENBQUM7UUFFSCxZQUFZLENBQUMsZ0JBQWdCLENBQUMsdUJBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDN0YsWUFBWSxDQUFDLGdCQUFnQixDQUFDLHVCQUFhLENBQUMsd0JBQXdCLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDO1FBRXRHLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBSSxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUM5RCxTQUFTLEVBQUUsSUFBSSwwQkFBZ0IsQ0FBQyxtQkFBbUIsQ0FBQztZQUNwRCxRQUFRLEVBQUUsNEJBQTRCO1NBQ3ZDLENBQUMsQ0FBQztRQUVILDhGQUE4RjtRQUM5RixNQUFNLHFCQUFxQixHQUFHLElBQUksNEJBQWtCLENBQ2xELElBQUksRUFDSixpQkFBaUIsRUFDakI7WUFDRSxtQkFBbUIsRUFBRSwwQkFBMEI7WUFDL0MsS0FBSyxFQUFFO2dCQUNMLFlBQVksQ0FBQyxRQUFRO2FBQ3RCO1NBQ0YsQ0FDRixDQUFDO1FBRUYsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLHlCQUFlLENBQUM7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QUFtQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLDJCQUEyQixDQUFDLEVBQUMsQ0FBQyxDQUFDO0lBRXBQLENBQUM7Q0FDRjtBQXRGRCx3Q0FzRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCAqIGFzIGVrcyBmcm9tIFwiQGF3cy1jZGsvYXdzLWVrc1wiO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gXCJAYXdzLWNkay9hd3MtZWMyXCI7XG5pbXBvcnQgeyBDZm5Kc29uIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCAqIGFzIGNsb3VkOSBmcm9tICdAYXdzLWNkay9hd3MtY2xvdWQ5JztcbmltcG9ydCAqIGFzIHMzIGZyb20gJ0Bhd3MtY2RrL2F3cy1zMyc7XG5cbmltcG9ydCB7IFxuICAgTWFuYWdlZFBvbGljeSwgXG4gICBSb2xlLCBcbiAgIFNlcnZpY2VQcmluY2lwYWwsIFxuICAgUG9saWN5U3RhdGVtZW50LCBcbiAgIEVmZmVjdCxcbiAgIENmbkluc3RhbmNlUHJvZmlsZVxufSBmcm9tICdAYXdzLWNkay9hd3MtaWFtJztcblxuXG5leHBvcnQgY2xhc3MgRW1yRWtzQXBwU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICAgIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICBjb25zdCBjbHVzdGVyQWRtaW4gPSBuZXcgUm9sZSh0aGlzLCAnZW1yLWVrcy1hZG1pblJvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdlYzIuYW1hem9uYXdzLmNvbScpLFxuICAgXG4gICAgfSk7XG5cbiAgICBjbHVzdGVyQWRtaW4uYWRkTWFuYWdlZFBvbGljeShNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQWRtaW5pc3RyYXRvckFjY2VzcycpKTtcbiAgICBjbHVzdGVyQWRtaW4uYWRkTWFuYWdlZFBvbGljeShNYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnQW1hem9uU1NNTWFuYWdlZEluc3RhbmNlQ29yZScpKTtcblxuICAgIGNvbnN0IGVtckVrc1JvbGUgPSBuZXcgUm9sZSh0aGlzLCAnRU1SX0VLU19Kb2JfRXhlY3V0aW9uX1JvbGUnLCB7XG4gICAgICBhc3N1bWVkQnk6IG5ldyBTZXJ2aWNlUHJpbmNpcGFsKCdla3MuYW1hem9uYXdzLmNvbScpLFxuICAgICAgcm9sZU5hbWU6ICdFTVJfRUtTX0pvYl9FeGVjdXRpb25fUm9sZSdcbiAgICB9KTtcblxuICAgIC8vIEF0dGFjaCB0aGlzIGluc3RhbmNlIHJvbGUgdG8gQ2xvdWQ5LUVDMiBpbnN0YW5jZSBhbmQgZGlzYWJsZSBBV1MgVGVtcCBDcmVkZW50aWFscyBvbiBDbG91ZDlcbiAgICBjb25zdCBlbXJla3NJbnN0YW5jZVByb2ZpbGUgPSBuZXcgQ2ZuSW5zdGFuY2VQcm9maWxlKFxuICAgICAgdGhpcyxcbiAgICAgICdJbnN0YW5jZVByb2ZpbGUnLFxuICAgICAge1xuICAgICAgICBpbnN0YW5jZVByb2ZpbGVOYW1lOiAnZW1yLWVrcy1pbnN0YW5jZS1wcm9maWxlJyxcbiAgICAgICAgcm9sZXM6IFtcbiAgICAgICAgICBjbHVzdGVyQWRtaW4ucm9sZU5hbWUsXG4gICAgICAgIF0sXG4gICAgICB9XG4gICAgKTtcblxuICAgIGVtckVrc1JvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxuICAgICAgYWN0aW9uczogWydzMzpQdXRPYmplY3QnLCdzMzpHZXRPYmplY3QnLCdzMzpMaXN0QnVja2V0J10sXG4gICAgfSkpOyBcblxuICAgIGVtckVrc1JvbGUuYWRkVG9Qb2xpY3kobmV3IFBvbGljeVN0YXRlbWVudCh7XG4gICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czpsb2dzOio6KjoqJ10sXG4gICAgICBhY3Rpb25zOiBbJ2xvZ3M6UHV0TG9nRXZlbnRzJywgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJywgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLCAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnXSxcbiAgICB9KSk7IFxuXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgXCJla3MtdnBjXCIpO1xuXG4gICAgY29uc3QgZWtzQ2x1c3RlciA9IG5ldyBla3MuQ2x1c3Rlcih0aGlzLCBcIkNsdXN0ZXJcIiwge1xuICAgICAgdnBjOiB2cGMsXG4gICAgICBtYXN0ZXJzUm9sZTogY2x1c3RlckFkbWluLFxuICAgICAgZGVmYXVsdENhcGFjaXR5OiAwLCAvLyB3ZSB3YW50IHRvIG1hbmFnZSBjYXBhY2l0eSBvdXJzZWx2ZXNcbiAgICAgIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8xOCxcbiAgICB9KTtcblxuICAgIGVrc0NsdXN0ZXIuYWRkTm9kZWdyb3VwQ2FwYWNpdHkoXCJvbmRlbWFuZC1uZ1wiLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBbXG4gICAgICAgIG5ldyBlYzIuSW5zdGFuY2VUeXBlKCdyNS54bGFyZ2UnKSxcbiAgICAgICAgbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3I1LjJ4bGFyZ2UnKSxcbiAgICAgICAgbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ3I1LjR4bGFyZ2UnKV0sXG4gICAgICBtaW5TaXplOiAzLFxuICAgICAgbWF4U2l6ZTogNixcbiAgICAgIGNhcGFjaXR5VHlwZTogZWtzLkNhcGFjaXR5VHlwZS5PTl9ERU1BTkQsXG4gICAgfSk7XG5cbiAgICBla3NDbHVzdGVyLmFkZE5vZGVncm91cENhcGFjaXR5KFwic3BvdC1uZ1wiLCB7XG4gICAgICBpbnN0YW5jZVR5cGVzOiBbXG4gICAgICAgIG5ldyBlYzIuSW5zdGFuY2VUeXBlKCdtNS54bGFyZ2UnKSxcbiAgICAgICAgbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ201LjJ4bGFyZ2UnKSxcbiAgICAgICAgbmV3IGVjMi5JbnN0YW5jZVR5cGUoJ201LjR4bGFyZ2UnKV0sXG4gICAgICBtaW5TaXplOiAzLFxuICAgICAgbWF4U2l6ZTogNixcbiAgICAgIGNhcGFjaXR5VHlwZTogZWtzLkNhcGFjaXR5VHlwZS5TUE9ULFxuICAgIH0pO1xuXG4vLyAgIGNvbnN0IHMzYnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnZW1yLWVrcy13b3Jrc2hvcC0nLmNvbmNhdCh0aGlzLmFjY291bnQpKTtcbiAgICAgXG4vLyAgIGNvbnN0IGM5ZW52ID0gbmV3IGNsb3VkOS5FYzJFbnZpcm9ubWVudCh0aGlzLCAnQ2xvdWQ5RW52JywgeyB2cGMgfSk7XG4gICBcdFxuLy8gICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVVJMJywgeyB2YWx1ZTogYzllbnYuaWRlVXJsIH0pO1xuICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VLU0NsdXN0ZXInLCB7XG4gICAgICB2YWx1ZTogZWtzQ2x1c3Rlci5jbHVzdGVyTmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnRWtzIGNsdXN0ZXIgbmFtZScsXG4gICAgICBleHBvcnROYW1lOlwiRUtTQ2x1c3Rlck5hbWVcIlxuICAgIH0pO1xuICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VLU0NsdXN0ZXJBZG1pbkFybicsIHsgdmFsdWU6IGNsdXN0ZXJBZG1pbi5yb2xlQXJuIH0pO1xuICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VNUkpvYkV4ZWN1dGlvblJvbGVBcm4nLCB7IHZhbHVlOiBlbXJFa3NSb2xlLnJvbGVBcm4gfSk7XG4gICAvL25ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCb290U3RyYXBDb21tYW5kJywgeyB2YWx1ZTogJ3NoIGJvb3RzdHJhcF9jZGsuc2ggJy5qb2luKCkgZW1yRWtzUm9sZS5yb2xlQXJuIH0pO1xuLy8gICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCdTM0J1Y2tldCcsIHsgdmFsdWU6IHMzYnVja2V0LmJ1Y2tldE5hbWUgfSk7XG4gICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQm9vdFN0cmFwQ29tbWFuZCcsIHsgdmFsdWU6ICdzaCBib290c3RyYXAuc2ggJy5jb25jYXQoZWtzQ2x1c3Rlci5jbHVzdGVyTmFtZSkuY29uY2F0KCcgJykuY29uY2F0KHRoaXMucmVnaW9uKS5jb25jYXQoJyAnKS5jb25jYXQoY2x1c3RlckFkbWluLnJvbGVBcm4pfSk7XG4gICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR2V0VG9rZW4nLCB7IHZhbHVlOiAnYXdzIGVrcyBnZXQtdG9rZW4gLS1jbHVzdGVyLW5hbWUgJy5jb25jYXQoZWtzQ2x1c3Rlci5jbHVzdGVyTmFtZSkuY29uY2F0KCcgLS1yZWdpb24gJykuY29uY2F0KHRoaXMucmVnaW9uKS5jb25jYXQoJyAtLXJvbGUtYXJuICcpLmNvbmNhdChjbHVzdGVyQWRtaW4ucm9sZUFybikuY29uY2F0KFwiIHwganEgLXIgJy5zdGF0dXMudG9rZW4nIFwiKX0pOyBcbiAgICBcbiAgfVxufVxuIl19