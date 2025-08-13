import express from "express";
import { verifyToken } from "../middleware/authMiddleware.js";

import {
  getUserProfile,
  getUsers,
  registerUser,
  updatePassword,
  userLogin,
} from "../controllers/userAuthentication.js";

const router3 = express.Router();

// === GET USERDATA ROUTE ===
router3.get("/users", getUsers);

router3.get("/users/profile", verifyToken, getUserProfile);

// === REGISTER ROUTE ===
router3.post("/register", registerUser);

// === LOGIN ROUTE ===
router3.post("/login", userLogin);

// === LOGOUT ROUTE ===
router3.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });

  return res.status(200).json({ message: "Logged out successfully." });
});

// update password
router3.put("/update-password", updatePassword);

export default router3;
