TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`

export EKSCLUSTER_NAME="${CLUSTER_NAME:-emr-eks-workshop}"
export ACCOUNTID="${ACCOUNTID:-$(aws sts get-caller-identity --query Account --output text)}"
export AWS_REGION="${AWS_REGION:-$(curl -H "X-aws-ec2-metadata-token: $TOKEN" -s 169.254.169.254/latest/dynamic/instance-identity/document | jq -r '.region')}"

echo "Account ID: $ACCOUNTID"
echo "AWS Region: $AWS_REGION"

case $AWS_REGION in

  ap-northeast-1)
    export IMGACCOUNTID=059004520145
    ;;
    
  ap-northeast-2)
    export IMGACCOUNTID=996579266876
    ;;
    
  ap-south-1)
    export IMGACCOUNTID=235914868574
    ;;
    
  ap-southeast-1)
    export IMGACCOUNTID=671219180197
    ;;
    
  ap-southeast-2)
    export IMGACCOUNTID=038297999601
    ;;
    
  ca-central-1)
    export IMGACCOUNTID=351826393999
    ;;
    
  eu-central-1)
    export IMGACCOUNTID=107292555468
    ;;
    
  eu-north-1)
    export IMGACCOUNTID=830386416364
    ;;
    
  eu-west-1)
    export IMGACCOUNTID=483788554619
    ;;
    
  eu-west-2)
    export IMGACCOUNTID=118780647275
    ;;
    
  eu-west-3)
    export IMGACCOUNTID=307523725174
    ;;
    
  sa-east-1)
    export IMGACCOUNTID=052806832358
    ;;
    
  us-east-1)
    export IMGACCOUNTID=755674844232
    ;;
    
  us-east-2)
    export IMGACCOUNTID=711395599931
    ;;
    
  us-west-1)
    export IMGACCOUNTID=608033475327
    ;;
    
  us-west-2)
    export IMGACCOUNTID=895885662937
    ;;
  
  *)  
    export IMGACCOUNTID=UNKNOWN
    ;;
esac
  
echo "EMR on EKS Base Image account ID: $IMGACCOUNTID"

  

aws ecr get-login-password \
--region $AWS_REGION | helm registry login \
--username AWS \
--password-stdin $IMGACCOUNTID.dkr.ecr.$AWS_REGION.amazonaws.com


helm install spark-operator-demo \
oci://$IMGACCOUNTID.dkr.ecr.$AWS_REGION.amazonaws.com/spark-operator \
--set emrContainers.awsRegion=$AWS_REGION \
--version 7.9.0 \
--set serviceAccounts.spark.create=false \
--namespace spark-operator \
--create-namespace

helm list --namespace spark-operator -o yaml

cat >/tmp/spark-operator-job-execution-policy.json <<EOF
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Action": [
				"acm:DescribeCertificate",
				"ec2:AuthorizeSecurityGroupEgress",
				"ec2:AuthorizeSecurityGroupIngress",
				"ec2:CreateSecurityGroup",
				"ec2:DeleteSecurityGroup",
				"ec2:RevokeSecurityGroupEgress",
				"ec2:RevokeSecurityGroupIngress",
				"glue:AlterPartitions",
				"glue:BatchCreatePartition",
				"glue:CreateDatabase",
				"glue:CreateTable",
				"glue:DeletePartition",
				"glue:DeleteTable",
				"glue:GetDatabase",
				"glue:GetDatabases",
				"glue:GetPartition",
				"glue:GetPartitions",
				"glue:GetTable",
				"glue:GetUserDefinedFunctions",
				"glue:ListSchemas",
				"glue:UpdateTable",
				"s3:DeleteObject",
				"s3:GetObject",
				"s3:ListBucket",
				"s3:PutObject"
			],
			"Resource": "*",
			"Effect": "Allow"
		},
		{
			"Action": [
				"logs:CreateLogGroup",
				"logs:CreateLogStream",
				"logs:DescribeLogGroups",
				"logs:DescribeLogStreams",
				"logs:PutLogEvents"
			],
			"Resource": "arn:aws:logs:*:*:*",
			"Effect": "Allow"
		}
	]
}
EOF

aws iam create-policy --policy-name spark-operator-emr-job-execution-policy --policy-document file:///tmp/spark-operator-job-execution-policy.json


eksctl create iamserviceaccount \
--cluster=$EKSCLUSTER_NAME \
--region $AWS_REGION \
--name=spark-operator-emr-job-execution-sa \
--attach-policy-arn=arn:aws:iam::$ACCOUNTID:policy/spark-operator-emr-job-execution-policy \
--role-name=spark-operator-emr-job-execution-irsa \
--namespace=data-team-a \
--approve



cat <<EOF >/tmp/emr-job-execution-rbac.yaml
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: spark-operator-emr-job-execution-role
  namespace: data-team-a
rules:
  - apiGroups: ["", "batch","extensions"]
    resources: ["configmaps","serviceaccounts","events","pods","pods/exec","pods/log","pods/portforward","secrets","services","persistentvolumeclaims"]
    verbs: ["create","delete","get","list","patch","update","watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: spark-operator-emr-job-execution-rb
  namespace: data-team-a
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: spark-operator-emr-job-execution-role
subjects:
  - kind: ServiceAccount
    name: spark-operator-emr-job-execution-sa
    namespace: data-team-a
EOF


kubectl apply -f /tmp/emr-job-execution-rbac.yaml
