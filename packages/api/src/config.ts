import {
    SecretsManagerClient,
    GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const KV_SECRET_ARN_ENV_VARS = [
    "APP_SECRET_ARN",
    "MESSAGE_ENCRYPTION_SECRET_ARN",
] as const;

const GOOGLE_CREDENTIALS_SECRET_ARN_ENV_VAR = "GOOGLE_CREDENTIALS_SECRET_ARN";
const GOOGLE_CREDENTIALS_FILE_PATH = path.join(tmpdir(), "google-credentials.json");

let loaded = false;

export async function loadConfig(): Promise<void> {
    if (loaded) return;

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

    if (isLambda) {
        const client = new SecretsManagerClient({});

        const kvPayloads = await Promise.all(
            KV_SECRET_ARN_ENV_VARS.map(async (name) => {
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

        for (const parsed of kvPayloads) {
            for (const [key, value] of Object.entries(parsed)) {
                if (process.env[key] === undefined) {
                    process.env[key] = value;
                }
            }
        }

        const googleArn = process.env[GOOGLE_CREDENTIALS_SECRET_ARN_ENV_VAR];
        if (!googleArn) {
            throw new Error(`${GOOGLE_CREDENTIALS_SECRET_ARN_ENV_VAR} is missing on Lambda`);
        }
        const googleRes = await client.send(
            new GetSecretValueCommand({ SecretId: googleArn })
        );
        if (!googleRes.SecretString) {
            throw new Error(`Secret ${GOOGLE_CREDENTIALS_SECRET_ARN_ENV_VAR} has no SecretString payload`);
        }
        await writeFile(GOOGLE_CREDENTIALS_FILE_PATH, googleRes.SecretString, { mode: 0o600 });
        process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_CREDENTIALS_FILE_PATH;
    }

    loaded = true;
}