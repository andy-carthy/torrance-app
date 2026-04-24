import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { Avatar } from '../primitives/Avatar';
import type { FundSeed, Exception } from '../../types';

export function TeamCapacityView({fundState,fundSeeds,onSelectFund,onReassign}) {
  const [dragFund,setDragFund]=useState<any>(null);const [dragOver,setDragOver]=useState<string|null>(null);
  const preparers=TEAM.filter(m=>!m.isController);
  const getFunds=uid=>fundSeeds.filter(f=>f.assignedTo===uid);
  const getOpen=uid=>fundSeeds.filter(f=>f.assignedTo===uid).reduce((s,f)=>s+(fundState[f.fund_id]||[]).filter(e=>e.status==="open").length,0);
  return <div style={{padding:"20px 24px"}}>
    <div style={{...SANS,fontWeight:700,fontSize:14,marginBottom:4}}>Team Capacity — December 31, 2024</div>
    <div style={{...SANS,fontSize:12,color:T.textMuted,marginBottom:18}}>Drag fund cards to reassign. Double-click to open.</div>
    <div style={{background:T.cardBg,border:`1px solid ${T.controllerBd}`,borderRadius:10,padding:"14px 18px",marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
      <Avatar user={TEAM.find(m=>m.id==="u4")} size={40}/><div style={{flex:1}}><div style={{...SANS,fontWeight:700,fontSize:14}}>James Okafor</div><div style={{...SANS,fontSize:12,color:T.controllerAccent,fontWeight:600}}>Controller</div></div>
      <div style={{textAlign:"right"}}><div style={{...MONO,fontSize:18,fontWeight:700,color:T.controllerAccent}}>{fundSeeds.filter(f=>f.assignedTo==="u4").length}</div><div style={{...SANS,fontSize:11,color:T.textMuted}}>funds in review</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:16}}>
      {preparers.map(member=>{ const funds=getFunds(member.id),openCnt=getOpen(member.id),isDO=dragOver===member.id; return(
        <div key={member.id} className="fte-card" onDragOver={e=>{e.preventDefault();setDragOver(member.id);}} onDragLeave={()=>setDragOver(null)} onDrop={e=>{e.preventDefault();setDragOver(null);if(dragFund&&dragFund.assignedTo!==member.id)onReassign(dragFund.fund_id,member.id);setDragFund(null);}} style={{background:T.cardBg,border:`1px solid ${isDO?T.actionBase:T.border}`,outline:isDO?`2px dashed ${T.actionBase}`:"none",transition:"border-color 0.1s"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12}}><Avatar user={member} size={36}/><div style={{flex:1}}><div style={{...SANS,fontWeight:700,fontSize:13}}>{member.name}</div><div style={{...SANS,fontSize:11,color:T.textMuted}}>{member.role}</div></div><div style={{textAlign:"right"}}><div style={{...MONO,fontSize:20,fontWeight:700,color:openCnt>0?T.errorBase:T.okBase}}>{openCnt}</div><div style={{...SANS,fontSize:10,color:T.textMuted}}>open</div></div></div>
          <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6,minHeight:80}}>
            {funds.length===0&&<div style={{...SANS,fontSize:12,color:T.textMuted,textAlign:"center",padding:"14px 0"}}>{isDO?"Drop here":"No funds assigned"}</div>}
            {funds.map(f=>{ const excs=fundState[f.fund_id]||[];const blocked=excs.filter(e=>e.severity==="error"&&e.status==="open").length>0;const open=excs.filter(e=>e.status==="open").length; return(
              <div key={f.fund_id} draggable onDragStart={()=>setDragFund(f)} onDragEnd={()=>{setDragFund(null);setDragOver(null);}} onDoubleClick={()=>onSelectFund(f)}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",borderRadius:7,border:`1px solid ${blocked?T.errorBorder:T.border}`,background:blocked?T.errorBg:T.cardBg,cursor:"grab",userSelect:"none"}}>
                <div style={{flex:1,minWidth:0}}><div style={{...SANS,fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{f.name}</div><div style={{...SANS,fontSize:10,color:T.textMuted,marginTop:1}}><span style={MONO}>{f.fund_id}</span></div></div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:8,flexShrink:0}}>{open>0&&<span style={{...MONO,fontSize:11,fontWeight:700,color:blocked?T.errorBase:T.warnBase}}>{open}</span>}<span style={{...SANS,fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:3,background:blocked?T.errorBg:T.okBg,color:blocked?T.errorBase:T.okBase,border:`1px solid ${blocked?T.errorBorder:T.okBorder}`,display:"flex",alignItems:"center",gap:3}}>{blocked?<><span>✕</span>BLOCKED</>:<><span>✓</span>READY</>}</span><span style={{color:T.textMuted,fontSize:12,cursor:"grab"}}>⠿</span></div>
              </div>
            );})}
          </div>
        </div>
      );})}
    </div>
  </div>;
}

