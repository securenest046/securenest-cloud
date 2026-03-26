import React from 'react';
import { X, Download } from 'lucide-react';

const FileViewer = ({ file, blobUrl, vaultKey, onClose }) => {
  if (!file || !blobUrl) return null;

  const type = file.mimeType || '';

  const renderContent = () => {
    if (type.startsWith('image/')) {
       return <img src={blobUrl} alt={file.originalName} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', borderRadius: '8px' }} />;
    } else if (type.startsWith('video/')) {
       return <video src={blobUrl} controls autoPlay style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} />;
    } else if (type.startsWith('audio/')) {
       return (
         <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <h4 style={{ marginBottom: '24px', opacity: 0.8 }}>Playing Encrypted Audio</h4>
            <audio src={blobUrl} controls autoPlay style={{ width: '400px' }} />
         </div>
       );
    } else if (type === 'application/pdf') {
       return <iframe src={blobUrl} style={{ width: '100%', height: '85vh', border: 'none', borderRadius: '8px', background: '#fff' }} title={file.originalName} />;
    } else if (type.startsWith('text/') || type === 'application/json' || type.includes('javascript') || type.includes('css') || type.includes('html')) {
       return <iframe src={blobUrl} style={{ width: '100%', height: '85vh', border: 'none', borderRadius: '8px', background: '#fff' }} title={file.originalName} />;
    } else {
       return (
         <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
           <h2 style={{ marginBottom: '16px', fontSize: '1.5rem' }}>Binary Format</h2>
           <p style={{ color: 'var(--text-muted)' }}>Live preview is not supported for generic binaries.<br/>Please download the source file using the button above.</p>
         </div>
       );
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
       {/* Top Navigation Bar */}
       <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', fontWeight: '500' }}>{file.originalName}</h3>
          
          <div style={{ display: 'flex', gap: '24px' }}>
             <button onClick={async () => {
                if (!vaultKey) return alert("Cryptographic key missing. Refresh dashboard.");
                const { downloadSecuredZip } = await import('../utils/zipUtils');
                const rawBlob = await fetch(blobUrl).then(r => r.blob());
                await downloadSecuredZip(file, rawBlob, vaultKey);
             }} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500', transition: 'color 0.2s' }}>
                <Download size={20} /> Secure Download (.zip)
             </button>

             <div style={{ width: '1px', background: 'var(--border-color)' }}></div>
             
             <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                <X size={24} />
             </button>
          </div>
       </div>

       {/* Media Canvas */}
       <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', overflow: 'hidden' }}>
          {renderContent()}
       </div>
    </div>
  );
};
export default FileViewer;
