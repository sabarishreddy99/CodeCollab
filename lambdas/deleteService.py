import json
import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
ecs_client = boto3.client('ecs', region_name='us-east-2')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    print(event)
    try:
        room_id = event['queryStringParameters']['roomId']
        language = event['queryStringParameters']['language']
    except KeyError:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Missing required query parameter: roomid'})
        }

    try:
        # Check if the language exists in the table
        bucket_name = 'codesnapshots' 
        s3_prefix = f"{room_id}/"
        s3_objects = s3.list_objects_v2(Bucket=bucket_name, Prefix=s3_prefix)
        if 'Contents' in s3_objects:
            delete_objects = {'Objects': [{'Key': obj['Key']} for obj in s3_objects['Contents']]}
            s3.delete_objects(Bucket=bucket_name, Delete=delete_objects)
            
        service_name = "prod" + language + f"{room_id}"
        delete_response = delete_ecs_service(service_name)
        
        table_name = 'rooms'  # Replace with your DynamoDB table name
        table = dynamodb.Table(table_name)
        table.delete_item(Key={'roomId': room_id})

        return {
                    'statusCode': 200,
                    'body': json.dumps({
                        'message': 'resources deleted from DynamoDB, s3 and ECS',
                        'status': 'deleted',
                        'language': language,
                        'roomId':room_id,
                        'service_name': service_name,
                        'ecs_response': delete_response
                    })
                }
        
        # response = table.get_item(Key={'roomId': room_id})

        # if 'Item' in response:
        #     # Record exists
        #     item = response['Item']
        #     service_name = "prod" + language + f"{roomId}"

        #     if user_count > 1:
        #         # Decrement the user_count
        #         updated_count = user_count - 1
        #         table.update_item(
        #             Key={'language': language},
        #             UpdateExpression='SET user_count = :val',
        #             ExpressionAttributeValues={':val': updated_count}
        #         )
        #         return {
        #             'statusCode': 200,
        #             'body': json.dumps({
        #                 'message': 'User count decremented',
        #                 'status': 'decremented',
        #                 'language': language,
        #                 'user_count': updated_count
        #             })
        #         }
        #     else:
        #         # user_count is 1, delete the record from DynamoDB
        #         table.delete_item(Key={'language': language})
                
        #         # Delete the ECS service
        #         delete_response = delete_ecs_service(service_name)
                
        #         return {
        #             'statusCode': 200,
        #             'body': json.dumps({
        #                 'message': 'Service deleted from DynamoDB and ECS',
        #                 'status': 'deleted',
        #                 'language': language,
        #                 'service_name': service_name,
        #                 'ecs_response': delete_response
        #             })
        #         }
        # else:
        #     # Record does not exist
        #     return {
        #         'statusCode': 404,
        #         'body': json.dumps({
        #             'message': 'No record found for the specified language',
        #             'status': 'not_found'
        #         })
        #     }

    except ClientError as e:
        print(f"Error interacting with DynamoDB: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'Error interacting with DynamoDB'})
        }

def delete_ecs_service(service_name):
    cluster_name = 'DevCluster'  # Hardcoded cluster name
    try:
        # Update the service to set desired count to 0
        ecs_client.update_service(
            cluster=cluster_name,
            service=service_name,
            desiredCount=0
        )
        
        # Delete the ECS service
        response = ecs_client.delete_service(
            cluster=cluster_name,
            service=service_name,
            force=True  # Force delete even if tasks are running
        )
        return {'status': 'success', 'message': f"ECS service '{service_name}' deleted successfully."}
    except ecs_client.exceptions.ClientException as e:
        print(f"Error deleting ECS service: {e}")
        return {'status': 'error', 'message': f"Error deleting ECS service: {str(e)}"}
    except Exception as e:
        print(f"Unexpected error: {e}")
        return {'status': 'error', 'message': f"Unexpected error: {str(e)}"}
