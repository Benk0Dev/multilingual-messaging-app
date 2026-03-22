import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class AuthStack extends cdk.NestedStack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly preSignUpFn: lambda.Function;

    constructor(scope: Construct, id: string, props?: cdk.NestedStackProps) {
        super(scope, id, props);

        this.userPool = new cognito.UserPool(this, "UserPool", {
            signInAliases: { username: true, email: true },
            signInPolicy: {
                allowedFirstAuthFactors: {
                    emailOtp: true,
                    password: true, // required for cognito
                    smsOtp: false,
                    passkey: false,
                },
            },
            standardAttributes: {
                email: { required: true, mutable: true },
            },
            autoVerify: { email: true },
            selfSignUpEnabled: true, // for prototype purposes
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            mfa: cognito.Mfa.OFF,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        this.preSignUpFn = new lambda.Function(this, "PreSignUpTrigger", {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(
                path.resolve(__dirname, "../../../lambdas/dist")
            ),
            handler: "triggers/preSignUp.handler",
        });

        this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, this.preSignUpFn);

        this.userPoolClient = this.userPool.addClient("MobileClient", {
            authFlows: {
                userSrp: false,
                userPassword: false,
                custom: false,
                adminUserPassword: false,
                user: true,
            },
            preventUserExistenceErrors: true,
            generateSecret: false,
        });

        new cdk.CfnOutput(this, "CognitoUserPoolId", {
            value: this.userPool.userPoolId,
        });

        new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
            value: this.userPoolClient.userPoolClientId,
        });
    }
}