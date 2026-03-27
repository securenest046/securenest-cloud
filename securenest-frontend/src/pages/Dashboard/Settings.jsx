import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Key, ArrowLeft, Save, Copy, Check, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

const Settings = () => {
  const { currentUser, updateUserPassword, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  
  const [vaultKey, setVaultKey] = useState("Fetching unique vault hardware key...");
  const [userData, setUserData] = useState(null);
  const [showVaultKey, setShowVaultKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
      old: false,
      new: false,
      confirm: false
  });

  const [emailVerification, setEmailVerification] = useState({
      state: 'idle', 
      otp: '',
      loading: false
  });

  useEffect(() => {
    const fetchData = async () => {
        if (!currentUser) return;
        try {
            const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
            const syncRes = await axios.post(`${bUrl}/api/auth/sync`, {
                userId: currentUser.uid,
                email: currentUser.email
            });
            if (syncRes.data.success) {
                setUserData(syncRes.data.user);
                setVaultKey(syncRes.data.user.encryptionKey);
                setFormData(prev => ({
                    ...prev,
                    fullName: syncRes.data.user.fullName || prev.fullName,
                    email: syncRes.data.user.email || prev.email
                }));
                if (syncRes.data.user.emailVerified) {
                    setEmailVerification(prev => ({ ...prev, state: 'verified' }));
                }
            }
        } catch (err) {
            console.error("Settings Sync Error", err);
            setVaultKey("Connection Error: Backend Unreachable");
        }
    };
    fetchData();
  }, [currentUser]);

  const handleCopy = () => {
      navigator.clipboard.writeText(vaultKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleVerifyEmailReq = async () => {
      setEmailVerification({...emailVerification, loading: true});
      try {
          const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          await axios.post(`${bUrl}/api/auth/verify-email-request`, { email: currentUser.email });
          setEmailVerification({...emailVerification, state: 'pending', loading: false});
          alert("Verification OTP sent to your email.");
      } catch (err) {
          alert("Failed to send verification email. Please try again.");
          setEmailVerification({...emailVerification, loading: false});
      }
  };

  const handleVerifyEmailSubmit = async () => {
      setEmailVerification({...emailVerification, loading: true});
      try {
          const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          await axios.post(`${bUrl}/api/auth/verify-email-confirm`, { 
              email: currentUser.email,
              otp: emailVerification.otp
          });
          setEmailVerification({...emailVerification, state: 'verified', loading: false});
          alert("Email verified successfully!");
      } catch (err) {
          alert("Invalid OTP. Please check and try again.");
          setEmailVerification({...emailVerification, loading: false});
      }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
        await updateUserProfile(formData.fullName);
        
        if (isChangingPassword && formData.newPassword) {
            if (formData.newPassword !== formData.confirmNewPassword) {
                throw new Error("New passwords do not match.");
            }
            await updateUserPassword(formData.oldPassword, formData.newPassword);
        }

        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        await axios.post(`${bUrl}/api/auth/sync`, {
            userId: currentUser.uid,
            email: currentUser.email,
            fullName: formData.fullName,
            emailVerified: emailVerification.state === 'verified'
        });

        alert("Settings synchronized successfully!");
        
        setIsChangingPassword(false);
        setFormData(prev => ({
            ...prev,
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        }));
        
        navigate('/home');
    } catch (err) {
        console.error("Settings Update Failed:", err);
        const detail = err.response?.data?.detail || err.message;
        alert(`Failed to update settings: ${detail}\n\nHINT: Re-authentication may have failed if your current password was incorrect.`);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg-dark)' }}>
      <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '32px', fontSize: '1.1rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
         <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto', padding: '48px' }}>
         <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '700', marginBottom: '8px' }}>Account Settings</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage your identity, security, and encryption preferences.</p>
         </div>

         <form onSubmit={handleSave}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Personal Information</h3>
            <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
               <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label>Full Name</label>
                  <input type="text" name="fullName" className="input-field" value={formData.fullName} onChange={handleChange} required />
               </div>
               <div className="input-group" style={{ marginBottom: 0, gridColumn: 'span 2' }}>
                  <label>Email Address {emailVerification.state === 'verified' && <span style={{ color: 'var(--success)' }}>✓ Verified</span>}</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input type="email" name="email" className="input-field" value={formData.email} onChange={handleChange} required disabled={emailVerification.state === 'verified'} style={{ minWidth: 0, flex: '1 1 180px' }} />
                      {emailVerification.state === 'idle' && (
                          <button type="button" onClick={handleVerifyEmailReq} disabled={emailVerification.loading} style={{ padding: '0 16px', height: '44px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: '500', flex: '0 0 auto' }}>
                              {emailVerification.loading ? '...' : 'Verify'}
                          </button>
                      )}
                  </div>
                  {emailVerification.state === 'pending' && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                          <input type="text" placeholder="OTP" className="input-field" value={emailVerification.otp} onChange={(e) => setEmailVerification({...emailVerification, otp: e.target.value})} maxLength="6" style={{ letterSpacing: '4px', textAlign: 'center', minWidth: 0, flex: '1 1 120px' }} />
                          <button type="button" onClick={handleVerifyEmailSubmit} disabled={emailVerification.loading} className="btn-primary" style={{ padding: '0 24px', width: 'auto', flex: '0 0 auto' }}>
                              {emailVerification.loading ? '...' : 'Submit'}
                          </button>
                      </div>
                  )}
               </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Security Parameter Update</h3>
            <div style={{ marginBottom: '40px' }}>
               {!isChangingPassword ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '500' }}>Password</span>
                        <span style={{ color: 'var(--text-muted)', letterSpacing: '4px' }}>••••••••</span>
                     </div>
                     <button type="button" onClick={() => setIsChangingPassword(true)} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = '#000'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-primary)'; }}>
                        Change Password
                     </button>
                  </div>
               ) : (
                  <>
                    <div className="settings-password-grid">
                       <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Current Password</label>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type={showPasswords.old ? "text" : "password"} 
                              name="oldPassword" 
                              className="input-field" 
                              value={formData.oldPassword} 
                              onChange={handleChange} 
                              placeholder="Current" 
                              required
                              autoComplete="new-password"
                              style={{ paddingRight: '40px', background: 'rgba(255,255,255,0.05)' }} 
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                       </div>
                       <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>New Password</label>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type={showPasswords.new ? "text" : "password"} 
                              name="newPassword" 
                              className="input-field" 
                              value={formData.newPassword} 
                              onChange={handleChange} 
                              placeholder="New"
                              required
                              autoComplete="new-password"
                              style={{ paddingRight: '40px', background: 'rgba(255,255,255,0.05)' }}
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                       </div>
                       <div className="input-group" style={{ marginBottom: 0 }}>
                          <label>Confirm Password</label>
                          <div style={{ position: 'relative' }}>
                            <input 
                              type={showPasswords.confirm ? "text" : "password"} 
                              name="confirmNewPassword" 
                              className="input-field" 
                              value={formData.confirmNewPassword} 
                              onChange={handleChange} 
                              placeholder="Re-type"
                              required
                              autoComplete="new-password"
                              style={{ paddingRight: '40px', background: 'rgba(255,255,255,0.05)' }}
                            />
                            <button 
                              type="button" 
                              onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                              {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                       </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '12px' }}>
                       <button type="button" onClick={() => setIsChangingPassword(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Cancel change</button>
                    </div>
                  </>
               )}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Cryptographic Identity</h3>
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '24px', borderRadius: '12px', marginBottom: '40px' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Key size={24} color="var(--success)" />
                  <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>Master Encryption Key</span>
               </div>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>This 40-character key is used to execute mathematical, military-grade client-side encryption on your payloads locally before they reach the backend. It auto-rotates every 30 days securely.</p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', position: 'relative' }}>
                  <input 
                    type={showVaultKey ? "text" : "password"} 
                    className="input-field" 
                    value={vaultKey} 
                    readOnly 
                    style={{ minWidth: 0, flex: '1 1 200px', width: '100%', fontFamily: 'monospace', color: 'var(--success)', letterSpacing: showVaultKey ? '1px' : '4px', background: 'rgba(0,0,0,0.5)', cursor: 'not-allowed', textAlign: 'center', paddingRight: '120px' }}
                  />
                  <div style={{ position: 'absolute', right: '70px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      type="button" 
                      onClick={() => setShowVaultKey(!showVaultKey)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showVaultKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <button type="button" onClick={handleCopy} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '56px', background: 'var(--accent-primary)', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 10px rgba(59, 130, 246, 0.4)', position: 'absolute', right: '0', top: '0', bottom: '0' }}>
                     {copied ? <Check size={20} strokeWidth={3} color="#10b981" /> : <Copy size={20} />}
                  </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
               <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? 'Synchronizing Vault...' : <><Save size={18} /> Save Changes</>}
               </button>
            </div>
         </form>
      </div>
    </div>
  );
};

export default Settings;
