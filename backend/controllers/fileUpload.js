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
    let duplicateMembers = [];
    let principalsCreated = 0;

    // First, let's get all existing principals to map them by name
    const allPrincipalsResult = await pool
      .request()
      .query(
        "SELECT principal_id, principal_name, phone_number FROM Principals"
      );

    const principalsMap = {};
    allPrincipalsResult.recordset.forEach((principal) => {
      principalsMap[principal.principal_name.toLowerCase()] = principal;
    });

    // Process the data
    for (const row of validatedRows) {
      const {
        scheme,
        principalName,
        memberName,
        relationship,
        gender,
        phone_number, // This is the member's phone number
        email_address,
        dateOfBirth,
      } = row;

      // Check if principal already exists by name only
      const normalizedPrincipalName = principalName.toLowerCase();
      let principalId;
      let existingPrincipal = principalsMap[normalizedPrincipalName];

      if (existingPrincipal) {
        // Principal exists - use existing principal ID
        principalId = existingPrincipal.principal_id;
        console.log(
          `Found existing principal: ${principalName} with ID: ${principalId}`
        );
      } else {
        // Principal doesn't exist - check if we have a principal phone number column
        // If not, we'll need to create a new principal with a placeholder phone number
        // For now, let's assume we need to create a new principal
        const principalPhone = phone_number; // Using member's phone as fallback

        await pool
          .request()
          .input("scheme_name", sql.NVarChar, scheme)
          .input("principal_name", sql.NVarChar, principalName)
          .input("gender", sql.NVarChar, gender)
          .input("phone_number", sql.NVarChar, principalPhone)
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
            "SELECT principal_id FROM Principals WHERE principal_name = @principal_name"
          );

        principalId = result.recordset[0].principal_id;
        principalsMap[normalizedPrincipalName] = {
          principal_id: principalId,
          principal_name: principalName,
          phone_number: principalPhone,
        };
        principalsCreated++;
        console.log(
          `Created new principal: ${principalName} with ID: ${principalId}`
        );
      }

      // Check if member already exists for this principal
      const existingMember = await pool
        .request()
        .input("principal_id", sql.NVarChar, principalId)
        .input("member_name", sql.NVarChar, memberName)
        .input("phone_number", sql.NVarChar, phone_number)
        .query(
          "SELECT member_id FROM Members WHERE principal_id = @principal_id AND member_name = @member_name AND phone_number = @phone_number"
        );

      if (existingMember.recordset.length > 0) {
        // Member already exists - skip
        duplicateMembers.push(
          `Principal: ${principalName}, Member: ${memberName}, Phone: ${phone_number}`
        );
        continue;
      }

      // Skip if member name is same as principal name (principal is not a member)
      if (principalName.toLowerCase() === memberName.toLowerCase()) continue;

      // Get the next sequence number for this principal
      const seqResult = await pool
        .request()
        .input("principal_id", sql.NVarChar, principalId)
        .query(
          "SELECT ISNULL(MAX(member_seq), 0) + 1 AS next_seq FROM Members WHERE principal_id = @principal_id"
        );

      const memberSeq = seqResult.recordset[0].next_seq;

      // Insert the new member with their own phone number
      await pool
        .request()
        .input("member_seq", sql.Int, memberSeq)
        .input("principal_id", sql.NVarChar, principalId)
        .input("member_name", sql.NVarChar, memberName)
        .input("relationship", sql.NVarChar, relationship)
        .input("gender", sql.NVarChar, gender)
        .input("phone_number", sql.NVarChar, phone_number)
        .input("email_address", sql.NVarChar, email_address)
        .input("date_of_birth", sql.Date, dateOfBirth)
        .query(
          `INSERT INTO Members (member_seq, principal_id, member_name, relationship, gender, date_of_birth, phone_number, email_address)
           VALUES (@member_seq, @principal_id, @member_name, @relationship, @gender, @date_of_birth, @phone_number, @email_address)`
        );

      insertedCount++;
      console.log(
        `Added member ${memberName} to principal ${principalName} with sequence ${memberSeq}`
      );
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

    let message = `✅ Upload complete: ${insertedCount} members inserted.`;

    if (principalsCreated > 0) {
      message += ` ${principalsCreated} new principals created.`;
    }

    if (duplicateMembers.length > 0) {
      message += ` ${duplicateMembers.length} duplicate members skipped.`;
    }

    res.status(200).json({
      message,
      stats: {
        membersInserted: insertedCount,
        principalsCreated: principalsCreated,
        duplicatesSkipped: duplicateMembers.length,
      },
      duplicates: {
        members: duplicateMembers,
      },
    });
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
      console.error("Log error:", logErr);
    }

    res.status(500).json({ error: "Server error during file upload" });
  }
};
