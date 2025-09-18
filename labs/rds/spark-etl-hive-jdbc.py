import sys
from datetime import datetime

from pyspark.sql import SparkSession
from pyspark.sql.functions import *

if __name__ == "__main__":

    spark = SparkSession \
        .builder \
        .config("spark.sql.warehouse.dir", sys.argv[1]+"/warehouse/" ) \
        .enableHiveSupport() \
        .getOrCreate()

    nyTaxi = spark.read.option("inferSchema", "true").option("header", "true").csv(sys.argv[2])

    updatedNYTaxi = nyTaxi.withColumn("current_date", lit(datetime.now()))

    updatedNYTaxi.registerTempTable("ny_taxi_table")
    
    spark.sql("SHOW DATABASES").show()
    spark.sql("CREATE DATABASE IF NOT EXISTS `hivemetastore`")
    spark.sql("DROP TABLE IF EXISTS hivemetastore.ny_taxi_parquet")
    
    updatedNYTaxi.write.option("path",sys.argv[3]).mode("overwrite").format("parquet").saveAsTable("hivemetastore.ny_taxi_parquet");