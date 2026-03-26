import React from 'react';

const Loader = ({ fullScreen = true, message = "Securing Connection..." }) => {
  return (
    <div style={{
      position: fullScreen ? 'fixed' : 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      background: fullScreen ? 'rgba(15,23,42,0.95)' : 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999
    }}>
      <div className="cube-loader">
        <div className="cube-top"></div>
        <div className="cube-bottom"></div>
        <div className="cube-left"></div>
        <div className="cube-right"></div>
        <div className="cube-front"></div>
        <div className="cube-back"></div>
      </div>
      <p style={{ 
          marginTop: '60px', 
          color: 'var(--accent-primary)', 
          fontSize: '1.1rem', 
          letterSpacing: '3px', 
          fontWeight: '600', 
          animation: 'pulseText 1.5s infinite',
          textTransform: 'uppercase'
      }}>
          {message}
      </p>
    </div>
  );
};

export default Loader;
