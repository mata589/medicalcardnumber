// db.js
import sql from "mssql";

const config = {
  user: "sa",
  password: "Kellnowah256.?",
  server: "IL-22-A8N9", // Server name or IP
  database: "test3",
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
