import React, { useState } from 'react';
import { T, MONO, SANS } from '../../theme/tokens';

export function SchemaRegistryView({ onBack, onOpenStudio }) {
  const schemas = [
    { id:"SSB", name:"State Street Bank", type:"Global Custodian", fields: 142, confidence: 99.8 },
    { id:"BNY", name:"BNY Mellon", type:"Global Custodian", fields: 118, confidence: 99.5 },
    { id:"JPM", name:"J.P. Morgan", type:"Prime Broker", fields: 95, confidence: 98.9 },
    { id:"CITI", name:"Citigroup", type:"Prime Broker", fields: 104, confidence: 99.2 },
    { id:"NT", name:"Northern Trust", type:"Global Custodian", fields: 136, confidence: 99.4 },
    { id:"MS", name:"Morgan Stanley", type:"Prime Broker", fields: 88, confidence: 98.1 },
    { id:"BAM", name:"Bank of America", type:"Prime Broker", fields: 92, confidence: 97.8 },
    { id:"UBS", name:"UBS", type:"Prime Broker", fields: 85, confidence: 98.5 }
  ];

  return (
    <div className="fade-in" style={{display:"flex", flexDirection:"column", height:"calc(100vh - 52px)", background:T.appBg}}>
      <div style={{padding:"24px 48px", background:T.cardBg, borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", gap:20}}>
        <button onClick={onBack} style={{...SANS, background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"8px 14px", fontSize:12, cursor:"pointer", fontWeight:600, color:T.textPrimary}}>← Back to Ingestion</button>
        <div>
          <h2 style={{...SANS, fontWeight:700, fontSize:22, color:T.textPrimary, margin:0}}>Global Schema Registry</h2>
          <div style={{...SANS, fontSize:13, color:T.textMuted, marginTop:4}}>Pre-certified AI mapping models for major institutional custodians.</div>
        </div>
      </div>

      <div style={{flex:1, overflowY:"auto", padding:"32px 48px", display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap:20, alignContent:"start"}}>
        {schemas.map(s => (
          <div key={s.id} style={{background:T.cardBg, border:`1px solid ${T.border}`, borderRadius:10, padding:"20px", boxShadow:"0 2px 4px rgba(0,0,0,0.02)"}}>
             <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16}}>
               <div>
                 <div style={{...SANS, fontSize:16, fontWeight:700, color:T.textPrimary}}>{s.name}</div>
                 <div style={{...SANS, fontSize:12, color:T.textMuted, marginTop:2}}>{s.type}</div>
               </div>
               <span style={{...SANS, fontSize:10, fontWeight:700, background:T.okBg, color:T.okBase, padding:"3px 8px", borderRadius:4, border:`1px solid ${T.okBorder}`}}>CERTIFIED</span>
             </div>
             
             <div style={{display:"flex", gap:12, marginBottom:20}}>
               <div style={{flex:1, background:T.appBg, border:`1px solid ${T.border}`, borderRadius:6, padding:"10px", textAlign:"center"}}>
                 <div style={{...MONO, fontSize:18, fontWeight:700, color:T.textPrimary}}>{s.fields}</div>
                 <div style={{...SANS, fontSize:10, color:T.textMuted, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:4}}>Mapped Fields</div>
               </div>
               <div style={{flex:1, background:T.aiBg, border:`1px solid ${T.aiBorder}`, borderRadius:6, padding:"10px", textAlign:"center"}}>
                 <div style={{...MONO, fontSize:18, fontWeight:700, color:T.aiDark}}>{s.confidence}%</div>
                 <div style={{...SANS, fontSize:10, color:T.aiDark, textTransform:"uppercase", letterSpacing:"0.05em", marginTop:4}}>AI Confidence</div>
               </div>
             </div>

             <button onClick={() => onOpenStudio(s.id)} style={{...SANS, width:"100%", fontSize:12, fontWeight:600, padding:"8px", borderRadius:6, border:`1px solid ${T.border}`, background:"transparent", cursor:"pointer", color:T.textPrimary, transition:"background 0.2s"}} onMouseEnter={e=>e.currentTarget.style.background=T.appBg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
  View Canonical Logic
</button>
          </div>
        ))}
      </div>
    </div>
  );
}

