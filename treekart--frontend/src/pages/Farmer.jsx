import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Farmer.css";
import { validateRequired, validateNumber, validatePhone, validatePhoneOptional, showValidationErrors } from "../utils/validation";

export default function Farmer() {
  const [trees, setTrees] = useState([]);
  const [treeData, setTreeData] = useState({
    name: "",
    description: "",
    expectedRent: "",
    treeCount: "",
    rateValue: "",
    leaseDuration: "",
    image: null,
    farmerName: "",
    farmerPhone: "",
    farmerAlternativePhone: "",
    farmerEmail: "",
    location: ""
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [selectedTreeForBids, setSelectedTreeForBids] = useState(null);
  const [bids, setBids] = useState([]);

  // ---------------- Fetch trees from backend ----------------
  const fetchTrees = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      console.log("👤 User from localStorage:", user);
      
      const farmerPhone = treeData.farmerPhone || user?.phone || "";
      
      console.log("🔵 Fetching trees for farmer phone:", farmerPhone);
      console.log("treeData.farmerPhone:", treeData.farmerPhone);
      console.log("user?.phone:", user?.phone);
      
      // Fetch all trees for this farmer with bids
      if (farmerPhone) {
        const res = await axios.get(`http://localhost:5000/api/bids/farmer/${farmerPhone}/trees`);
        console.log("✅ Fetched trees (with bids):", res.data.length);
        console.log("Trees by status:", {
          available: res.data.filter(t => t.status === "available").length,
          pending: res.data.filter(t => t.status === "pending").length,
          booked: res.data.filter(t => t.status === "booked").length,
          sold: res.data.filter(t => t.status === "sold").length
        });
        setTrees(res.data);
      } else {
        console.log("⚠️ No farmer phone found, fetching all trees");
        const res = await axios.get("http://localhost:5000/api/trees");
        console.log("✅ Fetched all trees:", res.data.length);
        setTrees(res.data);
      }
    } catch (err) {
      console.error("❌ Error fetching trees:", err.response?.data || err.message);
    }
  };

  // ---------------- Fetch bids for a specific tree ----------------
  const fetchBidsForTree = async (treeId) => {
    try {
      console.log("🔵 Fetching bids for tree:", treeId);
      const res = await axios.get(`http://localhost:5000/api/bids/tree/${treeId}`);
      console.log("✅ Fetched bids:", res.data.length, "bids");
      console.log("Bids data:", res.data);
      setBids(res.data);
    } catch (err) {
      console.error("❌ Error fetching bids:", err.response?.data || err.message);
    }
  };

  // ---------------- Accept a bid ----------------
  const handleAcceptBid = async (bidId) => {
    try {
      console.log("🔵 Accepting bid:", bidId);
      const response = await axios.put(`http://localhost:5000/api/bids/accept/${bidId}`);
      console.log("✅ Bid acceptance response:", response.data);
      
      alert("✅ Bid accepted successfully! Tree is now booked.");
      
      // Close the modal
      setSelectedTreeForBids(null);
      setBids([]);
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh trees to show updated status
      console.log("🔄 Refreshing trees...");
      await fetchTrees();
      
      // Switch to bids tab (pending payment) to show the result
      setActiveTab("bids");
    } catch (err) {
      console.error("❌ Error accepting bid:", err.response?.data || err.message);
      alert("Failed to accept bid!");
    }
  };

  // ---------------- Reject a bid ----------------
  const handleRejectBid = async (bidId) => {
    try {
      await axios.put(`http://localhost:5000/api/bids/reject/${bidId}`);
      alert("❌ Bid rejected!");
      if (selectedTreeForBids) {
        fetchBidsForTree(selectedTreeForBids._id);
      }
    } catch (err) {
      console.error("Error rejecting bid:", err.response?.data || err.message);
      alert("Failed to reject bid!");
    }
  };

  useEffect(() => {
    // Auto-populate farmer details from logged in user
    const user = JSON.parse(localStorage.getItem("user"));
    console.log("👤 Logged in user:", user);
    
    if (user && user.phone) {
      console.log("✅ Setting farmer details from user");
      setTreeData(prev => ({
        ...prev,
        farmerName: user.name || "",
        farmerPhone: user.phone || "",
        farmerEmail: user.email || ""
      }));
      
      // Fetch trees immediately after setting phone
      setTimeout(() => {
        console.log("🔄 Fetching trees after user load");
        fetchTrees();
      }, 100);
    } else {
      console.log("⚠️ No user or phone found in localStorage");
      // Still try to fetch trees
      fetchTrees();
    }
  }, []);

  useEffect(() => {
    if (treeData.farmerPhone) {
      console.log("📞 Farmer phone changed, fetching trees");
      fetchTrees();
    }
  }, [treeData.farmerPhone]);

  // Auto-calc expectedRent based on number of trees and rate
  useEffect(() => {
    const count = Number(treeData.treeCount) || 0;
    const rate = Number(treeData.rateValue) || 0;
    if (count > 0 && rate > 0) {
      const total = count * rate;
      setTreeData(prev => ({ ...prev, expectedRent: String(total) }));
    } else if (!treeData.rateValue || !treeData.treeCount) {
      setTreeData(prev => ({ ...prev, expectedRent: (prev.rateValue || prev.treeCount) ? "" : prev.expectedRent }));
    }
  }, [treeData.treeCount, treeData.rateValue]);

  // ---------------- Handlers ----------------
  const handleChange = (e) =>
    setTreeData({ ...treeData, [e.target.name]: e.target.value });

  const handleImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setUploadError("");
      setUploadingImage(true);

      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET; // unsigned preset

      if (!cloudName || !uploadPreset) {
        throw new Error("Missing Cloudinary config. Set REACT_APP_CLOUDINARY_CLOUD_NAME and REACT_APP_CLOUDINARY_UPLOAD_PRESET in .env");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Cloudinary upload failed (${res.status}): ${errText}`);
      }

      const data = await res.json();
      // Save secure URL returned by Cloudinary
      setTreeData(prev => ({ ...prev, image: data.secure_url }));
    } catch (err) {
      console.error("Image upload error:", err);
      setUploadError(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {
      name: validateRequired(treeData.name, "Tree name"),
      description: validateRequired(treeData.description, "Description"),
      expectedRent: validateNumber(treeData.expectedRent, "Expected rent", 1),
      leaseDuration: validateNumber(treeData.leaseDuration, "Lease duration", 1),
      farmerName: validateRequired(treeData.farmerName, "Farmer name"),
      farmerPhone: validatePhone(treeData.farmerPhone),
      farmerAlternativePhone: validatePhoneOptional(treeData.farmerAlternativePhone),
      location: validateRequired(treeData.location, "Location")
    };

    if (showValidationErrors(errors)) return;

    try {
      const payload = { 
        ...treeData, 
        expectedRent: Number(treeData.expectedRent),
        leaseDuration: Number(treeData.leaseDuration)
      };
      const res = await axios.post("http://localhost:5000/api/trees", payload, {
        headers: { "Content-Type": "application/json" }
      });

      // Update frontend state
      setTrees([...trees, res.data.tree]);

      // Reset form (preserve identity fields from current state)
      setTreeData({
        name: "",
        description: "",
        expectedRent: "",
        treeCount: "",
        rateValue: "",
        leaseDuration: "",
        image: null,
        farmerName: treeData.farmerName,
        farmerPhone: treeData.farmerPhone,
        farmerAlternativePhone: "",
        farmerEmail: treeData.farmerEmail,
        location: ""
      });
      setActiveTab("available");
      alert("Tree posted successfully!");
    } catch (err) {
      console.error("Error posting tree:", err.response?.data || err.message);
      alert(err.response?.data?.message || "Failed to post tree!");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/trees/${id}`);
      setTrees(trees.filter((t) => t._id !== id));
    } catch (err) {
      console.error("Error deleting tree:", err.response?.data || err.message);
    }
  };

  // ---------------- Mark tree as sold ----------------
  const handleMarkAsSold = async (id) => {
    try {
      const confirmed = window.confirm("Mark this tree as SOLD? This will move it to the Sold tab.");
      if (!confirmed) return;

      console.log("🔵 Marking tree as sold:", id);
      const response = await axios.put(`http://localhost:5000/api/trees/${id}/mark-sold`);
      console.log("✅ Response:", response.data);
      
      alert("✅ Tree marked as sold!");
      
      // Refresh trees
      await fetchTrees();
      
      // Switch to sold tab
      setActiveTab("sold");
    } catch (err) {
      console.error("❌ Error marking tree as sold:", err);
      console.error("Error details:", err.response?.data || err.message);
      alert(`Failed to mark tree as sold! ${err.response?.data?.message || err.message}`);
    }
  };

  // ---------------- Tree Categories ----------------
  // Available tab: only available trees with no bids
  const availableTrees = trees.filter((t) => t.status === "available" && !(Array.isArray(t.bids) && t.bids.length > 0));
  // Bids tab: trees with accepted bid awaiting payment (pending) OR available trees that already have at least one bid
  const bidsTrees = trees.filter((t) => t.status === "pending" || (t.status === "available" && Array.isArray(t.bids) && t.bids.length > 0));
  const bookedTrees = trees.filter((t) => t.status === "booked");
  const soldTrees = trees.filter((t) => t.status === "sold");

  console.log("🌳 Current trees state:", {
    total: trees.length,
    available: availableTrees.length,
    booked: bookedTrees.length,
    sold: soldTrees.length,
    allTrees: trees.map(t => ({ name: t.name, status: t.status }))
  });
  // ---------------- Render ----------------
  return (
    <div className="farmer-container">
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', padding: '20px 30px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(141, 182, 0, 0.3)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '15px', backdropFilter: 'blur(10px)'}}>
            <span style={{fontSize: '2.5rem'}}></span>
          </div>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              margin: 0,
              fontFamily: 'Poppins, sans-serif',
              letterSpacing: '-0.5px',
              color: 'white'
            }}>TreeKart Farmer</h1>
            <p style={{margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: '500'}}>Manage your tree listings</p>
          </div>
        </div>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)'}}>
          <span style={{color: 'white', fontSize: '0.9rem', fontWeight: '600'}}>{treeData.farmerName || 'Farmer'}</span>
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap'}}>
        {[
          {key: "postTree", label: "Post Tree", color: "var(--primary)"},
          {key: "available", label: "Available", color: "#a6c400", count: availableTrees.length},
          {key: "bids", label: "Bids", color: "#ffb300", count: bidsTrees.length},
          {key: "booked", label: "Booked", color: "#ff9800", count: bookedTrees.length},
          {key: "sold", label: "Sold", color: "#4caf50", count: soldTrees.length},
          {key: "profile", label: "Profile", color: "#667eea"}
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === tab.key ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
              color: activeTab === tab.key ? 'white' : '#666',
              fontWeight: '700',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: activeTab === tab.key ? '0 8px 20px rgba(27, 94, 32, 0.25)' : '0 2px 8px rgba(0,0,0,0.08)',
              transform: activeTab === tab.key ? 'translateY(-2px)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.transform = 'none';
              }
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                marginLeft: '8px',
                background: activeTab === tab.key ? 'rgba(255,255,255,0.3)' : '#cbd5e1',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: '800'
              }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Tab Content ---- */}
      <div className="tab-content">
        {activeTab === "" && (
          <div style={{
            position: 'relative',
            minHeight: '60vh',
            padding: '42px 28px',
            borderRadius: '22px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, var(--primary) 0%, #2e7d32 35%, var(--accent) 100%)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(1000px 300px at -10% -20%, rgba(255,255,255,0.12), transparent 60%), radial-gradient(900px 280px at 110% 120%, rgba(255,255,255,0.10), transparent 60%)'
            }} />
            <div style={{
              position: 'relative',
              maxWidth: 820,
              width: '100%',
              margin: '0 auto',
              padding: '40px 32px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.86)',
              border: '1px solid rgba(226,232,240,0.9)',
              boxShadow: '0 14px 40px rgba(0,0,0,0.12)',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: 0,
                fontWeight: 900,
                letterSpacing: 0.3,
                fontSize: '2rem',
                color: 'var(--text-dark)'
              }}>Welcome to TreeKart Farmer</h3>
              <p style={{
                margin: '14px 0 0 0',
                color: '#2e7d32',
                fontWeight: 600
              }}>Select a tab above to continue</p>
            </div>
          </div>
        )}
        {/* Post Tree Form Tab */}
        {activeTab === "postTree" && (
          <div style={{
            background: 'linear-gradient(135deg, #f7ffb3 0%, var(--bitter-lemon) 100%)',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            marginTop: '20px'
          }}>
            <h3 style={{
              color: 'var(--text-dark)',
              marginBottom: '20px',
              fontSize: '1.5rem',
              fontWeight: '700',
              textAlign: 'center'
            }}>Post Your Tree for Lease</h3>
            
            <form className="tree-form" onSubmit={handleSubmit} style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px'
            }}>
          <div style={{gridColumn: '1 / -1'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: '#2e7d32'}}>
              Tree Name *
            </label>
            <select
              name="name"
              value={treeData.name}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s',
                background: 'white'
              }}
            >
              <option value="" disabled>Select a tree</option>
              <option value="Mango">Mango</option>
              <option value="Rambutan">Rambutan</option>
              <option value="Mangosteen">Mangosteen</option>
            </select>
          </div>

          <div style={{gridColumn: '1 / -1'}}>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Description
            </label>
            <textarea
              name="description"
              placeholder="Describe your tree (age, type, condition, etc.)"
              value={treeData.description}
              onChange={handleChange}
              rows="3"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Number of Trees *
            </label>
            <input
              name="treeCount"
              type="number"
              min="1"
              placeholder="e.g., 10"
              value={treeData.treeCount}
              onChange={(e) => setTreeData({ ...treeData, treeCount: e.target.value.replace(/[^0-9]/g, '') })}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Rate (₹) *
            </label>
            <input
              name="rateValue"
              type="number"
              min="1"
              placeholder={'Rate per tree'}
              value={treeData.rateValue}
              onChange={(e) => setTreeData({ ...treeData, rateValue: e.target.value.replace(/[^0-9]/g, '') })}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Expected Rate (₹)
            </label>
            <input
              name="expectedRent"
              type="number"
              placeholder="Auto-calculated"
              value={treeData.expectedRent}
              readOnly
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none',
                background: '#f8f9fa'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Lease Duration (months) *
            </label>
            <input
              name="leaseDuration"
              type="number"
              placeholder="e.g., 12"
              value={treeData.leaseDuration}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Your Name
            </label>
            <input
              name="farmerName"
              placeholder="Farmer Name"
              value={treeData.farmerName}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Phone Number *
            </label>
            <input
              name="farmerPhone"
              type="tel"
              placeholder="10 digits"
              value={treeData.farmerPhone}
              readOnly
              maxLength="10"
              required
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Alternative Phone
            </label>
            <input
              name="farmerAlternativePhone"
              type="tel"
              placeholder="Optional"
              value={treeData.farmerAlternativePhone}
              onChange={(e) => setTreeData({ ...treeData, farmerAlternativePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              maxLength="10"
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Email
            </label>
            <input
              name="farmerEmail"
              type="email"
              placeholder="your@email.com"
              value={treeData.farmerEmail}
              readOnly
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Location
            </label>
            <input
              name="location"
              placeholder="City, State"
              value={treeData.location}
              onChange={handleChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #4caf50',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text-dark)'}}>
              Tree Image
            </label>
            <input 
              type="file" 
              onChange={handleImageChange}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid var(--primary)',
                borderRadius: '10px',
                fontSize: '1rem',
                outline: 'none',
                background: 'white'
              }}
            />
            {uploadingImage && (
              <p style={{ marginTop: '8px', color: '#2e7d32', fontWeight: 600 }}>Uploading image…</p>
            )}
            {uploadError && (
              <p style={{ marginTop: '8px', color: '#d32f2f', fontWeight: 600 }}>Upload failed: {uploadError}</p>
            )}
            {treeData.image && (
              <div style={{ marginTop: '10px' }}>
                <img
                  src={treeData.image}
                  alt="Tree preview"
                  style={{
                    width: '100%',
                    height: '320px',
                    objectFit: 'contain',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{gridColumn: '1 / -1', marginTop: '10px'}}>
            <button 
              type="submit"
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, var(--primary), #a6c400)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(141, 182, 0, 0.3)',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--btn-hover), var(--primary))';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(141, 182, 0, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary), #a6c400)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(141, 182, 0, 0.3)';
              }}
            >
              Post Tree for Lease
            </button>
          </div>
        </form>
          </div>
        )}

        {/* Available Trees Tab */}
        {activeTab === "available" && (
          <TreeList 
            trees={availableTrees} 
            status="available" 
            onViewBids={(tree) => {
              setSelectedTreeForBids(tree);
              fetchBidsForTree(tree._id);
            }}
            handleDelete={handleDelete}
          />
        )}
        {activeTab === "bids" && (
          <TreeList 
            trees={bidsTrees} 
            status="pending" 
            onViewBids={(tree) => {
              setSelectedTreeForBids(tree);
              fetchBidsForTree(tree._id);
            }}
            handleDelete={handleDelete}
          />
        )}
        {activeTab === "booked" && (
          <TreeList trees={bookedTrees} status="booked" onMarkAsSold={handleMarkAsSold} />
        )}
        {activeTab === "sold" && (
          <TreeList trees={soldTrees} status="sold" />
        )}
      </div>

      {/* ---- Bids Modal ---- */}
      {selectedTreeForBids && (
        <div className="bids-modal">
          <div className="bids-modal-content">
            <h3>💰 Auction Bids for: {selectedTreeForBids.name}</h3>
            <button 
              className="close-btn" 
              onClick={() => {
                setSelectedTreeForBids(null);
                setBids([]);
              }}
            >
              ✖ Close
            </button>
            
            {bids.length > 0 ? (
              <div>
                <p className="bids-info" style={{textAlign: 'center', padding: '15px', background: '#e8f5e9', borderRadius: '8px', marginBottom: '20px', fontWeight: 'bold'}}>
                  📈 Total Bids: {bids.length} | Highest Bid: ₹{Math.max(...bids.map(b => b.proposedPrice))}
                </p>
                
                <table className="table table-bordered table-striped">
                  <thead className="table-dark">
                    <tr>
                      <th>Position</th>
                      <th>Vendor Name</th>
                      <th>Phone</th>
                      <th>Email</th>
                      <th>Location</th>
                      <th>Proposed Price (₹)</th>
                      <th>Bid Date</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids
                      .sort((a, b) => b.proposedPrice - a.proposedPrice)
                      .map((bid, index) => (
                        <tr key={bid._id} style={{background: index === 0 && bid.status === "pending" ? '#fff3e0' : 'inherit'}}>
                          <td>
                            <span style={{fontWeight: '700'}}>
                              {index === 0 ? 'Top Bid' : (index === 1 ? '2nd' : (index === 2 ? '3rd' : `${index + 1}th`))}
                            </span>
                          </td>
                          <td><strong>{bid.vendorName}</strong></td>
                          <td>{bid.vendorPhone}</td>
                          <td>{bid.vendorEmail || 'N/A'}</td>
                          <td>{bid.vendorLocation || 'N/A'}</td>
                          <td>
                            <strong style={{
                              color: index === 0 ? '#ff6f00' : '#4caf50',
                              fontSize: '1.1rem'
                            }}>
                              ₹{bid.proposedPrice}
                            </strong>
                          </td>
                          <td>{bid.createdAt ? new Date(bid.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</td>
                          <td>{bid.message || '-'}</td>
                          <td>
                            <span className={`badge ${
                              bid.status === 'accepted' ? 'bg-success' : 
                              bid.status === 'pending' ? 'bg-warning' : 
                              'bg-danger'
                            }`}>
                              {bid.status === "accepted" && "✅ Accepted"}
                              {bid.status === "pending" && "⏳ Pending"}
                              {bid.status === "rejected" && "❌ Rejected"}
                            </span>
                          </td>
                          <td>
                            {bid.status === "pending" ? (
                              <div style={{display: 'flex', gap: '5px'}}>
                                <button 
                                  onClick={() => {
                                    if (window.confirm(`Accept bid of ₹${bid.proposedPrice} from ${bid.vendorName}? This will reject all other bids.`)) {
                                      handleAcceptBid(bid._id);
                                    }
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#4caf50',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ✅ Accept
                                </button>
                                <button 
                                  onClick={() => handleRejectBid(bid._id)}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#f44336',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  ❌ Reject
                                </button>
                              </div>
                            ) : bid.status === "accepted" ? (
                              <span style={{color: '#4caf50', fontWeight: 'bold', fontSize: '0.9rem'}}>
                                ✅ Accepted
                              </span>
                            ) : (
                              <span style={{color: '#999', fontSize: '0.9rem'}}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{textAlign: 'center', padding: '40px', color: '#666'}}>
                No bids yet for this tree. Vendors can submit bids from their dashboard.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div style={{
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
          marginTop: '20px',
          maxWidth: '700px',
          margin: '20px auto'
        }}>
          <h3 style={{
            color: '#2e7d32',
            marginBottom: '25px',
            fontSize: '1.8rem',
            fontWeight: '700',
            textAlign: 'center'
          }}>Farmer Profile</h3>

          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{marginBottom: '20px', borderBottom: '2px solid #e8f5e9', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Name</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#2e7d32'}}>
                    {treeData.farmerName || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '20px', borderBottom: '2px solid #e8f5e9', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Phone Number</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#2e7d32'}}>
                    {treeData.farmerPhone || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '20px', borderBottom: '2px solid #e8f5e9', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Email</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#2e7d32'}}>
                    {treeData.farmerEmail || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('reports')}
              style={{
                width: '100%',
                padding: '15px',
                background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
                transition: 'all 0.3s',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #388e3c, #4caf50)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(76, 175, 80, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4caf50, #66bb6a)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
              }}
            >
              <span style={{fontSize: '1.3rem'}}></span>
              View Reports
            </button>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div style={{
          marginTop: '20px'
        }}>
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #a5d6a7, #81c784)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.3)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #81c784, #66bb6a)';
              e.currentTarget.style.transform = 'translateX(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #a5d6a7, #81c784)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <span style={{fontSize: '1.2rem'}}>←</span>
            Back to Profile
          </button>
          <h3 style={{textAlign: 'center', marginBottom: '25px', color: '#2e7d32'}}>Monthly Sales Report</h3>
          
          {/* Trees Sold Report */}
          <div style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{color: '#2e7d32', marginBottom: '20px'}}>Trees Sold - Summary</h4>
            
            <table className="table table-bordered table-striped" style={{background: 'white'}}>
              <thead className="table-dark">
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Total Revenue (₹)</th>
                  <th>Average Price (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge bg-success">Available Trees</span></td>
                  <td>{availableTrees.length}</td>
                  <td><strong style={{color: '#666'}}>₹{availableTrees.reduce((sum, t) => sum + (t.expectedRent || 0), 0).toLocaleString()}</strong></td>
                  <td>₹{availableTrees.length > 0 ? Math.round(availableTrees.reduce((sum, t) => sum + (t.expectedRent || 0), 0) / availableTrees.length).toLocaleString() : 0}</td>
                </tr>
                <tr>
                  <td><span className="badge bg-primary">Booked Trees</span></td>
                  <td>{bookedTrees.length}</td>
                  <td><strong style={{color: '#2196F3'}}>₹{bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0).toLocaleString()}</strong></td>
                  <td>₹{bookedTrees.length > 0 ? Math.round(bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0) / bookedTrees.length).toLocaleString() : 0}</td>
                </tr>
                <tr>
                  <td><span className="badge bg-success">Sold Trees</span></td>
                  <td>{soldTrees.length}</td>
                  <td><strong style={{color: '#4caf50'}}>₹{soldTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0).toLocaleString()}</strong></td>
                  <td>₹{soldTrees.length > 0 ? Math.round(soldTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0) / soldTrees.length).toLocaleString() : 0}</td>
                </tr>
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <th>Total Trees</th>
                  <th>{availableTrees.length + bookedTrees.length + soldTrees.length}</th>
                  <th>
                    <strong style={{color: '#4caf50'}}>
                      ₹{(bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0) + soldTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0)).toLocaleString()}
                    </strong>
                  </th>
                  <th>-</th>
                </tr>
              </tfoot>
            </table>

            <div style={{marginTop: '20px', padding: '15px', background: 'white', borderRadius: '10px'}}>
              <h5 style={{color: '#2e7d32', marginBottom: '15px'}}>Performance Metrics</h5>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px'}}>
                <div style={{padding: '15px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>Total Posted</p>
                  <p style={{margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#2e7d32'}}>
                    {trees.length}
                  </p>
                </div>
                <div style={{padding: '15px', background: '#e8f5e9', borderRadius: '8px', textAlign: 'center'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>Booking Rate</p>
                  <p style={{margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#2e7d32'}}>
                    {trees.length > 0 ? Math.round(((bookedTrees.length + soldTrees.length) / trees.length) * 100) : 0}%
                  </p>
                </div>
                <div style={{padding: '15px', background: '#fff3e0', borderRadius: '8px', textAlign: 'center'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>Avg. Bid Price</p>
                  <p style={{margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800'}}>
                    ₹{(bookedTrees.length + soldTrees.length) > 0 ? Math.round((bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0) + soldTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0)) / (bookedTrees.length + soldTrees.length)).toLocaleString() : 0}
                  </p>
                </div>
                <div style={{padding: '15px', background: '#f3e5f5', borderRadius: '8px', textAlign: 'center'}}>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#666'}}>Completion Rate</p>
                  <p style={{margin: '5px 0 0 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#9c27b0'}}>
                    {(bookedTrees.length + soldTrees.length) > 0 ? Math.round((soldTrees.length / (bookedTrees.length + soldTrees.length)) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- TreeList Component ----------------
function TreeList({ trees, status, handleDelete, onViewBids, onMarkAsSold }) {
  if (!trees.length) return <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No {status} trees yet.</p>;

  // For booked and sold trees, use table format
  if (status === "booked" || status === "sold") {
    return (
      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>Tree Name</th>
            <th>Location</th>
            <th>Posted On</th>
            <th>Expected Rate (₹)</th>
            <th>No. of Trees</th>
            <th>Rate (₹)</th>
            <th>Accepted Price (₹)</th>
            <th>Lease Duration</th>
            <th>Vendor Name</th>
            <th>Vendor Phone</th>
            <th>Vendor Email</th>
            <th>Status</th>
            {status === "booked" && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {trees.map((tree, index) => (
            <tr key={tree._id}>
              <td>{index + 1}</td>
              <td><strong>{tree.name}</strong></td>
              <td>{tree.location || 'N/A'}</td>
              <td>{tree.createdAt ? new Date(tree.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</td>
              <td>₹{tree.expectedRent}</td>
              <td>{tree.treeCount || '-'}</td>
              <td>{tree.rateValue ? `₹${tree.rateValue}` : '-'}</td>
              <td><strong style={{color: '#4caf50'}}>₹{tree.acceptedPrice || 'N/A'}</strong></td>
              <td>{tree.leaseDuration} months</td>
              <td>{tree.bookedBy || 'N/A'}</td>
              <td>{tree.vendorPhone || 'N/A'}</td>
              <td>{tree.vendorEmail || 'N/A'}</td>
              <td>
                <span className={`badge ${status === 'booked' ? 'bg-primary' : 'bg-danger'}`}>
                  {status === 'booked' ? 'Booked' : 'Sold'}
                </span>
              </td>
              {status === "booked" && onMarkAsSold && (
                <td>
                  <button 
                    onClick={() => onMarkAsSold(tree._id)} 
                    style={{
                      background: '#ff9800',
                      color: 'white',
                      padding: '6px 12px',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                  >
                    Mark as Sold
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // For available trees, use compact card format like customer fruits page
  return (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '10px', marginTop: '12px', padding: '6px'}}>
      {trees.map((tree) => (
        <div key={tree._id} style={{background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.08)', overflow: 'hidden', transition: 'all 0.25s ease', border: 'none', position: 'relative'}} onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 10px 18px rgba(76, 175, 80, 0.22)';
        }} onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 6px 14px rgba(0,0,0,0.1)';
        }}>
          <div style={{background: 'transparent', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.4rem', position: 'relative', overflow: 'hidden'}}>
            {tree.image ? (
              <img 
                src={tree.image} 
                alt={tree.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  background: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            ) : (
              <span></span>
            )}
          </div>
          {typeof tree.expectedRent !== 'undefined' && tree.expectedRent !== null && (
            <div style={{padding: '0 10px 6px 10px'}}>
              <div style={{background: 'linear-gradient(135deg, var(--primary), #a6c400)', color: 'white', padding: '4px 8px', borderRadius: '14px', fontSize: '0.9rem', fontWeight: '700', display: 'inline-block', marginTop: '6px', boxShadow: '0 2px 6px rgba(141, 182, 0, 0.2)'}}>
                ₹{tree.expectedRent}
              </div>
            </div>
          )}
          <div style={{padding: '10px', textAlign: 'left'}}>
            <h5 style={{fontSize: '0.95rem', margin: '2px 0 6px 0', color: '#2e7d32', fontWeight: '700'}}>{tree.name}</h5>
            {tree.status === 'pending' && (
              <div style={{margin: '6px 0'}}>
                <span className="badge bg-warning text-dark">Payment Pending</span>
                {tree.paymentDueAt && (
                  <small style={{marginLeft: 8, color: '#666'}}>Due by {new Date(tree.paymentDueAt).toLocaleString()}</small>
                )}
              </div>
            )}

            <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
              <strong>Posted On:</strong>
              <span>{tree.createdAt ? new Date(tree.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
            </p>
            
            <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
              <strong>Farmer:</strong>
              <span>{tree.farmerName || 'N/A'}</span>
            </p>
            <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
              <strong>Phone:</strong>
              <span>{tree.farmerPhone || 'N/A'}</span>
            </p>
            
            <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
              <strong>Location:</strong>
              <span>{tree.location || 'N/A'}</span>
            </p>
            
            {tree.treeCount && (
              <p style={{margin: '2px 0', fontSize: '0.84rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
                <strong>No. of Trees:</strong>
                <span>{tree.treeCount}</span>
              </p>
            )}
            {tree.rateValue && (
              <p style={{margin: '2px 0', fontSize: '0.84rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
                <strong>Per Tree Rate:</strong>
                <span>₹{tree.rateValue}</span>
              </p>
            )}

            <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
              <strong>Duration:</strong>
              <span>{tree.leaseDuration} months</span>
            </p>
            
            {tree.bids && tree.bids.length > 0 && (
              <p style={{margin: '4px 0', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between'}}>
                <strong>Bids:</strong>
                <span style={{color: '#ff6f00', fontWeight: 'bold'}}>
                  {tree.bids.length} received
                </span>
              </p>
            )}
            
            {tree.description && (
              <p style={{margin: '6px 0', fontSize: '0.82rem', color: '#666', fontStyle: 'italic', borderLeft: '3px solid #4caf50', paddingLeft: '6px'}}>
                {tree.description.length > 80 ? tree.description.substring(0, 80) + '...' : tree.description}
              </p>
            )}
            
            <div style={{display: 'flex', gap: '6px', marginTop: '8px'}}>
              {onViewBids && (
                <button
                  onClick={() => onViewBids(tree)}
                  style={{flex: 1, background: 'linear-gradient(135deg, var(--primary), #a6c400)', color: 'white', padding: '8px 10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '700', transition: 'all 0.25s ease', boxShadow: '0 2px 8px rgba(141, 182, 0, 0.22)'}} onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, var(--btn-hover), var(--primary))';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary), #a6c400)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  View Bids {tree.bids && tree.bids.length > 0 && `(${tree.bids.length})`}
                </button>
              )}
              
              {handleDelete && (
                <button
                  onClick={() => handleDelete(tree._id)}
                  style={{background: 'linear-gradient(135deg, #f44336, #e57373)', color: 'white', padding: '8px 10px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', fontWeight: '700', transition: 'all 0.25s ease', boxShadow: '0 2px 8px rgba(244, 67, 54, 0.22)'}} onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #d32f2f, #f44336)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }} onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #f44336, #e57373)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
