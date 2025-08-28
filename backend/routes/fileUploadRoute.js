// routes/clientRoute.js
import express from "express";
import multer from "multer";
import { fileUpload } from "../controllers/fileUpload.js";
import { verifyToken as authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multer setup: memory storage, file size & type validation
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      return cb(new Error("Only Excel files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Route: /upload
router.post(
  "/upload",
  authMiddleware, // attach user info
  upload.single("file"), // handle single file upload
  async (req, res, next) => {
    try {
      await fileUpload(req, res); // delegate to controller
    } catch (err) {
      next(err); // pass error to express error middleware
    }
  }
);

export default router;
