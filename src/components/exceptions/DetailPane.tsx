import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Badge } from '../primitives/Badge';
import { Card } from '../primitives/Card';
import { fmtUSD } from '../../utils/formatters';
import { PdfModal } from '../modals/PdfModal';
import { ResolutionForm } from './ResolutionForm';
import { ResolutionAuditRecord } from './ResolutionAuditRecord';

export function DetailPane({exc,onResolve,onReopen,onUpdate,onAddThread,currentUserId,demoTypingText,demoShouldSubmit}) {
  const [showPdf,setShowPdf]=useState(false);
  const isResolved=exc.status==="resolved";
  
  return <div style={{padding:"24px 32px 80px",width:"100%"}}>
    <div style={{marginBottom:24, display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <Badge severity={exc.severity} size="md"/>
          <span style={{...MONO,fontSize:12,color:T.textMuted}}>{exc.code}</span>
          {isResolved&&<span style={{...SANS,fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:5,background:T.okBg,color:T.okBase,border:`1px solid ${T.okBorder}`,display:"inline-flex",alignItems:"center",gap:4}}><span>✓</span>Resolved</span>}
        </div>
        <h2 style={{...SANS,fontWeight:700,fontSize:20,color:T.textPrimary,marginBottom:6}}>{exc.title}</h2>
        <p style={{...SANS,fontSize:14,color:T.textMuted,lineHeight:1.65, maxWidth:"80%"}}>{exc.message}</p>
      </div>
      <div style={{textAlign:"right"}}>
         <div style={{...SANS, fontSize:11, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4}}>Exception Amount</div>
         <div style={{...MONO, fontSize:24, fontWeight:700, color:T.textPrimary}}>{fmtUSD(exc.amount)}</div>
      </div>
    </div>
    
    <Card title="Exception Context" accessory={<span style={{...MONO,fontSize:11,color:T.textMuted}}>{exc.row>0?`Row ${exc.row}`:"Global check"}</span>}>
      {/* Dynamic Grid: Scales gracefully across the full width */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",gap:20}}>
        {[{label:"Current Value",val:exc.currentValue,type:"error"},{label:"Expected Value",val:exc.expectedValue,type:"ok"}].map(f=>(
          <div key={f.label}><div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{f.label}</div><span style={{...MONO,fontSize:13,fontWeight:600,padding:"4px 10px",borderRadius:5,display:"inline-block",background:f.type==="error"?T.errorBg:T.okBg,color:f.type==="error"?T.errorBase:T.okBase,border:`1px solid ${f.type==="error"?T.errorBorder:T.okBorder}`}}>{f.val}</span></div>
        ))}
        {[["Account #",<span key="a" style={MONO}>{exc.account_number}</span>],["Account Name",exc.account_name],["Share Class",exc.class]].map(([label,val])=>(
          <div key={label}><div style={{...SANS,fontSize:11,fontWeight:700,color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{label}</div><div style={{...SANS,fontSize:13, color:T.textPrimary, fontWeight:500}}>{val}</div></div>
        ))}
      </div>
    </Card>
    
    {isResolved?<ResolutionAuditRecord exc={exc} onReopen={onReopen} onAddThread={onAddThread} currentUserId={currentUserId}/>:<ResolutionForm exc={exc} onResolve={onResolve} onUpdate={onUpdate} onAddThread={onAddThread} currentUserId={currentUserId} demoTypingText={demoTypingText} demoShouldSubmit={demoShouldSubmit}/>}
    
    <div style={{marginTop:6}}><button onClick={()=>setShowPdf(true)} style={{...SANS,background:T.cardBg,color:T.textPrimary,border:`1px solid ${T.border}`,borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7}}><span>↓</span>Export Reports</button></div>
    {showPdf&&<PdfModal onClose={()=>setShowPdf(false)}/>}
  </div>;
}
