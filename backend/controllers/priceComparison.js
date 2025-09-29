// routes/compare.js
import express from "express";
import multer from "multer";
import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import stringSimilarity from "string-similarity";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

if (!fs.existsSync("outputs")) fs.mkdirSync("outputs");

const normalize = (str) => str?.toString().trim().toLowerCase() || "";

const findMatch = (item, list, threshold = 0.8) => {
  if (!item) return null;
  const result = stringSimilarity.findBestMatch(normalize(item), list.map(normalize));
  return result.bestMatch.rating >= threshold ? list[result.bestMatchIndex] : null;
};

const getSheetByName = (wb, targetName) => {
  const found = wb.SheetNames.find((name) => name.toLowerCase() === targetName.toLowerCase());
  return found ? wb.Sheets[found] : null;
};

router.post(
  "/compare",
  upload.fields([{ name: "icea" }, { name: "provider" }]),
  async (req, res) => {
    try {
      if (!req.files || !req.files["icea"] || !req.files["provider"]) {
        return res.status(400).json({ error: "Both files are required" });
      }

      const iceaPath = req.files["icea"][0].path;
      const providerPath = req.files["provider"][0].path;

      const iceaWb = XLSX.readFile(iceaPath);
      const providerWb = XLSX.readFile(providerPath);

      // Build ICEA map
      const iceaMap = {};
      const iceaSheetsConfig = {
        DRUGS: { nameCol: "Pharmaceutical Product", priceCol: "Agreed Price" },
        LABS: { nameCol: "Laboratory Tests", priceCol: "Price" },
        DENTAL: { nameCol: "Dental Service Name", priceCol: "Price" },
      };

      Object.entries(iceaSheetsConfig).forEach(([sheetName, config]) => {
        const sheet = getSheetByName(iceaWb, sheetName);
        if (!sheet) return;

        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        data.forEach((row) => {
          const itemName = normalize(row[config.nameCol]);
          const priceRaw = row[config.priceCol]?.toString().replace(/[,₹$]/g, "").trim();
          const price = parseFloat(priceRaw);
          if (itemName && !isNaN(price)) {
            iceaMap[itemName] = { price };
          }
        });
      });

      console.log("✅ ICEA items mapped:", Object.keys(iceaMap).length);

      // Process provider
      const providerSheetsConfig = {
        DRUGS: { nameCol: "Drug Name", priceCol: "Price" },
        LABS: { nameCol: "Laboratory Tests", priceCol: "Price" },
        DENTAL: { nameCol: "Dental Service Name", priceCol: "Price" },
      };

      Object.entries(providerSheetsConfig).forEach(([sheetName, config]) => {
        const sheet = getSheetByName(providerWb, sheetName);
        if (!sheet) return;

        const data = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!data.length) return;

        const finalData = [];

        data.forEach((row) => {
          const providerItem = normalize(row[config.nameCol]);
          const providerPriceRaw = row[config.priceCol]?.toString().replace(/[,₹$]/g, "").trim();
          const providerPrice = parseFloat(providerPriceRaw);
          if (!providerItem || isNaN(providerPrice)) return;

          const matchKey = findMatch(providerItem, Object.keys(iceaMap));
          if (!matchKey) return;

          const iceaPrice = iceaMap[matchKey].price;

          finalData.push({
            ...row,
            "Final Price": providerPrice > iceaPrice ? iceaPrice : providerPrice,
          });
        });

        const headers = Object.keys(data[0] || {});
        if (!headers.includes("Final Price")) headers.push("Final Price");

        providerWb.Sheets[sheetName] = XLSX.utils.json_to_sheet(finalData, { header: headers });

        console.log(`✅ Processed ${sheetName}: ${finalData.length} rows`);
      });

      const outputPath = path.join("outputs", `Price_Comparison_${Date.now()}.xlsx`);
      XLSX.writeFile(providerWb, outputPath);

      // Clean temp uploads
      fs.unlinkSync(iceaPath);
      fs.unlinkSync(providerPath);

      // ✅ Send file buffer for frontend axios (blob)
      const fileBuffer = fs.readFileSync(outputPath);
      res.setHeader("Content-Disposition", "attachment; filename=Price_Comparison.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(fileBuffer);

      // Cleanup after sending
      setTimeout(() => {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      }, 10000);
    } catch (err) {
      console.error("❌ Error in /compare:", err);
      res.status(500).json({ error: "Error processing files", details: err.message });
    }
  }
);

export default router;
