import * as cdk from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as rds from '@aws-cdk/aws-rds';
import { CfnJson } from "@aws-cdk/core";
import * as cloud9 from '@aws-cdk/aws-cloud9';
import * as s3 from '@aws-cdk/aws-s3';
import * as fs from 'fs';

//import {readYamlFromDir} from '../utils/read-file';

import * as iam from '@aws-cdk/aws-iam';


export class EmrEksAppStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const clusterAdmin = new iam.Role(this, 'emr-eks-adminRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
   
    });

    clusterAdmin.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));
    clusterAdmin.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    const emrEksRole = new iam.Role(this, 'EMR_EKS_Job_Execution_Role', {
      assumedBy: new iam.ServicePrincipal('eks.amazonaws.com'),
      roleName: 'EMR_EKS_Job_Execution_Role'
    });

    // Attach this instance role to Cloud9-EC2 instance and disable AWS Temp Credentials on Cloud9
    const emreksInstanceProfile = new iam.CfnInstanceProfile(
      this,
      'InstanceProfile',
      {
        instanceProfileName: 'emr-eks-instance-profile',
        roles: [
          clusterAdmin.roleName,
        ],
      }
    );

    emrEksRole.addToPolicy(new iam.PolicyStatement({
      resources: ['*'],
      actions: ['s3:PutObject','s3:GetObject','s3:DeleteObject','s3:ListBucket','glue:GetDatabase','glue:CreateDatabase','glue:CreateTable','glue:GetTable','glue:GetPartition','glue:GetPartitions','glue:DeletePartition','glue:BatchCreatePartition','glue:DeleteTable','glue:ListSchemas','glue:UpdateTable','ec2:CreateSecurityGroup','ec2:DeleteSecurityGroup','ec2:AuthorizeSecurityGroupEgress','ec2:AuthorizeSecurityGroupIngress','ec2:RevokeSecurityGroupEgress','ec2:RevokeSecurityGroupIngress','ec2:DeleteSecurityGroup','acm:DescribeCertificate'],
    })); 

    emrEksRole.addToPolicy(new iam.PolicyStatement({
      resources: ['arn:aws:logs:*:*:*'],
      actions: ['logs:PutLogEvents', 'logs:CreateLogStream', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams','logs:CreateLogGroup'],
    })); 

    const vpc = new ec2.Vpc(this, "eks-vpc");
    cdk.Tags.of(vpc).add('for-use-with-amazon-emr-managed-policies','true');
    
    const databaseCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentials', {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: 'hivemsadmin',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });  
    
    const databaseSecurityGroup = new ec2.SecurityGroup(this, 'DBSecurityGroup', {
      vpc,
      description: 'security group for rds metastore',
    });
    
    databaseSecurityGroup.addIngressRule(
      ec2.Peer.ipv4(vpc.vpcCidrBlock),
      ec2.Port.tcp(3306),
      'allow MySQL access from vpc',
    );
    
    const cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_2_08_1 }),
      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
      defaultDatabaseName: "hivemetastore",
      instanceProps: {
        // optional , defaults to t3.medium
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.SMALL),
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE,
        },
        vpc,
        securityGroups: [databaseSecurityGroup]
      },
    });
    
    const eksCluster = new eks.Cluster(this, "Cluster", {
      vpc: vpc,
      mastersRole: clusterAdmin,
      defaultCapacity: 0, // we want to manage capacity ourselves
      version: eks.KubernetesVersion.V1_21,
    });

    const ondemandNG = eksCluster.addNodegroupCapacity("ondemand-ng", {
      instanceTypes: [
        new ec2.InstanceType('r5.xlarge'),
        new ec2.InstanceType('r5.2xlarge'),
        new ec2.InstanceType('r5.4xlarge')],
      minSize: 3,
      maxSize: 12,
      capacityType: eks.CapacityType.ON_DEMAND,
    });

    const spotNG = eksCluster.addNodegroupCapacity("spot-ng", {
      instanceTypes: [
        new ec2.InstanceType('m5.xlarge'),
        new ec2.InstanceType('m5.2xlarge'),
        new ec2.InstanceType('m5.4xlarge')],
      minSize: 3,
      maxSize: 12,
      capacityType: eks.CapacityType.SPOT,
    });

    const s3bucket = new s3.Bucket(this, 'bucket', {
      bucketName: 'emr-eks-workshop-'.concat(cdk.Stack.of(this).account),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
     
   // Add EKS Fargate profile for EMR workloads
    eksCluster.addFargateProfile('fargate',{selectors:[{namespace:'eks-fargate'}]});

  /** Steps for EMR Studio */
    
   /*
    * Setup EMRStudio Security Groups
    */
    const EmrStudioEngineSg = new ec2.SecurityGroup(this,'EmrStudioEngineSg',{vpc:eksCluster.vpc, allowAllOutbound:false});
    EmrStudioEngineSg.addIngressRule(ec2.Peer.anyIpv4(),ec2.Port.tcp(18888),'Allow traffic from any resources in the Workspace security group for EMR Studio.');
    const EmrStudioWorkspaceSg = new ec2.SecurityGroup(this,'EmrStudioWorkspaceSg',{vpc:eksCluster.vpc, allowAllOutbound:false});
    EmrStudioWorkspaceSg.addEgressRule(ec2.Peer.anyIpv4(),ec2.Port.tcp(18888),'Allow traffic to any resources in the Engine security group for EMR Studio.');
    EmrStudioWorkspaceSg.addEgressRule(ec2.Peer.anyIpv4(),ec2.Port.tcp(443),'Allow traffic to the internet to link Git repositories to Workspaces.'); 

    /*
    * Setup EMRStudio Service Role 
    */
    const EmrStudioServiceRole = new iam.Role(this, 'EMRStudioServiceRole', {
      assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com')
    });
    const EmrStudioPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync('./k8s/iam-policy-emr-studio-service-role.json', 'utf8')));
    const EmrStudioIAMPolicy = new iam.Policy(this,'EMRStudioServiceIAMPolicy',{document:EmrStudioPolicyDocument});
    EmrStudioIAMPolicy.attachToRole(EmrStudioServiceRole)
    
    /*
    * Setup EMRStudio User Role
    */
    
    const EmrStudioUserRole = new iam.Role(this,'EMRStudioUserRole',{assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com')});
    const EmrStudioUserPolicyJson = fs.readFileSync('./k8s/iam-policy-emr-studio-user-role.json', 'utf8');
    const EmrStudioUserPolicyDocument = iam.PolicyDocument.fromJson(JSON.parse(EmrStudioUserPolicyJson.replace('{{EMRSTUDIO_SERVICE_ROLE}}',EmrStudioServiceRole.roleArn).replace('{{DEFAULT_S3_BUCKET_NAME}}',s3bucket.bucketName).replace('{{ACCOUNT_ID}}',cdk.Stack.of(this).account).replace('{{REGION}}',cdk.Stack.of(this).region)));
    const EmrStudioUserIAMPolicy = new iam.ManagedPolicy(this,'EMRStudioUserIAMPolicy1',{document:EmrStudioUserPolicyDocument});
    //EmrStudioUserIAMPolicy.attachToRole(EmrStudioUserRole);
    EmrStudioUserRole.addManagedPolicy(EmrStudioUserIAMPolicy);  


    cdk.Tags.of(EmrStudioEngineSg).add('for-use-with-amazon-emr-managed-policies','true');
    cdk.Tags.of(EmrStudioWorkspaceSg).add('for-use-with-amazon-emr-managed-policies','true');
      
   new cdk.CfnOutput(this,'EmrStudioUserSessionPolicyArn',{
      value: EmrStudioUserIAMPolicy.managedPolicyArn,
      description: 'EmrStudio user session policy Arn'
    });
    
    new cdk.CfnOutput(this,'EmrStudioServiceRoleName',{
      value: EmrStudioServiceRole.roleName,
      description: 'EmrStudio Service Role Name'
    });
    
    new cdk.CfnOutput(this,'EmrStudioUserRoleName',{
      value: EmrStudioUserRole.roleName,
      description: 'EmrStudio User Role Name'
    });

   new cdk.CfnOutput(this, 'EKSCluster', {
      value: eksCluster.clusterName,
      description: 'Eks cluster name',
      exportName:"EKSClusterName"
    });
  
   new cdk.CfnOutput(this,'EKSClusterVpcId',{
      value: eksCluster.vpc.vpcId,
      description: 'EksCluster VpcId',
      exportName:'EKSClusterVpcId'
    });

   new cdk.CfnOutput(this, 'EKSClusterAdminArn', { 
      value: clusterAdmin.roleArn 
   });

   new cdk.CfnOutput(this, 'EMRJobExecutionRoleArn', { 
      value: emrEksRole.roleArn 
  });
  
   new cdk.CfnOutput(this, 'GetToken', { 
      value: 'aws eks get-token --cluster-name '.concat(eksCluster.clusterName).concat(' | jq -r \'.status.token\'') 
  });
  
   new cdk.CfnOutput(this, 'BootStrapCommand', { 
      value: 'sh bootstrap.sh '.concat(eksCluster.clusterName).concat(' ').concat(this.region).concat(' ').concat(clusterAdmin.roleArn)
  });
  
   new cdk.CfnOutput(this,'S3Bucket', { 
      value: 's3://'.concat(s3bucket.bucketName) 
  });
    
  }
}
