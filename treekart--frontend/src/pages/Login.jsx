import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { validateEmail, validatePassword, showValidationErrors } from "../utils/validation";
import "./LoginPage.css";


export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    if (token && user) {
      navigate(`/${user.role}`);
    }
  }, [navigate]);

  const handleLogin = async () => {
    // Validation
    const errors = {
      email: validateEmail(email),
      password: validatePassword(password)
    };

    if (showValidationErrors(errors)) return;

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", { email, password });
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      onLogin(user.role);

      navigate(`/${user.role}`);
    } catch (err) {
      alert("❌ " + (err.response?.data?.message || "Login failed!"));
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
        <h2 className="login-title">Welcome Back 🌿</h2>
        <p className="login-subtitle">Login to continue your journey</p>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="login-input"
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="login-input"
        />

        <button onClick={handleLogin} className="login-btn">
          Login
        </button>

        <p className="login-footer" style={{marginTop: '10px', marginBottom: '5px'}}>
          <Link to="/forgot-password" style={{color: '#4caf50', textDecoration: 'none'}}>
            Forgot Password?
          </Link>
        </p>

        <p className="login-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
