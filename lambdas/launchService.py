import json
import boto3
import os
from botocore.exceptions import ClientError
from datetime import datetime
from decimal import Decimal


# Custom encoder to handle non-serializable objects
class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, Decimal)):
            return str(obj)  # Convert to string for JSON serialization
        return super(CustomJSONEncoder, self).default(obj)
    
def lambda_handler(event, context):
    # Extract the language from query parameters
    print(event)
    #dynamo lookup
    dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
    s3 = boto3.client('s3')
    table = dynamodb.Table("rooms")
    room_id = event['queryStringParameters']['roomId']
    user_id = event['queryStringParameters']['userId']
    language = event['queryStringParameters']['language']
    if not room_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'roomId is required'})
        }

    try:
        response = table.get_item(Key={'roomId': room_id}) 
        # print(response)
        # lang_2 = response['Item']['language']
        if 'Item' in response:
            members = response['Item'].get('members', [])
            if user_id not in members:
                members.append(user_id)
            
                # Update the item in DynamoDB
                table.update_item(
                    Key={'roomId': room_id},
                    UpdateExpression="SET members = :members",
                    ExpressionAttributeValues={':members': members}
                )
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps({'roomId': room_id, 'language':language, 'exists': True, 'codeRunner':response['Item']['codeRunner'], 'language':response['Item']['planguage'], 'data': response['Item']})
            }
        else:
            # Create a new record if roomId doesn't exist
            members = []
            members.append(user_id)
            
            bucket_name = 'codesnapshots'
            folder_name = f'{room_id}/'
            s3.put_object(Bucket=bucket_name, Key=folder_name)
            new_record = {
                'roomId': room_id,
                'members': members,
                'planguage': language,
                'codeRunner': os.environ.get(language + "loadbal"),
                'bucketid': f'{bucket_name}/{room_id}/'
            }
            
            existResp = table.scan(
                FilterExpression='#plang = :lang',
                ExpressionAttributeNames={'#plang': 'planguage'},  # Alias for attribute name
                ExpressionAttributeValues={':lang': language}
            )
            
            if not existResp['Items']:
                resp = create_fargate_service(language,room_id)
                print("Responser genereated: " , resp)
            table.put_item(Item=new_record)
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
                },
                'body': json.dumps({'roomId': room_id, 'language':language,'message': 'New room created', 'codeRunner':os.environ.get(language + "loadbal"), 'item': new_record})
                #'body': json.dumps({'message': 'Success'}),
                #'aws_resp': json.dumps(resp, cls=CustomJSONEncoder)
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }

def create_fargate_service(language, roomId):
    # Initialize ECS client
    ecs_client = boto3.client('ecs', region_name='us-east-2')

    # Existing resources
    cluster_name = 'DevCluster'  # Replace with your ECS cluster name
    listener_port = 8080  # Replace with your listener port
    task_definition_name = os.environ.get(language + "TaskName")
    target_group_arn = os.environ.get(language + "TargetArn")
    # servicename = "test" + language + "service8"
    servicename = "prod" + language + f"{roomId}"
    

    try:
        response = ecs_client.create_service(
            cluster=cluster_name,
            serviceName=servicename,
            taskDefinition=task_definition_name,
            desiredCount=1,
            launchType='FARGATE',
            loadBalancers=[
                {
                    'targetGroupArn': target_group_arn,
                    'containerName': 'flaskcontainer',
                    'containerPort': listener_port
                }
            ],
            deploymentConfiguration={
                'maximumPercent': 200,
                'minimumHealthyPercent': 50
            },
            networkConfiguration={
                'awsvpcConfiguration': {
                    'subnets': ['subnet-0706f313fe9f1d348', 'subnet-0f74bfcaa89d5561a', 'subnet-043dceb2bc26ff786'],  # Replace with your subnet IDs
                    'securityGroups': ['sg-0c71707fb86eb7dc5'],  # Replace with your security group ID
                    'assignPublicIp': 'ENABLED'
                }
            },
            enableECSManagedTags=True,
            propagateTags='SERVICE',
            schedulingStrategy='REPLICA'
        )

        print("Service Created:", response)
        # insert_into_dynamo(servicename,language)
        add_service_scaling(servicename)
        return response

    except Exception as e:
        print("Error creating ECS Service:", e)
        return {'message': 'Error creating ECS Service', 'error': str(e)}


def add_service_scaling(servicename):
    # Initialize the Application Auto Scaling client
    application_autoscaling_client = boto3.client('application-autoscaling', region_name='us-east-2')

    # Define the ECS Service resource
    resource_id = f'service/DevCluster/{servicename}'  # Use the specific service name

    try:
        # Register the scalable target
        application_autoscaling_client.register_scalable_target(
            ServiceNamespace='ecs',
            ResourceId=resource_id,
            ScalableDimension='ecs:service:DesiredCount',
            MinCapacity=1,
            MaxCapacity=10
        )

        # Create target tracking scaling policy
        response = application_autoscaling_client.put_scaling_policy(
            PolicyName=f'{servicename}-scaling-policy',
            ServiceNamespace='ecs',
            ResourceId=resource_id,
            ScalableDimension='ecs:service:DesiredCount',
            PolicyType='TargetTrackingScaling',
            TargetTrackingScalingPolicyConfiguration={
                'TargetValue': 50.0,  # Default value, replace if needed
                'PredefinedMetricSpecification': {
                    'PredefinedMetricType': 'ECSServiceAverageCPUUtilization'
                },
                'ScaleOutCooldown': 60,  # Default cooldown in seconds
                'ScaleInCooldown': 60   # Default cooldown in seconds
            }
        )

        print("Service scaling policy created:", response)

    except Exception as e:
        print("Error adding service scaling:", e)


