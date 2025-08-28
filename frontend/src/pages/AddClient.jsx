import React, { useState } from "react";
import axios from "axios";
import { FaUserPlus, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const AddClient = () => {
  const [principal, setPrincipal] = useState({
    schemeName: "",
    principalName: "",
    gender: "",
    dateOfBirth: "",
    phoneNumber: "",
    emailAddress: "",
  });

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // -------------------------------
  // Handlers
  // -------------------------------
  const handlePrincipalChange = (e) => {
    const { name, value } = e.target;
    setPrincipal((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (index, e) => {
    const { name, value } = e.target;
    const updatedMembers = [...members];
    updatedMembers[index][name] = value;
    setMembers(updatedMembers);
  };

  const addMember = () => {
    setMembers((prev) => [
      ...prev,
      {
        memberName: "",
        relationship: "",
        gender: "",
        dateOfBirth: "",
        phoneNumber: "",
        emailAddress: "",
      },
    ]);
    toast("Member field added", {
      icon: "👥",
      style: {
        background: "#f0f9ff",
        color: "#0369a1",
        border: "1px solid #bae6fd",
      },
    });
  };

  const removeMember = (index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    toast("Member removed", {
      icon: "🗑️",
      style: {
        background: "#fff1f2",
        color: "#e11d48",
        border: "1px solid #fecdd3",
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("You must be logged in to add a client!");
      return;
    }

    const payload = {
      principal: {
        scheme_name: principal.schemeName,
        principal_name: principal.principalName,
        gender: principal.gender,
        date_of_birth: principal.dateOfBirth,
        phone_number: principal.phoneNumber,
        email_address: principal.emailAddress,
      },
      members: members.map((m) => ({
        member_name: m.memberName,
        relationship: m.relationship,
        gender: m.gender,
        date_of_birth: m.dateOfBirth,
        phone_number: m.phoneNumber,
        email_address: m.emailAddress,
      })),
    };

    try {
      setLoading(true);
      const response = await axios.post(
        "http://localhost:5000/api/clients/add-client",
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success(response.data.message || "Client added successfully!", {
        style: {
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
        },
      });

      // Reset form
      setPrincipal({
        schemeName: "",
        principalName: "",
        gender: "",
        dateOfBirth: "",
        phoneNumber: "",
        emailAddress: "",
      });
      setMembers([]);
      navigate("/clients"); // ✅ redirect after save
    } catch (error) {
      console.error("Submission error:", error);
      toast.error(error.response?.data?.error || "Something went wrong!", {
        style: {
          background: "#fef2f2",
          color: "#dc2626",
          border: "1px solid #fecaca",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------
  // UI
  // -------------------------------
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Client Registration
        </h1>
        <p className="text-gray-600">Add new principal and their members</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Principal Section */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              Principal Information
            </h2>
            <p className="text-gray-500 text-sm">
              Primary account holder details
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                label: "Scheme Name",
                type: "text",
                name: "schemeName",
                value: principal.schemeName,
                placeholder: "Enter scheme name",
                required: true,
              },
              {
                label: "Principal Name",
                type: "text",
                name: "principalName",
                value: principal.principalName,
                placeholder: "Enter full name",
                required: true,
              },
              {
                label: "Gender",
                type: "select",
                name: "gender",
                value: principal.gender,
                options: ["", "MALE", "FEMALE", "OTHER"],
                required: true,
              },
              {
                label: "Date of Birth",
                type: "date",
                name: "dateOfBirth",
                value: principal.dateOfBirth,
                required: true,
              },
              {
                label: "Phone Number",
                type: "tel",
                name: "phoneNumber",
                value: principal.phoneNumber,
                placeholder: "Enter phone number",
                required: true,
              },
              {
                label: "Email Address",
                type: "email",
                name: "emailAddress",
                value: principal.emailAddress,
                placeholder: "Enter email address",
                required: true,
              },
            ].map(
              ({
                label,
                type,
                name,
                value,
                options,
                placeholder,
                required,
              }) => (
                <div key={name} className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {label}
                  </label>
                  {type === "select" ? (
                    <select
                      name={name}
                      value={value}
                      onChange={handlePrincipalChange}
                      required={required}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                    >
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "" ? `Select ${label.toLowerCase()}` : opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      name={name}
                      type={type}
                      value={value}
                      onChange={handlePrincipalChange}
                      required={required}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              )
            )}
          </div>
        </section>

        {/* Members Section */}
        <section className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                Member Information
              </h2>
              <p className="text-gray-500 text-sm">
                Add dependents or family members
              </p>
            </div>
            <button
              type="button"
              onClick={addMember}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition"
            >
              <FaUserPlus className="text-sm" />
              Add Member
            </button>
          </div>

          {members.length === 0 ? (
            <div className="bg-gray-50 p-8 text-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">No members added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member, index) => (
                <div
                  key={index}
                  className="relative p-5 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <button
                    type="button"
                    onClick={() => removeMember(index)}
                    className="absolute top-3 right-3 p-1 text-gray-400 hover:text-red-600 transition"
                    title="Remove Member"
                  >
                    <FaTrashAlt size={16} />
                  </button>

                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Member #{index + 1}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        label: "Member Name",
                        type: "text",
                        name: "memberName",
                        value: member.memberName,
                        placeholder: "Enter full name",
                        required: true,
                      },
                      {
                        label: "Relationship",
                        type: "select",
                        name: "relationship",
                        value: member.relationship,
                        options: [
                          "",
                          "HUSBAND",
                          "WIFE",
                          "SON",
                          "DAUGHTER",
                          "MEMBER",
                          "OTHER",
                        ],
                        required: true,
                      },
                      {
                        label: "Gender",
                        type: "select",
                        name: "gender",
                        value: member.gender,
                        options: ["", "MALE", "FEMALE", "OTHER"],
                        required: true,
                      },
                      {
                        label: "Date of Birth",
                        type: "date",
                        name: "dateOfBirth",
                        value: member.dateOfBirth,
                        required: true,
                      },
                      {
                        label: "Phone Number",
                        type: "tel",
                        name: "phoneNumber",
                        value: member.phoneNumber,
                        placeholder: "Enter phone number",
                        required: false,
                      },
                      {
                        label: "Email Address",
                        type: "email",
                        name: "emailAddress",
                        value: member.emailAddress,
                        placeholder: "Enter email address",
                        required: false,
                      },
                    ].map(
                      ({
                        label,
                        type,
                        name,
                        value,
                        options,
                        placeholder,
                        required,
                      }) => (
                        <div key={name} className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {label}
                          </label>
                          {type === "select" ? (
                            <select
                              name={name}
                              value={value}
                              onChange={(e) => handleMemberChange(index, e)}
                              required={required}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                            >
                              {options.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt === ""
                                    ? `Select ${label.toLowerCase()}`
                                    : opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              name={name}
                              type={type}
                              value={value}
                              onChange={(e) => handleMemberChange(index, e)}
                              required={required}
                              placeholder={placeholder}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            }`}
          >
            {loading ? "Processing..." : "Save Client"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddClient;
