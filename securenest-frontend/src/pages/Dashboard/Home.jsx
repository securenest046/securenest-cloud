import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, File, Folder, Image as ImageIcon, Video, FileText, User, Settings as SettingsIcon, LogOut, Key, MoreVertical, Download, Edit2, Info, Grid, List as ListIcon, LayoutGrid, Maximize2, RefreshCw, Copy, Check, ChevronLeft, X, PieChart, Trash2, Trash, ShieldAlert, Mail, Smartphone, Eye, EyeOff, Fingerprint, Globe, UserPlus } from 'lucide-react';
import FileViewer from '../../components/FileViewer';

const Home = () => {
  const { currentUser, logout, login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalView, setAccountModalView] = useState('options'); // 'options', 'login', 'signup'
  const [accountFormData, setAccountFormData] = useState({ email: '', password: '', fullName: '', confirmPassword: '' });
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [showAccountPass, setShowAccountPass] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [vaultKey, setVaultKey] = useState("Loading...");
  
  const fileInputRef = React.useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const [recentAccounts, setRecentAccounts] = useState(() => {
    const saved = localStorage.getItem('recentAccounts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (currentUser) {
      setRecentAccounts(prev => {
        const filtered = prev.filter(acc => acc.uid !== currentUser.uid);
        const newAcc = { 
            uid: currentUser.uid, 
            email: currentUser.email, 
            displayName: currentUser.displayName || 'Vault User'
        };
        const updated = [newAcc, ...filtered].slice(0, 5);
        localStorage.setItem('recentAccounts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentUser]);

  const handleRemoveRecent = (e, uid) => {
    e.stopPropagation();
    setRecentAccounts(prev => {
        const updated = prev.filter(acc => acc.uid !== uid);
        localStorage.setItem('recentAccounts', JSON.stringify(updated));
        return updated;
      });
  };

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

  const MAX_STORAGE = 50 * 1024 * 1024 * 1024; 
  const [userData, setUserData] = useState(null);
  const [showVaultKey, setShowVaultKey] = useState(false);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      // 1. Sync & Fetch User Account Status
      const syncRes = await axios.post(`${bUrl}/api/auth/sync`, {
          userId: currentUser.uid,
          email: currentUser.email,
          fullName: currentUser.displayName || 'SecureVault User'
      });
      
      if (syncRes.data.success) {
          setUserData(syncRes.data.user);
          setVaultKey(syncRes.data.user.encryptionKey);
      }

      // 2. Fetch Vault Files
      const { data } = await axios.get(`${bUrl}/api/storage/files/${currentUser.uid}`);
      if (data.success) {
          setUserFiles(data.files);
          setTotalStorageUsed(data.totalStorageUsed);
      }
    } catch (error) {
      console.error("Dashboard Sync Failed", error);
      const detail = error.response?.data?.detail || error.message;
      setVaultKey(`Error: ${detail}`);
      
      // Fallback: Attempt to load files even if sync had issues
      try {
          const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          const { data } = await axios.get(`${bUrl}/api/storage/files/${currentUser.uid}`);
          if (data.success) {
              setUserFiles(data.files);
              setTotalStorageUsed(data.totalStorageUsed);
          }
      } catch (e) { 
          console.error("Critical recovery fetch failed", e);
      }
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
    
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const { data } = await axios.get(`${bUrl}/api/storage/download/${file._id}`);
        
        if (data.success && data.fileLink) {
           const response = await fetch(data.fileLink);
           const rawBuffer = await response.arrayBuffer();
           
           const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
           const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, file.iv, file.mimeType);
           
           const url = URL.createObjectURL(decryptedBlob);
           setBlobCache(prev => ({ ...prev, [file._id]: url }));
           setViewingFile({ meta: file, url });
        }
    } catch (error) {
        console.error("Retrieval Error", error);
        alert("Failed to decrypt or retrieve file.");
    }
  };

  // Automated Thumbnail Engine (Decrypted previews for images)
  useEffect(() => {
     const generateThumbnails = async () => {
         if (!userFiles || !vaultKey || vaultKey.includes("Loading")) return;
         
         const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
         const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
         
         for (const file of userFiles) {
             if (file.mimeType.startsWith('image/') && !blobCache[file._id]) {
                 try {
                     const { data } = await axios.get(`${bUrl}/api/storage/download/${file._id}`);
                     if (data.success && data.fileLink) {
                         const response = await fetch(data.fileLink);
                         const rawBuffer = await response.arrayBuffer();
                         const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, file.iv, file.mimeType);
                         const url = URL.createObjectURL(decryptedBlob);
                         setBlobCache(prev => ({ ...prev, [file._id]: url }));
                     }
                 } catch (e) { console.warn("Thumb Generation Failed for", file.originalName); }
                 // Anti-throttle buffer
                 await new Promise(r => setTimeout(r, 300));
             }
         }
     };
     generateThumbnails();
  }, [userFiles, vaultKey]);

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to decommission this file from your vault?")) return;
    
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const { data } = await axios.delete(`${bUrl}/api/storage/${fileId}`);
      if (data.success) {
        const fileToRemove = userFiles.find(f => f._id === fileId);
        setUserFiles(prev => prev.filter(f => f._id !== fileId));
        if (fileToRemove) setTotalStorageUsed(prev => prev - fileToRemove.fileSize);
        if (blobCache[fileId]) URL.revokeObjectURL(blobCache[fileId]);
      }
    } catch (err) {
      alert("Failed to decommission file.");
    }
  };
  
  // Real-Time Storage Calculations Context
  const getPercentage = (used, max) => {
    const val = (used / max) * 100;
    if (used > 0 && val < 0.1) return val.toFixed(3);
    return Math.min(val, 100).toFixed(1);
  };
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
          const spanDegrees = (cat.size / totalStorageUsed) * 360;
          conicStops.push(`${cat.theme.color} ${currentDegree}deg`);
          conicStops.push(`${cat.theme.color} ${currentDegree + spanDegrees}deg`);
          currentDegree += spanDegrees;
      });
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
            vaultKey={vaultKey}
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
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ fontFamily: 'monospace', color: 'var(--success)', fontSize: '0.85rem', wordBreak: 'break-all', letterSpacing: showVaultKey ? '1px' : '4px', textAlign: 'center', flex: 1 }}>
                  {showVaultKey ? vaultKey : '••••••••••••••••••••'}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setShowVaultKey(!showVaultKey)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    {showVaultKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
              </div>
              
              {/* Recent Accounts Memory Switcher */}
              {recentAccounts.filter(acc => acc.uid !== currentUser?.uid).length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Recent Identities</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentAccounts.map(acc => {
                      const isActive = acc.uid === currentUser?.uid;
                      return (
                        <div key={acc.uid} className="recent-account-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: isActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent', cursor: isActive ? 'default' : 'pointer', transition: 'all 0.2s', position: 'relative' }} 
                          onClick={() => { 
                            if (isActive) return;
                            logout().then(() => {
                               setAccountFormData(prev => ({ ...prev, email: acc.email }));
                               setIsEmailLocked(true);
                               setShowAccountModal(true);
                               setAccountModalView('login');
                               setProfileOpen(false);
                            });
                          }}
                          onMouseOver={(e) => { if(!isActive) { e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)'; } e.currentTarget.querySelector('.acc-action-btn').style.opacity = 1; }}
                          onMouseOut={(e) => { if(!isActive) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; } e.currentTarget.querySelector('.acc-action-btn').style.opacity = 0; }}
                        >
                           <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ position: 'relative' }}>
                                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', border: '1px solid rgba(255,255,255,0.1)' }}>
                                   {acc.email[0].toUpperCase()}
                                </div>
                                <div className={`dot-indicator ${isActive ? 'dot-green' : 'dot-red'}`}></div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '160px' }}>
                                 <span style={{ fontSize: '0.85rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isActive ? '#fff' : 'var(--text-muted)' }}>{acc.displayName}</span>
                                 <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</span>
                              </div>
                           </div>
                           
                           <button className="acc-action-btn" 
                             onClick={(e) => { 
                               e.stopPropagation(); 
                               if (isActive) handleLogout();
                               else handleRemoveRecent(e, acc.uid); 
                             }}
                             style={{ opacity: 0, transition: 'opacity 0.2s', background: 'transparent', border: 'none', color: isActive ? 'var(--danger)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                             title={isActive ? "Sign Out" : "Remove Profile"}
                           >
                              {isActive ? <LogOut size={14} /> : <X size={14} />}
                           </button>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-color)', margin: '20px 0 0 0' }}></div>
                </div>
              )}

              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '12px', color: '#fff' }} onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Manage Account Settings
              </button>
              <button style={{ width: '100%', marginBottom: '12px', padding: '10px', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem', fontWeight: '600' }} onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }} onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }} onClick={() => { setProfileOpen(false); setIsEmailLocked(false); setShowAccountModal(true); setAccountModalView('options'); }}>
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
          {userData && !userData.emailVerified && (
            <div className="glass-panel" style={{ 
              marginBottom: '24px', 
              padding: '16px 24px', 
              background: 'linear-gradient(90deg, rgba(234, 179, 8, 0.1), rgba(15, 23, 42, 0.4))', 
              border: '1px solid rgba(234, 179, 8, 0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              animation: 'slideInDown 0.5s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(234, 179, 8, 0.2)', padding: '10px', borderRadius: '12px' }}>
                  <ShieldAlert size={20} color="#eab308" />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>Identity Verification Required</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Secure your vault by verifying your communication channel.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => navigate('/settings')} 
                  className="btn-primary" 
                  style={{ padding: '8px 20px', fontSize: '0.9rem', background: 'rgba(234, 179, 8, 0.8)', border: 'none' }}
                >
                  Verify Email
                </button>
              </div>
            </div>
          )}
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
                     <div key={file._id} onClick={() => handleFileClick(file)} className="file-card-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap', position: 'relative' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.querySelectorAll('.card-actions').forEach(el => el.style.opacity = 1); }} onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.querySelectorAll('.card-actions').forEach(el => el.style.opacity = 0); }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '150px' }}>
                          <div style={{ width: '30px', height: '30px', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(59,130,246,0.1)' }}>
                             {blobCache[file._id] && file.mimeType.startsWith('image/') ? (
                                <img src={blobCache[file._id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : file.mimeType.startsWith('image/') ? (
                                <ImageIcon size={18} color="var(--accent-primary)" />
                             ) : file.mimeType.startsWith('video/') ? (
                                <Video size={18} color="var(--accent-primary)" />
                             ) : (
                                <File size={18} color="var(--accent-primary)" />
                             )}
                          </div>
                          <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '30vw' }}>{file.originalName}</span>
                       </div>
                       
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                           <div className="card-actions" style={{ display: 'flex', gap: '8px', opacity: 0.3, transition: 'opacity 0.2s' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleFileClick(file); }} className="action-btn-small" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '6px', color: 'var(--accent-primary)', cursor: 'pointer' }} title="Secure Download"><Download size={16} /></button>
                             <button onClick={(e) => handleDelete(e, file._id)} className="action-btn-small" style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '6px', color: 'var(--danger)', cursor: 'pointer' }} title="Decommission File"><Trash2 size={16} /></button>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end' }}>
                             <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                             <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                       </div>
                     </div>
                  ))}
               </div>
            ) : (
               <div className="file-grid-adaptive" style={{ display: 'grid', gridTemplateColumns: viewMode === 'large' ? 'repeat(auto-fill, minmax(320px, 1fr))' : viewMode === 'small' ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                  {sortedFiles.map(file => (
                      <div key={file._id} onClick={() => handleFileClick(file)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: viewMode === 'small' ? '12px' : '20px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', overflow: 'hidden' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.querySelector('.card-actions-overlay').style.opacity = 1; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.querySelector('.card-actions-overlay').style.opacity = 0; }}>
                          
                          {/* Card Content */}
                          <div style={{ width: viewMode === 'small' ? '36px' : '64px', height: viewMode === 'small' ? '36px' : '64px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                             {blobCache[file._id] && file.mimeType.startsWith('image/') ? (
                                <img src={blobCache[file._id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                             ) : file.mimeType.startsWith('image/') ? (
                                <ImageIcon size={viewMode === 'small' ? 20 : 32} />
                             ) : file.mimeType.startsWith('video/') ? (
                                <Video size={viewMode === 'small' ? 20 : 32} />
                             ) : (
                                <File size={viewMode === 'small' ? 20 : 32} />
                             )}
                          </div>
                          <h4 style={{ fontSize: viewMode === 'small' ? '0.85rem' : '1.05rem', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.originalName}</h4>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(file.fileSize / 1024 / 1024).toFixed(2)} MB • {new Date(file.createdAt).toLocaleDateString()}</p>
                          
                           {/* Action Overlay */}
                           <div className="card-actions-overlay" style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', opacity: 0.3, transition: 'opacity 0.2s' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleFileClick(file); }} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--accent-primary)', cursor: 'pointer' }} title="Secure Download"><Download size={14} /></button>
                             <button onClick={(e) => handleDelete(e, file._id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '8px', color: 'var(--danger)', cursor: 'pointer' }} title="Decommission File"><Trash2 size={14} /></button>
                          </div>
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
               <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-muted)' }}>{parseFloat(overallUsed) > 0 && parseFloat(overallUsed) < 0.1 ? (100 - parseFloat(overallUsed)).toFixed(3) : (100 - parseFloat(overallUsed)).toFixed(1)}%</span>
            </div>
          </div>
        </div>

      {/* Multi-Account Switcher Modal */}
      {showAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '40px', position: 'relative', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowAccountModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            
            {accountModalView === 'options' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: 'var(--accent-primary)' }}>
                   <Fingerprint size={32} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px' }}>Add Account</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Choose your preferred authentication protocol to initiate a secure parallel session.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => { setIsAccountLoading(true); loginWithGoogle().then(() => setShowAccountModal(false)).catch(e => alert(e.message)).finally(() => setIsAccountLoading(false)); }}>
                      <Globe size={18} /> Sign in with Google
                   </button>
                   <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff' }} onClick={() => setAccountModalView('login')}>
                      <Mail size={18} /> Continue with Email
                   </button>
                   <button className="btn-primary" style={{ background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }} onClick={() => setAccountModalView('signup')}>
                      <UserPlus size={18} /> Create New Account
                   </button>
                </div>
              </div>
            )}

            {(accountModalView === 'login' || accountModalView === 'signup') && (
              <div style={{ animation: 'slideInRight 0.3s ease-out' }}>
                <button onClick={() => setAccountModalView('options')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem' }}><ChevronLeft size={16}/> Back to protocols</button>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px' }}>{accountModalView === 'login' ? 'Secure Login' : 'Create Identity'}</h3>
                
                <form onSubmit={async (e) => {
                   e.preventDefault();
                   setIsAccountLoading(true);
                   try {
                       if (accountModalView === 'login') {
                           await login(accountFormData.email, accountFormData.password);
                       } else {
                           if (accountFormData.password !== accountFormData.confirmPassword) throw new Error("Passwords mismatch.");
                           await signup(accountFormData.email, accountFormData.password);
                       }
                       setShowAccountModal(false);
                   } catch (err) { alert(err.message); } finally { setIsAccountLoading(false); }
                }}>
                   <div className="input-group">
                      <label>Email Address</label>
                      <input type="email" required className="input-field" value={accountFormData.email} onChange={e => setAccountFormData({...accountFormData, email: e.target.value})} placeholder="Ex: pilot@securenest.io" disabled={isEmailLocked} style={{ background: isEmailLocked ? 'rgba(255,255,255,0.03)' : undefined, cursor: isEmailLocked ? 'not-allowed' : 'text', opacity: isEmailLocked ? 0.7 : 1 }} />
                   </div>
                   <div className="input-group">
                      <label>Secret Password</label>
                      <div style={{ position: 'relative' }}>
                        <input type={showAccountPass ? "text" : "password"} required className="input-field" value={accountFormData.password} onChange={e => setAccountFormData({...accountFormData, password: e.target.value})} style={{ paddingRight: '44px' }} />
                        <button type="button" onClick={() => setShowAccountPass(!showAccountPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                           {showAccountPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                        </button>
                      </div>
                   </div>
                   {accountModalView === 'signup' && (
                     <div className="input-group">
                        <label>Confirm Entry Secret</label>
                        <input type="password" required className="input-field" value={accountFormData.confirmPassword} onChange={e => setAccountFormData({...accountFormData, confirmPassword: e.target.value})} />
                     </div>
                   )}
                   <button type="submit" className="btn-primary" disabled={isAccountLoading}>
                      {isAccountLoading ? 'Authenticating...' : (accountModalView === 'login' ? 'Authorize Session' : 'Generate Vault Access')}
                   </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      </main>
    </div>
  );
};
export default Home;
