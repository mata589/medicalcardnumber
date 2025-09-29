// File: CompareFiles.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const FileComparison = () => {
  const [iceaFile, setIceaFile] = useState(null);
  const [providerFile, setProviderFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null); // ✅ store blob URL

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!iceaFile || !providerFile) {
      toast.error("Please upload both files.");
      return;
    }

    const formData = new FormData();
    formData.append("icea", iceaFile);
    formData.append("provider", providerFile);

    try {
      setLoading(true);
      toast.loading("Processing files...");

      const response = await axios.post(
        "http://localhost:5000/api/compare",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          responseType: "blob",
        }
      );

      // ✅ create blob URL but don't auto-download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);

      toast.dismiss();
      toast.success("Comparison complete! Ready for download.");
    } catch (err) {
      toast.dismiss();
      console.error("❌ Upload error:", err.response || err.message);
      toast.error("Error processing files.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!downloadUrl) return;

    // Download the file
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", "Price_Comparison.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();

    // ✅ Clear inputs and download URL after download
    setIceaFile(null);
    setProviderFile(null);
    setDownloadUrl(null);
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white shadow-md rounded-md mt-10">
      <h2 className="text-2xl font-bold mb-6 text-center">Compare Files</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ICEA File Input */}
        <div className="flex flex-col mb-4">
          <label className="mb-2 font-semibold text-gray-700">Upload ICEA File</label>
          <label 
            className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200"
          >
            <span className="text-gray-600">{iceaFile ? iceaFile.name : "Click or drag file here"}</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setIceaFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        {/* Provider File Input */}
        <div className="flex flex-col mb-4">
          <label className="mb-2 font-semibold text-gray-700">Upload Provider File</label>
          <label 
            className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors duration-200"
          >
            <span className="text-gray-600">{providerFile ? providerFile.name : "Click or drag file here"}</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setProviderFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
        >
          {loading ? "Processing..." : "Compare"}
        </button>
      </form>

      {/* Download button */}
      {downloadUrl && (
        <div className="mt-6 text-center">
          <button
            onClick={handleDownload}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Download Result
          </button>
        </div>
      )}
    </div>
  );
};

export default FileComparison;