# def insert_into_dynamo(servicename, language):
#     dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
#     table_name = "user_service_table"
#     table = dynamodb.Table(table_name)
#     try:
#         table.put_item(
#                 Item={
#                     'language': language,
#                     'service_name': servicename,
#                     'user_count': 1
#                 })
#         print("insert into dynamo success")
#     except Exception as e:
#         print(f"Error interacting with DynamoDB: {e}")
#         return {
#             'statusCode': 500,
#             'body': json.dumps({'message': 'Error interacting with DynamoDB'})
#         }
    
    
    #   print(task_definition_name)
    # print(targetGroupArn)
    # print(servicename)
    
    
## backup code
# import json
# import boto3
# import os
# from botocore.exceptions import ClientError
# from datetime import datetime
# from decimal import Decimal


# # Custom encoder to handle non-serializable objects
# class CustomJSONEncoder(json.JSONEncoder):
#     def default(self, obj):
#         if isinstance(obj, (datetime, Decimal)):
#             return str(obj)  # Convert to string for JSON serialization
#         return super(CustomJSONEncoder, self).default(obj)



# def lambda_handler(event, context):
#     # Extract the language from query parameters
#     print(event)
#     language = ""
#     try:
#         language = event['queryStringParameters']['language']
#     except KeyError:
#         return {
#             'statusCode': 400,
#             'body': json.dumps({'message': 'Missing required query parameter: language'})
#         }

#     # Call the function to create the ECS service
#     resp = create_fargate_service(language)

#     # Return the JSON-serialized response
#     return {
#         'statusCode': 200,
#         'body': json.dumps(resp, cls=CustomJSONEncoder)  # Use custom encoder
#     }


# def create_fargate_service(language):
#     # Initialize ECS client
#     ecs_client = boto3.client('ecs', region_name='us-east-2')

#     # Existing resources
#     cluster_name = 'DevCluster'  # Replace with your ECS cluster name
#     listener_port = 8080  # Replace with your listener port
#     task_definition_name = os.environ.get(language + "TaskName")
#     target_group_arn = os.environ.get(language + "TargetArn")
#     servicename = "test" + language + "service3"

#     try:
#         # Create ECS Service
#         response = ecs_client.create_service(
#             cluster=cluster_name,
#             serviceName=servicename,
#             taskDefinition=task_definition_name,
#             desiredCount=1,
#             launchType='FARGATE',
#             loadBalancers=[
#                 {
#                     'targetGroupArn': target_group_arn,
#                     'containerName': 'flaskcontainer',
#                     'containerPort': listener_port
#                 }
#             ],
#             deploymentConfiguration={
#                 'maximumPercent': 200,
#                 'minimumHealthyPercent': 50
#             },
#             networkConfiguration={
#                 'awsvpcConfiguration': {
#                     'subnets': ['subnet-0706f313fe9f1d348', 'subnet-0f74bfcaa89d5561a', 'subnet-043dceb2bc26ff786'],  # Replace with your subnet IDs
#                     'securityGroups': ['sg-0c71707fb86eb7dc5'],  # Replace with your security group ID
#                     'assignPublicIp': 'ENABLED'
#                 }
#             },
#             enableECSManagedTags=True,
#             propagateTags='SERVICE',
#             schedulingStrategy='REPLICA'
#         )

#         print("Service Created:", response)
#         insert_into_dynamo(servicename,language)
#         add_service_scaling(servicename)
#         return response

#     except Exception as e:
#         print("Error creating ECS Service:", e)
#         return {'message': 'Error creating ECS Service', 'error': str(e)}


# def add_service_scaling(servicename):
#     # Initialize the Application Auto Scaling client
#     application_autoscaling_client = boto3.client('application-autoscaling', region_name='us-east-2')

#     # Define the ECS Service resource
#     resource_id = f'service/DevCluster/{servicename}'  # Use the specific service name

#     try:
#         # Register the scalable target
#         application_autoscaling_client.register_scalable_target(
#             ServiceNamespace='ecs',
#             ResourceId=resource_id,
#             ScalableDimension='ecs:service:DesiredCount',
#             MinCapacity=1,
#             MaxCapacity=10
#         )

#         # Create target tracking scaling policy
#         response = application_autoscaling_client.put_scaling_policy(
#             PolicyName=f'{servicename}-scaling-policy',
#             ServiceNamespace='ecs',
#             ResourceId=resource_id,
#             ScalableDimension='ecs:service:DesiredCount',
#             PolicyType='TargetTrackingScaling',
#             TargetTrackingScalingPolicyConfiguration={
#                 'TargetValue': 50.0,  # Default value, replace if needed
#                 'PredefinedMetricSpecification': {
#                     'PredefinedMetricType': 'ECSServiceAverageCPUUtilization'
#                 },
#                 'ScaleOutCooldown': 60,  # Default cooldown in seconds
#                 'ScaleInCooldown': 60   # Default cooldown in seconds
#             }
#         )

#         print("Service scaling policy created:", response)

#     except Exception as e:
#         print("Error adding service scaling:", e)


# def insert_into_dynamo(servicename, language):
#     dynamodb = boto3.resource('dynamodb', region_name='us-east-2')
#     table_name = "user_service_table"
#     table = dynamodb.Table(table_name)
#     try:
#         table.put_item(
#                 Item={
#                     'language': language,
#                     'service_name': servicename,
#                     'user_count': 1
#                 })
#         print("insert into dynamo success")
#     except Exception as e:
#         print(f"Error interacting with DynamoDB: {e}")
#         return {
#             'statusCode': 500,
#             'body': json.dumps({'message': 'Error interacting with DynamoDB'})
#         }
    
    
#     #   print(task_definition_name)
#     # print(targetGroupArn)
#     # print(servicename)