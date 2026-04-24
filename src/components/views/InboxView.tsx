import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function InboxView({ notifications, onSelectFund }) {
  if (notifications.length === 0) {
    return (
      <div className="fade-in" style={{padding:"80px 0", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center"}}>
        <div style={{fontSize:48, marginBottom:16}}>📭</div>
        <div style={{...SANS, fontSize:18, fontWeight:700, color:T.textPrimary, marginBottom:8}}>You're all caught up!</div>
        <div style={{...SANS, fontSize:13, color:T.textMuted}}>No new assignments, mentions, or reviews pending.</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{padding:"20px 24px", maxWidth: 900, margin:"0 auto", width:"100%"}}>
      <div style={{...SANS, fontSize:12, fontWeight:700, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:16}}>
        My Notifications ({notifications.length})
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:12}}>
        {notifications.map(n => (
          <div key={n.id} onClick={() => onSelectFund(n.fund)} className="row-hover" style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"16px 20px", cursor:"pointer", display:"flex", gap:16, alignItems:"flex-start", boxShadow:"0 2px 4px rgba(0,0,0,0.02)", transition:"all 0.15s"}}>
            <div style={{width:36, height:36, borderRadius:"50%", background:n.bg, color:n.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0}}>
              {n.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
                <div style={{...SANS, fontSize:14, fontWeight:700, color:T.textPrimary}}>{n.title}</div>
                <div style={{...SANS, fontSize:11, color:T.textMuted}}>{n.time}</div>
              </div>
              <div style={{...SANS, fontSize:13, color:T.textPrimary, marginBottom:8}}>{n.message}</div>
              <div style={{...MONO, fontSize:11, color:T.textMuted, display:"flex", alignItems:"center", gap:8}}>
                <span style={{background:T.appBg, padding:"2px 6px", borderRadius:4, border:`1px solid ${T.border}`}}>{n.fund.name}</span>
                {n.exc && <span style={{color:T.actionBase}}>↳ {n.exc.id}</span>}
              </div>
            </div>
            <div style={{color:T.actionBase, fontSize:20, alignSelf:"center", paddingLeft:10}}>›</div>
          </div>
        ))}
      </div>
    </div>
  );
}
