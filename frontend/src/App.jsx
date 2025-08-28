import React from "react";
import Excel from "./pages/Excel";
// import LoginPage from "./pages/LoginPage";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Layout from "./layout/Layout";
import AddClient from "./pages/AddClient";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import ResetPasswordPage from "./pages/ResetPasswordPage";

const App = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/add-client" element={<AddClient />} />
            <Route path="/upload" element={<Excel />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
      </Routes>
    </>
  );
};

export default App;
