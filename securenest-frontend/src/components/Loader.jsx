import React from 'react';

const Loader = ({ fullScreen = true, message = "Synchronizing Vault..." }) => {
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
        @keyframes worm-move {
          0%, 100% { transform: translateX(-50px) scaleX(1); }
          25% { transform: translateX(-20px) scaleX(1.5); }
          50% { transform: translateX(20px) scaleX(1); }
          75% { transform: translateX(50px) scaleX(0.8); }
        }
        @keyframes segment-pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 15px var(--accent-primary); }
        }
        @keyframes worm-container {
           0% { transform: translateX(-30px); }
           100% { transform: translateX(30px); }
        }
        .worm-segment {
          width: 12px;
          height: 12px;
          background: var(--accent-primary);
          border-radius: 50%;
          margin: 0 2px;
          display: inline-block;
        }
      `}</style>

      <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* The Cyber-Worm (Squeezing Body Animation) */}
        <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            animation: 'worm-container 4s ease-in-out infinite alternate' 
        }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="worm-segment" style={{
              animation: 'segment-pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
              filter: `hue-rotate(${i * 10}deg)`
            }}></div>
          ))}
        </div>

        {/* Dynamic Glow Trail */}
        <div style={{
            position: 'absolute',
            width: '120px',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, var(--accent-primary), transparent)',
            bottom: '20%',
            opacity: 0.2,
            filter: 'blur(2px)'
        }}></div>
      </div>

      <p style={{ 
          marginTop: '30px', 
          color: 'var(--text-main)', 
          fontSize: '0.85rem', 
          letterSpacing: '5px', 
          fontWeight: '700', 
          textTransform: 'uppercase',
          opacity: 0.8,
          textAlign: 'center'
      }}>
          {message}
          <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '8px', letterSpacing: '2px' }}>Data Worm Processing</span>
      </p>
    </div>
  );
};

export default Loader;
