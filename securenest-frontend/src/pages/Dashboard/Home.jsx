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
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploadMinimized, setIsUploadMinimized] = useState(true);
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
  const [selectedIds, setSelectedIds] = useState([]);

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
    const initFetch = async () => {
      setPageLoading(true);
      await fetchDashboardData();
      // Artificial delay to show off the premium animation and ensure smooth transition
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

  const toggleSelect = (e, fileId) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    showConfirm(
      "Purge Identified Identities?", 
      `Are you sure you want to permanently decommission ${selectedIds.length} items from the vault? This action is irreversible.`, 
      async () => {
        setPageLoading(true);
        setLoaderMessage(`Decommissioning ${selectedIds.length} identities...`);
        try {
          const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
          for (const id of selectedIds) {
            await axios.delete(`${bUrl}/api/storage/${id}`);
          }
          setUserFiles(prev => prev.filter(f => !selectedIds.includes(f._id)));
          setSelectedIds([]);
          showAlert("Vault Purged", "The selected identities have been successfully decommissioned.");
        } catch (error) {
          console.error("Bulk Delete Failure", error);
          showAlert("Registry Error", "One or more identities failed to decommission properly.");
        } finally {
          setPageLoading(false);
          setLoaderMessage("Accessing Secure Vault...");
        }
      }
    );
  };

  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;
    
    setPageLoading(true);
    setLoaderMessage(`Engaging Cryptographic Archive Engine...`);
    
    try {
      const zipJS = await import("@zip.js/zip.js");
      const { decryptFileForDownload } = await import('../../utils/cryptoFunctions');
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      
      const zipFileWriter = new zipJS.BlobWriter("application/zip");
      const zipWriter = new zipJS.ZipWriter(zipFileWriter);
      
      let allFilesToDownload = [];

      for (const id of selectedIds) {
        let item = userFiles.find(f => f._id === id);
        
        // Identity Resolution: Fetch from registry if out of current scope
        if (!item) {
          setLoaderMessage(`Resolving Remote Identity...`);
          try {
            const metaRes = await axios.get(`${bUrl}/api/storage/metadata/${id}`);
            if (metaRes.data.success) item = metaRes.data.file;
          } catch (resError) {
            console.error("Identity resolution failed for:", id, resError);
          }
        }

        if (!item) continue;

        if (item.isFolder) {
          setLoaderMessage(`Deep-Scanning Directory: ${item.originalName}...`);
          try {
            const response = await axios.get(`${bUrl}/api/storage/files/${currentUser.uid}/recursive/${item._id}`);
            if (response.data.success) {
              const nested = response.data.files.map(f => ({ ...f, zipPath: `${item.originalName}/${f.relativePath}` }));
              allFilesToDownload = allFilesToDownload.concat(nested);
            }
          } catch (discoverError) {
            console.error("Recursive discovery failed for:", item.originalName, discoverError);
          }
        } else {
          allFilesToDownload.push({ ...item, zipPath: item.originalName });
        }
      }

      if (allFilesToDownload.length === 0) {
        throw new Error("No ingestible identities discovered in selection.");
      }

      for (const file of allFilesToDownload) {
        setLoaderMessage(`Decrypting: ${file.zipPath}...`);
        const response = await axios.get(`${bUrl}/api/storage/proxy/${file._id}`, { responseType: 'arraybuffer' });
        const rawBuffer = response.data;
        const ivToUse = typeof file.iv === 'string' ? JSON.parse(file.iv) : file.iv;
        const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, ivToUse, file.mimeType);
        
        // AES-256 Encryption Hardening 🛡️
        await zipWriter.add(file.zipPath, new zipJS.Uint8ArrayReader(new Uint8Array(await decryptedBlob.arrayBuffer())), {
          password: vaultKey,
          encryptionMethod: "aes"
        });
      }
      
      await zipWriter.close();
      const zipBlob = await zipFileWriter.getData();
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SecureVault_Export_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showAlert("Transmission Finalized", `Hierarchical archive constructed for ${allFilesToDownload.length} identities.`);
      setSelectedIds([]);
    } catch (error) {
      console.error("Bulk Download Failure", error);
      showAlert("Transmission Error", "Failed to compile cryptographic archive.");
    } finally {
      setPageLoading(false);
      setLoaderMessage("Accessing Secure Vault...");
    }
  };

  const handleUploadSelectedFile = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const newQueueItems = files.map(f => ({
       id: Math.random().toString(36).substr(2, 9),
       file: f,
       originalName: f.name,
       status: 'pending', // 'pending', 'encrypting', 'uploading', 'done', 'error'
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

    if (!vaultKey || vaultKey === 'Loading...') {
      showAlert("Security Constraint", "Cryptographic Vault Key is not ready.");
      return;
    }

    setIsUploading(true);
    setLoaderMessage("Mapping Recursive Entropy Branch...");
    
    try {
      const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
      const folderIdMap = { "": currentFolder?._id || null };
      const newQueueItems = [];

      // 1. Pre-resolve Folder Hierarchy (Optimized for Bulk Ingestion)
      for (const file of files) {
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop(); // Remove file name
        let currentParentId = currentFolder?._id || null;
        let currentPath = "";

        for (const folderName of pathParts) {
          currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
          if (!folderIdMap[currentPath]) {
            const { data } = await axios.post(`${bUrl}/api/storage/folder`, {
              userId: currentUser.uid,
              originalName: folderName,
              parentId: currentParentId
            });
            if (data.success) {
              folderIdMap[currentPath] = data.folder._id;
              // Inject into UI if at current level
              if (currentParentId === (currentFolder?._id || null)) {
                setUserFiles(prev => prev.some(f => f._id === data.folder._id) ? prev : [data.folder, ...prev]);
              }
            } else { throw new Error(`Recursion Failed: ${folderName}`); }
          }
          currentParentId = folderIdMap[currentPath];
        }

        newQueueItems.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          originalName: file.name,
          status: 'pending',
          progress: 0,
          parentId: currentParentId || null
        });
      }
      
      setUploadQueue(prev => [...prev, ...newQueueItems]);
      setIsUploadMinimized(false);
    } catch (err) {
      console.error("Hierarchy Ingestion Error", err);
      showAlert("Branch Failure", "Failed to reconstruct the local directory tree within the vault.");
    } finally {
      setIsUploading(false);
      setLoaderMessage("Accessing Secure Vault...");
      if (folderInputRef.current) folderInputRef.current.value = null;
    }
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
        const { cipherBlob, iv } = await encryptFileForUpload(nextTask.file, vaultKey);
        
        updateTaskStatus(nextTask.id, 'uploading');
        const formData = new FormData();
        formData.append('file', cipherBlob, nextTask.originalName);
        formData.append('userId', currentUser.uid);
        formData.append('originalName', nextTask.originalName);
        formData.append('mimeType', nextTask.file.type || 'application/octet-stream');
        formData.append('ivArray', JSON.stringify(iv));
        if (nextTask.parentId) formData.append('parentId', nextTask.parentId);

        const { data } = await axios.post(`${bUrl}/api/storage/upload`, formData);

        if (data.success) {
           updateTaskStatus(nextTask.id, 'done');
           if (nextTask.parentId === (currentFolder?._id || null)) {
              setUserFiles(prev => [data.file, ...prev]);
           }
           setTotalStorageUsed(prev => prev + data.file.fileSize);
        } else {
           updateTaskStatus(nextTask.id, 'error');
        }
      } catch (err) {
        console.error("Queue Processing Error", err);
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
        
        // Use the new Proxy Retrieval Pipeline to bypass browser CORS (Telegram CDN restriction)
        const response = await fetch(`${bUrl}/api/storage/proxy/${file._id}`);
        if (!response.ok) throw new Error("Proxy retrieval failed.");
        
        const rawBuffer = await response.arrayBuffer();
        
        // Correctly parse the IV from MongoDB string format to ensure Web Crypto API gets a valid Uint8Array
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
        setLoaderMessage("Accessing Secure Vault...");
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
                     const response = await fetch(`${bUrl}/api/storage/proxy/${file._id}`);
                     if (response.ok) {
                         const rawBuffer = await response.arrayBuffer();
                         const ivToUse = typeof file.iv === 'string' ? JSON.parse(file.iv) : file.iv;
                         const decryptedBlob = await decryptFileForDownload(rawBuffer, vaultKey, ivToUse, file.mimeType);
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

  const handleDelete = (e, fileId) => {
    e.stopPropagation();
    showConfirm(
        "Decommission Binary?", 
        "Are you absolutely sure you want to permanently decommission this file? This operation will purge all encrypted fragments from the secure nodes.",
        async () => {
            try {
              const bUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
              const { data } = await axios.delete(`${bUrl}/api/storage/${fileId}`);
              if (data.success) {
                const fileToRemove = userFiles.find(f => f._id === fileId);
                setUserFiles(prev => prev.filter(f => f._id !== fileId));
                if (fileToRemove) setTotalStorageUsed(prev => prev - fileToRemove.fileSize);
                if (blobCache[fileId]) URL.revokeObjectURL(blobCache[fileId]);
                closeDialog();
              }
            } catch (error) {
              showAlert("Vault Error", "Security Decommissioning failed.");
            }
        },
        true
    );
  };


  // Real-Time Storage Calculations Context
   const formatPreciseSize = (bytes) => {
      if (bytes === 0) return '0.00000 KB';
      const kb = bytes / 1024;
      if (kb < 1024) return `${kb.toFixed(5)} KB`;
      const mb = kb / 1024;
      if (mb < 1024) return `${mb.toFixed(5)} MB`;
      const gb = mb / 1024;
      return `${gb.toFixed(5)} GB`;
   };

   // Real-Time Storage Calculations Context
   const getPercentage = (used, max) => {
     const val = (used / max) * 100;
     if (used > 0 && val < 0.1) return val.toFixed(5);
     return Math.min(val, 100).toFixed(5);
   };
   const overallUsed = getPercentage(totalStorageUsed, MAX_STORAGE);
   const overallUsedDisplay = parseFloat(overallUsed) > 0 && parseFloat(overallUsed) < 0.1 ? parseFloat(overallUsed).toFixed(3) : parseFloat(overallUsed).toFixed(2);
   
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
               percent: ((size / MAX_STORAGE) * 100).toFixed(5), // Precision relative to 50 GB
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
       // Represent empty capacity as no-color segment
       conicStops.push(`rgba(255,255,255,0.05) ${currentDegree}deg`);
       conicStops.push(`rgba(255,255,255,0.05) 360deg`);
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
                <span className="user-identity-text" style={{ fontSize: '0.9rem', fontWeight: '600' }}>{currentUser?.displayName || 'Vault User'}</span>
                <span className="user-identity-text" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentUser?.email}</span>
             </div>
          </div>
          {profileOpen && (
            <div className="glass-panel" style={{ position: 'absolute', top: '70px', right: '0', width: '320px', maxWidth: 'calc(100vw - 40px)', padding: '20px', zIndex: 300, animation: 'fadeIn 0.2s ease-out', background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(30px)', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px rgba(0,0,0,0.8)' }}>
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', margin: 0 }}><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }}/> Vault Encryption Key</p>
                   <button onClick={handleCopy} style={{ background: 'transparent', border: 'none', color: copied ? 'var(--success)' : 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: '500' }}>
                      {copied ? <><Check size={14}/> Copied</> : <><Copy size={14}/> Copy</>}
                   </button>
                </div>
                <div className="vault-key-row">
                  <div className="vault-key-display">
                    {showVaultKey ? vaultKey : '••••••••••••••••••••••••'}
                  </div>
                  <div className="vault-key-action-group">
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
                            setIsSwitching(true);
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
                              <div className={`avatar-status-glow ${isActive ? 'avatar-glow-green' : 'avatar-glow-red'}`} style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: '700', transition: 'all 0.3s' }}>
                                 {acc.email[0].toUpperCase()}
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

                <input type="file" ref={fileInputRef} multiple style={{ display: 'none' }} onChange={handleUploadSelectedFile} />
                <input type="file" ref={folderInputRef} webkitdirectory="" style={{ display: 'none' }} onChange={handleUploadSelectedFolder} />

                <div style={{ position: 'relative' }}>
                   <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', whiteSpace: 'nowrap' }} onClick={() => setShowUploadMenu(!showUploadMenu)}>
                      <Upload size={18} /> 
                      Upload
                      <ChevronDown size={14} style={{ marginLeft: '4px', transform: showUploadMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                   </button>

                   {showUploadMenu && (
                     <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, width: '180px', marginTop: '8px', padding: '8px', zIndex: 1000, background: 'rgba(15, 23, 42, 0.98)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease-out' }}>
                        <button onClick={() => { fileInputRef.current?.click(); setShowUploadMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                           <File size={16} color="#3b82f6" /> Upload Files
                        </button>
                        <button onClick={() => { folderInputRef.current?.click(); setShowUploadMenu(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}>
                           <Folder size={16} color="#f59e0b" /> Upload Folder
                        </button>
                     </div>
                   )}
                </div>

                <button onClick={handleCreateFolder} style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                   <Folder size={18} />
                   Create Folder
                </button>
                
                <button className="mobile-sidebar-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open Storage Insight">
                   <ChevronLeft size={20} />
                </button>
             </div>
          </div>

          <div className="vault-breadcrumbs" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
             <button onClick={() => navigateToFolder(null)} style={{ background: 'transparent', border: 'none', color: !currentFolder ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: !currentFolder ? '700' : '400', display: 'flex', alignItems: 'center', gap: '4px' }}><LayoutGrid size={14} /> Home</button>
             {folderStack.map((f, i) => (
                <React.Fragment key={f._id}>
                   <span style={{ opacity: 0.5 }}>/</span>
                   <button onClick={() => navigateBack(i)} style={{ background: 'transparent', border: 'none', color: i === folderStack.length - 1 ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: i === folderStack.length - 1 ? '700' : '400' }}>{f.originalName}</button>
                </React.Fragment>
             ))}
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
          
           {userFiles.length === 0 && !currentFolder ? (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '450px', background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.05), rgba(15, 23, 42, 0.4))', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', animation: 'fadeIn 0.6s ease-out' }}>
                <img src="/logo.png" alt="SecureNest Welcome" style={{ width: '90px', height: '90px', objectFit: 'contain', marginBottom: '16px', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.5))' }} />
                <h2 style={{ fontSize: '2.2rem', fontWeight: '800', marginBottom: '12px', background: 'linear-gradient(to right, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textAlign: 'center' }}>Welcome, {currentUser?.displayName?.split(' ')[0] || 'User'}!</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', textAlign: 'center', maxWidth: '420px', lineHeight: '1.6', marginBottom: '32px' }}>Your fully private encryption vault is ready. Upload your first file to initiate the dynamic telemetry engine.</p>
                
                <button className="btn-primary" style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.05rem', borderRadius: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)', width: 'auto', opacity: isUploading ? 0.7 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }} onClick={() => !isUploading && fileInputRef.current?.click()} disabled={isUploading}>
                   {isUploading ? <RefreshCw size={20} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} /> : <Upload size={20} />} 
                   {isUploading ? 'Encrypting...' : 'Upload First File'}
                </button>
             </div>
          ) : (
            <>
              {userFiles.length === 0 && currentFolder && (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-muted)' }}>
                    <Folder size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                    <p>This folder is empty.</p>
                 </div>
              )}

              {viewMode === 'list' ? (
                 <div className="file-grid-adaptive" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {sortedFiles.map(file => (
                         <div key={file._id} onClick={() => handleFileClick(file)} className="file-card-group" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '16px 24px', borderRadius: '12px', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.2s', flexWrap: 'wrap', position: 'relative' }} onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.querySelectorAll('.card-actions').forEach(el => el.style.opacity = 1); }} onMouseOut={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; if (activeMenu !== file._id && selectedIds.length === 0) e.currentTarget.querySelectorAll('.card-actions').forEach(el => el.style.opacity = 0); }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 auto', minWidth: '150px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '6px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: file.isFolder ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)' }}>
                                 {file.isFolder ? (
                                    <Folder size={18} color="#f59e0b" />
                                 ) : blobCache[file._id] && file.mimeType.startsWith('image/') ? (
                                    <img src={blobCache[file._id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 ) : file.mimeType.startsWith('image/') ? (
                                    <ImageIcon size={18} color="#3b82f6" />
                                 ) : file.mimeType.startsWith('video/') ? (
                                    <Video size={18} color="#3b82f6" />
                                 ) : (
                                    <File size={18} color="#3b82f6" />
                                 )}
                              </div>
                              {renamingId === file._id ? (
                                 <input 
                                   autoFocus 
                                   className="input-field" 
                                   style={{ padding: '4px 12px', fontSize: '0.9rem', height: '30px', border: '1px solid var(--accent-primary)', background: 'rgba(59, 130, 246, 0.1)' }} 
                                   value={renameValue} 
                                   onChange={e => setRenameValue(e.target.value)} 
                                   onKeyDown={(e) => handleRenameSubmit(e, file._id)} 
                                   onBlur={() => setRenamingId(null)}
                                   onClick={e => e.stopPropagation()}
                                 />
                              ) : (
                                 <span style={{ fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '30vw' }}>{file.originalName}</span>
                              )}
                           </div>
                           
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                               <div className="card-actions" style={{ position: 'relative', display: 'flex', gap: '8px', opacity: selectedIds.length > 0 || activeMenu === file._id ? 1 : 0, transition: 'opacity 0.2s' }}>
                                    <button 
                                      onClick={(e) => toggleSelect(e, file._id)} 
                                      style={{ 
                                        background: selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', 
                                        border: `1px solid ${selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                                        borderRadius: '6px', 
                                        padding: '6px', 
                                        color: '#fff', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                      title="Select Item"
                                    >
                                      {selectedIds.includes(file._id) ? <Check size={14} /> : <div style={{ width: 14, height: 14 }} />}
                                    </button>
                                   <button onClick={(e) => handleActionClick(e, file._id)} className="action-btn-small" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', padding: '6px', color: 'var(--text-muted)', cursor: 'pointer' }} title="Actions"><MoreVertical size={16} /></button>
                                   
                                   {activeMenu === file._id && (
                                      <div className="glass-panel" style={{ position: 'absolute', top: '100%', right: 0, width: '180px', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 1000, padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginTop: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                                         {!file.isFolder && <button onClick={(e) => { e.stopPropagation(); handleFileClick(file); setActiveMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Download size={14} color="#3b82f6" /> Download</button>}
                                         <button onClick={(e) => handleRenameToggle(e, file)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Edit2 size={14} color="#f59e0b" /> Rename</button>
                                         <button onClick={(e) => showInfo(e, file)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Info size={14} color="#34d399" /> Info</button>
                                         <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                                         <button onClick={(e) => handleDelete(e, file._id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '8px', fontSize: '0.9rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Trash2 size={14} /> Delete</button>
                                      </div>
                                   )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  <span style={{ whiteSpace: 'nowrap' }}>{file.isFolder ? 'Directory' : `${(file.fileSize / 1024 / 1024).toFixed(3)} MB`}</span>
                                  <span>•</span>
                                  <span style={{ whiteSpace: 'nowrap' }}>{new Date(file.createdAt).toLocaleDateString()}</span>
                               </div>
                           </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="file-grid-adaptive" style={{ display: 'grid', gridTemplateColumns: viewMode === 'large' ? 'repeat(auto-fill, minmax(320px, 1fr))' : viewMode === 'small' ? 'repeat(auto-fill, minmax(130px, 1fr))' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: '24px' }}>
                      {sortedFiles.map(file => (
                          <div key={file._id} onClick={() => handleFileClick(file)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: viewMode === 'small' ? '12px' : '20px', cursor: 'pointer', position: 'relative', transition: 'all 0.2s', overflow: 'visible' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.querySelector('.card-actions-overlay').style.opacity = 1; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--border-color)'; if (activeMenu !== file._id && selectedIds.length === 0) e.currentTarget.querySelector('.card-actions-overlay').style.opacity = 0; }}>
                              
                              {/* Card Content */}
                              <div style={{ width: viewMode === 'small' ? '36px' : '64px', height: viewMode === 'small' ? '36px' : '64px', borderRadius: '12px', background: file.isFolder ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: file.isFolder ? '#f59e0b' : 'var(--accent-primary)' }}>
                                 {file.isFolder ? (
                                    <Folder size={viewMode === 'small' ? 20 : 32} />
                                 ) : blobCache[file._id] && file.mimeType.startsWith('image/') ? (
                                    <img src={blobCache[file._id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                 ) : file.mimeType.startsWith('image/') ? (
                                    <ImageIcon size={viewMode === 'small' ? 20 : 32} />
                                 ) : file.mimeType.startsWith('video/') ? (
                                    <Video size={viewMode === 'small' ? 20 : 32} />
                                 ) : (
                                    <File size={viewMode === 'small' ? 20 : 32} />
                                 )}
                              </div>
                              {renamingId === file._id ? (
                                 <input 
                                   autoFocus 
                                   className="input-field" 
                                   style={{ padding: '4px 8px', fontSize: '0.85rem', width: '100%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid var(--accent-primary)' }} 
                                   value={renameValue} 
                                   onChange={e => setRenameValue(e.target.value)} 
                                   onKeyDown={(e) => handleRenameSubmit(e, file._id)} 
                                   onBlur={() => setRenamingId(null)}
                                   onClick={e => e.stopPropagation()}
                                 />
                              ) : (
                                 <>
                                   <h4 style={{ fontSize: viewMode === 'small' ? '0.85rem' : '1.05rem', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.originalName}</h4>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{file.isFolder ? 'Directory' : `${(file.fileSize / 1024 / 1024).toFixed(3)} MB`} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                 </>
                              )}
                              
                               {/* Action Overlay */}
                               <div className="card-actions-overlay" style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', opacity: selectedIds.length > 0 || activeMenu === file._id ? 1 : 0, transition: 'opacity 0.2s', zIndex: 10 }}>
                                   <button 
                                      onClick={(e) => toggleSelect(e, file._id)} 
                                      style={{ 
                                        background: selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'rgba(15,23,42,0.9)', 
                                        border: `1px solid ${selectedIds.includes(file._id) ? 'var(--accent-primary)' : 'var(--border-color)'}`, 
                                        borderRadius: '8px', 
                                        padding: '8px', 
                                        color: '#fff', 
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.2s'
                                      }}
                                      title="Select Item"
                                    >
                                      {selectedIds.includes(file._id) ? <Check size={14} /> : <div style={{ width: 14, height: 14 }} />}
                                    </button>
                                  <button onClick={(e) => handleActionClick(e, file._id)} style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--text-muted)', cursor: 'pointer' }} title="Actions"><MoreVertical size={14} /></button>
                                  
                                  {activeMenu === file._id && (
                                     <div className="glass-panel" style={{ position: 'absolute', top: '100%', right: 0, width: '160px', background: 'rgba(15, 23, 42, 0.98)', border: '1px solid var(--border-color)', borderRadius: '12px', zIndex: 1000, padding: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', marginTop: '8px', animation: 'fadeIn 0.2s ease-out' }}>
                                        {!file.isFolder && <button onClick={(e) => { e.stopPropagation(); handleFileClick(file); setActiveMenu(null); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Download size={12} color="#3b82f6" /> Download</button>}
                                        <button onClick={(e) => handleRenameToggle(e, file)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Edit2 size={12} color="#f59e0b" /> Rename</button>
                                        <button onClick={(e) => showInfo(e, file)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(59,130,246,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Info size={12} color="#34d399" /> Info</button>
                                        <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>
                                        <button onClick={(e) => handleDelete(e, file._id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }} onMouseOver={e => e.currentTarget.style.background='rgba(239,68,68,0.1)'} onMouseOut={e => e.currentTarget.style.background='transparent'}><Trash2 size={12} /> Delete</button>
                                     </div>
                                  )}
                               </div>
                          </div>
                      ))}
                   </div>
                )}
            </>
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
                <span style={{ fontSize: '1.8rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>{overallUsedDisplay}%</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500' }}>of Free 50 GB</span>
             </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {dynamicCategories.length === 0 ? (
               <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0' }}>No categorical data stored yet...</div>
            ) : (
                topCategories.map((cat, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: cat.theme.color, boxShadow: `0 0 10px ${cat.theme.shadow}` }}></div>
                          <span style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{cat.name}</span>
                        </div>
                        <span style={{ fontWeight: '600', fontSize: '1rem' }}>{cat.percent}%</span>
                      </div>
                      <div style={{ paddingLeft: '26px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{formatPreciseSize(cat.size)}</span>
                      </div>
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
               <span style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--text-muted)' }}>{ (100 - parseFloat(overallUsed)).toFixed(5) }%</span>
            </div>
          </div>
        </div>

      {/* Multi-Account Switcher Modal */}
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


      {/* Context Action Overlay: Info Modal */}
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
                    <p style={{ fontWeight: '500', wordBreak: 'break-all' }}>{infoFile.originalName}</p>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Registry Type</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? 'Directory' : infoFile.mimeType.split('/')[1]?.toUpperCase() || 'DATA'}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Storage Weight</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? '--' : `${(infoFile.fileSize / 1024 / 1024).toFixed(3)} MB`}</p>
                    </div>
                 </div>

                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vault Location</p>
                    <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Secured with AES-GCM 256-bit Hardware-Key Encryption</span>
                 </div>
              </div>

              <button onClick={() => setInfoFile(null)} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }}>Close Inspector</button>
           </div>
        </div>
      )}

      {/* Context Action Overlay: Info Modal */}
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
                    <p style={{ fontWeight: '500', wordBreak: 'break-all' }}>{infoFile.originalName}</p>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Registry Type</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? 'Directory' : infoFile.mimeType.split('/')[1]?.toUpperCase() || 'DATA'}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Storage Weight</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? '--' : `${(infoFile.fileSize / 1024 / 1024).toFixed(3)} MB`}</p>
                    </div>
                 </div>

                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vault Location</p>
                    <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Secured with AES-GCM 256-bit Hardware-Key Encryption</span>
                 </div>
              </div>

              <button onClick={() => setInfoFile(null)} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }}>Close Inspector</button>
           </div>
        </div>
      )}
      {/* Context Action Overlay: Info Modal */}
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
                    <p style={{ fontWeight: '500', wordBreak: 'break-all' }}>{infoFile.originalName}</p>
                 </div>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Registry Type</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? 'Directory' : infoFile.mimeType.split('/')[1]?.toUpperCase() || 'DATA'}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                       <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Storage Weight</p>
                       <p style={{ fontWeight: '500' }}>{infoFile.isFolder ? '--' : `${(infoFile.fileSize / 1024 / 1024).toFixed(3)} MB`}</p>
                    </div>
                 </div>

                 <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Vault Location</p>
                    <p style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    <span style={{ fontSize: '0.85rem', color: '#34d399' }}>Secured with AES-GCM 256-bit Hardware-Key Encryption</span>
                 </div>
              </div>

              <button onClick={() => setInfoFile(null)} className="btn-primary" style={{ width: '100%', marginTop: '24px', padding: '12px', borderRadius: '12px' }}>Close Inspector</button>
           </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div 
          className="glass-panel selection-toolbar-sticky" 
          style={{ 
            position: 'fixed', 
            bottom: '30px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            zIndex: 10001, 
            padding: '10px 18px', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '16px', 
            border: '1px solid var(--accent-primary)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            animation: 'fadeInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
           <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderRight: '1px solid var(--border-color)', paddingRight: '16px' }}>
              <div style={{ background: 'var(--accent-primary)', width: '26px', height: '26px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                 <Check size={14} />
              </div>
              <span style={{ fontWeight: '700', fontSize: '1.2rem' }}>{selectedIds.length}</span>
           </div>

           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={handleBulkDownload} 
                className="btn-primary" 
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: 'auto', borderRadius: '10px' }}
              >
                 <Download size={14} /> Download ZIP
              </button>
              <button 
                onClick={handleBulkDelete} 
                className="btn-primary" 
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', width: 'auto', borderRadius: '10px' }}
              >
                 <Trash2 size={14} /> Delete
              </button>
              <button 
                onClick={() => setSelectedIds([])} 
                className="btn-primary" 
                style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '8px 16px', fontSize: '0.85rem', width: 'auto', borderRadius: '10px' }}
              >
                 Cancel
              </button>
           </div>
        </div>
      )}

      {uploadQueue.length > 0 && (
        <div 
          className="glass-panel upload-manager-overlay" 
          style={{ 
            position: 'fixed', 
            bottom: '24px', 
            right: '24px', 
            width: isUploadMinimized ? 'auto' : '320px', 
            zIndex: 9999, 
            padding: isUploadMinimized ? '12px 20px' : '0', 
            borderRadius: '16px', 
            overflow: 'hidden',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 'calc(100vw - 48px)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)'
          }}
        >
           {/* Header / Summary Bar */}
           <div 
             onClick={() => setIsUploadMinimized(!isUploadMinimized)}
             style={{ 
               padding: '16px 20px', 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'space-between', 
               cursor: 'pointer',
               background: isUploadMinimized ? 'transparent' : 'rgba(255,255,255,0.03)',
               gap: '12px'
             }}
           >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 {isUploading ? <RefreshCw size={18} className="animate-spin" color="#3b82f6" /> : <Check size={18} color="#10b981" />}
                 <span style={{ fontSize: '0.9rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    {isUploading 
                      ? `${uploadQueue.filter(t => t.status === 'done').length}/${uploadQueue.length} Vault Nodes Ingested` 
                      : 'Vault Ingestion Certified'}
                 </span>
              </div>
              <ChevronDown size={18} style={{ transform: isUploadMinimized ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
           </div>

           {/* Detailed List */}
           {!isUploadMinimized && (
             <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '0 20px 20px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                   {uploadQueue.map(task => (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}>
                         <div style={{ flexShrink: 0 }}>
                            {task.status === 'pending' && <RefreshCw size={16} color="var(--text-muted)" opacity={0.5} />}
                            {task.status === 'encrypting' && <Fingerprint size={16} color="#f59e0b" className="animate-pulse" />}
                            {task.status === 'uploading' && <Globe size={16} color="#3b82f6" className="animate-spin" style={{ animationDuration: '3s' }} />}
                            {task.status === 'done' && <Check size={16} color="#10b981" />}
                            {task.status === 'error' && <X size={16} color="#ef4444" />}
                         </div>
                         <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.originalName}</p>
                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                               {task.status === 'encrypting' ? 'AES-GCM Entropy Mapping...' : task.status}
                            </p>
                         </div>
                         {task.status === 'done' && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setUploadQueue(prev => prev.filter(t => t.id !== task.id)) }}
                             style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                           >
                             <X size={14} />
                           </button>
                         )}
                      </div>
                   ))}
                </div>
                {uploadQueue.every(t => t.status === 'done' || t.status === 'error') && (
                   <button 
                     onClick={() => setUploadQueue([])}
                     style={{ width: '100%', marginTop: '16px', padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#fff', fontSize: '0.8rem', cursor: 'pointer' }}
                   >
                     Clear History
                   </button>
                )}
             </div>
           )}
        </div>
      )}

      </main>


      {pageLoading && <Loader message={loaderMessage} />}
    </div>
  );
};
export default Home;




