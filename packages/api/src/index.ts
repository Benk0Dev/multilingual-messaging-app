import "dotenv/config";
import { loadConfig } from "./config.js";

async function main() {
    await loadConfig();

    const express = require("express");
    const routes = require("./routes").default;
    const { requireAuth } = require("./middleware/auth");

    const app = express();
    app.use(express.json());

    app.get("/api/health", (_req: unknown, res: any) => {
        res.status(200).json({ ok: true });
    });

    app.use("/api", requireAuth, routes);

    const port = Number(process.env.PORT || 3001);
    app.listen(port, () => {
        console.log(`API listening on http://localhost:${port}`);
    });
}

main().catch((err) => {
    console.error("Failed to start API", err);
    process.exit(1);
});