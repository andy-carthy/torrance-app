import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function AiRootCauseBlock({data}) {
  const [expanded, setExpanded] = useState(false);
  
  if (!data) return null;

  return (
    <div className="slide-in" style={{
      border:`1.5px solid ${T.aiBorder}`, borderRadius:10, marginBottom:14, overflow:"hidden",
      background:"linear-gradient(135deg,#faf8ff,#f5f3ff)",
    }}>
      {/* Header */}
      <div style={{padding:"10px 16px", borderBottom:`1px solid ${T.aiBorder}`,
        background:"linear-gradient(135deg,#f5f3ff,#ede9fe)",
        display:"flex", alignItems:"center", justifyContent:"space-between"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:15}}>🔍</span>
          <span style={{...SANS, fontWeight:700, fontSize:13, color:T.aiBase}}>AI Root Cause Analysis</span>
          <span style={{...MONO, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
            background:T.aiBg, color:data.confidence>=95?T.okBase:T.warnBase,
            border:`1px solid ${T.aiBorder}`, display:"inline-flex", alignItems:"center", gap:4}}>
            ✦ {data.confidence}% confidence
          </span>
        </div>
        <button onClick={()=>setExpanded(e=>!e)}
          style={{...SANS, fontSize:11, color:T.aiBase, background:"transparent",
            border:`1px solid ${T.aiBorder}`, borderRadius:5, padding:"3px 10px", cursor:"pointer", fontWeight:600}}>
          {expanded?"Collapse ▲":"Expand ▼"}
        </button>
      </div>

      <div style={{padding:"12px 16px"}}>
        {/* Root cause summary — always visible */}
        <div style={{...SANS, fontSize:12, color:T.textPrimary, lineHeight:1.7, marginBottom:expanded?12:0}}>
          <span style={{fontWeight:700, color:T.aiDark}}>Root Cause: </span>{data.rootCause}
        </div>

        {expanded&&(<>
          {/* Cause chain */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Cause Chain</div>
            {data.causeChain.map((step,i)=>(
              <div key={step.step} style={{display:"flex", gap:12, alignItems:"flex-start"}}>
                <div style={{display:"flex", flexDirection:"column", alignItems:"center", flexShrink:0}}>
                  <div style={{width:26, height:26, borderRadius:"50%", background:T.aiDark, color:"#fff",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    ...MONO, fontSize:11, fontWeight:700}}>{step.step}</div>
                  {i<data.causeChain.length-1&&<div style={{width:2, height:22, background:"#ddd6fe", margin:"2px 0"}}/>}
                </div>
                <div style={{paddingBottom:i<data.causeChain.length-1?20:0, flex:1}}>
                  <div style={{...SANS, fontWeight:700, fontSize:12, color:T.textPrimary, marginBottom:2}}>{step.label}</div>
                  <div style={{...SANS, fontSize:11, color:T.textMuted, lineHeight:1.5}}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Affected downstream */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Affected Downstream</div>
            {data.affectedDownstream.map((item,i)=>(
              <div key={i} style={{display:"flex", alignItems:"flex-start", gap:8, padding:"6px 10px",
                borderRadius:6, background:T.errorBg, border:`1px solid ${T.errorBorder}`, marginBottom:5}}>
                <span style={{color:T.errorBase, fontSize:12, flexShrink:0, marginTop:1}}>⚠</span>
                <span style={{...SANS, fontSize:11, color:T.errorBase, lineHeight:1.5}}>{item}</span>
              </div>
            ))}
          </div>

          {/* Suggested remediation */}
          <div style={{marginBottom:14}}>
            <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
              letterSpacing:"0.07em", marginBottom:8}}>Suggested Remediation</div>
            <div style={{padding:"10px 12px", borderRadius:7, background:T.okBg, border:`1px solid ${T.okBorder}`}}>
              <span style={{...SANS, fontSize:12, color:T.okBase, lineHeight:1.6, fontWeight:500}}>{data.suggestedRemediation}</span>
            </div>
          </div>

          {/* Similar past exceptions */}
          {data.similarPastExceptions.length>0&&(
            <div>
              <div style={{...SANS, fontSize:10, fontWeight:700, color:T.textMuted, textTransform:"uppercase",
                letterSpacing:"0.07em", marginBottom:8}}>Similar Past Exceptions</div>
              {data.similarPastExceptions.map((past,i)=>(
                <div key={i} style={{display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                  borderRadius:6, background:T.appBg, border:`1px solid ${T.border}`, marginBottom:6}}>
                  <span style={{...MONO, fontSize:10, color:T.actionBase, fontWeight:700, flexShrink:0}}>{past.id}</span>
                  <span style={{...SANS, fontSize:11, color:T.textMuted, flex:1}}>{past.fund}</span>
                  <span style={{...SANS, fontSize:10, color:T.textMuted, flexShrink:0}}>{past.date}</span>
                  <span style={{...SANS, fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:3,
                    background:T.okBg, color:T.okBase, border:`1px solid ${T.okBorder}`, flexShrink:0}}>{past.outcome}</span>
                </div>
              ))}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}