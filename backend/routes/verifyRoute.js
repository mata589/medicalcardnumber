import express from "express";
import jwt from "jsonwebtoken";

const router4 = express.Router();

router4.get("/verify", (req, res) => {
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .json({ verified: false, error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    );
    return res.status(200).json({
      verified: true,
      user: decoded,
    });
  } catch (err) {
    return res
      .status(403)
      .json({ verified: false, error: "Invalid or expired token." });
  }
});

export default router4;
