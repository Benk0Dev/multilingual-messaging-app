# Infra

AWS CDK infrastructure. Defines the production environment: API
Lambda, WebSocket API, Cognito user pool, DynamoDB for WebSocket connections,
and S3 for profile pictures.

## Prerequisites

### Local tooling

- **Node.js 20+** and npm
- **AWS CDK** is installed as a workspace dependency (`npx cdk` from this folder)
- **AWS CLI** with credentials configured. Run `aws configure` or use SSO:
    ```
    aws sso login --profile <your-profile>
    export AWS_PROFILE=<your-profile>
    ```
    Verify with `aws sts get-caller-identity` - you should see your account ID.
- **Docker** running locally. CDK builds the API Lambda as a Docker image and
    pushes it to ECR, so the Docker daemon must be available during `cdk deploy`.

### AWS account setup

- The account must be **CDK-bootstrapped** for the target region. First time
    only:
    ```
    npx cdk bootstrap aws://<account-id>/eu-west-2
    ```
- Default region is `eu-west-2` (London). Override with `CDK_DEFAULT_REGION`
    if needed.

### Database (Neon Postgres)

The API connects to a managed Postgres instance hosted on Neon. Before first
deploy:

1. Create a Neon project at [neon.tech](https://neon.tech)
2. Copy the connection string (should look like
     `postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`)
3. This gets pasted into AWS Secrets Manager after the first deploy - see
     [Post-deploy: populate secrets](#post-deploy-populate-secrets) below.

Run migrations from `packages/db`:

```
cd packages/db
npx prisma migrate deploy
```

### Google Cloud (for translation)

The API uses Google Cloud Translation LLM model for message translation.

1. Create (or reuse) a project in the [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Cloud Translation API** for that project
3. Link a billing account ($300 free trial covers student-scale usage)

**For local development:** authenticate using gcloud CLI - no service account
key required:

​```
brew install --cask google-cloud-sdk
gcloud auth application-default login
gcloud config set project <your-project-id>
gcloud auth application-default set-quota-project <your-project-id>
​```

**For production (AWS Lambda):** you need a service account JSON key, because
Lambda can't run `gcloud auth`. Create one at **IAM & Admin** → **Service
Accounts** → **Create Service Account**:
    - Name: `lingua-translate-sa`
    - Role: **Cloud Translation API User**
    - Keys tab → **Add Key** → **Create new key** → **JSON**

## Deploy

Set the Google Cloud project ID as an environment variable (it's not secret,
but it needs to reach CDK at synth time):

```
export GOOGLE_CLOUD_PROJECT_ID=<your-gcp-project-id>
```

Then:

```
npm run build
npx cdk deploy
```

First deploy takes 5-10 minutes because of the Docker image build and ECR
push. Subsequent deploys are faster if the API code hasn't changed.

## Post-deploy: populate secrets

CDK creates three secrets with placeholder values. After the first deploy,
paste the real values in via the AWS console:

### 1. `app/runtime` - database connection

- AWS Console → **Secrets Manager** → `app/runtime`
- **Retrieve secret value** → **Edit** → **Plaintext**
- Replace the placeholder with:
    ```json
    {
        "DATABASE_URL": "postgresql://user:pass@ep-xxx.eu-west-2.aws.neon.tech/neondb?sslmode=require"
    }
    ```
- Save.

### 2. `app/google-credentials` - Google service account

- AWS Console → **Secrets Manager** → `app/google-credentials`
- **Retrieve secret value** → **Edit** → **Plaintext**
- Delete the placeholder.
- Paste the **entire contents** of the Google service account JSON file you
    downloaded earlier (including the multi-line `private_key` field with
    `-----BEGIN PRIVATE KEY-----`).
- Save.

### 3. `app/message-encryption-key` - auto-generated

This one is populated automatically by CDK during deploy. No action needed.
Just don't rotate it casually - rotating invalidates every encrypted message
in the database.

### Trigger Lambda to pick up the new values

The API Lambda reads secrets only on cold start. After updating secrets, the
next cold start picks up the new values. You can force one by redeploying, or
just wait a few minutes between invocations for the existing container to
recycle.

## Stack structure

| Stack | Purpose |
|-------|---------|
| `Auth` | Cognito User Pool with email OTP sign-in and a pre-sign-up trigger for auto-confirmation |
| `WebSocket` | WebSocket API Gateway, DynamoDB table for connection tracking, connect/disconnect/ping Lambdas |
| `Storage` | S3 bucket for public-read profile pictures |
| `Api` | Main HTTP API backed by a Docker-image Lambda, wired to all other stacks |

## Useful commands

- `npm run build` - compile TypeScript
- `npx cdk deploy` - deploy all stacks
- `npx cdk diff` - preview changes before deploy
- `npx cdk destroy` - tear down the whole stack (destroys all data!)
- `npx cdk synth` - emit synthesized CloudFormation template

## Tearing down

```
npx cdk destroy
```

Removes all AWS resources. **This does not touch Neon Postgres or Google Cloud**
- those are external services and need to be cleaned up manually if you're
done with the project.