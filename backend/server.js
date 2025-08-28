// server.js
import express from "express";
import cors from "cors";
import { connectToDB } from "../backend/config/db.js";
import router from "./routes/fileUploadRoute.js";
import router2 from "./routes/clients.js";
import router3 from "./routes/userLogin.js";
import router4 from "./routes/verifyRoute.js";
import { fileURLToPath } from "url";
import path from "path";
import cookieParser from "cookie-parser";

connectToDB();

const app = express();
const PORT = 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ CORS setup
app.use(
  cors({
    origin: "http://localhost:5173", // frontend origin
    credentials: true,
  })
);

// ✅ Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Routes
app.use("/api/clients", router); // fileUploadRoute
app.use("/api/clients", router2); // clients
app.use("/api/clients", router3); // userLogin
app.use("/api/clients", router4); // verifyRoute

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ✅ Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
