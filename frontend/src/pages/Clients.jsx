import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";
import { FiSearch, FiDownload, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";

const Clients = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:5000/api/clients/get-data"
      );
      const result = Array.isArray(response.data.users)
        ? response.data.users
        : [];
      setData(result);

      // Only show toast on manual refresh, not initial load
      if (!initialLoad) {
        toast.success("Data refreshed successfully", {
          position: "top-right",
          duration: 1500,
        });
      }
      setInitialLoad(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
      toast.error("Failed to load client data", {
        position: "top-right",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);

    if (value.trim() === "") {
      setFilteredData([]);
      return;
    }

    const filtered = data.filter((item) => {
      const schemeName = item["Scheme Name"]?.toLowerCase() || "";
      const cardNumber = item["Card Number"]?.toLowerCase() || "";
      const memberName = item["Member Name"]?.toLowerCase() || "";
      const phoneNumber = item["Phone Number"]?.toLowerCase() || "";

      if (value.match(/^ilg-\d+-00$/i)) {
        const basePrefix = value.split("-").slice(0, 2).join("-");
        return cardNumber.startsWith(basePrefix);
      }

      return (
        schemeName.includes(value) ||
        cardNumber.includes(value) ||
        memberName.includes(value) ||
        phoneNumber.includes(value)
      );
    });

    // Helper function to parse card numbers safely
    const parseCardNumber = (card) => {
      if (!card) return { group: 0, member: 0 };

      const parts = card.split("-");
      if (parts.length < 3) return { group: 0, member: 0 };

      return {
        group: parseInt(parts[1]) || 0,
        member: parseInt(parts[2]) || 0,
      };
    };

    // Sort the filtered data
    const sortedData = [...filtered].sort((a, b) => {
      const aCard = parseCardNumber(a["Card Number"]);
      const bCard = parseCardNumber(b["Card Number"]);

      // First sort by group number
      if (aCard.group !== bCard.group) {
        return aCard.group - bCard.group;
      }

      // Then sort by member number (00 first, then 01, 02, etc.)
      return aCard.member - bCard.member;
    });

    setFilteredData(sortedData);
  };

  const exportToExcel = () => {
    setExportLoading(true);
    try {
      const worksheetData = filteredData.map((item) => ({
        "Scheme Name": item["Scheme Name"],
        "Principal Name": item["Principal Name"],
        "Member Name": item["Member Name"],
        "Card Number": item["Card Number"],
        Relationship: item["Relationship"],
        Gender: item["Gender"],
        "Date of Birth": item["Date of Birth"],
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

      saveAs(
        dataBlob,
        `clients_${new Date().toISOString().split("T")[0]}.xlsx`
      );
      toast.success("Export completed successfully", {
        position: "top-right",
        duration: 3000,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data", {
        position: "top-right",
        duration: 5000,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Client Management
          </h1>
          <p className="text-gray-600">Search and manage all client records</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by card, name, phone..."
              value={searchTerm}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchClientData}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
              <FiRefreshCw className={`${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredData.length === 0 || exportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiDownload />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Data Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Scheme Name",
                      "Principal Name",
                      "Member Name",
                      "Card Number",
                      "Relationship",
                      "Gender",
                      "Date of Birth",
                      "Phone Number",
                      "Email Address",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.length > 0 ? (
                    filteredData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row["Scheme Name"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row["Principal Name"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row["Member Name"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {row["Card Number"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {row["Relationship"] || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row["Gender"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(row["Date of Birth"])}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row["Phone Number"] || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row["Email Address"] || "N/A"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center">
                        <div className="text-gray-500">
                          {searchTerm.trim() === "" ? (
                            <div>
                              <p>Enter a search term to find clients</p>
                              <p className="text-sm mt-2">
                                Try searching by card number, name, or phone
                                number
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p>No matching clients found</p>
                              <p className="text-sm mt-2">
                                Try a different search term or check your
                                spelling
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {filteredData.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-medium">{filteredData.length}</span>{" "}
                  results
                </p>
                <p className="text-sm text-gray-500">
                  Total clients:{" "}
                  <span className="font-medium">{data.length}</span>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Clients;
