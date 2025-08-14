// db.js
import sql from "mssql";

const config = {
  user: "medicalapp_user",             // database user
  password: "medicalapp_user",         // password for that user
  server: "10.9.0.130\\NAVDEMO",                // SQL Server IP
  database: "MedicalAppDB",            // your database name
  port: 1433,                           // default SQL Server port
  options: {
    encrypt: false,                    // true if using Azure
    trustServerCertificate: true,      // allow self-signed certs / local dev
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
