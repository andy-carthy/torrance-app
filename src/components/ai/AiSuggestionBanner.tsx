import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { AI_SUGGESTIONS } from '../../data/aiData';
import { AiConfidenceBadge } from '../primitives/Pills';

export function AiSuggestionBanner({excId,onAccept}) {
  const suggestion=AI_SUGGESTIONS[excId];
  const [dismissed,setDismissed]=useState(false);
  const [accepting,setAccepting]=useState(false);
  if(!suggestion||dismissed)return null;
  const handleAccept=()=>{ setAccepting(true); setTimeout(()=>{ onAccept(suggestion); setAccepting(false); },600); };
  return <div className="slide-in" style={{background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:8, padding:"14px 16px", marginBottom:14, position:"relative", overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
      <div style={{flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
          <span style={{fontSize:16, color:T.aiBase}}>✦</span>
          <span style={{...SANS,fontWeight:700,fontSize:12,color:T.aiDark}}>AI Suggestion</span>
          <AiConfidenceBadge pct={suggestion.confidence}/>
          <span style={{...SANS,fontSize:10,color:T.textMuted}}>Based on {suggestion.priorPeriod}</span>
        </div>
        <div style={{...SANS,fontSize:13,fontWeight:600,color:T.textPrimary,marginBottom:4}}>"{suggestion.summary}"</div>
        <div style={{...SANS,fontSize:12,color:T.textMuted,lineHeight:1.6,marginBottom:12}}>{suggestion.detail}</div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button className="ai-btn" onClick={handleAccept} disabled={accepting}
            style={{...SANS,border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:700,background:T.aiBase,color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:7}}>
            {accepting?<><span style={{animation:"pulse 0.8s infinite"}}>✦</span>Applying…</>:<><span>✦</span>Accept AI Suggestion</>}
          </button>
          <button onClick={()=>setDismissed(true)} style={{...SANS,background:"transparent",border:"none",color:T.textMuted,fontSize:12,cursor:"pointer",padding:"4px 8px"}}>Dismiss</button>
        </div>
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:16,flexShrink:0}}>✕</button>
    </div>
  </div>;
}



