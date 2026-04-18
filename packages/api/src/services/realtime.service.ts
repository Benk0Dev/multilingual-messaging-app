import {
    ApiGatewayManagementApiClient,
    GoneException,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import {
    DeleteItemCommand,
    DynamoDBClient,
    QueryCommand,
  } from "@aws-sdk/client-dynamodb";
import { requiredEnv } from "../utils/requiredEnv";
  
const endpoint = requiredEnv("WEBSOCKET_URL");
const tableName = requiredEnv("WEBSOCKET_CONNECTIONS_TABLE");
const region = requiredEnv("AWS_REGION");
  
const wsClient = new ApiGatewayManagementApiClient({
    region,
    endpoint,
});
  
const ddb = new DynamoDBClient({ region });
  
export async function getConnectionIdsForUser(userId: string): Promise<string[]> {
    const result = await ddb.send(
        new QueryCommand({
            TableName: tableName,
            IndexName: "userId-index",
            KeyConditionExpression: "userId = :userId",
            ExpressionAttributeValues: {
                ":userId": { S: userId },
            },
            ProjectionExpression: "connectionId",
        })
    );
  
    return (
        result.Items?.map((item) => item.connectionId?.S).filter(
            (value): value is string => typeof value === "string"
        ) ?? []
    );
}
  
export async function deleteConnection(connectionId: string): Promise<void> {
    await ddb.send(
        new DeleteItemCommand({
            TableName: tableName,
            Key: {
                connectionId: { S: connectionId },
            },
        })
    );
}
  
export async function sendToConnection(
    connectionId: string,
    payload: unknown
): Promise<void> {
    try {
        await wsClient.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(payload)),
            })
        );
    } catch (error) {
        if (error instanceof GoneException) {
            await deleteConnection(connectionId);
            return;
        }
        throw error;
    }
}
  
export async function sendToUser(userId: string, payload: unknown): Promise<void> {
    const connectionIds = await getConnectionIdsForUser(userId);
  
    await Promise.all(
        connectionIds.map((connectionId) => sendToConnection(connectionId, payload))
    );
}

export async function sendToUsers(userIds: string[], payload: unknown): Promise<void> {
    const unique = Array.from(new Set(userIds));
    await Promise.all(unique.map((userId) => sendToUser(userId, payload)));
}