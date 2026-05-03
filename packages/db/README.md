# DB

Prisma schema and migrations for the Postgres database. Consumed by
`@app/api` as a workspace dependency.

## Setup

Create `.env` in this folder:

```
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require
```

Then:

```
npm install
npm run generate         # generate the Prisma client
```

## Migrations

```
# create and apply a new migration locally
npm run migrate:dev -- --name <migration_name>

 # apply pending migrations (use in production)
npm run migrate:deploy                           
```