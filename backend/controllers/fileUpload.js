import xlsx from "xlsx";
import { sql, connectToDB } from "../config/db.js";
import { parse } from "date-fns";

// Helper: Convert Excel serial to JS Date
const excelDateToJSDate = (serial) => {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(
    Date.UTC(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate())
  );
};

export const fileUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const invalidRows = [];
    const validatedRows = jsonData.map((row, index) => {
      const missingFields = [];
      const invalidFields = [];

      const scheme = String(row["SCHEME NAME"] || "").trim();
      const principalName = String(row["Principal Name"] || "").trim();
      const memberName = String(row["Member Name"] || "").trim();
      const relationship = String(row["RELATIONSHIP"] || "").trim();
      const gender = String(row["Gender"] || "").trim();
      const phone_number = String(row["Phone Number"] || "").trim();
      const email_address = String(row["Email Address"] || "").trim();
      const rawDOB = row["Date Of Birth"];

      if (!scheme) missingFields.push("SCHEME NAME");
      if (!principalName) missingFields.push("Principal Name");
      if (!memberName) missingFields.push("Member Name");
      if (!relationship) missingFields.push("RELATIONSHIP");
      if (!gender) missingFields.push("Gender");
      if (!email_address) missingFields.push("Email Address");

      // Validate Date of Birth
      let dateOfBirth = null;
      if (typeof rawDOB === "number") {
        dateOfBirth = excelDateToJSDate(rawDOB);
      } else if (typeof rawDOB === "string") {
        const parsed = parse(rawDOB, "d/M/yyyy", new Date());
        if (!isNaN(parsed)) {
          dateOfBirth = new Date(
            Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
          );
        } else {
          invalidFields.push("Date Of Birth (Invalid format)");
        }
      }

      if (!dateOfBirth || isNaN(dateOfBirth.getTime())) {
        missingFields.push("Date Of Birth");
      }

      // Validate phone number (256XXXXXXXXX)
      const phoneRegex = /^256\d{9}$/;
      if (phone_number && !phoneRegex.test(phone_number)) {
        invalidFields.push(
          "Phone Number (Must be 12 digits starting with 256)"
        );
      }

      // Validate email address
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email_address && !emailRegex.test(email_address)) {
        invalidFields.push("Email Address (Invalid format)");
      }

      if (missingFields.length > 0 || invalidFields.length > 0) {
        invalidRows.push(
          `Row ${index + 2}: ${
            missingFields.length ? `Missing: ${missingFields.join(", ")}` : ""
          }${missingFields.length && invalidFields.length ? " | " : ""}${
            invalidFields.length ? `Invalid: ${invalidFields.join(", ")}` : ""
          }`
        );
      }

      return {
        scheme,
        principalName,
        memberName,
        relationship,
        gender,
        phone_number,
        email_address,
        dateOfBirth,
      };
    });

    if (invalidRows.length > 0) {
      return res.status(400).json({
        error: "Missing or invalid fields found in some rows",
        invalidRows,
      });
    }

    const pool = await connectToDB();
    let insertedCount = 0;

    for (const row of validatedRows) {
      const {
        scheme,
        principalName,
        memberName,
        relationship,
        gender,
        phone_number,
        email_address,
        dateOfBirth,
      } = row;

      // Check if principal already exists
      const existing = await pool
        .request()
        .input("principal_name", sql.NVarChar, principalName)
        .query(
          "SELECT principal_id, phone_number FROM Principals WHERE principal_name = @principal_name"
        );

      let principalId, principalPhone;

      if (existing.recordset.length === 0) {
        await pool
          .request()
          .input("scheme_name", sql.NVarChar, scheme)
          .input("principal_name", sql.NVarChar, principalName)
          .input("gender", sql.NVarChar, gender)
          .input("phone_number", sql.NVarChar, phone_number)
          .input("email_address", sql.NVarChar, email_address)
          .input("date_of_birth", sql.Date, dateOfBirth)
          .query(
            `INSERT INTO Principals (scheme_name, principal_name, gender, date_of_birth, phone_number, email_address)
             VALUES (@scheme_name, @principal_name, @gender, @date_of_birth, @phone_number, @email_address)`
          );

        const result = await pool
          .request()
          .input("principal_name", sql.NVarChar, principalName)
          .query(
            "SELECT principal_id, phone_number FROM Principals WHERE principal_name = @principal_name"
          );

        principalId = result.recordset[0].principal_id;
        principalPhone = result.recordset[0].phone_number;
      } else {
        principalId = existing.recordset[0].principal_id;
        principalPhone = existing.recordset[0].phone_number;
      }

      // Skip if principal is also the member
      if (principalName.toLowerCase() === memberName.toLowerCase()) continue;

      // Use principal's phone if member's is missing
      const finalMemberPhone =
        phone_number && phone_number.trim() !== ""
          ? phone_number
          : principalPhone;

      const seqResult = await pool
        .request()
        .input("principal_id", sql.NVarChar, principalId)
        .query(
          "SELECT ISNULL(MAX(member_seq), 0) + 1 AS next_seq FROM Members WHERE principal_id = @principal_id"
        );

      const memberSeq = seqResult.recordset[0].next_seq;

      await pool
        .request()
        .input("member_seq", sql.Int, memberSeq)
        .input("principal_id", sql.NVarChar, principalId)
        .input("member_name", sql.NVarChar, memberName)
        .input("relationship", sql.NVarChar, relationship)
        .input("gender", sql.NVarChar, gender)
        .input("phone_number", sql.NVarChar, finalMemberPhone)
        .input("email_address", sql.NVarChar, email_address)
        .input("date_of_birth", sql.Date, dateOfBirth)
        .query(
          `INSERT INTO Members (member_seq, principal_id, member_name, relationship, gender, date_of_birth, phone_number, email_address)
           VALUES (@member_seq, @principal_id, @member_name, @relationship, @gender, @date_of_birth, @phone_number, @email_address)`
        );

      insertedCount++;
    }

    res.status(200).json({
      message: `✅ Upload complete: ${insertedCount} members inserted.`,
    });
  } catch (err) {
    console.error("❌ Upload error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
