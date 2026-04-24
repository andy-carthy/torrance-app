import React, { useState, useEffect, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { FilingPreviewModal } from '../modals/FilingPreviewModal';
import type { Filing } from '../../types';

export function BeverleyFilingTracker({ filings, onGoToDashboard }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_asc");
  const [hideFiled, setHideFiled] = useState(true);
  const [period, setPeriod] = useState("Dec 31, 2024");
  
  const [localFilings, setLocalFilings] = useState(filings);
  const [activeFiling, setActiveFiling] = useState(null);
  const [collapsedForms, setCollapsedForms] = useState({});
  const [batchState, setBatchState] = useState(null);

  // NEW: Synchronize local state with upstream STP engine unblocking actions
  useEffect(() => {
    setLocalFilings(filings);
  }, [filings]);

  const PERIODS = ["Dec 31, 2024", "Nov 30, 2024"];
  const KANBAN_COLS = [
    { id: "not_started", label: "Not Started", color: T.textMuted, bg: T.appBg, bd: T.border },
    { id: "blocked",     label: "Blocked",     color: T.errorBase, bg: T.errorBg, bd: T.errorBorder },
    { id: "ready",       label: "Ready",       color: T.okBase,    bg: T.okBg,    bd: T.okBorder },
    { id: "filed",       label: "Filed",       color: T.textMuted, bg: T.appBg,   bd: T.border, dashed: true }
  ];
  const activeCols = hideFiled ? KANBAN_COLS.filter(c => c.id !== "filed") : KANBAN_COLS;

  const groupedData = useMemo(() => {
    let activeRows = localFilings.filter(f => f.period === period);
    if (search.trim()) {
      const q = search.toLowerCase();
      activeRows = activeRows.filter(f => f.fund.toLowerCase().includes(q) || f.client.toLowerCase().includes(q) || f.form.toLowerCase().includes(q));
    }
    if (filter !== "all") activeRows = activeRows.filter(f => f.status === filter);
    activeRows.sort((a,b) => {
      if (sortBy === "due_asc") return a.daysLeft - b.daysLeft;
      if (sortBy === "fund_asc") return a.fund.localeCompare(b.fund);
      return 0;
    });

    const groups: Record<string, Record<string, any>> = {};
    activeRows.forEach(f => {
      if (!groups[f.form]) groups[f.form] = {};
      if (!groups[f.form][f.client]) groups[f.form][f.client] = { not_started: [], blocked: [], ready: [], filed: [] };
      groups[f.form][f.client][f.status].push(f);
    });
    return groups;
  }, [localFilings, search, filter, period, sortBy]);

  const handleMarkFiled = (id) => {
    setLocalFilings(prev => prev.map(f => f.id === id ? { ...f, status: "filed", notes: "SEC EDGAR Confirmed." } : f));
  };

  const handleBatchAction = (action) => {
    setBatchState(action);
    setTimeout(() => {
      if (action === "transmit") {
        setLocalFilings(prev => prev.map(f => f.status === "ready" ? { ...f, status: "filed", notes: "Batch SEC Transmit Success" } : f));
      }
      setBatchState(null);
    }, 2000);
  };

  const periodFilings = localFilings.filter(f => f.period === period);
  const total = periodFilings.length;
  const readyCount = periodFilings.filter(f => f.status === "ready").length;
  const completed = periodFilings.filter(f => f.status === "filed").length;
  const activeCount = total - completed;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 100;

  if (total > 0 && activeCount === 0 && !search && hideFiled) {
    return (
      <div className="fade-in" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"calc(100vh - 52px)", background:T.appBg}}>
        <div style={{fontSize: 72, marginBottom: 16, animation: "slideUp 0.6s ease forwards"}}>🏆</div>
        <div style={{...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8}}>All Filings Transmitted!</div>
        <div style={{...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 450, textAlign: "center", lineHeight:1.5}}>
          Outstanding work. All <strong>{total}</strong> regulatory filings for {period} have been successfully validated and transmitted to the SEC.
        </div>
        <div style={{display:"flex", gap:12}}>
          <button onClick={onGoToDashboard} className="glow-btn" style={{...SANS, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 6, border: "none", background: T.actionBase, color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:8}}>
            ← Return to Dashboard
          </button>
          <button onClick={()=>setHideFiled(false)} style={{...SANS, fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 6, border:`1px solid ${T.border}`, background: T.cardBg, color: T.textPrimary, cursor: "pointer"}}>
            Review Filed Returns
          </button>
        </div>

      </div>
    );
  }

  return (
    
    <div style={{display:"flex", flexDirection:"column", background:T.appBg, height:"calc(100vh - 52px)", overflow:"hidden"}}>
      <div style={{padding:"12px 24px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, flexShrink:0}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap", marginBottom:12}}>
          <div style={{display:"flex", alignItems:"center", gap:12}}>
            <div style={{...SANS,fontWeight:700,fontSize:18, color:T.textPrimary, display:"flex", alignItems:"center", gap:10}}>
              Beverley Filing Workflow <span style={{color:T.textMuted, fontSize:16, fontWeight:400}}>|</span>
              <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...SANS, fontSize:16, fontWeight:700, color:T.actionBase, background:"transparent", border:"none", outline:"none", cursor:"pointer", appearance:"none", paddingRight:16, backgroundImage:"url('data:image/svg+xml;utf8,<svg fill=%22%234a7cff%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat:"no-repeat", backgroundPosition:"right center"}}>
                {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:12, flex:1, justifyContent:"flex-end"}}>
            <button onClick={()=>handleBatchAction("validate")} disabled={!!batchState} style={{...SANS, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:6, border:`1px solid ${T.aiBase}`, background:T.aiBg, color:T.aiBase, cursor:"pointer", display:"flex", alignItems:"center", gap:6}}>
              {batchState === "validate" ? "Scanning..." : "✦ Batch AI Validate"}
            </button>
            <button onClick={()=>handleBatchAction("transmit")} disabled={!!batchState || readyCount === 0} style={{...SANS, fontSize:12, fontWeight:700, padding:"6px 14px", borderRadius:6, border:"none", background: readyCount > 0 ? T.okBase : T.border, color:"#fff", cursor: readyCount > 0 ? "pointer" : "not-allowed", display:"flex", alignItems:"center", gap:6}}>
              {batchState === "transmit" ? "Transmitting..." : `📤 Transmit All Ready (${readyCount})`}
            </button>
          </div>
        </div>
          {/* ─── SPRINT 4: Regulatory Change Detector (C-15) ─── */}
          <div className="slide-in" style={{background: "#fff", border: `1px solid ${T.border}`, borderRadius: 8, padding: "16px", marginBottom: 24, display: "flex", alignItems: "flex-start", gap: 16}}>
          <div style={{fontSize: 24}}>🏛</div>
          <div style={{flex: 1}}>
            <div style={{...SANS, fontSize: 14, fontWeight: 700, color: T.textPrimary, marginBottom: 4}}>SEC EDGAR Change Detected: Form N-PORT</div>
            <div style={{...SANS, fontSize: 12, color: T.textMuted, lineHeight: 1.5}}>
              SEC amended Part C reporting for derivatives — effective March 31, 2025. <br/>
              <strong>Impact:</strong> 3 of your filing templates require mapping updates. Torrance AI has generated draft mapping proposals.
            </div>
          </div>
          <button style={{...SANS, fontSize: 12, fontWeight: 600, background: T.warnBg, color: T.warnBase, border: `1px solid ${T.warnBorder}`, padding: "6px 12px", borderRadius: 4, cursor: "pointer"}}>
            Review AI Proposals
          </button>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"center"}}>
          <div style={{position:"relative", minWidth: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search forms, funds, or clients..." style={{...SANS, width:"100%", padding:"8px 12px 8px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, outline:"none"}}/>
          </div>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"8px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="due_asc">Sort: Urgent (Due Soon)</option>
            <option value="fund_asc">Sort: Fund Name (A-Z)</option>
          </select>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginLeft:4}}>
            <input type="checkbox" checked={hideFiled} onChange={e=>setHideFiled(e.target.checked)} style={{accentColor:T.actionBase}}/>
            <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Hide Completed</span>
          </label>
          {total > 0 && (
            <div style={{display:"flex", alignItems:"center", gap:10, minWidth:250, marginLeft:"auto"}}>
              <div style={{...SANS, fontSize:11, fontWeight:700, color:T.textMuted, whiteSpace:"nowrap"}}>
                <span style={{color:T.actionBase}}>{activeCount}</span> REMAINING
              </div>
              <div style={{flex:1, height:6, background:T.border, borderRadius:3, overflow:"hidden"}}>
                <div style={{height:"100%", width:`${progressPct}%`, background:progressPct===100?T.okBase:T.actionBase, transition:"width 0.5s ease"}}/>
              </div>
              <div style={{...MONO, fontSize:11, fontWeight:700, color:progressPct===100?T.okBase:T.textPrimary}}>{progressPct}%</div>
            </div>
          )}
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"20px 24px"}}>
        {Object.entries(groupedData).map(([form, clients]) => (
          <div key={form} style={{marginBottom:24, background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, overflow:"hidden"}}>
            <div onClick={()=>setCollapsedForms(p=>({...p, [form]:!p[form]}))} style={{background:T.navyHeader, padding:"10px 16px", display:"flex", alignItems:"center", gap:8, cursor:"pointer", color:"#fff", ...SANS, fontWeight:700}}>
              {collapsedForms[form] ? "▶" : "▼"} {form} Filings
            </div>

            {!collapsedForms[form] && Object.entries(clients).map(([client, statuses]) => (
              <div key={client} style={{padding:"16px 20px", background:T.appBg, borderTop:`1px solid ${T.border}`}}>
                <div style={{...SANS, fontSize:13, fontWeight:700, color:T.textPrimary, marginBottom:14}}>{client}</div>
                <div style={{display:"grid", gridTemplateColumns:`repeat(${activeCols.length}, 1fr)`, gap:14}}>
                  {activeCols.map(col => (
                    <div key={col.id} style={{background:col.bg, border:`1px solid ${col.bd}`, borderRadius:8, padding:"10px", minHeight:90}}>
                      <div style={{...SANS, fontSize:11, fontWeight:700, color:col.color, textTransform:"uppercase", marginBottom:10}}>{col.label}</div>
                      <div style={{display:"flex", flexDirection:"column", gap:8}}>
                        {statuses[col.id].map(f => (
                          <div key={f.id} onClick={() => f.status !== "filed" && setActiveFiling(f)} style={{background:T.cardBg, border:`1px solid ${T.border}`, borderLeft:`4px solid ${col.color}`, borderRadius:8, padding:"10px 12px", cursor:f.status!=="filed"?"pointer":"default"}}>
                            <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", marginBottom:4}}>{f.fund}</div>
                            {(f.form === "N-PORT" || f.form === "N-CEN") && f.status === "blocked" && (
                              <div style={{...MONO, fontSize:9, fontWeight:700, color:T.textMuted, background:"#f1f5f9", padding:"2px 6px", borderRadius:4, marginBottom:4, display:"inline-block"}}>DEPENDENCY: GAAP UNAPPROVED</div>
                            )}
                            <div style={{...MONO, fontSize:10, fontWeight:700, color:T.textMuted}}>
                              {f.status==="filed" ? "SEC CONFIRMED" : `DUE: ${f.daysLeft}d`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {activeFiling && <FilingPreviewModal filing={activeFiling} onClose={()=>setActiveFiling(null)} onFile={handleMarkFiled} />}
    </div>
  );
}

