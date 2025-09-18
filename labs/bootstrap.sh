#cloud9 comes with AWS v1. Upgrade to AWS v2
sudo yum install jq -y

#aws configure set region $2

account_id=`aws sts get-caller-identity --query Account --output text`

curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install eksctl on cloud9. You must have eksctl 0.34.0 version or later.

curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
eksctl version

# Install kubectl on cloud9.

curl -O https://s3.us-west-2.amazonaws.com/amazon-eks/1.33.3/2025-08-03/bin/linux/amd64/kubectl
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin

# Install helm on cloud9.

curl -sSL https://raw.githubusercontent.com/helm/helm/master/scripts/get-helm-3 | bash

# Copy TPC-DS data into account bucket
#aws s3 cp --recursive s3://aws-data-analytics-workshops/emr-eks-workshop/data/ s3://emr-eks-workshop-$account_id/data/

export CLUSTER_NAME="emr-eks-workshop"
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
export EKSCLUSTER_NAME="${CLUSTER_NAME:-emr-eks-workshop}"
export ACCOUNTID="${ACCOUNTID:-$(aws sts get-caller-identity --query Account --output text)}"
export AWS_REGION="${AWS_REGION:-$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s 169.254.169.254/latest/dynamic/instance-identity/document | jq -r '.region')}"
echo "REGION: ${AWS_REGION}"
echo "ACCOUNTID: ${ACCOUNTID}"
aws configure set region $AWS_REGION
aws eks update-kubeconfig --name $CLUSTER_NAME

# Allow Cloud9 to talk to EKS Control Plane. Add Cloud9 IP address address inbound rule to EKS Cluster Security Group

export EKS_SG=`aws eks describe-cluster --name $CLUSTER_NAME --query cluster.resourcesVpcConfig.clusterSecurityGroupId | sed 's/"//g'`

TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
export C9_IP=$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s http://169.254.169.254/latest/meta-data/local-ipv4)

aws ec2 authorize-security-group-ingress  --group-id ${EKS_SG}  --protocol tcp  --port 443  --cidr ${C9_IP}/32

aws s3 mb s3://raw-$account_id-us-east-1
aws s3 mb s3://clean-$account_id-us-east-1
aws s3 mb s3://transform-$account_id-us-east-1

export S3_RAW_BUCKET=s3://raw-$account_id-us-east-1/

aws s3 cp s3://aws-data-analytics-workshops/emr-eks-workshop/hudi-data/ s3://raw-$account_id-us-east-1/ --recursive

aws glue create-database --database-input "{\"Name\":\"raw\", \"Description\":\"This database is created using AWS CLI\"}"