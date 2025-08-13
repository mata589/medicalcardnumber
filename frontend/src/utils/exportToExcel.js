import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { formatDate } from "./formatDate";

export const exportClientsToExcel = (data) => {
  const worksheetData = data.map((item) => ({
    "Scheme Name": item["Scheme Name"],
    "Principal Name": item["Principal Name"],
    "Member Name": item["Member Name"],
    "Card Number": item["Card Number"],
    Relationship: item["Relationship"],
    Gender: item["Gender"],
    "Date of Birth": `${formatDate(item["Date of Birth"])}`,
    "Phone Number": item["Phone Number"],
    "Email Address": item["Email Address"],
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const dataBlob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });

  saveAs(dataBlob, `clients_${new Date().toISOString().split("T")[0]}.xlsx`);
};
