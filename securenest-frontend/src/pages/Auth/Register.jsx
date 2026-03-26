import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import axios from 'axios';
import Loader from '../../components/Loader';
import AnimatedBackground from '../../components/AnimatedBackground';

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });
  
  const [pwdCriteria, setPwdCriteria] = useState({
    length: false,
    upperLower: false,
    number: false,
    symbol: false
  });

  const navigate = useNavigate();

  useEffect(() => {
    const p = formData.password;
    setPwdCriteria({
      length: p.length >= 8,
      upperLower: /[a-z]/.test(p) && /[A-Z]/.test(p),
      number: /[0-9]/.test(p),
      symbol: /[^a-zA-Z0-9]/.test(p)
    });
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const [isSending, setIsSending] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    const allMet = Object.values(pwdCriteria).every(Boolean);
    if (!allMet) return;
    
    setIsSending(true);
    try {
       const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/otp/send-otp`, { email: formData.email });
       if (data.success) {
           navigate('/otp-verify', { state: { email: formData.email, phone: formData.phone, password: formData.password, fullName: formData.fullName }});
       } else {
           alert("Failed to send OTP: " + data.message);
       }
    } catch (err) {
       console.error(err);
       alert("Network synchronization error sending OTP");
    } finally {
       setIsSending(false);
    }
  };

  const handleGoogleSignIn = () => {
    // google auth placeholder
  }

  const Criterion = ({ met, text }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: met ? 'var(--success)' : 'var(--danger)', fontSize: '0.85rem', marginBottom: '6px' }}>
      {met ? <Check size={14} /> : <X size={14} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="auth-container">
      <AnimatedBackground />
      {isSending && <Loader message="Transmitting Encryption Bridge Keys..." />}
      <div className="glass-panel auth-card slide-in-right" style={{ maxWidth: '540px', padding: '40px' }}>
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="SecureNest" style={{ width: '64px', height: '64px', objectFit: 'contain', marginBottom: '12px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} />
          <h1 style={{ fontSize: '1.8rem', margin: 0, paddingBottom: '8px' }}>Create Account</h1>
          <p style={{color: 'var(--text-muted)'}}>Join SecureNest for your 50GB vault</p>
        </div>
        
        <form onSubmit={handleRegister}>
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Full Name</label>
            <input type="text" name="fullName" className="input-field" onChange={handleChange} required />
          </div>
          
          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Email Address</label>
            <input type="email" name="email" className="input-field" onChange={handleChange} required />
          </div>

          <div className="input-group" style={{ marginBottom: '16px' }}>
            <label>Master Password</label>
            <input type="password" name="password" className="input-field" onChange={handleChange} required />
          </div>

          {formData.password && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
              <Criterion met={pwdCriteria.length} text="At least 8 characters" />
              <Criterion met={pwdCriteria.upperLower} text="Uppercase & lowercase letters" />
              <Criterion met={pwdCriteria.number} text="At least one number" />
              <Criterion met={pwdCriteria.symbol} text="At least one special symbol" />
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={!Object.values(pwdCriteria).every(Boolean) || isSending} style={{ opacity: Object.values(pwdCriteria).every(Boolean) && !isSending ? 1 : 0.5, cursor: Object.values(pwdCriteria).every(Boolean) && !isSending ? 'pointer' : 'not-allowed' }}>
            {isSending ? 'Transmitting Secure Code...' : 'Continue'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ padding: '0 12px', fontSize: '0.9rem' }}>or sign up with</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleSignIn}
            className="input-field" 
            style={{ width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', height: '50px' }}
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px' }}/>
            <span style={{ fontWeight: '500' }}>Google</span>
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Already have an account? <span className="link-text" onClick={() => navigate('/login')}>Sign in</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
