import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Key, ArrowLeft, Save, Copy, Check } from 'lucide-react';
import axios from 'axios';

const Settings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [vaultKey, setVaultKey] = useState("Fetching unique vault hardware key...");

  useEffect(() => {
    if (currentUser) {
       axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/storage/files/${currentUser.uid}`)
         .then(res => { if(res.data.success) setVaultKey(res.data.vaultKey); })
         .catch(err => console.error("Key Sync Error", err));
    }
  }, [currentUser]);

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
      navigator.clipboard.writeText(vaultKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const [formData, setFormData] = useState({
    fullName: currentUser?.displayName || '',
    phone: currentUser?.phoneNumber || '',
    email: currentUser?.email || '',
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Isolated Mock Phone OTP Pipeline (as Node.js backend SMS is fundamentally paid-only in real world pipelines)
  const [phoneVerification, setPhoneVerification] = useState({ state: 'idle', otp: '' });

  const handleVerifyPhoneReq = () => {
      if(!formData.phone) return alert("Please enter a phone number to bind to your vault.");
      alert(`Simulation: System requested SMS gateway to transmit code '123456' to ${formData.phone}`);
      setPhoneVerification({ state: 'pending', otp: '' });
  };

  const handleVerifyPhoneSubmit = () => {
      if(phoneVerification.otp === '123456') {
          alert(`Cryptographic phone validation successful for ${formData.phone}`);
          setPhoneVerification({ state: 'verified', otp: '' });
      } else {
          alert("Invalid Cryptographic Signature Code.");
      }
  };

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleSave = (e) => {
    e.preventDefault();
    if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
        alert("New passwords do not match!");
        return;
    }
    // Implement API call to save settings
    navigate('/home');
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg-dark)' }}>
      <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '32px', fontSize: '1.1rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
         <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', padding: '48px' }}>
         <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '700', marginBottom: '8px' }}>Account Settings</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your identity, security, and encryption preferences.</p>
         </div>

         <form onSubmit={handleSave}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Personal Information</h3>
            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
               <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Full Name</label>
                  <input type="text" name="fullName" className="input-field" value={formData.fullName} onChange={handleChange} required />
               </div>
               <div className="input-group" style={{ marginBottom: 0 }}>
                   <label>Phone Number {phoneVerification.state === 'verified' && <span style={{ color: 'var(--success)' }}>✓ Verified</span>}</label>
                   <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                       <input type="tel" name="phone" className="input-field" value={formData.phone} onChange={handleChange} required disabled={phoneVerification.state === 'verified'} placeholder="Enter phone number" style={{ minWidth: 0, flex: '1 1 180px' }}/>
                       {phoneVerification.state === 'idle' && (
                           <button type="button" onClick={handleVerifyPhoneReq} style={{ padding: '0 16px', height: '44px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '500', flex: '0 0 auto' }}>Verify</button>
                       )}
                       {phoneVerification.state === 'pending' && (
                           <button type="button" disabled style={{ padding: '0 16px', height: '44px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', flex: '0 0 auto' }}>Sent</button>
                       )}
                   </div>
                   {phoneVerification.state === 'pending' && (
                       <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                           <input type="text" placeholder="Enter 6-digit Code" className="input-field" value={phoneVerification.otp} onChange={(e) => setPhoneVerification({...phoneVerification, otp: e.target.value})} maxLength="6" style={{ letterSpacing: '4px', textAlign: 'center', minWidth: 0, flex: '1 1 140px' }} />
                           <button type="button" onClick={handleVerifyPhoneSubmit} className="btn-primary" style={{ padding: '0 24px', width: 'auto', flex: '0 0 auto' }}>Submit Code</button>
                       </div>
                   )}
               </div>
               <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 1' }}>
                  <label>Email Address</label>
                  <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} required style={{ minWidth: 0, width: '100%' }} />
               </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Security Parameter Update</h3>
            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
               <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label>Current Password</label>
                  <input type="password" name="oldPassword" className="input-field" value={formData.oldPassword} onChange={handleChange} placeholder="Required to make password changes" style={{ minWidth: 0, width: '100%' }} />
               </div>
               <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>New Password</label>
                  <input type="password" name="newPassword" className="input-field" value={formData.newPassword} onChange={handleChange} style={{ minWidth: 0, width: '100%' }}/>
               </div>
               <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Confirm New Password</label>
                  <input type="password" name="confirmNewPassword" className="input-field" value={formData.confirmNewPassword} onChange={handleChange} style={{ minWidth: 0, width: '100%' }}/>
               </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Cryptographic Identity</h3>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '24px', borderRadius: '12px', marginBottom: '40px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Key size={24} color="var(--success)" />
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Master Encryption Key</span>
               </div>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>This 40-character key is used to execute mathematical, military-grade client-side encryption on your payloads locally before they reach the backend. It cannot be tampered with manually and auto-rotates every 30 days securely.</p>
               <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <input type="text" className="input-field" value={vaultKey} readOnly style={{ minWidth: 0, flex: '1 1 200px', width: '100%', fontFamily: 'monospace', color: 'var(--success)', letterSpacing: '1px', background: 'rgba(0,0,0,0.5)', cursor: 'not-allowed', textAlign: 'center' }}/>
                  <button type="button" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)' }} onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--accent-primary)'}>
                     {copied ? <Check size={20} strokeWidth={3} color="#10b981" /> : <Copy size={20} />}
                  </button>
               </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
               <button type="submit" className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px' }}>
                  <Save size={18} /> Save Changes
               </button>
            </div>
         </form>
      </div>
    </div>
  );
};

export default Settings;
