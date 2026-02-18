
import "dotenv/config";
import express from "express";
import routes from "./routes";

const app = express();
app.use(express.json());

app.use("/api", routes);

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});