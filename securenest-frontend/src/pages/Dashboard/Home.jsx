import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, File, Folder, Image as ImageIcon, Video, FileText, User, Settings as SettingsIcon, LogOut, Key, MoreVertical, Download, Edit2, Info, Grid, List as ListIcon, LayoutGrid, Maximize2, RefreshCw, Copy, Check, ChevronLeft, X, PieChart } from 'lucide-react';
import FileViewer from '../../components/FileViewer';

const Home = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [vaultKey, setVaultKey] = useState("Loading...");
  
  const fileInputRef = React.useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const [activeMenu, setActiveMenu] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [blobCache, setBlobCache] = useState({});

  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
      navigator.clipboard.writeText(vaultKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Sorting and Viewing State
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'size'
  const [viewMode, setViewMode] = useState('medium'); // 'large', 'medium', 'small', 'list'

  const MAX_STORAGE = 50 * 1024 * 1024 * 1024; // 50 GB natively stored on Telegram Cloud via Relay

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    try {
      // Connect to the real backend metadata pipeline
      const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/storage/files/${currentUser.uid}`);
      if (data.success) {
         setUserFiles(data.files);
         setTotalStorageUsed(data.totalStorageUsed);
         setVaultKey(data.vaultKey);
      }
    } catch (error) {
      console.error("Dashboard Sync Failed", error);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      console.log("Failed to logout");
    }
  };

  const handleActionClick = (e, fileId) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === fileId ? null : fileId);
  };

  const handleUploadSelectedFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!vaultKey || vaultKey === 'Loading...') {
          alert('Error: Cryptographic Vault Key is not ready. Please try again.');
          return;
      }

      setIsUploading(true);
      try {
          // Dynamic import of cryptography module
          const { encryptFileForUpload } = await import('../../utils/cryptoFunctions');
          
          // Execute AES-GCM Client-Side Encryption
          const { cipherBlob, iv } = await encryptFileForUpload(file, vaultKey);

          // Prepare Multipart Engine for Axios
          const formData = new FormData();
          formData.append('file', cipherBlob, file.name);
          formData.append('userId', currentUser.uid);
          formData.append('originalName', file.name);
          formData.append('mimeType', file.type || 'application/octet-stream');
          formData.append('ivArray', JSON.stringify(iv));

          /* Upload fully locally AES encrypted payload to generic backend pipe natively */
          const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/storage/upload`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (data.success) {
              // Immediately inject new node into telemetry UI
              setUserFiles(prev => [data.file, ...prev]);
              setTotalStorageUsed(prev => prev + data.file.fileSize);
          } else {
              alert('Upload gateway declined the transmission.');
          }
      } catch (err) {
          console.error("Upload Error", err);
          alert('Critical Error during encryption or transmission.');
      } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = null;
      }
  };

  const handleFileClick = async (file) => {
    if (blobCache[file._id]) {
      setViewingFile({ meta: file, url: blobCache[file._id] });
      return;
    }
    
    // Deep Integration Decryption Pathway
    try {
        const { data } = await axios.get(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/storage/download/${file._id}`);
        if (data.success && data.fileLink) {
           const response = await fetch(data.fileLink);
           const rawBuffer = await response.arrayBuffer();
           
           const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
           const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, file.iv, file.mimeType);
           const objectUrl = URL.createObjectURL(decryptedBlob);

           setBlobCache({...blobCache, [file._id]: objectUrl });
           setViewingFile({ meta: file, url: objectUrl });
        }
    } catch (e) {
        console.error(e);
        alert("Verification Error: Failed to retrieve or decrypt Telegram payload.");
    }
  };
  
  // Real-Time Storage Calculations Context
  const getPercentage = (used, max) => Math.min((used / max) * 100, 100).toFixed(1);
  const overallUsed = getPercentage(totalStorageUsed, MAX_STORAGE);
  
  const getCategoryTheme = (type) => {
     switch(type) {
         case 'Images': return { color: '#3b82f6', shadow: 'rgba(59, 130, 246, 0.5)' };
         case 'Videos': return { color: '#10b981', shadow: 'rgba(16, 185, 129, 0.5)' };
         case 'Documents': return { color: '#f59e0b', shadow: 'rgba(245, 158, 11, 0.5)' };
         case 'PDFs': return { color: '#ef4444', shadow: 'rgba(239, 68, 68, 0.5)' };
         case 'Audio': return { color: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.5)' };
         case 'Archives': return { color: '#06b6d4', shadow: 'rgba(6, 182, 212, 0.5)' };
         default: return { color: '#64748b', shadow: 'rgba(100, 116, 139, 0.5)' };
     }
  };

  const dynamicCategories = React.useMemo(() => {
      let store = {};
      userFiles.forEach(f => {
          let type = 'Others';
          const mime = (f.mimeType || '').toLowerCase();
          if (mime.startsWith('image/')) type = 'Images';
          else if (mime.startsWith('video/')) type = 'Videos';
          else if (mime.startsWith('audio/')) type = 'Audio';
          else if (mime.includes('pdf')) type = 'PDFs';
          else if (mime.includes('document') || mime.includes('msword') || mime.includes('text')) type = 'Documents';
          else if (mime.includes('zip') || mime.includes('compressed') || mime.includes('tar') || mime.includes('rar')) type = 'Archives';
          
          store[type] = (store[type] || 0) + f.fileSize;
      });
      return Object.entries(store)
          .map(([name, size]) => ({ name, size, percent: totalStorageUsed ? ((size / totalStorageUsed) * 100).toFixed(1) : '0.0', theme: getCategoryTheme(name) }))
          .sort((a,b) => b.size - a.size); // Sort logically by size hierarchy descending
  }, [userFiles, totalStorageUsed]);

  const topCategories = showAllCategories ? dynamicCategories : dynamicCategories.slice(0, 3);
  const hiddenCategoriesCount = Math.max(0, dynamicCategories.length - 3);

  let conicStops = [];
  let currentDegree = 0;
  if (totalStorageUsed === 0) {
      conicStops.push(`rgba(255,255,255,0.05) 0deg`);
  } else {
      dynamicCategories.forEach(cat => {
          const spanDegrees = (cat.size / MAX_STORAGE) * 360;
          conicStops.push(`${cat.theme.color} ${currentDegree}deg`);
          conicStops.push(`${cat.theme.color} ${currentDegree + spanDegrees}deg`);
          currentDegree += spanDegrees;
      });
      conicStops.push(`rgba(255,255,255,0.05) ${currentDegree}deg`);
  }
  const conicGradientStr = `conic-gradient(${conicStops.join(', ')})`;

  // Advanced Matrix Sorting Process
  const sortedFiles = [...userFiles].sort((a, b) => {
      if (sortBy === 'name') return a.originalName.localeCompare(b.originalName);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {viewingFile && (
         <FileViewer 
            file={viewingFile.meta} 
            blobUrl={viewingFile.url} 
            onClose={() => setViewingFile(null)} 
         />
      )}

      {/* Header Pipeline */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>SecureNest</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid var(--border-color)' }} onClick={() => setProfileOpen(!profileOpen)}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600' }}>
                {currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}
             </div>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap' }}>{currentUser?.displayName || 'Vault User'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser?.email}</span>
             </div>
          </div>
          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', top: '70px', right: '0', width: '320px', padding: '20px', zIndex: 300, animation: 'fadeIn 0.2s ease-out', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', margin: 0 }}><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Vault Encryption Key</p>
                   <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? 'var(--success)' : 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                      {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
                   </button>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--success)', wordBreak: 'break-all', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  {vaultKey}
                </div>
              </div>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '12px', color: '#fff' }} onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Manage Account Settings
              </button>
              <button style={{ width: '100%', marginBottom: '12px', padding: '10px', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem', fontWeight: '600' }} onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }} onClick={() => { setProfileOpen(false); alert("Redirecting to Google Multi-Auth Provider...")}}>
                 <span style={{ fontSize: '1.4rem', lineHeight: '1' }}>+</span> Add Another Account
              </button>
              <button className="btn-primary" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <LogOut size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Sandbox */}
      <main className="dashboard-main" style={{ display: 'flex', flex: 1, padding: '40px 60px', gap: '40px' }} onClick={() => setActiveMenu(null)}>
        
        {/* Left Computing Core */}
        <div className="dashboard-left" style={{ flex: '0 0 calc(75% - 20px)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
             <div>
               <h2 style={{ fontSize: '2.5rem', marginBottom: '8px', fontWeight: '700' }}>Dashboard</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your files and encrypted binaries safely.</p>
             </div>
             
             {/* Toolbar Controls Matrix */}
             <div className="toolbar-matrix" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', outline: 'none', cursor: 'pointer' }}>
                   <option value="date" style={{ background: 'var(--bg-dark)'}}>Sort by Date Modified</option>
                   <option value="size" style={{ background: 'var(--bg-dark)'}}>Sort by File Size</option>
                   <option value="name" style={{ background: 'var(--bg-dark)'}}>Sort by Name</option>
                </select>

                <div className="view-mode-buttons" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                   <button onClick={() => setViewMode('large')} style={{ background: viewMode === 'large' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer', flex: 1 }}><Maximize2 size={18} /></button>
                   <button onClick={() => setViewMode('medium')} style={{ background: viewMode === 'medium' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer', flex: 1 }}><Grid size={18} /></button>
                   <button onClick={() => setViewMode('small')} style={{ background: viewMode === 'small' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer', flex: 1 }}><LayoutGrid size={18} /></button>
                   <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer', flex: 1 }}><ListIcon size={18} /></button>
                </div>

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUploadSelectedFile} />
                <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', whiteSpace: 'nowrap', opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }} onClick={() => !isUploading && fileInputRef.current?.click()} disabled={isUploading}>
                   {isUploading ? <RefreshCw size={18} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : <Upload size={18} />} 
                   {isUploading ? 'Encrypting...' : 'Upload'}
                </button>
                
                <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open Storage Insight">
                   <ChevronLeft size={20} />
                </button>
             </div>
          </div>
          
          {userFiles.length === 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '450px', background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.05), rgba(15, 23, 42, 0.4))', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'fadeIn 0.6s ease-out' }}>
                <img src="/logo.png" alt="SecureNest Welcome" style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '16px', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
                <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '12px', background: 'linear-gradient(to right, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>Welcome, {currentUser?.displayName?.split(' ')[0] || 'User'}!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', textAlign: 'center', maxWidth: '420px', lineHeight: '1.6', marginBottom: '32px' }}>Your fully private encryption vault is ready. Upload your first file to initiate the dynamic telemetry engine.</p>
                
                <button className="btn-primary" style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', width: 'auto', opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }} onClick={() => !isUploading && fileInputRef.current?.click()} disabled={isUploading}>
                   {isUploading ? <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : <Upload size={20} />} 
                   {isUploading ? 'Encrypting...' : 'Upload First File'}
                </button>
             </div>
          ) : viewMode === 'list' ? (
             <div className="file-grid-adaptive" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedFiles.map(file => (
                   <div key={file._id} onClick={() => handleFileClick(file)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s', flexWrap: 'wrap' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'var(--bg-card)'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '150px' }}>
                         {file.mimeType.startsWith('image/') ? <ImageIcon size={20} color="var(--accent-primary)" /> : file.mimeType.startsWith('video/') ? <Video size={20} color="var(--accent-primary)" /> : <File size={20} color="var(--accent-primary)" />}
                         <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '30vw' }}>{file.originalName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '4px' }}>
                         <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'right' }}>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                         <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'right' }}>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                   </div>
                ))}
             </div>
          ) : (
             <div className="file-grid-adaptive" style={{ display: 'grid', gridTemplateColumns: viewMode === 'large' ? 'repeat(auto-fill, minmax(320px, 1fr))' : viewMode === 'small' ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                {sortedFiles.map(file => (
                    <div key={file._id} onClick={() => handleFileClick(file)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: viewMode === 'small' ? '12px' : '20px', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
                        <div style={{ width: viewMode === 'small' ? '36px' : '48px', height: viewMode === 'small' ? '36px' : '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                           {file.mimeType.startsWith('image/') ? <ImageIcon size={viewMode === 'small' ? 18 : 24} /> : file.mimeType.startsWith('video/') ? <Video size={viewMode === 'small' ? 18 : 24} /> : <File size={viewMode === 'small' ? 18 : 24} />}
                        </div>
                        <h4 style={{ fontSize: viewMode === 'small' ? '0.9rem' : '1.05rem', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.originalName}</h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{(file.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}</p>
                    </div>
                ))}
            </div>
          )}
        </div>

        {/* Right 25% Component - Telemetry Ring Data (Acts as Drawer on Mobile) */}
        {sidebarOpen && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 190 }} onClick={() => setSidebarOpen(false)} />}
        
        <div className={`glass-panel dashboard-right ${sidebarOpen ? 'sidebar-open' : ''}`} style={{ flex: '0 0 calc(25% - 20px)', padding: '36px', display: 'flex', flexDirection: 'column', alignSelf: 'flex-start', position: 'sticky', top: '120px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
             <h3 style={{ fontSize: '1.3rem', fontWeight: '600' }}>Storage Insight</h3>
             <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={fetchDashboardData} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s', padding: '4px' }} onMouseOver={(e) => e.currentTarget.style.color = '#fff'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}><RefreshCw size={18} /></button>
                <button className="mobile-sidebar-toggle" style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => setSidebarOpen(false)}>
                   <X size={16} />
                </button>
             </div>
          </div>
          
          <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto 40px auto', borderRadius: '50%', background: conicGradientStr, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)' }}>
             <div style={{ width: '170px', height: '170px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{overallUsed}%</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>of Free 50 GB</span>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {dynamicCategories.length === 0 ? (
               <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0' }}>No categorical data stored yet...</div>
            ) : (
                topCategories.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: cat.theme.color, boxShadow: `0 0 10px ${cat.theme.shadow}` }}></div>
                        <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{cat.name}</span>
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.percent}%</span>
                    </div>
                ))
            )}
            
            {!showAllCategories && hiddenCategoriesCount > 0 && (
                <button onClick={() => setShowAllCategories(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--border-color)', color: 'var(--text-muted)', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s', marginTop: '8px' }} onMouseOver={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }} onMouseOut={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; e.currentTarget.style.color='var(--text-muted)'; }}>
                   + Show {hiddenCategoriesCount} {hiddenCategoriesCount === 1 ? 'Other Category' : 'Other Categories'}
                </button>
            )}
            {showAllCategories && hiddenCategoriesCount > 0 && (
                <button onClick={() => setShowAllCategories(false)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', padding: '4px', cursor: 'pointer', fontSize: '0.85rem', marginTop: '4px', textAlign: 'center' }}>
                   Show Less
                </button>
            )}

            <div style={{ width: '100%', height: '1px', background: 'var(--border-color)', margin: '8px 0' }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}></div>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Free Space</span>
              </div>
              <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-muted)' }}>{(100 - parseFloat(overallUsed)).toFixed(1)}%</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
};
export default Home;
