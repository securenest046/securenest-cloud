import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/Loader';
import AnimatedBackground from '../../components/AnimatedBackground';
import { useDialog } from '../../context/DialogContext';

const OtpVerify = () => {
  const [emailOtp, setEmailOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { showAlert } = useDialog();
  
  const email = location.state?.email || '';

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsVerifying(true);
    
    try {
        // 1. Verify NodeMailer Email OTP securely via Backend API
        const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/otp/verify-otp`, { email, otp: emailOtp });
        
        if (data.success) {
            // 2. Native Auth User Registration Creation into GCP via React Context
            const userCredentials = await signup(email, location.state?.password);
            
            // 3. Vault Mongoose Synchronization (Establishing robust DB profile)
            await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/sync`, {
                userId: userCredentials.user.uid,
                email,
                fullName: location.state?.fullName || 'SecureVault User',
                phone: 'Verified Inside Dashboard' // Placeholder to keep model happy if it expects phone
            });
            
            // 4. Secure Transfer
            navigate('/home');
        }
    } catch (error) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        showAlert("Verification Integrity Failure", `The security transmission was declined at ${backendUrl}: ${error.response?.data?.message || error.message}`);
    } finally {
        setIsVerifying(false);
    }
  };

  return (
    <div className="auth-container">
      <AnimatedBackground />
      {isVerifying && <Loader message="Verifying Cryptographic Footprint..." />}
      <div className="glass-panel auth-card slide-in-right" style={{ maxWidth: '450px' }}>
        <div className="auth-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem' }}>Verify Identity</h1>
          <p style={{color: 'var(--text-muted)'}}>We've sent a 6-digit cryptographic code securely to <br/><strong style={{color: '#fff'}}>{email}</strong></p>
        </div>
        
        <form onSubmit={handleVerify}>
          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label>Verification Key</label>
            <input 
              type="text" 
              maxLength="6"
              className="input-field" 
              value={emailOtp}
              onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.2rem', fontWeight: '600' }}
              required 
            />
          </div>

          <button type="submit" className="btn-primary" disabled={emailOtp.length !== 6} style={{ opacity: (emailOtp.length === 6) ? 1 : 0.5, cursor: (emailOtp.length === 6) ? 'pointer' : 'not-allowed' }}>
            Verify & Create Vault
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Didn't receive the codes? <span className="link-text">Resend</span>
        </p>
      </div>
    </div>
  );
};

export default OtpVerify;
