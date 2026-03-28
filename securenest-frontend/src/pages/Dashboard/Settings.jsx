import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, ShieldAlert, Key, Eye, EyeOff, Copy, Check, Save, Lock, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import Loader from '../../components/Loader';
import { triggerPlatformAuth } from '../../utils/localAuth';
import { useDialog } from '../../context/DialogContext';

const Settings = () => {
  const { currentUser, updateUserPassword, updateUserProfile, reauthenticate } = useAuth();
  const { showAlert, showToast } = useDialog();
  const navigate = useNavigate();
  
  const [vaultKey, setVaultKey] = useState("Loading...");
  const [showVaultKey, setShowVaultKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  // Biometric Gateway & Manual Fallback States 🛡️
  const [showKeyAuthModal, setShowKeyAuthModal] = useState({ active: false, action: null });
  const [manualPass, setManualPass] = useState("");
  const [isAuthVerifying, setIsAuthVerifying] = useState(false);
  const [authError, setAuthError] = useState("");

  const [showPasswords, setShowPasswords] = useState({
      old: false,
      new: false,
      confirm: false
  });

  const [emailVerification, setEmailVerification] = useState({
      state: 'idle', // 'idle', 'pending', 'verified'
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
        } catch (error) {
            console.error("Settings Sync Error", error);
            setVaultKey("Connection Error: Backend Unreachable");
        }
    };
    const init = async () => {
        setPageLoading(true);
        await fetchData();
        setTimeout(() => setPageLoading(false), 1200);
    };
    init();
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
          const response = await axios.post(`${bUrl}/api/auth/verify-email-request`, { email: currentUser.email });
          if (response.data.success) {
            showToast("success", "Email verification sent. Please check your inbox.");
            setEmailVerification({...emailVerification, state: 'pending', loading: false});
          }
      } catch (error) {
          showToast("error", "Failed to send verification email. Please try again.");
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
          showToast("success", "Email address verified successfully.");
      } catch (error) {
          showToast("error", "Invalid verification code. Please try again.");
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

        showToast("success", "Settings saved successfully.");
        setTimeout(() => navigate('/home'), 1500);
        
        setIsChangingPassword(false);
        setFormData(prev => ({
            ...prev,
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: ''
        }));
    } catch (error) {
        console.error("Settings Update Failed:", error);
        const detail = error.response?.data?.detail || error.message;
        showToast("error", `Failed to update settings: ${detail}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleVaultKeyAction = async (action) => {
    try {
      await triggerPlatformAuth();
      if (action === 'toggle') setShowVaultKey(!showVaultKey);
      if (action === 'copy') {
        navigator.clipboard.writeText(vaultKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      if (err.message === 'REAUTH_CANCELLED' || err.name === 'NotAllowedError') return;
      setShowKeyAuthModal({ active: true, action });
    }
  };

  const verifyManualAuth = async (e) => {
    e.preventDefault();
    setIsAuthVerifying(true);
    setAuthError("");
    try {
      await reauthenticate(manualPass);
      if (showKeyAuthModal.action === 'toggle') setShowVaultKey(!showVaultKey);
      if (showKeyAuthModal.action === 'copy') {
        navigator.clipboard.writeText(vaultKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      setShowKeyAuthModal({ active: false, action: null });
      setManualPass("");
      setAuthError("");
    } catch (err) {
      setAuthError("Verification failed. Please check your password.");
    } finally {
      setIsAuthVerifying(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px', background: 'var(--bg-dark)' }}>
      <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '32px', fontSize: '1.1rem', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
         <ArrowLeft size={20} /> Back to Dashboard
      </button>

      <div className="glass-panel" style={{ maxWidth: '850px', margin: '0 auto', padding: '48px' }}>
         <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0 }}>Account Settings</h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your security and account details.</p>
            </div>
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
                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Universal Encryption Key</label>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>This unique key is required to recover your data if you lose access. <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Never share this with anyone.</span></p>
                     </div>
                     <button type="button" onClick={() => setIsChangingPassword(true)} style={{ background: 'transparent', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent-primary)'; e.currentTarget.style.color = '#000'; }} onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent-primary)'; }}>
                        Change Password
                     </button>
                  </div>
               ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', animation: 'fadeIn 0.3s ease-out', alignItems: 'start' }}>
                     <div className="input-group" style={{ marginBottom: 0, minWidth: 0 }}>
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
                            style={{ paddingRight: '40px' }} 
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
                     <div className="input-group" style={{ marginBottom: 0, minWidth: 0 }}>
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
                            style={{ paddingRight: '40px' }}
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
                     <div className="input-group" style={{ marginBottom: 0, minWidth: 0 }}>
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
                            style={{ paddingRight: '40px' }}
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
                     <div style={{ gridColumn: 'span 3', textAlign: 'right', marginTop: '4px' }}>
                        <button type="button" onClick={() => setIsChangingPassword(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Cancel change</button>
                     </div>
                  </div>
               )}
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '20px', color: 'var(--accent-primary)' }}>Encryption Key</h3>
                <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <ShieldCheck size={20} color="var(--accent-primary)" />
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>End-to-End Encryption</h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                    Your data is encrypted using AES-256 before it ever leaves your device. Only you hold the keys to unlock it.
                  </p>
                </div>
                <div className="vault-key-row" style={{ height: '54px', marginTop: '24px' }}>
                  <div className="vault-key-display" style={{ letterSpacing: showVaultKey ? '1px' : '4px', textAlign: 'center' }}>
                    {showVaultKey ? vaultKey : '••••••••••••••••••••••••'}
                  </div>
                  <div className="vault-key-action-group">
                    <button 
                      type="button" 
                      onClick={() => handleVaultKeyAction('toggle')}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {showVaultKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleVaultKeyAction('copy')} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
               <button type="submit" className="btn-primary" disabled={isSaving} style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 32px', opacity: isSaving ? 0.7 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
               </button>
            </div>
         </form>
      </div>

      {pageLoading && <Loader message="Loading settings..." />}

      {showKeyAuthModal.active && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20000, animation: 'fadeIn 0.3s ease-out' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '40px', textAlign: 'center', border: '1px solid var(--accent-primary)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)', background: 'rgba(15, 23, 42, 0.95)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: 'var(--accent-primary)' }}>
              <Lock size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Verify Password</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px' }}>Please enter your account password to continue.</p>
            
            <form onSubmit={verifyManualAuth}>
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Password"
                  value={manualPass}
                  onChange={(e) => setManualPass(e.target.value)}
                  autoFocus
                  required
                  style={{ textAlign: 'center', letterSpacing: '2px' }}
                />
              </div>
              
              {authError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px' }}>{authError}</p>}
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowKeyAuthModal({ active: false, action: null }); setManualPass(""); setAuthError(""); }}
                  className="btn-primary" 
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={isAuthVerifying}
                >
                  {isAuthVerifying ? 'Verifying...' : 'Verify Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
