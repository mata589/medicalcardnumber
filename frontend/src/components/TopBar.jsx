import React, { useState, useRef, useEffect } from "react";
import {
  FiMenu,
  FiLogOut,
  FiUser,
  FiSettings,
  FiHelpCircle,
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const TopBar = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Loading...",
    role: "User",
    email: "",
  });
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Not authenticated");
          setUserData({ name: "Unknown User", role: "User", email: "" });
          return;
        }

        const response = await axios.get(
          "http://10.9.0.130:5000/api/clients/users/profile",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setUserData({
          name: response.data.email || "Unknown User",
          role: response.data.role || "User",
        });
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast.error("Failed to load user info");
        setUserData({
          email: "Unknown User",
          role: "User",
        });
      }
    };

    fetchUserData();
  }, []);

  const toggleDropdown = () => setMenuOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      await axios.post(
        "http://10.9.0.130:5000/api/clients/logout",
        {},
        { withCredentials: true }
      );
      setMenuOpen(false);
      toast.success("Logged out successfully");
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate("/profile");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const firstLetter = userData.name
    ? userData.name.charAt(0).toUpperCase()
    : "?";
  const firstName = userData.name ? userData.name.split(" ")[0] : "User";

  return (
    <div className="flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
      {/* Sidebar Toggle and Breadcrumbs */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-gray-500 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
          aria-label="Toggle sidebar"
        >
          <FiMenu className="w-5 h-5" />
        </button>
        <h1 className="hidden md:block text-sm font-medium text-gray-700">
          Welcome back, <span className="font-semibold">{userData.name}</span>
        </h1>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-4">
        {/* Help Button */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
          onClick={() => navigate("/help")}
        >
          <FiHelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="User menu"
            aria-expanded={menuOpen}
          >
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold shadow">
              {firstLetter}
            </div>
            <span className="hidden md:inline text-sm font-medium text-gray-700">
              {firstName}
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-lg shadow-lg z-50 overflow-hidden">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userData.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userData.email}
                </p>
                <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                  {userData.role}
                </span>
              </div>

              {/* Menu Items */}
              <ul className="py-1 text-sm text-gray-700">
                <li>
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <FiUser className="w-4 h-4 text-gray-500" />
                    Your Profile
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/settings")}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors"
                  >
                    <FiSettings className="w-4 h-4 text-gray-500" />
                    Settings
                  </button>
                </li>
                <li className="border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors text-red-600"
                  >
                    <FiLogOut className="w-4 h-4" />
                    Logout
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
