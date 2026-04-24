import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { AI_SUGGESTIONS, AI_ROOT_CAUSE } from '../../data/aiData';
import { Badge } from '../primitives/Badge';
import { Avatar } from '../primitives/Avatar';
import { TEAM } from '../../data/team';
import { fmtUSD } from '../../utils/formatters';

export function ExcCard({exc,active,selected,onClick,onToggleSelect}) {
  const resolved=exc.status==="resolved";
  const assignee=exc.assignee?TEAM.find(m=>m.id===exc.assignee):null;
  const hasAI=!!AI_SUGGESTIONS[exc.id];
  const hasRCA=!!AI_ROOT_CAUSE[exc.id];

  return <div role="button" tabIndex={0} className="exc-card" onClick={onClick} onKeyDown={e=>e.key==="Enter"&&onClick()} style={{padding:"8px 12px 8px 0",borderBottom:`1px solid ${T.border}`,borderLeft:`3px solid ${selected||active?T.actionBase:resolved?T.okBase:"transparent"}`,background:selected?"#f0f4ff":active?"#f8fafc":resolved?T.okBg:T.cardBg,opacity:resolved?0.7:1,cursor:"pointer",display:"flex",alignItems:"center"}}>
    <div style={{width:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}} onClick={e=>{e.stopPropagation();onToggleSelect(exc.id);}}>
      <input type="checkbox" checked={selected} onChange={()=>{}} style={{margin:0}}/>
    </div>
    <div style={{flex:1,minWidth:0, display:"flex", flexDirection:"column", gap:3}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:6, overflow:"hidden"}}>
          <Badge severity={exc.severity} size="sm"/>
          <span style={{...SANS,fontWeight:600,fontSize:12,color:T.textPrimary,textDecoration:resolved?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={exc.title}>{exc.title}</span>
          {resolved && <span style={{...SANS,fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,marginLeft:6,verticalAlign:"middle",flexShrink:0}}>✓ Resolved</span>}
        </div>
        <span style={{...MONO,fontSize:11,fontWeight:700,color:resolved?T.textMuted:T.textPrimary,flexShrink:0}}>{fmtUSD(exc.amount)}</span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
        <div style={{...SANS,fontSize:11,color:T.textMuted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1}} title={exc.message}>{exc.message}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
          {hasAI&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 4px",borderRadius:4,background:T.aiBg,color:T.aiDark,border:`1px solid ${T.aiBorder}`,lineHeight:1}}>✦ AI</span>}
          {hasRCA&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"2px 4px",borderRadius:4,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`,lineHeight:1}}>🔍 RCA</span>}
          {exc.thread?.length>0&&<span style={{...SANS,fontSize:10,color:T.textMuted, display:"flex", alignItems:"center", gap:3}}>💬 {exc.thread.length}</span>}
          {assignee&&<div style={{marginLeft:2}}><Avatar user={assignee} size={16}/></div>}
        </div>
      </div>
    </div>
  </div>;
}
