// controllers/userController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql, connectToDB } from "../config/db.js";

// Replace the logUserActivity function with this:
const logUserActivity = async (
  pool,
  actionBy,
  actionOn,
  actionType,
  status
) => {
  try {
    await pool
      .request()
      .input("action", sql.NVarChar, actionType)
      .input("performed_by", sql.NVarChar, actionBy)
      .input("target_user", sql.NVarChar, actionOn)
      .input("status", sql.NVarChar, status)
      .input("timestamp", sql.DateTime, new Date())
      .query(
        `INSERT INTO UserActivityLogs (action, performed_by, target_user, status, timestamp)
         VALUES (@action, @performed_by, @target_user, @status, @timestamp)`
      );
  } catch (err) {
    console.error("Failed to log user activity:", err.message);
  }
};

// ✅ GET all users (admin only)
export const getUsers = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool
      .request()
      .query("SELECT id, email, role FROM Users");

    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ GET logged-in user profile
export const getUserProfile = async (req, res) => {
  try {
    const userEmail = req.user?.email;
    if (!userEmail)
      return res.status(400).json({ error: "User email not found in token" });

    const pool = await connectToDB();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, userEmail)
      .query("SELECT id, email, role FROM Users WHERE email = @email");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "User not found" });

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ REGISTER new user
// ✅ REGISTER new user
export const registerUser = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    console.log("❌ Missing fields:", {
      email: !!email,
      password: !!password,
      role: !!role,
    });
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    console.log("🔗 Attempting database connection...");
    const pool = await connectToDB();

    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      await logUserActivity(pool, "System", email, "REGISTER", "FAILED");
      return res.status(409).json({ error: "Email already exists." });
    }

    console.log("🔐 Hashing password...");
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, role)
      .query(
        "INSERT INTO Users (email, password, role) VALUES (@email, @password, @role)"
      );

    console.log(
      "✅ User inserted successfully, rows affected:",
      insertResult.rowsAffected[0]
    );

    await logUserActivity(pool, "System", email, "REGISTER", "SUCCESS");
    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Error message:", error.message);

    res.status(500).json({
      error: "Server error during registration.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ✅ USER login
export const userLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  try {
    const pool = await connectToDB();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      await logUserActivity(pool, email, email, "LOGIN", "FAILED");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logUserActivity(pool, email, email, "LOGIN", "FAILED");
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: "1h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
      maxAge: 3600000,
    });

    await logUserActivity(pool, email, email, "LOGIN", "SUCCESS");
    res.status(200).json({
      message: "Login successful",
      user: { id: user.id, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error during login." });
  }
};

// ✅ UPDATE password
export const updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword)
    return res
      .status(400)
      .json({ error: "Email and new password are required" });

  try {
    const pool = await connectToDB();
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .query("UPDATE Users SET password = @password WHERE email = @email");

    if (result.rowsAffected[0] === 0) {
      await logUserActivity(
        pool,
        req.user?.email || "System",
        email,
        "PASSWORD_UPDATE",
        "FAILED"
      );
      return res.status(404).json({ error: "User not found" });
    }

    await logUserActivity(
      pool,
      req.user?.email || "System",
      email,
      "PASSWORD_UPDATE",
      "SUCCESS"
    );
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ USER logout
export const logoutUser = async (req, res) => {
  const userEmail = req.user?.email;
  try {
    const pool = await connectToDB();

    // Clear token cookie
    res.clearCookie("token", {
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    });

    // Log logout success
    if (userEmail) {
      await logUserActivity(pool, userEmail, userEmail, "LOGOUT", "SUCCESS");
    }

    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    // Log logout failure
    if (userEmail) {
      const pool = await connectToDB();
      await logUserActivity(pool, userEmail, userEmail, "LOGOUT", "FAILED");
    }

    res.status(500).json({ error: "Logout failed." });
  }
};
