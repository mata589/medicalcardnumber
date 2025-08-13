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
    (item) => item.Relationship?.toUpperCase() === "MEMBER"
  ).length;

  const totalMembers = clientData.filter(
    (item) => item.Relationship && item.Relationship.toUpperCase() !== "MEMBER"
  ).length;

  const generalTotal = clientData.length;
  const recentClients = [...clientData].slice(-5).reverse();

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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<FaUsers className="text-blue-500" size={24} />}
          title="Total Principals"
          value={totalPrincipals}
          color="blue"
        />
        <StatCard
          icon={<FaUserFriends className="text-green-500" size={24} />}
          title="Total Members"
          value={totalMembers}
          color="green"
        />
        <StatCard
          icon={<FaChartPie className="text-purple-500" size={24} />}
          title="General Total"
          value={generalTotal}
          color="purple"
        />
      </div>

      {/* Recent Clients Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b border-gray-200 gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Recent Clients
            </h2>
            <p className="text-sm text-gray-500">Last 5 registered clients</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/add-client"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              <FaPlus size={14} />
              Add Client
            </Link>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition"
            >
              <FaUpload size={14} />
              Upload File
            </Link>
          </div>
        </div>

        {recentClients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No client data available. Add your first client to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Card Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Relationship
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentClients.map((client, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {client["Member Name"] || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {client["Card Number"] || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {client.Relationship || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// StatCard Component remains the same
const StatCard = ({ icon, title, value, trend, percentage, color }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
    purple: "bg-purple-50 border-purple-100",
  };

  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-lg bg-white shadow-xs">{icon}</div>
        <div className="text-right">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
