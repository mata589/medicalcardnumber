import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { RiDashboardLine } from "react-icons/ri";
import { useLocation } from "react-router-dom";
import {
  FiMenu,
  FiChevronLeft,
  FiUsers,
  FiUpload,
  FiSettings,
  FiLogOut,
   FiBarChart,  
} from "react-icons/fi";
import { FaUserFriends } from "react-icons/fa";
import axios from "axios";

const SideBar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [userRole, setUserRole] = useState(null); // store role here
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Fetch logged-in user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const response = await axios.get(
          "http://10.9.0.130:5000/api/clients/users/profile",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setUserRole(response.data.role); // Save user role
      } catch (error) {
        console.error("Failed to fetch user role:", error);
      }
    };

    fetchUser();
  }, []);

  // Define navigation items
  const navItems = [
    {
      path: "/",
      icon: <RiDashboardLine size={20} />,
      label: "Dashboard",
      exact: true,
    },
    {
      path: "/clients",
      icon: <FiUsers size={20} />,
      label: "Clients",
    },
    {
      path: "/add-client",
      icon: <FaUserFriends size={20} />,
      label: "Add Client",
    },
     {
      path: "/price-comparison",
      icon: < FiBarChart size={20} />,
      label: "Price Comparison",
    },
    {
      path: "/upload",
      icon: <FiUpload size={20} />,
      label: "Upload Data",
    },
    // Only show Settings if role is Administrator
    ...(userRole === "admin"
      ? [
          {
            path: "/settings",
            icon: <FiSettings size={20} />,
            label: "Settings",
          },
        ]
      : []),
  ];

  const isActive = (path, exact = false) => {
    return exact
      ? location.pathname === path
      : location.pathname.startsWith(path);
  };

  return (
    <div
      className={`flex flex-col ${
        isCollapsed ? "w-20" : "w-64"
      } transition-all duration-300 border-r border-gray-200 bg-white h-screen`}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold mr-2">
              IM
            </div>
            <h1 className="text-xl font-bold text-indigo-600">ICEA MEDICAL</h1>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600 transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <FiMenu size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
              isActive(item.path, item.exact)
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100"
            } ${isCollapsed ? "justify-center" : ""}`}
            onMouseEnter={() => setHoveredItem(item.path)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div
              className={`transition-colors ${
                isActive(item.path, item.exact)
                  ? "text-indigo-600"
                  : "text-gray-500"
              }`}
            >
              {React.cloneElement(item.icon, {
                className: `w-5 h-5 ${
                  hoveredItem === item.path ? "scale-110" : ""
                } transition-transform`,
              })}
            </div>
            {!isCollapsed && (
              <span className="ml-3 transition-opacity">{item.label}</span>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-gray-200">
        <Link
          to="/logout"
          className={`flex items-center px-4 py-3 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-all ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <FiLogOut size={20} className="text-gray-500" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Link>
      </div>
    </div>
  );
};

export default SideBar;
