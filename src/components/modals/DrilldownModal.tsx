import React from 'react';
import { T, MONO, SANS } from '../../theme/tokens';
import { fmtUSD } from '../../utils/formatters';
import { JOURNALS } from '../../data/feeds/gl';

export function DrilldownModal({row,onClose}) {
  const entries=JOURNALS[row.acct]||[{date:"2024-12-31",ref:"JE-4899",desc:row.name,debit:row.debit,credit:row.credit,cpty:row.counterparty||"—"}];
  return <div className="modal-overlay" role="dialog" aria-modal="true" style={{position:"fixed",inset:0,background:"rgba(26,35,50,0.65)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.cardBg,borderRadius:12,width:740,maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",overflow:"hidden"}}>
      <div style={{background:T.navyHeader,padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><div style={{...SANS,fontWeight:700,fontSize:14,color:"#fff"}}>Transaction Drilldown</div><div style={{...SANS,fontSize:11,color:"#8898aa",marginTop:2}}><span style={MONO}>{row.acct}</span> · {row.name}</div></div>
        <button onClick={onClose} aria-label="Close" style={{background:"none",border:"none",color:"#8898aa",cursor:"pointer",fontSize:18}}>✕</button>
      </div>
      <div style={{overflowY:"auto",padding:"16px 20px"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:T.appBg}}>{["Date","Reference","Description","Counterparty","Debit","Credit"].map((h,i)=><th key={h} style={{...SANS,padding:"8px 12px",textAlign:i>3?"right":"left",color:T.textMuted,fontWeight:700,fontSize:10,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>)}</tr></thead>
          <tbody>{entries.map((e,i)=><tr key={i} className="row-hover"><td style={{...MONO,padding:"9px 12px",fontSize:11,color:T.textMuted,borderBottom:`1px solid ${T.border}`}}>{e.date}</td><td style={{...MONO,padding:"9px 12px",fontSize:11,color:T.actionBase,borderBottom:`1px solid ${T.border}`}}>{e.ref}</td><td style={{padding:"9px 12px",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.desc}</td><td style={{padding:"9px 12px",fontSize:11,color:T.textMuted,borderBottom:`1px solid ${T.border}`,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.cpty||"—"}</td><td style={{...MONO,padding:"9px 12px",textAlign:"right",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.debit>0?fmtUSD(e.debit):"—"}</td><td style={{...MONO,padding:"9px 12px",textAlign:"right",fontSize:12,borderBottom:`1px solid ${T.border}`}}>{e.credit>0?fmtUSD(e.credit):"—"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  </div>;
}

