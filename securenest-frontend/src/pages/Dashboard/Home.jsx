import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Upload, File, Folder, Image as ImageIcon, Video, FileText, User, Settings as SettingsIcon, LogOut, Key, MoreVertical, Download, Edit2, Info, Grid, List as ListIcon, LayoutGrid, Maximize2, RefreshCw, Copy, Check, ChevronLeft, ChevronDown, X, PieChart, Trash2, Trash, ShieldAlert, Mail, Smartphone, Eye, EyeOff, Fingerprint, Globe, UserPlus } from 'lucide-react';
import FileViewer from '../../components/FileViewer';
import Loader from '../../components/Loader';
import { useDialog } from '../../context/DialogContext';

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
  const [totalStorageUsed, setTotalStorageUsed] = useState(0);
  const [vaultKey, setVaultKey] = useState("Loading...");
  
  const fileInputRef = React.useRef(null);
  const folderInputRef = React.useRef(null);
  const folderCacheRef = React.useRef({}); // Cache: path_parentId -> vaultId
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploadMinimized, setIsUploadMinimized] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loaderMessage, setLoaderMessage] = useState("Accessing Secure Vault...");

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
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [infoFile, setInfoFile] = useState(null);
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
  
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderStack, setFolderStack] = useState([]);

  // --- Global High-Fidelity Dialog System ---
  const { showAlert, showConfirm, showPrompt, closeDialog } = useDialog();

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
      const { data } = await axios.get(`${bUrl}/api/storage/files/${currentUser.uid}${currentFolder ? `?parentId=${currentFolder._id}` : '?parentId=null'}`);
      if (data.success) {
          setUserFiles(data.files);
          setTotalStorageUsed(data.totalStorageUsed);
      }
    } catch (error) {
      console.error("Dashboard Sync Failed", error);
      const detail = error.response?.data?.detail || error.message;
      setVaultKey(`Error: ${detail}`);
      
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
    const initFetch = async () => {
      setPageLoading(true);
      await fetchDashboardData();
      setTimeout(() => setPageLoading(false), 1800);
    };
    initFetch();
  }, [currentUser, currentFolder]);

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

  const handleRenameToggle = (e, file) => {
    e.stopPropagation();
    setRenamingId(file._id);
    setRenameValue(file.originalName);
    setActiveMenu(null);
  };

  const handleRenameSubmit = async (e, fileId) => {
    if (e.key && e.key !== 'Enter') return;
    e.stopPropagation();
    if (!renameValue.trim()) return setRenamingId(null);
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const { data } = await axios.patch(`${bUrl}/api/storage/rename/${fileId}`, { newName: renameValue });
      if (data.success) {
        setUserFiles(prev => prev.map(f => f._id === fileId ? { ...f, originalName: renameValue } : f));
        setRenamingId(null);
      }
    } catch (err) {
      showAlert("Vault Error", "Security Rename failed.");
    }
  };

  const showInfo = (e, file) => {
    e.stopPropagation();
    setInfoFile(file);
    setActiveMenu(null);
  };

  const handleCreateFolder = () => {
    showPrompt("Create Secure Directory", "Enter a unique name for your encrypted binary container.", async (name) => {
        if (!name.trim()) return;
        try {
          const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          const { data } = await axios.post(`${bUrl}/api/storage/folder`, {
             userId: currentUser.uid,
             originalName: name,
             parentId: currentFolder ? currentFolder._id : null
          });
          if (data.success) {
            setUserFiles(prev => [data.folder, ...prev]);
            closeDialog();
          }
        } catch (error) {
          showAlert("Vault Error", "Failed to initialize directory container.");
        }
    });
  };

  const navigateToFolder = (folder) => {
    if (folder === null) {
      setCurrentFolder(null);
      setFolderStack([]);
    } else {
      setCurrentFolder(folder);
      setFolderStack(prev => [...prev, folder]);
    }
  };

  const navigateBack = (index) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderStack([]);
    } else {
      const newStack = folderStack.slice(0, index + 1);
      setCurrentFolder(newStack[newStack.length - 1]);
      setFolderStack(newStack);
    }
  };

  const handleUploadSelectedFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newQueueItems = files.map(f => ({
       id: Math.random().toString(36).substr(2, 9),
       file: f,
       originalName: f.name,
       status: 'pending',
       progress: 0,
       parentId: currentFolder ? currentFolder._id : null
    }));
    setUploadQueue(prev => [...prev, ...newQueueItems]);
    setIsUploadMinimized(false);
    if (fileInputRef.current) fileInputRef.current.value = null;
  };

  const handleUploadSelectedFolder = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newQueueItems = files.map(f => ({
       id: Math.random().toString(36).substr(2, 9),
       file: f,
       originalName: f.name,
       webkitRelativePath: f.webkitRelativePath,
       status: 'pending',
       progress: 0,
       parentId: currentFolder ? currentFolder._id : null,
       isFolderUpload: true
    }));
    setUploadQueue(prev => [...prev, ...newQueueItems]);
    setIsUploadMinimized(false);
    if (folderInputRef.current) folderInputRef.current.value = null;
  };


  useEffect(() => {
    const processQueue = async () => {
      const activeTask = uploadQueue.find(t => t.status === 'encrypting' || t.status === 'uploading');
      if (activeTask) return;

      const nextTask = uploadQueue.find(t => t.status === 'pending');
      if (!nextTask) {
        setIsUploading(false);
        return;
      }

      setIsUploading(true);
      const updateTaskStatus = (id, status, extra = {}) => {
        setUploadQueue(prev => prev.map(t => t.id === id ? { ...t, status, ...extra } : t));
      };

      try {
        const { encryptFileForUpload } = await import('../../utils/cryptoFunctions');
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        
        updateTaskStatus(nextTask.id, 'encrypting');
        
        let finalParentId = nextTask.parentId;
        if (nextTask.isFolderUpload && nextTask.webkitRelativePath) {
            const pathParts = nextTask.webkitRelativePath.split('/');
            pathParts.pop();
            let currentParentId = nextTask.parentId;
            
            for (const folderName of pathParts) {
                const cacheKey = `${currentParentId}_${folderName}`;
                if (folderCacheRef.current[cacheKey]) {
                    currentParentId = folderCacheRef.current[cacheKey];
                } else {
                    try {
                      const { data } = await axios.post(`${bUrl}/api/storage/folder`, {
                        userId: currentUser.uid,
                        originalName: folderName,
                        parentId: currentParentId
                      });
                      if (data.success) {
                        currentParentId = data.folder._id;
                        folderCacheRef.current[cacheKey] = currentParentId;
                        if (nextTask.parentId === (currentFolder?._id || null)) {
                           setUserFiles(prev => prev.some(f => f._id === data.folder._id) ? prev : [data.folder, ...prev]);
                        }
                      }
                    } catch (e) { console.warn("Virtual Directory Sync Delay", e); }
                }
            }
            finalParentId = currentParentId;
        }

        const { cipherBlob, iv } = await encryptFileForUpload(nextTask.file, vaultKey);
        updateTaskStatus(nextTask.id, 'uploading');

        const formData = new FormData();
        formData.append('file', cipherBlob, nextTask.originalName);
        formData.append('userId', currentUser.uid);
        formData.append('originalName', nextTask.originalName);
        formData.append('mimeType', nextTask.file.type || 'application/octet-stream');
        formData.append('ivArray', JSON.stringify(iv));
        if (finalParentId) formData.append('parentId', finalParentId);

        const { data } = await axios.post(`${bUrl}/api/storage/upload`, formData);

        if (data.success) {
           updateTaskStatus(nextTask.id, 'done');
           if (finalParentId === (currentFolder?._id || null)) {
              setUserFiles(prev => [data.file, ...prev]);
           }
           setTotalStorageUsed(prev => prev + data.file.fileSize);
        } else {
           updateTaskStatus(nextTask.id, 'error');
        }
      } catch (err) {
        console.error("Transmission Queue Failure", err);
        updateTaskStatus(nextTask.id, 'error');
      }
    };

    processQueue();
  }, [uploadQueue, vaultKey, currentFolder, currentUser]);

  const handleFileClick = async (file) => {
    if (file.isFolder) {
      navigateToFolder(file);
      return;
    }
    
    if (blobCache[file._id]) {
      setViewingFile({ meta: file, url: blobCache[file._id] });
      return;
    }

    setLoaderMessage(`Decrypting ${file.originalName}...`);
    setPageLoading(true);
    
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${bUrl}/api/storage/proxy/${file._id}`);
        if (!response.ok) throw new Error("Proxy retrieval failed.");
        const rawBuffer = await response.arrayBuffer();
        const ivToUse = typeof file.iv === 'string' ? JSON.parse(file.iv) : file.iv;
        const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
        const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, ivToUse, file.mimeType);
        const url = URL.createObjectURL(decryptedBlob);
        setBlobCache(prev => ({ ...prev, [file._id]: url }));
        setViewingFile({ meta: file, url });
    } catch (error) {
        console.error("Retrieval Error", error);
        showAlert("Decryption Failure", "Failed to restore secure binary from vault.");
    } finally {
        setPageLoading(false);
    }
  };

  useEffect(() => {
     const generateThumbnails = async () => {
         if (!userFiles || !vaultKey || vaultKey.includes("Loading")) return;
         const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
         const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
         for (const file of userFiles) {
             if (file.mimeType.startsWith('image/') && !blobCache[file._id]) {
                 try {
                     const response = await fetch(`${bUrl}/api/storage/proxy/${file._id}`);
                     if (response.ok) {
                         const rawBuffer = await response.arrayBuffer();
                         const ivToUse = typeof file.iv === 'string' ? JSON.parse(file.iv) : file.iv;
                         const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, ivToUse, file.mimeType);
                         const url = URL.createObjectURL(decryptedBlob);
                         setBlobCache(prev => ({ ...prev, [file._id]: url }));
                     }
                 } catch (e) {}
                 await new Promise(r => setTimeout(r, 300));
             }
         }
     };
     generateThumbnails();
  }, [userFiles, vaultKey]);

  const handleSecureDownload = async (file) => {
    try {
        const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        const response = await fetch(`${bUrl}/api/storage/proxy/${file._id}`);
        if (!response.ok) throw new Error("Proxy retrieval failed.");
        const rawBuffer = await response.arrayBuffer();
        const ivToUse = typeof file.iv === 'string' ? JSON.parse(file.iv) : file.iv;
        const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
        const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, ivToUse, file.mimeType);
        const { downloadSecuredZip } = await import('../../utils/zipUtils');
        await downloadSecuredZip(file, decryptedBlob, vaultKey);
    } catch (error) {
        showAlert("Vault Error", `Failed to decrypt ${file.originalName}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    showConfirm(
        "Mass Decommission Certified?", 
        `Permanently decommission ${selectedIds.length} artifacts across the global node network?`,
        async () => {
            setLoaderMessage(`Purging artifacts...`);
            setPageLoading(true);
            try {
              const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
              for (const id of selectedIds) {
                const { data } = await axios.delete(`${bUrl}/api/storage/${id}`);
                if (data.success) {
                  const fileToRemove = userFiles.find(f => f._id === id);
                  setUserFiles(prev => prev.filter(f => f._id !== id));
                  if (fileToRemove) setTotalStorageUsed(prev => prev - (fileToRemove.fileSize || 0));
                }
              }
              setSelectedIds([]);
              setIsSelectionMode(false);
              showAlert("Purge Complete", "The nodes have been successfully de-manifested.");
            } catch (error) {
              showAlert("Vault Error", "One or more decommissions failed.");
            } finally {
              setPageLoading(false);
              closeDialog();
            }
        },
        true
    );
  };

  const handleBulkDownload = async () => {
    const filesToDownload = userFiles.filter(f => selectedIds.includes(f._id) && !f.isFolder);
    if (filesToDownload.length === 0) {
      showAlert("Operation Skipped", "Bulk transmission supports file binaries only.");
      return;
    }
    setLoaderMessage(`Decrypting ${filesToDownload.length} binaries...`);
    setPageLoading(true);
    try {
      for (const file of filesToDownload) {
        await handleSecureDownload(file);
      }
      setSelectedIds([]);
      setIsSelectionMode(false);
    } catch (e) {} finally {
      setPageLoading(false);
    }
  };

  const handleDelete = (e, fileId) => {
    e.stopPropagation();
    showConfirm(
        "Decommission Binary?", 
        "Permanently purge all encrypted fragments from the secure nodes?",
        async () => {
            try {
              const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
              const { data } = await axios.delete(`${bUrl}/api/storage/${fileId}`);
              if (data.success) {
                const fileToRemove = userFiles.find(f => f._id === fileId);
                setUserFiles(prev => prev.filter(f => f._id !== fileId));
                if (fileToRemove) setTotalStorageUsed(prev => prev - fileToRemove.fileSize);
                closeDialog();
              }
            } catch (error) {
              showAlert("Vault Error", "Decommissioning failed.");
            }
        },
        true
    );
  };

  const formatPreciseSize = (bytes) => {
      if (bytes === 0) return '0.00000 KB';
      const kb = bytes / 1024;
      if (kb < 1024) return `${kb.toFixed(5)} KB`;
      const mb = kb / 1024;
      if (mb < 1024) return `${mb.toFixed(5)} MB`;
      const gb = mb / 1024;
      return `${gb.toFixed(5)} GB`;
  };

  const getPercentage = (used, max) => (used / max * 100);
  const overallUsed = getPercentage(totalStorageUsed, MAX_STORAGE);
  const overallUsedDisplay = overallUsed > 0 && overallUsed < 0.1 ? overallUsed.toFixed(3) : overallUsed.toFixed(2);
  
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
           .map(([name, size]) => ({ 
               name, 
               size, 
               percent: ((size / MAX_STORAGE) * 100).toFixed(5),
               theme: getCategoryTheme(name) 
           }))
           .sort((a,b) => b.size - a.size);
  }, [userFiles, totalStorageUsed]);

  const topCategories = showAllCategories ? dynamicCategories : dynamicCategories.slice(0, 3);
  const hiddenCategoriesCount = Math.max(0, dynamicCategories.length - 3);

  let conicStops = [];
  let currentDegree = 0;
  if (dynamicCategories.length === 0) {
      conicStops.push(`rgba(255,255,255,0.05) 0deg`);
  } else {
      dynamicCategories.forEach(cat => {
          const spanDegrees = (cat.size / MAX_STORAGE) * 360;
          conicStops.push(`${cat.theme.color} ${currentDegree}deg`);
          conicStops.push(`${cat.theme.color} ${currentDegree + spanDegrees}deg`);
          currentDegree += spanDegrees;
      });
      conicStops.push(`rgba(255,255,255,0.05) ${currentDegree}deg`);
      conicStops.push(`rgba(255,255,255,0.05) 360deg`);
  }
  const conicGradientStr = `conic-gradient(${conicStops.join(', ')})`;

  const sortedFiles = [...userFiles].sort((a, b) => {
      if (sortBy === 'name') return a.originalName.localeCompare(b.originalName);
      if (sortBy === 'size') return b.fileSize - a.fileSize;
      return new Date(b.createdAt) - new Date(a.createdAt);
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

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
      <header className="vault-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 40px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', backdropFilter: 'blur(16px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '42px', height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' }} />
          <h1 className="vault-logo-text" style={{ fontSize: '1.6rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--accent-primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>SecureNest</h1>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="identity-box" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid var(--border-color)', maxWidth: '240px' }} onClick={() => setProfileOpen(!profileOpen)}>
             <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '600', flexShrink: 0 }}>
                {currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}
             </div>
             <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span className="user-identity-text" style={{ fontSize: '0.9rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.displayName || 'Vault User'}</span>
                <span className="user-identity-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser?.email}</span>
             </div>
          </div>
          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', top: '70px', right: '0', width: '320px', maxWidth: 'calc(100vw - 40px)', padding: '20px', zIndex: 300, background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', margin: 0 }}><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Vault Encryption Key</p>
                </div>
                <div className="vault-key-row">
                  <div className="vault-key-display">
                    {showVaultKey ? vaultKey : '••••••••••••••••••••••••'}
                  </div>
                  <div className="vault-key-action-group">
                    <button onClick={() => setShowVaultKey(!showVaultKey)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                      {showVaultKey ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {recentAccounts.filter(acc => acc.uid !== currentUser?.uid).map(acc => (
                  <div key={acc.uid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', cursor: 'pointer' }} onClick={() => { setIsSwitching(true); logout().then(() => { setAccountFormData(p => ({...p, email: acc.email})); setIsEmailLocked(true); setShowAccountModal(true); setAccountModalView('login'); setProfileOpen(false); }); }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700' }}>{acc.email[0].toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.displayName}</p>
                        <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn-primary" style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '12px', color: '#fff' }} onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} style={{ marginRight: '8px' }}/> Manage Settings
              </button>
              <button className="btn-primary" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <LogOut size={16} style={{ marginRight: '8px' }}/> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Sandbox */}
      <main className="dashboard-main" style={{ display: 'flex', flex: 1, padding: '40px 60px', gap: '40px' }}>
        
        {/* Left Computing Core */}
        <div className="dashboard-left" style={{ flex: '0 0 calc(75% - 20px)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border-color)', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
             <div>
               <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '8px' }}>Dashboard</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your files and encrypted binaries safely.</p>
             </div>
             
             <div className="toolbar-matrix" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: '#fff', cursor: 'pointer' }}>
                   <option value="date" style={{ background: 'var(--bg-dark)'}}>Date Modified</option>
                   <option value="size" style={{ background: 'var(--bg-dark)'}}>File Size</option>
                   <option value="name" style={{ background: 'var(--bg-dark)'}}>Name</option>
                </select>

                <div className="view-mode-buttons" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                   <button onClick={() => setViewMode('large')} style={{ background: viewMode === 'large' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer' }}><Maximize2 size={18} /></button>
                   <button onClick={() => setViewMode('medium')} style={{ background: viewMode === 'medium' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer' }}><Grid size={18} /></button>
                   <button onClick={() => setViewMode('small')} style={{ background: viewMode === 'small' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer' }}><LayoutGrid size={18} /></button>
                   <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? 'var(--accent-primary)' : 'transparent', border: 'none', padding: '8px 12px', color: '#fff', cursor: 'pointer' }}><ListIcon size={18} /></button>
                </div>

                <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleUploadSelectedFile} />
                <input type="file" ref={folderInputRef} webkitdirectory="" style={{ display: 'none' }} onChange={handleUploadSelectedFolder} />

                {selectedIds.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'rgba(59, 130, 246, 0.1)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <button onClick={handleBulkDownload} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <Download size={16} /> Download
                    </button>
                    <button onClick={handleBulkDelete} style={{ padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', background: 'rgba(239, 44, 44, 0.1)', border: '1px solid rgba(239, 44, 44, 0.2)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <Trash2 size={16} /> Delete
                    </button>
                    <button onClick={() => { setSelectedIds([]); setIsSelectionMode(false); }} style={{ padding: '8px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                       <X size={18} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative' }}>
                       <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} onClick={() => setShowUploadMenu(!showUploadMenu)}>
                          <Upload size={18} /> Upload <ChevronDown size={14} />
                       </button>

                       {showUploadMenu && (
                         <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, width: '180px', marginTop: '8px', padding: '8px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                            <button onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                               <File size={16} color="#3b82f6" /> Files
                            </button>
                            <button onClick={() => { folderInputRef.current?.click(); setShowUploadMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                               <Folder size={16} color="#f59e0b" /> Folders
                            </button>
                         </div>
                       )}
                    </div>
                    <button onClick={handleCreateFolder} style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>
                       <Folder size={18} /> New Folder
                    </button>
                  </>
                )}
                <button onClick={() => setIsSelectionMode(!isSelectionMode)} style={{ padding: '10px 16px', borderRadius: '8px', background: isSelectionMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelectionMode ? 'var(--accent-primary)' : 'var(--border-color)'}`, color: isSelectionMode ? 'var(--accent-primary)' : '#fff', cursor: 'pointer' }}>
                  {isSelectionMode ? 'Cancel' : 'Select'}
                </button>
             </div>
          </div>

          <div className="vault-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
             <button onClick={() => navigateToFolder(null)} style={{ background: 'transparent', border: 'none', color: !currentFolder ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: !currentFolder ? '700' : '400' }}>Home</button>
             {folderStack.map((f, i) => (
                <React.Fragment key={f._id}>
                   <span style={{ opacity: 0.5 }}>/</span>
                   <button onClick={() => navigateBack(i)} style={{ background: 'transparent', border: 'none', color: i === folderStack.length - 1 ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: i === folderStack.length - 1 ? '700' : '400' }}>{f.originalName}</button>
                </React.Fragment>
             ))}
          </div>

          {userFiles.length === 0 ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Upload size={64} color="var(--accent-primary)" style={{ opacity: 0.2, marginBottom: '24px' }} />
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '8px' }}>Vault is Empty</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '300px' }}>Initiate a secure ingestion to begin populating your encrypted dashboard.</p>
             </div>
          ) : (
            <div className={`file-grid-adaptive ${viewMode === 'list' ? 'list-view' : ''}`} style={{ 
                display: viewMode === 'list' ? 'flex' : 'grid',
                flexDirection: 'column',
                gridTemplateColumns: viewMode === 'large' ? 'repeat(auto-fill, minmax(320px, 1fr))' : viewMode === 'small' ? 'repeat(auto-fill, minmax(140px, 1fr))' : 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px'
            }}>
                {sortedFiles.map(file => (
                  <div key={file._id} onClick={() => isSelectionMode ? toggleSelect(file._id) : handleFileClick(file)} style={{ 
                      background: selectedIds.includes(file._id) ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                      padding: viewMode === 'list' ? '12px 24px' : (viewMode === 'small' ? '12px' : '20px'),
                      borderRadius: '16px',
                      border: `1px solid ${selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                      cursor: 'pointer',
                      position: 'relative',
                      display: viewMode === 'list' ? 'flex' : 'block',
                      alignItems: 'center',
                      transition: 'all 0.2s',
                      overflow: 'hidden'
                  }}>
                      {isSelectionMode && (
                        <div style={{ 
                            width: '20px', height: '20px', borderRadius: '6px', 
                            border: `2px solid ${selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                            background: selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginRight: viewMode === 'list' ? '16px' : '0',
                            position: viewMode === 'list' ? 'static' : 'absolute',
                            top: viewMode === 'small' ? '8px' : '12px', 
                            left: viewMode === 'small' ? '8px' : '12px',
                            zIndex: 10
                        }}>
                           {selectedIds.includes(file._id) && <Check size={14} color="#fff" />}
                        </div>
                      )}

                      <div style={{ 
                          width: viewMode === 'small' ? '40px' : '56px', height: viewMode === 'small' ? '40px' : '56px',
                          borderRadius: '12px', background: file.isFolder ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          marginBottom: viewMode === 'list' ? '0' : '16px',
                          marginRight: viewMode === 'list' ? '16px' : '0'
                      }}>
                         {file.isFolder ? <Folder size={24} color="#f59e0b" /> : <File size={24} color="#3b82f6" />}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                         <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.originalName}</h4>
                         <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {file.isFolder ? 'Directory' : formatPreciseSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}
                         </p>
                      </div>

                      <div className="card-actions-trigger" style={{ marginLeft: 'auto' }}>
                         <button onClick={(e) => handleActionClick(e, file._id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><MoreVertical size={18} /></button>
                         {activeMenu === file._id && (
                             <div className="glass-panel" style={{ position: 'absolute', top: '100%', right: 0, width: '160px', zIndex: 100, padding: '8px', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleSecureDownload(file); setActiveMenu(null); }} style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: '#fff', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '6px' }} onMouseOver={e=>e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><Download size={14} style={{marginRight:'8px'}}/> Download</button>
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(e, file._id); setActiveMenu(null); }} style={{ width: '100%', padding: '8px', background: 'transparent', border: 'none', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer', fontSize: '0.85rem', borderRadius: '6px' }} onMouseOver={e=>e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><Trash2 size={14} style={{marginRight:'8px'}}/> Delete</button>
                             </div>
                         )}
                      </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right 25% Telemetry */}
        <div className="dashboard-right" style={{ flex: '0 0 calc(25% - 20px)', position: 'sticky', top: '100px', alignSelf: 'flex-start' }}>
           <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '32px' }}>Storage Insight</h3>
              
              <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto 32px auto', borderRadius: '50%', background: conicGradientStr, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div style={{ width: '160px', height: '160px', borderRadius: '50%', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: '800' }}>{overallUsedDisplay}%</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>of 50 GB Vault</span>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 {dynamicCategories.map(cat => (
                    <div key={cat.name}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{cat.name}</span>
                          <span style={{ fontWeight: '600' }}>{cat.percent}%</span>
                       </div>
                       <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{formatPreciseSize(cat.size)}</div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </main>

      {/* Upload Manager Telemetry */}
      {uploadQueue.length > 0 && (
         <div className="glass-panel" style={{ 
             position: 'fixed', bottom: '24px', right: '24px', width: isQueueMinimized ? 'auto' : '320px', 
             zIndex: 200, padding: isQueueMinimized ? '12px 20px' : '0', borderRadius: '16px', overflow: 'hidden',
             background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
         }}>
            <div onClick={() => setIsUploadMinimized(!isUploadMinimized)} style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: 'rgba(255,255,255,0.03)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <RefreshCw size={18} className={isUploading ? 'animate-spin' : ''} color={isUploading ? 'var(--accent-primary)' : '#10b981'} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{isUploading ? `${uploadQueue.filter(t=>t.status==='done').length}/${uploadQueue.length} Ingesting...` : 'Vault Synced'}</span>
               </div>
               <ChevronDown size={18} style={{ transform: isUploadMinimized ? 'rotate(180deg)' : 'none' }} />
            </div>
            {!isUploadMinimized && (
                <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '12px 20px 20px 20px' }}>
                   {uploadQueue.map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         {task.status === 'encrypting' ? <Fingerprint size={16} color="#f59e0b" /> : task.status === 'uploading' ? <Globe size={16} color="#3b82f6" /> : task.status === 'done' ? <Check size={16} color="#10b981" /> : <File size={16} color="var(--text-muted)" />}
                         <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.originalName}</p>
                            <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>{task.status}</p>
                         </div>
                         {(task.status === 'done' || task.status === 'error') && <button onClick={() => setUploadQueue(q => q.filter(t=>t.id!==task.id))} style={{ background:'transparent', border:'none', color:'var(--text-muted)' }}><X size={14} /></button>}
                      </div>
                   ))}
                   {uploadQueue.every(t => t.status==='done') && <button onClick={() => setUploadQueue([])} style={{ width:'100%', marginTop:'12px', padding:'8px', borderRadius:'8px', background:'rgba(59,130,246,0.1)', border:'1px solid rgba(59,130,246,0.2)', color:'#fff', fontSize:'0.75rem' }}>Clear Context</button>}
                </div>
            )}
         </div>
      )}

      {showAccountModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, animation: 'fadeIn 0.3s ease-out' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '40px', position: 'relative', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
            <button onClick={() => { setIsSwitching(false); setShowAccountModal(false); }} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
            
            {accountModalView === 'options' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', color: 'var(--accent-primary)' }}>
                   <Fingerprint size={32} />
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px' }}>Add Account</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Choose your preferred authentication protocol to initiate a secure parallel session.</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                   <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }} onClick={() => { setIsAccountLoading(true); loginWithGoogle().then(() => setShowAccountModal(false)).catch(e => showAlert("Identity Error", e.message)).finally(() => setIsAccountLoading(false)); }}>
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
                       setIsSwitching(false);
                       setShowAccountModal(false);
                   } catch (err) { showAlert("Identity Error", err.message); } finally { setIsAccountLoading(false); }
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

      {infoFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s ease-out' }} onClick={() => setInfoFile(null)}>
           <div className="glass-panel" style={{ width: '450px', padding: '32px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setInfoFile(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}><X size={18} /></button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                 <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: infoFile.isFolder ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: infoFile.isFolder ? '#f59e0b' : '#3b82f6' }}>
                    {infoFile.isFolder ? <Folder size={24} /> : <File size={24} />}
                 </div>
                 <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Identity Metadata</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Verified Vault Record</p>
                 </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '1px' }}>Original Name</p>
                    <p style={{ fontWeight: '500', wordBreak: 'break-all', fontSize: '0.9rem' }}>{infoFile.originalName}</p>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Registry Type</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? 'Directory' : infoFile.mimeType.split('/')[1]?.toUpperCase() || 'DATA'}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Storage Weight</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? '--' : formatPreciseSize(infoFile.fileSize)}</p>
                    </div>
                 </div>

                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vault Location</p>
                    <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                       <Globe size={14} color="#3b82f6" />
                       Root {folderStack.map(f => ` / ${f.originalName}`).join('')} {currentFolder ? ` / ${currentFolder.originalName}` : ''}
                    </p>
                 </div>

                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Creation Timestamp</p>
                    <p style={{ fontWeight: '500' }}>{new Date(infoFile.createdAt).toLocaleString()}</p>
                 </div>

                 <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={16} color="#34d399" />
                    <span style={{ fontSize: '0.8rem', color: '#34d399' }}>Secured with AES-GCM 256-bit Hardware-Key Encryption</span>
                 </div>
              </div>

              <button onClick={() => setInfoFile(null)} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }}>Close Inspector</button>
           </div>
        </div>
      )}

      {pageLoading && <Loader message={loaderMessage} />}
    </div>
  );
};

export default Home;
