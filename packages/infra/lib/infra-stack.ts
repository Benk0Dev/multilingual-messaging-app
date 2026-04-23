import * as cdk from "aws-cdk-lib"
import { Construct } from "constructs"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { AuthStack } from "./stacks/auth-stack"
import { WebSocketStack } from "./stacks/websocket-stack"
import { StorageStack } from "./stacks/storage-stack"
import { ApiStack } from "./stacks/api-stack"

export class InfraStack extends cdk.Stack {
    public readonly auth: AuthStack;
    public readonly ws: WebSocketStack;
    public readonly storage: StorageStack;
    public readonly api: ApiStack;

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

        const appSecret = new secretsmanager.Secret(this, "AppSecret", {
            secretName: "app/runtime",
            description: "Runtime secrets for the API Lambda",
            secretObjectValue: {
                DATABASE_URL: cdk.SecretValue.unsafePlainText("placeholder-set-via-console"),
            },
        });

        const messageEncryptionSecret = new secretsmanager.Secret(this, "MessageEncryptionSecret", {
            secretName: "app/message-encryption-key",
            description: "Seed string for deriving the AES-256-GCM key used for message encryption",
            generateSecretString: {
                secretStringTemplate: JSON.stringify({}),
                generateStringKey: "MESSAGE_ENCRYPTION_SEED",
                passwordLength: 64,
                excludePunctuation: true,
            },
        });

        const googleCredentialsSecret = new secretsmanager.Secret(this, "GoogleCredentialsSecret", {
            secretName: "app/google-credentials",
            description: "Google Cloud service account JSON for Cloud Translation API",
            secretStringValue: cdk.SecretValue.unsafePlainText(
                '{"placeholder": "paste-service-account-json-via-console"}'
            ),
        });

        this.api = new ApiStack(this, "Api", {
            appSecret,
            messageEncryptionSecret,
            googleCredentialsSecret,
            env: {
                cognitoUserPoolId: this.auth.userPool.userPoolId,
                cognitoClientId: this.auth.userPoolClient.userPoolClientId,
                s3Bucket: this.storage.s3Bucket.bucketName,
                websocketUrl: this.ws.webSocketHttpApiEndpoint,
                websocketConnectionsTable: this.ws.connectionsTable.tableName,
                googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID ?? "",
            },
            userPool: this.auth.userPool,
            userPoolClient: this.auth.userPoolClient,
            connectionsTable: this.ws.connectionsTable,
            bucket: this.storage.s3Bucket,
            webSocketApiId: this.ws.webSocketApi.apiId,
            webSocketStageName: this.ws.webSocketStage.stageName,
        });
    }
}