# Mobile app

## Config

Create `src/config.dev.ts` and `src/config.prod.ts` using the templates below.

### `src/config.dev.ts`

```typescript
export const BASE_URL = "http://<your-lan-ip>:3001";
export const WEBSOCKET_URL = "wss://...";
export const COGNITO_REGION = "eu-west-2";
export const COGNITO_USER_POOL_CLIENT_ID = "...";
```

### `src/config.prod.ts`

```typescript
export const BASE_URL = "https://...execute-api...amazonaws.com";
export const WEBSOCKET_URL = "wss://...";
export const COGNITO_REGION = "eu-west-2";
export const COGNITO_USER_POOL_CLIENT_ID = "...";
```

## Run

```
npm run dev    # local API
npm run prod   # deployed API
```