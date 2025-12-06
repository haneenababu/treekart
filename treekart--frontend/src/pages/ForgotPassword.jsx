import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";
import { validateEmail, validatePhone, validatePassword, showValidationErrors } from "../utils/validation";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async () => {
    // Validation
    const errors = {
      email: validateEmail(email),
      phone: validatePhone(phone),
      newPassword: validatePassword(newPassword),
      confirmPassword: !confirmPassword ? "Please confirm your password" : 
                       newPassword !== confirmPassword ? "Passwords do not match" : null
    };

    if (showValidationErrors(errors)) return;

    try {
      setLoading(true);
      const res = await axios.post("http://localhost:5000/api/auth/forgot-password", {
        email,
        phone,
        newPassword
      });

      alert("✅ " + res.data.message);
      navigate("/login");
    } catch (err) {
      console.error("Password reset error:", err);
      alert("❌ " + (err.response?.data?.message || "Password reset failed!"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <nav className="login-navbar">
        <div className="logo">TreeKart</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
        </div>
      </nav>

      <div className="login-card">
        <h2 className="login-title">🔐 Reset Password</h2>
        <p className="login-subtitle">Enter your email and phone number to reset your password</p>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />

        <input
          type="tel"
          placeholder="Enter your phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          placeholder="Enter new password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="login-input"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="login-input"
        />

        <button 
          onClick={handleResetPassword} 
          className="login-btn"
          disabled={loading}
          style={{
            opacity: loading ? 0.6 : 1,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <p className="login-footer">
          Remember your password? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
