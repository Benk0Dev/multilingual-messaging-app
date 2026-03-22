import type { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { DynamoDBClient, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const tableName = process.env.CONNECTIONS_TABLE;

if (!tableName) {
    throw new Error("Missing CONNECTIONS_TABLE environment variable.");
}

const ddb = new DynamoDBClient({});

export const handler = async (event: APIGatewayProxyWebsocketEventV2) => {
    try {
        const connectionId = event.requestContext.connectionId;

        if (!connectionId) {
            return {
                statusCode: 400,
                body: "Missing connectionId",
            };
        }

        await ddb.send(
            new DeleteItemCommand({
                TableName: tableName,
                Key: {
                    connectionId: { S: connectionId },
                },
            })
        );

        return {
            statusCode: 200,
            body: "Disconnected",
        };
    } catch (error) {
        console.error("WebSocket disconnect failed", error);

        return {
            statusCode: 500,
            body: "Failed to disconnect",
        };
    }
};