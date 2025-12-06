import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/Login";
import RegisterPage from "./pages/RegisterPage";
import ForgotPassword from "./pages/ForgotPassword";
import Farmer from "./pages/Farmer";
import Vendor from "./pages/Vendor";
import Customer from "./pages/Customer";
import CustomerBooking from "./pages/CustomerBooking";
import Admin from "./pages/Admin";

import "./App.css";

// ---------------- ProtectedRoute ----------------
function ProtectedRoute({ children, role, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
}

// ---------------- AppWrapper ----------------
function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}

function App() {
  const [role, setRole] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  // ---------------- Initialize role from localStorage ----------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (token && user) {
      setRole(user.role);

      // redirect from login/register if already logged in
      if (location.pathname === "/login" || location.pathname === "/register") {
        navigate(`/${user.role}`);
      }
    }
  }, [location.pathname, navigate]);

  // ---------------- LOGOUT ----------------
  const handleLogout = () => {
    const confirmLogout = window.confirm("Do you really want to logout?");
    if (confirmLogout) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setRole(null);
      navigate("/");
    }
  };

  const showLogout = role && location.pathname !== "/" && location.pathname !== "/login";

  return (
    <>
      {showLogout && (
        <div style={{ textAlign: "right", padding: "10px" }}>
          <button
            onClick={handleLogout}
            style={{
              padding: "5px 15px",
              backgroundColor: "#f44336",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      )}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage onLogin={setRole} />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer"]}>
              <Farmer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <Vendor />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <Customer />
            </ProtectedRoute>
          }
        />

        <Route
          path="/customer/book/:fruitId"
          element={
            <ProtectedRoute allowedRoles={["customer"]}>
              <CustomerBooking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default AppWrapper;
