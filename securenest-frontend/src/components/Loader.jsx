import React from 'react';
import { Shield, Lock } from 'lucide-react';

const Loader = ({ fullScreen = true, message = "Securing Connection..." }) => {
  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: fullScreen ? 'rgba(10, 15, 28, 0.98)' : 'rgba(10, 15, 28, 0.4)',
      backdropFilter: 'blur(30px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
        }
        @keyframes scan {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
        @keyframes pulse-shield {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(59, 130, 246, 0.4)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 35px rgba(59, 130, 246, 0.7)); }
        }
        @keyframes ring-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .data-particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: var(--accent-primary);
          border-radius: 50%;
          filter: blur(1px);
        }
      `}</style>

      <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* Outer Rotating Ring */}
        <div style={{ 
          position: 'absolute', width: '100%', height: '100%', 
          border: '2px dashed rgba(59, 130, 246, 0.3)', 
          borderRadius: '50%', 
          animation: 'ring-rotate 10s linear infinite' 
        }}></div>

        {/* Mid Rotating Ring */}
        <div style={{ 
          position: 'absolute', width: '80%', height: '80%', 
          border: '1px solid rgba(59, 130, 246, 0.1)', 
          borderRadius: '50%', 
          borderTop: '2px solid var(--accent-primary)',
          animation: 'ring-rotate 2s cubic-bezier(0.5, 0.2, 0.5, 0.8) infinite' 
        }}></div>

        {/* The Shield Core */}
        <div style={{ 
          position: 'relative', width: '100px', height: '110px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse-shield 3s ease-in-out infinite'
        }}>
          <svg viewBox="0 0 100 115" style={{ position: 'absolute', width: '100%', height: '100%', fill: 'rgba(59, 130, 246, 0.05)', stroke: 'var(--accent-primary)', strokeWidth: '2' }}>
            <path d="M50 0 L95 25 L95 75 C95 100 75 110 50 115 C25 110 5 100 5 75 L5 25 Z" />
          </svg>
          <Lock size={40} color="var(--accent-primary)" style={{ zIndex: 2, position: 'relative', top: '-5px' }} />
          
          {/* Scanning Beam */}
          <div style={{ 
            position: 'absolute', left: '10%', right: '10%', height: '4px', 
            background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
            boxShadow: '0 0 15px var(--accent-primary)',
            animation: 'scan 2.5s linear infinite',
            zIndex: 3
          }} />
        </div>

        {/* Orbiting Data Particles */}
        {[...Array(6)].map((_, i) => (
          <div key={i} className="data-particle" style={{
            animation: `orbit ${2 + i * 0.5}s linear infinite`,
            animationDelay: `-${i * 0.3}s`,
            opacity: 1 - (i * 0.1)
          }}></div>
        ))}
      </div>

      <p style={{ 
          marginTop: '40px', 
          color: 'var(--text-main)', 
          fontSize: '0.9rem', 
          letterSpacing: '4px', 
          fontWeight: '700', 
          textTransform: 'uppercase',
          opacity: 0.8,
          textAlign: 'center'
      }}>
          {message}
          <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '2px' }}>Encryption Vault Syncing</span>
      </p>
    </div>
  );
};

export default Loader;
