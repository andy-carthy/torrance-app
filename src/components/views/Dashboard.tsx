import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { FUNDS_SEED } from '../../data/funds';
import { Avatar } from '../primitives/Avatar';
import { SlaPill, ApprovalPill } from '../primitives/Pills';
import { WorkflowProgress } from '../layout/WorkflowProgress';
import { GlobalExceptionsModal } from './GlobalExceptionsModal';
import { TouchlessFlowDashboard } from '../ai/TouchlessFlowDashboard';
import { BulkFundActionBar } from './BulkFundActionBar';
import { NaturalLanguageQuery } from './NaturalLanguageQuery';
import { InboxView } from './InboxView';
import { TeamCapacityView } from './TeamCapacityView';
import { TemplateConfigScreen } from './TemplateConfigScreen';
import { ClientPortal } from './ClientPortal';
import { AuditorPortal } from './AuditorPortal';
import { Soc1AuditReport } from '../modals/Soc1AuditReport';
import { fmtCompact } from '../../utils/formatters';
import type { FundSeed, Exception, ApprovalRecord, TeamMember } from '../../types';

export function Dashboard({onBulkSubmitForReview,dashSubView, fundState, fundSeeds, approvalState, currentUser, notifications, onSelectFund, onReassign, onViewClientExceptions, onBulkApprove, onGlobalResolve, onGoToAudit, onRunDemo, isDemoRunning, demoKey, showGlobalExcs, setShowGlobalExcs, onSingleResolve, onSelectFundFromGlobal}) {
  const [dashView,setDashView]=useState(currentUser?.isController ? "flow":"client");
  const [layoutStyle,setLayoutStyle]=useState("list");
  const [collapsed,setCollapsed]=useState({});
  const [hideEmpty, setHideEmpty] = useState(false);

  useEffect(() => {
    if (dashSubView) setDashView(dashSubView);
    else setDashView(currentUser?.isController ? "flow" : "client");
  }, [dashSubView, currentUser]);

  const [showTemplates,setShowTemplates]=useState(false);
  const [showAuditorPortal,setShowAuditorPortal]=useState(false);
  const [showClientPortal, setShowClientPortal] = useState(false);
  const [showSoc1, setShowSoc1] = useState(false);

  const [period, setPeriod] = useState("Dec 2024");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stageFilter, setStageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("sla_asc");
  const [selectedFunds, setSelectedFunds] = useState(new Set());
  
  const getStats = useCallback(fund => {
    const excs=fundState[fund.fund_id]||[];
    return {
      total:excs.length,
      resolved:excs.filter(e=>e.status==="resolved").length,
      errors:excs.filter(e=>e.severity==="error"&&e.status==="open").length,
      warnings:excs.filter(e=>e.severity==="warning"&&e.status==="open").length,
      status:excs.filter(e=>e.severity==="error"&&e.status==="open").length===0?"READY":"BLOCKED"
    };
  }, [fundState]);

  const toggleFundSelection = (e, fundId) => { e.stopPropagation(); setSelectedFunds(prev => { const next = new Set(prev); next.has(fundId) ? next.delete(fundId) : next.add(fundId); return next; }); };
  const toggleClientSelection = (e, clientFunds) => { e.stopPropagation(); const allSelected = clientFunds.every(f => selectedFunds.has(f.fund_id)); setSelectedFunds(prev => { const next = new Set(prev); clientFunds.forEach(f => allSelected ? next.delete(f.fund_id) : next.add(f.fund_id)); return next; }); };

  const filteredAndSortedFunds = useMemo(() => {
    let result = [...fundSeeds];
    if (search.trim()) { const q = search.toLowerCase(); result = result.filter(f => f.name.toLowerCase().includes(q) || f.fund_id.toLowerCase().includes(q) || f.client.toLowerCase().includes(q)); }
    if (statusFilter !== "All") result = result.filter(f => getStats(f).status === statusFilter);
    if (stageFilter !== "All") result = result.filter(f => (approvalState[f.fund_id]?.status || "open") === stageFilter);
    if (hideEmpty) result = result.filter(f => getStats(f).total > 0); // Focus mode filter
    
    result.sort((a, b) => {
      if (sortBy === "sla_asc") return a.sla_days - b.sla_days;
      if (sortBy === "sla_desc") return b.sla_days - a.sla_days;
      if (sortBy === "exceptions_desc") return (getStats(b).errors + getStats(b).warnings) - (getStats(a).errors + getStats(a).warnings);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      return 0;
    });
    return result;
  }, [fundSeeds, search, statusFilter, stageFilter, sortBy, hideEmpty, getStats, approvalState]);

  const grouped = useMemo(()=>{
    const g: Record<string, FundSeed[]> = {};
    filteredAndSortedFunds.forEach(f=>{
      if(!g[f.client])g[f.client]=[];
      g[f.client].push(f);
    });
    return g;
  }, [filteredAndSortedFunds]);
  
  const totalFunds = fundSeeds.length;
  const blockedFunds = fundSeeds.filter(f=>getStats(f).status==="BLOCKED").length;
  const readyFunds = fundSeeds.filter(f=>getStats(f).status==="READY").length;
  const reviewFunds = Object.values(approvalState).filter((a: any)=>a.status==="review_pending").length;
  const approvedFunds = Object.values(approvalState).filter((a: any)=>a.status==="approved").length;
  
  return <div style={{padding:"20px 24px", paddingBottom: selectedFunds.size > 0 ? 80 : 20}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:16}}>
      <div>
        <div style={{...SANS,fontWeight:700,fontSize:18,color:T.textPrimary, display:"flex", alignItems:"center", gap:10}}>
          Fund Dashboard 
          <span style={{color:T.textMuted, fontSize:16, fontWeight:400}}>|</span>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{...SANS, fontSize:16, fontWeight:700, color:T.actionBase, background:"transparent", border:"none", outline:"none", cursor:"pointer", appearance:"none", paddingRight:16, backgroundImage:"url('data:image/svg+xml;utf8,<svg fill=%22%234a7cff%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>')", backgroundRepeat:"no-repeat", backgroundPosition:"right center"}}>
            <option value="Dec 2024">December 2024</option>
            <option value="Nov 2024">November 2024</option>
          </select>
        </div>
      </div>
{/** TODO: Make {val:"flow",label:"Autonomous Flow"}, default for Controler logim, Remove view from preparer  */}
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
 
      <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:3,gap:2}}>
          {/* NEW: Conditionally render Autonomous Flow for Controllers only */}
          {[
            ...(currentUser?.isController ? [{val:"flow",label:"Autonomous Flow"}] : []),
            {val:"client",label:"Funds"},
            {val:"inbox",label:"Inbox"}
          ].map(v=> (
            <button key={v.val} onClick={()=>setDashView(v.val)} style={{...SANS,fontSize:12,fontWeight:600,padding:"5px 12px",borderRadius:5,border:"none",background:dashView===v.val?T.cardBg:T.appBg,color:dashView===v.val?T.textPrimary:T.textMuted,cursor:"pointer",boxShadow:dashView===v.val?"0 1px 3px rgba(0,0,0,0.1)":"none",transition:"all 0.1s", display:"flex", alignItems:"center", gap:6}}>
              {v.label}
              {v.val === "inbox" && notifications.length > 0 && (
                <span style={{background:T.errorBase, color:"#fff", fontSize:10, padding:"1px 6px", borderRadius:10}}>{notifications.length}</span>
              )}
            </button>
          ))}
        </div>
      {/* {dashView === "client" && (
          <div style={{display:"flex",background:T.appBg,border:`1px solid ${T.border}`,borderRadius:7,padding:3,gap:2, marginLeft:12}}>
            <button onClick={()=>setLayoutStyle("list")} title="List View" style={{...SANS, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, background:layoutStyle==="list"?T.cardBg:"transparent", color:layoutStyle==="list"?T.textPrimary:T.textMuted, border:"none", borderRadius:5, padding:"5px 10px", cursor:"pointer", boxShadow:layoutStyle==="list"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}><span style={{fontSize:14, opacity:layoutStyle==="list"?1:0.5}}>≡</span> List</button>
            <button onClick={()=>setLayoutStyle("grid")} title="Grid View" style={{...SANS, fontSize:12, fontWeight:600, display:"flex", alignItems:"center", gap:5, background:layoutStyle==="grid"?T.cardBg:"transparent", color:layoutStyle==="grid"?T.textPrimary:T.textMuted, border:"none", borderRadius:5, padding:"5px 10px", cursor:"pointer", boxShadow:layoutStyle==="grid"?"0 1px 3px rgba(0,0,0,0.1)":"none"}}><span style={{fontSize:14, opacity:layoutStyle==="grid"?1:0.5}}>⊞</span> Grid</button>
          </div>
      )} */}

        <button onClick={()=>setShowGlobalExcs(true)} style={{...SANS,fontSize:12,fontWeight:700,color:T.aiBase,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.aiBorder}`,background:T.aiBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6,marginLeft:12}}><span>🌍</span>Global Exceptions</button>
        <button onClick={()=>setShowClientPortal(true)} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>🏢</span>Client Portal</button>
        <button onClick={()=>setShowAuditorPortal(true)} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>🔒</span>Auditor Portal</button>
        <button onClick={onGoToAudit} style={{...SANS,fontSize:12,fontWeight:600,color:T.textPrimary,padding:"7px 14px",borderRadius:7,border:`1px solid ${T.border}`,background:T.cardBg,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>📋</span>Global Audit Log</button>
      </div>
    </div>

    {dashView === "client" && (
      <div style={{padding:"8px 12px", marginBottom:20, borderRadius:10, border:`1px solid ${T.border}`, background:"#fafbfc", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16}}>
        <div style={{display:"flex", gap:10, alignItems:"center", flex:1, minWidth:400}}>
          <div style={{position:"relative", flex:1, maxWidth: 280}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:T.textMuted,fontSize:14}}>⌕</span>
            <input type="text" placeholder="Search funds or clients..." value={search} onChange={e=>setSearch(e.target.value)} style={{...SANS, width:"100%", padding:"7px 12px 7px 32px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, outline:"none"}} />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="All">All Statuses</option>
            <option value="READY">Ready</option>
            <option value="BLOCKED">Blocked</option>
          </select>
          <select value={stageFilter} onChange={e=>setStageFilter(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="All">All Stages</option>
            <option value="open">In Progress</option>
            <option value="review_pending">Review Pending</option>
            <option value="approved">Approved</option>
          </select>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...SANS, padding:"7px 12px", borderRadius:6, border:`1px solid ${T.border}`, fontSize:12, color:T.textPrimary, background:"#fff", outline:"none", cursor:"pointer"}}>
            <option value="sla_asc">Sort: SLA (Urgent First)</option>
            <option value="sla_desc">Sort: SLA (Latest First)</option>
            <option value="exceptions_desc">Sort: Most Exceptions</option>
          </select>
          <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",marginLeft:10}}>
            <input type="checkbox" checked={hideEmpty} onChange={e=>setHideEmpty(e.target.checked)} style={{accentColor:T.actionBase}}/>
            <span style={{...SANS,fontSize:12,color:T.textPrimary,fontWeight:600}}>Hide Empty</span>
          </label>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 12px",height:34,display:"flex",alignItems:"center",gap:6}}>
            <span style={{...MONO,fontSize:13,fontWeight:700,color:T.textPrimary}}>{totalFunds}</span>
            <span style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.03em"}}>Funds</span>
          </div>
          <div style={{width:1,height:20,background:T.border,margin:"0 2px"}}/>
          {[
            {label:"Blocked",val:blockedFunds,color:T.errorBase,bg:T.errorBg,bd:T.errorBorder, icon:"✕"},
            {label:"Ready",val:readyFunds,color:T.okBase,bg:T.okBg,bd:T.okBorder, icon:"✓"},
            {label:"Review",val:reviewFunds,color:T.warnBase,bg:T.warnBg,bd:T.warnBorder, icon:"⏳"},
            {label:"Approved",val:approvedFunds,color:T.okBase,bg:T.okBg,bd:T.okBorder, icon:"✓"}
          ].map(k=>(
            <div key={k.label} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:6,padding:"0 10px",height:34,display:"flex",alignItems:"center",gap:6, boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
              <span style={{fontSize:12, color:k.color, fontWeight:700}}>{k.icon}</span>
              <span style={{...MONO,fontSize:13,fontWeight:700,color:k.color}}>{k.val}</span>
              <span style={{...SANS,fontSize:10,fontWeight:700,color:k.color,textTransform:"uppercase",letterSpacing:"0.03em"}}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    )}
   {/* ─── SPRINT 4: Render Natural Language Query for Controllers (C-14) ─── */}
   {currentUser?.isController && <NaturalLanguageQuery />}
    {dashView === "client" && filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").length > 0 && (
      <div className="slide-in" style={{background: T.cardBg, border:`1px solid ${T.border}`, borderLeft:`4px solid ${T.errorBase}`, borderRadius:8, padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", boxShadow:"0 1px 3px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex", alignItems:"center", gap:12}}>
          <span style={{fontSize: 18, color: T.errorBase}}>⚠</span>
          <div>
            <div style={{...SANS, fontSize: 13, fontWeight: 700, color: T.textPrimary}}>SLA Risk Alert</div>
            <div style={{...SANS, fontSize: 12, color: T.textMuted, marginTop: 2}}><strong>{filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").length} blocked funds</strong> are due within 24 hours. Clear exceptions to protect SLA.</div>
          </div>
        </div>
        <div style={{display:"flex", gap: 8}}>
          {filteredAndSortedFunds.filter(f => f.sla_days <= 1 && getStats(f).status === "BLOCKED").slice(0,4).map(f => (
            <button key={f.fund_id} onClick={()=>onSelectFund(f)} style={{...SANS, fontSize:11, fontWeight:600, padding:"6px 12px", borderRadius:4, border:`1px solid ${T.border}`, background:T.appBg, color:T.textPrimary, cursor:"pointer", transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=T.errorBase} onMouseLeave={e=>e.currentTarget.style.borderColor=T.border}>
              {f.fund_id} (Due {f.sla_days === 0 ? "Today" : "Tomorrow"})
            </button>
          ))}
        </div>

      </div>
      
    )}

{dashView==="inbox" ? <InboxView notifications={notifications} onSelectFund={onSelectFund} /> : 
     dashView==="flow" ? <TouchlessFlowDashboard fundSeeds={fundSeeds} fundState={fundState} onReassign={onReassign} onRunDemo={onRunDemo} isDemoRunning={isDemoRunning} demoKey={demoKey}/> :
     dashView==="team" ? <TeamCapacityView fundState={fundState} fundSeeds={filteredAndSortedFunds} onSelectFund={onSelectFund} onReassign={onReassign}/> : 
      Object.keys(grouped).length === 0 ? (
        <div style={{textAlign:"center", padding:"60px 0", color:T.textMuted, ...SANS, fontSize:14}}>No funds match your current filters.</div>
      ) : (
      Object.entries(grouped).map(([client,funds])=>{
        const isOpen=!collapsed[client];
        const totalErrs=funds.reduce((s,f)=>s+getStats(f).errors,0);
        const rp=funds.filter(f=>approvalState[f.fund_id]?.status==="review_pending").length;
        const allSelected = funds.every(f => selectedFunds.has(f.fund_id));
        const someSelected = funds.some(f => selectedFunds.has(f.fund_id));

        return <div key={client} style={{border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14,background:T.cardBg,overflow:"hidden"}}>
          <div style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:T.appBg,borderBottom:isOpen?`1px solid ${T.border}`:"none"}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <input type="checkbox" checked={allSelected} ref={el=>{if(el)el.indeterminate=(someSelected && !allSelected)}} onChange={(e)=>toggleClientSelection(e, funds)} style={{cursor:"pointer", width:16, height:16, accentColor:T.actionBase}} />
              <button onClick={()=>setCollapsed(p=>({...p,[client]:!p[client]}))} aria-expanded={isOpen} style={{display:"flex",alignItems:"center",gap:8,background:"transparent",border:"none",cursor:"pointer",textAlign:"left",color:T.textPrimary}}>
                <span style={{color:T.textMuted,fontSize:12, width:16, textAlign:"center"}}>{isOpen?"▼":"▶"}</span>
                <div>
                  <div style={{...SANS,fontWeight:700,fontSize:14,color:T.textPrimary}}>{client}</div>
                  <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:2}}>{funds.length} funds {totalErrs>0&&<span style={{color:T.errorBase,fontWeight:600}}> · {totalErrs} errors</span>}{rp>0&&<span style={{color:T.warnBase,fontWeight:600}}> · {rp} under review</span>}</div>
                </div>
              </button>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {totalErrs === 0 && funds.every(f => approvalState[f.fund_id]?.status !== "approved") && (
                 <div className="fade-in" style={{...SANS,fontSize:11,fontWeight:700,color:T.okBase,display:"flex",alignItems:"center",gap:5}}>
                   <span>🎉</span> Zero Exceptions — Ready for Review
                 </div>
              )}
              {totalErrs > 0 && (
                <button onClick={() => onViewClientExceptions(client)} style={{...SANS,fontSize:11,fontWeight:700,padding:"5px 12px",borderRadius:5,background:"#fff",color:T.errorBase,border:`1px solid ${T.errorBorder}`,cursor:"pointer",display:"flex",alignItems:"center",gap:6,boxShadow:"0 1px 2px rgba(0,0,0,0.05)"}}>
                  <span>⚠</span> View Client Exceptions ({totalErrs})
                </button>
              )}
            </div>
          </div>
          
          {isOpen && layoutStyle === "grid" && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:12,padding:16}}>
              {funds.map(f=>{ const stats=getStats(f);const approv=approvalState[f.fund_id];const pct=stats.total>0?Math.round((stats.resolved/stats.total)*100):100;const assignedUser=TEAM.find(m=>m.id===f.assignedTo); return(
                <div key={f.fund_id} role="button" tabIndex={0} className="fund-card" onClick={()=>onSelectFund(f)} onKeyDown={e=>e.key==="Enter"&&onSelectFund(f)} style={{border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`,borderRadius:9,padding:"14px 16px",background:T.cardBg}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}><div style={{flex:1,minWidth:0}}><div style={{...SANS,fontWeight:700,fontSize:13,marginBottom:1,color:T.textPrimary}}>{f.name}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>{f.fund_id}</div></div><span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:4,flexShrink:0,marginLeft:8,display:"flex",alignItems:"center",gap:4,background:stats.status==="BLOCKED"?T.errorBg:T.okBg,color:stats.status==="BLOCKED"?T.errorBase:T.okBase,border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`}}>{stats.status==="BLOCKED"?<><span>✕</span>BLOCKED</>:<><span>✓</span>READY</>}</span></div>
                  <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}><span style={{...SANS,color:T.textMuted}}>Workflow Progress</span><span style={{...MONO,fontWeight:700,color:stats.status==="BLOCKED"?T.warnBase:T.okBase}}>{pct}%</span></div><div style={{height:4,background:T.border,borderRadius:2}}><div style={{height:"100%",width:`${pct}%`,background:stats.status==="BLOCKED"?T.warnBase:T.okBase,borderRadius:2,transition:"width 0.4s"}}/></div></div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:8}}><SlaPill daysLeft={f.sla_days}/><ApprovalPill status={approv?.status||"open"}/></div>
                  
                  {/* NEW: Split Exception Badges */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:3}}>
                      <span>🛡</span> {(f.fund_id.charCodeAt(f.fund_id.length-1) % 5) + 3} Auto-Resolved
                    </span>
                    {stats.errors > 0 || stats.warnings > 0 ? (
                      <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`,display:"flex",alignItems:"center",gap:3}}>
                        <span>⚠</span> {stats.errors + stats.warnings} Requires Review
                      </span>
                    ) : (
                      <span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:3,background:T.appBg,color:T.textMuted,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:3}}>
                        <span>✓</span> 0 Review
                      </span>
                    )}
                    {assignedUser&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}><Avatar user={assignedUser} size={18}/></div>}
                  </div>
                </div>
              );})}
            </div>
          )}

         {/* List Layout */}
         {isOpen && layoutStyle === "list" && (
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", fontSize:12, textAlign:"left", tableLayout:"fixed"}}>
              <thead>
                  <tr style={{background:"#f9fafb", borderBottom:`1px solid ${T.border}`}}>
                    <th style={{padding:"8px 12px", width:"4%"}}></th>
                    <th style={{padding:"8px 12px", width:"20%", ...SANS, fontWeight:600, color:T.textMuted}}>Fund Name / ID</th>
                    <th style={{padding:"8px 12px", width:"9%", ...SANS, fontWeight:600, color:T.textMuted}}>Status</th>
                    <th style={{padding:"8px 12px", width:"12%", ...SANS, fontWeight:600, color:T.textMuted}}>Workflow Progress</th>
                    <th style={{padding:"8px 12px", width:"10%", ...SANS, fontWeight:600, color:T.textMuted, textAlign:"right"}}>Auto-Resolved</th>
                    <th style={{padding:"8px 12px", width:"10%", ...SANS, fontWeight:600, color:T.textMuted, textAlign:"right"}}>Requires Review</th>
                    <th style={{padding:"8px 16px 8px 20px", width:"9%", ...SANS, fontWeight:600, color:T.textMuted}}>PoP Δ</th>
                    <th style={{padding:"8px 12px", width:"9%", ...SANS, fontWeight:600, color:T.textMuted}}>Last Draft</th>
                    <th style={{padding:"8px 12px", width:"9%", ...SANS, fontWeight:600, color:T.textMuted}}>SLA</th>
                    <th style={{padding:"8px 12px", width:"8%", ...SANS, fontWeight:600, color:T.textMuted}}>Stage</th>
                  </tr>
                </thead>
                <tbody>
  {funds.map(f => { 
    const stats = getStats(f);
    const approv = approvalState[f.fund_id];
    const assignedUser = TEAM.find(m => m.id === f.assignedTo);
    const isSelected = selectedFunds.has(f.fund_id);
    const draftStr = approv?.status === "approved" ? "Final — Dec 31" : stats.errors === 0 ? "Draft 2 — Jan 2" : "Draft 1 — Jan 1";
    
    // NEW: Calculate Variance Score
    const variancePct = ((f.net_assets - f.prior_net_assets) / f.prior_net_assets) * 100;
    const isOutlier = Math.abs(variancePct) > 5.0; // Flag variances > 5%
    
    return (
      <tr key={f.fund_id} className="row-hover" onClick={()=>onSelectFund(f)} style={{borderBottom:`1px solid ${T.border}`, cursor:"pointer", background:isSelected ? "#eff6ff" : "transparent"}}>
        <td style={{padding:"10px 12px"}} onClick={(e)=>toggleFundSelection(e, f.fund_id)}>
          <input type="checkbox" checked={isSelected} onChange={()=>{}} style={{cursor:"pointer", width:15, height:15, accentColor:T.actionBase}} />
        </td>
        <td style={{padding:"10px 12px", overflow:"hidden"}}>
          <div style={{...SANS, fontWeight:600, color:T.textPrimary, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} title={f.name}>{f.name}</div>
          <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:2}}>{f.fund_id}</div>
        </td>
        <td style={{padding:"10px 12px"}}>
          <span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:stats.status==="BLOCKED"?T.errorBg:T.okBg,color:stats.status==="BLOCKED"?T.errorBase:T.okBase,border:`1px solid ${stats.status==="BLOCKED"?T.errorBorder:T.okBorder}`}}>
            {stats.status}
          </span>
        </td>
        <td style={{padding:"10px 12px"}}>
          <WorkflowProgress stats={stats} approval={approv || {status:"open"}} />
        </td>
        {/* AUTO-RESOLVED CELL */}
        <td style={{padding:"10px 12px", textAlign:"right"}}>
          <span style={{...MONO, fontSize:12, fontWeight:700, color:T.aiBase}}>
            {(f.fund_id.charCodeAt(f.fund_id.length-1) % 5) + 3}
          </span>
        </td>

        {/* REQUIRES REVIEW CELL */}
        <td style={{padding:"10px 12px", textAlign:"right"}}>
          {stats.errors > 0 || stats.warnings > 0 ? (
            <span style={{...MONO, fontSize:12, fontWeight:700, color:T.errorBase}}>
              {stats.errors + stats.warnings}
            </span>
          ) : (
            <span style={{color:T.textMuted}}>—</span>
          )}
        </td>

        {/* NEW VARIANCE CELL */}
        <td style={{padding:"10px 12px"}}>
          <span style={{...MONO, fontSize:11, fontWeight:700, color: isOutlier ? T.errorBase : T.textPrimary, display:"flex", alignItems:"center", gap:4}}>
            {variancePct > 0 ? "+" : ""}{variancePct.toFixed(2)}%
            {isOutlier && <span title="Variance threshold exceeded (>5%)" style={{fontSize:14}}>⚠</span>}
          </span>
        </td>

        <td style={{padding:"10px 12px", ...MONO, fontSize:11, color:T.textPrimary, whiteSpace:"nowrap"}}>
          {draftStr}
        </td>
        <td style={{padding:"10px 12px"}}>
          <SlaPill daysLeft={f.sla_days}/>
        </td>
        <td style={{padding:"10px 12px"}}>
          <ApprovalPill status={approv?.status||"open"}/>
        </td>
        <td style={{padding:"10px 12px", textAlign:"right"}}>
          {assignedUser ? <Avatar user={assignedUser} size={24} /> : <span style={{color:T.textMuted}}>—</span>}
        </td>
      </tr>
    );
  })}
