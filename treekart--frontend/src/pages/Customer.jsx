import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Customer.css";
import { validateRequired, validatePhone, validatePhoneOptional, validateNumber, showValidationErrors } from "../utils/validation";

export default function Customer() {
  // State for fruits and orders
  const [fruits, setFruits] = useState([]);
  const [orders, setOrders] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [deliveredFruits, setDeliveredFruits] = useState([]);
  const [activeTab, setActiveTab] = useState("booked"); // fruits | booked | delivered | canceled | profile
  const [search, setSearch] = useState("");
  const [fruitTypeFilter, setFruitTypeFilter] = useState("");
  const [selectedFruit, setSelectedFruit] = useState(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState(null);

  // ---------- NEW FIELDS ----------
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alternativePhone, setAlternativePhone] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState("COD");
  const [confirmStep, setConfirmStep] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  // Load customer info and orders from localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.phone) {
      setCustomerPhone(user.phone);
      setCustomerName(user.name || "");
      setPhone(user.phone);
      setEmail(user.email || "");
    }
    
    // Load orders from localStorage
    const savedOrders = JSON.parse(localStorage.getItem("customerOrders")) || [];
    setOrders(savedOrders);
    
    fetchAvailableFruits();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch bookings when customer phone is available or tab changes
  useEffect(() => {
    if (customerPhone) {
      fetchMyBookings();
    }
  }, [customerPhone, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh fruits and bookings every 15s
  useEffect(() => {
    const id = setInterval(() => {
      fetchAvailableFruits();
      if (customerPhone) fetchMyBookings();
    }, 15000);
    return () => clearInterval(id);
  }, [customerPhone]);

  const fetchMyBookings = async () => {
    if (!customerPhone) {
      console.log("⚠️ No customer phone available");
      return;
    }
    
    try {
      setLoadingBookings(true);
      setBookingsError(null);
      console.log("🔵 Fetching bookings for customer:", customerPhone);
      const res = await axios.get(`http://localhost:5000/api/fruits/customer/${customerPhone}/bookings`);
      console.log("✅ Customer bookings response:", res.data);
      console.log("📊 Total bookings:", res.data.length);
      console.log("📊 Booked:", res.data.filter(b => b.status === 'approved' && !b.delivered).length);
      console.log("📊 Delivered:", res.data.filter(b => b.delivered).length);
      // Enrich missing fruit images for older bookings
      const bookings = res.data || [];
      const needImage = bookings.filter(b => !b.fruitImage && b.fruitId);
      if (needImage.length > 0) {
        try {
          const lookups = await Promise.allSettled(
            needImage.map(b => axios.get(`http://localhost:5000/api/fruits/${b.fruitId}`))
          );
          const imageMap = new Map();
          lookups.forEach((p, idx) => {
            const b = needImage[idx];
            if (p.status === 'fulfilled' && p.value?.data) {
              imageMap.set(String(b.fruitId), p.value.data.image || null);
            }
          });
          const enriched = bookings.map(b => (
            b.fruitImage ? b : { ...b, fruitImage: imageMap.get(String(b.fruitId)) || b.fruitImage || null }
          ));
          setMyBookings(enriched);
        } catch (e) {
          console.warn('Image enrichment failed, using original bookings');
          setMyBookings(bookings);
        }
      } else {
        setMyBookings(bookings);
      }
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
      console.error("❌ Error details:", err.response?.data || err.message);
      setBookingsError(err.response?.data?.message || err.message || "Failed to load bookings");
    } finally {
      setLoadingBookings(false);
    }
  };

  // Cancel a booking within 24 hours
  const handleCancelBooking = async (booking) => {
    const ok = window.confirm('Are you sure you want to cancel this order? You can cancel within 24 hours only.');
    if (!ok) return;
    try {
      await axios.put(`http://localhost:5000/api/fruits/${booking.fruitId}/booking/${booking._id}/cancel`);
      alert('Order canceled successfully');
      // Optimistically update local state so the card appears immediately in Canceled
      setMyBookings(prev => prev.map(b => (
        b._id === booking._id
          ? { ...b, canceled: true, status: 'rejected', canceledAt: new Date().toISOString() }
          : b
      )));
      setActiveTab('canceled');
      // Refresh from backend in background to keep in sync
      fetchMyBookings();
    } catch (err) {
      console.error('Cancel error:', err);
      alert(err.response?.data?.message || 'Failed to cancel order');
    }
  };

  const fetchDeliveredFruits = async () => {
    try {
      console.log("🔵 Fetching delivered fruits for customer:", customerPhone);
      const res = await axios.get(`http://localhost:5000/api/fruits/customer/${customerPhone}/delivered`);
      console.log("✅ Delivered fruits:", res.data);
      console.log("📊 Number of delivered fruits:", res.data.length);
      setDeliveredFruits(res.data);
      
      // Remove delivered items from local orders cache
      if (res.data.length > 0) {
        const deliveredFruitIds = res.data.map(f => f._id);
        const updatedOrders = orders.filter(order => !deliveredFruitIds.includes(order.fruitId));
        
        if (updatedOrders.length !== orders.length) {
          setOrders(updatedOrders);
          localStorage.setItem("customerOrders", JSON.stringify(updatedOrders));
          console.log("✅ Removed delivered items from pending orders");
        }
      }
    } catch (err) {
      console.error("❌ Error fetching delivered fruits:", err);
      console.error("Error details:", err.response?.data || err.message);
    }
  };

  const fetchAvailableFruits = async () => {
    try {
      console.log("Fetching available fruits...");
      const res = await axios.get("http://localhost:5000/api/fruits/available");
      console.log("Fetched fruits:", res.data);
      console.log("Number of fruits:", res.data.length);
      setFruits(res.data);
    } catch (err) {
      console.error("Error fetching fruits:", err);
      console.error("Error details:", err.response?.data || err.message);
      alert("Failed to load fruits. Make sure the backend server is running on port 5000.");
    }
  };

  // filter fruits (canonical compare to handle common typos)
  const canonical = (s = '') => String(s).trim().toLowerCase()
    .replace(/mangoosteen/g, 'mangosteen')
    .replace(/rambuttan/g, 'rambutan');
  const filteredFruits = fruits.filter((fruit) => {
    const type = (fruitTypeFilter || '').trim();
    if (!type) return true;
    return canonical(fruit.name) === canonical(type);
  });

  // start booking -> navigate to dedicated booking page
  const handleBook = (fruit) => {
    navigate(`/customer/book/${fruit._id}`);
  };

  // confirm details
  const handleConfirmBooking = () => {
    console.log("🔍 Form values before validation:", {
      customerName,
      phone,
      email,
      alternativePhone,
      address,
      location,
      quantity
    });
    
    // Validation
    const errors = {
      customerName: validateRequired(customerName, "Customer name"),
      phone: validatePhone(phone),
      alternativePhone: validatePhoneOptional(alternativePhone),
      address: validateRequired(address, "Delivery address"),
      location: validateRequired(location, "Location"),
      quantity: validateNumber(quantity, "Quantity", 1)
    };

    console.log("🔍 Validation errors:", errors);

    if (showValidationErrors(errors)) return;
    
    console.log("✅ Validation passed, proceeding to payment step");
    setConfirmStep(true);
  };

  // final order - buy fruit from backend
  const handlePlaceOrderClick = async () => {
    try {
      const bookingData = {
        customerName,
        customerPhone: phone,
        customerEmail: email,
        alternativePhone,
        deliveryAddress: address,
        location,
        quantityToBuy: quantity
      };
      
      console.log("📤 Sending booking data to backend:");
      console.log(JSON.stringify(bookingData, null, 2));
      
      // Call backend to buy the fruit
      const res = await axios.put(`http://localhost:5000/api/fruits/${selectedFruit._id}/buy`, bookingData);

      const newOrder = {
        fruitId: selectedFruit._id,
        fruit: selectedFruit.name,
        vendor: selectedFruit.vendor,
        vendorPhone: selectedFruit.vendorPhone,
        price: selectedFruit.price * quantity,
        customerName,
        phone,
        address,
        location,
        quantity,
        payment,
        status: "Pending Delivery",
        id: Date.now(),
        bookingDate: new Date().toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      const updatedOrders = [...orders, newOrder];
      setOrders(updatedOrders);
      
      // Save orders to localStorage
      localStorage.setItem("customerOrders", JSON.stringify(updatedOrders));

      alert(`✅ Order placed successfully for ${quantity} kg of ${selectedFruit.name}!`);
      setSelectedFruit(null);
      setConfirmStep(false);
      // Reset mutable fields for next booking
      setQuantity(1);
      setAddress("");
      setLocation("");
      setAlternativePhone("");
      setPayment("COD");
      
      // Refresh fruits list
      fetchAvailableFruits();
      
      // Refresh bookings to show in pending tab
      if (customerPhone) {
        fetchMyBookings();
      }
    } catch (err) {
      console.error("Error placing order:", err);
      alert(err.response?.data?.message || "Failed to place order. Please try again.");
    }
  };

  return (
    <div className="customer-container">
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', padding: '20px 30px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(27, 94, 32, 0.25)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '15px', backdropFilter: 'blur(10px)'}}>
            <span style={{fontSize: '2.5rem'}}></span>
          </div>
          <div>
            <h1 style={{fontSize: '2rem', fontWeight: '800', color: 'white', margin: 0, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px'}}>TreeKart Shop</h1>
            <p style={{margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: '500'}}>Fresh fruits delivered to your door</p>
          </div>
        </div>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)'}}>
          <span style={{color: 'white', fontSize: '0.9rem', fontWeight: '600'}}>{customerName || 'Customer'}</span>
        </div>
      </div>

      {/* Modern Tabs + Search */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '12px', flexWrap: 'wrap'}}>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
        {[ 
          {key: "fruits", label: "Fruits", color: "var(--primary)", count: filteredFruits.length},
          {key: "booked", label: "Booked", color: "var(--accent)", count: myBookings.filter(b => b.status === 'approved' && !b.delivered && !b.canceled && b.status !== 'rejected').length},
          {key: "delivered", label: "Delivered", color: "var(--primary)", count: myBookings.filter(b => b.delivered).length},
          {key: "canceled", label: "Canceled", color: "var(--accent)", count: myBookings.filter(b => b.canceled || b.status === 'rejected').length},
          {key: "profile", label: "Profile", color: "var(--accent)"}
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
        {activeTab === 'fruits' && (
          <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
            <select
              value={fruitTypeFilter}
              onChange={(e) => setFruitTypeFilter(e.target.value)}
              className="search-box"
              style={{width: '220px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white'}}
            >
              <option value="">All Types</option>
              <option value="Mango">Mango</option>
              <option value="Rambutan">Rambutan</option>
              <option value="Mangosteen">Mangosteen</option>
            </select>
          </div>
        )}
      </div>

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
            }}>Welcome to TreeKart Shop</h3>
            <p style={{
              margin: '14px 0 0 0',
              color: '#2e7d32',
              fontWeight: 600
            }}>Select a tab above to explore fruits</p>
          </div>
        </div>
      )}

      {/* Canceled Orders Tab */}
      {activeTab === "canceled" && (
        <div className="orders-section">
          <h3 className="mt-4">Canceled Orders</h3>
          {myBookings.filter(b => b.canceled || b.status === 'rejected').length > 0 ? (
            <div className="fruits-grid">
              {myBookings.filter(b => b.canceled || b.status === 'rejected').map((booking) => (
                <div className="fruit-card" key={booking._id} style={{ width: '260px', padding: '12px' }}>
                  <div className="fruit-image" style={{ height: '120px', overflow: 'hidden' }}>
                    <img
                      src={booking.fruitImage || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                      alt={`${booking.fruitName} image`}
                      onError={(e) => {
                        if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                          e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                        }
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="fruit-info">
                    <h5 style={{ fontSize: '1rem', marginBottom: 6 }}>{booking.fruitName}</h5>
                    <p>
                      <strong>Vendor:</strong>
                      <span>{booking.vendor || 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Contact:</strong>
                      <span style={{color: 'var(--text-dark)', fontWeight: '600'}}>{booking.vendorPhone || 'N/A'}</span>
                    </p>
                    <div className="price-tag">₹{booking.fruitPrice}/kg</div>
                    <p>
                      <strong>Quantity:</strong> <span style={{fontWeight: 700}}>{booking.quantity} kg</span>
                    </p>
                    <p>
                      <strong>Total:</strong> <span style={{color: 'var(--primary)', fontWeight: 800}}>₹{booking.totalPrice}</span>
                    </p>
                    <p>
                      <strong>Ordered On:</strong> <span>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Canceled On:</strong> <span>{booking.canceledAt ? new Date(booking.canceledAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </p>
                    <button className="buy-btn" disabled>
                      Canceled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>No canceled orders.</p>
          )}
        </div>
      )}

      {/* Available Fruits Tab */}
      {activeTab === "fruits" && (
        <>
          {/* Search input moved to tabs row */}

          <div className="fruits-grid">
            {filteredFruits.length > 0 ? (
              filteredFruits.map((fruit) => (
                <div className="fruit-card" key={fruit._id}>
                  <div className="fruit-image">
                    <img
                      src={fruit.image || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                      alt={`${fruit.name} image`}
                      onError={(e) => {
                        if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                          e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                        }
                      }}
                    />
                  </div>
                  <div className="fruit-info">
                    <h5>{fruit.name.charAt(0).toUpperCase() + fruit.name.slice(1)}</h5>
                    {fruit.fruitCode && (
                      <p style={{ marginTop: 4, color: '#334155' }}>
                        <strong>Code:</strong> <span style={{fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'}}>{fruit.fruitCode}</span>
                      </p>
                    )}
                    
                    <p>
                      <strong>Vendor:</strong>
                      <span>{fruit.vendorName || fruit.vendor?.split('@')[0] || 'N/A'}</span>
                    </p>
                    
                    <p>
                      <strong>Contact:</strong>
                      <span style={{color: 'var(--text-dark)', fontWeight: '600'}}>{fruit.vendorPhone || 'N/A'}</span>
                    </p>
                    
                    <div className="price-tag">
                      ₹{fruit.price}/kg
                    </div>
                    {fruit.description && (
                      <p style={{ marginTop: 6, color: '#374151' }}>
                        <strong>Description:</strong> <span>{fruit.description}</span>
                      </p>
                    )}
                    
                    <p>
                      <strong>📦 Stock:</strong>
                      <span className={`stock-badge ${
                        fruit.quantity === 0 ? 'out-of-stock' : 
                        fruit.quantity < 10 ? 'low-stock' : ''
                      }`}>
                        {fruit.quantity} kg {fruit.quantity < 10 && fruit.quantity > 0 ? '(Low Stock!)' : ''}
                      </span>
                    </p>
                    
                    {fruit.bookings && fruit.bookings.length > 0 && (
                      <p style={{ marginTop: 4 }}>
                        <span className="popular-badge">Popular: {fruit.bookings.length} orders</span>
                      </p>
                    )}
                    
                    <button
                      className="buy-btn"
                      onClick={() => handleBook(fruit)}
                      disabled={fruit.quantity === 0}
                    >
                      {fruit.quantity > 0 ? 'Buy Now' : 'Out of Stock'}
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
                <h3 style={{color: 'var(--text-dark)', marginBottom: '10px'}}>No Fruits Found</h3>
                <p style={{color: '#666', fontSize: '1.1rem'}}>
                  {search ? `No results for "${search}". Try a different search!` : 'No fruits available right now. Check back later!'}
                </p>
              </div>
            )}
          </div>

          {/* Booking moved to dedicated page; inline form removed */}
        </>
      )}

      {/* Booked Orders Tab */}
      {activeTab === "booked" && (
        <div className="orders-section">
          <h3 className="mt-4">Booked Orders</h3>
          <p style={{textAlign: 'center', color: '#666', marginBottom: '15px'}}>Orders booked and awaiting delivery</p>
          
          {bookingsError && (
            <div style={{background: '#ffebee', color: '#c62828', padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center'}}>
              Error: {bookingsError}
            </div>
          )}
          
          {loadingBookings ? (
            <p style={{textAlign: 'center', color: '#666'}}>Loading bookings...</p>
          ) : myBookings.filter(b => b.status === 'approved' && !b.delivered && !b.canceled && b.status !== 'rejected').length > 0 ? (
            <div className="fruits-grid" style={{ gap: '12px' }}>
              {myBookings.filter(b => b.status === 'approved' && !b.delivered && !b.canceled && b.status !== 'rejected').map((booking) => {
                const bookedAt = booking.bookedAt ? new Date(booking.bookedAt) : null;
                const within24h = bookedAt ? (Date.now() - bookedAt.getTime()) <= 24 * 60 * 60 * 1000 : false;
                return (
                <div className="fruit-card" key={booking._id} style={{ width: '260px', padding: '12px' }}>
                  <div className="fruit-image">
                    <img
                      src={booking.fruitImage || 'https://via.placeholder.com/600x400?text=Fruit+Image'}
                      alt={`${booking.fruitName} image`}
                      onError={(e) => {
                        if (e.currentTarget.src.indexOf('via.placeholder.com') === -1) {
                          e.currentTarget.src = 'https://via.placeholder.com/600x400?text=Fruit+Image';
                        }
                      }}
                    />
                  </div>
                  <div className="fruit-info">
                    <h5 style={{ fontSize: '1rem', marginBottom: 6 }}>{booking.fruitName}</h5>
                    <p>
                      <strong>Vendor:</strong>
                      <span>{booking.vendor || 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Contact:</strong>
                      <span style={{color: 'var(--text-dark)', fontWeight: '600'}}>{booking.vendorPhone || 'N/A'}</span>
                    </p>
                    <div className="price-tag">₹{booking.fruitPrice}/kg</div>
                    <p>
                      <strong>Quantity:</strong> <span style={{fontWeight: 700}}>{booking.quantity} kg</span>
                    </p>
                    <p>
                      <strong>Total:</strong> <span style={{color: 'var(--primary)', fontWeight: 800}}>₹{booking.totalPrice}</span>
                    </p>
                    <p>
                      <strong>Ordered On:</strong> <span>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Expected Delivery:</strong> <span>{booking.expectedDeliveryAt ? new Date(booking.expectedDeliveryAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : (booking.bookedAt ? new Date(new Date(booking.bookedAt).getTime() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A')}</span>
                    </p>
                    {within24h ? (
                      <button className="buy-btn" onClick={() => handleCancelBooking(booking)}>
                        Cancel Order
                      </button>
                    ) : (
                      <button className="buy-btn" disabled title="Cancellation window expired (24 hours passed)">
                        Cancel (24h passed)
                      </button>
                    )}
                  </div>
                </div>
              );})}
            </div>
          ) : (
            <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>
              {customerPhone ? 'No approved orders waiting for delivery.' : 'Please log in to view your orders.'}
            </p>
          )}
        </div>
      )}

      {/* Delivered Fruits Tab */}
      {activeTab === "delivered" && (
        <div className="orders-section">
          <h3 className="mt-4">Delivered Fruits</h3>
          
          {myBookings.filter(b => b.delivered).length > 0 ? (
            <div className="fruits-grid" style={{ gap: '12px' }}>
              {myBookings.filter(b => b.delivered).map((booking) => (
                <div className="fruit-card" key={booking._id} style={{ width: '260px', padding: '12px' }}>
                  <div className="fruit-image" style={{ height: '120px', overflow: 'hidden' }}>
                    {booking.fruitImage ? (
                      <img src={booking.fruitImage} alt={`${booking.fruitName} image`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span></span>
                    )}
                  </div>
                  <div className="fruit-info">
                    <h5 style={{ fontSize: '1rem', marginBottom: 6 }}>{booking.fruitName}</h5>
                    <p>
                      <strong>Vendor:</strong>
                      <span>{booking.vendor || 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Contact:</strong>
                      <span style={{color: 'var(--text-dark)', fontWeight: '600'}}>{booking.vendorPhone || 'N/A'}</span>
                    </p>
                    <div className="price-tag">₹{booking.fruitPrice}/kg</div>
                    <p>
                      <strong>Quantity:</strong> <span style={{fontWeight: 700}}>{booking.quantity} kg</span>
                    </p>
                    <p>
                      <strong>Total:</strong> <span style={{color: 'var(--primary)', fontWeight: 800}}>₹{booking.totalPrice}</span>
                    </p>
                    <p>
                      <strong>Ordered On:</strong> <span>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </p>
                    <p>
                      <strong>Delivered On:</strong> <span>{booking.deliveredAt ? new Date(booking.deliveredAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                    </p>
                    <button className="buy-btn" disabled>
                      Delivered
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{textAlign: 'center', padding: '20px', color: '#666'}}>
              {customerPhone ? 'No delivered fruits yet.' : 'Please log in to view your orders.'}
            </p>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div style={{
          background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
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
          }}>Customer Profile</h3>
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
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {customerName || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '20px', borderBottom: '2px solid #e8f5e9', paddingBottom: '15px'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Phone Number</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {customerPhone || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            <div style={{marginBottom: '0'}}>
              <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                <span style={{fontSize: '1.5rem', marginRight: '10px'}}>📧</span>
                <div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Email</p>
                  <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                    {email || 'Not provided'}
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
