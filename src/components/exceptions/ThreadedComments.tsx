import React, { useState, useEffect, useRef } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { TEAM } from '../../data/team';
import { Avatar } from '../primitives/Avatar';

export function getAiReply(code: string): string {
  switch (code) {
    case 'CATEGORY_MISMATCH':
      return "✦ Prior-period analysis: This account was correctly classified as 'Asset' in all 6 prior closes. Custodian ETL batch ETL-20241229-0341 introduced the misclassification. Recommend: Corrected in Source.";
    case 'FX_MISMATCH':
      return "✦ Bloomberg WM/Reuters 4PM fix confirms EUR/USD 1.0842. Override value $108,420.00 matches Nov 30 resolution. Confidence: 97%.";
    case 'HOLDINGS_CROSS_CHECK':
      return "✦ T+1 settlement lag confirmed. AAPL trade Dec 30 settles Jan 2. This variance will self-clear. Recommend: Acknowledge.";
    default:
      return "✦ Pattern analysis complete. No prior-period precedent found. Escalate to Controller if dollar variance exceeds SLA threshold.";
  }
}

export function ThreadedComments({thread, onAddMessage, onAddAiMessage, currentUserId, excCode, externalDraft, demoShouldSubmit}:
  {thread:any[], onAddMessage:(t:string)=>void, onAddAiMessage?:(t:string)=>void, currentUserId:string, excCode?:string, externalDraft?:string, demoShouldSubmit?:boolean}) {
  const [draft,setDraft]=useState("");
  const bottomRef=useRef<HTMLDivElement | null>(null);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[thread.length]);

  // Sync external draft for demo typing simulation
  useEffect(()=>{ if(externalDraft!==undefined) setDraft(externalDraft); },[externalDraft]);

  // Auto-submit for demo sequence
  useEffect(()=>{
    if(demoShouldSubmit && draft.trim()) submit();
  },[demoShouldSubmit]);

  const submit=()=>{
    const txt=draft.trim();
    if(!txt) return;
    onAddMessage(txt);
    setDraft("");
    // AI auto-reply after 1500ms
    if(excCode && onAddAiMessage) {
      setTimeout(()=>{ onAddAiMessage(getAiReply(excCode)); }, 1500);
    }
  };

  return <div>
    {thread.length>0?<div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:12,maxHeight:220,overflowY:"auto",padding:"2px 0"}}>
      {thread.map(msg=>{ const user=TEAM.find(m=>m.id===msg.userId); const isMe=msg.userId===currentUserId; const isAi=msg.userId==='u_ai'; return(
        <div key={msg.id} style={{display:"flex",gap:9,alignItems:"flex-start",flexDirection:isMe?"row-reverse":"row"}}>
          <Avatar user={user} size={26}/>
          <div style={{maxWidth:"78%"}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexDirection:isMe?"row-reverse":"row"}}><span style={{...SANS,fontSize:11,fontWeight:700,color:isAi?T.aiBase:T.textPrimary}}>{user?.name}</span><span style={{...SANS,fontSize:10,color:T.textMuted}}>{msg.ts}</span></div>
            <div style={{...SANS,fontSize:12,lineHeight:1.55,padding:"8px 11px",borderRadius:8,
              background:isAi?T.aiBg:isMe?T.actionBg:T.appBg,
              color:isAi?T.aiDark:T.textPrimary,
              border:`1px solid ${isAi?T.aiBorder:isMe?"#bfdbfe":T.border}`,
              borderBottomRightRadius:isMe?2:8,borderBottomLeftRadius:isMe?8:2}}>{msg.text}</div>
          </div>
        </div>
      );})}
      <div ref={bottomRef}/>
    </div>:<div style={{...SANS,fontSize:12,color:T.textMuted,textAlign:"center",padding:"14px 0",marginBottom:10}}>No comments yet</div>}
    <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
      <Avatar user={TEAM.find(m=>m.id===currentUserId)} size={26}/>
      <div style={{flex:1}}>
        <textarea rows={2} placeholder="Add a comment…" value={draft} onChange={e=>setDraft(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"&&(e.metaKey||e.ctrlKey))submit();}}
          style={{...SANS,width:"100%",border:`1px solid ${T.border}`,borderRadius:7,padding:"8px 11px",fontSize:12,lineHeight:1.55,minHeight:56}}/>
        <div style={{...SANS,fontSize:10,color:T.textMuted,marginTop:3}}>⌘↵ to send</div>
      </div>
      <button onClick={submit} disabled={!draft.trim()} style={{...SANS,border:"none",borderRadius:7,padding:"8px 14px",fontSize:12,fontWeight:600,background:draft.trim()?T.actionBase:T.border,color:draft.trim()?"#fff":T.textMuted,cursor:draft.trim()?"pointer":"not-allowed",flexShrink:0,height:40}}>Send</button>
    </div>
  </div>;
}

