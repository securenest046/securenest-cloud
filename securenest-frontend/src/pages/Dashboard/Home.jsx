import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { File, LogOut, Key, Download, ChevronLeft, X, Copy, Fingerprint, Eye, EyeOff, ShieldAlert, Trash2 } from 'lucide-react';
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
            displayName: currentUser.displayName || 'Vault User',
            status: 'active'
        };
        const updated = [newAcc, ...filtered].slice(0, 6);
        localStorage.setItem('recentAccounts', JSON.stringify(updated));
        return updated;
      });
    }
  }, [currentUser]);

  const handleSessionLogout = (uid) => {
    setRecentAccounts(prev => {
        const updated = prev.map(acc => 
            acc.uid === uid ? { ...acc, status: 'inactive' } : acc
        );
        localStorage.setItem('recentAccounts', JSON.stringify(updated));
        return updated;
    });
    if (uid === currentUser?.uid) {
        logout();
        navigate('/login');
    }
  };

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
  const [showVaultKey, setShowVaultKey] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('medium');
  const MAX_STORAGE = 50 * 1024 * 1024 * 1024; 
  const [userData, setUserData] = useState(null);

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const syncRes = await axios.post(`${bUrl}/api/auth/sync`, {
          userId: currentUser.uid,
          email: currentUser.email,
          fullName: currentUser.displayName || 'SecureVault User'
      });
      if (syncRes.data.success) {
          setUserData(syncRes.data.user);
          setVaultKey(syncRes.data.user.encryptionKey);
      }
      const { data } = await axios.get(`${bUrl}/api/storage/files/${currentUser.uid}`);
      if (data.success) {
          setUserFiles(data.files);
          setTotalStorageUsed(data.totalStorageUsed);
      }
    } catch (error) {
      console.error("Dashboard Sync Failed", error);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [currentUser]);

  const handleLogout = async () => {
    try {
      if (currentUser) {
        handleSessionLogout(currentUser.uid);
      } else {
        await logout();
        navigate('/login');
      }
    } catch { console.log("Logout error"); }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(vaultKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const handleUploadSelectedFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!vaultKey || vaultKey === 'Loading...') { alert('Vault Key not ready.'); return; }
      setIsUploading(true);
      try {
          const { encryptFileForUpload } = await import('../../utils/cryptoFunctions');
          const { cipherBlob, iv } = await encryptFileForUpload(file, vaultKey);
          const formData = new FormData();
          formData.append('file', cipherBlob, file.name);
          formData.append('userId', currentUser.uid);
          formData.append('originalName', file.name);
          formData.append('mimeType', file.type || 'application/octet-stream');
          formData.append('ivArray', JSON.stringify(iv));
          const { data } = await axios.post(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/storage/upload`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (data.success) {
              setUserFiles(prev => [data.file, ...prev]);
              setTotalStorageUsed(prev => prev + data.file.fileSize);
          }
      } catch (err) { alert('Upload failed.'); } finally { setIsUploading(false); }
  };

  const handleFileClick = async (file) => {
    if (blobCache[file._id]) { setViewingFile({ meta: file, url: blobCache[file._id] }); return; }
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
    } catch { alert("Decryption failed."); }
  };

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
                 } catch (e) {}
                 await new Promise(r => setTimeout(r, 200));
             }
         }
     };
     generateThumbnails();
  }, [userFiles, vaultKey]);

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (!window.confirm("Decommission this file?")) return;
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const { data } = await axios.delete(`${bUrl}/api/storage/${fileId}`);
      if (data.success) {
        const fileToRemove = userFiles.find(f => f._id === fileId);
        setUserFiles(prev => prev.filter(f => f._id !== fileId));
        if (fileToRemove) setTotalStorageUsed(prev => prev - fileToRemove.fileSize);
      }
    } catch { alert("Deletion failed."); }
  };
  
  const overallUsed = Math.min((totalStorageUsed / MAX_STORAGE) * 100, 100).toFixed(1);
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
          else if (mime.includes('document') || mime.includes('text')) type = 'Documents';
          else if (mime.includes('zip') || mime.includes('rar')) type = 'Archives';
          store[type] = (store[type] || 0) + f.fileSize;
      });
      return Object.entries(store).map(([name, size]) => ({ name, size, percent: totalStorageUsed ? ((size / totalStorageUsed) * 100).toFixed(1) : '0', theme: getCategoryTheme(name) })).sort((a,b) => b.size - a.size);
  }, [userFiles, totalStorageUsed]);

  const topCategories = showAllCategories ? dynamicCategories : dynamicCategories.slice(0, 3);
  const hiddenCategoriesCount = Math.max(0, dynamicCategories.length - 3);

  let conicStops = [];
  let currentDegree = 0;
  if (totalStorageUsed === 0) { conicStops.push(`rgba(255,255,255,0.05) 0deg`); } 
  else {
      dynamicCategories.forEach(cat => {
          const spanDegrees = (cat.size / MAX_STORAGE) * 360;
          conicStops.push(`${cat.theme.color} ${currentDegree}deg`);
          conicStops.push(`${cat.theme.color} ${currentDegree + spanDegrees}deg`);
          currentDegree += spanDegrees;
      });
      conicStops.push(`rgba(255,255,255,0.05) ${currentDegree}deg`);
  }

  const sortedFiles = [...userFiles].sort((a, b) => {
      if (sortBy === 'name') return a.originalName.localeCompare(b.originalName);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {viewingFile && <FileViewer file={viewingFile.meta} blobUrl={viewingFile.url} vaultKey={vaultKey} onClose={() => setViewingFile(null)} />}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>SecureNest</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => setProfileOpen(!profileOpen)}>
             <div className="avatar-container avatar-glow-green" style={{ width: '36px', height: '36px' }}>
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>
                   {currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}
                </div>
             </div>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{currentUser?.displayName || 'Vault User'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser?.email}</span>
             </div>
          </div>
          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', top: '70px', right: '0', width: '320px', padding: '20px', zIndex: 300, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}><Key size={14} style={{ marginRight: '4px' }}/> Vault Encryption Key</p>
                   <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? 'var(--success)' : 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.8rem' }}>{copied ? 'Copied' : 'Copy'}</button>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.5)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontFamily: 'monospace', color: 'var(--success)', fontSize: '0.85rem', flex: 1, letterSpacing: showVaultKey ? '1px' : '4px', textAlign: 'center' }}>{showVaultKey ? vaultKey : '••••••••••••••••••••'}</div>
                  <button onClick={() => setShowVaultKey(!showVaultKey)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>{showVaultKey ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>Recent Identities</p>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {recentAccounts.map(acc => {
                       const isCurrent = acc.uid === currentUser?.uid;
                       const isSessionActive = acc.status === 'active';
                       return (
                          <div key={acc.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: isCurrent ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent', cursor: isCurrent ? 'default' : 'pointer' }} onClick={() => { 
                             if (isCurrent) return;
                             logout().then(() => { setAccountFormData({ email: acc.email, password: '', fullName: '', confirmPassword: '' }); setIsEmailLocked(true); setShowAccountModal(true); setAccountModalView('login'); setProfileOpen(false); });
                          }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div className={`avatar-container ${isSessionActive ? 'avatar-glow-green' : 'avatar-glow-red'}`}>
                                   <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700' }}>{acc.email ? acc.email[0].toUpperCase() : '?'}</div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '150px' }}>
                                   <span style={{ fontSize: '0.85rem', fontWeight: '600', color: isSessionActive ? '#fff' : 'var(--text-muted)' }}>{acc.displayName}</span>
                                   <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{acc.email}</span>
                                </div>
                             </div>
                             <button onClick={(e) => { e.stopPropagation(); if (isSessionActive) handleSessionLogout(acc.uid); else handleRemoveRecent(e, acc.uid); }} style={{ background: 'transparent', border: 'none', color: isSessionActive ? 'var(--danger)' : 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                {isSessionActive ? <LogOut size={14}/> : <X size={14}/>}
                             </button>
                          </div>
                       );
                    })}
                 </div>
              </div>

              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '12px', color: '#fff' }} onClick={() => navigate('/settings')}>Manage Settings</button>
              <button style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed var(--border-color)', borderRadius: '12px', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '12px' }} onClick={() => { setIsEmailLocked(false); setAccountModalView('options'); setShowAccountModal(true); setProfileOpen(false); }}>+ Add Account</button>
              <button className="btn-primary" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>Sign Out</button>
            </div>
          )}
        </div>
      </header>

      <main className="dashboard-main" style={{ display: 'flex', flex: 1, padding: '40px 60px', gap: '40px' }} onClick={() => setActiveMenu(null)}>
        <div className="dashboard-left" style={{ flex: '0 0 calc(75% - 20px)' }}>
          <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
             <div><h2 style={{ fontSize: '2.5rem', fontWeight: '700' }}>Dashboard</h2><p style={{ color: 'var(--text-muted)' }}>Managed encrypted binaries safely.</p></div>
             <div style={{ display: 'flex', gap: '12px' }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff' }}>
                   <option value="date">Sort by Date</option><option value="size">Sort by Size</option><option value="name">Sort by Name</option>
                </select>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUploadSelectedFile} />
                <button className="btn-primary" style={{ width: 'auto' }} onClick={() => fileInputRef.current?.click()} disabled={isUploading}>{isUploading ? 'Encrypting...' : 'Upload'}</button>
             </div>
          </div>
          {userData && !userData.emailVerified && (
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div style={{ display: 'flex', gap: '12px' }}><ShieldAlert color="#eab308" /><div><h4 style={{ margin: 0 }}>Identity Verification Required</h4><p style={{ margin: 0, fontSize: '0.85rem' }}>Secure your vault in settings.</p></div></div>
               <button onClick={() => navigate('/settings')} className="btn-primary" style={{ padding: '8px 20px', width: 'auto', background: '#eab308' }}>Verify Now</button>
            </div>
          )}
          <div className="file-grid-adaptive" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
            {sortedFiles.map(file => (
               <div key={file._id} onClick={() => handleFileClick(file)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', overflow: 'hidden' }}>
                     {blobCache[file._id] && file.mimeType.startsWith('image/') ? <img src={blobCache[file._id]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <File color="var(--accent-primary)" />}
                  </div>
                  <h4 style={{ fontWeight: '600', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.originalName}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{(file.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                     <button onClick={(e) => { e.stopPropagation(); handleFileClick(file); }} style={{ background: '#1e293b', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Download size={14} color="#3b82f6" /></button>
                     <button onClick={(e) => handleDelete(e, file._id)} style={{ background: '#1e293b', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}><Trash2 size={14} color="#ef4444" /></button>
                  </div>
               </div>
            ))}
          </div>
        </div>
        <div className="dashboard-right" style={{ flex: '0 0 calc(25% - 20px)', padding: '36px', background: 'var(--bg-card)', borderRadius: '24px', height: 'fit-content' }}>
           <h3 style={{ marginBottom: '24px' }}>Storage Insight</h3>
           <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: `conic-gradient(${conicStops.join(', ')})`, margin: '0 auto 32px auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '140px', height: '140px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                 <span style={{ fontSize: '2rem', fontWeight: '800' }}>{overallUsed}%</span>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>of 50 GB</span>
              </div>
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {topCategories.map((cat, i) => (
                 <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '3px', background: cat.theme.color }}></div>{cat.name}</div>
                    <span>{cat.percent}%</span>
                 </div>
              ))}
           </div>
        </div>

        {showAccountModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
             <div className="glass-panel" style={{ width: '420px', padding: '40px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}>
                <button onClick={() => { setShowAccountModal(false); setIsEmailLocked(false); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24}/></button>
                
                {!isEmailLocked && accountModalView === 'options' ? (
                   <div style={{ textAlign: 'center' }}>
                      <Fingerprint size={48} color="var(--accent-primary)" style={{ marginBottom: '20px' }} />
                      <h2 style={{ marginBottom: '12px' }}>Add Identity</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Initiate a secure parallel vault session.</p>
                      <button className="btn-primary" onClick={() => loginWithGoogle()} style={{ marginBottom: '12px' }}>Google Protocol</button>
                      <button onClick={() => setAccountModalView('login')} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', marginBottom: '12px' }}>Email Transmission</button>
                      <button onClick={() => setAccountModalView('signup')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Generate New Vault Access</button>
                   </div>
                ) : (
                   <div style={{ animation: 'slideInRight 0.3s' }}>
                      {isEmailLocked ? (
                         <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                            <div className="avatar-container avatar-glow-red" style={{ width: '64px', height: '64px', margin: '0 auto 16px auto' }}>
                               <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800' }}>{accountFormData.email ? accountFormData.email[0].toUpperCase() : '?'}</div>
                            </div>
                            <h3>Verify Identity</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Re-authenticating <b>{accountFormData.email}</b></p>
                         </div>
                      ) : (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
                            <button onClick={() => setAccountModalView('options')} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}><ChevronLeft size={20}/></button>
                            <h3>{accountModalView === 'login' ? 'Secure Login' : 'Create Vault'}</h3>
                         </div>
                      )}
                      <form onSubmit={async (e) => {
                         e.preventDefault();
                         setIsAccountLoading(true);
                         try {
                            if (accountModalView === 'login') await login(accountFormData.email, accountFormData.password);
                            else await signup(accountFormData.email, accountFormData.password, accountFormData.fullName);
                            setShowAccountModal(false);
                            setIsEmailLocked(false);
                         } catch (err) { alert(err.message); } finally { setIsAccountLoading(false); }
                      }}>
                         {!isEmailLocked && <div className="input-group"><label>Email Address</label><input type="email" required className="input-field" value={accountFormData.email} onChange={e => setAccountFormData({...accountFormData, email: e.target.value})} /></div>}
                         {accountModalView === 'signup' && <div className="input-group"><label>Full Name</label><input type="text" required className="input-field" value={accountFormData.fullName} onChange={e => setAccountFormData({...accountFormData, fullName: e.target.value})} /></div>}
                         <div className="input-group"><label>Secret Password</label><input type="password" required className="input-field" value={accountFormData.password} onChange={e => setAccountFormData({...accountFormData, password: e.target.value})} /></div>
                         <button type="submit" className="btn-primary" disabled={isAccountLoading}>{isAccountLoading ? 'Authenticating...' : (isEmailLocked ? 'Authorize Re-entry' : 'Initiate Session')}</button>
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
