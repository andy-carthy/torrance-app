import React, { useState, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { MAPPING_SESSIONS, CANONICAL_OPTIONS } from '../../data/feeds/gl';
import { DataPrepModal } from '../modals/DataPrepModal';

export function AiDataMappingScreen({session, onBack, onComplete}) {
  const [rows, setRows] = useState(session.rows);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("confidence_desc");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [prepRow, setPrepRow] = useState<any>(null);
  
  // NEW: State for Bottleneck 1 Global Prompt
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);

  const acceptedCount  = rows.filter(r=>r.status==="accepted").length;
  const pendingCount   = rows.filter(r=>r.status==="pending").length;
  const reviewCount    = rows.filter(r=>r.status==="review").length;
  const unmappedCount  = rows.filter(r=>r.status==="unmapped").length;
  const ignoredCount   = rows.filter(r=>r.status==="ignored").length;
  const highConfPending= rows.filter(r=>r.status==="pending"&&r.confidence>=90).length;
  const avgConf = Math.round(rows.filter(r=>r.confidence>0).reduce((s,r)=>s+r.confidence,0)/(rows.filter(r=>r.confidence>0).length||1));

  const accept = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"accepted"}:r));
  const reject = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"unmapped", canonicalField:""}:r));
  const ignore = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"ignored"}:r));
  const restore = id => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"unmapped"}:r));
  const acceptAllHigh = () => setRows(prev=>prev.map(r=>r.status==="pending"&&r.confidence>=90?{...r,status:"accepted"}:r));

  // INTERCEPT SAVE: Check if we should prompt for Global Rules
  const handleSaveInitiate = () => {
    const newlyMapped = rows.some(r => r.status === "accepted" && r.canonicalField !== "");
    if (newlyMapped) {
      setShowGlobalPrompt(true);
    } else {
      executeSave();
    }
  };

  const executeSave = () => {
    setShowGlobalPrompt(false);
    setSaving(true); 
    setTimeout(()=>{ 
      setSaving(false); 
      setSaved(true); 
      setTimeout(() => onComplete(session.feedId), 600);
    }, 1200); 
  };

  const handleFieldChange = (id, newFieldVal) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (newFieldVal === "") return { ...r, canonicalField: "", status: "unmapped" };
      return { ...r, canonicalField: newFieldVal, status: "accepted" }; 
    }));
  };

  const handleApplyPrepRule = (id, rule) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const existingRules = r.prepRules || [];
      return { ...r, prepRules: [...existingRules, rule], status: "review" };
    }));
    setPrepRow(null);
  };

  const confirmMapping = (id) => setRows(prev=>prev.map(r=>r.id===id?{...r,status:"accepted"}:r));

  const filtered = useMemo(()=>{
    let result = [...rows];
    if (statusFilter !== "All") result = result.filter(r => r.status === statusFilter);
    if (search.trim()) {
      const q=search.toLowerCase();
      result = result.filter(r=>r.sourceCol.toLowerCase().includes(q)||(r.canonicalField||"").toLowerCase().includes(q)||(r.canonicalLabel||"").toLowerCase().includes(q)||r.sampleValue.toLowerCase().includes(q));
    }
    result.sort((a,b) => {
      if (sortBy === "confidence_desc") return (b.confidence||0) - (a.confidence||0);
      if (sortBy === "confidence_asc") return (a.confidence||0) - (b.confidence||0);
      if (sortBy === "source") return a.sourceCol.localeCompare(b.sourceCol);
      return 0;
    });
    return result;
  },[rows, search, statusFilter, sortBy]);

  const STATUS_CFG = {
    accepted:{color:T.okBase,   bg:T.okBg,   border:T.okBorder,   label:"Accepted",    icon:"✓"},
    pending: {color:T.warnBase, bg:T.warnBg, border:T.warnBorder, label:"Pending",     icon:"⏳"},
    review:  {color:T.errorBase,bg:T.errorBg,border:T.errorBorder,label:"Review",      icon:"⚠"},
    unmapped:{color:T.textMuted,bg:T.appBg,  border:T.border,     label:"Unmapped",    icon:"×"},
    ignored: {color:T.textMuted,bg:"#f3f4f6",border:"#d1d5db",    label:"Ignored",     icon:"∅"},
  };

  const ConfBar = ({pct}) => {
    const c = pct>=90?T.okBase:pct>=70?T.warnBase:T.errorBase;
    return <div style={{display:"flex",alignItems:"center",gap:6,minWidth:80}}>
      <div style={{flex:1,height:5,background:T.border,borderRadius:2,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${pct}%`,background:c,borderRadius:2}}/>
      </div>
      <span style={{...MONO,fontSize:10,fontWeight:700,color:c,minWidth:30,textAlign:"right"}}>{pct}%</span>
    </div>;
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:T.appBg,...SANS}}>
      
      {/* BOTTLENECK 1: GLOBAL PROMPT MODAL */}
      {showGlobalPrompt && (
        <div className="modal-overlay" style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="slide-in" style={{background:T.cardBg, borderRadius:12, width:600, overflow:"hidden", boxShadow:"0 25px 50px -12px rgba(0,0,0,0.5)"}}>
            <div style={{background:T.aiBg, borderBottom:`1px solid ${T.aiBorder}`, padding:"20px 24px", display:"flex", alignItems:"flex-start", gap:16}}>
              <div style={{fontSize:28}}>🌍</div>
              <div>
                <div style={{...SANS, fontSize:18, fontWeight:700, color:T.aiDark}}>Global Schema Rule Detected</div>
                <div style={{...SANS, fontSize:13, color:T.textPrimary, marginTop:6, lineHeight:1.5}}>
                  You have successfully mapped <strong style={{color:T.actionBase}}>{acceptedCount} fields</strong> for the State Street GL feed. 
                  Torrance has identified <strong>49 other pending feeds</strong> from this custodian that share identical column structures.
                </div>
              </div>
            </div>
            <div style={{padding:"24px", background:T.appBg}}>
              <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:12}}>Detected Rules</div>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                {rows.filter(r=>r.status==="accepted").slice(0,3).map(r => (
                  <div key={r.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:6}}>
                    <span style={{...MONO, fontSize:11, color:T.textPrimary}}>{r.sourceCol}</span>
                    <span style={{color:T.textMuted}}>→</span>
                    <span style={{...MONO, fontSize:11, color:T.okBase, fontWeight:600}}>{r.canonicalField}</span>
                  </div>
                ))}
                {acceptedCount > 3 && <div style={{...SANS, fontSize:11, color:T.textMuted, textAlign:"center", marginTop:4}}>+ {acceptedCount - 3} additional fields</div>}
              </div>
            </div>
            <div style={{padding:"16px 24px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"flex-end", gap:12, background:T.cardBg}}>
              <button onClick={executeSave} style={{...SANS, fontSize:13, fontWeight:600, padding:"8px 16px", borderRadius:6, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer"}}>Skip & Save Only This Fund</button>
              <button onClick={executeSave} style={{...SANS, fontSize:13, fontWeight:700, padding:"8px 20px", borderRadius:6, border:"none", background:T.actionBase, color:"#fff", cursor:"pointer", boxShadow:"0 2px 4px rgba(79,70,229,0.2)"}}>Apply Rules Globally</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{background:T.navyHeader,padding:"13px 24px",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <button onClick={onBack} style={{...SANS,background:"transparent",border:"1px solid #374151",color:"#8898aa",borderRadius:6,padding:"6px 13px",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>← Back</button>
          <div>
            <div style={{...SANS,fontWeight:700,fontSize:14,color:"#fff",display:"flex",alignItems:"center",gap:8}}>
              <span>✦</span>AI Schema Mapping & Data Prep
            </div>
            <div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>{session.fileName} · {session.fundName}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {saved&&<span style={{...SANS,fontSize:12,color:"#34d399",fontWeight:600,display:"flex",alignItems:"center",gap:5}}><span>✓</span>Processing…</span>}
          {highConfPending>0&&(
            <button onClick={acceptAllHigh} style={{...SANS,fontSize:12,fontWeight:700,padding:"6px 14px",borderRadius:6,border:`1px solid ${T.aiBase}`,background:T.aiBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              <span>✦</span>Accept All High-Confidence ({highConfPending})
            </button>
          )}
          <button onClick={handleSaveInitiate} disabled={saving||saved} style={{...SANS,fontSize:12,fontWeight:700,padding:"8px 16px",borderRadius:6,border:"none",background:(saving||saved)?"#374151":T.okBase,color:(saving||saved)?"#6b7280":"#fff",cursor:(saving||saved)?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6}}>
            {saving?<><span style={{animation:"pulse 0.8s infinite"}}>●</span>Saving…</>:<><span>↓</span>Save & Process Feed</>}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{display:"flex",gap:10,padding:"12px 24px",background:T.cardBg,borderBottom:`1px solid ${T.border}`,flexShrink:0,flexWrap:"wrap"}}>
        {[
          {label:"Total Fields",   val:rows.length,     color:T.textPrimary},
          {label:"Accepted",       val:acceptedCount,   color:T.okBase},
          {label:"Pending",        val:pendingCount,    color:T.warnBase},
          {label:"Needs Review",   val:reviewCount,     color:T.errorBase},
          {label:"Unmapped",       val:unmappedCount,   color:T.textMuted},
          {label:"Ignored",        val:ignoredCount,    color:T.textMuted},
          {label:"Avg Confidence", val:`${avgConf}%`,   color:avgConf>=90?T.okBase:T.warnBase},
        ].map((k,i)=>(
          <div key={i} style={{background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 14px",minWidth:90}}>
            <div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{k.label}</div>
            <div style={{...MONO,fontSize:16,fontWeight:700,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Grid Toolbar */}
      <div style={{padding:"10px 24px",background:T.appBg,borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{position:"relative",flex:1,maxWidth:320}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
          <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search source or canonical fields…" style={{...SANS,width:"100%",fontSize:12,padding:"7px 12px 7px 32px",border:`1px solid ${T.border}`,borderRadius:6,background:T.cardBg,color:T.textPrimary,outline:"none"}}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none", cursor:"pointer"}}>
          <option value="All">All Statuses</option>
          <option value="accepted">Accepted</option>
          <option value="pending">Pending</option>
          <option value="review">Needs Review</option>
          <option value="unmapped">Unmapped</option>
          <option value="ignored">Ignored</option>
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none", cursor:"pointer"}}>
          <option value="confidence_desc">Sort: Highest Confidence</option>
          <option value="confidence_asc">Sort: Lowest Confidence</option>
          <option value="source">Sort: Source Column (A-Z)</option>
        </select>
        <span style={{...SANS,fontSize:12,color:T.textMuted, marginLeft:"auto"}}>{filtered.length} of {rows.length} fields shown</span>
      </div>

      {/* Column headers (Updated Grid Layout to accommodate Data Prep) */}
      <div style={{display:"grid",gridTemplateColumns:"1.4fr 28px 1.5fr 100px 70px 100px 200px",gap:0,background:"#f0f2f5",borderBottom:`2px solid ${T.border}`,padding:"8px 24px",flexShrink:0}}>
        {["Source Column / Prep Rules","","Torrance Canonical Field","AI Confidence","Required","Status","Actions"].map((h,i)=>(
          <div key={i} style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",textAlign:i>=3?"center":"left", paddingLeft:i===6?16:0}}>{h}</div>
        ))}
      </div>

      {/* Mapping rows */}
      <div style={{flex:1,overflowY:"auto"}}>
        {filtered.map((m)=>{
          const cfg = STATUS_CFG[m.status]||STATUS_CFG.pending;
          const isIgnored = m.status === "ignored";
          return (
            <div key={m.id} className="map-row" style={{
              display:"grid",gridTemplateColumns:"1.4fr 28px 1.5fr 100px 70px 100px 200px",
              padding:"11px 24px",borderBottom:`1px solid ${T.border}`,
              background:m.status==="review"?T.errorBg:m.status==="accepted"?"#fafffe":isIgnored?"#f9fafb":T.cardBg,
              alignItems:"center", opacity:isIgnored?0.6:1
            }}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
                  {m.isComputed ? (
                    <span style={{...MONO,fontSize:12,fontWeight:700,color:T.actionBase,display:"flex",alignItems:"center",gap:6, background:T.actionBg, padding:"2px 8px", borderRadius:4, border:`1px solid #bfdbfe`, opacity:isIgnored?0.6:1}}>
                      <span style={{fontStyle:"italic", opacity:0.8}}>ƒ(x)</span> <span style={{textDecoration:isIgnored?"line-through":"none"}}>{m.sourceCol}</span>
                    </span>
                  ) : (
                    <span style={{...MONO,fontSize:12,fontWeight:700,color:T.textPrimary,textDecoration:isIgnored?"line-through":"none"}}>{m.sourceCol}</span>
                  )}
                  <span style={{...MONO,fontSize:9,padding:"1px 5px",borderRadius:3,background:T.appBg,color:T.textMuted,border:`1px solid ${T.border}`}}>{m.sourceType}</span>
                </div>
                <div style={{...MONO,fontSize:10,color:T.textMuted,maxWidth:280,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom: m.prepRules?.length ? 6 : 0}}>sample: {m.sampleValue}</div>
                
                {/* Render active Data Prep Rules */}
                {m.prepRules?.length > 0 && (
                  <div style={{display:"flex", flexWrap:"wrap", gap:4, marginTop:4}}>
                    {m.prepRules.map((rule, idx) => (
                      <span key={idx} style={{...SANS, fontSize:9, fontWeight:600, padding:"2px 6px", borderRadius:4, background:"#f1f5f9", color:"#475569", border:"1px solid #cbd5e1", display:"flex", alignItems:"center", gap:4}}>
                        <span style={{color:"#64748b"}}>🛠</span> {rule.desc}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{textAlign:"center",color:m.status==="accepted"?T.okBase:T.border,fontSize:18,fontWeight:700}}>→</div>
              
              <div style={{paddingRight:24}}>
                <select disabled={isIgnored} value={m.canonicalField || ""} onChange={(e) => handleFieldChange(m.id, e.target.value)}
                  style={{...SANS, width:"100%", padding:"6px 8px", borderRadius:5, border:`1px solid ${T.border}`, background:(m.status==="unmapped"||isIgnored)?T.appBg:"#fff", fontSize:12, fontWeight:600, color:T.textPrimary, cursor:isIgnored?"not-allowed":"pointer", marginBottom:4}}>
                  {CANONICAL_OPTIONS.map(opt => <option key={opt.val} value={opt.val}>{opt.label}</option>)}
                </select>
                {m.learnedFrom === "human" ? (
                  <div style={{...SANS, fontSize:10, color:T.actionBase, display:"flex", alignItems:"center", gap:4}}><span>👤</span>{m.aiReason}</div>
                ) : (
                  <div style={{...SANS, fontSize:10, color:T.textMuted, lineHeight:1.3, fontStyle:m.canonicalField?"normal":"italic"}}>{m.aiReason}</div>
                )}
              </div>

              <div style={{paddingLeft:4}}>
                {m.confidence>0?<ConfBar pct={m.confidence}/>:<span style={{...SANS,fontSize:11,color:T.textMuted, textAlign:"center", display:"block"}}>—</span>}
              </div>
              <div style={{textAlign:"center"}}>
                {m.required
                  ?<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.errorBg,color:T.errorBase,border:`1px solid ${T.errorBorder}`}}>Required</span>
                  :<span style={{...SANS,fontSize:10,color:T.textMuted}}>Optional</span>}
              </div>
              
              <div style={{textAlign:"center"}}>
                <span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                  <span>{cfg.icon}</span>{cfg.label}
                </span>
              </div>

              {/* Action Buttons including Data Prep Trigger */}
              <div style={{display:"flex", gap:6, flexWrap:"wrap", justifyContent:"center", paddingLeft:16}}>
                {!isIgnored && (
                  <button onClick={()=>setPrepRow(m)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 8px",borderRadius:4,border:`1px solid #cbd5e1`,background:"#f8fafc",color:"#475569",cursor:"pointer", display:"flex", alignItems:"center", gap:4, transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>
                    <span style={{fontSize:11}}>🛠</span> Prep
                  </button>
                )}
                {m.status !== "accepted" && m.status !== "ignored" && (
                  <button onClick={()=>confirmMapping(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.okBase}`,background:T.okBg,color:T.okBase,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Accept</button>
                )}
                {m.status === "accepted" && (
                  <button onClick={()=>reject(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Reject</button>
                )}
                {m.status !== "ignored" && (
                  <button onClick={()=>ignore(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textMuted,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Ignore</button>
                )}
                {m.status === "ignored" && (
                  <button onClick={()=>restore(m.id)} style={{...SANS,fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:4,border:`1px solid ${T.border}`,background:T.cardBg,color:T.textPrimary,cursor:"pointer", transition:"filter 0.15s"}} onMouseEnter={e=>e.currentTarget.style.filter="brightness(0.95)"} onMouseLeave={e=>e.currentTarget.style.filter="none"}>Restore</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Render the Data Prep Modal if a row is selected */}
      {prepRow && (
        <DataPrepModal 
          row={prepRow} 
          columns={rows.map(r=>r.sourceCol)} 
          onClose={()=>setPrepRow(null)} 
          onApply={(rule) => handleApplyPrepRule(prepRow.id, rule)} 
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEW: GLOBAL ENTITY MANAGER (Master Data Setup)
// ═══════════════════════════════════════════════════════════════════════════════
