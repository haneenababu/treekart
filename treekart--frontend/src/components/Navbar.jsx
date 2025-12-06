import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("user"); // Clear user info
    navigate("/login"); // Redirect to login page
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-success">
      <div className="container">
        <Link className="navbar-brand" to="/">🌳 Rent-A-Tree</Link>
        <div className="collapse navbar-collapse">
          <ul className="navbar-nav ms-auto">
            {!user ? (
              <li className="nav-item">
                <Link className="btn btn-light" to="/login">Login</Link>
              </li>
            ) : (
              <>
                <li className="nav-item nav-link">{user.role.toUpperCase()}</li>
                <li className="nav-item">
                  <button
                    className="btn"
                    onClick={logout}
                    style={{
                      background: '#8b0000',
                      color: '#fff',
                      border: 'none',
                      padding: '8px 14px',
                      borderRadius: '6px',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#a40000';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#8b0000';
                    }}
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}
