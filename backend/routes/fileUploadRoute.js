// routes/clientRoute.js
import express from "express";
import multer from "multer";

import { fileUpload } from "../controllers/fileUpload.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/upload", upload.single("file"), fileUpload);

export default router;
