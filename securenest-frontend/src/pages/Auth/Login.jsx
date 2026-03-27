import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AnimatedBackground from '../../components/AnimatedBackground';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/home');
    } catch (error) {
      alert("Failed to sign in. Check your credentials.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const userCredentials = await loginWithGoogle();
      if (!userCredentials || !userCredentials.user) throw new Error("Google access was not granted.");

      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      // Attempt silent sync, but don't block the user from their dashboard if the server is just slow
      axios.post(`${bUrl}/api/auth/sync`, {
          userId: userCredentials.user.uid,
          email: userCredentials.user.email,
          fullName: userCredentials.user.displayName || 'Vault User'
      }).catch(err => console.error("Identity sync deferred:", err));

      navigate('/home');
    } catch (error) {
      console.error(error);
      const isDomainError = error.message.includes('unauthorized-domain');
      alert(isDomainError 
        ? "CRITICAL: Current Domain not authorized in Firebase! Please add your Vercel URL to the Firebase Console Authorized Domains list."
        : `Access Failed: ${error.message}`
      );
    }
  };

  return (
    <div className="auth-container">
      <AnimatedBackground />
      <div className="glass-panel auth-card slide-in-left" style={{ maxWidth: '450px' }}>
        <div className="auth-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="/logo.png" alt="SecureNest" style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '16px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }} />
          <h1 style={{ margin: 0, paddingBottom: '8px' }}>SecureNest</h1>
          <p style={{color: 'var(--text-muted)'}}>Welcome back to your private vault</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="input-field" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required 
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required 
            />
          </div>
          
          <div style={{ textAlign: 'right', marginBottom: '24px' }}>
            <span className="link-text" style={{ fontSize: '0.9rem' }}>Forgot password?</span>
          </div>

           <button type="submit" className="btn-primary" style={{ marginBottom: '16px' }}>Login</button>
          
          <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
            <span style={{ padding: '0 12px', fontSize: '0.9rem' }}>or continue with</span>
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

        <p style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Don't have an account? <span className="link-text" onClick={() => navigate('/register')}>Sign up</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
