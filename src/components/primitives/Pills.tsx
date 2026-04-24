import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function SlaPill({daysLeft}) {
  const isDanger = daysLeft <= 1;
  const color = isDanger ? T.errorBase : daysLeft <= 3 ? T.warnBase : T.textMuted;
  return <span style={{...SANS,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:5,whiteSpace:"nowrap",boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
    <span style={{color:color, fontSize:10}}>●</span>{daysLeft===0?"Due Today":daysLeft===1?"Due Tomorrow":`${daysLeft} Days`}
  </span>;
}
export function ApprovalPill({status}) {
  const map={
    open:{label:"In Progress",color:T.textMuted},
    submitted:{label:"Submitted",color:T.actionBase},
    review_pending:{label:"Review Pending",color:T.warnBase},
    approved:{label:"Approved",color:T.okBase}
  };
  const c=map[status]||map.open;
  return <span style={{...SANS,fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:4,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,display:"inline-flex",alignItems:"center",gap:5,boxShadow:"0 1px 2px rgba(0,0,0,0.02)"}}>
    <span style={{color:c.color, fontSize:10}}>●</span>{c.label}
  </span>;
}
export function AiConfidenceBadge({pct}) {
  const color=pct>=95?T.okBase:pct>=80?T.warnBase:T.errorBase;
  return <span style={{...MONO,fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:T.aiBg,color,border:`1px solid ${T.aiBorder}`,display:"inline-flex",alignItems:"center",gap:4}}><span>✦</span>{pct}% confidence</span>;
}
export function PriorPeriodFlag({flag}) {
  if(!flag)return null;
  const cfg=flag.type==="spike"?{color:T.errorBase,bg:T.errorBg,border:T.errorBorder,icon:"⚠",label:"NEW PATTERN"}:flag.type==="repeat"?{color:T.warnBase,bg:T.warnBg,border:T.warnBorder,icon:"↻",label:"RECURRING"}:{color:T.textMuted,bg:"#f1f5f9",border:T.border,icon:"~",label:"ROUTINE"};
  return <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"8px 10px",borderRadius:6,background:cfg.bg,border:`1px solid ${cfg.border}`,marginBottom:10}}>
    <span style={{fontSize:14,flexShrink:0}}>{cfg.icon}</span>
    <div><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}><span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`}}>{cfg.label}</span><span style={{...SANS,fontSize:10,color:T.textMuted}}>Period-over-period</span></div><span style={{...SANS,fontSize:11,color:T.textMuted,lineHeight:1.5}}>{flag.message}</span></div>
  </div>;
}
