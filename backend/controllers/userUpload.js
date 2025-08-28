// controllers/clientController.js
import { sql, connectToDB } from "../config/db.js";

export const getUserData = async (req, res) => {
  try {
    const pool = await connectToDB();
    const result = await pool.request().query(`
        -- Principals
        SELECT 
          p.id AS 'ID',
          p.scheme_name AS 'Scheme Name',
          p.principal_name AS 'Principal Name',
          p.principal_name AS 'Member Name',
          p.principal_id AS 'Card Number',
          'PRINCIPAL' AS 'Relationship',
          p.gender AS 'Gender',
          p.date_of_birth AS 'Date of Birth',
          p.phone_number AS 'Phone Number',
          p.email_address AS 'Email Address',
          NULL AS 'Family Code',
          NULL AS 'Member Seq'
        FROM Principals p

        UNION ALL

        -- Members
        SELECT 
          p.id AS 'ID',
          p.scheme_name AS 'Scheme Name',
          p.principal_name AS 'Principal Name',
          m.member_name AS 'Member Name',
          m.member_id AS 'Card Number',
          m.relationship AS 'Relationship',
          m.gender AS 'Gender',
          m.date_of_birth AS 'Date of Birth',
          m.phone_number AS 'Phone Number',
          m.email_address AS 'Email Address',
          m.family_code AS 'Family Code',
          m.member_seq AS 'Member Seq'  -- Added member_seq from Members table
        FROM Members m
        JOIN Principals p ON m.principal_id = p.principal_id

        ORDER BY [Relationship] DESC, [Family Code] ASC, [Card Number] ASC;
    `);

    res.status(200).json({ users: result.recordset });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// ADD a new client (principal + members)
// ADD a new client (principal + members)
export const addClient = async (req, res) => {
  const { principal, members } = req.body;

  // -------------------------------
  // Validate principal fields
  // -------------------------------
  if (
    !principal ||
    !principal.scheme_name ||
    !principal.principal_name ||
    !principal.gender ||
    !principal.date_of_birth ||
    !principal.phone_number ||
    !principal.email_address
  ) {
    return res.status(400).json({ error: "Missing required principal fields" });
  }

  try {
    const pool = await connectToDB();

    let principalId;

    // -------------------------------
    // Check if principal already exists
    // -------------------------------
    const existingPrincipal = await pool
      .request()
      .input("principal_name", sql.NVarChar, principal.principal_name)
      .input("email_address", sql.NVarChar, principal.email_address).query(`
        SELECT principal_id FROM Principals
        WHERE principal_name = @principal_name AND email_address = @email_address
      `);

    if (existingPrincipal.recordset.length > 0) {
      // ✅ Principal already exists → reuse it
      principalId = existingPrincipal.recordset[0].principal_id;
    } else {
      // ✅ Insert new principal
      const insertPrincipalResult = await pool
        .request()
        .input("scheme_name", sql.NVarChar, principal.scheme_name)
        .input("principal_name", sql.NVarChar, principal.principal_name)
        .input("gender", sql.NVarChar, principal.gender)
        .input("date_of_birth", sql.Date, principal.date_of_birth)
        .input("phone_number", sql.NVarChar, principal.phone_number)
        .input("email_address", sql.NVarChar, principal.email_address).query(`
          INSERT INTO Principals (scheme_name, principal_name, gender, date_of_birth, phone_number, email_address)
          VALUES (@scheme_name, @principal_name, @gender, @date_of_birth, @phone_number, @email_address);
          SELECT SCOPE_IDENTITY() AS id;
        `);

      const insertedId = insertPrincipalResult.recordset[0].id;

      const principalIdResult = await pool
        .request()
        .input("id", sql.Int, insertedId)
        .query("SELECT principal_id FROM Principals WHERE id = @id");

      principalId = principalIdResult.recordset[0].principal_id;
    }

    // -------------------------------
    // Insert Members if provided
    // -------------------------------
    const addedMembers = [];
    const skippedMembers = [];

    if (Array.isArray(members) && members.length > 0) {
      let memberSeq = 1;

      for (const member of members) {
        // Check if member already exists under this principal
        const existingMember = await pool
          .request()
          .input("principal_id", sql.NVarChar, principalId)
          .input("member_name", sql.NVarChar, member.member_name)
          .input("email_address", sql.NVarChar, member.email_address || "")
          .query(`
            SELECT member_id FROM Members
            WHERE principal_id = @principal_id AND member_name = @member_name AND email_address = @email_address
          `);

        if (existingMember.recordset.length > 0) {
          skippedMembers.push(member.member_name);

          continue; // ❌ Skip this member, don't block the whole request
        }

        await pool
          .request()
          .input("principal_id", sql.NVarChar, principalId)
          .input("member_name", sql.NVarChar, member.member_name)
          .input("relationship", sql.NVarChar, member.relationship)
          .input("gender", sql.NVarChar, member.gender || "")
          .input("date_of_birth", sql.Date, member.date_of_birth || null)
          .input("phone_number", sql.NVarChar, member.phone_number || "")
          .input("email_address", sql.NVarChar, member.email_address || "")
          .input("member_seq", sql.Int, memberSeq++).query(`
            INSERT INTO Members (
              principal_id, member_name, relationship, gender, date_of_birth, phone_number, email_address, member_seq
            ) VALUES (
              @principal_id, @member_name, @relationship, @gender, @date_of_birth, @phone_number, @email_address, @member_seq
            );
          `);

        addedMembers.push(member.member_name);
      }
    }

    res.status(201).json({
      message: "Client processed successfully!",
      principal: principal.principal_name,
      addedMembers,
      skippedMembers,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
