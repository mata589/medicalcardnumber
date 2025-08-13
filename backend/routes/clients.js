import express from "express";

import { addClient, getUserData } from "../controllers/userUpload.js";

const router2 = express.Router();

router2.get("/get-data", getUserData);

router2.post("/add-client", addClient);

export default router2;
