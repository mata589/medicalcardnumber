import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sql, connectToDB } from "../config/db.js";

export const getUsers = async (req, res) => {
  try {
    const pool = await connectToDB(); // Get DB connection pool
    const result = await pool.request().query("SELECT email, role FROM Users");

    res.status(200).json(result.recordset); // recordset contains rows
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userEmail = req.user.email;

    if (!userEmail) {
      return res.status(400).json({ error: "User email not found in token" });
    }

    const pool = await connectToDB();
    const request = pool.request();
    request.input("email", userEmail);

    const result = await request.query(
      "SELECT email, role FROM users WHERE email = @email"
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(result.recordset[0]);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const registerUser = async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "All fields are required: email, password, role." });
  }

  try {
    const pool = await connectToDB();

    // Check if email already exists
    const existingUser = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ error: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashedPassword)
      .input("role", sql.NVarChar, role)
      .query(
        "INSERT INTO Users (email, password, role) VALUES (@email, @password, @role)"
      );

    res.status(201).json({ message: "User registered successfully." });
  } catch (error) {
    console.error("Register Error:", error.message);
    res.status(500).json({ error: "Server error during registration." });
  }
};

export const userLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const pool = await connectToDB();

    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || "your_jwt_secret", // replace with env var
      { expiresIn: "1h" }
    );

    // Optional: Set token as cookie (if using cookies)
    res.cookie("token", token, {
      httpOnly: true,
      secure: false, // ❌ DO NOT USE true in localhost
      sameSite: "Lax", // or "None" if using cross-origin with HTTPS
      maxAge: 3600000,
    });

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login Error:", error.message);
    res.status(500).json({ error: "Server error during login." });
  }
};

export const updatePassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res
      .status(400)
      .json({ error: "Email and new password are required" });
  }

  try {
    const pool = await connectToDB();

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in DB
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, hashedPassword)
      .query("UPDATE Users SET password = @password WHERE email = @email");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
