import type { APIGatewayEventWebsocketRequestContextV2, APIGatewayProxyEventV2WithRequestContext } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";

type WebSocketConnectEvent = APIGatewayProxyEventV2WithRequestContext<APIGatewayEventWebsocketRequestContextV2>;

const tableName = process.env.CONNECTIONS_TABLE;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;

if (!tableName) {
    throw new Error("Missing CONNECTIONS_TABLE environment variable.");
}

if (!userPoolId || !clientId) {
    throw new Error("Missing Cognito environment variables.");
}

const verifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: "access",
    clientId,
});

const ddb = new DynamoDBClient({});

export const handler = async (event: WebSocketConnectEvent) => {
    try {
        const connectionId = event.requestContext.connectionId;
        const token = event.queryStringParameters?.token;

        if (!connectionId) {
            return {
                statusCode: 400,
                body: "Missing connectionId",
            };
        }

        if (!token) {
            return {
                statusCode: 401,
                body: "Missing token",
            };
        }

        const payload = await verifier.verify(token);

        const userId = payload.sub;

        if (typeof userId !== "string" || userId.length === 0) {
            return {
                statusCode: 401,
                body: "Token missing sub",
            };
        }

        await ddb.send(
            new PutItemCommand({
                TableName: tableName,
                Item: {
                    connectionId: { S: connectionId },
                    userId: { S: userId },
                    connectedAt: { S: new Date().toISOString() },
                },
            })
        );

        return {
            statusCode: 200,
            body: "Connected",
        };
    } catch (error) {
        console.error("WebSocket connect failed", error);

        return {
            statusCode: 401,
            body: "Invalid or expired token",
        };
    }
};