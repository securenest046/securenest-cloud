import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, File, Folder, Image as ImageIcon, Video, FileText, User, Settings as SettingsIcon, LogOut, Key, MoreVertical, Download, Edit2, Info, Grid, List as ListIcon, LayoutGrid, Maximize2, RefreshCw, Copy, Check, ChevronLeft, X, PieChart, Trash2, Trash, ShieldAlert, Mail, Smartphone, Eye, EyeOff, Fingerprint, Globe, UserPlus } from 'lucide-react';
import FileViewer from '../../components/FileViewer';

const Home = () => {
  const { currentUser, logout, login, signup, loginWithGoogle, isSwitching, setIsSwitching } = useAuth();
  const navigate = useNavigate();

  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalView, setAccountModalView] = useState('options'); // 'options', 'login', 'signup'
  const [accountFormData, setAccountFormData] = useState({ email: '', password: '', fullName: '', confirmPassword: '' });
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [showAccountPass, setShowAccountPass] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  
  const [profileOpen, setProfileOpen] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [userFolders, setUserFolders] = useState([]);
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
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [folderModal, setFolderModal] = useState({ show: false, mode: 'create', id: null, name: '' });

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
          setUserFiles(data.files || []);
          setUserFolders(data.folders || []);
          setTotalStorageUsed(data.totalStorageUsed);
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

  const handleUploadSelectedFile = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!vaultKey || vaultKey === 'Loading...') {
          alert('Vault Key not ready.');
          return;
      }

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
      } catch (err) { alert('Upload failed.'); } finally {
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
    } catch (error) { alert("Download failed."); }
  };

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
    } catch (err) { alert("Deletion failed."); }
  };

  const handleCreateFolder = async () => {
    if (!folderModal.name.trim()) return;
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const { data } = await axios.post(`${bUrl}/api/storage/folder`, {
            userId: currentUser.uid,
            name: folderModal.name
        });
        if (data.success) {
            setUserFolders(prev => [data.folder, ...prev]);
            setFolderModal({ show: false, mode: 'create', id: null, name: '' });
        }
    } catch (err) { alert("Folder creation failed."); }
  };

  const handleRenameSession = async () => {
    if (!folderModal.name.trim()) return;
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const endpoint = folderModal.mode === 'rename-file' ? `/api/storage/file/rename/${folderModal.id}` : `/api/storage/folder/rename/${folderModal.id}`;
        const { data } = await axios.put(`${bUrl}${endpoint}`, { newName: folderModal.name });
        if (data.success) {
            if (folderModal.mode === 'rename-file') {
                setUserFiles(prev => prev.map(f => f._id === folderModal.id ? { ...f, originalName: folderModal.name } : f));
            } else {
                setUserFolders(prev => prev.map(f => f._id === folderModal.id ? { ...f, name: folderModal.name } : f));
            }
            setFolderModal({ show: false, mode: 'create', id: null, name: '' });
        }
    } catch (err) { alert("Rename failed."); }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm("Delete folder?")) return;
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const { data } = await axios.delete(`${bUrl}/api/storage/folder/${folderId}`);
        if (data.success) {
            setUserFolders(prev => prev.filter(f => f._id !== folderId));
        }
    } catch (err) { alert("Folder deletion failed."); }
  };

  const getPercentage = (used, max) => {
    const val = (used / max) * 100;
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
          .sort((a,b) => b.size - a.size);
  }, [userFiles, totalStorageUsed]);

  const topCategories = showAllCategories ? dynamicCategories : dynamicCategories.slice(0, 3);
  const hiddenCategoriesCount = Math.max(0, dynamicCategories.length - 3);

  let conicStops = [];
  let currentDegree = 0;
  if (totalStorageUsed === 0) conicStops.push(`rgba(255,255,255,0.05) 0deg`);
  else {
      dynamicCategories.forEach(cat => {
          const spanDegrees = (cat.size / totalStorageUsed) * 360;
          conicStops.push(`${cat.theme.color} ${currentDegree}deg`);
          conicStops.push(`${cat.theme.color} ${currentDegree + spanDegrees}deg`);
          currentDegree += spanDegrees;
      });
  }
  const conicGradientStr = `conic-gradient(${conicStops.join(', ')})`;

  const sortedContent = [...userFolders.map(f => ({ ...f, isFolder: true })), ...userFiles].sort((a, b) => {
      if (sortBy === 'name') {
          const nameA = a.isFolder ? a.name : a.originalName;
          const nameB = b.isFolder ? b.name : b.originalName;
          return nameA.localeCompare(nameB);
      }
      if (sortBy === 'size') return (b.fileSize || 0) - (a.fileSize || 0);
      return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const renderMenu = (item, isFolder) => {
    if (activeMenuId !== item._id) return null;
    return (
      <div className="glass-panel" style={{ position: 'absolute', top: '40px', right: '10px', width: '160px', zIndex: 100, padding: '8px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <button className="menu-item" onClick={(e) => { e.stopPropagation(); setFolderModal({ show: true, mode: isFolder ? 'rename-folder' : 'rename-file', id: item._id, name: isFolder ? item.name : item.originalName }); setActiveMenuId(null); }} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><Edit2 size={14}/> Rename</button>
        <button className="menu-item" onClick={(e) => { e.stopPropagation(); alert(`Name: ${isFolder ? item.name : item.originalName}\nCreated: ${new Date(item.createdAt).toLocaleString()}`); setActiveMenuId(null); }} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><Info size={14}/> Info</button>
        {!isFolder && <button className="menu-item" onClick={(e) => { e.stopPropagation(); handleFileClick(item); setActiveMenuId(null); }} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><Download size={14}/> Download</button>}
        <button className="menu-item" onClick={(e) => { e.stopPropagation(); isFolder ? handleDeleteFolder(item._id) : handleDelete(e, item._id); setActiveMenuId(null); }} style={{ width: '100%', padding: '10px', background: 'transparent', border: 'none', color: '#ef4444', textAlign: 'left', display: 'flex', gap: '8px', cursor: 'pointer' }}><Trash2 size={14}/> Delete</button>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {viewingFile && <FileViewer file={viewingFile.meta} blobUrl={viewingFile.url} vaultKey={vaultKey} onClose={() => setViewingFile(null)} />}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '42px', height: '42px' }} />
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>SecureNest</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', border: '1px solid var(--border-color)' }} onClick={() => setProfileOpen(!profileOpen)}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}</div>
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{currentUser?.displayName || 'Vault User'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser?.email}</span>
             </div>
          </div>
          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', top: '70px', right: '0', width: '300px', padding: '20px', zIndex: 300, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '10px', color: '#fff' }} onClick={() => navigate('/settings')}><SettingsIcon size={16}/> Settings</button>
              <button className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: 'none' }} onClick={handleLogout}><LogOut size={16}/> Sign Out</button>
            </div>
          )}
        </div>
      </header>

      {folderModal.show && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ width: '380px', padding: '30px', background: 'var(--bg-card)' }}>
            <h3>{folderModal.mode === 'create' ? 'New Folder' : 'Rename'}</h3>
            <input className="input-field" autoFocus value={folderModal.name} onChange={e=>setFolderModal({...folderModal, name: e.target.value})} style={{ margin: '20px 0' }} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-primary" onClick={folderModal.mode === 'create' ? handleCreateFolder : handleRenameSession}>Save</button>
              <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setFolderModal({ show: false, mode: 'create', id: null, name: '' })}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main style={{ display: 'flex', flex: 1, padding: '40px', gap: sidebarOpen ? '40px' : '0', position: 'relative' }} onClick={() => setActiveMenuId(null)}>
        {!sidebarOpen && (
          <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(true); }} style={{ position: 'fixed', right: '0', top: '50%', transform: 'translateY(-50%)', background: 'var(--accent-primary)', color: '#fff', border: 'none', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px', padding: '20px 8px', cursor: 'pointer', zIndex: 100 }}>
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: 'bold' }}>STORAGE INSIGHT</span>
          </button>
        )}

        <div style={{ flex: sidebarOpen ? '0 0 75%' : '0 0 100%', transition: 'all 0.3s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
             <div>
               <h2 style={{ fontSize: '2rem', margin: 0 }}>My Vault</h2>
               <p style={{ color: 'var(--text-muted)' }}>Encrypted security for your files.</p>
             </div>
             <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input-field" style={{ width: 'auto', padding: '8px' }}>
                  <option value="date">Date</option>
                  <option value="size">Size</option>
                  <option value="name">Name</option>
                </select>
                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                   <button onClick={() => setViewMode('large')} style={{ background: viewMode === 'large' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px', color: '#fff' }}><Grid size={18}/></button>
                   <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px', color: '#fff' }}><ListIcon size={18}/></button>
                </div>
                <button onClick={() => setFolderModal({ show: true, mode: 'create', id: null, name: '' })} className="glass-panel" style={{ padding: '10px 15px', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}>+ Folder</button>
                <button onClick={() => fileInputRef.current?.click()} className="btn-primary" style={{ width: 'auto' }}>{isUploading ? <RefreshCw className="spin" size={18}/> : <Upload size={18}/>} Upload</button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleUploadSelectedFile} />
             </div>
          </div>

          {!sortedContent.length ? (
            <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '20px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No items found. Upload your first file to get started.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
               {sortedContent.map(item => (
                 <div key={item._id} className="glass-panel" 
                      style={{ position: 'relative', padding: '15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}
                      onMouseEnter={e => e.currentTarget.querySelector('.menu-btn').style.opacity = 1}
                      onMouseLeave={e => { if(activeMenuId !== item._id) e.currentTarget.querySelector('.menu-btn').style.opacity = 0; }}
                 >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }} onClick={() => !item.isFolder && handleFileClick(item)}>
                       {item.isFolder ? <Folder size={32} color="#3b82f6" /> : <File size={32} color="var(--text-muted)" />}
                       <div style={{ minWidth: 0 }}>
                          <h4 style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.isFolder ? item.name : item.originalName}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.isFolder ? 'Folder' : (item.fileSize/1024/1024).toFixed(2) + ' MB'}</span>
                       </div>
                    </div>
                    <button className="menu-btn" onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item._id ? null : item._id); }} style={{ opacity: activeMenuId === item._id ? 1 : 0, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}><MoreVertical size={18}/></button>
                    {renderMenu(item, item.isFolder)}
                 </div>
               ))}
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div className="glass-panel" style={{ flex: '0 0 25%', padding: '30px', position: 'relative', animation: 'slideInRight 0.3s' }}>
             <button onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}><X size={20}/></button>
             <h3>Storage</h3>
             <div style={{ position: 'relative', width: '150px', height: '150px', margin: '20px auto', borderRadius: '50%', background: conicGradientStr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{overallUsed}%</div>
             </div>
             {topCategories.map((cat, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '10px' }}>
                   <span>{cat.name}</span>
                   <span>{cat.percent}%</span>
                </div>
             ))}
          </div>
        )}
      </main>

      {showAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '40px', textAlign: 'center' }}>
            <button onClick={() => { setIsSwitching(false); setShowAccountModal(false); }} style={{ position: 'absolute', top: '20px', right: '20px' }}><X size={24}/></button>
            <h2>Add Account</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
               <button className="btn-primary" onClick={() => loginWithGoogle().then(()=>setShowAccountModal(false))}>Google</button>
               <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setAccountModalView('login')}>Email</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;
