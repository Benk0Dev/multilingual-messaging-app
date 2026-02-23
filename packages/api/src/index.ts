
import "dotenv/config";
import express from "express";
import routes from "./routes";
import { requireAuth } from "./middleware/auth";

const app = express();
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.use("/api", requireAuth, routes);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});