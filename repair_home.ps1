$path = "c:\Users\imand\OneDrive\Desktop\SecureNest\securenest-frontend\src\pages\Dashboard\Home.jsx"
$content = Get-Content -Path $path -Raw

# 1. Identify the broken grid view mapping block
$oldChunk = @'
                                 ) : file.mimeType.startsWith('video/') ? (
                   </div>
                 )}
'@

$newChunk = @'
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
                                   <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{file.isFolder ? 'Directory' : `${(file.fileSize / 1024 / 1024).toFixed(2)} MB`} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                 </>
                              )}
                              
                               {/* Action Overlay */}
                               <div className="card-actions-overlay" style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', opacity: activeMenu === file._id ? 1 : 0, transition: 'opacity 0.2s', zIndex: 10 }}>
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
'@

# Execute the repair
$content = $content.Replace($oldChunk, $newChunk)

# 2. Fix global bullet artifacts if they exist
$content = $content.Replace("Ã¢â‚¬Â¢", "•")

Set-Content -Path $path -Value $content -Encoding utf8
