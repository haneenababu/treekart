import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "./LoginPage.css";
import { validateEmail, validatePassword, validatePhone, showValidationErrors } from "../utils/validation";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (token && user) {
      navigate(`/${user.role}`);
    }
  }, [navigate]);

  const handleRegister = async () => {
    // Validation
    const errors = {
      name: name.trim() ? null : "Name is required",
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword: !confirmPassword ? "Please confirm your password" : 
                       password !== confirmPassword ? "Passwords do not match" : null,
      role: !role ? "Please select a role" : null
    };

    if (showValidationErrors(errors)) return;

    try {
      const res = await axios.post("http://localhost:5000/api/auth/register", { 
        name,
        email, 
        password, 
        role,
        phone 
      });
      alert("✅ " + (res.data.message || "Registration successful!"));
      navigate("/login");
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Registration failed!"));
    }
  };

  return (
    <div className="login-page">
      <nav className="login-navbar">
        <div className="logo">TreeKart</div>
        <div className="nav-links">
          <Link to="/">Home</Link>
        </div>
      </nav>

      <div className="login-card">
        <h2 className="login-title">Create an Account 🌱</h2>
        <p className="login-subtitle">Join TreeKart and start your journey</p>

        <input
          type="text"
          placeholder="Enter your full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="login-input"
          required
        />

        <input
          type="email"
          placeholder="Enter your email *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
          required
        />

        <input
          type="tel"
          placeholder="Enter your phone number (10 digits) *"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          className="login-input"
          maxLength="10"
          required
        />

        <input
          type="password"
          placeholder="Enter your password (min 6 characters) *"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
          required
        />

        <input
          type="password"
          placeholder="Confirm your password *"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="login-input"
          required
        />

        <select value={role} onChange={(e) => setRole(e.target.value)} className="login-input" required>
          <option value="customer">Customer</option>
          <option value="farmer">Farmer</option>
          <option value="vendor">Vendor</option>
        </select>

        <button onClick={handleRegister} className="login-btn">
          Register
        </button>

        <p className="login-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
