import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [notification, setNotification] = useState({
    show: false,
    message: "",
  });
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    role: "",
  });
  const [signUpError, setSignUpError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(
          "http://10.9.0.130:5000/api/clients/users"
        );
        setUsers(response.data);
      } catch (error) {
        console.error("Error fetching users:", error.message);
        setNotification({
          show: true,
          message: "Failed to fetch users. Please try again later.",
        });
        setTimeout(() => setNotification({ show: false, message: "" }), 3000);
      }
    };

    fetchUsers();
  }, []);

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setSignUpError("");

    try {
      const res = await axios.post(
        "http://10.9.0.130:5000/api/clients/register",
        signUpData
      );

      if (res.status === 201) {
        // Close modal and refresh users list
        setShowSignUpModal(false);
        setSignUpData({ email: "", password: "", role: "" });

        // Refresh users list
        const response = await axios.get(
          "http://l10.9.0.130:5000/api/clients/users"
        );
        setUsers(response.data);

        setNotification({
          show: true,
          message: "User registered successfully!",
        });
        setTimeout(() => setNotification({ show: false, message: "" }), 3000);
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data?.error) {
        setSignUpError(err.response.data.error);
      } else {
        setSignUpError("Registration failed. Try again.");
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSignUpData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Register Button */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Password Management
          </h1>
          <p className="text-gray-600">Reset user passwords</p>
        </div>
        <button
          onClick={() => setShowSignUpModal(true)}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Register User
        </button>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md">
          {notification.message}
        </div>
      )}

      {/* Search */}
      <div className="mb-6 max-w-md relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap text-center"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === "Administrator"
                          ? "bg-purple-100 text-purple-800"
                          : user.role === "Manager"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                    <button
                      onClick={() =>
                        navigate("/reset-password", {
                          state: { email: user.email },
                        })
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition"
                    >
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="3"
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Register User
              </h2>
              <button
                onClick={() => setShowSignUpModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {signUpError && (
              <p className="text-red-500 text-sm mb-4">{signUpError}</p>
            )}

            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="flex items-center w-full bg-white border border-gray-300/80 h-12 rounded-full overflow-hidden pl-6 gap-2">
                <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M0 .55.571 0H15.43l.57.55v9.9l-.571.55H.57L0 10.45zm1.143 1.138V9.9h13.714V1.69l-6.503 4.8h-.697zM13.749 1.1H2.25L8 5.356z"
                    fill="#6B7280"
                  />
                </svg>
                <input
                  type="email"
                  name="email"
                  placeholder="Email id"
                  value={signUpData.email}
                  onChange={handleInputChange}
                  className="bg-transparent text-gray-500 placeholder-gray-500 outline-none text-sm w-full h-full"
                  required
                />
              </div>

              <div className="flex items-center w-full bg-white border border-gray-300/80 h-12 rounded-full overflow-hidden pl-6 gap-2">
                <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
                  <path
                    d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z"
                    fill="#6B7280"
                  />
                </svg>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={signUpData.password}
                  onChange={handleInputChange}
                  className="bg-transparent text-gray-500 placeholder-gray-500 outline-none text-sm w-full h-full"
                  required
                />
              </div>

              <div className="flex items-center w-full bg-white border border-gray-300/80 h-12 rounded-full overflow-hidden pl-6 gap-2">
                <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
                  <path
                    d="M13 8.5c0-.938-.729-1.7-1.625-1.7h-.812V4.25C10.563 1.907 8.74 0 6.5 0S2.438 1.907 2.438 4.25V6.8h-.813C.729 6.8 0 7.562 0 8.5v6.8c0 .938.729 1.7 1.625 1.7h9.75c.896 0 1.625-.762 1.625-1.7zM4.063 4.25c0-1.406 1.093-2.55 2.437-2.55s2.438 1.144 2.438 2.55V6.8H4.061z"
                    fill="#6B7280"
                  />
                </svg>
                <input
                  type="text"
                  name="role"
                  placeholder="Role"
                  value={signUpData.role}
                  onChange={handleInputChange}
                  className="bg-transparent text-gray-500 placeholder-gray-500 outline-none text-sm w-full h-full"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full h-11 rounded-full text-white bg-indigo-500 hover:opacity-90 transition-opacity"
              >
                Register
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