</tbody>
              </table>
            </div>
          )}
        </div>;
    })
    )}
    
    <BulkFundActionBar 
      selectedFunds={selectedFunds} 
      approvalState={approvalState} 
      currentUser={currentUser} 
      onClear={()=>setSelectedFunds(new Set())} 
      onBulkApprove={onBulkApprove} 
      onSubmitForReview={onBulkSubmitForReview} // This line is now wired to the prop above
      fundState={fundState}
    />
    {showGlobalExcs && <GlobalExceptionsModal fundState={fundState} fundSeeds={fundSeeds} onClose={()=>setShowGlobalExcs(false)} onGlobalResolve={onGlobalResolve} onSelectFund={onSelectFund} onSingleResolve={onSingleResolve} onSelectFundFromGlobal={onSelectFundFromGlobal} />}
    {showTemplates&&<TemplateConfigScreen onClose={()=>setShowTemplates(false)}/>}
    {showClientPortal&&<ClientPortal onClose={()=>setShowClientPortal(false)}/>}
    {showAuditorPortal&&<AuditorPortal onClose={()=>setShowAuditorPortal(false)}/>}
    {showSoc1&&<Soc1AuditReport onClose={()=>setShowSoc1(false)} fundState={fundState} approvalState={approvalState} fundSeeds={fundSeeds}/>}
  </div>;
}

