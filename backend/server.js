import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { connectToDB } from "../backend/config/db.js";
import router from "./routes/fileUploadRoute.js";
import router2 from "./routes/clients.js";
import router3 from "./routes/userLogin.js";
import router4 from "./routes/verifyRoute.js";
// import { fileURLToPath } from "url";
import open from "open";
import cookieParser from "cookie-parser";
//import path from "path";

connectToDB();

const app = express();
const PORT = 5173;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend/dist")));
// app.use(
//   cors({
//     origin: "http://localhost:5173", // your frontend origin
//     credentials: true, // allow cookies
//   })
// );

app.use(express.json());
app.use(cookieParser());

// API routes
app.use("/api/clients", router);
app.use("/api/clients", router2);
app.use("/api/clients", router3);
app.use("/api/clients", router4);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html")); // for Vite
  // res.sendFile(path.join(__dirname, "../client/build/index.html")); // for CRA
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
