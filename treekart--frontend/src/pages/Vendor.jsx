import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Vendor.css";
import "./Customer.css";
import { validateRequired, validateNumber, validatePhone, validatePhoneOptional, showValidationErrors } from "../utils/validation";

export default function Vendor() {
  const [activeTab, setActiveTab] = useState("");
  const [primaryTab, setPrimaryTab] = useState(""); // 'trees' | 'fruits'
  const [showSearchVendor, setShowSearchVendor] = useState(false);

  // Data states
  const [trees, setTrees] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [soldFruits, setSoldFruits] = useState([]);
  const [canceledFruits, setCanceledFruits] = useState([]);
  const [bookedFruits, setBookedFruits] = useState([]);
  // const [pendingBookings, setPendingBookings] = useState([]); // removed pending flow
  const [bookedTrees, setBookedTrees] = useState([]);
  const [completedTrees, setCompletedTrees] = useState([]);
  const [proposedPrice, setProposedPrice] = useState("");
  const [message, setMessage] = useState("");
  const [myBidsTab, setMyBidsTab] = useState('acceptedPending'); // 'acceptedPending' | 'pending' | 'rejected'

  // Booking & Form States
  const [selectedTree, setSelectedTree] = useState(null);
  const [vendorDetails, setVendorDetails] = useState({ 
    name: "",
    phone: "", 
    alternativePhone: "",
    email: "",
    address: "", 
    location: "",
    proposedPrice: "",
    message: ""
  });
  const [myBids, setMyBids] = useState([]);
  const [currentVendor, setCurrentVendor] = useState("");
  const [vendorPhone, setVendorPhone] = useState("");

  const [treeSearch, setTreeSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [treeTypeFilter, setTreeTypeFilter] = useState("");

  const [fruitForm, setFruitForm] = useState({
    name: "",
    price: "",
    quantity: "",
    image: null,
    description: "",
    vendor: "Vendor X"
  });

  const [uploadingFruitImage, setUploadingFruitImage] = useState(false);
  const [fruitUploadError, setFruitUploadError] = useState("");

  // State for increasing fruit quantity
  const [quantityToAdd, setQuantityToAdd] = useState({});

  // State for editing fruits
  const [editingFruit, setEditingFruit] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    quantity: ""
  });

  // Payment UI state
  const [paymentForBid, setPaymentForBid] = useState(null); // the bid being paid
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'UPI'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [txnIdInput, setTxnIdInput] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [upiError, setUpiError] = useState('');

  const isValidUpi = (v='') => {
    // Basic UPI VPA pattern: local-part@provider
    const re = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z]{2,64}$/;
    return re.test(String(v).trim());
  };

  // Fetch Available Trees from Farmer and set vendor phone from logged in user
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setCurrentVendor(user.email || "Vendor");
      // Automatically set vendor phone and details from logged in user
      if (user.phone) {
        setVendorPhone(user.phone);
        setVendorDetails(prev => ({
          ...prev,
          name: user.name || "",
          phone: user.phone || "",
          email: user.email || ""
        }));
      }
    }
    fetchAvailableTrees();
  }, []);

  // Fetch vendor's bids and booked trees when vendorPhone is set
  useEffect(() => {
    if (vendorPhone) {
      fetchMyBids();
      fetchBookedTrees();
      fetchCompletedTrees();
      fetchVendorFruits();
      fetchBookedFruits();
      fetchDeliveredFruits();
      fetchCanceledFruits();
    }
  }, [vendorPhone]);

  // Auto-refresh vendor fruits data every 15s
  useEffect(() => {
    if (!vendorPhone) return;
    const id = setInterval(() => {
      fetchVendorFruits();
      fetchBookedFruits();
      fetchDeliveredFruits();
      fetchCanceledFruits();
    }, 15000);
    return () => clearInterval(id);
  }, [vendorPhone]);

  const fetchAvailableTrees = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/trees?status=available");
      
      // If vendor has phone, filter out trees they've already bid on (pending/accepted only)
      if (vendorPhone && myBids.length > 0) {
        const pendingOrAcceptedBids = myBids.filter(bid => 
          bid.status === "pending" || bid.status === "accepted"
        );
        const bidTreeIds = pendingOrAcceptedBids.map(bid => bid.treeId?._id || bid.treeId);
        
        // Show only trees that don't have pending/accepted bids
        const filteredTrees = res.data.filter(tree => !bidTreeIds.includes(tree._id));
        setTrees(filteredTrees);
      } else {
        setTrees(res.data);
      }
    } catch (err) {
      console.error("❌ Error fetching trees:", err);
    }
  };

  // Fetch canceled bookings for vendor fruits
  const fetchCanceledFruits = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}`);
      const canceled = (res.data || []).filter(
        f => Array.isArray(f.bookings) && f.bookings.some(b => b.canceled || b.status === 'rejected')
      );
      setCanceledFruits(canceled);
    } catch (err) {
      console.error("❌ Error fetching canceled fruits:", err);
    }
  };

  // Delete a fruit
  const handleDeleteFruit = async (fruitId) => {
    try {
      const ok = window.confirm('Are you sure you want to delete this fruit? This cannot be undone.');
      if (!ok) return;
      await axios.delete(`http://localhost:5000/api/fruits/${fruitId}`);
      alert('Fruit deleted successfully');
      fetchVendorFruits();
    } catch (err) {
      console.error('Error deleting fruit:', err);
      alert(err.response?.data?.message || 'Failed to delete fruit');
    }
  };

  // Fetch vendor's bids
  const fetchMyBids = async () => {
    try {
      console.log("🔵 Fetching bids for vendor phone:", vendorPhone);
      const res = await axios.get(`http://localhost:5000/api/bids/vendor/${vendorPhone}`);
      console.log("✅ Fetched bids:", res.data.length);
      console.log("Bids data:", res.data);
      setMyBids(res.data);
      
      // After fetching bids, refresh available trees to filter correctly
      fetchAvailableTrees();
    } catch (err) {
      console.error("❌ Error fetching bids:", err.response?.data || err.message);
    }
  };

  // Fetch vendor's booked trees (only booked status)
  const fetchBookedTrees = async () => {
    try {
      console.log("🔵 Fetching booked trees for vendor phone:", vendorPhone);
      const res = await axios.get(`http://localhost:5000/api/bids/vendor/${vendorPhone}/booked-trees`);
      console.log(" Booked trees response:", res.data);
      console.log(" Number of booked trees:", res.data.length);
      
      // Backend already filters for booked status, no need to filter again
      setBookedTrees(res.data);
      
      // Log each tree's details for debugging
      res.data.forEach((tree, index) => {
        console.log(`Tree ${index + 1}:`, {
          name: tree.name,
          status: tree.status,
          bookedBy: tree.bookedBy,
          vendorPhone: tree.vendorPhone,
          acceptedPrice: tree.acceptedPrice,
          farmerName: tree.farmerName,
          farmerPhone: tree.farmerPhone
        });
      });
    } catch (err) {
      console.error("❌ Error fetching booked trees:", err);
      console.error("Error details:", err.response?.data || err.message);
    }
  };

  // Fetch vendor's completed/sold trees
  const fetchCompletedTrees = async () => {
    try {
      console.log("Fetching completed trees for vendor phone:", vendorPhone);
      const res = await axios.get(`http://localhost:5000/api/bids/vendor/${vendorPhone}/completed-trees`);
      console.log("Completed trees response:", res.data);
      setCompletedTrees(res.data);
    } catch (err) {
      console.error("Error fetching completed trees:", err);
    }
  };

  // Fetch vendor's posted fruits
  const fetchVendorFruits = async () => {
    try {
      console.log("Fetching vendor fruits for:", vendorPhone);
      const res = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}`);
      console.log("Fetched fruits:", res.data);
      // Only show available fruits in the post fruits tab
      const availableFruits = res.data.filter(f => f.status === 'available');
      setFruits(availableFruits);
    } catch (err) {
      console.error("Error fetching vendor fruits:", err);
    }
  };

  // Fetch vendor's pending bookings (need approval)
  // Removed pending bookings flow

  // Fetch vendor's approved bookings (ready for delivery)
  const fetchBookedFruits = async () => {
    try {
      console.log("🔵 Fetching approved bookings for vendor phone:", vendorPhone);
      const res = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}/approved`);
      console.log(" Approved bookings:", res.data);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setBookedFruits(res.data);
      } else {
        // Fallback: fetch all fruits for vendor and filter for approved, not delivered bookings
        console.log("⚠️ No approved bookings from endpoint, checking all vendor fruits as fallback...");
        const all = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}`);
        const withApproved = (all.data || []).filter(f =>
          Array.isArray(f.bookings) && f.bookings.some(b => b.status === 'approved' && !b.delivered)
        );
        console.log(" Fallback approved fruits count:", withApproved.length);
        setBookedFruits(withApproved);
      }
    } catch (err) {
      console.error("❌ Error fetching approved bookings:", err);
      try {
        // Last-resort fallback on error as well
        const all = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}`);
        const withApproved = (all.data || []).filter(f =>
          Array.isArray(f.bookings) && f.bookings.some(b => b.status === 'approved' && !b.delivered)
        );
        console.log("(Error path) Fallback approved fruits count:", withApproved.length);
        setBookedFruits(withApproved);
      } catch (e2) {
        console.error("❌ Fallback also failed:", e2);
      }
    }
  };

  // Fetch delivered fruits
  const fetchDeliveredFruits = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/fruits/vendor/${vendorPhone}`);
      const deliveredFruits = res.data.filter(f => 
        f.bookings && f.bookings.some(b => b.delivered)
      );
      setSoldFruits(deliveredFruits);
    } catch (err) {
      console.error("❌ Error fetching delivered fruits:", err);
    }
  };

  // Approve booking
  // Removed approval handler (auto-approved on purchase)

  // Reject booking
  // Removed reject handler

  // Mark booking as delivered
  const handleMarkDelivered = async (fruitId, bookingId) => {
    try {
      await axios.put(`http://localhost:5000/api/fruits/${fruitId}/booking/${bookingId}/deliver`);
      alert(' Marked as delivered!');
      fetchBookedFruits();
      fetchDeliveredFruits();
      setActiveTab('soldFruits');
    } catch (err) {
      console.error("Error marking as delivered:", err);
      alert(err.response?.data?.message || 'Failed to mark as delivered');
    }
  };

  // Submit Bid for a tree
  const handleSubmitBid = async () => {
    // Validation
    const errors = {
      name: validateRequired(vendorDetails.name, "Name"),
      phone: validatePhone(vendorDetails.phone),
      alternativePhone: validatePhoneOptional(vendorDetails.alternativePhone),
      proposedPrice: validateNumber(vendorDetails.proposedPrice, "Proposed price", 1),
      location: validateRequired(vendorDetails.location, "Location")
    };

    if (showValidationErrors(errors)) return;

    try {
      await axios.post(`http://localhost:5000/api/bids/submit`, {
        treeId: selectedTree._id,
        vendorName: vendorDetails.name,
        vendorPhone: vendorDetails.phone,
        vendorAlternativePhone: vendorDetails.alternativePhone,
        vendorEmail: vendorDetails.email,
        vendorAddress: vendorDetails.address,
        vendorLocation: vendorDetails.location,
        proposedPrice: Number(vendorDetails.proposedPrice),
        message: vendorDetails.message
      });

      alert(` Bid submitted successfully for "${selectedTree.name}"!`);
      
      // Remove the tree from available trees list
      setTrees(trees.filter(tree => tree._id !== selectedTree._id));
      
      setSelectedTree(null);
      // Reset only mutable fields; keep identity from logged-in user
      setVendorDetails(prev => ({ 
        ...prev,
        name: vendorDetails.name,
        phone: vendorDetails.phone,
        email: vendorDetails.email,
        alternativePhone: "",
        address: "", 
        location: "",
        proposedPrice: "",
        message: ""
      }));
      
      // Save vendor phone for future use
      if (vendorDetails.phone) {
        setVendorPhone(vendorDetails.phone);
      }
      
      // Refresh bids list
      fetchMyBids();
      setActiveTab('myBids');
      setMyBidsTab('pending');
    } catch (err) {
      console.error("Bid submission failed:", err);
      alert(err.response?.data?.message || "Bid submission failed. Check console for details.");
    }
  };

  // Post Fruits to database
  const vendorTag = (String((vendorDetails?.name || JSON.parse(localStorage.getItem("user"))?.name || "")).replace(/[^a-zA-Z]/g, '').slice(0,3).toUpperCase() || 'VDR');
  const fruitTag = (String(fruitForm?.name || '').replace(/[^a-zA-Z]/g,'').slice(0,2).toUpperCase() || 'FR');

  const handleFruitChange = (e) => {
    setFruitForm({ ...fruitForm, [e.target.name]: e.target.value });
  };

  const handleFruitImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      setFruitUploadError("");
      setUploadingFruitImage(true);

      const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
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
      setFruitForm(prev => ({ ...prev, image: data.secure_url }));
    } catch (err) {
      console.error("Fruit image upload error:", err);
      setFruitUploadError(err.message || "Failed to upload image");
    } finally {
      setUploadingFruitImage(false);
    }
  };

  const handlePostFruit = async (e) => {
    e.preventDefault();
    
    // Validation
    const errors = {
      name: validateRequired(fruitForm.name, "Fruit name"),
      price: validateNumber(fruitForm.price, "Price", 1),
      quantity: validateNumber(fruitForm.quantity, "Quantity", 1),
      vendorPhone: !vendorPhone ? "Please log in to post fruits" : null
    };

    if (showValidationErrors(errors)) return;

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const vendorName = user?.name || currentVendor || "Vendor";

      const fruitData = {
        name: fruitForm.name,
        vendor: vendorName,
        vendorName: vendorName, // Store actual vendor name
        vendorPhone: vendorPhone,
        price: Number(fruitForm.price),
        quantity: Number(fruitForm.quantity),
        image: fruitForm.image || null,
        description: fruitForm.description || ""
      };

      console.log("Posting fruit:", fruitData);
      const res = await axios.post("http://localhost:5000/api/fruits", fruitData);
      console.log("Response:", res.data);
      
      alert(`Fruit "${fruitForm.name}" posted successfully! Code: ${res?.data?.fruit?.fruitCode || 'generated'}`);
      
      // Reset form
      setFruitForm({ name: "", price: "", quantity: "", image: null, description: "", vendor: "Vendor X" });
      
      // Refresh fruits list
      fetchVendorFruits();
    } catch (err) {
      console.error("Error posting fruit:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      alert(err.response?.data?.message || err.message || "Failed to post fruit. Check console for details.");
    }
  };

  const handleSearch = () => setSearchQuery(treeSearch);

  // Handle increasing fruit quantity
  const handleIncreaseQuantity = async (fruitId) => {
    const addQuantity = quantityToAdd[fruitId];
    
    if (!addQuantity || addQuantity <= 0) {
      alert("⚠️ Please enter a valid quantity to add");
      return;
    }

    try {
      const res = await axios.patch(`http://localhost:5000/api/fruits/${fruitId}/increase-quantity`, {
        quantityToAdd: Number(addQuantity)
      });

      alert(` Successfully added ${addQuantity} kg to fruit quantity!`);
      
      // Clear the input for this fruit
      setQuantityToAdd(prev => ({ ...prev, [fruitId]: "" }));
      
      // Refresh fruits list
      fetchVendorFruits();
    } catch (err) {
      console.error("Error increasing quantity:", err);
      alert("❌ " + (err.response?.data?.message || "Failed to increase quantity!"));
    }
  };

  // Handle edit fruit - open edit mode
  const handleEditFruit = (fruit) => {
    setEditingFruit(fruit._id);
    setEditForm({
      name: fruit.name,
      price: fruit.price,
      quantity: fruit.quantity
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingFruit(null);
    setEditForm({
      name: "",
      price: "",
      quantity: ""
    });
  };

  // Handle update fruit
  const handleUpdateFruit = async (fruitId) => {
    // Validation
    const errors = {
      name: validateRequired(editForm.name, "Fruit name"),
      price: validateNumber(editForm.price, "Price", 1),
      quantity: validateNumber(editForm.quantity, "Quantity", 0)
    };

    if (showValidationErrors(errors)) return;

    try {
      const res = await axios.put(`http://localhost:5000/api/fruits/${fruitId}`, {
        name: editForm.name,
        price: Number(editForm.price),
        quantity: Number(editForm.quantity)
      });

      alert(` Fruit "${editForm.name}" updated successfully!`);
      
      // Reset edit mode
      handleCancelEdit();
      
      // Refresh fruits list
      fetchVendorFruits();
    } catch (err) {
      console.error("Error updating fruit:", err);
      alert("❌ " + (err.response?.data?.message || "Failed to update fruit!"));
    }
  };

  // Canonicalize a tree name to compare reliably across variants/typos
  const canonical = (s = '') => {
    const x = String(s)
      .trim()
      .toLowerCase()
      // normalize common typos
      .replace(/mangoosteen/g, 'mangosteen')
      .replace(/rambuttan/g, 'rambutan')
      // collapse variations of 'tree' suffix or concatenation
      .replace(/(?:[-_\s]*tree)\b/g, '') // handles ' tree', ' -tree', '_tree', 'tree'
      .replace(/mangotree/g, 'mango');
    return x;
  };

  // Build unique tree types from data (case-insensitive), excluding known statics to avoid duplicates
  const STATIC_TYPES = ['Mango', 'Rambutan', 'Mangosteen'];
  const staticCanon = new Set(STATIC_TYPES.map(canonical));
  const treeTypeOptions = (() => {
    const map = new Map();
    for (const t of trees) {
      const raw = (t.name || '').trim();
      const key = canonical(raw);
      if (!key || staticCanon.has(key)) continue; // skip if covered by static
      if (!map.has(key)) map.set(key, raw);
    }
    const dynamic = Array.from(map.values()).sort((a,b) => a.localeCompare(b));
    return [...STATIC_TYPES, ...dynamic];
  })();

  // Filters: dropdown type (canonical equality) + optional text
  const availableTrees = trees.filter((t) => {
    const raw = (t.name || '').trim();
    const nameLc = raw.toLowerCase();
    const qLc = (searchQuery || '').toLowerCase();
    const matchesText = !qLc || nameLc.includes(qLc);
    const matchesType = !treeTypeFilter || canonical(raw) === canonical(treeTypeFilter);
    return matchesText && matchesType;
  });

  const acceptedBids = myBids.filter(bid => bid.status === "accepted");
  const pendingBids = myBids.filter(bid => bid.status === "pending");
  const rejectedBids = myBids.filter(bid => bid.status === "rejected");

  return (
    <div className="vendor-container">
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', padding: '20px 30px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(27, 94, 32, 0.25)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '15px', backdropFilter: 'blur(10px)'}}>
            <span style={{fontSize: '2.5rem'}}></span>
          </div>
          <div>
            <h1 style={{fontSize: '2rem', fontWeight: '800', color: 'white', margin: 0, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px'}}>TreeKart Vendor</h1>
            <p style={{margin: 0, color: 'rgba(255,255,255,0.85)', fontSize: '0.85rem', fontWeight: '500'}}>Manage trees, fruits, bids, and deliveries</p>
          </div>
        </div>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)'}}>
          <span style={{color: 'white', fontSize: '0.9rem', fontWeight: '600'}}>{vendorDetails.name || currentVendor || 'Vendor'}</span>
        </div>
      </div>

      {/* Top Tabs: Secondary (left) + Sections and Search (right) */}
      <div style={{ display: 'block' }}>
        {paymentForBid && (
          <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
            <div style={{width:'100%', maxWidth:520, background:'#fff', borderRadius:12, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden'}}>
              <div style={{padding:'14px 16px', background:'linear-gradient(135deg, var(--primary), var(--accent))', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                <strong>Proceed to Pay</strong>
                <button onClick={() => { setPaymentForBid(null); setPaymentAmount(''); setPaymentMethod('COD'); setUpiIdInput(''); setTxnIdInput(''); }} style={{background:'transparent', color:'#fff', border:'none', fontSize:18, cursor:'pointer'}}>✖</button>
              </div>
              <div style={{padding:16, display:'grid', gap:12}}>
                {paymentSuccess ? (
                  <div style={{textAlign:'center', padding:'40px 16px 28px'}}>
                    <div style={{display:'inline-flex', width:96, height:96, borderRadius:'50%', alignItems:'center', justifyContent:'center', background:'#e8fbea', border:'2px solid #34d399', boxShadow:'0 6px 20px rgba(16,185,129,0.25)'}}>
                      <span style={{fontSize:48, color:'#22c55e'}}>✓</span>
                    </div>
                    <div style={{marginTop:16}}>
                      <div style={{fontSize:22, fontWeight:800, color:'#22c55e', letterSpacing:1, textTransform:'uppercase'}}>
                        {paymentSuccessMsg || 'Payment Successful'}
                      </div>
                      {paymentSuccessMsg && (
                        <div style={{marginTop:6, color:'#047857', fontWeight:600}}>{paymentSuccessMsg}</div>
                      )}
                    </div>
                    <div style={{marginTop:24, color:'#6b7280', fontSize:12}}>You can safely close this tab</div>
                  </div>
                ) : (
                <>
                <div style={{display:'flex', gap:10, alignItems:'center'}}>
                  <label style={{minWidth:90, fontWeight:700}}>Amount</label>
                  <input type="number" value={paymentAmount} onChange={(e)=>setPaymentAmount(e.target.value.replace(/[^0-9]/g,''))} placeholder="Amount (₹)" style={{flex:1, padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:8}} />
                </div>
                <div style={{display:'flex', gap:10, alignItems:'center'}}>
                  <label style={{minWidth:90, fontWeight:700}}>Method</label>
                  <select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)} style={{flex:1, padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:8}}>
                    <option value="UPI">UPI</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                {paymentMethod === 'UPI' && (
                  <div style={{border:'1px dashed #94a3b8', borderRadius:10, padding:12, background:'#f8fafc', display:'grid', gap:10}}>
                    <div style={{display:'flex', gap:10, alignItems:'center'}}>
                      <label style={{minWidth:90, fontWeight:700}}>UPI ID</label>
                      <input
                        type="text"
                        value={upiIdInput}
                        onChange={(e)=>{
                          const val = e.target.value.trim();
                          setUpiIdInput(val);
                          if (!val) { setUpiError('UPI ID is required'); }
                          else if (!isValidUpi(val)) { setUpiError('Enter a valid UPI ID (e.g., name@bank)'); }
                          else { setUpiError(''); }
                        }}
                        placeholder="e.g., name@bank"
                        style={{flex:1, padding:'8px 10px', border: upiError ? '1px solid #ef4444' : '1px solid #cbd5e1', borderRadius:8}}
                      />
                    </div>
                    {upiError && (
                      <div style={{color:'#b91c1c', fontSize:12, marginLeft:100}}>{upiError}</div>
                    )}
                    <div style={{display:'flex', gap:10, alignItems:'center'}}>
                      <label style={{minWidth:90, fontWeight:700}}>Txn ID</label>
                      <input type="text" value={txnIdInput} onChange={(e)=>setTxnIdInput(e.target.value.trim())} placeholder="Transaction reference (optional)" style={{flex:1, padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:8}} />
                    </div>
                  </div>
                )}
                {paymentMethod === 'COD' && (
                  <div style={{background:'#f0fff0', border:'1px solid #a7f3d0', color:'#065f46', padding:12, borderRadius:10, fontWeight:600}}>
                    Cash on Delivery will be processed. You will pay at delivery.
                  </div>
                )}
                <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:6}}>
                  <button className="btn btn-outline-secondary" onClick={() => { setPaymentForBid(null); setPaymentAmount(''); setPaymentMethod('COD'); setUpiIdInput(''); setTxnIdInput(''); }}>Cancel</button>
                  <button className="btn btn-primary" onClick={async ()=>{
                    try {
                      const amt = Number(paymentAmount);
                      if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }
                      if (!paymentForBid) { return; }
                      if (paymentMethod === 'UPI') {
                        if (!upiIdInput) { setUpiError('UPI ID is required'); return; }
                        if (!isValidUpi(upiIdInput)) { setUpiError('Enter a valid UPI ID (e.g., name@bank)'); return; }
                      }
                      const payload = { amount: amt, paymentMethod, upiId: paymentMethod==='UPI' ? upiIdInput : undefined, transactionId: txnIdInput || undefined };
                      const res = await axios.post(`http://localhost:5000/api/trees/${paymentForBid.treeId._id}/pay`, payload);
                      // Show success tick UI in modal
                      setPaymentSuccessMsg(paymentMethod === 'UPI' ? 'Payment Successful' : 'Order placed payment through COD');
                      setPaymentSuccess(true);
                      // Proceed to cleanup and close after a short delay
                      setTimeout(() => {
                        setPaymentForBid(null);
                        setPaymentSuccess(false);
                        setPaymentSuccessMsg('');
                        setPaymentAmount('');
                        setPaymentMethod('COD');
                        setUpiIdInput('');
                        setTxnIdInput('');
                        fetchMyBids();
                        fetchBookedTrees();
                        setActiveTab('bookedTrees');
                      }, 2500);
                    } catch (err) {
                      console.error('Payment failed:', err);
                      alert(err.response?.data?.message || 'Payment failed');
                    }
                  }}>Pay</button>
                </div>
                </>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          {/* Secondary tabs on the left */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {(primaryTab === 'trees'
              ? [
                  {key: "trees", label: "Tree"},
                  {key: "myBids", label: "My Bids", count: myBids.length},
                  {key: "bookedTrees", label: "Booked", count: bookedTrees.length},
                  {key: "completedTrees", label: "Soldout", count: completedTrees.length}
                ]
              : [
                  {key: "postFruits", label: "Post Fruits"},
                  {key: "bookedFruits", label: "Booked", count: bookedFruits.length},
                  {key: "canceledFruits", label: "Canceled", count: canceledFruits.length},
                  {key: "soldFruits", label: "Delivered"},
                  {key: "profile", label: "Profile"}
                ]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: '10px',
                  background: activeTab === tab.key ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
                  color: activeTab === tab.key ? 'white' : '#444',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: activeTab === tab.key ? '0 6px 16px rgba(27, 94, 32, 0.25)' : '0 1px 6px rgba(0,0,0,0.06)'
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
                    fontSize: '0.72rem',
                    fontWeight: 800
                  }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Sections and search on the right */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { key: 'trees', label: 'Tree' },
              { key: 'fruits', label: 'Fruits' }
            ].map(pt => (
              <button
                key={pt.key}
                onClick={() => {
                  setPrimaryTab(pt.key);
                  if (pt.key === 'trees' && !['trees','myBids','bookedTrees','completedTrees'].includes(activeTab)) {
                    setActiveTab('trees');
                  }
                  if (pt.key === 'fruits' && !['postFruits','bookedFruits','canceledFruits','soldFruits','profile'].includes(activeTab)) {
                    setActiveTab('bookedFruits');
                  }
                }}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  borderRadius: '12px',
                  background: primaryTab === pt.key ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
                  color: primaryTab === pt.key ? 'white' : '#444',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: primaryTab === pt.key ? '0 8px 20px rgba(27, 94, 32, 0.25)' : '0 1px 6px rgba(0,0,0,0.06)'
                }}
              >{pt.label}</button>
            ))}

            {primaryTab === 'trees' && activeTab === 'trees' && (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  value={treeTypeFilter}
                  onChange={(e) => setTreeTypeFilter(e.target.value)}
                  className="search-box"
                  style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', width: '240px' }}
                >
                  <option value="">All Types</option>
                  {treeTypeOptions.map(opt => (
                    <option key={canonical(opt)} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div>

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
            }}>Welcome to TreeKart Vendor</h3>
            <p style={{
              margin: '14px 0 0 0',
              color: '#2e7d32',
              fontWeight: 600
            }}>Select a tab above to continue</p>
          </div>
        </div>
      )}

      {/* Canceled Fruits */}
      {activeTab === "canceledFruits" && (
        <div>
          <h3>Canceled Orders</h3>
          {!vendorPhone ? (
            <p>⚠️ Please log in to view canceled orders.</p>
          ) : (
            <>
              {canceledFruits.length > 0 ? (
                <div className="fruits-grid" style={{ gap: '12px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {canceledFruits.flatMap((fruit) => (
                    (fruit.bookings || [])
                      .filter(b => b.canceled || b.status === 'rejected')
                      .map((booking) => {
                        const total = (booking.quantity || 0) * (fruit.price || 0);
                        return (
                          <div className="fruit-card" key={booking._id} style={{ width: '260px', padding: '12px' }}>
                            <div className="fruit-image" style={{ height: '120px', overflow: 'hidden' }}>
                              <img
                                src={fruit.image || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                                alt={`${fruit.name} image`}
                                onError={(e) => {
                                  if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                                    e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                                  }
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="fruit-info" style={{ display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
                              <h5 style={{ fontSize: '1rem', marginBottom: 4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fruit.name}</h5>
                              <div className="price-tag">₹{fruit.price}/kg</div>
                              <p>
                                <strong>Customer:</strong>
                                <span style={{wordBreak:'break-word'}}>{booking.customerName || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Contact:</strong>
                                <span style={{color: 'var(--text-dark)', fontWeight: '600', wordBreak:'break-word'}}>{booking.customerPhone || 'N/A'}</span>
                              </p>
                              {booking.customerEmail && (
                                <p>
                                  <strong>Email:</strong>
                                  <span style={{wordBreak:'break-word'}}>{booking.customerEmail}</span>
                                </p>
                              )}
                              {booking.alternativePhone && (
                                <p>
                                  <strong>Alt Phone:</strong>
                                  <span style={{wordBreak:'break-word'}}>{booking.alternativePhone}</span>
                                </p>
                              )}
                              {booking.deliveryAddress && (
                                <p style={{ marginTop: 4 }}>
                                  <strong>Address:</strong> <span style={{wordBreak:'break-word'}}>{booking.deliveryAddress}</span>
                                </p>
                              )}
                              {booking.location && (
                                <p>
                                  <strong>Location:</strong> <span style={{wordBreak:'break-word'}}>{booking.location}</span>
                                </p>
                              )}
                              <p>
                                <strong>Quantity:</strong> <span style={{fontWeight: 700}}>{booking.quantity} kg</span>
                              </p>
                              <p>
                                <strong>Total:</strong> <span style={{color: 'var(--primary)', fontWeight: 800}}>₹{total}</span>
                              </p>
                              <p>
                                <strong>Ordered On:</strong> <span>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Canceled On:</strong> <span>{booking.canceledAt ? new Date(booking.canceledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                              </p>
                              <button className="buy-btn" disabled>
                                Canceled
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ))}
                </div>
              ) : (
                <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No canceled orders</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Available Trees */}
      {activeTab === "trees" && (
        <div className="tree-section">
          {!selectedTree && (
            <>
              <h3>Available Trees from Farmers</h3>
              {/* Search moved to top-right toggle */}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '14px',
                marginTop: '14px',
                padding: '8px'
              }}>
                {availableTrees.length > 0 ? (
                  availableTrees.map((tree) => (
                    <div key={tree._id} style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
                      overflow: 'hidden',
                      transition: 'all 0.25s ease',
                      border: 'none',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                      e.currentTarget.style.boxShadow = '0 10px 18px rgba(27, 94, 32, 0.22)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                    }}>
                      <div style={{
                        background: 'transparent',
                        height: '240px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2.4rem',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        <img
                          src={tree.image || 'https://via.placeholder.com/600x400?text=Tree+Image'}
                          alt={`${tree.name} image`}
                          onError={(e) => {
                            if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                              e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Tree+Image';
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            background: 'transparent',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px'
                          }}
                        />
                      </div>
                      {typeof tree.expectedRent !== 'undefined' && tree.expectedRent !== null && (
                        <div style={{padding: '0 10px 6px 10px'}}>
                          <div style={{background: 'linear-gradient(135deg, var(--primary), #a6c400)', color: 'white', padding: '4px 8px', borderRadius: '14px', fontSize: '0.9rem', fontWeight: '700', display: 'inline-block', marginTop: '6px', boxShadow: '0 2px 6px rgba(141, 182, 0, 0.2)'}}>
                            ₹{tree.expectedRent}
                          </div>
                        </div>
                      )}
                      <div style={{padding: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden'}}>
                        <h5 style={{
                          fontSize: '0.95rem',
                          margin: '2px 0 6px 0',
                          color: 'var(--text-dark)',
                          fontWeight: '700'
                        }}>{tree.name}</h5>
                        
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
                        <p style={{margin: '4px 0', fontSize: '0.88rem', color: '#555', display: 'flex', justifyContent: 'space-between'}}>
                          <strong>Posted On:</strong>
                          <span>{tree.createdAt ? new Date(tree.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                        </p>
                        
                        {tree.description && (
                          <p style={{
                            margin: '6px 0',
                            fontSize: '0.82rem',
                            color: '#666',
                            fontStyle: 'italic',
                            borderLeft: '3px solid var(--primary)',
                            paddingLeft: '6px'
                          }}>
                            {tree.description.length > 80 ? tree.description.substring(0, 80) + '...' : tree.description}
                          </p>
                        )}
                        
                        <button
                          onClick={() => setSelectedTree(tree)}
                          style={{
                            background: 'linear-gradient(135deg, var(--primary), #a6c400)',
                            color: 'white',
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '0.88rem',
                            fontWeight: '700',
                            marginTop: 'auto',
                            transition: 'all 0.25s ease',
                            boxShadow: '0 2px 8px rgba(141, 182, 0, 0.22)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--btn-hover), var(--primary))';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(141, 182, 0, 0.28)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(135deg, var(--primary), #a6c400)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(141, 182, 0, 0.22)';
                          }}
                        >
                          Submit Bid
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    background: 'linear-gradient(135deg, var(--surface) 0%, #ffffff 100%)',
                    borderRadius: '20px',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{fontSize: '4rem', marginBottom: '20px'}}></div>
                    <h3 style={{color: 'var(--text-dark)', marginBottom: '10px'}}>No Trees Available</h3>
                    <p style={{color: '#666', fontSize: '1.1rem'}}>Check back later for new tree listings!</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Vendor Bid Submission Form */}
          {selectedTree && (
            <div className="vendor-details-form">
              <h3>Submit Bid for: {selectedTree.name}</h3>
              <p><strong>Expected Rate:</strong> ₹{selectedTree.expectedRent}</p>
              {selectedTree.treeCount && (
                <p><strong>No. of Trees:</strong> {selectedTree.treeCount}</p>
              )}
              {selectedTree.rateValue && (
                <p><strong>Rate:</strong> ₹{selectedTree.rateValue}</p>
              )}
              <input
                type="text"
                placeholder="Your Name *"
                value={vendorDetails.name}
                onChange={(e) => setVendorDetails({ ...vendorDetails, name: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone (10 digits) *"
                value={vendorDetails.phone}
                readOnly
                maxLength="10"
                required
              />
              <input
                type="tel"
                placeholder="Alternative Phone (10 digits) - Optional"
                value={vendorDetails.alternativePhone}
                onChange={(e) => setVendorDetails({ ...vendorDetails, alternativePhone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                maxLength="10"
              />
              <input
                type="email"
                placeholder="Email"
                value={vendorDetails.email}
                readOnly
              />
              <input
                type="text"
                placeholder="Location *"
                value={vendorDetails.location}
                onChange={(e) => setVendorDetails({ ...vendorDetails, location: e.target.value })}
                required
              />
              <input
                type="number"
                inputMode="numeric"
                min="1"
                step="1"
                placeholder="Proposed Price (₹) *"
                value={vendorDetails.proposedPrice}
                onChange={(e) => setVendorDetails({ ...vendorDetails, proposedPrice: e.target.value.replace(/[^0-9]/g, '') })}
                onWheel={(e) => e.currentTarget.blur()}
                onKeyDown={(e) => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault(); }}
                required
              />
              <textarea
                placeholder="Message (Optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                <button onClick={handleSubmitBid}>Submit Bid</button>
                <button onClick={() => setSelectedTree(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Bids */}
      {activeTab === "myBids" && (
        <div>
          <h3>My Bids</h3>
          {!vendorPhone ? (
            <div className="vendor-phone-input">
              <p>⚠️ Please log in to view your bids.</p>
            </div>
          ) : (
            <>
              <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop: 10, marginBottom: 12}}>
                <button
                  onClick={() => setMyBidsTab('acceptedPending')}
                  style={{
                    padding:'8px 12px', border:'none', borderRadius:10,
                    background: myBidsTab==='acceptedPending' ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
                    color: myBidsTab==='acceptedPending' ? 'white' : '#444', fontWeight:800,
                    boxShadow: myBidsTab==='acceptedPending' ? '0 6px 16px rgba(27,94,32,0.25)' : '0 1px 6px rgba(0,0,0,0.06)'
                  }}
                >Accepted - Payment Pending ({acceptedBids.filter(b => b.treeId?.status === 'pending').length})</button>
                <button
                  onClick={() => setMyBidsTab('pending')}
                  style={{
                    padding:'8px 12px', border:'none', borderRadius:10,
                    background: myBidsTab==='pending' ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
                    color: myBidsTab==='pending' ? 'white' : '#444', fontWeight:800,
                    boxShadow: myBidsTab==='pending' ? '0 6px 16px rgba(27,94,32,0.25)' : '0 1px 6px rgba(0,0,0,0.06)'
                  }}
                >Pending ({pendingBids.length})</button>
                <button
                  onClick={() => setMyBidsTab('rejected')}
                  style={{
                    padding:'8px 12px', border:'none', borderRadius:10,
                    background: myBidsTab==='rejected' ? 'linear-gradient(135deg, var(--primary), var(--primary))' : 'white',
                    color: myBidsTab==='rejected' ? 'white' : '#444', fontWeight:800,
                    boxShadow: myBidsTab==='rejected' ? '0 6px 16px rgba(27,94,32,0.25)' : '0 1px 6px rgba(0,0,0,0.06)'
                  }}
                >Rejected ({rejectedBids.length})</button>
              </div>

              {myBidsTab === 'acceptedPending' && (
                <>
                  <h4 style={{marginTop: 0, marginBottom: '10px'}}>Accepted - Pending Payment ({acceptedBids.filter(b => b.treeId?.status === 'pending').length})</h4>
                  {acceptedBids.filter(b => b.treeId?.status === 'pending').length > 0 ? (
                    <div className="fruits-grid">
                      {acceptedBids.filter(b => b.treeId?.status === 'pending').map((bid) => {
                        const amount = bid?.proposedPrice ?? bid?.proposed_price ?? bid?.price ?? bid?.amount ?? 0;
                        return (
                          <div className="fruit-card" key={bid._id}>
                            <div className="fruit-image">
                              {bid.treeId?.image ? (
                                <img src={bid.treeId.image} alt={`${bid.treeId?.name || 'Tree'} image`} />
                              ) : (
                                <span></span>
                              )}
                            </div>
                            <div className="fruit-info">
                              <h5>{bid.treeId?.name || 'Tree'}</h5>
                              <p>
                                <strong>Farmer:</strong>
                                <span>{bid.treeId?.farmerName || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Contact:</strong>
                                <span style={{fontWeight:700}}>{bid.treeId?.farmerPhone || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Location:</strong>
                                <span>{bid.treeId?.location || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Your Bid:</strong> <span style={{color:'var(--primary)', fontWeight:800}}>₹{amount}</span>
                              </p>
                              <p>
                                <strong>Lease:</strong> <span>{bid.treeId?.leaseDuration} months</span>
                              </p>
                              <p>
                                <strong>Status:</strong> <span>Pending Payment</span>
                              </p>
                              <button className="buy-btn" onClick={() => {
                                  setPaymentForBid(bid);
                                  const amt = bid?.proposedPrice ?? bid?.proposed_price ?? bid?.price ?? bid?.amount ?? '';
                                  setPaymentAmount(String(amt || ''));
                                  setPaymentMethod('COD');
                                  setUpiIdInput('');
                                  setTxnIdInput('');
                                }}>Proceed to Pay</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No pending payments.</p>
                  )}
                </>
              )}

              {myBidsTab === 'pending' && (
                <>
                  <h4 style={{marginTop: 0, marginBottom: '10px'}}>Pending Bids ({pendingBids.length})</h4>
                  {pendingBids.length > 0 ? (
                    <div className="fruits-grid">
                      {pendingBids.map((bid) => {
                        const amount = bid?.proposedPrice ?? bid?.proposed_price ?? bid?.price ?? bid?.amount ?? 0;
                        return (
                          <div className="fruit-card" key={bid._id}>
                            <div className="fruit-image">
                              {bid.treeId?.image ? (
                                <img src={bid.treeId.image} alt={`${bid.treeId?.name || 'Tree'} image`} />
                              ) : (
                                <span></span>
                              )}
                            </div>
                            <div className="fruit-info">
                              <h5>{bid.treeId?.name || 'Tree'}</h5>
                              <p>
                                <strong>Farmer:</strong>
                                <span>{bid.treeId?.farmerName || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Your Bid:</strong> <span style={{color:'var(--primary)', fontWeight:800}}>₹{amount}</span>
                              </p>
                              <p>
                                <strong>Message:</strong> <span>{bid.message || '-'}</span>
                              </p>
                              <button className="buy-btn" disabled>Pending</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No pending bids.</p>
                  )}
                </>
              )}

              {myBidsTab === 'rejected' && (
                <>
                  <h4 style={{marginTop: 0, marginBottom: '10px'}}>Rejected Bids ({rejectedBids.length})</h4>
                  {rejectedBids.length > 0 ? (
                    <div className="fruits-grid">
                      {rejectedBids.map((bid) => (
                        <div className="fruit-card" key={bid._id}>
                          <div className="fruit-image">
                            {bid.treeId?.image ? (
                              <img src={bid.treeId.image} alt={`${bid.treeId?.name || 'Tree'} image`} />
                            ) : (
                              <span></span>
                            )}
                          </div>
                          <div className="fruit-info">
                            <h5>{bid.treeId?.name || 'Tree'}</h5>
                            <p>
                              <strong>Farmer:</strong>
                              <span>{bid.treeId?.farmerName || 'N/A'}</span>
                            </p>
                            <p>
                              <strong>Your Bid:</strong> <span style={{color:'#f44336', fontWeight:800}}>₹{bid.proposedPrice}</span>
                            </p>
                            <button className="buy-btn" disabled>Rejected</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No rejected bids.</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Post Fruits */}
      {activeTab === "postFruits" && (
        <div className="fruit-section">
          <h3> Post Fruits for Sale</h3>
          
          {!vendorPhone ? (
            <p>⚠️ Please log in to post fruits.</p>
          ) : (
            <>
              <form onSubmit={handlePostFruit}>
                <select name="name" value={fruitForm.name} onChange={handleFruitChange} required style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}>
                  <option value="" disabled>Select Fruit *</option>
                  <option value="Mango">Mango</option>
                  <option value="Rambutan">Rambutan</option>
                  <option value="Mangosteen">Mangosteen</option>
                </select>
                <input type="text" readOnly value={`${fruitTag}-NNNN-${vendorTag} (auto on save)`} placeholder="Fruit Code (auto)" style={{ padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155' }} />
                <input type="number" name="price" placeholder="Price per kg (₹) *" value={fruitForm.price} onChange={handleFruitChange} required />
                <input type="number" name="quantity" placeholder="Quantity (kg) *" value={fruitForm.quantity} onChange={handleFruitChange} required />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  value={fruitForm.description}
                  onChange={handleFruitChange}
                  rows={3}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
                <input type="file" accept="image/*" onChange={handleFruitImageChange} />
                {uploadingFruitImage && (
                  <p style={{ marginTop: '6px', color: '#2e7d32', fontWeight: 600 }}>Uploading image…</p>
                )}
                {fruitUploadError && (
                  <p style={{ marginTop: '6px', color: '#d32f2f', fontWeight: 600 }}>Upload failed: {fruitUploadError}</p>
                )}
                {fruitForm.image && (
                  <div style={{ marginTop: '8px' }}>
                    <img
                      src={fruitForm.image}
                      alt="Fruit preview"
                      style={{
                        width: '100%',
                        height: '240px',
                        objectFit: 'contain',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px'
                      }}
                    />
                  </div>
                )}
                <button type="submit">Post Fruit</button>
              </form>

              <h4 style={{marginTop: '30px', marginBottom: '15px'}}>My Posted Fruits</h4>
              {fruits.length > 0 ? (
                <div className="fruits-grid">
                  {fruits.map((f, index) => (
                    <div className="fruit-card" key={f._id}>
                      <div className="fruit-image">
                        <img
                          src={f.image || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                          alt={`${f.name} image`}
                          onError={(e) => {
                            if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                              e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                            }
                          }}
                        />
                      </div>
                      <div className="fruit-info">
                        <h5>{f.name}</h5>
                        <div className="price-tag">₹{f.price}/kg</div>
                        {f.fruitCode && (
                          <p style={{ marginTop: 4 }}>
                            <strong>Code:</strong> <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>{f.fruitCode}</span>
                          </p>
                        )}
                        <p>
                          <strong>📦 Stock:</strong>
                          <span className={`stock-badge ${
                            f.quantity === 0 ? 'out-of-stock' : f.quantity < 10 ? 'low-stock' : ''
                          }`}>
                          {f.quantity} kg {f.quantity < 10 && f.quantity > 0 ? '(Low Stock!)' : ''}
                        </span>
                      </p>
                      {f.bookings && f.bookings.length > 0 && (
                        <p style={{ marginTop: 4 }}>
                          <span className="popular-badge">Popular: {f.bookings.length} orders</span>
                        </p>
                      )}
                      <p>
                        <strong>Status:</strong> <span style={{fontWeight:700}}>{f.status === 'available' ? 'Available' : 'Sold Out'}</span>
                      </p>
                      <p>
                        <strong>Posted On:</strong> <span>{f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                      </p>
                      <div style={{display:'flex', gap:8, alignItems:'center', marginTop:8, flexWrap:'wrap'}}>
                        <input
                          type="number"
                          placeholder="Qty"
                          min="1"
                          value={quantityToAdd[f._id] || ""}
                          onChange={(e) => setQuantityToAdd(prev => ({ ...prev, [f._id]: e.target.value }))}
                          style={{
                            width: '70px',
                            padding: '6px',
                            border: '1px solid var(--primary)',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                          }}
                        />
                        <button
                          onClick={() => handleIncreaseQuantity(f._id)}
                          disabled={!quantityToAdd[f._id]}
                          style={{
                            padding: '6px 12px',
                            background: quantityToAdd[f._id] ? 'var(--primary)' : '#ccc',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: quantityToAdd[f._id] ? 'pointer' : 'not-allowed',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          + Add
                        </button>
                        <button
                          onClick={() => setQuantityToAdd(prev => ({ ...prev, [f._id]: "" }))}
                          style={{
                            padding: '6px 12px',
                            background: '#e5e7eb',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          Cancel
                        </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No fruits posted yet.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Completed Trees */}
      {activeTab === "completedTrees" && (
        <div>
          <h3>Soldout Trees</h3>
          
          {!vendorPhone ? (
            <div className="vendor-phone-input">
              <p>⚠️ Please log in to view your completed trees.</p>
            </div>
          ) : (
            <>
              {completedTrees.length > 0 ? (
                <div className="fruits-grid">
                  {completedTrees.map((tree) => (
                    <div className="fruit-card" key={tree._id}>
                      <div className="fruit-image">
                        <img
                          src={tree.image || 'https://via.placeholder.com/600x400?text=Tree+Image'}
                          alt={`${tree.name} image`}
                          onError={(e) => {
                            if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                              e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Tree+Image';
                            }
                          }}
                        />
                      </div>
                      <div className="fruit-info">
                        <h5>{tree.name}</h5>
                        <p>
                          <strong>Farmer:</strong>
                          <span>{tree.farmerName || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Contact:</strong>
                          <span style={{fontWeight:700}}>{tree.farmerPhone || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Location:</strong>
                          <span>{tree.location || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Accepted Price:</strong> <span style={{color:'var(--primary)', fontWeight:800}}>₹{tree.acceptedPrice}</span>
                        </p>
                        <p>
                          <strong>Original Rent:</strong> <span>₹{tree.expectedRent}</span>
                        </p>
                        <p>
                          <strong>Lease:</strong> <span>{tree.leaseDuration} months</span>
                        </p>
                        <p>
                          <strong>Completed On:</strong> <span>{tree.updatedAt ? new Date(tree.updatedAt).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'N/A'}</span>
                        </p>
                        <button className="buy-btn" disabled>Soldout</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No completed trees yet.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Booked Trees */}
      {activeTab === "bookedTrees" && (
        <div>
          <h3>My Booked Trees</h3>
          
          {!vendorPhone ? (
            <div className="vendor-phone-input">
              <p>⚠️ Please log in to view your booked trees.</p>
            </div>
          ) : (
            <>
              {bookedTrees.length > 0 ? (
                <div className="fruits-grid" style={{ gap: '12px' }}>
                  {bookedTrees.map((tree) => (
                    <div className="fruit-card" key={tree._id} style={{ width: '260px', padding: '12px' }}>
                      <div className="fruit-image" style={{ height: '120px', overflow: 'hidden' }}>
                        <img
                          src={tree.image || 'https://via.placeholder.com/600x400?text=Tree+Image'}
                          alt={`${tree.name} image`}
                          onError={(e) => {
                            if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                              e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Tree+Image';
                            }
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div className="fruit-info">
                        <h5 style={{ fontSize: '1rem', marginBottom: 6 }}>{tree.name}</h5>
                        <p>
                          <strong>Farmer:</strong>
                          <span>{tree.farmerName || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Contact:</strong>
                          <span style={{fontWeight:700}}>{tree.farmerPhone || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Location:</strong>
                          <span>{tree.location || 'N/A'}</span>
                        </p>
                        <p>
                          <strong>Your Bid:</strong> <span style={{color:'#4caf50', fontWeight:800}}>₹{tree.acceptedPrice}</span>
                        </p>
                        <p>
                          <strong>Original Rent:</strong> <span>₹{tree.expectedRent}</span>
                        </p>
                        <p>
                          <strong>Lease:</strong> <span>{tree.leaseDuration} months</span>
                        </p>
                        <p>
                          <strong>Booked On:</strong> <span>{tree.updatedAt ? new Date(tree.updatedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' }) : 'N/A'}</span>
                        </p>
                        <button className="buy-btn" disabled>Booked</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>You haven't booked any trees yet. Submit bids on available trees!</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Pending Orders removed; bookings appear under Booked directly */}

      {/* Booked Orders (Ready for Delivery) */}
      {activeTab === "bookedFruits" && (
        <div>
          <h3>Booked Orders (Ready for Delivery)</h3>
          
          {!vendorPhone ? (
            <p>⚠️ Please log in to view booked fruits.</p>
          ) : (
            <>
              {bookedFruits.length > 0 ? (
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%', borderCollapse:'collapse', background:'#fff', borderRadius:8, overflow:'hidden', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}>
                    <thead style={{background:'#f1f5f9'}}>
                      <tr>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Code</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Fruit</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Price/kg</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Customer</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Phone</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Email</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Address</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Street</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Location</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Town</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Pincode</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>State</th>
                        <th style={{textAlign:'right', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Qty (kg)</th>
                        <th style={{textAlign:'right', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Total</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Ordered On</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Expected Delivery</th>
                        <th style={{textAlign:'left', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Payment</th>
                        <th style={{textAlign:'center', padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookedFruits
                        .flatMap((fruit) => (
                          (fruit.bookings || [])
                            .filter(b => b.status === 'approved' && !b.delivered)
                            .map((booking) => ({ fruit, booking }))
                        ))
                        .sort((a, b) => {
                          const ad = new Date(a.booking?.bookedAt || 0).getTime();
                          const bd = new Date(b.booking?.bookedAt || 0).getTime();
                          return bd - ad; // newest first
                        })
                        .map(({ fruit, booking }, idx) => {
                          const expectedDelivery = booking.expectedDeliveryAt
                            ? new Date(booking.expectedDeliveryAt)
                            : (booking.bookedAt ? new Date(new Date(booking.bookedAt).getTime() + 5 * 24 * 60 * 60 * 1000) : null);
                          const total = (booking.quantity || 0) * (fruit.price || 0);
                          // Parse delivery address format robustly: "houseNo, street[, area], town - pincode, state"
                          const raw = (booking.deliveryAddress || '').split(',').map(p => p.trim()).filter(Boolean);
                          const house = raw[0] || '';
                          const street = raw[1] || '';
                          const area = raw.length > 4 ? (raw[2] || '') : '';
                          const townPinSeg = raw.find(seg => seg.includes('-')) || '';
                          const partsDash = townPinSeg.split('-').map(s => s.trim());
                          const townFromAddr = (partsDash[0] || '');
                          const pinFromAddr = (partsDash[1] || '');
                          const addressShort = [house, area].filter(Boolean).join(', ');
                          const locParts = (booking.location || '').split(',').map(s => s.trim()).filter(Boolean);
                          const townFromLoc = locParts[0] || '';
                          const stateFromLoc = locParts[1] || '';
                          const stateFromAddr = raw.length > 0 ? (raw[raw.length - 1] || '') : '';
                          const townVal = (townFromAddr || townFromLoc || '-')
                          const pincode = (pinFromAddr || '-')
                          const stateVal = (stateFromLoc || stateFromAddr || '-')
                          return (
                            <tr key={booking._id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>{fruit.fruitCode || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                  <div style={{width:40, height:40, borderRadius:8, overflow:'hidden', background:'#f3f4f6', display:'flex', alignItems:'center', justifyContent:'center'}}>
                                    <img
                                      src={fruit.image || 'https://via.placeholder.com/80x80?text=Img'}
                                      alt={fruit.name}
                                      onError={(e) => {
                                        if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                                          e.currentTarget.src = 'https://via.placeholder.com/80x80?text=Img';
                                        }
                                      }}
                                      style={{width:'100%', height:'100%', objectFit:'cover'}}
                                    />
                                  </div>
                                  <div style={{fontWeight:700}}>{fruit.name}</div>
                                </div>
                              </td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>₹{fruit.price}/kg</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{booking.customerName || 'N/A'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{booking.customerPhone || 'N/A'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{booking.customerEmail || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{addressShort || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{street || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{booking.location || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{townVal}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{pincode || '-'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{stateVal}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0', textAlign:'right'}}>{booking.quantity}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0', textAlign:'right', fontWeight:800, color:'var(--primary)'}}>₹{total}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>{expectedDelivery ? expectedDelivery.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0'}}>
                                {booking.paymentMethod || '-'}
                                {booking.paymentMethod === 'UPI' && booking.txnRef ? (
                                  <span style={{color:'#64748b'}}> · Ref: {booking.txnRef}</span>
                                ) : null}
                              </td>
                              <td style={{padding:'10px 12px', borderBottom:'1px solid #e2e8f0', textAlign:'center'}}>
                                <button
                                  onClick={() => handleMarkDelivered(fruit._id, booking._id)}
                                  style={{ padding:'6px 12px', background:'#ff9800', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:'0.85rem' }}
                                >
                                  Mark Delivered
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No approved orders</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Delivered Fruits */}
      {activeTab === "soldFruits" && (
        <div>
          <h3>Delivered Fruits</h3>
          
          {!vendorPhone ? (
            <p>⚠️ Please log in to view delivered fruits.</p>
          ) : (
            <>
              {soldFruits.length > 0 ? (
                <div className="fruits-grid" style={{ gap: '12px', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {soldFruits.flatMap((fruit) => (
                    (fruit.bookings || [])
                      .filter(b => b.delivered)
                      .map((booking) => {
                        const total = (booking.quantity || 0) * (fruit.price || 0);
                        return (
                          <div className="fruit-card" key={booking._id} style={{ width: '260px', padding: '12px' }}>
                            <div className="fruit-image" style={{ height: '120px', overflow: 'hidden' }}>
                              <img
                                src={fruit.image || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                                alt={`${fruit.name} image`}
                                onError={(e) => {
                                  if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                                    e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                                  }
                                }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div className="fruit-info" style={{ display:'flex', flexDirection:'column', gap:6, overflow:'hidden' }}>
                              <h5 style={{ fontSize: '1rem', marginBottom: 4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{fruit.name}</h5>
                              <div className="price-tag">₹{fruit.price}/kg</div>
                              <p>
                                <strong>Customer:</strong>
                                <span style={{wordBreak:'break-word'}}>{booking.customerName || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Contact:</strong>
                                <span style={{color: 'var(--text-dark)', fontWeight: '600', wordBreak:'break-word'}}>{booking.customerPhone || 'N/A'}</span>
                              </p>
                              <p>
                                <strong>Quantity:</strong> <span style={{fontWeight: 700}}>{booking.quantity} kg</span>
                              </p>
                              <p>
                                <strong>Total:</strong> <span style={{color: 'var(--primary)', fontWeight: 800}}>₹{total}</span>
                              </p>
                              <p>
                                <strong>Delivered On:</strong> <span style={{wordBreak:'break-word'}}>{booking.deliveredAt ? new Date(booking.deliveredAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                              </p>
                              <button className="buy-btn" disabled>
                                Delivered
                              </button>
                            </div>
                          </div>
                        );
                      })
                  ))}
                </div>
              ) : (
                <p style={{textAlign:'center', padding:'20px', color:'#666'}}>No delivered orders</p>
              )}
            </>
          )}
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
          }}>Vendor Profile</h3>

          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
          }}>
            <div style={{marginBottom: '20px', borderBottom: '2px solid #a5d6a7', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Name</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {vendorDetails.name || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '20px', borderBottom: '2px solid #e3f2fd', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Email</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {vendorDetails.email || JSON.parse(localStorage.getItem("user"))?.email || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '20px', borderBottom: '2px solid #e3f2fd', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Phone Number</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {vendorPhone || 'Not provided'}
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
              e.currentTarget.style.background = 'linear-gradient(135deg, #66bb6a, #4caf50)';
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
          
          {/* Fruits Sold Report */}
          <div style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            padding: '25px',
            borderRadius: '15px',
            marginBottom: '25px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{color: '#2e7d32', marginBottom: '20px'}}>Fruits Sold - Monthly Summary</h4>
            
            <table className="table table-bordered table-striped" style={{background: 'white'}}>
              <thead className="table-dark">
                <tr>
                  <th>Month</th>
                  <th>Total Orders</th>
                  <th>Total Quantity (kg)</th>
                  <th>Total Revenue (₹)</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const monthlyData = {};
                  
                  soldFruits.forEach(fruit => {
                    fruit.bookings?.filter(b => b.delivered).forEach(booking => {
                      const date = new Date(booking.deliveredAt || booking.createdAt);
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                      
                      if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = {
                          monthName,
                          orders: 0,
                          quantity: 0,
                          revenue: 0
                        };
                      }
                      
                      monthlyData[monthKey].orders += 1;
                      monthlyData[monthKey].quantity += booking.quantity;
                      monthlyData[monthKey].revenue += booking.quantity * fruit.price;
                    });
                  });
                  
                  const sortedMonths = Object.keys(monthlyData).sort().reverse();
                  
                  return sortedMonths.length > 0 ? (
                    sortedMonths.map(monthKey => (
                      <tr key={monthKey}>
                        <td><strong>{monthlyData[monthKey].monthName}</strong></td>
                        <td>{monthlyData[monthKey].orders}</td>
                        <td>{monthlyData[monthKey].quantity} kg</td>
                        <td><strong style={{color: '#4caf50'}}>₹{monthlyData[monthKey].revenue.toLocaleString()}</strong></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{textAlign: 'center', color: '#666'}}>No sales data available</td>
                    </tr>
                  );
                })()}
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <th>Total</th>
                  <th>
                    {soldFruits.reduce((sum, f) => sum + (f.bookings?.filter(b => b.delivered).length || 0), 0)}
                  </th>
                  <th>
                    {soldFruits.reduce((sum, f) => sum + (f.bookings?.filter(b => b.delivered).reduce((s, b) => s + b.quantity, 0) || 0), 0)} kg
                  </th>
                  <th>
                    <strong style={{color: '#4caf50'}}>
                      ₹{soldFruits.reduce((sum, f) => sum + (f.bookings?.filter(b => b.delivered).reduce((s, b) => s + (b.quantity * f.price), 0) || 0), 0).toLocaleString()}
                    </strong>
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Trees Booked Report */}
          <div style={{
            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
            padding: '25px',
            borderRadius: '15px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h4 style={{color: '#2e7d32', marginBottom: '20px'}}>Trees Booked - Summary</h4>
            
            <table className="table table-bordered table-striped" style={{background: 'white'}}>
              <thead className="table-dark">
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Total Investment (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="badge bg-primary">Booked Trees</span></td>
                  <td>{bookedTrees.length}</td>
                  <td><strong style={{color: '#2196F3'}}>₹{bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0).toLocaleString()}</strong></td>
                </tr>
                <tr>
                  <td><span className="badge bg-danger">Delivered Trees</span></td>
                  <td>{completedTrees.length}</td>
                  <td><strong style={{color: '#4caf50'}}>₹{completedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0).toLocaleString()}</strong></td>
                </tr>
              </tbody>
              <tfoot className="table-light">
                <tr>
                  <th>Total Trees</th>
                  <th>{bookedTrees.length + completedTrees.length}</th>
                  <th>
                    <strong style={{color: '#4caf50'}}>
                      ₹{(bookedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0) + completedTrees.reduce((sum, t) => sum + (t.acceptedPrice || 0), 0)).toLocaleString()}
                    </strong>
                  </th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
