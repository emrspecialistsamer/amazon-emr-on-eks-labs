#!/bin/bash

# SPDX-FileCopyrightText: Copyright 2021 Amazon.com, Inc. or its affiliates.
# SPDX-License-Identifier: MIT-0

# If env variables exists use that value or set a default value

S3BUCKET_NAME=${S3BUCKET_NAME:-$S3BUCKET}

echo "Using S3 bucket: $S3BUCKET_NAME..."
export EKS_VERSION="${EKS_VERSION:-1.33}"
export KARPENTER_VERSION="1.6.3"
export KARPENTER_NAMESPACE="karpenter"
export ROLE_NAME=${EKSCLUSTER_NAME}-execution-role

echo ""
echo "==============================================="
echo "  Create Job Execution Role ..."
echo "==============================================="

cat >/tmp/trust-policy.json <<EOL
{
  "Version": "2012-10-17",
  "Statement": [ {
      "Effect": "Allow",
      "Principal": { "Service": "eks.amazonaws.com" },
      "Action": "sts:AssumeRole"
    } ]
}
EOL

cat >/tmp/job-execution-policy.json <<EOL
{
    "Version": "2012-10-17",
    "Statement": [ 
        {
            "Effect": "Allow",
            "Action": ["s3:PutObject","s3:DeleteObject","s3:GetObject","s3:ListBucket"],
            "Resource": [
              "arn:aws:s3:::${S3BUCKET}",
              "arn:aws:s3:::${S3BUCKET}/*",
              "arn:aws:s3:::*.elasticmapreduce",
              "arn:aws:s3:::*.elasticmapreduce/*",
              "arn:aws:s3:::nyc-tlc",
              "arn:aws:s3:::nyc-tlc/*",
              "arn:aws:s3:::blogpost-sparkoneks-us-east-1/blog/BLOG_TPCDS-TEST-3T-partitioned/*",
              "arn:aws:s3:::blogpost-sparkoneks-us-east-1"
            ]
        }, 
        {
            "Effect": "Allow",
            "Action": [ "logs:PutLogEvents", "logs:CreateLogStream", "logs:DescribeLogGroups", "logs:DescribeLogStreams", "logs:CreateLogGroup" ],
            "Resource": [ "arn:aws:logs:*:*:*" ]
        }
    ]
}
EOL

#sed -i -- 's/{S3BUCKET}/'$S3BUCKET'/g' job-execution-policy.json
aws iam create-policy --policy-name $ROLE_NAME-policy --policy-document file:///tmp/job-execution-policy.json
aws iam create-role --role-name $ROLE_NAME --assume-role-policy-document file:///tmp/trust-policy.json
aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn arn:aws:iam::$ACCOUNTID:policy/$ROLE_NAME-policy


echo "==============================================="
echo "  Install Karpenter to EKS ......"
echo "==============================================="
# kubectl create namespace karpenter
# create IAM role and launch template
#CONTROLPLANE_SG=$(aws eks describe-cluster --name $EKSCLUSTER_NAME --region $AWS_REGION --query cluster.resourcesVpcConfig.clusterSecurityGroupId --output text)
export ALIAS_VERSION="$(aws ssm get-parameter --name "/aws/service/eks/optimized-ami/${EKS_VERSION}/amazon-linux-2023/x86_64/standard/recommended/image_id" --query Parameter.Value | xargs aws ec2 describe-images --query 'Images[0].Name' --image-ids | sed -r 's/^.*(v[[:digit:]]+).*$/\1/')"
# aws iam create-service-linked-role --aws-service-name spot.amazonaws.com || true
#export KARPENTER_IAM_ROLE_ARN="arn:aws:iam::${ACCOUNTID}:role/${EKSCLUSTER_NAME}-karpenter"
# Install Karpenter helm chart
helm upgrade --install karpenter oci://public.ecr.aws/karpenter/karpenter --version "${KARPENTER_VERSION}" --namespace "${KARPENTER_NAMESPACE}" --create-namespace \
  --set "settings.clusterName=$EKSCLUSTER_NAME" \
  --set "settings.interruptionQueue=${EKSCLUSTER_NAME}" 
  
#turn on debug mode

sed -i -- 's/{AWS_REGION}/'$AWS_REGION'/g' provisioner.yml
sed -i -- 's/{EKSCLUSTER_NAME}/'$EKSCLUSTER_NAME'/g' provisioner.yml
sed -i -- 's/{ALIAS_VERSION}/'$ALIAS_VERSION'/g' provisioner.yml
kubectl apply -f provisioner.yml


echo "==============================================="
echo "  Enable EMR on EKS ......"
echo "==============================================="

kubectl create namespace emr-karpenter
eksctl create iamidentitymapping --cluster $EKSCLUSTER_NAME --namespace emr-karpenter --service-name "emr-containers"
aws emr-containers update-role-trust-policy --cluster-name $EKSCLUSTER_NAME --namespace emr-karpenter --role-name $ROLE_NAME

# Create emr virtual cluster
aws emr-containers create-virtual-cluster --name $EKSCLUSTER_NAME-karpenter \
    --container-provider '{
        "id": "'$EKSCLUSTER_NAME'",
        "type": "EKS",
        "info": { "eksInfo": { "namespace":"'emr-karpenter'" } }
    }'

echo "========================================================"
echo "  Build a custom docker image for sample workload ......"
echo "========================================================"

export ECR_URL="$ACCOUNTID.dkr.ecr.$AWS_REGION.amazonaws.com"
# remove existing images to save disk space
docker rmi $(docker images -a | awk {'print $3'}) -f
# create ECR repo
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL
aws ecr create-repository --repository-name eks-spark-benchmark --image-scanning-configuration scanOnPush=true
# get image
docker pull public.ecr.aws/myang-poc/benchmark:emr6.5
# tag image
docker tag public.ecr.aws/myang-poc/benchmark:emr6.5 $ECR_URL/eks-spark-benchmark:emr6.5 
# push
docker push $ECR_URL/eks-spark-benchmark:emr6.5