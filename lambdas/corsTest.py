import boto3
import uuid
import json
from datetime import datetime
import base64


s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

S3_BUCKET_NAME = 'codesnapshots'
DYNAMODB_TABLE_NAME = 'snapshots'


def lambda_handler(event, context):
    try:
        print("Received event:", event)

        # Parse the event body
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        action = body.get('action')

        if action == 'save':
            return save_snapshot(body)
        elif action == 'retrieve':
            return retrieve_snapshot(body)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid action. Use "save" or "retrieve".'})
            }
    except Exception as e:
        print(f"Error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': f'Error processing request: {str(e)}'})
        }


def save_snapshot(body):
    print("Save snapshot body:", body)

    code_content = body['code']
    room_id = body['room_id']
    user_id = body['user_id']

    print("Code content:", code_content)
    print("Room ID:", room_id)
    print("User ID:", user_id)

    encoded_content = base64.b64encode(code_content.encode('utf-8')).decode('utf-8')

    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    snapshot_id = str(uuid.uuid4())
    
    s3_key = f"{room_id}/{snapshot_id}.bin"
    
    print("snalshotID: ", snapshot_id)
    s3_client.put_object(
        Bucket=S3_BUCKET_NAME,
        Key=s3_key,
        Body=encoded_content,
        ContentType='application/octet-stream'
    )

    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    metadata = {
        'snapId': snapshot_id,
        'room_id': room_id,
        'user_id': user_id,
        's3_key': s3_key,
        'timestamp': timestamp
    }
    print("Meta data for Dynamo: ", metadata)
    table.put_item(Item=metadata)
    
    print("Meta data inserted")
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Snapshot created successfully',
            'snapshot_id': snapshot_id,
            's3_key': s3_key,
            'metadata': metadata
        })
    }


def retrieve_snapshot(body):
    snapshot_id = body['snapshot_id']

    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    response = table.get_item(Key={'snapId': snapshot_id})
    if 'Item' not in response:
        return {
            'statusCode': 404,
            'body': json.dumps({'message': 'Snapshot not found'})
        }
    metadata = response['Item']
    s3_key = metadata['s3_key']
    
    print("S3key: " , s3_key)
    s3_response = s3_client.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
    encoded_content = s3_response['Body'].read().decode('utf-8')

    decoded_content = base64.b64decode(encoded_content).decode('utf-8')

    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Snapshot retrieved successfully',
            'snapshot_id': snapshot_id,
            'code': decoded_content,
            'metadata': metadata
        })
    }
