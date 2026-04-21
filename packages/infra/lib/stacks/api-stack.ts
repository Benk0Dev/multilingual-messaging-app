import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as apigwAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";

export type ApiStackProps = cdk.NestedStackProps & {
    env: {
        cognitoUserPoolId: string;
        cognitoClientId: string;
        s3Bucket: string;
        websocketUrl: string;
        websocketConnectionsTable: string;
    };
    appSecret: secretsmanager.ISecret;
    userPool: cognito.IUserPool;
    userPoolClient: cognito.IUserPoolClient;
    connectionsTable: dynamodb.ITable;
    bucket: s3.IBucket;
    webSocketApiId: string;
    webSocketStageName: string;
};

export class ApiStack extends cdk.NestedStack {
    public readonly apiFn: lambda.DockerImageFunction;
    public readonly httpApi: apigwv2.HttpApi;

    constructor(scope: Construct, id: string, props: ApiStackProps) {
        super(scope, id, props);

        const repoRoot = path.resolve(__dirname, "../../../..");

        this.apiFn = new lambda.DockerImageFunction(this, "ApiFn", {
            code: lambda.DockerImageCode.fromImageAsset(repoRoot, {
                file: "packages/api/Dockerfile",
                platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64,
            }),
            architecture: lambda.Architecture.ARM_64,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(15),
            environment: {
                NODE_ENV: "production",
                APP_SECRET_ARN: props.appSecret.secretArn,
                COGNITO_USER_POOL_ID: props.env.cognitoUserPoolId,
                COGNITO_USER_POOL_CLIENT_ID: props.env.cognitoClientId,
                S3_BUCKET: props.env.s3Bucket,
                WEBSOCKET_URL: props.env.websocketUrl,
                WEBSOCKET_CONNECTIONS_TABLE: props.env.websocketConnectionsTable,
            },
        });

        props.appSecret.grantRead(this.apiFn);
        props.connectionsTable.grantReadWriteData(this.apiFn);
        props.bucket.grantReadWrite(this.apiFn);

        this.apiFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["translate:TranslateText"],
                resources: ["*"],
            })
        );

        const region = cdk.Stack.of(this).region;
        const account = cdk.Stack.of(this).account;
        this.apiFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["execute-api:ManageConnections"],
                resources: [
                    `arn:aws:execute-api:${region}:${account}:${props.webSocketApiId}/${props.webSocketStageName}/*`,
                ],
            })
        );

        const authorizer = new apigwAuthorizers.HttpUserPoolAuthorizer(
            "CognitoAuthorizer",
            props.userPool,
            {
                userPoolClients: [props.userPoolClient],
            }
        );

        this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
            apiName: "HttpApi",
            defaultAuthorizer: authorizer,
        });

        this.httpApi.addRoutes({
            path: "/api/health",
            methods: [apigwv2.HttpMethod.GET],
            integration: new apigwIntegrations.HttpLambdaIntegration(
                "HealthIntegration",
                this.apiFn
            ),
            authorizer: new apigwv2.HttpNoneAuthorizer(),
        });

        this.httpApi.addRoutes({
            path: "/{proxy+}",
            methods: [apigwv2.HttpMethod.ANY],
            integration: new apigwIntegrations.HttpLambdaIntegration(
                "ApiIntegration",
                this.apiFn
            ),
        });

        new cdk.CfnOutput(this, "ApiUrl", {
            value: this.httpApi.apiEndpoint,
        });
    }
}