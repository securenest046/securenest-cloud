import React, { useEffect, useState } from 'react';

// Premium glassmorphism orb colors ranging from warm to neon
const colors = ['#FF0055', '#4338ca', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

const AnimatedBackground = () => {
  const [mousePos, setMousePos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      overflow: 'hidden', zIndex: -1, background: '#070b14' // Ultra deep space core
    }}>
      {colors.map((color, i) => {
        // Each ball follows the mouse with a different intensity/sluggishness
        const intensity = 0.05 * (i + 1);
        const followX = (mousePos.x - window.innerWidth / 2) * intensity;
        const followY = (mousePos.y - window.innerHeight / 2) * intensity;
        
        // Distribute them artistically across the screen initially
        const startLeft = `${(i * 15) % 100 - 10}%`;
        const startTop = `${(i * 20) % 100 - 10}%`;
        
        return (
          <div key={i} style={{
            position: 'absolute',
            left: startLeft,
            top: startTop,
            transform: `translate(${followX}px, ${followY}px)`,
            transition: 'transform 0.4s ease-out'
          }}>
            <div style={{
                background: color,
                width: `${250 + (i * 20)}px`,
                height: `${250 + (i * 20)}px`,
                borderRadius: '50%',
                filter: 'blur(90px)',
                opacity: 0.65,
                animation: `blobDance ${12 + (i % 3) * 3}s infinite alternate ease-in-out`
            }} />
          </div>
        );
      })}
    </div>
  );
};

export default AnimatedBackground;
