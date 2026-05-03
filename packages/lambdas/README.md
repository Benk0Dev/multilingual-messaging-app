# Lambdas

Standalone Lambda handlers for WebSocket routes (connect, disconnect,
ping) and the Cognito pre-sign-up trigger. Deployed by `@app/infra`.

## Build

```
npm install
npm run build      # tsc, emits to dist/
npm run watch      # tsc --watch
```