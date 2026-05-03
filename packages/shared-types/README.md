# Shared types

TypeScript models, Zod request/response schemas, and the supported-language
enum. Consumed by every other workspace package so the mobile app and
backend share one source of truth.

## Build

```
npm install
npm run build      # tsc, emits to dist/
npm run watch      # tsc --watch
```