// controllers/fileUpload.js
import xlsx from "xlsx";
import { sql, connectToDB } from "../config/db.js";
import { parse } from "date-fns";

const excelDateToJSDate = (serial) => {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);
  return new Date(
    Date.UTC(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate())
  );
};

export const fileUpload = async (req, res) => {
  let pool;

  try {
    if (!req.file) {
      pool = await connectToDB();
      await pool
        .request()
        .input("uploaded_by", sql.NVarChar, req.user?.email || "Guest")
        .input("file_name", sql.NVarChar, "No File")
        .input("status", sql.NVarChar, "FAILED")
        .query(
          "INSERT INTO FileUploadLogs (uploaded_by, file_name, status) VALUES (@uploaded_by, @file_name, @status)"
        );

      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(sheet);

    if (jsonData.length === 0) {
      pool = await connectToDB();
      await pool
        .request()
        .input("uploaded_by", sql.NVarChar, req.user?.email || "Guest")
        .input("file_name", sql.NVarChar, req.file.originalname)
        .input("status", sql.NVarChar, "FAILED")
        .query(
          "INSERT INTO FileUploadLogs (uploaded_by, file_name, status) VALUES (@uploaded_by, @file_name, @status)"
        );

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
      if (!phone_number) missingFields.push("Phone Number");

      let dateOfBirth = null;
      if (typeof rawDOB === "number") {
        dateOfBirth = excelDateToJSDate(rawDOB);
      } else if (typeof rawDOB === "string") {
        const parsed = parse(rawDOB, "d/M/yyyy", new Date());
        if (!isNaN(parsed)) {
          dateOfBirth = new Date(
            Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
          );
        } else invalidFields.push("Date Of Birth (Invalid format)");
      }

      if (!dateOfBirth || isNaN(dateOfBirth.getTime()))
        missingFields.push("Date Of Birth");

      const phoneRegex = /^256\d{9}$/;
      if (phone_number && !phoneRegex.test(phone_number))
        invalidFields.push("Phone Number (Invalid format)");

      if (missingFields.length > 0 || invalidFields.length > 0)
        invalidRows.push(`Row ${index + 2}: Validation failed`);

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
      pool = await connectToDB();
      await pool
        .request()
        .input("uploaded_by", sql.NVarChar, req.user?.email || "Guest")
        .input("file_name", sql.NVarChar, req.file.originalname)
        .input("status", sql.NVarChar, "FAILED")
        .query(
          "INSERT INTO FileUploadLogs (uploaded_by, file_name, status) VALUES (@uploaded_by, @file_name, @status)"
        );

      return res
        .status(400)
        .json({ error: "Missing or invalid fields", invalidRows });
    }

    pool = await connectToDB();
    let insertedCount = 0;
    const duplicateEntries = [];

    for (const [index, row] of validatedRows.entries()) {
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

      // Check if principal already exists by name (regardless of phone number)
      const existingPrincipal = await pool
        .request()
        .input("principal_name", sql.NVarChar, principalName)
        .query(
          "SELECT principal_id, phone_number FROM Principals WHERE principal_name = @principal_name"
        );

      let principalId, principalPhone;

      if (existingPrincipal.recordset.length === 0) {
        // Create new principal
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
        // Use existing principal (even if phone number is different)
        principalId = existingPrincipal.recordset[0].principal_id;
        principalPhone = existingPrincipal.recordset[0].phone_number;

        // Log that we're using existing principal with potentially different phone
        if (existingPrincipal.recordset[0].phone_number !== phone_number) {
          duplicateEntries.push(
            `Row ${
              index + 2
            }: Using existing principal "${principalName}" with different phone number`
          );
        }
      }

      // Skip if member name is same as principal name
      if (principalName.toLowerCase() === memberName.toLowerCase()) {
        duplicateEntries.push(
          `Row ${index + 2}: Skipped - Member name same as principal name`
        );
        continue;
      }

      // Check if member already exists for this principal
      const existingMember = await pool
        .request()
        .input("principal_id", sql.NVarChar, principalId)
        .input("member_name", sql.NVarChar, memberName)
        .query(
          "SELECT member_id FROM Members WHERE principal_id = @principal_id AND member_name = @member_name"
        );

      if (existingMember.recordset.length > 0) {
        duplicateEntries.push(
          `Row ${
            index + 2
          }: Member "${memberName}" already exists for principal "${principalName}"`
        );
        continue;
      }

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

    // Log success
    await pool
      .request()
      .input("uploaded_by", sql.NVarChar, req.user?.email || "Guest")
      .input("file_name", sql.NVarChar, req.file.originalname)
      .input("status", sql.NVarChar, "SUCCESS")
      .query(
        "INSERT INTO FileUploadLogs (uploaded_by, file_name, status) VALUES (@uploaded_by, @file_name, @status)"
      );

    let responseMessage = `✅ Upload complete: ${insertedCount} members inserted.`;

    if (duplicateEntries.length > 0) {
      responseMessage += ` ${duplicateEntries.length} entries skipped or used existing principals.`;
      res.status(207).json({
        message: responseMessage,
        duplicates: duplicateEntries,
      });
    } else {
      res.status(200).json({
        message: responseMessage,
      });
    }
  } catch (err) {
    console.error("Upload error:", err);
    try {
      if (!pool) pool = await connectToDB();
      await pool
        .request()
        .input("uploaded_by", sql.NVarChar, req.user?.email || "Guest")
        .input("file_name", sql.NVarChar, req.file?.originalname || "N/A")
        .input("status", sql.NVarChar, "FAILED")
        .query(
          "INSERT INTO FileUploadLogs (uploaded_by, file_name, status) VALUES (@uploaded_by, @file_name, @status)"
        );
    } catch (logErr) {
      console.error("Error logging failed upload:", logErr);
    }

    res.status(500).json({ error: "Server error during file upload" });
  }
};
