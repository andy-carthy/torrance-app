import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';
import { RESOLUTIONS } from '../../data/exceptions';
import { TEAM } from '../../data/team';

export function BulkActionBar({selected,exceptions,onBulkResolve,onBulkAssign,onClear}) {
  const [bulkAction,setBulkAction]=useState("");
  const allOpen=exceptions.filter(e=>selected.has(e.id)&&e.status==="open");
  const allResolved=exceptions.filter(e=>selected.has(e.id)&&e.status==="resolved");
  if(selected.size===0)return null;
  return <div className="bulk-bar" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:500,background:T.navyHeader,borderTop:`2px solid ${T.actionBase}`,padding:"10px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",boxShadow:"0 -4px 12px rgba(0,0,0,0.15)"}}>
    <div style={{...SANS,fontSize:12,fontWeight:700,color:"#fff",background:"#253547",padding:"5px 10px",borderRadius:5,display:"flex",alignItems:"center",gap:6}}><span style={{background:T.actionBase,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{selected.size}</span>selected</div>
    {allOpen.length>0&&<div style={{display:"flex",alignItems:"center",gap:6}}>
      <select value={bulkAction} onChange={e=>setBulkAction(e.target.value)} style={{...SANS,fontSize:12,padding:"6px 10px",borderRadius:5,border:`1px solid #374151`,background:"#253547",color:"#e2e6ed",cursor:"pointer"}}><option value="">— Bulk action…</option>{RESOLUTIONS.error.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}</select>
      <button disabled={!bulkAction} onClick={()=>{if(bulkAction){onBulkResolve(Array.from(selected),bulkAction);setBulkAction("");}}} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 14px",borderRadius:5,border:"none",background:bulkAction?T.okBase:"#374151",color:bulkAction?"#fff":"#6b7280",cursor:bulkAction?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:5}}><span>✓</span>Apply to {allOpen.length}</button>
    </div>}
    <select defaultValue="" onChange={e=>{if(e.target.value){onBulkAssign(Array.from(selected),e.target.value);e.target.value="";}}} style={{...SANS,fontSize:12,padding:"6px 10px",borderRadius:5,border:`1px solid #374151`,background:"#253547",color:"#e2e6ed",cursor:"pointer"}}><option value="">↝ Assign all to…</option>{TEAM.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
    {allResolved.length>0&&<button onClick={()=>onBulkResolve(Array.from(selected).filter(id=>exceptions.find(e=>e.id===id)?.status==="resolved"),"reopen")} style={{...SANS,fontSize:12,fontWeight:600,padding:"6px 13px",borderRadius:5,border:`1px solid #374151`,background:"transparent",color:"#e2e6ed",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}><span>↺</span>Reopen {allResolved.length}</button>}
    <button onClick={onClear} style={{marginLeft:"auto",...SANS,fontSize:12,color:"#8898aa",background:"transparent",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:4}}><span>✕</span>Clear</button>
  </div>;
}

