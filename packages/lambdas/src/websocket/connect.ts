import type { APIGatewayEventWebsocketRequestContextV2, APIGatewayProxyEventV2WithRequestContext } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

type WebSocketConnectEvent = APIGatewayProxyEventV2WithRequestContext<APIGatewayEventWebsocketRequestContextV2>;

const tableName = process.env.CONNECTIONS_TABLE;
const region = process.env.COGNITO_REGION;
const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;

if (!tableName) {
    throw new Error("Missing CONNECTIONS_TABLE environment variable.");
}

if (!region || !userPoolId || !clientId) {
    throw new Error("Missing Cognito environment variables.");
}

const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

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

        const { payload } = await jwtVerify(token, jwks, { issuer });

        if (payload.token_use !== "access") {
            return {
                statusCode: 401,
                body: "Wrong token type",
            };
        }

        if (payload.client_id !== clientId) {
            return {
                statusCode: 401,
                body: "Wrong client",
            };
        }

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