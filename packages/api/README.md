# API

Express backend for Lingua. The same code runs in two places: locally for
development, and on AWS Lambda (behind API Gateway) in production.

## Run locally

Create `.env` in this folder with the required variables, then:

```
npm run build
npm run dev
```

Listens on `http://localhost:3001`.

## Deploy

The production API runs as a Docker-image Lambda defined in
`packages/infra/lib/stacks/api-stack.ts`. To ship changes:

```
cd ../infra
npx cdk deploy
```

CDK builds the Docker image from this package, pushes it to ECR, and updates
the Lambda.