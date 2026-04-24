import React, { useState, useEffect, useCallback } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { Card, FieldLabel } from '../primitives/Card';
import { RESOLUTIONS } from '../../data/exceptions';
import { PRIOR_PERIOD_FLAGS } from '../../data/aiData';
import { TEAM } from '../../data/team';
import { AiRootCauseBlock } from '../ai/AiRootCauseBlock';
import { AiSuggestionBanner } from '../ai/AiSuggestionBanner';
import { PriorPeriodFlag } from '../primitives/Pills';
import { ThreadedComments } from './ThreadedComments';
import { Avatar } from '../primitives/Avatar';

export function ResolutionForm({exc,onResolve,onUpdate,onAddThread,currentUserId,demoTypingText,demoShouldSubmit}) {
  const options=RESOLUTIONS[exc.severity];
  const [resolution,setResolution]=useState("");
  const [overrideValue,setOverrideValue]=useState("");
  useEffect(()=>{ setResolution(""); setOverrideValue(""); },[exc.id]);
  const isOverride=resolution==="override_value";
  const isErrorAccept=exc.severity==="error"&&resolution==="accept_as_is";
  const needsComment=isErrorAccept&&exc.thread.length===0;
  const isDisabled=resolution===""||needsComment;
  const handleAiAccept=useCallback(s=>onResolve(exc.id,s.resolution,s.overrideValue,`AI Suggestion: ${s.summary}`),[exc.id,onResolve]);
  
  return <div>
    <PriorPeriodFlag flag={PRIOR_PERIOD_FLAGS[exc.id]}/>
    <AiRootCauseBlock excId={exc.id}/>
    <AiSuggestionBanner excId={exc.id} onAccept={handleAiAccept}/>
    
    <Card title="Resolution Action" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{options.length} options</span>}>
      {/* Horizontal Grid for radio buttons */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:10}}>
        {options.map(opt=>{ const sel=resolution===opt.value; return(
          <label key={opt.value} className="radio-opt" style={{display:"flex",alignItems:"flex-start",gap:11,padding:"10px 13px",borderRadius:7,cursor:"pointer",border:`1px solid ${sel?T.actionBase:T.border}`,background:sel?T.actionBg:T.cardBg, boxShadow:sel?"0 1px 3px rgba(79,70,229,0.1)":"none"}}>
            <input type="radio" name={`res-${exc.id}`} value={opt.value} checked={sel} onChange={()=>setResolution(opt.value)} style={{marginTop:2}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:14}}>{opt.icon}</span><span style={{...SANS,fontSize:13,fontWeight:600,color:sel?T.actionBase:T.textPrimary}}>{opt.label}</span>{opt.value==="accept_as_is"&&exc.severity==="error"&&<span style={{...MONO,fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:T.warnBg,color:T.warnBase,border:`1px solid ${T.warnBorder}`}}>COMMENT REQUIRED</span>}</div>
              <div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:4,lineHeight:1.4}}>{opt.desc}</div>
            </div>
          </label>
        );})}
      </div>
    </Card>
    
    {isOverride&&<div className="slide-in"><Card title="Override Value" accessory={<span style={{...MONO,fontSize:10,color:T.warnBase,background:T.warnBg,padding:"2px 7px",borderRadius:3,border:`1px solid ${T.warnBorder}`}}>OVERRIDE</span>}>
      <FieldLabel>Replacement Value</FieldLabel>
      <input type="text" placeholder={exc.expectedValue||"Enter value…"} value={overrideValue} onChange={e=>setOverrideValue(e.target.value)} style={{...SANS,width:"100%",border:`1px solid ${T.warnBorder}`,borderRadius:6,padding:"9px 11px",fontSize:13,background:T.warnBg}}/>
    </Card></div>}
    
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:14}}>
      <Card title="Assignment"><FieldLabel>Assign To</FieldLabel>
        <div style={{position:"relative"}}>
          {exc.assignee&&<span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",zIndex:1}}><Avatar user={TEAM.find(m=>m.id===exc.assignee)} size={22}/></span>}
          <select value={exc.assignee||""} onChange={e=>onUpdate(exc.id,{assignee:e.target.value||null})} style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:6,padding:exc.assignee?"9px 11px 9px 38px":"9px 11px",fontSize:13,background:T.cardBg,cursor:"pointer", color:T.textPrimary}}>
            <option value="">— Unassigned —</option>{TEAM.map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}
          </select>
        </div>
        {exc.assignee&&<div style={{...SANS,fontSize:11,color:T.textMuted,marginTop:5,display:"flex",alignItems:"center",gap:5}}><span style={{color:T.okBase}}>✓</span>Assigned to <strong style={{color:T.textPrimary}}>{TEAM.find(m=>m.id===exc.assignee)?.name}</strong></div>}
      </Card>
      
      <Card title="Audit Thread" accessory={<span style={{...SANS,fontSize:11,color:T.textMuted}}>{exc.thread.length} messages</span>}>
        {isErrorAccept&&needsComment&&<div className="slide-in" style={{...SANS,fontSize:11,color:T.errorBase,background:T.errorBg,border:`1px solid ${T.errorBorder}`,borderRadius:5,padding:"7px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:6}}><span>✕</span>Add a thread comment before accepting this error.</div>}
        <ThreadedComments thread={exc.thread} onAddMessage={(txt)=>onAddThread(exc.id,txt)} onAddAiMessage={(txt)=>onAddThread(exc.id,txt,'u_ai')} excCode={exc.code} currentUserId={currentUserId} externalDraft={demoTypingText} demoShouldSubmit={demoShouldSubmit}/>
      </Card>
    </div>

    <button className="resolve-btn" disabled={isDisabled} onClick={()=>!isDisabled&&onResolve(exc.id,resolution,overrideValue,"")}
      style={{width:"100%",border:"none",borderRadius:7,padding:"14px 20px",fontSize:14,fontWeight:700,cursor:isDisabled?"not-allowed":"pointer",background:isDisabled?T.border:T.okBase,color:isDisabled?T.textMuted:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      {resolution===""?<><span style={{opacity:0.5}}>○</span>Select a Resolution Action</>:needsComment?<><span>!</span>Add Thread Comment First</>:<><span>✓</span>Resolve Exception</>}
    </button>
  </div>;
}
