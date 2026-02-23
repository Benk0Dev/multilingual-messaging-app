import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class AuthStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, "UserPool", {
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

        const preSignUpFn = new lambda.Function(this, "PreSignUpTrigger", {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(
                path.resolve(__dirname, "../../../lambdas/dist")
            ),
            handler: "triggers/preSignUp.handler",
        });

        userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpFn);

        const userPoolClient = userPool.addClient("MobileClient", {
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
        value: userPool.userPoolId,
        });

        new cdk.CfnOutput(this, "CognitoUserPoolClientId", {
        value: userPoolClient.userPoolClientId,
        });
    }
}