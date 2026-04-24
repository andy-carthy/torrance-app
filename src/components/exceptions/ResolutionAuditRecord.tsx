import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Card, FieldLabel } from '../primitives/Card';
import { Avatar } from '../primitives/Avatar';
import { fmtUSD } from '../../utils/formatters';
import { RESOLUTIONS } from '../../data/exceptions';
import { TEAM } from '../../data/team';
import { ThreadedComments } from './ThreadedComments';

export function ResolutionAuditRecord({exc,onReopen,onAddThread,currentUserId}) {
  const resolver=exc.resolvedBy?TEAM.find(m=>m.id===exc.resolvedBy):null;
  const assignee=exc.assignee?TEAM.find(m=>m.id===exc.assignee):null;
  const resOption=[...RESOLUTIONS.error,...RESOLUTIONS.warning].find(r=>r.value===exc.resolution);
  
  return <Card title="Resolution Record" accessory={<span style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:4}}><span>✓</span>Resolved</span>}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
      <div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Resolution Action</div><div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>{resOption?.icon}</span><span style={{...SANS,fontSize:13,fontWeight:600,color:T.okBase}}>{resOption?.label||exc.resolution}</span></div></div>
      <div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Resolved By</div>{resolver?<div style={{display:"flex",alignItems:"center",gap:7}}><Avatar user={resolver} size={24}/><span style={{...SANS,fontSize:13,fontWeight:500}}>{resolver.name}</span></div>:<span style={{...SANS,fontSize:13,color:T.textMuted}}>—</span>}</div>
      {exc.overrideValue&&<div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Override Value</div><span style={{...MONO,fontSize:13,fontWeight:600,padding:"2px 7px",borderRadius:4,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>{exc.overrideValue}</span></div>}
      {assignee&&<div><div style={{...SANS,fontSize:10,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:5}}>Assigned To</div><div style={{display:"flex",alignItems:"center",gap:7}}><Avatar user={assignee} size={24}/><span style={{...SANS,fontSize:13}}>{assignee.name}</span></div></div>}
    </div>

    {/* ─── Instruction 10: Before/After Value Display ─── */}
    {exc.resolution === "override_value" && exc.overrideValue && exc.currentValue && (() => {
      const parseVal = (v: string) => parseFloat(v.replace(/[$,]/g, '')) || 0;
      const before = parseVal(exc.currentValue);
      const after = parseVal(exc.overrideValue);
      const variance = after - before;
      const variancePct = before ? ((variance / Math.abs(before)) * 100).toFixed(1) : null;
      return (
        <div style={{marginBottom: 16, padding: "14px 16px", background: "linear-gradient(135deg, #fff8f8 0%, #f0fdf4 100%)", border: `1px solid ${T.border}`, borderRadius: 8}}>
          <div style={{...SANS, fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10}}>Value Correction</div>
          <div style={{display: "flex", alignItems: "center", gap: 16}}>
            <div style={{textAlign: "center"}}>
              <div style={{...SANS, fontSize: 10, color: T.textMuted, marginBottom: 4}}>Before</div>
              <div style={{...MONO, fontSize: 16, fontWeight: 700, color: T.errorBase, textDecoration: "line-through", opacity: 0.85}}>{exc.currentValue}</div>
            </div>
            <div style={{...MONO, fontSize: 14, color: T.textMuted, letterSpacing: "0.05em", flexShrink: 0}}>────────→</div>
            <div style={{textAlign: "center"}}>
              <div style={{...SANS, fontSize: 10, color: T.textMuted, marginBottom: 4}}>After</div>
              <div style={{...MONO, fontSize: 16, fontWeight: 700, color: T.okBase}}>{exc.overrideValue}</div>
            </div>
            {variancePct !== null && (
              <div style={{marginLeft: "auto", textAlign: "right"}}>
                <div style={{...SANS, fontSize: 10, color: T.textMuted, marginBottom: 4}}>Variance</div>
                <div style={{...MONO, fontSize: 13, fontWeight: 700, color: variance < 0 ? T.errorBase : T.okBase}}>{variance < 0 ? "" : "+"}{fmtUSD(variance)} ({variancePct}%)</div>
              </div>
            )}
          </div>
        </div>
      );
    })()}

    {/* ─── C-10: AUTOMATED JE BANNER ─── */}
    {exc.resolution === "override_value" && (
      <div style={{marginBottom: 16, padding: "12px 16px", background: T.okBg, border: `1px solid ${T.okBorder}`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center"}}>
         <div>
           <div style={{...SANS, color: T.okBase, fontSize: 12, fontWeight: 700, marginBottom: 2}}>
             <span style={{marginRight: 6}}>✓</span> Adjusting journal entry auto-generated
           </div>
           <div style={{...MONO, color: T.textMuted, fontSize: 10}}>
             DR Suspense / CR {exc.account_number || 'Acct'}
           </div>
         </div>
         <button onClick={() => window.dispatchEvent(new CustomEvent("open-journal", { detail: exc }))} style={{...SANS, fontSize: 11, fontWeight: 700, padding: "6px 12px", background: "#fff", border: `1px solid ${T.okBorder}`, borderRadius: 4, cursor: "pointer", color: T.okBase, transition:"all 0.2s"}}>
           Review in Journals
         </button>
      </div>
    )}

    <Card title="Audit Thread" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{exc.thread.length} messages</span>}><ThreadedComments thread={exc.thread} onAddMessage={(txt)=>onAddThread(exc.id,txt)} onAddAiMessage={(txt)=>onAddThread(exc.id,txt,'u_ai')} excCode={exc.code} currentUserId={currentUserId}/></Card>
    <button className="reopen-btn" onClick={()=>onReopen(exc.id)} style={{...SANS,background:T.cardBg,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:7}}><span>↺</span>Reopen Exception</button>
  </Card>;
}

