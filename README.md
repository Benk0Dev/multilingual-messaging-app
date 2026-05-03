# Multilingual Messaging App

A real-time messaging app built around automatic message translation.
The mobile app is called **Lingua**.

Each user picks a preferred language. When someone sends a message, the
backend translates it into every recipient's preferred language and
delivers both versions over WebSockets. The recipient sees the
translation as the main message, with the original shown above it as
subtext.

This is a final-year project for BSc Computer Science at Queen Mary
University of London.

## What's in here

This is an npm-workspace monorepo.

```
multilingual-messaging-app/
├── apps/
│   └── mobile/             Expo Router (React Native) app - Lingua client
├── packages/
│   ├── api/			    Express backend, runs locally and on Lambda
│   ├── db/				    Prisma schema, migrations, generated client
│   ├── infra/			    AWS CDK stacks (Cognito, API, WebSockets, S3)
│   ├── lambdas/		    WebSocket route handlers + Cognito triggers
│   └── shared-types/	    TypeScript models, Zod schemas, language enum
└── evaluation/			    Translation quality benchmarks (Python)
```

Each package has its own `README.md` with setup and run instructions.

## Architecture in one paragraph

The mobile app talks to two AWS endpoints: an HTTP API for normal
request/response (REST over Lambda + Express) and a WebSocket API for
real-time push (message events, receipts, chat creation). Authentication
is email-OTP via Cognito. Messages are encrypted at rest in Postgres
(AES-256-GCM) and translated using Google Cloud Translation LLM.

## Running locally

You'll need both pieces running side by side:

1. **Backend** - see [`packages/api/README.md`](packages/api/README.md).
   Listens on `http://localhost:3001`.
2. **Mobile** - see [`apps/mobile/README.md`](apps/mobile/README.md).
   Run with `npm run dev` for the local API, `npm run prod` for the
   deployed one (in which case you do not need to run the backend).

The database lives on Neon (managed Postgres). For deployment to AWS,
see [`packages/infra/README.md`](packages/infra/README.md).

## Tech stack

- **Mobile:** React Native (Expo), Zustand, TypeScript
- **Backend:** Node.js, Express, Prisma, TypeScript
- **Infra:** AWS Lambda, API Gateway (HTTP + WebSocket), Cognito,
  DynamoDB, S3, Secrets Manager - provisioned with CDK
- **Database:** Postgres (Neon)
- **Translation:** Google Cloud Translation LLM
- **Evaluation:** Python, sacrebleu, FLORES-200

## Repository layout details

The workspaces are wired through the root `package.json`. Each package
builds independently with its own `tsconfig.json`.