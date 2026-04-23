import type { APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import {
    ApiGatewayManagementApiClient,
    GoneException,
    PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";

export const handler = async (event: APIGatewayProxyWebsocketEventV2) => {
    try {
        const connectionId = event.requestContext.connectionId;
        const domainName = event.requestContext.domainName;
        const stage = event.requestContext.stage;

        if (!connectionId || !domainName || !stage) {
            return {
                statusCode: 400,
                body: "Missing connection context",
            };
        }

        const endpoint = `https://${domainName}/${stage}`;
        const client = new ApiGatewayManagementApiClient({ endpoint });

        try {
            await client.send(
                new PostToConnectionCommand({
                    ConnectionId: connectionId,
                    Data: Buffer.from(
                        JSON.stringify({ type: "pong", at: new Date().toISOString() })
                    ),
                })
            );
        } catch (error) {
            if (!(error instanceof GoneException)) {
                throw error;
            }
        }

        return {
            statusCode: 200,
            body: "Pong sent",
        };
    } catch (error) {
        console.error("WebSocket ping failed", error);
        return {
            statusCode: 500,
            body: "Failed to send pong",
        };
    }
};