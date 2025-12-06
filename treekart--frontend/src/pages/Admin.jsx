import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

export default function Admin() {
  const [activeTab, setActiveTab] = useState("");
  const [users, setUsers] = useState([]);
  const [trees, setTrees] = useState([]);
  const [fruits, setFruits] = useState([]);
  const [fruitTabStatus, setFruitTabStatus] = useState(""); // '', available|pending|booked|sold
  const now = new Date();
  const [reportMonth, setReportMonth] = useState(now.getMonth() + 1);
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportSubTab, setReportSubTab] = useState('trees');
  const [treeReport, setTreeReport] = useState({ available: 0, booked: 0, sold: 0, total: 0 });
  const [fruitReport, setFruitReport] = useState({ available: 0, booked: 0, sold: 0, pending: 0 });
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [treeStatus, setTreeStatus] = useState(""); // available|booked|sold|'' (all)
  const [fruitFilter, setFruitFilter] = useState(""); // ''|pending|approved|rejected|available|sold
  const [treeDetails, setTreeDetails] = useState([]);
  const [bookingDetails, setBookingDetails] = useState([]);
  const [treeBids, setTreeBids] = useState([]);
  const [fruitItems, setFruitItems] = useState([]);
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const fmt = (v) => (v ? new Date(v).toLocaleDateString('en-GB') : '—');

  const downloadCSV = (rows, headers, filename, titleLine) => {
    const esc = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/\r?\n|\r/g, " ");
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const header = headers.map(h => esc(h.label)).join(",");
    const data = rows.map(r => headers.map(h => esc(r[h.key])).join(","));
    const csv = [titleLine, header, ...data].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    const mm = String(reportMonth).padStart(2, '0');
    const ts = new Date().toLocaleString();
    const base = `report_${reportYear}-${mm}`;
    if (reportSubTab === 'trees') {
      if (treeStatus === 'pending' || treeStatus === 'rejected') {
        const headers = [
          { key: 'treeName', label: 'Tree' },
          { key: 'farmerName', label: 'Farmer' },
          { key: 'farmerPhone', label: 'Farmer Phone' },
          { key: 'farmerEmail', label: 'Farmer Email' },
          { key: 'vendorName', label: 'Vendor Name' },
          { key: 'vendorPhone', label: 'Vendor Phone' },
          { key: 'vendorEmail', label: 'Vendor Email' },
          { key: 'status', label: 'Status' },
          { key: 'proposedPrice', label: 'Proposed Price' },
          ...(treeStatus === 'rejected' ? [
            { key: 'rejectedBy', label: 'Rejected By' },
            { key: 'rejectedAt', label: 'Rejected At' }
          ] : []),
          { key: 'createdAt', label: 'Created' }
        ];
        const rows = (treeBids || []).map(b => ({
          treeName: b.treeName || '',
          farmerName: b.farmerName || '',
          farmerPhone: b.farmerPhone || '',
          farmerEmail: b.farmerEmail || '',
          vendorName: b.vendorName || '',
          vendorPhone: b.vendorPhone || '',
          vendorEmail: b.vendorEmail || '',
          status: b.status || '',
          proposedPrice: b.proposedPrice ?? '',
          rejectedBy: (treeStatus === 'rejected' && b.status === 'rejected') ? (b.farmerName || '') : '',
          rejectedAt: (treeStatus === 'rejected' && b.status === 'rejected' && b.updatedAt) ? new Date(b.updatedAt).toLocaleString() : '',
          createdAt: b.createdAt ? new Date(b.createdAt).toLocaleString() : ''
        }));
        const titleLine = `Title:,Trees Bids (${treeStatus}),Month/Year:,${reportMonth}/${reportYear},Generated:,${ts}`;
        if (rows.length) downloadCSV(rows, headers, `${base}_tree_bids_${treeStatus}.csv`, titleLine);
        return;
      }
      const headers = [
        { key: 'name', label: 'Tree' },
        { key: 'farmerName', label: 'Farmer' },
        { key: 'farmerPhone', label: 'Farmer Phone' },
        { key: 'farmerEmail', label: 'Farmer Email' },
        { key: 'location', label: 'Location' },
        { key: 'status', label: 'Status' },
        { key: 'treeCount', label: 'No. of Trees' },
        { key: 'perTreeRate', label: 'Per Tree Rate (₹)' },
        { key: 'expectedRent', label: 'Expected Rate' },
        { key: 'rateValue', label: 'Rate (₹)' },
        { key: 'leaseDuration', label: 'Duration (mo)' },
        { key: 'vendorBookedAt', label: 'Booked Date' },
        { key: 'soldAt', label: 'Sold Date' },
        { key: 'created', label: 'Created' },
        { key: 'updated', label: 'Updated' }
      ];
      const rows = (treeDetails || []).map(t => {
        const perTree = Number(t.rateValue || 0);
        return ({
          name: t.name || '',
          farmerName: t.farmerName || '',
          farmerPhone: t.farmerPhone || '',
          farmerEmail: t.farmerEmail || '',
          location: t.location || '',
          status: t.status || '',
          treeCount: t.treeCount ?? '',
          perTreeRate: perTree || '',
          expectedRent: t.expectedRent ?? '',
          rateValue: t.rateValue ?? '',
          leaseDuration: t.leaseDuration ?? '',
          vendorBookedAt: (t.status === 'booked' && t.updatedAt) ? new Date(t.updatedAt).toLocaleString() : '',
          soldAt: (t.status === 'sold' && t.updatedAt) ? new Date(t.updatedAt).toLocaleString() : '',
          created: t.createdAt ? new Date(t.createdAt).toLocaleString() : '',
          updated: t.updatedAt ? new Date(t.updatedAt).toLocaleString() : ''
        });
      });
      const titleLine = `Title:,Trees (${treeStatus || 'all'}),Month/Year:,${reportMonth}/${reportYear},Generated:,${ts}`;
      if (rows.length) downloadCSV(rows, headers, `${base}_trees_${treeStatus || 'all'}.csv`, titleLine);
      return;
    }
    // Fruits
    const f = (fruitFilter || '').toLowerCase();
    if (["available", "sold"].includes(f)) {
      const headers = [
        { key: 'name', label: 'Fruit' },
        { key: 'vendorName', label: 'Vendor' },
        { key: 'vendorPhone', label: 'Vendor Phone' },
        { key: 'quantity', label: 'Qty' },
        { key: 'status', label: 'Status' },
        { key: 'createdAt', label: 'Created' },
        { key: 'updatedAt', label: 'Updated' },
        { key: 'price', label: 'Price/kg' },
        { key: 'image', label: 'Image URL' }
      ];
      const rows = (fruitItems || []).map(fi => ({
        name: fi.name || '',
        vendorName: fi.vendorName || fi.vendor || '',
        vendorPhone: fi.vendorPhone || '',
        quantity: fi.quantity ?? '',
        status: fi.status || '',
        createdAt: fi.createdAt ? new Date(fi.createdAt).toLocaleString() : '',
        updatedAt: fi.updatedAt ? new Date(fi.updatedAt).toLocaleString() : '',
        price: fi.price ?? '',
        image: fi.image || ''
      }));
      const titleLine = `Title:,Fruits (${f}),Month/Year:,${reportMonth}/${reportYear},Generated:,${ts}`;
      if (rows.length) downloadCSV(rows, headers, `${base}_fruits_${f}.csv`, titleLine);
    } else {
      const headers = [
        { key: 'fruitName', label: 'Fruit' },
        { key: 'vendorName', label: 'Vendor' },
        { key: 'vendorPhone', label: 'Vendor Phone' },
        { key: 'customerName', label: 'Customer' },
        { key: 'customerPhone', label: 'Customer Phone' },
        { key: 'customerEmail', label: 'Customer Email' },
        { key: 'alternativePhone', label: 'Alt Phone' },
        { key: 'quantity', label: 'Qty' },
        { key: 'bookedAt', label: 'Booked At' },
        { key: 'delivered', label: 'Delivered' },
        { key: 'deliveredAt', label: 'Delivered At' },
        { key: 'canceled', label: 'Canceled' },
        { key: 'canceledAt', label: 'Canceled At' },
        { key: 'location', label: 'Location' },
        { key: 'deliveryAddress', label: 'Address' },
        { key: 'fruitPrice', label: 'Price/kg' }
      ];
      const fLower = (f || '').toLowerCase();
      const list = (bookingDetails || []).filter(b => {
        if (fLower === 'booked') return (b.bookingStatus || '').toLowerCase() === 'approved';
        if (fLower === 'canceled') return !!b.canceled;
        return true;
      });
      const rows = list.map(b => ({
        fruitName: b.fruitName || '',
        vendorName: b.vendorName || b.vendor || '',
        vendorPhone: b.vendorPhone || '',
        customerName: b.customerName || '',
        customerPhone: b.customerPhone || '',
        customerEmail: b.customerEmail || '',
        alternativePhone: b.alternativePhone || '',
        quantity: b.quantity ?? '',
        bookedAt: b.bookedAt ? new Date(b.bookedAt).toLocaleString() : '',
        delivered: b.delivered ? 'Yes' : 'No',
        deliveredAt: b.deliveredAt ? new Date(b.deliveredAt).toLocaleString() : '',
        canceled: b.canceled ? 'Yes' : 'No',
        canceledAt: b.canceledAt ? new Date(b.canceledAt).toLocaleString() : '',
        location: b.location || '',
        deliveryAddress: b.deliveryAddress || '',
        fruitPrice: b.fruitPrice ?? ''
      }));
      const titleLine = `Title:,Fruit Bookings (${f || 'all'}),Month/Year:,${reportMonth}/${reportYear},Generated:,${ts}`;
      if (rows.length) downloadCSV(rows, headers, `${base}_fruit_bookings_${f || 'all'}.csv`, titleLine);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTrees();
    fetchFruits();
  }, []);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(reportMonth, reportYear);
    }
  }, [reportMonth, reportYear]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFruitItems = async (month, year, status) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/reports/fruits/details?month=${month}&year=${year}${status ? `&status=${status}` : ''}`);
      setFruitItems(res.data?.fruits || []);
    } catch (err) {
      console.error("Failed to fetch fruit items", err);
    }
  };

  const fetchTreeBids = async (month, year, bidStatus) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/reports/trees/bids?month=${month}&year=${year}${bidStatus ? `&status=${bidStatus}` : ''}`);
      setTreeBids(res.data?.bids || []);
    } catch (err) {
      console.error("Failed to fetch tree bids", err);
    }
  };

  const fetchTrees = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/trees");
      setTrees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFruits = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/admin/fruits");
      setFruits(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async (month, year) => {
    try {
      setLoadingReport(true);
      setReportError("");
      const [treesRes, fruitsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/admin/reports/trees?month=${month}&year=${year}`),
        axios.get(`http://localhost:5000/api/admin/reports/fruits?month=${month}&year=${year}`)
      ]);
      setTreeReport(treesRes.data);
      setFruitReport(fruitsRes.data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
      setReportError(err.response?.data?.message || err.message || "Failed to load reports");
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports(reportMonth, reportYear);
    }
  }, [activeTab, reportMonth, reportYear]);

  const fetchTreeDetails = async (month, year, status) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/reports/trees/details?month=${month}&year=${year}${status ? `&status=${status}` : ''}`);
      setTreeDetails(res.data?.trees || []);
    } catch (err) {
      console.error("Failed to fetch tree details", err);
    }
  };

  const fetchFruitBookingDetails = async (month, year, status) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/admin/reports/fruits/bookings?month=${month}&year=${year}${status ? `&status=${status}` : ''}`);
      setBookingDetails(res.data?.bookings || []);
    } catch (err) {
      console.error("Failed to fetch fruit booking details", err);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      if (treeStatus === 'pending' || treeStatus === 'rejected') {
        fetchTreeBids(reportMonth, reportYear, treeStatus);
        setTreeDetails([]);
      } else {
        fetchTreeDetails(reportMonth, reportYear, treeStatus);
        setTreeBids([]);
      }
    }
  }, [activeTab, reportMonth, reportYear, treeStatus]);

  useEffect(() => {
    if (activeTab !== "reports") return;
    const f = (fruitFilter || "").toLowerCase();
    // Only 'available' uses fruits items; others use bookings
    if (["available"].includes(f)) {
      fetchFruitItems(reportMonth, reportYear, f);
      setBookingDetails([]);
    } else {
      const mapped = (f === 'booked') ? 'approved' : ( ["", "canceled"].includes(f) ? f : "" );
      fetchFruitBookingDetails(
        reportMonth,
        reportYear,
        mapped
      );
      setFruitItems([]);
    }
  }, [activeTab, reportMonth, reportYear, fruitFilter]);

  // Admin can only view data, no approval/rejection needed

  return (
    <div className="container my-4">
      {/* Header */}
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', padding: '20px 30px', background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(27, 94, 32, 0.25)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <div style={{background: 'rgba(255,255,255,0.2)', padding: '12px', borderRadius: '15px', backdropFilter: 'blur(10px)'}}>
            <span style={{fontSize: '2.5rem'}}></span>
          </div>
          <div>
            <h1 style={{fontSize: '2rem', fontWeight: '800', color: 'white', margin: 0, fontFamily: 'Poppins, sans-serif', letterSpacing: '-0.5px'}}>TreeKart Admin</h1>
            <p style={{margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', fontWeight: '500'}}>Manage your platform</p>
          </div>
        </div>
        <div style={{background: 'rgba(255,255,255,0.2)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(10px)'}}>
          <span style={{color: 'white', fontSize: '0.9rem', fontWeight: '600'}}>Super Admin</span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px'}}>
        <div style={{background: 'linear-gradient(135deg, #4caf50, #66bb6a)', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)', color: 'white', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: '0.1'}}></div>
          <div style={{position: 'relative', zIndex: 1}}>
            <p style={{margin: 0, fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Users</p>
            <h2 style={{margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: '800'}}>{users.length}</h2>
          </div>
        </div>
        
        <div style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)', color: 'white', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: '0.1'}}></div>
          <div style={{position: 'relative', zIndex: 1}}>
            <p style={{margin: 0, fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Trees</p>
            <h2 style={{margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: '800'}}>{trees.length}</h2>
          </div>
        </div>
        
        <div style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)', color: 'white', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: '0.1'}}></div>
          <div style={{position: 'relative', zIndex: 1}}>
            <p style={{margin: 0, fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Fruits</p>
            <h2 style={{margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: '800'}}>{fruits.length}</h2>
          </div>
        </div>
        
        <div style={{background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', padding: '25px', borderRadius: '20px', boxShadow: '0 8px 20px rgba(27, 94, 32, 0.25)', color: 'white', position: 'relative', overflow: 'hidden'}}>
          <div style={{position: 'absolute', top: '-20px', right: '-20px', fontSize: '6rem', opacity: '0.1'}}></div>
          <div style={{position: 'relative', zIndex: 1}}>
            <p style={{margin: 0, fontSize: '0.85rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px'}}>Active Orders</p>
            <h2 style={{margin: '10px 0 0 0', fontSize: '2.5rem', fontWeight: '800'}}>{fruits.reduce((sum, f) => sum + (f.bookings?.length || 0), 0)}</h2>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap'}}>
        {[
          {key: "users", label: "Users", color: "var(--primary)"},
          {key: "reports", label: "Reports", color: "var(--primary)"},
          {key: "profile", label: "Profile", color: "var(--accent)"}
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
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
          </button>
        ))}
      </div>

      <div style={{background: 'white', padding: '30px', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)'}}>
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
              }}>Welcome to TreeKart Admin</h3>
              <p style={{
                margin: '14px 0 0 0',
                color: '#2e7d32',
                fontWeight: 600
              }}>Select a tab above to manage the platform</p>
            </div>
          </div>
        )}
        {/* Users */}
        {activeTab === "users" && (
          <div>
            <h3 style={{color: 'var(--text-dark)', marginBottom: '25px', fontSize: '1.8rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'}}>Registered Users by Role</span>
            </h3>
            
            {/* Farmers Table */}
            <div className="mb-4">
              <h5 className="text-success">Farmers ({users.filter(u => u.role === 'farmer').length})</h5>
              <table className="table table-bordered table-striped">
                <thead className="table-success">
                  <tr><th>User ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'farmer').length > 0 ? 
                    users.filter(u => u.role === 'farmer').map((u, idx) => (
                      <tr key={u._id}>
                        <td>
                          <span className="badge bg-success" style={{fontSize: '0.9rem', fontFamily: 'monospace'}}>
                            F-{String(idx + 1).padStart(4, '0')}
                          </span>
                        </td>
                        <td>{u.name || <span className="text-muted">Not provided</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || <span className="text-muted">Not provided</span>}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="text-center text-muted">No farmers registered yet</td></tr>
                    )
                  }
                </tbody>
              </table>
            </div>

            {/* Vendors Table */}
            <div className="mb-4">
              <h5 className="text-info">Vendors ({users.filter(u => u.role === 'vendor').length})</h5>
              <table className="table table-bordered table-striped">
                <thead className="table-info">
                  <tr><th>User ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'vendor').length > 0 ? 
                    users.filter(u => u.role === 'vendor').map((u, idx) => (
                      <tr key={u._id}>
                        <td>
                          <span className="badge bg-info" style={{fontSize: '0.9rem', fontFamily: 'monospace'}}>
                            V-{String(idx + 1).padStart(4, '0')}
                          </span>
                        </td>
                        <td>{u.name || <span className="text-muted">Not provided</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || <span className="text-muted">Not provided</span>}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="text-center text-muted">No vendors registered yet</td></tr>
                    )
                  }
                </tbody>
              </table>
            </div>

            {/* Customers Table */}
            <div className="mb-4">
              <h5 className="text-warning">Customers ({users.filter(u => u.role === 'customer').length})</h5>
              <table className="table table-bordered table-striped">
                <thead className="table-warning">
                  <tr><th>User ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'customer').length > 0 ? 
                    users.filter(u => u.role === 'customer').map((u, idx) => (
                      <tr key={u._id}>
                        <td>
                          <span className="badge bg-warning text-dark" style={{fontSize: '0.9rem', fontFamily: 'monospace'}}>
                            C-{String(idx + 1).padStart(4, '0')}
                          </span>
                        </td>
                        <td>{u.name || <span className="text-muted">Not provided</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || <span className="text-muted">Not provided</span>}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="text-center text-muted">No customers registered yet</td></tr>
                    )
                  }
                </tbody>
              </table>
            </div>

            {/* Admins Table */}
            <div className="mb-4">
              <h5 className="text-secondary">Admins ({users.filter(u => u.role === 'admin').length})</h5>
              <table className="table table-bordered table-striped">
                <thead className="table-secondary">
                  <tr><th>User ID</th><th>Name</th><th>Email</th><th>Phone</th></tr>
                </thead>
                <tbody>
                  {users.filter(u => u.role === 'admin').length > 0 ? 
                    users.filter(u => u.role === 'admin').map((u, idx) => (
                      <tr key={u._id}>
                        <td>
                          <span className="badge bg-secondary" style={{fontSize: '0.9rem', fontFamily: 'monospace'}}>
                            A-{String(idx + 1).padStart(4, '0')}
                          </span>
                        </td>
                        <td>{u.name || <span className="text-muted">Not provided</span>}</td>
                        <td>{u.email}</td>
                        <td>{u.phone || <span className="text-muted">Not provided</span>}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="text-center text-muted">No admins registered yet</td></tr>
                    )
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Trees */}
        {activeTab === "trees" && (
          <div>
            <h4>Trees Posted by Farmers</h4>
            <table className="table table-bordered table-striped">
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Tree Name</th>
                  <th>Farmer Name</th>
                  <th>Farmer Phone</th>
                  <th>Location</th>
                  <th>No. of Trees</th>
                  <th>Per Tree Rate (₹)</th>
                  <th>Total Amount (₹)</th>
                  <th>Expected Rate (₹)</th>
                  <th>Rate (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {trees.map((t, idx) => (
                  <tr key={t._id}>
                    <td>{idx+1}</td>
                    <td>{t.name}</td>
                    <td>{t.farmerName || 'N/A'}</td>
                    <td>{t.farmerPhone}</td>
                    <td>{t.location || 'N/A'}</td>
                    <td>{t.treeCount ?? '—'}</td>
                    <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                    <td>{(t.treeCount && (t.rateValue ?? t.expectedRent)) ? `₹${Number(t.treeCount) * Number(t.rateValue ?? t.expectedRent)}` : '—'}</td>
                    <td>₹{t.expectedRent}</td>
                    <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                    <td>
                      <span className={`badge ${
                        t.status === 'available' ? 'bg-success' :
                        t.status === 'booked' ? 'bg-primary' :
                        t.status === 'sold' ? 'bg-danger' : 'bg-secondary'
                      }`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Fruits */}
        {activeTab === "fruits" && (
          <div>
            <h4>Fruits Posted by Vendors</h4>
            {(() => {
              const counts = {
                available: fruits.filter(f => (f.status || '').toLowerCase() === 'available').length,
                sold: fruits.filter(f => (f.status || '').toLowerCase() === 'sold').length,
                pending: fruits.filter(f => (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'pending')).length,
                booked: fruits.filter(f => (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'approved')).length,
              };
              const hasStatus = (f, key) => {
                const s = (key || '').toLowerCase();
                if (s === 'available') return (f.status || '').toLowerCase() === 'available';
                if (s === 'sold') return (f.status || '').toLowerCase() === 'sold';
                if (s === 'pending') return (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'pending');
                if (s === 'booked') return (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'approved');
                return true;
              };
              const filtered = (fruits || []).filter(f => hasStatus(f, fruitTabStatus));
              return (
                <>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <span className="badge bg-success">Available: {counts.available}</span>
                    <span className="badge bg-warning text-dark">Pending: {counts.pending}</span>
                    <span className="badge bg-primary">Booked: {counts.booked}</span>
                    <span className="badge bg-danger">Sold: {counts.sold}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <label className="form-label mb-0">Filter status</label>
                    <select className="form-select" style={{ maxWidth: 240 }} value={fruitTabStatus} onChange={(e) => setFruitTabStatus(e.target.value)}>
                      <option value="">All</option>
                      <option value="available">Available</option>
                      <option value="pending">Pending</option>
                      <option value="booked">Booked</option>
                      <option value="sold">Sold</option>
                    </select>
                  </div>
                  <table className="table table-bordered table-striped">
                    <thead className="table-dark">
                      <tr><th>ID</th><th>Image</th><th>Fruit Name</th><th>Vendor</th><th>Vendor Phone</th><th>Price (₹)</th><th>Quantity (kg)</th><th>Bookings</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {filtered.length > 0 ? filtered.map((f, idx) => {
                        const hasPending = (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'pending');
                        const hasApproved = (f.bookings || []).some(b => (b.status || '').toLowerCase() === 'approved');
                        let statusLabel = '';
                        let statusClass = '';
                        if (hasPending) { statusLabel = 'Pending'; statusClass = 'bg-warning text-dark'; }
                        else if (hasApproved) { statusLabel = 'Booked'; statusClass = 'bg-primary'; }
                        else if ((f.status || '').toLowerCase() === 'available') { statusLabel = 'Available'; statusClass = 'bg-success'; }
                        else { statusLabel = 'Sold'; statusClass = 'bg-danger'; }
                        return (
                        <tr key={f._id}>
                          <td>{idx+1}</td>
                          <td>{f.image ? (
                            <img src={f.image} alt="fruit" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 8, border: '1px solid #e5e7eb' }} />
                          ) : '—'}</td>
                          <td>{f.name}</td>
                          <td>{f.vendor || 'N/A'}</td>
                          <td>{f.vendorPhone || 'N/A'}</td>
                          <td>₹{f.price}/kg</td>
                          <td>{f.quantity} kg</td>
                          <td>
                            {f.bookings && f.bookings.length > 0 ? (
                              <span className="badge bg-info">{f.bookings.length} booking(s)</span>
                            ) : (
                              <span className="text-muted">No bookings</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </td>
                        </tr>
                        );
                      }) : (
                        <tr><td colSpan="9" className="text-center">No fruits found</td></tr>
                      )}
                    </tbody>
                  </table>
                </>
              );
            })()}
          </div>
        )}

        {/* Reports */}
        {activeTab === "reports" && (
          <div>
            <h4>Monthly Reports</h4>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 20px', flexWrap: 'wrap' }}>
              <div className="btn-group" role="group" aria-label="Report Tabs">
                <button type="button" className={`btn ${reportSubTab === 'trees' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setReportSubTab('trees')}>Trees</button>
                <button type="button" className={`btn ${reportSubTab === 'fruits' ? 'btn-success' : 'btn-outline-success'}`} onClick={() => setReportSubTab('fruits')}>Fruits</button>
              </div>
              <div className="d-flex gap-2 flex-nowrap align-items-center" style={{overflowX: 'auto'}}>
                <div className="input-group" style={{ maxWidth: 220 }}>
                  <span className="input-group-text">Month</span>
                  <select
                    className="form-select"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                      <option key={m} value={m}>{monthNames[m-1]}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group" style={{ maxWidth: 220 }}>
                  <span className="input-group-text">Year</span>
                  <select
                    className="form-select"
                    value={reportYear}
                    onChange={(e) => setReportYear(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: 7 }).map((_, i) => {
                      const y = now.getFullYear() - 4 + i; // last 4, current, next 2
                      return <option key={y} value={y}>{y}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-primary" onClick={() => fetchReports(reportMonth, reportYear)}>Refresh</button>
                <button type="button" className="btn btn-outline-secondary" onClick={handleDownload} disabled={loadingReport}>Export CSV</button>
              </div>
            </div>

            {reportError && (
              <div className="alert alert-danger" role="alert">
                {reportError}
              </div>
            )}

            {loadingReport ? (
              <p className="text-muted">Loading reports...</p>
            ) : (
              <div>
                <div className="row g-3">
                  {reportSubTab === 'trees' && (
                  <div className="col-12">
                    <div className="card" style={{ borderRadius: 12 }}>
                      <div className="card-body">
                        <h5 className="card-title">Trees Report</h5>
                        <p className="card-subtitle text-muted mb-3">For {reportMonth}/{reportYear}</p>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-success">Available: {treeReport.available}</span>
                          <span className="badge bg-primary">Booked: {treeReport.booked}</span>
                          <span className="badge bg-danger">Sold: {treeReport.sold}</span>
                          <span className="badge bg-secondary">Total: {treeReport.total}</span>
                        </div>
                        <div className="mt-3 d-flex align-items-center gap-2">
                          <label className="form-label mb-0">Filter status</label>
                          <select className="form-select" style={{ maxWidth: 220 }} value={treeStatus} onChange={(e) => setTreeStatus(e.target.value)}>
                            <option value="">All</option>
                            <option value="available">Available</option>
                            <option value="booked">Booked</option>
                            <option value="sold">Sold</option>
                            <option value="pending">Pending (Bids)</option>
                            <option value="rejected">Rejected (Bids)</option>
                          </select>
                        </div>
                        {!(treeStatus === 'pending' || treeStatus === 'rejected') && (
                          <div className="table-responsive mt-3">
                            <table className="table table-sm table-bordered">
                              <thead>
                                {treeStatus === 'available' ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Location</th>
                                    <th>No. of Trees</th>
                                    <th>Per Tree Price</th>
                                    <th>Amount</th>
                                    <th>Updated</th>
                                    <th>Status</th>
                                  </tr>
                                ) : treeStatus === 'booked' ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Location</th>
                                    <th>Vendor</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>No. of Trees</th>
                                    <th>Per Tree Price</th>
                                    <th>Amount</th>
                                    <th>Proposed Price</th>
                                    <th>Duration</th>
                                    <th>Updated</th>
                                    <th>Booked Date</th>
                                    <th>Status</th>
                                  </tr>
                                ) : treeStatus === 'sold' ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Location</th>
                                    <th>Vendor</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>No. of Trees</th>
                                    <th>Per Tree Price</th>
                                    <th>Amount</th>
                                    <th>Proposed Price</th>
                                    <th>Duration</th>
                                    <th>Updated</th>
                                    <th>Booked Date</th>
                                    <th>Sold Date</th>
                                    <th>Status</th>
                                  </tr>
                                ) : (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Location</th>
                                    <th>Status</th>
                                    <th>No. of Trees</th>
                                    <th>Per Tree Rate</th>
                                    <th>Sold Date</th>
                                    <th>Rent</th>
                                    <th>Duration</th>
                                    <th>Booked Date</th>
                                    <th>Updated</th>
                                  </tr>
                                )}
                              </thead>
                              <tbody>
                                {treeDetails.length > 0 ? treeDetails.map((t, idx) => (
                                  treeStatus === 'available' ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{t.name}</td>
                                      <td>{t.farmerName || 'N/A'}</td>
                                      <td>{t.farmerPhone || 'N/A'}</td>
                                      <td>{t.farmerEmail || 'N/A'}</td>
                                      <td>{t.location || 'N/A'}</td>
                                      <td>{t.treeCount ?? '—'}</td>
                                      <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                                      <td>{(typeof t.expectedRent !== 'undefined' && t.expectedRent !== null)
                                        ? `₹${t.expectedRent}`
                                        : ((t.treeCount && t.rateValue) ? `₹${Number(t.treeCount) * Number(t.rateValue)}` : '—')}
                                      </td>
                                      <td>{fmt(t.updatedAt) || fmt(t.createdAt)}</td>
                                      <td><span className={`badge ${
                                        t.status === 'available' ? 'bg-success' :
                                        t.status === 'booked' ? 'bg-primary' :
                                        t.status === 'sold' ? 'bg-danger' : 'bg-secondary'
                                      }`}>{t.status}</span></td>
                                    </tr>
                                  ) : treeStatus === 'booked' ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{t.name}</td>
                                      <td>{t.farmerName || 'N/A'}</td>
                                      <td>{t.farmerPhone || 'N/A'}</td>
                                      <td>{t.farmerEmail || 'N/A'}</td>
                                      <td>{t.location || 'N/A'}</td>
                                      <td>{t.bookedBy || 'N/A'}</td>
                                      <td>{t.vendorPhone || 'N/A'}</td>
                                      <td>{t.vendorEmail || 'N/A'}</td>
                                      <td>{t.treeCount ?? '—'}</td>
                                      <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                                      <td>{(typeof t.expectedRent !== 'undefined' && t.expectedRent !== null)
                                        ? `₹${t.expectedRent}`
                                        : ((t.treeCount && t.rateValue) ? `₹${Number(t.treeCount) * Number(t.rateValue)}` : '—')}
                                      </td>
                                      <td>{typeof t.acceptedPrice !== 'undefined' && t.acceptedPrice !== null ? `₹${t.acceptedPrice}` : '—'}</td>
                                      <td>{t.leaseDuration} mo</td>
                                      <td>{fmt(t.updatedAt) || fmt(t.createdAt)}</td>
                                      <td>{t.status === 'booked' && t.updatedAt ? fmt(t.updatedAt) : '—'}</td>
                                      <td><span className={`badge ${
                                        t.status === 'available' ? 'bg-success' :
                                        t.status === 'booked' ? 'bg-primary' :
                                        t.status === 'sold' ? 'bg-danger' : 'bg-secondary'
                                      }`}>{t.status}</span></td>
                                    </tr>
                                  ) : treeStatus === 'sold' ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{t.name}</td>
                                      <td>{t.farmerName || 'N/A'}</td>
                                      <td>{t.farmerPhone || 'N/A'}</td>
                                      <td>{t.farmerEmail || 'N/A'}</td>
                                      <td>{t.location || 'N/A'}</td>
                                      <td>{t.bookedBy || 'N/A'}</td>
                                      <td>{t.vendorPhone || 'N/A'}</td>
                                      <td>{t.vendorEmail || 'N/A'}</td>
                                      <td>{t.treeCount ?? '—'}</td>
                                      <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                                      <td>{(typeof t.expectedRent !== 'undefined' && t.expectedRent !== null)
                                        ? `₹${t.expectedRent}`
                                        : ((t.treeCount && t.rateValue) ? `₹${Number(t.treeCount) * Number(t.rateValue)}` : '—')}
                                      </td>
                                      <td>{typeof t.acceptedPrice !== 'undefined' && t.acceptedPrice !== null ? `₹${t.acceptedPrice}` : '—'}</td>
                                      <td>{t.leaseDuration} mo</td>
                                      <td>{fmt(t.updatedAt) || fmt(t.createdAt)}</td>
                                      <td>{fmt(t.bookedAt) || fmt(t.createdAt)}</td>
                                      <td>{fmt(t.updatedAt)}</td>
                                      <td><span className={`badge ${
                                        t.status === 'available' ? 'bg-success' :
                                        t.status === 'booked' ? 'bg-primary' :
                                        t.status === 'sold' ? 'bg-danger' : 'bg-secondary'
                                      }`}>{t.status}</span></td>
                                    </tr>
                                  ) : (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{t.name}</td>
                                      <td>{t.farmerName || 'N/A'}</td>
                                      <td>{t.farmerPhone || 'N/A'}</td>
                                      <td>{t.farmerEmail || 'N/A'}</td>
                                      <td>{t.location || 'N/A'}</td>
                                      <td><span className={`badge ${
                                        t.status === 'available' ? 'bg-success' :
                                        t.status === 'booked' ? 'bg-primary' :
                                        t.status === 'sold' ? 'bg-danger' : 'bg-secondary'
                                      }`}>{t.status}</span></td>
                                      <td>{t.treeCount ?? '—'}</td>
                                      <td>{t.rateValue ? `₹${t.rateValue}` : '—'}</td>
                                      <td>{t.status === 'sold' && t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '—'}</td>
                                      <td>₹{t.expectedRent}</td>
                                      <td>{t.leaseDuration} mo</td>
                                      <td>{t.status === 'booked' && t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : '—'}</td>
                                      <td>{t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                  )
                                )) : (
                                  <tr><td colSpan={treeStatus === 'available' ? 11 : (treeStatus === 'booked' ? 17 : 18)} className="text-center text-muted">No records</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                        {(treeStatus === 'pending' || treeStatus === 'rejected') && (
                          <div className="table-responsive mt-3">
                            <h6 className="mb-2">Tree Bids</h6>
                            <table className="table table-sm table-bordered">
                              <thead>
                                {treeStatus === 'pending' ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Vendor Name</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>Amount</th>
                                    <th>Proposed Price</th>
                                    <th>Updated</th>
                                    <th>Bid Date</th>
                                    <th>Status</th>
                                  </tr>
                                ) : treeStatus === 'rejected' ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Vendor Name</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>Amount</th>
                                    <th>Proposed Price</th>
                                    <th>Rejected By</th>
                                    <th>Updated</th>
                                    <th>Rejected At</th>
                                    <th>Status</th>
                                  </tr>
                                ) : (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Tree</th>
                                    <th>Farmer</th>
                                    <th>Farmer Phone</th>
                                    <th>Farmer Email</th>
                                    <th>Vendor Name</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>Status</th>
                                    <th>Proposed Price</th>
                                    {treeStatus === 'rejected' && <th>Rejected By</th>}
                                    {treeStatus === 'rejected' && <th>Rejected At</th>}
                                    <th>Created</th>
                                  </tr>
                                )}
                              </thead>
                              <tbody>
                                {treeBids.length > 0 ? treeBids.map((b, idx) => (
                                  treeStatus === 'pending' ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{b.treeName || '—'}</td>
                                      <td>{b.farmerName || '—'}</td>
                                      <td>{b.farmerPhone || '—'}</td>
                                      <td>{b.farmerEmail || '—'}</td>
                                      <td>{b.vendorName}</td>
                                      <td>{b.vendorPhone}</td>
                                      <td>{b.vendorEmail || '—'}</td>
                                      <td>{(typeof b.expectedRent !== 'undefined' && b.expectedRent !== null)
                                        ? `₹${b.expectedRent}`
                                        : ((b.treeCount && b.rateValue) ? `₹${Number(b.treeCount) * Number(b.rateValue)}` : '—')}
                                      </td>
                                      <td>₹{b.proposedPrice}</td>
                                      <td>{fmt(b.updatedAt)}</td>
                                      <td>{fmt(b.createdAt)}</td>
                                      <td><span className={`badge ${
                                        b.status === 'pending' ? 'bg-warning text-dark' :
                                        b.status === 'accepted' ? 'bg-primary' : 'bg-danger'
                                      }`}>{b.status}</span></td>
                                    </tr>
                                  ) : treeStatus === 'rejected' ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{b.treeName || '—'}</td>
                                      <td>{b.farmerName || '—'}</td>
                                      <td>{b.farmerPhone || '—'}</td>
                                      <td>{b.farmerEmail || '—'}</td>
                                      <td>{b.vendorName}</td>
                                      <td>{b.vendorPhone}</td>
                                      <td>{b.vendorEmail || '—'}</td>
                                      <td>{(typeof b.expectedRent !== 'undefined' && b.expectedRent !== null)
                                        ? `₹${b.expectedRent}`
                                        : ((b.treeCount && b.rateValue) ? `₹${Number(b.treeCount) * Number(b.rateValue)}` : '—')}
                                      </td>
                                      <td>₹{b.proposedPrice}</td>
                                      <td>{b.farmerName || '—'}</td>
                                      <td>{fmt(b.updatedAt)}</td>
                                      <td>{fmt(b.updatedAt)}</td>
                                      <td><span className={`badge ${
                                        b.status === 'pending' ? 'bg-warning text-dark' :
                                        b.status === 'accepted' ? 'bg-primary' : 'bg-danger'
                                      }`}>{b.status}</span></td>
                                    </tr>
                                  ) : (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{b.treeName || '—'}</td>
                                      <td>{b.farmerName || '—'}</td>
                                      <td>{b.farmerPhone || '—'}</td>
                                      <td>{b.farmerEmail || '—'}</td>
                                      <td>{b.vendorName}</td>
                                      <td>{b.vendorPhone}</td>
                                      <td>{b.vendorEmail || '—'}</td>
                                      <td><span className={`badge ${
                                        b.status === 'pending' ? 'bg-warning text-dark' :
                                        b.status === 'accepted' ? 'bg-primary' : 'bg-danger'
                                      }`}>{b.status}</span></td>
                                      <td>₹{b.proposedPrice}</td>
                                      <td>{fmt(b.createdAt)}</td>
                                    </tr>
                                  )
                                )) : (
                                  <tr><td colSpan={treeStatus === 'rejected' ? 14 : 13} className="text-center text-muted">No bids</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
                {reportSubTab === 'fruits' && (
                <div className="row g-3 mt-3">
                  <div className="col-12">
                    <div className="card" style={{ borderRadius: 12 }}>
                      <div className="card-body">
                        <h5 className="card-title">Fruits Report</h5>
                        <p className="card-subtitle text-muted mb-3">For {reportMonth}/{reportYear}</p>
                        <div className="d-flex flex-wrap gap-2">
                          <span className="badge bg-success">Available: {fruitReport.available}</span>
                          <span className="badge bg-warning text-dark">Pending: {fruitReport.pending}</span>
                          <span className="badge bg-primary">Booked (approved): {fruitReport.booked}</span>
                          <span className="badge bg-danger">Sold: {fruitReport.sold}</span>
                        </div>
                        <div className="mt-3 d-flex align-items-center gap-2">
                          <label className="form-label mb-0">Filter</label>
                          <select className="form-select" style={{ maxWidth: 260 }} value={fruitFilter} onChange={(e) => setFruitFilter(e.target.value)}>
                            <option value="">All</option>
                            <option value="booked">Booked (Bookings)</option>
                            <option value="canceled">Canceled (Bookings)</option>
                            <option value="available">Available (Fruits)</option>
                            <option value="sold">Sold (Fruits)</option>
                          </select>
                        </div>
                        {(((fruitFilter || "").toLowerCase()) === 'available') ? (
                          <div className="table-responsive mt-3">
                            <table className="table table-sm table-bordered">
                              <thead>
                                {((fruitFilter || "").toLowerCase() === 'available') ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Fruit</th>
                                    <th>Vendor</th>
                                    <th>Vendor Phone</th>
                                    <th>Quantity</th>
                                    <th>Price/kg</th>
                                    <th>Updated</th>
                                    <th>Status</th>
                                  </tr>
                                ) : (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Image</th>
                                    <th>Fruit</th>
                                    <th>Vendor</th>
                                    <th>Vendor Phone</th>
                                    <th>Qty</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Updated</th>
                                    <th>Price/kg</th>
                                  </tr>
                                )}
                              </thead>
                              <tbody>
                                {fruitItems.length > 0 ? fruitItems.map((f, idx) => (
                                  ((fruitFilter || "").toLowerCase() === 'available') ? (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{f.name}</td>
                                      <td>{f.vendorName || f.vendor || 'N/A'}</td>
                                      <td>{f.vendorPhone || 'N/A'}</td>
                                      <td>{f.quantity}</td>
                                      <td>₹{f.price}</td>
                                      <td>{fmt(f.updatedAt)}</td>
                                      <td><span className={`badge ${
                                        f.status === 'available' ? 'bg-success' : 'bg-danger'
                                      }`}>{f.status}</span></td>
                                    </tr>
                                  ) : (
                                    <tr key={idx}>
                                      <td>{idx + 1}</td>
                                      <td>{f.image ? (
                                        <img src={f.image} alt="fruit" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 6, border: '1px solid #e5e7eb' }} />
                                      ) : '—'}</td>
                                      <td>{f.name}</td>
                                      <td>{f.vendorName || f.vendor || 'N/A'}</td>
                                      <td>{f.vendorPhone || 'N/A'}</td>
                                      <td>{f.quantity}</td>
                                      <td><span className={`badge ${
                                        f.status === 'available' ? 'bg-success' : 'bg-danger'
                                      }`}>{f.status}</span></td>
                                      <td>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '—'}</td>
                                      <td>{f.updatedAt ? new Date(f.updatedAt).toLocaleString() : '—'}</td>
                                      <td>₹{f.price}</td>
                                    </tr>
                                  )
                                )) : (
                                  <tr><td colSpan={(fruitFilter || "").toLowerCase() === 'available' ? 8 : 10} className="text-center text-muted">No records</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="table-responsive mt-3">
                            <table className="table table-sm table-bordered">
                              <thead>
                                {((fruitFilter || '').toLowerCase() === 'sold') ? (
                                  <tr>
                                    <th>S.No</th>
                                    <th>Fruit</th>
                                    <th>Vendor</th>
                                    <th>Vendor Phone</th>
                                    <th>Vendor Email</th>
                                    <th>Customer</th>
                                    <th>Customer Phone</th>
                                    <th>Customer Email</th>
                                    <th>Customer Location</th>
                                    <th>Booked At</th>
                                    <th>Sold Date</th>
                                    <th>Price/kg</th>
                                    <th>Qty</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                  </tr>
                                ) : (
                                  ((fruitFilter || '').toLowerCase() === 'booked') ? (
                                    <tr>
                                      <th>S.No</th>
                                      <th>Fruit</th>
                                      <th>Vendor</th>
                                      <th>Vendor Phone</th>
                                      <th>Vendor Email</th>
                                      <th>Customer</th>
                                      <th>Customer Phone</th>
                                      <th>Customer Email</th>
                                      <th>Phone</th>
                                      <th>Booked At</th>
                                      <th>Price/kg</th>
                                      <th>Qty</th>
                                      <th>Total Amount</th>
                                      <th>Status</th>
                                    </tr>
                                  ) : (
                                    <tr>
                                      <th>S.No</th>
                                      <th>Fruit</th>
                                      <th>Vendor</th>
                                      <th>Vendor Phone</th>
                                      <th>Vendor Email</th>
                                      <th>Customer</th>
                                      <th>Customer Phone</th>
                                      <th>Customer Email</th>
                                      <th>Phone</th>
                                      <th>Booked At</th>
                                      <th>Canceled At</th>
                                      <th>Price/kg</th>
                                      <th>Qty</th>
                                      <th>Total Amount</th>
                                      <th>Status</th>
                                    </tr>
                                  )
                                )}
                              </thead>
                              <tbody>
                                {(() => {
                                  const fLower = (fruitFilter || '').toLowerCase();
                                  const list = (bookingDetails || []).filter(b => {
                                    if (fLower === 'booked') return (b.bookingStatus || '').toLowerCase() === 'approved';
                                    if (fLower === 'canceled') return !!b.canceled;
                                    if (fLower === 'sold') return !!b.delivered; // treat delivered as sold
                                    return true;
                                  });
                                  return list.length > 0 ? list.map((b, idx) => {
                                  const currentFilter = (fruitFilter || '').toLowerCase();
                                  let statusText = b.bookingStatus || '—';
                                  if (currentFilter === 'canceled') statusText = 'Canceled';
                                  else if (currentFilter === 'booked') statusText = 'Booked';
                                  else if (currentFilter === 'sold') statusText = 'Sold';
                                  const statusLower = (statusText || '').toLowerCase();
                                  const statusClass = statusLower === 'booked' ? 'bg-primary' : (statusLower === 'pending' ? 'bg-warning text-dark' : (statusLower === 'canceled' ? 'bg-danger' : 'bg-secondary'));
                                  return (
                                    ((fruitFilter || '').toLowerCase() === 'sold') ? (
                                      <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>{b.fruitName}</td>
                                        <td>{b.vendorName || b.vendor || 'N/A'}</td>
                                        <td>{b.vendorPhone || 'N/A'}</td>
                                        <td>{b.vendorEmail || b.vendor || '—'}</td>
                                        <td>{b.customerName}</td>
                                        <td>{b.customerPhone}</td>
                                        <td>{b.customerEmail || '—'}</td>
                                        <td>{b.location || '—'}</td>
                                        <td>{fmt(b.bookedAt)}</td>
                                        <td>{fmt(b.deliveredAt)}</td>
                                        <td>₹{b.fruitPrice}</td>
                                        <td>{b.quantity}</td>
                                        <td>{(typeof b.fruitPrice !== 'undefined' && typeof b.quantity !== 'undefined') ? `₹${Number(b.fruitPrice) * Number(b.quantity)}` : '—'}</td>
                                        <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                                      </tr>
                                    ) : (
                                      <tr key={idx}>
                                        <td>{idx + 1}</td>
                                        <td>{b.fruitName}</td>
                                        <td>{b.vendorName || b.vendor || 'N/A'}</td>
                                        <td>{b.vendorPhone || 'N/A'}</td>
                                        <td>{b.vendorEmail || b.vendor || '—'}</td>
                                        <td>{b.customerName}</td>
                                        <td>{b.customerPhone}</td>
                                        <td>{b.customerEmail || '—'}</td>
                                        <td>{b.alternativePhone || '—'}</td>
                                        <td>{fmt(b.bookedAt)}</td>
                                        {((fruitFilter || '').toLowerCase() === 'booked') ? null : (
                                          <td>{fmt(b.canceledAt)}</td>
                                        )}
                                        <td>₹{b.fruitPrice}</td>
                                        <td>{b.quantity}</td>
                                        <td>{(typeof b.fruitPrice !== 'undefined' && typeof b.quantity !== 'undefined') ? `₹${Number(b.fruitPrice) * Number(b.quantity)}` : '—'}</td>
                                        <td><span className={`badge ${statusClass}`}>{statusText}</span></td>
                                      </tr>
                                    )
                                  );
                                  }) : (
                                    <tr><td colSpan={((fruitFilter || '').toLowerCase() === 'sold') ? 15 : 15} className="text-center text-muted">No records</td></tr>
                                  );
                                })()}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )}
              </div>
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
            }}>Admin Profile</h3>

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
                      {JSON.parse(localStorage.getItem("user"))?.name || 'Admin'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '20px', borderBottom: '2px solid #e8f5e9', paddingBottom: '15px'}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                  <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                  <div>
                    <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Email</p>
                    <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                      {JSON.parse(localStorage.getItem("user"))?.email || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{marginBottom: '0'}}>
                <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
                  <span style={{fontSize: '1.5rem', marginRight: '10px'}}></span>
                  <div>
                    <p style={{margin: 0, fontSize: '0.85rem', color: '#666'}}>Phone Number</p>
                    <p style={{margin: 0, fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-dark)'}}>
                      {JSON.parse(localStorage.getItem("user"))?.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
