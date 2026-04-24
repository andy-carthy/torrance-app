import React, { useState } from 'react';
import { T, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';

export function ApprovalWaterfallBar({fund,approval,exceptions,currentUser,onSubmit,onApprove,onOpenPdf}) {
  const [showEmailConfirm,setShowEmailConfirm]=useState(false);
  const openErrors=exceptions.filter(e=>e.severity==="error"&&e.status==="open");
  const canSubmit=openErrors.length===0&&approval.status==="open";
  const isPreparer=!currentUser.isController;
  const handleApprove=()=>{ onApprove(); setShowEmailConfirm(true); setTimeout(()=>setShowEmailConfirm(false),4000); };

  return <div style={{display:"flex",alignItems:"center",gap:12}}>
    <div style={{display:"flex",alignItems:"center",gap:4, background:"rgba(0,0,0,0.2)", padding:"4px 8px", borderRadius:6, border:"1px solid rgba(255,255,255,0.1)"}}>
      {[{key:"open",label:"Prep",done:["submitted","review_pending","approved"].includes(approval.status)},{key:"review_pending",label:"Review",done:["approved"].includes(approval.status)},{key:"approved",label:"Approved",done:approval.status==="approved"}].map((step,i)=>(
        <React.Fragment key={step.key}>
          <span style={{...SANS,fontSize:10,fontWeight:700,color:step.done?"#34d399":"rgba(255,255,255,0.6)"}}>{step.done&&<span style={{marginRight:3}}>✓</span>}{step.label}</span>
          {i<2&&<span style={{color:"rgba(255,255,255,0.3)",fontSize:10, margin:"0 2px"}}>›</span>}
        </React.Fragment>
      ))}
    </div>
    {onOpenPdf&&<button onClick={onOpenPdf} style={{...SANS,border:"1px solid rgba(255,255,255,0.15)",borderRadius:5,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.85)"}}>📄 PDF</button>}
    {isPreparer&&approval.status==="open"&&<button disabled={!canSubmit} onClick={()=>canSubmit&&onSubmit()} style={{...SANS,border:canSubmit?"none":"1px solid rgba(255,255,255,0.1)",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:canSubmit?"pointer":"not-allowed",display:"flex",alignItems:"center",gap:5,background:canSubmit?T.actionBase:"rgba(255,255,255,0.05)",color:canSubmit?"#fff":"rgba(255,255,255,0.4)"}}>{canSubmit?<><span>↑</span>Submit</>:<><span>🔒</span>{openErrors.length} Errors</>}</button>}
    {currentUser.isController&&approval.status==="review_pending"&&<button onClick={handleApprove} style={{...SANS,border:"none",borderRadius:5,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,background:T.okBase,color:"#fff"}}><span>✓</span>Approve</button>}
    {showEmailConfirm&&<span className="fade-in" style={{...SANS,fontSize:11,color:"#34d399",fontWeight:600}}>✉️ Sent</span>}
  </div>;
}

