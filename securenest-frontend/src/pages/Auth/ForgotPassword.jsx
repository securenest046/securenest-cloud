import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [userId, setUserId] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const handleReset = (e) => {
    e.preventDefault();
    setIsSending(true);
    // The backend will catch the user-id, generate a unique reset link, and send it.
    setTimeout(() => {
        setSubmitted(true);
        setIsSending(false);
    }, 1500);
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card" style={{ maxWidth: '420px' }}>
        <div className="auth-header" style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '700', marginBottom: '12px' }}>Reset Password</h1>
          <p style={{ color: 'var(--text-muted)' }}>Enter your email to receive a password reset link.</p>
        </div>
        
        {!submitted ? (
          <form onSubmit={handleReset}>
            <div className="input-group" style={{ marginBottom: '24px' }}>
              <label>User ID / Email</label>
              <input 
                type="text" 
                className="input-field" 
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user@example.com"
                required 
              />
            </div>

            <button type="submit" disabled={isSending} className="btn-primary" style={{ marginTop: '12px', opacity: isSending ? 0.7 : 1, cursor: isSending ? 'not-allowed' : 'pointer' }}>
              {isSending ? 'Sending Reset Link...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h3 style={{ marginBottom: '8px' }}>Reset Link Sent!</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>If an account exists for that ID, a unique reset link has been dispatched.</p>
          </div>
        )}
        
        <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Remembered it? <span className="link-text" onClick={() => navigate('/login')}>Back to login</span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
