import React, { createContext, useContext, useState } from 'react';
import { ShieldAlert, Info, Folder, CheckCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const initialDialogState = {
    show: false,
    type: 'alert',
    title: '',
    message: '',
    inputValue: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false
  };

  const [dialog, setDialog] = useState(initialDialogState);
  const [toasts, setToasts] = useState([]);

  const showAlert = (title, message, onConfirm = null) => {
    setDialog({ ...initialDialogState, show: true, type: 'alert', title, message, onConfirm, confirmText: 'Understood' });
  };

  const showConfirm = (title, message, onConfirm, isDanger = false) => {
    setDialog({ ...initialDialogState, show: true, type: 'confirm', title, message, onConfirm, isDanger, confirmText: isDanger ? 'Delete' : 'Confirm' });
  };

  const showPrompt = (title, message, onConfirm, defaultValue = '') => {
    setDialog({ ...initialDialogState, show: true, type: 'prompt', title, message, onConfirm, inputValue: defaultValue });
  };

  const showToast = (type, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const closeDialog = () => setDialog(initialDialogState);

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt, showToast, closeDialog }}>
      {children}
      
      {/* 🧬 Professional Telemetry Toast Matrix 🛡️ */}
      <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 200000, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} className="glass-panel" style={{ padding: '12px 24px', borderRadius: '16px', border: `1px solid ${t.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`, background: 'rgba(15, 23, 42, 0.98)', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '12px', animation: 'slideInDown 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', pointerEvents: 'auto', minWidth: '300px', justifyContent: 'center' }}>
             {t.type === 'error' ? <ShieldAlert size={18} color="#ef4444" /> : <CheckCircle size={18} color="#10b981" />}
             <span style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.3px' }}>{t.message}</span>
          </div>
        ))}
      </div>
      {dialog.show && (
        <div className="dialog-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(10, 15, 28, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '420px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: dialog.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                {dialog.type === 'prompt' ? <Folder size={24} color="#3b82f6" /> : dialog.isDanger ? <ShieldAlert size={24} color="#ef4444" /> : <Info size={24} color="#3b82f6" />}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '12px' }}>{dialog.title || 'Confirm Action'}</h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>{dialog.message}</p>
            
            {dialog.type === 'prompt' && (
              <input 
                autoFocus
                className="input-field"
                style={{ marginBottom: '24px', width: '100%', background: 'rgba(255,255,255,0.05)' }}
                placeholder="Enter value..."
                value={dialog.inputValue}
                onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    dialog.onConfirm(dialog.inputValue);
                    closeDialog();
                  }
                }}
              />
            )}
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {dialog.type !== 'alert' && (
                <button onClick={closeDialog} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', fontWeight: '600' }}>{dialog.cancelText}</button>
              )}
              <button 
                onClick={() => {
                  if (dialog.type === 'prompt') dialog.onConfirm(dialog.inputValue);
                  else if (dialog.onConfirm) dialog.onConfirm();
                  else closeDialog();
                  closeDialog();
                }} 
                className="btn-primary" 
                style={{ background: dialog.isDanger ? 'var(--danger)' : 'var(--accent-primary)', border: 'none', width: 'auto', padding: '10px 24px', boxShadow: dialog.isDanger ? '0 10px 20px rgba(239, 68, 68, 0.2)' : '0 10px 20px rgba(59, 130, 246, 0.2)', borderRadius: '12px', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
