import React, { useState, useEffect, useCallback } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { SectionDivider } from '../primitives/Card';
import { ExcCard } from './ExcCard';
import { DetailPane } from './DetailPane';
import { BulkActionBar } from './BulkActionBar';
import { AI_DECISION_LOG } from '../../data/aiData';
import { AiDecisionDetailPane } from '../ai/AIDecisionLogTab';
import type { Exception, ApprovalRecord } from '../../types';

export function ExceptionsTab({exceptions,approval,onResolve,onReopen,onUpdate,onAddThread,currentUserId,onSubmit,demoActiveExcId,demoTypingText,demoShouldSubmit}) {
  const [activeId,setActiveId]=useState(exceptions[0]?.id||null);
  useEffect(()=>{ if(demoActiveExcId) setActiveId(demoActiveExcId); },[demoActiveExcId]);
  const [selected,setSelected]=useState(new Set());
  const [forceShowResolved, setForceShowResolved]=useState(false); 
  const [showAutoResolved, setShowAutoResolved] = useState(false); // C-02 State

  const toggleSel=useCallback(id=>setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;}),[]);
  const toggleAll=()=>setSelected(s=>s.size===exceptions.length?new Set():new Set(exceptions.map(e=>e.id)));
  
  const openErrors=exceptions.filter(e=>e.severity==="error"&&e.status==="open");
  const autoResolvedCount = AI_DECISION_LOG.filter(log => log.type === 'autonomous').length;

  // C-04: Close Certified State — only when ALL exceptions are resolved
  const anyOpen = exceptions.some(e => e.status === "open");
  if (!anyOpen && exceptions.length > 0 && approval?.status === "open" && !forceShowResolved) {
    return (
      <div className="fade-in" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", background:T.appBg}}>
        <div style={{fontSize: 72, marginBottom: 16, animation: "slideUp 0.6s ease forwards"}}>📜</div>
        <div style={{...SANS, fontSize: 26, fontWeight: 700, color: T.textPrimary, marginBottom: 8}}>Review Complete — Ready for Sign-off</div>
        <div style={{...SANS, fontSize: 15, color: T.textMuted, marginBottom: 32, maxWidth: 450, textAlign: "center", lineHeight:1.5}}>
          The residual queue is empty. The autonomous close is ready for certification. The AI Decision Log has been fully audited.
        </div>
       <button onClick={onSubmit} className="glow-btn" style={{...SANS, fontSize: 14, fontWeight: 700, padding: "12px 24px", borderRadius: 6, border: "none", background: T.okBase, color: "#fff", cursor: "pointer", display:"flex", alignItems:"center", gap:8}}>
          <span>↑</span> Submit Fund for Controller Review
        </button>
        <button onClick={()=>setForceShowResolved(true)} style={{...SANS, marginTop: 24, fontSize: 13, color: T.textMuted, background: "none", border: "none", cursor: "pointer", textDecoration:"underline"}}>
          Review resolved exceptions
        </button>
      </div>
    );
  }

  return (
    <div style={{display:"flex",height:"100%"}}>
      
      {/* ─── LEFT PANE: QUEUE LIST ─── */}
      <aside style={{flex:"0 0 40%", borderRight:`1px solid ${T.border}`,background:T.cardBg,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* C-04 Header Reframe */}
        <div style={{padding:"16px 16px",borderBottom:`1px solid ${T.border}`,position:"sticky",top:0,background:T.cardBg,zIndex:5}}>
          <div style={{...SANS,fontWeight:700,fontSize:18, color:T.textPrimary, marginBottom:6}}>Exception Engine</div>
          <div style={{...MONO,fontSize:11,color:T.textMuted, display:"flex", gap:12}}>
             <span style={{color:T.okBase,fontWeight:700}}>✓ Auto-resolved: {autoResolvedCount}</span>
             <span style={{color:openErrors.length>0?T.warnBase:T.okBase,fontWeight:700}}>⚠ Requires review: {openErrors.length}</span>
          </div>
        </div>
        
        <div style={{flex:1,overflowY:"auto",paddingBottom:100, background:T.appBg}}>
          
          {/* C-02 Auto-Resolved Collapsible Section */}
          <div style={{borderBottom:`1px solid ${T.border}`, background:T.cardBg}}>
            <div onClick={()=>setShowAutoResolved(!showAutoResolved)} style={{padding:"12px 16px", background:T.okBg, borderBottom: showAutoResolved ? `1px solid ${T.okBorder}` : "none", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{...SANS, fontSize:12, fontWeight:700, color:T.okBase, display:"flex", alignItems:"center", gap:8}}>
                 <span>🛡</span> Autonomously Resolved ({autoResolvedCount})
              </div>
              <span style={{color:T.okBase, fontSize:10}}>{showAutoResolved ? "▲" : "▼"}</span>
            </div>
            
            {showAutoResolved && (
               <div style={{padding:"8px 16px"}}>
                 {AI_DECISION_LOG.filter(l => l.type === "autonomous").map(log => (
                    <div key={log.id} onClick={() => setActiveId(log.id)} style={{padding:"10px 12px", margin:"0 -12px", borderRadius:6, borderBottom:`1px dashed ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", cursor:"pointer", transition:"background 0.2s", background: activeId === log.id ? T.appBg : "transparent"}} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background= activeId === log.id ? T.appBg : "transparent"}>
                       <div style={{flex:1, paddingRight:12}}>
                         <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textPrimary, marginBottom:2}}>{log.exceptionId}</div>
                         <div style={{...SANS, fontSize:11, color:T.textMuted, lineHeight:1.4}}>{log.details}</div>
                       </div>
                       <div style={{textAlign:"right", flexShrink:0}}>
                         <div style={{...SANS, fontSize:10, fontWeight:700, color:T.aiBase, background:T.aiBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.aiBorder}`}}>{log.rule}</div>
                         <div style={{...MONO, fontSize:10, color:T.textMuted, marginTop:4}}>{log.confidence}% Conf</div>
                       </div>
                    </div>
                  ))}
               </div>
            )}
          </div>

          {/* Residual Queue Header */}
          <div style={{padding:"12px 16px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, ...SANS, fontSize:11, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", display:"flex", alignItems:"center", gap:8}}>
             <input type="checkbox" checked={selected.size===exceptions.length&&exceptions.length>0} ref={el=>{if(el)el.indeterminate=selected.size>0&&selected.size<exceptions.length;}} onChange={toggleAll} aria-label="Select all" style={{margin:0}}/>
             Requires Your Judgment
          </div>

          {exceptions.map(e=>(
            <ExcCard key={e.id} exc={e} active={activeId===e.id} selected={selected.has(e.id)} onClick={()=>setActiveId(e.id)} onToggleSelect={toggleSel}/>
          ))}
        </div>
      </aside>

      {/* ─── RIGHT PANE: DETAIL VIEW (Exception OR AI Log) ─── */}
      <div style={{flex:1,overflowY:"auto",background:T.cardBg,position:"relative"}}>
        {(() => {
          const activeExc = exceptions.find(e => e.id === activeId);
          const activeAiLog = AI_DECISION_LOG.find(l => l.id === activeId);

          if (activeExc) {
            return <DetailPane exc={activeExc} onResolve={onResolve} onReopen={onReopen} onUpdate={onUpdate} onAddThread={onAddThread} currentUserId={currentUserId} demoTypingText={demoTypingText} demoShouldSubmit={demoShouldSubmit}/>;
          }
          if (activeAiLog) {
            return <AiDecisionDetailPane log={activeAiLog} />;
          }
          return (
            <div style={{display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:T.textMuted, ...SANS}}>
              Select an exception or AI decision to view details
            </div>
          );
        })()}
      </div>
      
      {/* ─── ACTION BAR ─── */}
      <BulkActionBar selected={selected} exceptions={exceptions} onBulkResolve={(ids,res)=>{ids.forEach(id=>{if(res==="reopen")onReopen(id);else onResolve(id,res,"","");});setSelected(new Set());}} onBulkAssign={(ids,uid)=>{ids.forEach(id=>onUpdate(id,{assignee:uid}));setSelected(new Set());}} onClear={()=>setSelected(new Set())}/>
    </div>
  );
}

