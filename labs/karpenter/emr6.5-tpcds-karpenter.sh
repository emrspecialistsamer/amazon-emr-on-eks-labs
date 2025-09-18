export CORES=$1
export MEMORY=$2
# export TIMESTAMP=`date +%y-%m-%d-%H-%M-%S`

export CORES="${CORES:-4}"
export MEMORY="${MEMORY:-8}"

# calculate 30% overhead and ceil
export MEMORY_OVERHEAD=$(((${MEMORY}*25+(100-1))/100))
export EXEC_MEMORY=$((${MEMORY}-${MEMORY_OVERHEAD}))


export VIRTUAL_CLUSTER_ID=$EMR_EKS_CLUSTER_ID
export EMR_ROLE_ARN=$EMR_EKS_EXECUTION_ARN
export ECR_URL="$ACCOUNTID.dkr.ecr.$AWS_REGION.amazonaws.com"

aws emr-containers start-job-run \
  --virtual-cluster-id $VIRTUAL_CLUSTER_ID \
  --name karpenter-benchmark-${CORES}vcpu-${MEMORY}gb  \
  --execution-role-arn $EMR_ROLE_ARN \
  --release-label emr-6.5.0-latest \
  --job-driver '{
  "sparkSubmitJobDriver": {
      "entryPoint": "local:///usr/lib/spark/examples/jars/eks-spark-benchmark-assembly-1.0.jar",
      "entryPointArguments":["s3://blogpost-sparkoneks-us-east-1/blog/BLOG_TPCDS-TEST-3T-partitioned","s3://'$S3BUCKET'/EMRONEKS_TPCDS-TEST-3T-RESULT-KA","/opt/tpcds-kit/tools","parquet","3000","1","false","q70-v2.4,q82-v2.4,q64-v2.4","true"],
      "sparkSubmitParameters": "--class com.amazonaws.eks.tpcds.BenchmarkSQL --conf spark.executor.instances=50 --conf spark.driver.cores='$CORES' --conf spark.driver.memory='$EXEC_MEMORY'g --conf spark.executor.cores='$CORES' --conf spark.executor.memory='$EXEC_MEMORY'g"}}' \
  --configuration-overrides '{
    "applicationConfiguration": [
      {
        "classification": "spark-defaults", 
        "properties": {
          "spark.kubernetes.node.selector.nodePool": "default",
          "spark.kubernetes.node.selector.topology.kubernetes.io/zone": "'${AWS_REGION}'a",
          "spark.kubernetes.container.image":  "'$ECR_URL'/eks-spark-benchmark:emr6.5",
          "spark.kubernetes.driver.podTemplateFile": "s3://'$S3BUCKET'/pod-template/karpenter-driver-pod-template.yaml",
          "spark.kubernetes.executor.podTemplateFile": "s3://'$S3BUCKET'/pod-template/karpenter-executor-pod-template.yaml",
          "spark.network.timeout": "2000s",
          "spark.executor.heartbeatInterval": "300s",
          "spark.kubernetes.executor.limit.cores": "'$CORES'",
          "spark.executor.memoryOverhead": "'$MEMORY_OVERHEAD'G",
          "spark.driver.memoryOverhead": "'$MEMORY_OVERHEAD'G",
          "spark.kubernetes.executor.podNamePrefix": "karpenter-'$CORES'vcpu-'$MEMORY'gb",
          "spark.executor.defaultJavaOptions": "-verbose:gc -XX:+UseG1GC",
          "spark.driver.defaultJavaOptions": "-verbose:gc -XX:+UseG1GC"
         }
      }
    ],
    "monitoringConfiguration": {
      "persistentAppUI":"ENABLED",
      "s3MonitoringConfiguration": {
        "logUri": "'"s3://$S3BUCKET"'/logs/spark/"
      }
    }
  }'
