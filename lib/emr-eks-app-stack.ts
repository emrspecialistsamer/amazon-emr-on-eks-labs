import * as cdk from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import { CfnJson } from "@aws-cdk/core";
import * as cloud9 from '@aws-cdk/aws-cloud9';
import * as s3 from '@aws-cdk/aws-s3';

import { 
   ManagedPolicy, 
   Role, 
   ServicePrincipal, 
   PolicyStatement, 
   Effect,
   CfnInstanceProfile
} from '@aws-cdk/aws-iam';


export class EmrEksAppStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterAdmin = new Role(this, 'emr-eks-adminRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
   
    });

    clusterAdmin.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    clusterAdmin.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const emrEksRole = new Role(this, 'EMR_EKS_Job_Execution_Role', {
      assumedBy: new ServicePrincipal('eks.amazonaws.com'),
      roleName: 'EMR_EKS_Job_Execution_Role'
    });

    // Attach this instance role to Cloud9-EC2 instance and disable AWS Temp Credentials on Cloud9
    const emreksInstanceProfile = new CfnInstanceProfile(
      this,
      'InstanceProfile',
      {
        instanceProfileName: 'emr-eks-instance-profile',
        roles: [
          clusterAdmin.roleName,
        ],
      }
    );

    emrEksRole.addToPolicy(new PolicyStatement({
      resources: ['*'],
      actions: ['s3:PutObject','s3:GetObject','s3:ListBucket'],
    })); 

    emrEksRole.addToPolicy(new PolicyStatement({
      resources: ['arn:aws:logs:*:*:*'],
      actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams'],
    })); 

    const vpc = new ec2.Vpc(this, "eks-vpc");

    const eksCluster = new eks.Cluster(this, "Cluster", {
      vpc: vpc,
      mastersRole: clusterAdmin,
      defaultCapacity: 0, // we want to manage capacity ourselves
      version: eks.KubernetesVersion.V1_19,
    });

    eksCluster.addNodegroupCapacity("ondemand-ng", {
      instanceTypes: [
        new ec2.InstanceType('r5.xlarge'),
        new ec2.InstanceType('r5.2xlarge'),
        new ec2.InstanceType('r5.4xlarge')],
      minSize: 3,
      maxSize: 6,
      capacityType: eks.CapacityType.ON_DEMAND,
    });

    eksCluster.addNodegroupCapacity("spot-ng", {
      instanceTypes: [
        new ec2.InstanceType('m5.xlarge'),
        new ec2.InstanceType('m5.2xlarge'),
        new ec2.InstanceType('m5.4xlarge')],
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
      exportName:"EKSClusterName"
    });
   new cdk.CfnOutput(this, 'EKSClusterAdminArn', { value: clusterAdmin.roleArn });
   new cdk.CfnOutput(this, 'EMRJobExecutionRoleArn', { value: emrEksRole.roleArn });
   //new cdk.CfnOutput(this, 'BootStrapCommand', { value: 'sh bootstrap_cdk.sh '.join() emrEksRole.roleArn });
//   new cdk.CfnOutput(this,'S3Bucket', { value: s3bucket.bucketName });
   new cdk.CfnOutput(this, 'BootStrapCommand', { value: 'sh bootstrap.sh '.concat(eksCluster.clusterName).concat(' ').concat(this.region).concat(' ').concat(clusterAdmin.roleArn)});
   new cdk.CfnOutput(this, 'GetToken', { value: 'aws eks get-token --cluster-name '.concat(eksCluster.clusterName).concat(' --region ').concat(this.region).concat(' --role-arn ').concat(clusterAdmin.roleArn).concat(" | jq -r '.status.token' ")}); 
    
  }
}
