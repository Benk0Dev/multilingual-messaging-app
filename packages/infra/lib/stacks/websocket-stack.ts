import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigwIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";

type WebSocketStackProps = cdk.NestedStackProps & {
    cognito: {
        userPoolId: string;
        clientId: string;
    };
};

export class WebSocketStack extends cdk.NestedStack {
    public readonly connectionsTable: dynamodb.Table;
    public readonly connectFn: lambda.Function;
    public readonly disconnectFn: lambda.Function;
    public readonly pingFn: lambda.Function;
    public readonly webSocketApi: apigwv2.WebSocketApi;
    public readonly webSocketStage: apigwv2.WebSocketStage;
    public readonly webSocketApiEndpoint: string;
    public readonly webSocketHttpApiEndpoint: string;

    constructor(scope: Construct, id: string, props: WebSocketStackProps) {
        super(scope, id, props);

        this.connectionsTable = new dynamodb.Table(this, "WsConnectionsTable", {
            tableName: "ws-connections",
            partitionKey: {
                name: "connectionId",
                type: dynamodb.AttributeType.STRING
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.connectionsTable.addGlobalSecondaryIndex({
            indexName: "userId-index",
            partitionKey: {
                name: "userId",
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });

        this.connectFn = new lambdaNode.NodejsFunction(this, "WsConnectFn", {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../../../lambdas/src/websocket/connect.ts"),
            handler: "handler",
            environment: {
                CONNECTIONS_TABLE: this.connectionsTable.tableName,
                COGNITO_USER_POOL_ID: props.cognito.userPoolId,
                COGNITO_USER_POOL_CLIENT_ID: props.cognito.clientId,
            },
        });

        this.disconnectFn = new lambdaNode.NodejsFunction(this, "WsDisconnectFn", {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../../../lambdas/src/websocket/disconnect.ts"),
            handler: "handler",
            environment: {
                CONNECTIONS_TABLE: this.connectionsTable.tableName,
            },
        });

        this.pingFn = new lambdaNode.NodejsFunction(this, "WsPingFn", {
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, "../../../lambdas/src/websocket/ping.ts"),
            handler: "handler",
        });

        this.connectionsTable.grantReadWriteData(this.connectFn);
        this.connectionsTable.grantReadWriteData(this.disconnectFn);

        this.webSocketApi = new apigwv2.WebSocketApi(this, "WebSocketApi", {
            routeSelectionExpression: "$request.body.action",
            connectRouteOptions: {
                integration: new apigwIntegrations.WebSocketLambdaIntegration("ConnectIntegration", this.connectFn),
            },
            disconnectRouteOptions: {
                integration: new apigwIntegrations.WebSocketLambdaIntegration("DisconnectIntegration", this.disconnectFn),
            },
        });

        this.webSocketApi.addRoute("ping", {
            integration: new apigwIntegrations.WebSocketLambdaIntegration("PingIntegration", this.pingFn),
        });

        this.webSocketStage = new apigwv2.WebSocketStage(this, "WebSocketStage", {
            webSocketApi: this.webSocketApi,
            stageName: "dev",
            autoDeploy: true,
        });

        const region = cdk.Stack.of(this).region;
        const account = cdk.Stack.of(this).account;
        this.pingFn.addToRolePolicy(
            new iam.PolicyStatement({
                actions: ["execute-api:ManageConnections"],
                resources: [
                    `arn:aws:execute-api:${region}:${account}:${this.webSocketApi.apiId}/${this.webSocketStage.stageName}/*`,
                ],
            })
        );

        this.webSocketApiEndpoint = this.webSocketStage.url;
        this.webSocketHttpApiEndpoint = this.webSocketStage.callbackUrl;

        new cdk.CfnOutput(this, "WebSocketUrl", {
            value: this.webSocketApiEndpoint,
        });

        new cdk.CfnOutput(this, "WebSocketHttpUrl", {
            value: this.webSocketHttpApiEndpoint,
        });

        new cdk.CfnOutput(this, "WebSocketApiId", {
            value: this.webSocketApi.apiId,
        });

        new cdk.CfnOutput(this, "WebSocketConnectionsTable", {
            value: this.connectionsTable.tableName
        });
    }
}