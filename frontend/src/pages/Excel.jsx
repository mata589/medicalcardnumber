// src/pages/ExcelUpload.jsx
import React, { useState } from "react";
import axios from "axios";

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage(null); // Clear previous messages when new file is selected
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ text: "Please select a file first", type: "error" });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await axios.post(
        "http://localhost:5000/api/clients/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setMessage({
        text: `Upload successful: ${response.data.message}`,
        type: "success",
      });
    } catch (error) {
      const errorData = error.response?.data;

      if (errorData?.invalidRows && Array.isArray(errorData.invalidRows)) {
        setMessage({
          text: "Upload failed due to missing fields in these rows:",
          type: "error",
          details: errorData.invalidRows,
        });
      } else {
        setMessage({
          text: `Upload failed: ${errorData?.error || error.message}`,
          type: "error",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = () => {
    if (!message) return null;

    const baseStyles = "mt-4 p-3 rounded-md text-sm font-medium";
    const successStyles = "bg-green-50 text-green-800";
    const errorStyles = "bg-red-50 text-red-800";

    return (
      <div
        className={`${baseStyles} ${
          message.type === "success" ? successStyles : errorStyles
        }`}
      >
        <div className="flex items-start">
          <span className="mr-2">
            {message.type === "success" ? "✅" : "❌"}
          </span>
          <div>
            {message.text}
            {message.details && (
              <ul className="list-disc ml-5 mt-1">
                {message.details.map((row, index) => (
                  <li key={index}>{row}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 max-w-md mx-auto bg-white shadow-lg rounded-xl mt-12">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-1">
          Client Data Upload
        </h2>
        <p className="text-gray-600 text-sm">
          Upload an Excel file (.xlsx or .xls) to import client data
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Excel File
          </label>
          <div className="flex items-center">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            />
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            isLoading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors`}
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Processing...
            </>
          ) : (
            "Upload File"
          )}
        </button>

        {renderMessage()}
      </div>
    </div>
  );
};

export default ExcelUpload;
