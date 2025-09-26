// db.js
import sql from "mssql";

const config = {
  user: "medicalapp_user",
  password: "medicalapp_user",
  server: "10.9.0.130\\NAVDEMO", // Server name or IP
  database: "MedicalAppDB",
  port: 1433,
  options: {
    encrypt: false, // Use true if connecting to Azure
    trustServerCertificate: true, // Use for self-signed certs or local dev
  },
};

let pool;

export const connectToDB = async () => {
  try {
    pool = await sql.connect(config);
    console.log("✅ Connected to SQL Server successfully.");
    return pool;
  } catch (err) {
    console.error("❌ Connection Failed:", err.message);
    throw err;
  }
};

export { sql, pool };
