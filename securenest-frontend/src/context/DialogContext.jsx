import React, { createContext, useContext, useState } from 'react';
import { ShieldAlert, Info, Folder, CheckCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export const DialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState({
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
  });

  const showAlert = (title, message) => {
    setDialog({ show: true, type: 'alert', title, message, confirmText: 'Understood' });
  };

  const showConfirm = (title, message, onConfirm, isDanger = false) => {
    setDialog({ show: true, type: 'confirm', title, message, onConfirm, isDanger, confirmText: isDanger ? 'Delete' : 'Confirm' });
  };

  const showPrompt = (title, message, onConfirm, defaultValue = '') => {
    setDialog({ show: true, type: 'prompt', title, message, onConfirm, inputValue: defaultValue, confirmText: 'Confirm' });
  };

  const closeDialog = () => setDialog(prev => ({ ...prev, show: false }));

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt, closeDialog }}>
      {children}
      {dialog.show && (
        <div className="dialog-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(10, 15, 28, 0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '420px', padding: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: dialog.isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                {dialog.type === 'prompt' ? <Folder size={24} color="#3b82f6" /> : dialog.isDanger ? <ShieldAlert size={24} color="#ef4444" /> : <Info size={24} color="#3b82f6" />}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#fff' }}>{dialog.title}</h3>
            </div>
            
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '24px' }}>{dialog.message}</p>
            
            {dialog.type === 'prompt' && (
              <input 
                autoFocus
                className="input-field"
                style={{ marginBottom: '24px', width: '100%', background: 'rgba(255,255,255,0.05)' }}
                placeholder="Enter value..."
                value={dialog.inputValue}
                onChange={(e) => setDialog({...dialog, inputValue: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && dialog.onConfirm(dialog.inputValue)}
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
