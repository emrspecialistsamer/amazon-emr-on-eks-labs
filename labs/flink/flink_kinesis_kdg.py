from pyflink.common import Configuration
from pyflink.datastream import StreamExecutionEnvironment, RuntimeExecutionMode
from pyflink.table import StreamTableEnvironment, EnvironmentSettings, TableEnvironment
from pyflink.table.udf import udf
import re
import sys
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--streamName')
parser.add_argument('--bucket')
#args = vars(parser.parse_args())

args = parser.parse_args()

if args.streamName == None:
    print("Enter the Kinesis stream name")
    exit(1)

if args.bucket == None:
    print("Enter the bucket name")
    exit(1)

# Variables
BUCKET_NAME = args.bucket
STREAM_NAME = args.streamName
REGION = "us-east-1" # Modify this to add as an argument
SOURCE_TABLE_NAME = "source_coffee_stream"
SINK_FILE_PATH = f"s3://{BUCKET_NAME}/sink/coffee-stream/"
SINK_TABLE_NAME = "sink_coffee_stream"
SINK_TUMBLING_WINDOW_TABLE_NAME = "sink_tumbling_window_coffee_stream"
SINK_TUMBLING_WINDOW_FILE_PATH = f"s3://{BUCKET_NAME}/sink/coffee-stream-tumbling-windows/"


env = StreamExecutionEnvironment.get_execution_environment()
env.set_runtime_mode(RuntimeExecutionMode.STREAMING)
env.enable_checkpointing(60000)

JAR_PATHS = tuple(
       [
           "file:///usr/lib/flink/plugins/pyflink-uber-jar/pyflink-uber-jar-1.0.0.jar"
       ]
    )
#print(JAR_PATHS)
env.add_jars(*JAR_PATHS)

table_env = StreamTableEnvironment.create(stream_execution_environment=env)

#table_config = table_env.get_config()
#config = Configuration()
#config.set_string(
#    "execution.checkpointing.interval", "1min"
#)

#table_env.create_temporary_function(
#    "add_source", udf(lambda: "NYCTAXI", result_type="STRING")
#)

#def inject_security_opts(opts: dict, bootstrap_servers: str):
#    if re.search("9098$", bootstrap_servers):
#        opts = {
#            **opts,
#            **{
#                "properties.security.protocol": "SASL_SSL",
#                "properties.sasl.mechanism": "AWS_MSK_IAM",
#                "properties.sasl.jaas.config": "software.amazon.msk.auth.iam.IAMLoginModule required;",
#                "properties.sasl.client.callback.handler.class": "software.amazon.msk.auth.iam.IAMClientCallbackHandler",
#            },
#        }
#    return ", ".join({f"'{k}' = '{v}'" for k, v in opts.items()})

def create_source_table(table_name: str, stream_name: str):
    stmt = f"""
    CREATE TABLE {table_name} (
        myuuid VARCHAR,
        event_time TIMESTAMP(3),
        name VARCHAR,
        address VARCHAR,
        city VARCHAR,
        zipcode VARCHAR,
        country VARCHAR,
        email VARCHAR,
        phone VARCHAR,
        coffee VARCHAR,
        account VARCHAR,
        currency VARCHAR,
        num_ordered INT,
        ccnum VARCHAR,
        ccexpiry VARCHAR,
        ccsecurecode VARCHAR,
        ip VARCHAR,
        browser VARCHAR,
        WATERMARK FOR event_time AS event_time - INTERVAL '5' SECOND
    )
    WITH (
        'connector' = 'kinesis',
        'stream' = '{stream_name}',
        'aws.region' = '{REGION}',
        'scan.stream.initpos' = 'LATEST',
        'format' = 'json'
    )"""
    print(stmt)
    return stmt

def set_insert_sql_sink_all_to_s3(source_table_name: str, sink_table_name: str):
    stmt = f"""
    INSERT INTO {sink_table_name}
    SELECT
        myuuid,
        event_time,
        name,
        address,
        city,
        zipcode,
        country,
        email,
        phone,
        coffee,
        CASE
          WHEN (coffee = 'pour') THEN 2.50 
          WHEN (coffee = 'latte') THEN 4.50 
          WHEN (coffee = 'mocha') THEN 5.00 
          ELSE 0.00
        END as unit_price,
        CASE
          WHEN (coffee = 'pour') THEN 2.50 * num_ordered 
          WHEN (coffee = 'latte') THEN 4.50 * num_ordered 
          WHEN (coffee = 'mocha') THEN 5.00 * num_ordered 
          ELSE 0.00
        END as total_amount,
        account,
        currency,
        num_ordered,
        ccnum,
        ccexpiry,
        ccsecurecode,
        ip,
        browser,
        cast(year(event_time) AS VARCHAR) as r_year,
        cast(month(event_time) AS VARCHAR) as r_month,
        cast(dayofmonth(event_time) AS VARCHAR) as r_day,
        cast(hour(event_time) AS VARCHAR) as r_hour
    FROM {source_table_name}
    """
    print(stmt)
    return stmt

