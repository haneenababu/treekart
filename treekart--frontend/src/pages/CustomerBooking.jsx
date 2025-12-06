import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function CustomerBooking() {
  const { fruitId } = useParams();
  const navigate = useNavigate();

  const [fruit, setFruit] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [alternativePhone, setAlternativePhone] = useState("");
  // Structured delivery address fields
  const [houseNo, setHouseNo] = useState("");
  const [street, setStreet] = useState("");
  const [area, setArea] = useState("");
  const [town, setTown] = useState("");
  const [stateName, setStateName] = useState("");
  const [pincode, setPincode] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [payment, setPayment] = useState("COD");
  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' | 'UPI'
  const [upiIdInput, setUpiIdInput] = useState('');
  const [txnIdInput, setTxnIdInput] = useState('');
  const [upiError, setUpiError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentSuccessTitle, setPaymentSuccessTitle] = useState('');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState('');
  const [errors, setErrors] = useState({});

  const isValidUpi = (v='') => {
    const re = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z]{2,64}$/;
    return re.test(String(v).trim());
  };

  const validateForm = () => {
    const e = {};
    if (!customerName?.trim()) e.customerName = 'Name is required';
    if (!phone || String(phone).trim().length !== 10) e.phone = '10-digit phone is required';
    if (!houseNo?.trim()) e.houseNo = 'House/Flat No. is required';
    if (!street?.trim()) e.street = 'Street/Road is required';
    if (!town?.trim()) e.town = 'Town/City is required';
    if (!stateName?.trim()) e.stateName = 'State is required';
    if (!pincode || !/^\d{6}$/.test(String(pincode))) e.pincode = 'Enter 6-digit pincode';
    const maxQty = Number(fruit?.quantity ?? 0);
    const qtyNum = Number(quantity);
    if (!qtyNum || qtyNum < 1) e.quantity = 'Enter at least 1';
    else if (maxQty > 0 && qtyNum > maxQty) e.quantity = `Max available: ${maxQty}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      setCustomerName(user.name || "");
      setPhone(user.phone || "");
      setEmail(user.email || "");
    }
  }, []);

  useEffect(() => {
    const fetchFruit = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/fruits/${fruitId}`);
        setFruit(res.data);
      } catch (e) {
        alert("Failed to load fruit details");
        navigate("/customer");
      }
    };
    if (fruitId) fetchFruit();
  }, [fruitId, navigate]);

  const handlePlaceOrder = async () => {
    // Basic validation for structured address
    if (!houseNo || !street || !town || !stateName || !pincode || String(pincode).length !== 6) {
      alert("Please enter complete delivery details (House/Flat, Street, Town/City, State, 6-digit Pincode)");
      return;
    }
    if (!quantity || quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    try {
      const deliveryAddress = `${houseNo}, ${street}${area ? ", "+area : ""}, ${town} - ${pincode}, ${stateName}`;
      const location = `${town}, ${stateName}`;
      const bookingData = {
        customerName,
        customerPhone: phone,
        customerEmail: email,
        alternativePhone,
        deliveryAddress,
        location,
        quantityToBuy: Number(quantity),
        paymentMethod: paymentMethod,
        upiId: paymentMethod === 'UPI' ? upiIdInput : '',
        txnRef: paymentMethod === 'UPI' ? txnIdInput : '',
      };
      await axios.put(`http://localhost:5000/api/fruits/${fruitId}/buy`, bookingData);

      // When placing via modal, we'll show success there and then navigate
      if (!showPayment) {
        alert(`✅ Order placed successfully for ${quantity} ${fruit?.name || "item"}!`);
        navigate("/customer");
      }
    } catch (err) {
      console.error("Order error:", err);
      alert(err.response?.data?.message || "Failed to place order");
    }
  };

  return (
    <div className="customer-booking-page" style={{ maxWidth: 520, margin: "24px auto", padding: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        marginBottom: 14,
        background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
        borderRadius: 14,
        boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)'
      }}>
        <div>
          <h2 style={{margin: 0, color: 'white', fontSize: '1.25rem'}}>Complete Your Booking</h2>
          {fruit && (
            <p style={{margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem'}}>Fruit: {fruit.name} • Price: ₹{fruit.price}</p>
          )}
        </div>
        <button onClick={() => navigate(-1)} style={{
          background: 'rgba(255,255,255,0.2)',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: 10,
          cursor: 'pointer'
        }}>
          ← Back
        </button>
      </div>

      {fruit ? (
        <div style={{
          background: 'white',
          padding: 18,
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
        }}>
          <div style={{display: 'grid', gap: 10}}>
            <div style={{
              background: '#fffde7',
              border: '1px solid #ffe082',
              color: '#5d4037',
              padding: '10px 12px',
              borderRadius: 10,
              marginBottom: 6,
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              Note: You can cancel this order within 24 hours from the booking time only.
            </div>
            <input
              type="text"
              placeholder="Your Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              style={{padding: '10px 12px', border: '2px solid #e8f5e9', borderRadius: 10, outline: 'none'}}
            />

            <input
              type="tel"
              placeholder="Phone Number (10 digits)"
              value={phone}
              readOnly
              maxLength={10}
              style={{padding: '10px 12px', border: '2px solid #e8f5e9', borderRadius: 10, outline: 'none', background: '#fafafa'}}
            />

            <input
              type="email"
              placeholder="Email Address (Optional)"
              value={email}
              readOnly
              style={{padding: '10px 12px', border: '2px solid #e8f5e9', borderRadius: 10, outline: 'none', background: '#fafafa'}}
            />

            <input
              type="tel"
              placeholder="Alternative Phone (10 digits) - Optional"
              value={alternativePhone}
              onChange={(e) => setAlternativePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
              style={{padding: '10px 12px', border: '2px solid #e8f5e9', borderRadius: 10, outline: 'none'}}
            />

            {/* Structured Delivery Address */}
            <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
              <label htmlFor="houseNo" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>House / Flat No.</label>
              <input
                id="houseNo"
                type="text"
                placeholder="House / Flat No. *"
                value={houseNo}
                onChange={(e)=>{ setHouseNo(e.target.value); if (errors.houseNo) setErrors(prev=>({ ...prev, houseNo: undefined })); }}
                required
                style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
              />
              {errors.houseNo && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.houseNo}</div>)}
              <label htmlFor="street" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>Street / Road</label>
              <input
                id="street"
                type="text"
                placeholder="Street / Road *"
                value={street}
                onChange={(e)=>{ setStreet(e.target.value); if (errors.street) setErrors(prev=>({ ...prev, street: undefined })); }}
                required
                style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
              />
              {errors.street && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.street}</div>)}
              <label htmlFor="area" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>Area / Locality (Optional)</label>
              <input
                id="area"
                type="text"
                placeholder="Area / Locality (Optional)"
                value={area}
                onChange={(e)=>setArea(e.target.value)}
                style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
              />
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                <div style={{display:'grid', gap:6}}>
                  <label htmlFor="town" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>Town / City</label>
                  <input
                    id="town"
                    type="text"
                    placeholder="Town / City *"
                    value={town}
                    onChange={(e)=>{ setTown(e.target.value); if (errors.town) setErrors(prev=>({ ...prev, town: undefined })); }}
                    required
                    style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
                  />
                  {errors.town && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.town}</div>)}
                </div>
                <div style={{display:'grid', gap:6}}>
                  <label htmlFor="stateName" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>State</label>
                  <input
                    id="stateName"
                    type="text"
                    placeholder="State *"
                    value={stateName}
                    onChange={(e)=>{ setStateName(e.target.value); if (errors.stateName) setErrors(prev=>({ ...prev, stateName: undefined })); }}
                    required
                    style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
                  />
                  {errors.stateName && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.stateName}</div>)}
                </div>
              </div>
              <label htmlFor="pincode" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>Pincode</label>
              <input
                id="pincode"
                type="tel"
                placeholder="Pincode (6 digits) *"
                value={pincode}
                onChange={(e)=>{ setPincode(e.target.value.replace(/\D/g,'').slice(0,6)); if (errors.pincode) setErrors(prev=>({ ...prev, pincode: undefined })); }}
                required
                maxLength={6}
                style={{padding:'10px 12px', border:'2px solid #e8f5e9', borderRadius:10, outline:'none'}}
              />
              {errors.pincode && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.pincode}</div>)}
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: 10, alignItems: 'start'}}>
              <label htmlFor="quantity" style={{fontSize:'0.8rem', color:'#374151', fontWeight:600}}>Quantity</label>
              <input
                id="quantity"
                type="number"
                min={1}
                placeholder="Quantity *"
                value={quantity}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = Math.max(1, Math.min(Number(v || 1), Number(fruit?.quantity ?? Infinity)));
                  setQuantity(n);
                  if (errors.quantity) setErrors(prev=>({ ...prev, quantity: undefined }));
                }}
                required
                style={{
                  width: 120,
                  padding: '8px 10px',
                  border: '2px solid #e8f5e9',
                  borderRadius: 10,
                  outline: 'none',
                  fontSize: '0.95rem'
                }}
              />
              {errors.quantity && (<div style={{color:'#b91c1c', fontSize:12}}>{errors.quantity}</div>)}
            </div>

            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4}}>
              <div style={{color: '#2e7d32', fontWeight: 700}}>Total: ₹{Number(fruit.price) * Number(quantity || 0)}</div>
              <div style={{display: 'flex', gap: 8}}>
                <button onClick={() => navigate(-1)} style={{
                  padding: '10px 14px',
                  background: '#e0e0e0',
                  color: '#333',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer'
                }}>Cancel</button>
                <button onClick={() => { if (validateForm()) setShowPayment(true); }} style={{
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #4caf50, #66bb6a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(27, 94, 32, 0.25)'
                }}>Proceed to Pay</button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{textAlign: 'center', color: '#666'}}>Loading fruit details...</p>
      )}

      {showPayment && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16}}>
          <div style={{width:'100%', maxWidth:520, background:'#fff', borderRadius:12, boxShadow:'0 20px 50px rgba(0,0,0,0.25)', overflow:'hidden'}}>
            <div style={{padding:'14px 16px', background:'linear-gradient(135deg, #4caf50, #66bb6a)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <strong>Proceed to Pay</strong>
              <button onClick={() => { setShowPayment(false); setPaymentMethod('COD'); setUpiIdInput(''); setTxnIdInput(''); setUpiError(''); setPaymentSuccess(false); }} style={{background:'transparent', color:'#fff', border:'none', fontSize:18, cursor:'pointer'}}>✖</button>
            </div>
            <div style={{padding:16, display:'grid', gap:12}}>
              {paymentSuccess ? (
                <div style={{textAlign:'center', padding:'40px 16px 28px'}}>
                  <div style={{display:'inline-flex', width:96, height:96, borderRadius:'50%', alignItems:'center', justifyContent:'center', background:'#e8fbea', border:'2px solid #34d399', boxShadow:'0 6px 20px rgba(16,185,129,0.25)'}}>
                    <span style={{fontSize:48, color:'#22c55e'}}>✓</span>
                  </div>
                  <div style={{marginTop:16}}>
                    <div style={{fontSize:22, fontWeight:800, color:'#22c55e', letterSpacing:1, textTransform:'uppercase'}}>{paymentSuccessTitle || 'ORDER PLACED'}</div>
                    <div style={{marginTop:6, color:'#047857', fontWeight:600}}>{paymentSuccessMsg || 'Order confirmed'}</div>
                  </div>
                  <div style={{marginTop:24, color:'#6b7280', fontSize:12}}>You can safely close this tab</div>
                </div>
              ) : (
              <>
              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                <label style={{minWidth:90, fontWeight:700}}>Total</label>
                <input type="text" value={`₹${Number(fruit?.price || 0) * Number(quantity || 0)}`} readOnly style={{flex:1, padding:'8px 10px', border:'1px solid #cbd5e1', borderRadius:8, background:'#f8fafc'}} />
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
                <button onClick={() => { setShowPayment(false); setPaymentMethod('COD'); setUpiIdInput(''); setTxnIdInput(''); setUpiError(''); }} style={{padding:'8px 12px'}}>Cancel</button>
                <button onClick={async ()=>{
                  // Validate UPI if selected
                  if (paymentMethod === 'UPI') {
                    if (!upiIdInput) { setUpiError('UPI ID is required'); return; }
                    if (!isValidUpi(upiIdInput)) { setUpiError('Enter a valid UPI ID (e.g., name@bank)'); return; }
                  }
                  // Place order first
                  await handlePlaceOrder();
                  // If order succeeded, show success then close
                  if (paymentMethod === 'COD') {
                    setPaymentSuccessTitle('ORDER PLACED');
                    setPaymentSuccessMsg('Order placed via Cash on Delivery');
                  } else {
                    setPaymentSuccessTitle('PAYMENT SUCCESSFUL');
                    setPaymentSuccessMsg('Payment received. Order confirmed');
                  }
                  setPaymentSuccess(true);
                  setTimeout(() => {
                    setShowPayment(false);
                    setPaymentSuccess(false);
                    setPaymentSuccessTitle('');
                    setPaymentSuccessMsg('');
                    setUpiIdInput('');
                    setTxnIdInput('');
                    // Navigate back to customer main
                    navigate('/customer');
                  }, 2000);
                }} style={{padding:'8px 12px', background:'#4caf50', color:'#fff', border:'none', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.15)'}}>Pay</button>
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
