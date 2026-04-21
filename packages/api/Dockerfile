# syntax=docker/dockerfile:1.7

FROM public.ecr.aws/lambda/nodejs:20 AS builder

WORKDIR /build

# Workspace package.jsons first so npm ci can resolve the graph
COPY package.json package-lock.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/db/package.json packages/db/
COPY packages/api/package.json packages/api/
COPY packages/lambdas/package.json packages/lambdas/
COPY packages/infra/package.json packages/infra/
COPY apps/mobile/package.json apps/mobile/

RUN npm ci --ignore-scripts

COPY packages/shared-types/ packages/shared-types/
COPY packages/db/ packages/db/
COPY packages/api/ packages/api/

RUN npm run build --workspace=@app/shared-types
RUN npx prisma generate --schema packages/db/prisma/schema.prisma
RUN npm run build --workspace=@app/db
RUN npm run build --workspace=@app/api
RUN npm prune --production


FROM public.ecr.aws/lambda/nodejs:20 AS runtime

# Lambda Web Adapter — turns the Lambda runtime into an HTTP bridge for Express
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 \
    /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8080 \
    AWS_LWA_PORT=8080 \
    NODE_ENV=production

WORKDIR /var/task

COPY --from=builder /build/package.json ./
COPY --from=builder /build/package-lock.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /build/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder /build/packages/db/dist ./packages/db/dist
COPY --from=builder /build/packages/db/generated ./packages/db/generated
COPY --from=builder /build/packages/db/package.json ./packages/db/package.json
COPY --from=builder /build/packages/api/dist ./packages/api/dist
COPY --from=builder /build/packages/api/package.json ./packages/api/package.json

ENTRYPOINT []
CMD ["node", "packages/api/dist/index.js"]