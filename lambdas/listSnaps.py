import boto3
import json

# Initialize clients
s3_client = boto3.client('s3')

S3_BUCKET_NAME = 'codesnapshots'

def lambda_handler(event, context):
    try:
        print(event)
        room_id = event['queryStringParameters']['roomId']
        response = s3_client.list_objects_v2(
            Bucket=S3_BUCKET_NAME,
            Prefix=f"{room_id}/"
        )
        print("Resp ", response)

        available_versions = []
        if 'Contents' in response:
            # Sort contents by LastModified date
            sorted_contents = sorted(response['Contents'], key=lambda x: x['LastModified'], reverse=True)

            for obj in sorted_contents:
                key = obj['Key']
                if key == f"{room_id}/":
                    continue
                base_filename = key.split('/')[-1].rsplit('.', 1)[0]
                available_versions.append(base_filename)

        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            'body': json.dumps({
                'message': f'Snapshot list for room {room_id}',
                'versionsList': available_versions
            })
        }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Error retrieving document state'})
        }

# import boto3
# import base64
# import json
# from datetime import datetime
# import uuid

# # Initialize clients
# s3_client = boto3.client('s3')
# dynamodb = boto3.resource('dynamodb')

# S3_BUCKET_NAME = 'codesnapshots'
# DYNAMODB_TABLE_NAME = 'snapshots'

# def lambda_handler(event, context):
#     try:
#         print(event)
#         # body = json.loads(event)
#         room_id = event['queryStringParameters']['roomId']
#         user_id = event['queryStringParameters']['userId']
#         response = s3_client.list_objects_v2(
#             Bucket=S3_BUCKET_NAME,
#             Prefix=f"{room_id}/"
#         )
#         print("Resp ", response)
#         available_versions = []
#         if 'Contents' in response:
#             for obj in response['Contents']:
#                 key = obj['Key']
#                 if key == f"{room_id}/":
#                     continue
#                 base_filename = key.split('/')[-1].rsplit('.', 1)[0]
#                 available_versions.append(base_filename)
        
#         return {
#             'statusCode': 200,
#             'body': json.dumps({
#                 'message': f'Snapshot list for room {room_id}',
#                 'versionsList': available_versions
#             })
#         }
#     except Exception as e:
#         print(f"Error: {e}")
#         return {
#             'statusCode': 500,
#             'body': json.dumps({'message': 'Error saving document state'})
#         }
