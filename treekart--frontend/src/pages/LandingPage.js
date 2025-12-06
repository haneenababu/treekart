// src/pages/LandingPage.js
import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="landing-navbar">
        <div className="container-max" style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div className="logo">🌳 TreeKart</div>
          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <button
              onClick={() => navigate("/register")}
              className="nav-signup-btn btn btn-primary"
              style={{
                borderRadius: 24,
                background: 'linear-gradient(135deg, var(--primary), #a6c400)',
                border: 'none',
                boxShadow: '0 4px 12px rgba(141, 182, 0, 0.28)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--btn-hover), var(--primary))';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary), #a6c400)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section section">
        <div className="hero-content container-max" style={{textAlign:'center'}}>
          <h1 className="hero-title heading-xl">Rent a Tree, Support a Farmer</h1>
          <p className="hero-subtitle text-muted" style={{maxWidth:720, margin:'0 auto'}}>
            Bid on trees, book fresh fruit harvests, and get farm-fresh produce delivered to your home. Join TreeKart to empower local farmers and make agriculture sustainable.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="btn btn-primary"
            style={{
              marginTop: 20,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--primary), #a6c400)',
              border: 'none',
              padding: '12px 20px',
              boxShadow: '0 4px 12px rgba(141, 182, 0, 0.28)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--btn-hover), var(--primary))';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary), #a6c400)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Sign In
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section section">
        <div className="container-max">
          <h2 className="section-title heading-lg" style={{textAlign:'center'}}>Why Choose TreeKart?</h2>
          <p className="section-subtitle text-muted" style={{textAlign:'center'}}>
            We bring you closer to nature while supporting farmers and delivering fresh fruits.
          </p>
          <div className="features-grid grid grid-auto">
            <div className="feature-card">
              <div className="feature-icon">🌳</div>
              <h3>Rent a Tree</h3>
              <p>Adopt trees and enjoy seasonal fruits directly from farms you support.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤝</div>
              <h3>Support Farmers</h3>
              <p>Empower local farmers with steady income and make agriculture sustainable.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🍎</div>
              <h3>Fresh Harvest</h3>
              <p>Get fresh, organic fruits delivered right to your doorstep from trusted farms.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Eco-Friendly</h3>
              <p>Contribute to a greener planet by planting and maintaining trees remotely.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section section section--alt">
        <div className="container-max">
          <h2 className="section-title heading-lg" style={{textAlign:'center'}}>About TreeKart</h2>
          <p className="about-text">
            TreeKart is a unique platform that connects farmers with customers who
            want to rent trees and enjoy their harvest. Together, we make farming
            profitable and sustainable while delivering healthy food to families.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer section">
        <div className="container-max">
          <div className="footer-content">
            <div className="footer-section">
              <h3>TreeKart</h3>
              <p>Connecting farmers with customers for a sustainable future.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <a href="#home">Home</a>
              <a href="#features">Features</a>
              <a href="#about">About</a>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>📧 support@treekart.com</p>
              <p>📞 8089405656</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© {new Date().getFullYear()} TreeKart. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
