import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

let loaded = false;

export async function loadConfig(): Promise<void> {
    if (loaded) return;

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    if (isLambda) {
        const secretArn = process.env.APP_SECRET_ARN;
        if (!secretArn) {
            throw new Error("APP_SECRET_ARN is missing on Lambda");
        }

        const client = new SecretsManagerClient({});
        const response = await client.send(
            new GetSecretValueCommand({ SecretId: secretArn })
        );

        if (!response.SecretString) {
            throw new Error("Secret has no SecretString payload");
        }

        const parsed = JSON.parse(response.SecretString) as Record<string, string>;
        for (const [key, value] of Object.entries(parsed)) {
            if (process.env[key] === undefined) {
                process.env[key] = value;
            }
        }
    }

    loaded = true;
}