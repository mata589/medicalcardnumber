import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FaUsers,
  FaUserFriends,
  FaChartPie,
  FaPlus,
  FaUpload,
} from "react-icons/fa";
import { FiRefreshCw } from "react-icons/fi";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [clientData, setClientData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchData = async (showNotification = false) => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/clients/get-data"
      );
      const users = response.data.users;
      if (Array.isArray(users)) {
        setClientData(users);
        if (showNotification || !initialLoad) {
          toast.success(
            showNotification
              ? "Data refreshed successfully"
              : "Data loaded successfully",
            {
              position: "top-right",
              duration: 3000,
            }
          );
        }
      } else {
        setClientData([]);
        toast.error("No valid data received from server", {
          position: "top-right",
          duration: 5000,
        });
      }
    } catch (err) {
      console.error("Error fetching client data:", err);
      setClientData([]);
      toast.error("Failed to fetch data. Please try again.", {
        position: "top-right",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setRefreshLoading(false);
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshLoading(true);
    fetchData(true);
  };

  // Statistics calculations
  const totalPrincipals = clientData.filter(
    (item) => item.Relationship?.toUpperCase() === "PRINCIPAL"
  ).length;

  const totalMembers = clientData.filter(
    (item) =>
      item.Relationship && item.Relationship.toUpperCase() !== "PRINCIPAL"
  ).length;

  const generalTotal = clientData.length;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">Summary of your client data</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition disabled:opacity-50"
          >
            <FiRefreshCw
              size={16}
              className={refreshLoading ? "animate-spin" : ""}
            />
            {refreshLoading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          icon={<FaUsers className="text-blue-500" size={24} />}
          title="Total Principals"
          value={totalPrincipals}
          description="Primary account holders"
          color="blue"
        />
        <StatCard
          icon={<FaUserFriends className="text-green-500" size={24} />}
          title="Total Members"
          value={totalMembers}
          description="Family members and dependents"
          color="green"
        />
        <StatCard
          icon={<FaChartPie className="text-purple-500" size={24} />}
          title="General Total"
          value={generalTotal}
          description="All clients in the system"
          color="purple"
        />
      </div>

      {/* Action Buttons Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">
            Client Management
          </h2>
          <p className="text-sm text-gray-500">
            Add new clients or upload data in bulk
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/add-client"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition shadow-md hover:shadow-lg min-w-[200px]"
          >
            <FaPlus size={16} />
            Add New Client
          </Link>

          <Link
            to="/upload"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md hover:shadow-lg min-w-[200px]"
          >
            <FaUpload size={16} />
            Upload Clients
          </Link>
        </div>

        {clientData.length === 0 && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-yellow-700">
              No client data available. Add your first client or upload a file
              to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced StatCard Component
const StatCard = ({ icon, title, value, description, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
  };

  const textColors = {
    blue: "text-blue-700",
    green: "text-green-700",
    purple: "text-purple-700",
  };

  return (
    <div
      className={`p-6 rounded-xl border-2 ${colorClasses[color]} transition-all hover:shadow-lg`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-white shadow-sm">{icon}</div>
      </div>

      <div className="text-left">
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-800 mb-2">{value}</p>
        <p className={`text-xs font-medium ${textColors[color]}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
