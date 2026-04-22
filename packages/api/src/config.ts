import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRET_ARN_ENV_VARS = [
    "APP_SECRET_ARN",
    "MESSAGE_ENCRYPTION_SECRET_ARN",
] as const;

let loaded = false;

export async function loadConfig(): Promise<void> {
    if (loaded) return;

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    if (isLambda) {
        const client = new SecretsManagerClient({});

        const payloads = await Promise.all(
            SECRET_ARN_ENV_VARS.map(async (name) => {
                const arn = process.env[name];
                if (!arn) {
                    throw new Error(`${name} is missing on Lambda`);
                }
                const res = await client.send(
                    new GetSecretValueCommand({ SecretId: arn })
                );
                if (!res.SecretString) {
                    throw new Error(`Secret ${name} has no SecretString payload`);
                }
                return JSON.parse(res.SecretString) as Record<string, string>;
            })
        );

        for (const parsed of payloads) {
            for (const [key, value] of Object.entries(parsed)) {
                if (process.env[key] === undefined) {
                    process.env[key] = value;
                }
            }
        }
    }

    loaded = true;
}