def set_insert_sql_tumbling_window(source_table_name: str, sink_table_name: str):
    stmt = f"""
    INSERT INTO {sink_table_name} 
    SELECT 
        window_start, 
        window_end, 
        coffee, 
        MIN(CASE
          WHEN (coffee = 'pour') THEN 2.50 * num_ordered 
          WHEN (coffee = 'latte') THEN 4.50 * num_ordered 
          WHEN (coffee = 'mocha') THEN 5.00 * num_ordered 
          ELSE 0.00
        END ) as min_total_amount,
        MAX(CASE
          WHEN (coffee = 'pour') THEN 2.50 * num_ordered 
          WHEN (coffee = 'latte') THEN 4.50 * num_ordered 
          WHEN (coffee = 'mocha') THEN 5.00 * num_ordered 
          ELSE 0.00
        END ) as max_total_amount,
        SUM(CASE
          WHEN (coffee = 'pour') THEN 2.50 * num_ordered 
          WHEN (coffee = 'latte') THEN 4.50 * num_ordered 
          WHEN (coffee = 'mocha') THEN 5.00 * num_ordered 
          ELSE 0.00
        END ) as sum_total_amount,
        STDDEV_POP(CASE
          WHEN (coffee = 'pour') THEN 2.50 * num_ordered 
          WHEN (coffee = 'latte') THEN 4.50 * num_ordered 
          WHEN (coffee = 'mocha') THEN 5.00 * num_ordered 
          ELSE 0.00
        END ) as stddev_total_amount
    FROM table (
     tumble(table {source_table_name}, descriptor(event_time), interval '1' minute)
    )
    group by window_start, window_end, coffee
    """
    print(stmt)
    return stmt

def create_sink_table(table_name: str, file_path: str):
    stmt = f"""
    CREATE TABLE {table_name} (
        myuuid VARCHAR,
        event_time TIMESTAMP,
        name VARCHAR,
        address VARCHAR,
        city VARCHAR,
        zipcode VARCHAR,
        country VARCHAR,
        email VARCHAR,
        phone VARCHAR,
        coffee VARCHAR,
        unit_price DOUBLE,
        total_amount DOUBLE,
        account VARCHAR,
        currency VARCHAR,
        num_ordered INT,
        ccnum VARCHAR,
        ccexpiry VARCHAR,
        ccsecurecode VARCHAR,
        ip VARCHAR,
        browser VARCHAR,
        r_year VARCHAR,
        r_month VARCHAR,
        r_day VARCHAR,
        r_hour VARCHAR
    ) PARTITIONED BY (`r_year`, `r_month`, `r_day`) WITH (
        'connector'= 'filesystem',
        'path' = '{file_path}',
        'format' = 'parquet',
        'sink.partition-commit.delay'='1 h',
        'sink.partition-commit.policy.kind'='success-file'
    )
    """
    print(stmt)
    return stmt

def create_sink_table_tumbling_window(table_name: str, file_path: str):
    stmt = f"""
    CREATE TABLE {table_name} (
        window_start TIMESTAMP, 
        window_end TIMESTAMP, 
        coffee VARCHAR, 
        min_total_amount DOUBLE,
        max_total_amount DOUBLE,
        sum_total_amount DOUBLE,
        stddev_total_amount DOUBLE 
    ) PARTITIONED BY (`coffee`) WITH (
        'connector'= 'filesystem',
        'path' = '{file_path}',
        'format' = 'parquet',
        'sink.partition-commit.delay'='1 h',
        'sink.partition-commit.policy.kind'='success-file'
    )
    """
    print(stmt)
    return stmt

def main():    
    #### create tables

    ## Source table
    table_env.execute_sql(
        create_source_table(
            SOURCE_TABLE_NAME, STREAM_NAME
        )
    )
    
    ## Sink table
    table_env.execute_sql(
        create_sink_table(
            SINK_TABLE_NAME,
            SINK_FILE_PATH
        )
    )

    ## Tumbling windows table
    table_env.execute_sql(
        create_sink_table_tumbling_window(
            SINK_TUMBLING_WINDOW_TABLE_NAME,
            SINK_TUMBLING_WINDOW_FILE_PATH
        )
    )

    #### Insert stream into tables

    ## Multiple insert
    stmt_set = table_env.create_statement_set()
    
    ## Tumbling windows
    stmt_set.add_insert_sql(
        set_insert_sql_tumbling_window(
            SOURCE_TABLE_NAME,
            SINK_TUMBLING_WINDOW_TABLE_NAME
        )
    )
    
    ## Data sink to S3
    stmt_set.add_insert_sql(
        set_insert_sql_sink_all_to_s3(
            SOURCE_TABLE_NAME,
            SINK_TABLE_NAME
        )
    )

    table_result = stmt_set.execute()

    print(table_result.get_job_client().get_job_status())

if __name__ == "__main__":
    main()