import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DatabaseStack } from "./stacks/database-stack"
import { AuthStack } from "./stacks/auth-stack"
import { WebSocketStack } from "./stacks/websocket-stack"
import { StorageStack } from "./stacks/storage-stack"

export class InfraStack extends cdk.Stack {
    public readonly db: DatabaseStack;
    public readonly auth: AuthStack;
    public readonly ws: WebSocketStack;
    public readonly storage: StorageStack;

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, "AppVpc", {
            maxAzs: 2,
            natGateways: 0, // keep cost low (NAT gateways cost money)
            subnetConfiguration: [
                { name: "public", subnetType: ec2.SubnetType.PUBLIC },
                { name: "isolated", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            ],
        });

        this.db = new DatabaseStack(this, "Database", { vpc });
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
