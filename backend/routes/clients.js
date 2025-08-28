import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import { addClient, getUserData } from "../controllers/userUpload.js";

const router2 = express.Router();

router2.get("/get-data", getUserData);

router2.post("/add-client", verifyToken, addClient);

export default router2;
