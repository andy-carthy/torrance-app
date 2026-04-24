import React, { useState } from 'react';
import { T, SANS, MONO } from '../../theme/tokens';
import { TEMPLATE_TYPES } from '../../data/financials';
import { TEAM } from '../../data/team';
import { Avatar } from '../primitives/Avatar';

export function TemplateConfigScreen({onClose}) {
  const [templates,setTemplates]=useState(TEMPLATE_TYPES);const [uploading,setUploading]=useState(null);
  const handleUpload=key=>{setUploading(key);setTimeout(()=>{setTemplates(prev=>prev.map(t=>t.key===key?{...t,uploaded:true,uploadedBy:"u1",uploadedAt:"Just now"}:t));setUploading(null);},1200);};
  return <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:640,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{background:T.navyHeader,padding:"16px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div><div style={{...SANS,fontWeight:700,fontSize:15,color:"#fff"}}>Template Configuration</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}>Upload custom Word and Excel templates for client deliverables</div></div><button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button></div>
      <div style={{overflowY:"auto",padding:"20px 22px"}}>
        {templates.map(tmpl=>{const uploader=tmpl.uploadedBy?TEAM.find(m=>m.id===tmpl.uploadedBy):null;const isUploading=uploading===tmpl.key;return(
          <div key={tmpl.key} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 14px",borderRadius:8,border:`1px solid ${T.border}`,marginBottom:10}}>
            <span style={{fontSize:24,flexShrink:0}}>{tmpl.icon}</span>
            <div style={{flex:1,minWidth:0}}><div style={{...SANS,fontWeight:700,fontSize:13,marginBottom:2}}>{tmpl.label}</div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{...SANS,fontSize:10,color:T.textMuted}}>{tmpl.client}</span><span style={{...MONO,fontSize:10,color:T.textMuted,background:T.appBg,padding:"1px 5px",borderRadius:3,border:`1px solid ${T.border}`}}>{tmpl.ext}</span>{tmpl.uploaded&&uploader&&<span style={{...SANS,fontSize:10,color:T.textMuted,display:"flex",alignItems:"center",gap:4}}><Avatar user={uploader} size={14}/>{uploader.name} · {tmpl.uploadedAt}</span>}</div></div>
            <div style={{flexShrink:0}}>{isUploading?<span style={{...SANS,fontSize:12,color:T.actionBase,fontWeight:600}}>Uploading…</span>:tmpl.uploaded?<div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{...SANS,fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:4,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"flex",alignItems:"center",gap:3}}><span>✓</span>Uploaded</span><button onClick={()=>handleUpload(tmpl.key)} style={{...SANS,fontSize:11,color:T.actionBase,background:"transparent",border:`1px solid ${T.actionBase}`,borderRadius:5,padding:"4px 10px",cursor:"pointer",fontWeight:600}}>Replace</button></div>:<button onClick={()=>handleUpload(tmpl.key)} style={{...SANS,fontSize:12,fontWeight:600,padding:"7px 14px",borderRadius:6,border:"none",background:T.actionBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}><span>↑</span>Upload</button>}</div>
          </div>
        );})}
      </div>
    </div>
  </div>;
}

