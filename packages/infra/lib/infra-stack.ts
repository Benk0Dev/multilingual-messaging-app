import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import { AuthStack } from "./stacks/auth-stack"
import { WebSocketStack } from "./stacks/websocket-stack"
import { StorageStack } from "./stacks/storage-stack"

export class InfraStack extends cdk.Stack {
    public readonly auth: AuthStack;
    public readonly ws: WebSocketStack;
    public readonly storage: StorageStack;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this.auth = new AuthStack(this, "Auth");
        this.ws = new WebSocketStack(this, "WebSocket", {
            cognito: {
                userPoolId: this.auth.userPool.userPoolId,
                clientId: this.auth.userPoolClient.userPoolClientId,
            },
        });
        this.storage = new StorageStack(this, "Storage");
    }
}
