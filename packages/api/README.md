# API

Express backend. The same code runs in two places: locally for
development, and on AWS Lambda (behind API Gateway) in production.

## Prerequisites

### Google Cloud (for translation)

The API uses Google Cloud Translation LLM for message translation. Before
running locally, you need access to a Google Cloud project with the Translation
API enabled:

1. Create (or reuse) a project in the [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Cloud Translation API** for that project
3. Note the project ID from the top bar

For local development, authenticate using the gcloud CLI (no service account
key required):

```
brew install --cask google-cloud-sdk    # macOS; see GCP docs for other platforms
gcloud auth application-default login
gcloud config set project <your-project-id>
gcloud auth application-default set-quota-project <your-project-id>
```

This writes credentials to `~/.config/gcloud/application_default_credentials.json`,
which the Google SDK picks up automatically.

## Run locally

Create `.env` in this folder with the required variables, then:

```
npm run build
npm run dev
```

Listens on `http://localhost:3001`.

### `.env` contents

```
DATABASE_URL=postgresql://...
COGNITO_USER_POOL_ID=...
COGNITO_USER_POOL_CLIENT_ID=...
AWS_REGION=eu-west-2
S3_BUCKET=...
WEBSOCKET_URL=wss://...
WEBSOCKET_CONNECTIONS_TABLE=ws-connections
MESSAGE_ENCRYPTION_SEED=...
GOOGLE_CLOUD_PROJECT_ID=<your-gcp-project-id>
```

`GOOGLE_APPLICATION_CREDENTIALS` is not set locally - the gcloud CLI handles
authentication via the file it writes to `~/.config/gcloud`.

## Deploy

The production API runs as a Docker-image Lambda defined in
`packages/infra/lib/stacks/api-stack.ts`. To ship changes:

```
cd ../infra
npx cdk deploy
```

CDK builds the Docker image from this package, pushes it to ECR, and updates
the Lambda. The Google service account credentials are loaded from Secrets
Manager at cold start - see the infra stack for details.