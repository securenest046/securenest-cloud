import React from 'react';

const Loader = ({ fullScreen = true, message = "" }) => {
  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: fullScreen ? 'rgba(10, 15, 28, 0.8)' : 'rgba(10, 15, 28, 0.3)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10000,
      overflow: 'hidden'
    }}>
      <style>{`
        @keyframes graph-pulse {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-30px); opacity: 1; box-shadow: 0 0 15px var(--accent-primary); }
        }
        .pulse-ball {
          width: 10px;
          height: 10px;
          background: var(--accent-primary);
          border-radius: 50%;
          margin: 0 4px;
          display: inline-block;
        }
      `}</style>

      <div style={{ position: 'relative', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '40px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="pulse-ball" style={{
              animation: 'graph-pulse 1s ease-in-out infinite',
              animationDelay: `${i * 0.15}s`,
              filter: `hue-rotate(${i * 15}deg)`
            }}></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Loader;
